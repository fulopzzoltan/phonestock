import { supabase, unwrap } from "../../lib/supabaseClient";
import { cashSettlementFromApi, dayCloseFromApi, txFromApi, txToApi } from "../../lib/mappers";
import { summarizeTx } from "../../lib/utils";

export function createFinanceActions(ctx) {
  const {
    dayCloses, setBusy, setCashSettlements, setDayCloses, setError, setPartModal, setStockModal,
    setTransactions, setTxModal, transactions, user,
  } = ctx;
  const refreshCustomerLoyalty = (...a) => ctx.refreshCustomerLoyalty(...a);
  const withBusy = (...a) => ctx.withBusy(...a);

  async function saveCashSettlement(data) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("cash_settlements").insert({
        period_start: data.periodStart, period_end: data.periodEnd,
        location_breakdown: data.locationBreakdown,
        card_income: data.cardIncome, transfer_income: data.transferIncome,
        payer_location_id: data.payerLocationId, payee_location_id: data.payeeLocationId,
        transfer_amount: data.transferAmount, note: data.note || null,
        settled_by: user.id,
      }).select());
      setCashSettlements((prev) => [cashSettlementFromApi(r[0]), ...prev]);
    });
  }
  async function editCashSettlement(id, data) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("cash_settlements").update({
        period_start: data.periodStart, period_end: data.periodEnd, note: data.note || null,
      }).eq("id", id).select());
      setCashSettlements((prev) => prev.map((s) => (s.id === id ? cashSettlementFromApi(r[0]) : s)));
    });
  }
  async function deleteCashSettlement(id) {
    await withBusy(async () => {
      unwrap(await supabase.from("cash_settlements").delete().eq("id", id));
      setCashSettlements((prev) => prev.filter((s) => s.id !== id));
    });
  }
  async function closeDay(date, locId) {
    await withBusy(async () => {
      const dayTx = transactions.filter((t) => t.date === date && t.locationId === locId);
      const sum = summarizeTx(dayTx);
      const snapshot = {
        snapshot_income_cash: sum.incomeCash,
        snapshot_income_card: sum.incomeCard,
        snapshot_expense_cash: sum.expenseReal,
        snapshot_margin: sum.margin,
        snapshot_tx_count: dayTx.length,
      };
      // (date, location_id) egyedi kulcs — ha a napot már lezártuk majd újranyitottuk,
      // az a sor még mindig ott van (csak reopened_at van rajta), így egy új insert
      // ütközne vele. Ilyenkor azt a meglévő sort zárjuk újra, nem hozunk létre másikat.
      const existing = dayCloses.find((d) => d.date === date && d.locationId === locId);
      if (existing) {
        const r = unwrap(await supabase.from("day_closes").update({
          closed_by: user.id, closed_at: new Date().toISOString(), reopened_at: null, reopened_by: null, ...snapshot,
        }).eq("id", existing.id).select());
        setDayCloses((prev) => prev.map((d) => (d.id === existing.id ? dayCloseFromApi(r[0]) : d)));
      } else {
        const r = unwrap(await supabase.from("day_closes").insert({ date, location_id: locId, closed_by: user.id, ...snapshot }).select());
        setDayCloses((prev) => [dayCloseFromApi(r[0]), ...prev]);
      }
    });
  }
  async function reopenDay(id) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("day_closes").update({ reopened_at: new Date().toISOString(), reopened_by: user.id }).eq("id", id).select());
      setDayCloses((prev) => prev.map((d) => (d.id === id ? dayCloseFromApi(r[0]) : d)));
    });
  }
  // TRANSACTIONS
  // A tényleges mentési logika — nem nyeli el a hibát, hanem feldobja, hogy a hívó
  // (pl. checkoutBasket) el tudja dönteni, mi történjen sikertelen mentéskor (ld. lent).
  async function addTransactionRaw(data, locId) {
    let customerId = data.customerId || null;
    if (!customerId && data.customerPhone) {
      const { data: cid } = await supabase.rpc("upsert_customer", { p_name: data.customerName, p_phone: data.customerPhone });
      customerId = cid;
    }
    if (data.marketingConsent && customerId) {
      await supabase.from("customers").update({ marketing_consent: true, marketing_consent_at: new Date().toISOString() }).eq("id", customerId);
    }
    const r = unwrap(await supabase.from("transactions").insert({ ...txToApi(data, locId), customer_id: customerId }).select());
    setTransactions((prev) => [txFromApi(r[0]), ...prev]);
    if (customerId && data.type === "income" && ["Készlet", "Szerviz"].includes(data.category)) await refreshCustomerLoyalty(customerId);
  }
  async function addTransaction(data, locId) {
    await withBusy(() => addTransactionRaw(data, locId));
  }
  async function editTransaction(id, data, locId) {
    await withBusy(async () => {
      let customerId = data.customerId || null;
      if (!customerId && data.customerPhone) {
        const { data: cid } = await supabase.rpc("upsert_customer", { p_name: data.customerName, p_phone: data.customerPhone });
        customerId = cid || null;
      }
      const r = unwrap(await supabase.from("transactions").update({ ...txToApi(data, locId), customer_id: customerId }).eq("id", id).select());
      if (!r[0]) throw new Error("A mentés nem sikerült — előfordulhat, hogy nincs jogosultságod ehhez a helyszínhez, vagy időközben törölték a tételt.");
      setTransactions((prev) => prev.map((t) => (t.id === id ? txFromApi(r[0]) : t)));
      setTxModal(null);
    });
  }
  async function deleteTransaction(id) {
    await withBusy(async () => {
      const tx = transactions.find((t) => t.id === id);
      unwrap(await supabase.from("transactions").update({ deleted_at: new Date().toISOString() }).eq("id", id));
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      if (tx?.customerId && tx.type === "income" && ["Készlet", "Szerviz"].includes(tx.category)) await refreshCustomerLoyalty(tx.customerId);
    });
  }
  // BasketBar checkout — items: [{label, amount, cost, category, kind, stockKind?}]
  // Csak 2+ tételnél kap közös basket_id-t (egyetlen tétel nem "blokk", marad sima sor).
  // Ez a kassza gyors-rögzítőjének (BasketBar) mentése — szándékosan NEM a közös withBusy-t
  // használja, mert az elnyeli a hibát (csak egy banner-t mutat), a BasketBar viszont a
  // kosarat AZONNAL, a mentés eredményétől függetlenül ürítette ki. Ha éppen akkor esik ki
  // a net, amikor valaki fizet, ez korábban nyomtalanul eltüntette a beütött tételeket.
  // Most: sikertelen mentésnél a hívó (BasketBar) explicit `false`-t kap vissza, ezért nem
  // üríti a kosarat — a felhasználó újra megnyomhatja a gombot, amint helyreállt a net.
  // Emellett egy helyi (localStorage) másolat is készül a sikertelen kosárról, hogy egy
  // véletlen frissítés/lap-bezárás után se vesszen el nyomtalanul.
  async function checkoutBasket(items, payment, locId, date) {
    setBusy(true);
    try {
      const basketId = items.length > 1 ? crypto.randomUUID() : null;
      const stockItem = items.find((it) => it.stockKind === "Telefon");
      const partItem = items.find((it) => it.stockKind === "Alkatrész");
      for (const item of items) {
        // A telefon/alkatrész tételekhez a StockModal/PartModal mentése (addProduct/addPart)
        // csinálja a Kiadást — itt kihagyjuk őket, különben duplázódna.
        if (item === stockItem || item === partItem) continue;
        await addTransactionRaw({
          type: item.kind, description: item.label, amount: item.amount,
          costPrice: item.cost || 0, category: item.category, payment, basketId, date,
        }, locId);
      }
      if (stockItem) setStockModal({ costPrice: stockItem.amount, locationId: locId });
      if (partItem) setPartModal({ costPrice: partItem.amount, source: partItem.label });
      setError("");
      try { localStorage.removeItem("phonestock_pending_basket"); } catch { /* noop */ }
      return true;
    } catch (e) {
      try {
        localStorage.setItem("phonestock_pending_basket", JSON.stringify({ items, payment, locId, savedAt: new Date().toISOString() }));
      } catch { /* noop — ha a localStorage sem elérhető, legalább a banner jelez */ }
      setError((e.message || "Hiba történt a mentés közben.") + " — a kosár tartalma megmaradt, próbáld újra.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return {
    saveCashSettlement, editCashSettlement, deleteCashSettlement, closeDay, reopenDay, addTransactionRaw,
    addTransaction, editTransaction, deleteTransaction, checkoutBasket,
  };
}

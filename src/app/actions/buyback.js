import { supabase, unwrap } from "../../lib/supabaseClient";
import { buybackModelFromApi, buybackModelToApi, buybackOfferFromApi, buybackRuleFromApi, buybackRuleToApi, txFromApi, txToApi } from "../../lib/mappers";

export function createBuybackActions(ctx) {
  const {
    buybackOffers, defaultLocId, setBuybackModelModal, setBuybackModels, setBuybackOffers,
    setBuybackRuleModal, setBuybackRules, setStockModal, setTransactions,
  } = ctx;
  const withBusy = (...a) => ctx.withBusy(...a);

  // BUYBACK — árazás karbantartása (admin only)
  async function addBuybackModel(data) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("buyback_models").insert(buybackModelToApi(data)).select());
      setBuybackModels((prev) => [...prev, buybackModelFromApi(r[0])]);
      setBuybackModelModal(null);
    });
  }
  async function editBuybackModel(id, data) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("buyback_models").update(buybackModelToApi(data)).eq("id", id).select());
      setBuybackModels((prev) => prev.map((m) => (m.id === id ? buybackModelFromApi(r[0]) : m)));
      setBuybackModelModal(null);
    });
  }
  async function deleteBuybackModel(id) {
    await withBusy(async () => {
      unwrap(await supabase.from("buyback_models").update({ deleted_at: new Date().toISOString() }).eq("id", id));
      setBuybackModels((prev) => prev.filter((m) => m.id !== id));
    });
  }
  async function addBuybackRule(data) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("buyback_deduction_rules").insert(buybackRuleToApi(data)).select());
      setBuybackRules((prev) => [...prev, buybackRuleFromApi(r[0])]);
      setBuybackRuleModal(null);
    });
  }
  async function editBuybackRule(id, data) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("buyback_deduction_rules").update(buybackRuleToApi(data)).eq("id", id).select());
      setBuybackRules((prev) => prev.map((r2) => (r2.id === id ? buybackRuleFromApi(r[0]) : r2)));
      setBuybackRuleModal(null);
    });
  }
  async function deleteBuybackRule(id) {
    await withBusy(async () => {
      unwrap(await supabase.from("buyback_deduction_rules").delete().eq("id", id));
      setBuybackRules((prev) => prev.filter((r) => r.id !== id));
    });
  }
  // BUYBACK — beérkezett ajánlatok kezelése
  async function setBuybackOfferStatus(id, status) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("buyback_offers").update({ status }).eq("id", id).select());
      setBuybackOffers((prev) => prev.map((o) => (o.id === id ? buybackOfferFromApi(r[0]) : o)));
    });
  }
  async function payoutBuybackOffer(id, finalPrice) {
    await withBusy(async () => {
      const offer = buybackOffers.find((o) => o.id === id);
      if (!offer || offer.status === "Kifizetve") return;
      const amount = Number(finalPrice) || 0;
      const r = unwrap(await supabase.from("buyback_offers").update({ status: "Kifizetve", final_price: amount }).eq("id", id).select());
      const updated = buybackOfferFromApi(r[0]);
      setBuybackOffers((prev) => prev.map((o) => (o.id === id ? updated : o)));
      if (amount > 0) {
        const tr = unwrap(await supabase.from("transactions").insert(
          txToApi({
            type: "expense", category: "Készlet",
            description: `Felvásárlás: ${offer.customerName} — ${[offer.brand, offer.model].filter(Boolean).join(" ")}`,
            amount, payment: "Készpénz", customerName: offer.customerName, customerPhone: offer.customerPhone,
          }, offer.locationId || defaultLocId)
        ).select());
        setTransactions((prev) => [txFromApi(tr[0]), ...prev]);
      }
    });
  }
  async function rejectBuybackOffer(id) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("buyback_offers").update({ status: "Elutasítva" }).eq("id", id).select());
      setBuybackOffers((prev) => prev.map((o) => (o.id === id ? buybackOfferFromApi(r[0]) : o)));
    });
  }
  function convertBuybackOfferToProduct(offer) {
    setStockModal({
      brand: offer.brand,
      model: offer.model,
      storage: offer.storage,
      color: offer.color,
      imei: offer.imei,
      costPrice: offer.finalPrice ?? offer.estimatedPrice,
      locationId: offer.locationId || defaultLocId,
      sellerName: offer.customerName,
      sellerPhone: offer.customerPhone,
    });
  }

  return {
    addBuybackModel, editBuybackModel, deleteBuybackModel, addBuybackRule, editBuybackRule,
    deleteBuybackRule, setBuybackOfferStatus, payoutBuybackOffer, rejectBuybackOffer,
    convertBuybackOfferToProduct,
  };
}

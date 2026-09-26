import { supabase, unwrap } from "../../lib/supabaseClient";
import { repairPriceFromApi, txFromApi, txToApi } from "../../lib/mappers";

// Szerviz árbecslő: melyik probléma-cimkéhez melyik alkatrész-kategória tartozik.
const PART_CATEGORY_BY_PROBLEM = { LCD: "Kijelző", Akku: "Akkumulátor", "Csatlakozó": null, Kamera: null };

export function createWebshopActions(ctx) {
  const {
    setCustomerRequests, setRepairLeads, setRepairPriceModal, setRepairPrices,
    setStock, setTransactions, setWebOrders, webOrders,
  } = ctx;
  const refreshCustomerLoyalty = (...a) => ctx.refreshCustomerLoyalty(...a);
  const scheduleReviewRequest = (...a) => ctx.scheduleReviewRequest(...a);
  const withBusy = (...a) => ctx.withBusy(...a);

  async function saveRepairPrice(familyKey, problemTag, data) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("repair_prices").upsert({
        family_key: familyKey, problem_tag: problemTag,
        price_oem: data.priceOem, price_after: data.priceAfter, warranty: data.warranty, est_minutes: data.estMinutes,
        part_category: PART_CATEGORY_BY_PROBLEM[problemTag] ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "family_key,problem_tag" }).select());
      const updated = repairPriceFromApi(r[0]);
      setRepairPrices((prev) => [...prev.filter((p) => !(p.familyKey === familyKey && p.problemTag === problemTag)), updated]);
      setRepairPriceModal(null);
    });
  }
  async function rejectRepairLead(id) {
    await withBusy(async () => {
      unwrap(await supabase.from("repair_leads").update({ status: "Elvetve" }).eq("id", id).select());
      setRepairLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: "Elvetve" } : l)));
    });
  }
  async function convertRepairLead(id, ticketId) {
    unwrap(await supabase.from("repair_leads").update({ status: "Feldolgozva", converted_ticket_id: ticketId }).eq("id", id).select());
    setRepairLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: "Feldolgozva", convertedTicketId: ticketId } : l)));
  }
  async function advanceCustomerRequest(id, nextStatus) {
    await withBusy(async () => {
      unwrap(await supabase.from("customer_requests").update({ status: nextStatus, updated_at: new Date().toISOString() }).eq("id", id));
      if (nextStatus === "lezarva") setCustomerRequests((prev) => prev.filter((r) => r.id !== id));
      else setCustomerRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: nextStatus } : r)));
    });
  }
  async function generateWebOrderAwb(id) {
    await withBusy(async () => {
      const { data, error: err } = await supabase.functions.invoke("sameday-create-awb", { body: { orderId: id } });
      if (err || data?.error) {
        alert(`Nem sikerült az AWB-t legenerálni: ${data?.error || err?.message || "ismeretlen hiba"}`);
        return;
      }
      setWebOrders((prev) => prev.map((o) => (o.id === id ? { ...o, samedayAwbNumber: data.awbNumber, samedayAwbStatus: "created" } : o)));
    });
  }
  async function confirmWebOrder(id) {
    await withBusy(async () => {
      unwrap(await supabase.from("web_orders").update({ status: "visszaigazolva", updated_at: new Date().toISOString() }).eq("id", id));
      setWebOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: "visszaigazolva" } : o)));
    });
  }
  async function cancelWebOrder(id) {
    await withBusy(async () => {
      const order = webOrders.find((o) => o.id === id);
      if (!order) return;
      const productIds = order.items.map((it) => it.productId);
      unwrap(await supabase.from("products").update({ stock_status: "webshop" }).in("id", productIds));
      unwrap(await supabase.from("web_orders").update({ status: "lemondva", updated_at: new Date().toISOString() }).eq("id", id));
      setStock((prev) => prev.map((p) => (productIds.includes(p.id) ? { ...p, stockStatus: "webshop" } : p)));
      setWebOrders((prev) => prev.filter((o) => o.id !== id));
    });
  }
  async function completeWebOrder(id) {
    await withBusy(async () => {
      const order = webOrders.find((o) => o.id === id);
      if (!order) return;
      const { data: customerId } = await supabase.rpc("upsert_customer", { p_name: order.guestName, p_phone: order.guestPhone });
      const productIds = order.items.map((it) => it.productId);
      unwrap(await supabase.from("products").update({ status: "sold", stock_status: "webshop" }).in("id", productIds));
      const newTxs = [];
      for (const it of order.items) {
        const r = unwrap(await supabase.from("transactions").insert({
          ...txToApi({
            type: "income", category: "Készlet",
            description: `Webshop rendelés #${order.orderNo}: ${order.guestName} — ${[it.brand, it.model].filter(Boolean).join(" ")}`,
            amount: it.price, productId: it.productId,
          }, order.locationId),
          customer_id: customerId || null,
        }).select());
        newTxs.push(txFromApi(r[0]));
      }
      unwrap(await supabase.from("web_orders").update({ status: "atadva", updated_at: new Date().toISOString() }).eq("id", id));
      setStock((prev) => prev.map((p) => (productIds.includes(p.id) ? { ...p, status: "sold", stockStatus: "webshop" } : p)));
      setTransactions((prev) => [...newTxs, ...prev]);
      setWebOrders((prev) => prev.filter((o) => o.id !== id));
      if (customerId) await refreshCustomerLoyalty(customerId);
      await scheduleReviewRequest({
        sourceType: "eladas", sourceId: id, locationId: order.locationId,
        customerName: order.guestName, customerPhone: order.guestPhone,
      });
    });
  }

  return {
    saveRepairPrice, rejectRepairLead, convertRepairLead, advanceCustomerRequest, generateWebOrderAwb,
    confirmWebOrder, cancelWebOrder, completeWebOrder,
  };
}

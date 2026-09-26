import { supabase, unwrap } from "../../lib/supabaseClient";
import { warrantyFromApi, warrantyToApi } from "../../lib/mappers";

export function createWarrantyActions(ctx) {
  const {
    setTickets, setTransactions, setWarranties, setWarrantyModal,
  } = ctx;
  const withBusy = (...a) => ctx.withBusy(...a);

  // WARRANTIES
  async function linkedWarrantyCustomerId(data) {
    if (data.customerId) return data.customerId;
    if (!data.customerPhone) return null;
    const { data: cid } = await supabase.rpc("upsert_customer", { p_name: data.customerName, p_phone: data.customerPhone });
    return cid || null;
  }
  async function addWarranty(data, locId) {
    await withBusy(async () => {
      const customerId = await linkedWarrantyCustomerId(data);
      const r = unwrap(await supabase.from("warranties").insert(warrantyToApi({ ...data, customerId }, locId)).select());
      setWarranties((prev) => [...prev, warrantyFromApi(r[0])]);
      setWarrantyModal(null);
    });
  }
  async function editWarranty(id, data, locId) {
    await withBusy(async () => {
      const customerId = await linkedWarrantyCustomerId(data);
      const r = unwrap(await supabase.from("warranties").update(warrantyToApi({ ...data, customerId }, locId)).eq("id", id).select());
      setWarranties((prev) => prev.map((w) => (w.id === id ? warrantyFromApi(r[0]) : w)));
      setWarrantyModal(null);
    });
  }
  async function deleteWarranty(id) {
    await withBusy(async () => {
      unwrap(await supabase.from("warranties").update({ deleted_at: new Date().toISOString() }).eq("id", id));
      setWarranties((prev) => prev.filter((w) => w.id !== id));
    });
  }
  async function editLinkedWarranty(kind, refId, warranty, fromDate) {
    await withBusy(async () => {
      if (kind === "sale") {
        unwrap(await supabase.from("transactions").update({ warranty, date: fromDate }).eq("id", refId));
        setTransactions((prev) => prev.map((t) => (t.id === refId ? { ...t, warranty, date: fromDate } : t)));
      } else {
        unwrap(await supabase.from("service_tickets").update({ warranty, date_out: fromDate }).eq("id", refId));
        setTickets((prev) => prev.map((t) => (t.id === refId ? { ...t, warranty, dateOut: fromDate } : t)));
      }
    });
  }
  async function clearLinkedWarranty(kind, refId) {
    await withBusy(async () => {
      if (kind === "sale") {
        unwrap(await supabase.from("transactions").update({ warranty: null }).eq("id", refId));
        setTransactions((prev) => prev.map((t) => (t.id === refId ? { ...t, warranty: null } : t)));
      } else {
        unwrap(await supabase.from("service_tickets").update({ warranty: null }).eq("id", refId));
        setTickets((prev) => prev.map((t) => (t.id === refId ? { ...t, warranty: null } : t)));
      }
    });
  }

  return {
    linkedWarrantyCustomerId, addWarranty, editWarranty, deleteWarranty, editLinkedWarranty,
    clearLinkedWarranty,
  };
}

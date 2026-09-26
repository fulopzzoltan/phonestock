import { supabase, unwrap } from "../../lib/supabaseClient";
import { noteFromApi, waitingFromApi } from "../../lib/mappers";

export function createPultActions(ctx) {
  const {
    defaultLocId, setNotes, setWaitingItems, user,
  } = ctx;
  const withBusy = (...a) => ctx.withBusy(...a);

  // PULT: CETLIK
  async function addNote(body, { color, link }) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("board_notes").insert({
        body, author_id: user.id, color,
        linked_ticket_id: link?.type === "ticket" ? link.id : null,
        linked_product_id: link?.type === "product" ? link.id : null,
        linked_part_id: link?.type === "part" ? link.id : null,
        linked_customer_id: link?.type === "customer" ? link.id : null,
        linked_warranty_id: link?.type === "warranty" ? link.id : null,
      }).select());
      setNotes((prev) => [noteFromApi(r[0]), ...prev]);
    });
  }
  async function completeNote(id) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("board_notes").update({ status: "done", done_at: new Date().toISOString(), done_by: user.id }).eq("id", id).select());
      setNotes((prev) => prev.map((n) => (n.id === id ? noteFromApi(r[0]) : n)));
    });
  }
  async function reopenNote(id) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("board_notes").update({ status: "open", done_at: null, done_by: null }).eq("id", id).select());
      setNotes((prev) => prev.map((n) => (n.id === id ? noteFromApi(r[0]) : n)));
    });
  }
  async function updateNote(id, body) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("board_notes").update({ body }).eq("id", id).select());
      setNotes((prev) => prev.map((n) => (n.id === id ? noteFromApi(r[0]) : n)));
    });
  }
  async function deleteNote(id) {
    await withBusy(async () => { unwrap(await supabase.from("board_notes").delete().eq("id", id)); setNotes((prev) => prev.filter((n) => n.id !== id)); });
  }
  // PULT: VÁRAKOZIK VALAMIRE
  async function addWaitingItem(data, status = "megrendelve") {
    await withBusy(async () => {
      let customerId = data.customerId || null;
      if (!customerId && data.customerPhone) {
        const { data: cid } = await supabase.rpc("upsert_customer", { p_name: data.customerName, p_phone: data.customerPhone });
        customerId = cid || null;
      }
      const r = unwrap(await supabase.from("waiting_items").insert({
        description: data.description, customer_name: data.customerName, customer_phone: data.customerPhone,
        customer_id: customerId, supplier: data.supplier,
        status, location_id: data.locationId || defaultLocId, created_by: user.id,
      }).select());
      setWaitingItems((prev) => [waitingFromApi(r[0]), ...prev]);
    });
  }
  async function advanceWaiting(id, nextStatus) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("waiting_items").update({ status: nextStatus, updated_at: new Date().toISOString() }).eq("id", id).select());
      setWaitingItems((prev) => prev.map((w) => (w.id === id ? waitingFromApi(r[0]) : w)));
    });
  }
  async function updateWaitingItem(id, data) {
    await withBusy(async () => {
      let customerId = null;
      if (data.customerPhone) {
        const { data: cid } = await supabase.rpc("upsert_customer", { p_name: data.customerName, p_phone: data.customerPhone });
        customerId = cid || null;
      }
      const r = unwrap(await supabase.from("waiting_items").update({
        description: data.description, supplier: data.supplier || null,
        customer_name: data.customerName || null, customer_phone: data.customerPhone || null, customer_id: customerId,
      }).eq("id", id).select());
      setWaitingItems((prev) => prev.map((w) => (w.id === id ? waitingFromApi(r[0]) : w)));
    });
  }

  return {
    addNote, completeNote, reopenNote, updateNote, deleteNote, addWaitingItem, advanceWaiting,
    updateWaitingItem,
  };
}

import { partFromApi, partToApi } from "../../lib/mappers";
import { supabase, unwrap } from "../../lib/supabaseClient";

export function createPartsActions(ctx) {
  const {
    setPartModal, setParts,
  } = ctx;
  const addTransaction = (...a) => ctx.addTransaction(...a);
  const withBusy = (...a) => ctx.withBusy(...a);

  // PARTS
  // Minden fizikai darab a saját sora — N db bevételezésekor N egyedi `parts` sor jön létre,
  // EGY összesített Kiadás-tranzakcióval (nem darabonként, egy beszállítói számla is egy sor).
  // Ez az EGYETLEN hely, ahol alkatrész-beszerzés Kiadása keletkezik — a hívók (PDF-import,
  // gyors-kosár) csak előtöltik ezt a modalt, saját tranzakciót nem hoznak létre.
  async function addPart(data, locId) {
    await withBusy(async () => {
      const qty = Math.max(1, Number(data.quantity) || 1);
      const rows = Array.from({ length: qty }, (_, i) => partToApi({ ...data, partNo: i === 0 ? data.partNo : "", quantity: 1 }));
      const r = unwrap(await supabase.from("parts").insert(rows).select());
      setParts((prev) => [...r.map(partFromApi), ...prev]);
      setPartModal(null);
      const amount = (Number(data.costPrice) || 0) * qty;
      if (amount > 0) {
        await addTransaction({
          type: "expense", category: "Készlet",
          description: `Alkatrész beszerzés: ${data.name}${qty > 1 ? ` (${qty} db)` : ""}${data.source ? ` — ${data.source}` : ""}`,
          amount, payment: "Készpénz",
        }, locId);
      }
    });
  }
  // Szerkesztés a CSOPORT szintjén dolgozik: a megadott leíró mezők minden, a csoportba
  // tartozó raktáron-státuszú darabra rákerülnek. A mennyiség és a sorszám itt nem
  // módosítható — új darab a "+ Új alkatrész" felvitellel jön létre.
  async function editPart(group, data) {
    await withBusy(async () => {
      const patch = {
        name: data.name, brand: data.brand || null, model_fit: data.modelFit || null,
        cost_price: Number(data.costPrice) || 0, source: data.source || null, category: data.category || null,
        origin: data.origin || null, supplier_sku: data.supplierSku || null,
      };
      const ids = group.units.map((u) => u.id);
      const r = unwrap(await supabase.from("parts").update(patch).in("id", ids).select());
      const updated = new Map(r.map(partFromApi).map((p) => [p.id, p]));
      setParts((prev) => prev.map((p) => (updated.has(p.id) ? updated.get(p.id) : p)));
      setPartModal(null);
    });
  }
  async function deletePart(id) {
    await withBusy(async () => {
      unwrap(await supabase.from("parts").update({ deleted_at: new Date().toISOString() }).eq("id", id));
      setParts((prev) => prev.filter((p) => p.id !== id));
    });
  }
  // A raktár-nézet egy csoport-sorát törli — az abban a pillanatban raktáron lévő összes
  // egyedi darabot egyszerre küldi a Kukába (ez felel meg a régi "egy sor = egy tétel" törlésnek).
  async function deletePartGroup(group) {
    await withBusy(async () => {
      const ids = group.units.map((u) => u.id);
      unwrap(await supabase.from("parts").update({ deleted_at: new Date().toISOString() }).in("id", ids));
      setParts((prev) => prev.filter((p) => !ids.includes(p.id)));
    });
  }
  // Egyedi darab státuszának kézi átállítása (hibás / visszaküldve / vissza raktárra),
  // opcionális megjegyzéssel (pl. RMA részletek).
  async function updatePartStatus(id, status, rmaNote) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("parts").update({ status, rma_note: rmaNote || null }).eq("id", id).select());
      const updated = partFromApi(r[0]);
      setParts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    });
  }

  return {
    addPart, editPart, deletePart, deletePartGroup, updatePartStatus,
  };
}

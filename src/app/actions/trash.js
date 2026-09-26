import { fetchAllRows, supabase, unwrap } from "../../lib/supabaseClient";
import { pFromApi, partFromApi, tFromApi, txFromApi } from "../../lib/mappers";
import { thumbPathOf } from "../../lib/imageResize";

export function createTrashActions(ctx) {
  const {
    setError, setParts, setStock, setTickets, setTransactions, setTrash, setTrashLoading, trash,
  } = ctx;
  const withBusy = (...a) => ctx.withBusy(...a);

  async function loadTrash() {
    setTrashLoading(true);
    try {
      const [prods, prs, txs, tcks] = await Promise.all([
        fetchAllRows(() => supabase.from("products").select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false })),
        supabase.from("parts").select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false }),
        fetchAllRows(() => supabase.from("transactions").select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false })),
        fetchAllRows(() => supabase.from("service_tickets").select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false })),
      ]);
      setTrash({
        products: (unwrap(prods) || []).map(pFromApi),
        parts: (unwrap(prs) || []).map(partFromApi),
        transactions: (unwrap(txs) || []).map(txFromApi),
        tickets: (unwrap(tcks) || []).map(tFromApi),
      });
    } catch (e) {
      setError("Kuka betöltési hiba: " + e.message);
    } finally {
      setTrashLoading(false);
    }
  }
  async function restoreProduct(id) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("products").update({ deleted_at: null }).eq("id", id).select());
      setStock((prev) => [pFromApi(r[0]), ...prev]);
      setTrash((t) => ({ ...t, products: t.products.filter((p) => p.id !== id) }));
    });
  }
  async function restorePart(id) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("parts").update({ deleted_at: null }).eq("id", id).select());
      setParts((prev) => [partFromApi(r[0]), ...prev]);
      setTrash((t) => ({ ...t, parts: t.parts.filter((p) => p.id !== id) }));
    });
  }
  async function restoreTransaction(id) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("transactions").update({ deleted_at: null }).eq("id", id).select());
      setTransactions((prev) => [txFromApi(r[0]), ...prev]);
      setTrash((t) => ({ ...t, transactions: t.transactions.filter((x) => x.id !== id) }));
    });
  }
  async function restoreTicket(id) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("service_tickets").update({ deleted_at: null }).eq("id", id).select());
      setTickets((prev) => [{ ...tFromApi(r[0]), usedParts: [] }, ...prev]);
      setTrash((t) => ({ ...t, tickets: t.tickets.filter((x) => x.id !== id) }));
    });
  }
  async function hardDeleteProduct(id) {
    await withBusy(async () => {
      const { data: photos } = await supabase.from("product_photos").select("storage_path").eq("product_id", id);
      if (photos && photos.length > 0) {
        await supabase.storage.from("product-photos").remove(photos.flatMap((p) => [p.storage_path, thumbPathOf(p.storage_path)])).catch(() => {});
      }
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) {
        if (error.code === "23503") throw new Error("Ez a telefon nem törölhető véglegesen, mert egy beszerzési tételhez van kötve.");
        throw new Error(error.message);
      }
      setTrash((t) => ({ ...t, products: t.products.filter((p) => p.id !== id) }));
    });
  }
  async function hardDeletePart(id) {
    await withBusy(async () => {
      const { error } = await supabase.from("parts").delete().eq("id", id);
      if (error) {
        if (error.code === "23503") throw new Error("Ez az alkatrész nem törölhető véglegesen, mert szerviz munkalapokhoz van kötve.");
        throw new Error(error.message);
      }
      setTrash((t) => ({ ...t, parts: t.parts.filter((p) => p.id !== id) }));
    });
  }
  async function hardDeleteTransaction(id) {
    await withBusy(async () => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) {
        if (error.code === "23503") throw new Error("Ez a tétel nem törölhető véglegesen, mert hűségpont-jóváíráshoz van kötve.");
        throw new Error(error.message);
      }
      setTrash((t) => ({ ...t, transactions: t.transactions.filter((x) => x.id !== id) }));
    });
  }
  async function hardDeleteTicket(id) {
    await withBusy(async () => {
      const { error } = await supabase.from("service_tickets").delete().eq("id", id);
      if (error) {
        if (error.code === "23503") throw new Error("Ez a munkalap nem törölhető véglegesen, mert egy ügyfél-megkereséshez van kötve.");
        throw new Error(error.message);
      }
      setTrash((t) => ({ ...t, tickets: t.tickets.filter((x) => x.id !== id) }));
    });
  }
  // Egyesével töröl (nem tömbösen "in()"-nel), hogy egy-egy másik rekordhoz kötött
  // (FK-val blokkolt) tétel ne akassza meg a többi, egyébként törölhető tétel törlését.
  async function hardDeleteAllTrash() {
    await withBusy(async () => {
      const notes = [];
      const deleteEach = async (items, label, delFn) => {
        // Kategórián belül párhuzamosan (egyszerre max. 8), a blokkolt tétel marad a kukában.
        let deleted = 0;
        for (let i = 0; i < items.length; i += 8) {
          const results = await Promise.allSettled(items.slice(i, i + 8).map(delFn));
          deleted += results.filter((r) => r.status === "fulfilled").length;
        }
        const blocked = items.length - deleted;
        if (blocked > 0) notes.push(`${label}: ${deleted} törölve, ${blocked} nem törölhető (más rekordhoz van kötve).`);
      };

      if (trash.products.length > 0) {
        await deleteEach(trash.products, "Telefonok", async (p) => {
          const { data: photos } = await supabase.from("product_photos").select("storage_path").eq("product_id", p.id);
          if (photos && photos.length > 0) {
            await supabase.storage.from("product-photos").remove(photos.flatMap((ph) => [ph.storage_path, thumbPathOf(ph.storage_path)])).catch(() => {});
          }
          const { error } = await supabase.from("products").delete().eq("id", p.id);
          if (error) throw error;
        });
      }
      if (trash.transactions.length > 0) {
        await deleteEach(trash.transactions, "Tranzakciók", async (t) => {
          const { error } = await supabase.from("transactions").delete().eq("id", t.id);
          if (error) throw error;
        });
      }
      if (trash.tickets.length > 0) {
        await deleteEach(trash.tickets, "Munkalapok", async (t) => {
          const { error } = await supabase.from("service_tickets").delete().eq("id", t.id);
          if (error) throw error;
        });
      }
      if (trash.parts.length > 0) {
        await deleteEach(trash.parts, "Alkatrészek", async (p) => {
          const { error } = await supabase.from("parts").delete().eq("id", p.id);
          if (error) throw error;
        });
      }

      await loadTrash();
      if (notes.length > 0) throw new Error(notes.join(" "));
    });
  }

  return {
    loadTrash, restoreProduct, restorePart, restoreTransaction, restoreTicket, hardDeleteProduct,
    hardDeletePart, hardDeleteTransaction, hardDeleteTicket, hardDeleteAllTrash,
  };
}

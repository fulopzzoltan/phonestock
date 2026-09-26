import { useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";
import { tFromApi, spFromApi, txFromApi, dayCloseFromApi, chatMessageFromApi, pFromApi } from "./mappers";

// Élő szinkron a kollégák között: egyetlen Realtime csatornán csak a változott sorok jönnek
// (ugyanazon a WebSocketen, amit a belső chat is használ). Az RLS itt is érvényes, mindenki
// csak azt kapja, amit egyébként is láthat. Kapcsolat-kiesés után egy csendes teljes
// újratöltés pótolja a közben elmaradt eseményeket.
function upsertById(list, item, prepend = true) {
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx === -1) return prepend ? [item, ...list] : [...list, item];
  const next = list.slice();
  next[idx] = item;
  return next;
}
const removeById = (list, id) => list.filter((x) => x.id !== id);

export function useLiveSync({ enabled, setTickets, setTransactions, setDayCloses, setInboxMessages, setStock, loadAll }) {
  const loadAllRef = useRef(loadAll);
  loadAllRef.current = loadAll;

  useEffect(() => {
    if (!enabled) return;

    // A munkalapot és a tranzakciót join-okkal (aláírások, alkatrészek, számlák) együtt
    // olvassuk újra, mert a Realtime payload csak a nyers sort tartalmazza.
    async function refreshTicket(id) {
      const [{ data: rows }, { data: sps }] = await Promise.all([
        supabase.from("service_tickets").select("*, signatures(*)").eq("id", id).is("deleted_at", null),
        supabase.from("service_parts").select("*").eq("service_ticket_id", id),
      ]);
      const row = rows?.[0];
      setTickets((prev) => (row
        ? upsertById(prev, { ...tFromApi(row), usedParts: (sps || []).map(spFromApi) })
        : removeById(prev, id)));
    }
    async function refreshTransaction(id) {
      const { data: rows } = await supabase.from("transactions").select("*, smartbill_documents(*), signatures(*)").eq("id", id).is("deleted_at", null);
      const row = rows?.[0];
      setTransactions((prev) => (row ? upsertById(prev, txFromApi(row)) : removeById(prev, id)));
    }

    let wasDisconnected = false;
    const channel = supabase
      .channel("live_sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "service_tickets" }, (p) => {
        const id = p.new?.id || p.old?.id;
        if (id) refreshTicket(id).catch(() => {});
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, (p) => {
        const id = p.new?.id || p.old?.id;
        if (id) refreshTransaction(id).catch(() => {});
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "day_closes" }, (p) => {
        if (p.eventType === "DELETE") setDayCloses((prev) => removeById(prev, p.old.id));
        else setDayCloses((prev) => upsertById(prev, dayCloseFromApi(p.new)));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, (p) => {
        if (p.eventType === "DELETE") setInboxMessages((prev) => removeById(prev, p.old.id));
        else setInboxMessages((prev) => upsertById(prev, chatMessageFromApi(p.new), false));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, (p) => {
        if (p.eventType === "DELETE" || p.new?.deleted_at) {
          const id = p.new?.id || p.old?.id;
          setStock((prev) => removeById(prev, id));
          return;
        }
        setStock((prev) => {
          const existing = prev.find((x) => x.id === p.new.id);
          return upsertById(prev, { ...pFromApi(p.new), acquisition: existing?.acquisition || null });
        });
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          if (wasDisconnected) loadAllRef.current({ silent: true });
          wasDisconnected = false;
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          wasDisconnected = true;
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, [enabled, setTickets, setTransactions, setDayCloses, setInboxMessages, setStock]);
}

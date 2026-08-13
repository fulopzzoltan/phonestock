import { useEffect, useState, useRef, useCallback } from "react";
import { supabase, unwrap } from "./supabaseClient";
import { internalMessageFromApi } from "./mappers";

export function useInternalChat(profile) {
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    audioRef.current = new Audio("/notify.wav");
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = unwrap(await supabase.from("internal_messages").select("*").order("created_at", { ascending: true }).limit(200));
      if (!cancelled) setMessages(r.map(internalMessageFromApi));
    })();

    const channel = supabase
      .channel("internal_messages_realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "internal_messages" }, (payload) => {
        const msg = internalMessageFromApi(payload.new);
        setMessages((prev) => [...prev, msg]);
        if (msg.senderId !== profile?.id) {
          setUnreadCount((n) => n + 1);
          audioRef.current?.play().catch(() => {});
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification("Új üzenet a boltban", { body: msg.body.slice(0, 120) });
          }
        }
      })
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [profile?.id]);

  const send = useCallback(async (body, linkedTicketId = null, linkedProductId = null) => {
    unwrap(await supabase.from("internal_messages").insert({
      sender_id: profile?.id, body, linked_ticket_id: linkedTicketId, linked_product_id: linkedProductId,
    }));
  }, [profile?.id]);

  const markRead = useCallback(() => setUnreadCount(0), []);

  return { messages, unreadCount, send, markRead };
}

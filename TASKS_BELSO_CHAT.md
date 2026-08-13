# TASKS — Belső csapat-chat (Gyimes ↔ Szentgyörgy)

**Kontextus:** a két bolt közötti kommunikáció most Messengeren megy, ami elveszik a személyes üzenetek között. Mivel a PhoneStock app amúgy is állandóan nyitva van a pulton, egy itt megjelenő üzenet/értesítés sokkal biztosabban átmegy. Cél: egy egyszerű, közös csapat-chat az appon belül, munkalapra/termékre hivatkozási lehetőséggel, hang- és desktop-értesítéssel.

Ez **külön** a Messenger-integrációtól (azt majd külön TASKS-fájlban tervezzük, ha erre sor kerül) — most csak a belső csapat-chat.

Ne pusholj / ne deployolj, csak lokális commit, amíg nem szólnak.

---

## 1. DB — tábla + Realtime

```sql
create table public.internal_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references auth.users(id),
  body text not null,
  linked_ticket_id uuid references public.service_tickets(id),
  linked_product_id uuid references public.products(id),
  created_at timestamptz not null default now()
);

alter table public.internal_messages enable row level security;

-- minden bejelentkezett usernek (mindkét helyszín) látja/írhatja — ez egy közös, boltok közötti csatorna,
-- szándékosan NEM helyszín-korlátozott (ellentétben a legtöbb más táblával), mert pont az a cél,
-- hogy a két hely tudjon egymással kommunikálni
create policy internal_messages_rw on public.internal_messages for all to authenticated using (true) with check (true);

-- Realtime bekapcsolása erre a táblára, hogy a kliens azonnal értesüljön új üzenetről
alter publication supabase_realtime add table public.internal_messages;
```

Használd `apply_migration`-t.

---

## 2. Mapper

**Fájl:** `src/lib/mappers.js`:
```js
export const internalMessageFromApi = (r) => ({
  id: r.id,
  senderId: r.sender_id,
  body: r.body,
  linkedTicketId: r.linked_ticket_id,
  linkedProductId: r.linked_product_id,
  createdAt: r.created_at,
});
```

---

## 3. Üzenetküldő/olvasó React hook — Realtime feliratkozás

**Új fájl:** `src/lib/useInternalChat.js` (vagy közvetlenül az `App.jsx`-be, ha nem akarsz külön hook-fájlt, de a tisztaság kedvéért érdemes külön):

```js
import { useEffect, useState, useRef, useCallback } from "react";
import { supabase, unwrap } from "./supabaseClient";
import { internalMessageFromApi } from "./mappers";

export function useInternalChat(profile) {
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    audioRef.current = new Audio("/notify.mp3"); // ld. 5. pont
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
          audioRef.current?.play().catch(() => {}); // némítható böngésző-korlát miatt, ld. 5. pont
          if (Notification.permission === "granted") {
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
```

---

## 4. UI — chat-widget a sidebar-ban

**Fájl:** `src/App.jsx` — a sidebar alján (a "Kuka" navbtn alá, vagy egy lebegő gomb jobb alsó sarokban, döntsd el melyik illik jobban a layouthoz) egy új gomb: 💬 ikon + unread-badge (piros pötty a számmal, mint a legtöbb chat app), ami megnyit egy lebegő panelt (nem külön tab/oldal — maradjon mindig elérhető, bármelyik tabon vagy).

**Új fájl:** `src/components/TeamChatPanel.jsx`:
- Egyszerű, alulra igazított üzenetlista (legrégebbi fent, legújabb lent, auto-scroll az aljára új üzenetnél), minden üzenetnél feladó neve (`profiles` táblából, join vagy egy `users` lookup a már betöltött `users` state-ből) + időpont.
- Alul egy input mező + Küldés gomb.
- **Hivatkozás munkalapra/termékre:** az input mezőben figyeld a `#` karaktert — ha a user beír egy `#`-et és utána számjegyeket, ajánlj fel egy kis dropdown-listát a hozzávetőlegesen egyező `ticket_no`/`part_no` alapján (a már betöltött `tickets`/`stock` state-ből kliens oldalon szűrve, nem kell külön API hívás). Kiválasztáskor a `linkedTicketId`/`linkedProductId` beállítódik, és az üzenet szövegébe egy vizuálisan kiemelt chip kerül (pl. "🔧 #234 — iPhone 13").
- A megjelenő üzenetlistában, ha egy üzenethez van `linkedTicketId`/`linkedProductId`, az kattintható chip legyen, ami megnyitja a megfelelő részletpanelt (`setDetailId`/`setProductDetailId`, amik már léteznek az App.jsx-ben).
- A panel megnyitásakor hívd meg a `markRead()`-et.

---

## 5. Hangjelzés + desktop notification — technikai korlátok, amikre figyelj

- **Böngésző audio-korlát:** a böngészők nem engedik automatikusan lejátszani a hangot, amíg nem volt legalább egy user-interakció az oldalon az adott betöltés óta. Mivel az eladók amúgy is folyamatosan kattintgatnak az appban, ez a gyakorlatban nem lesz gond — de az első betöltéskor (pl. reggel, mielőtt bárki kattintott) néma maradhat az első üzenet hangja. Nem kell erre bonyolult megoldást építeni, csak legyen tudatos, hogy ez van.
- **Desktop notification engedély:** kérj engedélyt (`Notification.requestPermission()`) egyszer, amikor a user először megnyitja a chat-panelt (ne az app betöltésekor azonnal, mert azt a böngészők/userek általában elutasítják, ha nincs kontextusa) — tegyél be egy kis magyarázó szöveget is mellé ("Engedélyezd az értesítéseket, hogy lásd, ha a másik bolt ír").
- **Hangfájl:** tegyél egy rövid, nem idegesítő értesítés-hangot `public/notify.mp3`-ként (vagy `src/assets/`, a Vite build-konfigtól függően — nézd meg hogy a projekt hogyan szolgál ki statikus fájlokat, kövesd azt a mintát).

---

## 6. Ellenőrzőlista implementálás után

- Két különböző böngészőablakban (vagy két különböző userrel) bejelentkezve, az egyikben küldött üzenet a másikban valós időben megjelenik (Realtime working)
- Unread badge helyesen számol, panel megnyitásakor nullázódik
- `#123` beírásra felajánlja a megfelelő munkalapot/terméket, kiválasztás után az üzenetben chip-ként megjelenik, és a beérkező oldalon kattintható
- Hangjelzés lejátszódik (miután volt már user-interakció az oldalon), desktop notification felugrik, ha engedélyezve van
- RLS: bejelentkezés nélkül (anon) senki nem éri el az `internal_messages` táblát
- Mobil/keskeny nézetben a chat-panel nem takarja el használhatatlanul a fő felületet

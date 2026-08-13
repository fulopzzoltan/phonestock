# TASKS — Admin-meghívós regisztráció (a nyílt önregisztráció leváltása)

**Kontextus:** 2026-08-12-én DB-szinten már kijavítottam két akut biztonsági rést (ld. `git log`/Supabase migrations: `security_hardening_before_second_employee`, `restrict_trigger_function_direct_exec`):
1. Egy bejelentkezett user a saját `profiles.role`/`location_id` mezőjét tudta módosítani (self-privilege-escalation) — ezt egy `before update` trigger blokkolja.
2. Több tábla (`customers`, `parts`, `service_parts`, `internal_messages`, `locations` SELECT, `stock_value_history` SELECT) bármelyik bejelentkezett usernek nyitva volt, még mielőtt admin jóváhagyta/helyszínhez rendelte volna — most már admin vagy már jóváhagyott (helyszínnel rendelkező) userre szűkítve.

**Ez a feladat a következő lépés:** a jelenlegi nyílt "Regisztráció" gomb (bárki fiókot hozhat létre a `/admin` oldalon) leváltása egy admin-meghívós folyamatra — ez a szabványos gyakorlat belső, érzékeny adatot kezelő alkalmazásoknál. Az ügyfél-oldal (`/status`, `/receipt`, `/keszlet`) NE változzon — az helyesen anonim/token-alapú, nem kell neki fiók.

Ne pusholj / ne deployolj, csak lokális commit, amíg nem szólnak.

---

## 1. Edge Function — meghívó küldése

A Supabase Admin API-hoz (`auth.admin.inviteUserByEmail`) `service_role` kulcs kell, amit **soha nem szabad a böngészőben futó kódba tenni** — ezért egy Edge Function-ön keresztül kell meghívni, ami csak admin hívhat.

**Új Edge Function:** `invite-employee` (kövesd a meglévő `send-sms` function mintáját a projektben — deploy módszer, CORS-kezelés ugyanaz).

```ts
// supabase/functions/invite-employee/index.ts (vázlat)
import { createClient } from "supabase-js";

Deno.serve(async (req) => {
  // CORS-kezelés a send-sms mintájára

  const authHeader = req.headers.get("Authorization");
  const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data: profile } = await supabaseClient.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return new Response("Csak admin hívhat meg új felhasználót.", { status: 403 });

  const { email, fullName, locationId } = await req.json();

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    redirectTo: `${SITE_URL}/admin`,
  });
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });

  // ha rögtön tudod a helyszínt, állítsd be a profilon (a handle_new_user trigger már létrehozta a profiles sort)
  if (locationId) {
    await adminClient.from("profiles").update({ location_id: locationId }).eq("id", data.user.id);
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});
```

Deployhoz kell a `SUPABASE_SERVICE_ROLE_KEY` mint Edge Function secret (a Supabase dashboardon vagy a Supabase MCP `deploy_edge_function`/secret-kezelő eszközeivel állítsd be — **soha ne kerüljön a repóba vagy a kliens kódba**).

---

## 2. UI — "Felhasználók" fül bővítése

**Fájl:** `src/App.jsx`, a `tab === "users"` blokk — adj egy "+ Új kolléga meghívása" gombot, ami egy kis modalt nyit: email, név, helyszín (opcionális, utólag is beállítható). Submitkor hívja az Edge Function-t:
```js
await supabase.functions.invoke("invite-employee", { body: { email, fullName, locationId } });
```
Sikeres meghívás után egy info-üzenet: "Meghívó elküldve — a kollégád emailben kap egy linket a jelszó beállításához."

---

## 3. A nyílt "Regisztráció" fül eltávolítása/elrejtése

**Fájl:** `src/Login.jsx` — vedd ki a "Regisztráció" fület és a `mode === "signup"` ágat teljesen (vagy rejtsd el egy environment-flag mögé, ha átmenetileg még szükség lehet rá). Csak "Bejelentkezés" maradjon — az új fiókok mostantól kizárólag meghívóból jönnek létre.

**Fontos:** a Supabase Auth-ban is érdemes explicit módon letiltani a nyílt sign-up-ot (Authentication → Settings → "Enable email signups" kikapcsolása, vagy hasonló beállítás a jelenlegi Supabase UI-ban — nézd meg a pontos elnevezést a projekt dashboardján), hogy még API-n keresztül se lehessen megkerülni a UI hiányát.

---

## 4. Az első-user-admin bootstrap logika felülvizsgálata

A `handle_new_user` trigger jelenleg az első valaha regisztrált usert automatikusan adminná teszi — ez rendben volt, amíg nyílt volt a regisztráció (te voltál az első). Most, hogy meghívó-alapúra váltunk, ez a logika lényegében soha többé nem fog lefutni újra (mert nem lesz több nyílt regisztráció) — nem kell hozzányúlni, csak legyen tudatos, hogy ez egy "csak a legelső alkalommal" szabály volt, nem általános minta.

---

## 5. Egyéb, alacsony-effort biztonsági javítás, amit érdemes még most megcsinálni

- **Supabase Auth → "Leaked password protection" bekapcsolása** (Auth beállítások, HaveIBeenPwned-ellenőrzés jelszavaknál) — 1 kattintás a Supabase dashboardon, ingyenes, most van itt az ideje, hogy valódi új fiók jön létre.
- Fontold meg az **email-megerősítés kötelezővé tételét** (ha még nincs bekapcsolva) — meghívó-alapú regisztrációnál ez amúgy is automatikusan biztosított (a meghívó linkje maga a megerősítés).

---

## Ellenőrzőlista implementálás után

- Admin tud új kollégát meghívni, a meghívott email-t kap, a linkre kattintva be tud állítani jelszót és be tud lépni
- A meghívott user profilja a megfelelő `location_id`-vel jön létre (ha admin megadta), vagy `null`-lal (ha admin utólag rendeli hozzá a meglévő "Felhasználók" listából)
- A "Regisztráció" fül eltűnt a `/admin` login oldalról
- Próbáld meg közvetlenül (pl. `curl`/Postman) meghívni az Edge Function-t egy nem-admin fiók tokenjével — 403-at kell adjon
- A korábbi DB-szintű javítások (self-privilege-escalation trigger, szűkített RLS-ek) élesben is megvannak — ha valamikor visszaállítanátok egy migrációt vagy resetelnétek egy branch-et, ellenőrizzétek, hogy ezek nem vesztek-e el

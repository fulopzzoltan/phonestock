# TASKS — most esedékes javítások

**Státusz (2026-08-12): mind a 4 pont elkészült**, 4 külön commit-ban (`a118deb`, `f086f4e`, `5924d9c`, `8c55ebd`). Lokálisan vannak, még nincs pusholva/deployolva. A leírás lent referenciaként marad — az ellenőrzőlistát még érdemes végigfuttatni élesben.

Ez egy végrehajtható feladatlista a kódoló agentnek (Claude Code). Mind a 4 pont kicsi, önálló change — külön commit-ban vidd fel mindegyiket, hogy visszakövethető legyen. **Ne pusholj / ne deployolj**, a CLAUDE.md szabálya szerint csak lokális commit, amíg nem szólnak.

---

## 1. Kötelező telefonszám eladásnál

**Fájl:** `src/components/SellModal.jsx`

Jelenleg a "Rögzítés" gomb (44. sor körül) mindig aktív, a vevő neve/telefonszáma validáció nélküli szabad szöveg mező. Ha ezt üresen hagyják, az ügyfél nem kerül be a Kliensek táblába, nem kap SMS-t, és nincs mihez kötni a garancia-utókövetést.

Tennivaló:
- Vezess be egy `valid` változót: `const valid = f.customerPhone.trim().length > 0;`
- A "Rögzítés" gombra tedd rá: `disabled={busy || !valid}`
- A "Telefonszám" mezőnél a label mellé/alá tegyél egy apró jelzést, hogy kötelező (pl. `label` szöveg végére `*`, vagy piros szegély, ha üres és a user már próbált menteni — a projektben más kötelező mezőknél (`TicketFormModal.jsx` `valid` logikája) hasonló mintát már használunk, kövesd azt).
- A vevő neve maradhat opcionális (csak a telefonszám legyen kötelező, mert az kell az SMS-hez és a dedup-hoz).

---

## 2. SMS-küldési hibák ne tűnjenek el csendben

**Fájl:** `src/App.jsx`

Két helyen (`addTicket` kb. 303. sor, `setTicketStatus` kb. 326. sor) így néz ki a hívás:

```js
supabase.functions.invoke("send-sms", { body: { phone, message } }).catch(() => {});
```

A hiba jelenleg teljesen elveszik. Cseréld mindkét helyen erre a mintára:

```js
supabase.functions.invoke("send-sms", { body: { phone, message } }).catch((err) => {
  console.error("SMS küldés sikertelen:", err);
  setError("Az SMS nem ment ki (a mentés egyébként sikeres volt) — nézd meg a konzolt vagy próbáld újra.");
});
```

Ne blokkolja a fő mentési folyamatot (a ticket/státusz mentése menjen át SMS-küldési hibától függetlenül is) — csak legyen látható jelzés, ha nem sikerült kiküldeni. Az `error` state és a hozzá tartozó megjelenítés (`setError`) már létezik az App.jsx-ben, azt használd.

---

## 3. Garanciális tabon hívás- és SMS-gomb az utókövetéshez

**Fájl:** `src/App.jsx`, a `tab === "warranty"` blokk (kb. 808–840. sor), plusz az `activeWarranties` `useMemo` (kb. 471–485. sor).

Az `activeWarranties` már tartalmazza a `customerPhone`-t soronként, csak nincs kirenderelve. Tennivaló:
- Importáld a `CallLink` komponenst App.jsx tetejére (`import CallLink from "./components/CallLink";`), ha még nincs.
- A táblázat fejlécébe (`<thead>`) tegyél egy új `<th>Művelet</th>` oszlopot.
- Minden sorban (`activeWarranties.map(...)`) tegyél egy új `<td>`-t, benne:
  - egy `<CallLink phone={w.customerPhone} />` gombot (ha van telefonszám),
  - egy "Emlékeztető SMS" gombot, ami meghívja a már meglévő `send-sms` edge function-t, kb. így:
    ```js
    const message = stripAccents(`Szia! A(z) ${w.label} garanciája hamarosan lejár (${w.expiry}). Ha bármi gond van a készülékkel, keress minket!`);
    supabase.functions.invoke("send-sms", { body: { phone: w.customerPhone, message } })
      .then(() => alert("SMS elküldve."))
      .catch((err) => { console.error(err); setError("Az SMS nem ment ki."); });
    ```
  - a gomb legyen `disabled` ha nincs `w.customerPhone`.
- `stripAccents` már importálva van a fájlban (lásd a többi SMS-hívást), azt használd itt is.

Ez a roadmap "garancia lejárat előtti megkeresés" pontjának a megvalósítása — a cél, hogy innen egy kattintással fel lehessen hívni vagy SMS-t küldeni a hamarosan lejáró garanciás ügyfeleknek.

---

## 4. Végleges törlés a Kukából

**Fájl:** `src/App.jsx`, a `tab === "trash"` blokk (kb. 878–970. sor) + az adatműveletek szekció (kb. 143–195. sor, ahol a `restoreProduct`/`restorePart`/`restoreTransaction`/`restoreTicket` függvények vannak).

Jelenleg a Kukában csak "Visszaállítás" gomb van, végleges törlésre nincs lehetőség — a `deleted_at`-tel megjelölt sorok örökre bent maradnak a táblákban.

Tennivaló:
- Hozz létre 4 új függvényt a meglévő `restore*` függvények mellé, ugyanazzal a mintával:
  ```js
  async function hardDeleteProduct(id) {
    await withBusy(async () => {
      unwrap(await supabase.from("products").delete().eq("id", id));
      setTrash((t) => ({ ...t, products: t.products.filter((p) => p.id !== id) }));
    });
  }
  ```
  (és ugyanígy `hardDeletePart`, `hardDeleteTransaction`, `hardDeleteTicket` a megfelelő táblanévvel és state-mezővel.)
- A Kuka négy táblázatában (Telefonok / Alkatrészek / Bevételek & Kiadások / Szerviz munkalapok) a "Visszaállítás" gomb mellé tegyél egy második gombot: a projektben már használt `ConfirmDelete` komponenst (`variant="full"`), ami a megfelelő `hardDelete*` függvényt hívja `onConfirm`-ban. Ez már ad "Biztos?" megerősítést, nem kell külön modal.
- **Fontos, mielőtt implementálod:** nézd meg a Supabase-ben (MCP `list_tables` / `get_advisors`, vagy a migrációkat), hogy van-e olyan idegenkulcs-kapcsolat, ami miatt a `DELETE` hibát dobna (pl. `service_parts.service_ticket_id`, vagy egy `transactions` sor amire egy nyomtatott bizonylat token mutat). Ha van FK constraint `ON DELETE RESTRICT`-tel, vagy kezeld a hibát felhasználóbarát üzenettel (`setError("Ez a tétel nem törölhető, mert kapcsolódó adat tartozik hozzá.")`), vagy a kapcsolódó sorokat is töröld/null-ozd előtte.

---

## Ellenőrzőlista implementálás után

- Mind a 4 pont lokálisan tesztelve (`npm run dev`), böngészőben kipróbálva
- Eladás kötelező telefonszám nélkül nem menthető
- SMS-hiba szimulálva (pl. rossz szám) és látszik a hibaüzenet
- Garanciális tabon hívás/SMS gomb működik egy teszt sorral
- Kuka: végleges törlés működik, és nem dob DB hibát egyik táblánál sem
- Nincs `git push`, csak lokális commit-ok, amíg nem szólnak

const KEY = "telefonos_lang_pref";

// Ha valaki kézzel átvált HU/RO között, ezt hívjuk meg — attól kezdve az automatikus,
// böngésző-nyelv szerinti átirányítás (lásd lent) többé nem nyúl hozzá.
export function markLangChosen(lang) {
  try { localStorage.setItem(KEY, lang); } catch { /* privát böngészés stb. — nem gond, csak nem emlékszünk rá */ }
}

// Csak az első látogatáskor fut le, még a React-render előtt: ha a böngésző/eszköz nyelve
// román, és épp egy olyan magyar oldalon vagyunk, aminek van RO tükörpárja, átirányítunk oda.
// Ha valaki már járt itt (akár ez döntött korábban, akár kézzel választott), többé nem szólunk bele.
export function redirectToPreferredLang({ stockMatch, phoneDetailMatch, repairMatch, finderMatch }) {
  let chosen;
  try { chosen = localStorage.getItem(KEY); } catch { return false; }
  if (chosen) return false;

  if (window.location.pathname.startsWith("/ro/")) {
    markLangChosen("ro");
    return false;
  }

  const browserLang = (navigator.language || navigator.userLanguage || "").toLowerCase();
  if (!browserLang.startsWith("ro")) {
    markLangChosen("hu");
    return false;
  }

  const search = window.location.search || "";
  if (stockMatch) { window.location.replace("/ro/telefoane" + search); return true; }
  if (phoneDetailMatch) { window.location.replace(`/ro/telefon/${phoneDetailMatch[1]}` + search); return true; }
  if (repairMatch) { window.location.replace("/ro/estimare" + search); return true; }
  if (finderMatch) { window.location.replace("/ro/asistent" + search); return true; }

  // Ennek az oldalnak nincs román tükörpárja — nem irányítunk át, de a döntést megjegyezzük,
  // hogy legközelebb (pl. a főoldalon) már ne kérdezze meg magától újra.
  markLangChosen("hu");
  return false;
}

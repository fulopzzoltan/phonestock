import { partCode, phoneCode, ticketCode } from "../../lib/utils";

export function createCoreActions(ctx) {
  const {
    locName, parts, setBusy, setDetailId, setError, setInfo, setPartDetailId, setPartSearch,
    setProductDetailId, setScannerOpen, setSearch, setSvcSearch, stock, tickets,
  } = ctx;

  async function withBusy(fn) {
    setBusy(true);
    try { const result = await fn(); setError(""); return result; }
    catch (e) { setError(e.message || "Hiba történt."); }
    finally { setBusy(false); }
  }
  // QR/vonalkód-szkennelés eredményének feloldása — ld. QR_SZKENNELES_ES_NYOMTATO_JAVASLAT.md.
  // A kód formátuma maga elárulja, mi az (a helyszín-előtaggal záruló "S" a munkalap, a "-T" a
  // telefon, a "-A" az alkatrész saját azonosítója), úgyhogy egyetlen szkenner-gomb elég
  // mindhárom fülön — nem kell tudnia, melyikről nyitották.
  function handleScanResult(raw) {
    const code = raw.trim();
    setScannerOpen(false);
    if (/^https?:\/\//i.test(code)) {
      window.open(code, "_blank", "noopener,noreferrer");
      return;
    }
    const ticketMatch = code.match(/^\d+-[A-Za-z]+S$/i);
    if (ticketMatch) {
      const t = tickets.find((t) => (ticketCode(t.ticketNo, locName(t.intakeLocationId)) || "").toUpperCase() === code.toUpperCase());
      if (t) { setDetailId(t.id); return; }
    }
    if (/^\d+-T$/i.test(code)) {
      const p = stock.find((p) => (phoneCode(p.productNo) || "").toUpperCase() === code.toUpperCase());
      if (p) { setProductDetailId(p.id); return; }
    }
    if (/^\d+-A$/i.test(code)) {
      const a = parts.find((a) => (partCode(a.partNo) || "").toUpperCase() === code.toUpperCase());
      if (a) { setPartDetailId(a.id); return; }
    }
    // Nincs pontos találat — a nyers kódot berakjuk mindhárom keresőmezőbe, hátha a normál
    // fuzzy kereső még mindig megtalálja (pl. csak a szám egyezik, az előtag nem).
    setSvcSearch(code);
    setSearch(code);
    setPartSearch(code);
    setInfo(`Nincs pontos találat "${code}" kódra — a keresőbe bemásoltuk.`);
  }

  return {
    withBusy, handleScanResult,
  };
}

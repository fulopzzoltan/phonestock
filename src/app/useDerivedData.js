import { useMemo } from "react";
import { isSlowMoving, isStaleReady, isWarrantyActive, money, normalizeImei, phoneCode, rollingBusinessWeekStart, slaInfo, ticketCode, today, warrantyExpiry } from "../lib/utils";

// Listákból számolt nézetek (szűrések, statisztikák, garancialisták) — renderenként, memózva.
export function useDerivedData(ctx) {
  const {
    custSearch, customerKey, customerProfiles, customersTable, detailId, deviceHistoryImei,
    effectiveLocFilter, inboxMessages, isAdmin, leaveBalances, leaveRequests, locFilter, locName,
    locations, monthlySummaries, myLocationId, notes, partDetailId, partSearch, parts, productDetailId,
    receiptTxId, reserveLocId, search, setDetailId, setDeviceHistoryImei, setProductDetailId, stock,
    svcSearch, ticketModal, tickets, transactions, users, waitingItems, warranties, warrantyFilter,
    webOrders,
  } = ctx;
  // FILTERED DATA
  // A Telefonok fülön az alkalmazottak is lássák mindkét helyszín készletét (csak megtekintés) —
  // ezért ez a szűrő admin esetén a locFilter-t követi, alkalmazottnál mindig "all".
  const stockLocFilter = isAdmin ? locFilter : "all";
  const filteredStock = useMemo(() => {
    let s = stock.filter((i) => i.status === "in_stock");
    if (stockLocFilter !== "all") s = s.filter((i) => i.locationId === stockLocFilter || i.locationId === reserveLocId);
    const q = search.trim().toLowerCase();
    if (q) s = s.filter((i) => [i.brand, i.model, i.imei, i.color, phoneCode(i.productNo)].join(" ").toLowerCase().includes(q));
    return [...s].sort((a, b) => (a.brand || "").localeCompare(b.brand || "", "hu") || (a.model || "").localeCompare(b.model || "", "hu"));
  }, [stock, stockLocFilter, search, reserveLocId]);
  const txByProductId = useMemo(() => {
    const m = new Map();
    for (const t of transactions) if (t.productId) m.set(t.productId, t);
    return m;
  }, [transactions]);
  const productConditionById = useMemo(() => {
    const m = new Map();
    for (const p of stock) m.set(p.id, { condition: p.condition, source: p.source });
    return m;
  }, [stock]);
  const soldStock = useMemo(() => {
    let s = stock.filter((i) => i.status === "sold");
    if (stockLocFilter !== "all") s = s.filter((i) => i.locationId === stockLocFilter || i.locationId === reserveLocId);
    const q = search.trim().toLowerCase();
    if (q) s = s.filter((i) => [i.brand, i.model, i.imei, i.color, phoneCode(i.productNo)].join(" ").toLowerCase().includes(q));
    const withTx = s.map((i) => ({ ...i, saleTx: txByProductId.get(i.id) || null }));
    return withTx.sort((a, b) => (b.saleTx?.date || "").localeCompare(a.saleTx?.date || ""));
  }, [stock, stockLocFilter, search, reserveLocId, txByProductId]);
  // A "Javítandó" raktár-állapotú saját telefonok, kézi rangsor szerint rendezve
  // (repairRank hiánya esetén a lista végére kerül, dátum szerint másodlagosan) — a
  // Telefonok fülön, Szerviz szűrésnél a rangsoroló gombok ezt a sorrendet módosítják.
  // Ez egy közös, helyszín-független sor: mindkét üzletből ide kerülnek be a
  // javítandó darabok, és innen mennek majd ki bármelyik helyszínre — ezért NEM szűrünk a
  // bal oldali helyszín-választóval, mindig minden helyszín javítandó tétele látszik.
  const refurbPhones = useMemo(() => {
    let s = stock.filter((i) => i.status === "in_stock" && i.stockStatus === "szerviz");
    return [...s].sort((a, b) => {
      const ra = a.repairRank ?? 999999, rb = b.repairRank ?? 999999;
      if (ra !== rb) return ra - rb;
      return (a.dateAdded || "").localeCompare(b.dateAdded || "");
    });
  }, [stock]);
  const refurbCount = refurbPhones.length;
  const filteredTransactions = useMemo(() => {
    if (effectiveLocFilter === "all") return transactions;
    return transactions.filter((t) => t.locationId === effectiveLocFilter);
  }, [transactions, effectiveLocFilter]);
  const dailyIncomeTrend = useMemo(() => {
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    return days.map((d) => filteredTransactions.filter((t) => t.date === d && t.type === "income" && !t.isPassthrough).reduce((s, t) => s + (Number(t.amount) || 0), 0));
  }, [filteredTransactions]);
  const filteredTickets = useMemo(() => {
    let t = effectiveLocFilter === "all" ? tickets : tickets.filter((x) => x.locationId === effectiveLocFilter);
    const q = svcSearch.trim().toLowerCase();
    if (q) t = t.filter((x) => [x.customerName, x.brand, x.model].join(" ").toLowerCase().includes(q));
    return t;
  }, [tickets, effectiveLocFilter, svcSearch]);
  const attentionCount = useMemo(() => {
    const t0 = today();
    const promisedTodayCount = filteredTickets.filter((t) => t.status !== "Átadásra" && (t.dueDate === t0 || t.handoverDate === t0)).length;
    const readyWaitingCount = waitingItems.filter((w) => w.status === "megerkezett").length;
    return webOrders.length + promisedTodayCount + readyWaitingCount;
  }, [filteredTickets, waitingItems, webOrders]);
  const stockStats = useMemo(() => ({
    count: filteredStock.length,
    value: filteredStock.reduce((s, i) => s + (Number(i.salePrice) || 0), 0),
    cost: filteredStock.reduce((s, i) => s + (Number(i.costPrice) || 0), 0),
    profit: filteredStock.reduce((s, i) => s + ((Number(i.salePrice) || 0) - (Number(i.costPrice) || 0)), 0),
    slowMoving: filteredStock.filter((p) => isSlowMoving(p, reserveLocId)).length,
  }), [filteredStock, reserveLocId]);
  // Eladott telefonok márkánkénti új/felújított megoszlása + átlagár állapotonként.
  // A tényleges eladási ár csak a linkelt tranzakción (transactions.amount) élne, de a
  // legtöbb régi eladásnál nincs ilyen link — ezért a listaárat (products.sale_price)
  // használjuk, ami majdnem minden eladott tételnél megvan.
  const soldPhoneStats = useMemo(() => {
    let sold = stock.filter((i) => i.status === "sold");
    if (effectiveLocFilter !== "all") sold = sold.filter((i) => i.locationId === effectiveLocFilter || i.locationId === reserveLocId);

    // A "gombos" (nem okos-) telefonok — Nokia/Maxcom/Philips gombos modellek, Samsung
    // Keystone/E-széria — külön kategóriaként jelennek meg, nem a valódi márkájuk alatt,
    // mert az olcsó, szinte kizárólag "Új"-ként eladott darabjaik torzítanák a márkánkénti
    // és az átlagár-statisztikát. Az "Orange" nem valódi telefon-márka (hibás adatbevitel).
    const brandCondCounts = {};
    sold.forEach((i) => {
      if (i.brand === "Orange") return;
      const brand = i.isFeaturePhone ? "Gombos telefonok" : (i.brand === "Apple" ? "iPhone" : (i.brand || "Egyéb"));
      if (!brandCondCounts[brand]) brandCondCounts[brand] = { newCount: 0, usedCount: 0 };
      if (i.condition === "New") brandCondCounts[brand].newCount++; else brandCondCounts[brand].usedCount++;
    });
    const brandConditionBreakdown = Object.entries(brandCondCounts)
      .map(([name, c]) => {
        const total = c.newCount + c.usedCount;
        return {
          name, total, newCount: c.newCount, usedCount: c.usedCount,
          newPct: total ? Math.round((c.newCount / total) * 1000) / 10 : 0,
          usedPct: total ? Math.round((c.usedCount / total) * 1000) / 10 : 0,
        };
      })
      .sort((a, b) => b.total - a.total);
    const brandTotal = brandConditionBreakdown.reduce((s, b) => s + b.total, 0);

    const avg = (arr) => (arr.length ? Math.round(arr.reduce((s, n) => s + n, 0) / arr.length) : null);
    const nonFeature = sold.filter((i) => !i.isFeaturePhone);
    const newPrices = nonFeature.filter((i) => i.condition === "New").map((i) => Number(i.salePrice) || 0).filter((n) => n > 0);
    const usedPrices = nonFeature.filter((i) => i.condition !== "New").map((i) => Number(i.salePrice) || 0).filter((n) => n > 0);
    const withCost = nonFeature.filter((i) => (Number(i.salePrice) || 0) > 0 && (Number(i.costPrice) || 0) > 0);
    const newMargins = withCost.filter((i) => i.condition === "New").map((i) => Number(i.salePrice) - Number(i.costPrice));
    const usedMargins = withCost.filter((i) => i.condition !== "New").map((i) => Number(i.salePrice) - Number(i.costPrice));

    const usedStatsForBrand = (brand) => {
      const items = nonFeature.filter((i) => i.brand === brand && i.condition !== "New");
      const prices = items.map((i) => Number(i.salePrice) || 0).filter((n) => n > 0);
      const margins = items
        .filter((i) => (Number(i.salePrice) || 0) > 0 && (Number(i.costPrice) || 0) > 0)
        .map((i) => Number(i.salePrice) - Number(i.costPrice));
      return { avgPrice: avg(prices), avgMargin: avg(margins), countPrice: prices.length, countMargin: margins.length };
    };
    const iphoneUsed = usedStatsForBrand("Apple");
    const samsungUsed = usedStatsForBrand("Samsung");

    return {
      total: brandTotal,
      brandConditionBreakdown,
      avgPriceNew: avg(newPrices),
      avgPriceUsed: avg(usedPrices),
      countNew: newPrices.length,
      countUsed: usedPrices.length,
      avgMarginNew: avg(newMargins),
      avgMarginUsed: avg(usedMargins),
      countMarginNew: newMargins.length,
      countMarginUsed: usedMargins.length,
      avgPriceUsedIPhone: iphoneUsed.avgPrice,
      avgMarginUsedIPhone: iphoneUsed.avgMargin,
      countUsedIPhone: iphoneUsed.countPrice,
      countMarginUsedIPhone: iphoneUsed.countMargin,
      avgPriceUsedSamsung: samsungUsed.avgPrice,
      avgMarginUsedSamsung: samsungUsed.avgMargin,
      countUsedSamsung: samsungUsed.countPrice,
      countMarginUsedSamsung: samsungUsed.countMargin,
    };
  }, [stock, effectiveLocFilter, reserveLocId]);
  // a folyó, még nyitott hónap élő adata a monthly_summaries mellé — a trend ne szakadjon meg a jelennél
  const currentMonthLive = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth() + 1;
    const inMonth = (t) => {
      const d = new Date(t.date + "T00:00:00");
      return d.getFullYear() === y && d.getMonth() + 1 === m;
    };
    const rows = filteredTransactions.filter(inMonth);
    const revenue = rows.filter((t) => t.type === "income" && !t.isPassthrough).reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const expenses = rows.filter((t) => t.type === "expense").reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const margin = rows.filter((t) => t.type === "income" && !t.isPassthrough).reduce((s, t) => s + (Number(t.amount) || 0) - (Number(t.costPrice) || 0), 0);
    return { year: y, month: m, revenue, expenses, margin, profit: revenue - expenses, isLive: true };
  }, [filteredTransactions]);
  // "ez a hónap eddig vs. múlt hónap ilyenkor (ugyanannyi nyitvatartási napra vetítve)"
  const monthlyTrendSummary = useMemo(() => {
    const dayOfMonth = new Date().getDate();
    let prevY = currentMonthLive.year, prevM = currentMonthLive.month - 1;
    if (prevM === 0) { prevM = 12; prevY -= 1; }
    const relevant = monthlySummaries.filter((s) => s.year === prevY && s.month === prevM && (effectiveLocFilter === "all" || s.locationId === effectiveLocFilter));
    if (relevant.length === 0) return null;
    const prevRevenue = relevant.reduce((s, r) => s + r.revenue, 0);
    const prevDaysOpen = relevant.reduce((s, r) => s + (r.daysOpen || 0), 0) / relevant.length;
    if (!prevDaysOpen) return null;
    const projected = (prevRevenue / prevDaysOpen) * dayOfMonth;
    const pct = projected > 0 ? Math.round(((currentMonthLive.revenue - projected) / projected) * 100) : null;
    return { dayOfMonth, projected, pct };
  }, [monthlySummaries, currentMonthLive, effectiveLocFilter]);
  // Minden fizikai alkatrész-darab a saját sora a `parts` táblában (státusz-követéssel:
  // raktáron/felhasznalva/hibás/visszaküldve) — a raktár-nézet ezeket name+category+brand+
  // modelFit+source szerint csoportosítva mutatja, a régi "quantity-számláló" helyett a
  // csoportba tartozó raktáron-státuszú darabok száma adja a db-oszlopot. `units` a csoport
  // FIFO-sorrendbe (part_no szerint) rendezett darabjai — felhasználáskor ebből választunk.
  const partGroups = useMemo(() => {
    const groups = new Map();
    for (const p of parts) {
      if (p.status !== "raktáron") continue;
      const key = [p.name, p.category, p.brand, p.modelFit, p.source].join("|");
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(p);
    }
    return [...groups.values()].map((units) => {
      const sorted = [...units].sort((a, b) => (Number(a.partNo) || 0) - (Number(b.partNo) || 0));
      const latest = sorted.reduce((a, b) => ((b.createdAt || "") > (a.createdAt || "") ? b : a), sorted[0]);
      const avgCost = sorted.reduce((s, u) => s + (Number(u.costPrice) || 0), 0) / sorted.length;
      const first = sorted[0];
      return {
        id: [first.name, first.category, first.brand, first.modelFit, first.source].join("|"),
        partNo: first.partNo,
        name: first.name,
        category: first.category,
        brand: first.brand,
        modelFit: first.modelFit,
        source: first.source,
        origin: first.origin,
        supplierSku: first.supplierSku,
        costPrice: avgCost,
        quantity: sorted.length,
        createdAt: latest.createdAt,
        units: sorted,
      };
    });
  }, [parts]);
  const partsStats = useMemo(() => ({
    value: partGroups.reduce((a, g) => a + (Number(g.costPrice) || 0) * g.quantity, 0),
  }), [partGroups]);
  // A listán minden egyedi tétel (saját sorszámmal) a saját sorában jelenik meg — nem
  // vonjuk össze a raktáron lévő darabokat, mint a Telefonoknál sem. A csoportosítás
  // (partGroups) csak a részletnézetnél/szerkesztésnél él tovább, azonos testvér-tételek
  // együtt kezelésére.
  const filteredParts = useMemo(() => {
    const q = partSearch.trim().toLowerCase();
    const units = parts.filter((p) => p.status === "raktáron");
    if (!q) return units;
    return units.filter((p) => [p.name, p.brand, p.modelFit, p.category, p.source].join(" ").toLowerCase().includes(q));
  }, [parts, partSearch]);
  const activeTickets = useMemo(() => filteredTickets.filter((t) => t.subStatus !== "Átadva"), [filteredTickets]);
  const handedOverTickets = useMemo(
    () => filteredTickets.filter((t) => t.subStatus === "Átadva")
      .sort((a, b) => (b.dateOut || "").localeCompare(a.dateOut || "") || (Number(b.ticketNo) || 0) - (Number(a.ticketNo) || 0)),
    [filteredTickets]
  );
  const svcStats = useMemo(() => {
    const customerTickets = filteredTickets.filter((t) => t.ticketKind === "Ügyfél");
    const sikertelenCount = customerTickets.filter((t) => t.subStatus === "Sikertelen").length;
    const kiadvaCount = handedOverTickets.length;
    const resolvedCount = kiadvaCount + sikertelenCount;

    const withMargin = handedOverTickets.filter((t) => t.price != null && t.matCost != null);
    const avgMargin = withMargin.length
      ? Math.round(withMargin.reduce((s, t) => s + (Number(t.price) - Number(t.matCost)), 0) / withMargin.length)
      : null;

    const withTAT = handedOverTickets.filter((t) => t.dateIn && t.dateOut);
    const avgTAT = withTAT.length
      ? Math.round((withTAT.reduce((s, t) => s + (new Date(t.dateOut) - new Date(t.dateIn)), 0) / withTAT.length / 86400000) * 10) / 10
      : null;

    // Márka-megoszlás az ÖSSZES átadott (lezárt) munkalapon — nem csak az aktívakon —,
    // hogy lássuk, hosszabb távon milyen arányban dolgozunk az egyes márkákkal.
    // A meg nem határozott ("Egyéb") márkájú munkalapokat kihagyjuk, mert nem
    // mondanak semmit a tényleges márka-megoszlásról.
    const brandCounts = {};
    let brandTotal = 0;
    handedOverTickets.forEach((t) => {
      let key = (t.brand || "").trim() || "Ismeretlen";
      if (key === "Egyéb") return;
      if (key === "Apple") key = "iPhone"; // csak a statisztikán — a valós brand mező marad "Apple"
      brandCounts[key] = (brandCounts[key] || 0) + 1;
      brandTotal++;
    });
    const brandBreakdown = Object.entries(brandCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count, pct: brandTotal ? Math.round((count / brandTotal) * 1000) / 10 : 0 }));

    // Egy adott márkán belüli modell-megoszlás (pl. melyik Samsung/iPhone modellt
    // javítjuk leggyakrabban) — ugyanazon az átadott-munkalap alapon, mint fent.
    function modelBreakdownForBrand(brandName) {
      const counts = {};
      let total = 0;
      handedOverTickets.forEach((t) => {
        if ((t.brand || "").trim() !== brandName) return;
        const key = (t.model || "").trim() || "Ismeretlen";
        counts[key] = (counts[key] || 0) + 1;
        total++;
      });
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, count]) => ({ name, count, pct: total ? Math.round((count / total) * 1000) / 10 : 0 }));
    }
    const samsungModelBreakdown = modelBreakdownForBrand("Samsung");
    const iphoneModelBreakdown = modelBreakdownForBrand("Apple");

    // "LCD" a régi rendszerből átvett címke, ugyanaz mint a "Kijelző csere";
    // az "Egyéb" pedig nem informatív, ezért nem jelenik meg a megoszlásban.
    const problemCounts = {};
    let problemsSample = 0;
    customerTickets.forEach((t) => {
      const probs = (t.issue || "")
        .split(",")
        .map((p) => p.trim())
        .map((p) => (p === "LCD" ? "Kijelző csere" : p))
        .filter((p) => p && p !== "Egyéb");
      if (probs.length) problemsSample++;
      probs.forEach((p) => { problemCounts[p] = (problemCounts[p] || 0) + 1; });
    });
    const topProblems = Object.entries(problemCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count, pct: problemsSample ? Math.round((count / problemsSample) * 1000) / 10 : 0 }));

    const weekStart = rollingBusinessWeekStart();
    const kiadvaRecent = handedOverTickets.filter((t) => t.dateOut && t.dateOut >= weekStart).length;

    const foliaShown = customerTickets.filter((t) => t.foliaUpsellShownAt).length;
    const foliaRequestedCount = customerTickets.filter((t) => t.foliaUpsellShownAt && t.foliaUpsellRequested).length;
    const foliaConversionPct = foliaShown ? Math.round((foliaRequestedCount / foliaShown) * 1000) / 10 : null;

    const warrantyCount = customerTickets.filter((t) => t.isWarranty).length;
    const warrantyPct = customerTickets.length ? Math.round((warrantyCount / customerTickets.length) * 1000) / 10 : null;

    return {
      total: filteredTickets.length,
      active: customerTickets.filter((t) => t.status !== "Átadásra").length,
      inHouse: activeTickets.length,
      kesz: customerTickets.filter((t) => t.status === "Átadásra" && !t.subStatus).length,
      staleReady: customerTickets.filter((t) => isStaleReady(t) && !t.subStatus).length,
      staleFailed: customerTickets.filter((t) => isStaleReady(t) && t.subStatus === "Sikertelen").length,
      sikertelen: sikertelenCount,
      kiadva: kiadvaCount,
      kiadvaRecent,
      ownStock: filteredTickets.filter((t) => t.ticketKind !== "Ügyfél" && t.subStatus !== "Átadva").length,
      sikertelenPct: resolvedCount ? Math.round((sikertelenCount / resolvedCount) * 1000) / 10 : null,
      avgMargin,
      avgTAT,
      brandBreakdown,
      brandTotal,
      samsungModelBreakdown,
      iphoneModelBreakdown,
      topProblems,
      problemsSample,
      problemsTotal: customerTickets.length,
      foliaShown,
      foliaRequestedCount,
      foliaConversionPct,
      warrantyCount,
      warrantyPct,
    };
  }, [filteredTickets, handedOverTickets]);
  const customers = useMemo(() => {
    return customersTable.map((c) => {
      const purchases = filteredTransactions.filter((t) => t.type === "income" && t.customerId === c.id);
      const tickets = filteredTickets.filter((t) => t.customerId === c.id);
      const manualWarranties = warranties.filter((w) => w.customerId === c.id);
      return {
        ...c,
        key: c.id,
        purchases,
        tickets,
        manualWarranties,
        purchaseTotal: purchases.reduce((s, p) => s + (Number(p.amount) || 0), 0),
        ticketTotal: tickets.reduce((s, t) => s + (Number(t.price) || 0), 0),
        lastActivity: [...purchases.map((p) => p.date), ...tickets.map((t) => t.dateIn)].filter(Boolean).sort().reverse()[0] || "",
        webshopAccount: customerProfiles.find((cp) => cp.customerId === c.id) || null,
      };
    }).filter((c) => {
      const q = custSearch.trim().toLowerCase();
      return !q || [c.name, c.phone].join(" ").toLowerCase().includes(q);
    }).sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));
  }, [customersTable, filteredTransactions, filteredTickets, custSearch, customerProfiles, warranties]);
  const customerStats = useMemo(() => ({
    count: customers.length,
    revenue: customers.reduce((s, c) => s + c.purchaseTotal + c.ticketTotal, 0),
    avg: customers.length ? customers.reduce((s, c) => s + c.purchaseTotal + c.ticketTotal, 0) / customers.length : 0,
  }), [customers]);
  function buildWarrantyItems(active) {
    const saleItems = transactions
      .filter((t) => t.category === "Készlet" && t.warranty && isWarrantyActive(t.date, t.warranty) === active)
      .map((t) => ({
        key: `sale-${t.id}`, kind: "sale", source: "linked", refId: t.id,
        customerName: t.customerName, customerPhone: t.customerPhone,
        label: t.description, warranty: t.warranty, from: t.date, expiry: warrantyExpiry(t.date, t.warranty), locationId: t.locationId,
      }));
    const serviceItems = tickets
      .filter((t) => t.subStatus === "Átadva" && t.warranty && isWarrantyActive(t.dateOut, t.warranty) === active)
      .map((t) => ({
        key: `svc-${t.id}`, kind: "service", source: "linked", refId: t.id,
        customerName: t.customerName, customerPhone: t.customerPhone,
        label: [t.brand, t.model].filter(Boolean).join(" "), warranty: t.warranty, from: t.dateOut, expiry: warrantyExpiry(t.dateOut, t.warranty), locationId: t.locationId,
      }));
    const manualItems = warranties
      .filter((w) => isWarrantyActive(w.fromDate, w.warranty) === active)
      .map((w) => ({
        key: `manual-${w.id}`, kind: w.kind, source: "manual", refId: w.id,
        customerName: w.customerName, customerPhone: w.customerPhone,
        label: w.label, warranty: w.warranty, from: w.fromDate, expiry: warrantyExpiry(w.fromDate, w.warranty), locationId: w.locationId,
        note: w.note,
      }));
    return [...saleItems, ...serviceItems, ...manualItems];
  }
  const activeWarranties = useMemo(() => buildWarrantyItems(true).sort((a, b) => (b.from || "").localeCompare(a.from || "")), [transactions, tickets, warranties]);
  const expiredWarranties = useMemo(() => buildWarrantyItems(false).sort((a, b) => (b.expiry || "").localeCompare(a.expiry || "")), [transactions, tickets, warranties]);
  const filteredWarranties = warrantyFilter === "all" ? activeWarranties : activeWarranties.filter((w) => w.kind === warrantyFilter);
  const todoItems = useMemo(() => {
    const slaTickets = activeTickets
      .map((t) => ({ ticket: t, sla: slaInfo(t) }))
      .filter((x) => x.sla && (x.sla.level === "warn" || x.sla.level === "overdue"))
      .sort((a, b) => a.sla.days - b.sla.days);
    return { slaTickets };
  }, [activeTickets]);
  const leaveYear = new Date().getFullYear();
  const leaveBalanceByUser = useMemo(() => {
    const map = {};
    users.forEach((u) => {
      const bal = leaveBalances.find((b) => b.userId === u.id && b.year === leaveYear);
      const entitled = bal ? bal.entitledDays : 20;
      const used = leaveRequests
        .filter((r) => r.userId === u.id && r.status === "Jóváhagyva" && r.startDate.slice(0, 4) === String(leaveYear))
        .reduce((s, r) => s + r.days, 0);
      map[u.id] = { entitled, used };
    });
    return map;
  }, [users, leaveBalances, leaveRequests, leaveYear]);
  const upcomingLeave = useMemo(() => {
    const todayStr = today();
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + 92);
    const horizonStr = horizon.toISOString().slice(0, 10);
    return leaveRequests
      .filter((r) => (r.status === "Kérve" || r.status === "Jóváhagyva") && r.endDate >= todayStr && r.startDate <= horizonStr)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [leaveRequests]);
  const coverageWarnings = useMemo(() => {
    const todayStr = today();
    const warnings = [];
    const staffByLocation = {};
    users.forEach((u) => { if (u.locationId) (staffByLocation[u.locationId] ||= []).push(u.id); });
    const approved = leaveRequests.filter((r) => r.status === "Jóváhagyva");
    for (let i = 0; i < 92; i++) {
      const d = new Date(todayStr + "T00:00:00");
      d.setDate(d.getDate() + i);
      const dStr = d.toISOString().slice(0, 10);
      for (const loc of locations) {
        const staff = staffByLocation[loc.id] || [];
        if (staff.length === 0) continue;
        const allAway = staff.every((uid) => approved.some((r) => r.userId === uid && r.startDate <= dStr && dStr <= r.endDate));
        if (allAway) warnings.push({ date: dStr, locationId: loc.id });
      }
    }
    return warnings;
  }, [users, locations, leaveRequests]);
  const detailCustomer = customerKey ? customers.find((c) => c.key === customerKey) : null;
  const receiptTx = receiptTxId ? transactions.find((t) => t.id === receiptTxId) : null;
  const detailTicket = detailId ? tickets.find((t) => t.id === detailId) : null;
  const detailProduct = productDetailId ? stock.find((i) => i.id === productDetailId) : null;
  const detailPart = partDetailId ? partGroups.find((g) => g.id === partDetailId) : null;
  // A csoport MINDEN egyedi darabja (nem csak a raktáron lévők) — így a már felhasznált,
  // hibás vagy visszaküldött egykori darabok is megjelennek a Részletek-panelen.
  const detailPartAllUnits = useMemo(() => {
    if (!detailPart) return [];
    return parts.filter((p) => [p.name, p.category, p.brand, p.modelFit, p.source].join("|") === detailPart.id);
  }, [parts, detailPart]);
  const partUsage = useMemo(() => {
    if (!detailPart) return [];
    const unitIds = new Set(detailPartAllUnits.map((u) => u.id));
    return tickets
      .flatMap((t) => (t.usedParts || []).filter((sp) => unitIds.has(sp.partId)).map((sp) => ({ ...sp, ticket: t })))
      .sort((a, b) => (b.ticket.dateIn || "").localeCompare(a.ticket.dateIn || ""));
  }, [tickets, detailPart, detailPartAllUnits]);
  const allUsedParts = useMemo(() => {
    return tickets
      .flatMap((t) => (t.usedParts || []).map((sp) => ({ ...sp, ticket: t })))
      .sort((a, b) => (b.usedAt || "").localeCompare(a.usedAt || ""));
  }, [tickets]);
  const activeServiceTicket = useMemo(() => {
    if (!detailProduct) return null;
    return tickets.find((t) => t.productId === detailProduct.id && t.ticketKind !== "Ügyfél" && t.subStatus !== "Átadva") || null;
  }, [tickets, detailProduct]);
  // A beszerzési árba beépült alkatrészek — a lezárt (Átadva) "saját készlet" munkalapokét is
  // idehozzuk, hogy a bekerülési ár mindig visszakövethető legyen, ne csak amíg a munkalap aktív.
  const productPartUsage = useMemo(() => {
    if (!detailProduct) return [];
    return tickets
      .filter((t) => t.productId === detailProduct.id && t.ticketKind !== "Ügyfél")
      .flatMap((t) => t.usedParts || [])
      .sort((a, b) => (a.usedAt || "").localeCompare(b.usedAt || ""));
  }, [tickets, detailProduct]);
  function buildDeviceHistory(rawImei) {
    const key = normalizeImei(rawImei);
    if (!key) return null;
    const relatedProducts = stock.filter((p) => normalizeImei(p.imei) === key);
    const relatedTickets = tickets.filter((t) => normalizeImei(t.imei) === key);
    if (relatedProducts.length === 0 && relatedTickets.length === 0) return null;
    const ref = relatedProducts[0] || relatedTickets[0];

    const timeline = [];
    relatedProducts.forEach((p) => {
      timeline.push({
        date: p.dateAdded, kind: "purchase",
        label: p.condition === "New" ? "Beszerezve (új)" : "Beszerezve (felújított)",
        detail: `besz. ár ${money(p.costPrice)}${p.grade ? " · " + p.grade : ""}`,
        onOpen: () => { setProductDetailId(p.id); setDeviceHistoryImei(null); },
      });
      const saleTx = transactions.find((t) => t.productId === p.id && t.type === "income");
      if (saleTx) {
        timeline.push({ date: saleTx.date, kind: "sale", label: "Eladva", detail: `${saleTx.customerName || "—"} — ${money(saleTx.amount)}` });
      }
    });
    relatedTickets.forEach((t) => {
      const kindLabel = t.ticketKind === "Ügyfél" ? "Ügyfél szerviz"
        : t.ticketKind === "Saját készlet - garanciális" ? "Garanciális javítás (saját)" : "Előkészítés (saját)";
      timeline.push({
        date: t.dateIn, kind: "ticket",
        label: kindLabel,
        status: t.status, subStatus: t.subStatus,
        detail: `${ticketCode(t.ticketNo, locName(t.intakeLocationId || t.locationId))} — ${(t.issue || "").split(",").filter(Boolean).join(", ") || "—"}${t.price ? " · " + money(t.price) : ""}`,
        onOpen: () => { setDetailId(t.id); setDeviceHistoryImei(null); },
      });
    });
    timeline.sort((a, b) => (a.date || "").localeCompare(b.date || ""));

    return { imei: ref.imei, brand: ref.brand, model: ref.model, repeatCount: relatedProducts.length, timeline };
  }
  const deviceHistory = useMemo(
    () => (deviceHistoryImei ? buildDeviceHistory(deviceHistoryImei) : null),
    [deviceHistoryImei, stock, tickets, transactions]
  );
  const editingTicket = ticketModal && ticketModal !== "add" ? ticketModal : null;
  const noLocationAssigned = !isAdmin && !myLocationId;
  // A Pult fülön három, egymástól független dolog vár reakcióra — ezeket jelezzük
  // számozott jelvényekkel a navigáción is, hogy anélkül is látszódjon, hány
  // feladat van, hogy megnyitnánk a fület.
  const pultPendingCounts = {
    webOrders: webOrders.length,
    waiting: waitingItems.filter((w) => w.status !== "lezarva").length,
    notes: notes.filter((n) => n.status === "open").length,
  };
  // Hány beszélgetésben van olvasatlan (ügyféltől jött, még meg nem nyitott) üzenet —
  // ugyanez a jelvény a Postaláda fülön is a Sidebar/BottomNav-ban, mint a Pultnál.
  // Csatornánként más az azonosító (WhatsApp: phoneNorm, Messenger: senderPsid).
  const inboxUnreadCount = new Set(
    inboxMessages.filter((m) => m.direction === "in" && !m.readAt).map((m) => `${m.channel}:${m.phoneNorm || m.senderPsid}`)
  ).size;
  const useMacDock = true;

  return {
    stockLocFilter, filteredStock, txByProductId, productConditionById, soldStock, refurbPhones,
    refurbCount, filteredTransactions, dailyIncomeTrend, filteredTickets, attentionCount, stockStats,
    soldPhoneStats, currentMonthLive, monthlyTrendSummary, partGroups, partsStats, filteredParts,
    activeTickets, handedOverTickets, svcStats, customers, customerStats, buildWarrantyItems,
    activeWarranties, expiredWarranties, filteredWarranties, todoItems, leaveYear, leaveBalanceByUser,
    upcomingLeave, coverageWarnings, detailCustomer, receiptTx, detailTicket, detailProduct, detailPart,
    detailPartAllUnits, partUsage, allUsedParts, activeServiceTicket, productPartUsage,
    buildDeviceHistory, deviceHistory, editingTicket, noLocationAssigned, pultPendingCounts,
    inboxUnreadCount, useMacDock,
  };
}

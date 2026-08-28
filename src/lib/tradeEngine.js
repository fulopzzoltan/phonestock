// Közös logika a három publikus flow (telefon-választó segítő, szerviz-becslő, felvásárlás)
// kereszt-ajánlataihoz — TASKS_TRADE_UP_KERESZTAJANLAT.md.

import { normalizeStorage } from "./utils";

const BUDGET_RANGES = { under1000: [0, 1000], mid: [1000, 2000], over2000: [2000, Infinity] };

function distanceFromBudget(price, key) {
  const [lo, hi] = BUDGET_RANGES[key];
  if (price < lo) return lo - price;
  if (price > hi) return price - hi;
  return 0;
}

// Fokozatosan lazító pontozás a telefon-választó segítőhöz, sose kemény szűrés —
// így garantáltan van 1-3 találat, amíg van készleten telefon.
export function scorePhone(phone, answers) {
  let score = 100;
  if (answers.condition !== "any" && phone.condition !== answers.condition) score -= 40;
  if (answers.budget !== "any") {
    const dist = distanceFromBudget(Number(phone.sale_price) || 0, answers.budget);
    score -= Math.min(50, dist / 20);
  }
  if (answers.storage !== "any" && normalizeStorage(phone.storage) !== answers.storage) score -= 15;
  if (answers.brands.length > 0 && !answers.brands.includes(phone.brand)) score -= 20;
  return score;
}

export function recommendPhones(phones, answers, max = 3) {
  if (!phones || phones.length === 0) return [];
  return [...phones]
    .map((p) => ({ ...p, _score: scorePhone(p, answers) }))
    .sort((a, b) => b._score - a._score)
    .slice(0, max);
}

// Egy adott márka+modell legalacsonyabb felvásárlási alapára (több tárhely-variáns is
// tartozhat ugyanahhoz a modellhez — a biztonságosabb, alacsonyabb becslést adjuk vissza).
export function findBuybackValue(brand, model, buybackModels) {
  if (!brand || !model || !buybackModels || buybackModels.length === 0) return null;
  const matches = buybackModels.filter((m) => m.brand === brand && m.model === model);
  if (matches.length === 0) return null;
  return Math.min(...matches.map((m) => Number(m.base_price)));
}

// Gazdaságtalan-e a javítás a beszámítási értékhez képest — a küszöb feletti javítási ár
// mellett érdemesebb lehet becserélni a telefont, mint megjavíttatni.
export function isRepairUneconomical(repairPrice, buybackValue, threshold = 0.55) {
  if (!repairPrice || !buybackValue || buybackValue <= 0) return false;
  return repairPrice / buybackValue >= threshold;
}

// 1-3 telefon egy célár körül, felfelé nyitva (a vevő rááfizet valamennyit) — a felvásárlás
// utáni "vidd tovább" és a szerviz "nem éri meg javítani" kereszt-ajánlathoz. Először a célárnál
// nem olcsóbb, de ésszerű tartományon belüli darabokat nézi, legolcsóbbtól (legkisebb ráfizetés
// elöl); ha ilyen nincs, fokozatosan tágít, hogy sose legyen 0 találat, amíg van készlet.
export function recommendNearBudget(phones, targetPrice, { max = 3, maxMultiplier = 2.2 } = {}) {
  if (!phones || phones.length === 0) return [];
  if (!targetPrice || targetPrice <= 0) {
    return [...phones].sort((a, b) => Number(a.sale_price) - Number(b.sale_price)).slice(0, max);
  }
  const upper = targetPrice * maxMultiplier;
  let pool = phones.filter((p) => Number(p.sale_price) >= targetPrice && Number(p.sale_price) <= upper);
  if (pool.length === 0) pool = phones.filter((p) => Number(p.sale_price) >= targetPrice);
  if (pool.length === 0) pool = phones;
  return [...pool].sort((a, b) => Number(a.sale_price) - Number(b.sale_price)).slice(0, max);
}

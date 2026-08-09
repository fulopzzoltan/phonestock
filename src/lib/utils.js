export const money = (n) => Math.round(Number(n) || 0).toLocaleString("hu-HU") + " Lei";
export const today = () => new Date().toISOString().slice(0, 10);

export const LOCS = { gyimes: "Gyimes", szentgy: "Szentgyörgy" };

export const STATUSES = [
  { key: "Átvett", color: "#F59E0B", cls: "st-beveve" },
  { key: "Javítás alatt", color: "#F97316", cls: "st-javitas" },
  { key: "Átadásra", color: "#22C55E", cls: "st-kesz" },
];
export const statusCls = (s) => STATUSES.find((c) => c.key === s)?.cls || "st-beveve";

// sub_status options available within each main status ("null" entry = plain/no tag)
export const SUB_STATUSES = {
  "Átvett": [
    { key: null, label: "Egyszerű átvétel", cls: "st-beveve" },
    { key: "Garanciális", label: "Garanciális", cls: "st-garancialis" },
    { key: "Alkatrészre vár", label: "Alkatrészre vár", cls: "st-alkatresz" },
  ],
  "Javítás alatt": [
    { key: null, label: "Javítás alatt", cls: "st-javitas" },
  ],
  "Átadásra": [
    { key: null, label: "Kész, átvehető", cls: "st-kesz" },
    { key: "Sikertelen", label: "Sikertelen", cls: "st-sikertelen" },
    { key: "Átadva", label: "Átadva", cls: "st-kiadva" },
  ],
};
export const subStatusCls = (status, sub) => (SUB_STATUSES[status] || []).find((s) => s.key === sub)?.cls || "st-beveve";
export const subStatusLabel = (status, sub) => (SUB_STATUSES[status] || []).find((s) => s.key === sub)?.label || sub || "";

export const PROBLEM_TAGS = ["LCD", "FRP", "Csatlakozó", "Akku", "Kamera", "Szoftver", "Egyéb"];
export const WARRANTIES = ["1 hó", "3 hó", "6 hó", "1 év"];
export const PAYMENTS = ["Készpénz", "Kártya", "Átutalás"];
export const CATEGORIES = ["Fix", "Készlet", "Marketing", "Eszköz", "Szerviz", "Egyéb"];

export function startOfWeek(d) {
  const date = new Date(d + "T00:00:00");
  const day = (date.getDay() + 6) % 7; // Monday = 0
  date.setDate(date.getDate() - day);
  return date.toISOString().slice(0, 10);
}
export function periodKey(dateStr, period) {
  if (period === "day") return dateStr;
  if (period === "week") return startOfWeek(dateStr);
  return dateStr.slice(0, 7); // month YYYY-MM
}
export function periodLabel(key, period) {
  if (period === "month") {
    const d = new Date(key + "-01T00:00:00");
    return d.toLocaleDateString("hu-HU", { year: "numeric", month: "long" });
  }
  if (period === "week") {
    const start = new Date(key + "T00:00:00");
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString("hu-HU", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("hu-HU", { month: "short", day: "numeric" })}`;
  }
  const d = new Date(key + "T00:00:00");
  return d.toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric", weekday: "long" });
}

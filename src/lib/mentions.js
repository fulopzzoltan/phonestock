import { ticketCode, phoneCode, partCode } from "./utils";

export function searchMentions(query, { tickets, stock, parts, customersTable, warranties, locName }) {
  const q = query.toLowerCase();
  const ticketMatches = tickets
    .filter((t) => ticketCode(t.ticketNo, locName(t.intakeLocationId || t.locationId))?.toLowerCase().includes(q) || String(t.ticketNo).startsWith(q))
    .slice(0, 5)
    .map((t) => ({ type: "ticket", id: t.id, label: `${ticketCode(t.ticketNo, locName(t.intakeLocationId || t.locationId))} — ${[t.brand, t.model].filter(Boolean).join(" ")}` }));
  const productMatches = stock
    .filter((p) => phoneCode(p.productNo)?.toLowerCase().includes(q) || (p.imei || "").toLowerCase().includes(q) || [p.brand, p.model].join(" ").toLowerCase().includes(q))
    .slice(0, 5)
    .map((p) => ({ type: "product", id: p.id, label: `${phoneCode(p.productNo)} — ${[p.brand, p.model].filter(Boolean).join(" ")}` }));
  const partMatches = parts
    .filter((pt) => partCode(pt.partNo)?.toLowerCase().includes(q) || (pt.name || "").toLowerCase().includes(q))
    .slice(0, 5)
    .map((pt) => ({ type: "part", id: pt.id, label: `${partCode(pt.partNo)} — ${pt.name}` }));
  const customerMatches = customersTable
    .filter((c) => (c.name || "").toLowerCase().includes(q) || (c.phone || "").includes(q))
    .slice(0, 5)
    .map((c) => ({ type: "customer", id: c.id, label: `${c.name || "Névtelen"}${c.phone ? " — " + c.phone : ""}` }));
  const warrantyMatches = warranties
    .filter((w) => (w.customerName || "").toLowerCase().includes(q) || (w.label || "").toLowerCase().includes(q))
    .slice(0, 5)
    .map((w) => ({ type: "warranty", id: w.id, label: `Garancia — ${w.customerName || "?"} (${w.label || "?"})` }));
  return [...ticketMatches, ...productMatches, ...partMatches, ...customerMatches, ...warrantyMatches];
}

import { today } from "../lib/utils";
// A Bevétel & Kiadás adatokat (Áttekintés) csak ők láthatják — mindegy, ki milyen
// admin/employee role-lal rendelkezik amúgy, ez egy explicit, névre szóló lista.
const FINANCE_ALLOWED_EMAILS = ["fulopzzoltan@gmail.com", "h.endre404@gmail.com"];

// Szerepkör/helyszín alapú alapértékek, amikre szinte minden modul épít.
export function computeBasics(ctx) {
  const {
    profile, user, locations, locFilter, lastActiveLocationId, dayCloses,
  } = ctx;
  const isAdmin = profile?.role === "admin";
  const canSeeFinance = FINANCE_ALLOWED_EMAILS.includes(user?.email);
  const myLocationId = profile?.locationId || null;
  const locName = (id) => locations.find((l) => l.id === id)?.name || "—";
  const stockLocations = isAdmin ? locations : locations.filter((l) => l.id === myLocationId);
  const allowedLocations = stockLocations.filter((l) => l.name !== "Tartalék");
  const effectiveLocFilter = isAdmin ? locFilter : (myLocationId || "none");
  const defaultLocId = isAdmin ? (locFilter !== "all" ? locFilter : lastActiveLocationId) : myLocationId;
  const headerTodayClose = dayCloses.find((d) => d.date === today() && d.locationId === defaultLocId && !d.reopenedAt);
  const reserveLocId = locations.find((l) => l.name === "Tartalék")?.id;
  const defaultStockLocId = isAdmin ? (locFilter !== "all" ? locFilter : (reserveLocId || allowedLocations[0]?.id)) : myLocationId;

  return {
    isAdmin, canSeeFinance, myLocationId, locName, stockLocations, allowedLocations, effectiveLocFilter,
    defaultLocId, headerTodayClose, reserveLocId, defaultStockLocId,
  };
}

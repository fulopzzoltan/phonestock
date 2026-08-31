import { DropdownField } from "./FormPickers";
import { PHONE_BRANDS } from "../lib/utils";

// Márka-választó pill/dropdown-alapon, hogy ne legyen begépelés-elírás (pl. "samsung " vs
// "Samsung"). Ha a jelenlegi érték nincs a listában (ritka márka, vagy régi, listán kívüli
// adat), "Egyéb"-ként jelenik meg egy szabad szöveges mezővel — semmilyen valódi eset nem
// esik ki, csak a leggyakoribb márkáknál tűnik el az elgépelés lehetősége.
export default function BrandField({ label = "Márka", value, onChange, hint }) {
  const isCustom = value !== "" && !PHONE_BRANDS.includes(value);
  return (
    <div>
      <DropdownField
        label={label}
        hint={hint}
        value={isCustom ? "Egyéb" : value}
        onChange={(v) => onChange(v === "Egyéb" ? "" : v)}
        options={PHONE_BRANDS.map((b) => ({ key: b, label: b }))}
        placeholder="Válassz márkát..."
      />
      {isCustom && (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Márka neve" style={{ marginTop: 6 }} />
      )}
    </div>
  );
}

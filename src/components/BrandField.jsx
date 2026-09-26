import { useState } from "react";
import { DropdownField } from "./FormPickers";
import { PHONE_BRANDS } from "../lib/utils";

// Márka-választó pill/dropdown-alapon, hogy ne legyen begépelés-elírás (pl. "samsung " vs
// "Samsung"). Ha a jelenlegi érték nincs a listában (ritka márka, vagy régi, listán kívüli
// adat), "Egyéb"-ként jelenik meg egy szabad szöveges mezővel — semmilyen valódi eset nem
// esik ki, csak a leggyakoribb márkáknál tűnik el az elgépelés lehetősége.
export default function BrandField({ label = "Márka", value, onChange, hint }) {
  const knownCustom = value !== "" && !PHONE_BRANDS.includes(value);
  // Az "Egyéb" kiválasztásakor a value üresre vált, ami önmagában megkülönböztethetetlen
  // lenne egy üres/meg-nem-adott márkától — ezért külön állapotban tartjuk, hogy a szabad
  // szöveges mező addig is látszódjon, amíg a felhasználó be nem gépeli a márka nevét.
  const [customPicked, setCustomPicked] = useState(knownCustom);
  const isCustom = customPicked || knownCustom;
  return (
    <div>
      <DropdownField
        label={label}
        hint={hint}
        value={isCustom ? "Egyéb" : value}
        onChange={(v) => {
          setCustomPicked(v === "Egyéb");
          onChange(v === "Egyéb" ? "" : v);
        }}
        options={PHONE_BRANDS.map((b) => ({ key: b, label: b === "Apple" ? "iPhone" : b }))}
        placeholder="Válassz márkát..."
      />
      {isCustom && (
        <input autoFocus value={value} onChange={(e) => onChange(e.target.value)} placeholder="Márka neve" style={{ marginTop: 6, textAlign: "left", color: "#111827" }} />
      )}
    </div>
  );
}

import { DropdownField } from "./FormPickers";

// Általános pill/dropdown-választó (Tárhely, RAM, Szín stb.) — ugyanaz a minta, mint a
// BrandField-nél: ha a jelenlegi érték nincs a listában, "Egyéb"-ként jelenik meg egy
// szabad szöveges mezővel, hogy elgépelés nélkül lehessen a leggyakoribb értékeket választani,
// de semmilyen valódi/régi adat ne essen ki.
export default function PicklistField({ label, value, onChange, options, hint, placeholder = "Válassz..." }) {
  const realOptions = options.filter((o) => o !== "Egyéb");
  const isCustom = value !== "" && !realOptions.includes(value);
  return (
    <div>
      <DropdownField
        label={label}
        hint={hint}
        value={isCustom ? "Egyéb" : value}
        onChange={(v) => onChange(v === "Egyéb" ? "" : v)}
        options={options.map((o) => ({ key: o, label: o }))}
        placeholder={placeholder}
      />
      {isCustom && (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Egyéni érték" style={{ marginTop: 6 }} />
      )}
    </div>
  );
}

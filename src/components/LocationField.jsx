export default function LocationField({ locations, value, onChange, label = "Helyszín" }) {
  if (locations.length <= 1) {
    return (
      <div className="field"><label>{label}</label><input disabled value={locations[0]?.name || "—"} /></div>
    );
  }
  return (
    <div className="field">
      <label>{label}</label>
      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        style={!value ? { borderColor: "#EF4444", color: "#EF4444" } : undefined}
      >
        <option value="" disabled>— Válaszd ki, melyik üzlet —</option>
        {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
      </select>
    </div>
  );
}

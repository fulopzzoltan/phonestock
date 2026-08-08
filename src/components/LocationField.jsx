export default function LocationField({ locations, value, onChange, label = "Helyszín" }) {
  if (locations.length <= 1) {
    return (
      <div className="field"><label>{label}</label><input disabled value={locations[0]?.name || "—"} /></div>
    );
  }
  return (
    <div className="field"><label>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
      </select>
    </div>
  );
}

export default function Row({ k, v }) {
  return (
    <div className="dp-row"><span className="dp-key">{k}</span><span className="dp-val">{v || "—"}</span></div>
  );
}

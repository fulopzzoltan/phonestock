import { daysColor } from "../lib/utils";

// Színkódolt "hány napja" chip — Szerviz (Bejött) és Telefonok (Bejött) közösen használja.
export default function DayChip({ days }) {
  if (days == null) return <span className="day-chip day-chip-empty">—</span>;
  const { bg, fg } = daysColor(days);
  return (
    <span className="day-chip" style={{ background: bg, color: fg }}>
      {days}<span className="day-chip-lbl">napja</span>
    </span>
  );
}

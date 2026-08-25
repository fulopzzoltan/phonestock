// Alulról felcsúszó lap mobilon (applikáció-szerű "bottom sheet" minta) — a Sidebar
// "Több" gombja nyitja, a maradék nav-elemeket mutatja csoportosítva.
export default function BottomSheet({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="bsheet-overlay" onClick={onClose}>
      <div className="bsheet-panel" onClick={(e) => e.stopPropagation()}>
        <div className="bsheet-handle" />
        {children}
      </div>
    </div>
  );
}

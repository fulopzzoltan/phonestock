// Egységes üres/betöltés állapot minden fülön — ikon (opcionális) + szöveg,
// vagy egy sima spinner betöltés közben. Lásd .empty / .spin az index.css-ben.
export function EmptyState({ icon: Icon, children }) {
  return (
    <div className="empty">
      {Icon && <Icon />}
      <div>{children}</div>
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="empty">
      <div className="spin" />
    </div>
  );
}

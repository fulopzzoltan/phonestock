// Közös, újrahasznosítható táblázat: desktopon <table>, 640px alatt automatikusan a már
// bevált .mob-cards/.mob-row kártyás nézetre vált (ugyanaz a CSS-minta, mint a
// TransactionsPeriodList.jsx-ben) — hogy mobilon ne kelljen oldalra görgetni egy táblát.
export default function ResponsiveTable({ columns, rows, rowKey, renderRow, renderMobileRow, wrap = true }) {
  const content = (
    <>
      <table>
        <thead><tr>{columns.map((c) => <th key={c.key} className={c.className}>{c.label}</th>)}</tr></thead>
        <tbody>{rows.map((r) => renderRow(r))}</tbody>
      </table>
      <div className="mob-cards">
        {rows.map((r) => <div key={rowKey(r)}>{renderMobileRow(r)}</div>)}
      </div>
    </>
  );
  return wrap ? <div className="tw">{content}</div> : content;
}

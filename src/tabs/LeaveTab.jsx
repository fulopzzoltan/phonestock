import { LEAVE_STATUS_CLS } from "../lib/utils";
import { EditIcon } from "../components/icons";

export default function LeaveTab({
  leaveYear, busy, setLeaveRequestModal, coverageWarnings, locName, users, leaveBalanceByUser, isAdmin,
  setLeaveBalanceModal, upcomingLeave, leaveTypes, user, decideLeaveRequest, revokeLeaveRequest,
}) {
  return (
    <>
      <div className="topbar">
        <div><div className="page-title">Szabadság</div><div className="page-sub">{leaveYear}. évi keretek és a következő ~3 hónap</div></div>
        <button className="btn" disabled={busy} onClick={() => setLeaveRequestModal(true)}>+ Szabadság kérése</button>
      </div>

      {coverageWarnings.length > 0 && (
        <div className="leave-warn">
          <div className="leave-warn-title">⚠ Ezeken a napokon egy helyszínen mindenki szabadságon lesz</div>
          {coverageWarnings.map((w, i) => (
            <div key={i} className="leave-warn-item">{w.date} — {locName(w.locationId)}</div>
          ))}
        </div>
      )}

      <div className="leave-cards">
        {users.map((u) => {
          const b = leaveBalanceByUser[u.id] || { entitled: 20, used: 0 };
          const pct = b.entitled > 0 ? Math.min(100, Math.round((b.used / b.entitled) * 100)) : 0;
          return (
            <div key={u.id} className="leave-card">
              <div className="leave-card-top">
                <div className="leave-card-name">{u.fullName || "?"}</div>
                {isAdmin && (
                  <button className="iconbtn" title="Keret módosítása" onClick={() => setLeaveBalanceModal(u)}><EditIcon /></button>
                )}
              </div>
              <div className="leave-card-days">{b.used} / {b.entitled} nap felhasználva</div>
              <div className="leave-progress"><div className="leave-progress-fill" style={{ width: `${pct}%` }} /></div>
            </div>
          );
        })}
      </div>

      <div className="tw">
        {upcomingLeave.length === 0 ? (
          <div className="empty">Nincs felvett vagy közelgő szabadság a következő 3 hónapban.</div>
        ) : (
          <table>
            <thead><tr><th>Dolgozó</th><th>Helyszín</th><th>Típus</th><th>Időszak</th><th>Napok</th><th>Állapot</th><th></th></tr></thead>
            <tbody>
              {upcomingLeave.map((r) => {
                const reqUser = users.find((u) => u.id === r.userId);
                const lt = leaveTypes.find((t) => t.id === r.leaveTypeId);
                const canRevoke = r.status === "Kérve" && r.userId === user.id;
                return (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{reqUser?.fullName || "?"}</td>
                    <td><span className="badge-loc">{locName(reqUser?.locationId)}</span></td>
                    <td><span className="leave-type-chip"><span className="leave-type-dot" style={{ background: lt?.color || "#9CA3AF" }} />{lt?.name || "—"}</span></td>
                    <td className="mono">{r.startDate} – {r.endDate}</td>
                    <td style={{ fontWeight: 700 }}>{r.days}</td>
                    <td><span className={LEAVE_STATUS_CLS[r.status] || "badge-loc"}>{r.status}</span></td>
                    <td style={{ display: "flex", gap: 6 }}>
                      {r.status === "Kérve" && isAdmin && (
                        <>
                          <button className="btn sec sm" disabled={busy} onClick={() => decideLeaveRequest(r.id, "Jóváhagyva")}>Jóváhagyás</button>
                          <button className="btn sec sm" disabled={busy} onClick={() => decideLeaveRequest(r.id, "Elutasítva")}>Elutasítás</button>
                        </>
                      )}
                      {canRevoke && (
                        <button className="btn sec sm" disabled={busy} onClick={() => revokeLeaveRequest(r.id)}>Visszavonás</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

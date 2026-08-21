import ConfirmDelete from "../components/ConfirmDelete";
import { UsersNavIcon } from "../components/icons";
import { EmptyState, LoadingState } from "../components/EmptyState";

export default function UsersTab({
  busy, setInviteError, setInviteModal, loadingData, users, user, updateUserProfile,
  allowedLocations, resetEmployeePassword, deleteEmployee,
}) {
  return (
    <>
      <div className="topbar">
        <div><div className="page-title">Felhasználók</div></div>
        <button className="btn" disabled={busy} onClick={() => { setInviteError(""); setInviteModal(true); }}>+ Új kolléga meghívása</button>
      </div>
      <div className="tw">
        {loadingData ? <LoadingState /> : users.length === 0 ? <EmptyState icon={UsersNavIcon}>Nincs felhasználó.</EmptyState> : (
          <table>
            <thead><tr><th>Név</th><th>Email</th><th>Szerepkör</th><th>Helyszín</th><th>Műveletek</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>{u.fullName || "—"}{u.id === user.id ? " (te)" : ""}</td>
                  <td style={{ color: "#6B7280" }}>{u.email || "—"}</td>
                  <td>
                    <select value={u.role} disabled={busy} onChange={(e) => updateUserProfile(u.id, { role: e.target.value })}>
                      <option value="employee">Alkalmazott</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>
                    <select value={u.locationId || ""} disabled={busy} onChange={(e) => updateUserProfile(u.id, { location_id: e.target.value || null })}>
                      <option value="">— Nincs —</option>
                      {allowedLocations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </td>
                  <td style={{ display: "flex", gap: 6 }}>
                    {u.id !== user.id && (
                      <>
                        <button type="button" className="btn sec sm" disabled={busy} onClick={() => resetEmployeePassword(u.id, u.email)}>Jelszó visszaállítása</button>
                        <ConfirmDelete variant="full" disabled={busy} onConfirm={() => deleteEmployee(u.id)} />
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

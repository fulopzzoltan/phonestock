import ConfirmDelete from "../components/ConfirmDelete";
import { UsersNavIcon } from "../components/icons";
import { EmptyState, LoadingState } from "../components/EmptyState";
import ResponsiveTable from "../components/ResponsiveTable";

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
          <ResponsiveTable
            wrap={false}
            columns={[{ key: "n", label: "Név" }, { key: "e", label: "Email" }, { key: "r", label: "Szerepkör" }, { key: "l", label: "Helyszín" }, { key: "x", label: "Műveletek" }]}
            rows={users}
            rowKey={(u) => u.id}
            renderRow={(u) => (
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
            )}
            renderMobileRow={(u) => (
              <div className="mob-row">
                <div className="mob-row-top">
                  <div className="mob-row-main"><span>{u.fullName || "—"}{u.id === user.id ? " (te)" : ""}</span></div>
                </div>
                <div className="mob-row-sub">{u.email || "—"}</div>
                <div className="mob-row-sub" style={{ marginTop: 6, gap: 10 }}>
                  <select value={u.role} disabled={busy} onChange={(e) => updateUserProfile(u.id, { role: e.target.value })}>
                    <option value="employee">Alkalmazott</option>
                    <option value="admin">Admin</option>
                  </select>
                  <select value={u.locationId || ""} disabled={busy} onChange={(e) => updateUserProfile(u.id, { location_id: e.target.value || null })}>
                    <option value="">— Nincs —</option>
                    {allowedLocations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                {u.id !== user.id && (
                  <div className="mob-row-sub" style={{ marginTop: 8 }}>
                    <button type="button" className="btn sec sm" disabled={busy} onClick={() => resetEmployeePassword(u.id, u.email)}>Jelszó visszaállítása</button>
                    <ConfirmDelete variant="full" disabled={busy} onConfirm={() => deleteEmployee(u.id)} />
                  </div>
                )}
              </div>
            )}
          />
        )}
      </div>
    </>
  );
}

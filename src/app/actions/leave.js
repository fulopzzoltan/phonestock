import { countWorkdays } from "../../lib/utils";
import { supabase, unwrap } from "../../lib/supabaseClient";
import { leaveBalanceFromApi, leaveRequestFromApi } from "../../lib/mappers";

export function createLeaveActions(ctx) {
  const {
    profile, sendChatMessage, setLeaveBalanceModal, setLeaveBalances, setLeaveRequestModal,
    setLeaveRequests, user, users,
  } = ctx;
  const withBusy = (...a) => ctx.withBusy(...a);

  async function addLeaveRequest({ startDate, endDate, leaveTypeId, note }) {
    await withBusy(async () => {
      const days = countWorkdays(startDate, endDate);
      const r = unwrap(await supabase.from("leave_requests").insert({
        user_id: user.id, leave_type_id: leaveTypeId || null, start_date: startDate, end_date: endDate, days, note: note || null,
      }).select());
      setLeaveRequests((prev) => [...prev, leaveRequestFromApi(r[0])].sort((a, b) => a.startDate.localeCompare(b.startDate)));
      setLeaveRequestModal(false);
      sendChatMessage(`${profile?.fullName || "Valaki"} szabadságot kért: ${startDate} – ${endDate} (${days} munkanap)`);
    });
  }
  async function decideLeaveRequest(id, status) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("leave_requests").update({ status, decided_by: user.id, decided_at: new Date().toISOString() }).eq("id", id).select());
      const updated = leaveRequestFromApi(r[0]);
      setLeaveRequests((prev) => prev.map((lr) => (lr.id === id ? updated : lr)));
      if (status === "Jóváhagyva") {
        const reqUser = users.find((u) => u.id === updated.userId);
        sendChatMessage(`${reqUser?.fullName || "Kolléga"} szabadsága jóváhagyva: ${updated.startDate} – ${updated.endDate}`);
      }
    });
  }
  async function revokeLeaveRequest(id) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("leave_requests").update({ status: "Visszavonva" }).eq("id", id).select());
      setLeaveRequests((prev) => prev.map((lr) => (lr.id === id ? leaveRequestFromApi(r[0]) : lr)));
    });
  }
  async function saveLeaveBalance(userId, year, entitledDays) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("leave_balances").upsert(
        { user_id: userId, year, entitled_days: entitledDays }, { onConflict: "user_id,year" }
      ).select());
      const updated = leaveBalanceFromApi(r[0]);
      setLeaveBalances((prev) => [...prev.filter((b) => !(b.userId === userId && b.year === year)), updated]);
      setLeaveBalanceModal(null);
    });
  }

  return {
    addLeaveRequest, decideLeaveRequest, revokeLeaveRequest, saveLeaveBalance,
  };
}

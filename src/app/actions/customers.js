import { supabase, unwrap } from "../../lib/supabaseClient";
import { customerFromApi, customerToApi, loyaltyLedgerFromApi, loyaltyRewardFromApi, loyaltyRewardToApi, txFromApi, txToApi } from "../../lib/mappers";

export function createCustomersActions(ctx) {
  const {
    setBuybackOffers, setCustomerKey, setCustomerMergeModal, setCustomerModal, setCustomerProfiles,
    setCustomersTable, setInfo, setLoyaltyLedger, setLoyaltyRewardModal, setLoyaltyRewards, setTickets,
    setTransactions, setWaitingItems, setWarranties, user,
  } = ctx;
  const withBusy = (...a) => ctx.withBusy(...a);

  // CUSTOMERS
  async function createCustomer(data) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("customers").insert(customerToApi(data)).select());
      setCustomersTable((prev) => [...prev, customerFromApi(r[0])]);
      setCustomerModal(null);
    });
  }
  async function updateCustomer(id, data) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("customers").update(customerToApi(data)).eq("id", id).select());
      setCustomersTable((prev) => prev.map((c) => (c.id === id ? customerFromApi(r[0]) : c)));
      setCustomerModal(null);
    });
  }
  // Két ügyfélkártya összevonása — a tényleges FK-átmozgatást és a duplikátum puha
  // törlését a `merge_customers` SQL-függvény végzi el egy tranzakcióban (ld. migráció),
  // itt csak meghívjuk, majd az érintett kliens-oldali listákat frissítjük, hogy az UI
  // azonnal a végleges állapotot mutassa, refresh nélkül.
  async function mergeCustomers(primaryId, duplicateId) {
    await withBusy(async () => {
      unwrap(await supabase.rpc("merge_customers", { p_primary_id: primaryId, p_duplicate_id: duplicateId }));
      const rows = unwrap(await supabase.from("customers").select("*").eq("id", primaryId));
      const primary = rows?.[0] ? customerFromApi(rows[0]) : null;
      const repoint = (c) => (c.customerId === duplicateId ? { ...c, customerId: primaryId } : c);
      setCustomersTable((prev) => prev.filter((c) => c.id !== duplicateId).map((c) => (c.id === primaryId && primary ? primary : c)));
      setTransactions((prev) => prev.map(repoint));
      setTickets((prev) => prev.map(repoint));
      setWarranties((prev) => prev.map(repoint));
      setCustomerProfiles((prev) => prev.map(repoint));
      setLoyaltyLedger((prev) => prev.map(repoint));
      setWaitingItems((prev) => prev.map(repoint));
      setBuybackOffers((prev) => prev.map(repoint));
      setCustomerMergeModal(null);
      setCustomerKey(primaryId);
      setInfo("Ügyfélkártyák összevonva.");
    });
  }
  // LOYALTY (hűségpont + ajánlói program)
  async function refreshCustomerLoyalty(customerId) {
    if (!customerId) return;
    const rows = unwrap(await supabase.from("customers").select("*").eq("id", customerId));
    const row = rows?.[0];
    if (!row) return;
    const ids = [row.id, row.referred_by_customer_id].filter(Boolean);
    const all = (unwrap(await supabase.from("customers").select("*").in("id", ids)) || []).map(customerFromApi);
    setCustomersTable((prev) => {
      const byId = new Map(prev.map((c) => [c.id, c]));
      all.forEach((fresh) => byId.set(fresh.id, byId.has(fresh.id) ? { ...byId.get(fresh.id), loyaltyPointsBalance: fresh.loyaltyPointsBalance, referralCode: fresh.referralCode } : fresh));
      return Array.from(byId.values());
    });
    const ledgerRows = (unwrap(await supabase.from("loyalty_points_ledger").select("*").in("customer_id", ids).order("created_at", { ascending: false })) || []).map(loyaltyLedgerFromApi);
    setLoyaltyLedger((prev) => {
      const byId = new Map(prev.map((l) => [l.id, l]));
      ledgerRows.forEach((l) => byId.set(l.id, l));
      return Array.from(byId.values()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    });
  }
  async function redeemLoyaltyPoints(customer, reward, locId) {
    await withBusy(async () => {
      const ledgerRow = unwrap(await supabase.from("loyalty_points_ledger").insert({
        customer_id: customer.id, points: -reward.pointCost, kind: "redeem", reward_key: reward.rewardKey,
        note: `Beváltva: ${reward.label}`, created_by: user?.id || null,
      }).select());
      setLoyaltyLedger((prev) => [loyaltyLedgerFromApi(ledgerRow[0]), ...prev]);
      setCustomersTable((prev) => prev.map((c) => (c.id === customer.id ? { ...c, loyaltyPointsBalance: c.loyaltyPointsBalance - reward.pointCost } : c)));
      // Ez a "költség" tétel csak könyvelési/margin jelzés — payment nélkül marad, hogy
      // az Elszámolásban (készpénz-egyenleg) ne vonódjon le ténylegesen, mert a beváltott
      // termék anyagköltsége már elszámolásra került a nagytételes beszerzéskor.
      if (reward.ourCost) {
        const tr = unwrap(await supabase.from("transactions").insert({
          ...txToApi({ type: "expense", category: "Készlet", description: `Pontbeváltás: ${reward.label}`, amount: reward.ourCost, customerName: customer.name, customerPhone: customer.phone }, locId),
          customer_id: customer.id,
        }).select());
        setTransactions((prev) => [txFromApi(tr[0]), ...prev]);
      }
    });
  }
  async function addLoyaltyReward(data) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("loyalty_rewards").insert(loyaltyRewardToApi(data)).select());
      setLoyaltyRewards((prev) => [...prev, loyaltyRewardFromApi(r[0])].sort((a, b) => a.sortOrder - b.sortOrder));
      setLoyaltyRewardModal(null);
    });
  }
  async function editLoyaltyReward(id, data) {
    await withBusy(async () => {
      const r = unwrap(await supabase.from("loyalty_rewards").update(loyaltyRewardToApi(data)).eq("id", id).select());
      setLoyaltyRewards((prev) => prev.map((rw) => (rw.id === id ? loyaltyRewardFromApi(r[0]) : rw)).sort((a, b) => a.sortOrder - b.sortOrder));
      setLoyaltyRewardModal(null);
    });
  }

  return {
    createCustomer, updateCustomer, mergeCustomers, refreshCustomerLoyalty, redeemLoyaltyPoints,
    addLoyaltyReward, editLoyaltyReward,
  };
}

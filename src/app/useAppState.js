import { useRef, useState } from "react";

// Az admin-felület összes állapota (adatlisták, modálok, szűrők) egy helyen.
export function useAppState() {
  const [tab, setTab] = useState("pult");
  const [locFilter, setLocFilterRaw] = useState(() => localStorage.getItem("phonestock_loc_filter") || "all");
  const [lastActiveLocationId, setLastActiveLocationId] = useState(() => localStorage.getItem("phonestock_last_location") || null);
  function setLocFilter(val) {
    setLocFilterRaw(val);
    localStorage.setItem("phonestock_loc_filter", val);
    if (val !== "all") {
      setLastActiveLocationId(val);
      localStorage.setItem("phonestock_last_location", val);
    }
  }
  const [locations, setLocations] = useState([]);
  const [stock, setStock] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [parts, setParts] = useState([]);
  // Termékhez (munkalap nélkül) hozzárendelt alkatrészek — a Telefonok fülön, Szerviz
  // státuszú saját telefonoknál, ahol nem hozunk létre külön munkalapot a felhasználáshoz.
  // productId -> service_parts sorok tömbje (service_ticket_id IS NULL, product_id kitöltve).
  const [productParts, setProductParts] = useState({});
  const [users, setUsers] = useState([]);
  const [customersTable, setCustomersTable] = useState([]);
  // Közös postaláda (WhatsApp + Messenger) — "inbox", nem "chat", mert a `chatMessages`
  // nevet lent már a belső (kolléga-kolléga) csevegés hook-ja foglalja.
  const [inboxMessages, setInboxMessages] = useState([]);
  // "Belépések" (jelszókezelő) — csak metaadat kerül ide, a jelszó sosem; azt a
  // reveal_vault_credential RPC adja vissza, igény szerint, külön hívással.
  const [vaultCredentials, setVaultCredentials] = useState([]);
  const [customerProfiles, setCustomerProfiles] = useState([]);
  const [loyaltyRewards, setLoyaltyRewards] = useState([]);
  const [loyaltyLedger, setLoyaltyLedger] = useState([]);
  const [loyaltyRewardModal, setLoyaltyRewardModal] = useState(null); // null | "add" | reward obj (edit)
  const [monthlySummaries, setMonthlySummaries] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [inviteModal, setInviteModal] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [changePasswordModal, setChangePasswordModal] = useState(false);
  const [settings, setSettings] = useState({ smsOnTicketCreate: false, smsOnTicketReady: true, loyaltyFollowupEnabled: false, loyaltyFollowupDays: 3, reviewRequestEnabled: false, reviewRequestDelayDays: 2 });
  const [search, setSearch] = useState("");
  const [svcSearch, setSvcSearch] = useState("");
  const [partSearch, setPartSearch] = useState("");
  const [custSearch, setCustSearch] = useState("");
  const [stockModal, setStockModal] = useState(null); // null | "add" | product obj (edit)
  const [sellModal, setSellModal] = useState(null);
  const [issueInvoiceModal, setIssueInvoiceModal] = useState(null); // null | true (nyitva, tranzakció-választás alatt)
  const [partModal, setPartModal] = useState(null); // null | "add" | part obj (edit)
  const [txModal, setTxModal] = useState(null); // null | tx obj (edit)
  const [ticketModal, setTicketModal] = useState(null); // null | "add" | ticket obj (edit)
  const [depositModal, setDepositModal] = useState(null); // null | ticket obj
  const [ownServiceModal, setOwnServiceModal] = useState(null); // { product, kind } | null
  const [partUsageModal, setPartUsageModal] = useState(null); // { part } | null
  const [pendingPartUsage, setPendingPartUsage] = useState(null); // { part, qty } | null — az Alkatrészek fülről indított "Felhasználás" vár egy most létrejövő saját-készlet munkalapra
  const [detailId, setDetailId] = useState(null);
  const [productDetailId, setProductDetailId] = useState(null);
  const [partDetailId, setPartDetailId] = useState(null);
  const [deviceHistoryImei, setDeviceHistoryImei] = useState(null);
  const [customerKey, setCustomerKey] = useState(null);
  const [customerModal, setCustomerModal] = useState(null);
  const [customerMergeModal, setCustomerMergeModal] = useState(null); // null | primary customer object
  const [vaultModal, setVaultModal] = useState(null); // null | "add" | credential obj
  const [reviewModal, setReviewModal] = useState(null); // null | "add" | review obj
  const [reviewBulkOpen, setReviewBulkOpen] = useState(false);
  const [printTicket, setPrintTicket] = useState(null);
  const [receiptTxId, setReceiptTxId] = useState(null);
  const [printReceipt, setPrintReceipt] = useState(null);
  const [printConsignment, setPrintConsignment] = useState(null);
  const [printConsignmentList, setPrintConsignmentList] = useState(null);
  const [printPriceLabels, setPrintPriceLabels] = useState(null);
  const [printPurchase, setPrintPurchase] = useState(null);
  const [acquisitionPrintPrompt, setAcquisitionPrintPrompt] = useState(null);
  const [warranties, setWarranties] = useState([]);
  const [notes, setNotes] = useState([]);
  const [waitingItems, setWaitingItems] = useState([]);
  const [customerRequests, setCustomerRequests] = useState([]);
  const [webOrders, setWebOrders] = useState([]);
  const [productAcquisitions, setProductAcquisitions] = useState([]);
  const [warrantyModal, setWarrantyModal] = useState(null); // null | "add" | manual warranty object (edit)
  const [warrantyDetailKey, setWarrantyDetailKey] = useState(null);
  const [warrantyFilter, setWarrantyFilter] = useState("all"); // all | sale | service
  const [printWarranty, setPrintWarranty] = useState(null);
  const [stockHistory, setStockHistory] = useState([]);
  const [trash, setTrash] = useState(null); // null = not loaded | { products, parts, transactions, tickets }
  const [trashLoading, setTrashLoading] = useState(false);
  const [buybackModels, setBuybackModels] = useState([]);
  const [buybackRules, setBuybackRules] = useState([]);
  const [buybackOffers, setBuybackOffers] = useState([]);
  const [buybackOfferDetailId, setBuybackOfferDetailId] = useState(null);
  const [buybackModelModal, setBuybackModelModal] = useState(null); // null | "add" | model obj (edit)
  const [buybackRuleModal, setBuybackRuleModal] = useState(null); // null | "add" | rule obj (edit)
  const [employees, setEmployees] = useState([]);
  const [payrollSchedule, setPayrollSchedule] = useState([]);
  const [payrollPayments, setPayrollPayments] = useState([]);
  const [companyTaxObligations, setCompanyTaxObligations] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveRequestModal, setLeaveRequestModal] = useState(false);
  const [leaveBalanceModal, setLeaveBalanceModal] = useState(null); // null | user obj
  const [repairPrices, setRepairPrices] = useState([]);
  const [repairLeads, setRepairLeads] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [cashSettlements, setCashSettlements] = useState([]);
  const [dayCloses, setDayCloses] = useState([]);
  const [repairPriceModal, setRepairPriceModal] = useState(null); // null | { familyKey, problemTag }
  const [repairLeadFilter, setRepairLeadFilter] = useState("Új");
  const [repairLeadConvert, setRepairLeadConvert] = useState(null); // lead obj being converted to a ticket
  // Háttér-frissítés (visibilitychange + focus egyszerre, nyomtatás/fájlválasztó bezárása)
  // ne fusson duplán. Az élő változásokat a Realtime hozza, ez csak ritka felzárkózás.
  const loadInFlightRef = useRef(false);
  const lastLoadAtRef = useRef(0);
  // PDF RENDELÉS IMPORT
  const [pdfImportModal, setPdfImportModal] = useState(false);
  const [stockImportQueue, setStockImportQueue] = useState([]); // hátralévő "Telefon"-ként jelölt egységek

  return {
    tab, setTab, locFilter, lastActiveLocationId, setLocFilter,
    locations, setLocations, stock, setStock, transactions, setTransactions, tickets, setTickets, parts,
    setParts, productParts, setProductParts, users, setUsers, customersTable, setCustomersTable,
    inboxMessages, setInboxMessages, vaultCredentials, setVaultCredentials, customerProfiles,
    setCustomerProfiles, loyaltyRewards, setLoyaltyRewards, loyaltyLedger, setLoyaltyLedger,
    loyaltyRewardModal, setLoyaltyRewardModal, monthlySummaries, setMonthlySummaries, loadingData,
    setLoadingData, busy, setBusy, error, setError, info, setInfo, chatOpen, setChatOpen, scannerOpen,
    setScannerOpen, inviteModal, setInviteModal, inviteError, setInviteError, changePasswordModal,
    setChangePasswordModal, settings, setSettings, search, setSearch, svcSearch, setSvcSearch,
    partSearch, setPartSearch, custSearch, setCustSearch, stockModal, setStockModal, sellModal,
    setSellModal, issueInvoiceModal, setIssueInvoiceModal, partModal, setPartModal, txModal, setTxModal,
    ticketModal, setTicketModal, depositModal, setDepositModal, ownServiceModal, setOwnServiceModal,
    partUsageModal, setPartUsageModal, pendingPartUsage, setPendingPartUsage, detailId, setDetailId,
    productDetailId, setProductDetailId, partDetailId, setPartDetailId, deviceHistoryImei,
    setDeviceHistoryImei, customerKey, setCustomerKey, customerModal, setCustomerModal,
    customerMergeModal, setCustomerMergeModal, vaultModal, setVaultModal, reviewModal, setReviewModal,
    reviewBulkOpen, setReviewBulkOpen, printTicket, setPrintTicket, receiptTxId, setReceiptTxId,
    printReceipt, setPrintReceipt, printConsignment, setPrintConsignment, printConsignmentList,
    setPrintConsignmentList, printPriceLabels, setPrintPriceLabels, printPurchase, setPrintPurchase,
    acquisitionPrintPrompt, setAcquisitionPrintPrompt, warranties, setWarranties, notes, setNotes,
    waitingItems, setWaitingItems, customerRequests, setCustomerRequests, webOrders, setWebOrders,
    productAcquisitions, setProductAcquisitions, warrantyModal, setWarrantyModal, warrantyDetailKey,
    setWarrantyDetailKey, warrantyFilter, setWarrantyFilter, printWarranty, setPrintWarranty,
    stockHistory, setStockHistory, trash, setTrash, trashLoading, setTrashLoading, buybackModels,
    setBuybackModels, buybackRules, setBuybackRules, buybackOffers, setBuybackOffers,
    buybackOfferDetailId, setBuybackOfferDetailId, buybackModelModal, setBuybackModelModal,
    buybackRuleModal, setBuybackRuleModal, employees, setEmployees, payrollSchedule, setPayrollSchedule,
    payrollPayments, setPayrollPayments, companyTaxObligations, setCompanyTaxObligations, leaveTypes,
    setLeaveTypes, leaveBalances, setLeaveBalances, leaveRequests, setLeaveRequests, leaveRequestModal,
    setLeaveRequestModal, leaveBalanceModal, setLeaveBalanceModal, repairPrices, setRepairPrices,
    repairLeads, setRepairLeads, reviews, setReviews, cashSettlements,
    setCashSettlements, dayCloses, setDayCloses, repairPriceModal, setRepairPriceModal, repairLeadFilter,
    setRepairLeadFilter, repairLeadConvert, setRepairLeadConvert, loadInFlightRef, lastLoadAtRef,
    pdfImportModal, setPdfImportModal, stockImportQueue, setStockImportQueue,
  };
}

import { Suspense, lazy } from "react";
import { CloseIcon } from "../components/icons";
import { QUICK_SALES } from "../lib/utils";
import BuybackOfferDetailPanel from "../components/BuybackOfferDetailPanel";
const BuybackTab = lazy(() => import("../tabs/BuybackTab"));
const CashSettlementTab = lazy(() => import("../tabs/CashSettlementTab"));
const CustomersTab = lazy(() => import("../tabs/CustomersTab"));
const DashboardTab = lazy(() => import("../tabs/DashboardTab"));
const FinanceTab = lazy(() => import("../tabs/FinanceTab"));
const InboxTab = lazy(() => import("../tabs/InboxTab"));
const InvoicesTab = lazy(() => import("../tabs/InvoicesTab"));
const LeaveTab = lazy(() => import("../tabs/LeaveTab"));
const PartsTab = lazy(() => import("../tabs/PartsTab"));
const PayrollTab = lazy(() => import("../tabs/PayrollTab"));
const PultTab = lazy(() => import("../tabs/PultTab"));
const RepairPricesTab = lazy(() => import("../tabs/RepairPricesTab"));
const ReviewsTab = lazy(() => import("../tabs/ReviewsTab"));
const ServiceTab = lazy(() => import("../tabs/ServiceTab"));
const SettingsTab = lazy(() => import("../tabs/SettingsTab"));
const StockTab = lazy(() => import("../tabs/StockTab"));
const TrashTab = lazy(() => import("../tabs/TrashTab"));
const UsersTab = lazy(() => import("../tabs/UsersTab"));
const VaultTab = lazy(() => import("../tabs/VaultTab"));
const WarrantyTab = lazy(() => import("../tabs/WarrantyTab"));

// Az aktív fül tartalma (a fülek maguk lusta betöltésűek).
export default function AppTabs({ ctx }) {
  const {
    activeTickets, activeWarranties, addCompanyTaxObligation, addLoyaltyReward, addNote,
    addPartToProduct, addPartToTicket, addProduct, addTicket, addWaitingItem, advanceCustomerRequest,
    advanceWaiting, allUsedParts, allowedLocations, bulkImportReviews, busy, buybackModels,
    buybackOfferDetailId, buybackOffers, buybackRules, canSeeFinance, cancelWebOrder, cashSettlements,
    checkoutBasket, closeDay, companyTaxObligations, completeNote, completeWebOrder, confirmWebOrder,
    convertBuybackOfferToProduct, coverageWarnings, createLeadFromThread, currentMonthLive, custSearch,
    customerRequests, customerStats, customers, customersTable, dailyIncomeTrend, dayCloses,
    decideLeaveRequest, defaultLocId, defaultStockLocId, deleteBuybackModel, deleteBuybackRule,
    deleteCashSettlement, deleteEmployee, deleteNote, deletePartGroup, deleteReview, deleteTransaction,
    deleteVaultCredential, editCashSettlement, editLocation, editLoyaltyReward, editReview,
    effectiveLocFilter, employees, ensureCompanyTaxPeriod, ensurePayrollPeriod, error, expiredWarranties,
    filteredParts, filteredStock, filteredTickets, filteredTransactions, filteredWarranties,
    generateWebOrderAwb, handedOverTickets, hardDeletePart, hardDeleteProduct, hardDeleteTicket,
    hardDeleteTransaction, inboxMessages, info, isAdmin, leaveBalanceByUser, leaveTypes, leaveYear,
    loadingData, locName, locations, loyaltyRewards, markInboxRead, markPayrollPaid, markTaxPaid,
    monthlySummaries, monthlyTrendSummary, moveRefurbRank, myLocationId, noLocationAssigned, notes,
    openPartUsageModal, partSearch, parts, partsStats, payoutBuybackOffer, payrollPayments,
    payrollSchedule, printPriceLabelsDocs, printTicketSlip, printWarrantySlip, productConditionById,
    productParts, profile, quickIssueDocument, refurbPhones, rejectBuybackOffer, rejectRepairLead,
    removePartFromProduct, reopenDay, reopenNote, repairLeadFilter, repairLeads, repairPrices,
    reserveLocId, resetEmployeePassword, restorePart, restoreProduct, restoreTicket, restoreTransaction,
    retrySmartbillDocument, revealVaultCredential, reviewBulkOpen, reviewModal, reviews,
    revokeLeaveRequest, saveCashSettlement, search, sendInboxReply, setBuybackModelModal,
    setBuybackOfferDetailId, setBuybackOfferStatus, setBuybackRuleModal, setChangePasswordModal,
    setCustSearch, setCustomerKey, setCustomerModal, setDetailId, setInfo, setLeaveBalanceModal,
    setPartDetailId, setPartSearch, setPdfImportModal, setProductDetailId, setProductStockStatus,
    setReceiptTxId, setRepairLeadConvert, setRepairLeadFilter, setRepairPriceModal, setReviewBulkOpen,
    setReviewModal, setScannerOpen, setSearch, setSellModal, setStockModal, setSvcSearch, setTab,
    setTicketModal, setTicketStatus, setTxModal, setVaultModal, setWarrantyDetailKey, setWarrantyFilter,
    setWarrantyModal, settings, signIn, soldPhoneStats, soldStock, stock, stockHistory, stockLocFilter,
    stockStats, svcSearch, svcStats, tab, tickets, todoItems, transactions, trash, trashLoading,
    unmarkPayrollPaid, unmarkTaxPaid, upcomingLeave, updateLead, updateNote, updatePayrollAmount,
    updateSettings, updateTaxAmount, updateUserProfile, updateWaitingItem, useMacDock, user, users,
    vaultCredentials, vaultModal, waitingItems, warranties, warrantyFilter, webOrders,
  } = ctx;
  return (
      <div className={`main${useMacDock ? " mac-pult-content" : ""}`}>
        {error && <div className="errbar">{error}</div>}
        {info && <div className="banner ok">{info} <button type="button" className="banner-close" onClick={() => setInfo("")}><CloseIcon width={12} height={12} /></button></div>}
        {noLocationAssigned && (
          <div className="banner warn">Nincs helyszín hozzárendelve a fiókodhoz. Kérj meg egy adminisztrátort, hogy rendeljen hozzá egy helyszínt, addig nem látsz adatokat.</div>
        )}

        <Suspense fallback={<div className="card" style={{ padding: 40, textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>Betöltés...</div>}>
        {!noLocationAssigned && tab === "pult" && (
          <PultTab
            effectiveLocFilter={effectiveLocFilter} locName={locName} filteredTickets={filteredTickets} setDetailId={setDetailId}
            notes={notes} addNote={addNote} completeNote={completeNote} reopenNote={reopenNote} deleteNote={deleteNote} updateNote={updateNote}
            waitingItems={waitingItems} addWaitingItem={addWaitingItem} advanceWaiting={advanceWaiting} updateWaitingItem={updateWaitingItem}
            users={users} currentUserId={profile?.id} tickets={tickets} stock={stock} parts={parts} customersTable={customersTable} warranties={warranties}
            upcomingLeave={upcomingLeave}
            customerRequests={customerRequests} advanceCustomerRequest={advanceCustomerRequest}
            webOrders={webOrders} confirmWebOrder={confirmWebOrder} cancelWebOrder={cancelWebOrder} completeWebOrder={completeWebOrder} generateWebOrderAwb={generateWebOrderAwb}
            onOpenTicket={(id) => setDetailId(id)}
            onOpenProduct={(id) => setProductDetailId(id)}
            onOpenPart={(id) => setPartDetailId(id)}
            onOpenCustomer={(id) => setCustomerKey(id)}
            onOpenWarranty={(id) => { setTab("warranty"); setWarrantyDetailKey(`manual-${id}`); }}
            setTicketModal={setTicketModal} setStockModal={setStockModal}
          />
        )}

        {!noLocationAssigned && isAdmin && tab === "dashboard" && (
          <DashboardTab
            effectiveLocFilter={effectiveLocFilter} locName={locName} stockStats={stockStats} stockHistory={stockHistory}
            soldPhoneStats={soldPhoneStats}
            svcStats={svcStats} monthlyTrendSummary={monthlyTrendSummary} currentMonthLive={currentMonthLive}
            monthlySummaries={monthlySummaries} locations={locations} transactions={filteredTransactions} partsStats={partsStats} customerStats={customerStats}
            tickets={tickets}
            todoItems={todoItems} setDetailId={setDetailId}
            stockSparkline={stockHistory.slice(-14).map((h) => h.value)} dailyIncomeTrend={dailyIncomeTrend}
            canSeeFinance={canSeeFinance} userEmail={user?.email} signIn={signIn}
          />
        )}

        {!noLocationAssigned && tab === "stock" && (
          <StockTab
            effectiveLocFilter={stockLocFilter} locName={locName} busy={busy} setStockModal={setStockModal}
            search={search} setSearch={setSearch} onScan={() => setScannerOpen(true)} loadingData={loadingData} filteredStock={filteredStock}
            locations={locations} reserveLocId={reserveLocId} setProductDetailId={setProductDetailId}
            setSellModal={setSellModal}
            soldStock={soldStock}
            isAdmin={isAdmin} myLocationId={myLocationId}
            onPrintLabels={printPriceLabelsDocs}
            onStockStatusChange={setProductStockStatus}
            customers={customersTable} defaultLocId={defaultStockLocId} onCreateProduct={addProduct}
            refurbPhones={refurbPhones} moveRefurbRank={moveRefurbRank}
            parts={parts} productParts={productParts} addPartToProduct={addPartToProduct}
            removePartFromProduct={removePartFromProduct}
          />
        )}

        {!noLocationAssigned && tab === "finance" && (
          <FinanceTab
            effectiveLocFilter={effectiveLocFilter} locName={locName}
            allowedLocations={allowedLocations} defaultLocId={defaultLocId} busy={busy}
            loadingData={loadingData} transactions={transactions} filteredTransactions={filteredTransactions} setTxModal={setTxModal}
            deleteTransaction={deleteTransaction} setReceiptTxId={setReceiptTxId}
            productConditionById={productConditionById}
            smartQuickItems={QUICK_SALES} checkoutBasket={checkoutBasket}
            dayCloses={dayCloses}
            closeDay={closeDay} reopenDay={reopenDay}
            isAdmin={isAdmin}
            onImportPdf={() => setPdfImportModal(true)}
          />
        )}

        {!noLocationAssigned && tab === "invoices" && (
          <InvoicesTab
            transactions={transactions} locName={locName} isAdmin={isAdmin}
            retrySmartbillDocument={retrySmartbillDocument}
            quickIssueDocument={quickIssueDocument} customers={customersTable}
            defaultLocId={defaultLocId} busy={busy}
          />
        )}

        {isAdmin && tab === "cash-settlement" && (
          <CashSettlementTab
            busy={busy} transactions={transactions} cashSettlements={cashSettlements}
            saveCashSettlement={saveCashSettlement} editCashSettlement={editCashSettlement}
            deleteCashSettlement={deleteCashSettlement} users={users}
            allowedLocations={allowedLocations} locName={locName}
          />
        )}

        {isAdmin && tab === "payroll" && (
          <PayrollTab
            busy={busy} employees={employees} payrollSchedule={payrollSchedule}
            payrollPayments={payrollPayments} companyTaxObligations={companyTaxObligations} locations={locations}
            ensurePayrollPeriod={ensurePayrollPeriod} ensureCompanyTaxPeriod={ensureCompanyTaxPeriod}
            markPayrollPaid={markPayrollPaid} unmarkPayrollPaid={unmarkPayrollPaid}
            markTaxPaid={markTaxPaid} unmarkTaxPaid={unmarkTaxPaid} addCompanyTaxObligation={addCompanyTaxObligation}
            updatePayrollAmount={updatePayrollAmount} updateTaxAmount={updateTaxAmount}
          />
        )}

        {!noLocationAssigned && tab === "service" && (
          <ServiceTab
            effectiveLocFilter={effectiveLocFilter} locName={locName} busy={busy}
            svcSearch={svcSearch} setSvcSearch={setSvcSearch} onScan={() => setScannerOpen(true)}
            loadingData={loadingData} activeTickets={activeTickets} setDetailId={setDetailId}
            handedOverTickets={handedOverTickets} onStatusChange={setTicketStatus} onPrint={printTicketSlip}
            parts={parts} onAddPart={addPartToTicket}
            customers={customersTable}
            defaultLocId={myLocationId || defaultLocId} onCreateTicket={addTicket}
          />
        )}

        {!noLocationAssigned && tab === "parts" && (
          <PartsTab
            busy={busy} partSearch={partSearch} setPartSearch={setPartSearch} onScan={() => setScannerOpen(true)}
            loadingData={loadingData} filteredParts={filteredParts} setPartDetailId={setPartDetailId} deletePart={deletePartGroup}
            partsStats={partsStats} allUsedParts={allUsedParts} locName={locName} setDetailId={setDetailId}
            onUsePart={openPartUsageModal}
          />
        )}

        {!noLocationAssigned && tab === "customers" && (
          <CustomersTab
            effectiveLocFilter={effectiveLocFilter} locName={locName} busy={busy} setCustomerModal={setCustomerModal}
            custSearch={custSearch} setCustSearch={setCustSearch} loadingData={loadingData} customers={customers} setCustomerKey={setCustomerKey}
            customerStats={customerStats}
          />
        )}

        {!noLocationAssigned && tab === "inbox" && (
          <InboxTab
            messages={inboxMessages} customers={customersTable} tickets={tickets} onSend={sendInboxReply} onOpenCustomer={setCustomerKey}
            onMarkRead={markInboxRead} onUpdateLead={updateLead} onCreateLead={createLeadFromThread} onOpenTicket={(id) => setDetailId(id)}
            repairLeads={repairLeads} buybackOffers={buybackOffers}
            onOpenRepairLead={() => setTab("repair-prices")} onOpenBuybackOffer={(id) => setBuybackOfferDetailId(id)}
          />
        )}

        {!noLocationAssigned && tab === "vault" && (
          <VaultTab
            credentials={vaultCredentials} isAdmin={isAdmin}
            modal={vaultModal} setModal={setVaultModal}
            onDelete={deleteVaultCredential}
            onReveal={revealVaultCredential}
          />
        )}

        {!noLocationAssigned && tab === "warranty" && (
          <WarrantyTab
            busy={busy} setWarrantyModal={setWarrantyModal} activeWarranties={activeWarranties}
            warrantyFilter={warrantyFilter} setWarrantyFilter={setWarrantyFilter} loadingData={loadingData}
            filteredWarranties={filteredWarranties} setWarrantyDetailKey={setWarrantyDetailKey}
            expiredWarranties={expiredWarranties} onPrint={printWarrantySlip}
          />
        )}

        {!noLocationAssigned && tab === "leave" && (
          <LeaveTab
            leaveYear={leaveYear} busy={busy} coverageWarnings={coverageWarnings}
            locName={locName} users={users} leaveBalanceByUser={leaveBalanceByUser} isAdmin={isAdmin}
            setLeaveBalanceModal={setLeaveBalanceModal} upcomingLeave={upcomingLeave} leaveTypes={leaveTypes} user={user}
            decideLeaveRequest={decideLeaveRequest} revokeLeaveRequest={revokeLeaveRequest}
          />
        )}

        {!noLocationAssigned && isAdmin && tab === "buyback" && (
          <BuybackTab
            busy={busy} buybackModels={buybackModels} setBuybackModelModal={setBuybackModelModal} deleteBuybackModel={deleteBuybackModel}
            buybackRules={buybackRules} setBuybackRuleModal={setBuybackRuleModal} deleteBuybackRule={deleteBuybackRule}
            buybackOffers={buybackOffers} loadingData={loadingData} setBuybackOfferDetailId={setBuybackOfferDetailId} setBuybackOfferStatus={setBuybackOfferStatus}
          />
        )}
        {buybackOfferDetailId && buybackOffers.find((o) => o.id === buybackOfferDetailId) && (
          <BuybackOfferDetailPanel
            offer={buybackOffers.find((o) => o.id === buybackOfferDetailId)}
            locName={locName}
            busy={busy}
            onClose={() => setBuybackOfferDetailId(null)}
            onSetStatus={setBuybackOfferStatus}
            onPayout={(id, price) => { payoutBuybackOffer(id, price); setBuybackOfferDetailId(null); }}
            onReject={(id) => { rejectBuybackOffer(id); setBuybackOfferDetailId(null); }}
            onConvert={(offer) => { convertBuybackOfferToProduct(offer); setBuybackOfferDetailId(null); }}
          />
        )}

        {!noLocationAssigned && isAdmin && tab === "repair-prices" && (
          <RepairPricesTab
            repairPrices={repairPrices} setRepairPriceModal={setRepairPriceModal} repairLeads={repairLeads}
            repairLeadFilter={repairLeadFilter} setRepairLeadFilter={setRepairLeadFilter} busy={busy}
            setRepairLeadConvert={setRepairLeadConvert} setTicketModal={setTicketModal} rejectRepairLead={rejectRepairLead} locName={locName}
          />
        )}

        {!noLocationAssigned && isAdmin && tab === "reviews" && (
          <ReviewsTab
            reviews={reviews} locName={locName} busy={busy}
            editReview={editReview} deleteReview={deleteReview}
            modal={reviewModal} setModal={setReviewModal}
            bulkOpen={reviewBulkOpen} setBulkOpen={setReviewBulkOpen} bulkImportReviews={bulkImportReviews}
          />
        )}

        {!noLocationAssigned && isAdmin && tab === "users" && (
          <UsersTab
            busy={busy} loadingData={loadingData}
            users={users} user={user} updateUserProfile={updateUserProfile} allowedLocations={allowedLocations}
            resetEmployeePassword={resetEmployeePassword} deleteEmployee={deleteEmployee}
          />
        )}

        {!noLocationAssigned && tab === "trash" && (
          <TrashTab
            trashLoading={trashLoading} trash={trash} busy={busy} restoreProduct={restoreProduct} hardDeleteProduct={hardDeleteProduct}
            restorePart={restorePart} hardDeletePart={hardDeletePart} restoreTransaction={restoreTransaction}
            hardDeleteTransaction={hardDeleteTransaction} restoreTicket={restoreTicket} hardDeleteTicket={hardDeleteTicket}
          />
        )}

        {tab === "settings" && (
          <SettingsTab
            isAdmin={isAdmin} profile={profile} user={user} settings={settings} updateSettings={updateSettings}
            busy={busy} setChangePasswordModal={setChangePasswordModal} locations={locations}
            loyaltyRewards={loyaltyRewards} addLoyaltyReward={addLoyaltyReward} editLoyaltyReward={editLoyaltyReward}
            editLocation={editLocation}
          />
        )}
        </Suspense>
      </div>
  );
}

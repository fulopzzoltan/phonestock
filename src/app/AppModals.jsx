import { Suspense, lazy } from "react";
import StockModal from "../components/StockModal";
import SellModal from "../components/SellModal";
import IssueInvoiceModal from "../components/IssueInvoiceModal";
import PartModal from "../components/PartModal";
import PartUsageModal from "../components/PartUsageModal";
import TransactionModal from "../components/TransactionModal";
import TicketFormModal from "../components/TicketFormModal";
import DetailPanel from "../components/DetailPanel";
import TicketDepositModal from "../components/TicketDepositModal";
import ProductDetailPanel from "../components/ProductDetailPanel";
import DeviceHistoryPanel from "../components/DeviceHistoryPanel";
import OwnStockServiceModal from "../components/OwnStockServiceModal";
import PartDetailPanel from "../components/PartDetailPanel";
import CustomerDetailPanel from "../components/CustomerDetailPanel";
import CustomerModal from "../components/CustomerModal";
import VaultCredentialModal from "../components/VaultCredentialModal";
import ReviewModal from "../components/ReviewModal";
import CustomerMergeModal from "../components/CustomerMergeModal";
import SaleReceiptPanel from "../components/SaleReceiptPanel";
import WarrantyDetailPanel from "../components/WarrantyDetailPanel";
import WarrantyModal from "../components/WarrantyModal";
import BuybackModelModal from "../components/BuybackModelModal";
import BuybackRuleModal from "../components/BuybackRuleModal";
import LeaveRequestModal from "../components/LeaveRequestModal";
import LeaveBalanceModal from "../components/LeaveBalanceModal";
import RepairPriceModal from "../components/RepairPriceModal";
import { REPAIR_FAMILIES } from "../lib/repairCatalog";
import PrintSlip from "../components/PrintSlip";
import PrintReceiptSlip from "../components/PrintReceiptSlip";
import PrintWarrantySlip from "../components/PrintWarrantySlip";
import PrintConsignmentDocs from "../components/PrintConsignmentDocs";
import PrintConsignmentList from "../components/PrintConsignmentList";
import PrintPriceLabels from "../components/PrintPriceLabels";
import PrintPurchaseDocs from "../components/PrintPurchaseDocs";
import ChangePasswordModal from "../components/ChangePasswordModal";
import InviteEmployeeModal from "../components/InviteEmployeeModal";
import TeamChatPanel from "../components/TeamChatPanel";
const PdfOrderImportModal = lazy(() => import("../components/PdfOrderImportModal"));
const ScannerModal = lazy(() => import("../components/ScannerModal"));

// Modálok, részletpanelek, nyomtatványok és a csapatchat — az aktív fültől függetlenül.
export default function AppModals({ ctx }) {
  const {
    acquisitionPrintPrompt, activeServiceTicket, activeWarranties, addBuybackModel, addBuybackRule,
    addLeaveRequest, addPart, addPartToTicket, addProduct, addReview, addTicket, addTicketDeposit,
    addWarranty, allowedLocations, busy, buybackModelModal, buybackRuleModal, changeOwnPassword,
    changePasswordModal, changeVaultCredentialPassword, chatMessages, chatOpen, clearLinkedWarranty,
    completeQc, createCustomer, createVaultCredential, customerMergeModal, customerModal, customersTable,
    defaultLocId, defaultStockLocId, deletePart, deletePartGroup, deleteProduct, deleteTicket,
    deleteTransaction, deleteWarranty, depositModal, detailCustomer, detailPart, detailPartAllUnits,
    detailProduct, detailTicket, deviceHistory, deviceHistoryImei, editBuybackModel, editBuybackRule,
    editLinkedWarranty, editPart, editProduct, editReview, editTransaction, editWarranty, editingTicket,
    expiredWarranties, handleScanResult, importPdfOrder, inviteEmployee, inviteError, inviteModal,
    isAdmin, issueInvoiceModal, issueSmartbillDocument, leaveBalanceByUser, leaveBalanceModal,
    leaveRequestModal, leaveTypes, leaveYear, locName, locations, loyaltyLedger, loyaltyRewards,
    mergeCustomers, myLocationId, openOwnServiceModal, ownServiceModal, partGroups, partModal, partUsage,
    partUsageModal, parts, payoutConsignor, pdfImportModal, printConsignment, printConsignmentDocs,
    printConsignmentList, printPriceLabels, printPurchase, printPurchaseDocs, printReceipt,
    printReceiptSlip, printTicket, printTicketSlip, printWarranty, printWarrantySlip, productPartUsage,
    profile, receiptTx, redeemLoyaltyPoints, removePartFromTicket, repairLeadConvert, repairPriceModal,
    returnProductToStock, reviewModal, saveLeaveBalance, saveOwnServiceTicket, saveRepairPrice,
    saveTicketEdit, scannerOpen, sellModal, sellProduct, sendChatMessage, setAcquisitionPrintPrompt,
    setBusy, setBuybackModelModal, setBuybackRuleModal, setChangePasswordModal, setChatOpen,
    setCustomerKey, setCustomerMergeModal, setCustomerModal, setDepositModal, setDetailId,
    setDeviceHistoryImei, setInviteModal, setIssueInvoiceModal, setLeaveBalanceModal,
    setLeaveRequestModal, setOwnServiceModal, setPartDetailId, setPartModal, setPartUsageModal,
    setPdfImportModal, setProductDetailId, setReceiptTxId, setRepairLeadConvert, setRepairPriceModal,
    setReviewModal, setScannerOpen, setSellModal, setStockModal, setTab, setTicketModal, setTicketStatus,
    setTxModal, setVaultModal, setWarrantyDetailKey, setWarrantyModal, settings, stock, stockLocations,
    stockModal, ticketModal, tickets, transactions, txByProductId, txModal, updateCustomer,
    updatePartStatus, updateVaultCredentialMeta, usePartForProduct, usePartForTicket, users, vaultModal,
    warranties, warrantyDetailKey, warrantyModal,
  } = ctx;
  return (
    <>
        {stockModal && (
          <StockModal
            product={typeof stockModal === "object" && stockModal?.id ? stockModal : null}
            prefill={typeof stockModal === "object" && !stockModal?.id ? stockModal : null}
            locations={locations}
            stock={stock}
            tickets={tickets}
            customers={customersTable}
            onClose={() => setStockModal(null)}
            busy={busy}
            defaultLocId={defaultStockLocId}
            onSave={(data, locId, acquisition) => (typeof stockModal === "object" && stockModal?.id ? editProduct(stockModal.id, data, locId) : addProduct(data, locId, acquisition))}
          />
        )}
        {sellModal && <SellModal item={sellModal} locName={locName} customers={customersTable} rewards={loyaltyRewards} onClose={() => setSellModal(null)} onSave={sellProduct} busy={busy} />}
        {issueInvoiceModal && (
          <IssueInvoiceModal transactions={transactions} locName={locName} onClose={() => setIssueInvoiceModal(null)} onIssue={issueSmartbillDocument} busy={busy} />
        )}
        {partModal && (
          <PartModal
            part={typeof partModal === "object" && partModal?.id ? partModal : null}
            prefill={typeof partModal === "object" && !partModal?.id ? partModal : null}
            locations={stockLocations}
            defaultLocId={defaultLocId}
            onClose={() => setPartModal(null)}
            busy={busy}
            onSave={(data, locId) => (typeof partModal === "object" && partModal?.id ? editPart(partModal, data) : addPart(data, locId))}
          />
        )}
        {partUsageModal && (
          <PartUsageModal
            part={partUsageModal.part}
            tickets={tickets}
            stock={stock}
            locName={locName}
            busy={busy}
            onUseForTicket={usePartForTicket}
            onUseForProduct={usePartForProduct}
            onClose={() => setPartUsageModal(null)}
          />
        )}
        {pdfImportModal && (
          <Suspense fallback={null}>
          <PdfOrderImportModal
            locations={allowedLocations}
            defaultLocId={defaultLocId}
            busy={busy}
            onClose={() => setPdfImportModal(false)}
            onImport={importPdfOrder}
          />
          </Suspense>
        )}
        {txModal && (
          <TransactionModal
            tx={txModal}
            locations={allowedLocations}
            customers={customersTable}
            defaultLocId={defaultLocId}
            onClose={() => setTxModal(null)}
            busy={busy}
            onSave={(data, locId) => editTransaction(txModal.id, data, locId)}
            onDelete={() => { deleteTransaction(txModal.id); setTxModal(null); }}
          />
        )}
        {ticketModal && (
          <TicketFormModal
            ticket={editingTicket}
            prefill={!editingTicket && repairLeadConvert ? {
              customerName: repairLeadConvert.customerName,
              customerPhone: repairLeadConvert.customerPhone,
              brand: repairLeadConvert.brand,
              model: repairLeadConvert.model,
              price: repairLeadConvert.estimatedPrice ?? "",
              tags: repairLeadConvert.problemTag ? [repairLeadConvert.problemTag] : [],
              extra: repairLeadConvert.note || "",
            } : undefined}
            locations={allowedLocations}
            users={users}
            customers={customersTable}
            stock={stock}
            tickets={tickets}
            defaultLocId={myLocationId || defaultLocId}
            onClose={() => { setTicketModal(null); setRepairLeadConvert(null); }}
            busy={busy}
            onSave={(data, locId) => (editingTicket ? saveTicketEdit(editingTicket.id, data, locId) : addTicket(data, locId))}
          />
        )}
        {detailTicket && (
          <DetailPanel
            ticket={detailTicket}
            locName={locName}
            busy={busy}
            parts={partGroups}
            stock={stock}
            users={users}
            customers={customersTable}
            rewards={loyaltyRewards}
            onClose={() => setDetailId(null)}
            onStatusChange={setTicketStatus}
            onCompleteQc={completeQc}
            onEdit={(t) => { setDetailId(null); setTicketModal(t); }}
            onDelete={deleteTicket}
            onAddPart={addPartToTicket}
            onRemovePart={removePartFromTicket}
            onPrint={printTicketSlip}
            onShowHistory={(imei) => setDeviceHistoryImei(imei)}
            onAddDeposit={setDepositModal}
          />
        )}
        {depositModal && (
          <TicketDepositModal
            ticket={depositModal}
            busy={busy}
            onClose={() => setDepositModal(null)}
            onConfirm={(amount, payment) => { addTicketDeposit(depositModal.id, amount, payment); setDepositModal(null); }}
          />
        )}
        {detailProduct && (
          <ProductDetailPanel
            product={detailProduct}
            saleTx={detailProduct.status === "sold" ? txByProductId.get(detailProduct.id) : null}
            locName={locName}
            busy={busy}
            users={users}
            parts={partGroups}
            activeServiceTicket={activeServiceTicket}
            partUsageHistory={productPartUsage}
            onAddPart={addPartToTicket}
            onRemovePart={removePartFromTicket}
            onStartService={openOwnServiceModal}
            onOpenTicket={(id) => { setProductDetailId(null); setDetailId(id); }}
            onClose={() => setProductDetailId(null)}
            onSell={(p) => { setProductDetailId(null); setSellModal(p); }}
            onEdit={(p) => { setProductDetailId(null); setStockModal(p); }}
            onDelete={(id) => { deleteProduct(id); setProductDetailId(null); }}
            onReturnToStock={returnProductToStock}
            onShowHistory={(imei) => setDeviceHistoryImei(imei)}
            onPayoutConsignor={payoutConsignor}
            onPrintConsignment={() => (detailProduct.acquisition?.acquisitionType === "consignment" ? printConsignmentDocs : printPurchaseDocs)(detailProduct, detailProduct.acquisition)}
            onPrint={printReceiptSlip}
          />
        )}
        {deviceHistoryImei && (
          <DeviceHistoryPanel history={deviceHistory} onClose={() => setDeviceHistoryImei(null)} />
        )}
        {ownServiceModal && (
          <OwnStockServiceModal
            product={ownServiceModal.product}
            kind={ownServiceModal.kind}
            locations={locations}
            users={users}
            busy={busy}
            onClose={() => setOwnServiceModal(null)}
            onSave={saveOwnServiceTicket}
          />
        )}
        {detailPart && (
          <PartDetailPanel
            part={detailPart}
            allUnits={detailPartAllUnits}
            busy={busy}
            onClose={() => setPartDetailId(null)}
            onEdit={(p) => { setPartDetailId(null); setPartModal(p); }}
            onDelete={(g) => { deletePartGroup(g); setPartDetailId(null); }}
            onDeleteUnit={deletePart}
            onUpdateStatus={updatePartStatus}
            partUsage={partUsage}
            onOpenTicket={(id) => { setPartDetailId(null); setDetailId(id); }}
            locName={locName}
          />
        )}
        {detailCustomer && (
          <CustomerDetailPanel
            customer={detailCustomer}
            locName={locName}
            busy={busy}
            ledger={loyaltyLedger}
            rewards={loyaltyRewards}
            redeemBusy={busy}
            onRedeem={(reward) => redeemLoyaltyPoints(detailCustomer, reward, defaultLocId)}
            onClose={() => setCustomerKey(null)}
            onEdit={(c) => { setCustomerKey(null); setCustomerModal(c); }}
            onOpenTicket={(id) => { setCustomerKey(null); setDetailId(id); }}
            onOpenProduct={(id) => { setCustomerKey(null); setProductDetailId(id); }}
            isAdmin={isAdmin}
            onMerge={(c) => setCustomerMergeModal(c)}
          />
        )}
        {customerModal && (
          <CustomerModal
            customer={customerModal === "add" ? null : customerModal}
            customers={customersTable}
            busy={busy}
            onClose={() => setCustomerModal(null)}
            onSave={(data) => (customerModal === "add" ? createCustomer(data) : updateCustomer(customerModal.id, data))}
          />
        )}
        {vaultModal && (
          <VaultCredentialModal
            credential={vaultModal === "add" ? null : vaultModal}
            busy={busy}
            onClose={() => setVaultModal(null)}
            onSave={async (f) => {
              setBusy(true);
              try {
                if (vaultModal === "add") await createVaultCredential(f);
                else await updateVaultCredentialMeta(vaultModal.id, f);
                setVaultModal(null);
              } finally {
                setBusy(false);
              }
            }}
            onChangePassword={(pw) => changeVaultCredentialPassword(vaultModal.id, pw)}
          />
        )}
        {reviewModal && (
          <ReviewModal
            review={reviewModal === "add" ? null : reviewModal}
            locations={allowedLocations}
            busy={busy}
            onClose={() => setReviewModal(null)}
            onSave={async (data) => {
              if (reviewModal === "add") await addReview(data);
              else await editReview(reviewModal.id, data);
              setReviewModal(null);
            }}
          />
        )}
        {customerMergeModal && (
          <CustomerMergeModal
            primaryCustomer={customerMergeModal}
            customers={customersTable}
            busy={busy}
            onClose={() => setCustomerMergeModal(null)}
            onMerge={(duplicateId) => mergeCustomers(customerMergeModal.id, duplicateId)}
          />
        )}
        {receiptTx && (
          <SaleReceiptPanel
            tx={receiptTx} locName={locName} onClose={() => setReceiptTxId(null)} onPrint={printReceiptSlip}
            onEdit={(t) => { setReceiptTxId(null); setTxModal(t); }}
          />
        )}
        {warrantyDetailKey && (() => {
          const w = activeWarranties.find((x) => x.key === warrantyDetailKey) || expiredWarranties.find((x) => x.key === warrantyDetailKey);
          if (!w) return null;
          return (
            <WarrantyDetailPanel
              w={w} locName={locName} busy={busy}
              onClose={() => setWarrantyDetailKey(null)}
              onPrint={(w) => printWarrantySlip(w)}
              onEditLinked={editLinkedWarranty}
              onEditManual={(w) => { setWarrantyModal(warranties.find((x) => x.id === w.refId)); setWarrantyDetailKey(null); }}
              onDeleteLinked={(kind, refId) => { clearLinkedWarranty(kind, refId); setWarrantyDetailKey(null); }}
              onDeleteManual={(id) => { deleteWarranty(id); setWarrantyDetailKey(null); }}
            />
          );
        })()}
        {warrantyModal && (
          <WarrantyModal
            initial={warrantyModal === "add" ? null : warrantyModal}
            locations={allowedLocations} customers={customersTable} busy={busy}
            onClose={() => setWarrantyModal(null)}
            onSubmit={(data, locId) => (warrantyModal === "add" ? addWarranty(data, locId) : editWarranty(warrantyModal.id, data, locId))}
          />
        )}
        {buybackModelModal && (
          <BuybackModelModal
            model={buybackModelModal !== "add" ? buybackModelModal : null}
            onClose={() => setBuybackModelModal(null)}
            busy={busy}
            onSave={(data) => (buybackModelModal !== "add" ? editBuybackModel(buybackModelModal.id, data) : addBuybackModel(data))}
          />
        )}
        {buybackRuleModal && (
          <BuybackRuleModal
            rule={buybackRuleModal !== "add" ? buybackRuleModal : null}
            onClose={() => setBuybackRuleModal(null)}
            busy={busy}
            onSave={(data) => (buybackRuleModal !== "add" ? editBuybackRule(buybackRuleModal.id, data) : addBuybackRule(data))}
          />
        )}
        {leaveRequestModal && (
          <LeaveRequestModal
            leaveTypes={leaveTypes}
            busy={busy}
            onClose={() => setLeaveRequestModal(false)}
            onSubmit={addLeaveRequest}
          />
        )}
        {leaveBalanceModal && (
          <LeaveBalanceModal
            user={leaveBalanceModal}
            year={leaveYear}
            initial={leaveBalanceByUser[leaveBalanceModal.id]?.entitled ?? 20}
            busy={busy}
            onClose={() => setLeaveBalanceModal(null)}
            onSave={(days) => saveLeaveBalance(leaveBalanceModal.id, leaveYear, days)}
          />
        )}
        {repairPriceModal && (
          <RepairPriceModal
            familyLabel={REPAIR_FAMILIES[repairPriceModal.familyKey]}
            problemLabel={repairPriceModal.problemTag}
            price={repairPriceModal.price}
            busy={busy}
            onClose={() => setRepairPriceModal(null)}
            onSave={(data) => saveRepairPrice(repairPriceModal.familyKey, repairPriceModal.problemTag, data)}
          />
        )}
        <div id="print-slip-root">
          {printTicket && <PrintSlip ticket={printTicket} location={locations.find((l) => l.id === printTicket.locationId)} intakeLocation={locations.find((l) => l.id === (printTicket.intakeLocationId || printTicket.locationId))} />}
          {printReceipt && <PrintReceiptSlip tx={printReceipt} location={locations.find((l) => l.id === printReceipt.locationId)} />}
          {printWarranty && <PrintWarrantySlip w={printWarranty} location={locations.find((l) => l.id === printWarranty.locationId)} />}
          {printConsignment && <PrintConsignmentDocs product={printConsignment.product} acquisition={printConsignment.acquisition} settings={settings} location={locations.find((l) => l.id === printConsignment.product.locationId)} />}
          {printConsignmentList && <PrintConsignmentList items={printConsignmentList.items} locations={locations} settings={settings} />}
          {printPriceLabels && <PrintPriceLabels items={printPriceLabels.items} />}
          {printPurchase && <PrintPurchaseDocs product={printPurchase.product} acquisition={printPurchase.acquisition} settings={settings} location={locations.find((l) => l.id === printPurchase.product.locationId)} />}
        </div>
        {acquisitionPrintPrompt && (
          <div className="overlay">
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380 }}>
              <h2>{acquisitionPrintPrompt.acquisition.acquisitionType === "consignment" ? "Bizományos termék felvéve" : "Telefon felvéve"}</h2>
              <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.5 }}>
                {acquisitionPrintPrompt.acquisition.acquisitionType === "consignment"
                  ? "Nyomtassuk ki most az öt bizományos dokumentumot (nyilatkozat, borderou, bon, szerződés, GDPR-nyilatkozat) aláírásra?"
                  : "Nyomtassuk ki most a vásárlási dokumentumokat (nyilatkozat, bon, szerződés, GDPR-nyilatkozat) aláírásra?"}
              </p>
              <div className="modal-actions">
                <button className="btn sec" onClick={() => setAcquisitionPrintPrompt(null)}>Most nem</button>
                <button
                  className="btn"
                  onClick={() => (acquisitionPrintPrompt.acquisition.acquisitionType === "consignment" ? printConsignmentDocs : printPurchaseDocs)(acquisitionPrintPrompt.product, acquisitionPrintPrompt.acquisition)}
                >
                  Dokumentumok nyomtatása
                </button>
              </div>
            </div>
          </div>
        )}
        {changePasswordModal && (
          <ChangePasswordModal busy={busy} onClose={() => setChangePasswordModal(false)} onChange={changeOwnPassword} />
        )}
        {inviteModal && (
          <InviteEmployeeModal
            locations={allowedLocations}
            busy={busy}
            error={inviteError}
            onClose={() => setInviteModal(false)}
            onInvite={inviteEmployee}
          />
        )}
        {scannerOpen && <Suspense fallback={null}><ScannerModal open onClose={() => setScannerOpen(false)} onDetect={handleScanResult} /></Suspense>}
        {chatOpen && (
          <TeamChatPanel
            messages={chatMessages}
            users={users}
            tickets={tickets}
            stock={stock}
            parts={parts}
            customersTable={customersTable}
            warranties={warranties}
            locName={locName}
            currentUserId={profile?.id}
            onSend={sendChatMessage}
            onOpenTicket={(id) => { setChatOpen(false); setDetailId(id); }}
            onOpenProduct={(id) => { setChatOpen(false); setProductDetailId(id); }}
            onOpenPart={(id) => { setChatOpen(false); setPartDetailId(id); }}
            onOpenCustomer={(id) => { setChatOpen(false); setCustomerKey(id); }}
            onOpenWarranty={(id) => { setChatOpen(false); setTab("warranty"); setWarrantyDetailKey(`manual-${id}`); }}
            onClose={() => setChatOpen(false)}
          />
        )}
    </>
  );
}

export const profileFromApi = (r) => ({
  id: r.id,
  fullName: r.full_name,
  email: r.email,
  role: r.role,
  locationId: r.location_id,
});

export const pFromApi = (r) => ({
  id: r.id,
  brand: r.brand,
  model: r.model,
  condition: r.condition,
  grade: r.grade,
  storage: r.storage,
  color: r.color,
  imei: r.imei,
  costPrice: r.cost_price,
  salePrice: r.sale_price,
  status: r.status,
  warranty: r.warranty,
  source: r.source,
  batteryHealth: r.battery_health,
  locationId: r.location_id,
  newPrice: r.new_price,
  stockStatus: r.stock_status,
  productNo: r.product_no,
  dateAdded: r.date_added,
});

export const pToApi = (p, locId) => ({
  product_no: p.productNo !== "" && p.productNo != null ? Number(p.productNo) : undefined,
  brand: p.brand,
  model: p.model,
  condition: p.condition,
  grade: p.grade || null,
  storage: p.storage || null,
  color: p.color || null,
  imei: p.imei || null,
  cost_price: Number(p.costPrice) || 0,
  sale_price: Number(p.salePrice) || 0,
  warranty: p.warranty || null,
  source: p.source || null,
  battery_health: p.batteryHealth === "" || p.batteryHealth == null ? null : Number(p.batteryHealth),
  location_id: locId,
  new_price: p.newPrice === "" || p.newPrice == null ? null : Number(p.newPrice),
  stock_status: p.stockStatus || "polcon",
});

export const sbDocFromApi = (r) => ({
  id: r.id,
  docType: r.doc_type,
  status: r.status,
  smartbillSeries: r.smartbill_series,
  smartbillNumber: r.smartbill_number,
  smartbillDocumentViewUrl: r.smartbill_document_view_url,
  errorText: r.error_text,
  createdAt: r.created_at,
});

export const signatureFromApi = (r) => ({
  id: r.id,
  stage: r.stage,
  transactionId: r.transaction_id,
  ticketId: r.ticket_id,
  signerName: r.signer_name,
  imagePath: r.image_path,
  signedAt: r.signed_at,
});

export const txFromApi = (r) => {
  const docs = (r.smartbill_documents || []).map(sbDocFromApi).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const signatures = (r.signatures || []).map(signatureFromApi);
  return {
    id: r.id,
    receiptNo: r.receipt_no,
    publicToken: r.public_token,
    type: r.type,
    description: r.description,
    amount: r.amount,
    category: r.category,
    payment: r.payment,
    productId: r.product_id,
    costPrice: r.cost_price,
    warranty: r.warranty,
    customerName: r.customer_name,
    customerPhone: r.customer_phone,
    customerId: r.customer_id,
    locationId: r.location_id,
    date: r.date,
    basketId: r.basket_id,
    isPassthrough: r.is_passthrough,
    createdAt: r.created_at,
    smartbillDoc: docs[0] || null,
    signatures,
  };
};

export const txToApi = (t, locId) => ({
  type: t.type,
  description: t.description,
  amount: Number(t.amount) || 0,
  category: t.category,
  payment: t.payment || null,
  product_id: t.productId || null,
  cost_price: Number(t.costPrice) || 0,
  warranty: t.warranty || null,
  customer_name: t.customerName || null,
  customer_phone: t.customerPhone || null,
  location_id: locId,
  date: t.date || undefined,
  basket_id: t.basketId || null,
  is_passthrough: !!t.isPassthrough,
});

export const acqFromApi = (r) => ({
  id: r.id,
  productId: r.product_id,
  acquisitionType: r.acquisition_type,
  sellerName: r.seller_name,
  sellerIdDoc: r.seller_id_doc,
  sellerCnp: r.seller_cnp,
  sellerAddress: r.seller_address,
  sellerPhone: r.seller_phone,
  customerId: r.customer_id,
  purchaseDocNo: r.purchase_doc_no,
  consignmentDocNo: r.consignment_doc_no,
  consignorPayoutAmount: r.consignor_payout_amount,
  consignmentExpiresAt: r.consignment_expires_at,
  payoutStatus: r.payout_status,
  payoutDate: r.payout_date,
  createdAt: r.created_at,
});

export const acqToApi = (a) => ({
  product_id: a.productId,
  acquisition_type: a.acquisitionType,
  seller_name: a.sellerName,
  seller_id_doc: a.sellerIdDoc || null,
  seller_cnp: a.sellerCnp || null,
  seller_address: a.sellerAddress || null,
  seller_phone: a.sellerPhone || null,
  customer_id: a.customerId || null,
  purchase_doc_no: a.purchaseDocNo || null,
  consignment_doc_no: a.consignmentDocNo || null,
  consignor_payout_amount: a.consignorPayoutAmount == null || a.consignorPayoutAmount === "" ? null : Number(a.consignorPayoutAmount),
});

export const tFromApi = (r) => ({
  id: r.id,
  signatures: (r.signatures || []).map(signatureFromApi),
  ticketNo: r.ticket_no,
  publicToken: r.public_token,
  shortCode: r.short_code,
  customerName: r.customer_name,
  customerPhone: r.customer_phone,
  brand: r.brand,
  model: r.model,
  issue: r.issue,
  price: r.price,
  warranty: r.warranty,
  matCost: r.mat_cost,
  folia: r.folia,
  foliaUpsellRequested: r.folia_upsell_requested,
  foliaUpsellPrice: r.folia_upsell_price,
  foliaUpsellRequestedAt: r.folia_upsell_requested_at,
  foliaUpsellShownAt: r.folia_upsell_shown_at,
  handoverDate: r.handover_date,
  dueDate: r.due_date,
  status: r.status,
  subStatus: r.sub_status,
  dateIn: r.date_in,
  dateOut: r.date_out,
  readyAt: r.ready_at,
  locationId: r.location_id,
  imei: r.imei,
  qcBy: r.qc_by,
  qcAt: r.qc_at,
  assignedTo: r.assigned_to,
  consentAt: r.consent_at,
  customerId: r.customer_id,
  ticketKind: r.ticket_kind,
  productId: r.product_id,
  intakeLocationId: r.intake_location_id,
});

export const tToApi = (t, locId) => ({
  ticket_no: t.ticketNo !== "" && t.ticketNo != null ? Number(t.ticketNo) : undefined,
  customer_name: t.customerName,
  customer_phone: t.customerPhone || null,
  brand: t.brand,
  model: t.model || null,
  issue: t.issue || null,
  price: Number(t.price) || 0,
  warranty: t.warranty || null,
  mat_cost: Number(t.matCost) || 0,
  folia: !!t.folia,
  handover_date: t.handoverDate || null,
  due_date: t.dueDate || null,
  status: t.status || "Átvett",
  sub_status: t.subStatus || null,
  location_id: locId,
  imei: t.imei || null,
  assigned_to: t.assignedTo || null,
  consent_at: t.consentAt || null,
  ticket_kind: t.ticketKind || "Ügyfél",
  product_id: t.productId || null,
});

export const customerFromApi = (r) => ({
  id: r.id,
  name: r.name || "",
  phone: r.phone || "",
  email: r.email || "",
  cnp: r.cnp || "",
  address: r.address || "",
  notes: r.notes || "",
  marketingConsent: !!r.marketing_consent,
  marketingConsentAt: r.marketing_consent_at,
  createdAt: r.created_at,
  loyaltyPointsBalance: r.loyalty_points_balance || 0,
  referralCode: r.referral_code || "",
  referredByCustomerId: r.referred_by_customer_id,
});
export const customerToApi = (c) => ({
  name: c.name || null,
  phone: c.phone || null,
  email: c.email || null,
  cnp: c.cnp || null,
  address: c.address || null,
  notes: c.notes || null,
  ...(c.referredByCustomerId !== undefined ? { referred_by_customer_id: c.referredByCustomerId || null } : {}),
});

export const loyaltyLedgerFromApi = (r) => ({
  id: r.id,
  customerId: r.customer_id,
  points: r.points,
  kind: r.kind,
  transactionId: r.transaction_id,
  ticketId: r.ticket_id,
  rewardKey: r.reward_key,
  note: r.note,
  createdAt: r.created_at,
});

export const loyaltyRewardFromApi = (r) => ({
  id: r.id,
  rewardKey: r.reward_key,
  label: r.label,
  pointCost: r.point_cost,
  ourCost: r.our_cost == null ? null : Number(r.our_cost),
  customerValue: r.customer_value == null ? null : Number(r.customer_value),
  active: r.active !== false,
  sortOrder: r.sort_order || 0,
});
export const loyaltyRewardToApi = (r) => ({
  reward_key: r.rewardKey,
  label: r.label,
  point_cost: Number(r.pointCost) || 0,
  our_cost: r.ourCost === "" || r.ourCost == null ? null : Number(r.ourCost),
  customer_value: r.customerValue === "" || r.customerValue == null ? null : Number(r.customerValue),
  active: r.active !== false,
  sort_order: Number(r.sortOrder) || 0,
});

export const partFromApi = (r) => ({
  id: r.id,
  partNo: r.part_no,
  name: r.name,
  brand: r.brand,
  modelFit: r.model_fit,
  quantity: r.quantity,
  costPrice: r.cost_price,
  source: r.source,
  category: r.category,
  origin: r.origin,
  supplierSku: r.supplier_sku,
});

export const partToApi = (p) => ({
  part_no: p.partNo !== "" && p.partNo != null ? Number(p.partNo) : undefined,
  name: p.name,
  brand: p.brand || null,
  model_fit: p.modelFit || null,
  quantity: Number(p.quantity) || 0,
  cost_price: Number(p.costPrice) || 0,
  source: p.source || null,
  category: p.category || null,
  origin: p.origin || null,
  supplier_sku: p.supplierSku || null,
});

export const buybackModelFromApi = (r) => ({
  id: r.id,
  brand: r.brand,
  model: r.model,
  storage: r.storage,
  basePrice: Number(r.base_price) || 0,
  active: r.active,
});

export const buybackModelToApi = (m) => ({
  brand: m.brand,
  model: m.model,
  storage: m.storage || null,
  base_price: Number(m.basePrice) || 0,
  active: m.active !== false,
});

export const buybackRuleFromApi = (r) => ({
  id: r.id,
  questionKey: r.question_key,
  answerKey: r.answer_key,
  label: r.label,
  deductionType: r.deduction_type,
  deductionValue: Number(r.deduction_value) || 0,
  active: r.active,
});

export const buybackRuleToApi = (r) => ({
  question_key: r.questionKey,
  answer_key: r.answerKey,
  label: r.label,
  deduction_type: r.deductionType,
  deduction_value: Number(r.deductionValue) || 0,
  active: r.active !== false,
});

export const buybackOfferFromApi = (r) => ({
  id: r.id,
  offerNo: r.offer_no,
  publicToken: r.public_token,
  shortCode: r.short_code,
  customerId: r.customer_id,
  customerName: r.customer_name,
  customerPhone: r.customer_phone,
  brand: r.brand,
  model: r.model,
  storage: r.storage,
  color: r.color,
  imei: r.imei,
  answers: r.answers || {},
  estimatedPrice: Number(r.estimated_price) || 0,
  finalPrice: r.final_price == null ? null : Number(r.final_price),
  status: r.status,
  deliveryMethod: r.delivery_method,
  locationId: r.location_id,
  createdAt: r.created_at,
});

export const leaveTypeFromApi = (r) => ({ id: r.id, name: r.name, color: r.color });
export const leaveBalanceFromApi = (r) => ({ id: r.id, userId: r.user_id, year: r.year, entitledDays: Number(r.entitled_days) });
export const leaveRequestFromApi = (r) => ({
  id: r.id, userId: r.user_id, leaveTypeId: r.leave_type_id,
  startDate: r.start_date, endDate: r.end_date, days: Number(r.days), note: r.note || "",
  status: r.status, requestedAt: r.requested_at, decidedBy: r.decided_by, decidedAt: r.decided_at,
});

export const cashHolderFromApi = (r) => ({ id: r.id, name: r.name, active: r.active !== false });

export const dayCloseFromApi = (r) => ({
  id: r.id, date: r.date, locationId: r.location_id,
  closedBy: r.closed_by, closedAt: r.closed_at,
  reopenedAt: r.reopened_at, reopenedBy: r.reopened_by,
  snapshotIncomeCash: r.snapshot_income_cash, snapshotIncomeCard: r.snapshot_income_card,
  snapshotExpenseCash: r.snapshot_expense_cash, snapshotMargin: r.snapshot_margin,
  snapshotTxCount: r.snapshot_tx_count,
});

export const cashSettlementFromApi = (r) => ({
  id: r.id,
  periodStart: r.period_start,
  periodEnd: r.period_end,
  locationBreakdown: r.location_breakdown || [],
  cardIncome: Number(r.card_income) || 0,
  transferIncome: Number(r.transfer_income) || 0,
  payerLocationId: r.payer_location_id,
  payeeLocationId: r.payee_location_id,
  transferAmount: Number(r.transfer_amount) || 0,
  note: r.note || "",
  settledBy: r.settled_by,
  settledAt: r.settled_at,
});

export const repairPriceFromApi = (r) => ({
  familyKey: r.family_key, problemTag: r.problem_tag,
  priceOem: r.price_oem != null ? Number(r.price_oem) : null,
  priceAfter: r.price_after != null ? Number(r.price_after) : null,
  warranty: r.warranty, estMinutes: r.est_minutes, partCategory: r.part_category,
});
export const repairLeadFromApi = (r) => ({
  id: r.id, customerName: r.customer_name, customerPhone: r.customer_phone,
  brand: r.brand, model: r.model, familyKey: r.family_key, problemTag: r.problem_tag,
  note: r.note || "", estimatedPrice: r.estimated_price != null ? Number(r.estimated_price) : null,
  preferredLocationId: r.preferred_location_id,
  status: r.status, convertedTicketId: r.converted_ticket_id, createdAt: r.created_at,
});

export const monthlySummaryFromApi = (r) => ({
  id: r.id,
  locationId: r.location_id,
  year: r.year,
  month: r.month,
  revenue: Number(r.revenue) || 0,
  margin: Number(r.margin) || 0,
  daysOpen: r.days_open,
  expenses: r.expenses != null ? Number(r.expenses) : null,
  profit: r.profit != null ? Number(r.profit) : null,
  phonesButton: r.phones_button,
  phonesRefurbished: r.phones_refurbished,
  phonesNew: r.phones_new,
});

export const internalMessageFromApi = (r) => ({
  id: r.id,
  senderId: r.sender_id,
  body: r.body,
  linkedTicketId: r.linked_ticket_id,
  linkedProductId: r.linked_product_id,
  linkedPartId: r.linked_part_id,
  linkedCustomerId: r.linked_customer_id,
  linkedWarrantyId: r.linked_warranty_id,
  createdAt: r.created_at,
});

export const noteFromApi = (r) => ({
  id: r.id,
  body: r.body,
  authorId: r.author_id,
  assignedToId: r.assigned_to_id,
  dueScope: r.due_scope,
  status: r.status,
  doneAt: r.done_at,
  doneBy: r.done_by,
  linkedTicketId: r.linked_ticket_id,
  linkedProductId: r.linked_product_id,
  linkedPartId: r.linked_part_id,
  linkedCustomerId: r.linked_customer_id,
  linkedWarrantyId: r.linked_warranty_id,
  createdAt: r.created_at,
});

export const waitingFromApi = (r) => ({
  id: r.id,
  description: r.description,
  customerName: r.customer_name,
  customerPhone: r.customer_phone,
  supplier: r.supplier,
  status: r.status,
  locationId: r.location_id,
  linkedPartId: r.linked_part_id,
  linkedProductId: r.linked_product_id,
  createdBy: r.created_by,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const warrantyFromApi = (r) => ({
  id: r.id, kind: r.kind, customerName: r.customer_name, customerPhone: r.customer_phone || "",
  label: r.label, warranty: r.warranty, fromDate: r.from_date, locationId: r.location_id,
  note: r.note || "", createdAt: r.created_at,
});
export const warrantyToApi = (w, locId) => ({
  kind: w.kind, customer_name: w.customerName, customer_phone: w.customerPhone || null,
  label: w.label, warranty: w.warranty, from_date: w.fromDate, location_id: locId, note: w.note || null,
});

export const spFromApi = (r) => ({
  id: r.id,
  ticketId: r.service_ticket_id,
  partId: r.part_id,
  partName: r.part_name,
  quantity: r.quantity,
  unitPrice: r.unit_price,
  costPrice: r.cost_price,
  usedAt: r.created_at,
});

export const settingsFromApi = (r) => ({
  smsOnTicketCreate: r.sms_on_ticket_create,
  smsOnTicketReady: r.sms_on_ticket_ready,
  updatedAt: r.updated_at,
  companyName: r.company_name,
  companyCui: r.company_cui,
  companyAddress: r.company_address,
  companyPhone: r.company_phone,
  companyEmail: r.company_email,
  consignmentNoticeDays: r.consignment_notice_days,
  smartbillDefaultSeries: r.smartbill_default_series,
  smartbillDefaultTaxName: r.smartbill_default_tax_name,
});

export const customerProfileFromApi = (r) => ({
  id: r.id, fullName: r.full_name, email: r.email, phone: r.phone, customerId: r.customer_id,
});

export const myPurchaseFromApi = (r) => ({
  id: r.id, receiptNo: r.receipt_no, description: r.description, amount: r.amount, date: r.date,
  warranty: r.warranty, publicToken: r.public_token, brand: r.brand, model: r.model, imei: r.imei,
});

export const myTicketFromApi = (r) => ({
  id: r.id, ticketNo: r.ticket_no, brand: r.brand, model: r.model, issue: r.issue, price: r.price,
  status: r.status, subStatus: r.sub_status, dateIn: r.date_in, dateOut: r.date_out,
  warranty: r.warranty, publicToken: r.public_token,
});

export const customerRequestFromApi = (r) => ({
  id: r.id, type: r.type, description: r.description, status: r.status,
  linkedTransactionId: r.linked_transaction_id, linkedTicketId: r.linked_ticket_id,
  staffNote: r.staff_note, createdAt: r.created_at,
});

export const webOrderFromApi = (r) => ({
  id: r.id, orderNo: r.order_no, status: r.status, totalAmount: r.total_amount,
  guestName: r.guest_name, guestPhone: r.guest_phone, guestEmail: r.guest_email,
  locationId: r.location_id, locationName: r.locations?.name || "",
  createdAt: r.created_at,
  items: (r.web_order_items || []).map((it) => ({
    id: it.id, productId: it.product_id, price: it.price,
    brand: it.products?.brand, model: it.products?.model, storage: it.products?.storage, color: it.products?.color,
  })),
});

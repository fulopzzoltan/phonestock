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
});

export const pToApi = (p, locId) => ({
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
});

export const txFromApi = (r) => ({
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
});

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
});

export const tFromApi = (r) => ({
  id: r.id,
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
  handoverDate: r.handover_date,
  dueDate: r.due_date,
  status: r.status,
  subStatus: r.sub_status,
  dateIn: r.date_in,
  dateOut: r.date_out,
  locationId: r.location_id,
  imei: r.imei,
  qcBy: r.qc_by,
  qcAt: r.qc_at,
  assignedTo: r.assigned_to,
  consentAt: r.consent_at,
  customerId: r.customer_id,
  ticketKind: r.ticket_kind,
  productId: r.product_id,
});

export const tToApi = (t, locId) => ({
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
});
export const customerToApi = (c) => ({
  name: c.name || null,
  phone: c.phone || null,
  email: c.email || null,
  cnp: c.cnp || null,
  address: c.address || null,
  notes: c.notes || null,
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
  createdAt: r.created_at,
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
});

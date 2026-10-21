// Xion-Manager Frontend Data Types

export type Role = 'OWNER' | 'ADMIN' | 'BRANCH_MANAGER' | 'SUPERVISOR' | 'CASHIER' | 'AUDITOR';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type BillingCycle = 'MONTHLY' | 'SEMIANNUAL' | 'ANNUAL';
export type TrafficLightStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'GRACE_PERIOD' | 'SUSPENDED';

export interface SystemSettings {
  id: string;
  business_id: string;
  current_exchange_rate_bs: number;
  tax_rate: number;
  enable_taxes: boolean;
  auto_sync_pos: boolean;
  currency_symbol: string;
  updated_at: string;
}

export interface User {
  id: string;
  business_id: string;
  branch_id?: string;
  branch_name?: string;
  email: string;
  full_name: string;
  phone?: string;
  role: Role;
  approval_status: ApprovalStatus;
  is_active: boolean;
  onboarding_completed?: boolean;
  created_at: string;
}

export interface Branch {
  id: string;
  business_id: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  manager_user_id?: string;
  manager_name?: string;
  active_cash_registers_count: number;
  is_active: boolean;
  created_at: string;
}

export interface CashRegister {
  id: string;
  branch_id: string;
  branch_name?: string;
  business_id?: string;
  name: string;
  hardware_uuid?: string;
  status: 'OPEN' | 'CLOSED';
  is_active: boolean;
  current_operator?: string;
  today_sales_total?: number;
  allowed_user_ids: string[];
  payment_methods: string[];
  latitude?: number;
  longitude?: number;
  location_name?: string;
  created_at?: string;
  device_paired?: boolean;
  device_token_preview?: string;
  paired_at?: string;
}

export type ProductType = 'physical' | 'service' | 'virtual';
export type TaxType = 'none' | 'vat' | 'islr';

export interface ComboItem {
  product_id: string;
  product_name?: string;
  quantity: number;
}

export interface ProductInventory {
  id: string;
  product_id: string;
  barcode: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  cost_price: number;
  sale_price: number;
  wholesale_price?: number;
  package_quantity?: number;
  product_type?: ProductType;
  tax_type?: TaxType;
  unit_measure?: string;
  current_stock: number;
  min_stock_alert: number;
  image_url?: string;
  combo_items?: ComboItem[];
  branch_id?: string;
  branch_name?: string;
}

export interface InventoryShrinkage {
  id: string;
  product_id: string;
  product_name: string;
  branch_id: string;
  quantity: number;
  reason: 'Dañado/Vencido' | 'Pérdida/Robo' | 'Consumo Interno' | 'Ajuste de Conteo';
  justification: string;
  date: string;
}

export interface StockTransfer {
  id: string;
  transfer_code: string;
  origin_branch_id: string;
  origin_branch_name: string;
  destination_branch_id: string;
  destination_branch_name: string;
  product_id: string;
  product_name: string;
  quantity: number;
  status: 'PENDING_TRANSIT' | 'IN_TRANSIT' | 'COMPLETED' | 'REJECTED';
  notes?: string;
  created_at: string;
}

export interface SupplierItem {
  id: string;
  name: string;
  rif: string;
  email: string;
  phone: string;
  address?: string;
  category: string;
  payment_terms_days: number;
  current_balance_usd: number;
  is_active: boolean;
  created_at?: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  parent_id?: string | null;
  full_path: string;
  description?: string;
  color?: string;
  icon?: string;
  is_active: boolean;
}

export interface StockAdjustmentDTO {
  product_id: string;
  branch_id?: string;
  quantity_change?: number;
  new_quantity?: number;
  new_stock?: number;
  reason?: string;
  justification?: string;
  notes?: string;
}

export interface SupplierPayableLedgerItem {
  id: string;
  supplier_id: string;
  purchase_id?: string;
  invoice_number?: string;
  tx_type: 'CHARGE' | 'PAYMENT';
  movement_type?: 'CREDIT_CHARGE' | 'PAYMENT_ABONO' | 'DEBIT_NOTE' | 'CREDIT_NOTE';
  amount_usd: number;
  balance_after_usd?: number;
  exchange_rate?: number;
  reference?: string;
  notes?: string;
  created_at: string;
}


export interface PurchaseItemDetail {
  product_id: string;
  product_name: string;
  product_sku: string;
  quantity: number;
  lot_number?: string;
  cost_usd: number;
  cost_bs: number;
  total_usd: number;
}

export interface PurchaseRecord {
  id: string;
  supplier_id: string;
  supplier_name: string;
  supplier_rif: string;
  invoice_number: string;
  branch_id: string;
  branch_name: string;
  date: string;
  total_amount_usd: number;
  total_amount_bs: number;
  exchange_rate: number;
  payment_type: 'cash' | 'credit';
  payment_status: 'paid' | 'pending' | 'partial';
  paid_amount_usd: number;
  pending_amount_usd: number;
  credit_days: number;
  notes?: string;
  items_count: number;
  items: PurchaseItemDetail[];
}

export interface AccountStatus {
  plan_name: string;
  billing_cycle: BillingCycle;
  expires_at: string;
  days_remaining: number;
  traffic_light: {
    status: TrafficLightStatus;
    color: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
    label: string;
    description: string;
  };
  resource_usage: {
    branches: {
      used: number;
      limit: number;
      percentage: number;
    };
    cash_registers: {
      used: number;
      limit: number;
      percentage: number;
    };
  };
}

export interface DashboardMetrics {
  total_sales: number;
  gross_income: number;
  avg_margin: number;
  transaction_count: number;
  sales_change_pct: number;
  transactions_change_pct: number;
}

export interface PurchaseInvoice {
  id: string;
  supplier_name: string;
  supplier_rif: string;
  invoice_number: string;
  branch_id: string;
  branch_name: string;
  date: string;
  total_amount: number;
  items_count: number;
  status: 'PROCESSED' | 'PENDING';
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  user_name: string;
  role: string;
  module: string;
  action_type: string;
  description: string;
  branch_name?: string;
  cash_register_name?: string;
  ip_address: string;
  details?: Record<string, any>;
}

export interface CashSessionSyncItem {
  id: string;
  cash_register_name: string;
  branch_name: string;
  opened_by: string;
  closed_by?: string;
  opened_at: string;
  closed_at?: string;
  initial_cash: number;
  declared_cash?: number;
  calculated_cash?: number;
  difference?: number;
  status: 'OPEN' | 'CLOSED' | 'DISCREPANCY';
}

export interface NotificationItem {
  id: string;
  timestamp: string;
  severity: 'INFO' | 'WARNING' | 'URGENT';
  title: string;
  message: string;
  read: boolean;
  link_tab?: string;
}

export interface PaymentMethod {
  id: number;
  name: string;
  code: string;
  currency: string;
  is_digital: boolean;
  applies_igtf: boolean;
  requires_reference: boolean;
  allow_decimals: boolean;
  is_system: boolean;
  is_active: boolean;
  image_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type CreatePaymentMethodDTO = Omit<PaymentMethod, 'id' | 'is_system' | 'created_at' | 'updated_at'>;
export type UpdatePaymentMethodDTO = Partial<Omit<PaymentMethod, 'id' | 'code' | 'is_system' | 'created_at' | 'updated_at'>>;

export interface SystemPreferences {
  theme_mode: 'light' | 'dark' | 'auto';
  font_size: number;
  primary_color: string;
  compact_mode: boolean;
  animations: boolean;
  high_contrast: boolean;
  interface_density: 'compact' | 'normal' | 'comfortable';
  sync_with_pos: boolean;
}

// ==========================================
// Venezuelan Payment Report Types
// ==========================================

export type PaymentReportMethod = 
  | 'pago_movil' 
  | 'transferencia_ves' 
  | 'deposito_divisas' 
  | 'efectivo_usd' 
  | 'efectivo_bs' 
  | 'zelle' 
  | 'binance_pay' 
  | 'zinli' 
  | 'paypal';

export type PaymentReportCurrency = 'VES' | 'USD' | 'USDT';

export type PaymentReportStatus = 'pending' | 'approved' | 'rejected';

export interface PaymentReportItem {
  id: string;
  business_id?: string;
  order_id?: string;
  subscription_id?: string;
  concept: string;
  payment_method: PaymentReportMethod;
  origin_bank?: string;
  dest_bank?: string;
  payer_name?: string;
  payer_id_or_phone?: string;
  payer_email?: string;
  reference_number?: string;
  amount_paid: number;
  currency: PaymentReportCurrency;
  exchange_rate: number;
  amount_base_equivalent: number;
  receipt_url?: string;
  status: PaymentReportStatus;
  rejection_reason?: string;
  notes?: string;
  verified_by?: string;
  verified_by_user_id?: string;
  verified_at?: string;
  payment_date: string;
  created_at: string;
}

export interface CreatePaymentReportDTO {
  order_id?: string;
  concept?: string;
  payment_method: PaymentReportMethod;
  origin_bank?: string;
  dest_bank?: string;
  payer_name?: string;
  payer_id_or_phone?: string;
  payer_email?: string;
  reference_number?: string;
  amount_paid: number;
  currency: PaymentReportCurrency;
  exchange_rate?: number;
  payment_date: string;
  receipt_url?: string;
  notes?: string;
}

export interface BankItem {
  code: string;
  name: string;
}

export interface CompanyDestinationAccount {
  id: string;
  method: string;
  bank_code?: string;
  bank_name?: string;
  account_holder: string;
  account_number?: string;
  tax_id?: string;
  phone?: string;
  email?: string;
  binance_id?: string;
  label?: string;
}

export interface XionPayConfig {
  official_exchange_rate: number;
  currency: string;
  base_currency: string;
  api_status: 'ONLINE' | 'OFFLINE' | 'SYNCING';
  last_synced_at: string;
  notes?: string;
}

export interface XionPayPlan {
  id: string;
  code: string;
  name: string;
  description?: string;
  max_branches: number;
  max_cash_registers: number;
  price_monthly: number;
  price_semiannual: number;
  price_annual: number;
  is_active: boolean;
}

export interface XionPaySyncPayload {
  official_exchange_rate?: number;
  plans?: XionPayPlan[];
  destination_accounts?: CompanyDestinationAccount[];
}

export interface XionPaySyncResponse {
  status: string;
  message: string;
  synced_at: string;
  official_exchange_rate: number;
  plans_count: number;
  accounts_count: number;
}





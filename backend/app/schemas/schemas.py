from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date

class SystemSettingsUpdate(BaseModel):
    current_exchange_rate_bs: float = Field(..., gt=0, description="Tasa BCV/Oficial en Bs. por 1 USD")
    tax_rate: float = Field(16.0, ge=0)
    enable_taxes: bool = True
    auto_sync_pos: bool = True
    currency_symbol: str = "Bs."

class SystemSettingsResponse(BaseModel):
    id: str
    business_id: str
    current_exchange_rate_bs: float
    tax_rate: float
    enable_taxes: bool
    auto_sync_pos: bool
    currency_symbol: str
    updated_at: datetime

class BranchCreate(BaseModel):
    name: str
    address: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: Optional[str] = None
    manager_user_id: Optional[str] = None
    manager_name: Optional[str] = None

class BranchUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: Optional[str] = None
    manager_user_id: Optional[str] = None
    manager_name: Optional[str] = None
    is_active: Optional[bool] = None

class BranchResponse(BaseModel):
    id: str
    name: str
    address: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: Optional[str] = None
    manager_user_id: Optional[str] = None
    manager_name: Optional[str] = None
    active_cash_registers_count: int = 0
    is_active: bool
    created_at: datetime

class CashRegisterCreate(BaseModel):
    branch_id: str
    name: str
    hardware_uuid: Optional[str] = None
    allowed_user_ids: List[str] = []
    payment_methods: List[str] = ["CASH_USD", "CASH_BS", "PAGO_MOVIL", "DEBIT_CARD"]

class CashRegisterUpdate(BaseModel):
    branch_id: Optional[str] = None
    name: Optional[str] = None
    hardware_uuid: Optional[str] = None
    is_active: Optional[bool] = None
    allowed_user_ids: Optional[List[str]] = None
    payment_methods: Optional[List[str]] = None

class CashRegisterResponse(BaseModel):
    id: str
    branch_id: str
    branch_name: Optional[str] = None
    name: str
    hardware_uuid: Optional[str] = None
    is_active: bool = True
    status: str = "CLOSED"
    current_operator: Optional[str] = None
    today_sales_total: float = 0.0
    allowed_user_ids: List[str] = []
    payment_methods: List[str] = []
    created_at: datetime

class PaymentReportCreate(BaseModel):
    order_id: Optional[str] = None
    concept: Optional[str] = "Pago de Factura"
    payment_method: str
    origin_bank: Optional[str] = None
    dest_bank: Optional[str] = None
    payer_name: Optional[str] = None
    payer_id_or_phone: Optional[str] = None
    payer_email: Optional[str] = None
    reference_number: Optional[str] = None
    amount_paid: float
    currency: str = "VES"
    exchange_rate: Optional[float] = 37.5000
    payment_date: date
    receipt_url: Optional[str] = None
    notes: Optional[str] = None

class PaymentReportItemSchema(BaseModel):
    id: str
    business_id: Optional[str] = None
    order_id: Optional[str] = None
    subscription_id: Optional[str] = None
    concept: str
    payment_method: str
    origin_bank: Optional[str] = None
    dest_bank: Optional[str] = None
    payer_name: Optional[str] = None
    payer_id_or_phone: Optional[str] = None
    payer_email: Optional[str] = None
    reference_number: Optional[str] = None
    amount_paid: float
    currency: str
    exchange_rate: float
    amount_base_equivalent: float
    receipt_url: Optional[str] = None
    status: str
    rejection_reason: Optional[str] = None
    notes: Optional[str] = None
    verified_by: Optional[str] = None
    verified_by_user_id: Optional[str] = None
    verified_at: Optional[datetime] = None
    payment_date: date
    created_at: datetime

class PaymentReportVerifySchema(BaseModel):
    verified_by: Optional[str] = "Administrador"
    notes: Optional[str] = None

class PaymentReportRejectSchema(BaseModel):
    rejection_reason: str
    rejected_by: Optional[str] = "Administrador"

class PaymentReportAccepted(BaseModel):
    message: str
    report_id: str
    status: str = "pending"

class TrafficLight(BaseModel):
    status: str
    color: str
    label: str
    description: str

class ResourceUsageItem(BaseModel):
    used: int
    limit: int
    percentage: float

class ResourceUsage(BaseModel):
    branches: ResourceUsageItem
    cash_registers: ResourceUsageItem

class AccountStatusResponse(BaseModel):
    plan_name: str
    billing_cycle: str
    expires_at: datetime
    days_remaining: int
    traffic_light: TrafficLight
    resource_usage: ResourceUsage

class PosPushPayload(BaseModel):
    cash_register_id: str
    pos_session_uuid: str
    turn_data: dict
    sales: List[dict]

class PosPushResponse(BaseModel):
    status: str = "SYNC_SUCCESS"
    synced_sales_count: int
    inventory_updated: bool = True
    server_timestamp: datetime

# Inventory Schemas
class ComboItemSchema(BaseModel):
    product_id: str
    product_name: Optional[str] = None
    quantity: float = Field(..., gt=0)

class ProductCreate(BaseModel):
    sku: str
    name: str
    barcode: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = "General"
    cost_price: float = Field(0.0, ge=0)
    sale_price: float = Field(..., ge=0)
    wholesale_price: Optional[float] = 0.0
    package_quantity: Optional[int] = 1
    product_type: Optional[str] = "physical"
    tax_type: Optional[str] = "vat"
    unit_measure: Optional[str] = "UND"
    current_stock: Optional[float] = 0.0
    min_stock_alert: Optional[float] = 5.0
    image_url: Optional[str] = None
    combo_items: Optional[List[ComboItemSchema]] = []
    branch_id: Optional[str] = None

class ProductUpdate(BaseModel):
    sku: Optional[str] = None
    name: Optional[str] = None
    barcode: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    cost_price: Optional[float] = None
    sale_price: Optional[float] = None
    wholesale_price: Optional[float] = None
    package_quantity: Optional[int] = None
    product_type: Optional[str] = None
    tax_type: Optional[str] = None
    unit_measure: Optional[str] = None
    current_stock: Optional[float] = None
    min_stock_alert: Optional[float] = None
    image_url: Optional[str] = None
    combo_items: Optional[List[ComboItemSchema]] = None
    branch_id: Optional[str] = None

class StockAdjustmentDTO(BaseModel):
    product_id: str
    new_quantity: float = Field(..., ge=0)
    justification: str

class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=2)
    parent_id: Optional[str] = None
    is_active: bool = True

class CategoryResponse(BaseModel):
    id: str
    name: str
    parent_id: Optional[str] = None
    full_path: Optional[str] = None
    is_active: bool = True

class ShrinkageCreate(BaseModel):
    product_id: str
    product_name: Optional[str] = None
    branch_id: Optional[str] = "branch-1"
    quantity: float = Field(..., gt=0)
    reason: str = "Dañado/Vencido"
    justification: Optional[str] = ""

class StockTransferCreate(BaseModel):
    origin_branch_id: str
    destination_branch_id: str
    product_id: str
    quantity: float = Field(..., gt=0)
    notes: Optional[str] = None

# Supplier & Purchase Schemas
class SupplierPayableLedgerItem(BaseModel):
    id: str
    supplier_id: str
    purchase_id: Optional[str] = None
    tx_type: str = "CHARGE"
    amount_usd: float
    exchange_rate: float
    reference: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

class SupplierCreate(BaseModel):
    name: str
    rif: str
    email: Optional[str] = ""
    phone: Optional[str] = ""
    address: Optional[str] = ""
    category: Optional[str] = "Varios"
    payment_terms_days: Optional[int] = 15
    is_active: bool = True

class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    rif: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    category: Optional[str] = None
    payment_terms_days: Optional[int] = None
    is_active: Optional[bool] = None

class PurchaseItemCreate(BaseModel):
    product_id: str
    product_name: str
    product_sku: Optional[str] = ""
    quantity: float = Field(..., gt=0)
    lot_number: Optional[str] = None
    cost_usd: float = Field(..., ge=0)
    cost_bs: Optional[float] = 0.0
    total_usd: float = Field(..., ge=0)

class PurchaseCreate(BaseModel):
    supplier_id: Optional[str] = None
    supplier_name: str
    supplier_rif: Optional[str] = "J-00000000-0"
    invoice_number: str
    branch_id: str
    branch_name: Optional[str] = None
    total_amount_usd: float = Field(..., ge=0)
    total_amount_bs: Optional[float] = 0.0
    exchange_rate: Optional[float] = 37.50
    payment_type: str = "cash"
    paid_amount_usd: Optional[float] = None
    credit_days: Optional[int] = 0
    notes: Optional[str] = None
    items: List[PurchaseItemCreate]

class PurchasePayDTO(BaseModel):
    amount_usd: float = Field(..., gt=0)
    exchange_rate: Optional[float] = 37.50
    notes: Optional[str] = None

class PaymentMethodCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    code: str = Field(..., min_length=1, max_length=50)
    currency: str = Field(default="VES", max_length=10)
    is_digital: bool = False
    applies_igtf: bool = False
    requires_reference: bool = False
    allow_decimals: bool = True
    is_active: bool = True
    image_url: Optional[str] = None

class PaymentMethodUpdate(BaseModel):
    name: Optional[str] = None
    currency: Optional[str] = None
    is_digital: Optional[bool] = None
    applies_igtf: Optional[bool] = None
    requires_reference: Optional[bool] = None
    allow_decimals: Optional[bool] = None
    is_active: Optional[bool] = None
    image_url: Optional[str] = None

class PaymentMethodResponse(BaseModel):
    id: int
    name: str
    code: str
    currency: str
    is_digital: bool
    applies_igtf: bool
    requires_reference: bool
    allow_decimals: bool
    is_system: bool
    is_active: bool
    image_url: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

# ==========================================
# Xion-Pay External Integration Schemas
# ==========================================

class XionPayConfigResponse(BaseModel):
    official_exchange_rate: float = Field(..., gt=0, description="Tasa oficial de cobro provista por Xion-Pay")
    currency: str = "USD"
    base_currency: str = "VES"
    api_status: str = "ONLINE"
    last_synced_at: datetime
    notes: Optional[str] = "Tasa provista por la pasarela Xion-Pay, independiente de la tasa de cambio del tenant/POS."

class XionPayPlanSchema(BaseModel):
    id: str
    code: str
    name: str
    description: Optional[str] = None
    max_branches: int = 1
    max_cash_registers: int = 1
    price_monthly: float = Field(..., ge=0)
    price_semiannual: float = Field(..., ge=0)
    price_annual: float = Field(..., ge=0)
    is_active: bool = True

class XionPayDestinationAccountSchema(BaseModel):
    id: str
    method: str
    bank_code: Optional[str] = None
    bank_name: Optional[str] = None
    account_holder: str
    tax_id: Optional[str] = None
    phone: Optional[str] = None
    account_number: Optional[str] = None
    email: Optional[str] = None
    binance_id: Optional[str] = None
    label: Optional[str] = None

class XionPaySyncPayload(BaseModel):
    official_exchange_rate: Optional[float] = Field(None, gt=0, description="Nueva tasa oficial de cobro de suscripciones")
    plans: Optional[List[XionPayPlanSchema]] = None
    destination_accounts: Optional[List[XionPayDestinationAccountSchema]] = None

class XionPaySyncResponse(BaseModel):
    status: str = "SYNCED"
    message: str
    synced_at: datetime
    official_exchange_rate: float
    plans_count: int
    accounts_count: int

class XionPayLeadCreate(BaseModel):
    nombre_contacto: str
    nombre_comercial: str
    email: str
    telefono_contacto: str
    documento_identidad_tipo: Optional[str] = "V"
    documento_identidad_numero: Optional[str] = None
    webhook_url: Optional[str] = None
    source: Optional[str] = "xion-manager"

class XionPayLeadResponse(BaseModel):
    client_id: str
    commercial_name: str
    contact_name: Optional[str] = None
    email: str
    phone: str
    status: str
    trial_days_granted: int = 30
    trial_ends_at: str
    trial_days_remaining: int
    license_token: str
    message: str

class XionPayWebhookPayload(BaseModel):
    event: str
    tenant_id: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    payment_id: Optional[str] = None
    status: Optional[str] = None
    license_token: Optional[str] = None
    rejection_reason: Optional[str] = None
    subscription: Optional[Dict[str, Any]] = None
    timestamp: Optional[str] = None

class XionPayWebhookResponse(BaseModel):
    status: str = "received"
    event: str
    processed: bool = True
    message: str





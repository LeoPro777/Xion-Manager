import uuid
from datetime import datetime, date
from typing import Optional, List
from sqlalchemy import String, Text, Numeric, Integer, Float, Boolean, ForeignKey, Date, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Business(Base):
    __tablename__ = "businesses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    legal_name: Mapped[str] = mapped_column(String(150), nullable=False)
    trade_name: Mapped[str] = mapped_column(String(150), nullable=False)
    tax_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    phone: Mapped[str] = mapped_column(String(30), nullable=False)
    email: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class SystemSettings(Base):
    __tablename__ = "system_settings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    business_id: Mapped[str] = mapped_column(ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    current_exchange_rate_bs: Mapped[float] = mapped_column(Numeric(12, 4), default=36.50)
    tax_rate: Mapped[float] = mapped_column(Numeric(5, 2), default=16.00)
    enable_taxes: Mapped[bool] = mapped_column(Boolean, default=True)
    auto_sync_pos: Mapped[bool] = mapped_column(Boolean, default=True)
    currency_symbol: Mapped[str] = mapped_column(String(10), default="Bs.")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class XionPayConfig(Base):
    __tablename__ = "xion_pay_config"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    official_exchange_rate: Mapped[float] = mapped_column(Numeric(12, 4), default=37.5000)
    currency: Mapped[str] = mapped_column(String(10), default="USD")
    base_currency: Mapped[str] = mapped_column(String(10), default="VES")
    api_status: Mapped[str] = mapped_column(String(20), default="ONLINE")
    last_synced_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    xion_pay_plan_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    max_branches: Mapped[int] = mapped_column(Integer, default=1)
    max_cash_registers: Mapped[int] = mapped_column(Integer, default=1)
    price_monthly: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    price_semiannual: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    price_annual: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class BusinessSubscription(Base):
    __tablename__ = "business_subscriptions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    business_id: Mapped[str] = mapped_column(ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    plan_id: Mapped[str] = mapped_column(ForeignKey("subscription_plans.id"), nullable=False)
    billing_cycle: Mapped[str] = mapped_column(String(20), nullable=False)
    extra_cash_registers: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")
    starts_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    grace_period_until: Mapped[Optional[datetime]] = mapped_column(DateTime)
    auto_renew: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class PaymentReport(Base):
    __tablename__ = "payment_reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    business_id: Mapped[str] = mapped_column(ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    order_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    subscription_id: Mapped[Optional[str]] = mapped_column(ForeignKey("business_subscriptions.id"), nullable=True)
    concept: Mapped[Optional[str]] = mapped_column(String(150), default="Pago de Factura")
    payment_method: Mapped[str] = mapped_column(String(50), nullable=False)
    origin_bank: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    dest_bank: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    payer_name: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    payer_id_or_phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    payer_email: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    reference_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    amount_paid: Mapped[float] = mapped_column(Numeric(18, 4), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="VES")
    exchange_rate: Mapped[float] = mapped_column(Numeric(18, 4), default=37.5000)
    amount_base_equivalent: Mapped[float] = mapped_column(Numeric(18, 4), nullable=False)
    receipt_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    rejection_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    verified_by: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    verified_by_user_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    payment_date: Mapped[date] = mapped_column(Date, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class Branch(Base):
    __tablename__ = "branches"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    business_id: Mapped[str] = mapped_column(ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    latitude: Mapped[Optional[float]] = mapped_column(Float)
    longitude: Mapped[Optional[float]] = mapped_column(Float)
    phone: Mapped[Optional[str]] = mapped_column(String(30))
    manager_user_id: Mapped[Optional[str]] = mapped_column(String(36))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class CashRegister(Base):
    __tablename__ = "cash_registers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    branch_id: Mapped[str] = mapped_column(ForeignKey("branches.id", ondelete="CASCADE"), nullable=False)
    business_id: Mapped[str] = mapped_column(ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    hardware_uuid: Mapped[Optional[str]] = mapped_column(String(150))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    business_id: Mapped[str] = mapped_column(ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    branch_id: Mapped[Optional[str]] = mapped_column(ForeignKey("branches.id", ondelete="SET NULL"))
    email: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(30))
    role: Mapped[str] = mapped_column(String(30), default="CASHIER")
    approval_status: Mapped[str] = mapped_column(String(20), default="PENDING")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class Category(Base):
    __tablename__ = "categories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    business_id: Mapped[str] = mapped_column(ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    parent_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Product(Base):
    __tablename__ = "products"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    business_id: Mapped[str] = mapped_column(ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    category_id: Mapped[Optional[str]] = mapped_column(ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    category: Mapped[Optional[str]] = mapped_column(String(100), default="General")
    barcode: Mapped[Optional[str]] = mapped_column(String(80), index=True)
    sku: Mapped[str] = mapped_column(String(80), index=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text)
    cost_price: Mapped[float] = mapped_column(Numeric(12, 4), default=0.0)
    sale_price: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False)
    wholesale_price: Mapped[float] = mapped_column(Numeric(12, 4), default=0.0)
    package_quantity: Mapped[int] = mapped_column(Integer, default=1)
    product_type: Mapped[str] = mapped_column(String(20), default="physical")
    tax_type: Mapped[str] = mapped_column(String(20), default="vat")
    unit_measure: Mapped[str] = mapped_column(String(20), default="UND")
    min_stock_alert: Mapped[float] = mapped_column(Numeric(12, 2), default=5.0)
    image_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ProductComposition(Base):
    __tablename__ = "product_compositions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    parent_id: Mapped[str] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    child_id: Mapped[str] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    quantity_required: Mapped[float] = mapped_column(Numeric(12, 4), default=1.0)

class BranchInventory(Base):
    __tablename__ = "branch_inventory"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    branch_id: Mapped[str] = mapped_column(ForeignKey("branches.id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    current_stock: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class Supplier(Base):
    __tablename__ = "suppliers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    business_id: Mapped[str] = mapped_column(ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    identification_type: Mapped[str] = mapped_column(String(20), default="RIF")
    rif: Mapped[str] = mapped_column(String(50), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(100), default="Varios")
    payment_terms_days: Mapped[int] = mapped_column(Integer, default=15)
    current_balance_usd: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Purchase(Base):
    __tablename__ = "purchases"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    business_id: Mapped[str] = mapped_column(ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    branch_id: Mapped[str] = mapped_column(ForeignKey("branches.id", ondelete="CASCADE"), nullable=False)
    supplier_id: Mapped[Optional[str]] = mapped_column(ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True)
    supplier_name: Mapped[str] = mapped_column(String(150), nullable=False)
    supplier_rif: Mapped[str] = mapped_column(String(50), default="J-00000000-0")
    invoice_number: Mapped[str] = mapped_column(String(80), nullable=False)
    total_amount_usd: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    total_amount_bs: Mapped[float] = mapped_column(Numeric(16, 2), nullable=False)
    exchange_rate: Mapped[float] = mapped_column(Numeric(12, 4), default=37.5)
    payment_type: Mapped[str] = mapped_column(String(20), default="cash")
    payment_status: Mapped[str] = mapped_column(String(20), default="paid")
    paid_amount_usd: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0)
    pending_amount_usd: Mapped[float] = mapped_column(Numeric(14, 2), default=0.0)
    credit_days: Mapped[int] = mapped_column(Integer, default=0)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class PurchaseItem(Base):
    __tablename__ = "purchase_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    purchase_id: Mapped[str] = mapped_column(ForeignKey("purchases.id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    quantity: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False)
    lot_number: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    cost_usd: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False)
    cost_bs: Mapped[float] = mapped_column(Numeric(14, 4), default=0.0)
    total_usd: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)

class SupplierPayablesLedger(Base):
    __tablename__ = "supplier_payables_ledger"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    supplier_id: Mapped[str] = mapped_column(ForeignKey("suppliers.id", ondelete="CASCADE"), nullable=False)
    purchase_id: Mapped[Optional[str]] = mapped_column(ForeignKey("purchases.id", ondelete="SET NULL"), nullable=True)
    tx_type: Mapped[str] = mapped_column(String(30), default="CHARGE")
    amount_usd: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    exchange_rate: Mapped[float] = mapped_column(Numeric(12, 4), default=37.5)
    reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    tx_type: Mapped[str] = mapped_column(String(10), nullable=False)
    reason: Mapped[str] = mapped_column(String(50), nullable=False)
    quantity: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False)
    reference_id: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class InventoryShrinkage(Base):
    __tablename__ = "inventory_shrinkage"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    branch_id: Mapped[str] = mapped_column(ForeignKey("branches.id", ondelete="CASCADE"), nullable=False)
    quantity: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False)
    reason: Mapped[str] = mapped_column(String(100), nullable=False)
    justification: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    business_id: Mapped[str] = mapped_column(ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[Optional[str]] = mapped_column(String(36))
    branch_id: Mapped[Optional[str]] = mapped_column(String(36))
    cash_register_id: Mapped[Optional[str]] = mapped_column(String(36))
    action_type: Mapped[str] = mapped_column(String(60), nullable=False)
    module: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    details: Mapped[Optional[dict]] = mapped_column(JSON)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

class PaymentMethod(Base):
    __tablename__ = "payment_methods"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="VES", nullable=False)
    is_digital: Mapped[bool] = mapped_column(Boolean, default=False)
    applies_igtf: Mapped[bool] = mapped_column(Boolean, default=False)
    requires_reference: Mapped[bool] = mapped_column(Boolean, default=False)
    allow_decimals: Mapped[bool] = mapped_column(Boolean, default=True)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    image_url: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


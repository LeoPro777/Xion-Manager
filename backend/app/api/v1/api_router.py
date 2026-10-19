from fastapi import APIRouter, Depends, UploadFile, File, Form, status, Body, HTTPException, Query, Request, Header
from datetime import datetime, date
from typing import Optional, List
import json
from app.core.config import settings
from app.schemas.schemas import (
    AccountStatusResponse, BranchCreate, BranchUpdate, BranchResponse,
    CashRegisterCreate, CashRegisterUpdate, CashRegisterResponse,
    PaymentReportAccepted, PaymentReportCreate, PaymentReportItemSchema,
    PaymentReportVerifySchema, PaymentReportRejectSchema,
    PosPushPayload, PosPushResponse,
    SystemSettingsUpdate, SystemSettingsResponse,
    ProductCreate, ProductUpdate, ShrinkageCreate, StockTransferCreate,
    SupplierCreate, SupplierUpdate, PurchaseCreate, PurchasePayDTO,
    PaymentMethodCreate, PaymentMethodUpdate, PaymentMethodResponse,
    XionPayConfigResponse, XionPayPlanSchema, XionPayDestinationAccountSchema,
    XionPaySyncPayload, XionPaySyncResponse,
    XionPayLeadCreate, XionPayLeadResponse, XionPayWebhookResponse,
    StockAdjustmentDTO, CategoryCreate, CategoryResponse, SupplierPayableLedgerItem
)
from app.services.image_service import (
    save_and_process_payment_method_image,
    delete_payment_method_images,
    process_and_upload_image
)
from app.services.storage_service import storage_service
from app.services.xion_pay_service import XionPayService

api_router = APIRouter()


# Tenant POS Store Exchange Rate State (Used by Tenant for their store/POS products)
global_settings = {
    "id": "cfg-001",
    "business_id": "biz-101",
    "current_exchange_rate_bs": 36.50,
    "tax_rate": 16.0,
    "enable_taxes": True,
    "auto_sync_pos": True,
    "currency_symbol": "Bs.",
    "updated_at": datetime.utcnow()
}

# ==========================================
# Xion-Pay System State (Subscriptions & Billing)
# Distinct from tenant's store exchange rate
# ==========================================
xion_pay_state = {
    "official_exchange_rate": 65.40,
    "currency": "USD",
    "base_currency": "VES",
    "api_status": "ONLINE",
    "last_synced_at": datetime.utcnow(),
    "license_token": None,
    "license_status": "trial",
    "trial_ends_at": None,
    "tolerance_expires_at": None,
    "tenant_id": settings.XION_PAY_TENANT_ID
}

xion_pay_plans_db: List[dict] = [
    {
        "id": "plan-basic",
        "code": "BASIC",
        "name": "Plan Básico (Xion-Pay)",
        "description": "Ideal para pequeños comercios y negocios iniciales",
        "max_branches": 1,
        "max_cash_registers": 1,
        "price_monthly": 29.00,
        "price_semiannual": 156.60,
        "price_annual": 278.40,
        "is_active": True
    },
    {
        "id": "plan-pro",
        "code": "PRO",
        "name": "Plan Profesional (Xion-Pay)",
        "description": "Negocios consolidados con control multisucursal y cajas simultáneas",
        "max_branches": 3,
        "max_cash_registers": 5,
        "price_monthly": 49.00,
        "price_semiannual": 264.60,
        "price_annual": 470.40,
        "is_active": True
    },
    {
        "id": "plan-enterprise",
        "code": "ENTERPRISE",
        "name": "Plan Corporativo (Xion-Pay)",
        "description": "Capacidad enterprise para franquicias y grandes cadenas de retail",
        "max_branches": 10,
        "max_cash_registers": 20,
        "price_monthly": 99.00,
        "price_semiannual": 534.60,
        "price_annual": 950.40,
        "is_active": True
    }
]

@api_router.get("/settings/exchange-rate", response_model=SystemSettingsResponse)
async def get_exchange_rate():
    return global_settings

@api_router.put("/settings/exchange-rate", response_model=SystemSettingsResponse)
async def update_exchange_rate(payload: SystemSettingsUpdate):
    global_settings["current_exchange_rate_bs"] = payload.current_exchange_rate_bs
    global_settings["tax_rate"] = payload.tax_rate
    global_settings["enable_taxes"] = payload.enable_taxes
    global_settings["auto_sync_pos"] = payload.auto_sync_pos
    global_settings["currency_symbol"] = payload.currency_symbol
    global_settings["updated_at"] = datetime.utcnow()
    return global_settings

# --- Xion-Pay Dedicated Endpoints ---
@api_router.get("/xion-pay/config", response_model=XionPayConfigResponse)
async def get_xion_pay_config():
    """Retorna la tasa oficial y configuración de cobro proveniente de Xion-Pay."""
    try:
        catalog = await XionPayService.fetch_catalog()
        live_rate = catalog.get("exchange_rate_usd_ves") or catalog.get("bcv_rate")
        if live_rate and float(live_rate) > 0:
            xion_pay_state["official_exchange_rate"] = float(live_rate)
            xion_pay_state["last_synced_at"] = datetime.utcnow()
            xion_pay_state["api_status"] = "ONLINE"
    except Exception:
        pass

    return {
        "official_exchange_rate": xion_pay_state["official_exchange_rate"],
        "currency": xion_pay_state["currency"],
        "base_currency": xion_pay_state["base_currency"],
        "api_status": xion_pay_state["api_status"],
        "last_synced_at": xion_pay_state["last_synced_at"],
        "notes": "Tasa provista por la pasarela Xion-Pay, independiente de la tasa de cambio del tenant/POS."
    }

@api_router.get("/xion-pay/plans", response_model=List[XionPayPlanSchema])
async def get_xion_pay_plans():
    """Retorna los planes de suscripción configurados en Xion-Pay."""
    global xion_pay_plans_db
    try:
        catalog = await XionPayService.fetch_catalog()
        plans = catalog.get("plans") or catalog.get("catalog") or []
        if plans:
            mapped_plans = []
            for p in plans:
                price_usd = float(p.get("price_usd") or p.get("price_monthly") or 29.0)
                q_discount = float(p.get("quarterly_discount_pct", 10.0)) / 100.0
                a_discount = float(p.get("annual_discount_pct", 20.0)) / 100.0
                mapped_plans.append({
                    "id": str(p.get("id")),
                    "code": str(p.get("code")).upper(),
                    "name": str(p.get("name")),
                    "description": p.get("description"),
                    "max_branches": int(p.get("max_branches") or 1),
                    "max_cash_registers": int(p.get("max_pos_registers") or p.get("max_cash_registers") or 1),
                    "price_monthly": price_usd,
                    "price_semiannual": round(price_usd * 6 * (1.0 - q_discount), 2),
                    "price_annual": round(price_usd * 12 * (1.0 - a_discount), 2),
                    "is_active": True
                })
            xion_pay_plans_db = mapped_plans
    except Exception:
        pass

    return [p for p in xion_pay_plans_db if p.get("is_active", True)]

@api_router.get("/xion-pay/destination-accounts")
async def get_xion_pay_destination_accounts():
    """Retorna los métodos y cuentas de destino configuradas en Xion-Pay para consignar suscripciones."""
    global COMPANY_DESTINATION_ACCOUNTS
    try:
        catalog = await XionPayService.fetch_catalog()
        methods = catalog.get("payment_methods", {})
        if methods:
            accs = []
            if "pago_movil" in methods:
                pm = methods["pago_movil"]
                accs.append({
                    "id": "xionpay-pm",
                    "method": "pago_movil",
                    "bank_code": "0102",
                    "bank_name": pm.get("banco", "Banco de Venezuela"),
                    "account_holder": pm.get("titular", "Xion Technologies C.A."),
                    "tax_id": pm.get("documento_identidad", "J-50123456-7"),
                    "phone": pm.get("telefono", "+584141234567"),
                    "label": f"Pago Móvil Xion-Pay ({pm.get('banco', 'BDV')})"
                })
            if "transferencia_ves" in methods:
                tr = methods["transferencia_ves"]
                accs.append({
                    "id": "xionpay-transf",
                    "method": "transferencia_ves",
                    "bank_code": "0134",
                    "bank_name": tr.get("banco", "Banesco"),
                    "account_holder": tr.get("titular", "Xion Technologies C.A."),
                    "account_number": tr.get("numero_cuenta", "0134-1092-23-0001234567"),
                    "tax_id": tr.get("documento_identidad", "J-50123456-7"),
                    "label": f"Transferencia VES ({tr.get('banco', 'Banesco')})"
                })
            if "zelle" in methods:
                zl = methods["zelle"]
                accs.append({
                    "id": "xionpay-zelle",
                    "method": "zelle",
                    "account_holder": zl.get("titular", "Xion Global LLC"),
                    "email": zl.get("correo", "pagos@xionpay.com"),
                    "label": f"Zelle ({zl.get('correo', 'pagos@xionpay.com')})"
                })
            if accs:
                COMPANY_DESTINATION_ACCOUNTS = accs
    except Exception:
        pass

    return COMPANY_DESTINATION_ACCOUNTS

@api_router.post("/xion-pay/sync", response_model=XionPaySyncResponse)
async def sync_xion_pay_data(payload: XionPaySyncPayload):
    """
    Webhook/Endpoint receptor de datos desde Xion-Pay:
    Captura y actualiza la tasa oficial de suscripciones, los planes y las cuentas de destino.
    """
    global COMPANY_DESTINATION_ACCOUNTS, xion_pay_plans_db
    synced_time = datetime.utcnow()
    
    if payload.official_exchange_rate is not None and payload.official_exchange_rate > 0:
        xion_pay_state["official_exchange_rate"] = payload.official_exchange_rate
        xion_pay_state["last_synced_at"] = synced_time
        xion_pay_state["api_status"] = "ONLINE"
        
    if payload.plans is not None:
        xion_pay_plans_db = [p.dict() for p in payload.plans]
        
    if payload.destination_accounts is not None:
        COMPANY_DESTINATION_ACCOUNTS = [a.dict() for a in payload.destination_accounts]
        
    return {
        "status": "SYNCED",
        "message": "Datos de Xion-Pay recibidos y capturados exitosamente.",
        "synced_at": synced_time,
        "official_exchange_rate": xion_pay_state["official_exchange_rate"],
        "plans_count": len(xion_pay_plans_db),
        "accounts_count": len(COMPANY_DESTINATION_ACCOUNTS)
    }

@api_router.post("/xionpay-webhook", response_model=XionPayWebhookResponse)
async def receive_xion_pay_webhook(
    request: Request,
    x_xion_signature: Optional[str] = Header(None, alias="X-Xion-Signature")
):
    """
    Recepción de Webhooks firmados con HMAC-SHA256 (X-Xion-Signature) desde Xion-Pay:
    Maneja payment.approved, payment.rejected y license.renewed.
    """
    raw_body = await request.body()
    
    # Verificación de firma criptográfica
    if not XionPayService.verify_webhook_signature(raw_body, x_xion_signature):
        if settings.ENVIRONMENT != "development" or x_xion_signature is not None:
            raise HTTPException(
                status_code=401,
                detail="Firma criptográfica inválida o ausente en cabecera X-Xion-Signature"
            )

    try:
        payload = json.loads(raw_body.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="Cuerpo de la petición no es JSON válido")

    event = payload.get("event", "unknown")
    data = payload.get("data") or payload
    payment_id = payload.get("payment_id") or data.get("payment_id")
    license_token = payload.get("license_token") or data.get("license_token")
    rejection_reason = payload.get("rejection_reason") or data.get("rejection_reason")

    if event in ("payment.approved", "payment_approved"):
        for r in payment_reports_db:
            if (payment_id and r.get("xion_pay_payment_id") == str(payment_id)) or \
               (data.get("reference_number") and r.get("reference_number") == data.get("reference_number")):
                r["status"] = "approved"
                r["verified_by"] = "Xion-Pay Webhook (Automated)"
                r["verified_at"] = datetime.utcnow()
                break
        if license_token:
            xion_pay_state["license_token"] = license_token
            xion_pay_state["license_status"] = "active"

    elif event in ("payment.rejected", "payment_rejected"):
        for r in payment_reports_db:
            if (payment_id and r.get("xion_pay_payment_id") == str(payment_id)) or \
               (data.get("reference_number") and r.get("reference_number") == data.get("reference_number")):
                r["status"] = "rejected"
                r["rejection_reason"] = rejection_reason or "Rechazado en conciliación Xion-Pay"
                r["verified_by"] = "Xion-Pay Webhook (Automated)"
                r["verified_at"] = datetime.utcnow()
                break

    elif event in ("license.renewed", "license_renewed"):
        if license_token:
            xion_pay_state["license_token"] = license_token
            xion_pay_state["license_status"] = "active"

    return {
        "status": "received",
        "event": event,
        "processed": True,
        "message": f"Evento {event} recibido y procesado con éxito."
    }

@api_router.get("/xion-pay/license-status")
async def get_xion_pay_license_status():
    """Consulta directa a Xion-Pay del estado de suscripción y token de licencia RS256."""
    live_status = await XionPayService.get_license_status()
    if live_status and live_status.get("status"):
        xion_pay_state["license_status"] = live_status.get("status")
        if live_status.get("license_token"):
            xion_pay_state["license_token"] = live_status.get("license_token")
        if live_status.get("trial_ends_at"):
            xion_pay_state["trial_ends_at"] = live_status.get("trial_ends_at")
    return live_status

@api_router.post("/xion-pay/onboarding-trial", response_model=XionPayLeadResponse)
async def onboard_trial_lead(lead: XionPayLeadCreate):
    """Registra esta instalación de Xion Manager en Xion-Pay obteniendo 30 días de prueba."""
    result = await XionPayService.onboard_trial(lead.model_dump())
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result.get("message", "Error al procesar onboarding"))
    
    xion_pay_state["tenant_id"] = result.get("client_id")
    xion_pay_state["license_token"] = result.get("license_token")
    xion_pay_state["license_status"] = result.get("status", "trial")
    return result


# 0. Auth Login Bypass
@api_router.post("/auth/login-bypass")
async def login_bypass(role: str = Body(default="OWNER", embed=True)):
    return {
        "id": f"usr-{role.lower()}-01",
        "email": f"{role.lower()}@xion.com",
        "full_name": f"Usuario ({role})",
        "role": role,
        "approval_status": "APPROVED",
        "is_active": True,
        "access_token": "mock-jwt-bypass-token",
        "token_type": "bearer"
    }

# 1. Dashboard
@api_router.get("/dashboard/metrics")
async def get_dashboard_metrics(branch_id: Optional[str] = None):
    return {
        "total_sales": 12480.50,
        "gross_income": 15200.00,
        "avg_margin": 28.4,
        "transaction_count": 342,
        "sales_change_pct": 12.5,
        "transactions_change_pct": 8.2
    }

# 2. Branches & Cash Registers State & Endpoints
branches_db = [
    {
        "id": "branch-1",
        "business_id": "biz-101",
        "name": "Sucursal Principal - Centro",
        "address": "Av. Bolívar, Calle 4 #12-45, Maracaibo",
        "latitude": 10.6417,
        "longitude": -71.6125,
        "phone": "+58 414-1234567",
        "manager_user_id": "usr-m1",
        "manager_name": "Alejandro Colina",
        "active_cash_registers_count": 2,
        "is_active": True,
        "created_at": datetime(2026, 1, 15, 10, 0, 0)
    },
    {
        "id": "branch-2",
        "business_id": "biz-101",
        "name": "Sucursal Norte - CC Lago Mall",
        "address": "Av. 2 El Milagro, Nivel PB, Local 12, Maracaibo",
        "latitude": 10.6698,
        "longitude": -71.5989,
        "phone": "+58 412-7654321",
        "manager_user_id": "usr-m2",
        "manager_name": "María Silva",
        "active_cash_registers_count": 2,
        "is_active": True,
        "created_at": datetime(2026, 3, 20, 14, 30, 0)
    }
]

cash_registers_db = [
    {
        "id": "reg-01",
        "branch_id": "branch-1",
        "branch_name": "Sucursal Principal - Centro",
        "name": "Caja 01 - Principal",
        "hardware_uuid": "HW-POS-01-A92B",
        "status": "OPEN",
        "is_active": True,
        "current_operator": "Carlos Mendoza",
        "today_sales_total": 450.00,
        "allowed_user_ids": ["usr-admin-01", "usr-cashier-01"],
        "payment_methods": ["CASH_USD", "CASH_BS", "PAGO_MOVIL", "DEBIT_CARD", "ZELLE"],
        "created_at": datetime(2026, 1, 16, 8, 0, 0)
    },
    {
        "id": "reg-02",
        "branch_id": "branch-1",
        "branch_name": "Sucursal Principal - Centro",
        "name": "Caja 02 - Pasillo Rápido",
        "hardware_uuid": "HW-POS-02-C77D",
        "status": "CLOSED",
        "is_active": True,
        "current_operator": None,
        "today_sales_total": 0.00,
        "allowed_user_ids": ["usr-admin-01", "usr-cashier-01"],
        "payment_methods": ["CASH_USD", "CASH_BS", "PAGO_MOVIL", "DEBIT_CARD"],
        "created_at": datetime(2026, 1, 16, 8, 30, 0)
    },
    {
        "id": "reg-03",
        "branch_id": "branch-2",
        "branch_name": "Sucursal Norte - CC Lago Mall",
        "name": "Caja 01 - Lago Mall",
        "hardware_uuid": "HW-POS-03-F11E",
        "status": "OPEN",
        "is_active": True,
        "current_operator": "Pedro Ramos",
        "today_sales_total": 290.50,
        "allowed_user_ids": ["usr-branch_manager-01", "usr-cashier-01"],
        "payment_methods": ["CASH_USD", "CASH_BS", "PAGO_MOVIL", "DEBIT_CARD", "ZELLE"],
        "created_at": datetime(2026, 3, 21, 9, 0, 0)
    },
    {
        "id": "reg-04",
        "branch_id": "branch-2",
        "branch_name": "Sucursal Norte - CC Lago Mall",
        "name": "Caja 02 - Express",
        "hardware_uuid": "HW-POS-04-K88M",
        "status": "CLOSED",
        "is_active": True,
        "current_operator": None,
        "today_sales_total": 0.00,
        "allowed_user_ids": ["usr-branch_manager-01"],
        "payment_methods": ["CASH_USD", "CASH_BS", "PAGO_MOVIL"],
        "created_at": datetime(2026, 3, 21, 9, 30, 0)
    }
]

def recalculate_branch_cash_registers():
    for b in branches_db:
        b["active_cash_registers_count"] = len([r for r in cash_registers_db if r["branch_id"] == b["id"] and r.get("is_active", True)])

@api_router.get("/branches")
async def list_branches():
    recalculate_branch_cash_registers()
    return branches_db

@api_router.get("/branches/{branch_id}")
async def get_branch(branch_id: str):
    for b in branches_db:
        if b["id"] == branch_id:
            return b
    return {"message": "Sucursal no encontrada"}

@api_router.post("/branches", response_model=BranchResponse, status_code=status.HTTP_201_CREATED)
async def create_branch(payload: BranchCreate):
    new_b = {
        "id": f"branch-{int(datetime.utcnow().timestamp())}",
        "business_id": "biz-101",
        "name": payload.name,
        "address": payload.address,
        "latitude": payload.latitude or 10.6417,
        "longitude": payload.longitude or -71.6125,
        "phone": payload.phone or "+58 414-0000000",
        "manager_user_id": payload.manager_user_id,
        "manager_name": payload.manager_name or "Gerente General",
        "active_cash_registers_count": 0,
        "is_active": True,
        "created_at": datetime.utcnow()
    }
    branches_db.append(new_b)
    return new_b

@api_router.put("/branches/{branch_id}")
async def update_branch(branch_id: str, payload: BranchUpdate):
    for i, b in enumerate(branches_db):
        if b["id"] == branch_id:
            branches_db[i].update(payload.model_dump(exclude_unset=True))
            return branches_db[i]
    return {"message": "Sucursal no encontrada"}

@api_router.delete("/branches/{branch_id}")
async def delete_branch(branch_id: str):
    global branches_db, cash_registers_db
    branches_db = [b for b in branches_db if b["id"] != branch_id]
    cash_registers_db = [r for r in cash_registers_db if r["branch_id"] != branch_id]
    return {"message": "Sucursal eliminada"}

@api_router.get("/cash-registers")
async def list_cash_registers(branch_id: Optional[str] = None):
    if branch_id:
        return [r for r in cash_registers_db if r["branch_id"] == branch_id]
    return cash_registers_db

@api_router.post("/cash-registers", status_code=status.HTTP_201_CREATED)
async def create_cash_register(payload: CashRegisterCreate):
    # Validar límite de cajas contratadas (Xion-Pay plan guard: max 6)
    active_count = len([r for r in cash_registers_db if r.get("is_active", True)])
    if active_count >= 6:
        return {"error": "UPGRADE_REQUIRED", "message": "Límite de cajas alcanzado (6/6). Adquiere un add-on en Xion-Pay para continuar."}

    branch_name = "Sucursal Asignada"
    for b in branches_db:
        if b["id"] == payload.branch_id:
            branch_name = b["name"]
            break

    new_r = {
        "id": f"reg-{int(datetime.utcnow().timestamp())}",
        "branch_id": payload.branch_id,
        "branch_name": branch_name,
        "name": payload.name,
        "hardware_uuid": payload.hardware_uuid or f"HW-POS-{int(datetime.utcnow().timestamp() % 10000)}",
        "status": "CLOSED",
        "is_active": True,
        "current_operator": None,
        "today_sales_total": 0.0,
        "allowed_user_ids": payload.allowed_user_ids or ["usr-admin-01"],
        "payment_methods": payload.payment_methods or ["CASH_USD", "CASH_BS", "PAGO_MOVIL", "DEBIT_CARD"],
        "created_at": datetime.utcnow()
    }
    cash_registers_db.append(new_r)
    recalculate_branch_cash_registers()
    return new_r

@api_router.put("/cash-registers/{register_id}")
async def update_cash_register(register_id: str, payload: CashRegisterUpdate):
    for i, r in enumerate(cash_registers_db):
        if r["id"] == register_id:
            data = payload.model_dump(exclude_unset=True)
            if "branch_id" in data:
                for b in branches_db:
                    if b["id"] == data["branch_id"]:
                        data["branch_name"] = b["name"]
                        break
            cash_registers_db[i].update(data)
            recalculate_branch_cash_registers()
            return cash_registers_db[i]
    return {"message": "Caja no encontrada"}

@api_router.delete("/cash-registers/{register_id}")
async def delete_cash_register(register_id: str):
    global cash_registers_db
    cash_registers_db = [r for r in cash_registers_db if r["id"] != register_id]
    recalculate_branch_cash_registers()
    return {"message": "Caja eliminada"}

@api_router.post("/cash-registers/{register_id}/toggle-status")
async def toggle_cash_register_status(register_id: str, operator_name: Optional[str] = Body("Carlos Mendoza", embed=True)):
    for r in cash_registers_db:
        if r["id"] == register_id:
            if r["status"] == "OPEN":
                r["status"] = "CLOSED"
                r["current_operator"] = None
            else:
                r["status"] = "OPEN"
                r["current_operator"] = operator_name
            return r
    return {"message": "Caja no encontrada"}


# 3. Inventory State & Endpoints
inventory_db = [
    {
        "id": "inv-1",
        "product_id": "p-1",
        "barcode": "7591234567890",
        "sku": "PROD-HAR-01",
        "name": "Harina Pan 1kg",
        "description": "Harina de maíz precocida tradicional",
        "category": "Víveres",
        "cost_price": 0.95,
        "sale_price": 1.30,
        "wholesale_price": 1.15,
        "package_quantity": 20,
        "product_type": "physical",
        "tax_type": "none",
        "unit_measure": "UND",
        "current_stock": 150.0,
        "min_stock_alert": 20.0,
        "image_url": "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300",
        "branch_id": "branch-1",
        "branch_name": "Sucursal Principal - Centro",
        "combo_items": []
    },
    {
        "id": "inv-2",
        "product_id": "p-2",
        "barcode": "7599876543210",
        "sku": "PROD-ACE-02",
        "name": "Aceite de Maíz 1L",
        "description": "Aceite vegetal comestible",
        "category": "Víveres",
        "cost_price": 2.10,
        "sale_price": 2.90,
        "wholesale_price": 2.60,
        "package_quantity": 12,
        "product_type": "physical",
        "tax_type": "vat",
        "unit_measure": "UND",
        "current_stock": 8.0,
        "min_stock_alert": 15.0,
        "image_url": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300",
        "branch_id": "branch-1",
        "branch_name": "Sucursal Principal - Centro",
        "combo_items": []
    },
    {
        "id": "inv-3",
        "product_id": "p-3",
        "barcode": "7594567890123",
        "sku": "PROD-AZU-03",
        "name": "Azúcar Refinada 1kg",
        "description": "Azúcar blanca refinada de alta pureza",
        "category": "Víveres",
        "cost_price": 0.85,
        "sale_price": 1.15,
        "wholesale_price": 1.05,
        "package_quantity": 25,
        "product_type": "physical",
        "tax_type": "none",
        "unit_measure": "UND",
        "current_stock": 45.0,
        "min_stock_alert": 10.0,
        "image_url": "",
        "branch_id": "branch-1",
        "branch_name": "Sucursal Principal - Centro",
        "combo_items": []
    },
    {
        "id": "inv-4",
        "product_id": "p-4",
        "barcode": "7597890123456",
        "sku": "PROD-ARR-04",
        "name": "Arroz Blanco Tradicional 1kg",
        "description": "Arroz tipo I grano entero",
        "category": "Víveres",
        "cost_price": 1.05,
        "sale_price": 1.45,
        "wholesale_price": 1.30,
        "package_quantity": 24,
        "product_type": "physical",
        "tax_type": "none",
        "unit_measure": "UND",
        "current_stock": 2.0,
        "min_stock_alert": 15.0,
        "image_url": "",
        "branch_id": "branch-1",
        "branch_name": "Sucursal Principal - Centro",
        "combo_items": []
    },
    {
        "id": "inv-5",
        "product_id": "p-5",
        "barcode": "7590001112223",
        "sku": "CMB-DESAYUNO-01",
        "name": "Combo Desayuno Criollo (Harina + Aceite + Azúcar)",
        "description": "Pack especial ahorro familiar",
        "category": "Combos",
        "cost_price": 3.90,
        "sale_price": 4.99,
        "wholesale_price": 4.70,
        "package_quantity": 1,
        "product_type": "virtual",
        "tax_type": "none",
        "unit_measure": "UND",
        "current_stock": 10.0,
        "min_stock_alert": 5.0,
        "image_url": "",
        "branch_id": "branch-1",
        "branch_name": "Sucursal Principal - Centro",
        "combo_items": [
            {"product_id": "p-1", "product_name": "Harina Pan 1kg", "quantity": 1},
            {"product_id": "p-2", "product_name": "Aceite de Maíz 1L", "quantity": 1},
            {"product_id": "p-3", "product_name": "Azúcar Refinada 1kg", "quantity": 1}
        ]
    }
]

transfers_db = [
    {
        "id": "tr-001",
        "transfer_code": "TR-102",
        "origin_branch_id": "branch-1",
        "origin_branch_name": "Sucursal Principal - Centro",
        "destination_branch_id": "branch-2",
        "destination_branch_name": "Sucursal Norte - CC Lago Mall",
        "product_id": "p-1",
        "product_name": "Harina Pan 1kg",
        "quantity": 20,
        "status": "COMPLETED",
        "notes": "Reposición semanal de stock alta demanda",
        "created_at": "2026-10-08 10:15:00"
    }
]

categories_db = [
    {"id": "cat-1", "name": "Víveres", "parent_id": None, "full_path": "Víveres", "is_active": True},
    {"id": "cat-1-1", "name": "Harinas y Granos", "parent_id": "cat-1", "full_path": "Víveres > Harinas y Granos", "is_active": True},
    {"id": "cat-1-2", "name": "Aceites y Grasas", "parent_id": "cat-1", "full_path": "Víveres > Aceites y Grasas", "is_active": True},
    {"id": "cat-2", "name": "Bebidas", "parent_id": None, "full_path": "Bebidas", "is_active": True},
    {"id": "cat-2-1", "name": "Refrescos y Jugos", "parent_id": "cat-2", "full_path": "Bebidas > Refrescos y Jugos", "is_active": True},
    {"id": "cat-3", "name": "Lácteos y Huevos", "parent_id": None, "full_path": "Lácteos y Huevos", "is_active": True},
    {"id": "cat-4", "name": "Limpieza y Hogar", "parent_id": None, "full_path": "Limpieza y Hogar", "is_active": True},
    {"id": "cat-5", "name": "Combos y Promociones", "parent_id": None, "full_path": "Combos y Promociones", "is_active": True}
]

shrinkage_db = [
    {
        "id": "shk-001",
        "product_id": "p-1",
        "product_name": "Harina Pan 1kg",
        "branch_id": "branch-1",
        "quantity": 2.0,
        "reason": "Dañado/Vencido",
        "justification": "Empaque roto por humedad en anaquel",
        "date": "2026-10-14 11:30"
    }
]

@api_router.get("/inventory/categories")
async def list_categories():
    return categories_db

@api_router.post("/inventory/categories", status_code=status.HTTP_201_CREATED)
async def create_category(payload: CategoryCreate):
    full_path = payload.name
    if payload.parent_id:
        parent = next((c for c in categories_db if c["id"] == payload.parent_id), None)
        if parent:
            full_path = f"{parent['full_path']} > {payload.name}"
    new_cat = {
        "id": f"cat-{int(datetime.utcnow().timestamp())}",
        "name": payload.name,
        "parent_id": payload.parent_id,
        "full_path": full_path,
        "is_active": payload.is_active
    }
    categories_db.append(new_cat)
    return new_cat

@api_router.get("/inventory/shrinkage")
async def list_shrinkage():
    return shrinkage_db

@api_router.post("/inventory/adjust-stock")
async def adjust_stock(payload: StockAdjustmentDTO):
    for p in inventory_db:
        if p["id"] == payload.product_id or p.get("product_id") == payload.product_id:
            old_qty = p["current_stock"]
            p["current_stock"] = payload.new_quantity
            return {
                "status": "SUCCESS",
                "product_id": p["id"],
                "old_quantity": old_qty,
                "new_quantity": payload.new_quantity,
                "justification": payload.justification
            }
    raise HTTPException(status_code=404, detail="Producto no encontrado")

@api_router.get("/inventory/products/{combo_id}/components")
async def get_combo_components(combo_id: str):
    prod = next((p for p in inventory_db if p["id"] == combo_id or p.get("product_id") == combo_id), None)
    if not prod:
        raise HTTPException(status_code=404, detail="Combo no encontrado")
    return prod.get("combo_items", [])

@api_router.put("/inventory/products/{combo_id}/components")
async def update_combo_components(combo_id: str, components: List[dict]):
    for p in inventory_db:
        if p["id"] == combo_id or p.get("product_id") == combo_id:
            p["combo_items"] = components
            return {"status": "SUCCESS", "combo_items": components}
    raise HTTPException(status_code=404, detail="Combo no encontrado")

@api_router.get("/inventory/products")
async def list_products(branch_id: Optional[str] = None):
    if branch_id:
        return [p for p in inventory_db if p.get("branch_id") == branch_id or not p.get("branch_id")]
    return inventory_db

@api_router.get("/inventory/{branch_id}")
async def get_branch_inventory(branch_id: str):
    return [p for p in inventory_db if p.get("branch_id") == branch_id or not p.get("branch_id")]

@api_router.post("/inventory/products", status_code=status.HTTP_201_CREATED)
async def create_product(payload: ProductCreate):
    new_p = {
        "id": f"inv-{int(datetime.utcnow().timestamp() * 1000)}",
        "product_id": f"p-{int(datetime.utcnow().timestamp())}",
        "barcode": payload.barcode or f"759{int(datetime.utcnow().timestamp())}",
        "sku": payload.sku,
        "name": payload.name,
        "description": payload.description or "",
        "category": payload.category or "General",
        "cost_price": payload.cost_price,
        "sale_price": payload.sale_price,
        "wholesale_price": payload.wholesale_price or 0.0,
        "package_quantity": payload.package_quantity or 1,
        "product_type": payload.product_type or "physical",
        "tax_type": payload.tax_type or "vat",
        "unit_measure": payload.unit_measure or "UND",
        "current_stock": payload.current_stock or 0.0,
        "min_stock_alert": payload.min_stock_alert or 5.0,
        "image_url": payload.image_url or "",
        "branch_id": payload.branch_id or "branch-1",
        "branch_name": "Sucursal Principal" if payload.branch_id == "branch-1" else "Sucursal Norte",
        "combo_items": [c.model_dump() for c in (payload.combo_items or [])]
    }
    inventory_db.insert(0, new_p)
    return new_p

@api_router.put("/inventory/products/{product_id}")
async def update_product(product_id: str, payload: ProductUpdate):
    for i, p in enumerate(inventory_db):
        if p["id"] == product_id or p.get("product_id") == product_id:
            data = payload.model_dump(exclude_unset=True)
            if "combo_items" in data and data["combo_items"] is not None:
                data["combo_items"] = [c if isinstance(c, dict) else c.model_dump() for c in data["combo_items"]]
            inventory_db[i].update(data)
            return inventory_db[i]
    return {"message": "Producto no encontrado"}

@api_router.delete("/inventory/products/{product_id}")
async def delete_product(product_id: str):
    global inventory_db
    inventory_db = [p for p in inventory_db if p["id"] != product_id and p.get("product_id") != product_id]
    return {"message": "Producto eliminado exitosamente"}

@api_router.post("/inventory/shrinkage")
async def register_shrinkage(payload: ShrinkageCreate):
    for p in inventory_db:
        if p["id"] == payload.product_id or p.get("product_id") == payload.product_id:
            p["current_stock"] = max(0.0, p["current_stock"] - payload.quantity)
            break
    record = {
        "id": f"shk-{int(datetime.utcnow().timestamp())}",
        "product_id": payload.product_id,
        "product_name": payload.product_name or "Producto",
        "branch_id": payload.branch_id or "branch-1",
        "quantity": payload.quantity,
        "reason": payload.reason,
        "justification": payload.justification or "",
        "date": datetime.utcnow().strftime("%Y-%m-%d %H:%M")
    }
    shrinkage_db.append(record)
    return record

@api_router.get("/inventory/transfers")
async def list_transfers():
    return transfers_db

@api_router.post("/inventory/transfers", status_code=status.HTTP_201_CREATED)
async def create_transfer(payload: StockTransferCreate):
    prod_name = "Producto"
    for p in inventory_db:
        if p["id"] == payload.product_id or p.get("product_id") == payload.product_id:
            p["current_stock"] = max(0.0, p["current_stock"] - payload.quantity)
            prod_name = p["name"]
            break
    new_tr = {
        "id": f"tr-{int(datetime.utcnow().timestamp())}",
        "transfer_code": f"TR-{100 + len(transfers_db) + 1}",
        "origin_branch_id": payload.origin_branch_id,
        "origin_branch_name": "Sucursal Principal - Centro" if payload.origin_branch_id == "branch-1" else "Sucursal Norte",
        "destination_branch_id": payload.destination_branch_id,
        "destination_branch_name": "Sucursal Norte - CC Lago Mall" if payload.destination_branch_id == "branch-2" else "Sucursal Principal",
        "product_id": payload.product_id,
        "product_name": prod_name,
        "quantity": payload.quantity,
        "status": "COMPLETED",
        "notes": payload.notes or "Traslado entre sedes ejecutado",
        "created_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M")
    }
    transfers_db.insert(0, new_tr)
    return new_tr

# 4. Suppliers & Purchases State & Endpoints
suppliers_db = [
    {
        "id": "sup-001",
        "name": "Distribuidora Alimentos Polar C.A.",
        "rif": "J-00041372-9",
        "email": "pedidos@polar.com",
        "phone": "+58 212-2023111",
        "address": "Los Cortijos de Lourdes, Edif. Fundación Polar, Caracas",
        "category": "Alimentos y Bebidas",
        "payment_terms_days": 15,
        "current_balance_usd": 0.0,
        "is_active": True,
        "created_at": "2026-01-10"
    },
    {
        "id": "sup-002",
        "name": "Comercializadora Cargill Venezuela S.R.L.",
        "rif": "J-30591823-1",
        "email": "atencion@cargill.com.ve",
        "phone": "+58 241-8742000",
        "address": "Zona Industrial Castillito, Valencia, Carabobo",
        "category": "Granos y Aceites",
        "payment_terms_days": 30,
        "current_balance_usd": 350.50,
        "is_active": True,
        "created_at": "2026-02-05"
    },
    {
        "id": "sup-003",
        "name": "Monaca - Molinos Nacionales C.A.",
        "rif": "J-00015940-7",
        "email": "ventas@monaca.com.ve",
        "phone": "+58 212-9014000",
        "address": "Av. Principal Los Ruices, Caracas",
        "category": "Harinas y Derivados",
        "payment_terms_days": 21,
        "current_balance_usd": 0.0,
        "is_active": True,
        "created_at": "2026-03-12"
    }
]

purchases_db = [
    {
        "id": "pur-001",
        "supplier_id": "sup-001",
        "supplier_name": "Distribuidora Alimentos Polar C.A.",
        "supplier_rif": "J-00041372-9",
        "invoice_number": "FAC-00892",
        "branch_id": "branch-1",
        "branch_name": "Sucursal Principal - Centro",
        "date": "2026-10-06",
        "total_amount_usd": 1420.00,
        "total_amount_bs": 53250.00,
        "exchange_rate": 37.50,
        "payment_type": "cash",
        "payment_status": "paid",
        "paid_amount_usd": 1420.00,
        "pending_amount_usd": 0.0,
        "credit_days": 0,
        "notes": "Despacho directo en depósito central",
        "items_count": 8,
        "items": [
            {
                "product_id": "p-1",
                "product_name": "Harina Pan 1kg",
                "product_sku": "PROD-HAR-01",
                "quantity": 100,
                "lot_number": "LOT-2026-A1",
                "cost_usd": 0.95,
                "cost_bs": 35.62,
                "total_usd": 95.00
            }
        ]
    },
    {
        "id": "pur-002",
        "supplier_id": "sup-002",
        "supplier_name": "Comercializadora Cargill Venezuela S.R.L.",
        "supplier_rif": "J-30591823-1",
        "invoice_number": "FAC-99120",
        "branch_id": "branch-2",
        "branch_name": "Sucursal Norte - CC Lago Mall",
        "date": "2026-10-07",
        "total_amount_usd": 850.50,
        "total_amount_bs": 31893.75,
        "exchange_rate": 37.50,
        "payment_type": "credit",
        "payment_status": "partial",
        "paid_amount_usd": 500.00,
        "pending_amount_usd": 350.50,
        "credit_days": 30,
        "notes": "Crédito a 30 días, anticipo 500$",
        "items_count": 4,
        "items": [
            {
                "product_id": "p-2",
                "product_name": "Aceite de Maíz 1L",
                "product_sku": "PROD-ACE-02",
                "quantity": 50,
                "lot_number": "LOT-CG-99",
                "cost_usd": 2.10,
                "cost_bs": 78.75,
                "total_usd": 105.00
            }
        ]
    }
]

@api_router.get("/suppliers")
async def list_suppliers():
    return suppliers_db

@api_router.post("/suppliers", status_code=status.HTTP_201_CREATED)
async def create_supplier(payload: SupplierCreate):
    new_s = {
        "id": f"sup-{int(datetime.utcnow().timestamp())}",
        "name": payload.name,
        "rif": payload.rif,
        "email": payload.email or "",
        "phone": payload.phone or "",
        "address": payload.address or "",
        "category": payload.category or "Varios",
        "payment_terms_days": payload.payment_terms_days or 15,
        "current_balance_usd": 0.0,
        "is_active": payload.is_active,
        "created_at": datetime.utcnow().strftime("%Y-%m-%d")
    }
    suppliers_db.insert(0, new_s)
    return new_s

@api_router.put("/suppliers/{supplier_id}")
async def update_supplier(supplier_id: str, payload: SupplierUpdate):
    for i, s in enumerate(suppliers_db):
        if s["id"] == supplier_id:
            suppliers_db[i].update(payload.model_dump(exclude_unset=True))
            return suppliers_db[i]
    return {"message": "Proveedor no encontrado"}

@api_router.delete("/suppliers/{supplier_id}")
async def delete_supplier(supplier_id: str):
    global suppliers_db
    suppliers_db = [s for s in suppliers_db if s["id"] != supplier_id]
    return {"message": "Proveedor eliminado"}

@api_router.get("/purchases")
async def list_purchases(supplier_id: Optional[str] = None, branch_id: Optional[str] = None):
    res = purchases_db
    if supplier_id:
        res = [p for p in res if p.get("supplier_id") == supplier_id]
    if branch_id:
        res = [p for p in res if p.get("branch_id") == branch_id]
    return res

supplier_ledger_db = [
    {
        "id": "ledg-001",
        "supplier_id": "sup-002",
        "purchase_id": "pur-002",
        "tx_type": "CHARGE",
        "amount_usd": 350.50,
        "exchange_rate": 37.5,
        "reference": "FAC-99120",
        "notes": "Compra a crédito Factura FAC-99120",
        "created_at": datetime(2026, 10, 7, 10, 0, 0)
    }
]

@api_router.get("/suppliers/{supplier_id}/ledger")
async def get_supplier_ledger(supplier_id: str):
    return [l for l in supplier_ledger_db if l["supplier_id"] == supplier_id]

@api_router.get("/purchases/{purchase_id}")
async def get_purchase_detail(purchase_id: str):
    for p in purchases_db:
        if p["id"] == purchase_id:
            return p
    return {"message": "Compra no encontrada"}

@api_router.post("/purchases", status_code=status.HTTP_201_CREATED)
async def create_purchase(payload: PurchaseCreate):
    rate = payload.exchange_rate or global_settings.get("current_exchange_rate_bs", 37.5)
    total_usd = payload.total_amount_usd
    total_bs = payload.total_amount_bs or (total_usd * rate)
    
    pay_type = payload.payment_type
    if pay_type == "cash":
        paid_usd = total_usd
        pending_usd = 0.0
        pay_status = "paid"
    else:
        paid_usd = payload.paid_amount_usd if payload.paid_amount_usd is not None else 0.0
        pending_usd = max(0.0, total_usd - paid_usd)
        if pending_usd <= 0.001:
            pay_status = "paid"
        elif paid_usd > 0.0:
            pay_status = "partial"
        else:
            pay_status = "pending"

    new_p = {
        "id": f"pur-{int(datetime.utcnow().timestamp())}",
        "supplier_id": payload.supplier_id or "sup-gen",
        "supplier_name": payload.supplier_name,
        "supplier_rif": payload.supplier_rif or "J-00000000-0",
        "invoice_number": payload.invoice_number,
        "branch_id": payload.branch_id,
        "branch_name": payload.branch_name or ("Sucursal Principal" if payload.branch_id == "branch-1" else "Sucursal Norte"),
        "date": datetime.utcnow().strftime("%Y-%m-%d"),
        "total_amount_usd": total_usd,
        "total_amount_bs": total_bs,
        "exchange_rate": rate,
        "payment_type": pay_type,
        "payment_status": pay_status,
        "paid_amount_usd": paid_usd,
        "pending_amount_usd": pending_usd,
        "credit_days": payload.credit_days or 0,
        "notes": payload.notes or "",
        "items_count": len(payload.items),
        "items": [it.model_dump() for it in payload.items]
    }
    purchases_db.insert(0, new_p)

    for it in payload.items:
        for prod in inventory_db:
            if prod["id"] == it.product_id or prod.get("product_id") == it.product_id:
                old_stock = prod["current_stock"]
                old_cost = prod["cost_price"]
                new_qty = it.quantity
                new_cost = it.cost_usd
                total_new_stock = old_stock + new_qty
                if total_new_stock > 0:
                    prod["cost_price"] = round(((old_stock * old_cost) + (new_qty * new_cost)) / total_new_stock, 4)
                prod["current_stock"] = total_new_stock
                break

    if payload.supplier_id and pending_usd > 0:
        for s in suppliers_db:
            if s["id"] == payload.supplier_id:
                s["current_balance_usd"] = round(s.get("current_balance_usd", 0.0) + pending_usd, 2)
                break
        supplier_ledger_db.append({
            "id": f"ledg-{int(datetime.utcnow().timestamp())}",
            "supplier_id": payload.supplier_id,
            "purchase_id": new_p["id"],
            "tx_type": "CHARGE",
            "amount_usd": pending_usd,
            "exchange_rate": rate,
            "reference": new_p["invoice_number"],
            "notes": f"Compra a crédito Factura {new_p['invoice_number']}",
            "created_at": datetime.utcnow()
        })

    return new_p

@api_router.post("/purchases/{purchase_id}/pay")
async def pay_purchase_debt(purchase_id: str, payload: PurchasePayDTO):
    for p in purchases_db:
        if p["id"] == purchase_id:
            pay_amt = min(payload.amount_usd, p.get("pending_amount_usd", 0.0))
            p["paid_amount_usd"] = round(p.get("paid_amount_usd", 0.0) + pay_amt, 2)
            p["pending_amount_usd"] = max(0.0, round(p.get("pending_amount_usd", 0.0) - pay_amt, 2))
            if p["pending_amount_usd"] <= 0.001:
                p["payment_status"] = "paid"
            else:
                p["payment_status"] = "partial"
            if p.get("supplier_id"):
                for s in suppliers_db:
                    if s["id"] == p["supplier_id"]:
                        s["current_balance_usd"] = max(0.0, round(s.get("current_balance_usd", 0.0) - pay_amt, 2))
                        break
                supplier_ledger_db.append({
                    "id": f"ledg-{int(datetime.utcnow().timestamp())}",
                    "supplier_id": p["supplier_id"],
                    "purchase_id": p["id"],
                    "tx_type": "PAYMENT",
                    "amount_usd": pay_amt,
                    "exchange_rate": payload.exchange_rate or p.get("exchange_rate", 37.5),
                    "reference": p.get("invoice_number"),
                    "notes": payload.notes or f"Abono a factura {p.get('invoice_number')}",
                    "created_at": datetime.utcnow()
                })
            return p
    return {"message": "Factura de compra no encontrada"}

# 5. Users & Approvals
@api_router.get("/users")
async def list_users():
    return [
        {
            "id": "usr-1",
            "email": "juan.delgado@xion.com",
            "full_name": "Juan Delgado",
            "role": "OWNER",
            "approval_status": "APPROVED",
            "is_active": True
        },
        {
            "id": "usr-4",
            "email": "pedro.cajero@xion.com",
            "full_name": "Pedro Ramos",
            "role": "CASHIER",
            "approval_status": "PENDING",
            "is_active": False
        }
    ]

@api_router.post("/users/approval")
async def user_approval(user_id: str = Body(...), status_val: str = Body(...)):
    return {
        "user_id": user_id,
        "approval_status": status_val,
        "message": "Estado de aprobación actualizado correctamente"
    }

# 6. Audit & Cash Sessions
@api_router.get("/audit/logs")
async def get_audit_logs():
    return [
        {
            "id": "log-1",
            "timestamp": "2026-10-08 13:45:10",
            "user_name": "Carlos Mendoza",
            "role": "ADMIN",
            "module": "INVENTARIO",
            "action_type": "STOCK_TRANSFER_DISPATCH",
            "description": "Despacho de traslado #TR-102: 20 unid. Harina Pan hacia Sucursal Norte",
            "ip_address": "192.168.1.45"
        }
    ]

@api_router.get("/audit/cash-sessions")
async def get_cash_sessions():
    return [
        {
            "id": "sess-01",
            "cash_register_name": "Caja 01 - Principal",
            "branch_name": "Sucursal Principal",
            "opened_by": "Carlos Mendoza",
            "opened_at": "2026-10-08 08:00",
            "closed_at": "2026-10-08 16:00",
            "initial_cash": 100.00,
            "declared_cash": 540.00,
            "calculated_cash": 540.00,
            "difference": 0.00,
            "status": "CLOSED"
        }
    ]

# 8. Notifications
@api_router.get("/notifications")
async def get_notifications():
    return [
        {
            "id": "notif-1",
            "timestamp": "Hace 5 min",
            "severity": "URGENT",
            "title": "Descuadre de Caja Detectado",
            "message": "Caja 01 en Sucursal Norte cerró con diferencia en arqueo ciego.",
            "read": False,
            "link_tab": "audit"
        }
    ]

# 9. Billing & Xion-Pay
@api_router.get("/billing/account-status", response_model=AccountStatusResponse)
async def get_account_status():
    plan_name = "Plan Comercio"
    billing_cycle = "MONTHLY"
    expires_at = datetime(2026, 11, 17, 23, 59, 59)
    days_remaining = 30
    sub_status = "active"

    try:
        live = await XionPayService.get_license_status()
        if live and live.get("status"):
            sub_status = live.get("status", "active")
            sub_info = live.get("subscription") or {}
            if sub_info.get("plan_name"):
                plan_name = sub_info.get("plan_name")
            elif live.get("commercial_name"):
                plan_name = f"Plan {live.get('commercial_name')}"
                
            end_date_str = sub_info.get("current_period_end") or live.get("trial_ends_at")
            if end_date_str:
                clean_date = end_date_str.replace("Z", "+00:00")
                parsed_date = datetime.fromisoformat(clean_date)
                expires_at = parsed_date.replace(tzinfo=None)
                now_utc = datetime.utcnow()
                days_remaining = max(0, (expires_at - now_utc).days)
    except Exception:
        pass

    traffic_light = {
        "status": "ACTIVE" if sub_status in ("active", "trial") else "SUSPENDED",
        "color": "GREEN" if sub_status in ("active", "trial") else "RED",
        "label": "Prueba Gratuita (30 días)" if sub_status == "trial" else ("Al día" if sub_status == "active" else "Suspendido"),
        "description": f"Suscripción en Xion-Pay. Vence en {days_remaining} días."
    }

    if xion_pay_state.get("tolerance_expires_at"):
        traffic_light["label"] = "Prórroga Activa"
        traffic_light["description"] = "Prórroga de contingencia operativa otorgada por Xion-Pay mientras se valida tu pago."

    return {
        "plan_name": plan_name,
        "billing_cycle": billing_cycle,
        "expires_at": expires_at,
        "days_remaining": days_remaining,
        "traffic_light": traffic_light,
        "resource_usage": {
            "branches": {"used": 2, "limit": 3, "percentage": 66.6},
            "cash_registers": {"used": 4, "limit": 6, "percentage": 66.6}
        }
    }

VENEZUELAN_BANKS = [
    {"code": "0102", "name": "Banco de Venezuela"},
    {"code": "0134", "name": "Banesco Banco Universal"},
    {"code": "0105", "name": "Banco Mercantil"},
    {"code": "0108", "name": "Banco Provincial (BBVA)"},
    {"code": "0172", "name": "Bancamiga Banco Universal"},
    {"code": "0191", "name": "Banco Nacional de Crédito (BNC)"},
    {"code": "0114", "name": "Bancaribe"},
    {"code": "0174", "name": "Banplus"},
    {"code": "0151", "name": "BFC Banco Fondo Común"},
    {"code": "0168", "name": "Bancrecer"},
    {"code": "0175", "name": "Banco Bicentenario"},
    {"code": "0163", "name": "Banco del Tesoro"},
    {"code": "0177", "name": "BANFANB"},
    {"code": "0138", "name": "Banco Plaza"}
]

COMPANY_DESTINATION_ACCOUNTS = [
    {
        "id": "dest-bdv-pm",
        "method": "pago_movil",
        "bank_code": "0102",
        "bank_name": "Banco de Venezuela",
        "account_holder": "Comercial Xion C.A.",
        "tax_id": "J-50123984-2",
        "phone": "0414-9988776",
        "label": "Pago Móvil BDV (J-50123984-2)"
    },
    {
        "id": "dest-banesco-pm",
        "method": "pago_movil",
        "bank_code": "0134",
        "bank_name": "Banesco",
        "account_holder": "Comercial Xion C.A.",
        "tax_id": "J-50123984-2",
        "phone": "0424-1122334",
        "label": "Pago Móvil Banesco (J-50123984-2)"
    },
    {
        "id": "dest-mercantil-transf",
        "method": "transferencia_ves",
        "bank_code": "0105",
        "bank_name": "Banco Mercantil",
        "account_holder": "Comercial Xion C.A.",
        "account_number": "0105-0012-34-1234567890",
        "tax_id": "J-50123984-2",
        "label": "Cta Corriente Mercantil VES (..7890)"
    },
    {
        "id": "dest-bancamiga-usd",
        "method": "deposito_divisas",
        "bank_code": "0172",
        "bank_name": "Bancamiga Cash",
        "account_holder": "Comercial Xion C.A.",
        "account_number": "0172-0110-55-9876543210",
        "tax_id": "J-50123984-2",
        "label": "Cta Moneda Extranjera Bancamiga (..3210)"
    },
    {
        "id": "dest-zelle",
        "method": "zelle",
        "account_holder": "Xion Management LLC",
        "email": "pagos@xion.com",
        "label": "Zelle: pagos@xion.com"
    },
    {
        "id": "dest-binance",
        "method": "binance_pay",
        "account_holder": "Xion Corp Merchant",
        "binance_id": "284910294",
        "label": "Binance Pay ID: 284910294"
    }
]

payment_reports_db: List[dict] = [
    {
        "id": "rep-001",
        "business_id": "biz-101",
        "order_id": "FAC-2026-089",
        "subscription_id": None,
        "concept": "Pago de Factura FAC-2026-089",
        "payment_method": "pago_movil",
        "origin_bank": "Banco de Venezuela",
        "dest_bank": "Banesco (Pago Móvil)",
        "payer_name": "Carlos Eduardo Mendoza",
        "payer_id_or_phone": "V-18456123 / 0414-9988112",
        "payer_email": "carlos.m@gmail.com",
        "reference_number": "849201",
        "amount_paid": 1875.00,
        "currency": "VES",
        "exchange_rate": 37.5000,
        "amount_base_equivalent": 50.00,
        "receipt_url": "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600",
        "status": "pending",
        "rejection_reason": None,
        "notes": "Transferencia de Pago Móvil efectuada a las 10:15 am",
        "verified_by": None,
        "verified_by_user_id": None,
        "verified_at": None,
        "payment_date": date(2026, 10, 15),
        "created_at": datetime(2026, 10, 15, 10, 20, 0)
    },
    {
        "id": "rep-002",
        "business_id": "biz-101",
        "order_id": "SUB-2026-OCT",
        "subscription_id": "sub-101",
        "concept": "Suscripción Plan Comercio + 2 Cajas",
        "payment_method": "zelle",
        "origin_bank": "Chase Bank",
        "dest_bank": "Zelle (pagos@xion.com)",
        "payer_name": "Inversiones Maracaibo Corp",
        "payer_id_or_phone": None,
        "payer_email": "admin@inversionesmaracaibo.com",
        "reference_number": "ZL-9940128",
        "amount_paid": 70.00,
        "currency": "USD",
        "exchange_rate": 37.5000,
        "amount_base_equivalent": 70.00,
        "receipt_url": "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600",
        "status": "approved",
        "rejection_reason": None,
        "notes": "Confirmado en portal bancario Zelle",
        "verified_by": "Juan Delgado (Dueño)",
        "verified_by_user_id": "usr-owner-01",
        "verified_at": datetime(2026, 10, 15, 9, 30, 0),
        "payment_date": date(2026, 10, 15),
        "created_at": datetime(2026, 10, 15, 9, 0, 0)
    },
    {
        "id": "rep-003",
        "business_id": "biz-101",
        "order_id": "FAC-2026-081",
        "subscription_id": None,
        "concept": "Abono Parcial Pedido Mayorista",
        "payment_method": "binance_pay",
        "origin_bank": "Binance App",
        "dest_bank": "Binance Pay ID (284910294)",
        "payer_name": "Luis Alberto Morales",
        "payer_id_or_phone": "PayID: 10982344",
        "payer_email": "morales.crypto@yahoo.com",
        "reference_number": "BN-2098410298",
        "amount_paid": 120.00,
        "currency": "USDT",
        "exchange_rate": 37.5000,
        "amount_base_equivalent": 120.00,
        "receipt_url": "https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=600",
        "status": "approved",
        "rejection_reason": None,
        "notes": "Aprobado por coincidencia inmediata de Order ID",
        "verified_by": "Carlos Mendoza (Administrador)",
        "verified_by_user_id": "usr-admin-01",
        "verified_at": datetime(2026, 10, 14, 18, 0, 0),
        "payment_date": date(2026, 10, 14),
        "created_at": datetime(2026, 10, 14, 17, 45, 0)
    },
    {
        "id": "rep-004",
        "business_id": "biz-101",
        "order_id": "FAC-2026-077",
        "subscription_id": None,
        "concept": "Compra Productos Alimentos",
        "payment_method": "pago_movil",
        "origin_bank": "Banco Mercantil",
        "dest_bank": "Banesco (Pago Móvil)",
        "payer_name": "Gabriela Rivas",
        "payer_id_or_phone": "V-21334901 / 0412-5556677",
        "payer_email": "gabriela.r@gmail.com",
        "reference_number": "112233",
        "amount_paid": 950.00,
        "currency": "VES",
        "exchange_rate": 37.5000,
        "amount_base_equivalent": 25.33,
        "receipt_url": "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600",
        "status": "rejected",
        "rejection_reason": "Referencia no encontrada en la conciliación bancaria",
        "notes": "El banco emisor no arrojó crédito en el extracto del día",
        "verified_by": "Carlos Mendoza (Administrador)",
        "verified_by_user_id": "usr-admin-01",
        "verified_at": datetime(2026, 10, 14, 11, 20, 0),
        "payment_date": date(2026, 10, 14),
        "created_at": datetime(2026, 10, 14, 10, 0, 0)
    }
]

@api_router.get("/payment-reports/banks")
async def get_venezuelan_banks():
    return VENEZUELAN_BANKS

@api_router.get("/payment-reports/destination-accounts")
async def get_destination_accounts():
    return COMPANY_DESTINATION_ACCOUNTS

@api_router.get("/payment-reports", response_model=List[PaymentReportItemSchema])
async def list_payment_reports(
    status_filter: Optional[str] = Query(None, alias="status"),
    currency_filter: Optional[str] = Query(None, alias="currency"),
    payment_method: Optional[str] = None,
    search: Optional[str] = None
):
    results = payment_reports_db
    if status_filter and status_filter.upper() != "ALL":
        results = [r for r in results if r["status"].lower() == status_filter.lower()]
    if currency_filter and currency_filter.upper() != "ALL":
        results = [r for r in results if r["currency"].upper() == currency_filter.upper()]
    if payment_method and payment_method.upper() != "ALL":
        results = [r for r in results if r["payment_method"].lower() == payment_method.lower()]
    if search:
        s = search.lower()
        results = [
            r for r in results
            if s in (r.get("reference_number") or "").lower()
            or s in (r.get("payer_name") or "").lower()
            or s in (r.get("order_id") or "").lower()
            or s in (r.get("concept") or "").lower()
            or s in (r.get("origin_bank") or "").lower()
        ]
    return sorted(results, key=lambda x: x["created_at"], reverse=True)

@api_router.post("/payment-reports", response_model=PaymentReportItemSchema, status_code=status.HTTP_201_CREATED)
async def create_payment_report(payload: PaymentReportCreate):
    # Rule 1: Reference Uniqueness Guard
    clean_ref = (payload.reference_number or "").strip()
    clean_bank = (payload.origin_bank or "").strip().lower()
    
    if clean_ref:
        for r in payment_reports_db:
            if (
                r.get("reference_number", "").strip().lower() == clean_ref.lower()
                and (r.get("origin_bank") or "").strip().lower() == clean_bank
                and r.get("payment_date") == payload.payment_date
                and abs(float(r.get("amount_paid", 0)) - float(payload.amount_paid)) < 0.01
                and r.get("status") != "rejected"
            ):
                raise HTTPException(
                    status_code=400,
                    detail=f"Esta referencia bancaria ({clean_ref}) ya fue reportada para {payload.origin_bank} en la fecha indicada."
                )

    current_xion_pay_rate = float(payload.exchange_rate or xion_pay_state.get("official_exchange_rate", 37.50))
    if current_xion_pay_rate <= 0:
        current_xion_pay_rate = 37.50

    # Frozen rate calculation
    if payload.currency.upper() == "VES":
        amount_base_equiv = round(payload.amount_paid / current_xion_pay_rate, 4)
    else:
        amount_base_equiv = round(payload.amount_paid, 4)

    # Dispatch payment report to Xion-Pay pasarela (Client -> Xion-Pay)
    is_sub_renewal = (payload.order_id and payload.order_id.startswith("SUB-")) or \
                     (payload.concept and "Renovación Suscripción" in payload.concept)
    
    xion_pay_report_id = None
    if is_sub_renewal:
        xion_res = await XionPayService.report_payment({
            "tenant_id": xion_pay_state.get("tenant_id") or settings.XION_PAY_TENANT_ID,
            "origin_bank": payload.origin_bank or "Banco Nacional",
            "destination_bank": payload.dest_bank or "Xion-Pay Oficial",
            "payment_method_type": payload.payment_method,
            "reference_number": clean_ref or f"MOCK-REF-{int(datetime.utcnow().timestamp())}",
            "amount": float(payload.amount_paid),
            "currency": payload.currency.upper(),
            "exchange_rate": current_xion_pay_rate,
            "proof_attachment_url": payload.receipt_url or "https://xion.com/receipts/proof-pending.png",
            "metadata": {
                "order_id": payload.order_id,
                "concept": payload.concept,
                "payer_name": payload.payer_name,
                "payer_id_or_phone": payload.payer_id_or_phone
            }
        })
        if isinstance(xion_res, dict) and xion_res.get("payment_id"):
            xion_pay_report_id = str(xion_res.get("payment_id"))
            if xion_res.get("tolerance_expires_at"):
                xion_pay_state["tolerance_expires_at"] = xion_res.get("tolerance_expires_at")

    new_report = {
        "id": f"rep-{int(datetime.utcnow().timestamp())}",
        "business_id": "biz-101",
        "order_id": payload.order_id,
        "subscription_id": None,
        "xion_pay_payment_id": xion_pay_report_id,
        "concept": payload.concept or "Pago de Factura",
        "payment_method": payload.payment_method,
        "origin_bank": payload.origin_bank,
        "dest_bank": payload.dest_bank,
        "payer_name": payload.payer_name,
        "payer_id_or_phone": payload.payer_id_or_phone,
        "payer_email": payload.payer_email,
        "reference_number": clean_ref or None,
        "amount_paid": float(payload.amount_paid),
        "currency": payload.currency.upper(),
        "exchange_rate": current_xion_pay_rate,
        "amount_base_equivalent": amount_base_equiv,
        "receipt_url": payload.receipt_url,
        "status": "pending",
        "rejection_reason": None,
        "notes": payload.notes,
        "verified_by": None,
        "verified_by_user_id": None,
        "verified_at": None,
        "payment_date": payload.payment_date,
        "created_at": datetime.utcnow()
    }

    payment_reports_db.insert(0, new_report)
    return new_report

@api_router.post("/payment-reports/{report_id}/verify", response_model=PaymentReportItemSchema)
async def verify_payment_report(report_id: str, payload: PaymentReportVerifySchema):
    report = next((r for r in payment_reports_db if r["id"] == report_id), None)
    if not report:
        raise HTTPException(status_code=404, detail="Reporte de pago no encontrado")

    report["status"] = "approved"
    report["rejection_reason"] = None
    report["verified_by"] = payload.verified_by or "Administrador"
    report["verified_at"] = datetime.utcnow()
    if payload.notes:
        report["notes"] = f"{report.get('notes') or ''} [Verificación: {payload.notes}]".strip()

    return report

@api_router.post("/payment-reports/{report_id}/reject", response_model=PaymentReportItemSchema)
async def reject_payment_report(report_id: str, payload: PaymentReportRejectSchema):
    report = next((r for r in payment_reports_db if r["id"] == report_id), None)
    if not report:
        raise HTTPException(status_code=404, detail="Reporte de pago no encontrado")

    report["status"] = "rejected"
    report["rejection_reason"] = payload.rejection_reason
    report["verified_by"] = payload.rejected_by or "Administrador"
    report["verified_at"] = datetime.utcnow()

    return report

# Legacy billing payment report endpoint (backward compatibility)
@api_router.post("/billing/report-payment", response_model=PaymentReportAccepted, status_code=status.HTTP_202_ACCEPTED)
async def report_payment(
    payment_method_type: str = Form(...),
    issuing_bank: Optional[str] = Form(None),
    payment_date: date = Form(...),
    reference_number: Optional[str] = Form(None),
    amount: float = Form(...),
    receipt_file: Optional[UploadFile] = File(None)
):
    return {
        "message": "Tu reporte de pago ha sido recibido con éxito y está en proceso de verificación.",
        "report_id": f"rep-{int(datetime.utcnow().timestamp())}",
        "status": "pending"
    }

@api_router.post("/sync/pos-push", response_model=PosPushResponse)
async def pos_push_sync(payload: PosPushPayload):
    return {
        "status": "SYNC_SUCCESS",
        "synced_sales_count": len(payload.sales),
        "inventory_updated": True,
        "server_timestamp": datetime.utcnow()
    }

# ==========================================
# 10. Payment Methods (Xion-POS Parity Module)
# ==========================================

payment_methods_db: List[dict] = [
    {
        "id": 1,
        "name": "Pago Móvil",
        "code": "pago_movil",
        "currency": "VES",
        "is_digital": True,
        "applies_igtf": False,
        "requires_reference": True,
        "allow_decimals": True,
        "is_system": True,
        "is_active": True,
        "image_url": "65cc43a8116c",
        "created_at": datetime(2026, 1, 1, 0, 0, 0),
        "updated_at": datetime(2026, 1, 1, 0, 0, 0)
    },
    {
        "id": 2,
        "name": "Transferencia",
        "code": "transferencia_nacional",
        "currency": "VES",
        "is_digital": True,
        "applies_igtf": False,
        "requires_reference": True,
        "allow_decimals": True,
        "is_system": True,
        "is_active": True,
        "image_url": "c95398b571ef",
        "created_at": datetime(2026, 1, 1, 0, 0, 0),
        "updated_at": datetime(2026, 1, 1, 0, 0, 0)
    },
    {
        "id": 3,
        "name": "Débito",
        "code": "tarjeta_debito",
        "currency": "VES",
        "is_digital": True,
        "applies_igtf": False,
        "requires_reference": True,
        "allow_decimals": True,
        "is_system": True,
        "is_active": True,
        "image_url": "61149c1c2ed4",
        "created_at": datetime(2026, 1, 1, 0, 0, 0),
        "updated_at": datetime(2026, 1, 1, 0, 0, 0)
    },
    {
        "id": 4,
        "name": "Biopago",
        "code": "biopago",
        "currency": "VES",
        "is_digital": True,
        "applies_igtf": False,
        "requires_reference": False,
        "allow_decimals": True,
        "is_system": True,
        "is_active": True,
        "image_url": "d52c08dd0253",
        "created_at": datetime(2026, 1, 1, 0, 0, 0),
        "updated_at": datetime(2026, 1, 1, 0, 0, 0)
    },
    {
        "id": 5,
        "name": "Efectivo BS",
        "code": "efectivo_bs",
        "currency": "VES",
        "is_digital": False,
        "applies_igtf": False,
        "requires_reference": False,
        "allow_decimals": False,
        "is_system": True,
        "is_active": True,
        "image_url": "4129e9c224a2",
        "created_at": datetime(2026, 1, 1, 0, 0, 0),
        "updated_at": datetime(2026, 1, 1, 0, 0, 0)
    },
    {
        "id": 6,
        "name": "Efectivo USD",
        "code": "efectivo_usd",
        "currency": "USD",
        "is_digital": False,
        "applies_igtf": True,
        "requires_reference": False,
        "allow_decimals": False,
        "is_system": True,
        "is_active": True,
        "image_url": "d51e15debbbe",
        "created_at": datetime(2026, 1, 1, 0, 0, 0),
        "updated_at": datetime(2026, 1, 1, 0, 0, 0)
    },
    {
        "id": 7,
        "name": "Zelle",
        "code": "zelle",
        "currency": "USD",
        "is_digital": True,
        "applies_igtf": False,
        "requires_reference": True,
        "allow_decimals": True,
        "is_system": True,
        "is_active": True,
        "image_url": "3ff1409737f8",
        "created_at": datetime(2026, 1, 1, 0, 0, 0),
        "updated_at": datetime(2026, 1, 1, 0, 0, 0)
    },
    {
        "id": 8,
        "name": "Binance Pay",
        "code": "binance",
        "currency": "USD",
        "is_digital": True,
        "applies_igtf": False,
        "requires_reference": True,
        "allow_decimals": True,
        "is_system": True,
        "is_active": True,
        "image_url": "5c4937a497c5",
        "created_at": datetime(2026, 1, 1, 0, 0, 0),
        "updated_at": datetime(2026, 1, 1, 0, 0, 0)
    }
]

@api_router.get("/payment-methods", response_model=List[PaymentMethodResponse])
@api_router.get("/payment-methods/", response_model=List[PaymentMethodResponse])
async def get_payment_methods(active: Optional[bool] = None):
    if active is not None and isinstance(active, bool):
        return [pm for pm in payment_methods_db if pm["is_active"] == active]
    return payment_methods_db


@api_router.get("/payment-methods/{pm_id}", response_model=PaymentMethodResponse)
async def get_payment_method(pm_id: int):
    for pm in payment_methods_db:
        if pm["id"] == pm_id:
            return pm
    raise HTTPException(status_code=404, detail="Método de pago no encontrado.")

@api_router.post("/payment-methods", response_model=PaymentMethodResponse, status_code=status.HTTP_201_CREATED)
@api_router.post("/payment-methods/", response_model=PaymentMethodResponse, status_code=status.HTTP_201_CREATED)
async def create_payment_method(payload: PaymentMethodCreate):
    for pm in payment_methods_db:
        if pm["code"].strip().lower() == payload.code.strip().lower():
            raise HTTPException(status_code=400, detail="El código de método de pago ya existe.")
    
    new_id = max([pm["id"] for pm in payment_methods_db], default=0) + 1
    new_pm = {
        "id": new_id,
        "name": payload.name.strip(),
        "code": payload.code.strip().lower(),
        "currency": payload.currency.strip().upper(),
        "is_digital": payload.is_digital,
        "applies_igtf": payload.applies_igtf,
        "requires_reference": payload.requires_reference,
        "allow_decimals": payload.allow_decimals,
        "is_system": False,
        "is_active": payload.is_active,
        "image_url": payload.image_url,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    payment_methods_db.append(new_pm)
    return new_pm

@api_router.put("/payment-methods/{pm_id}", response_model=PaymentMethodResponse)
async def update_payment_method(pm_id: int, payload: PaymentMethodUpdate):
    for i, pm in enumerate(payment_methods_db):
        if pm["id"] == pm_id:
            if pm.get("is_system", False):
                if payload.image_url is not None and payload.image_url != pm.get("image_url"):
                    raise HTTPException(
                        status_code=400, 
                        detail="Las imágenes de los métodos de pago de sistema son fijas e inmodificables."
                    )
                if payload.is_active is not None:
                    pm["is_active"] = payload.is_active
                if payload.name is not None:
                    pm["name"] = payload.name
                if payload.requires_reference is not None:
                    pm["requires_reference"] = payload.requires_reference
            else:
                data = payload.model_dump(exclude_unset=True)
                if "currency" in data and data["currency"]:
                    data["currency"] = data["currency"].strip().upper()
                pm.update(data)
            
            pm["updated_at"] = datetime.utcnow()
            payment_methods_db[i] = pm
            return pm

    raise HTTPException(status_code=404, detail="Método de pago no encontrado.")

@api_router.delete("/payment-methods/{pm_id}")
async def delete_payment_method(pm_id: int):
    global payment_methods_db
    for i, pm in enumerate(payment_methods_db):
        if pm["id"] == pm_id:
            if pm.get("is_system", False):
                raise HTTPException(status_code=400, detail="No se pueden eliminar métodos de pago del sistema.")
            
            if pm.get("image_url"):
                delete_payment_method_images(pm["image_url"])
                
            deleted = payment_methods_db.pop(i)
            return {"status": "deleted", "id": pm_id, "name": deleted["name"]}

    raise HTTPException(status_code=404, detail="Método de pago no encontrado.")

@api_router.post("/payment-methods/image")
async def upload_payment_method_image(
    file: UploadFile = File(...), 
    old_image_id: Optional[str] = Query(None)
):
    image_url = await save_and_process_payment_method_image(file, old_image_id)
    return {"image_id": image_url, "image_url": image_url}


# --------------------------------------------------------------------------
# Cloudflare R2 Centralized CMS Media Endpoints (Public CDN & Private Presigned)
# --------------------------------------------------------------------------

@api_router.post("/media/upload")
async def upload_cms_media_file(
    file: UploadFile = File(...),
    tenant_id: str = Form("default"),
    category: str = Form("catalog"),  # "catalog", "logos", "banners", "receipts", "audit"
    is_public: bool = Form(True),
    old_key: Optional[str] = Form(None)
):
    """
    Centralized upload pipeline for CMS media files:
    - In-memory validation and WebP compression.
    - Tenant isolation: public/{tenant_id}/{category}/{id}.webp
      or private/{tenant_id}/{id}_{hash}.webp.
    - Cloudflare R2 storage without disk residue.
    """
    return await process_and_upload_image(
        file=file,
        tenant_id=tenant_id,
        category=category,
        is_public=is_public,
        old_file_key=old_key
    )

@api_router.get("/media/presigned-url")
async def get_media_presigned_url(
    key: str = Query(..., description="Key del archivo en bucket R2 (ej. private/{tenant_id}/...)"),
    expires_in: int = Query(900, description="Tiempo de expiración en segundos (por defecto 15 minutos)")
):
    """
    Generates a secure temporary presigned URL for private assets (payment receipts, audit).
    """
    url = storage_service.generate_presigned_url(key=key, expires_in=expires_in)
    return {
        "key": key,
        "presigned_url": url,
        "expires_in_seconds": expires_in
    }

@api_router.delete("/media")
async def delete_cms_media_file(
    key: str = Query(..., description="Key del archivo a eliminar en Cloudflare R2")
):
    """
    Deletes an object by key from Cloudflare R2 bucket.
    """
    success = storage_service.delete_file(key=key)
    return {
        "status": "deleted" if success else "failed",
        "key": key
    }


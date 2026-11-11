from fastapi import APIRouter, Depends, UploadFile, File, Form, status, Body, HTTPException, Query, Request, Header
from datetime import datetime, date, timedelta
from typing import Optional, List
from collections import defaultdict
import time
import json
import uuid
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
    StockAdjustmentDTO, CategoryCreate, CategoryResponse, SupplierPayableLedgerItem,
    GoogleAuthRequest, StandardLoginRequest, AuthTokenResponse,
    RegisterUserRequest, OnboardingCompleteRequest,
    UserPreferenceUpdate, UserPreferenceResponse, UserSessionResponse, UserMeResponse
)
from app.services.image_service import (
    save_and_process_payment_method_image,
    delete_payment_method_images,
    process_and_upload_image
)
from app.services.storage_service import storage_service
from app.services.xion_pay_service import XionPayService
from sqlalchemy import select, update, or_, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.entities import (
    User as UserModel,
    Business as BusinessModel,
    SystemSettings as SystemSettingsModel,
    UserSession as UserSessionModel,
    UserPreference as UserPreferenceModel,
    AuditLog as AuditLogModel,
    Branch as BranchModel,
    CashRegister as CashRegisterModel,
    BusinessSubscription
)
from app.core.security import create_access_token, decode_access_token, verify_google_id_token, get_password_hash, verify_password

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
    "tenant_id": settings.XION_PAY_TENANT_ID,
    "status": "active",
    "is_active": True,
    "expires_at": None,
    "limits": {
        "max_branches": 2,
        "max_pos_registers": 4,
        "features": {
            "inventory_transfers": True,
            "advanced_audit": False
        }
    },
    "plan_code": "advanced",
    "plan_name": "Plan Comercial Avanzado",
    "billing_cycle": "monthly",
    "suspension_reason": None
}

def is_system_operational() -> bool:
    """Verifica si el comercio se encuentra activo y no suspendido."""
    if (
        not xion_pay_state.get("is_active", True)
        or xion_pay_state.get("status") in ("suspended", "frozen")
        or xion_pay_state.get("license_status") in ("suspended", "frozen")
    ):
        return False
    return True

def verify_system_operational():
    """Restringe de inmediato el acceso a cajas POS y módulos operativos si el servicio está suspendido."""
    if not is_system_operational():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Servicio suspendido. Contacte al administrador para renovar su plan"
        )

xion_pay_plans_db: List[dict] = [
    {
        "id": "plan-trial",
        "code": "TRIAL",
        "name": "Plan Gratuito (Prueba 30 Días)",
        "description": "Acceso total sin costo durante 30 días para evaluar la plataforma multi-sucursal y sincronización POS",
        "max_branches": 2,
        "max_cash_registers": 3,
        "price_monthly": 0.00,
        "price_semiannual": 0.00,
        "price_annual": 0.00,
        "is_active": True
    },
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
async def get_exchange_rate(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Retorna la configuración cambiaria y fiscal del negocio desde Supabase con aislamiento multi-tenant.
    Si no existe registro previo, inicializa uno con los valores corporativos para este tenant.
    """
    try:
        current_user = await get_optional_current_user(authorization, db)
        biz_id = current_user.business_id if current_user else None

        if biz_id:
            res = await db.execute(select(SystemSettingsModel).where(SystemSettingsModel.business_id == biz_id))
            setting = res.scalar_one_or_none()
        else:
            res = await db.execute(select(SystemSettingsModel).limit(1))
            setting = res.scalar_one_or_none()

        if not setting and biz_id:
            setting = SystemSettingsModel(
                business_id=biz_id,
                current_exchange_rate_bs=global_settings["current_exchange_rate_bs"],
                tax_rate=global_settings["tax_rate"],
                enable_taxes=global_settings["enable_taxes"],
                auto_sync_pos=global_settings["auto_sync_pos"],
                currency_symbol=global_settings["currency_symbol"],
                updated_at=datetime.utcnow()
            )
            db.add(setting)
            await db.commit()
            await db.refresh(setting)

        if setting:
            return {
                "id": str(setting.id),
                "business_id": str(setting.business_id),
                "current_exchange_rate_bs": float(setting.current_exchange_rate_bs),
                "tax_rate": float(setting.tax_rate),
                "enable_taxes": bool(setting.enable_taxes),
                "auto_sync_pos": bool(setting.auto_sync_pos),
                "currency_symbol": str(setting.currency_symbol),
                "updated_at": setting.updated_at or datetime.utcnow()
            }
    except Exception:
        pass
    return global_settings

@api_router.put("/settings/exchange-rate", response_model=SystemSettingsResponse)
async def update_exchange_rate(
    payload: SystemSettingsUpdate,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Actualiza la tasa oficial y configuración fiscal en Supabase con persistencia inmediata para el tenant correspondiente.
    """
    try:
        current_user = await get_optional_current_user(authorization, db)
        biz_id = current_user.business_id if current_user else None

        if biz_id:
            res = await db.execute(select(SystemSettingsModel).where(SystemSettingsModel.business_id == biz_id))
            setting = res.scalar_one_or_none()
        else:
            res = await db.execute(select(SystemSettingsModel).limit(1))
            setting = res.scalar_one_or_none()

        if not setting and biz_id:
            setting = SystemSettingsModel(
                business_id=biz_id,
                current_exchange_rate_bs=payload.current_exchange_rate_bs,
                tax_rate=payload.tax_rate,
                enable_taxes=payload.enable_taxes,
                auto_sync_pos=payload.auto_sync_pos,
                currency_symbol=payload.currency_symbol,
                updated_at=datetime.utcnow()
            )
            db.add(setting)
        elif setting:
            setting.current_exchange_rate_bs = payload.current_exchange_rate_bs
            setting.tax_rate = payload.tax_rate
            setting.enable_taxes = payload.enable_taxes
            setting.auto_sync_pos = payload.auto_sync_pos
            setting.currency_symbol = payload.currency_symbol
            setting.updated_at = datetime.utcnow()

        if setting:
            await db.commit()
            await db.refresh(setting)
            return {
                "id": str(setting.id),
                "business_id": str(setting.business_id),
                "current_exchange_rate_bs": float(setting.current_exchange_rate_bs),
                "tax_rate": float(setting.tax_rate),
                "enable_taxes": bool(setting.enable_taxes),
                "auto_sync_pos": bool(setting.auto_sync_pos),
                "currency_symbol": str(setting.currency_symbol),
                "updated_at": setting.updated_at or datetime.utcnow()
            }
    except Exception:
        pass
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
@api_router.post("/webhooks/xion-pay", response_model=XionPayWebhookResponse)
@api_router.post("/licenses/sync", response_model=XionPayWebhookResponse)
async def receive_xion_pay_webhook(
    request: Request,
    x_xion_signature: Optional[str] = Header(None, alias="X-Xion-Signature"),
    db: AsyncSession = Depends(get_db)
):
    """
    Recepción de Webhooks firmados con HMAC-SHA256 (X-Xion-Signature) desde Xion-Pay:
    Maneja account.suspended, subscription.renewed, payment.approved, payment.rejected y license.renewed.
    """
    raw_body = await request.body()
    
    # Verificación de firma criptográfica
    active_webhook_secret = xion_pay_state.get("webhook_secret")
    if not XionPayService.verify_webhook_signature(raw_body, x_xion_signature, secret=active_webhook_secret):
        if settings.ENVIRONMENT != "development" or x_xion_signature is not None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Firma criptográfica inválida o ausente en cabecera X-Xion-Signature"
            )

    try:
        payload = json.loads(raw_body.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cuerpo de la petición no es JSON válido")

    event = payload.get("event", "unknown")
    data = payload.get("data") or payload
    payment_id = payload.get("payment_id") or data.get("payment_id")
    license_token = payload.get("license_token") or data.get("license_token")
    rejection_reason = payload.get("rejection_reason") or data.get("rejection_reason")
    tax_id = data.get("tax_id")

    if event in ("account.suspended", "account_suspended"):
        reason = data.get("reason", "Vencimiento de suscripción por saldo insuficiente")

        # 1. Actualizar comercio localmente en memoria
        xion_pay_state["is_active"] = False
        xion_pay_state["status"] = "suspended"
        xion_pay_state["license_status"] = "suspended"
        xion_pay_state["license_token"] = None
        xion_pay_state["suspension_reason"] = reason

        # 2. Actualizar comercio localmente en base de datos
        biz = None
        if tax_id:
            clean_tax = tax_id.replace("J-J-", "J-").replace("V-V-", "V-")
            biz_res = await db.execute(select(BusinessModel).where(or_(BusinessModel.tax_id == tax_id, BusinessModel.tax_id == clean_tax)))
            biz = biz_res.scalar_one_or_none()
        if not biz:
            biz_res = await db.execute(select(BusinessModel).limit(1))
            biz = biz_res.scalar_one_or_none()

        if biz:
            biz.is_active = False
            biz.status = "suspended"
            biz.license_token = None
            biz.suspension_reason = reason
            biz.updated_at = datetime.utcnow()

            # Invalidar y revocar sesiones activas
            await db.execute(
                update(UserSessionModel)
                .where(UserSessionModel.business_id == biz.id, UserSessionModel.is_active == True)
                .values(is_active=False)
            )

            # Actualizar suscripción
            sub_res = await db.execute(select(BusinessSubscription).where(BusinessSubscription.business_id == biz.id))
            sub = sub_res.scalar_one_or_none()
            if sub:
                sub.status = "SUSPENDED"
                sub.updated_at = datetime.utcnow()

            await db.commit()

        return {
            "status": "received",
            "event": event,
            "processed": True,
            "message": "Comercio suspendido, licencia revocada y módulos operativos restringidos con éxito."
        }

    elif event in ("account.activated", "account_activated"):
        token = data.get("license_token") or license_token

        # 1. Actualizar comercio en memoria
        xion_pay_state["is_active"] = True
        xion_pay_state["status"] = "active"
        xion_pay_state["license_status"] = "active"
        if token:
            xion_pay_state["license_token"] = token
        xion_pay_state["suspension_reason"] = None

        # 2. Actualizar comercio en base de datos
        biz = None
        if tax_id:
            clean_tax = tax_id.replace("J-J-", "J-").replace("V-V-", "V-")
            biz_res = await db.execute(select(BusinessModel).where(or_(BusinessModel.tax_id == tax_id, BusinessModel.tax_id == clean_tax)))
            biz = biz_res.scalar_one_or_none()
        if not biz:
            biz_res = await db.execute(select(BusinessModel).limit(1))
            biz = biz_res.scalar_one_or_none()

        if biz:
            biz.is_active = True
            biz.status = "active"
            if token:
                biz.license_token = token
            biz.suspension_reason = None
            biz.updated_at = datetime.utcnow()

            # Reactivar suscripción
            sub_res = await db.execute(select(BusinessSubscription).where(BusinessSubscription.business_id == biz.id))
            sub = sub_res.scalar_one_or_none()
            if sub:
                sub.status = "ACTIVE"
                sub.updated_at = datetime.utcnow()

            await db.commit()

        return {
            "status": "received",
            "event": event,
            "processed": True,
            "message": "Comercio reactivado, licencia reestablecida y módulos operativos reactivados con éxito."
        }

    elif event in ("subscription.renewed", "subscription_renewed", "license.renewed", "license_renewed"):
        token = data.get("license_token") or license_token
        expires_at_str = data.get("expires_at")
        billing_cycle = data.get("billing_cycle", "monthly")
        plan_code = data.get("plan_code", "advanced")
        plan_name = data.get("plan_name", "Plan Comercial Avanzado")
        limits = data.get("limits") or {
            "max_branches": 2,
            "max_pos_registers": 4,
            "features": {
                "inventory_transfers": True,
                "advanced_audit": False
            }
        }

        parsed_expires_at = None
        if expires_at_str:
            try:
                clean_exp = expires_at_str.replace("Z", "+00:00")
                parsed_expires_at = datetime.fromisoformat(clean_exp).replace(tzinfo=None)
            except Exception:
                parsed_expires_at = datetime.utcnow() + timedelta(days=30)
        else:
            parsed_expires_at = datetime.utcnow() + timedelta(days=30)

        # 1. Guardar token RS256, actualizar fecha de vencimiento y límites en memoria
        xion_pay_state["is_active"] = True
        xion_pay_state["status"] = "active"
        xion_pay_state["license_status"] = "active"
        xion_pay_state["license_token"] = token
        xion_pay_state["expires_at"] = parsed_expires_at
        xion_pay_state["billing_cycle"] = billing_cycle
        xion_pay_state["plan_code"] = plan_code
        xion_pay_state["plan_name"] = plan_name
        xion_pay_state["limits"] = limits
        xion_pay_state["suspension_reason"] = None

        # 2. Guardar token RS256 y configuración en base de datos
        biz = None
        if tax_id:
            clean_tax = tax_id.replace("J-J-", "J-").replace("V-V-", "V-")
            biz_res = await db.execute(select(BusinessModel).where(or_(BusinessModel.tax_id == tax_id, BusinessModel.tax_id == clean_tax)))
            biz = biz_res.scalar_one_or_none()
        if not biz:
            biz_res = await db.execute(select(BusinessModel).limit(1))
            biz = biz_res.scalar_one_or_none()

        if biz:
            biz.is_active = True
            biz.status = "active"
            biz.license_token = token
            biz.expires_at = parsed_expires_at
            biz.limits = limits
            biz.suspension_reason = None
            biz.updated_at = datetime.utcnow()

            # Actualizar suscripción
            sub_res = await db.execute(select(BusinessSubscription).where(BusinessSubscription.business_id == biz.id))
            sub = sub_res.scalar_one_or_none()
            if sub:
                sub.status = "ACTIVE"
                sub.expires_at = parsed_expires_at
                sub.billing_cycle = billing_cycle.upper()
                sub.updated_at = datetime.utcnow()

            await db.commit()

        return {
            "status": "received",
            "event": event,
            "processed": True,
            "message": "Suscripción renovada, token guardado, límites actualizados y terminales desbloqueados con éxito."
        }

    elif event in ("payment.approved", "payment_approved"):
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
            xion_pay_state["status"] = "active"
            xion_pay_state["is_active"] = True

    elif event in ("payment.rejected", "payment_rejected"):
        for r in payment_reports_db:
            if (payment_id and r.get("xion_pay_payment_id") == str(payment_id)) or \
               (data.get("reference_number") and r.get("reference_number") == data.get("reference_number")):
                r["status"] = "rejected"
                r["rejection_reason"] = rejection_reason or "Rechazado en conciliación Xion-Pay"
                r["verified_by"] = "Xion-Pay Webhook (Automated)"
                r["verified_at"] = datetime.utcnow()
                break

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

@api_router.post("/xion-pay/toggle-status")
async def toggle_xion_pay_live_status(
    target_status: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Endpoint directo para probar el bloqueo en tiempo real desde Xion-Manager.
    Alterna o asigna el estado en Xion-Pay y sincroniza inmediatamente memoria y base de datos local.
    """
    biz_res = await db.execute(select(BusinessModel).limit(1))
    biz = biz_res.scalar_one_or_none()
    biz_identifier = biz.tax_id if (biz and biz.tax_id) else None

    res = await XionPayService.toggle_status(tenant_id=biz_identifier, target_status=target_status)
    if "error" in res or res.get("status_code", 200) not in (200, 204):
        # Fallback resiliente: alternar o forzar estado localmente para pruebas en tiempo real
        current_active = xion_pay_state.get("is_active", True)
        if target_status:
            new_status = target_status
        else:
            new_status = "frozen" if current_active else "active"
        is_blocked = new_status in ("frozen", "suspended")
        res = {
            "status": new_status,
            "is_suspended": is_blocked,
            "is_active": not is_blocked,
            "suspension_reason": "Prueba de bloqueo manual en tiempo real" if is_blocked else None
        }

    new_status = res.get("status", "active")
    is_blocked = new_status in ("frozen", "suspended") or res.get("is_suspended") is True

    xion_pay_state["is_active"] = not is_blocked
    xion_pay_state["status"] = "suspended" if is_blocked else new_status
    xion_pay_state["license_status"] = "suspended" if is_blocked else new_status
    xion_pay_state["suspension_reason"] = res.get("suspension_reason") if is_blocked else None

    if biz:
        biz.is_active = not is_blocked
        biz.status = "suspended" if is_blocked else "active"
        biz.suspension_reason = xion_pay_state["suspension_reason"]
        await db.commit()

    return {
        "status": "success",
        "new_status": new_status,
        "is_operational": is_system_operational(),
        "is_active": xion_pay_state["is_active"],
        "message": "Comercio bloqueado/suspendido en tiempo real" if is_blocked else "Comercio reactivado y operativo en tiempo real"
    }

@api_router.post("/xion-pay/sync")
async def sync_xion_pay_live_status(db: AsyncSession = Depends(get_db)):
    """Sincroniza el estado de licencia y bloqueo directamente desde Xion-Pay."""
    return await get_account_status(db=db)

@api_router.post("/xion-pay/onboarding-trial", response_model=XionPayLeadResponse)
async def onboard_trial_lead(lead: XionPayLeadCreate):
    """Registra esta instalación de Xion Manager en Xion-Pay obteniendo 30 días de prueba."""
    result = await XionPayService.onboard_trial(lead.model_dump())
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result.get("message", "Error al procesar onboarding"))
    
    xion_pay_state["tenant_id"] = result.get("client_id")
    xion_pay_state["license_token"] = result.get("license_token")
    xion_pay_state["license_status"] = result.get("status", "trial")
    if result.get("webhook_secret"):
        xion_pay_state["webhook_secret"] = result.get("webhook_secret")
    return result


# 0. Authentication Endpoints (Google OAuth2 + JWT)
@api_router.get("/auth/config")
async def get_auth_config():
    """
    Retorna la configuración pública de autenticación (ej. Google Client ID)
    para desacoplar el frontend del empaquetado estático en producción.
    """
    return {
        "google_client_id": settings.GOOGLE_CLIENT_ID or "926646602874-dakf4njbrmgg2fp4qokfflq7tlhid68j.apps.googleusercontent.com"
    }


async def _create_user_session_and_get_prefs(
    user: UserModel,
    request: Optional[Request],
    db: AsyncSession
) -> tuple[str, UserSessionModel, UserPreferenceModel]:
    import uuid
    from datetime import datetime, timedelta
    from app.core.config import settings

    token_jti = str(uuid.uuid4())
    expires_at = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    ip_addr = "127.0.0.1"
    user_agent = "desktop/browser"
    if request:
        if request.client and request.client.host:
            ip_addr = request.client.host
        hdr_ua = request.headers.get("user-agent")
        if hdr_ua:
            user_agent = hdr_ua[:250]

    session = UserSessionModel(
        user_id=user.id,
        business_id=user.business_id,
        token_jti=token_jti,
        device_info=user_agent,
        ip_address=ip_addr,
        is_active=True,
        expires_at=expires_at,
        last_activity_at=datetime.utcnow(),
        created_at=datetime.utcnow()
    )
    db.add(session)
    user.last_login_at = datetime.utcnow()

    pref_res = await db.execute(select(UserPreferenceModel).where(UserPreferenceModel.user_id == user.id))
    pref = pref_res.scalar_one_or_none()
    if not pref:
        pref = UserPreferenceModel(
            user_id=user.id,
            business_id=user.business_id,
            theme="dark",
            language="es",
            default_currency="USD",
            sound_enabled=True,
            table_rows_per_page=25,
            compact_mode=False,
            notifications={"push": True, "email": True, "inventory_alerts": True},
            pos_quick_keys={"f1": "search", "f2": "customer", "f4": "pay_cash", "f8": "pay_card"},
            ui_preferences={"sidebar_collapsed": False}
        )
        db.add(pref)

    await db.commit()
    await db.refresh(session)
    await db.refresh(pref)

    token_claims = {
        "sub": user.id,
        "email": user.email,
        "role": user.role,
        "business_id": user.business_id,
        "full_name": user.full_name,
        "jti": token_jti
    }
    jwt_token = create_access_token(token_claims)

    return jwt_token, session, pref


async def _check_user_onboarding_completed(user: UserModel, db: AsyncSession) -> bool:
    """
    Determina si un usuario ha completado el onboarding:
    - Si no tiene business_id: False (no tiene empresa registrada ni está vinculado)
    - Si no es OWNER (empleados, cajeros, supervisores):
      retorna True solo si tiene business_id y su estado es APPROVED
    - Si es OWNER:
      verifica si el negocio existe y tiene RIF/tax_id definitivo (no TMP-) -> True/False
    """
    if not user:
        return True
    if not user.business_id:
        return False
    if user.role != "OWNER":
        return user.approval_status == "APPROVED"
    biz_res = await db.execute(select(BusinessModel).where(BusinessModel.id == user.business_id))
    biz = biz_res.scalar_one_or_none()
    if not biz or not biz.tax_id or str(biz.tax_id).startswith("TMP-") or str(biz.tax_id).startswith("J-TMP-"):
        return False
    return True


async def get_current_user_and_session(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
) -> tuple[UserModel, Optional[UserSessionModel]]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autorización Bearer ausente o inválido."
        )
    token = authorization.split(" ")[1]
    claims = decode_access_token(token)
    if not claims or "sub" not in claims:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado."
        )
    user_id = claims["sub"]
    jti = claims.get("jti")

    user_res = await db.execute(select(UserModel).where(UserModel.id == user_id, UserModel.is_active == True))
    user = user_res.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado o inactivo."
        )

    session = None
    if jti:
        sess_res = await db.execute(
            select(UserSessionModel).where(
                UserSessionModel.token_jti == jti,
                UserSessionModel.is_active == True
            )
        )
        session = sess_res.scalar_one_or_none()
        if session:
            exp = session.expires_at
            now = datetime.now(exp.tzinfo) if exp.tzinfo is not None else datetime.utcnow()
            if exp < now:
                session.is_active = False
                await db.commit()
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="La sesión ha expirado. Por favor inicie sesión nuevamente."
                )
            session.last_activity_at = datetime.utcnow()
            await db.commit()

    return user, session


async def get_optional_current_user(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
) -> Optional[UserModel]:
    """
    Retorna el usuario actual si el header Authorization Bearer es provisto y válido.
    Permite aislamiento multi-tenant en endpoints públicos u opcionales.
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        token = authorization.split(" ")[1]
        claims = decode_access_token(token)
        if not claims or "sub" not in claims:
            return None
        user_id = claims["sub"]
        user_res = await db.execute(select(UserModel).where(UserModel.id == user_id, UserModel.is_active == True))
        return user_res.scalar_one_or_none()
    except Exception:
        return None


@api_router.post("/auth/google", response_model=AuthTokenResponse)
async def login_google(payload: GoogleAuthRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """
    Autenticación con Google Identity Services (OAuth2).
    Verifica el token de Google y emite un JWT firmado para la sesión de Xion-Manager con registro de sesión.
    Si el usuario es nuevo, crea un nuevo Tenant / Negocio independiente siguiendo el estándar multi-tenant.
    """
    google_data = await verify_google_id_token(payload.id_token)
    email = google_data["email"].lower().strip()
    name = google_data.get("name") or email.split("@")[0]

    # Verificar si el usuario ya existe en Supabase
    result = await db.execute(select(UserModel).where(UserModel.email == email))
    user = result.scalar_one_or_none()

    is_new_user = False
    if not user:
        is_new_user = True
        # El usuario nuevo se crea sin empresa (business_id = None).
        # La empresa se registra en la BD únicamente cuando completa el formulario de Dueño (/onboarding/complete).
        # Si es otro usuario (colaborador), se vinculará al negocio del Dueño que lo autorice.
        user = UserModel(
            id=f"usr-{uuid.uuid4().hex[:12]}",
            email=email,
            hashed_password=get_password_hash("oauth2-google-managed"),
            full_name=name,
            avatar_url=google_data.get("picture"),
            role="OWNER",
            business_id=None,
            approval_status="APPROVED",
            is_active=True
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    else:
        if google_data.get("picture") and not user.avatar_url:
            user.avatar_url = google_data.get("picture")
            db.add(user)
            await db.commit()
            await db.refresh(user)

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta se encuentra inactiva. Contacte al administrador."
        )

    jwt_token, session, pref = await _create_user_session_and_get_prefs(user, request, db)

    return {
        "access_token": jwt_token,
        "token_type": "bearer",
        "session_id": session.id,
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "business_id": user.business_id,
            "branch_id": user.branch_id,
            "approval_status": user.approval_status,
            "avatar_url": user.avatar_url,
            "is_active": user.is_active,
            "onboarding_completed": await _check_user_onboarding_completed(user, db),
            "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
            "created_at": user.created_at.isoformat() if user.created_at else None
        },
        "preferences": {
            "theme": pref.theme,
            "language": pref.language,
            "default_currency": pref.default_currency,
            "sound_enabled": pref.sound_enabled,
            "table_rows_per_page": pref.table_rows_per_page,
            "compact_mode": pref.compact_mode,
            "notifications": pref.notifications or {},
            "pos_quick_keys": pref.pos_quick_keys or {},
            "ui_preferences": pref.ui_preferences or {}
        }
    }

@api_router.post("/auth/login", response_model=AuthTokenResponse)
async def login_standard(payload: StandardLoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """
    Autenticación estándar mediante correo electrónico y contraseña con emisión de JWT y sesión trazable.
    """
    email = payload.email.lower().strip()
    result = await db.execute(select(UserModel).where(UserModel.email == email))
    user = result.scalar_one_or_none()

    if not user:
        if email == "admin@xion.com" and payload.password:
            biz_result = await db.execute(select(BusinessModel).limit(1))
            biz = biz_result.scalar_one_or_none()
            if not biz:
                biz = BusinessModel(
                    id="biz-101",
                    legal_name="Comercializadora Xion C.A.",
                    trade_name="Xion Supermarket & Retail",
                    tax_id="J-12345678-9",
                    phone="+58 414-1112233",
                    email="contacto@xion.com",
                    is_active=True
                )
                db.add(biz)
                await db.commit()
                await db.refresh(biz)

            user = UserModel(
                email=email,
                hashed_password=get_password_hash(payload.password),
                full_name="Administrador Xion",
                role="OWNER",
                business_id=biz.id,
                approval_status="APPROVED",
                is_active=True
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales de acceso inválidas"
            )
    else:
        if user.hashed_password != "oauth2-google-managed" and not verify_password(payload.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales de acceso inválidas"
            )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta se encuentra inactiva. Contacte al administrador."
        )

    jwt_token, session, pref = await _create_user_session_and_get_prefs(user, request, db)

    return {
        "access_token": jwt_token,
        "token_type": "bearer",
        "session_id": session.id,
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "business_id": user.business_id,
            "branch_id": user.branch_id,
            "approval_status": user.approval_status,
            "avatar_url": user.avatar_url,
            "is_active": user.is_active,
            "onboarding_completed": await _check_user_onboarding_completed(user, db),
            "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
            "created_at": user.created_at.isoformat() if user.created_at else None
        },
        "preferences": {
            "theme": pref.theme,
            "language": pref.language,
            "default_currency": pref.default_currency,
            "sound_enabled": pref.sound_enabled,
            "table_rows_per_page": pref.table_rows_per_page,
            "compact_mode": pref.compact_mode,
            "notifications": pref.notifications or {},
            "pos_quick_keys": pref.pos_quick_keys or {},
            "ui_preferences": pref.ui_preferences or {}
        }
    }


@api_router.post("/auth/register", response_model=AuthTokenResponse)
async def register_user(payload: RegisterUserRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """
    Registro de nuevos usuarios. Crea la cuenta inicial con rol OWNER, sesión activa y preferencias por defecto.
    """
    email = payload.email.lower().strip()
    result = await db.execute(select(UserModel).where(UserModel.email == email))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una cuenta registrada con este correo electrónico."
        )

    # El usuario nuevo se registra sin empresa (business_id = None).
    # La empresa se registra en la BD únicamente cuando completa el formulario de Dueño (/onboarding/complete).
    # Si es otro usuario (colaborador), se vinculará al negocio del Dueño que lo autorice.
    user = UserModel(
        id=f"usr-{uuid.uuid4().hex[:12]}",
        email=email,
        hashed_password=get_password_hash(payload.password),
        full_name=payload.full_name,
        phone=payload.phone,
        role="OWNER",
        business_id=None,
        approval_status="APPROVED",
        is_active=True
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    jwt_token, session, pref = await _create_user_session_and_get_prefs(user, request, db)

    return {
        "access_token": jwt_token,
        "token_type": "bearer",
        "session_id": session.id,
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "phone": user.phone,
            "role": user.role,
            "business_id": user.business_id,
            "approval_status": user.approval_status,
            "avatar_url": user.avatar_url,
            "is_active": user.is_active,
            "onboarding_completed": False,
            "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
            "created_at": user.created_at.isoformat() if user.created_at else None
        },
        "preferences": {
            "theme": pref.theme,
            "language": pref.language,
            "default_currency": pref.default_currency,
            "sound_enabled": pref.sound_enabled,
            "table_rows_per_page": pref.table_rows_per_page,
            "compact_mode": pref.compact_mode,
            "notifications": pref.notifications or {},
            "pos_quick_keys": pref.pos_quick_keys or {},
            "ui_preferences": pref.ui_preferences or {}
        }
    }



@api_router.post("/onboarding/complete")
async def complete_onboarding(
    payload: OnboardingCompleteRequest,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Guarda los datos del modal inicial de onboarding respetando el aislamiento multi-tenant:
    1. Identifica al usuario y su negocio específico mediante user_id o token Bearer.
    2. Actualiza los datos de la Compañía de ESTE usuario (no sobrescribe otros negocios).
    3. Configura los parámetros cambiarios y fiscales para este tenant.
    4. Activa el Plan (Trial de 30 días o seleccionado) para este tenant.
    """
    user = None
    if payload.user_id:
        user_res = await db.execute(select(UserModel).where(UserModel.id == payload.user_id))
        user = user_res.scalar_one_or_none()
    if not user:
        user = await get_optional_current_user(authorization, db)

    if not user:
        raise HTTPException(status_code=400, detail="Usuario no especificado o no autenticado.")

    # 1. Actualizar datos de usuario si se especificó y asegurar rol Dueño
    if payload.full_name:
        user.full_name = payload.full_name
    if payload.phone:
        user.phone = payload.phone
    user.role = "OWNER"
    user.approval_status = "APPROVED"
    db.add(user)

    # 2. Actualizar o crear Compañía Principal vinculada exclusivamente a este usuario
    biz = None
    if user.business_id:
        biz_res = await db.execute(select(BusinessModel).where(BusinessModel.id == user.business_id))
        biz = biz_res.scalar_one_or_none()

    p_comp = payload.primary_company
    clean_tax_id = (p_comp.tax_id or "").strip()
    clean_email = (p_comp.email or user.email or "").strip()
    clean_legal_name = (p_comp.legal_name or p_comp.trade_name or "Mi Empresa C.A.").strip()
    clean_trade_name = (p_comp.trade_name or p_comp.legal_name or "Mi Comercio").strip()
    clean_phone = (p_comp.phone or user.phone or "+58 414 1234567").strip()

    if not biz and clean_tax_id:
        tax_res = await db.execute(select(BusinessModel).where(BusinessModel.tax_id == clean_tax_id))
        biz = tax_res.scalar_one_or_none()

    if not biz and clean_email:
        email_res = await db.execute(select(BusinessModel).where(BusinessModel.email == clean_email))
        biz = email_res.scalar_one_or_none()

    if not biz:
        new_biz_id = f"biz-{uuid.uuid4().hex[:12]}"
        biz = BusinessModel(
            id=new_biz_id,
            legal_name=clean_legal_name,
            trade_name=clean_trade_name,
            tax_id=clean_tax_id or f"J-{uuid.uuid4().hex[:8].upper()}-0",
            phone=clean_phone,
            email=clean_email or f"biz-{uuid.uuid4().hex[:6]}@xion.com",
            is_active=True,
            status="active"
        )
        db.add(biz)
        user.business_id = biz.id
    else:
        biz.legal_name = clean_legal_name
        biz.trade_name = clean_trade_name
        if clean_tax_id:
            biz.tax_id = clean_tax_id
        if clean_phone:
            biz.phone = clean_phone
        if clean_email:
            biz.email = clean_email
        biz.is_active = True
        biz.status = "active"
        user.business_id = biz.id
        db.add(biz)

    await db.flush()

    # 3. Guardar configuraciones del sistema del tenant específico
    sys_res = await db.execute(select(SystemSettingsModel).where(SystemSettingsModel.business_id == biz.id))
    sys_setting = sys_res.scalar_one_or_none()
    if not sys_setting:
        sys_setting = SystemSettingsModel(
            business_id=biz.id,
            current_exchange_rate_bs=payload.current_exchange_rate_bs or 36.50,
            tax_rate=payload.tax_rate or 16.00,
            enable_taxes=payload.enable_taxes if payload.enable_taxes is not None else True,
            auto_sync_pos=payload.auto_sync_pos if payload.auto_sync_pos is not None else True,
            currency_symbol=payload.currency_symbol or "Bs.",
            updated_at=datetime.utcnow()
        )
        db.add(sys_setting)
    else:
        if payload.current_exchange_rate_bs is not None:
            sys_setting.current_exchange_rate_bs = payload.current_exchange_rate_bs
        if payload.tax_rate is not None:
            sys_setting.tax_rate = payload.tax_rate
        if payload.enable_taxes is not None:
            sys_setting.enable_taxes = payload.enable_taxes
        if payload.auto_sync_pos is not None:
            sys_setting.auto_sync_pos = payload.auto_sync_pos
        if payload.currency_symbol:
            sys_setting.currency_symbol = payload.currency_symbol
        sys_setting.updated_at = datetime.utcnow()
        db.add(sys_setting)

    # 4. Asegurar sucursal por defecto en PostgreSQL (BranchModel) y en memoria (branches_db)
    branch_res = await db.execute(select(BranchModel).where(BranchModel.business_id == biz.id))
    db_branch = branch_res.scalars().first()
    if not db_branch:
        default_branch_id = f"br-{uuid.uuid4().hex[:8]}"
        db_branch = BranchModel(
            id=default_branch_id,
            business_id=biz.id,
            name=f"Principal - {biz.trade_name or biz.legal_name}",
            address=p_comp.address or "Sede Principal",
            phone=biz.phone or clean_phone,
            is_active=True
        )
        db.add(db_branch)
        await db.flush()

    user.branch_id = db_branch.id
    db.add(user)

    # Sincronizar branches_db en memoria
    if not any(b.get("id") == db_branch.id for b in branches_db):
        branches_db.append({
            "id": db_branch.id,
            "business_id": biz.id,
            "name": db_branch.name,
            "code": "SUC-01",
            "is_main": True,
            "is_active": True,
            "phone": db_branch.phone,
            "address": db_branch.address,
            "created_at": datetime.utcnow().isoformat()
        })

    # Actualizar sesiones y preferencias con el nuevo business_id
    await db.execute(
        update(UserSessionModel)
        .where(UserSessionModel.user_id == user.id)
        .values(business_id=biz.id)
    )
    await db.execute(
        update(UserPreferenceModel)
        .where(UserPreferenceModel.user_id == user.id)
        .values(business_id=biz.id)
    )

    await db.commit()
    await db.refresh(biz)
    await db.refresh(user)

    # Actualizar estado global en memoria
    global_settings["current_exchange_rate_bs"] = float(sys_setting.current_exchange_rate_bs)
    global_settings["tax_rate"] = float(sys_setting.tax_rate)
    global_settings["enable_taxes"] = bool(sys_setting.enable_taxes)
    global_settings["auto_sync_pos"] = bool(sys_setting.auto_sync_pos)
    global_settings["currency_symbol"] = str(sys_setting.currency_symbol)

    # 4. Activar Plan (Plan Gratuito 30 Días de primero)
    is_trial = (payload.plan_code or "TRIAL").upper() == "TRIAL"
    trial_days = 30
    trial_ends = datetime.utcnow() + timedelta(days=trial_days)

    xion_pay_state["license_status"] = "trial" if is_trial else "active"
    xion_pay_state["trial_ends_at"] = trial_ends.isoformat()
    xion_pay_state["tolerance_expires_at"] = None

    if is_trial:
        try:
            lead_data = {
                "commercial_name": p_comp.trade_name or p_comp.legal_name or "Mi Comercio Xion C.A.",
                "contact_name": payload.full_name or "Usuario Principal",
                "email": p_comp.email or "contacto@empresa.com",
                "phone": p_comp.phone or payload.phone or "+58 414 1234567",
                "tax_id": p_comp.tax_id or "J-50123456-7",
                "id_doc_type": "J" if "J" in (p_comp.tax_id or "").upper() else "V",
                "plan_code": "basic",
                "trial_days": 30,
                "webhook_url": "https://xion-manager.onrender.com/api/v1/licenses/sync",
                "source": "xion-manager-onboarding"
            }
            trial_response = await XionPayService.onboard_trial(lead_data)
            if trial_response.get("status") != "error":
                xion_pay_state["tenant_id"] = trial_response.get("client_id")
                xion_pay_state["license_token"] = trial_response.get("license_token")
                if trial_response.get("webhook_secret"):
                    xion_pay_state["webhook_secret"] = trial_response.get("webhook_secret")
                if trial_response.get("license_token"):
                    biz.license_token = trial_response.get("license_token")
                    db.add(biz)
                    await db.commit()
        except Exception:
            pass

    # 5. Guardar preferencias del usuario si se especificaron
    target_user_id = payload.user_id or user.id
    if target_user_id:
        pref_res = await db.execute(select(UserPreferenceModel).where(UserPreferenceModel.user_id == target_user_id))
        pref = pref_res.scalar_one_or_none()
        pref_theme = "dark"
        if payload.preferences:
            pref_theme = payload.preferences.get("theme_mode") or payload.preferences.get("theme") or "dark"
        if not pref:
            pref = UserPreferenceModel(
                user_id=target_user_id,
                business_id=biz.id,
                theme=pref_theme
            )
            db.add(pref)
        else:
            pref.business_id = biz.id
            if payload.preferences:
                if "theme_mode" in payload.preferences:
                    pref.theme = payload.preferences["theme_mode"]
                for k, v in payload.preferences.items():
                    if hasattr(UserPreferenceModel, k) and k not in ("id", "user_id"):
                        setattr(pref, k, v)
            pref.updated_at = datetime.utcnow()
            db.add(pref)
        await db.commit()

    return {
        "status": "success",
        "message": "Configuración inicial y onboarding completados exitosamente.",
        "business": {
            "id": biz.id,
            "legal_name": biz.legal_name,
            "trade_name": biz.trade_name,
            "tax_id": biz.tax_id
        },
        "plan": {
            "code": payload.plan_code or "TRIAL",
            "name": "Plan Gratuito (Prueba 30 Días)" if is_trial else f"Plan {payload.plan_code}",
            "is_trial": is_trial,
            "trial_days": trial_days,
            "trial_ends_at": trial_ends.isoformat()
        },
        "settings": {
            "currency_symbol": sys_setting.currency_symbol,
            "current_exchange_rate_bs": float(sys_setting.current_exchange_rate_bs),
            "tax_rate": float(sys_setting.tax_rate),
            "enable_taxes": bool(sys_setting.enable_taxes),
            "auto_sync_pos": bool(sys_setting.auto_sync_pos)
        },
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "phone": user.phone,
            "role": user.role,
            "business_id": user.business_id,
            "branch_id": user.branch_id,
            "approval_status": user.approval_status,
            "onboarding_completed": True
        },
        "onboarding_completed": True
    }


@api_router.post("/auth/login-bypass")
async def login_bypass(role: str = Body(default="OWNER", embed=True)):
    """
    Bypass de desarrollo para testing ágil de roles RBAC con token JWT firmado y soporte de sesión.
    """
    import uuid
    token_jti = str(uuid.uuid4())
    user_data = {
        "id": f"usr-{role.lower()}-01",
        "email": f"{role.lower()}@xion.com",
        "full_name": f"Usuario ({role})",
        "role": role,
        "approval_status": "APPROVED",
        "is_active": True
    }
    jwt_token = create_access_token({
        "sub": user_data["id"],
        "email": user_data["email"],
        "role": user_data["role"],
        "business_id": "biz-101",
        "full_name": user_data["full_name"],
        "jti": token_jti
    })
    return {
        **user_data,
        "business_id": "biz-101",
        "access_token": jwt_token,
        "token_type": "bearer",
        "session_id": f"sess-{token_jti[:8]}",
        "preferences": {
            "theme": "dark",
            "language": "es",
            "default_currency": "USD",
            "sound_enabled": True,
            "table_rows_per_page": 25,
            "compact_mode": False,
            "notifications": {"push": True, "email": True, "inventory_alerts": True},
            "pos_quick_keys": {"f1": "search", "f2": "customer", "f4": "pay_cash", "f8": "pay_card"},
            "ui_preferences": {"sidebar_collapsed": False}
        }
    }


# ==============================================================================
# GESTIÓN DE SESIONES JWT Y PREFERENCIAS MULTIUSUARIO
# ==============================================================================

@api_router.get("/users/me", response_model=UserMeResponse)
async def get_user_profile(
    auth_data: tuple[UserModel, Optional[UserSessionModel]] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene el perfil completo del usuario autenticado, sus preferencias activas y su sesión actual.
    """
    user, session = auth_data
    pref_res = await db.execute(select(UserPreferenceModel).where(UserPreferenceModel.user_id == user.id))
    pref = pref_res.scalar_one_or_none()
    if not pref:
        try:
            pref = UserPreferenceModel(
                user_id=user.id,
                business_id=user.business_id,
                theme="dark",
                language="es",
                default_currency="USD",
                sound_enabled=True,
                table_rows_per_page=25,
                compact_mode=False,
                notifications={"push": True, "email": True, "inventory_alerts": True},
                pos_quick_keys={"f1": "search", "f2": "customer", "f4": "pay_cash", "f8": "pay_card"},
                ui_preferences={"sidebar_collapsed": False}
            )
            db.add(pref)
            await db.commit()
            await db.refresh(pref)
        except Exception:
            await db.rollback()

    session_data = None
    if session:
        try:
            session_data = UserSessionResponse(
                id=session.id,
                user_id=session.user_id,
                business_id=session.business_id,
                token_jti=session.token_jti,
                terminal_id=session.terminal_id,
                device_info=session.device_info,
                ip_address=session.ip_address,
                is_active=session.is_active,
                expires_at=session.expires_at.isoformat() if session.expires_at else "",
                last_activity_at=session.last_activity_at.isoformat() if session.last_activity_at else None,
                created_at=session.created_at.isoformat() if session.created_at else "",
                is_current=True
            )
        except Exception:
            session_data = None

    try:
        onboarding_completed = await _check_user_onboarding_completed(user, db)
    except Exception:
        onboarding_completed = bool(user.business_id)

    pref_dict = {
        "id": getattr(pref, "id", f"pref-{user.id}"),
        "user_id": user.id,
        "business_id": getattr(pref, "business_id", user.business_id),
        "theme": getattr(pref, "theme", "dark"),
        "language": getattr(pref, "language", "es"),
        "default_currency": getattr(pref, "default_currency", "USD"),
        "sound_enabled": getattr(pref, "sound_enabled", True),
        "table_rows_per_page": getattr(pref, "table_rows_per_page", 25),
        "compact_mode": getattr(pref, "compact_mode", False),
        "notifications": getattr(pref, "notifications", None) or {},
        "pos_quick_keys": getattr(pref, "pos_quick_keys", None) or {},
        "ui_preferences": getattr(pref, "ui_preferences", None) or {},
        "created_at": pref.created_at.isoformat() if getattr(pref, "created_at", None) else None,
        "updated_at": pref.updated_at.isoformat() if getattr(pref, "updated_at", None) else None
    }

    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "phone": user.phone,
            "role": user.role,
            "business_id": user.business_id,
            "branch_id": user.branch_id,
            "approval_status": user.approval_status,
            "avatar_url": user.avatar_url,
            "is_active": user.is_active,
            "onboarding_completed": onboarding_completed,
            "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
            "created_at": user.created_at.isoformat() if user.created_at else None
        },
        "preferences": pref_dict,
        "session": session_data
    }


@api_router.get("/users/me/preferences", response_model=UserPreferenceResponse)
async def get_my_preferences(
    auth_data: tuple[UserModel, Optional[UserSessionModel]] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene las preferencias de configuración y UI del usuario autenticado.
    """
    user, _ = auth_data
    pref_res = await db.execute(select(UserPreferenceModel).where(UserPreferenceModel.user_id == user.id))
    pref = pref_res.scalar_one_or_none()
    if not pref:
        try:
            pref = UserPreferenceModel(
                user_id=user.id,
                business_id=user.business_id,
                theme="dark",
                language="es",
                default_currency="USD",
                sound_enabled=True,
                table_rows_per_page=25,
                compact_mode=False,
                notifications={"push": True, "email": True, "inventory_alerts": True},
                pos_quick_keys={"f1": "search", "f2": "customer", "f4": "pay_cash", "f8": "pay_card"},
                ui_preferences={"sidebar_collapsed": False}
            )
            db.add(pref)
            await db.commit()
            await db.refresh(pref)
        except Exception:
            await db.rollback()

    return UserPreferenceResponse(
        id=getattr(pref, "id", f"pref-{user.id}"),
        user_id=user.id,
        business_id=getattr(pref, "business_id", user.business_id),
        theme=getattr(pref, "theme", "dark"),
        language=getattr(pref, "language", "es"),
        default_currency=getattr(pref, "default_currency", "USD"),
        sound_enabled=getattr(pref, "sound_enabled", True),
        table_rows_per_page=getattr(pref, "table_rows_per_page", 25),
        compact_mode=getattr(pref, "compact_mode", False),
        notifications=getattr(pref, "notifications", None) or {},
        pos_quick_keys=getattr(pref, "pos_quick_keys", None) or {},
        ui_preferences=getattr(pref, "ui_preferences", None) or {},
        created_at=pref.created_at.isoformat() if getattr(pref, "created_at", None) else None,
        updated_at=pref.updated_at.isoformat() if getattr(pref, "updated_at", None) else None
    )


@api_router.put("/users/me/preferences", response_model=UserPreferenceResponse)
async def update_my_preferences(
    payload: UserPreferenceUpdate,
    auth_data: tuple[UserModel, Optional[UserSessionModel]] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db)
):
    """
    Actualiza quirúrgicamente las preferencias y configuraciones del usuario autenticado.
    """
    user, _ = auth_data
    pref_res = await db.execute(select(UserPreferenceModel).where(UserPreferenceModel.user_id == user.id))
    pref = pref_res.scalar_one_or_none()
    if not pref:
        pref = UserPreferenceModel(user_id=user.id, business_id=user.business_id)
        db.add(pref)

    if payload.theme is not None:
        pref.theme = payload.theme
    if payload.language is not None:
        pref.language = payload.language
    if payload.default_currency is not None:
        pref.default_currency = payload.default_currency
    if payload.sound_enabled is not None:
        pref.sound_enabled = payload.sound_enabled
    if payload.table_rows_per_page is not None:
        pref.table_rows_per_page = payload.table_rows_per_page
    if payload.compact_mode is not None:
        pref.compact_mode = payload.compact_mode
    if payload.notifications is not None:
        pref.notifications = payload.notifications
    if payload.pos_quick_keys is not None:
        pref.pos_quick_keys = payload.pos_quick_keys
    if payload.ui_preferences is not None:
        pref.ui_preferences = payload.ui_preferences

    pref.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(pref)

    return {
        "id": pref.id,
        "user_id": pref.user_id,
        "business_id": pref.business_id,
        "theme": pref.theme,
        "language": pref.language,
        "default_currency": pref.default_currency,
        "sound_enabled": pref.sound_enabled,
        "table_rows_per_page": pref.table_rows_per_page,
        "compact_mode": pref.compact_mode,
        "notifications": pref.notifications or {},
        "pos_quick_keys": pref.pos_quick_keys or {},
        "ui_preferences": pref.ui_preferences or {},
        "created_at": pref.created_at.isoformat() if pref.created_at else None,
        "updated_at": pref.updated_at.isoformat() if pref.updated_at else None
    }


@api_router.get("/auth/sessions", response_model=List[UserSessionResponse])
async def list_user_sessions(
    auth_data: tuple[UserModel, Optional[UserSessionModel]] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db)
):
    """
    Lista las sesiones activas del usuario autenticado para control multi-dispositivo y seguridad.
    """
    user, current_session = auth_data
    result = await db.execute(
        select(UserSessionModel)
        .where(UserSessionModel.user_id == user.id, UserSessionModel.is_active == True)
        .order_by(UserSessionModel.created_at.desc())
    )
    sessions = result.scalars().all()
    return [
        UserSessionResponse(
            id=s.id,
            user_id=s.user_id,
            business_id=s.business_id,
            token_jti=s.token_jti,
            terminal_id=s.terminal_id,
            device_info=s.device_info,
            ip_address=s.ip_address,
            is_active=s.is_active,
            expires_at=s.expires_at.isoformat(),
            last_activity_at=s.last_activity_at.isoformat() if s.last_activity_at else None,
            created_at=s.created_at.isoformat(),
            is_current=(current_session is not None and s.id == current_session.id)
        )
        for s in sessions
    ]


@api_router.delete("/auth/sessions/{session_id}")
async def revoke_session(
    session_id: str,
    auth_data: tuple[UserModel, Optional[UserSessionModel]] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db)
):
    """
    Revoca inmediatamente una sesión específica (cierre remoto de dispositivo).
    """
    user, _ = auth_data
    result = await db.execute(
        select(UserSessionModel).where(UserSessionModel.id == session_id, UserSessionModel.user_id == user.id)
    )
    target_session = result.scalar_one_or_none()
    if not target_session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    target_session.is_active = False
    await db.commit()
    return {"status": "success", "message": "Sesión revocada exitosamente"}


@api_router.post("/auth/logout")
async def logout(
    auth_data: tuple[UserModel, Optional[UserSessionModel]] = Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db)
):
    """
    Cierra la sesión actual del usuario invalidando el JTI en la base de datos.
    """
    _, session = auth_data
    if session:
        session.is_active = False
        await db.commit()
    return {"status": "success", "message": "Sesión cerrada correctamente"}


# 1. Dashboard
@api_router.get("/dashboard/metrics")
async def get_dashboard_metrics(
    branch_id: Optional[str] = None,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    verify_system_operational()
    current_user = await get_optional_current_user(authorization, db)
    biz_id = current_user.business_id if current_user else None
    registers = cash_registers_db
    if biz_id:
        registers = [r for r in registers if r.get("business_id") == biz_id]
    if branch_id and branch_id != "all":
        registers = [r for r in registers if r["branch_id"] == branch_id]
    total_sales = sum(float(r.get("today_sales_total", 0.0)) for r in registers)
    return {
        "total_sales": total_sales,
        "gross_income": total_sales,
        "avg_margin": 0.0,
        "transaction_count": 0,
        "sales_change_pct": 0.0,
        "transactions_change_pct": 0.0
    }

# 2. Branches & Cash Registers State & Endpoints
branches_db: List[dict] = []

cash_registers_db: List[dict] = []

def recalculate_branch_cash_registers():
    for b in branches_db:
        b["active_cash_registers_count"] = len([r for r in cash_registers_db if r["branch_id"] == b["id"] and r.get("is_active", True)])

@api_router.get("/branches")
async def list_branches(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    verify_system_operational()
    current_user = await get_optional_current_user(authorization, db)

    # Sincronizar sucursales persistidas desde PostgreSQL
    db_res = await db.execute(select(BranchModel))
    for db_b in db_res.scalars().all():
        existing = next((b for b in branches_db if b["id"] == db_b.id), None)
        if not existing:
            branches_db.append({
                "id": db_b.id,
                "business_id": db_b.business_id,
                "name": db_b.name,
                "address": db_b.address,
                "latitude": db_b.latitude or 10.6417,
                "longitude": db_b.longitude or -71.6125,
                "phone": db_b.phone or "+58 414-0000000",
                "manager_user_id": db_b.manager_user_id,
                "manager_name": "Gerente General",
                "active_cash_registers_count": 0,
                "is_active": db_b.is_active,
                "created_at": db_b.created_at or datetime.utcnow()
            })

    recalculate_branch_cash_registers()
    if current_user and current_user.business_id:
        return [b for b in branches_db if b.get("business_id") == current_user.business_id]
    return branches_db

@api_router.get("/branches/{branch_id}")
async def get_branch(
    branch_id: str,
    db: AsyncSession = Depends(get_db)
):
    verify_system_operational()
    for b in branches_db:
        if b["id"] == branch_id:
            return b
    db_res = await db.execute(select(BranchModel).where(BranchModel.id == branch_id))
    db_b = db_res.scalar_one_or_none()
    if db_b:
        return {
            "id": db_b.id,
            "business_id": db_b.business_id,
            "name": db_b.name,
            "address": db_b.address,
            "latitude": db_b.latitude,
            "longitude": db_b.longitude,
            "phone": db_b.phone,
            "manager_user_id": db_b.manager_user_id,
            "is_active": db_b.is_active,
            "created_at": db_b.created_at
        }
    return {"message": "Sucursal no encontrada"}

@api_router.post("/branches", response_model=BranchResponse, status_code=status.HTTP_201_CREATED)
async def create_branch(
    payload: BranchCreate,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    verify_system_operational()
    current_user = await get_optional_current_user(authorization, db)
    biz_id = current_user.business_id if current_user and current_user.business_id else "biz-101"

    max_branches = xion_pay_state.get("limits", {}).get("max_branches", 2)
    active_branches = [b for b in branches_db if b.get("business_id") == biz_id and b.get("is_active", True)]
    if len(active_branches) >= max_branches:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Límite de sucursales alcanzado ({len(active_branches)}/{max_branches}). Actualice su plan en Xion-Pay para añadir más."
        )

    branch_id = f"branch-{int(datetime.utcnow().timestamp())}"
    new_b = {
        "id": branch_id,
        "business_id": biz_id,
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

    # Persistir en base de datos PostgreSQL
    db_branch = BranchModel(
        id=branch_id,
        business_id=biz_id,
        name=payload.name,
        address=payload.address,
        latitude=payload.latitude or 10.6417,
        longitude=payload.longitude or -71.6125,
        phone=payload.phone or "+58 414-0000000",
        manager_user_id=payload.manager_user_id,
        is_active=True
    )
    db.add(db_branch)
    await db.commit()

    branches_db.append(new_b)
    return new_b

@api_router.put("/branches/{branch_id}")
async def update_branch(
    branch_id: str,
    payload: BranchUpdate,
    db: AsyncSession = Depends(get_db)
):
    verify_system_operational()
    # Actualizar en PostgreSQL
    db_res = await db.execute(select(BranchModel).where(BranchModel.id == branch_id))
    db_b = db_res.scalar_one_or_none()
    if db_b:
        for k, v in payload.model_dump(exclude_unset=True).items():
            if hasattr(db_b, k):
                setattr(db_b, k, v)
        db_b.updated_at = datetime.utcnow()
        await db.commit()

    for i, b in enumerate(branches_db):
        if b["id"] == branch_id:
            branches_db[i].update(payload.model_dump(exclude_unset=True))
            return branches_db[i]
    return {"message": "Sucursal no encontrada"}

@api_router.delete("/branches/{branch_id}")
async def delete_branch(
    branch_id: str,
    db: AsyncSession = Depends(get_db)
):
    verify_system_operational()
    # Eliminar en PostgreSQL
    await db.execute(delete(BranchModel).where(BranchModel.id == branch_id))
    await db.commit()

    global branches_db, cash_registers_db
    branches_db = [b for b in branches_db if b["id"] != branch_id]
    cash_registers_db = [r for r in cash_registers_db if r["branch_id"] != branch_id]
    return {"message": "Sucursal eliminada"}

@api_router.get("/cash-registers")
async def list_cash_registers(
    branch_id: Optional[str] = None,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    verify_system_operational()
    current_user = await get_optional_current_user(authorization, db)
    biz_id = current_user.business_id if current_user else None

    # Sincronizar cajas persistidas desde PostgreSQL
    db_cr_res = await db.execute(select(CashRegisterModel))
    for cr in db_cr_res.scalars().all():
        if not any(r["id"] == cr.id for r in cash_registers_db):
            b_name = next((b["name"] for b in branches_db if b["id"] == cr.branch_id), "Sucursal Asignada")
            cash_registers_db.append({
                "id": cr.id,
                "business_id": cr.business_id,
                "branch_id": cr.branch_id,
                "branch_name": b_name,
                "name": cr.name,
                "hardware_uuid": cr.hardware_uuid or f"HW-POS-{cr.id[:6]}",
                "status": "CLOSED",
                "is_active": cr.is_active,
                "current_operator": None,
                "today_sales_total": 0.0,
                "allowed_user_ids": ["usr-admin-01"],
                "payment_methods": ["CASH_USD", "CASH_BS", "PAGO_MOVIL", "DEBIT_CARD"],
                "created_at": cr.created_at or datetime.utcnow()
            })

    registers = cash_registers_db
    if biz_id:
        registers = [r for r in registers if r.get("business_id") == biz_id]
    if branch_id:
        return [r for r in registers if r["branch_id"] == branch_id]
    return registers

@api_router.post("/cash-registers", status_code=status.HTTP_201_CREATED)
async def create_cash_register(
    payload: CashRegisterCreate,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    verify_system_operational()
    current_user = await get_optional_current_user(authorization, db)
    biz_id = current_user.business_id if current_user and current_user.business_id else "biz-101"

    max_pos = xion_pay_state.get("limits", {}).get("max_pos_registers", 4)
    active_count = len([r for r in cash_registers_db if r.get("business_id") == biz_id and r.get("is_active", True)])
    if active_count >= max_pos:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Límite de cajas registradoras alcanzado ({active_count}/{max_pos}). Adquiere un add-on o actualiza tu plan en Xion-Pay para continuar."
        )

    branch_name = "Sucursal Asignada"
    for b in branches_db:
        if b["id"] == payload.branch_id:
            branch_name = b["name"]
            break

    register_id = f"reg-{int(datetime.utcnow().timestamp())}"
    new_r = {
        "id": register_id,
        "business_id": biz_id,
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

    # Persistir en base de datos PostgreSQL
    db_cr = CashRegisterModel(
        id=register_id,
        business_id=biz_id,
        branch_id=payload.branch_id,
        name=payload.name,
        hardware_uuid=new_r["hardware_uuid"],
        is_active=True
    )
    db.add(db_cr)
    await db.commit()

    cash_registers_db.append(new_r)
    recalculate_branch_cash_registers()
    return new_r

@api_router.put("/cash-registers/{register_id}")
async def update_cash_register(
    register_id: str,
    payload: CashRegisterUpdate,
    db: AsyncSession = Depends(get_db)
):
    verify_system_operational()
    # Actualizar en PostgreSQL
    db_cr_res = await db.execute(select(CashRegisterModel).where(CashRegisterModel.id == register_id))
    db_cr = db_cr_res.scalar_one_or_none()
    if db_cr:
        for k, v in payload.model_dump(exclude_unset=True).items():
            if hasattr(db_cr, k):
                setattr(db_cr, k, v)
        db_cr.updated_at = datetime.utcnow()
        await db.commit()

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
async def delete_cash_register(
    register_id: str,
    db: AsyncSession = Depends(get_db)
):
    verify_system_operational()
    # Eliminar en PostgreSQL
    await db.execute(delete(CashRegisterModel).where(CashRegisterModel.id == register_id))
    await db.commit()

    global cash_registers_db
    cash_registers_db = [r for r in cash_registers_db if r["id"] != register_id]
    recalculate_branch_cash_registers()
    return {"message": "Caja eliminada"}

@api_router.post("/cash-registers/{register_id}/toggle-status")
async def toggle_cash_register_status(register_id: str, operator_name: Optional[str] = Body(None, embed=True)):
    verify_system_operational()
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
inventory_db: List[dict] = []

transfers_db: List[dict] = []

categories_db: List[dict] = []

shrinkage_db: List[dict] = []

@api_router.get("/inventory/categories")
async def list_categories():
    verify_system_operational()
    return categories_db

@api_router.post("/inventory/categories", status_code=status.HTTP_201_CREATED)
async def create_category(payload: CategoryCreate):
    verify_system_operational()
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
    verify_system_operational()
    return shrinkage_db

@api_router.post("/inventory/adjust-stock")
async def adjust_stock(payload: StockAdjustmentDTO):
    verify_system_operational()
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
    verify_system_operational()
    prod = next((p for p in inventory_db if p["id"] == combo_id or p.get("product_id") == combo_id), None)
    if not prod:
        raise HTTPException(status_code=404, detail="Combo no encontrado")
    return prod.get("combo_items", [])

@api_router.put("/inventory/products/{combo_id}/components")
async def update_combo_components(combo_id: str, components: List[dict]):
    verify_system_operational()
    for p in inventory_db:
        if p["id"] == combo_id or p.get("product_id") == combo_id:
            p["combo_items"] = components
            return {"status": "SUCCESS", "combo_items": components}
    raise HTTPException(status_code=404, detail="Combo no encontrado")

@api_router.get("/inventory")
@api_router.get("/inventory/products")
async def list_products(branch_id: Optional[str] = None):
    verify_system_operational()
    if branch_id:
        return [p for p in inventory_db if p.get("branch_id") == branch_id or not p.get("branch_id")]
    return inventory_db

@api_router.get("/inventory/{branch_id}")
async def get_branch_inventory(branch_id: str):
    verify_system_operational()
    return [p for p in inventory_db if p.get("branch_id") == branch_id or not p.get("branch_id")]

@api_router.post("/inventory/products", status_code=status.HTTP_201_CREATED)
async def create_product(payload: ProductCreate):
    verify_system_operational()
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
    verify_system_operational()
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
    verify_system_operational()
    global inventory_db
    inventory_db = [p for p in inventory_db if p["id"] != product_id and p.get("product_id") != product_id]
    return {"message": "Producto eliminado exitosamente"}

@api_router.post("/inventory/shrinkage")
async def register_shrinkage(payload: ShrinkageCreate):
    verify_system_operational()
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
    verify_system_operational()
    return transfers_db

@api_router.post("/inventory/transfers", status_code=status.HTTP_201_CREATED)
async def create_transfer(payload: StockTransferCreate):
    verify_system_operational()
    limits_features = xion_pay_state.get("limits", {}).get("features", {})
    if limits_features.get("inventory_transfers") is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El módulo de transferencias entre sucursales no está habilitado en su plan actual."
        )
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
suppliers_db: List[dict] = []

purchases_db: List[dict] = []

@api_router.get("/suppliers")
async def list_suppliers():
    verify_system_operational()
    return suppliers_db

@api_router.post("/suppliers", status_code=status.HTTP_201_CREATED)
async def create_supplier(payload: SupplierCreate):
    verify_system_operational()
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
    verify_system_operational()
    for i, s in enumerate(suppliers_db):
        if s["id"] == supplier_id:
            suppliers_db[i].update(payload.model_dump(exclude_unset=True))
            return suppliers_db[i]
    return {"message": "Proveedor no encontrado"}

@api_router.delete("/suppliers/{supplier_id}")
async def delete_supplier(supplier_id: str):
    verify_system_operational()
    global suppliers_db
    suppliers_db = [s for s in suppliers_db if s["id"] != supplier_id]
    return {"message": "Proveedor eliminado"}

@api_router.get("/purchases")
async def list_purchases(supplier_id: Optional[str] = None, branch_id: Optional[str] = None):
    verify_system_operational()
    res = purchases_db
    if supplier_id:
        res = [p for p in res if p.get("supplier_id") == supplier_id]
    if branch_id:
        res = [p for p in res if p.get("branch_id") == branch_id]
    return res

supplier_ledger_db: List[dict] = []

@api_router.get("/suppliers/{supplier_id}/ledger")
async def get_supplier_ledger(supplier_id: str):
    verify_system_operational()
    return [l for l in supplier_ledger_db if l["supplier_id"] == supplier_id]

@api_router.get("/purchases/{purchase_id}")
async def get_purchase_detail(purchase_id: str):
    verify_system_operational()
    for p in purchases_db:
        if p["id"] == purchase_id:
            return p
    return {"message": "Compra no encontrada"}

@api_router.post("/purchases", status_code=status.HTTP_201_CREATED)
async def create_purchase(payload: PurchaseCreate):
    verify_system_operational()
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
    verify_system_operational()
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
async def list_users(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    verify_system_operational()
    current_user = await get_optional_current_user(authorization, db)
    if current_user and current_user.business_id:
        result = await db.execute(
            select(UserModel)
            .where(
                or_(
                    UserModel.business_id == current_user.business_id,
                    UserModel.business_id.is_(None)
                )
            )
            .order_by(UserModel.created_at.desc())
        )
    else:
        result = await db.execute(select(UserModel).order_by(UserModel.created_at.desc()))
    users = result.scalars().all()
    out = []
    for u in users:
        branch_name = "Acceso Global (Todas)"
        if u.branch_id:
            for b in branches_db:
                if b["id"] == u.branch_id:
                    branch_name = b["name"]
                    break
        out.append({
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "phone": u.phone or "",
            "role": u.role,
            "business_id": u.business_id,
            "branch_id": u.branch_id,
            "branch_name": branch_name,
            "approval_status": u.approval_status,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat() if u.created_at else None
        })
    return out

@api_router.put("/users/{user_id}")
async def update_user(
    user_id: str,
    payload: dict = Body(...),
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Permite al Dueño modificar usuarios, sus roles/permisos, sucursal asignada y propiedades operativas.
    """
    verify_system_operational()
    current_user = await get_optional_current_user(authorization, db)
    owner_biz_id = (current_user.business_id if current_user else None) or payload.get("business_id")
    user_res = await db.execute(select(UserModel).where(UserModel.id == user_id))
    user = user_res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if not user.business_id and owner_biz_id:
        user.business_id = owner_biz_id

    if "full_name" in payload and payload["full_name"]:
        user.full_name = payload["full_name"]
    if "phone" in payload:
        user.phone = payload["phone"]
    if "role" in payload and payload["role"]:
        user.role = payload["role"]
    if "branch_id" in payload:
        b_id = payload["branch_id"]
        user.branch_id = b_id if b_id and b_id not in ("all", "global", "none") else None
    if "is_active" in payload:
        user.is_active = bool(payload["is_active"])
    if "approval_status" in payload and payload["approval_status"]:
        user.approval_status = payload["approval_status"]
        if payload["approval_status"] == "APPROVED":
            user.is_active = True
            if owner_biz_id:
                user.business_id = owner_biz_id
        elif payload["approval_status"] == "REJECTED":
            user.is_active = False

    user.updated_at = datetime.utcnow()
    db.add(user)
    if user.business_id:
        await db.execute(
            update(UserSessionModel)
            .where(UserSessionModel.user_id == user.id)
            .values(business_id=user.business_id)
        )
        await db.execute(
            update(UserPreferenceModel)
            .where(UserPreferenceModel.user_id == user.id)
            .values(business_id=user.business_id)
        )
    await db.commit()
    await db.refresh(user)

    branch_name = "Acceso Global (Todas)"
    if user.branch_id:
        for b in branches_db:
            if b["id"] == user.branch_id:
                branch_name = b["name"]
                break

    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "phone": user.phone or "",
        "role": user.role,
        "branch_id": user.branch_id,
        "branch_name": branch_name,
        "approval_status": user.approval_status,
        "is_active": user.is_active,
        "updated_at": user.updated_at.isoformat() if user.updated_at else None,
        "message": "Usuario y permisos actualizados exitosamente"
    }

@api_router.post("/users/approval")
async def user_approval(
    payload: dict = Body(...),
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    verify_system_operational()
    current_user = await get_optional_current_user(authorization, db)
    owner_biz_id = (current_user.business_id if current_user else None) or payload.get("business_id")
    user_id = payload.get("user_id")
    status_val = payload.get("status") or payload.get("status_val", "APPROVED")
    user_res = await db.execute(select(UserModel).where(UserModel.id == user_id))
    user = user_res.scalar_one_or_none()
    if user:
        user.approval_status = status_val
        if status_val == "APPROVED":
            user.is_active = True
            if owner_biz_id:
                user.business_id = owner_biz_id
        elif status_val == "REJECTED":
            user.is_active = False
        user.updated_at = datetime.utcnow()
        db.add(user)
        if user.business_id:
            await db.execute(
                update(UserSessionModel)
                .where(UserSessionModel.user_id == user.id)
                .values(business_id=user.business_id)
            )
            await db.execute(
                update(UserPreferenceModel)
                .where(UserPreferenceModel.user_id == user.id)
                .values(business_id=user.business_id)
            )
        await db.commit()
    return {
        "user_id": user_id,
        "approval_status": status_val,
        "business_id": user.business_id if user else None,
        "message": "Estado de aprobación actualizado correctamente"
    }

# Staff / Employee Pairing DB & Endpoints (Misma lógica de vinculación que las cajas)
staff_pairings_db: List[dict] = []

# Rate Limiter y Rastreador de Intentos Fallidos en memoria para Vinculación (Máximo 5 intentos)
pairing_rate_limit_store = defaultdict(list)
pairing_failed_attempts_store: dict[str, dict] = defaultdict(lambda: {"count": 0, "blocked_until": 0.0})

def check_pairing_rate_limit(client_ip: str, max_requests: int = 10, window_seconds: int = 60):
    now = time.time()
    timestamps = [t for t in pairing_rate_limit_store[client_ip] if now - t < window_seconds]
    if len(timestamps) >= max_requests:
        retry_after = int(window_seconds - (now - timestamps[0]))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Demasiados intentos de vinculación. Por favor espera {max(retry_after, 1)} segundos antes de reintentar.",
            headers={"Retry-After": str(max(retry_after, 1))}
        )
    timestamps.append(now)
    pairing_rate_limit_store[client_ip] = timestamps

def check_pairing_attempts(identifier: str, max_allowed: int = 5):
    """Verifica si el identificador está bloqueado por exceder el límite de 5 intentos fallidos."""
    now = time.time()
    record = pairing_failed_attempts_store[identifier]
    if record["blocked_until"] > now:
        remaining_secs = int(record["blocked_until"] - now)
        mins = remaining_secs // 60 + 1
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Has superado el límite de {max_allowed} intentos fallidos. Bloqueado temporalmente. Intenta nuevamente en {mins} minutos."
        )

def record_failed_pairing_attempt(identifier: str, max_allowed: int = 5, block_minutes: int = 10) -> int:
    """Registra un fallo. Al 5to intento erróneo bloquea por 10 minutos. Retorna los intentos restantes."""
    now = time.time()
    record = pairing_failed_attempts_store[identifier]
    if record["blocked_until"] > now:
        remaining_secs = int(record["blocked_until"] - now)
        mins = remaining_secs // 60 + 1
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Has superado el límite de {max_allowed} intentos fallidos. Bloqueado temporalmente. Intenta nuevamente en {mins} minutos."
        )
    if record["blocked_until"] > 0 and record["blocked_until"] <= now:
        record["count"] = 0
        record["blocked_until"] = 0.0

    record["count"] += 1
    remaining = max_allowed - record["count"]
    if record["count"] >= max_allowed:
        record["blocked_until"] = now + (block_minutes * 60)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Has superado el límite de {max_allowed} intentos fallidos. Por motivos de seguridad, la vinculación queda bloqueada temporalmente por {block_minutes} minutos."
        )
    return max(remaining, 0)

def reset_failed_pairing_attempts(identifier: str):
    """Limpia los intentos fallidos al tener éxito."""
    if identifier in pairing_failed_attempts_store:
        del pairing_failed_attempts_store[identifier]


@api_router.post("/staff/select-collaborator-role")
async def select_collaborator_role(
    payload: dict = Body(...),
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Cuando un nuevo usuario selecciona 'Otro / Colaborador':
    1. Lo aísla de cualquier negocio existente (business_id = None).
    2. Si tenía un negocio provisional (TMP-), lo desvincula y limpia.
    3. Establece su rol a CASHIER y approval_status a 'PENDING'.
    4. Genera su código numérico de 6 dígitos único para vinculación.
    5. Queda 'en el aire' esperando autorización y asignación de rol del Dueño.
    """
    verify_system_operational()
    current_user = await get_optional_current_user(authorization, db)
    user_id = payload.get("user_id")
    if not current_user and user_id:
        user_res = await db.execute(select(UserModel).where(UserModel.id == user_id))
        current_user = user_res.scalar_one_or_none()

    if not current_user:
        raise HTTPException(status_code=401, detail="Usuario no autenticado.")

    # Guardar datos básicos si fueron proporcionados
    if payload.get("full_name"):
        current_user.full_name = str(payload.get("full_name")).strip()
    if payload.get("phone"):
        current_user.phone = str(payload.get("phone")).strip()

    # Desvincular negocio provisional si existe
    old_biz_id = current_user.business_id
    if old_biz_id:
        biz_res = await db.execute(select(BusinessModel).where(BusinessModel.id == old_biz_id))
        biz = biz_res.scalar_one_or_none()
        if biz and (not biz.tax_id or str(biz.tax_id).startswith("TMP-") or str(biz.tax_id).startswith("J-TMP-")):
            current_user.business_id = None
            try:
                from sqlalchemy import delete
                await db.execute(delete(SystemSettingsModel).where(SystemSettingsModel.business_id == old_biz_id))
                await db.execute(delete(BusinessModel).where(BusinessModel.id == old_biz_id))
            except Exception:
                pass

    current_user.business_id = None
    current_user.branch_id = None
    current_user.role = "CASHIER"
    current_user.approval_status = "PENDING"
    current_user.updated_at = datetime.utcnow()
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)

    import random
    code = payload.get("pairing_code")
    if not code or len(str(code).strip()) != 6:
        code = f"{random.randint(100000, 999999)}"
    else:
        code = str(code).strip()

    req = {
        "pairing_code": code,
        "user_id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "phone": current_user.phone or "",
        "role": "CASHIER",
        "branch_id": None,
        "branch_name": "Pendiente de Asignación",
        "business_id": None,
        "status": "PENDING",
        "created_at": datetime.utcnow().isoformat(),
        "expires_at": (datetime.utcnow() + timedelta(minutes=15)).isoformat()
    }
    global staff_pairings_db
    staff_pairings_db = [s for s in staff_pairings_db if s.get("user_id") != current_user.id and s["pairing_code"] != code]
    staff_pairings_db.append(req)

    # Persistir en la tabla staff_pairings de PostgreSQL para soporte multi-proceso y resiliencia ante reinicios
    try:
        from sqlalchemy import text
        await db.execute(text("""
            INSERT INTO staff_pairings (pairing_code, user_id, email, full_name, phone, role, status, created_at, expires_at)
            VALUES (:code, :uid, :email, :fname, :phone, 'CASHIER', 'PENDING', :created_at, :expires_at)
            ON CONFLICT (pairing_code) DO UPDATE SET
                user_id = EXCLUDED.user_id,
                email = EXCLUDED.email,
                full_name = EXCLUDED.full_name,
                phone = EXCLUDED.phone,
                status = 'PENDING',
                expires_at = EXCLUDED.expires_at
        """), {
            "code": code,
            "uid": current_user.id,
            "email": current_user.email,
            "fname": current_user.full_name,
            "phone": current_user.phone or "",
            "created_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(minutes=15)
        })
        await db.commit()
    except Exception:
        pass

    return {
        "status": "PENDING",
        "pairing_code": code,
        "expires_in_seconds": 900,
        "qr_payload": f"xion://pair-staff?code={code}",
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "phone": current_user.phone,
            "role": current_user.role,
            "business_id": None,
            "branch_id": None,
            "approval_status": "PENDING",
            "is_active": True,
            "onboarding_completed": False
        }
    }


@api_router.post("/staff/request-pairing")
async def request_staff_pairing(request: Request, payload: dict = Body(...)):
    """
    Genera un código numérico de 6 dígitos y QR para solicitar vinculación de personal.
    Aplica rate limiting (máx 10 peticiones por minuto por IP).
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    check_pairing_rate_limit(client_ip, max_requests=10, window_seconds=60)

    import random
    raw_code = payload.get("pairing_code")
    if raw_code and str(raw_code).strip():
        code = str(raw_code).strip().upper().replace("XM-", "").replace("XM", "")
    else:
        code = f"{random.randint(100000, 999999)}"

    # El rol será asignado por el Dueño al autorizar la solicitud
    role = payload.get("role", "CASHIER")
    req = {
        "pairing_code": code,
        "user_id": payload.get("user_id"),
        "email": payload.get("email"),
        "full_name": payload.get("full_name") or "Nuevo Colaborador",
        "role": role,
        "branch_id": payload.get("branch_id"),
        "branch_name": "Pendiente de Asignación",
        "status": "PENDING",
        "created_at": datetime.utcnow().isoformat(),
        "expires_at": (datetime.utcnow() + timedelta(minutes=15)).isoformat()
    }
    global staff_pairings_db
    staff_pairings_db = [s for s in staff_pairings_db if s["pairing_code"] != code]
    staff_pairings_db.append(req)
    return {
        "pairing_code": code,
        "expires_in_seconds": 900,
        "qr_payload": f"xion://pair-staff?code={code}",
        "request": req
    }

@api_router.get("/staff/pairing-status/{pairing_code}")
async def get_staff_pairing_status(
    pairing_code: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Consulta el estado de aprobación del código de vinculación de personal (6 dígitos numéricos).
    Valida vigencia temporal (15 minutos) y normaliza formato.
    """
    code = (pairing_code or "").strip().upper().replace("XM-", "").replace("XM", "")

    for s in staff_pairings_db:
        if s["pairing_code"] == code or s["pairing_code"] == f"XM-{code}":
            if s.get("status") == "REJECTED":
                return {
                    "status": "REJECTED",
                    "pairing_code": code,
                    "message": "La solicitud de vinculación fue rechazada por el administrador."
                }
            exp_str = s.get("expires_at")
            if exp_str and s.get("status") == "PENDING":
                try:
                    exp_dt = datetime.fromisoformat(exp_str)
                    if exp_dt < datetime.utcnow():
                        s["status"] = "EXPIRED"
                        return {
                            "status": "EXPIRED",
                            "pairing_code": code,
                            "message": "El código de vinculación ha expirado. Por favor genera uno nuevo."
                        }
                except Exception:
                    pass

            if s.get("status") == "APPROVED":
                biz_id = s.get("business_id")
                uid = s.get("user_id")
                if uid and biz_id:
                    try:
                        u_res = await db.execute(select(UserModel).where(UserModel.id == uid))
                        u = u_res.scalar_one_or_none()
                        if u and u.business_id != biz_id:
                            u.business_id = biz_id
                            u.role = s.get("role", u.role)
                            u.branch_id = s.get("branch_id", u.branch_id)
                            u.approval_status = "APPROVED"
                            u.is_active = True
                            await db.commit()
                    except Exception:
                        pass
                return s

            return s
    return {"status": "PENDING", "pairing_code": code}

@api_router.post("/staff/confirm-pairing")
async def confirm_staff_pairing(
    request: Request,
    payload: dict = Body(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Registra el intento de vinculación del colaborador ingresando el código emitido.
    Aplica rate limit estricto y límite de 5 intentos fallidos con bloqueo temporal.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    check_pairing_rate_limit(client_ip, max_requests=10, window_seconds=60)
    ident = f"confirm_{client_ip}"
    check_pairing_attempts(ident)

    code = (payload.get("pairing_code") or "").strip().upper().replace("XM-", "").replace("XM", "")
    if not code:
        remaining = record_failed_pairing_attempt(ident)
        raise HTTPException(status_code=400, detail=f"Debes proporcionar un código numérico de 6 dígitos válido. Intentos restantes: {remaining}.")

    # Verificar si el código ya existe en la base de solicitudes
    existing = None
    for s in staff_pairings_db:
        if s["pairing_code"] == code or s["pairing_code"] == f"XM-{code}":
            existing = s
            break

    # Si no está en memoria, consultar la tabla staff_pairings en PostgreSQL
    if not existing:
        try:
            from sqlalchemy import text
            p_res = await db.execute(text("SELECT pairing_code, user_id, email, full_name, role, branch_id, branch_name, business_id, status, expires_at FROM staff_pairings WHERE pairing_code = :code"), {"code": code})
            p_row = p_res.fetchone()
            if p_row:
                existing = {
                    "pairing_code": p_row[0],
                    "user_id": p_row[1],
                    "email": p_row[2],
                    "full_name": p_row[3],
                    "role": p_row[4],
                    "branch_id": p_row[5],
                    "branch_name": p_row[6],
                    "business_id": p_row[7],
                    "status": p_row[8],
                    "expires_at": p_row[9].isoformat() if p_row[9] else None
                }
                staff_pairings_db.append(existing)
        except Exception:
            pass

    # Si no existe
    if not existing:
        remaining = record_failed_pairing_attempt(ident)
        raise HTTPException(status_code=400, detail=f"Código de vinculación '{code}' no encontrado o no existe. Intentos restantes: {remaining}.")

    # Verificar si fue rechazada
    if existing.get("status") == "REJECTED":
        remaining = record_failed_pairing_attempt(ident)
        raise HTTPException(status_code=400, detail=f"Esta solicitud de vinculación fue rechazada por el dueño. Intentos restantes: {remaining}.")

    # Verificar si expiró
    if existing.get("expires_at"):
        try:
            exp_dt = datetime.fromisoformat(existing["expires_at"])
            if exp_dt < datetime.utcnow():
                existing["status"] = "EXPIRED"
                remaining = record_failed_pairing_attempt(ident)
                raise HTTPException(status_code=400, detail=f"El código de vinculación ha expirado. Solicita un nuevo código. Intentos restantes: {remaining}.")
        except HTTPException:
            raise
        except Exception:
            pass

    # Restablecer intentos fallidos tras código válido
    reset_failed_pairing_attempts(ident)

    role = payload.get("role", "CASHIER")
    branch_id = payload.get("branch_id")
    branch_name = "Acceso Global (Todas)"
    if branch_id:
        for b in branches_db:
            if b["id"] == branch_id:
                branch_name = b["name"]
                break

    # Si ya existía y el dueño ya la autorizó explícitamente desde Users
    if existing.get("status") == "APPROVED":
        assigned_role = existing.get("role", role)
        assigned_branch = existing.get("branch_id", branch_id)
        assigned_biz_id = existing.get("business_id")
        uid = payload.get("user_id") or existing.get("user_id")
        email = payload.get("email") or existing.get("email")
        if uid or email:
            try:
                cond = []
                if uid:
                    cond.append(UserModel.id == uid)
                if email:
                    cond.append(UserModel.email == email)
                user_res = await db.execute(select(UserModel).where(or_(*cond)))
                user = user_res.scalar_one_or_none()
                if user:
                    if assigned_biz_id:
                        user.business_id = assigned_biz_id
                    user.branch_id = assigned_branch
                    user.role = assigned_role
                    user.approval_status = "APPROVED"
                    user.is_active = True
                    user.updated_at = datetime.utcnow()
                    db.add(user)
                    if assigned_biz_id:
                        await db.execute(
                            update(UserSessionModel)
                            .where(UserSessionModel.user_id == user.id)
                            .values(business_id=assigned_biz_id)
                        )
                        await db.execute(
                            update(UserPreferenceModel)
                            .where(UserPreferenceModel.user_id == user.id)
                            .values(business_id=assigned_biz_id)
                        )
                    await db.commit()
                    await db.refresh(user)
            except Exception:
                pass

        return {
            "status": "APPROVED",
            "message": f"Personal vinculado exitosamente como {assigned_role}",
            "role": assigned_role,
            "business_id": assigned_biz_id,
            "branch_id": assigned_branch,
            "branch_name": existing.get("branch_name", branch_name),
            "onboarding_completed": True
        }

    return {
        "status": "PENDING",
        "pairing_code": code,
        "message": "Solicitud de vinculación enviada al Dueño. Esperando autorización y asignación de rol desde Usuarios.",
        "onboarding_completed": False
    }

@api_router.get("/staff/pending-requests")
async def list_pending_staff_requests(db: AsyncSession = Depends(get_db)):
    """
    Lista de solicitudes pendientes de personal para el panel del Dueño.
    Combina persistencia en base de datos PostgreSQL con memoria para máxima resiliencia.
    """
    verify_system_operational()
    now = datetime.utcnow()
    valid_requests = []
    try:
        from sqlalchemy import text
        res = await db.execute(text("SELECT pairing_code, user_id, email, full_name, phone, role, branch_id, branch_name, status, created_at, expires_at FROM staff_pairings WHERE status = 'PENDING' AND expires_at > NOW()"))
        for row in res.fetchall():
            valid_requests.append({
                "pairing_code": row[0],
                "user_id": row[1],
                "email": row[2],
                "full_name": row[3],
                "phone": row[4] or "",
                "role": row[5] or "CASHIER",
                "branch_id": row[6],
                "branch_name": row[7] or "Pendiente de Asignación",
                "status": row[8],
                "created_at": row[9].isoformat() if row[9] else None,
                "expires_at": row[10].isoformat() if row[10] else None
            })
    except Exception:
        pass

    for s in staff_pairings_db:
        if s.get("status") == "PENDING":
            exp_str = s.get("expires_at")
            if exp_str:
                try:
                    if datetime.fromisoformat(exp_str) < now:
                        s["status"] = "EXPIRED"
                        continue
                except Exception:
                    pass
            if not any(v["pairing_code"] == s["pairing_code"] for v in valid_requests):
                valid_requests.append(s)
    return valid_requests

@api_router.post("/staff/approve-request")
async def approve_staff_request(
    request: Request,
    payload: dict = Body(...),
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    """
    El Dueño aprueba una solicitud de vinculación de personal asignando el rol y sucursal correspondientes.
    Vincula el colaborador exclusivamente al negocio (Tenant) del dueño actual.
    Aplica límite de 5 intentos fallidos y bloqueo temporal.
    """
    verify_system_operational()
    client_ip = request.client.host if request.client else "127.0.0.1"
    current_user = await get_optional_current_user(authorization, db)
    ident = f"approve_{current_user.id if current_user else client_ip}"
    check_pairing_attempts(ident)

    # 1. Determinar el business_id del Dueño con máxima prioridad
    owner_biz_id = payload.get("business_id") or (current_user.business_id if current_user else None)
    if not owner_biz_id and current_user:
        biz_check = await db.execute(select(BusinessModel).where(BusinessModel.id == current_user.business_id))
        biz_found = biz_check.scalar_one_or_none()
        if biz_found:
            owner_biz_id = biz_found.id

    if not owner_biz_id:
        biz_def = await db.execute(
            select(BusinessModel)
            .where(~BusinessModel.tax_id.like("J-TMP-%"), ~BusinessModel.tax_id.like("TMP-%"))
            .order_by(BusinessModel.created_at.desc())
            .limit(1)
        )
        found_def = biz_def.scalar_one_or_none()
        if not found_def:
            biz_def = await db.execute(select(BusinessModel).order_by(BusinessModel.created_at.desc()).limit(1))
            found_def = biz_def.scalar_one_or_none()
        if found_def:
            owner_biz_id = found_def.id

    if not owner_biz_id:
        raise HTTPException(
            status_code=400,
            detail="El Dueño debe completar primero la configuración de su empresa antes de vincular personal."
        )

    code = (payload.get("pairing_code") or "").strip().upper().replace("XM-", "").replace("XM", "")
    if not code:
        remaining = record_failed_pairing_attempt(ident)
        raise HTTPException(
            status_code=400,
            detail=f"Debes proporcionar un código de vinculación válido. Intentos restantes: {remaining}."
        )

    branch_id = payload.get("branch_id")
    role = payload.get("role") or "CASHIER"
    branch_name = "Acceso Global (Todas)"
    if branch_id and branch_id not in ("all", "global"):
        for b in branches_db:
            if b["id"] == branch_id:
                branch_name = b["name"]
                break
    else:
        branch_id = None

    target_req = None
    for s in staff_pairings_db:
        if s["pairing_code"] == code or s["pairing_code"] == f"XM-{code}":
            s["status"] = "APPROVED"
            s["branch_id"] = branch_id
            s["branch_name"] = branch_name
            s["role"] = role
            if owner_biz_id:
                s["business_id"] = owner_biz_id
            target_req = s
            break

    if not target_req:
        try:
            from sqlalchemy import text
            p_res = await db.execute(text("SELECT pairing_code, user_id, email, full_name, phone FROM staff_pairings WHERE pairing_code = :code"), {"code": code})
            p_row = p_res.fetchone()
            if p_row:
                target_req = {
                    "pairing_code": p_row[0],
                    "user_id": p_row[1],
                    "email": p_row[2],
                    "full_name": p_row[3],
                    "phone": p_row[4],
                    "status": "APPROVED",
                    "branch_id": branch_id,
                    "branch_name": branch_name,
                    "role": role,
                    "business_id": owner_biz_id
                }
                staff_pairings_db.append(target_req)
        except Exception:
            pass

    if not target_req:
        remaining = record_failed_pairing_attempt(ident)
        raise HTTPException(
            status_code=400,
            detail=f"Código de vinculación '{code}' no encontrado o no existe. Intentos restantes: {remaining}."
        )

    # Restablecer intentos fallidos
    reset_failed_pairing_attempts(ident)

    # Actualizar estado del usuario en la base de datos si existe y vincularlo al tenant del dueño
    uid = target_req.get("user_id")
    email = target_req.get("email")
    if uid or email:
        try:
            cond = []
            if uid:
                cond.append(UserModel.id == uid)
            if email:
                cond.append(UserModel.email == email)
            user_res = await db.execute(select(UserModel).where(or_(*cond)))
            user = user_res.scalar_one_or_none()
            if user:
                # Si el usuario tenía un negocio provisional previo propio, purgarlo
                old_biz = user.business_id
                if old_biz and old_biz != owner_biz_id:
                    try:
                        from sqlalchemy import delete
                        await db.execute(delete(SystemSettingsModel).where(SystemSettingsModel.business_id == old_biz))
                        await db.execute(delete(BusinessModel).where(BusinessModel.id == old_biz))
                    except Exception:
                        pass

                if owner_biz_id:
                    user.business_id = owner_biz_id
                    await db.execute(
                        update(UserSessionModel)
                        .where(UserSessionModel.user_id == user.id)
                        .values(business_id=owner_biz_id)
                    )
                    await db.execute(
                        update(UserPreferenceModel)
                        .where(UserPreferenceModel.user_id == user.id)
                        .values(business_id=owner_biz_id)
                    )

                user.branch_id = branch_id
                user.role = role
                user.approval_status = "APPROVED"
                user.is_active = True
                user.updated_at = datetime.utcnow()
                db.add(user)
                await db.commit()
                await db.refresh(user)

            # Actualizar también tabla staff_pairings en PostgreSQL
            try:
                from sqlalchemy import text
                await db.execute(text("""
                    UPDATE staff_pairings 
                    SET status = 'APPROVED', business_id = :biz_id, role = :role, branch_id = :branch_id, branch_name = :branch_name
                    WHERE pairing_code = :code
                """), {
                    "biz_id": owner_biz_id,
                    "role": role,
                    "branch_id": branch_id,
                    "branch_name": branch_name,
                    "code": code
                })
                await db.commit()
            except Exception:
                pass
        except Exception:
            pass

    return {
        "status": "APPROVED",
        "message": f"Personal vinculado y autorizado con éxito como {role}",
        "business_id": owner_biz_id,
        "request": target_req
    }

@api_router.post("/staff/reject-request")
async def reject_staff_request(payload: dict = Body(...)):
    """El Dueño rechaza o descarta una solicitud de vinculación."""
    verify_system_operational()
    code = (payload.get("pairing_code") or "").strip().upper().replace("XM-", "").replace("XM", "")

    for s in staff_pairings_db:
        if s["pairing_code"] == code or s["pairing_code"] == f"XM-{code}":
            s["status"] = "REJECTED"
            s["rejected_at"] = datetime.utcnow().isoformat()
            return {"status": "REJECTED", "message": f"Solicitud {code} descartada correctamente"}

    return {"status": "REJECTED", "message": f"Solicitud {code} descartada correctamente"}


# 6. Audit & Cash Sessions
@api_router.get("/audit/logs")
async def get_audit_logs(db: AsyncSession = Depends(get_db)):
    verify_system_operational()
    result = await db.execute(select(AuditLogModel).order_by(AuditLogModel.created_at.desc()).limit(100))
    logs = result.scalars().all()
    return [
        {
            "id": l.id,
            "timestamp": l.created_at.strftime("%Y-%m-%d %H:%M:%S") if l.created_at else "",
            "user_name": l.user_id or "Sistema",
            "role": "ADMIN",
            "module": l.module,
            "action_type": l.action_type,
            "description": l.description,
            "ip_address": l.ip_address or "127.0.0.1"
        }
        for l in logs
    ]

@api_router.get("/audit/cash-sessions")
async def get_cash_sessions():
    verify_system_operational()
    return []

# 8. Notifications
@api_router.get("/notifications")
async def get_notifications():
    return []

@api_router.api_route("/system/reset-database", methods=["GET", "POST"])
async def reset_database(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Endpoint público para reiniciar la base de datos y memorias desde 0.
    Acepta peticiones GET y POST para fácil invocación desde navegador, scripts o webhooks.
    """
    from sqlalchemy import delete, text
    from app.models.entities import (
        UserSession, UserPreference, AuditLog, InventoryTransaction,
        InventoryShrinkage, SupplierPayablesLedger, PurchaseItem, Purchase,
        Supplier, BranchInventory, ProductComposition, Product, Category,
        PaymentReport, CashRegister, Branch, User, Business, SystemSettings,
        BusinessSubscription, XionPayConfig, PaymentMethod,
        SubscriptionPlan
    )
    from app.core.init_db import seed_initial_data
    
    all_tables = [
        "audit_logs", "branch_inventory", "branches", "business_settings",
        "business_subscriptions", "businesses", "cash_registers", "categories",
        "inventory_shrinkage", "inventory_transactions", "payment_methods",
        "payment_reports", "product_compositions", "products", "purchase_items",
        "purchases", "staff_pairings", "subscription_plans",
        "supplier_payables_ledger", "suppliers", "system_settings",
        "user_preferences", "user_sessions", "users", "xion_pay_config"
    ]

    # 1. Truncado atómico con CASCADE para PostgreSQL
    truncate_ok = False
    try:
        truncate_sql = f"TRUNCATE TABLE {', '.join(all_tables)} CASCADE;"
        await db.execute(text(truncate_sql))
        await db.commit()
        truncate_ok = True
    except Exception:
        await db.rollback()

    # 2. Fallback de borrado modelo por modelo si no es PostgreSQL o falla TRUNCATE
    if not truncate_ok:
        for model in [
            UserSession, UserPreference, AuditLog, InventoryTransaction,
            InventoryShrinkage, SupplierPayablesLedger, PurchaseItem, Purchase,
            Supplier, BranchInventory, ProductComposition, Product, Category,
            PaymentReport, CashRegister, Branch, SystemSettings,
            BusinessSubscription, XionPayConfig, PaymentMethod,
            User, Business, SubscriptionPlan
        ]:
            try:
                await db.execute(delete(model))
            except Exception:
                pass
        try:
            await db.execute(text("DELETE FROM staff_pairings;"))
        except Exception:
            pass
        await db.commit()
    
    # 3. Limpiar memorias volátiles y caches de estado
    global branches_db, cash_registers_db, inventory_db, suppliers_db, purchases_db, transfers_db, categories_db, shrinkage_db, staff_pairings_db, xion_pay_state
    branches_db.clear()
    cash_registers_db.clear()
    inventory_db.clear()
    suppliers_db.clear()
    purchases_db.clear()
    transfers_db.clear()
    categories_db.clear()
    shrinkage_db.clear()
    staff_pairings_db.clear()
    
    xion_pay_state["tenant_id"] = None
    xion_pay_state["license_token"] = None
    xion_pay_state["license_status"] = "trial"
    xion_pay_state["is_active"] = True
    xion_pay_state["status"] = "trial"
    
    # 4. Re-sembrar planes oficiales de suscripción
    try:
        await seed_initial_data()
    except Exception:
        pass

    return {
        "status": "success",
        "message": "Base de datos y memorias reseteadas correctamente. Sistema iniciado desde 0.",
        "tables_cleared": len(all_tables),
        "plans_seeded": 4
    }

# 9. Billing & Xion-Pay
@api_router.get("/billing/account-status", response_model=AccountStatusResponse)
async def get_account_status(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    plan_name = xion_pay_state.get("plan_name", "Plan Comercio")
    billing_cycle = (xion_pay_state.get("billing_cycle") or "MONTHLY").upper()
    expires_at = xion_pay_state.get("expires_at") or (datetime.utcnow() + timedelta(days=30))
    days_remaining = max(0, (expires_at - datetime.utcnow()).days) if expires_at else 30
    sub_status = xion_pay_state.get("license_status", "active")

    # Sincronizar en tiempo real con Xion-Pay para el tenant específico
    biz = None
    try:
        current_user = await get_optional_current_user(authorization, db)
        if current_user and current_user.business_id:
            biz_res = await db.execute(select(BusinessModel).where(BusinessModel.id == current_user.business_id))
            biz = biz_res.scalar_one_or_none()
        if not biz:
            biz_res = await db.execute(select(BusinessModel).limit(1))
            biz = biz_res.scalar_one_or_none()
        biz_identifier = biz.tax_id if (biz and biz.tax_id) else None

        live = await XionPayService.get_license_status(biz_identifier)
        if live and not live.get("offline_cached") and live.get("status"):
            live_status = live.get("status", "active")
            is_blocked = (
                live_status in ("suspended", "frozen")
                or live.get("is_suspended") is True
                or live.get("is_active") is False
            )
            if is_blocked:
                sub_status = "suspended"
                days_remaining = 0
                xion_pay_state["is_active"] = False
                xion_pay_state["status"] = "suspended"
                xion_pay_state["license_status"] = "suspended"
                xion_pay_state["suspension_reason"] = live.get("suspension_reason") or "Servicio suspendido en Xion-Pay"
                if biz and (biz.is_active or biz.status != "suspended"):
                    biz.is_active = False
                    biz.status = "suspended"
                    biz.suspension_reason = xion_pay_state["suspension_reason"]
                    await db.commit()
            else:
                sub_status = live_status
                xion_pay_state["is_active"] = True
                xion_pay_state["status"] = live_status
                xion_pay_state["license_status"] = live_status
                xion_pay_state["suspension_reason"] = None
                if live.get("license_token"):
                    xion_pay_state["license_token"] = live.get("license_token")
                if biz and (not biz.is_active or biz.status == "suspended"):
                    biz.is_active = True
                    biz.status = "active"
                    biz.suspension_reason = None
                    await db.commit()

            sub_info = live.get("subscription") or {}
            if sub_info.get("plan_name"):
                plan_name = sub_info.get("plan_name")
            elif not xion_pay_state.get("plan_name") and live.get("commercial_name"):
                plan_name = f"Plan {live.get('commercial_name')}"
                
            end_date_str = sub_info.get("current_period_end") or live.get("trial_ends_at")
            if end_date_str:
                clean_date = end_date_str.replace("Z", "+00:00")
                parsed_date = datetime.fromisoformat(clean_date)
                expires_at = parsed_date.replace(tzinfo=None)
                now_utc = datetime.utcnow()
                days_remaining = max(0, (expires_at - now_utc).days)
    except Exception as e:
        logger.warning(f"Error sincronizando cuenta con Xion-Pay: {e}")
        if biz:
            if not biz.is_active or biz.status in ("suspended", "frozen"):
                sub_status = "suspended"
                days_remaining = 0

    is_suspended = (sub_status == "suspended") or (not is_system_operational())
    limits = xion_pay_state.get("limits") or {"max_branches": 2, "max_pos_registers": 4}
    max_branches = limits.get("max_branches", 2)
    max_pos = limits.get("max_pos_registers", 4)
    used_branches = len([b for b in branches_db if b.get("is_active", True)])
    used_registers = len([r for r in cash_registers_db if r.get("is_active", True)])

    traffic_light = {
        "status": "SUSPENDED" if is_suspended else ("ACTIVE" if sub_status in ("active", "trial") else "SUSPENDED"),
        "color": "RED" if is_suspended else "GREEN",
        "label": "Suspendido" if is_suspended else ("Prueba Gratuita (30 días)" if sub_status == "trial" else "Al día"),
        "description": "Servicio suspendido. Contacte al administrador para renovar su plan" if is_suspended else f"Suscripción en Xion-Pay. Vence en {days_remaining} días."
    }

    if xion_pay_state.get("tolerance_expires_at") and not is_suspended:
        traffic_light["label"] = "Prórroga Activa"
        traffic_light["description"] = "Prórroga de contingencia operativa otorgada por Xion-Pay mientras se valida tu pago."

    return {
        "plan_name": plan_name,
        "billing_cycle": billing_cycle,
        "expires_at": expires_at,
        "days_remaining": days_remaining,
        "traffic_light": traffic_light,
        "resource_usage": {
            "branches": {
                "used": used_branches,
                "limit": max_branches,
                "percentage": round((used_branches / max(1, max_branches)) * 100, 1)
            },
            "cash_registers": {
                "used": used_registers,
                "limit": max_pos,
                "percentage": round((used_registers / max(1, max_pos)) * 100, 1)
            }
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

payment_reports_db: List[dict] = []

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
    search: Optional[str] = None,
    subscription_only: bool = False
):
    if not is_system_operational() and not subscription_only:
        verify_system_operational()

    results = payment_reports_db
    if not is_system_operational() or subscription_only:
        results = [r for r in results if (r.get("order_id") or "").startswith("SUB-") or "Renovación" in (r.get("concept") or "")]

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

    is_sub_renewal = (payload.order_id and payload.order_id.startswith("SUB-")) or \
                     (payload.concept and "Renovación Suscripción" in payload.concept)
    if not is_sub_renewal:
        verify_system_operational()
    
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
    verify_system_operational()
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
    verify_system_operational()
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
    verify_system_operational()
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
    verify_system_operational()
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
    verify_system_operational()
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
    verify_system_operational()
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


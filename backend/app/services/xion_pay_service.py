import hmac
import hashlib
import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
import httpx
from loguru import logger

from app.core.config import settings


class XionPayService:
    """
    Servicio de integración directa con la pasarela Xion-Pay (https://xion-pay.onrender.com).
    Maneja onboarding, polling de licencias, reporte de pagos y recepción de webhooks con HMAC.
    """

    @classmethod
    def get_base_url(cls) -> str:
        return settings.XION_PAY_BASE_URL.rstrip("/")

    @classmethod
    def get_default_tenant_id(cls) -> str:
        return settings.XION_PAY_TENANT_ID

    @classmethod
    async def fetch_catalog(cls) -> Dict[str, Any]:
        """
        Obtiene catálogo de planes, coordenadas bancarias y tasa oficial de cambio desde Xion-Pay.
        """
        url = f"{cls.get_base_url()}/api/v1/plans/catalog"
        try:
            async with httpx.AsyncClient(timeout=settings.XION_PAY_TIMEOUT) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    return data
                logger.warning(f"Xion-Pay catalog returned status {res.status_code}: {res.text}")
        except Exception as e:
            logger.error(f"Error fetching catalog from Xion-Pay: {e}")

        # Fallback offline en caso de falla de conectividad
        return {
            "status": "fallback",
            "exchange_rate_usd_ves": 65.40,
            "plans": [],
            "payment_methods": {}
        }

    @classmethod
    async def get_license_status(cls, tenant_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Consulta estado de licencia, días de prueba restantes y token RS256 en Xion-Pay.
        """
        tid = tenant_id or cls.get_default_tenant_id()
        url = f"{cls.get_base_url()}/api/v1/tenants/{tid}/license-status"
        try:
            async with httpx.AsyncClient(timeout=settings.XION_PAY_TIMEOUT) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    return res.json()
                logger.warning(f"Xion-Pay license check failed [{res.status_code}]: {res.text}")
        except Exception as e:
            logger.error(f"Error querying license status from Xion-Pay: {e}")

        return {
            "tenant_id": tid,
            "status": "active",
            "license_token": None,
            "subscription": {"status": "active", "plan_code": "pro", "current_period_end": None},
            "offline_cached": True
        }

    @classmethod
    async def report_payment(cls, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Reporta transacción a Xion-Pay activando prórroga de contingencia (24-48h).
        """
        url = f"{cls.get_base_url()}/api/v1/payments/report"
        
        # Asegurar tenant_id
        if not payload.get("tenant_id"):
            payload["tenant_id"] = cls.get_default_tenant_id()

        try:
            async with httpx.AsyncClient(timeout=settings.XION_PAY_TIMEOUT) as client:
                res = await client.post(url, json=payload)
                if res.status_code in (200, 201):
                    return res.json()
                
                logger.error(f"Xion-Pay payment report error [{res.status_code}]: {res.text}")
                return {
                    "status": "error",
                    "status_code": res.status_code,
                    "message": res.json().get("detail", res.text) if "application/json" in res.headers.get("content-type", "") else res.text
                }
        except Exception as e:
            logger.error(f"Connection error reporting payment to Xion-Pay: {e}")
            return {
                "status": "error",
                "message": f"Falla de conectividad con Xion-Pay: {str(e)}"
            }

    @classmethod
    async def onboard_trial(cls, lead_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Registra nuevo comercio en Xion-Pay otorgando 30 días de prueba gratuita.
        """
        url = f"{cls.get_base_url()}/api/v1/tenants/onboarding-trial"
        try:
            async with httpx.AsyncClient(timeout=settings.XION_PAY_TIMEOUT) as client:
                res = await client.post(url, json=lead_data)
                if res.status_code in (200, 201):
                    return res.json()
                logger.error(f"Xion-Pay onboarding trial failed [{res.status_code}]: {res.text}")
                return {
                    "status": "error",
                    "message": res.text
                }
        except Exception as e:
            logger.error(f"Error onboarding trial in Xion-Pay: {e}")
            return {"status": "error", "message": str(e)}

    @classmethod
    def verify_webhook_signature(cls, raw_body: bytes, signature_header: Optional[str]) -> bool:
        """
        Verifica criptográficamente la firma HMAC-SHA256 (X-Xion-Signature) enviada por Xion-Pay.
        Previene ataques de temporización utilizando hmac.compare_digest.
        """
        if not signature_header:
            return False

        secret = settings.XION_PAY_WEBHOOK_SECRET.encode("utf-8")
        computed_hex = hmac.new(secret, raw_body, hashlib.sha256).hexdigest()

        clean_sig = signature_header.strip()
        if clean_sig.startswith("sha256="):
            clean_sig = clean_sig[7:]

        return hmac.compare_digest(computed_hex.lower(), clean_sig.lower())

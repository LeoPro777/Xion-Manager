from datetime import datetime, timedelta
from typing import Dict, Any
from app.core.exceptions import AppException

class BillingService:
    @staticmethod
    def validate_cash_register_limit(current_used: int, max_allowed: int) -> None:
        """
        Gobernanza de Recursos por Plan (Xion-Pay Guard):
        Si la suma de cajas registradoras activas iguala o supera el límite
        contratado en el plan más los add-ons, bloquea la acción.
        """
        if current_used >= max_allowed:
            raise AppException(
                error_code="RESOURCE_LIMIT_EXCEEDED",
                message="Has alcanzado el límite de cajas registradoras permitidas en tu plan actual.",
                status_code=403,
                action_required="UPGRADE_PLAN_OR_BUY_ADDON",
                details={
                    "current_used": current_used,
                    "plan_limit": max_allowed
                }
            )

    @staticmethod
    def calculate_traffic_light(expires_at: datetime, status: str) -> Dict[str, Any]:
        """
        Semáforo Operativo y Estado Suspendido:
        Verde (Al día), Amarillo (Por vencer < 5 días),
        Naranja (En período de gracia < 3 días), Rojo (Suspendido).
        """
        now = datetime.utcnow()
        days_remaining = (expires_at - now).days

        if status == "SUSPENDED" or days_remaining < -3:
            return {
                "status": "SUSPENDED",
                "color": "RED",
                "label": "Suspendido",
                "description": "Suscripción congelada por impago. Sincronización bloqueada."
            }
        elif days_remaining < 0:
            return {
                "status": "GRACE_PERIOD",
                "color": "ORANGE",
                "label": "En período de gracia",
                "description": "Factura vencida. Servicio activo con aviso preventivo."
            }
        elif days_remaining <= 5:
            return {
                "status": "EXPIRING_SOON",
                "color": "YELLOW",
                "label": "Por vencer",
                "description": f"Tu suscripción vence en {days_remaining} días."
            }
        else:
            return {
                "status": "ACTIVE",
                "color": "GREEN",
                "label": "Al día",
                "description": "Tu suscripción está completamente activa."
            }

    @staticmethod
    def calculate_addon_prorated_price(extra_count: int, unit_price: float, billing_cycle: str) -> float:
        discounts = {"MONTHLY": 0.0, "SEMIANNUAL": 0.10, "ANNUAL": 0.20}
        discount = discounts.get(billing_cycle, 0.0)
        return extra_count * unit_price * (1.0 - discount)

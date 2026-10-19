from datetime import datetime
from typing import Dict, Any, List
from app.core.exceptions import AppException

class SyncService:
    @staticmethod
    def validate_pos_sync_allowed(subscription_status: str) -> None:
        """
        Regla de Negocio Global 2:
        Si la suscripción está en estado 'SUSPENDED', el sistema bloquea
        la sincronización entrante de Xion-POS.
        """
        if subscription_status == "SUSPENDED":
            raise AppException(
                error_code="SUBSCRIPTION_SUSPENDED",
                message="La sincronización con Xion-POS está bloqueada debido a que la suscripción del negocio se encuentra suspendida.",
                status_code=403,
                action_required="RENEW_SUBSCRIPTION_AT_CHECKOUT"
            )

    @staticmethod
    def process_pos_batch_sales(
        pos_session_uuid: str,
        sales: List[Dict[str, Any]],
        processed_uuid_set: set
    ) -> Dict[str, Any]:
        """
        Procesa el lote de ventas de Xion-POS aplicando Idempotencia estricta.
        Si la venta pos_sale_uuid ya existe en processed_uuid_set, la ignora para evitar duplicados.
        """
        synced_count = 0
        ignored_count = 0

        for sale in sales:
            pos_sale_uuid = sale.get("pos_sale_uuid")
            if pos_sale_uuid in processed_uuid_set:
                ignored_count += 1
            else:
                processed_uuid_set.add(pos_sale_uuid)
                synced_count += 1

        return {
            "status": "SYNC_SUCCESS",
            "pos_session_uuid": pos_session_uuid,
            "synced_sales_count": synced_count,
            "ignored_duplicates_count": ignored_count,
            "server_timestamp": datetime.utcnow().isoformat()
        }

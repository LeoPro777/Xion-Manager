from datetime import datetime
from typing import Optional, Dict, Any

class AuditService:
    @staticmethod
    def create_log_entry(
        business_id: str,
        module: str,
        action_type: str,
        description: str,
        user_id: Optional[str] = None,
        branch_id: Optional[str] = None,
        cash_register_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Genera una entrada inmutable de auditoría para ser almacenada en la tabla audit_logs.
        Regla: Prohibida la eliminación o edición de logs de auditoría.
        """
        return {
            "business_id": business_id,
            "user_id": user_id,
            "branch_id": branch_id,
            "cash_register_id": cash_register_id,
            "module": module.upper(),
            "action_type": action_type.upper(),
            "description": description,
            "details": details or {},
            "ip_address": ip_address or "127.0.0.1",
            "created_at": datetime.utcnow()
        }

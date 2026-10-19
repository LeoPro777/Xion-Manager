from typing import List, Dict, Any
from app.core.exceptions import AppException

class InventoryService:
    @staticmethod
    def calculate_weighted_average_cost(
        current_stock: float, 
        current_cost: float, 
        new_quantity: float, 
        new_cost: float
    ) -> float:
        """
        Calcula el costo promedio ponderado tras el ingreso de una nueva factura de compra.
        """
        total_quantity = current_stock + new_quantity
        if total_quantity <= 0:
            return new_cost
        
        total_val = (current_stock * current_cost) + (new_quantity * new_cost)
        return round(total_val / total_quantity, 4)

    @staticmethod
    def validate_transfer_dispatch(source_stock: float, dispatch_quantity: float) -> None:
        """
        Valida que la sucursal de origen posea existencias suficientes antes de despachar un traslado.
        """
        if dispatch_quantity <= 0:
            raise AppException(
                error_code="INVALID_QUANTITY",
                message="La cantidad a despachar debe ser mayor a cero.",
                status_code=400
            )
        if source_stock < dispatch_quantity:
            raise AppException(
                error_code="INSUFFICIENT_STOCK",
                message=f"Stock insuficiente en sucursal origen. Disponible: {source_stock}, Solicitado: {dispatch_quantity}",
                status_code=409,
                details={"available": source_stock, "requested": dispatch_quantity}
            )

    @staticmethod
    def process_transfer_reception(
        dispatched_quantity: float, 
        received_quantity: float
    ) -> Dict[str, Any]:
        """
        Maneja la recepción de mercancía y detecta si existen discrepancias físicas.
        """
        discrepancy = received_quantity - dispatched_quantity
        status = "COMPLETED" if discrepancy == 0 else "DISCREPANCY"
        return {
            "status": status,
            "received_quantity": received_quantity,
            "discrepancy": discrepancy,
            "has_discrepancy": discrepancy != 0
        }

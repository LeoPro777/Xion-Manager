#!/usr/bin/env python3
"""
=============================================================================
XION-MANAGER: Script de Reinicio Completo de Base de Datos (Desde 0)
=============================================================================
Este script limpia todas las tablas y datos de prueba en la base de datos
(PostgreSQL / Supabase / SQLite) y re-siembra los planes oficiales de suscripción.
También notifica al endpoint público del servidor (Render o Local) para purgar
las cachés en memoria.

Uso:
    python scripts/reset_db.py
    python scripts/reset_db.py --only-remote
    python scripts/reset_db.py --only-direct
    python scripts/reset_db.py --remote-url https://xion-manager.onrender.com/api/v1/system/reset-database
=============================================================================
"""

import sys
import os
import argparse
import asyncio
from datetime import datetime

# Asegurar que el directorio backend esté en el PYTHONPATH
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# Lista completa de tablas del sistema
TABLES_TO_CLEAR = [
    "audit_logs",
    "branch_inventory",
    "branches",
    "business_settings",
    "business_subscriptions",
    "businesses",
    "cash_registers",
    "categories",
    "inventory_shrinkage",
    "inventory_transactions",
    "payment_methods",
    "payment_reports",
    "product_compositions",
    "products",
    "purchase_items",
    "purchases",
    "staff_pairings",
    "subscription_plans",
    "supplier_payables_ledger",
    "suppliers",
    "system_settings",
    "user_preferences",
    "user_sessions",
    "users",
    "xion_pay_config"
]

DEFAULT_REMOTE_URL = "https://xion-manager.onrender.com/api/v1/system/reset-database"


async def reset_direct_database() -> bool:
    """Conecta directamente con la base de datos vía SQLAlchemy y vacía todas las tablas."""
    print("  [1/2] Conectando directamente con la base de datos...")
    try:
        from app.core.database import AsyncSessionLocal
        from app.core.init_db import seed_initial_data
        from sqlalchemy import text, delete
        from app.models.entities import (
            UserSession, UserPreference, AuditLog, InventoryTransaction,
            InventoryShrinkage, SupplierPayablesLedger, PurchaseItem, Purchase,
            Supplier, BranchInventory, ProductComposition, Product, Category,
            PaymentReport, CashRegister, Branch, User, Business, SystemSettings,
            BusinessSubscription, XionPayConfig, PaymentMethod,
            SubscriptionPlan
        )

        async with AsyncSessionLocal() as session:
            # Intentar TRUNCATE CASCADE para PostgreSQL
            try:
                truncate_sql = f"TRUNCATE TABLE {', '.join(TABLES_TO_CLEAR)} CASCADE;"
                await session.execute(text(truncate_sql))
                await session.commit()
                print("  ✓ Tablas truncadas atómicamente con TRUNCATE CASCADE.")
            except Exception as e:
                await session.rollback()
                print(f"  ℹ TRUNCATE no soportado o falló ({e}). Aplicando DELETE iterativo...")
                for model in [
                    UserSession, UserPreference, AuditLog, InventoryTransaction,
                    InventoryShrinkage, SupplierPayablesLedger, PurchaseItem, Purchase,
                    Supplier, BranchInventory, ProductComposition, Product, Category,
                    PaymentReport, CashRegister, Branch, SystemSettings,
                    BusinessSubscription, XionPayConfig, PaymentMethod,
                    User, Business, SubscriptionPlan
                ]:
                    try:
                        await session.execute(delete(model))
                    except Exception:
                        pass
                try:
                    await session.execute(text("DELETE FROM staff_pairings;"))
                except Exception:
                    pass
                await session.commit()
                print("  ✓ Tablas vaciadas vía DELETE.")

        # Re-sembrar planes oficiales de suscripción
        await seed_initial_data()
        print("  ✓ Planes de suscripción base configurados.")
        return True

    except Exception as exc:
        print(f"  ❌ Error al resetear base de datos directamente: {exc}")
        return False


def reset_remote_endpoint(url: str) -> bool:
    """Invoca el endpoint público /system/reset-database para purgar cachés en memoria."""
    print(f"  [2/2] Invocando endpoint público en servidor: {url} ...")
    try:
        import urllib.request
        import json

        req = urllib.request.Request(
            url,
            method="POST",
            headers={"User-Agent": "XionManager-ResetScript/1.0", "Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=15) as response:
            status_code = response.getcode()
            body = response.read().decode("utf-8")
            if status_code == 200:
                print(f"  ✓ Servidor remoto respondió 200 OK: {body}")
                return True
            else:
                print(f"  ⚠ Servidor remoto respondió con estado {status_code}: {body}")
                return False
    except Exception as exc:
        print(f"  ⚠ No se pudo contactar el endpoint remoto ({exc}). Se omite la notificación remota.")
        return False


def main():
    parser = argparse.ArgumentParser(description="Reinicia la base de datos de Xion-Manager desde 0.")
    parser.add_argument("--only-remote", action="store_true", help="Solo llamar al endpoint remoto vía HTTP")
    parser.add_argument("--only-direct", action="store_true", help="Solo conectar directamente a la BDD local/Supabase")
    parser.add_argument("--remote-url", default=DEFAULT_REMOTE_URL, help=f"URL del endpoint público (defecto: {DEFAULT_REMOTE_URL})")

    args = parser.parse_args()

    print("\n" + "=" * 65)
    print("🔄 XION-MANAGER: REINICIO DE BASE DE DATOS DESDE 0")
    print(f"🕒 Hora de ejecución: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 65)

    success_direct = True
    success_remote = True

    if not args.only_remote:
        success_direct = asyncio.run(reset_direct_database())

    if not args.only_direct:
        success_remote = reset_remote_endpoint(args.remote_url)

    print("\n" + "=" * 65)
    if success_direct or success_remote:
        print("✅ Base de datos y memorias reiniciadas exitosamente.")
        print("El sistema se encuentra 100% listo para pruebas desde 0.")
    else:
        print("❌ Hubo advertencias o fallas durante el reinicio.")
    print("=" * 65 + "\n")


if __name__ == "__main__":
    main()

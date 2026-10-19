import asyncio
from datetime import datetime, timedelta
from sqlalchemy import select
from app.core.database import AsyncSessionLocal, engine, Base
from app.models.entities import SubscriptionPlan, Business, BusinessSubscription, Branch, User, Product, BranchInventory

async def seed_initial_data():
    """
    Puebla la base de datos local con los planes base, negocio de prueba, sucursales e inventario.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # 1. Verificar si ya existen planes
        result = await session.execute(select(SubscriptionPlan))
        existing_plans = result.scalars().all()
        
        if not existing_plans:
            plan_emp = SubscriptionPlan(
                code="EMP",
                name="Plan Emprendedor",
                description="Ideal para pequeños comercios y 1 sucursal única.",
                max_branches=1,
                max_cash_registers=1,
                price_monthly=20.00,
                price_semiannual=108.00,
                price_annual=192.00
            )
            plan_com = SubscriptionPlan(
                code="COM",
                name="Plan Comercio",
                description="Hasta 3 sucursales y 6 cajas registradoras.",
                max_branches=3,
                max_cash_registers=6,
                price_monthly=50.00,
                price_semiannual=270.00,
                price_annual=480.00
            )
            plan_corp = SubscriptionPlan(
                code="CORP",
                name="Plan Corporativo",
                description="Hasta 10 sucursales y 25 cajas registradoras.",
                max_branches=10,
                max_cash_registers=25,
                price_monthly=150.00,
                price_semiannual=810.00,
                price_annual=1440.00
            )
            session.add_all([plan_emp, plan_com, plan_corp])
            await session.commit()
        # 2. Verificar si existe negocio principal
        biz_result = await session.execute(select(Business).limit(1))
        existing_biz = biz_result.scalar_one_or_none()
        if not existing_biz:
            default_biz = Business(
                id="biz-101",
                legal_name="Comercializadora Xion C.A.",
                trade_name="Xion Supermarket & Retail",
                tax_id="J-12345678-9",
                phone="+58 414-1112233",
                email="contacto@xion.com",
                is_active=True
            )
            session.add(default_biz)
            await session.commit()
            print("✓ Negocio corporativo inicial sembrado exitosamente.")


if __name__ == "__main__":
    asyncio.run(seed_initial_data())

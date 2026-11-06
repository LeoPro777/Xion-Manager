import asyncio
from datetime import datetime, timedelta
from sqlalchemy import select
from app.core.database import AsyncSessionLocal, engine, Base
from app.models.entities import (
    SubscriptionPlan, Business, BusinessSubscription, Branch, User,
    Product, BranchInventory, UserSession, UserPreference
)

async def seed_initial_data():
    """
    Puebla la base de datos local con los planes base del sistema.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # 1. Verificar si ya existen planes
        result = await session.execute(select(SubscriptionPlan))
        existing_plans = result.scalars().all()
        
        if not existing_plans:
            plan_trial = SubscriptionPlan(
                id="plan-trial",
                code="TRIAL",
                name="Plan Gratuito (Prueba 30 Días)",
                description="Acceso total sin costo durante 30 días para evaluar la plataforma multi-sucursal y sincronización POS",
                max_branches=2,
                max_cash_registers=3,
                price_monthly=0.00,
                price_semiannual=0.00,
                price_annual=0.00,
                is_active=True
            )
            plan_emp = SubscriptionPlan(
                id="plan-emp",
                code="EMP",
                name="Plan Emprendedor",
                description="Ideal para pequeños comercios y 1 sucursal única.",
                max_branches=1,
                max_cash_registers=1,
                price_monthly=20.00,
                price_semiannual=108.00,
                price_annual=192.00,
                is_active=True
            )
            plan_com = SubscriptionPlan(
                id="plan-com",
                code="COM",
                name="Plan Comercio",
                description="Hasta 3 sucursales y 6 cajas registradoras.",
                max_branches=3,
                max_cash_registers=6,
                price_monthly=50.00,
                price_semiannual=270.00,
                price_annual=480.00,
                is_active=True
            )
            plan_corp = SubscriptionPlan(
                id="plan-corp",
                code="CORP",
                name="Plan Corporativo",
                description="Hasta 10 sucursales y 25 cajas registradoras.",
                max_branches=10,
                max_cash_registers=25,
                price_monthly=150.00,
                price_semiannual=810.00,
                price_annual=1440.00,
                is_active=True
            )
            session.add_all([plan_trial, plan_emp, plan_com, plan_corp])
            await session.commit()
            print("✓ Planes de suscripción oficiales configurados.")


if __name__ == "__main__":
    asyncio.run(seed_initial_data())

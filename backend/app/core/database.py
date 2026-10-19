import os
import ssl
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

db_url = settings.ASYNC_DATABASE_URL

connect_args = {}
if "sqlite" not in db_url:
    raw_db_str = (settings.DATABASE_URL or os.environ.get("DATABASE_URL") or "").lower()
    if (
        "supabase.co" in db_url
        or "pooler.supabase.com" in db_url
        or "sslmode=" in raw_db_str
        or settings.POSTGRES_SSL
        or settings.ENVIRONMENT == "production"
    ):
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        connect_args["ssl"] = ctx

engine = create_async_engine(
    db_url,
    echo=settings.DEBUG and settings.ENVIRONMENT == "development",
    future=True,
    pool_pre_ping=True,
    pool_recycle=300,
    connect_args=connect_args
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

import os
import ssl
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

db_url = settings.ASYNC_DATABASE_URL

connect_args = {}
if "sqlite" not in db_url:
    raw_db_str = (settings.DATABASE_URL or os.environ.get("DATABASE_URL") or settings.SUPABASE_URL or "").lower()
    is_supabase = "supabase.co" in db_url or "pooler.supabase.com" in db_url or "supabase" in raw_db_str
    if (
        is_supabase
        or "sslmode=" in raw_db_str
        or settings.POSTGRES_SSL
        or settings.ENVIRONMENT == "production"
    ):
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        connect_args["ssl"] = ctx

    if is_supabase or ":6543" in db_url or "pooler" in db_url:
        connect_args["statement_cache_size"] = 0
        connect_args["prepared_statement_cache_size"] = 0

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

import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Xion-Manager"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"
    
    SECRET_KEY: str = "xion_manager_secret_key_super_secure_jwt_2026"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 14
    
    PORT: int = 8000

    # Supabase / PostgreSQL Database Settings
    DATABASE_URL: Optional[str] = None
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "xion_admin"
    POSTGRES_PASSWORD: str = "xion_seguro_db_pass"
    POSTGRES_DB: str = "xion_manager_db"
    POSTGRES_SSL: bool = True

    # Supabase API Settings (PostgREST / Storage / Auth)
    SUPABASE_URL: Optional[str] = None
    SUPABASE_KEY: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None

    # SQLite local fallback: False por defecto para forzar uso prioritario de PostgreSQL / Supabase
    USE_SQLITE_FALLBACK: bool = False
    SQLITE_DB_PATH: str = "xion_manager_dev.db"

    # Frontend build static files directory
    FRONTEND_DIST_DIR: Optional[str] = None

    GOOGLE_MAPS_API_KEY: str = "AIzaSy_mock_google_maps_key"

    # Google OAuth 2.0 Credentials
    GOOGLE_CLIENT_ID: Optional[str] = "926646602874-dakf4njbrmgg2fp4qokfflq7tlhid68j.apps.googleusercontent.com"
    GOOGLE_CLIENT_SECRET: Optional[str] = None

    # Cloudflare R2 / S3-compatible Object Storage
    STORAGE_BACKEND: str = "r2"  # "r2" | "local"
    LOCAL_STORAGE_PATH: str = "./uploads"
    R2_ACCOUNT_ID: Optional[str] = None
    R2_ACCESS_KEY_ID: Optional[str] = None
    R2_SECRET_ACCESS_KEY: Optional[str] = None
    R2_BUCKET_NAME: str = "xion-media"
    R2_ENDPOINT_URL: Optional[str] = None
    R2_PUBLIC_DOMAIN_URL: str = "https://media.xion.com"
    R2_PRESIGNED_URL_EXPIRES_IN: int = 900  # 15 minutes

    @property
    def CLOUDFLARE_R2_ENDPOINT(self) -> str:
        if self.R2_ENDPOINT_URL:
            return self.R2_ENDPOINT_URL
        if self.R2_ACCOUNT_ID:
            return f"https://{self.R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
        return "https://mock.r2.cloudflarestorage.com"

    GRACE_PERIOD_DAYS: int = 3

    # Xion-Pay Integration
    XION_PAY_BASE_URL: str = "https://xion-pay.onrender.com"
    XION_PAY_TENANT_ID: str = "3bf4dff9-402f-42ce-8148-3f7b6450c9e6"
    XION_PAY_WEBHOOK_SECRET: str = "xion_pay_webhook_secret_key"
    XION_PAY_TIMEOUT: float = 10.0

    @property
    def ASYNC_DATABASE_URL(self) -> str:
        # Prioridad absoluta: DATABASE_URL directa o SUPABASE_URL si contiene esquema postgres
        raw_url = self.DATABASE_URL or os.environ.get("DATABASE_URL")
        if not raw_url and self.SUPABASE_URL and ("postgres://" in self.SUPABASE_URL or "postgresql://" in self.SUPABASE_URL):
            raw_url = self.SUPABASE_URL

        if raw_url:
            clean_url = raw_url.strip()
            # Normalizar driver para asyncpg
            if clean_url.startswith("postgres://"):
                clean_url = "postgresql+asyncpg://" + clean_url[11:]
            elif clean_url.startswith("postgresql://"):
                clean_url = "postgresql+asyncpg://" + clean_url[13:]
            elif not clean_url.startswith("postgresql+asyncpg://") and not clean_url.startswith("sqlite"):
                clean_url = f"postgresql+asyncpg://{clean_url}"

            # Quitar sslmode del query string porque asyncpg lo maneja en connect_args
            if "?" in clean_url:
                base, query = clean_url.split("?", 1)
                query_params = [
                    p for p in query.split("&")
                    if not p.lower().startswith("sslmode=") and not p.lower().startswith("ssl=")
                ]
                clean_url = f"{base}?{'&'.join(query_params)}" if query_params else base
            return clean_url

        if self.ENVIRONMENT == "development" and self.USE_SQLITE_FALLBACK:
            return f"sqlite+aiosqlite:///{self.SQLITE_DB_PATH}"

        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    model_config = SettingsConfigDict(env_file=(".env", "../.env"), case_sensitive=True, extra="ignore")

settings = Settings()


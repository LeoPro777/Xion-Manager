# Infraestructura, DevOps y Resiliencia (`08_infrastructure.md`)

---

## 1. Configuración de Entornos (`.env`)

```ini
# Configuración del Sistema
PROJECT_NAME="Xion-Manager"
ENVIRONMENT=production
DEBUG=False
API_V1_STR="/api/v1"
SECRET_KEY="clave_secreta_jwt_de_alta_entropia"
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=14

# Base de Datos PostgreSQL
POSTGRES_SERVER=postgres
POSTGRES_PORT=5432
POSTGRES_USER=xion_admin
POSTGRES_PASSWORD=xion_seguro_db_pass
POSTGRES_DB=xion_manager_db

# Google Maps Platform
GOOGLE_MAPS_API_KEY="AIzaSy_clave_google_maps_para_geolocalizacion"

# Almacenamiento Centralizado de Imágenes y Archivos (Cloudflare R2 / S3-Compatible)
STORAGE_BACKEND=r2
R2_ACCOUNT_ID="your_cloudflare_account_id"
R2_ENDPOINT_URL="https://your_cloudflare_account_id.r2.cloudflarestorage.com"
R2_ACCESS_KEY_ID="your_r2_access_key_id"
R2_SECRET_ACCESS_KEY="your_r2_secret_access_key"
R2_BUCKET_NAME="xion-media"
R2_PUBLIC_DOMAIN_URL="https://media.xion.com"
R2_PRESIGNED_URL_EXPIRES_IN=900

# Configuración de Sincronización Xion-POS y Xion-Pay
XION_PAY_WEBHOOK_SECRET="whsec_firma_xion_pay_segura"
GRACE_PERIOD_DAYS=3
```

---

## 2. Containerización (`docker-compose.yml`)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: xion_manager_postgres
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-xion_admin}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-xion_seguro_db_pass}
      POSTGRES_DB: ${POSTGRES_DB:-xion_manager_db}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U xion_admin -d xion_manager_db"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: ../docker/backend.Dockerfile
    container_name: xion_manager_backend
    restart: always
    depends_on:
      postgres:
        condition: service_healthy
    env_file:
      - .env
    volumes:
      - uploads_data:/app/data/uploads
    ports:
      - "8000:8000"

  frontend-web:
    build:
      context: ./frontend-web
      dockerfile: ../docker/frontend.Dockerfile
    container_name: xion_manager_web
    restart: always
    depends_on:
      - backend
    ports:
      - "80:80"

volumes:
  postgres_data:
  uploads_data:
```

---

## 3. Mecanismo de Logs y Monitoreo

* Registro de eventos formateado en **JSON estructurado** mediante `loguru` o el módulo nativo de logging con interceptores.
* Inclusión obligatoria en los logs de: `timestamp`, `log_level`, `business_id`, `user_id`, `path`, `method` y `execution_time_ms`.

---

## 4. Resiliencia y Manejo de Conexión de Cajas Xion-POS

1. **Idempotencia de Transacciones:** Cada venta o turno sincronizado desde Xion-POS viaja con un identificador único generado localmente (`pos_sale_uuid` o `pos_session_uuid`). Si la conexión falla y la terminal reintenta el envío, el Manager ignora los duplicados y confirma el éxito de recepción sin duplicar stock ni ventas.
2. **Período de Gracia Automatizado:** Cuando un plan vence, el negocio entra en estado `GRACE_PERIOD` por 3 días hábiles. Durante este lapso, Xion-Manager emite alertas preventivas continuas pero mantiene operativas las terminales POS. Al cuarto día de impago, pasa a `SUSPENDED`, cerrando el canal de sincronización y protegiendo la integridad del negocio.

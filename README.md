# Xion-Manager - Plataforma Central de Administración

---

## 📌 Documentación de Contexto del Sistema (Blueprint)

Toda la documentación técnica del sistema está organizada de forma modular en el directorio [`docs/`](file:///c:/Users/Usuario/Desktop/Xion/Xion-Manager/docs/):

1. 📄 **[01_overview.md](file:///c:/Users/Usuario/Desktop/Xion/Xion-Manager/docs/01_overview.md):** Visión General, Alcance (In Scope / Out of Scope), Reglas de Negocio Globales y Glosario.
2. 📄 **[02_architecture.md](file:///c:/Users/Usuario/Desktop/Xion/Xion-Manager/docs/02_architecture.md):** Patrón Arquitectónico Clean Layered, Árbol de Directorios Objetivo, Responsabilidad de Componentes y Protocolos REST/WebSocket/Webhooks.
3. 📄 **[03_modules.md](file:///c:/Users/Usuario/Desktop/Xion/Xion-Manager/docs/03_modules.md):** Especificación Detallada de los 9 Módulos del Sistema (Dashboard, Sucursales y Cajas, Inventario y Traslados, Compras, Usuarios, Auditoría, Reportes, Notificaciones, Checkout/Xion-Pay).
4. 📄 **[04_data_model.md](file:///c:/Users/Usuario/Desktop/Xion/Xion-Manager/docs/04_data_model.md):** Modelo de Datos, Diagrama ER en Mermaid, Esquema relacional SQL completo en PostgreSQL 16 (13 tablas) y Seeders base.
5. 📄 **[05_security_auth.md](file:///c:/Users/Usuario/Desktop/Xion/Xion-Manager/docs/05_security_auth.md):** Estrategia de Autenticación, Ciclo de vida de tokens JWT con revocación y Matriz de Roles (RBAC).
6. 📄 **[06_api_spec.md](file:///c:/Users/Usuario/Desktop/Xion/Xion-Manager/docs/06_api_spec.md):** Especificación de Endpoints REST/WebSocket principales, payloads de entrada/salida y catálogo estándar de respuestas de error.
7. 📄 **[07_development_rules.md](file:///c:/Users/Usuario/Desktop/Xion/Xion-Manager/docs/07_development_rules.md):** Stack Tecnológico (FastAPI + React Vite + React Native), Convenciones de Código y Lista de Prohibiciones Estrictas.
8. 📄 **[08_infrastructure.md](file:///c:/Users/Usuario/Desktop/Xion/Xion-Manager/docs/08_infrastructure.md):** Variables de Entorno (`.env`), Orquestación con `docker-compose.yml`, Estrategia de Logging en JSON estructurado y Resiliencia/Idempotencia Xion-POS.

---

## 🛠️ Stack Tecnológico

* **Backend:** Python 3.11+, FastAPI 0.110+, SQLAlchemy 2.0 (Asyncio + Asyncpg), Alembic, Pydantic v2.
* **Base de Datos:** PostgreSQL 16.
* **Frontend Web:** TypeScript 5.4+, React 18+, Vite, Tailwind CSS, Lucide Icons.
* **Aplicación Móvil:** React Native 0.73+ (Expo SDK 50+).
* **Infraestructura:** Docker & Docker Compose.

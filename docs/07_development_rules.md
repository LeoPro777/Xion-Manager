# Reglas de Desarrollo y Estilo (`07_development_rules.md`)

---

## 1. Stack Tecnológico Específico

* **Backend:** Python 3.11+, FastAPI 0.110+, SQLAlchemy 2.0 (asyncio + asyncpg), Alembic, Pydantic v2.
* **Base de Datos:** PostgreSQL 16.
* **Frontend Web:** TypeScript 5.4+, React 18+, Vite, Tailwind CSS, Lucide Icons, Shadcn UI / Radix Primitives.
* **Aplicación Móvil:** React Native 0.73+ con Expo SDK 50+, NativeWind (Tailwind en RN), React Navigation.
* **Contenedores:** Docker & Docker Compose.

---

## 2. Convenciones de Código

### 2.1. Backend (Python)
* Nomenclatura: `snake_case` para variables, funciones, nombres de archivo y endpoints. `PascalCase` para clases y modelos.
* Tipado estricto con Type Hints en cada función y modelo de datos.
* Inyección de dependencias nativa de FastAPI para sesiones de BD y usuario autenticado (`Depends(get_db)`, `Depends(get_current_user)`).

### 2.2. Frontend (TypeScript / React / React Native)
* Nomenclatura: `camelCase` para variables y métodos; `PascalCase` para componentes React y tipos/interfaces.
* Tipado estricto: vetado el uso de `any`.
* Textos de interfaz y mensajes amigables, claros y comprensibles para usuarios no técnicos.

---

## 3. Estrategia de Manejo de Errores

* Middleware centralizado para interceptar excepciones de dominio (`AppException`), formateando la salida bajo el estándar definido en `06_api_spec.md`.
* Los errores en transferencias de inventario o arqueos de caja deben registrarse de forma obligatoria en la tabla `audit_logs` con la información contextual completa.

---

## 4. Lista de "Prohibiciones Estrictas" (Reglas Inquebrantables)

1. **PROHIBIDO** confiar en validaciones del frontend: toda restricción (cupo de cajas, stock, montos, permisos) se valida de forma estricta en FastAPI.
2. **PROHIBIDO** ejecutar operaciones de eliminación física (`DELETE`) sobre registros de auditoría, bitácoras de caja, ventas sincronizadas y comprobantes de pago.
3. **PROHIBIDO** permitir la creación de una caja registradora sin verificar el cupo contratado en `business_subscriptions`.
4. **PROHIBIDO** sincronizar transacciones o ventas de terminales Xion-POS cuyo negocio se encuentre en estado `SUSPENDED`.
5. **PROHIBIDO** escribir código con llamadas síncronas bloqueantes en el backend (se requiere uso estricto de `async/await` en base de datos y llamadas externas).

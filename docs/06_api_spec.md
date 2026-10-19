# Contratos de Integración y API (`06_api_spec.md`)

---

## 1. Especificación de Endpoints Principales

### 1.1. Obtener Estado de Cuenta y Semáforo de Consumo

* **Ruta:** `GET /api/v1/billing/account-status`
* **Headers:** `Authorization: Bearer <token>`
* **Respuesta Exitosa (`200 OK`):**

```json
{
  "plan_name": "Plan Comercio",
  "billing_cycle": "MONTHLY",
  "expires_at": "2026-11-01T23:59:59Z",
  "days_remaining": 24,
  "traffic_light": {
    "status": "ACTIVE",
    "color": "GREEN",
    "label": "Al día",
    "description": "Tu suscripción está completamente activa."
  },
  "resource_usage": {
    "branches": {
      "used": 2,
      "limit": 3,
      "percentage": 66.6
    },
    "cash_registers": {
      "used": 4,
      "limit": 6,
      "percentage": 66.6
    }
  }
}
```

---

### 1.2. Crear Sucursal con Ubicación

* **Ruta:** `POST /api/v1/branches`
* **Payload de Entrada:**

```json
{
  "name": "Sucursal Norte - Centro Comercial Lago Mall",
  "address": "Av. 2 El Milagro, Nivel PB, Local 12",
  "latitude": 10.6698,
  "longitude": -71.5989,
  "phone": "+584121234567",
  "manager_user_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
}
```

* **Respuesta Exitosa (`201 Created`):**

```json
{
  "id": "e3b0c442-98fc-1c14-9afb-4c8996fb9242",
  "name": "Sucursal Norte - Centro Comercial Lago Mall",
  "address": "Av. 2 El Milagro, Nivel PB, Local 12",
  "latitude": 10.6698,
  "longitude": -71.5989,
  "phone": "+584121234567",
  "manager_user_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "active_cash_registers_count": 0,
  "is_active": true,
  "created_at": "2026-10-08T17:30:00Z"
}
```

---

### 1.3. Reportar Pago Directo (Pago Móvil / Transferencia)

* **Ruta:** `POST /api/v1/billing/report-payment`
* **Content-Type:** `multipart/form-data`
* **Campos:**
  * `payment_method_type`: `"PAGO_MOVIL"`
  * `issuing_bank`: `"Banesco"`
  * `payment_date`: `"2026-10-08"`
  * `reference_number`: `"88492019"`
  * `amount`: `50.00`
  * `receipt_file`: `[Archivo Binario: comprobante_pago.pdf]`
* **Respuesta Exitosa (`202 Accepted`):**

```json
{
  "message": "Tu reporte de pago ha sido recibido con éxito y está en proceso de verificación.",
  "report_id": "b1b2b3b4-c5c6-7d8e-9f0a-1b2c3d4e5f6a",
  "status": "PENDING"
}
```

---

### 1.4. Sincronización Ingesta de Cajas (Xion-POS Sync Hub)

* **Ruta:** `POST /api/v1/sync/pos-push`
* **Payload de Entrada:**

```json
{
  "cash_register_id": "c1f8a892-3a55-4e89-a3b0-2b1d033f1100",
  "pos_session_uuid": "sess-pos-101-20261008-01",
  "turn_data": {
    "opened_by_user_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    "opened_at": "2026-10-08T08:00:00Z",
    "closed_at": "2026-10-08T16:00:00Z",
    "initial_cash": 100.00,
    "declared_cash": 540.00,
    "calculated_cash": 540.00,
    "difference": 0.00
  },
  "sales": [
    {
      "pos_sale_uuid": "sale-001-99812",
      "timestamp": "2026-10-08T10:15:30Z",
      "total_amount": 45.00,
      "payment_method": "PAGO_MOVIL",
      "items": [
        {
          "product_barcode": "7591234567890",
          "quantity": 3,
          "unit_price": 15.00
        }
      ]
    }
  ]
}
```

* **Respuesta Exitosa (`200 OK`):**

```json
{
  "status": "SYNC_SUCCESS",
  "synced_sales_count": 1,
  "inventory_updated": true,
  "server_timestamp": "2026-10-08T17:35:00Z"
}
```

---

### 1.5. Vinculación de Terminales ("Flujo Smart TV" / Device Flow)

#### A. Terminal POS solicita código de vinculación de 6 caracteres
* **Ruta:** `POST /api/v1/terminals/request-pairing`
* **Payload de Entrada:**
```json
{
  "hardware_uuid": "HW-POS-DELL-OPTIPLEX-7090",
  "client_version": "1.4.0-desktop"
}
```
* **Respuesta Exitosa (`200 OK`):**
```json
{
  "pairing_code": "X9-B42",
  "expires_in_seconds": 900,
  "qr_payload": "xion://pair?code=X9-B42&hw=HW-POS-DELL-OPTIPLEX-7090"
}
```

#### B. Dueño autoriza la terminal desde Web/Móvil
* **Ruta:** `POST /api/v1/terminals/confirm-pairing`
* **Headers:** `Authorization: Bearer <owner_access_token>`
* **Payload de Entrada:**
```json
{
  "pairing_code": "X9-B42",
  "branch_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "name": "Caja Principal - Sucursal Centro"
}
```
* **Respuesta Exitosa (`200 OK`):**
```json
{
  "status": "PAIRED",
  "cash_register_id": "reg-550e8400-e29b-41d4-a716-446655440000",
  "branch_name": "Sucursal Centro",
  "device_name": "Caja Principal - Sucursal Centro",
  "paired_at": "2026-10-14T21:30:00Z"
}
```

#### C. Terminal POS consulta estado de aprobación o recibe evento
* **Ruta:** `GET /api/v1/terminals/pairing-status/{pairing_code}`
* **Respuesta Exitosa cuando el dueño aprueba (`200 OK`):**
```json
{
  "status": "APPROVED",
  "device_token": "xion_dev_tok_9f83ac1278e9b...",
  "cash_register_id": "reg-550e8400-e29b-41d4-a716-446655440000",
  "branch_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "branch_name": "Sucursal Centro",
  "name": "Caja Principal - Sucursal Centro"
}
```

#### D. Revocación Remota con 1 Clic por el Dueño
* **Ruta:** `POST /api/v1/terminals/{id}/revoke-device`
* **Headers:** `Authorization: Bearer <owner_access_token>`
* **Respuesta Exitosa (`200 OK`):**
```json
{
  "status": "DEVICE_REVOKED",
  "message": "Acceso al equipo revocado. La terminal no podrá sincronizar ni operar ventas."
}
```

---

### 1.6. Autenticación de Cajero por PIN en Terminal Vinculada

* **Ruta:** `POST /api/v1/auth/cashier-pin-login`
* **Headers:** `X-Device-Token: xion_dev_tok_9f83ac1278e9b...`
* **Payload de Entrada:**
```json
{
  "cashier_id": "usr-cashier-01",
  "pin": "1428"
}
```
* **Respuesta Exitosa (`200 OK`):**
```json
{
  "cashier_token": "xion_cashier_tok_7b29a1...",
  "cashier": {
    "id": "usr-cashier-01",
    "full_name": "Juan Pérez",
    "role": "CASHIER"
  },
  "terminal": {
    "id": "reg-550e8400-e29b-41d4-a716-446655440000",
    "name": "Caja Principal",
    "branch_name": "Sucursal Centro"
  },
  "expires_in_hours": 12
}
```

---

## 2. Catálogo de Errores Estándar

Todos los errores devuelven un formato estructurado y amigable:

```json
{
  "error_code": "RESOURCE_LIMIT_EXCEEDED",
  "message": "Has alcanzado el límite de cajas permitidas en tu plan actual.",
  "action_required": "UPGRADE_PLAN_OR_BUY_ADDON",
  "details": {
    "current_used": 6,
    "plan_limit": 6
  }
}
```

* **`400 Bad Request`:** Parámetros inválidos o comprobante de pago con formato no admitido.
* **`401 Unauthorized`:** Token expirado o ausente.
* **`403 Forbidden`:** Usuario pendiente de aprobación o suscripción en estado `SUSPENDED`.
* **`409 Conflict`:** Conflicto de recursos (ej. caja con el mismo nombre en la sucursal o número de referencia bancaria ya registrado).
* **`422 Unprocessable Entity`:** Fallo de validación semántica en esquema Pydantic.

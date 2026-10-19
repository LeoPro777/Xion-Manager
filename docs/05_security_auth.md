# Seguridad, Autenticación y Sesiones (`05_security_auth.md`)

---

## 1. Estrategia de Autenticación

* **Proveedor:** Autenticación local mediante correo y contraseña con derivación de clave usando **Argon2id** o **Bcrypt** (coste 12).
* **Flujo de Acceso:** Credenciales válidas $\rightarrow$ Validación de estado `approval_status == 'APPROVED'` y `is_active == TRUE`. Si el usuario se encuentra pendiente de aprobación, el sistema emite un error `403 Forbidden` con mensaje amigable: *"Tu solicitud de acceso está en revisión por el administrador de tu negocio"*.

---

## 2. Ciclo de Vida de la Sesión

* **Tokens JWT Asimétricos / Simétricos (HS256):**
  * **Access Token:** Vigencia de 30 minutos. Contiene en el payload: `sub` (ID de usuario), `business_id`, `role`, `branch_id`.
  * **Refresh Token:** Vigencia de 14 días, almacenado con hash en la base de datos para habilitar revocación inmediata ante cambios de rol, despidos o bloqueos preventivos.
* **Mecanismo de Revocación Inmediata:** Si el propietario suspende un usuario, invalida todas las sesiones asociadas a ese `user_id` de forma sincrónica.

---

## 3. Modelo de Autorización Basado en Roles (RBAC)

| Módulo / Acción | Propietario (`OWNER`) | Administrador (`ADMIN`) | Gerente Sucursal (`BRANCH_MANAGER`) | Supervisor (`SUPERVISOR`) | Auditor (`AUDITOR`) | Cajero (`CASHIER`) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Dashboard Consolidado** | Lectura/Escritura | Lectura | Solo sucursal | Solo sucursal | Lectura | Denegado |
| **Crear / Eliminar Sucursales** | Lectura/Escritura | Lectura/Escritura | Denegado | Denegado | Lectura | Denegado |
| **Gestionar Cajas y Asignación** | Lectura/Escritura | Lectura/Escritura | Solo sucursal | Denegado | Lectura | Denegado |
| **Aprobar / Gestionar Usuarios** | Lectura/Escritura | Lectura/Escritura | Denegado | Denegado | Denegado | Denegado |
| **Traslados de Inventario** | Lectura/Escritura | Lectura/Escritura | Despacho/Recepción | Lectura | Lectura | Denegado |
| **Registrar Compras** | Lectura/Escritura | Lectura/Escritura | Solo sucursal | Denegado | Lectura | Denegado |
| **Bitácora Auditable de Cajas** | Lectura/Escritura | Lectura | Solo sucursal | Solo sucursal | Lectura | Solo su turno |
| **Checkout, Planes y Consumo** | Lectura/Escritura | Denegado | Denegado | Denegado | Denegado | Denegado |

---

## 4. Arquitectura de Doble Token y Vinculación de Terminales (Device Flow + Cashier PIN)

Para resolver la fricción operativa y eliminar riesgos de seguridad, el sistema separa estrictamente dos conceptos:
1. **La vinculación de la máquina física (Device Pairing / Activación de Terminal):** Se ejecuta una sola vez.
2. **El cambio de turno de los cajeros (Sesión operativa diaria):** Ocurre de forma instantánea múltiples veces al día.

### 4.1. Paso 1: Vinculación del Equipo mediante Flujo "Smart TV" (Device Flow)
El propietario nunca introduce sus credenciales maestras de administrador en la PC o terminal de caja:
1. Al abrir la app POS/escritorio por primera vez, el sistema genera y muestra un código alfanumérico grande de 6 caracteres (ej: `X9-B42`) con validez temporal de 15 minutos, acompañado de un código QR.
2. El propietario o administrador ingresa desde su panel web o móvil central, accede a *Sucursales y Cajas*, pulsa **«Vincular nueva caja»** e introduce los 6 caracteres o escanea el QR.
3. El dueño asigna el nombre descriptivo y la sucursal de destino para esa máquina.
4. La app de caja detecta la confirmación vía WebSocket o Long Polling (`/api/v1/terminals/pairing-status/{code}`) y recibe un **Device Token** criptográfico único de larga duración asociado al `hardware_uuid` de esa máquina, almacenado en almacenamiento seguro local.
5. **Revocación Remota Inmediata:** Si la máquina es hurtada, dada de baja o un empleado es despedido, el dueño revoca el `Device Token` con un clic desde el panel web, bloqueando al instante cualquier operación de cobro o sincronización en esa terminal física.

### 4.2. Paso 2: Autenticación de Cajeros en el Día a Día (Cashier PIN)
Una vez vinculada la terminal, los cajeros no manejan correos ni contraseñas extensas:
* **PIN numérico de 4 a 6 dígitos:** Pantalla de bloqueo con teclado numérico y selector de cajeros asignados a la sucursal. El cajero ingresa su Cédula/Identificador y su PIN numérico.
* **Alternativa con Carnet:** Lectura instantánea de código de barras o QR de la credencial física del cajero.
* **Preparación Offline-First:** Los hashes de los PINs (`cashier_pin_hash` con salteado Argon2/Bcrypt) de los usuarios autorizados para esa caja se almacenan sincronizados localmente en la base de datos de la terminal. Si se cae internet, la validación se realiza localmente permitiendo continuar la facturación sin interrupciones.

### 4.3. Estructura de Doble Token en Requests
Toda petición de sincronización, venta o movimiento de dinero se firma con dos encabezados de seguridad:

```
[Request a la API]
  ├── X-Device-Token  -> Identifica la máquina física y la sucursal (autorizado por el dueño).
  └── X-Cashier-Token -> Identifica al cajero en turno que firmó la venta (autorizado por PIN).
```

* **Garantía de Auditoría Limpia:** Cada comprobante o arqueo se registra inmutablemente con: *«Caja #X, Sucursal Y, Terminal HW-Z, Cajero: Nombre y Apellido»*.


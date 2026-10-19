# Visión General y Alcance (`01_overview.md`)

---

## 1. Propósito del Sistema

**Xion-Manager** es la plataforma central de administración multi-sucursal, control operativo y gestión comercial del ecosistema Xion. Resuelve la dispersión operativa de los negocios minoristas y de servicios al consolidar en una única sede digital el control de sedes físicas, cajas registradoras, inventarios distribuidos, compras, usuarios y finanzas. 

Actúa como el **servidor central de sincronización bidireccional para las terminales locales Xion-POS** y opera bajo el licenciamiento y cobro gestionado por **Xion-Pay**.

---

## 2. Alcance del Proyecto

### 2.1. Incluido en el Alcance (In Scope)

* **Panel de Control (Dashboard Central):** Métricas consolidadas en tiempo real (ventas globales, ingresos brutos, márgenes), con desglose navegable por sucursal y por caja registradora.
* **Gestión Integral de Sucursales:**
  * CRUD completo de sucursales con selector de vista en cuadrícula (tarjetas) y lista interactiva.
  * Georreferenciación física integrada con Google Maps (coordenadas, dirección fiscal y operativa).
  * Control estricto de cupos de cajas por sucursal gobernado por el plan de suscripción activo.
  * Asignación de encargados y gerentes de sucursal.
  * Administración de inventario aislado por sede y transferencias entre sucursales con flujo de despacho y recepción.
  * Módulo de compras con imputación directa al stock de la sucursal destino.
* **Control y Administración de Cajas Registradoras:**
  * Asignación granular de operadores autorizados por caja.
  * Configuración personalizada de métodos de pago activos en cada caja.
  * Estadísticas de rendimiento por terminal y bitácora auditable de caja (turnos, aperturas, arqueos, cierres de sesión e incidencias).
* **Servidor Central de Sincronización:** Hub de ingesta de datos para las terminales Xion-POS locales (ventas, pagos, auditoría y stock).
* **Gestión de Usuarios y Permisos:** Roles predefinidos (RBAC), asignación granular de accesos y flujo de aprobación previa para el alta de nuevos usuarios en el sistema.
* **Módulos Transversales:** Auditoría global del sistema, Centro de Reportes descargables (PDF/Excel), Gestión de Compras y Centro de Notificaciones internas.
* **Pasarela de Pago Integrada y Checkout Interno (Xion-Pay):**
  * Renovación de servicio con selector de ciclo (mensual, semestral y anual con descuentos).
  * Ampliación de capacidad (*Upgrades* y compra de cajas *add-on*) con cálculo prorrateado y cotización previa.
  * Métodos de pago automáticos (tarjeta de crédito/débito) y reporte de pagos directos (Pago Móvil, transferencias bancarias y divisas con adjunto de comprobante digital JPG, PNG o PDF).
* **Estado de Cuenta y Consumo:**
  * Semáforo operativo en tiempo real: *Al día*, *Por vencer*, *En período de gracia* y *Suspendido*.
  * Barras de consumo gráfico de recursos contratados vs. utilizados (sucursales y cajas).
  * Contador regresivo y alertas de expiración.
* **Plataforma Multiplataforma:** Interfaz adaptable (Full-Responsive Web) y aplicación móvil complementaria (React Native).

### 2.2. Fuera del Alcance (Out of Scope)

* Impresión de tickets fiscales directos desde el servidor web (la impresión térmica/fiscal se delega localmente a las terminales Xion-POS).
* Modo de venta offline directo en la interfaz web de Xion-Manager (las transacciones sin conexión se ejecutan de manera aislada en Xion-POS).
* Facturación electrónica nacional directa con entes tributarios dentro del núcleo del manager (delegada a microservicios conectores específicos según el país).

---

## 3. Reglas de Negocio Globales

1. **Gobernanza de Recursos por Plan (Xion-Pay Guard):** Ninguna sucursal puede exceder el límite de cajas activas definido por el plan suscrito más los add-ons adquiridos y verificados. Si el negocio intenta registrar una caja adicional, el sistema bloquea la acción y redirige al flujo de compra de add-ons.
2. **Semáforo Operativo y Estado Suspendido:** Si la suscripción entra en estado *Suspendido* (tras agotar el período de gracia), el sistema bloquea la sincronización entrante de Xion-POS y restringe el acceso al Manager en modo solo lectura, permitiendo únicamente el ingreso al módulo de Checkout/Estado de Cuenta.
3. **Inmutabilidad de la Bitácora y Auditoría:** Toda acción de apertura de caja, arqueo ciego, ajuste manual de stock, cierre de turno y venta sincronizada se almacena en registros inmutables (*append-only*). Queda vetada la eliminación o edición de logs de auditoría.
4. **Validación de Traslados de Inventario:** Un traslado entre sucursales reduce el stock de la sucursal de origen dejándolo en estado *En Tránsito* y únicamente incrementa el stock de la sucursal de destino cuando el gerente de destino confirma la recepción física.
5. **Lenguaje Amigable e Intuitivo:** Las etiquetas, estados, notificaciones y errores del sistema deben prescindir de jerga técnica fría o respuestas robotizadas. Cada mensaje debe indicar claramente lo ocurrido y ofrecer la acción recomendada de manera natural.

---

## 4. Glosario de Términos

* **Sucursal:** Sede física o almacén con inventario propio, geolocalización y un conjunto delimitado de cajas registradoras.
* **Caja Registradora:** Terminal física o virtual identificada en el sistema donde se ejecutan turnos de venta y cobros.
* **Xion-POS:** Aplicación local de punto de venta que opera en cada caja, registrando transacciones que luego se sincronizan con Xion-Manager.
* **Xion-Pay:** Módulo financiero y pasarela integrada responsable de verificar la suscripción, procesar pagos con tarjeta y conciliar pagos directos.
* **Bitácora Auditable de Caja:** Historial cronológico estricto de eventos por caja (aperturas, cierres, declaraciones de efectivo, descuadres y ventas).
* **Semáforo Operativo:** Indicador visual de cuatro estados que resume la salud financiera de la suscripción del negocio.
* **Add-on:** Capacidad unitaria adicional (por ejemplo, 1 caja registradora extra) contratada de forma aditiva sobre el plan base.

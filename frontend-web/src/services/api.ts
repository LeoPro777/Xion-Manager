import { 
  AccountStatus, 
  Branch, 
  CashRegister,
  DashboardMetrics, 
  ProductInventory, 
  User, 
  UserPreference,
  UserSession,
  AuditLogItem, 
  CashSessionSyncItem, 
  NotificationItem, 
  SystemSettings, 
  Role,
  SupplierItem,
  PurchaseRecord,
  InventoryShrinkage,
  StockTransfer,
  PaymentMethod,
  CreatePaymentMethodDTO,
  UpdatePaymentMethodDTO,
  SystemPreferences,
  PaymentReportItem,
  CreatePaymentReportDTO,
  BankItem,
  CompanyDestinationAccount,
  XionPayConfig,
  XionPayPlan,
  XionPaySyncPayload,
  XionPaySyncResponse,
  CategoryItem,
  StockAdjustmentDTO,
  SupplierPayableLedgerItem
} from '../types';


let mockInventory: ProductInventory[] = [
  {
    id: 'inv-1',
    product_id: 'p-1',
    barcode: '7591234567890',
    sku: 'PROD-HAR-01',
    name: 'Harina Pan 1kg',
    description: 'Harina de maíz precocida blanca tradicional',
    category: 'Víveres',
    cost_price: 0.95,
    sale_price: 1.30,
    wholesale_price: 1.15,
    package_quantity: 20,
    product_type: 'physical',
    tax_type: 'none',
    unit_measure: 'UND',
    current_stock: 150,
    min_stock_alert: 20,
    image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300',
    branch_id: 'branch-1',
    branch_name: 'Sucursal Principal - Centro',
    combo_items: []
  },
  {
    id: 'inv-2',
    product_id: 'p-2',
    barcode: '7599876543210',
    sku: 'PROD-ACE-02',
    name: 'Aceite de Maíz 1L',
    description: 'Aceite vegetal comestible refinado',
    category: 'Víveres',
    cost_price: 2.10,
    sale_price: 2.90,
    wholesale_price: 2.60,
    package_quantity: 12,
    product_type: 'physical',
    tax_type: 'vat',
    unit_measure: 'UND',
    current_stock: 8,
    min_stock_alert: 15,
    image_url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300',
    branch_id: 'branch-1',
    branch_name: 'Sucursal Principal - Centro',
    combo_items: []
  },
  {
    id: 'inv-3',
    product_id: 'p-3',
    barcode: '7594567890123',
    sku: 'PROD-AZU-03',
    name: 'Azúcar Refinada 1kg',
    description: 'Azúcar de caña blanca refinada',
    category: 'Víveres',
    cost_price: 0.85,
    sale_price: 1.15,
    wholesale_price: 1.05,
    package_quantity: 25,
    product_type: 'physical',
    tax_type: 'none',
    unit_measure: 'UND',
    current_stock: 45,
    min_stock_alert: 10,
    image_url: '',
    branch_id: 'branch-1',
    branch_name: 'Sucursal Principal - Centro',
    combo_items: []
  },
  {
    id: 'inv-4',
    product_id: 'p-4',
    barcode: '7597890123456',
    sku: 'PROD-ARR-04',
    name: 'Arroz Blanco Tradicional 1kg',
    description: 'Arroz tipo I grano largo',
    category: 'Víveres',
    cost_price: 1.05,
    sale_price: 1.45,
    wholesale_price: 1.30,
    package_quantity: 24,
    product_type: 'physical',
    tax_type: 'none',
    unit_measure: 'UND',
    current_stock: 2,
    min_stock_alert: 15,
    image_url: '',
    branch_id: 'branch-1',
    branch_name: 'Sucursal Principal - Centro',
    combo_items: []
  },
  {
    id: 'inv-5',
    product_id: 'p-5',
    barcode: '7590001112223',
    sku: 'CMB-DESAYUNO-01',
    name: 'Combo Desayuno Criollo (Harina + Aceite + Azúcar)',
    description: 'Pack familiar ahorro desayuno venezolano',
    category: 'Combos',
    cost_price: 3.90,
    sale_price: 4.99,
    wholesale_price: 4.70,
    package_quantity: 1,
    product_type: 'virtual',
    tax_type: 'none',
    unit_measure: 'UND',
    current_stock: 10,
    min_stock_alert: 5,
    image_url: '',
    branch_id: 'branch-1',
    branch_name: 'Sucursal Principal - Centro',
    combo_items: [
      { product_id: 'p-1', product_name: 'Harina Pan 1kg', quantity: 1 },
      { product_id: 'p-2', product_name: 'Aceite de Maíz 1L', quantity: 1 },
      { product_id: 'p-3', product_name: 'Azúcar Refinada 1kg', quantity: 1 }
    ]
  }
];

let mockSuppliers: SupplierItem[] = [
  {
    id: 'sup-001',
    name: 'Distribuidora Alimentos Polar C.A.',
    rif: 'J-00041372-9',
    email: 'pedidos@polar.com',
    phone: '+58 212-2023111',
    address: 'Los Cortijos de Lourdes, Caracas',
    category: 'Alimentos y Bebidas',
    payment_terms_days: 15,
    current_balance_usd: 0.0,
    is_active: true,
    created_at: '2026-01-10'
  },
  {
    id: 'sup-002',
    name: 'Comercializadora Cargill Venezuela S.R.L.',
    rif: 'J-30591823-1',
    email: 'atencion@cargill.com.ve',
    phone: '+58 241-8742000',
    address: 'Zona Industrial Castillito, Valencia, Carabobo',
    category: 'Granos y Aceites',
    payment_terms_days: 30,
    current_balance_usd: 350.50,
    is_active: true,
    created_at: '2026-02-05'
  },
  {
    id: 'sup-003',
    name: 'Monaca - Molinos Nacionales C.A.',
    rif: 'J-00015940-7',
    email: 'ventas@monaca.com.ve',
    phone: '+58 212-9014000',
    address: 'Av. Principal Los Ruices, Caracas',
    category: 'Harinas y Derivados',
    payment_terms_days: 21,
    current_balance_usd: 0.0,
    is_active: true,
    created_at: '2026-03-12'
  }
];

let mockPurchases: PurchaseRecord[] = [
  {
    id: 'pur-001',
    supplier_id: 'sup-001',
    supplier_name: 'Distribuidora Alimentos Polar C.A.',
    supplier_rif: 'J-00041372-9',
    invoice_number: 'FAC-00892',
    branch_id: 'branch-1',
    branch_name: 'Sucursal Principal - Centro',
    date: '2026-10-06',
    total_amount_usd: 1420.00,
    total_amount_bs: 53250.00,
    exchange_rate: 37.50,
    payment_type: 'cash',
    payment_status: 'paid',
    paid_amount_usd: 1420.00,
    pending_amount_usd: 0.0,
    credit_days: 0,
    notes: 'Despacho directo en depósito central',
    items_count: 8,
    items: [
      {
        product_id: 'p-1',
        product_name: 'Harina Pan 1kg',
        product_sku: 'PROD-HAR-01',
        quantity: 100,
        lot_number: 'LOT-2026-A1',
        cost_usd: 0.95,
        cost_bs: 35.62,
        total_usd: 95.00
      }
    ]
  },
  {
    id: 'pur-002',
    supplier_id: 'sup-002',
    supplier_name: 'Comercializadora Cargill Venezuela S.R.L.',
    supplier_rif: 'J-30591823-1',
    invoice_number: 'FAC-99120',
    branch_id: 'branch-2',
    branch_name: 'Sucursal Norte - CC Lago Mall',
    date: '2026-10-07',
    total_amount_usd: 850.50,
    total_amount_bs: 31893.75,
    exchange_rate: 37.50,
    payment_type: 'credit',
    payment_status: 'partial',
    paid_amount_usd: 500.00,
    pending_amount_usd: 350.50,
    credit_days: 30,
    notes: 'Crédito a 30 días, anticipo 500$',
    items_count: 4,
    items: [
      {
        product_id: 'p-2',
        product_name: 'Aceite de Maíz 1L',
        product_sku: 'PROD-ACE-02',
        quantity: 50,
        lot_number: 'LOT-CG-99',
        cost_usd: 2.10,
        cost_bs: 78.75,
        total_usd: 105.00
      }
    ]
  }
];

let mockTransfers: StockTransfer[] = [
  {
    id: 'tr-001',
    transfer_code: 'TR-102',
    origin_branch_id: 'branch-1',
    origin_branch_name: 'Sucursal Principal - Centro',
    destination_branch_id: 'branch-2',
    destination_branch_name: 'Sucursal Norte - CC Lago Mall',
    product_id: 'p-1',
    product_name: 'Harina Pan 1kg',
    quantity: 20,
    status: 'COMPLETED',
    notes: 'Reposición semanal de stock alta demanda',
    created_at: '2026-10-08 10:15:00'
  }
];

let mockShrinkages: InventoryShrinkage[] = [];

let mockCategories: CategoryItem[] = [
  { id: 'cat-1', name: 'Víveres', description: 'Alimentos no perecederos y despensa', color: '#3B82F6', icon: 'ShoppingBag', is_active: true, full_path: 'Víveres' },
  { id: 'cat-2', name: 'Harinas y Granos', parent_id: 'cat-1', description: 'Harina de maíz, trigo, arroz y legumbres', color: '#60A5FA', icon: 'Wheat', is_active: true, full_path: 'Víveres > Harinas y Granos' },
  { id: 'cat-3', name: 'Aceites y Grasas', parent_id: 'cat-1', description: 'Aceite vegetal, margarinas, mantecas', color: '#F59E0B', icon: 'Droplet', is_active: true, full_path: 'Víveres > Aceites y Grasas' },
  { id: 'cat-4', name: 'Bebidas y Licores', description: 'Refrescos, jugos, agua mineral y licores', color: '#10B981', icon: 'Coffee', is_active: true, full_path: 'Bebidas y Licores' },
  { id: 'cat-5', name: 'Combos y Promociones', description: 'Paquetes de productos armados', color: '#8B5CF6', icon: 'PackageCheck', is_active: true, full_path: 'Combos y Promociones' },
  { id: 'cat-6', name: 'Limpieza y Hogar', description: 'Detergentes, desinfectantes y cuidado del hogar', color: '#EC4899', icon: 'Sparkles', is_active: true, full_path: 'Limpieza y Hogar' }
];

let mockSupplierLedger: Record<string, SupplierPayableLedgerItem[]> = {
  'sup-002': [
    {
      id: 'led-1',
      supplier_id: 'sup-002',
      purchase_id: 'pur-002',
      invoice_number: 'FAC-99120',
      tx_type: 'CHARGE',
      movement_type: 'CREDIT_CHARGE',
      amount_usd: 850.50,
      exchange_rate: 37.50,
      balance_after_usd: 850.50,
      notes: 'Factura a crédito 30 días',
      created_at: '2026-10-07T10:00:00Z'
    },
    {
      id: 'led-2',
      supplier_id: 'sup-002',
      purchase_id: 'pur-002',
      invoice_number: 'FAC-99120',
      tx_type: 'PAYMENT',
      movement_type: 'PAYMENT_ABONO',
      amount_usd: 500.00,
      exchange_rate: 37.50,
      balance_after_usd: 350.50,
      notes: 'Anticipo inicial contra factura FAC-99120',
      created_at: '2026-10-07T10:05:00Z'
    }
  ]
};

let mockBranches: Branch[] = [
  {
    id: 'branch-1',
    business_id: 'biz-101',
    name: 'Sucursal Principal - Centro',
    address: 'Av. Bolívar, Calle 4 #12-45, Maracaibo',
    latitude: 10.6417,
    longitude: -71.6125,
    phone: '+58 414-1234567',
    manager_user_id: 'usr-m1',
    manager_name: 'Alejandro Colina',
    active_cash_registers_count: 2,
    is_active: true,
    created_at: '2026-01-15T10:00:00Z'
  },
  {
    id: 'branch-2',
    business_id: 'biz-101',
    name: 'Sucursal Norte - CC Lago Mall',
    address: 'Av. 2 El Milagro, Nivel PB, Local 12, Maracaibo',
    latitude: 10.6698,
    longitude: -71.5989,
    phone: '+58 412-7654321',
    manager_user_id: 'usr-m2',
    manager_name: 'María Silva',
    active_cash_registers_count: 2,
    is_active: true,
    created_at: '2026-03-20T14:30:00Z'
  }
];

let mockCashRegisters: CashRegister[] = [
  {
    id: 'reg-01',
    branch_id: 'branch-1',
    branch_name: 'Sucursal Principal - Centro',
    name: 'Caja 01 - Principal',
    hardware_uuid: 'HW-POS-01-A92B',
    status: 'OPEN',
    is_active: true,
    current_operator: 'Carlos Mendoza',
    today_sales_total: 450.00,
    allowed_user_ids: ['usr-admin-01', 'usr-cashier-01'],
    payment_methods: ['CASH_USD', 'CASH_BS', 'PAGO_MOVIL', 'DEBIT_CARD', 'ZELLE'],
    latitude: 10.6417,
    longitude: -71.6125,
    location_name: 'Pasillo Central PB',
    created_at: '2026-01-16T08:00:00Z',
    device_paired: true,
    device_token_preview: 'dev_tok_X9-B42',
    paired_at: '2026-01-16T08:05:00Z'
  },
  {
    id: 'reg-02',
    branch_id: 'branch-1',
    branch_name: 'Sucursal Principal - Centro',
    name: 'Caja 02 - Pasillo Rápido',
    hardware_uuid: 'HW-POS-02-C77D',
    status: 'CLOSED',
    is_active: true,
    current_operator: undefined,
    today_sales_total: 0.00,
    allowed_user_ids: ['usr-admin-01', 'usr-cashier-01'],
    payment_methods: ['CASH_USD', 'CASH_BS', 'PAGO_MOVIL', 'DEBIT_CARD'],
    latitude: 10.6420,
    longitude: -71.6121,
    location_name: 'Salida Rápida Pasillo Norte',
    created_at: '2026-01-16T08:30:00Z',
    device_paired: true,
    device_token_preview: 'dev_tok_K2-M89',
    paired_at: '2026-01-16T08:35:00Z'
  },
  {
    id: 'reg-03',
    branch_id: 'branch-2',
    branch_name: 'Sucursal Norte - CC Lago Mall',
    name: 'Caja 01 - Lago Mall',
    hardware_uuid: 'HW-POS-03-F11E',
    status: 'OPEN',
    is_active: true,
    current_operator: 'Pedro Ramos',
    today_sales_total: 290.50,
    allowed_user_ids: ['usr-branch_manager-01', 'usr-cashier-01'],
    payment_methods: ['CASH_USD', 'CASH_BS', 'PAGO_MOVIL', 'DEBIT_CARD', 'ZELLE'],
    latitude: 10.6698,
    longitude: -71.5989,
    location_name: 'Nivel PB - Entrada Mall',
    created_at: '2026-03-21T09:00:00Z',
    device_paired: true,
    device_token_preview: 'dev_tok_R7-V14',
    paired_at: '2026-03-21T09:10:00Z'
  },
  {
    id: 'reg-04',
    branch_id: 'branch-2',
    branch_name: 'Sucursal Norte - CC Lago Mall',
    name: 'Caja 02 - Express',
    hardware_uuid: 'HW-POS-04-K88M',
    status: 'CLOSED',
    is_active: true,
    current_operator: undefined,
    today_sales_total: 0.00,
    allowed_user_ids: ['usr-branch_manager-01'],
    payment_methods: ['CASH_USD', 'CASH_BS', 'PAGO_MOVIL'],
    latitude: 10.6701,
    longitude: -71.5985,
    location_name: 'Área Gourmet Express',
    created_at: '2026-03-21T09:30:00Z',
    device_paired: false
  }
];

let mockPaymentMethods: PaymentMethod[] = [
  {
    id: 1,
    name: 'Pago Móvil',
    code: 'pago_movil',
    currency: 'VES',
    is_digital: true,
    applies_igtf: false,
    requires_reference: true,
    allow_decimals: true,
    is_system: true,
    is_active: true,
    image_url: '65cc43a8116c',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 2,
    name: 'Transferencia',
    code: 'transferencia_nacional',
    currency: 'VES',
    is_digital: true,
    applies_igtf: false,
    requires_reference: true,
    allow_decimals: true,
    is_system: true,
    is_active: true,
    image_url: 'c95398b571ef',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 3,
    name: 'Débito',
    code: 'tarjeta_debito',
    currency: 'VES',
    is_digital: true,
    applies_igtf: false,
    requires_reference: true,
    allow_decimals: true,
    is_system: true,
    is_active: true,
    image_url: '61149c1c2ed4',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 4,
    name: 'Biopago',
    code: 'biopago',
    currency: 'VES',
    is_digital: true,
    applies_igtf: false,
    requires_reference: false,
    allow_decimals: true,
    is_system: true,
    is_active: true,
    image_url: 'd52c08dd0253',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 5,
    name: 'Efectivo BS',
    code: 'efectivo_bs',
    currency: 'VES',
    is_digital: false,
    applies_igtf: false,
    requires_reference: false,
    allow_decimals: false,
    is_system: true,
    is_active: true,
    image_url: '4129e9c224a2',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 6,
    name: 'Efectivo USD',
    code: 'efectivo_usd',
    currency: 'USD',
    is_digital: false,
    applies_igtf: true,
    requires_reference: false,
    allow_decimals: false,
    is_system: true,
    is_active: true,
    image_url: 'd51e15debbbe',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 7,
    name: 'Zelle',
    code: 'zelle',
    currency: 'USD',
    is_digital: true,
    applies_igtf: false,
    requires_reference: true,
    allow_decimals: true,
    is_system: true,
    is_active: true,
    image_url: '3ff1409737f8',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 8,
    name: 'Binance Pay',
    code: 'binance',
    currency: 'USD',
    is_digital: true,
    applies_igtf: false,
    requires_reference: true,
    allow_decimals: true,
    is_system: true,
    is_active: true,
    image_url: '5c4937a497c5',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  }
];

let mockBanks: BankItem[] = [
  { code: '0102', name: 'Banco de Venezuela' },
  { code: '0134', name: 'Banesco Banco Universal' },
  { code: '0105', name: 'Banco Mercantil' },
  { code: '0108', name: 'Banco Provincial (BBVA)' },
  { code: '0114', name: 'Bancaribe' },
  { code: '0172', name: 'Bancamiga' },
  { code: '0116', name: 'Banco Occidental de Descuento (BOD)' },
  { code: '0163', name: 'Banco del Tesoro' },
  { code: '0175', name: 'Banco Bicentenario' },
  { code: '0191', name: 'Banco Nacional de Crédito (BNC)' }
];

let mockDestinationAccounts: CompanyDestinationAccount[] = [
  {
    id: 'dest-01',
    method: 'pago_movil',
    bank_code: '0134',
    bank_name: 'Banesco Banco Universal',
    account_holder: 'Xion Inversiones C.A.',
    tax_id: 'J-50123456-7',
    phone: '04141234567'
  },
  {
    id: 'dest-02',
    method: 'pago_movil',
    bank_code: '0102',
    bank_name: 'Banco de Venezuela',
    account_holder: 'Xion Inversiones C.A.',
    tax_id: 'J-50123456-7',
    phone: '04129876543'
  },
  {
    id: 'dest-03',
    method: 'transferencia_ves',
    bank_code: '0134',
    bank_name: 'Banesco Banco Universal',
    account_holder: 'Xion Inversiones C.A.',
    account_number: '01340001234567890123',
    tax_id: 'J-50123456-7'
  },
  {
    id: 'dest-04',
    method: 'zelle',
    account_holder: 'Xion Technologies LLC',
    email: 'pagos@xiontechnologies.com'
  },
  {
    id: 'dest-05',
    method: 'binance_pay',
    account_holder: 'XionPay_Official',
    email: 'binance@xion.io'
  }
];

let mockXionPayConfig: XionPayConfig = {
  official_exchange_rate: 37.50,
  currency: 'USD',
  base_currency: 'VES',
  api_status: 'ONLINE',
  last_synced_at: new Date().toISOString(),
  notes: 'Tasa oficial provista por Xion-Pay para la liquidación de planes de suscripción y renovaciones.'
};

let mockXionPayPlans: XionPayPlan[] = [
  {
    id: 'plan-trial',
    code: 'TRIAL',
    name: 'Plan Gratuito (Prueba 30 Días)',
    description: 'Acceso total sin costo durante 30 días para evaluar la plataforma multi-sucursal y sincronización POS',
    max_branches: 2,
    max_cash_registers: 3,
    price_monthly: 0.00,
    price_semiannual: 0.00,
    price_annual: 0.00,
    is_active: true
  },
  {
    id: 'plan-basic',
    code: 'BASIC',
    name: 'Plan Básico (Xion-Pay)',
    description: 'Ideal para pequeños comercios y negocios iniciales',
    max_branches: 1,
    max_cash_registers: 1,
    price_monthly: 29.00,
    price_semiannual: 156.60,
    price_annual: 278.40,
    is_active: true
  },
  {
    id: 'plan-pro',
    code: 'PRO',
    name: 'Plan Profesional (Xion-Pay)',
    description: 'Negocios consolidados con control multisucursal y cajas simultáneas',
    max_branches: 3,
    max_cash_registers: 5,
    price_monthly: 49.00,
    price_semiannual: 264.60,
    price_annual: 470.40,
    is_active: true
  },
  {
    id: 'plan-enterprise',
    code: 'ENTERPRISE',
    name: 'Plan Corporativo (Xion-Pay)',
    description: 'Capacidad enterprise para franquicias y grandes cadenas de retail',
    max_branches: 10,
    max_cash_registers: 20,
    price_monthly: 99.00,
    price_semiannual: 534.60,
    price_annual: 950.40,
    is_active: true
  }
];

let mockPaymentReports: PaymentReportItem[] = [
  {
    id: 'rep-001',
    business_id: 'biz-101',
    order_id: 'FAC-10023',
    concept: 'Pago Plan Comercio - Mensual',
    payment_method: 'pago_movil',
    origin_bank: 'Banco de Venezuela',
    dest_bank: 'Banesco Banco Universal',
    payer_name: 'Inversiones Maracaibo S.A.',
    payer_id_or_phone: '0414-9988776',
    payer_email: 'contabilidad@invmaracaibo.com',
    reference_number: '48291034',
    amount_paid: 1875.00,
    currency: 'VES',
    exchange_rate: 37.50,
    amount_base_equivalent: 50.00,
    receipt_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
    status: 'pending',
    payment_date: '2026-10-15',
    created_at: '2026-10-15T14:30:00Z',
    notes: 'Pago Móvil procesado a primera hora'
  },
  {
    id: 'rep-002',
    business_id: 'biz-101',
    order_id: 'FAC-10020',
    concept: 'Pago Factura de Inventario Proveedor',
    payment_method: 'zelle',
    payer_name: 'Carlos Mendoza',
    payer_email: 'carlos.mendoza@xion.com',
    reference_number: 'ZL-991823',
    amount_paid: 120.00,
    currency: 'USD',
    exchange_rate: 37.50,
    amount_base_equivalent: 120.00,
    receipt_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
    status: 'approved',
    verified_by: 'Administrador General',
    verified_at: '2026-10-14T18:20:00Z',
    payment_date: '2026-10-14',
    created_at: '2026-10-14T17:45:00Z',
    notes: 'Confirmado en portal Zelle'
  },
  {
    id: 'rep-003',
    business_id: 'biz-101',
    order_id: 'FAC-10018',
    concept: 'Suscripción Semestral',
    payment_method: 'binance_pay',
    payer_name: 'Pedro Ramos',
    payer_email: 'pedro.cajero@xion.com',
    reference_number: 'BP-881920412',
    amount_paid: 270.00,
    currency: 'USDT',
    exchange_rate: 37.50,
    amount_base_equivalent: 270.00,
    status: 'rejected',
    rejection_reason: 'Referencia no encontrada o monto no coincide con la blockchain',
    verified_by: 'Auditor Fiscal',
    verified_at: '2026-10-13T11:15:00Z',
    payment_date: '2026-10-13',
    created_at: '2026-10-13T10:00:00Z',
    notes: 'El hash no aparece reflejado en Binance Pay Merchant'
  }
];

export const api = {

  // Exchange Rate & System Settings
  async getExchangeRate(): Promise<SystemSettings> {
    try {
      const res = await fetch('/api/v1/settings/exchange-rate');
      if (res.ok) {
        const data = await res.json();
        return {
          id: data.id || 'cfg-001',
          business_id: data.business_id || 'biz-101',
          current_exchange_rate_bs: Number(data.current_exchange_rate_bs) || 37.50,
          tax_rate: Number(data.tax_rate) || 16.0,
          enable_taxes: Boolean(data.enable_taxes),
          auto_sync_pos: Boolean(data.auto_sync_pos),
          currency_symbol: data.currency_symbol || 'Bs.',
          updated_at: data.updated_at || new Date().toISOString()
        };
      }
    } catch (err) {
      console.warn('Fallback a configuración local:', err);
    }

    return {
      id: 'cfg-001',
      business_id: 'biz-101',
      current_exchange_rate_bs: 37.50,
      tax_rate: 16.0,
      enable_taxes: true,
      auto_sync_pos: true,
      currency_symbol: 'Bs.',
      updated_at: new Date().toISOString()
    };
  },

  async updateExchangeRate(rateData: Partial<SystemSettings>): Promise<SystemSettings> {
    const payload = {
      current_exchange_rate_bs: Number(rateData.current_exchange_rate_bs) || 37.50,
      tax_rate: Number(rateData.tax_rate ?? 16.0),
      enable_taxes: rateData.enable_taxes ?? true,
      auto_sync_pos: rateData.auto_sync_pos ?? true,
      currency_symbol: rateData.currency_symbol ?? 'Bs.'
    };

    try {
      const res = await fetch('/api/v1/settings/exchange-rate', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        const updated: SystemSettings = {
          id: data.id || 'cfg-001',
          business_id: data.business_id || 'biz-101',
          current_exchange_rate_bs: Number(data.current_exchange_rate_bs) || payload.current_exchange_rate_bs,
          tax_rate: Number(data.tax_rate) || payload.tax_rate,
          enable_taxes: Boolean(data.enable_taxes),
          auto_sync_pos: Boolean(data.auto_sync_pos),
          currency_symbol: data.currency_symbol || payload.currency_symbol,
          updated_at: data.updated_at || new Date().toISOString()
        };
        // Emitir evento global de sincronización en tiempo real para DashboardLayout, InventoryPage, etc.
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('xion:settings-updated', { detail: updated }));
        }
        return updated;
      }
    } catch (err) {
      console.error('Error al actualizar tasa cambiaria en backend:', err);
    }

    const fallback: SystemSettings = {
      id: 'cfg-001',
      business_id: 'biz-101',
      current_exchange_rate_bs: payload.current_exchange_rate_bs,
      tax_rate: payload.tax_rate,
      enable_taxes: payload.enable_taxes,
      auto_sync_pos: payload.auto_sync_pos,
      currency_symbol: payload.currency_symbol,
      updated_at: new Date().toISOString()
    };
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('xion:settings-updated', { detail: fallback }));
    }
    return fallback;
  },

  // Auth & Session
  async loginWithGoogle(idToken: string): Promise<User> {
    try {
      const res = await fetch('/api/v1/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Error al autenticar con Google OAuth');
      }
      const data = await res.json();
      if (data.access_token) {
        localStorage.setItem('xion_access_token', data.access_token);
        localStorage.setItem('xion_user', JSON.stringify(data.user));
      }
      if (data.preferences) {
        localStorage.setItem('xion_user_preferences', JSON.stringify(data.preferences));
      }
      return data.user as User;
    } catch (err: any) {
      console.error('Google OAuth API error:', err);
      throw err;
    }
  },

  async loginWithCredentials(email: string, password: string): Promise<User> {
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Credenciales de acceso inválidas');
      }
      const data = await res.json();
      if (data.access_token) {
        localStorage.setItem('xion_access_token', data.access_token);
        localStorage.setItem('xion_user', JSON.stringify(data.user));
      }
      if (data.preferences) {
        localStorage.setItem('xion_user_preferences', JSON.stringify(data.preferences));
      }
      return data.user as User;
    } catch (err: any) {
      console.error('Credentials login error:', err);
      throw err;
    }
  },

  async registerUser(data: { full_name: string; email: string; password: string; phone?: string }): Promise<User> {
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Error al registrar usuario');
      }
      const responseData = await res.json();
      if (responseData.access_token) {
        localStorage.setItem('xion_access_token', responseData.access_token);
        localStorage.setItem('xion_user', JSON.stringify(responseData.user));
      }
      if (responseData.preferences) {
        localStorage.setItem('xion_user_preferences', JSON.stringify(responseData.preferences));
      }
      return responseData.user as User;
    } catch (err: any) {
      console.error('Registration API error:', err);
      throw err;
    }
  },

  async completeOnboarding(payload: any): Promise<any> {
    try {
      const res = await fetch('/api/v1/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Error al guardar configuración de onboarding');
      }
      return await res.json();
    } catch (err: any) {
      console.error('Complete onboarding API error:', err);
      // Offline fallback
      return { status: 'success', onboarding_completed: true };
    }
  },

  async loginBypass(role: Role = 'OWNER'): Promise<User> {
    try {
      const res = await fetch('/api/v1/auth/login-bypass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.access_token) {
          localStorage.setItem('xion_access_token', data.access_token);
          localStorage.setItem('xion_user', JSON.stringify(data));
        }
        if (data.preferences) {
          localStorage.setItem('xion_user_preferences', JSON.stringify(data.preferences));
        }
      }
    } catch (e) {
      // Fallback silently if offline dev
    }

    const roleLabels: Record<Role, string> = {
      OWNER: 'Juan Delgado (Dueño)',
      ADMIN: 'Carlos Mendoza (Administrador)',
      BRANCH_MANAGER: 'María Silva (Gerente Lago Mall)',
      SUPERVISOR: 'Elena Blanco (Supervisora)',
      AUDITOR: 'Roberto Gómez (Auditor Fiscal)',
      CASHIER: 'Pedro Pérez (Cajero Principal)'
    };
    return {
      id: `usr-${role.toLowerCase()}-01`,
      business_id: 'biz-101',
      branch_id: role === 'BRANCH_MANAGER' || role === 'CASHIER' ? 'branch-2' : undefined,
      branch_name: role === 'BRANCH_MANAGER' || role === 'CASHIER' ? 'Sucursal Norte - CC Lago Mall' : 'Sede Corporativa',
      email: `${role.toLowerCase()}@xion.com`,
      full_name: roleLabels[role] || 'Usuario Xion',
      phone: '+58 414-9988776',
      role,
      approval_status: 'APPROVED',
      is_active: true,
      created_at: '2026-01-10T08:00:00Z'
    };
  },

  // Perfil, Preferencias del Usuario y Gestión de Sesiones JWT
  async getUserProfile(): Promise<{ user: User; preferences: UserPreference; session?: UserSession }> {
    const token = localStorage.getItem('xion_access_token');
    const res = await fetch('/api/v1/users/me', {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });
    if (!res.ok) throw new Error('Error al obtener perfil y preferencias');
    return await res.json();
  },

  async getUserPreferences(): Promise<UserPreference> {
    const token = localStorage.getItem('xion_access_token');
    const res = await fetch('/api/v1/users/me/preferences', {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });
    if (!res.ok) throw new Error('Error al obtener preferencias');
    const data = await res.json();
    localStorage.setItem('xion_user_preferences', JSON.stringify(data));
    return data;
  },

  async updateUserPreferences(preferences: Partial<UserPreference>): Promise<UserPreference> {
    const token = localStorage.getItem('xion_access_token');
    const res = await fetch('/api/v1/users/me/preferences', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(preferences)
    });
    if (!res.ok) throw new Error('Error al actualizar preferencias');
    const data = await res.json();
    localStorage.setItem('xion_user_preferences', JSON.stringify(data));
    return data;
  },

  async getUserSessions(): Promise<UserSession[]> {
    const token = localStorage.getItem('xion_access_token');
    const res = await fetch('/api/v1/auth/sessions', {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });
    if (!res.ok) throw new Error('Error al obtener sesiones');
    return await res.json();
  },

  async revokeSession(sessionId: string): Promise<void> {
    const token = localStorage.getItem('xion_access_token');
    const res = await fetch(`/api/v1/auth/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });
    if (!res.ok) throw new Error('Error al revocar sesión');
  },

  async logout(): Promise<void> {
    const token = localStorage.getItem('xion_access_token');
    try {
      if (token) {
        await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
    } catch (_) {}
    localStorage.removeItem('xion_access_token');
    localStorage.removeItem('xion_user');
    localStorage.removeItem('xion_user_preferences');
  },

  // 1. Dashboard
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    return {
      total_sales: 12480.50,
      gross_income: 15200.00,
      avg_margin: 28.4,
      transaction_count: 342,
      sales_change_pct: 12.5,
      transactions_change_pct: 8.2
    };
  },

  // 2. Branches & Cash Registers
  async getBranches(): Promise<Branch[]> {
    mockBranches = mockBranches.map(b => ({
      ...b,
      active_cash_registers_count: mockCashRegisters.filter(r => r.branch_id === b.id && r.is_active).length
    }));
    return [...mockBranches];
  },

  async createBranch(branchData: Partial<Branch>): Promise<Branch> {
    const newBranch: Branch = {
      id: `branch-${Date.now()}`,
      business_id: 'biz-101',
      name: branchData.name || 'Nueva Sucursal',
      address: branchData.address || 'Dirección Comercial',
      latitude: branchData.latitude || 10.6417,
      longitude: branchData.longitude || -71.6125,
      phone: branchData.phone || '+58 414-0000000',
      manager_user_id: branchData.manager_user_id || 'usr-m1',
      manager_name: branchData.manager_name || 'Gerente General',
      active_cash_registers_count: 0,
      is_active: branchData.is_active ?? true,
      created_at: new Date().toISOString()
    };
    mockBranches = [...mockBranches, newBranch];
    return newBranch;
  },

  async updateBranch(id: string, branchData: Partial<Branch>): Promise<Branch> {
    mockBranches = mockBranches.map(b => b.id === id ? { ...b, ...branchData } : b);
    return mockBranches.find(b => b.id === id) || (mockBranches[0] as Branch);
  },

  async deleteBranch(id: string): Promise<void> {
    mockBranches = mockBranches.filter(b => b.id !== id);
    mockCashRegisters = mockCashRegisters.filter(r => r.branch_id !== id);
  },

  async getCashRegisters(branchId?: string): Promise<CashRegister[]> {
    if (branchId && branchId !== 'all') {
      return mockCashRegisters.filter(r => r.branch_id === branchId);
    }
    return [...mockCashRegisters];
  },

  async createCashRegister(registerData: Partial<CashRegister>): Promise<CashRegister> {
    const branch = mockBranches.find(b => b.id === registerData.branch_id);
    const newRegister: CashRegister = {
      id: `reg-${Date.now()}`,
      branch_id: registerData.branch_id || 'branch-1',
      branch_name: branch?.name || 'Sucursal Principal - Centro',
      name: registerData.name || 'Nueva Caja Registradora',
      hardware_uuid: registerData.hardware_uuid || `HW-POS-${Date.now().toString().slice(-4)}`,
      status: 'CLOSED',
      is_active: true,
      current_operator: undefined,
      today_sales_total: 0.0,
      allowed_user_ids: registerData.allowed_user_ids || ['usr-admin-01', 'usr-cashier-01'],
      payment_methods: registerData.payment_methods || ['CASH_USD', 'CASH_BS', 'PAGO_MOVIL', 'DEBIT_CARD'],
      latitude: registerData.latitude ?? branch?.latitude ?? 10.6417,
      longitude: registerData.longitude ?? branch?.longitude ?? -71.6125,
      location_name: registerData.location_name || '',
      created_at: new Date().toISOString()
    };
    mockCashRegisters = [...mockCashRegisters, newRegister];
    return newRegister;
  },

  async updateCashRegister(id: string, registerData: Partial<CashRegister>): Promise<CashRegister> {
    mockCashRegisters = mockCashRegisters.map(r => {
      if (r.id === id) {
        const branch = mockBranches.find(b => b.id === (registerData.branch_id || r.branch_id));
        return {
          ...r,
          ...registerData,
          branch_name: branch ? branch.name : r.branch_name
        };
      }
      return r;
    });
    return mockCashRegisters.find(r => r.id === id) || (mockCashRegisters[0] as CashRegister);
  },

  async deleteCashRegister(id: string): Promise<void> {
    mockCashRegisters = mockCashRegisters.filter(r => r.id !== id);
  },

  async toggleCashRegisterStatus(id: string, operatorName: string = 'Carlos Mendoza'): Promise<CashRegister> {
    const reg = mockCashRegisters.find(r => r.id === id);
    if (reg) {
      if (reg.status === 'OPEN') {
        reg.status = 'CLOSED';
        reg.current_operator = undefined;
      } else {
        reg.status = 'OPEN';
        reg.current_operator = operatorName;
      }
      return reg;
    }
    return mockCashRegisters[0];
  },

  // Flujo Smart TV: Autorización y Vinculación de Terminal
  async pairTerminalWithCode(pairingCode: string, branchId: string, name: string): Promise<CashRegister> {
    const cleanCode = pairingCode.toUpperCase().trim();
    const branch = mockBranches.find(b => b.id === branchId) || mockBranches[0];
    const newRegister: CashRegister = {
      id: `reg-${Date.now()}`,
      branch_id: branch.id,
      branch_name: branch.name,
      name: name.trim() || `Caja ${cleanCode}`,
      hardware_uuid: `HW-POS-${cleanCode}-${Date.now().toString().slice(-4)}`,
      status: 'CLOSED',
      is_active: true,
      today_sales_total: 0.0,
      allowed_user_ids: ['usr-admin-01', 'usr-cashier-01'],
      payment_methods: ['CASH_USD', 'CASH_BS', 'PAGO_MOVIL', 'DEBIT_CARD'],
      latitude: branch.latitude || 10.6417,
      longitude: branch.longitude || -71.6125,
      location_name: `Terminal Autorizada (${cleanCode})`,
      created_at: new Date().toISOString(),
      device_paired: true,
      device_token_preview: `dev_tok_${cleanCode}`,
      paired_at: new Date().toISOString()
    };
    mockCashRegisters = [...mockCashRegisters, newRegister];
    return newRegister;
  },

  // Revocación Remota con 1 Clic
  async revokeTerminalDevice(id: string): Promise<CashRegister> {
    mockCashRegisters = mockCashRegisters.map(r => {
      if (r.id === id) {
        return {
          ...r,
          device_paired: false,
          device_token_preview: undefined,
          status: 'CLOSED',
          current_operator: undefined
        };
      }
      return r;
    });
    return mockCashRegisters.find(r => r.id === id) || (mockCashRegisters[0] as CashRegister);
  },

  // 3. Inventory, Products, Shrinkage & Transfers
  async getCategories(): Promise<CategoryItem[]> {
    try {
      const res = await fetch('/api/v1/inventory/categories');
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // offline fallback
    }
    return [...mockCategories];
  },

  async createCategory(catData: Partial<CategoryItem>): Promise<CategoryItem> {
    try {
      const res = await fetch('/api/v1/inventory/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(catData)
      });
      if (res.ok) {
        const created = await res.json();
        mockCategories = [...mockCategories, created];
        return created;
      }
    } catch {
      // offline fallback
    }
    const parent = catData.parent_id ? mockCategories.find(c => c.id === catData.parent_id) : null;
    const fullPath = parent ? `${parent.full_path || parent.name} > ${catData.name}` : (catData.name || 'Categoría');
    const newCat: CategoryItem = {
      id: `cat-${Date.now()}`,
      name: catData.name || 'Nueva Categoría',
      parent_id: catData.parent_id,
      description: catData.description || '',
      color: catData.color || '#3B82F6',
      icon: catData.icon || 'Folder',
      is_active: true,
      full_path: fullPath
    };
    mockCategories = [...mockCategories, newCat];
    return newCat;
  },

  async getInventory(branchId?: string): Promise<ProductInventory[]> {
    try {
      const url = branchId ? `/api/v1/inventory?branch_id=${branchId}` : '/api/v1/inventory';
      const res = await fetch(url);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // offline fallback
    }
    if (branchId) {
      return mockInventory.filter(p => !p.branch_id || p.branch_id === branchId);
    }
    return [...mockInventory];
  },

  async createProduct(productData: Partial<ProductInventory>): Promise<ProductInventory> {
    try {
      const res = await fetch('/api/v1/inventory/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      });
      if (res.ok) {
        const created = await res.json();
        mockInventory = [created, ...mockInventory];
        return created;
      }
    } catch {
      // offline fallback
    }
    const newProd: ProductInventory = {
      id: `inv-${Date.now()}`,
      product_id: `p-${Date.now()}`,
      barcode: productData.barcode || `759${Math.floor(Math.random() * 1000000000)}`,
      sku: productData.sku || `SKU-${Date.now()}`,
      name: productData.name || 'Nuevo Producto',
      description: productData.description || '',
      category: productData.category || 'General',
      cost_price: Number(productData.cost_price) || 0,
      sale_price: Number(productData.sale_price) || 0,
      wholesale_price: Number(productData.wholesale_price) || 0,
      package_quantity: Number(productData.package_quantity) || 1,
      product_type: productData.product_type || 'physical',
      tax_type: productData.tax_type || 'vat',
      unit_measure: productData.unit_measure || 'UND',
      current_stock: Number(productData.current_stock) || 0,
      min_stock_alert: Number(productData.min_stock_alert) || 5,
      image_url: productData.image_url || '',
      combo_items: productData.combo_items || [],
      branch_id: productData.branch_id || 'branch-1',
      branch_name: productData.branch_id === 'branch-2' ? 'Sucursal Norte - CC Lago Mall' : 'Sucursal Principal - Centro'
    };
    mockInventory = [newProd, ...mockInventory];
    return newProd;
  },

  async updateProduct(id: string, productData: Partial<ProductInventory>): Promise<ProductInventory> {
    try {
      const res = await fetch(`/api/v1/inventory/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      });
      if (res.ok) {
        const updated = await res.json();
        mockInventory = mockInventory.map(p => (p.id === id || p.product_id === id) ? updated : p);
        return updated;
      }
    } catch {
      // offline fallback
    }
    mockInventory = mockInventory.map(p => {
      if (p.id === id || p.product_id === id) {
        return { ...p, ...productData };
      }
      return p;
    });
    const found = mockInventory.find(p => p.id === id || p.product_id === id);
    return found || (mockInventory[0] as ProductInventory);
  },

  async deleteProduct(id: string): Promise<void> {
    try {
      await fetch(`/api/v1/inventory/products/${id}`, { method: 'DELETE' });
    } catch {
      // offline fallback
    }
    mockInventory = mockInventory.filter(p => p.id !== id && p.product_id !== id);
  },

  async adjustStock(dto: StockAdjustmentDTO): Promise<ProductInventory> {
    try {
      const res = await fetch('/api/v1/inventory/adjust-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dto)
      });
      if (res.ok) {
        const updated = await res.json();
        mockInventory = mockInventory.map(p => (p.id === dto.product_id || p.product_id === dto.product_id) ? { ...p, current_stock: updated.current_stock } : p);
        return mockInventory.find(p => p.id === dto.product_id || p.product_id === dto.product_id)!;
      }
    } catch {
      // offline fallback
    }
    const prod = mockInventory.find(p => p.id === dto.product_id || p.product_id === dto.product_id);
    if (prod) {
      if (dto.new_stock !== undefined && dto.new_stock !== null) {
        prod.current_stock = Math.max(0, Number(dto.new_stock));
      } else if (dto.quantity_change !== undefined) {
        prod.current_stock = Math.max(0, prod.current_stock + Number(dto.quantity_change));
      }
      return prod;
    }
    return mockInventory[0];
  },

  async registerShrinkage(data: Partial<InventoryShrinkage>): Promise<InventoryShrinkage> {
    try {
      const res = await fetch('/api/v1/inventory/shrinkage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const created = await res.json();
        mockShrinkages = [created, ...mockShrinkages];
        return created;
      }
    } catch {
      // offline fallback
    }
    const prod = mockInventory.find(p => p.id === data.product_id || p.product_id === data.product_id);
    if (prod && data.quantity) {
      prod.current_stock = Math.max(0, prod.current_stock - Number(data.quantity));
    }
    const shrinkage: InventoryShrinkage = {
      id: `shk-${Date.now()}`,
      product_id: data.product_id || '',
      product_name: data.product_name || prod?.name || 'Producto',
      branch_id: data.branch_id || 'branch-1',
      quantity: Number(data.quantity) || 1,
      reason: data.reason || 'Dañado/Vencido',
      justification: data.justification || '',
      date: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    mockShrinkages = [shrinkage, ...mockShrinkages];
    return shrinkage;
  },

  async getShrinkage(): Promise<InventoryShrinkage[]> {
    try {
      const res = await fetch('/api/v1/inventory/shrinkage');
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // offline fallback
    }
    return [...mockShrinkages];
  },

  async getTransfers(): Promise<StockTransfer[]> {
    return [...mockTransfers];
  },

  async createTransfer(transferData: Partial<StockTransfer>): Promise<StockTransfer> {
    const prod = mockInventory.find(p => p.id === transferData.product_id || p.product_id === transferData.product_id);
    if (prod && transferData.quantity) {
      prod.current_stock = Math.max(0, prod.current_stock - Number(transferData.quantity));
    }
    const newTr: StockTransfer = {
      id: `tr-${Date.now()}`,
      transfer_code: `TR-${100 + mockTransfers.length + 1}`,
      origin_branch_id: transferData.origin_branch_id || 'branch-1',
      origin_branch_name: transferData.origin_branch_name || 'Sucursal Principal - Centro',
      destination_branch_id: transferData.destination_branch_id || 'branch-2',
      destination_branch_name: transferData.destination_branch_name || 'Sucursal Norte - CC Lago Mall',
      product_id: transferData.product_id || '',
      product_name: transferData.product_name || prod?.name || 'Producto',
      quantity: Number(transferData.quantity) || 1,
      status: 'COMPLETED',
      notes: transferData.notes || 'Traslado entre sedes despachado',
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    mockTransfers = [newTr, ...mockTransfers];
    return newTr;
  },

  // 4. Purchases & Suppliers
  async getSuppliers(): Promise<SupplierItem[]> {
    try {
      const res = await fetch('/api/v1/suppliers');
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // offline fallback
    }
    return [...mockSuppliers];
  },

  async createSupplier(data: Partial<SupplierItem>): Promise<SupplierItem> {
    try {
      const res = await fetch('/api/v1/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const created = await res.json();
        mockSuppliers = [created, ...mockSuppliers];
        return created;
      }
    } catch {
      // offline fallback
    }
    const newSup: SupplierItem = {
      id: `sup-${Date.now()}`,
      name: data.name || 'Nuevo Proveedor',
      rif: data.rif || 'J-00000000-0',
      email: data.email || '',
      phone: data.phone || '',
      address: data.address || '',
      category: data.category || 'Varios',
      payment_terms_days: Number(data.payment_terms_days) || 15,
      current_balance_usd: 0,
      is_active: data.is_active ?? true,
      created_at: new Date().toISOString().split('T')[0]
    };
    mockSuppliers = [newSup, ...mockSuppliers];
    return newSup;
  },

  async updateSupplier(id: string, data: Partial<SupplierItem>): Promise<SupplierItem> {
    try {
      const res = await fetch(`/api/v1/suppliers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const updated = await res.json();
        mockSuppliers = mockSuppliers.map(s => s.id === id ? updated : s);
        return updated;
      }
    } catch {
      // offline fallback
    }
    mockSuppliers = mockSuppliers.map(s => s.id === id ? { ...s, ...data } : s);
    return mockSuppliers.find(s => s.id === id) || (mockSuppliers[0] as SupplierItem);
  },

  async deleteSupplier(id: string): Promise<void> {
    try {
      await fetch(`/api/v1/suppliers/${id}`, { method: 'DELETE' });
    } catch {
      // offline fallback
    }
    mockSuppliers = mockSuppliers.filter(s => s.id !== id);
  },

  async getSupplierLedger(supplierId: string): Promise<SupplierPayableLedgerItem[]> {
    try {
      const res = await fetch(`/api/v1/suppliers/${supplierId}/ledger`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // offline fallback
    }
    return mockSupplierLedger[supplierId] || [];
  },

  async getPurchases(_supplierId?: string, _branchId?: string): Promise<PurchaseRecord[]> {
    try {
      const params = new URLSearchParams();
      if (_supplierId) params.append('supplier_id', _supplierId);
      if (_branchId) params.append('branch_id', _branchId);
      const res = await fetch(`/api/v1/purchases?${params.toString()}`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // offline fallback
    }
    let res = [...mockPurchases];
    if (_supplierId) res = res.filter(p => p.supplier_id === _supplierId);
    if (_branchId) res = res.filter(p => p.branch_id === _branchId);
    return res;
  },

  async createPurchase(purchaseData: Partial<PurchaseRecord>): Promise<PurchaseRecord> {
    const rate = purchaseData.exchange_rate || 37.50;
    const totalUsd = Number(purchaseData.total_amount_usd) || 0;
    const totalBs = Number(purchaseData.total_amount_bs) || (totalUsd * rate);
    const payType = purchaseData.payment_type || 'cash';
    const paidUsd = payType === 'cash' ? totalUsd : (Number(purchaseData.paid_amount_usd) || 0);
    const pendingUsd = Math.max(0, totalUsd - paidUsd);
    const payStatus = pendingUsd <= 0.001 ? 'paid' : (paidUsd > 0 ? 'partial' : 'pending');

    try {
      const res = await fetch('/api/v1/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(purchaseData)
      });
      if (res.ok) {
        const created = await res.json();
        mockPurchases = [created, ...mockPurchases];
        return created;
      }
    } catch {
      // offline fallback
    }

    const newPurchase: PurchaseRecord = {
      id: `pur-${Date.now()}`,
      supplier_id: purchaseData.supplier_id || 'sup-gen',
      supplier_name: purchaseData.supplier_name || 'Proveedor General',
      supplier_rif: purchaseData.supplier_rif || 'J-00000000-0',
      invoice_number: purchaseData.invoice_number || `FAC-${Math.floor(Math.random() * 90000)}`,
      branch_id: purchaseData.branch_id || 'branch-1',
      branch_name: purchaseData.branch_name || 'Sucursal Principal - Centro',
      date: new Date().toISOString().split('T')[0],
      total_amount_usd: totalUsd,
      total_amount_bs: totalBs,
      exchange_rate: rate,
      payment_type: payType,
      payment_status: payStatus,
      paid_amount_usd: paidUsd,
      pending_amount_usd: pendingUsd,
      credit_days: Number(purchaseData.credit_days) || 0,
      notes: purchaseData.notes || '',
      items_count: purchaseData.items?.length || 1,
      items: purchaseData.items || []
    };

    mockPurchases = [newPurchase, ...mockPurchases];

    // Actualizar existencias y costo promedio ponderado
    if (purchaseData.items) {
      for (const item of purchaseData.items) {
        const prod = mockInventory.find(p => p.id === item.product_id || p.product_id === item.product_id);
        if (prod) {
          const oldStock = prod.current_stock;
          const oldCost = prod.cost_price;
          const newQty = item.quantity;
          const newCost = item.cost_usd;
          const totalNewStock = oldStock + newQty;
          if (totalNewStock > 0) {
            prod.cost_price = Number((((oldStock * oldCost) + (newQty * newCost)) / totalNewStock).toFixed(4));
          }
          prod.current_stock = totalNewStock;
        }
      }
    }

    // Actualizar deuda del proveedor si quedó pendiente
    if (purchaseData.supplier_id && pendingUsd > 0) {
      const sup = mockSuppliers.find(s => s.id === purchaseData.supplier_id);
      if (sup) {
        sup.current_balance_usd = Number((sup.current_balance_usd + pendingUsd).toFixed(2));
      }
      if (!mockSupplierLedger[purchaseData.supplier_id]) {
        mockSupplierLedger[purchaseData.supplier_id] = [];
      }
      const newBal = (sup?.current_balance_usd || pendingUsd);
      mockSupplierLedger[purchaseData.supplier_id].unshift({
        id: `led-${Date.now()}`,
        supplier_id: purchaseData.supplier_id,
        purchase_id: newPurchase.id,
        invoice_number: newPurchase.invoice_number,
        tx_type: 'CHARGE',
        movement_type: 'CREDIT_CHARGE',
        amount_usd: pendingUsd,
        exchange_rate: rate,
        balance_after_usd: Number(newBal.toFixed(2)),
        notes: `Factura a crédito (${newPurchase.credit_days || 30} días)`,
        created_at: new Date().toISOString()
      });
    }

    return newPurchase;
  },

  async payPurchaseDebt(purchaseId: string, amount: number): Promise<PurchaseRecord> {
    try {
      const res = await fetch(`/api/v1/purchases/${purchaseId}/pay-debt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });
      if (res.ok) {
        const updated = await res.json();
        mockPurchases = mockPurchases.map(p => p.id === purchaseId ? updated : p);
        return updated;
      }
    } catch {
      // offline fallback
    }

    const purchase = mockPurchases.find(p => p.id === purchaseId);
    if (purchase) {
      purchase.paid_amount_usd = Number((purchase.paid_amount_usd + amount).toFixed(2));
      purchase.pending_amount_usd = Math.max(0, Number((purchase.pending_amount_usd - amount).toFixed(2)));
      purchase.payment_status = purchase.pending_amount_usd <= 0.001 ? 'paid' : 'partial';

      if (purchase.supplier_id) {
        const sup = mockSuppliers.find(s => s.id === purchase.supplier_id);
        if (sup) {
          sup.current_balance_usd = Math.max(0, Number((sup.current_balance_usd - amount).toFixed(2)));
        }
        if (!mockSupplierLedger[purchase.supplier_id]) {
          mockSupplierLedger[purchase.supplier_id] = [];
        }
        const newBal = sup ? sup.current_balance_usd : 0;
        mockSupplierLedger[purchase.supplier_id].unshift({
          id: `led-${Date.now()}`,
          supplier_id: purchase.supplier_id,
          purchase_id: purchase.id,
          invoice_number: purchase.invoice_number,
          tx_type: 'PAYMENT',
          movement_type: 'PAYMENT_ABONO',
          amount_usd: amount,
          exchange_rate: purchase.exchange_rate || 37.50,
          balance_after_usd: Number(newBal.toFixed(2)),
          notes: `Abono registrado a factura ${purchase.invoice_number}`,
          created_at: new Date().toISOString()
        });
      }
      return purchase;
    }
    return mockPurchases[0];
  },


  // 5. Users & Approvals
  async getUsers(): Promise<User[]> {
    return [
      {
        id: 'usr-1',
        business_id: 'biz-101',
        email: 'juan.delgado@xion.com',
        full_name: 'Juan Delgado',
        phone: '+58 414-1112233',
        role: 'OWNER',
        approval_status: 'APPROVED',
        is_active: true,
        created_at: '2026-01-01'
      },
      {
        id: 'usr-2',
        business_id: 'biz-101',
        branch_id: 'branch-1',
        branch_name: 'Sucursal Principal - Centro',
        email: 'carlos.mendoza@xion.com',
        full_name: 'Carlos Mendoza',
        phone: '+58 412-2223344',
        role: 'ADMIN',
        approval_status: 'APPROVED',
        is_active: true,
        created_at: '2026-02-15'
      },
      {
        id: 'usr-3',
        business_id: 'biz-101',
        branch_id: 'branch-2',
        branch_name: 'Sucursal Norte - CC Lago Mall',
        email: 'maria.silva@xion.com',
        full_name: 'María Silva',
        phone: '+58 424-3334455',
        role: 'BRANCH_MANAGER',
        approval_status: 'APPROVED',
        is_active: true,
        created_at: '2026-03-22'
      },
      {
        id: 'usr-4',
        business_id: 'biz-101',
        branch_id: 'branch-1',
        branch_name: 'Sucursal Principal - Centro',
        email: 'pedro.cajero@xion.com',
        full_name: 'Pedro Ramos (Nuevo Cajero)',
        phone: '+58 416-5556677',
        role: 'CASHIER',
        approval_status: 'PENDING',
        is_active: false,
        created_at: '2026-10-07'
      }
    ];
  },

  async updateUserApproval(_userId: string, status: 'APPROVED' | 'REJECTED'): Promise<{ message: string }> {
    return {
      message: status === 'APPROVED' 
        ? 'El usuario ha sido aprobado exitosamente y ya puede operar en Xion-Manager y Xion-POS.' 
        : 'La solicitud de usuario ha sido rechazada.'
    };
  },

  // 6. Audit & Cash Sessions
  async getAuditLogs(): Promise<AuditLogItem[]> {
    return [
      {
        id: 'log-1',
        timestamp: '2026-10-08 13:45:10',
        user_name: 'Carlos Mendoza',
        role: 'ADMIN',
        module: 'CONFIGURACION',
        action_type: 'EXCHANGE_RATE_UPDATE',
        description: 'Actualización de Tasa Cambiaria Oficial a 37.50 Bs/USD. Sincronizado con terminales POS.',
        branch_name: 'Global',
        ip_address: '192.168.1.45'
      },
      {
        id: 'log-2',
        timestamp: '2026-10-08 12:30:00',
        user_name: 'María Silva',
        role: 'BRANCH_MANAGER',
        module: 'CAJAS',
        action_type: 'CASH_REGISTER_OPEN',
        description: 'Apertura de turno en Caja #02 con fondo inicial de $50.00',
        branch_name: 'Sucursal Norte',
        cash_register_name: 'Caja 02',
        ip_address: '192.168.2.11'
      }
    ];
  },

  async getCashSessions(): Promise<CashSessionSyncItem[]> {
    return [
      {
        id: 'sess-01',
        cash_register_name: 'Caja 01 - Principal',
        branch_name: 'Sucursal Principal',
        opened_by: 'Carlos Mendoza',
        opened_at: '2026-10-08 08:00',
        closed_at: '2026-10-08 16:00',
        closed_by: 'Carlos Mendoza',
        initial_cash: 100.00,
        declared_cash: 540.00,
        calculated_cash: 540.00,
        difference: 0.00,
        status: 'CLOSED'
      }
    ];
  },

  // 7. Reports
  async getReportData(reportType: string): Promise<any> {
    return {
      title: reportType,
      generated_at: new Date().toISOString(),
      rows_count: 120,
      total_summary: '$18,450.00'
    };
  },

  // 8. Notifications
  async getNotifications(): Promise<NotificationItem[]> {
    return [
      {
        id: 'notif-1',
        timestamp: 'Hace 5 min',
        severity: 'URGENT',
        title: 'Descuadre de Caja Detectado',
        message: 'Caja 01 en Sucursal Norte cerró con diferencia en arqueo ciego.',
        read: false,
        link_tab: 'audit'
      }
    ];
  },

  // 9. Billing & Xion-Pay
  async getAccountStatus(): Promise<AccountStatus> {
    try {
      const res = await fetch('/api/v1/billing/account-status');
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Offline fallback
    }
    return {
      plan_name: 'Plan Comercio',
      billing_cycle: 'MONTHLY',
      expires_at: '2026-11-17T23:59:59Z',
      days_remaining: 30,
      traffic_light: {
        status: 'ACTIVE',
        color: 'GREEN',
        label: 'Prueba Gratuita (30 días)',
        description: 'Tu suscripción está completamente activa y operando con normalidad.'
      },
      resource_usage: {
        branches: { used: 2, limit: 3, percentage: 66.6 },
        cash_registers: { used: 4, limit: 6, percentage: 66.6 }
      }
    };
  },

  async reportPayment(_formData: FormData): Promise<{ message: string; report_id: string }> {
    return {
      message: 'Tu reporte de pago ha sido recibido con éxito y está en proceso de verificación.',
      report_id: 'rep-' + Math.random().toString(36).substring(2, 9)
    };
  },

  // 10. Payment Methods (Xion-POS Parity Module)
  async getPaymentMethods(activeOnly: boolean = false): Promise<PaymentMethod[]> {
    try {
      const url = activeOnly ? '/api/v1/payment-methods?active=true' : '/api/v1/payment-methods';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        mockPaymentMethods = data;
        return data;
      }
    } catch {
      // Offline fallback
    }
    if (activeOnly) {
      return mockPaymentMethods.filter(m => m.is_active);
    }
    return [...mockPaymentMethods];
  },

  async createPaymentMethod(data: CreatePaymentMethodDTO): Promise<PaymentMethod> {
    try {
      const res = await fetch('/api/v1/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const created = await res.json();
        mockPaymentMethods.push(created);
        return created;
      }
    } catch {
      // Offline fallback
    }
    const newId = Math.max(...mockPaymentMethods.map(m => m.id), 0) + 1;
    const newMethod: PaymentMethod = {
      ...data,
      id: newId,
      is_system: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    mockPaymentMethods.push(newMethod);
    return newMethod;
  },

  async updatePaymentMethod(id: number, data: UpdatePaymentMethodDTO): Promise<PaymentMethod> {
    try {
      const res = await fetch(`/api/v1/payment-methods/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const updated = await res.json();
        mockPaymentMethods = mockPaymentMethods.map(m => m.id === id ? updated : m);
        return updated;
      }
    } catch {
      // Offline fallback
    }
    mockPaymentMethods = mockPaymentMethods.map(m => {
      if (m.id === id) {
        return {
          ...m,
          ...data,
          updated_at: new Date().toISOString()
        };
      }
      return m;
    });
    return mockPaymentMethods.find(m => m.id === id)!;
  },

  async deletePaymentMethod(id: number): Promise<void> {
    try {
      const res = await fetch(`/api/v1/payment-methods/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        mockPaymentMethods = mockPaymentMethods.filter(m => m.id !== id);
        return;
      }
    } catch {
      // Offline fallback
    }
    mockPaymentMethods = mockPaymentMethods.filter(m => m.id !== id);
  },

  async uploadPaymentMethodImage(file: File, oldImageId?: string | null): Promise<{ image_id: string }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const url = oldImageId 
        ? `/api/v1/payment-methods/image?old_image_id=${oldImageId}`
        : `/api/v1/payment-methods/image`;
      const res = await fetch(url, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Offline fallback
    }
    return { image_id: 'custom_' + Math.random().toString(36).substring(2, 9) };
  },

  // 11. System Preferences (Xion-POS Parity)
  async getPreferences(): Promise<SystemPreferences> {
    try {
      const stored = localStorage.getItem('xion_manager_preferences');
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_PREFERENCES, ...parsed };
      }
    } catch {
      // Offline fallback
    }
    return DEFAULT_PREFERENCES;
  },

  async updatePreferences(prefs: Partial<SystemPreferences>): Promise<SystemPreferences> {
    const current = await this.getPreferences();
    const updated = { ...current, ...prefs };
    try {
      localStorage.setItem('xion_manager_preferences', JSON.stringify(updated));
    } catch {
      // Storage fallback
    }
    applySystemPreferences(updated);
    return updated;
  },

  // 12. Venezuelan Payment Reports (Independent Module)
  async getPaymentReports(filters?: { status?: string; currency?: string; payment_method?: string; search?: string }): Promise<PaymentReportItem[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters?.currency && filters.currency !== 'all') params.append('currency', filters.currency);
      if (filters?.payment_method && filters.payment_method !== 'all') params.append('payment_method', filters.payment_method);
      if (filters?.search) params.append('search', filters.search);

      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`/api/v1/payment-reports${qs}`);
      if (res.ok) {
        const data = await res.json();
        mockPaymentReports = data;
        return data;
      }
    } catch {
      // Offline fallback
    }

    let results = [...mockPaymentReports];
    if (filters?.status && filters.status !== 'all') {
      results = results.filter(r => r.status.toLowerCase() === filters.status!.toLowerCase());
    }
    if (filters?.currency && filters.currency !== 'all') {
      results = results.filter(r => r.currency.toUpperCase() === filters.currency!.toUpperCase());
    }
    if (filters?.payment_method && filters.payment_method !== 'all') {
      results = results.filter(r => r.payment_method.toLowerCase() === filters.payment_method!.toLowerCase());
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(r => 
        (r.reference_number || '').toLowerCase().includes(q) ||
        (r.payer_name || '').toLowerCase().includes(q) ||
        (r.order_id || '').toLowerCase().includes(q) ||
        (r.concept || '').toLowerCase().includes(q) ||
        (r.origin_bank || '').toLowerCase().includes(q)
      );
    }
    return results;
  },

  async createPaymentReport(data: CreatePaymentReportDTO): Promise<PaymentReportItem> {
    try {
      const res = await fetch('/api/v1/payment-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const created = await res.json();
        mockPaymentReports.unshift(created);
        return created;
      }
      if (res.status === 400) {
        const err = await res.json();
        throw new Error(err.detail || 'Error al validar el reporte');
      }
    } catch (e: any) {
      if (e.message && !e.message.includes('fetch')) {
        throw e;
      }
      // Offline fallback: check uniqueness locally
      const cleanRef = (data.reference_number || '').trim().toLowerCase();
      const cleanBank = (data.origin_bank || '').trim().toLowerCase();
      if (cleanRef) {
        const dup = mockPaymentReports.find(r => 
          (r.reference_number || '').trim().toLowerCase() === cleanRef &&
          (r.origin_bank || '').trim().toLowerCase() === cleanBank &&
          r.payment_date === data.payment_date &&
          Math.abs(r.amount_paid - data.amount_paid) < 0.01 &&
          r.status !== 'rejected'
        );
        if (dup) {
          throw new Error(`Esta referencia bancaria (${data.reference_number}) ya fue registrada para ${data.origin_bank} en la fecha indicada.`);
        }
      }
    }

    const rate = data.exchange_rate || 37.50;
    const baseEquiv = data.currency === 'VES' ? Number((data.amount_paid / rate).toFixed(4)) : data.amount_paid;
    const newReport: PaymentReportItem = {
      id: `rep-${Date.now()}`,
      business_id: 'biz-101',
      order_id: data.order_id,
      concept: data.concept || 'Pago Reportado',
      payment_method: data.payment_method,
      origin_bank: data.origin_bank,
      dest_bank: data.dest_bank,
      payer_name: data.payer_name,
      payer_id_or_phone: data.payer_id_or_phone,
      payer_email: data.payer_email,
      reference_number: data.reference_number?.trim(),
      amount_paid: Number(data.amount_paid),
      currency: data.currency,
      exchange_rate: rate,
      amount_base_equivalent: baseEquiv,
      receipt_url: data.receipt_url,
      status: 'pending',
      notes: data.notes,
      payment_date: data.payment_date,
      created_at: new Date().toISOString()
    };
    mockPaymentReports.unshift(newReport);
    return newReport;
  },

  async verifyPaymentReport(reportId: string, notes?: string): Promise<PaymentReportItem> {
    try {
      const res = await fetch(`/api/v1/payment-reports/${reportId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified_by: 'Administrador General', notes })
      });
      if (res.ok) {
        const updated = await res.json();
        mockPaymentReports = mockPaymentReports.map(r => r.id === reportId ? updated : r);
        return updated;
      }
    } catch {
      // Offline fallback
    }

    mockPaymentReports = mockPaymentReports.map(r => {
      if (r.id === reportId) {
        return {
          ...r,
          status: 'approved',
          rejection_reason: undefined,
          verified_by: 'Administrador General',
          verified_at: new Date().toISOString(),
          notes: notes ? `${r.notes || ''} [Verificación: ${notes}]`.trim() : r.notes
        };
      }
      return r;
    });
    return mockPaymentReports.find(r => r.id === reportId)!;
  },

  async rejectPaymentReport(reportId: string, rejectionReason: string, notes?: string): Promise<PaymentReportItem> {
    try {
      const res = await fetch(`/api/v1/payment-reports/${reportId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejection_reason: rejectionReason, rejected_by: 'Administrador General', notes })
      });
      if (res.ok) {
        const updated = await res.json();
        mockPaymentReports = mockPaymentReports.map(r => r.id === reportId ? updated : r);
        return updated;
      }
    } catch {
      // Offline fallback
    }

    mockPaymentReports = mockPaymentReports.map(r => {
      if (r.id === reportId) {
        return {
          ...r,
          status: 'rejected',
          rejection_reason: rejectionReason,
          verified_by: 'Administrador General',
          verified_at: new Date().toISOString(),
          notes: notes ? `${r.notes || ''} [Rechazo: ${notes}]`.trim() : r.notes
        };
      }
      return r;
    });
    return mockPaymentReports.find(r => r.id === reportId)!;
  },

  async getVenezuelanBanks(): Promise<BankItem[]> {
    try {
      const res = await fetch('/api/v1/payment-reports/banks');
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Offline fallback
    }
    return [...mockBanks];
  },

  async getCompanyDestinationAccounts(): Promise<CompanyDestinationAccount[]> {
    try {
      const res = await fetch('/api/v1/xion-pay/destination-accounts');
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Offline fallback
    }
    return [...mockDestinationAccounts];
  },

  // 13. Xion-Pay Billing & External Integration Module
  async getXionPayConfig(): Promise<XionPayConfig> {
    try {
      const res = await fetch('/api/v1/xion-pay/config');
      if (res.ok) {
        const data = await res.json();
        mockXionPayConfig = data;
        return data;
      }
    } catch {
      // Offline fallback
    }
    return { ...mockXionPayConfig };
  },

  async getXionPayPlans(): Promise<XionPayPlan[]> {
    try {
      const res = await fetch('/api/v1/xion-pay/plans');
      if (res.ok) {
        const data = await res.json();
        mockXionPayPlans = data;
        return data;
      }
    } catch {
      // Offline fallback
    }
    return [...mockXionPayPlans];
  },

  async syncXionPay(payload: XionPaySyncPayload): Promise<XionPaySyncResponse> {
    try {
      const res = await fetch('/api/v1/xion-pay/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const result = await res.json();
        if (payload.official_exchange_rate) {
          mockXionPayConfig.official_exchange_rate = payload.official_exchange_rate;
        }
        if (payload.plans) {
          mockXionPayPlans = payload.plans;
        }
        if (payload.destination_accounts) {
          mockDestinationAccounts = payload.destination_accounts;
        }
        return result;
      }
    } catch {
      // Offline fallback
    }

    if (payload.official_exchange_rate) {
      mockXionPayConfig.official_exchange_rate = payload.official_exchange_rate;
    }
    if (payload.plans) {
      mockXionPayPlans = payload.plans;
    }
    if (payload.destination_accounts) {
      mockDestinationAccounts = payload.destination_accounts;
    }

    return {
      status: 'SYNCED',
      message: 'Datos de Xion-Pay sincronizados correctamente en modo diferido/offline.',
      synced_at: new Date().toISOString(),
      official_exchange_rate: mockXionPayConfig.official_exchange_rate,
      plans_count: mockXionPayPlans.length,
      accounts_count: mockDestinationAccounts.length
    };
  }
};

export const DEFAULT_PREFERENCES: SystemPreferences = {
  theme_mode: 'dark',
  font_size: 16,
  primary_color: '#0891B2',
  compact_mode: false,
  animations: true,
  high_contrast: false,
  interface_density: 'normal',
  sync_with_pos: true,
};

export function applySystemPreferences(prefs: SystemPreferences) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // 1. Theme mode
  if (prefs.theme_mode === 'dark') {
    root.classList.add('dark');
  } else if (prefs.theme_mode === 'light') {
    root.classList.remove('dark');
  } else {
    // auto
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }

  // Actualizar meta theme-color para barra de estado en móviles (iOS/Android)
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    const isDark = root.classList.contains('dark');
    metaTheme.setAttribute('content', isDark ? '#090d16' : '#f8fafc');
  }

  // 2. Dynamic Style Tag Management (exact parity with Xion-POS App.tsx)
  let styleTag = document.getElementById('xion-manager-dynamic-prefs');
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = 'xion-manager-dynamic-prefs';
    document.head.appendChild(styleTag);
  }

  const cssLines: string[] = [':root, .dark {'];

  if (prefs.primary_color) {
    const hex = prefs.primary_color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    const fgColor = (yiq >= 128) ? '#0F172A' : '#FFFFFF';

    root.style.setProperty('--brand-primary', prefs.primary_color);
    root.style.setProperty('--brand-primary-rgb', `${r}, ${g}, ${b}`);
    root.style.setProperty('--brand-primary-foreground', fgColor);

    cssLines.push(`  --brand-primary: ${prefs.primary_color} !important;`);
    cssLines.push(`  --brand-primary-rgb: ${r}, ${g}, ${b} !important;`);
    cssLines.push(`  --brand-primary-foreground: ${fgColor} !important;`);
  }

  if (prefs.interface_density === 'compact') {
    cssLines.push(`  --app-radius: 0.5rem !important;`);
  } else if (prefs.interface_density === 'comfortable') {
    cssLines.push(`  --app-radius: 1.25rem !important;`);
  } else {
    cssLines.push(`  --app-radius: 0.875rem !important;`);
  }

  if (prefs.compact_mode) {
    cssLines.push(`  --spacing-scale: 0.85 !important;`);
  }

  if (!prefs.animations) {
    cssLines.push(`  * { transition-duration: 0s !important; animation-duration: 0s !important; }`);
  }

  const fontSize = prefs.font_size || 16;
  root.style.setProperty('--app-font-size', `${fontSize}px`);
  root.style.setProperty('--app-font-scale', `${(fontSize / 16).toFixed(4)}`);

  cssLines.push(`  --app-font-size: ${fontSize}px !important;`);
  cssLines.push(`  --app-font-scale: ${(fontSize / 16).toFixed(4)} !important;`);
  cssLines.push('}');
  cssLines.push(`html { font-size: ${fontSize}px !important; }`);

  styleTag.innerHTML = cssLines.join('\n');
}


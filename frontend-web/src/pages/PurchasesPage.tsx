import React, { useState, useEffect, useRef } from 'react';
import { 
  ShoppingCart, 
  Plus, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Eye, 
  Trash2, 
  CreditCard, 
  Building2, 
  Search, 
  X, 
  UserPlus, 
  Edit, 
  Layers,
  Maximize2,
  LayoutGrid,
  List,
  Package,
  Minus,
  Check,
  ChevronRight,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { 
  PurchaseRecord, 
  SupplierItem, 
  ProductInventory, 
  Branch, 
  PurchaseItemDetail,
  SupplierPayableLedgerItem
} from '../types';

export const PurchasesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'create' | 'history' | 'suppliers'>('create');
  
  // Data Sources
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [products, setProducts] = useState<ProductInventory[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [exchangeRate, setExchangeRate] = useState<number>(37.50);

  // Modern Purchase Layout View States
  const [catalogView, setCatalogView] = useState<'grid' | 'list'>('grid');
  const [showExpandedModal, setShowExpandedModal] = useState<boolean>(false);
  const [showLiquidationModal, setShowLiquidationModal] = useState<boolean>(false);
  const [productCatalogSearch, setProductCatalogSearch] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Cart & Purchase Form State
  const [cartItems, setCartItems] = useState<PurchaseItemDetail[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('branch-1');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [paymentType, setPaymentType] = useState<'cash' | 'credit'>('cash');
  const [creditDays, setCreditDays] = useState<number>(15);
  const [initialPaidUSD, setInitialPaidUSD] = useState<string>('');
  const [purchaseNotes, setPurchaseNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reference Code for Lot Entry (e.g. 24112026)
  const todayRefCode = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).replace(/\D/g, '');

  // Pillar 2: Historial State & Modals
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'ALL' | 'PAID' | 'PENDING' | 'PARTIAL'>('ALL');
  const [selectedPurchaseDetail, setSelectedPurchaseDetail] = useState<PurchaseRecord | null>(null);
  const [payingPurchase, setPayingPurchase] = useState<PurchaseRecord | null>(null);
  const [payDebtAmountUSD, setPayDebtAmountUSD] = useState<string>('');

  // Pillar 3: Proveedores State & Modal
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierItem | null>(null);
  const [formSupName, setFormSupName] = useState('');
  const [formSupRif, setFormSupRif] = useState('');
  const [formSupEmail, setFormSupEmail] = useState('');
  const [formSupPhone, setFormSupPhone] = useState('');
  const [formSupAddress, setFormSupAddress] = useState('');
  const [formSupCategory, setFormSupCategory] = useState('Alimentos y Bebidas');
  const [formSupTerms, setFormSupTerms] = useState('15');

  // Pillar 4: Supplier Payables Ledger (CxP) Modal
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [selectedLedgerSupplier, setSelectedLedgerSupplier] = useState<SupplierItem | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<SupplierPayableLedgerItem[]>([]);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  // F1 Hotkey Listener to focus search bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadAllData = async () => {
    try {
      const [pur, sups, prods, brs, cfg] = await Promise.all([
        api.getPurchases(),
        api.getSuppliers(),
        api.getInventory(),
        api.getBranches(),
        api.getExchangeRate()
      ]);
      setPurchases(pur);
      setSuppliers(sups);
      setProducts(prods);
      setBranches(brs);
      if (cfg?.current_exchange_rate_bs) setExchangeRate(cfg.current_exchange_rate_bs);
      if (sups.length > 0 && !selectedSupplierId) setSelectedSupplierId(sups[0].id);
      if (brs.length > 0 && (!selectedBranchId || selectedBranchId === 'branch-1')) setSelectedBranchId(brs[0].id);
    } catch (err) {
      console.error('Error cargando datos de compras:', err);
    }
  };

  // Add Item to Cart / Entrada de Lote
  const handleAddItemToCart = (prodId: string) => {
    const found = products.find(p => p.id === prodId || p.product_id === prodId);
    if (!found) return;

    const existingIndex = cartItems.findIndex(it => it.product_id === found.id);
    if (existingIndex >= 0) {
      const updated = [...cartItems];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].total_usd = Number((updated[existingIndex].quantity * updated[existingIndex].cost_usd).toFixed(2));
      setCartItems(updated);
    } else {
      const unitCost = Number(found.cost_price || 0.0);
      const newItem: PurchaseItemDetail = {
        product_id: found.id,
        product_name: found.name,
        product_sku: found.sku || `SKU-${found.id.slice(0, 6)}`,
        quantity: 1,
        lot_number: `LOT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        lot_count: 1,
        previous_cost_usd: unitCost,
        cost_usd: unitCost,
        cost_bs: Number((unitCost * exchangeRate).toFixed(2)),
        total_usd: unitCost
      };
      setCartItems([...cartItems, newItem]);
    }
  };

  // Quantity Stepper & Direct Edit
  const handleUpdateCartItemQty = (index: number, newQty: number) => {
    if (newQty <= 0) return;
    const updated = [...cartItems];
    updated[index].quantity = newQty;
    updated[index].total_usd = Number((newQty * updated[index].cost_usd).toFixed(2));
    setCartItems(updated);
  };

  // Lot multiplier edit
  const handleUpdateCartItemLotCount = (index: number, count: number) => {
    if (count <= 0) return;
    const updated = [...cartItems];
    updated[index].lot_count = count;
    setCartItems(updated);
  };

  // Cost USD edit -> Auto updates Cost Bs
  const handleUpdateCartItemCostUSD = (index: number, newCostUSD: number) => {
    if (newCostUSD < 0) return;
    const updated = [...cartItems];
    updated[index].cost_usd = newCostUSD;
    updated[index].cost_bs = Number((newCostUSD * exchangeRate).toFixed(2));
    updated[index].total_usd = Number((updated[index].quantity * newCostUSD).toFixed(2));
    setCartItems(updated);
  };

  // Cost Bs edit -> Auto updates Cost USD
  const handleUpdateCartItemCostBs = (index: number, newCostBs: number) => {
    if (newCostBs < 0) return;
    const rate = exchangeRate > 0 ? exchangeRate : 1.0;
    const derivedUSD = Number((newCostBs / rate).toFixed(2));
    const updated = [...cartItems];
    updated[index].cost_bs = newCostBs;
    updated[index].cost_usd = derivedUSD;
    updated[index].total_usd = Number((updated[index].quantity * derivedUSD).toFixed(2));
    setCartItems(updated);
  };

  // Remove Item
  const handleRemoveCartItem = (index: number) => {
    setCartItems(cartItems.filter((_, i) => i !== index));
  };

  // Cart financial totals
  const totalCartUSD = cartItems.reduce((acc, it) => acc + (it.total_usd || 0), 0);
  const totalCartBs = Number((totalCartUSD * exchangeRate).toFixed(2));

  // Submit Nueva Compra / Liquidar Ingreso
  const handleSubmitPurchase = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (cartItems.length === 0) {
      alert('Debes agregar al menos un producto a la entrada de lote.');
      return;
    }

    const sup = suppliers.find(s => s.id === selectedSupplierId) || suppliers[0];
    const branch = branches.find(b => b.id === selectedBranchId) || branches[0];
    const paidUSDVal = paymentType === 'cash' ? totalCartUSD : (parseFloat(initialPaidUSD) || 0);

    setIsSubmitting(true);
    try {
      const generatedInvoice = invoiceNumber.trim() || `FAC-${new Date().getFullYear()}${Math.floor(1000 + Math.random() * 9000)}`;

      const newPurchase = await api.createPurchase({
        supplier_id: sup?.id || 'sup-general',
        supplier_name: sup?.name || 'Proveedor General',
        supplier_rif: sup?.rif || 'J-00000000-0',
        invoice_number: generatedInvoice,
        branch_id: branch?.id || 'branch-1',
        branch_name: branch?.name || 'Sucursal Principal',
        total_amount_usd: totalCartUSD,
        total_amount_bs: totalCartBs,
        exchange_rate: exchangeRate,
        payment_type: paymentType,
        paid_amount_usd: paidUSDVal,
        credit_days: paymentType === 'credit' ? creditDays : 0,
        notes: purchaseNotes || `Entrada de lote Ref #${todayRefCode}`,
        items: cartItems
      });

      setPurchases([newPurchase, ...purchases]);
      setCartItems([]);
      setInvoiceNumber('');
      setPurchaseNotes('');
      setInitialPaidUSD('');
      setShowExpandedModal(false);
      setShowLiquidationModal(false);

      // Refresh suppliers and inventory stock & costs
      const [updatedSups, updatedProds] = await Promise.all([
        api.getSuppliers(),
        api.getInventory()
      ]);
      setSuppliers(updatedSups);
      setProducts(updatedProds);

      setActiveTab('history');
      alert(`¡Entrada de lote liquidada exitosamente!\n\nFactura: ${generatedInvoice}\nTotal: $${totalCartUSD.toFixed(2)} USD\nEl inventario ha sido actualizado en Kardex y los costos ponderados fueron registrados.`);
    } catch (err: any) {
      alert(err?.message || 'Error al procesar la entrada de compra.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pay Pending Debt
  const handlePayDebtSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingPurchase) return;
    const amount = parseFloat(payDebtAmountUSD);
    if (!amount || amount <= 0) return;

    try {
      const updated = await api.payPurchaseDebt(payingPurchase.id, amount);
      setPurchases(purchases.map(p => p.id === updated.id ? updated : p));
      setPayingPurchase(null);
      setPayDebtAmountUSD('');
      const updatedSups = await api.getSuppliers();
      setSuppliers(updatedSups);
    } catch (err: any) {
      alert(err?.message || 'Error al registrar abono a proveedor.');
    }
  };

  // Open Supplier Ledger (CxP)
  const handleOpenSupplierLedger = async (sup: SupplierItem) => {
    setSelectedLedgerSupplier(sup);
    setIsLoadingLedger(true);
    setShowLedgerModal(true);
    try {
      const entries = await api.getSupplierLedger(sup.id);
      setLedgerEntries(entries);
    } catch (err) {
      console.error('Error al cargar movimientos contables CxP:', err);
    } finally {
      setIsLoadingLedger(false);
    }
  };

  // Supplier Open Modal
  const handleOpenSupplierModal = (sup?: SupplierItem) => {
    if (sup) {
      setEditingSupplier(sup);
      setFormSupName(sup.name);
      setFormSupRif(sup.rif);
      setFormSupEmail(sup.email);
      setFormSupPhone(sup.phone);
      setFormSupAddress(sup.address || '');
      setFormSupCategory(sup.category);
      setFormSupTerms(sup.payment_terms_days.toString());
    } else {
      setEditingSupplier(null);
      setFormSupName('');
      setFormSupRif('J-');
      setFormSupEmail('');
      setFormSupPhone('');
      setFormSupAddress('');
      setFormSupCategory('Alimentos y Bebidas');
      setFormSupTerms('15');
    }
    setShowSupplierModal(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: Partial<SupplierItem> = {
      name: formSupName,
      rif: formSupRif,
      email: formSupEmail,
      phone: formSupPhone,
      address: formSupAddress,
      category: formSupCategory,
      payment_terms_days: parseInt(formSupTerms) || 15
    };

    try {
      if (editingSupplier) {
        const updated = await api.updateSupplier(editingSupplier.id, data);
        setSuppliers(suppliers.map(s => s.id === updated.id ? updated : s));
      } else {
        const created = await api.createSupplier(data);
        setSuppliers([created, ...suppliers]);
        if (!selectedSupplierId) setSelectedSupplierId(created.id);
      }
      setShowSupplierModal(false);
    } catch (err: any) {
      alert(err?.message || 'Error al guardar proveedor.');
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    if (window.confirm('¿Seguro que deseas eliminar este proveedor?')) {
      try {
        await api.deleteSupplier(id);
        setSuppliers(suppliers.filter(s => s.id !== id));
      } catch (err: any) {
        alert(err?.message || 'Error al eliminar proveedor.');
      }
    }
  };

  // Historial Filters & KPIs
  const filteredPurchases = purchases.filter(p => {
    const matchesSearch = 
      (p.invoice_number || '').toLowerCase().includes(historySearch.toLowerCase()) ||
      (p.supplier_name || '').toLowerCase().includes(historySearch.toLowerCase()) ||
      (p.supplier_rif || '').toLowerCase().includes(historySearch.toLowerCase());
    
    let matchesStatus = true;
    if (historyStatusFilter === 'PAID') matchesStatus = p.payment_status === 'paid';
    if (historyStatusFilter === 'PENDING') matchesStatus = p.payment_status === 'pending';
    if (historyStatusFilter === 'PARTIAL') matchesStatus = p.payment_status === 'partial';

    return matchesSearch && matchesStatus;
  });

  const totalPurchasesUSD = purchases.reduce((acc, p) => acc + p.total_amount_usd, 0);
  const totalPaidUSD = purchases.reduce((acc, p) => acc + p.paid_amount_usd, 0);
  const totalPendingDebtUSD = purchases.reduce((acc, p) => acc + p.pending_amount_usd, 0);

  // Suppliers search
  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
    s.rif.toLowerCase().includes(supplierSearch.toLowerCase()) ||
    s.category.toLowerCase().includes(supplierSearch.toLowerCase())
  );

  // Filter Catalog Products
  const filteredCatalogProducts = products.filter(p => {
    if (!productCatalogSearch) return true;
    const q = productCatalogSearch.toLowerCase();
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q) ||
      (p.barcode || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Header with Tab Switcher */}
      <div className="glass-panel p-3.5 sm:p-4 rounded-xl sm:rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 shrink-0" />
            <span>Módulo de Compras y Proveedores</span>
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-400 hidden xs:block">
            Recepción de pedidos, entrada de lote de inventario, costo promedio y gestión de proveedores
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center bg-slate-900 rounded-lg sm:rounded-xl p-1 border border-slate-800 text-xs overflow-x-auto w-full md:w-auto">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md sm:rounded-lg font-semibold transition-all whitespace-nowrap text-xs ${activeTab === 'create' ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/20' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Entrada de Lote</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md sm:rounded-lg font-semibold transition-all whitespace-nowrap text-xs ${activeTab === 'history' ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/20' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Historial ({purchases.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md sm:rounded-lg font-semibold transition-all whitespace-nowrap text-xs ${activeTab === 'suppliers' ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/20' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Proveedores ({suppliers.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          TAB 1: ENTRADA DE LOTE (INTERFAZ VISUAL EXACTA SEGÚN DISEÑO)
      ======================================================== */}
      {activeTab === 'create' && (
        <div className="flex flex-col lg:flex-row gap-5 items-start">
          
          {/* LEFT / MAIN COLUMN: BÚSQUEDA Y CATÁLOGO DE PRODUCTOS */}
          <div className="flex-1 w-full space-y-4">
            
            {/* Top Search Bar with F1 Badge & View Mode Toggle */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-600 transition-all">
                <Search className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Buscar producto, código de barra o SKU..."
                  value={productCatalogSearch}
                  onChange={e => setProductCatalogSearch(e.target.value)}
                  className="w-full bg-transparent text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
                />
                {productCatalogSearch && (
                  <button onClick={() => setProductCatalogSearch('')} className="p-1 text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <div className="ml-2 hidden sm:flex items-center">
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-100 text-slate-500 rounded-md border border-slate-200/80">
                    F1
                  </span>
                </div>
              </div>

              {/* View Toggle Buttons */}
              <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80 shrink-0">
                <button
                  type="button"
                  onClick={() => setCatalogView('grid')}
                  className={`p-2 rounded-xl transition-all ${catalogView === 'grid' ? 'bg-[#1a36b4] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  title="Vista Cuadrícula"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCatalogView('list')}
                  className={`p-2 rounded-xl transition-all ${catalogView === 'list' ? 'bg-[#1a36b4] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  title="Vista Lista"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Catalog Grid View */}
            {catalogView === 'grid' && (
              <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-3.5">
                {filteredCatalogProducts.length === 0 ? (
                  <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-slate-400 text-xs">
                    <Package className="w-12 h-12 mx-auto text-slate-300 mb-2 stroke-[1.2]" />
                    No se encontraron productos que coincidan con la búsqueda.
                  </div>
                ) : (
                  filteredCatalogProducts.map(p => {
                    const isAdded = cartItems.some(it => it.product_id === p.id);
                    const stockVal = p.current_stock ?? 100;
                    const costVal = Number(p.cost_price || 0.0);
                    const costBs = Number((costVal * exchangeRate).toFixed(2));

                    return (
                      <div
                        key={p.id}
                        onClick={() => handleAddItemToCart(p.id)}
                        className={`group bg-white text-slate-900 border rounded-2xl p-3 shadow-sm hover:shadow-md transition-all cursor-pointer relative flex flex-col justify-between min-h-[175px] select-none active:scale-[0.98] ${isAdded ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-slate-200/90 hover:border-blue-400'}`}
                      >
                        {/* Top Stock Badge */}
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-[#1a36b4] text-white shadow-sm">
                            {stockVal}
                          </span>
                          {p.product_type === 'virtual' && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-purple-100 text-purple-700 border border-purple-200 uppercase tracking-wider">
                              Combo ({p.combo_items?.length || 0} comp)
                            </span>
                          )}
                        </div>

                        {/* Center Product Icon / Image Placeholder */}
                        <div className="my-auto flex flex-col items-center justify-center py-2">
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.name} className="w-12 h-12 object-contain rounded-lg" />
                          ) : p.product_type === 'virtual' ? (
                            <>
                              <Layers className="w-11 h-11 text-purple-400 stroke-[1.3] group-hover:text-purple-600 transition-colors" />
                              <span className="text-[10px] font-mono font-bold text-purple-500 mt-1">KIT</span>
                            </>
                          ) : (
                            <>
                              <Package className="w-11 h-11 text-slate-300 stroke-[1.3] group-hover:text-blue-500 transition-colors" />
                              <span className="text-[10px] font-mono font-bold text-slate-400 mt-1">GE</span>
                            </>
                          )}
                        </div>

                        {/* Price Badge on Top-Right or Floating */}
                        <div className="absolute top-2.5 right-2.5">
                          <span className="px-2 py-0.5 rounded-lg bg-[#1a36b4] text-white font-mono font-bold text-[11px] shadow-sm">
                            ${costVal.toFixed(2)}
                          </span>
                        </div>

                        {/* Bottom Product Info */}
                        <div className="pt-2 border-t border-slate-100">
                          <div className="text-[9px] font-mono text-slate-400 truncate uppercase">
                            {p.sku || `SKU-${p.id.slice(0, 6)}`}
                          </div>
                          <div className="text-xs font-bold text-slate-800 line-clamp-2 leading-tight mt-0.5">
                            {p.name}
                          </div>
                          {p.product_type === 'virtual' && p.combo_items && p.combo_items.length > 0 && (
                            <div className="text-[9px] text-purple-600 font-medium truncate mt-0.5" title={p.combo_items.map(c => `${c.quantity}x ${c.product_name}`).join(', ')}>
                              Receta: {p.combo_items.map(c => `${c.quantity}x ${c.product_name}`).join(', ')}
                            </div>
                          )}
                          <div className="text-[10px] font-semibold text-slate-500 mt-1 font-mono">
                            VES <span className="font-bold">Bs {costBs.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Catalog List View */}
            {catalogView === 'list' && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {filteredCatalogProducts.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      No hay productos que coincidan.
                    </div>
                  ) : (
                    filteredCatalogProducts.map(p => {
                      const costVal = Number(p.cost_price || 0.0);
                      const costBs = Number((costVal * exchangeRate).toFixed(2));
                      return (
                        <div
                          key={p.id}
                          onClick={() => handleAddItemToCart(p.id)}
                          className="p-3 sm:px-4 sm:py-3 flex items-center justify-between hover:bg-slate-50/80 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-slate-400">
                              <Package className="w-5 h-5 stroke-[1.5]" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-800 truncate">{p.name}</div>
                              <div className="text-[10px] font-mono text-slate-400">
                                SKU: {p.sku || p.id} • Stock: <strong className="text-blue-700">{p.current_stock ?? 100}</strong>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <div className="text-xs font-bold font-mono text-[#1a36b4]">${costVal.toFixed(2)}</div>
                              <div className="text-[10px] font-mono text-slate-500">Bs {costBs.toFixed(2)}</div>
                            </div>
                            <button
                              type="button"
                              className="px-2.5 py-1 rounded-lg bg-[#1a36b4] text-white text-[11px] font-bold"
                            >
                              + Agregar
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: SIDEBAR 'ENTRADA DE LOTE' (DESKTOP) */}
          <div className="w-full lg:w-80 xl:w-96 shrink-0 space-y-4">
            <div className="bg-white text-slate-900 border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
              
              {/* Header Box */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#1a36b4] flex items-center justify-center text-white shadow-sm">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black tracking-wider text-slate-900 uppercase">
                      ENTRADA DE LOTE
                    </h4>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {cartItems.length} producto{cartItems.length === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>

                {/* Desplegar Modal Button */}
                <button
                  type="button"
                  onClick={() => setShowExpandedModal(true)}
                  className="px-2.5 py-1 rounded-lg bg-[#1a36b4] hover:bg-blue-800 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm transition-all"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>Desplegar</span>
                </button>
              </div>

              {/* Supplier Selection */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Proveedor
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={selectedSupplierId}
                    onChange={e => setSelectedSupplierId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:border-[#1a36b4]"
                  >
                    <option value="">Seleccionar Proveedor...</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.rif})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items List in Sidebar */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Artículos Añadidos
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-xl p-2 bg-slate-50/50">
                  {cartItems.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      No hay productos añadidos al lote. Haz clic en las tarjetas del catálogo.
                    </div>
                  ) : (
                    cartItems.map((item, idx) => (
                      <div key={idx} className="py-2.5 first:pt-1 last:pb-1 flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-800 truncate leading-snug">
                            {item.product_name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            x{item.quantity} · ${(item.cost_usd).toFixed(2)}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-black text-[#1a36b4] font-mono">
                            ${item.total_usd.toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCartItem(idx)}
                            className="text-slate-400 hover:text-rose-500 p-1 rounded transition-colors"
                            title="Eliminar de la entrada"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Sidebar Totals Summary */}
              <div className="pt-2 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-2 items-center mb-3">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      TOTAL USD
                    </div>
                    <div className="text-xl font-black text-slate-900 font-mono">
                      ${totalCartUSD.toFixed(2)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      MONEDA LOCAL
                    </div>
                    <div className="mt-0.5 inline-block px-2.5 py-1 rounded-lg bg-[#1a36b4] text-white font-mono font-bold text-xs shadow-sm">
                      BS {totalCartBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {/* Main Action Buttons */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowExpandedModal(true)}
                    className="w-full py-2.5 rounded-xl bg-white border border-blue-600/80 text-blue-700 hover:bg-blue-50 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>DESPLEGAR TABLA COMPLETA</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowLiquidationModal(true)}
                    disabled={cartItems.length === 0}
                    className="w-full py-3 rounded-xl bg-[#6f7ec5] hover:bg-[#5e6db8] text-white font-bold text-xs tracking-wider uppercase transition-all shadow-md shadow-indigo-500/10 disabled:opacity-50 active:scale-[0.99]"
                  >
                    LIQUIDAR INGRESO
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MOBILE FLOATING BOTTOM BAR (ACCESO RÁPIDO A ENTRADA DE LOTE)
      ======================================================== */}
      {activeTab === 'create' && cartItems.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 flex items-center justify-between shadow-2xl">
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {cartItems.length} producto{cartItems.length === 1 ? '' : 's'} en lote
            </div>
            <div className="text-base font-black text-slate-900 font-mono">
              ${totalCartUSD.toFixed(2)} <span className="text-xs text-blue-700 font-bold">USD</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowExpandedModal(true)}
              className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200"
            >
              Tabla
            </button>
            <button
              type="button"
              onClick={() => setShowLiquidationModal(true)}
              className="px-4 py-2 rounded-xl bg-[#6f7ec5] text-white font-bold text-xs shadow-md shadow-indigo-500/20"
            >
              Liquidar Ingreso
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: ENTRADA DE LOTE (VISTA EXPANDIDA) - IMAGEN 2
      ======================================================== */}
      {showExpandedModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200/80 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#1a36b4] flex items-center justify-center text-white shadow-sm">
                  <Package className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-wide uppercase">
                  ENTRADA DE LOTE (VISTA EXPANDIDA)
                </h3>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <span className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-mono font-bold text-slate-600 bg-slate-50">
                  Ref: {todayRefCode}
                </span>
                <button
                  type="button"
                  onClick={() => setShowExpandedModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body / Scrollable Content */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
              
              {/* Proveedor / Origen Selector Box */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  PROVEEDOR / ORIGEN
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={selectedSupplierId}
                    onChange={e => setSelectedSupplierId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-[#1a36b4]"
                  >
                    <option value="">Seleccionar Proveedor u Origen...</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.rif})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items Table (Desktop & Tablet) */}
              <div className="hidden md:block border border-slate-200 rounded-2xl overflow-hidden bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 text-[11px] font-black text-slate-600 uppercase border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">PRODUCTO</th>
                      <th className="p-3.5 text-center">LOTES</th>
                      <th className="p-3.5 text-center">CANTIDAD</th>
                      <th className="p-3.5 text-center">COSTO USD ($)</th>
                      <th className="p-3.5 text-center">COSTO BS (BS)</th>
                      <th className="p-3.5 text-right">TOTAL USD</th>
                      <th className="p-3.5 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cartItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-10 text-slate-400 text-xs">
                          No hay productos en el lote todavía.
                        </td>
                      </tr>
                    ) : (
                      cartItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          {/* Producto */}
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900 text-xs">{item.product_name}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-mono text-slate-400">SKU: {item.product_sku}</span>
                              <span className="text-[10px] font-semibold text-blue-700">
                                Costo Anterior: ${(item.previous_cost_usd ?? item.cost_usd).toFixed(2)}
                              </span>
                            </div>
                          </td>

                          {/* Lotes */}
                          <td className="p-3.5 text-center">
                            <div className="inline-flex items-center gap-1 border border-blue-600/80 rounded-lg px-2 py-1 bg-white">
                              <span className="text-[11px] font-bold text-blue-700">Lx</span>
                              <input
                                type="number"
                                min="1"
                                value={item.lot_count || 1}
                                onChange={e => handleUpdateCartItemLotCount(idx, parseInt(e.target.value) || 1)}
                                className="w-7 text-center font-bold text-xs text-blue-900 focus:outline-none"
                              />
                            </div>
                          </td>

                          {/* Cantidad Stepper */}
                          <td className="p-3.5 text-center">
                            <div className="inline-flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                              <button
                                type="button"
                                onClick={() => handleUpdateCartItemQty(idx, item.quantity - 1)}
                                className="px-2.5 py-1 text-slate-500 hover:bg-slate-200 font-bold"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={e => handleUpdateCartItemQty(idx, parseFloat(e.target.value) || 1)}
                                className="w-10 text-center font-bold text-xs bg-transparent focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateCartItemQty(idx, item.quantity + 1)}
                                className="px-2.5 py-1 text-slate-500 hover:bg-slate-200 font-bold"
                              >
                                +
                              </button>
                            </div>
                          </td>

                          {/* Costo USD ($) */}
                          <td className="p-3.5 text-center">
                            <div className="inline-flex items-center gap-1 border border-slate-200 rounded-lg px-2.5 py-1 bg-white">
                              <span className="text-slate-400 font-mono">$</span>
                              <input
                                type="number"
                                step="0.01"
                                value={item.cost_usd}
                                onChange={e => handleUpdateCartItemCostUSD(idx, parseFloat(e.target.value) || 0)}
                                className="w-16 font-mono font-bold text-xs text-slate-800 text-center focus:outline-none"
                              />
                            </div>
                          </td>

                          {/* Costo Bs (BS) */}
                          <td className="p-3.5 text-center">
                            <div className="inline-flex items-center gap-1 border border-emerald-400/80 rounded-lg px-2.5 py-1 bg-emerald-50/40">
                              <span className="text-emerald-600 font-bold text-[10px]">Bs</span>
                              <input
                                type="number"
                                step="0.01"
                                value={item.cost_bs}
                                onChange={e => handleUpdateCartItemCostBs(idx, parseFloat(e.target.value) || 0)}
                                className="w-20 font-mono font-bold text-xs text-emerald-800 text-center bg-transparent focus:outline-none"
                              />
                            </div>
                          </td>

                          {/* Total USD */}
                          <td className="p-3.5 text-right font-black font-mono text-xs text-slate-900">
                            ${item.total_usd.toFixed(2)}
                          </td>

                          {/* Delete */}
                          <td className="p-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveCartItem(idx)}
                              className="text-slate-400 hover:text-rose-500 p-1 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Items Card List on Mobile (Touch Responsive) */}
              <div className="md:hidden space-y-3">
                {cartItems.map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-900">{item.product_name}</div>
                        <div className="text-[10px] font-mono text-slate-400">SKU: {item.product_sku}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCartItem(idx)}
                        className="text-slate-400 hover:text-rose-500 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500">Cantidad:</label>
                        <div className="flex items-center border border-slate-200 rounded-lg bg-white mt-0.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateCartItemQty(idx, item.quantity - 1)}
                            className="px-3 py-1 font-bold text-slate-600"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={e => handleUpdateCartItemQty(idx, parseFloat(e.target.value) || 1)}
                            className="w-full text-center font-bold text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateCartItemQty(idx, item.quantity + 1)}
                            className="px-3 py-1 font-bold text-slate-600"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500">Costo ($ USD):</label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.cost_usd}
                          onChange={e => handleUpdateCartItemCostUSD(idx, parseFloat(e.target.value) || 0)}
                          className="w-full border border-slate-200 rounded-lg p-1.5 font-mono font-bold text-xs bg-white mt-0.5"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                      <span className="text-[11px] text-slate-500">Subtotal:</span>
                      <span className="text-sm font-black text-[#1a36b4] font-mono">${item.total_usd.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer (Totales e Inversión de Lote) */}
            <div className="p-4 sm:p-5 border-t border-slate-200 bg-white shrink-0 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  INVERSIÓN LOTE
                </span>
                <span className="text-sm font-bold font-mono text-slate-800">
                  ${totalCartUSD.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    TOTAL USD
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                    ${totalCartUSD.toFixed(2)}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    TOTAL BS (MONEDA LOCAL)
                  </div>
                  <div className="inline-block px-3 py-1.5 rounded-xl bg-[#1a36b4] text-white font-mono font-black text-xs sm:text-sm shadow-sm">
                    Bs {totalCartBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowExpandedModal(false);
                  setShowLiquidationModal(true);
                }}
                disabled={cartItems.length === 0}
                className="w-full py-3.5 rounded-xl bg-[#6f7ec5] hover:bg-[#5e6db8] text-white font-black text-xs sm:text-sm tracking-wider uppercase transition-all shadow-lg shadow-indigo-500/15 disabled:opacity-50"
              >
                LIQUIDAR RECEPCIÓN DE INGRESO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CONFIRMACIÓN Y LIQUIDACIÓN CONTABLE DE COMPRA
      ======================================================== */}
      {showLiquidationModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg p-5 sm:p-6 rounded-2xl border border-slate-800 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Liquidar y Asentar Recepción de Compra
              </h4>
              <button onClick={() => setShowLiquidationModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPurchase} className="space-y-3.5 text-xs">
              {/* Financial Summary Pill */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[11px]">Total Lote ({cartItems.length} ítems):</span>
                  <span className="text-emerald-400 font-mono font-black text-lg">${totalCartUSD.toFixed(2)} USD</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[11px]">Equivalente Tasa Oficial:</span>
                  <span className="text-slate-200 font-mono font-bold text-sm">{totalCartBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Proveedor / Razón Social *</label>
                <select
                  required
                  value={selectedSupplierId}
                  onChange={e => setSelectedSupplierId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-200"
                >
                  <option value="">Selecciona un Proveedor...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.rif})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Nº Factura / Control Fiscal *</label>
                  <input
                    type="text"
                    required
                    placeholder="FAC-20261124"
                    value={invoiceNumber}
                    onChange={e => setInvoiceNumber(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Sucursal Destino *</label>
                  <select
                    value={selectedBranchId}
                    onChange={e => setSelectedBranchId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-200"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Condición de Pago</label>
                  <select
                    value={paymentType}
                    onChange={e => setPaymentType(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-200"
                  >
                    <option value="cash">Contado (Pagado Total)</option>
                    <option value="credit">Crédito (Cuenta x Pagar)</option>
                  </select>
                </div>

                {paymentType === 'credit' ? (
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Días de Crédito Acordados</label>
                    <input
                      type="number"
                      value={creditDays}
                      onChange={e => setCreditDays(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Estado Contable</label>
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 font-bold text-center">
                      Liquidación Contado
                    </div>
                  </div>
                )}
              </div>

              {paymentType === 'credit' && (
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Abono Inicial en la Recepción ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={initialPaidUSD}
                    onChange={e => setInitialPaidUSD(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Notas u Observaciones del Lote</label>
                <textarea
                  value={purchaseNotes}
                  onChange={e => setPurchaseNotes(e.target.value)}
                  rows={2}
                  placeholder="Detalles del despacho, sello de recepción..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowLiquidationModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-slate-400 font-semibold"
                >
                  Regresar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold shadow-lg shadow-blue-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Asentando en Kardex...' : 'Confirmar e Ingresar a Kardex'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: HISTORIAL DE COMPRAS (DETALLE Y PAGOS)
      ======================================================== */}
      {activeTab === 'history' && (
        <div className="space-y-3 sm:space-y-4">
          {/* Top KPIs Row */}
          <div className="grid grid-cols-1 xs:grid-cols-3 gap-2.5 sm:gap-4">
            <div className="glass-panel p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-800 flex items-center gap-2.5 sm:gap-3">
              <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">Total Compras</div>
                <div className="text-base sm:text-xl font-bold text-slate-100 truncate">${totalPurchasesUSD.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</div>
              </div>
            </div>

            <div className="glass-panel p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-800 flex items-center gap-2.5 sm:gap-3">
              <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">Monto Pagado</div>
                <div className="text-base sm:text-xl font-bold text-emerald-400 truncate">${totalPaidUSD.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</div>
              </div>
            </div>

            <div className="glass-panel p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-800 flex items-center gap-2.5 sm:gap-3">
              <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">Cuentas x Pagar</div>
                <div className="text-base sm:text-xl font-bold text-rose-400 truncate">${totalPendingDebtUSD.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</div>
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="glass-panel p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por Nº factura, proveedor o RIF..."
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-900 rounded-xl p-1 border border-slate-800 text-xs w-full sm:w-auto overflow-x-auto">
              <button
                onClick={() => setHistoryStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-medium ${historyStatusFilter === 'ALL' ? 'bg-cyan-500/20 text-cyan-400 font-bold' : 'text-slate-400'}`}
              >
                Todas
              </button>
              <button
                onClick={() => setHistoryStatusFilter('PAID')}
                className={`px-2.5 py-1 rounded-lg font-medium ${historyStatusFilter === 'PAID' ? 'bg-emerald-500/20 text-emerald-400 font-bold' : 'text-slate-400'}`}
              >
                Pagadas
              </button>
              <button
                onClick={() => setHistoryStatusFilter('PARTIAL')}
                className={`px-2.5 py-1 rounded-lg font-medium ${historyStatusFilter === 'PARTIAL' ? 'bg-amber-500/20 text-amber-400 font-bold' : 'text-slate-400'}`}
              >
                Parciales
              </button>
              <button
                onClick={() => setHistoryStatusFilter('PENDING')}
                className={`px-2.5 py-1 rounded-lg font-medium ${historyStatusFilter === 'PENDING' ? 'bg-rose-500/20 text-rose-400 font-bold' : 'text-slate-400'}`}
              >
                Pendientes
              </button>
            </div>
          </div>

          {/* Invoices List Table */}
          <div className="glass-panel rounded-2xl p-4 sm:p-6 border border-slate-800 overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="p-3.5 rounded-l-xl">Nº Factura</th>
                  <th className="p-3.5">Proveedor</th>
                  <th className="p-3.5">Sucursal Destino</th>
                  <th className="p-3.5">Fecha</th>
                  <th className="p-3.5">Total ($ USD)</th>
                  <th className="p-3.5">Estado Pago</th>
                  <th className="p-3.5 text-right rounded-r-xl">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-500 text-xs">
                      No se encontraron facturas de compra registradas.
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map(p => (
                    <tr key={p.id} className="hover:bg-slate-900/40">
                      <td className="p-3.5 font-mono text-xs font-bold text-cyan-400">{p.invoice_number}</td>
                      <td className="p-3.5">
                        <div className="font-medium text-slate-200">{p.supplier_name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{p.supplier_rif}</div>
                      </td>
                      <td className="p-3.5 text-xs text-slate-300">{p.branch_name}</td>
                      <td className="p-3.5 text-xs text-slate-400">{p.date}</td>
                      <td className="p-3.5 font-mono">
                        <div className="font-bold text-emerald-400">${p.total_amount_usd.toFixed(2)}</div>
                        {p.pending_amount_usd > 0 && (
                          <div className="text-[10px] text-rose-400">Resta: ${p.pending_amount_usd.toFixed(2)}</div>
                        )}
                      </td>
                      <td className="p-3.5">
                        {p.payment_status === 'paid' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            Pagada
                          </span>
                        ) : p.payment_status === 'partial' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <Clock className="w-3 h-3" />
                            Parcial
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <AlertCircle className="w-3 h-3" />
                            Pendiente
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedPurchaseDetail(p)}
                            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-400"
                            title="Ver Detalle"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {p.pending_amount_usd > 0 && (
                            <button
                              onClick={() => {
                                setPayingPurchase(p);
                                setPayDebtAmountUSD(p.pending_amount_usd.toString());
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold"
                            >
                              Abonar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 3: DIRECTORIO DE PROVEEDORES
      ======================================================== */}
      {activeTab === 'suppliers' && (
        <div className="space-y-4">
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar proveedor por nombre, RIF o categoría..."
                value={supplierSearch}
                onChange={e => setSupplierSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              onClick={() => handleOpenSupplierModal()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-lg shadow-cyan-500/20 transition-all hover:scale-105"
            >
              <UserPlus className="w-4 h-4" />
              <span>Registrar Proveedor</span>
            </button>
          </div>

          <div className="glass-panel rounded-2xl p-4 sm:p-6 border border-slate-800 overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="p-3.5 rounded-l-xl">Razón Social / RIF</th>
                  <th className="p-3.5">Categoría</th>
                  <th className="p-3.5">Contacto</th>
                  <th className="p-3.5">Plazo Crédito</th>
                  <th className="p-3.5">Saldo Deudor</th>
                  <th className="p-3.5">Estado</th>
                  <th className="p-3.5 text-right rounded-r-xl">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-500 text-xs">
                      No hay proveedores registrados.
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map(s => (
                    <tr key={s.id} className="hover:bg-slate-900/40">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-100">{s.name}</div>
                        <div className="text-xs text-cyan-400 font-mono">{s.rif}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-0.5 rounded-lg text-xs bg-slate-900 border border-slate-800 text-slate-300">
                          {s.category}
                        </span>
                      </td>
                      <td className="p-3.5 text-xs text-slate-400">
                        <div>{s.phone}</div>
                        <div className="text-[11px] text-slate-500">{s.email}</div>
                      </td>
                      <td className="p-3.5 text-xs font-semibold text-slate-300">
                        {s.payment_terms_days} días
                      </td>
                      <td className="p-3.5 font-mono">
                        <span className={`font-bold ${s.current_balance_usd > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          ${s.current_balance_usd.toFixed(2)}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.is_active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'}`}>
                          {s.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenSupplierLedger(s)}
                            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/40 transition-all"
                            title="Ver Estado de Cuenta / Historial CxP"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenSupplierModal(s)}
                            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-400"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSupplier(s.id)}
                            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: Purchase Detail */}
      {selectedPurchaseDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-xl p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                Detalle de Factura: {selectedPurchaseDetail.invoice_number}
              </h4>
              <button onClick={() => setSelectedPurchaseDetail(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div>
                <span className="text-slate-400">Proveedor:</span>
                <div className="font-bold text-slate-100">{selectedPurchaseDetail.supplier_name}</div>
                <div className="text-slate-500 font-mono text-[11px]">{selectedPurchaseDetail.supplier_rif}</div>
              </div>
              <div>
                <span className="text-slate-400">Sucursal Destino:</span>
                <div className="font-bold text-slate-100">{selectedPurchaseDetail.branch_name}</div>
                <div className="text-slate-500 text-[11px]">{selectedPurchaseDetail.date}</div>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="font-bold text-slate-200">Artículos Recibidos:</div>
              <div className="max-h-60 overflow-y-auto space-y-1.5">
                {selectedPurchaseDetail.items?.map((it, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <div>
                      <div className="font-bold text-slate-200">{it.product_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Cant: {it.quantity} unid. • Costo: ${it.cost_usd.toFixed(2)}</div>
                    </div>
                    <div className="text-right font-mono font-bold text-emerald-400">
                      ${it.total_usd.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between font-bold text-sm">
              <span className="text-slate-300">Total Factura:</span>
              <span className="text-emerald-400 font-mono">${selectedPurchaseDetail.total_amount_usd.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Pay Pending Debt */}
      {payingPurchase && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                Abono de Cuenta por Pagar
              </h4>
              <button onClick={() => setPayingPurchase(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePayDebtSubmit} className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-slate-400">Factura: <strong className="text-slate-200">{payingPurchase.invoice_number}</strong></div>
                <div className="text-slate-400">Proveedor: <strong className="text-slate-200">{payingPurchase.supplier_name}</strong></div>
                <div className="mt-2 text-rose-400 font-bold text-sm">Deuda Actual: ${payingPurchase.pending_amount_usd.toFixed(2)}</div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Monto a Abonar ($ USD) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  max={payingPurchase.pending_amount_usd}
                  value={payDebtAmountUSD}
                  onChange={e => setPayDebtAmountUSD(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-emerald-400 font-mono font-bold text-sm"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPayingPurchase(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-slate-400 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-md shadow-emerald-500/20"
                >
                  Registrar Abono
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Supplier Add / Edit */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-cyan-400" />
                {editingSupplier ? 'Editar Proveedor' : 'Registrar Nuevo Proveedor'}
              </h4>
              <button onClick={() => setShowSupplierModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Razón Social *</label>
                  <input
                    type="text"
                    required
                    value={formSupName}
                    onChange={e => setFormSupName(e.target.value)}
                    placeholder="Distribuidora C.A."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">RIF / Identificación *</label>
                  <input
                    type="text"
                    required
                    value={formSupRif}
                    onChange={e => setFormSupRif(e.target.value)}
                    placeholder="J-12345678-0"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={formSupPhone}
                    onChange={e => setFormSupPhone(e.target.value)}
                    placeholder="+58 414-1234567"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    value={formSupEmail}
                    onChange={e => setFormSupEmail(e.target.value)}
                    placeholder="ventas@proveedor.com"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Categoría</label>
                  <select
                    value={formSupCategory}
                    onChange={e => setFormSupCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                  >
                    <option value="Alimentos y Bebidas">Alimentos y Bebidas</option>
                    <option value="Granos y Aceites">Granos y Aceites</option>
                    <option value="Harinas y Derivados">Harinas y Derivados</option>
                    <option value="Limpieza e Higiene">Limpieza e Higiene</option>
                    <option value="Varios">Varios</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Plazo de Crédito (Días)</label>
                  <input
                    type="number"
                    value={formSupTerms}
                    onChange={e => setFormSupTerms(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Dirección Fiscal</label>
                <textarea
                  value={formSupAddress}
                  onChange={e => setFormSupAddress(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-slate-400 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold shadow-md shadow-cyan-500/20"
                >
                  {editingSupplier ? 'Guardar Cambios' : 'Registrar Proveedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Supplier Payables Ledger (Estado de Cuenta CxP) */}
      {showLedgerModal && selectedLedgerSupplier && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-2xl p-6 rounded-2xl border border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-400" />
                  Estado de Cuenta: {selectedLedgerSupplier.name}
                </h4>
                <div className="text-xs text-cyan-400 font-mono mt-0.5">
                  RIF: {selectedLedgerSupplier.rif} • Plazo: {selectedLedgerSupplier.payment_terms_days} días
                </div>
              </div>
              <button onClick={() => setShowLedgerModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary Banner */}
            <div className="grid grid-cols-2 gap-3 text-xs p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div>
                <span className="text-slate-400">Saldo Deudor Actual:</span>
                <div className="text-xl font-bold font-mono text-rose-400 mt-0.5">
                  ${selectedLedgerSupplier.current_balance_usd.toFixed(2)}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {(selectedLedgerSupplier.current_balance_usd * exchangeRate).toFixed(2)} Bs.
                </div>
              </div>
              <div className="text-right">
                <span className="text-slate-400">Total Movimientos Registrados:</span>
                <div className="text-xl font-bold font-mono text-slate-100 mt-0.5">
                  {ledgerEntries.length}
                </div>
                <div className="text-[10px] text-emerald-400 font-semibold">
                  Libro Mayor Contable en Línea
                </div>
              </div>
            </div>

            {/* Ledger Transactions Table */}
            <div className="space-y-2 text-xs">
              <div className="font-bold text-slate-200">Historial de Cargos y Abonos (CxP):</div>

              {isLoadingLedger ? (
                <div className="text-center py-8 text-slate-400">Cargando movimientos contables...</div>
              ) : ledgerEntries.length === 0 ? (
                <div className="text-center py-8 text-slate-500 bg-slate-900 rounded-xl border border-slate-800">
                  No hay movimientos registrados en el estado de cuenta de este proveedor.
                </div>
              ) : (
                <div className="rounded-xl border border-slate-800 overflow-x-auto max-h-72">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900 text-[11px] font-semibold text-slate-400 uppercase sticky top-0">
                      <tr>
                        <th className="p-2.5">Fecha</th>
                        <th className="p-2.5">Tipo</th>
                        <th className="p-2.5">Factura / Ref</th>
                        <th className="p-2.5 text-right">Monto</th>
                        <th className="p-2.5 text-right">Saldo Posterior</th>
                        <th className="p-2.5">Notas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      {ledgerEntries.map((entry) => {
                        const isPayment = entry.tx_type === 'PAYMENT' || entry.movement_type === 'PAYMENT_ABONO';
                        return (
                          <tr key={entry.id} className="hover:bg-slate-900/40">
                            <td className="p-2.5 text-slate-400 font-sans">
                              {entry.created_at?.split('T')[0] || entry.created_at}
                            </td>
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-sans ${isPayment ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                                {isPayment ? 'ABONO / PAGO' : 'CARGO CRÉDITO'}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-200 font-bold">
                              {entry.invoice_number || entry.reference || '-'}
                            </td>
                            <td className={`p-2.5 text-right font-bold ${isPayment ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isPayment ? '-' : '+'}${entry.amount_usd.toFixed(2)}
                            </td>
                            <td className="p-2.5 text-right text-slate-200 font-bold">
                              ${(entry.balance_after_usd ?? entry.amount_usd).toFixed(2)}
                            </td>
                            <td className="p-2.5 text-slate-400 font-sans text-[11px] truncate max-w-xs">
                              {entry.notes || '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => setShowLedgerModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-slate-400 hover:bg-slate-800 text-xs font-semibold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchasesPage;

import React, { useState, useEffect } from 'react';
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
  Layers
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

  // Pillar 1: Nueva Compra Form State
  const [cartItems, setCartItems] = useState<PurchaseItemDetail[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('branch-1');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [paymentType, setPaymentType] = useState<'cash' | 'credit'>('cash');
  const [creditDays, setCreditDays] = useState<number>(30);
  const [initialPaidUSD, setInitialPaidUSD] = useState<string>('');
  const [purchaseNotes, setPurchaseNotes] = useState('');
  const [productCatalogSearch, setProductCatalogSearch] = useState('');
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<string>('');

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

  const loadAllData = async () => {
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
    if (sups.length > 0) setSelectedSupplierId(sups[0].id);
    if (brs.length > 0) setSelectedBranchId(brs[0].id);
  };

  // Add Item to Cart in Nueva Compra
  const handleAddItemToCart = (prodId: string) => {
    const found = products.find(p => p.id === prodId || p.product_id === prodId);
    if (!found) return;

    const existingIndex = cartItems.findIndex(it => it.product_id === found.id);
    if (existingIndex >= 0) {
      const updated = [...cartItems];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].total_usd = updated[existingIndex].quantity * updated[existingIndex].cost_usd;
      setCartItems(updated);
    } else {
      const unitCost = found.cost_price || 1.0;
      const newItem: PurchaseItemDetail = {
        product_id: found.id,
        product_name: found.name,
        product_sku: found.sku,
        quantity: 1,
        lot_number: `LOT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        cost_usd: unitCost,
        cost_bs: Number((unitCost * exchangeRate).toFixed(2)),
        total_usd: unitCost
      };
      setCartItems([...cartItems, newItem]);
    }
  };

  const handleUpdateCartItemQty = (index: number, newQty: number) => {
    if (newQty <= 0) return;
    const updated = [...cartItems];
    updated[index].quantity = newQty;
    updated[index].total_usd = Number((newQty * updated[index].cost_usd).toFixed(2));
    setCartItems(updated);
  };

  const handleUpdateCartItemCost = (index: number, newCost: number) => {
    if (newCost < 0) return;
    const updated = [...cartItems];
    updated[index].cost_usd = newCost;
    updated[index].cost_bs = Number((newCost * exchangeRate).toFixed(2));
    updated[index].total_usd = Number((updated[index].quantity * newCost).toFixed(2));
    setCartItems(updated);
  };

  const handleRemoveCartItem = (index: number) => {
    setCartItems(cartItems.filter((_, i) => i !== index));
  };

  // Cart financial totals
  const totalCartUSD = cartItems.reduce((acc, it) => acc + it.total_usd, 0);
  const totalCartBs = Number((totalCartUSD * exchangeRate).toFixed(2));

  // Submit Nueva Compra
  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      alert('Debes agregar al menos un producto a la orden de compra.');
      return;
    }

    const sup = suppliers.find(s => s.id === selectedSupplierId);
    const branch = branches.find(b => b.id === selectedBranchId);
    const paidUSDVal = paymentType === 'cash' ? totalCartUSD : (parseFloat(initialPaidUSD) || 0);

    const newPurchase = await api.createPurchase({
      supplier_id: selectedSupplierId,
      supplier_name: sup?.name || 'Proveedor General',
      supplier_rif: sup?.rif || 'J-00000000-0',
      invoice_number: invoiceNumber || `FAC-${Math.floor(10000 + Math.random() * 90000)}`,
      branch_id: selectedBranchId,
      branch_name: branch?.name || 'Sucursal Principal',
      total_amount_usd: totalCartUSD,
      total_amount_bs: totalCartBs,
      exchange_rate: exchangeRate,
      payment_type: paymentType,
      paid_amount_usd: paidUSDVal,
      credit_days: paymentType === 'credit' ? creditDays : 0,
      notes: purchaseNotes,
      items: cartItems
    });

    setPurchases([newPurchase, ...purchases]);
    setCartItems([]);
    setInvoiceNumber('');
    setPurchaseNotes('');
    setInitialPaidUSD('');
    // Actualizar inventario y saldos de proveedores
    const [updatedSups, updatedProds] = await Promise.all([
      api.getSuppliers(),
      api.getInventory()
    ]);
    setSuppliers(updatedSups);
    setProducts(updatedProds);
    setActiveTab('history');
    alert('¡Factura de compra registrada con éxito! El inventario ha sido incrementado y los costos ponderados fueron actualizados.');
  };

  // Pay Pending Debt
  const handlePayDebtSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingPurchase) return;
    const amount = parseFloat(payDebtAmountUSD);
    if (!amount || amount <= 0) return;

    const updated = await api.payPurchaseDebt(payingPurchase.id, amount);
    setPurchases(purchases.map(p => p.id === updated.id ? updated : p));
    setPayingPurchase(null);
    setPayDebtAmountUSD('');
    const updatedSups = await api.getSuppliers();
    setSuppliers(updatedSups);
  };

  // Open Supplier Ledger (CxP)
  const handleOpenSupplierLedger = async (sup: SupplierItem) => {
    setSelectedLedgerSupplier(sup);
    setIsLoadingLedger(true);
    setShowLedgerModal(true);
    try {
      const entries = await api.getSupplierLedger(sup.id);
      setLedgerEntries(entries);
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

    if (editingSupplier) {
      const updated = await api.updateSupplier(editingSupplier.id, data);
      setSuppliers(suppliers.map(s => s.id === updated.id ? updated : s));
    } else {
      const created = await api.createSupplier(data);
      setSuppliers([created, ...suppliers]);
    }
    setShowSupplierModal(false);
  };

  const handleDeleteSupplier = async (id: string) => {
    if (window.confirm('¿Seguro que deseas eliminar este proveedor?')) {
      await api.deleteSupplier(id);
      setSuppliers(suppliers.filter(s => s.id !== id));
    }
  };

  // Historial Filters & KPIs
  const filteredPurchases = purchases.filter(p => {
    const matchesSearch = 
      p.invoice_number.toLowerCase().includes(historySearch.toLowerCase()) ||
      p.supplier_name.toLowerCase().includes(historySearch.toLowerCase()) ||
      p.supplier_rif.toLowerCase().includes(historySearch.toLowerCase());
    
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

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Header with Tab Switcher */}
      <div className="glass-panel p-3.5 sm:p-4 rounded-xl sm:rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 shrink-0" />
            <span>Compras y Proveedores</span>
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-400 hidden xs:block">
            Recepción de pedidos, costo promedio, historial de facturas y gestión de proveedores
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center bg-slate-900 rounded-lg sm:rounded-xl p-1 border border-slate-800 text-xs overflow-x-auto w-full md:w-auto">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg font-semibold transition-all whitespace-nowrap text-xs ${activeTab === 'create' ? 'bg-cyan-500/20 text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Registrar Compra</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg font-semibold transition-all whitespace-nowrap text-xs ${activeTab === 'history' ? 'bg-cyan-500/20 text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Historial ({purchases.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg font-semibold transition-all whitespace-nowrap text-xs ${activeTab === 'suppliers' ? 'bg-cyan-500/20 text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Proveedores ({suppliers.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          TAB 1: REGISTRAR COMPRA (POS-STYLE INTERACTIVE FORM)
      ======================================================== */}
      {activeTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Product Selection & Cart Table */}
          <div className="lg:col-span-2 space-y-4">
            {/* Product Quick-Add Box */}
            <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Search className="w-4 h-4 text-cyan-400" />
                  Buscar y Agregar Productos del Inventario
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Tasa: <strong className="text-cyan-400">{exchangeRate.toFixed(2)} Bs./USD</strong>
                </span>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Escribe el nombre o código de un producto..."
                    value={productCatalogSearch}
                    onChange={e => setProductCatalogSearch(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <select
                  value={selectedProductToAdd}
                  onChange={e => {
                    setSelectedProductToAdd(e.target.value);
                    if (e.target.value) {
                      handleAddItemToCart(e.target.value);
                      setSelectedProductToAdd('');
                    }
                  }}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none max-w-[200px]"
                >
                  <option value="">+ Seleccionar Producto</option>
                  {products
                    .filter(p => !productCatalogSearch || p.name.toLowerCase().includes(productCatalogSearch.toLowerCase()) || p.sku.toLowerCase().includes(productCatalogSearch.toLowerCase()))
                    .map(p => (
                      <option key={p.id} value={p.id}>{p.name} (${p.cost_price.toFixed(2)})</option>
                    ))}
                </select>
              </div>

              {/* Quick Suggestion Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {products.slice(0, 5).map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleAddItemToCart(p.id)}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 transition-all flex items-center gap-1"
                  >
                    <span>+ {p.name}</span>
                    <span className="text-cyan-400 font-mono">(${p.cost_price.toFixed(2)})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Cart Table */}
            <div className="glass-panel p-4 rounded-2xl border border-slate-800 overflow-x-auto">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  Artículos en la Factura de Compra ({cartItems.length})
                </h4>
                {cartItems.length > 0 && (
                  <button
                    onClick={() => setCartItems([])}
                    className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold"
                  >
                    Vaciar Carrito
                  </button>
                )}
              </div>

              {cartItems.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  <ShoppingCart className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                  No has agregado artículos a esta orden de compra todavía. Usa el buscador superior.
                </div>
              ) : (
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 text-[11px] font-semibold text-slate-400 uppercase">
                    <tr>
                      <th className="p-2.5 rounded-l-lg">Producto / Lote</th>
                      <th className="p-2.5 text-center">Cant.</th>
                      <th className="p-2.5">Costo Unit. ($)</th>
                      <th className="p-2.5">Costo Unit. (Bs.)</th>
                      <th className="p-2.5">Subtotal ($)</th>
                      <th className="p-2.5 text-right rounded-r-lg">Quitar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {cartItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/40">
                        <td className="p-2.5">
                          <div className="font-bold text-slate-100">{item.product_name}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-slate-400 font-mono">{item.product_sku}</span>
                            <span className="text-slate-600">•</span>
                            <input
                              type="text"
                              placeholder="Nº Lote"
                              value={item.lot_number || ''}
                              onChange={e => {
                                const updated = [...cartItems];
                                updated[idx].lot_number = e.target.value;
                                setCartItems(updated);
                              }}
                              className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] text-cyan-400 font-mono w-28 focus:border-cyan-500/50"
                              title="Número de Lote de Fabricación"
                            />
                          </div>
                        </td>
                        <td className="p-2.5">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateCartItemQty(idx, item.quantity - 1)}
                              className="w-6 h-6 rounded bg-slate-900 border border-slate-700 flex items-center justify-center font-bold text-slate-300 hover:text-white"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={e => handleUpdateCartItemQty(idx, parseFloat(e.target.value) || 1)}
                              className="w-12 bg-slate-900 border border-slate-800 text-center rounded py-0.5 text-slate-100 font-bold"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateCartItemQty(idx, item.quantity + 1)}
                              className="w-6 h-6 rounded bg-slate-900 border border-slate-700 flex items-center justify-center font-bold text-slate-300 hover:text-white"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            step="0.01"
                            value={item.cost_usd}
                            onChange={e => handleUpdateCartItemCost(idx, parseFloat(e.target.value) || 0)}
                            className="w-20 bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-slate-100 font-mono font-bold"
                          />
                        </td>
                        <td className="p-2.5 font-mono text-slate-400">
                          {item.cost_bs.toFixed(2)} Bs.
                        </td>
                        <td className="p-2.5 font-bold text-emerald-400 font-mono">
                          ${item.total_usd.toFixed(2)}
                        </td>
                        <td className="p-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveCartItem(idx)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Right Column: Invoice Details & Financial Summary */}
          <div className="space-y-4">
            <form onSubmit={handleSubmitPurchase} className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4 text-xs">
              <h4 className="font-bold text-slate-100 text-sm border-b border-slate-800 pb-2">
                Datos de la Factura de Compra
              </h4>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400 font-semibold">Proveedor *</label>
                  <button
                    type="button"
                    onClick={() => handleOpenSupplierModal()}
                    className="text-[11px] text-cyan-400 hover:underline font-medium"
                  >
                    + Nuevo Proveedor
                  </button>
                </div>
                <select
                  required
                  value={selectedSupplierId}
                  onChange={e => setSelectedSupplierId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-200"
                >
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.rif})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nº Factura / Control *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: FAC-99412"
                  value={invoiceNumber}
                  onChange={e => setInvoiceNumber(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Sucursal Destino de Recepción</label>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Condición de Pago</label>
                  <select
                    value={paymentType}
                    onChange={e => setPaymentType(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-200"
                  >
                    <option value="cash">Contado</option>
                    <option value="credit">Crédito</option>
                  </select>
                </div>

                {paymentType === 'credit' ? (
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Días de Crédito</label>
                    <input
                      type="number"
                      value={creditDays}
                      onChange={e => setCreditDays(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Estado</label>
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 font-bold text-center">
                      Pago Total
                    </div>
                  </div>
                )}
              </div>

              {paymentType === 'credit' && (
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Abono Inicial ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Monto pagado al recibir..."
                    value={initialPaidUSD}
                    onChange={e => setInitialPaidUSD(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Notas / Observaciones</label>
                <textarea
                  value={purchaseNotes}
                  onChange={e => setPurchaseNotes(e.target.value)}
                  rows={2}
                  placeholder="Detalles del despacho o recepción..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                />
              </div>

              {/* Totals Summary Card */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Subtotal:</span>
                  <span className="font-mono text-slate-200">${totalCartUSD.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Equivalente en Bolívares:</span>
                  <span className="font-mono text-slate-200">{totalCartBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs.</span>
                </div>
                <div className="border-t border-slate-800 pt-2 flex items-center justify-between font-bold text-sm">
                  <span className="text-slate-100">Total a Procesar:</span>
                  <span className="text-emerald-400 font-mono text-base">${totalCartUSD.toFixed(2)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={cartItems.length === 0}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02]"
              >
                Confirmar y Procesar Compra
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: HISTORIAL DE COMPRAS (DETALLE Y PAGOS)
      ======================================================== */}
      {activeTab === 'history' && (
        <div className="space-y-3 sm:space-y-4">
          {/* Top KPIs Row - Compact Grid on Mobile */}
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
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por Nº factura, proveedor o RIF..."
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-900 rounded-xl p-1 border border-slate-800 text-xs">
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
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 overflow-x-auto">
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
                {filteredPurchases.map(p => (
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
                ))}
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
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
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

          <div className="glass-panel rounded-2xl p-6 border border-slate-800 overflow-x-auto">
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
                {filteredSuppliers.map(s => (
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
                ))}
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

import React, { useState, useEffect } from 'react';
import { 
  Package, 
  ArrowRightLeft, 
  Search, 
  AlertTriangle, 
  Truck, 
  Plus, 
  Edit, 
  Trash2, 
  LayoutGrid, 
  List, 
  FileSpreadsheet, 
  TrendingDown, 
  Layers, 
  DollarSign, 
  X, 
  Boxes, 
  Store, 
  Filter,
  SlidersHorizontal,
  FolderTree,
  Upload,
  Download,
  Check,
  RefreshCw
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '../services/api';
import { ProductInventory, Branch, ComboItem, CategoryItem, StockAdjustmentDTO } from '../types';

export const InventoryPage: React.FC = () => {
  const [items, setItems] = useState<ProductInventory[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [exchangeRate, setExchangeRate] = useState<number>(37.50);
  
  // Views & Filters
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState<'ALL' | 'OPTIMAL' | 'LOW' | 'OUT'>('ALL');

  // Modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductInventory | null>(null);

  // Shrinkage Modal
  const [showShrinkageModal, setShowShrinkageModal] = useState(false);
  const [shrinkageProduct, setShrinkageProduct] = useState<ProductInventory | null>(null);
  const [shrinkageQty, setShrinkageQty] = useState('');
  const [shrinkageReason, setShrinkageReason] = useState<'Dañado/Vencido' | 'Pérdida/Robo' | 'Consumo Interno' | 'Ajuste de Conteo'>('Dañado/Vencido');
  const [shrinkageNote, setShrinkageNote] = useState('');
  
  // Transfer Modal
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferOrigin, setTransferOrigin] = useState('branch-1');
  const [transferDestination, setTransferDestination] = useState('branch-2');
  const [transferProduct, setTransferProduct] = useState('');
  const [transferQty, setTransferQty] = useState('10');
  const [transferNote, setTransferNote] = useState('');

  // Stock Adjustment Modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<ProductInventory | null>(null);
  const [adjustMode, setAdjustMode] = useState<'NEW_QUANTITY' | 'DELTA'>('NEW_QUANTITY');
  const [adjustValue, setAdjustValue] = useState('');
  const [adjustReason, setAdjustReason] = useState<string>('Inventario Físico / Conteo');
  const [adjustNotes, setAdjustNotes] = useState('');

  // Category Creation Modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatParentId, setNewCatParentId] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  // Excel Modal State
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importError, setImportError] = useState<string>('');
  const [importSuccessMsg, setImportSuccessMsg] = useState<string>('');
  const [isImporting, setIsImporting] = useState<boolean>(false);

  // Form State for Product Add / Edit
  const [formSku, setFormSku] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('Víveres');
  const [formCostPrice, setFormCostPrice] = useState('0');
  const [formSalePrice, setFormSalePrice] = useState('0');
  const [formWholesalePrice, setFormWholesalePrice] = useState('0');
  const [formPackageQty, setFormPackageQty] = useState('1');
  const [formProductType, setFormProductType] = useState<'physical' | 'service' | 'virtual'>('physical');
  const [formTaxType, setFormTaxType] = useState<'none' | 'vat' | 'islr'>('none');
  const [formUnitMeasure, setFormUnitMeasure] = useState('UND');
  const [formCurrentStock, setFormCurrentStock] = useState('0');
  const [formMinStockAlert, setFormMinStockAlert] = useState('5');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formComboItems, setFormComboItems] = useState<ComboItem[]>([]);

  useEffect(() => {
    loadData();
    const savedView = localStorage.getItem('xion_inventory_view');
    if (savedView === 'list' || savedView === 'cards') {
      setViewMode(savedView);
    }
  }, []);

  const loadData = async () => {
    const [inv, brs, rateCfg, cats] = await Promise.all([
      api.getInventory(),
      api.getBranches(),
      api.getExchangeRate(),
      api.getCategories()
    ]);
    setItems(inv);
    setBranches(brs);
    setCategories(cats);
    if (rateCfg?.current_exchange_rate_bs) {
      setExchangeRate(rateCfg.current_exchange_rate_bs);
    }
    if (inv.length > 0) {
      setTransferProduct(inv[0].id);
    }
  };

  const toggleViewMode = (mode: 'list' | 'cards') => {
    setViewMode(mode);
    localStorage.setItem('xion_inventory_view', mode);
  };

  // Open Product Modal (New or Edit)
  const handleOpenProductModal = (prod?: ProductInventory) => {
    if (prod) {
      setEditingProduct(prod);
      setFormSku(prod.sku);
      setFormBarcode(prod.barcode);
      setFormName(prod.name);
      setFormDescription(prod.description || '');
      setFormCategory(prod.category || 'General');
      setFormCostPrice(prod.cost_price.toString());
      setFormSalePrice(prod.sale_price.toString());
      setFormWholesalePrice((prod.wholesale_price || 0).toString());
      setFormPackageQty((prod.package_quantity || 1).toString());
      setFormProductType(prod.product_type || 'physical');
      setFormTaxType(prod.tax_type || 'none');
      setFormUnitMeasure(prod.unit_measure || 'UND');
      setFormCurrentStock(prod.current_stock.toString());
      setFormMinStockAlert(prod.min_stock_alert.toString());
      setFormImageUrl(prod.image_url || '');
      setFormComboItems(prod.combo_items || []);
    } else {
      setEditingProduct(null);
      setFormSku(`SKU-${Date.now().toString().slice(-6)}`);
      setFormBarcode(`759${Math.floor(1000000000 + Math.random() * 9000000000)}`);
      setFormName('');
      setFormDescription('');
      setFormCategory(categories[0]?.full_path || categories[0]?.name || 'Víveres');
      setFormCostPrice('0');
      setFormSalePrice('0');
      setFormWholesalePrice('0');
      setFormPackageQty('1');
      setFormProductType('physical');
      setFormTaxType('none');
      setFormUnitMeasure('UND');
      setFormCurrentStock('0');
      setFormMinStockAlert('5');
      setFormImageUrl('');
      setFormComboItems([]);
    }
    setShowProductModal(true);
  };

  // Save Product (Create or Update)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    let computedCost = parseFloat(formCostPrice) || 0;
    if (formProductType === 'virtual' && formComboItems.length > 0) {
      computedCost = formComboItems.reduce((acc, c) => {
        const child = items.find(it => it.id === c.product_id || it.product_id === c.product_id);
        return acc + ((child?.cost_price || 0) * (c.quantity || 1));
      }, 0);
    }

    const payload: Partial<ProductInventory> = {
      sku: formSku.trim(),
      barcode: formBarcode.trim(),
      name: formName.trim(),
      description: formDescription.trim(),
      category: formCategory,
      cost_price: computedCost,
      sale_price: parseFloat(formSalePrice) || 0,
      wholesale_price: parseFloat(formWholesalePrice) || 0,
      package_quantity: parseInt(formPackageQty) || 1,
      product_type: formProductType,
      tax_type: formTaxType,
      unit_measure: formUnitMeasure.trim() || 'UND',
      current_stock: parseFloat(formCurrentStock) || 0,
      min_stock_alert: parseFloat(formMinStockAlert) || 5,
      image_url: formImageUrl.trim(),
      combo_items: formProductType === 'virtual' ? formComboItems : [],
      branch_id: selectedBranch !== 'all' ? selectedBranch : 'branch-1'
    };

    if (editingProduct) {
      const updated = await api.updateProduct(editingProduct.id, payload);
      setItems(items.map(p => p.id === editingProduct.id ? updated : p));
    } else {
      const created = await api.createProduct(payload);
      setItems([created, ...items]);
    }

    setShowProductModal(false);
  };

  // Delete Product
  const handleDeleteProduct = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este producto del catálogo maestro?')) {
      await api.deleteProduct(id);
      setItems(items.filter(p => p.id !== id && p.product_id !== id));
    }
  };

  // Shrinkage Submit
  const handleSaveShrinkage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shrinkageProduct) return;
    const qty = parseFloat(shrinkageQty);
    if (!qty || qty <= 0) return;

    await api.registerShrinkage({
      product_id: shrinkageProduct.id,
      product_name: shrinkageProduct.name,
      branch_id: selectedBranch !== 'all' ? selectedBranch : 'branch-1',
      quantity: qty,
      reason: shrinkageReason,
      justification: shrinkageNote
    });

    setItems(items.map(p => {
      if (p.id === shrinkageProduct.id) {
        return { ...p, current_stock: Math.max(0, p.current_stock - qty) };
      }
      return p;
    }));

    setShowShrinkageModal(false);
    setShrinkageQty('');
    setShrinkageNote('');
  };

  // Transfer Submit
  const handleSaveTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(transferQty);
    if (!qty || qty <= 0 || !transferProduct) return;

    await api.createTransfer({
      origin_branch_id: transferOrigin,
      destination_branch_id: transferDestination,
      product_id: transferProduct,
      quantity: qty,
      notes: transferNote
    });

    setItems(items.map(p => {
      if (p.id === transferProduct) {
        return { ...p, current_stock: Math.max(0, p.current_stock - qty) };
      }
      return p;
    }));

    setShowTransferModal(false);
    setTransferNote('');
  };

  // Open Direct Stock Adjustment Modal
  const handleOpenAdjustModal = (product?: ProductInventory) => {
    const target = product || items[0] || null;
    setAdjustingProduct(target);
    setAdjustValue(target ? target.current_stock.toString() : '0');
    setAdjustMode('NEW_QUANTITY');
    setAdjustReason('Inventario Físico / Conteo');
    setAdjustNotes('');
    setShowAdjustModal(true);
  };

  // Submit Stock Adjustment
  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;
    const val = parseFloat(adjustValue);
    if (isNaN(val)) return;

    const dto: StockAdjustmentDTO = {
      product_id: adjustingProduct.id,
      branch_id: adjustingProduct.branch_id,
      reason: adjustReason,
      justification: adjustNotes,
      notes: adjustNotes
    };

    if (adjustMode === 'NEW_QUANTITY') {
      dto.new_stock = Math.max(0, val);
      dto.new_quantity = Math.max(0, val);
    } else {
      dto.quantity_change = val;
      dto.new_stock = Math.max(0, adjustingProduct.current_stock + val);
      dto.new_quantity = Math.max(0, adjustingProduct.current_stock + val);
    }

    await api.adjustStock(dto);
    await loadData();
    setShowAdjustModal(false);
    setAdjustingProduct(null);
  };

  // Category Creation Submit
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const created = await api.createCategory({
      name: newCatName.trim(),
      parent_id: newCatParentId || undefined,
      description: newCatDesc.trim()
    });
    setCategories(prev => [...prev, created]);
    setFormCategory(created.full_path || created.name);
    setShowCategoryModal(false);
    setNewCatName('');
    setNewCatParentId('');
    setNewCatDesc('');
  };

  // Excel Export
  const handleExportExcel = () => {
    const rows = items.map(p => ({
      'SKU': p.sku,
      'Código de Barras': p.barcode,
      'Nombre del Producto': p.name,
      'Descripción': p.description || '',
      'Categoría': p.category || 'General',
      'Tipo': p.product_type || 'physical',
      'Unidad Medida': p.unit_measure || 'UND',
      'Costo USD': p.cost_price,
      'Precio Venta USD': p.sale_price,
      'Precio Mayorista USD': p.wholesale_price || 0,
      'Cantidad por Bulto': p.package_quantity || 1,
      'Alerta Stock Mínimo': p.min_stock_alert,
      'Stock Actual': p.current_stock,
      'Sucursal': p.branch_name || 'Principal'
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
    XLSX.writeFile(wb, `Inventario_Xion_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Excel Download Template
  const handleDownloadTemplate = () => {
    const templateRows = [
      {
        'SKU': 'HAR-PAN-01',
        'Código de Barras': '7591001001001',
        'Nombre del Producto': 'Harina de Maíz Blanca 1kg',
        'Descripción': 'Harina precocida para arepas tradicionales',
        'Categoría': 'Víveres > Harinas y Granos',
        'Tipo': 'physical',
        'Unidad Medida': 'UND',
        'Costo USD': 0.95,
        'Precio Venta USD': 1.30,
        'Precio Mayorista USD': 1.15,
        'Cantidad por Bulto': 20,
        'Alerta Stock Mínimo': 15,
        'Stock Actual': 100
      },
      {
        'SKU': 'ACE-MAIZ-02',
        'Código de Barras': '7592002002002',
        'Nombre del Producto': 'Aceite de Maíz 1L',
        'Descripción': 'Aceite vegetal refinado comestible',
        'Categoría': 'Víveres > Aceites y Grasas',
        'Tipo': 'physical',
        'Unidad Medida': 'UND',
        'Costo USD': 2.10,
        'Precio Venta USD': 2.90,
        'Precio Mayorista USD': 2.65,
        'Cantidad por Bulto': 12,
        'Alerta Stock Mínimo': 10,
        'Stock Actual': 50
      }
    ];
    const ws = XLSX.utils.json_to_sheet(templateRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Carga');
    XLSX.writeFile(wb, 'Plantilla_Carga_Inventario_Xion.xlsx');
  };

  // Excel File Upload & Parser
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError('');
    setImportSuccessMsg('');
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        if (!data || data.length === 0) {
          setImportError('El archivo no contiene filas válidas de productos.');
          return;
        }
        setImportPreview(data);
      } catch (err: any) {
        setImportError('No se pudo procesar el archivo Excel: ' + (err.message || 'error desconocido'));
      }
    };
    reader.readAsBinaryString(file);
  };

  // Confirm Excel Import
  const handleConfirmImport = async () => {
    if (importPreview.length === 0) return;
    setIsImporting(true);
    setImportError('');
    try {
      let count = 0;
      for (const row of importPreview) {
        const sku = String(row['SKU'] || row['sku'] || `SKU-${Date.now()}-${count}`);
        const barcode = String(row['Código de Barras'] || row['Codigo de Barras'] || row['barcode'] || '');
        const name = String(row['Nombre del Producto'] || row['Nombre'] || row['name'] || 'Producto Importado');
        const cost = Number(row['Costo USD'] || row['Costo'] || row['cost_price'] || 0);
        const price = Number(row['Precio Venta USD'] || row['Precio'] || row['sale_price'] || 0);
        const wholesale = Number(row['Precio Mayorista USD'] || row['wholesale_price'] || 0);
        const pkgQty = Number(row['Cantidad por Bulto'] || row['package_quantity'] || 1);
        const stock = Number(row['Stock Actual'] || row['Stock'] || row['current_stock'] || 0);
        const minStock = Number(row['Alerta Stock Mínimo'] || row['min_stock_alert'] || 5);
        const category = String(row['Categoría'] || row['Categoria'] || row['category'] || 'Víveres');
        const unit = String(row['Unidad Medida'] || row['unit_measure'] || 'UND');

        await api.createProduct({
          sku,
          barcode,
          name,
          cost_price: cost,
          sale_price: price,
          wholesale_price: wholesale,
          package_quantity: pkgQty,
          current_stock: stock,
          min_stock_alert: minStock,
          category,
          unit_measure: unit,
          product_type: 'physical',
          tax_type: 'none',
          branch_id: selectedBranch === 'all' ? 'branch-1' : selectedBranch
        });
        count++;
      }
      await loadData();
      setImportSuccessMsg(`¡Se importaron ${count} productos exitosamente!`);
      setImportPreview([]);
      setTimeout(() => {
        setShowExcelModal(false);
        setImportSuccessMsg('');
      }, 1500);
    } catch (err: any) {
      setImportError('Error guardando productos: ' + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  // Filter calculations
  const categoriesList = ['ALL', ...Array.from(new Set([
    ...categories.map(c => c.full_path || c.name),
    ...items.map(i => i.category || 'General')
  ]))];

  const filteredItems = items.filter(i => {
    const matchesSearch = 
      i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      i.barcode.includes(searchTerm) || 
      i.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (i.category || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'ALL' || (i.category || 'General') === categoryFilter;
    const matchesBranch = selectedBranch === 'all' || !i.branch_id || i.branch_id === selectedBranch;

    let matchesStatus = true;
    if (stockStatusFilter === 'OPTIMAL') matchesStatus = i.current_stock > i.min_stock_alert;
    if (stockStatusFilter === 'LOW') matchesStatus = i.current_stock > 0 && i.current_stock <= i.min_stock_alert;
    if (stockStatusFilter === 'OUT') matchesStatus = i.current_stock <= 0;

    return matchesSearch && matchesCategory && matchesBranch && matchesStatus;
  });

  // KPI calculations
  const totalProductsCount = items.length;
  const lowStockCount = items.filter(i => i.current_stock > 0 && i.current_stock <= i.min_stock_alert).length;
  const outOfStockCount = items.filter(i => i.current_stock <= 0).length;
  const totalInventoryValueUSD = items.reduce((sum, i) => sum + (i.cost_price * i.current_stock), 0);

  // Profit Margin calculations for form
  const parsedCost = parseFloat(formCostPrice) || 0;
  const parsedPrice = parseFloat(formSalePrice) || 0;
  const marginPct = parsedPrice > 0 ? (((parsedPrice - parsedCost) / parsedPrice) * 100).toFixed(1) : '0';
  const grossProfit = parsedPrice > parsedCost ? (parsedPrice - parsedCost).toFixed(2) : '0.00';

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 glass-panel p-3.5 sm:p-4 rounded-xl sm:rounded-2xl">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
            <Package className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 shrink-0" />
            <span>Inventario y Existencias</span>
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-400 hidden xs:block">
            Catálogo maestro, recetas para combos virtuales, mermas, ajustes de inventario y traslados
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button 
            onClick={() => setShowExcelModal(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl bg-slate-900 border border-slate-700/60 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-all"
            title="Importar y Exportar Catálogo Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Excel</span>
          </button>

          <button 
            onClick={() => handleOpenAdjustModal()}
            className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl bg-slate-900 border border-slate-700/60 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-all"
            title="Ajuste Directo de Stock"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
            <span>Ajustar</span>
          </button>

          <button 
            onClick={() => setShowCategoryModal(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl bg-slate-900 border border-slate-700/60 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-all"
            title="Gestionar Categorías Jerárquicas"
          >
            <FolderTree className="w-3.5 h-3.5 text-indigo-400" />
            <span>Categorías</span>
          </button>

          <button 
            onClick={() => setShowTransferModal(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl bg-slate-900 border border-slate-700/60 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-all"
            title="Traslado entre Sucursales"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-blue-400" />
            <span>Traslado</span>
          </button>

          <button 
            onClick={() => handleOpenProductModal()}
            className="flex items-center gap-1 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-md shadow-cyan-500/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Nuevo Producto</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="glass-panel p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-800 flex items-center gap-2.5 sm:gap-3">
          <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
            <Boxes className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">Total Artículos</div>
            <div className="text-base sm:text-xl font-bold text-slate-100 truncate">{totalProductsCount}</div>
          </div>
        </div>

        <div className="glass-panel p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-800 flex items-center gap-2.5 sm:gap-3">
          <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">Stock Mínimo</div>
            <div className="text-base sm:text-xl font-bold text-amber-400 truncate">{lowStockCount}</div>
          </div>
        </div>

        <div className="glass-panel p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-800 flex items-center gap-2.5 sm:gap-3">
          <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
            <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">Agotados</div>
            <div className="text-base sm:text-xl font-bold text-rose-400 truncate">{outOfStockCount}</div>
          </div>
        </div>

        <div className="glass-panel p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-800 flex items-center gap-2.5 sm:gap-3">
          <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">Valorización</div>
            <div className="text-base sm:text-xl font-bold text-emerald-400 font-mono truncate">
              ${totalInventoryValueUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="glass-panel p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex-1 flex flex-col sm:flex-row gap-2 sm:gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por Nombre, SKU, Código de Barras o Categoría..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <select 
              value={categoryFilter} 
              onChange={e => setCategoryFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500/50"
            >
              {categoriesList.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'ALL' ? 'Todas las Categorías' : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Branch Filter */}
          <div className="flex items-center gap-2">
            <select 
              value={selectedBranch} 
              onChange={e => setSelectedBranch(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500/50"
            >
              <option value="all">Todas las Sedes</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* View Mode Switcher & Status Filter */}
        <div className="flex items-center justify-between sm:justify-end gap-2 border-t md:border-t-0 pt-2 md:pt-0 border-slate-800">
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button 
              onClick={() => setStockStatusFilter('ALL')} 
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${stockStatusFilter === 'ALL' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400'}`}
            >
              Todos
            </button>
            <button 
              onClick={() => setStockStatusFilter('OPTIMAL')} 
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${stockStatusFilter === 'OPTIMAL' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400'}`}
            >
              Óptimos
            </button>
            <button 
              onClick={() => setStockStatusFilter('LOW')} 
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${stockStatusFilter === 'LOW' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400'}`}
            >
              Bajos
            </button>
            <button 
              onClick={() => setStockStatusFilter('OUT')} 
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${stockStatusFilter === 'OUT' ? 'bg-rose-500/20 text-rose-400' : 'text-slate-400'}`}
            >
              Agotados
            </button>
          </div>

          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button 
              onClick={() => toggleViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400'}`}
              title="Vista de Lista"
            >
              <List className="w-4 h-4" />
            </button>
            <button 
              onClick={() => toggleViewMode('cards')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'cards' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400'}`}
              title="Vista de Tarjetas / Cuadrícula"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Table or Cards */}
      {viewMode === 'list' ? (
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 uppercase tracking-wider text-[11px] text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3.5">SKU / Código</th>
                <th className="p-3.5">Producto</th>
                <th className="p-3.5">Categoría</th>
                <th className="p-3.5">Costo</th>
                <th className="p-3.5">Precio Detal</th>
                <th className="p-3.5">Margen</th>
                <th className="p-3.5">Stock</th>
                <th className="p-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredItems.map((item) => {
                const margin = item.sale_price > 0 
                  ? (((item.sale_price - item.cost_price) / item.sale_price) * 100).toFixed(0) 
                  : '0';
                const isOutOfStock = item.current_stock <= 0;
                const isLowStock = !isOutOfStock && item.current_stock <= item.min_stock_alert;

                return (
                  <tr key={item.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-3.5 font-mono">
                      <div className="text-cyan-400 font-bold">{item.sku}</div>
                      <div className="text-[10px] text-slate-500">{item.barcode}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-9 h-9 rounded-lg object-cover border border-slate-800 shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 text-slate-500">
                            <Package className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-100 flex items-center gap-1.5">
                            {item.name}
                            {item.product_type === 'virtual' && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                COMBO
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-xs">{item.description || 'Sin descripción'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-semibold bg-slate-900 text-slate-300 border border-slate-800">
                        {item.category || 'General'}
                      </span>
                    </td>
                    <td className="p-3.5 text-xs text-slate-400 font-mono">${item.cost_price.toFixed(2)}</td>
                    <td className="p-3.5 font-semibold text-slate-100">
                      <div className="font-mono">${item.sale_price.toFixed(2)}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{(item.sale_price * exchangeRate).toFixed(2)} Bs.</div>
                    </td>
                    <td className="p-3.5 text-xs font-semibold text-cyan-400">
                      {margin}%
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-100 font-mono">{item.current_stock} {item.unit_measure || 'UND'}</span>
                        {isOutOfStock ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            Agotado
                          </span>
                        ) : isLowStock ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            Bajo
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            Óptimo
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenAdjustModal(item)}
                          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-blue-500/50 text-slate-400 hover:text-blue-400 transition-all"
                          title="Ajuste de Stock con Justificación"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setShrinkageProduct(item);
                            setShowShrinkageModal(true);
                          }}
                          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-amber-500/50 text-slate-400 hover:text-amber-400 transition-all"
                          title="Registrar Merma"
                        >
                          <TrendingDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenProductModal(item)}
                          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-slate-400 hover:text-cyan-400 transition-all"
                          title="Editar Producto"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(item.id)}
                          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-rose-500/50 text-slate-400 hover:text-rose-400 transition-all"
                          title="Eliminar Producto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Cards Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map((item) => {
            const isOutOfStock = item.current_stock <= 0;
            const isLowStock = !isOutOfStock && item.current_stock <= item.min_stock_alert;

            return (
              <div key={item.id} className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col justify-between hover:border-cyan-500/30 transition-all">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="font-mono text-[10px] text-cyan-400 font-bold px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20">
                      {item.sku}
                    </span>
                    <span className="text-[10px] text-slate-400 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800">
                      {item.category || 'General'}
                    </span>
                  </div>

                  {item.image_url ? (
                    <div className="h-32 w-full rounded-xl overflow-hidden mb-3 bg-slate-900">
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-24 w-full rounded-xl mb-3 bg-slate-900/60 border border-slate-800/80 flex items-center justify-center text-slate-600">
                      <Package className="w-8 h-8 opacity-40" />
                    </div>
                  )}

                  <h4 className="font-bold text-slate-100 text-sm mb-1">{item.name}</h4>
                  <p className="text-[11px] text-slate-400 line-clamp-2 mb-3">{item.description || 'Sin descripción'}</p>

                  <div className="grid grid-cols-2 gap-2 text-xs mb-3 p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-500">Costo USD:</span>
                      <div className="font-mono text-slate-300 font-semibold">${item.cost_price.toFixed(2)}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500">Precio Detal:</span>
                      <div className="font-mono text-emerald-400 font-bold">${item.sale_price.toFixed(2)}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-3 border-t border-slate-800/80 pt-2">
                    <span className="text-slate-400">Stock Actual:</span>
                    <div className="flex items-center gap-1.5 font-bold">
                      <span className="font-mono text-slate-100">{item.current_stock} {item.unit_measure || 'UND'}</span>
                      {isOutOfStock ? (
                        <span className="w-2 h-2 rounded-full bg-rose-500" title="Agotado"></span>
                      ) : isLowStock ? (
                        <span className="w-2 h-2 rounded-full bg-amber-500" title="Stock Bajo"></span>
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-emerald-500" title="Óptimo"></span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenAdjustModal(item)}
                      className="flex-1 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-blue-500/50 text-slate-300 text-xs font-semibold transition-all flex items-center justify-center gap-1"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
                      <span>Ajuste</span>
                    </button>
                    <button
                      onClick={() => handleOpenProductModal(item)}
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-400 transition-all"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(item.id)}
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-rose-500/50 text-slate-300 hover:text-rose-400 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Product Add / Edit Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel w-full max-w-2xl p-6 rounded-2xl border border-slate-800 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Package className="w-5 h-5 text-cyan-400" />
                {editingProduct ? 'Editar Producto' : 'Registrar Nuevo Producto'}
              </h4>
              <button onClick={() => setShowProductModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              {/* Identificación */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">SKU *</label>
                  <input 
                    type="text" 
                    required 
                    value={formSku} 
                    onChange={e => setFormSku(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Código de Barras</label>
                  <input 
                    type="text" 
                    value={formBarcode} 
                    onChange={e => setFormBarcode(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-400 font-semibold">Categoría</label>
                    <button 
                      type="button" 
                      onClick={() => setShowCategoryModal(true)} 
                      className="text-[10px] text-cyan-400 hover:underline"
                    >
                      + Nueva
                    </button>
                  </div>
                  <select 
                    value={formCategory} 
                    onChange={e => setFormCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.full_path || c.name}>
                        {c.full_path || c.name}
                      </option>
                    ))}
                    {categories.length === 0 && (
                      <option value="Víveres">Víveres</option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nombre del Producto *</label>
                <input 
                  type="text" 
                  required 
                  value={formName} 
                  onChange={e => setFormName(e.target.value)}
                  placeholder="Ej: Harina Pan 1kg"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Descripción</label>
                <textarea 
                  value={formDescription} 
                  onChange={e => setFormDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                />
              </div>

              {/* Precios y Costos */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="font-bold text-slate-200 text-xs flex items-center justify-between">
                  <span>Precios, Costo y Margen</span>
                  <span className="text-cyan-400 font-mono">Margen: {marginPct}% | Ganancia: ${grossProfit}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Costo ($ USD) *</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      required 
                      value={formCostPrice} 
                      onChange={e => setFormCostPrice(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Precio Detal ($ USD) *</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      required 
                      value={formSalePrice} 
                      onChange={e => setFormSalePrice(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-emerald-400 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Precio Mayor ($ USD)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={formWholesalePrice} 
                      onChange={e => setFormWholesalePrice(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Stock y Configuración Operativa */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Stock Actual</label>
                  <input 
                    type="number" 
                    value={formCurrentStock} 
                    onChange={e => setFormCurrentStock(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Alerta Mínimo</label>
                  <input 
                    type="number" 
                    value={formMinStockAlert} 
                    onChange={e => setFormMinStockAlert(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Tipo Producto</label>
                  <select 
                    value={formProductType} 
                    onChange={e => setFormProductType(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                  >
                    <option value="physical">Físico</option>
                    <option value="service">Servicio</option>
                    <option value="virtual">Virtual / Combo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Unidad Medida</label>
                  <input 
                    type="text" 
                    value={formUnitMeasure} 
                    onChange={e => setFormUnitMeasure(e.target.value)}
                    placeholder="UND"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                  />
                </div>
              </div>

              {/* Recipe / Combo Builder if product is virtual */}
              {formProductType === 'virtual' && (
                <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-2">
                  <div className="font-bold text-purple-300 text-xs flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      Configuración de Receta / Combo
                    </span>
                    <span className="text-[11px] font-mono text-purple-200">
                      Costo Dinámico: ${formComboItems.reduce((acc, c) => {
                        const child = items.find(it => it.id === c.product_id || it.product_id === c.product_id);
                        return acc + ((child?.cost_price || 0) * (c.quantity || 1));
                      }, 0).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-[11px] text-purple-200/70">
                    Selecciona los productos componentes. El costo del combo se recalcula automáticamente a partir del costo de los ingredientes.
                  </p>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pt-1">
                    {items.filter(it => it.product_type !== 'virtual').map(subItem => {
                      const existing = formComboItems.find(c => c.product_id === subItem.id || c.product_id === subItem.product_id);
                      const isSelected = !!existing;
                      return (
                        <div key={subItem.id} className="flex items-center justify-between bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                          <div>
                            <span className="text-slate-200 font-medium">{subItem.name}</span>
                            <span className="text-[10px] text-slate-400 ml-2 font-mono">(${subItem.cost_price.toFixed(2)})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {isSelected && (
                              <input 
                                type="number" 
                                min="1" 
                                value={existing.quantity} 
                                onChange={e => {
                                  const q = parseInt(e.target.value) || 1;
                                  setFormComboItems(formComboItems.map(c => c.product_id === subItem.id ? { ...c, quantity: q } : c));
                                }}
                                className="w-16 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-center text-xs font-bold text-slate-100"
                              />
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setFormComboItems(formComboItems.filter(c => c.product_id !== subItem.id));
                                } else {
                                  setFormComboItems([...formComboItems, { product_id: subItem.id, product_name: subItem.name, quantity: 1 }]);
                                }
                              }}
                              className={`px-2.5 py-1 rounded text-[11px] font-bold ${isSelected ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}
                            >
                              {isSelected ? 'Incluido' : '+ Incluir'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-400 font-semibold mb-1">URL Imagen del Producto</label>
                <input 
                  type="text" 
                  value={formImageUrl} 
                  onChange={e => setFormImageUrl(e.target.value)}
                  placeholder="https://ejemplo.com/imagen.jpg"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-slate-400 hover:bg-slate-800 font-semibold"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold shadow-md shadow-cyan-500/20"
                >
                  {editingProduct ? 'Guardar Cambios' : 'Registrar Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Shrinkage / Merma */}
      {showShrinkageModal && shrinkageProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-amber-400" />
                Registrar Merma / Pérdida
              </h4>
              <button onClick={() => setShowShrinkageModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveShrinkage} className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-slate-400 text-[11px]">Producto seleccionado:</div>
                <div className="font-bold text-slate-100 text-sm">{shrinkageProduct.name}</div>
                <div className="text-[11px] text-cyan-400 mt-1">Stock actual: {shrinkageProduct.current_stock} {shrinkageProduct.unit_measure || 'UND'}</div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Cantidad a Descontar *</label>
                <input 
                  type="number" 
                  step="0.01" 
                  required 
                  value={shrinkageQty} 
                  onChange={e => setShrinkageQty(e.target.value)} 
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-bold" 
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Causa de Merma</label>
                <select 
                  value={shrinkageReason} 
                  onChange={e => setShrinkageReason(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-200"
                >
                  <option value="Dañado/Vencido">Dañado / Vencido</option>
                  <option value="Pérdida/Robo">Pérdida / Extravío / Robo</option>
                  <option value="Consumo Interno">Consumo Interno / Merma Operativa</option>
                  <option value="Ajuste de Conteo">Ajuste de Conteo Físico</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Justificación Detallada</label>
                <textarea 
                  value={shrinkageNote} 
                  onChange={e => setShrinkageNote(e.target.value)}
                  placeholder="Explique el motivo del descarte..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-200"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowShrinkageModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-slate-400 hover:bg-slate-800 font-semibold"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-500/20"
                >
                  Confirmar Descuento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Stock Transfer between Branches */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-blue-400" />
                Traslado de Mercancía Entre Sucursales
              </h4>
              <button onClick={() => setShowTransferModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTransfer} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Sucursal Origen</label>
                  <select 
                    value={transferOrigin}
                    onChange={e => setTransferOrigin(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-200"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Sucursal Destino</label>
                  <select 
                    value={transferDestination}
                    onChange={e => setTransferDestination(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-200"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Producto a Transferir</label>
                <select 
                  value={transferProduct}
                  onChange={e => setTransferProduct(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-200"
                >
                  {items.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stock: {p.current_stock})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Cantidad a Despachar</label>
                <input 
                  type="number" 
                  value={transferQty} 
                  onChange={e => setTransferQty(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-200 font-bold" 
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Nota de Despacho</label>
                <textarea 
                  value={transferNote} 
                  onChange={e => setTransferNote(e.target.value)}
                  placeholder="Número de guía o conductor responsable..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-200"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-slate-400 text-xs font-semibold hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 rounded-xl bg-cyan-500 text-white text-xs font-semibold hover:bg-cyan-400 shadow-md shadow-cyan-500/20"
                >
                  Confirmar y Despachar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Direct Stock Adjustment with Audit */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-amber-400" />
                Ajuste Directo de Stock
              </h4>
              <button onClick={() => setShowAdjustModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Producto a Ajustar</label>
                <select 
                  value={adjustingProduct?.id || ''} 
                  onChange={e => {
                    const found = items.find(p => p.id === e.target.value);
                    setAdjustingProduct(found || null);
                    if (found && adjustMode === 'NEW_QUANTITY') {
                      setAdjustValue(found.current_stock.toString());
                    }
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                >
                  {items.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stock Actual: {p.current_stock})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setAdjustMode('NEW_QUANTITY');
                    if (adjustingProduct) setAdjustValue(adjustingProduct.current_stock.toString());
                  }}
                  className={`py-1.5 rounded-lg font-bold text-center transition-all ${adjustMode === 'NEW_QUANTITY' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400'}`}
                >
                  Fijar Conteo Real
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdjustMode('DELTA');
                    setAdjustValue('0');
                  }}
                  className={`py-1.5 rounded-lg font-bold text-center transition-all ${adjustMode === 'DELTA' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400'}`}
                >
                  Modificación (+ / -)
                </button>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  {adjustMode === 'NEW_QUANTITY' ? 'Nueva Cantidad Total Física *' : 'Cantidad a Sumar o Restar (+/-) *'}
                </label>
                <input 
                  type="number" 
                  step="0.01"
                  required 
                  value={adjustValue}
                  onChange={e => setAdjustValue(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-emerald-400 font-mono font-bold text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Motivo del Ajuste</label>
                <select 
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                >
                  <option value="Inventario Físico / Conteo">Inventario Físico / Conteo General</option>
                  <option value="Pérdida / Rotura">Pérdida / Rotura en Depósito</option>
                  <option value="Consumo Interno / Uso Propio">Consumo Interno / Uso Propio</option>
                  <option value="Avería / Merma">Avería / Merma de Transporte</option>
                  <option value="Corrección de Entrada">Corrección de Entrada por Compra</option>
                  <option value="Donación">Donación o Promoción</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Justificación / Observaciones</label>
                <textarea 
                  rows={2}
                  value={adjustNotes}
                  onChange={e => setAdjustNotes(e.target.value)}
                  placeholder="Detalles sobre el conteo o auditoría..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-slate-400 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-500/20"
                >
                  Guardar Ajuste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Category Creation Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-indigo-400" />
                Registrar Nueva Categoría
              </h4>
              <button onClick={() => setShowCategoryModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nombre de la Categoría *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Ej: Harinas y Granos"
                  value={newCatName} 
                  onChange={e => setNewCatName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Categoría Padre (Jerarquía Opcional)</label>
                <select 
                  value={newCatParentId} 
                  onChange={e => setNewCatParentId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                >
                  <option value="">Ninguna (Nivel Principal Raíz)</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.full_path || c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Descripción</label>
                <textarea 
                  rows={2}
                  value={newCatDesc} 
                  onChange={e => setNewCatDesc(e.target.value)}
                  placeholder="Descripción de los artículos de esta categoría..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-slate-400 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md shadow-indigo-500/20"
                >
                  Guardar Categoría
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: Excel Import / Export Flow */}
      {showExcelModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-2xl p-6 rounded-2xl border border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                Carga Masiva e Importación desde Excel
              </h4>
              <button onClick={() => setShowExcelModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-slate-300">
                Puedes exportar todo el catálogo actual de inventario o cargar un archivo con nuevos artículos usando nuestra plantilla homologada compatible con Xion-POS.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="font-bold text-slate-200 flex items-center gap-2">
                      <Download className="w-4 h-4 text-emerald-400" />
                      1. Plantilla Oficial
                    </div>
                    <p className="text-slate-400 text-[11px] mt-1">
                      Formato XLSX con columnas requeridas (SKU, Código de Barras, Nombre, Costo, Precio, Categoría, Stock).
                    </p>
                  </div>
                  <button 
                    onClick={handleDownloadTemplate}
                    className="w-full py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar Plantilla XLSX</span>
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="font-bold text-slate-200 flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                      2. Exportar Catálogo Actual
                    </div>
                    <p className="text-slate-400 text-[11px] mt-1">
                      Genera un archivo XLSX con todos los artículos activos y sus existencias actuales.
                    </p>
                  </div>
                  <button 
                    onClick={handleExportExcel}
                    className="w-full py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-semibold hover:bg-cyan-500/20 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exportar Inventario ({items.length} items)</span>
                  </button>
                </div>
              </div>

              {/* Upload Box */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="font-bold text-slate-200 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-cyan-400" />
                  3. Cargar Archivo XLSX o CSV
                </div>

                <label className="border-2 border-dashed border-slate-800 hover:border-cyan-500/50 rounded-xl p-5 text-center text-slate-400 transition-colors block cursor-pointer">
                  <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-cyan-400 opacity-80" />
                  <div className="font-medium text-slate-200">Haz clic aquí para seleccionar tu archivo Excel</div>
                  <div className="text-[10px] text-slate-500 mt-1">Formatos admitidos: .xlsx, .xls, .csv</div>
                  <input 
                    type="file" 
                    accept=".xlsx, .xls, .csv" 
                    onChange={handleFileUpload} 
                    className="hidden" 
                  />
                </label>

                {importError && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                    {importError}
                  </div>
                )}

                {importSuccessMsg && (
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-1.5 font-bold">
                    <Check className="w-4 h-4" />
                    {importSuccessMsg}
                  </div>
                )}

                {/* Import Preview Table */}
                {importPreview.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                      <span>Vista Previa: {importPreview.length} filas detectadas</span>
                      <span className="text-emerald-400">Listo para procesar</span>
                    </div>
                    <div className="max-h-36 overflow-y-auto rounded-lg border border-slate-800">
                      <table className="w-full text-left text-[11px] text-slate-300">
                        <thead className="bg-slate-950 text-slate-500 sticky top-0">
                          <tr>
                            <th className="p-2">SKU</th>
                            <th className="p-2">Nombre</th>
                            <th className="p-2">Costo</th>
                            <th className="p-2">Precio</th>
                            <th className="p-2">Stock</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {importPreview.slice(0, 5).map((r, i) => (
                            <tr key={i} className="hover:bg-slate-800/40">
                              <td className="p-2 font-mono text-cyan-400">{r['SKU'] || r['sku'] || '-'}</td>
                              <td className="p-2 font-medium">{r['Nombre del Producto'] || r['Nombre'] || r['name'] || '-'}</td>
                              <td className="p-2 font-mono">${Number(r['Costo USD'] || r['Costo'] || r['cost_price'] || 0).toFixed(2)}</td>
                              <td className="p-2 font-mono text-emerald-400">${Number(r['Precio Venta USD'] || r['Precio'] || r['sale_price'] || 0).toFixed(2)}</td>
                              <td className="p-2 font-mono font-bold">{r['Stock Actual'] || r['Stock'] || r['current_stock'] || 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {importPreview.length > 5 && (
                      <div className="text-[10px] text-slate-500 text-right">
                        Mostrando las primeras 5 de {importPreview.length} filas...
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
              <button 
                onClick={() => setShowExcelModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-slate-400 font-semibold text-xs hover:bg-slate-800"
              >
                Cerrar
              </button>
              {importPreview.length > 0 && (
                <button
                  onClick={handleConfirmImport}
                  disabled={isImporting}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Importando {importPreview.length} filas...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirmar e Importar {importPreview.length} Productos</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;

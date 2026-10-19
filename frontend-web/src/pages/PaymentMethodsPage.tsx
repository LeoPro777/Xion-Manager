import React, { useState, useEffect, useRef } from 'react';
import { 
  CreditCard, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Edit3, 
  LayoutGrid, 
  List, 
  ShieldCheck, 
  Upload, 
  X, 
  Zap, 
  DollarSign, 
  Coins, 
  Globe, 
  Hash, 
  Check, 
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { PaymentMethod, CreatePaymentMethodDTO, UpdatePaymentMethodDTO } from '../types';

export const PaymentMethodsPage: React.FC = () => {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [currencyFilter, setCurrencyFilter] = useState<'ALL' | 'VES' | 'USD'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'SYSTEM' | 'CUSTOM'>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modal State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form State
  const [formName, setFormName] = useState<string>('');
  const [formCode, setFormCode] = useState<string>('');
  const [formCurrency, setFormCurrency] = useState<string>('VES');
  const [formIsDigital, setFormIsDigital] = useState<boolean>(false);
  const [formAppliesIgtf, setFormAppliesIgtf] = useState<boolean>(false);
  const [formRequiresReference, setFormRequiresReference] = useState<boolean>(false);
  const [formAllowDecimals, setFormAllowDecimals] = useState<boolean>(true);
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [formImageUrl, setFormImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadMethods = async () => {
    setLoading(true);
    try {
      const data = await api.getPaymentMethods();
      setMethods(data);
    } catch {
      // Handled in api
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMethods();
  }, []);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const openCreateModal = () => {
    setEditingMethod(null);
    setFormName('');
    setFormCode('');
    setFormCurrency('VES');
    setFormIsDigital(false);
    setFormAppliesIgtf(false);
    setFormRequiresReference(false);
    setFormAllowDecimals(true);
    setFormIsActive(true);
    setFormImageUrl(null);
    setImageFile(null);
    setImagePreview(null);
    setShowModal(true);
  };

  const openEditModal = (method: PaymentMethod) => {
    setEditingMethod(method);
    setFormName(method.name);
    setFormCode(method.code);
    setFormCurrency(method.currency);
    setFormIsDigital(method.is_digital);
    setFormAppliesIgtf(method.applies_igtf);
    setFormRequiresReference(method.requires_reference);
    setFormAllowDecimals(method.allow_decimals);
    setFormIsActive(method.is_active);
    setFormImageUrl(method.image_url || null);
    setImageFile(null);
    setImagePreview(method.image_url ? `/static/payment_methods/medium_${method.image_url}.webp` : null);
    setShowModal(true);
  };

  const handleNameChange = (val: string) => {
    setFormName(val);
    if (!editingMethod) {
      // Auto-generate code slug
      const slug = val
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
      setFormCode(slug);

      // Auto heuristic for cash
      if (val.toLowerCase().includes('efectivo')) {
        setFormAllowDecimals(false);
        setFormIsDigital(false);
        setFormRequiresReference(false);
      } else {
        setFormIsDigital(true);
      }
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const handleToggleActive = async (method: PaymentMethod, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = await api.updatePaymentMethod(method.id, { is_active: !method.is_active });
      setMethods(methods.map(m => m.id === updated.id ? updated : m));
      showNotification(`Método "${method.name}" ${!method.is_active ? 'activado' : 'desactivado'} con éxito.`);
    } catch {
      showNotification('Error al actualizar el estado del método.', 'error');
    }
  };

  const handleDeleteMethod = async (method: PaymentMethod, e: React.MouseEvent) => {
    e.stopPropagation();
    if (method.is_system) {
      showNotification('Los métodos de pago del sistema no pueden eliminarse.', 'error');
      return;
    }

    if (!window.confirm(`¿Estás seguro de eliminar el método "${method.name}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      await api.deletePaymentMethod(method.id);
      setMethods(methods.filter(m => m.id !== method.id));
      showNotification(`Método "${method.name}" eliminado correctamente.`);
    } catch {
      showNotification('Error al eliminar el método de pago.', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim()) {
      showNotification('El nombre y el código son campos obligatorios.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalImageUrl = formImageUrl;

      if (imageFile) {
        const uploadRes = await api.uploadPaymentMethodImage(imageFile, formImageUrl);
        finalImageUrl = uploadRes.image_id;
      }

      if (editingMethod) {
        const updatePayload: UpdatePaymentMethodDTO = {
          name: formName.trim(),
          currency: formCurrency,
          is_digital: formIsDigital,
          applies_igtf: formAppliesIgtf,
          requires_reference: formRequiresReference,
          allow_decimals: formAllowDecimals,
          is_active: formIsActive,
          image_url: finalImageUrl
        };
        const updated = await api.updatePaymentMethod(editingMethod.id, updatePayload);
        setMethods(methods.map(m => m.id === updated.id ? updated : m));
        showNotification(`Método "${updated.name}" actualizado con éxito.`);
      } else {
        const createPayload: CreatePaymentMethodDTO = {
          name: formName.trim(),
          code: formCode.trim().toLowerCase(),
          currency: formCurrency,
          is_digital: formIsDigital,
          applies_igtf: formAppliesIgtf,
          requires_reference: formRequiresReference,
          allow_decimals: formAllowDecimals,
          is_active: formIsActive,
          image_url: finalImageUrl
        };
        const created = await api.createPaymentMethod(createPayload);
        setMethods([...methods, created]);
        showNotification(`Método "${created.name}" creado y sincronizado con Xion-POS.`);
      }
      setShowModal(false);
    } catch (err: any) {
      showNotification(err?.message || 'Error al guardar el método de pago.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered List
  const filteredMethods = methods.filter(m => {
    const matchesSearch = 
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      m.code.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'ALL' ? true : 
      statusFilter === 'ACTIVE' ? m.is_active : !m.is_active;

    const matchesCurrency = 
      currencyFilter === 'ALL' ? true : m.currency === currencyFilter;

    const matchesType = 
      typeFilter === 'ALL' ? true : 
      typeFilter === 'SYSTEM' ? m.is_system : !m.is_system;

    return matchesSearch && matchesStatus && matchesCurrency && matchesType;
  });

  const totalCount = methods.length;
  const activeCount = methods.filter(m => m.is_active).length;
  const systemCount = methods.filter(m => m.is_system).length;
  const customCount = methods.filter(m => !m.is_system).length;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 glass-panel p-3.5 sm:p-5 rounded-xl sm:rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
              <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
                Métodos de Pago y Pasarelas
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 hidden xs:block">
                Canales de cobro, divisas (VES/USD) e impuestos para terminales Xion-POS
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap w-full sm:w-auto">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[11px] sm:text-xs font-semibold">
            <Zap className="w-3 h-3 fill-cyan-400 animate-pulse" />
            <span>Sync POS Automática</span>
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-xs shadow-md shadow-cyan-500/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Nuevo Método</span>
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {feedbackMsg && (
        <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border text-xs font-semibold flex items-center gap-2 transition-all ${
          feedbackMsg.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* KPI Stats Cards - Compact 2x2 Grid on Mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="glass-card p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-800 space-y-1">
          <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Total Métodos</p>
          <div className="flex items-center justify-between">
            <h4 className="text-xl sm:text-2xl font-black text-slate-100">{totalCount}</h4>
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-slate-800 text-slate-300">
              <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 truncate">Canales configurados</p>
        </div>

        <div className="glass-card p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-800 space-y-1">
          <p className="text-[10px] sm:text-[11px] font-bold text-emerald-400 uppercase tracking-wider truncate">Activos en POS</p>
          <div className="flex items-center justify-between">
            <h4 className="text-xl sm:text-2xl font-black text-emerald-400">{activeCount}</h4>
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 truncate">Disponibles para cobro</p>
        </div>

        <div className="glass-card p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-800 space-y-1">
          <p className="text-[10px] sm:text-[11px] font-bold text-cyan-400 uppercase tracking-wider truncate">Métodos Sistema</p>
          <div className="flex items-center justify-between">
            <h4 className="text-xl sm:text-2xl font-black text-cyan-400">{systemCount}</h4>
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 truncate">Nativos protegidos</p>
        </div>

        <div className="glass-card p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-800 space-y-1">
          <p className="text-[10px] sm:text-[11px] font-bold text-indigo-400 uppercase tracking-wider truncate">Personalizados</p>
          <div className="flex items-center justify-between">
            <h4 className="text-xl sm:text-2xl font-black text-indigo-400">{customCount}</h4>
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 truncate">Creados por negocio</p>
        </div>
      </div>

      {/* Info Notice */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <h5 className="text-xs font-bold text-amber-300">Reglas de Integración con Xion-POS:</h5>
          <p className="text-[11px] text-amber-200/80 leading-relaxed">
            Los métodos marcados como <strong>SISTEMA</strong> (Pago Móvil, Zelle, Efectivo, Tarjetas, etc.) disponen de imágenes oficiales fijas y esquemas fiscales predeterminados. Puedes alternar libremente su disponibilidad activándolos o desactivándolos. Los métodos personalizados pueden ser editados o eliminados libremente siempre que no posean transacciones activas en turnos abiertos.
          </p>
        </div>
      </div>

      {/* Controls Bar: Search, Filters & View Toggle */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre (ej. Pago Móvil, Zelle) o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="ACTIVE">Solo Activos</option>
              <option value="INACTIVE">Solo Inactivos</option>
            </select>

            {/* Currency Filter */}
            <select
              value={currencyFilter}
              onChange={(e) => setCurrencyFilter(e.target.value as any)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">Todas las Monedas</option>
              <option value="VES">Bolívares (VES)</option>
              <option value="USD">Dólares (USD)</option>
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">Todos los Tipos</option>
              <option value="SYSTEM">Solo Sistema</option>
              <option value="CUSTOM">Personalizados</option>
            </select>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 self-end md:self-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === 'grid' 
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Vista Cuadrícula"
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden sm:inline">Tarjetas</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === 'list' 
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Vista Lista"
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">Tabla</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="glass-panel p-12 rounded-2xl text-center space-y-3">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Cargando métodos de pago sincronizados...</p>
        </div>
      ) : filteredMethods.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl text-center space-y-3">
          <CreditCard className="w-10 h-10 text-slate-600 mx-auto" />
          <h4 className="text-sm font-bold text-slate-300">No se encontraron métodos de pago</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Ningún canal de cobro coincide con los filtros aplicados. Intenta ajustar el término de búsqueda o crea un nuevo método.
          </p>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-4 py-2 rounded-xl text-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Método de Pago</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID CARDS VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredMethods.map((method) => {
            const imageUrl = method.image_url 
              ? `/static/payment_methods/medium_${method.image_url}.webp` 
              : null;

            return (
              <div
                key={method.id}
                onClick={() => openEditModal(method)}
                className={`glass-card rounded-2xl border transition-all duration-200 flex flex-col overflow-hidden group cursor-pointer hover:shadow-xl hover:-translate-y-0.5 ${
                  method.is_active 
                    ? 'border-slate-800 hover:border-cyan-500/50' 
                    : 'border-slate-800/60 opacity-60 hover:opacity-100 hover:border-slate-700'
                }`}
              >
                {/* Image / Header Area */}
                <div className="relative aspect-video w-full bg-slate-900/80 border-b border-slate-800 flex items-center justify-center overflow-hidden">
                  {imageUrl ? (
                    <img 
                      src={imageUrl} 
                      alt={method.name} 
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        // Fallback to placeholder icon if file not found
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : null}

                  {/* Fallback Icon when no image */}
                  <div className={`flex flex-col items-center justify-center text-cyan-400/40 group-hover:text-cyan-400/70 transition-colors ${imageUrl ? 'hidden' : ''}`}>
                    <CreditCard className="w-12 h-12 mb-1" />
                  </div>

                  {/* Badges Overlay */}
                  <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
                    {method.is_system ? (
                      <span className="px-2 py-0.5 rounded-md bg-cyan-500/90 text-slate-950 font-black text-[9px] uppercase tracking-wider shadow-md">
                        SISTEMA
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-indigo-500/90 text-white font-black text-[9px] uppercase tracking-wider shadow-md">
                        PERSONAL
                      </span>
                    )}

                    {!method.is_active && (
                      <span className="px-2 py-0.5 rounded-md bg-rose-500/90 text-white font-black text-[9px] uppercase tracking-wider shadow-md">
                        INACTIVO
                      </span>
                    )}
                  </div>

                  {/* Currency Badge */}
                  <div className="absolute top-2.5 right-2.5 z-10">
                    <span className="px-2 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-md border border-slate-700 text-slate-200 font-mono font-bold text-[10px]">
                      {method.currency}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-slate-100 group-hover:text-cyan-400 transition-colors line-clamp-1">
                        {method.name}
                      </h4>
                    </div>
                    <p className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                      <Hash className="w-3 h-3 text-slate-600" />
                      <span>{method.code}</span>
                    </p>
                  </div>

                  {/* Attribute Tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-800/80">
                    <span className={`text-[9px] px-2 py-0.5 rounded font-medium border ${
                      method.allow_decimals 
                        ? 'bg-slate-800/60 text-slate-300 border-slate-700' 
                        : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                    }`}>
                      {method.allow_decimals ? 'Con Decimales' : 'Sin Decimales'}
                    </span>

                    {method.is_digital && (
                      <span className="text-[9px] px-2 py-0.5 rounded font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20">
                        Digital
                      </span>
                    )}

                    {method.applies_igtf && (
                      <span className="text-[9px] px-2 py-0.5 rounded font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        IGTF 3%
                      </span>
                    )}

                    {method.requires_reference && (
                      <span className="text-[9px] px-2 py-0.5 rounded font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        Req. Ref.
                      </span>
                    )}
                  </div>

                  {/* Actions & Toggle */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    {/* Active Switch */}
                    <button
                      onClick={(e) => handleToggleActive(method, e)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                        method.is_active 
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25' 
                          : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                      }`}
                      title={method.is_active ? 'Desactivar en POS' : 'Activar en POS'}
                    >
                      <div className={`w-2 h-2 rounded-full ${method.is_active ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                      <span>{method.is_active ? 'Activo' : 'Pausado'}</span>
                    </button>

                    {/* Edit & Delete Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(method);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
                        title="Editar Método"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {!method.is_system && (
                        <button
                          onClick={(e) => handleDeleteMethod(method, e)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Eliminar Método"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST / TABLE VIEW */
        <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-800 tracking-wider">
                <tr>
                  <th className="py-3 px-4">Canal / Icono</th>
                  <th className="py-3 px-4">Código Interno</th>
                  <th className="py-3 px-4">Divisa</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Características</th>
                  <th className="py-3 px-4 text-center">Estado POS</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredMethods.map((method) => {
                  const thumbUrl = method.image_url 
                    ? `/static/payment_methods/thumb_${method.image_url}.webp` 
                    : null;

                  return (
                    <tr 
                      key={method.id} 
                      onClick={() => openEditModal(method)}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                            {thumbUrl ? (
                              <img src={thumbUrl} alt={method.name} className="w-full h-full object-cover" />
                            ) : (
                              <CreditCard className="w-5 h-5 text-cyan-400/50" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-100 group-hover:text-cyan-400 transition-colors">
                              {method.name}
                            </p>
                            <span className="text-[10px] text-slate-500">ID: #{method.id}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                        {method.code}
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono font-bold text-slate-200">
                          {method.currency}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {method.is_system ? (
                          <span className="px-2 py-0.5 rounded text-[9px] font-black bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 uppercase">
                            SISTEMA
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[9px] font-black bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 uppercase">
                            PERSONAL
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                            {method.allow_decimals ? 'Dec: Sí' : 'Dec: No'}
                          </span>
                          {method.is_digital && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                              Digital
                            </span>
                          )}
                          {method.applies_igtf && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                              IGTF
                            </span>
                          )}
                          {method.requires_reference && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                              Ref
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={(e) => handleToggleActive(method, e)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all ${
                            method.is_active 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                              : 'bg-slate-800 text-slate-500 border border-slate-700'
                          }`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full ${method.is_active ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                          <span>{method.is_active ? 'Activo' : 'Inactivo'}</span>
                        </button>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(method);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800"
                            title="Editar"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {!method.is_system && (
                            <button
                              onClick={(e) => handleDeleteMethod(method, e)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Crear o Editar Método de Pago */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel w-full max-w-xl rounded-2xl border border-slate-800 shadow-2xl p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    {editingMethod ? `Editar Método: ${editingMethod.name}` : 'Nuevo Método de Pago'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {editingMethod?.is_system 
                      ? 'Método oficial protegido del sistema (campos estructurales bloqueados).' 
                      : 'Parámetros fiscales y sincronización con puntos de venta.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Image Uploader */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Icono / Imagen Oficial del Método
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-slate-900 border-2 border-dashed border-slate-700 flex items-center justify-center overflow-hidden shrink-0 relative group">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <CreditCard className="w-8 h-8 text-slate-600" />
                    )}

                    {!editingMethod?.is_system && (
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity"
                      >
                        <Upload className="w-5 h-5 text-cyan-400" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-1">
                    {editingMethod?.is_system ? (
                      <p className="text-xs text-amber-400/90 font-medium">
                        Icono oficial protegido por el sistema Xion.
                      </p>
                    ) : (
                      <>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleImageSelect}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-colors"
                        >
                          <Upload className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Subir Imagen (WebP, PNG, JPG)</span>
                        </button>
                        <p className="text-[10px] text-slate-500">
                          Se procesará y optimizará automáticamente a 500x500 y thumbnail para pantallas táctiles POS.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Name & Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nombre del Método *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Cashea, PayPal, Zinli"
                    value={formName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Código Técnico Único *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={editingMethod?.is_system}
                    placeholder="ej. cashea, paypal"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className={`w-full font-mono bg-slate-900 border rounded-xl px-3 py-2 text-xs focus:outline-none ${
                      editingMethod?.is_system 
                        ? 'border-slate-800 text-slate-500 cursor-not-allowed' 
                        : 'border-slate-700 text-slate-200 focus:border-cyan-500'
                    }`}
                  />
                  {editingMethod?.is_system && (
                    <span className="text-[9px] text-slate-500">Código de sistema no modificable</span>
                  )}
                </div>
              </div>

              {/* Currency & Allow Decimals */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Moneda de Operación *
                  </label>
                  <select
                    disabled={editingMethod?.is_system}
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value)}
                    className={`w-full bg-slate-900 border rounded-xl px-3 py-2 text-xs focus:outline-none ${
                      editingMethod?.is_system 
                        ? 'border-slate-800 text-slate-500 cursor-not-allowed' 
                        : 'border-slate-700 text-slate-200 focus:border-cyan-500'
                    }`}
                  >
                    <option value="VES">Bolívares (VES)</option>
                    <option value="USD">Dólares Estadounidenses (USD)</option>
                    <option value="EUR">Euros (EUR)</option>
                    <option value="COP">Pesos Colombianos (COP)</option>
                  </select>
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formAllowDecimals}
                      disabled={editingMethod?.is_system}
                      onChange={(e) => setFormAllowDecimals(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
                    />
                    <div>
                      <p className="text-xs font-semibold text-slate-200">Permitir Decimales</p>
                      <p className="text-[10px] text-slate-500">Desmarcar para efectivo sin vuelto fraccionario</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Toggles Panel */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Propiedades y Controles Fiscales
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={formIsDigital}
                      onChange={(e) => setFormIsDigital(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
                    />
                    <div>
                      <p className="text-xs font-semibold text-slate-200">Medio Digital / Transferencia</p>
                      <p className="text-[10px] text-slate-500">Pago móvil, tarjetas, Zelle, cripto</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={formRequiresReference}
                      onChange={(e) => setFormRequiresReference(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
                    />
                    <div>
                      <p className="text-xs font-semibold text-slate-200">Exigir Referencia en POS</p>
                      <p className="text-[10px] text-slate-500">Solicita comprobante / hash al cobrar</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={formAppliesIgtf}
                      onChange={(e) => setFormAppliesIgtf(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
                    />
                    <div>
                      <p className="text-xs font-semibold text-slate-200">Aplica IGTF 3% (Divisas)</p>
                      <p className="text-[10px] text-slate-500">Alícuota impositiva para pagos en divisas</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
                    />
                    <div>
                      <p className="text-xs font-semibold text-slate-200">Activo en Puntos de Venta</p>
                      <p className="text-[10px] text-slate-500">Visible para cobros en terminales POS</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 stroke-[2.5]" />
                  )}
                  <span>{editingMethod ? 'Actualizar Método' : 'Guardar y Sincronizar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

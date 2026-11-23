import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, UserCheck, UserX, Plus, Search, 
  CreditCard, DollarSign, AlertCircle, CheckCircle2, 
  Lock, X, Edit, Trash2, Receipt, ArrowDownRight, 
  Phone, Mail, MapPin, ShieldAlert, Sparkles, Filter,
  History, ArrowRight, Save
} from 'lucide-react';
import { api } from '../services/api';
import { Client, ClientReceivableLedgerItem } from '../types';

export const ClientsPage: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'WITH_DEBT'>('ALL');
  const [maxGlobalCredit, setMaxGlobalCredit] = useState<number>(1000.0);
  const [bannerMsg, setBannerMsg] = useState<{ text: string; type: 'success' | 'warning' | 'error' } | null>(null);

  // Modal: Registrar / Editar Cliente
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formName, setFormName] = useState<string>('');
  const [formIdType, setFormIdType] = useState<string>('CI');
  const [formIdNumber, setFormIdNumber] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formAddress, setFormAddress] = useState<string>('');
  const [formCreditLimit, setFormCreditLimit] = useState<number>(0);
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [creditLimitWarning, setCreditLimitWarning] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Modal: Historial CxC / Ledger & Abonos
  const [selectedClientForLedger, setSelectedClientForLedger] = useState<Client | null>(null);
  const [ledgerItems, setLedgerItems] = useState<ClientReceivableLedgerItem[]>([]);
  const [loadingLedger, setLoadingLedger] = useState<boolean>(false);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH_USD');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState<boolean>(false);

  // Modal: Confirmar Eliminación
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [list, maxLimit] = await Promise.all([
        api.getClients(),
        api.getMaxClientCreditLimit()
      ]);
      setClients(list);
      setMaxGlobalCredit(maxLimit);
    } catch (err: any) {
      showToast(err.message || 'Error al cargar clientes', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (text: string, type: 'success' | 'warning' | 'error' = 'success') => {
    setBannerMsg({ text, type });
    setTimeout(() => {
      setBannerMsg(null);
    }, 4500);
  };

  // KPIs
  const stats = useMemo(() => {
    const total = clients.length;
    const active = clients.filter(c => c.is_active).length;
    const totalDebt = clients.reduce((acc, c) => acc + (Number(c.current_debt) || 0), 0);
    const withDebtCount = clients.filter(c => (Number(c.current_debt) || 0) > 0).length;
    return { total, active, totalDebt, withDebtCount };
  }, [clients]);

  // Filtrado reactivo
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      if (statusFilter === 'ACTIVE' && !c.is_active) return false;
      if (statusFilter === 'INACTIVE' && c.is_active) return false;
      if (statusFilter === 'WITH_DEBT' && (Number(c.current_debt) || 0) <= 0) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      return (
        c.name.toLowerCase().includes(q) ||
        c.identification_number.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q))
      );
    });
  }, [clients, statusFilter, search]);

  const handleOpenCreateModal = () => {
    setEditingClient(null);
    setFormName('');
    setFormIdType('CI');
    setFormIdNumber('');
    setFormEmail('');
    setFormPhone('');
    setFormAddress('');
    setFormCreditLimit(0);
    setFormIsActive(true);
    setCreditLimitWarning(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (c: Client) => {
    setEditingClient(c);
    setFormName(c.name);
    setFormIdType(c.identification_type || 'CI');
    setFormIdNumber(c.identification_number);
    setFormEmail(c.email?.endsWith('@cliente.local') ? '' : c.email || '');
    setFormPhone(c.phone || '');
    setFormAddress(c.address || '');
    setFormCreditLimit(Number(c.credit_limit || c.credit_limit_usd || 0));
    setFormIsActive(c.is_active);
    setCreditLimitWarning(null);
    setShowModal(true);
  };

  const handleCreditLimitChange = (valStr: string) => {
    const num = parseFloat(valStr) || 0;
    if (num > maxGlobalCredit) {
      setFormCreditLimit(maxGlobalCredit);
      setCreditLimitWarning(`Tope global alcanzado: El límite máximo permitido es $${maxGlobalCredit.toFixed(2)}.`);
      showToast(`El monto ingresado excede el tope global permitido ($${maxGlobalCredit.toFixed(2)}). Valor ajustado automáticamente.`, 'warning');
    } else {
      setFormCreditLimit(Math.max(0, num));
      setCreditLimitWarning(null);
    }
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formName.trim().length < 2) {
      showToast('El nombre debe tener al menos 2 caracteres.', 'error');
      return;
    }
    if (formIdNumber.trim().length < 5) {
      showToast('El documento de identificación debe tener al menos 5 caracteres.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const payload: Partial<Client> = {
        name: formName.trim(),
        identification_type: formIdType,
        identification_number: formIdNumber.trim().toUpperCase(),
        email: formEmail.trim() || undefined,
        phone: formPhone.trim() || undefined,
        address: formAddress.trim() || undefined,
        credit_limit: formCreditLimit,
        credit_limit_usd: formCreditLimit,
        is_active: formIsActive
      };

      if (editingClient) {
        const updated = await api.updateClient(editingClient.id, payload);
        setClients(prev => prev.map(c => c.id === updated.id ? updated : c));
        showToast(`Cliente '${updated.name}' actualizado exitosamente.`);
      } else {
        const created = await api.createClient(payload);
        setClients(prev => [created, ...prev]);
        showToast(`Cliente '${created.name}' registrado exitosamente.`);
      }
      setShowModal(false);
    } catch (err: any) {
      showToast(err.message || 'Error al guardar cliente', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (c: Client) => {
    try {
      const newStatus = !c.is_active;
      const updated = await api.updateClient(c.id, { is_active: newStatus });
      setClients(prev => prev.map(item => item.id === c.id ? updated : item));
      showToast(`Cliente ${newStatus ? 'activado' : 'desactivado'} correctamente.`);
    } catch (err: any) {
      showToast(err.message || 'Error al alternar estado del cliente', 'error');
    }
  };

  const handleDeleteClient = async () => {
    if (!clientToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteClient(clientToDelete.id);
      setClients(prev => prev.filter(c => c.id !== clientToDelete.id));
      showToast(`Cliente '${clientToDelete.name}' eliminado exitosamente.`);
      setClientToDelete(null);
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar cliente', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenLedgerModal = async (c: Client) => {
    setSelectedClientForLedger(c);
    setPaymentAmount('');
    setPaymentReference('');
    setPaymentNotes('');
    setLoadingLedger(true);
    try {
      const history = await api.getClientLedger(c.id);
      setLedgerItems(history);
    } catch (err: any) {
      showToast('Error al cargar movimientos de cuenta por cobrar', 'error');
    } finally {
      setLoadingLedger(false);
    }
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientForLedger) return;
    const amt = parseFloat(paymentAmount);
    if (!amt || amt <= 0) {
      showToast('Ingresa un monto válido mayor a 0 para el abono.', 'error');
      return;
    }
    if (amt > selectedClientForLedger.current_debt) {
      showToast(`El abono ($${amt.toFixed(2)}) no puede exceder la deuda actual ($${selectedClientForLedger.current_debt.toFixed(2)}).`, 'warning');
    }

    setIsSubmittingPayment(true);
    try {
      const res = await api.registerClientPayment(selectedClientForLedger.id, {
        amount_usd: amt,
        payment_method: paymentMethod,
        reference: paymentReference.trim() || undefined,
        notes: paymentNotes.trim() || undefined
      });

      // Actualizar cliente localmente
      setSelectedClientForLedger(prev => prev ? { ...prev, current_debt: res.current_debt_usd } : null);
      setClients(prev => prev.map(c => c.id === selectedClientForLedger.id ? { ...c, current_debt: res.current_debt_usd } : c));
      
      // Recargar ledger
      const updatedHistory = await api.getClientLedger(selectedClientForLedger.id);
      setLedgerItems(updatedHistory);

      setPaymentAmount('');
      setPaymentReference('');
      setPaymentNotes('');
      showToast(res.message || 'Abono registrado con éxito.');
    } catch (err: any) {
      showToast(err.message || 'Error al procesar el abono', 'error');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Toast / Banner flotante de notificación */}
      {bannerMsg && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md border animate-in slide-in-from-top-2 duration-300 ${
          bannerMsg.type === 'error'
            ? 'bg-rose-950/90 text-rose-200 border-rose-800'
            : bannerMsg.type === 'warning'
            ? 'bg-amber-950/90 text-amber-200 border-amber-800'
            : 'bg-emerald-950/90 text-emerald-200 border-emerald-800'
        }`}>
          {bannerMsg.type === 'error' ? <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" /> :
           bannerMsg.type === 'warning' ? <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" /> :
           <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
          <span className="text-sm font-medium">{bannerMsg.text}</span>
          <button onClick={() => setBannerMsg(null)} className="p-1 hover:opacity-75 transition-opacity">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Directorio de Clientes y Créditos</h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Gestión de cartera, cuentas por cobrar (CxC), límites de crédito y libros contables de deuda.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Cliente</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas (KPIs) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Total Clientes */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Clientes</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-white font-mono tracking-tight">
            {stats.total}
          </div>
          <div className="mt-1 text-[11px] text-slate-400 flex items-center gap-1">
            <span>En cartera comercial</span>
          </div>
        </div>

        {/* KPI 2: Clientes Activos */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Clientes Activos</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-emerald-400 font-mono tracking-tight">
            {stats.active}
          </div>
          <div className="mt-1 text-[11px] text-slate-400 flex items-center gap-1">
            <span>Habilitados para compras</span>
          </div>
        </div>

        {/* KPI 3: Deuda Total en CxC */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Deuda Total CxC</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-rose-400 font-mono tracking-tight">
            ${stats.totalDebt.toFixed(2)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400 flex items-center gap-1">
            <span>{stats.withDebtCount} {stats.withDebtCount === 1 ? 'cliente con saldo' : 'clientes con saldo'}</span>
          </div>
        </div>

        {/* KPI 4: Tope Global Permitido */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Tope Global de Crédito</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-purple-300 font-mono tracking-tight">
            ${maxGlobalCredit.toFixed(2)}
          </div>
          <div className="mt-1 text-[11px] text-slate-400 flex items-center gap-1">
            <span>Límite máx. por cuenta</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda Reactiva */}
      <div className="p-3 sm:p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Buscador */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por Nombre, Cédula / RIF, Correo o Teléfono..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Pestañas de Filtro Rápido */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              statusFilter === 'ALL'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
                : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Todos ({clients.length})
          </button>
          <button
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              statusFilter === 'ACTIVE'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Activos ({stats.active})
          </button>
          <button
            onClick={() => setStatusFilter('WITH_DEBT')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              statusFilter === 'WITH_DEBT'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm'
                : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Con Deuda ({stats.withDebtCount})
          </button>
          <button
            onClick={() => setStatusFilter('INACTIVE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              statusFilter === 'INACTIVE'
                ? 'bg-slate-800 text-slate-200 border border-slate-700 shadow-sm'
                : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Inactivos ({clients.length - stats.active})
          </button>
        </div>
      </div>

      {/* Tabla de Clientes */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
            <span className="text-xs font-medium">Cargando directorio de clientes...</span>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400 px-4 text-center">
            <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800 text-slate-500">
              <Users className="w-8 h-8" />
            </div>
            <p className="text-sm font-semibold text-slate-300">No se encontraron clientes</p>
            <p className="text-xs text-slate-500 max-w-sm">
              {search ? 'Intenta modificar el término de búsqueda o quitar los filtros aplicados.' : 'Comienza registrando tu primer cliente para autorizar ventas a crédito.'}
            </p>
            {!search && (
              <button
                onClick={handleOpenCreateModal}
                className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Registrar Cliente Ahora</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-950/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Cliente / Razón Social</th>
                  <th className="py-3.5 px-4">Identificación</th>
                  <th className="py-3.5 px-4">Contacto</th>
                  <th className="py-3.5 px-4 text-right">Límite Crédito</th>
                  <th className="py-3.5 px-4 text-right">Deuda Actual</th>
                  <th className="py-3.5 px-4 text-center">Estado</th>
                  <th className="py-3.5 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-xs text-slate-300">
                {filteredClients.map(c => {
                  const hasDebt = (Number(c.current_debt) || 0) > 0;
                  const initials = c.name
                    .split(' ')
                    .map(w => w[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  return (
                    <tr key={c.id} className="hover:bg-slate-800/30 transition-colors group">
                      {/* Cliente */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            c.is_active 
                              ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-400' 
                              : 'bg-slate-800 border border-slate-700 text-slate-400'
                          }`}>
                            {initials || 'CL'}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-white truncate max-w-[200px] sm:max-w-[260px]">
                              {c.name}
                            </div>
                            {c.address ? (
                              <div className="text-[11px] text-slate-500 truncate max-w-[200px] flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-600 shrink-0" />
                                <span className="truncate">{c.address}</span>
                              </div>
                            ) : (
                              <div className="text-[11px] text-slate-600 italic">Sin dirección fiscal</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Identificación */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-300 font-semibold tracking-wide">
                          {c.identification_type}-{c.identification_number}
                        </span>
                      </td>

                      {/* Contacto */}
                      <td className="py-3.5 px-4 space-y-1">
                        {c.email && !c.email.endsWith('@cliente.local') ? (
                          <div className="flex items-center gap-1 text-[11px] text-slate-400">
                            <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                            <span className="truncate max-w-[150px]">{c.email}</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-600 italic">Email local</div>
                        )}
                        {c.phone ? (
                          <div className="flex items-center gap-1 text-[11px] text-slate-400">
                            <Phone className="w-3 h-3 text-emerald-500 shrink-0" />
                            <span>{c.phone}</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-600 italic">Sin teléfono</div>
                        )}
                      </td>

                      {/* Límite Crédito */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-200">
                        ${(Number(c.credit_limit || c.credit_limit_usd) || 0).toFixed(2)}
                      </td>

                      {/* Deuda Actual */}
                      <td className="py-3.5 px-4 text-right">
                        <span className={`font-mono font-bold px-2.5 py-1 rounded-lg text-xs inline-block ${
                          hasDebt 
                            ? 'bg-rose-500/15 border border-rose-500/30 text-rose-400' 
                            : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                        }`}>
                          ${(Number(c.current_debt) || 0).toFixed(2)}
                        </span>
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleToggleStatus(c)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            c.is_active ? 'bg-emerald-500' : 'bg-slate-700'
                          }`}
                          title={c.is_active ? 'Desactivar cliente' : 'Activar cliente'}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                              c.is_active ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenLedgerModal(c)}
                            className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-all"
                            title="Historial de Créditos y Registrar Abono"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(c)}
                            className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-all"
                            title="Editar Datos del Cliente"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setClientToDelete(c)}
                            className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition-all"
                            title="Eliminar Cliente"
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
        )}
      </div>

      {/* ========================================================
          MODAL: REGISTRAR / EDITAR CLIENTE
      ======================================================== */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {editingClient ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
                </h3>
                <p className="text-xs text-slate-400">
                  {editingClient ? 'Actualiza la ficha fiscal y límites de crédito.' : 'Introduce los datos del cliente para compras y cuentas por cobrar.'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveClient} className="space-y-4">
              {/* Nombre o Razón Social */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nombre Completo / Razón Social <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="Ej. Inversiones El Águila C.A. o María Delgado"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Tipo y Número de Identificación */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Tipo Doc. <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formIdType}
                    onChange={e => setFormIdType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="CI">C.I. (V/E)</option>
                    <option value="RIF">R.I.F. (J/G)</option>
                    <option value="Pasaporte">Pasaporte</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Número de Identificación <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formIdNumber}
                    onChange={e => setFormIdNumber(e.target.value.toUpperCase())}
                    placeholder="Ej. 18456789 o J-30123456-7"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 uppercase font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Correo y Teléfono */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    placeholder="contacto@cliente.com"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                  <span className="text-[10px] text-slate-500">Opcional (se autogenera si se omite)</span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={e => setFormPhone(e.target.value)}
                    placeholder="+58 412-1234567"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Dirección */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Dirección Fiscal / Despacho
                </label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={e => setFormAddress(e.target.value)}
                  placeholder="Calle, Sector, Ciudad"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Límite de Crédito con Bloqueo y Toques de Seguridad */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Límite de Crédito ($ USD)</span>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-300">
                    Tope global: ${maxGlobalCredit.toFixed(2)}
                  </span>
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold">$</span>
                  <input
                    type="number"
                    min="0"
                    max={maxGlobalCredit}
                    step="0.01"
                    value={formCreditLimit === 0 ? '' : formCreditLimit}
                    onChange={e => handleCreditLimitChange(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm font-mono font-bold text-cyan-400 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {creditLimitWarning && (
                  <p className="text-[11px] text-amber-400 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{creditLimitWarning}</span>
                  </p>
                )}

                {editingClient && (
                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Deuda actual en cuentas por cobrar:</span>
                    <span className="font-mono font-bold text-rose-400">${(Number(editingClient.current_debt) || 0).toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Botones del Modal */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Guardando...' : editingClient ? 'Guardar Cambios' : 'Registrar Cliente'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: HISTORIAL CONTABLE CXC Y REGISTRO DE ABONO
      ======================================================== */}
      {selectedClientForLedger && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 relative max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedClientForLedger(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header del Modal */}
            <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{selectedClientForLedger.name}</h3>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                  <span className="font-mono">{selectedClientForLedger.identification_type}-{selectedClientForLedger.identification_number}</span>
                  <span>•</span>
                  <span>Límite: <strong className="text-slate-200 font-mono">${(Number(selectedClientForLedger.credit_limit) || 0).toFixed(2)}</strong></span>
                  <span>•</span>
                  <span>Deuda Actual: <strong className="text-rose-400 font-mono">${(Number(selectedClientForLedger.current_debt) || 0).toFixed(2)}</strong></span>
                </div>
              </div>
            </div>

            {/* Formulario Rápido: Registrar Abono */}
            <div className="my-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>Registrar Pago / Abono a Deuda</span>
              </div>
              <form onSubmit={handleRegisterPayment} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Monto ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Método</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="CASH_USD">$ Efectivo</option>
                    <option value="CASH_BS">Bs Efectivo</option>
                    <option value="PAGO_MOVIL">Pago Móvil</option>
                    <option value="DEBIT_CARD">Tarjeta / POS</option>
                  </select>
                </div>
                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Referencia</label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={e => setPaymentReference(e.target.value)}
                    placeholder="# Ref / Recibo"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="sm:col-span-1 flex items-end">
                  <button
                    type="submit"
                    disabled={isSubmittingPayment || !paymentAmount}
                    className="w-full py-1.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isSubmittingPayment ? 'Procesando...' : 'Abonar'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Listado de Movimientos (Ledger) */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <div className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1">
                <History className="w-3.5 h-3.5 text-cyan-400" />
                <span>Libro Contable de Movimientos (CxC Ledger)</span>
              </div>

              {loadingLedger ? (
                <div className="py-12 text-center text-slate-400 text-xs">Cargando movimientos...</div>
              ) : ledgerItems.length === 0 ? (
                <div className="py-10 text-center text-slate-500 text-xs italic">
                  Este cliente aún no registra movimientos de crédito o abonos.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {ledgerItems.map(item => {
                    const isPayment = item.tx_type === 'PAYMENT' || item.tx_type === 'DISCOUNT';
                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`p-1.5 rounded-lg shrink-0 ${
                            isPayment ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            <ArrowDownRight className={`w-3.5 h-3.5 ${isPayment ? 'rotate-180' : ''}`} />
                          </div>
                          <div>
                            <div className="font-semibold text-white">
                              {item.reference || (isPayment ? 'Abono / Pago a Deuda' : 'Cargo por Venta a Crédito')}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {item.created_at ? new Date(item.created_at).toLocaleString('es-VE') : 'Fecha no registrada'}
                              {item.notes ? ` • ${item.notes}` : ''}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`font-mono font-bold text-xs ${
                            isPayment ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {isPayment ? '-' : '+'}${Number(item.amount_usd || 0).toFixed(2)}
                          </span>
                          <div className="text-[10px] text-slate-500 font-mono">
                            Tasa: {Number(item.exchange_rate || 1).toFixed(2)} Bs/$
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CONFIRMAR ELIMINACIÓN
      ======================================================== */}
      {clientToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 mx-auto flex items-center justify-center mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">¿Eliminar Cliente?</h3>
            <p className="text-xs text-slate-400 mb-4">
              Se realizará un borrado lógico de <strong className="text-white">'{clientToDelete.name}'</strong>. Su historial contable y compras previas se preservarán intactos.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setClientToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteClient}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-rose-500/20"
              >
                {isDeleting ? 'Eliminando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

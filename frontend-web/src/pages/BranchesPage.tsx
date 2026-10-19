import React, { useState, useEffect } from 'react';
import { 
  Store, 
  LayoutGrid, 
  List, 
  Plus, 
  MapPin, 
  Monitor, 
  Users, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Edit, 
  Trash2, 
  Power, 
  CreditCard, 
  Search, 
  X, 
  Smartphone, 
  Banknote, 
  ExternalLink,
  Sliders,
  DollarSign,
  Tv,
  ShieldAlert,
  KeyRound
} from 'lucide-react';
import { api } from '../services/api';
import { Branch, CashRegister, User, CashSessionSyncItem, PaymentMethod } from '../types';
import { LocationMapPicker, MapMarkerItem } from '../components/LocationMapPicker';
import { LocationPickerModal } from '../components/LocationPickerModal';

export const BranchesPage: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<PaymentMethod[]>([]);

  const [users, setUsers] = useState<User[]>([]);
  const [cashSessions, setCashSessions] = useState<CashSessionSyncItem[]>([]);
  
  // Navigation and Filter States
  const [activeTab, setActiveTab] = useState<'branches' | 'registers' | 'map'>('branches');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [selectedOverviewMarkerId, setSelectedOverviewMarkerId] = useState<string | undefined>();

  // Modals
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formBranchName, setFormBranchName] = useState('');
  const [formBranchAddress, setFormBranchAddress] = useState('');
  const [formBranchPhone, setFormBranchPhone] = useState('');
  const [formBranchManagerId, setFormBranchManagerId] = useState('');
  const [formBranchLat, setFormBranchLat] = useState('10.6417');
  const [formBranchLng, setFormBranchLng] = useState('-71.6125');
  const [showBranchLocationModal, setShowBranchLocationModal] = useState(false);

  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [editingRegister, setEditingRegister] = useState<CashRegister | null>(null);
  const [formRegName, setFormRegName] = useState('');
  const [formRegBranchId, setFormRegBranchId] = useState('');
  const [formRegHardwareUuid, setFormRegHardwareUuid] = useState('');
  const [formRegMethods, setFormRegMethods] = useState<string[]>(['CASH_USD', 'CASH_BS', 'PAGO_MOVIL', 'DEBIT_CARD']);
  const [formRegUsers, setFormRegUsers] = useState<string[]>([]);
  const [formRegLat, setFormRegLat] = useState('10.6417');
  const [formRegLng, setFormRegLng] = useState('-71.6125');
  const [formRegLocationName, setFormRegLocationName] = useState('');

  // Smart TV Pairing Modal States
  const [showPairingModal, setShowPairingModal] = useState(false);
  const [pairingCodeInput, setPairingCodeInput] = useState('');
  const [pairingBranchId, setPairingBranchId] = useState('');
  const [pairingTerminalName, setPairingTerminalName] = useState('');
  const [isPairing, setIsPairing] = useState(false);

  const [auditModalRegister, setAuditModalRegister] = useState<CashRegister | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [brs, regs, usrs, sess, pms] = await Promise.all([
      api.getBranches(),
      api.getCashRegisters(),
      api.getUsers(),
      api.getCashSessions(),
      api.getPaymentMethods()
    ]);
    setBranches(brs);
    setCashRegisters(regs);
    setUsers(usrs);
    setCashSessions(sess);
    setAvailablePaymentMethods(pms);
    if (brs.length > 0) setFormRegBranchId(brs[0].id);
  };


  // Branch Modal Handlers
  const handleOpenBranchModal = (branch?: Branch) => {
    if (branch) {
      setEditingBranch(branch);
      setFormBranchName(branch.name);
      setFormBranchAddress(branch.address);
      setFormBranchPhone(branch.phone || '');
      setFormBranchManagerId(branch.manager_user_id || '');
      setFormBranchLat((branch.latitude || 10.6417).toString());
      setFormBranchLng((branch.longitude || -71.6125).toString());
    } else {
      setEditingBranch(null);
      setFormBranchName('');
      setFormBranchAddress('');
      setFormBranchPhone('+58 414-');
      setFormBranchManagerId(users.length > 0 ? users[0].id : '');
      setFormBranchLat('10.6417');
      setFormBranchLng('-71.6125');
    }
    setShowBranchModal(true);
  };

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    const manager = users.find(u => u.id === formBranchManagerId);
    const branchPayload: Partial<Branch> = {
      name: formBranchName,
      address: formBranchAddress,
      phone: formBranchPhone,
      manager_user_id: formBranchManagerId,
      manager_name: manager?.full_name || 'Gerente General',
      latitude: parseFloat(formBranchLat) || 10.6417,
      longitude: parseFloat(formBranchLng) || -71.6125
    };

    if (editingBranch) {
      const updated = await api.updateBranch(editingBranch.id, branchPayload);
      setBranches(branches.map(b => b.id === updated.id ? updated : b));
    } else {
      const created = await api.createBranch(branchPayload);
      setBranches([...branches, created]);
    }
    setShowBranchModal(false);
  };

  const handleDeleteBranch = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta sucursal? Todas sus cajas registradoras también serán dadas de baja.')) {
      await api.deleteBranch(id);
      setBranches(branches.filter(b => b.id !== id));
      setCashRegisters(cashRegisters.filter(r => r.branch_id !== id));
    }
  };

  // Cash Register Modal Handlers
  const handleOpenRegisterModal = (register?: CashRegister, defaultBranchId?: string) => {
    if (register) {
      setEditingRegister(register);
      setFormRegName(register.name);
      setFormRegBranchId(register.branch_id);
      setFormRegHardwareUuid(register.hardware_uuid || '');
      setFormRegMethods(register.payment_methods || ['CASH_USD', 'CASH_BS']);
      setFormRegUsers(register.allowed_user_ids || []);
      setFormRegLat((register.latitude || 10.6417).toString());
      setFormRegLng((register.longitude || -71.6125).toString());
      setFormRegLocationName(register.location_name || '');
    } else {
      setEditingRegister(null);
      const bId = defaultBranchId || (branches.length > 0 ? branches[0].id : 'branch-1');
      const bObj = branches.find(b => b.id === bId);
      setFormRegName(`Caja 0${cashRegisters.length + 1} - Terminal POS`);
      setFormRegBranchId(bId);
      setFormRegHardwareUuid(`HW-POS-${Math.floor(1000 + Math.random() * 9000)}-${Date.now().toString().slice(-4)}`);
      setFormRegMethods(['CASH_USD', 'CASH_BS', 'PAGO_MOVIL', 'DEBIT_CARD']);
      setFormRegUsers(users.slice(0, 2).map(u => u.id));
      setFormRegLat((bObj?.latitude || 10.6417).toString());
      setFormRegLng((bObj?.longitude || -71.6125).toString());
      setFormRegLocationName(bObj ? `${bObj.name} - Mostrador Principal` : 'Punto de Venta');
    }
    setShowRegisterModal(true);
  };

  const handleSaveRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const parentBranch = branches.find(b => b.id === formRegBranchId);
    const resolvedLat = parentBranch?.latitude ?? (parseFloat(formRegLat) || undefined);
    const resolvedLng = parentBranch?.longitude ?? (parseFloat(formRegLng) || undefined);

    const payload: Partial<CashRegister> = {
      name: formRegName,
      branch_id: formRegBranchId,
      hardware_uuid: formRegHardwareUuid,
      payment_methods: formRegMethods,
      allowed_user_ids: formRegUsers,
      latitude: resolvedLat,
      longitude: resolvedLng,
      location_name: formRegLocationName || (parentBranch ? `${parentBranch.name} - Mostrador Principal` : 'Punto de Venta')
    };

    if (editingRegister) {
      const updated = await api.updateCashRegister(editingRegister.id, payload);
      setCashRegisters(cashRegisters.map(r => r.id === updated.id ? updated : r));
    } else {
      const created = await api.createCashRegister(payload);
      setCashRegisters([...cashRegisters, created]);
    }
    
    // Refresh branch registers count
    const freshBrs = await api.getBranches();
    setBranches(freshBrs);
    setShowRegisterModal(false);
  };

  const handleDeleteRegister = async (id: string) => {
    if (window.confirm('¿Deseas eliminar esta terminal de caja registradora?')) {
      await api.deleteCashRegister(id);
      setCashRegisters(cashRegisters.filter(r => r.id !== id));
      const freshBrs = await api.getBranches();
      setBranches(freshBrs);
    }
  };

  const handleToggleRegisterStatus = async (id: string) => {
    const updated = await api.toggleCashRegisterStatus(id, 'Operador de Turno');
    setCashRegisters(cashRegisters.map(r => r.id === updated.id ? updated : r));
  };

  // Smart TV Pairing Handlers
  const handleConfirmPairing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pairingCodeInput.trim()) return;
    setIsPairing(true);
    try {
      const paired = await api.pairTerminalWithCode(
        pairingCodeInput,
        pairingBranchId || branches[0]?.id || 'branch-1',
        pairingTerminalName
      );
      setCashRegisters(prev => [...prev, paired]);
      const freshBrs = await api.getBranches();
      setBranches(freshBrs);
      setShowPairingModal(false);
      setPairingCodeInput('');
      setPairingTerminalName('');
      alert(`¡Terminal física autorizada con éxito!\n\nSe ha emitido el Device Token para "${paired.name}". La app en la PC de caja quedó vinculada y lista para que los cajeros ingresen con su PIN.`);
    } catch {
      alert('Error al vincular terminal. Verifica el código e intenta nuevamente.');
    } finally {
      setIsPairing(false);
    }
  };

  const handleRevokeDevice = async (register: CashRegister) => {
    if (window.confirm(`¿Estás seguro de que deseas REVOCAR el acceso al equipo físico "${register.name}"?\n\nLa terminal perderá inmediatamente su Device Token y no podrá procesar ventas ni sincronizar hasta ser vinculada de nuevo por el dueño.`)) {
      const revoked = await api.revokeTerminalDevice(register.id);
      setCashRegisters(cashRegisters.map(r => r.id === revoked.id ? revoked : r));
      alert(`Acceso revocado. La terminal física "${register.name}" ha sido desvinculada.`);
    }
  };

  // Toggle Payment Method in Register Form
  const toggleMethod = (methodCode: string) => {
    if (formRegMethods.includes(methodCode)) {
      setFormRegMethods(formRegMethods.filter(m => m !== methodCode));
    } else {
      setFormRegMethods([...formRegMethods, methodCode]);
    }
  };

  // Toggle Allowed User in Register Form
  const toggleUser = (userId: string) => {
    if (formRegUsers.includes(userId)) {
      setFormRegUsers(formRegUsers.filter(u => u !== userId));
    } else {
      setFormRegUsers([...formRegUsers, userId]);
    }
  };

  // Set Coordinate Preset
  const setCoordPreset = (lat: string, lng: string) => {
    setFormBranchLat(lat);
    setFormBranchLng(lng);
  };

  // KPIs
  const totalActiveBranches = branches.filter(b => b.is_active).length;
  const totalActiveRegisters = cashRegisters.filter(r => r.is_active).length;
  const openRegistersCount = cashRegisters.filter(r => r.status === 'OPEN').length;
  const todaySalesTotal = cashRegisters.reduce((sum, r) => sum + (r.today_sales_total || 0), 0);

  // All Markers for Google Maps View
  const allMarkers: MapMarkerItem[] = [
    ...branches.map(b => ({
      id: b.id,
      name: b.name,
      lat: b.latitude || 10.6417,
      lng: b.longitude || -71.6125,
      type: 'branch' as const,
      subtitle: b.address,
      status: b.is_active ? 'Activa' : 'Inactiva'
    })),
    ...cashRegisters.map(r => {
      const parentB = branches.find(b => b.id === r.branch_id);
      return {
        id: r.id,
        name: r.name,
        lat: r.latitude || (parentB?.latitude ? parentB.latitude + 0.0003 : 10.6417),
        lng: r.longitude || (parentB?.longitude ? parentB.longitude + 0.0003 : -71.6125),
        type: 'register' as const,
        subtitle: r.location_name || r.branch_name || 'Terminal POS',
        status: r.status === 'OPEN' ? 'En Turno' : 'Cerrada'
      };
    })
  ];

  // Filters
  const filteredBranches = branches.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRegisters = cashRegisters.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.branch_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.hardware_uuid || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.location_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBranch = branchFilter === 'all' || r.branch_id === branchFilter;
    return matchesSearch && matchesBranch;
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Module Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 glass-panel p-3.5 sm:p-4 rounded-xl sm:rounded-2xl">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
            <Store className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 shrink-0" />
            <span>Control de Sedes y Cajas POS</span>
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-400 hidden xs:block">
            Administra tus sucursales físicas, georreferenciación GPS y límites de terminales
          </p>
        </div>

        {/* View Switcher & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center bg-slate-900 rounded-lg sm:rounded-xl p-1 border border-slate-800 text-xs overflow-x-auto">
            <button
              onClick={() => setActiveTab('branches')}
              className={`flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg font-semibold transition-all whitespace-nowrap text-xs ${activeTab === 'branches' ? 'bg-cyan-500/20 text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Store className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Sedes ({branches.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('registers')}
              className={`flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg font-semibold transition-all whitespace-nowrap text-xs ${activeTab === 'registers' ? 'bg-cyan-500/20 text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Monitor className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Cajas ({cashRegisters.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('map')}
              className={`flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg font-semibold transition-all whitespace-nowrap text-xs ${activeTab === 'map' ? 'bg-cyan-500/20 text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-500" />
              <span>Mapa</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
            <button
              onClick={() => {
                setPairingBranchId(branches[0]?.id || '');
                setShowPairingModal(true);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-lg sm:rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all"
            >
              <Tv className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Vincular</span>
              <span>Smart TV</span>
            </button>

            <button
              onClick={() => handleOpenRegisterModal()}
              className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl bg-slate-900 border border-slate-700/60 hover:bg-slate-800 text-cyan-400 font-semibold text-xs transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Caja</span>
            </button>

            <button
              onClick={() => handleOpenBranchModal()}
              className="flex items-center gap-1 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-md shadow-cyan-500/20 transition-all"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Sucursal</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Row - Compact 2x2 Grid on Mobile */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="glass-panel p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-800 flex items-center gap-2.5 sm:gap-3">
          <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
            <Store className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">Sucursales Activas</div>
            <div className="text-base sm:text-xl font-bold text-slate-100 truncate">{totalActiveBranches} Sedes</div>
          </div>
        </div>

        <div className="glass-panel p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-800 flex items-center gap-2.5 sm:gap-3">
          <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
            <Monitor className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">Cajas en Plan</div>
            <div className="text-base sm:text-xl font-bold text-blue-400 truncate">{totalActiveRegisters} / 6</div>
          </div>
        </div>

        <div className="glass-panel p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-800 flex items-center gap-2.5 sm:gap-3">
          <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">Turno Abierto</div>
            <div className="text-base sm:text-xl font-bold text-emerald-400 truncate">{openRegistersCount} Operando</div>
          </div>
        </div>

        <div className="glass-panel p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-800 flex items-center gap-2.5 sm:gap-3">
          <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">Ventas Hoy</div>
            <div className="text-base sm:text-xl font-bold text-purple-400 truncate">${todaySalesTotal.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Cash Register Capacity Guard Banner */}
      <div className="glass-panel p-4 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
              Capacidad y Gobernanza de Cajas (Xion-Pay Guard)
            </h4>
            <p className="text-xs text-slate-300 mt-0.5">
              Consumo actual: <strong className="text-white">{totalActiveRegisters} de 6 Cajas registradoras asignadas</strong> (33% cupo restante disponible).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400">¿Necesitas más puntos de venta?</span>
          <button 
            onClick={() => alert('Para añadir más cajas, dirígete al módulo de Mi Cuenta (Xion-Pay).')}
            className="text-xs font-bold text-cyan-400 hover:text-cyan-300 underline flex items-center gap-1"
          >
            <span>Adquirir Cajas Add-on</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={activeTab === 'branches' ? "Buscar sucursal por nombre o dirección..." : "Buscar caja registradora, terminal o sucursal..."}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {activeTab === 'registers' && (
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300">
              <Store className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={branchFilter}
                onChange={e => setBranchFilter(e.target.value)}
                className="bg-transparent text-slate-200 focus:outline-none text-xs"
              >
                <option value="all">Todas las Sedes</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          {activeTab === 'branches' && (
            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setViewMode('card')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'card' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-slate-200'}`}
                title="Vista Tarjetas"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-slate-200'}`}
                title="Vista Tabla"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================
          TAB 1: SUCURSALES (CARDS / LIST)
      ======================================================== */}
      {activeTab === 'branches' && (
        viewMode === 'card' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredBranches.map(b => (
              <div key={b.id} className="glass-panel p-6 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
                      <span>{b.name}</span>
                    </h4>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      {b.address}
                    </p>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${b.is_active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'}`}>
                    {b.is_active ? 'Sede Activa' : 'Mantenimiento'}
                  </span>
                </div>

                {/* Map Preview Graphic */}
                <div className="h-32 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent z-10"></div>
                  <div className="z-20 text-center space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-mono font-bold">
                      <MapPin className="w-3.5 h-3.5" />
                      GPS: {b.latitude?.toFixed(4)}, {b.longitude?.toFixed(4)}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium">
                      Encargado: <strong className="text-slate-200">{b.manager_name || 'No asignado'}</strong> • Tel: {b.phone}
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Monitor className="w-4 h-4 text-cyan-400" />
                    <span>Cajas registradoras: <strong className="text-white font-mono">{b.active_cash_registers_count} Activas</strong></span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        setBranchFilter(b.id);
                        setActiveTab('registers');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-400 font-semibold border border-slate-700 transition-colors"
                    >
                      Ver Cajas
                    </button>
                    <button 
                      onClick={() => handleOpenRegisterModal(undefined, b.id)}
                      className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20"
                      title="Agregar Caja a esta sede"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => handleOpenBranchModal(b)}
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-400"
                      title="Editar Sucursal"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteBranch(b.id)}
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400"
                      title="Eliminar Sucursal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="p-3.5 rounded-l-xl">Nombre Sucursal</th>
                  <th className="p-3.5">Dirección / Coordenadas</th>
                  <th className="p-3.5">Encargado</th>
                  <th className="p-3.5">Contacto</th>
                  <th className="p-3.5">Cajas Registradoras</th>
                  <th className="p-3.5 text-right rounded-r-xl">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredBranches.map(b => (
                  <tr key={b.id} className="hover:bg-slate-900/40">
                    <td className="p-3.5 font-bold text-slate-100">{b.name}</td>
                    <td className="p-3.5 text-xs text-slate-400">
                      <div>{b.address}</div>
                      <div className="text-[10px] text-cyan-400 font-mono">({b.latitude?.toFixed(4)}, {b.longitude?.toFixed(4)})</div>
                    </td>
                    <td className="p-3.5 text-xs font-semibold text-slate-200">{b.manager_name || 'Gerente General'}</td>
                    <td className="p-3.5 text-xs">{b.phone}</td>
                    <td className="p-3.5 font-semibold text-cyan-400 font-mono">{b.active_cash_registers_count} Cajas</td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setBranchFilter(b.id);
                            setActiveTab('registers');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-cyan-400 font-semibold hover:bg-slate-800"
                        >
                          Cajas
                        </button>
                        <button
                          onClick={() => handleOpenBranchModal(b)}
                          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-400"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteBranch(b.id)}
                          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400"
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
        )
      )}

      {/* ========================================================
          TAB 2: CAJAS REGISTRADORAS Y TERMINALES POS
      ======================================================== */}
      {activeTab === 'registers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRegisters.map(r => (
            <div key={r.id} className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4">
              <div>
                {/* Header: Name and Status Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                      <Monitor className="w-4 h-4 text-cyan-400" />
                      {r.name}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-medium">{r.branch_name}</p>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {r.status === 'OPEN' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        EN TURNO
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700/50">
                        <Clock className="w-3 h-3" />
                        CERRADA
                      </span>
                    )}

                    {r.device_paired ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        <Tv className="w-2.5 h-2.5" />
                        <span>EQUIPO AUTORIZADO</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <KeyRound className="w-2.5 h-2.5" />
                        <span>PENDIENTE SMART TV</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Hardware UUID and Operator */}
                <div className="mt-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Hardware UUID:</span>
                    <span className="font-mono text-[11px] text-slate-200">{r.hardware_uuid}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Operador actual:</span>
                    <span className="font-bold text-slate-100">{r.current_operator || 'Ninguno (Turno cerrado)'}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-800/60">
                    <span>Ventas hoy:</span>
                    <span className="font-bold text-emerald-400 font-mono">${(r.today_sales_total || 0).toFixed(2)}</span>
                  </div>
                  {r.latitude && r.longitude && (
                    <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-800/60">
                      <span className="flex items-center gap-1 text-[11px]">
                        <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                        Ubicación:
                      </span>
                      <a
                        href={`https://www.google.com/maps?q=${r.latitude},${r.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:text-cyan-300 font-medium text-[11px] hover:underline flex items-center gap-1 truncate max-w-[170px]"
                        title="Ver en Google Maps"
                      >
                        <span className="truncate">{r.location_name || `${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}`}</span>
                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Allowed Payment Methods Badges */}
                <div className="mt-3">
                  <div className="text-[10px] text-slate-400 font-semibold mb-1.5">Métodos de Cobro Permitidos:</div>
                  <div className="flex flex-wrap gap-1">
                    {r.payment_methods.map(m => (
                      <span key={m} className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-semibold text-slate-300">
                        {m === 'CASH_USD' ? '$ Efectivo' : m === 'CASH_BS' ? 'Bs. Efectivo' : m === 'PAGO_MOVIL' ? 'Pago Móvil' : m === 'DEBIT_CARD' ? 'Tarjeta / POS' : m}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleToggleRegisterStatus(r.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    r.status === 'OPEN' 
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20' 
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                  }`}
                >
                  <Power className="w-3 h-3" />
                  <span>{r.status === 'OPEN' ? 'Cerrar Turno' : 'Abrir Turno'}</span>
                </button>

                <div className="flex items-center gap-1.5">
                  {r.device_paired && (
                    <button
                      onClick={() => handleRevokeDevice(r)}
                      className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20"
                      title="Revocar acceso a este equipo físico (1 Clic)"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => setAuditModalRegister(r)}
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-400"
                    title="Bitácora y Turnos"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleOpenRegisterModal(r)}
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-400"
                    title="Editar Configuración de Caja"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteRegister(r.id)}
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400"
                    title="Eliminar Caja"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================
          TAB 3: MAPA GLOBAL DE SEDES Y TERMINALES DE CAJA
      ======================================================== */}
      {activeTab === 'map' && (
        <div className="space-y-4">
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-500" />
                Red Geográfica de Cajas POS y Sucursales (Estilo Google Maps)
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Explora en tiempo real la distribución espacial de {branches.length} sucursales y {cashRegisters.length} terminales de cobro
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                <Store className="w-3 h-3" />
                Sucursal ({branches.length})
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                <Monitor className="w-3 h-3" />
                Caja POS ({cashRegisters.length})
              </span>
            </div>
          </div>

          <div className="glass-panel p-2 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
            <LocationMapPicker
              latitude={branches[0]?.latitude || 10.6417}
              longitude={branches[0]?.longitude || -71.6125}
              height="580px"
              markers={allMarkers}
              selectedMarkerId={selectedOverviewMarkerId}
              onMarkerSelect={(marker) => {
                setSelectedOverviewMarkerId(marker.id);
              }}
            />
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 1: NUEVA / EDITAR SUCURSAL
      ======================================================== */}
      {showBranchModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Store className="w-5 h-5 text-cyan-400" />
                {editingBranch ? 'Editar Sucursal' : 'Registrar Nueva Sucursal'}
              </h4>
              <button onClick={() => setShowBranchModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBranch} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nombre Descriptivo de la Sucursal *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Sucursal Este - CC Sambil"
                  value={formBranchName}
                  onChange={e => setFormBranchName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Dirección Fiscal / Ubicación *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Av. Principal, Edificio X, Nivel PB..."
                  value={formBranchAddress}
                  onChange={e => setFormBranchAddress(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Teléfono de Contacto</label>
                  <input
                    type="text"
                    value={formBranchPhone}
                    onChange={e => setFormBranchPhone(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Gerente / Encargado</label>
                  <select
                    value={formBranchManagerId}
                    onChange={e => setFormBranchManagerId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-200"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Geolocation Section: Hidden Lat/Lng with LocationPickerModal */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                      <MapPin className="w-4 h-4 text-rose-500" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-100 text-xs block">
                        Ubicación Geográfica en Mapa
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {formBranchLat && formBranchLng && parseFloat(formBranchLat) !== 0
                          ? '📍 Coordenadas fijadas para el local'
                          : 'Pendiente de definir ubicación en el mapa'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowBranchLocationModal(true)}
                    className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
                  >
                    <MapPin className="w-3.5 h-3.5 text-rose-500" />
                    <span>
                      {formBranchLat && formBranchLng && parseFloat(formBranchLat) !== 0
                        ? 'Ajustar en mapa'
                        : 'Fijar en mapa'}
                    </span>
                  </button>
                </div>

                {formBranchLat && formBranchLng && parseFloat(formBranchLat) !== 0 ? (
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-[11px]">
                    <div className="flex items-center gap-2 text-emerald-400 font-medium">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Ubicación confirmada para esta sucursal</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowBranchLocationModal(true)}
                      className="text-cyan-400 hover:text-cyan-300 font-semibold underline text-[11px]"
                    >
                      Ajustar punto
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
                    <span>💡 Usa el botón para capturar GPS actual o buscar dirección sin tipear coordenadas.</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowBranchModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-slate-400 hover:bg-slate-800 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold shadow-md shadow-cyan-500/20"
                >
                  {editingBranch ? 'Guardar Cambios' : 'Registrar Sucursal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: NUEVA / EDITAR CAJA REGISTRADORA
      ======================================================== */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Monitor className="w-5 h-5 text-cyan-400" />
                {editingRegister ? 'Editar Terminal de Caja' : 'Registrar Terminal de Caja POS'}
              </h4>
              <button onClick={() => setShowRegisterModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRegister} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nombre / Identificador de la Caja *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Caja 01 - Principal"
                  value={formRegName}
                  onChange={e => setFormRegName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Sucursal Asignada *</label>
                  <select
                    value={formRegBranchId}
                    onChange={e => {
                      const newBranchId = e.target.value;
                      setFormRegBranchId(newBranchId);
                      const targetBranch = branches.find(b => b.id === newBranchId);
                      if (targetBranch) {
                        if (targetBranch.latitude) setFormRegLat(targetBranch.latitude.toString());
                        if (targetBranch.longitude) setFormRegLng(targetBranch.longitude.toString());
                        if (!formRegLocationName || branches.some(b => formRegLocationName.includes(b.name))) {
                          setFormRegLocationName(`${targetBranch.name} - Mostrador Principal`);
                        }
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-200"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Hardware UUID / Serie</label>
                  <input
                    type="text"
                    value={formRegHardwareUuid}
                    onChange={e => setFormRegHardwareUuid(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Inherited Location from Selected Branch (No separate map selector needed) */}
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                      <MapPin className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-200 text-xs block">
                        Ubicación Física de la Caja
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Heredada automáticamente de la sucursal asignada ({branches.find(b => b.id === formRegBranchId)?.name || 'Sucursal Asignada'}).
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Vinculada</span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] font-semibold mb-1">
                    Referencia Interna / Mostrador de la Caja
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Mostrador Principal - Pasillo 1"
                    value={formRegLocationName}
                    onChange={e => setFormRegLocationName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Payment Methods Toggle */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5">Métodos de Cobro Habilitados</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {availablePaymentMethods.length > 0 ? (
                    availablePaymentMethods.map(pm => {
                      const isChecked = formRegMethods.some(m => m.toLowerCase() === pm.code.toLowerCase());
                      return (
                        <div
                          key={pm.id}
                          onClick={() => {
                            if (isChecked) {
                              setFormRegMethods(formRegMethods.filter(m => m.toLowerCase() !== pm.code.toLowerCase()));
                            } else {
                              setFormRegMethods([...formRegMethods, pm.code]);
                            }
                          }}
                          className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                            isChecked 
                              ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300 font-bold' 
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <CreditCard className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate text-xs">{pm.name}</span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500 shrink-0">({pm.currency})</span>
                        </div>
                      );
                    })
                  ) : (
                    [
                      { id: 'CASH_USD', label: 'Efectivo Dólares ($)', icon: Banknote },
                      { id: 'CASH_BS', label: 'Efectivo Bolívares (Bs)', icon: Banknote },
                      { id: 'PAGO_MOVIL', label: 'Pago Móvil C2P/P2P', icon: Smartphone },
                      { id: 'DEBIT_CARD', label: 'Punto de Venta / Tarjeta', icon: CreditCard },
                      { id: 'ZELLE', label: 'Zelle / Transferencia', icon: DollarSign },
                    ].map(m => {
                      const isChecked = formRegMethods.includes(m.id);
                      return (
                        <div
                          key={m.id}
                          onClick={() => toggleMethod(m.id)}
                          className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                            isChecked 
                              ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300 font-bold' 
                              : 'bg-slate-900 border-slate-800 text-slate-400'
                          }`}
                        >
                          <m.icon className="w-3.5 h-3.5 shrink-0" />
                          <span>{m.label}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>


              {/* Allowed Cashiers Multiselect */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5">Cajeros / Operadores Autorizados</label>
                <div className="max-h-32 overflow-y-auto space-y-1 bg-slate-900 p-2 rounded-xl border border-slate-800">
                  {users.map(u => {
                    const isUserChecked = formRegUsers.includes(u.id);
                    return (
                      <div
                        key={u.id}
                        onClick={() => toggleUser(u.id)}
                        className={`p-2 rounded-lg text-xs flex items-center justify-between cursor-pointer ${
                          isUserChecked ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span>{u.full_name} ({u.role})</span>
                        <span className="text-[10px]">{isUserChecked ? '✓ Autorizado' : '+ Asignar'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-slate-400 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold shadow-md shadow-cyan-500/20"
                >
                  {editingRegister ? 'Guardar Cambios' : 'Vincular Caja'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: BITÁCORA AUDITABLE Y TURNOS DE CAJA
      ======================================================== */}
      {auditModalRegister && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-xl p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                Bitácora de Turnos: {auditModalRegister.name}
              </h4>
              <button onClick={() => setAuditModalRegister(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400">Sucursal:</span>
                <div className="font-bold text-slate-100">{auditModalRegister.branch_name}</div>
              </div>
              <div>
                <span className="text-slate-400">Hardware UUID:</span>
                <div className="font-mono text-cyan-400">{auditModalRegister.hardware_uuid}</div>
              </div>
              <div>
                <span className="text-slate-400">Estado:</span>
                <div className={`font-bold ${auditModalRegister.status === 'OPEN' ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {auditModalRegister.status === 'OPEN' ? 'Abierta' : 'Cerrada'}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-200">Historial de Turnos y Arqueos Sincronizados:</div>
              <div className="max-h-60 overflow-y-auto space-y-2 text-xs">
                {cashSessions.map(s => (
                  <div key={s.id} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-200 flex items-center gap-1.5">
                        <span>{s.cash_register_name}</span>
                        <span className="text-[10px] text-slate-400 font-normal">por {s.opened_by}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Apertura: {s.opened_at} {s.closed_at ? `• Cierre: ${s.closed_at}` : '• Turno en curso'}
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <div className="font-bold text-slate-100">${s.declared_cash?.toFixed(2) || s.initial_cash.toFixed(2)}</div>
                      <div className={`text-[10px] font-bold ${s.difference === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {s.difference === 0 ? '✓ Sin descuadre' : `Dif: $${s.difference?.toFixed(2)}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setAuditModalRegister(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-slate-300 font-semibold text-xs hover:bg-slate-800"
              >
                Cerrar Bitácora
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de Selección de Ubicación para Sucursal */}
      <LocationPickerModal
        isOpen={showBranchLocationModal}
        onClose={() => setShowBranchLocationModal(false)}
        initialLat={parseFloat(formBranchLat) || undefined}
        initialLng={parseFloat(formBranchLng) || undefined}
        initialAddress={formBranchAddress}
        title={`Ubicación de ${formBranchName || 'la Sucursal'}`}
        onConfirm={({ lat, lng, address }) => {
          setFormBranchLat(lat.toFixed(6));
          setFormBranchLng(lng.toFixed(6));
          if (address && !formBranchAddress) {
            setFormBranchAddress(address);
          }
        }}
      />


      {/* ========================================================
          MODAL: VINCULAR TERMINAL CON CÓDIGO SMART TV
      ======================================================== */}
      {showPairingModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg p-6 rounded-2xl border border-slate-800 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Tv className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-100">Vincular Nueva Caja (Flujo Smart TV)</h4>
                  <p className="text-[11px] text-slate-400">Autoriza la PC física sin ingresar tu contraseña de dueño</p>
                </div>
              </div>
              <button onClick={() => setShowPairingModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmPairing} className="space-y-4 text-xs">
              {/* Código Smart TV de 6 caracteres */}
              <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800/80 text-center space-y-2">
                <label className="block text-slate-300 font-bold text-xs uppercase tracking-wider">
                  Código de 6 Caracteres de la Pantalla
                </label>
                <p className="text-[11px] text-slate-400">
                  Abre la app en la PC de caja y escribe el código que se muestra (ej: <span className="font-mono text-cyan-400 font-bold">X9-B42</span>):
                </p>
                <input
                  type="text"
                  required
                  maxLength={7}
                  placeholder="X9-B42"
                  value={pairingCodeInput}
                  onChange={e => setPairingCodeInput(e.target.value.toUpperCase())}
                  className="w-48 mx-auto text-center font-mono text-2xl font-extrabold tracking-widest bg-slate-900 border-2 border-cyan-500/60 rounded-xl py-2 px-3 text-cyan-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/30 uppercase block"
                />
              </div>

              {/* Sede y Nombre de Caja */}
              <div className="space-y-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Sucursal de Destino *</label>
                  <select
                    value={pairingBranchId}
                    onChange={e => setPairingBranchId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-semibold"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({b.address.slice(0, 30)}...)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Nombre Descriptivo de la Caja *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Caja Principal - Pasillo 1"
                    value={pairingTerminalName}
                    onChange={e => setPairingTerminalName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100"
                  />
                </div>
              </div>

              {/* Security Benefit Callout */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Máxima Seguridad:</strong> La terminal física recibirá un <em>Device Token</em> exclusivo. Los cajeros sólo necesitarán su PIN numérico para abrir turno, y puedes revocar el acceso a esta máquina remotamente en cualquier momento.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowPairingModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-slate-400 hover:bg-slate-800 font-semibold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPairing || !pairingCodeInput.trim()}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
                >
                  {isPairing ? 'Autorizando Equipo...' : 'Autorizar y Vincular Equipo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchesPage;

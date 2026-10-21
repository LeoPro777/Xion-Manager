import React, { useState, useEffect } from 'react';
import { 
  Building2, UserCheck, Settings, CreditCard, CheckCircle2, 
  ArrowRight, ArrowLeft, ShieldCheck, Zap, Plus, Trash2, 
  Sparkles, DollarSign, Percent, RefreshCw, Palette, Globe,
  Check, Store, ChevronRight
} from 'lucide-react';
import { User, XionPayPlan, SystemPreferences } from '../types';
import { api, applySystemPreferences, DEFAULT_PREFERENCES } from '../services/api';

interface OnboardingWizardModalProps {
  currentUser: User;
  onCompleted: (updatedUser: User) => void;
}

interface AdditionalCompany {
  id: string;
  trade_name: string;
  legal_name: string;
  tax_id: string;
  address: string;
}

export const OnboardingWizardModal: React.FC<OnboardingWizardModalProps> = ({ 
  currentUser, 
  onCompleted 
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<XionPayPlan[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Paso 1: Datos Personales y Compañía(s)
  const [fullName, setFullName] = useState(currentUser.full_name || '');
  const [personalPhone, setPersonalPhone] = useState(currentUser.phone || '');
  const [companyTradeName, setCompanyTradeName] = useState('Mi Comercio Xion');
  const [companyLegalName, setCompanyLegalName] = useState('Inversiones Xion C.A.');
  const [companyTaxId, setCompanyTaxId] = useState('J-50123456-7');
  const [companyPhone, setCompanyPhone] = useState('+58 414-1234567');
  const [companyEmail, setCompanyEmail] = useState(currentUser.email || 'contacto@xion.com');
  const [companyAddress, setCompanyAddress] = useState('Av. Principal, Edificio Central, Piso 1');
  
  // Múltiples Compañías
  const [additionalCompanies, setAdditionalCompanies] = useState<AdditionalCompany[]>([]);
  const [showAddCompanyForm, setShowAddCompanyForm] = useState(false);
  const [newCompTrade, setNewCompTrade] = useState('');
  const [newCompLegal, setNewCompLegal] = useState('');
  const [newCompTaxId, setNewCompTaxId] = useState('');

  // Paso 2: Configuraciones y Preferencias
  const [currencySymbol, setCurrencySymbol] = useState('Bs.');
  const [exchangeRate, setExchangeRate] = useState(36.50);
  const [taxRate, setTaxRate] = useState(16.00);
  const [enableTaxes, setEnableTaxes] = useState(true);
  const [autoSyncPos, setAutoSyncPos] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState<'dark' | 'light'>('dark');
  const [dateFormat, setDateFormat] = useState<'DD/MM/YYYY' | 'YYYY-MM-DD'>('DD/MM/YYYY');
  const [lowStockAlert, setLowStockAlert] = useState(true);

  // Paso 3: Selección de Plan (Plan Gratuito 30 Días primero)
  const [selectedPlanCode, setSelectedPlanCode] = useState('TRIAL');
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<'MONTHLY' | 'SEMIANNUAL' | 'ANNUAL'>('MONTHLY');

  useEffect(() => {
    // Cargar catálogo de planes (con Plan Gratuito 30 días de primero)
    api.getXionPayPlans().then((fetchedPlans) => {
      if (fetchedPlans && fetchedPlans.length > 0) {
        setPlans(fetchedPlans);
      } else {
        setPlans([
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
          }
        ]);
      }
    });

    api.getExchangeRate().then((rate) => {
      if (rate?.current_exchange_rate_bs) {
        setExchangeRate(rate.current_exchange_rate_bs);
      }
    }).catch(() => {});
  }, []);

  const handleAddAdditionalCompany = () => {
    if (!newCompTrade.trim() || !newCompTaxId.trim()) return;
    const item: AdditionalCompany = {
      id: `comp-${Date.now()}`,
      trade_name: newCompTrade,
      legal_name: newCompLegal || newCompTrade,
      tax_id: newCompTaxId,
      address: companyAddress
    };
    setAdditionalCompanies([...additionalCompanies, item]);
    setNewCompTrade('');
    setNewCompLegal('');
    setNewCompTaxId('');
    setShowAddCompanyForm(false);
  };

  const handleRemoveCompany = (id: string) => {
    setAdditionalCompanies(additionalCompanies.filter((c) => c.id !== id));
  };

  const handleCompleteOnboarding = async () => {
    setErrorMsg(null);
    setLoading(true);

    try {
      // 1. Guardar preferencias locales
      const updatedPrefs: SystemPreferences = {
        ...DEFAULT_PREFERENCES,
        theme_mode: selectedTheme,
        sync_with_pos: autoSyncPos
      };
      await api.updatePreferences(updatedPrefs);
      applySystemPreferences(updatedPrefs);

      // 2. Preparar payload de onboarding
      const payload = {
        user_id: currentUser.id,
        full_name: fullName,
        phone: personalPhone,
        primary_company: {
          trade_name: companyTradeName,
          legal_name: companyLegalName,
          tax_id: companyTaxId,
          phone: companyPhone,
          email: companyEmail,
          address: companyAddress
        },
        additional_companies: additionalCompanies.map(c => ({
          trade_name: c.trade_name,
          legal_name: c.legal_name,
          tax_id: c.tax_id,
          address: c.address
        })),
        currency_symbol: currencySymbol,
        current_exchange_rate_bs: Number(exchangeRate),
        tax_rate: Number(taxRate),
        enable_taxes: enableTaxes,
        auto_sync_pos: autoSyncPos,
        preferences: updatedPrefs,
        plan_code: selectedPlanCode,
        billing_cycle: selectedBillingCycle
      };

      await api.completeOnboarding(payload);

      // 3. Registrar en localStorage para persistencia offline y de sesión
      localStorage.setItem(`xion_onboarding_completed_${currentUser.id}`, 'true');

      const updatedUser: User = {
        ...currentUser,
        full_name: fullName,
        phone: personalPhone,
        onboarding_completed: true
      };
      localStorage.setItem('xion_user', JSON.stringify(updatedUser));

      onCompleted(updatedUser);
    } catch (err: any) {
      console.error('Error completando onboarding:', err);
      setErrorMsg(err.message || 'Error al completar la configuración inicial');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-300">
      {/* Background Neon Lights */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-[550px] h-[350px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-1/4 left-1/3 w-[400px] h-[300px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-3xl bg-slate-900/95 border border-cyan-500/30 rounded-3xl shadow-2xl shadow-cyan-950/40 overflow-hidden relative z-10 flex flex-col my-auto max-h-[92vh]">
        
        {/* Modal Top Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800/80 bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Bienvenido a Xion-Manager
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-0.5">
                Configuración Inicial de tu Cuenta
              </h2>
            </div>
          </div>

          {/* Stepper Wizard Progress */}
          <div className="flex items-center gap-2">
            {[
              { num: 1, label: 'Empresa', icon: Building2 },
              { num: 2, label: 'Sistema', icon: Settings },
              { num: 3, label: 'Plan', icon: CreditCard }
            ].map((s) => {
              const Icon = s.icon;
              const isActive = step === s.num;
              const isDone = step > s.num;
              return (
                <div key={s.num} className="flex items-center gap-1.5">
                  <div className={`flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold transition-all border ${
                    isActive 
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/30' 
                      : isDone
                      ? 'bg-slate-800 text-emerald-400 border-emerald-500/40'
                      : 'bg-slate-900/60 text-slate-500 border-slate-800'
                  }`}>
                    {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Icon className="w-3.5 h-3.5" />}
                    <span className="hidden xs:inline">{s.label}</span>
                  </div>
                  {s.num < 3 && <div className="w-3 h-0.5 bg-slate-800" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-6 flex-1 text-slate-200">
          
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ============================================================ */}
          {/* PASO 1: DATOS PERSONALES Y DE LA COMPAÑÍA (O COMPAÑÍAS)       */}
          {/* ============================================================ */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Sección Personal */}
              <div className="bg-slate-950/50 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                  <UserCheck className="w-4 h-4" />
                  <span>1. Tus Datos Personales de Acceso</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Nombre Completo *</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ej. Roberto Morales"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Teléfono Personal / WhatsApp *</label>
                    <input
                      type="text"
                      value={personalPhone}
                      onChange={(e) => setPersonalPhone(e.target.value)}
                      placeholder="+58 414-1234567"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>
              </div>

              {/* Sección Compañía Principal */}
              <div className="bg-slate-950/50 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                    <Building2 className="w-4 h-4" />
                    <span>2. Datos de tu Compañía Principal</span>
                  </div>
                  <span className="text-[10px] text-cyan-300 bg-cyan-950/80 border border-cyan-800 px-2 py-0.5 rounded-full font-mono">
                    Sede Matriz
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Nombre Comercial (Marca) *</label>
                    <input
                      type="text"
                      value={companyTradeName}
                      onChange={(e) => setCompanyTradeName(e.target.value)}
                      placeholder="Ej. Supermercados Xion"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Razón Social Legal *</label>
                    <input
                      type="text"
                      value={companyLegalName}
                      onChange={(e) => setCompanyLegalName(e.target.value)}
                      placeholder="Ej. Comercializadora Xion C.A."
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">RIF / Identificación Fiscal *</label>
                    <input
                      type="text"
                      value={companyTaxId}
                      onChange={(e) => setCompanyTaxId(e.target.value)}
                      placeholder="Ej. J-12345678-9"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Teléfono Comercial *</label>
                    <input
                      type="text"
                      value={companyPhone}
                      onChange={(e) => setCompanyPhone(e.target.value)}
                      placeholder="+58 212-9876543"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-slate-400 font-semibold mb-1">Dirección Fiscal / Principal *</label>
                    <input
                      type="text"
                      value={companyAddress}
                      onChange={(e) => setCompanyAddress(e.target.value)}
                      placeholder="Calle, Sector, Ciudad, Estado"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>
              </div>

              {/* Múltiples Compañías */}
              <div className="bg-slate-950/30 p-4 rounded-2xl border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-300">¿Operas múltiples compañías o marcas?</span>
                    <p className="text-[11px] text-slate-500">Puedes registrar otras razones sociales vinculadas a tu cuenta multi-sucursal.</p>
                  </div>
                  {!showAddCompanyForm && (
                    <button
                      type="button"
                      onClick={() => setShowAddCompanyForm(true)}
                      className="px-3 py-1.5 rounded-xl border border-cyan-500/40 bg-cyan-950/30 hover:bg-cyan-900/40 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar Compañía</span>
                    </button>
                  )}
                </div>

                {/* Lista de compañías adicionales */}
                {additionalCompanies.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {additionalCompanies.map((c) => (
                      <div key={c.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                        <div className="flex items-center gap-2">
                          <Store className="w-4 h-4 text-cyan-400" />
                          <div>
                            <span className="font-bold text-white">{c.trade_name}</span>
                            <span className="text-slate-400 ml-2">({c.tax_id})</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCompany(c.id)}
                          className="text-red-400 hover:text-red-300 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Formulario rápido para añadir otra compañía */}
                {showAddCompanyForm && (
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-cyan-500/30 space-y-3 text-xs animate-in fade-in">
                    <span className="font-bold text-cyan-300 block">Nueva Compañía Adicional</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Nombre Comercial"
                        value={newCompTrade}
                        onChange={(e) => setNewCompTrade(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100"
                      />
                      <input
                        type="text"
                        placeholder="Razón Social Legal"
                        value={newCompLegal}
                        onChange={(e) => setNewCompLegal(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100"
                      />
                      <input
                        type="text"
                        placeholder="RIF (Ej. J-88776655-4)"
                        value={newCompTaxId}
                        onChange={(e) => setNewCompTaxId(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddCompanyForm(false)}
                        className="px-3 py-1 rounded-lg text-slate-400 hover:text-slate-200"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleAddAdditionalCompany}
                        className="px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
                      >
                        Guardar Compañía
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ============================================================ */}
          {/* PASO 2: CONFIGURACIONES DEL SISTEMA Y PREFERENCIAS            */}
          {/* ============================================================ */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Parámetros Financieros y Cambiarios */}
              <div className="bg-slate-950/50 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                  <DollarSign className="w-4 h-4" />
                  <span>1. Moneda, Tasa Cambiaria e Impuestos</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Selector de Símbolo de Moneda */}
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1.5">Moneda Base de Facturación</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setCurrencySymbol('Bs.')}
                        className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all ${
                          currencySymbol === 'Bs.' 
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm' 
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span>Bs. (Bolívares)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrencySymbol('$')}
                        className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all ${
                          currencySymbol === '$' 
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm' 
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span>$ (Dólares USD)</span>
                      </button>
                    </div>
                  </div>

                  {/* Tasa de Cambio de Referencia */}
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1.5">Tasa de Cambio Oficial (Bs. / USD)</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        value={exchangeRate}
                        onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-100 font-mono font-bold focus:outline-none focus:border-cyan-400"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">BCV / Mercado</span>
                    </div>
                  </div>

                  {/* Impuestos IVA */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-slate-400 font-semibold">Tasa IVA (%)</label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enableTaxes}
                          onChange={(e) => setEnableTaxes(e.target.checked)}
                          className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                        />
                        <span className="text-[11px] text-slate-300">Activar IVA</span>
                      </label>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.5"
                        disabled={!enableTaxes}
                        value={taxRate}
                        onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-100 font-mono disabled:opacity-40 focus:outline-none focus:border-cyan-400"
                      />
                      <Percent className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  {/* Sincronización POS */}
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1.5">Sincronización POS Automática</label>
                    <div 
                      onClick={() => setAutoSyncPos(!autoSyncPos)}
                      className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between cursor-pointer hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <RefreshCw className={`w-4 h-4 ${autoSyncPos ? 'text-emerald-400 animate-spin-slow' : 'text-slate-500'}`} />
                        <span className="text-xs text-slate-300 font-medium">Auto-sincronizar ventas y arqueos</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        autoSyncPos ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {autoSyncPos ? 'ACTIVO' : 'PAUSADO'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preferencias Visuales y Notificaciones */}
              <div className="bg-slate-950/50 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                  <Palette className="w-4 h-4" />
                  <span>2. Preferencias de Visualización y Alertas</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1.5">Tema de la Interfaz</label>
                    <select
                      value={selectedTheme}
                      onChange={(e) => setSelectedTheme(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-400"
                    >
                      <option value="dark">Dark Neon Cyan (Recomendado)</option>
                      <option value="light">Modo Claro (Clásico)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1.5">Formato de Fecha</label>
                    <select
                      value={dateFormat}
                      onChange={(e) => setDateFormat(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-400"
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY (Latam)</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1.5">Alertas de Inventario</label>
                    <button
                      type="button"
                      onClick={() => setLowStockAlert(!lowStockAlert)}
                      className={`w-full py-2 px-3 rounded-xl border text-center font-bold transition-all ${
                        lowStockAlert
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-slate-900 text-slate-500 border-slate-800'
                      }`}
                    >
                      {lowStockAlert ? 'Notificar Stock Bajo' : 'Silenciar Alertas'}
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ============================================================ */}
          {/* PASO 3: ELECCIÓN DE PLAN (PLAN GRATUITO 30 DÍAS DE PRIMERO)  */}
          {/* ============================================================ */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="text-center space-y-1">
                <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-widest">
                  Operatividad Garantizada
                </span>
                <h3 className="text-base sm:text-lg font-black text-white">
                  Selecciona el Plan para tu Negocio
                </h3>
                <p className="text-xs text-slate-400 max-w-lg mx-auto">
                  Comienza de inmediato con el <strong className="text-cyan-300">Plan Gratuito por 30 Días</strong> con todas las funciones habilitadas sin compromiso.
                </p>
              </div>

              {/* Selector de Ciclo de Facturación (para planes comerciales) */}
              <div className="flex justify-center">
                <div className="inline-flex p-1 rounded-2xl bg-slate-950 border border-slate-800 gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedBillingCycle('MONTHLY')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                      selectedBillingCycle === 'MONTHLY' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Mensual
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedBillingCycle('SEMIANNUAL')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                      selectedBillingCycle === 'SEMIANNUAL' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>Semestral</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500 text-slate-950 font-black">10% OFF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedBillingCycle('ANNUAL')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                      selectedBillingCycle === 'ANNUAL' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>Anual</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500 text-slate-950 font-black">20% OFF</span>
                  </button>
                </div>
              </div>

              {/* Cards de Planes (El Gratuito de Primero) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
                {plans.map((p) => {
                  const isTrial = p.code.toUpperCase() === 'TRIAL';
                  const isSelected = selectedPlanCode.toUpperCase() === p.code.toUpperCase();
                  
                  const price = isTrial 
                    ? 0.00 
                    : selectedBillingCycle === 'ANNUAL' 
                    ? (p.price_annual / 12) 
                    : selectedBillingCycle === 'SEMIANNUAL'
                    ? (p.price_semiannual / 6)
                    : p.price_monthly;

                  return (
                    <div
                      key={p.code}
                      onClick={() => setSelectedPlanCode(p.code.toUpperCase())}
                      className={`relative rounded-2xl p-4 sm:p-5 border cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'bg-gradient-to-b from-cyan-950/40 to-slate-900 border-cyan-400 shadow-xl shadow-cyan-500/10 scale-[1.02]'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Badge superior */}
                      {isTrial && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow-md shadow-cyan-500/30 flex items-center gap-1">
                          <Zap className="w-3 h-3 fill-slate-950" />
                          <span>30 Días Gratis</span>
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-sm text-white">{p.name}</span>
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                            isSelected ? 'bg-cyan-500 border-cyan-400 text-slate-950' : 'border-slate-700'
                          }`}>
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-400 mt-1 min-h-[32px] line-clamp-2">
                          {p.description}
                        </p>

                        {/* Precio */}
                        <div className="my-3 pt-3 border-t border-slate-800/80 flex items-baseline gap-1">
                          <span className="text-2xl font-black text-white">
                            {isTrial ? '$0' : `$${price.toFixed(0)}`}
                          </span>
                          <span className="text-xs text-slate-400">
                            {isTrial ? '/ por 30 días' : '/ mes'}
                          </span>
                        </div>

                        {/* Características */}
                        <ul className="space-y-1.5 text-[11px] text-slate-300">
                          <li className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span>Hasta <strong>{p.max_branches} {p.max_branches === 1 ? 'Sucursal' : 'Sucursales'}</strong></span>
                          </li>
                          <li className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span>Hasta <strong>{p.max_cash_registers} {p.max_cash_registers === 1 ? 'Caja POS' : 'Cajas POS'}</strong></span>
                          </li>
                          <li className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span>Sincronización POS en la nube</span>
                          </li>
                          <li className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span>Control de inventario y compras</span>
                          </li>
                        </ul>
                      </div>

                      {/* Botón de selección dentro de la card */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPlanCode(p.code.toUpperCase());
                        }}
                        className={`w-full mt-4 py-2 rounded-xl text-xs font-bold transition-all ${
                          isSelected
                            ? isTrial
                              ? 'bg-gradient-to-r from-emerald-400 to-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25'
                              : 'bg-cyan-500 text-slate-950 shadow-md'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                        }`}
                      >
                        {isSelected ? (isTrial ? 'Plan Gratuito Seleccionado' : 'Plan Seleccionado') : 'Seleccionar'}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Banner de Garantía Xion-Pay */}
              <div className="p-3.5 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0" />
                <p className="text-xs text-slate-300 leading-relaxed">
                  Con el <strong>Plan Gratuito por 30 Días</strong> tu licencia se activa al instante con todas las capacidades del sistema. Puedes migrar o cambiar de plan cuando gustes.
                </p>
              </div>

            </div>
          )}

        </div>

        {/* Modal Bottom Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800/80 bg-slate-900/90 flex items-center justify-between">
          <div>
            {step > 1 ? (
              <button
                type="button"
                disabled={loading}
                onClick={() => setStep((step - 1) as any)}
                className="px-4 py-2 rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-800/80 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Atrás</span>
              </button>
            ) : (
              <span className="text-[11px] text-slate-500 hidden sm:inline">Paso 1 de 3: Identidad y Empresas</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step < 3 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 1 && (!fullName.trim() || !companyTradeName.trim() || !companyTaxId.trim())) {
                    setErrorMsg('Por favor completa el nombre, el nombre comercial y el RIF de la empresa.');
                    return;
                  }
                  setErrorMsg(null);
                  setStep((step + 1) as any);
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all"
              >
                <span>Continuar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                disabled={loading}
                onClick={handleCompleteOnboarding}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 hover:from-emerald-300 hover:to-cyan-300 text-slate-950 font-black text-xs shadow-xl shadow-cyan-500/30 flex items-center gap-2 transition-all active:scale-95"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Activando tu Cuenta...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    <span>Completar e Iniciar Operaciones</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

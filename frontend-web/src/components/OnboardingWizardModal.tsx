import React, { useState, useEffect } from 'react';
import { 
  Building2, UserCheck, Settings, CreditCard, CheckCircle2, 
  ArrowRight, ArrowLeft, ShieldCheck, Zap, Plus, Trash2, 
  Sparkles, DollarSign, Percent, RefreshCw, Palette, Globe,
  Check, Store, ChevronRight, Crown, Boxes, Package, 
  FileSpreadsheet, QrCode, Copy, KeyRound, Clock, Shield
} from 'lucide-react';
import { User, XionPayPlan, SystemPreferences, Role, Branch } from '../types';
import { api, applySystemPreferences, DEFAULT_PREFERENCES } from '../services/api';
import { QrCodeSvg } from './QrCodeSvg';

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
  // Pasos: 0 (Selección de Rol) | 1, 2, 3 (Wizard Propietario) | 'STAFF_PAIRING' (Vinculación Colaborador)
  const [step, setStep] = useState<0 | 1 | 2 | 3 | 'STAFF_PAIRING'>(0);
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<XionPayPlan[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Rol seleccionado para colaboradores no-propietarios
  const [selectedStaffRole, setSelectedStaffRole] = useState<'SUPERVISOR' | 'BRANCH_MANAGER' | 'AUDITOR'>('SUPERVISOR');
  
  // Estados para Vinculación de Personal (Smart TV / QR / Código de 6 caracteres)
  const [staffPairingTab, setStaffPairingTab] = useState<'GENERATE_QR' | 'ENTER_CODE'>('GENERATE_QR');
  const [staffPairingCode, setStaffPairingCode] = useState<string>('');
  const [staffPairingQr, setStaffPairingQr] = useState<string>('');
  const [pairingSecondsLeft, setPairingSecondsLeft] = useState<number>(900); // 15 minutos
  const [isCopiedCode, setIsCopiedCode] = useState(false);
  const [manualPairingCode, setManualPairingCode] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('branch-1');
  const [branchesList, setBranchesList] = useState<Branch[]>([]);
  const [isPairingStaff, setIsPairingStaff] = useState(false);
  const [pairingSuccessMsg, setPairingSuccessMsg] = useState<string | null>(null);

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
    // Cargar catálogo de planes y sucursales
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

    api.getBranches().then((b) => {
      if (b && b.length > 0) {
        setBranchesList(b);
        setSelectedBranchId(b[0].id);
      }
    }).catch(() => {});
  }, []);

  // Generación y cuenta regresiva del código de vinculación para colaboradores
  useEffect(() => {
    if (step === 'STAFF_PAIRING') {
      const generateNewCode = async () => {
        const randomNum = Math.floor(100 + Math.random() * 900);
        const code = `XM-${randomNum}`;
        const req = await api.requestStaffPairing({
          user_id: currentUser.id,
          email: currentUser.email,
          full_name: currentUser.full_name,
          role: selectedStaffRole,
          pairing_code: code
        });
        setStaffPairingCode(req.pairing_code);
        setStaffPairingQr(req.qr_payload);
        setPairingSecondsLeft(req.expires_in_seconds || 900);
      };
      generateNewCode();
    }
  }, [step, selectedStaffRole]);

  // Temporizador regresivo de 15 minutos
  useEffect(() => {
    if (step !== 'STAFF_PAIRING' || pairingSecondsLeft <= 0) return;
    const timer = setInterval(() => {
      setPairingSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [step, pairingSecondsLeft]);

  // Polling de aprobación en vivo si el propietario autoriza remotamente
  useEffect(() => {
    if (step !== 'STAFF_PAIRING' || !staffPairingCode || pairingSecondsLeft <= 0) return;
    const interval = setInterval(async () => {
      try {
        const res = await api.getStaffPairingStatus(staffPairingCode);
        if (res.status === 'APPROVED') {
          handleExecuteStaffConnection(
            res.branch_id || selectedBranchId,
            res.branch_name || 'Sucursal Asignada',
            res.role || selectedStaffRole
          );
        }
      } catch {}
    }, 4000);
    return () => clearInterval(interval);
  }, [step, staffPairingCode, pairingSecondsLeft]);

  const handleCopyCode = () => {
    if (!staffPairingCode) return;
    navigator.clipboard.writeText(staffPairingCode);
    setIsCopiedCode(true);
    setTimeout(() => setIsCopiedCode(false), 2500);
  };

  const handleExecuteStaffConnection = (branchId: string, branchName: string, role: Role) => {
    setPairingSuccessMsg(`¡Vinculación autorizada! Ingresando como ${getRoleLabel(role)}...`);
    setIsPairingStaff(true);

    setTimeout(() => {
      const updatedUser: User = {
        ...currentUser,
        role: role,
        branch_id: branchId,
        branch_name: branchName,
        approval_status: 'APPROVED',
        onboarding_completed: true
      };

      localStorage.setItem(`xion_onboarding_completed_${currentUser.id}`, 'true');
      localStorage.setItem('xion_user', JSON.stringify(updatedUser));
      onCompleted(updatedUser);
    }, 1200);
  };

  const handleManualPairSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPairingCode.trim()) return;
    setIsPairingStaff(true);
    setErrorMsg(null);

    try {
      const confirmed = await api.confirmStaffPairing({
        pairing_code: manualPairingCode.trim().toUpperCase(),
        branch_id: selectedBranchId,
        role: selectedStaffRole,
        user_id: currentUser.id
      });

      handleExecuteStaffConnection(
        confirmed.branch_id,
        confirmed.branch_name,
        confirmed.role
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Código de vinculación inválido o expirado.');
      setIsPairingStaff(false);
    }
  };

  const handleSimulateOwnerApproval = async () => {
    setIsPairingStaff(true);
    const branch = branchesList.find(b => b.id === selectedBranchId) || branchesList[0] || { id: 'branch-1', name: 'Sucursal Principal - Centro' };
    await api.approveStaffPairingRequest(staffPairingCode, branch.id);
    handleExecuteStaffConnection(branch.id, branch.name, selectedStaffRole);
  };

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
      const updatedPrefs: SystemPreferences = {
        ...DEFAULT_PREFERENCES,
        theme_mode: selectedTheme,
        sync_with_pos: autoSyncPos
      };
      await api.updatePreferences(updatedPrefs);
      applySystemPreferences(updatedPrefs);

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

      localStorage.setItem(`xion_onboarding_completed_${currentUser.id}`, 'true');

      const updatedUser: User = {
        ...currentUser,
        full_name: fullName,
        phone: personalPhone,
        role: 'OWNER',
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

  const getRoleLabel = (r: string) => {
    switch (r) {
      case 'OWNER': return 'Propietario / Dueño';
      case 'SUPERVISOR': return 'Almacenista / Inventario';
      case 'BRANCH_MANAGER': return 'Gerente de Sucursal';
      case 'AUDITOR': return 'Contador / Auditor Fiscal';
      default: return r;
    }
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-300">
      {/* Luces de Fondo Neón */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-[550px] h-[350px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-1/4 left-1/3 w-[400px] h-[300px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-3xl bg-slate-900/95 border border-cyan-500/30 rounded-3xl shadow-2xl shadow-cyan-950/40 overflow-hidden relative z-10 flex flex-col my-auto max-h-[92vh]">
        
        {/* Encabezado Superior */}
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
                {step === 'STAFF_PAIRING' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {getRoleLabel(selectedStaffRole)}
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-0.5">
                {step === 0 && 'Selección de Perfil de Acceso'}
                {step === 'STAFF_PAIRING' && 'Vinculación de Colaborador a la Empresa'}
                {step === 1 && 'Paso 1: Datos de tu Empresa Principal'}
                {step === 2 && 'Paso 2: Parámetros del Sistema'}
                {step === 3 && 'Paso 3: Selección de Plan Operativo'}
              </h2>
            </div>
          </div>

          {/* Stepper Wizard Progress (Solo visible en flujo de Propietario) */}
          {typeof step === 'number' && step > 0 && (
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
          )}

          {step === 0 && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs text-slate-300 font-medium">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span>Primer Inicio de Sesión</span>
            </div>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-6 flex-1 text-slate-200">
          
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 text-xs flex items-center gap-2 animate-in fade-in">
              <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {pairingSuccessMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-bold">{pairingSuccessMsg}</span>
            </div>
          )}

          {/* ============================================================ */}
          {/* PASO 0: SELECCIÓN DE ROL (PROPIETARIO, ALMACENISTA, GERENTE, CONTADOR) */}
          {/* ============================================================ */}
          {step === 0 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="text-center space-y-1.5 max-w-xl mx-auto">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                  Bienvenido al Ecosistema Xion
                </span>
                <h3 className="text-lg sm:text-xl font-black text-white">
                  ¿Cómo deseas ingresar a Xion Manager?
                </h3>
                <p className="text-xs text-slate-400">
                  Selecciona tu rol. Si eres el Propietario configurarás tu empresa y licencias; si eres colaborador, te vincularás mediante código o QR emitido por tu negocio.
                </p>
              </div>

              {/* Grid de 4 Roles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                
                {/* 1. Propietario */}
                <div
                  onClick={() => setStep(1)}
                  className="group relative p-5 rounded-2xl bg-gradient-to-b from-amber-500/10 via-slate-900/90 to-slate-950 border border-amber-500/30 hover:border-amber-400 hover:shadow-xl hover:shadow-amber-500/10 cursor-pointer transition-all flex flex-col justify-between hover:scale-[1.02]"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-md">
                        <Crown className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Control Maestro
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-white group-hover:text-amber-300 transition-colors">
                        Propietario / Dueño del Negocio
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Crea y administra tu empresa, configura sucursales, terminales de caja y gestiona la suscripción comercial Xion-Pay.
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-amber-300 group-hover:translate-x-1 transition-transform">
                    <span>Configurar mi Empresa</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>

                {/* 2. Almacenista */}
                <div
                  onClick={() => {
                    setSelectedStaffRole('SUPERVISOR');
                    setStep('STAFF_PAIRING');
                  }}
                  className="group relative p-5 rounded-2xl bg-gradient-to-b from-cyan-500/10 via-slate-900/90 to-slate-950 border border-cyan-500/30 hover:border-cyan-400 hover:shadow-xl hover:shadow-cyan-500/10 cursor-pointer transition-all flex flex-col justify-between hover:scale-[1.02]"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-md">
                        <Boxes className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        Gestión Stock
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-white group-hover:text-cyan-300 transition-colors">
                        Almacenista / Inventario
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Control de existencias, recepción de compras a proveedores, registro de mermas y traslados de mercancía entre sedes.
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-cyan-300 group-hover:translate-x-1 transition-transform">
                    <span>Vincularme con Código o QR</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>

                {/* 3. Gerente */}
                <div
                  onClick={() => {
                    setSelectedStaffRole('BRANCH_MANAGER');
                    setStep('STAFF_PAIRING');
                  }}
                  className="group relative p-5 rounded-2xl bg-gradient-to-b from-emerald-500/10 via-slate-900/90 to-slate-950 border border-emerald-500/30 hover:border-emerald-400 hover:shadow-xl hover:shadow-emerald-500/10 cursor-pointer transition-all flex flex-col justify-between hover:scale-[1.02]"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shadow-md">
                        <Store className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Operativa Local
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-white group-hover:text-emerald-300 transition-colors">
                        Gerente de Sucursal
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Supervisión de operaciones de la sede asignada, monitoreo de ventas, cajas y autorizaciones de turnos en vivo.
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-emerald-300 group-hover:translate-x-1 transition-transform">
                    <span>Vincularme con Código o QR</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>

                {/* 4. Contador */}
                <div
                  onClick={() => {
                    setSelectedStaffRole('AUDITOR');
                    setStep('STAFF_PAIRING');
                  }}
                  className="group relative p-5 rounded-2xl bg-gradient-to-b from-purple-500/10 via-slate-900/90 to-slate-950 border border-purple-500/30 hover:border-purple-400 hover:shadow-xl hover:shadow-purple-500/10 cursor-pointer transition-all flex flex-col justify-between hover:scale-[1.02]"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-md">
                        <FileSpreadsheet className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        Auditoría Fiscal
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-white group-hover:text-purple-300 transition-colors">
                        Contador / Auditor Fiscal
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Supervisión contable, arqueos ciegos de cajas, bitácoras inmutables, libros de ventas e impuestos del negocio.
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-purple-300 group-hover:translate-x-1 transition-transform">
                    <span>Vincularme con Código o QR</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>

              </div>

              {/* Info Callout */}
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center gap-3 text-xs text-slate-400">
                <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>
                  <strong>Seguridad de Acceso:</strong> Los colaboradores nunca requieren introducir credenciales maestras. La vinculación asocia el usuario directamente a la sucursal designada por el Propietario.
                </span>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* VINCULACIÓN DE PERSONAL (ALMACENISTA, GERENTE, CONTADOR)     */}
          {/* ============================================================ */}
          {step === 'STAFF_PAIRING' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              
              {/* Botón Volver y Header del Rol */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Volver a Elegir Rol</span>
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Rol a vincular:</span>
                  <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    {getRoleLabel(selectedStaffRole)}
                  </span>
                </div>
              </div>

              {/* Selector de Modo de Vinculación */}
              <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setStaffPairingTab('GENERATE_QR')}
                  className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
                    staffPairingTab === 'GENERATE_QR'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>Generar Código y QR (Flujo Smart TV)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStaffPairingTab('ENTER_CODE')}
                  className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
                    staffPairingTab === 'ENTER_CODE'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Introducir Código de Invitación</span>
                </button>
              </div>

              {/* MODO 1: Generar Código y QR (Flujo Smart TV de Cajas) */}
              {staffPairingTab === 'GENERATE_QR' && (
                <div className="bg-slate-950/70 p-5 sm:p-6 rounded-3xl border border-slate-800/80 space-y-5 text-center">
                  
                  <div className="space-y-1">
                    <h4 className="text-sm sm:text-base font-extrabold text-white">
                      Código de Solicitud de Vinculación
                    </h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Muestra este código o el código QR al <strong className="text-cyan-300">Propietario</strong> de tu comercio para que apruebe tu acceso desde el panel de Usuarios.
                    </p>
                  </div>

                  {/* QR y Display de Código */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
                    {/* Código QR Vectorial */}
                    <div className="flex flex-col items-center gap-2">
                      <QrCodeSvg 
                        value={staffPairingQr || `xion://pair-staff?code=${staffPairingCode}&role=${selectedStaffRole}`}
                        size={170}
                        logoText={selectedStaffRole === 'SUPERVISOR' ? 'ALM' : selectedStaffRole === 'BRANCH_MANAGER' ? 'GER' : 'CON'}
                      />
                      <span className="text-[10px] text-slate-500 font-mono">
                        Escanear con App o Cámara Móvil
                      </span>
                    </div>

                    {/* Código Alfanumérico Grande */}
                    <div className="space-y-3 flex flex-col items-center sm:items-start text-center sm:text-left">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Código de 6 Caracteres
                      </span>
                      
                      <div className="inline-flex items-center gap-3 p-3 px-5 rounded-2xl bg-slate-900 border-2 border-cyan-500/50 shadow-xl shadow-cyan-500/10">
                        <span className="font-mono text-3xl sm:text-4xl font-black text-cyan-400 tracking-widest">
                          {staffPairingCode || 'XM-842'}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyCode}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
                          title="Copiar código"
                        >
                          {isCopiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Temporizador */}
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Válido por: <strong className="text-white font-mono">{formatCountdown(pairingSecondsLeft)}</strong></span>
                      </div>

                      {/* Radar de Estado en Vivo */}
                      <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-xs">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                        <span className="text-[11px] font-semibold">Esperando autorización del Propietario...</span>
                      </div>
                    </div>
                  </div>

                  {/* Acciones de Prueba Rápida y Simulación */}
                  <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <span className="text-[11px] text-slate-500">
                      ¿Estás probando en desarrollo?
                    </span>
                    <button
                      type="button"
                      disabled={isPairingStaff}
                      onClick={handleSimulateOwnerApproval}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center gap-2 transition-all active:scale-95"
                    >
                      <Zap className="w-3.5 h-3.5 fill-white" />
                      <span>{isPairingStaff ? 'Vinculando...' : 'Simular Aprobación Inmediata del Propietario'}</span>
                    </button>
                  </div>

                </div>
              )}

              {/* MODO 2: Introducir Código Manual */}
              {staffPairingTab === 'ENTER_CODE' && (
                <form onSubmit={handleManualPairSubmit} className="bg-slate-950/70 p-5 sm:p-6 rounded-3xl border border-slate-800/80 space-y-4">
                  <div className="space-y-1">
                    <h4 className="text-sm sm:text-base font-extrabold text-white">
                      Ingresa el Código Proporcionado por el Propietario
                    </h4>
                    <p className="text-xs text-slate-400">
                      Escribe el código de vinculación o invitación emitido por la administración de tu empresa:
                    </p>
                  </div>

                  {/* Input de 6 Caracteres */}
                  <div className="py-2 text-center space-y-2">
                    <input
                      type="text"
                      required
                      maxLength={8}
                      placeholder="XM-842"
                      value={manualPairingCode}
                      onChange={(e) => setManualPairingCode(e.target.value.toUpperCase())}
                      className="w-56 mx-auto text-center font-mono text-3xl font-black tracking-widest bg-slate-900 border-2 border-cyan-500/60 rounded-2xl py-3 px-4 text-cyan-400 focus:outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/20 uppercase block"
                    />
                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
                      <span>Códigos demo disponibles:</span>
                      {['XM-792', 'XION-01', 'ALMACEN-1'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setManualPairingCode(c)}
                          className="px-2 py-0.5 rounded-md bg-slate-800 text-cyan-300 font-mono text-[10px] hover:bg-slate-700"
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Selector de Sucursal */}
                  <div className="space-y-1 text-xs">
                    <label className="block text-slate-400 font-semibold">Sucursal de Asignación *</label>
                    <select
                      value={selectedBranchId}
                      onChange={(e) => setSelectedBranchId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2.5 text-slate-100 font-semibold focus:outline-none focus:border-cyan-400"
                    >
                      {branchesList.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.address.slice(0, 35)}...)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Botón de Enviar */}
                  <div className="pt-3 border-t border-slate-800/80 flex justify-end">
                    <button
                      type="submit"
                      disabled={isPairingStaff || !manualPairingCode.trim()}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <span>{isPairingStaff ? 'Verificando y Vinculando...' : 'Autorizar y Vincular Cuenta'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}

            </div>
          )}

          {/* ============================================================ */}
          {/* PASO 1: DATOS PERSONALES Y DE LA COMPAÑÍA (PROPIETARIO)       */}
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
              <div className="bg-slate-950/50 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                  <DollarSign className="w-4 h-4" />
                  <span>1. Moneda, Tasa Cambiaria e Impuestos</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
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

              {/* Selector de Ciclo de Facturación */}
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

              {/* Cards de Planes */}
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

                        <div className="my-3 pt-3 border-t border-slate-800/80 flex items-baseline gap-1">
                          <span className="text-2xl font-black text-white">
                            {isTrial ? '$0' : `$${price.toFixed(0)}`}
                          </span>
                          <span className="text-xs text-slate-400">
                            {isTrial ? '/ por 30 días' : '/ mes'}
                          </span>
                        </div>

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

              <div className="p-3.5 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0" />
                <p className="text-xs text-slate-300 leading-relaxed">
                  Con el <strong>Plan Gratuito por 30 Días</strong> tu licencia se activa al instante con todas las capacidades del sistema. Puedes migrar o cambiar de plan cuando gustes.
                </p>
              </div>

            </div>
          )}

        </div>

        {/* Barra de Acciones Inferior (Solo para flujo de Propietario) */}
        {typeof step === 'number' && step > 0 && (
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
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="px-3 py-1.5 rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-800/60 text-slate-400 hover:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Cambiar Rol</span>
                </button>
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
        )}

      </div>
    </div>
  );
};

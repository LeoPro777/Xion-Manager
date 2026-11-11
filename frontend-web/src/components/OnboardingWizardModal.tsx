import React, { useState, useEffect } from 'react';
import { 
  Building2, UserCheck, Settings, CreditCard, CheckCircle2, 
  ArrowRight, ArrowLeft, ShieldCheck, Zap, Plus, Trash2, 
  Sparkles, DollarSign, Percent, RefreshCw, Palette, Globe,
  Check, Store, ChevronRight, Crown, Boxes, Package, 
  FileSpreadsheet, QrCode, Copy, KeyRound, Clock, Shield,
  Share2, AlertTriangle, XCircle, MessageCircle
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

export type DocType = 'V' | 'J' | 'E' | 'G';

export const MOBILE_AREA_CODES = [
  { code: '0414', label: '0414 (Movistar)' },
  { code: '0424', label: '0424 (Movistar)' },
  { code: '0412', label: '0412 (Digitel)' },
  { code: '0416', label: '0416 (Movilnet)' },
  { code: '0426', label: '0426 (Movilnet)' }
];

export const COMMERCIAL_AREA_CODES = [
  { code: '0414', label: '0414 (Movistar)' },
  { code: '0424', label: '0424 (Movistar)' },
  { code: '0412', label: '0412 (Digitel)' },
  { code: '0416', label: '0416 (Movilnet)' },
  { code: '0426', label: '0426 (Movilnet)' },
  { code: '0212', label: '0212 (Caracas)' },
  { code: '0261', label: '0261 (Maracaibo)' },
  { code: '0241', label: '0241 (Valencia)' },
  { code: '0251', label: '0251 (Barquisimeto)' },
  { code: '0276', label: '0276 (San Cristóbal)' },
  { code: '0281', label: '0281 (Barcelona / PLC)' },
  { code: '0243', label: '0243 (Maracay)' },
  { code: '+58',  label: '+58 (Internacional)' }
];

const parseInitialPhone = (phoneStr?: string) => {
  if (!phoneStr) return { area: '0414', digits: '' };
  const cleaned = phoneStr.replace(/\D/g, '');
  let norm = cleaned;
  if (norm.startsWith('58')) norm = '0' + norm.slice(2);
  for (const ac of ['0414', '0424', '0412', '0416', '0426', '0212', '0261', '0241', '0251', '0276', '0281', '0243']) {
    if (norm.startsWith(ac)) {
      return { area: ac, digits: norm.slice(ac.length, ac.length + 7) };
    }
  }
  return { area: '0414', digits: norm.slice(-7) };
};

const parseInitialTaxId = (taxIdStr?: string) => {
  if (!taxIdStr) return { type: 'J' as DocType, number: '', check: '' };
  const clean = taxIdStr.trim().toUpperCase();
  const first = clean[0];
  const type: DocType = (['V', 'E', 'J', 'G'].includes(first) ? first : 'J') as DocType;
  const digits = clean.replace(/\D/g, '');
  if ((type === 'J' || type === 'G') && digits.length >= 9) {
    return { type, number: digits.slice(0, -1), check: digits.slice(-1) };
  }
  return { type, number: digits, check: '' };
};

export const OnboardingWizardModal: React.FC<OnboardingWizardModalProps> = ({ 
  currentUser, 
  onCompleted 
}) => {
  // Pasos: 0 (Selección de Rol) | 1, 2, 3 (Wizard Propietario) | 'COLLABORATOR_BASIC_INFO' (Datos Básicos) | 'STAFF_PAIRING' (Vinculación Colaborador)
  const [step, setStep] = useState<0 | 1 | 2 | 3 | 'STAFF_PAIRING' | 'COLLABORATOR_BASIC_INFO'>(0);
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
  const [isCopiedShare, setIsCopiedShare] = useState(false);
  const [pairingStatus, setPairingStatus] = useState<'PENDING' | 'APPROVED' | 'EXPIRED' | 'REJECTED'>('PENDING');
  const [manualPairingCode, setManualPairingCode] = useState('');
  const [submittedManualCode, setSubmittedManualCode] = useState<string | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState('branch-1');
  const [branchesList, setBranchesList] = useState<Branch[]>([]);
  const [isPairingStaff, setIsPairingStaff] = useState(false);
  const [pairingSuccessMsg, setPairingSuccessMsg] = useState<string | null>(null);

  // Paso 1: Datos Personales y Compañía(s)
  const [fullName, setFullName] = useState(currentUser.full_name ? currentUser.full_name.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '') : '');
  
  const initialPersonal = parseInitialPhone(currentUser.phone);
  const [personalAreaCode, setPersonalAreaCode] = useState(initialPersonal.area);
  const [personalPhoneDigits, setPersonalPhoneDigits] = useState(initialPersonal.digits);

  const [companyTradeName, setCompanyTradeName] = useState('');
  const [companyLegalName, setCompanyLegalName] = useState('');
  
  const initialTax = parseInitialTaxId((currentUser as any).tax_id);
  const [docType, setDocType] = useState<DocType>(initialTax.type);
  const [docNumber, setDocNumber] = useState(initialTax.number);
  const [docCheckDigit, setDocCheckDigit] = useState(initialTax.check);

  const [companyAreaCode, setCompanyAreaCode] = useState('0414');
  const [companyPhoneDigits, setCompanyPhoneDigits] = useState('');
  const [companyEmail, setCompanyEmail] = useState(currentUser.email || '');
  const [companyAddress, setCompanyAddress] = useState('');
  
  // Múltiples Compañías
  const [additionalCompanies, setAdditionalCompanies] = useState<AdditionalCompany[]>([]);
  const [showAddCompanyForm, setShowAddCompanyForm] = useState(false);
  const [newCompTrade, setNewCompTrade] = useState('');
  const [newCompLegal, setNewCompLegal] = useState('');
  const [newCompDocType, setNewCompDocType] = useState<DocType>('J');
  const [newCompDocNumber, setNewCompDocNumber] = useState('');
  const [newCompDocCheck, setNewCompDocCheck] = useState('');

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

  // Generación y cuenta regresiva del código de vinculación para colaboradores (6 dígitos numéricos)
  useEffect(() => {
    if (step === 'STAFF_PAIRING') {
      const generateNewCode = async () => {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const req = await api.requestStaffPairing({
          user_id: currentUser.id,
          email: currentUser.email,
          full_name: currentUser.full_name,
          pairing_code: code
        });
        setStaffPairingCode(req.pairing_code);
        setStaffPairingQr(req.qr_payload);
        setPairingSecondsLeft(req.expires_in_seconds || 900);
        setPairingStatus('PENDING');
      };
      generateNewCode();
    }
  }, [step]);

  // Temporizador regresivo de 15 minutos
  useEffect(() => {
    if (step !== 'STAFF_PAIRING' || pairingSecondsLeft <= 0) {
      if (step === 'STAFF_PAIRING' && pairingSecondsLeft <= 0 && pairingStatus === 'PENDING') {
        setPairingStatus('EXPIRED');
        setErrorMsg('El código de vinculación ha expirado. Por favor genera uno nuevo.');
      }
      return;
    }
    const timer = setInterval(() => {
      setPairingSecondsLeft((prev) => {
        if (prev <= 1) {
          setPairingStatus('EXPIRED');
          setErrorMsg('El código de vinculación ha expirado. Por favor genera uno nuevo.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [step, pairingSecondsLeft, pairingStatus]);

  // Polling de aprobación en vivo si el propietario autoriza remotamente (sea por QR o código ingresado)
  useEffect(() => {
    const codeToPoll = submittedManualCode || staffPairingCode;
    if (step !== 'STAFF_PAIRING' || !codeToPoll || pairingSecondsLeft <= 0 || pairingStatus === 'APPROVED' || pairingStatus === 'EXPIRED') return;
    const interval = setInterval(async () => {
      try {
        const res = await api.getStaffPairingStatus(codeToPoll);
        if (res.status === 'APPROVED') {
          setPairingStatus('APPROVED');
          handleExecuteStaffConnection(
            res.branch_id || selectedBranchId,
            res.branch_name || 'Sucursal Asignada',
            res.role || 'CASHIER',
            (res as any).business_id
          );
        } else if (res.status === 'REJECTED') {
          setPairingStatus('REJECTED');
          setErrorMsg(res.message || 'La solicitud de vinculación fue rechazada por el dueño.');
          setSubmittedManualCode(null);
          setPairingSuccessMsg(null);
        } else if (res.status === 'EXPIRED') {
          setPairingStatus('EXPIRED');
          setErrorMsg(res.message || 'El código de vinculación ha expirado. Por favor genera uno nuevo.');
        }
      } catch {}
    }, 3500);
    return () => clearInterval(interval);
  }, [step, staffPairingCode, submittedManualCode, pairingSecondsLeft, pairingStatus]);

  const handleCopyCode = () => {
    if (!staffPairingCode) return;
    navigator.clipboard.writeText(staffPairingCode);
    setIsCopiedCode(true);
    setTimeout(() => setIsCopiedCode(false), 2500);
  };

  const handleRegenerateStaffCode = async () => {
    setErrorMsg(null);
    setPairingSuccessMsg(null);
    setIsPairingStaff(true);
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const req = await api.requestStaffPairing({
        user_id: currentUser.id,
        email: currentUser.email,
        full_name: currentUser.full_name,
        pairing_code: code
      });
      setStaffPairingCode(req.pairing_code);
      setStaffPairingQr(req.qr_payload);
      setPairingSecondsLeft(req.expires_in_seconds || 900);
      setPairingStatus('PENDING');
      setSubmittedManualCode(null);
    } catch (err: any) {
      setErrorMsg('Error al generar nuevo código. Intenta nuevamente.');
    } finally {
      setIsPairingStaff(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (!staffPairingCode) return;
    const text = `Hola, solicito acceso a Xion Manager. Mi código de vinculación numérico es: ${staffPairingCode}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleCopyShareText = () => {
    if (!staffPairingCode) return;
    const text = `Hola, solicito acceso a Xion Manager. Mi código de vinculación numérico es: ${staffPairingCode}`;
    navigator.clipboard.writeText(text);
    setIsCopiedShare(true);
    setTimeout(() => setIsCopiedShare(false), 2500);
  };

  const handleExecuteStaffConnection = (branchId: string, branchName: string, role: Role, businessId?: string) => {
    setPairingSuccessMsg(`¡Vinculación aprobada por el Propietario! Ingresando como ${getRoleLabel(role)}...`);
    setIsPairingStaff(true);

    setTimeout(() => {
      const updatedUser: User = {
        ...currentUser,
        role: role,
        business_id: businessId || currentUser.business_id,
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
    const cleanCode = manualPairingCode.replace(/[^0-9]/g, '').trim();
    if (cleanCode.length !== 6) {
      setErrorMsg('El código de vinculación debe ser exactamente de 6 dígitos numéricos.');
      return;
    }
    setIsPairingStaff(true);
    setErrorMsg(null);
    setPairingSuccessMsg(null);

    try {
      const res = await api.confirmStaffPairing({
        pairing_code: cleanCode,
        user_id: currentUser.id
      });

      if (res.status === 'APPROVED') {
        setPairingStatus('APPROVED');
        handleExecuteStaffConnection(
          res.branch_id || 'branch-1',
          res.branch_name || 'Sucursal Asignada',
          res.role || 'CASHIER',
          (res as any).business_id
        );
      } else {
        setIsPairingStaff(false);
        setSubmittedManualCode(cleanCode);
        setPairingStatus('PENDING');
        setPairingSuccessMsg(res.message || 'Código registrado. Esperando que el Dueño autorice el acceso y asigne tu rol.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Código de vinculación inválido o expirado.');
      setIsPairingStaff(false);
    }
  };

  const handleSimulateOwnerApproval = async (codeToApprove?: string) => {
    setIsPairingStaff(true);
    const targetCode = codeToApprove || submittedManualCode || staffPairingCode;
    const branch = branchesList.find(b => b.id === selectedBranchId) || branchesList[0] || { id: 'branch-1', name: 'Sucursal Principal - Centro' };
    const res = await api.approveStaffPairingRequest(targetCode, branch.id, 'CASHIER');
    handleExecuteStaffConnection(branch.id, branch.name, res?.request?.role || 'CASHIER', (res as any)?.business_id || res?.request?.business_id);
  };

  const getFullTaxId = (type: DocType, num: string, check: string) => {
    const cleanNum = num.trim();
    if (!cleanNum) return '';
    if (type === 'V' || type === 'E') {
      return `${type}-${cleanNum}`;
    }
    return check.trim() ? `${type}-${cleanNum}-${check.trim()}` : `${type}-${cleanNum}`;
  };

  const getFullPhone = (area: string, digits: string) => {
    if (!digits.trim()) return '';
    const cleanArea = area.startsWith('0') ? area.slice(1) : area.replace('+', '');
    return `+58 ${cleanArea} ${digits.trim()}`;
  };

  const handleAddAdditionalCompany = () => {
    const fullTax = getFullTaxId(newCompDocType, newCompDocNumber, newCompDocCheck);
    if (!newCompTrade.trim() || !fullTax) {
      setErrorMsg('Por favor completa el nombre comercial y el RIF/Cédula de la nueva compañía.');
      return;
    }
    const item: AdditionalCompany = {
      id: `comp-${Date.now()}`,
      trade_name: newCompTrade.trim(),
      legal_name: newCompLegal.trim() || newCompTrade.trim(),
      tax_id: fullTax,
      address: companyAddress.trim() || 'Sede Adicional'
    };
    setAdditionalCompanies([...additionalCompanies, item]);
    setNewCompTrade('');
    setNewCompLegal('');
    setNewCompDocNumber('');
    setNewCompDocCheck('');
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

      const finalTaxId = getFullTaxId(docType, docNumber, docCheckDigit);
      const finalPersonalPhone = getFullPhone(personalAreaCode, personalPhoneDigits);
      const finalCompanyPhone = getFullPhone(companyAreaCode, companyPhoneDigits) || finalPersonalPhone;

      const payload = {
        user_id: currentUser.id,
        full_name: fullName.trim(),
        phone: finalPersonalPhone,
        primary_company: {
          trade_name: companyTradeName.trim(),
          legal_name: companyLegalName.trim() || companyTradeName.trim(),
          tax_id: finalTaxId,
          phone: finalCompanyPhone,
          email: companyEmail.trim(),
          address: companyAddress.trim() || 'Sede Principal'
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

      const res = await api.completeOnboarding(payload);

      localStorage.setItem(`xion_onboarding_completed_${currentUser.id}`, 'true');

      const updatedUser: User = {
        ...currentUser,
        full_name: fullName.trim(),
        phone: finalPersonalPhone,
        business_id: (res as any)?.business?.id || (res as any)?.user?.business_id || currentUser.business_id,
        role: 'OWNER',
        approval_status: 'APPROVED',
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

  const handleSelectCollaborator = () => {
    setStep('COLLABORATOR_BASIC_INFO');
  };

  const handleConfirmCollaboratorInfo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!fullName.trim() || fullName.trim().length < 3) {
      setErrorMsg('Por favor ingresa tu nombre completo (mínimo 3 letras).');
      return;
    }
    if (/\d/.test(fullName)) {
      setErrorMsg('El nombre completo no puede contener números, solo letras y espacios.');
      return;
    }
    if (personalPhoneDigits && !/^\d{7}$/.test(personalPhoneDigits)) {
      setErrorMsg('El teléfono celular debe contener exactamente 7 dígitos numéricos tras el código de área.');
      return;
    }
    setErrorMsg(null);
    setLoading(true);
    const finalPersonalPhone = getFullPhone(personalAreaCode, personalPhoneDigits);
    try {
      const res = await api.selectCollaboratorRole(currentUser.id, {
        full_name: fullName.trim(),
        phone: finalPersonalPhone
      });
      if (res && res.user) {
        onCompleted(res.user);
        return;
      }
    } catch (e: any) {
      console.warn('Error seleccionando rol colaborador:', e);
    } finally {
      setLoading(false);
    }
    onCompleted({
      ...currentUser,
      full_name: fullName.trim() || currentUser.full_name,
      phone: finalPersonalPhone || currentUser.phone,
      role: 'CASHIER',
      business_id: undefined,
      branch_id: undefined,
      approval_status: 'PENDING',
      onboarding_completed: false
    });
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
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-300">
      {/* Luces de Fondo Neón */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-[550px] h-[350px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-1/4 left-1/3 w-[400px] h-[300px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-3xl bg-slate-900/95 border border-cyan-500/30 rounded-2xl sm:rounded-3xl shadow-2xl shadow-cyan-950/40 overflow-hidden relative z-10 flex flex-col my-auto max-h-[94dvh]">
        
        {/* Encabezado Superior */}
        <div className="p-3.5 sm:p-5 border-b border-slate-800/80 bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30 shrink-0">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Bienvenido a Xion-Manager
                </span>
                {(step === 'STAFF_PAIRING' || step === 'COLLABORATOR_BASIC_INFO') && (
                  <span className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    Acceso Colaborador
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg lg:text-xl font-black text-white mt-0.5">
                {step === 0 && 'Selección de Perfil de Acceso'}
                {step === 'COLLABORATOR_BASIC_INFO' && 'Datos Básicos de Colaborador'}
                {step === 'STAFF_PAIRING' && 'Vinculación de Colaborador'}
                {step === 1 && 'Paso 1: Datos de tu Empresa'}
                {step === 2 && 'Paso 2: Parámetros del Sistema'}
                {step === 3 && 'Paso 3: Selección de Plan Operativo'}
              </h2>
            </div>
          </div>

          {/* Stepper Wizard Progress (Solo visible en flujo de Propietario) */}
          {typeof step === 'number' && step > 0 && (
            <div className="flex items-center gap-1 sm:gap-2 self-end sm:self-auto">
              {[
                { num: 1, label: 'Empresa', icon: Building2 },
                { num: 2, label: 'Sistema', icon: Settings },
                { num: 3, label: 'Plan', icon: CreditCard }
              ].map((s) => {
                const Icon = s.icon;
                const isActive = step === s.num;
                const isDone = step > s.num;
                return (
                  <div key={s.num} className="flex items-center gap-1 sm:gap-1.5">
                    <div className={`flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-xl text-[11px] sm:text-xs font-bold transition-all border ${
                      isActive 
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/30' 
                        : isDone
                        ? 'bg-slate-800 text-emerald-400 border-emerald-500/40'
                        : 'bg-slate-900/60 text-slate-500 border-slate-800'
                    }`}>
                      {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Icon className="w-3.5 h-3.5" />}
                      <span className="hidden sm:inline">{s.label}</span>
                    </div>
                    {s.num < 3 && <div className="w-1.5 sm:w-3 h-0.5 bg-slate-800" />}
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
        <div className="p-3.5 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1 text-slate-200">
          
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
          {/* PASO 0: SELECCIÓN DE PERFIL (DUEÑO U OTRO)                  */}
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
                  Selecciona si eres el Dueño de la empresa o un Colaborador. El formulario de Dueño es obligatorio para configurar el comercio; si eres colaborador, emitirás un código numérico de 6 dígitos para que el dueño te autorice.
                </p>
              </div>

              {/* Grid Simplificado: Solo Dueño u Otro */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                
                {/* 1. Dueño / Propietario */}
                <div
                  onClick={() => setStep(1)}
                  className="group relative p-6 rounded-2xl bg-gradient-to-b from-amber-500/10 via-slate-900/90 to-slate-950 border-2 border-amber-500/40 hover:border-amber-400 hover:shadow-xl hover:shadow-amber-500/10 cursor-pointer transition-all flex flex-col justify-between hover:scale-[1.02]"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-md">
                        <Crown className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Control Maestro
                      </span>
                    </div>
                    <div>
                      <h4 className="text-base font-extrabold text-white group-hover:text-amber-300 transition-colors">
                        Dueño / Propietario
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Crea y administra tu empresa, sucursales, cajas POS y activa la suscripción comercial a través del formulario de configuración obligatorio.
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-amber-300 group-hover:translate-x-1 transition-transform">
                    <span>Configurar mi Empresa (Obligatorio)</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>

                {/* 2. Otro / Colaborador */}
                <div
                  onClick={handleSelectCollaborator}
                  className="group relative p-6 rounded-2xl bg-gradient-to-b from-cyan-500/10 via-slate-900/90 to-slate-950 border-2 border-cyan-500/40 hover:border-cyan-400 hover:shadow-xl hover:shadow-cyan-500/10 cursor-pointer transition-all flex flex-col justify-between hover:scale-[1.02]"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-md">
                        <UserCheck className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        Acceso Colaborador
                      </span>
                    </div>
                    <div>
                      <h4 className="text-base font-extrabold text-white group-hover:text-cyan-300 transition-colors">
                        Otro / Colaborador
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Emite o introduce tu código numérico de 6 dígitos. No requieres elegir rol: el dueño de la tienda lo asignará al autorizarte.
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-cyan-300 group-hover:translate-x-1 transition-transform">
                    <span>Emitir Código de 6 Dígitos</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>

              </div>

              {/* Info Callout */}
              <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center gap-3 text-xs text-slate-400">
                <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>
                  <strong>Flujo Seguro de Vinculación:</strong> Si eres colaborador, solo necesitas emitir tu código de 6 dígitos. El dueño lo ingresará en el módulo de Usuarios y definirá tus permisos.
                </span>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* PASO: DATOS BÁSICOS DE COLABORADOR                           */}
          {/* ============================================================ */}
          {step === 'COLLABORATOR_BASIC_INFO' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Volver a Selección</span>
                </button>
                <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Acceso Colaborador
                </span>
              </div>

              <div className="text-center space-y-1.5 max-w-lg mx-auto">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 mx-auto shadow-md">
                  <UserCheck className="w-6 h-6" />
                </div>
                <h3 className="text-base sm:text-lg font-black text-white">
                  Tus Datos Básicos
                </h3>
                <p className="text-xs text-slate-400">
                  Como colaborador no configuras ninguna empresa. Proporciona tus datos básicos para emitir tu código numérico de 6 dígitos y esperar la autorización del Dueño.
                </p>
              </div>

              <form onSubmit={handleConfirmCollaboratorInfo} className="space-y-4 max-w-md mx-auto">
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-bold text-slate-300">Nombre Completo (Solo Letras) *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, ''))}
                    placeholder="Ej. Juan Pérez"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all min-h-[44px]"
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-bold text-slate-300">Teléfono Personal / WhatsApp *</label>
                  <div className="flex gap-2">
                    <select
                      value={personalAreaCode}
                      onChange={(e) => setPersonalAreaCode(e.target.value)}
                      className="w-32 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-cyan-300 font-bold focus:outline-none focus:border-cyan-500 shrink-0 min-h-[44px]"
                    >
                      {MOBILE_AREA_CODES.map((item) => (
                        <option key={item.code} value={item.code} className="bg-slate-900 text-white">
                          {item.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={7}
                      required
                      value={personalPhoneDigits}
                      onChange={(e) => setPersonalPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 7))}
                      placeholder="1234567 (7 dígitos)"
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all min-h-[44px]"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Formato: {personalAreaCode}-{personalPhoneDigits || 'XXXXXXX'}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loading || !fullName.trim() || personalPhoneDigits.length !== 7}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 min-h-[44px]"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Generar Código de Vinculación</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ============================================================ */}
          {/* VINCULACIÓN DE PERSONAL (CÓDIGO NUMÉRICO DE 6 DÍGITOS)       */}
          {/* ============================================================ */}
          {step === 'STAFF_PAIRING' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              
              {/* Botón Volver */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Volver a Inicio</span>
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    Solicitud de Acceso Colaborador
                  </span>
                </div>
              </div>

              {/* Selector de Modo de Vinculación */}
              <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setStaffPairingTab('GENERATE_QR')}
                  className={`py-2 px-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
                    staffPairingTab === 'GENERATE_QR'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <QrCode className="w-4 h-4 shrink-0" />
                  <span>Código Emitido</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStaffPairingTab('ENTER_CODE')}
                  className={`py-2 px-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
                    staffPairingTab === 'ENTER_CODE'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <KeyRound className="w-4 h-4 shrink-0" />
                  <span>Introducir Código</span>
                </button>
              </div>

              {/* MODO 1: Generar Código y QR (Flujo Smart TV de Cajas) */}
              {staffPairingTab === 'GENERATE_QR' && (
                <div className="bg-slate-950/70 p-4 sm:p-6 rounded-3xl border border-slate-800/80 space-y-4 sm:space-y-5 text-center">
                  
                  <div className="space-y-1">
                    <h4 className="text-sm sm:text-base font-extrabold text-white">
                      Código de Solicitud de Vinculación
                    </h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Presenta este código o el código QR al <strong className="text-cyan-300">Propietario</strong> para que autorice tu acceso desde el panel de Usuarios.
                    </p>
                  </div>

                  {/* Alerta de Expiración */}
                  {pairingStatus === 'EXPIRED' && (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-amber-300 space-y-2 text-center animate-in fade-in">
                      <div className="flex items-center justify-center gap-2 font-bold text-sm">
                        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                        <span>Código Expirado</span>
                      </div>
                      <p className="text-xs text-slate-300">
                        El tiempo límite de 15 minutos ha vencido. Genera un nuevo código para vincularte.
                      </p>
                      <button
                        type="button"
                        onClick={handleRegenerateStaffCode}
                        disabled={isPairingStaff}
                        className="mt-2 w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 inline-flex items-center justify-center gap-2 transition-all active:scale-95 min-h-[44px]"
                      >
                        <RefreshCw className={`w-4 h-4 ${isPairingStaff ? 'animate-spin' : ''}`} />
                        <span>Generar Nuevo Código</span>
                      </button>
                    </div>
                  )}

                  {/* Alerta de Rechazo */}
                  {pairingStatus === 'REJECTED' && (
                    <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/40 text-red-300 space-y-2 text-center animate-in fade-in">
                      <div className="flex items-center justify-center gap-2 font-bold text-sm">
                        <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                        <span>Solicitud Rechazada o Descartada</span>
                      </div>
                      <p className="text-xs text-slate-300">
                        El administrador ha descartado esta solicitud de vinculación.
                      </p>
                      <button
                        type="button"
                        onClick={handleRegenerateStaffCode}
                        disabled={isPairingStaff}
                        className="mt-2 w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-red-500/20 inline-flex items-center justify-center gap-2 transition-all active:scale-95 min-h-[44px]"
                      >
                        <RefreshCw className={`w-4 h-4 ${isPairingStaff ? 'animate-spin' : ''}`} />
                        <span>Generar Nuevo Código para Reintentar</span>
                      </button>
                    </div>
                  )}

                  {/* QR y Display de Código (Cuando está activo o pendiente) */}
                  {pairingStatus !== 'EXPIRED' && pairingStatus !== 'REJECTED' && (
                    <>
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-5 sm:gap-6 py-2">
                        {/* Código QR Vectorial */}
                        <div className="flex flex-col items-center gap-2">
                          <QrCodeSvg 
                            value={staffPairingQr || `xion://pair-staff?code=${staffPairingCode}`}
                            size={160}
                            logoText="XION"
                          />
                          <span className="text-[10px] text-slate-500 font-mono">
                            Escanear con App o Cámara Móvil
                          </span>
                        </div>

                        {/* Código Numérico de 6 Dígitos Grande y Controles */}
                        <div className="space-y-3 flex flex-col items-center sm:items-start text-center sm:text-left w-full sm:w-auto">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Código de Vinculación (6 Dígitos)
                          </span>
                          
                          <div className="inline-flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 px-4 sm:px-5 rounded-2xl bg-slate-900 border-2 border-cyan-500/50 shadow-xl shadow-cyan-500/10">
                            <span className="font-mono text-2xl sm:text-4xl font-black text-cyan-400 tracking-widest">
                              {staffPairingCode || '842109'}
                            </span>
                            <button
                              type="button"
                              onClick={handleCopyCode}
                              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all min-w-[36px] min-h-[36px] flex items-center justify-center"
                              title="Copiar código"
                            >
                              {isCopiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                            </button>
                            <button
                              type="button"
                              onClick={handleRegenerateStaffCode}
                              disabled={isPairingStaff}
                              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all min-w-[36px] min-h-[36px] flex items-center justify-center"
                              title="Generar otro código"
                            >
                              <RefreshCw className={`w-4 h-4 ${isPairingStaff ? 'animate-spin text-cyan-400' : ''}`} />
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
                            <span className="text-[11px] font-semibold">Esperando autorización y asignación de rol del Dueño...</span>
                          </div>
                        </div>
                      </div>

                      {/* Botones de Compartir Móvil (WhatsApp / Mensaje) */}
                      <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5 max-w-md mx-auto">
                        <button
                          type="button"
                          onClick={handleShareWhatsApp}
                          className="w-full sm:w-auto flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 min-h-[44px]"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>Enviar por WhatsApp al Dueño</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleCopyShareText}
                          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 flex items-center justify-center gap-2 transition-all active:scale-95 min-h-[44px]"
                        >
                          {isCopiedShare ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                          <span>{isCopiedShare ? '¡Texto Copiado!' : 'Copiar Solicitud'}</span>
                        </button>
                      </div>
                    </>
                  )}

                  {/* Acciones de Prueba Rápida y Simulación */}
                  <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <span className="text-[11px] text-slate-500">
                      ¿Estás probando en desarrollo?
                    </span>
                    <button
                      type="button"
                      disabled={isPairingStaff}
                      onClick={() => handleSimulateOwnerApproval()}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-95 min-h-[44px] sm:min-h-0"
                    >
                      <Zap className="w-3.5 h-3.5 fill-white" />
                      <span>{isPairingStaff ? 'Vinculando...' : 'Simular Aprobación Inmediata del Propietario'}</span>
                    </button>
                  </div>

                </div>
              )}

              {/* MODO 2: Introducir Código Manual */}
              {staffPairingTab === 'ENTER_CODE' && (
                submittedManualCode ? (
                  <div className="bg-slate-950/70 p-5 sm:p-6 rounded-3xl border border-cyan-500/30 text-center space-y-4 animate-in fade-in">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
                      <Clock className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-extrabold text-white">
                        Solicitud de Vinculación en Espera
                      </h4>
                      <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto">
                        El código <span className="font-mono text-cyan-400 font-bold">{submittedManualCode}</span> ha sido registrado. Esperando que el <strong className="text-white">Propietario</strong> autorice tu vinculación desde Usuarios.
                      </p>
                    </div>

                    <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping shrink-0" />
                      <span className="font-semibold">Esperando aprobación del Propietario...</span>
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSubmittedManualCode(null);
                          setPairingSuccessMsg(null);
                          setPairingStatus('PENDING');
                        }}
                        className="text-xs text-slate-400 hover:text-slate-200 underline min-h-[44px] flex items-center justify-center"
                      >
                        ← Introducir otro código
                      </button>

                      <button
                        type="button"
                        disabled={isPairingStaff}
                        onClick={() => handleSimulateOwnerApproval(submittedManualCode)}
                        className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-95 min-h-[44px]"
                      >
                        <Zap className="w-3.5 h-3.5 fill-white" />
                        <span>Simular Aprobación Inmediata</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleManualPairSubmit} className="bg-slate-950/70 p-4 sm:p-6 rounded-3xl border border-slate-800/80 space-y-4">
                    <div className="space-y-1 text-center sm:text-left">
                      <h4 className="text-sm sm:text-base font-extrabold text-white">
                        Ingresa el Código Numérico de 6 Dígitos
                      </h4>
                      <p className="text-xs text-slate-400">
                        Escribe el código proporcionado por el Dueño del negocio:
                      </p>
                    </div>

                    {/* Input Numérico de 6 Dígitos Optimizado para Móvil */}
                    <div className="py-2 text-center space-y-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        required
                        maxLength={6}
                        placeholder="123456"
                        autoCorrect="off"
                        spellCheck={false}
                        value={manualPairingCode}
                        onChange={(e) => setManualPairingCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                        className="w-full sm:w-64 mx-auto text-center font-mono text-3xl sm:text-4xl font-black tracking-widest bg-slate-900 border-2 border-cyan-500/60 rounded-2xl py-3 px-4 text-cyan-400 focus:outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/20 block min-h-[48px]"
                      />
                      <p className="text-[11px] text-slate-500 pt-1">
                        Debe contener exactamente 6 dígitos numéricos
                      </p>
                    </div>

                    {/* Botón de Enviar */}
                    <div className="pt-3 border-t border-slate-800/80 flex justify-end">
                      <button
                        type="submit"
                        disabled={isPairingStaff || manualPairingCode.length !== 6}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 min-h-[44px]"
                      >
                        <span>{isPairingStaff ? 'Enviando Solicitud...' : 'Solicitar Acceso al Dueño'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                )
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
                    <label className="block text-slate-400 font-semibold mb-1">Nombre Completo (Solo Letras) *</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, ''))}
                      placeholder="Ej. Roberto Morales"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-400 min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Teléfono Personal / WhatsApp *</label>
                    <div className="flex gap-2">
                      <select
                        value={personalAreaCode}
                        onChange={(e) => setPersonalAreaCode(e.target.value)}
                        className="w-28 bg-slate-900 border border-slate-700/80 rounded-xl px-2 py-2 text-slate-200 font-bold focus:outline-none focus:border-cyan-400 shrink-0 min-h-[44px]"
                      >
                        {MOBILE_AREA_CODES.map((item) => (
                          <option key={item.code} value={item.code} className="bg-slate-900 text-white">
                            {item.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={7}
                        value={personalPhoneDigits}
                        onChange={(e) => setPersonalPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 7))}
                        placeholder="1234567"
                        className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-cyan-400 min-h-[44px]"
                      />
                    </div>
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
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-400 min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Razón Social Legal</label>
                    <input
                      type="text"
                      value={companyLegalName}
                      onChange={(e) => setCompanyLegalName(e.target.value)}
                      placeholder="Ej. Comercializadora Xion C.A."
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-400 min-h-[44px]"
                    />
                  </div>

                  {/* Cédula vs RIF Selector */}
                  <div className="sm:col-span-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                      <label className="text-slate-300 font-bold text-xs">
                        {docType === 'V' || docType === 'E' ? 'Cédula de Identidad de Propietario *' : 'RIF Fiscal de la Empresa *'}
                      </label>
                      <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px] font-bold self-start sm:self-auto">
                        {(['V', 'J', 'E', 'G'] as DocType[]).map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setDocType(t)}
                            className={`px-2.5 py-1 rounded-md transition-all ${
                              docType === t
                                ? 'bg-cyan-500 text-slate-950 font-black shadow-sm'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {t === 'V' && 'V (Cédula)'}
                            {t === 'J' && 'J (RIF)'}
                            {t === 'E' && 'E (Extranjero)'}
                            {t === 'G' && 'G (Gob)'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <div className="w-14 bg-slate-950 border border-slate-700 rounded-xl flex items-center justify-center font-mono font-black text-cyan-400 text-xs shrink-0 min-h-[44px]">
                        {docType}-
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={9}
                        value={docNumber}
                        onChange={(e) => setDocNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                        placeholder={docType === 'V' || docType === 'E' ? 'Ej. 24123456 (Cédula)' : 'Ej. 50123456'}
                        className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-cyan-400 min-h-[44px]"
                      />
                      {(docType === 'J' || docType === 'G') && (
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-slate-500 font-mono">-</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={1}
                            value={docCheckDigit}
                            onChange={(e) => setDocCheckDigit(e.target.value.replace(/\D/g, '').slice(0, 1))}
                            placeholder="0-9"
                            className="w-12 bg-slate-900 border border-slate-700/80 rounded-xl text-center py-2 text-slate-100 font-mono font-bold focus:outline-none focus:border-cyan-400 min-h-[44px]"
                          />
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono block">
                      Identificación formateada: <strong className="text-cyan-400">{getFullTaxId(docType, docNumber, docCheckDigit) || 'Incompleta'}</strong>
                    </span>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Teléfono Comercial *</label>
                    <div className="flex gap-2">
                      <select
                        value={companyAreaCode}
                        onChange={(e) => setCompanyAreaCode(e.target.value)}
                        className="w-28 bg-slate-900 border border-slate-700/80 rounded-xl px-2 py-2 text-slate-200 font-bold focus:outline-none focus:border-cyan-400 shrink-0 min-h-[44px]"
                      >
                        {COMMERCIAL_AREA_CODES.map((item) => (
                          <option key={item.code} value={item.code} className="bg-slate-900 text-white">
                            {item.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={7}
                        value={companyPhoneDigits}
                        onChange={(e) => setCompanyPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 7))}
                        placeholder="1234567"
                        className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-cyan-400 min-h-[44px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Correo Electrónico Comercial</label>
                    <input
                      type="email"
                      value={companyEmail}
                      onChange={(e) => setCompanyEmail(e.target.value)}
                      placeholder="contacto@empresa.com"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-400 min-h-[44px]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-400 font-semibold mb-1">Dirección Fiscal / Principal *</label>
                    <input
                      type="text"
                      value={companyAddress}
                      onChange={(e) => setCompanyAddress(e.target.value)}
                      placeholder="Calle, Sector, Ciudad, Estado"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-cyan-400 min-h-[44px]"
                    />
                  </div>
                </div>
              </div>

              {/* Múltiples Compañías */}
              <div className="bg-slate-950/30 p-4 rounded-2xl border border-slate-800/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-slate-300">¿Operas múltiples compañías o marcas?</span>
                    <p className="text-[11px] text-slate-500">Puedes registrar otras razones sociales vinculadas a tu cuenta multi-sucursal.</p>
                  </div>
                  {!showAddCompanyForm && (
                    <button
                      type="button"
                      onClick={() => setShowAddCompanyForm(true)}
                      className="px-3 py-1.5 rounded-xl border border-cyan-500/40 bg-cyan-950/30 hover:bg-cyan-900/40 text-cyan-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all self-start sm:self-auto min-h-[38px]"
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
                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 space-y-3 text-xs animate-in fade-in">
                    <span className="font-bold text-cyan-300 block">Nueva Compañía Adicional</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        placeholder="Nombre Comercial *"
                        value={newCompTrade}
                        onChange={(e) => setNewCompTrade(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-slate-100 min-h-[40px]"
                      />
                      <input
                        type="text"
                        placeholder="Razón Social Legal"
                        value={newCompLegal}
                        onChange={(e) => setNewCompLegal(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-slate-100 min-h-[40px]"
                      />
                      <div className="sm:col-span-2 flex gap-2">
                        <select
                          value={newCompDocType}
                          onChange={(e) => setNewCompDocType(e.target.value as DocType)}
                          className="w-20 bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-cyan-300 font-bold min-h-[40px]"
                        >
                          <option value="J">J - RIF</option>
                          <option value="V">V - Cédula</option>
                          <option value="E">E - Extr.</option>
                          <option value="G">G - Gob.</option>
                        </select>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={9}
                          placeholder={newCompDocType === 'V' || newCompDocType === 'E' ? 'Cédula (números)' : 'RIF (números)'}
                          value={newCompDocNumber}
                          onChange={(e) => setNewCompDocNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-slate-100 font-mono min-h-[40px]"
                        />
                        {(newCompDocType === 'J' || newCompDocType === 'G') && (
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={1}
                            placeholder="0-9"
                            value={newCompDocCheck}
                            onChange={(e) => setNewCompDocCheck(e.target.value.replace(/\D/g, '').slice(0, 1))}
                            className="w-12 bg-slate-950 border border-slate-800 rounded-lg text-center py-2 text-slate-100 font-mono font-bold min-h-[40px]"
                          />
                        )}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddCompanyForm(false)}
                        className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 min-h-[36px]"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleAddAdditionalCompany}
                        className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold min-h-[36px]"
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
          <div className="sticky bottom-0 z-20 p-3 sm:p-5 border-t border-slate-800/90 bg-slate-900/95 backdrop-blur-md flex items-center justify-between min-h-[58px]">
            <div>
              {step > 1 ? (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setStep((step - 1) as any)}
                  className="px-3.5 sm:px-4 py-2 rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-800/80 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-all min-h-[42px]"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Atrás</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="px-3 py-1.5 rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-800/60 text-slate-400 hover:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all min-h-[42px]"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Cambiar Rol</span>
                  <span className="xs:hidden">Rol</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {step < 3 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (step === 1) {
                      if (!fullName.trim() || fullName.trim().length < 3) {
                        setErrorMsg('Por favor ingresa tu nombre completo (mínimo 3 letras, solo letras y espacios).');
                        return;
                      }
                      if (personalPhoneDigits.length !== 7) {
                        setErrorMsg('El teléfono personal celular debe contener exactamente 7 dígitos numéricos tras el código de área.');
                        return;
                      }
                      if (!companyTradeName.trim()) {
                        setErrorMsg('Por favor ingresa el nombre comercial de la empresa.');
                        return;
                      }
                      if (docNumber.length < 6) {
                        setErrorMsg('El número de Cédula o RIF debe contener al menos 6 dígitos numéricos.');
                        return;
                      }
                      if ((docType === 'J' || docType === 'G') && !docCheckDigit) {
                        setErrorMsg('Para RIF Jurídico o Gubernamental debes ingresar el dígito verificador final (0-9).');
                        return;
                      }
                      if (companyPhoneDigits && companyPhoneDigits.length !== 7) {
                        setErrorMsg('El teléfono comercial debe contener exactamente 7 dígitos numéricos tras el código de área.');
                        return;
                      }
                      if (!companyAddress.trim()) {
                        setErrorMsg('Por favor ingresa la dirección fiscal o sede de la empresa.');
                        return;
                      }
                    }
                    if (step === 2) {
                      if (!exchangeRate || Number(exchangeRate) <= 0) {
                        setErrorMsg('La tasa de cambio oficial debe ser un valor numérico positivo mayor a 0.');
                        return;
                      }
                      if (enableTaxes && (Number(taxRate) < 0 || Number(taxRate) > 100)) {
                        setErrorMsg('La tasa de IVA debe encontrarse entre 0% y 100%.');
                        return;
                      }
                    }
                    setErrorMsg(null);
                    setStep((step + 1) as any);
                  }}
                  className="px-4 sm:px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all min-h-[44px] active:scale-95"
                >
                  <span>Continuar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleCompleteOnboarding}
                  className="px-4 sm:px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 hover:from-emerald-300 hover:to-cyan-300 text-slate-950 font-black text-xs shadow-xl shadow-cyan-500/30 flex items-center gap-2 transition-all active:scale-95 min-h-[44px]"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span className="hidden xs:inline">Activando tu Cuenta...</span>
                      <span className="xs:hidden">Activando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                      <span className="hidden xs:inline">Completar e Iniciar Operaciones</span>
                      <span className="xs:hidden">Completar</span>
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

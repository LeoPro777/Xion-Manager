import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Copy, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  Smartphone, 
  Globe, 
  DollarSign, 
  Receipt, 
  ShieldCheck, 
  Clock, 
  Plus, 
  Minus,
  Sparkles,
  Layers,
  Calendar,
  CreditCard
} from 'lucide-react';
import { api } from '../services/api';
import { 
  BillingCycle, 
  PaymentReportMethod, 
  PaymentReportCurrency, 
  CompanyDestinationAccount, 
  BankItem, 
  CreatePaymentReportDTO,
  XionPayPlan
} from '../types';

export interface SubscriptionRenewalModalProps {
  isOpen: boolean;
  onClose: () => void;
  planName?: string;
  selectedCycle?: BillingCycle;
  extraRegisters?: number;
  totalUsd?: number;
  totalBs?: number;
  exchangeRate?: number;
  onSuccess?: (reportId: string, referenceNumber: string) => void;
  onViewPaymentsList?: () => void;
}

const DEFAULT_PLANS: XionPayPlan[] = [
  {
    id: 'plan-basic',
    code: 'BASIC',
    name: 'Plan Emprendedor Básico',
    description: 'Ideal para comercios con una sola sede y una caja registradora.',
    max_branches: 1,
    max_cash_registers: 1,
    price_monthly: 27.0,
    price_semiannual: 153.9,
    price_annual: 275.4,
    is_active: true
  },
  {
    id: 'plan-advanced',
    code: 'ADVANCED',
    name: 'Plan Comercial Avanzado',
    description: 'Pensado para negocios medianos con múltiples terminales y sucursales.',
    max_branches: 2,
    max_cash_registers: 4,
    price_monthly: 50.0,
    price_semiannual: 270.0,
    price_annual: 480.0,
    is_active: true
  },
  {
    id: 'plan-enterprise',
    code: 'ENTERPRISE',
    name: 'Plan Corporativo Enterprise',
    description: 'Para cadenas y grandes comercios con auditoría completa y sincronización masiva.',
    max_branches: 10,
    max_cash_registers: 20,
    price_monthly: 99.0,
    price_semiannual: 504.9,
    price_annual: 891.0,
    is_active: true
  }
];

export const SubscriptionRenewalModal: React.FC<SubscriptionRenewalModalProps> = ({
  isOpen,
  onClose,
  planName: initialPlanName = '',
  selectedCycle: initialCycle = 'ANNUAL',
  extraRegisters: initialExtraRegisters = 0,
  totalUsd: initialTotalUsd,
  totalBs: initialTotalBs,
  exchangeRate: propExchangeRate,
  onSuccess,
  onViewPaymentsList
}) => {
  // Stepper State: 1 = Selección de Plan; 2 = Selección de Forma de Pago; 3 = Enviar Formulario con Comprobante; 4 = Éxito / Confirmación
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Catalogs & Configuration
  const [availablePlans, setAvailablePlans] = useState<XionPayPlan[]>(DEFAULT_PLANS);
  const [destAccounts, setDestAccounts] = useState<CompanyDestinationAccount[]>([]);
  const [banks, setBanks] = useState<BankItem[]>([]);
  const [rate, setRate] = useState<number>(propExchangeRate || 37.50);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Step 1 State: Plan Selection & Add-ons
  const [selectedPlanCode, setSelectedPlanCode] = useState<string>('BASIC');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(initialCycle);
  const [extraRegistersCount, setExtraRegistersCount] = useState<number>(initialExtraRegisters);

  // Step 2 State: Payment Method & Destination Account Selection
  const [paymentMethod, setPaymentMethod] = useState<PaymentReportMethod>('pago_movil');
  const [destAccountId, setDestAccountId] = useState<string>('');

  // Step 3 State: Consignment Form & Receipt
  const [originBank, setOriginBank] = useState<string>('0102 - Banco de Venezuela');
  const [payerName, setPayerName] = useState<string>('');
  const [payerIdOrPhone, setPayerIdOrPhone] = useState<string>('');
  const [payerEmail, setPayerEmail] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [receiptPreview, setReceiptPreview] = useState<string>('');
  const [receiptFileName, setReceiptFileName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [confirmedRef, setConfirmedRef] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load plans, destination accounts, exchange rate, and banks on open
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setErrorMessage('');
      setReferenceNumber('');
      setReceiptPreview('');
      setReceiptFileName('');
      setNotes('');
      setIsSubmitting(false);

      // Fetch plans
      api.getXionPayPlans()
        .then((plans) => {
          if (plans && plans.length > 0) {
            setAvailablePlans(plans);
            // Match with initialPlanName if provided
            const matched = plans.find((p) => 
              initialPlanName && (
                p.name.toLowerCase().includes(initialPlanName.toLowerCase()) ||
                initialPlanName.toLowerCase().includes(p.code.toLowerCase())
              )
            );
            if (matched) {
              setSelectedPlanCode(matched.code);
            } else {
              setSelectedPlanCode(plans[0].code);
            }
          }
        })
        .catch(() => setAvailablePlans(DEFAULT_PLANS));

      // Fetch destination accounts
      api.getCompanyDestinationAccounts()
        .then((accs) => {
          if (accs && accs.length > 0) {
            setDestAccounts(accs);
            const firstPm = accs.find((a) => a.method === 'pago_movil') || accs[0];
            if (firstPm) setDestAccountId(firstPm.id);
          }
        })
        .catch(() => {});

      // Fetch official exchange rate if not passed as prop
      if (!propExchangeRate) {
        api.getXionPayConfig()
          .then((cfg) => {
            if (cfg.official_exchange_rate) setRate(cfg.official_exchange_rate);
          })
          .catch(() => {});
      } else {
        setRate(propExchangeRate);
      }

      // Fetch banks
      api.getVenezuelanBanks()
        .then((bList) => {
          if (bList && bList.length > 0) {
            setBanks(bList);
            const bdv = bList.find((b) => b.code === '0102') || bList[0];
            if (bdv) setOriginBank(`${bdv.code} - ${bdv.name}`);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, initialPlanName, propExchangeRate]);

  if (!isOpen) return null;

  // Selected Plan Object
  const currentPlan = availablePlans.find((p) => p.code.toUpperCase() === selectedPlanCode.toUpperCase()) || availablePlans[0] || DEFAULT_PLANS[0];

  // Price Calculations
  const cycleLabels: Record<BillingCycle, string> = {
    MONTHLY: 'Mensual',
    SEMIANNUAL: 'Semestral (-10%)',
    ANNUAL: 'Anual (-20%)'
  };

  const discount = billingCycle === 'ANNUAL' ? 0.20 : billingCycle === 'SEMIANNUAL' ? 0.10 : 0;
  const months = billingCycle === 'ANNUAL' ? 12 : billingCycle === 'SEMIANNUAL' ? 6 : 1;

  // Plan base price according to cycle
  let planPriceUsd = currentPlan.price_monthly * months * (1 - discount);
  if (billingCycle === 'ANNUAL' && currentPlan.price_annual > 0) {
    planPriceUsd = currentPlan.price_annual;
  } else if (billingCycle === 'SEMIANNUAL' && currentPlan.price_semiannual > 0) {
    planPriceUsd = currentPlan.price_semiannual;
  }

  // Extra cash registers ($10/month each)
  const extraCostUsd = (extraRegistersCount * 10 * months) * (1 - discount);
  const calculatedTotalUsd = Number((planPriceUsd + extraCostUsd).toFixed(2));
  const calculatedTotalBs = Number((calculatedTotalUsd * rate).toFixed(2));

  // Determine method currency
  const isVesMethod = ['pago_movil', 'transferencia_ves'].includes(paymentMethod);
  const currency: PaymentReportCurrency = isVesMethod ? 'VES' : 'USD';
  const amountToPay = isVesMethod ? calculatedTotalBs : calculatedTotalUsd;

  // Active Destination Account for current payment method
  const matchingAccounts = destAccounts.filter((a) => a.method === paymentMethod);
  const activeAccount = matchingAccounts.find((a) => a.id === destAccountId) || matchingAccounts[0] || destAccounts[0];

  // Clipboard copy handler
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const renderCopyButton = (text: string, key: string, label?: string) => {
    const isCopied = copiedKey === key;
    return (
      <button
        type="button"
        onClick={() => handleCopy(text, key)}
        className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-all shrink-0 ${
          isCopied
            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
            : 'bg-slate-800/90 hover:bg-slate-700 border-slate-700/70 text-slate-300 hover:text-white'
        }`}
        title="Copiar al portapapeles"
      >
        {isCopied ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-[11px] font-bold text-emerald-400">¡Copiado!</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-[11px]">{label || 'Copiar'}</span>
          </>
        )}
      </button>
    );
  };

  // Payment method selection
  const handleSelectMethod = (m: PaymentReportMethod) => {
    setPaymentMethod(m);
    const firstMatching = destAccounts.find((a) => a.method === m);
    if (firstMatching) {
      setDestAccountId(firstMatching.id);
    }
  };

  // Receipt file upload handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('El comprobante no debe superar los 5 MB.');
        return;
      }
      setReceiptFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Form submission (Step 3 -> Step 4)
  const handleSubmitConsignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!referenceNumber.trim()) {
      setErrorMessage('Por favor ingresa el número de referencia o código de confirmación del pago.');
      return;
    }

    if (paymentMethod === 'pago_movil' && !payerIdOrPhone.trim()) {
      setErrorMessage('Ingresa el teléfono o Cédula/RIF del pagador para validar el Pago Móvil.');
      return;
    }

    setIsSubmitting(true);
    try {
      const destLabel = activeAccount
        ? `${activeAccount.bank_name || activeAccount.method.toUpperCase()} - ${activeAccount.account_holder}`
        : 'Xion Pay Oficial';

      const payload: CreatePaymentReportDTO = {
        order_id: `SUB-${currentPlan.code}-${Date.now().toString().slice(-6)}`,
        concept: `Renovación Suscripción: ${currentPlan.name} (${cycleLabels[billingCycle]}) + ${extraRegistersCount} Cajas Add-on`,
        payment_method: paymentMethod,
        origin_bank: isVesMethod ? originBank : undefined,
        dest_bank: destLabel,
        payer_name: payerName.trim() || undefined,
        payer_id_or_phone: payerIdOrPhone.trim() || undefined,
        payer_email: payerEmail.trim() || undefined,
        reference_number: referenceNumber.trim(),
        amount_paid: Number(amountToPay.toFixed(2)),
        currency: currency,
        exchange_rate: rate,
        payment_date: paymentDate,
        receipt_url: receiptPreview || undefined,
        notes: notes.trim() ? `[Suscripción ${currentPlan.name}] ${notes.trim()}` : `[Suscripción Xion Manager - ${currentPlan.name}]`
      };

      const result = await api.createPaymentReport(payload);
      setConfirmedRef(referenceNumber.trim());
      setCurrentStep(4);
      if (onSuccess) {
        onSuccess(result.id, referenceNumber.trim());
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al consignar el pago de suscripción.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border-t sm:border border-slate-700/80 shadow-2xl bg-slate-900/98 flex flex-col">
        {/* Mobile Grabber Bar */}
        <div className="w-12 h-1.5 bg-slate-700/70 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />

        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0 shadow-md shadow-cyan-500/10">
              <Receipt className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Formulario de Pagos</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  Xion-Pay
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Paga tu plan de Xion Manager y sincroniza tus sucursales y cajas POS
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all active:scale-95"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stepper Progress Bar (Screens 1, 2, 3) */}
        {currentStep !== 4 && (
          <div className="px-4 sm:px-6 py-3 border-b border-slate-800/70 bg-slate-950/50 flex items-center justify-between text-xs">
            {/* Step 1 Pill */}
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className={`flex items-center gap-2 font-semibold transition-all ${
                currentStep === 1 ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                currentStep === 1 
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30' 
                  : currentStep > 1 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                    : 'bg-slate-800 text-slate-400'
              }`}>
                {currentStep > 1 ? <Check className="w-3.5 h-3.5" /> : '1'}
              </span>
              <span className="hidden xs:inline">1. Plan a Pagar</span>
              <span className="xs:hidden">1. Plan</span>
            </button>

            <div className={`h-0.5 flex-1 mx-2 sm:mx-3 rounded-full transition-colors ${
              currentStep > 1 ? 'bg-cyan-500/60' : 'bg-slate-800'
            }`} />

            {/* Step 2 Pill */}
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className={`flex items-center gap-2 font-semibold transition-all ${
                currentStep === 2 ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                currentStep === 2 
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30' 
                  : currentStep > 2 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                    : 'bg-slate-800 text-slate-400'
              }`}>
                {currentStep > 2 ? <Check className="w-3.5 h-3.5" /> : '2'}
              </span>
              <span className="hidden xs:inline">2. Forma de Pago</span>
              <span className="xs:hidden">2. Pago</span>
            </button>

            <div className={`h-0.5 flex-1 mx-2 sm:mx-3 rounded-full transition-colors ${
              currentStep > 2 ? 'bg-cyan-500/60' : 'bg-slate-800'
            }`} />

            {/* Step 3 Pill */}
            <div className={`flex items-center gap-2 font-semibold ${
              currentStep === 3 ? 'text-cyan-400' : 'text-slate-500'
            }`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                currentStep === 3 
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30' 
                  : 'bg-slate-800 text-slate-500'
              }`}>
                3
              </span>
              <span className="hidden xs:inline">3. Comprobante</span>
              <span className="xs:hidden">3. Enviar</span>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-6 flex-1 space-y-5">
          {/* ============================================================== */}
          {/* PRIMERA PANTALLA: SELECCIÓN DE PLAN A PAGAR                    */}
          {/* ============================================================== */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Cycle Toggle */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Frecuencia de Facturación:
                </label>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {(['MONTHLY', 'SEMIANNUAL', 'ANNUAL'] as BillingCycle[]).map((cycle) => {
                    const isSelected = billingCycle === cycle;
                    return (
                      <button
                        key={cycle}
                        type="button"
                        onClick={() => setBillingCycle(cycle)}
                        className={`py-2 sm:py-2.5 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                          isSelected
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 shadow-md shadow-cyan-500/10 scale-[1.02]'
                            : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <div>{cycleLabels[cycle]}</div>
                        {cycle === 'ANNUAL' && (
                          <span className="text-[10px] text-amber-400 font-normal block font-mono">
                            ★ Mejor Ahorro
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Plans Selection Cards */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Selecciona el Plan Deseado:
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {availablePlans.map((plan) => {
                    const isSelected = plan.code.toUpperCase() === selectedPlanCode.toUpperCase();
                    
                    // Base cycle calculation for this plan
                    let planCycleCost = plan.price_monthly * months * (1 - discount);
                    if (billingCycle === 'ANNUAL' && plan.price_annual > 0) {
                      planCycleCost = plan.price_annual;
                    } else if (billingCycle === 'SEMIANNUAL' && plan.price_semiannual > 0) {
                      planCycleCost = plan.price_semiannual;
                    }
                    const planCycleBs = planCycleCost * rate;

                    return (
                      <div
                        key={plan.id}
                        onClick={() => setSelectedPlanCode(plan.code)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between relative ${
                          isSelected
                            ? 'bg-cyan-950/30 border-cyan-400 shadow-lg shadow-cyan-500/15 ring-1 ring-cyan-400'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                        }`}
                      >
                        {/* Radio indicator */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="text-xs font-extrabold text-white leading-tight">
                            {plan.name}
                          </span>
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            isSelected ? 'border-cyan-400 bg-cyan-500 text-slate-950' : 'border-slate-600 bg-slate-900'
                          }`}>
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                        </div>

                        {/* Plan Limits */}
                        <p className="text-[11px] text-slate-400 mb-3 min-h-[32px] line-clamp-2">
                          {plan.description || 'Plan oficial Xion-Pay con sincronización para puntos de venta.'}
                        </p>

                        <div className="space-y-1 py-2 border-y border-slate-800/80 text-[11px] text-slate-300">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Sucursales:</span>
                            <span className="font-bold text-white">{plan.max_branches} incluida{plan.max_branches > 1 ? 's' : ''}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Cajas POS:</span>
                            <span className="font-bold text-white">{plan.max_cash_registers} incluida{plan.max_cash_registers > 1 ? 's' : ''}</span>
                          </div>
                        </div>

                        {/* Price Tag */}
                        <div className="pt-3 mt-1">
                          <div className="text-lg font-black text-white leading-tight">
                            ${planCycleCost.toFixed(2)} <span className="text-[10px] font-normal text-slate-400 font-mono">USD</span>
                          </div>
                          <div className="text-[11px] font-mono font-bold text-cyan-400">
                            ≈ Bs. {planCycleBs.toFixed(2)}
                          </div>
                          <span className="text-[9px] text-slate-500 block mt-0.5">
                            {billingCycle === 'ANNUAL' ? 'Facturado anualmente' : billingCycle === 'SEMIANNUAL' ? 'Facturado cada 6 meses' : 'Facturado mensual'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Add-on Extra Cash Registers */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/70 border border-slate-800/90 flex flex-col xs:flex-row items-start xs:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-slate-200 block">
                    Cajas Add-on Extras (Terminales POS)
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    $10 USD / mes por cada caja adicional (Total: ${extraCostUsd.toFixed(2)} USD)
                  </span>
                </div>

                <div className="flex items-center gap-2.5 self-end xs:self-auto">
                  <button
                    type="button"
                    onClick={() => setExtraRegistersCount(Math.max(0, extraRegistersCount - 1))}
                    className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 font-bold active:scale-95 transition-all"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-base font-extrabold text-cyan-400 w-7 text-center font-mono">
                    {extraRegistersCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setExtraRegistersCount(extraRegistersCount + 1)}
                    className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 font-bold active:scale-95 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Summary Bottom Bar & Next Button */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-cyan-400 font-bold block">
                    Resumen del Plan Seleccionado
                  </span>
                  <div className="text-sm font-bold text-white">
                    {currentPlan.name} · {cycleLabels[billingCycle]}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Tasa Oficial Xion-Pay: Bs. {rate.toFixed(2)} / USD
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4">
                  <div className="text-right">
                    <div className="text-xl font-black text-white">
                      ${calculatedTotalUsd.toFixed(2)} USD
                    </div>
                    <div className="text-xs font-mono font-bold text-cyan-400">
                      ≈ Bs. {calculatedTotalBs.toFixed(2)}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 active:scale-95 min-h-[44px]"
                  >
                    <span>Continuar a Forma de Pago</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* SEGUNDA PANTALLA: SELECCIÓN DE FORMA DE PAGO                   */}
          {/* ============================================================== */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Selected Plan Summary Tag */}
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 truncate">
                  <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold">
                    PASO 1 LISTO
                  </span>
                  <span className="font-semibold text-slate-200 truncate">
                    {currentPlan.name} ({cycleLabels[billingCycle]})
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-bold text-white font-mono">
                    ${calculatedTotalUsd.toFixed(2)} USD (Bs. {calculatedTotalBs.toFixed(2)})
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="text-[11px] text-cyan-400 hover:underline font-medium"
                  >
                    Cambiar
                  </button>
                </div>
              </div>

              {/* Payment Methods Grid */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Selecciona la Vía para Realizar el Pago:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'pago_movil', label: 'Pago Móvil', icon: Smartphone, tag: 'VES Inmediato' },
                    { id: 'transferencia_ves', label: 'Transferencia', icon: Building2, tag: 'Bancos VE' },
                    { id: 'binance_pay', label: 'Binance Pay', icon: DollarSign, tag: 'USDT' },
                    { id: 'zelle', label: 'Zelle', icon: Globe, tag: 'USD Directo' }
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = paymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleSelectMethod(m.id as PaymentReportMethod)}
                        className={`p-3 rounded-2xl border text-left transition-all active:scale-95 ${
                          isSelected
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-500/10'
                            : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-cyan-400' : 'text-slate-400'}`} />
                          <span className="text-[9px] font-mono font-bold px-1 rounded bg-slate-900 text-slate-300">
                            {m.tag}
                          </span>
                        </div>
                        <span className="text-xs font-bold block truncate">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Destination Bank Account Information Card */}
              <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 space-y-3">
                <div className="flex items-center justify-between border-b border-cyan-900/50 pb-2">
                  <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold">
                    <Building2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Datos de Destino de la Empresa para Transferir</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {isVesMethod ? `Tasa: Bs. ${rate.toFixed(2)}` : 'Moneda: USD/USDT'}
                  </span>
                </div>

                {/* Multiple Accounts Tabs for selected method (e.g. BDV vs Banesco) */}
                {matchingAccounts.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {matchingAccounts.map((acc) => (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => setDestAccountId(acc.id)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all shrink-0 active:scale-95 ${
                          destAccountId === acc.id
                            ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-sm'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {acc.bank_name || acc.method}
                      </button>
                    ))}
                  </div>
                )}

                {/* Details List */}
                <div className="space-y-2 text-xs">
                  {/* Amount to pay with copy button */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
                    <span className="text-slate-400 text-[11px]">Monto exacto a transferir:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-cyan-300 text-sm">
                        {isVesMethod ? `Bs. ${calculatedTotalBs.toFixed(2)}` : `$${calculatedTotalUsd.toFixed(2)} USD`}
                      </span>
                      {renderCopyButton(isVesMethod ? calculatedTotalBs.toFixed(2) : calculatedTotalUsd.toFixed(2), 'monto')}
                    </div>
                  </div>

                  {/* Bank Name */}
                  {activeAccount?.bank_name && (
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/50">
                      <span className="text-slate-400 text-[11px]">Banco Destino:</span>
                      <span className="font-bold text-slate-200">{activeAccount.bank_name}</span>
                    </div>
                  )}

                  {/* Account Holder */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/50">
                    <span className="text-slate-400 text-[11px]">Titular de la Cuenta:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200 text-right truncate max-w-[170px]">
                        {activeAccount?.account_holder || 'Xion Technologies C.A.'}
                      </span>
                      {renderCopyButton(activeAccount?.account_holder || 'Xion Technologies C.A.', 'titular')}
                    </div>
                  </div>

                  {/* Tax ID */}
                  {activeAccount?.tax_id && (
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/50">
                      <span className="text-slate-400 text-[11px]">RIF / Identificación:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-200">{activeAccount.tax_id}</span>
                        {renderCopyButton(activeAccount.tax_id, 'rif')}
                      </div>
                    </div>
                  )}

                  {/* Phone for Pago Movil */}
                  {activeAccount?.phone && (
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/50">
                      <span className="text-slate-400 text-[11px]">Teléfono Pago Móvil:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-cyan-300">{activeAccount.phone}</span>
                        {renderCopyButton(activeAccount.phone, 'phone')}
                      </div>
                    </div>
                  )}

                  {/* Account Number for Transfer */}
                  {activeAccount?.account_number && (
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/50">
                      <span className="text-slate-400 text-[11px]">Nº de Cuenta:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold text-slate-200 truncate max-w-[150px] sm:max-w-[200px]">
                          {activeAccount.account_number}
                        </span>
                        {renderCopyButton(activeAccount.account_number, 'acc')}
                      </div>
                    </div>
                  )}

                  {/* Email / Pay ID for Zelle / Binance */}
                  {(activeAccount?.email || (activeAccount as any)?.binance_id) && (
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/50">
                      <span className="text-slate-400 text-[11px]">Correo / Pay ID:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-cyan-300 truncate max-w-[150px] sm:max-w-[200px]">
                          {activeAccount.email || (activeAccount as any).binance_id}
                        </span>
                        {renderCopyButton(activeAccount.email || (activeAccount as any).binance_id, 'email')}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/80 text-[11px] text-slate-300 flex items-center gap-2 border border-slate-800">
                  <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Realiza la operación en tu banca móvil con estos datos y continúa para enviar tu comprobante.</span>
                </div>
              </div>

              {/* Navigation Actions */}
              <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="w-full sm:w-auto px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 min-h-[44px]"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Volver a Planes</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage('');
                    setCurrentStep(3);
                  }}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 active:scale-95 min-h-[48px]"
                >
                  <span>Ya realicé el pago · Continuar a Comprobante</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TERCERA PANTALLA: ENVIAR FORMULARIO CON COMPROBANTE            */}
          {/* ============================================================== */}
          {currentStep === 3 && (
            <form onSubmit={handleSubmitConsignment} className="space-y-4 animate-in fade-in duration-150">
              {/* Selected Plan & Method Pill */}
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 truncate">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
                    PLAN & MÉTODO LISTOS
                  </span>
                  <span className="font-semibold text-slate-200 truncate">
                    {currentPlan.name} · {paymentMethod.toUpperCase().replace('_', ' ')}
                  </span>
                </div>
                <div className="font-bold text-cyan-400 font-mono shrink-0">
                  {isVesMethod ? `Bs. ${calculatedTotalBs.toFixed(2)}` : `$${calculatedTotalUsd.toFixed(2)} USD`}
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Receipt File Upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Comprobante o Capture Bancario
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*,application/pdf"
                  className="hidden"
                />

                {receiptPreview ? (
                  <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-cyan-500/40 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                        <img src={receiptPreview} alt="Comprobante" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Comprobante adjunto</span>
                        </span>
                        <span className="text-[10px] text-slate-400 truncate max-w-[180px] block">
                          {receiptFileName || 'Capture cargado exitosamente'}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setReceiptPreview('');
                        setReceiptFileName('');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-semibold active:scale-95"
                    >
                      Cambiar
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-5 rounded-2xl bg-slate-950/60 border-2 border-dashed border-slate-700 hover:border-cyan-400/60 cursor-pointer text-center space-y-1.5 transition-all group active:scale-[0.99]"
                  >
                    <Upload className="w-7 h-7 text-cyan-400 group-hover:scale-110 mx-auto transition-transform" />
                    <span className="text-xs font-bold text-slate-200 block">
                      Toca aquí para adjuntar o tomar foto del comprobante
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Formatos JPG, PNG, WEBP o PDF (Máximo 5MB)
                    </span>
                  </div>
                )}
              </div>

              {/* Form Grid: Reference Number, Date, Origin Bank, Notes */}
              <div className="space-y-3">
                {/* Reference Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Número de Referencia Bancaria / Confirmación <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="Ej. 98451203"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 font-mono tracking-wider focus:border-cyan-400 focus:outline-none min-h-[44px]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Origin Bank (VES methods) */}
                  {isVesMethod && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Banco Emisor (Tu Banco)
                      </label>
                      <select
                        value={originBank}
                        onChange={(e) => setOriginBank(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none min-h-[44px]"
                      >
                        {banks.map((b) => (
                          <option key={b.code} value={`${b.code} - ${b.name}`}>
                            {b.code} - {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Payer Phone / ID */}
                  <div className={!isVesMethod ? 'sm:col-span-2' : ''}>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {paymentMethod === 'pago_movil' 
                        ? 'Teléfono del Pagador' 
                        : paymentMethod === 'zelle' 
                          ? 'Correo / Titular Zelle' 
                          : 'Cédula / Teléfono del Titular'}
                    </label>
                    <input
                      type="text"
                      inputMode={paymentMethod === 'pago_movil' ? 'tel' : 'text'}
                      required={['pago_movil', 'zelle'].includes(paymentMethod)}
                      value={payerIdOrPhone}
                      onChange={(e) => setPayerIdOrPhone(e.target.value)}
                      placeholder={paymentMethod === 'pago_movil' ? 'Ej. 0414-1234567' : 'Ej. V-18234567'}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none min-h-[44px]"
                    />
                  </div>

                  {/* Payment Date */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Fecha del Pago
                    </label>
                    <input
                      type="date"
                      required
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none min-h-[44px]"
                    />
                  </div>

                  {/* Additional Notes */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Nota u Observación (Opcional)
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ej. Transferencia cuenta jurídica"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none min-h-[44px]"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons: Back to Step 2 and Submit */}
              <div className="pt-3 border-t border-slate-800/80 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="w-full sm:w-auto px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 min-h-[44px]"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Volver a Formas de Pago</span>
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60 min-h-[48px]"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4 animate-spin" />
                      <span>Consignando comprobante...</span>
                    </span>
                  ) : (
                    <>
                      <span>Enviar Formulario de Pago</span>
                      <Check className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ============================================================== */}
          {/* CONFIRMACIÓN / ÉXITO (STEP 4)                                   */}
          {/* ============================================================== */}
          {currentStep === 4 && (
            <div className="py-6 px-4 text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 shadow-xl shadow-amber-500/10">
                <Clock className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Estado: Pendiente por Conciliar</span>
                </span>
                <h4 className="text-lg font-bold text-white pt-1">¡Comprobante Registrado con Éxito!</h4>
                <p className="text-xs text-slate-300 max-w-sm mx-auto">
                  Tu reporte ha sido enviado al equipo administrativo de Xion-Pay. Mientras el pago es conciliado, dispones de una prórroga de contingencia operativa de 24 a 48 horas.
                </p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Contingencia operativa activada automáticamente</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs inline-block text-left space-y-1.5 min-w-[280px]">
                <div className="text-slate-400 flex justify-between gap-4">
                  <span>Plan:</span>
                  <strong className="text-white">{currentPlan.name}</strong>
                </div>
                <div className="text-slate-400 flex justify-between gap-4">
                  <span>Referencia:</span>
                  <strong className="text-cyan-400 font-mono">{confirmedRef}</strong>
                </div>
                <div className="text-slate-400 flex justify-between gap-4">
                  <span>Monto Reportado:</span>
                  <strong className="text-white">{isVesMethod ? `Bs. ${calculatedTotalBs.toFixed(2)}` : `$${calculatedTotalUsd.toFixed(2)} USD`}</strong>
                </div>
                <div className="text-slate-400 flex justify-between gap-4">
                  <span>Forma de Pago:</span>
                  <strong className="text-slate-200">{paymentMethod.toUpperCase().replace('_', ' ')}</strong>
                </div>
                <div className="text-slate-400 flex justify-between gap-4">
                  <span>Estado:</span>
                  <strong className="text-amber-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Pendiente por Conciliar</span>
                  </strong>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                {onViewPaymentsList && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onViewPaymentsList();
                    }}
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-cyan-500/25 transition-all active:scale-95 min-h-[44px] flex items-center justify-center gap-1.5"
                  >
                    <Receipt className="w-4 h-4" />
                    <span>Ver Mis Pagos Pendientes</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm transition-all active:scale-95 min-h-[44px]"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const PaymentModal = SubscriptionRenewalModal;

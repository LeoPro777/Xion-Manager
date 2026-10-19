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
  Calendar,
  Sparkles,
  CreditCard,
  Clock
} from 'lucide-react';
import { api } from '../services/api';
import { 
  BillingCycle, 
  PaymentReportMethod, 
  PaymentReportCurrency, 
  CompanyDestinationAccount, 
  BankItem, 
  CreatePaymentReportDTO 
} from '../types';

interface SubscriptionRenewalModalProps {
  isOpen: boolean;
  onClose: () => void;
  planName: string;
  selectedCycle: BillingCycle;
  extraRegisters: number;
  totalUsd: number;
  totalBs: number;
  exchangeRate: number;
  onSuccess?: (reportId: string, referenceNumber: string) => void;
  onViewPaymentsList?: () => void;
}

export const SubscriptionRenewalModal: React.FC<SubscriptionRenewalModalProps> = ({
  isOpen,
  onClose,
  planName,
  selectedCycle,
  extraRegisters,
  totalUsd,
  totalBs,
  exchangeRate,
  onSuccess,
  onViewPaymentsList
}) => {
  // Stepper State: 1 = Choose method & View bank details; 2 = Upload receipt & submit; 3 = Success
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Accounts & Banks from API
  const [destAccounts, setDestAccounts] = useState<CompanyDestinationAccount[]>([]);
  const [banks, setBanks] = useState<BankItem[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Form State
  const [paymentMethod, setPaymentMethod] = useState<PaymentReportMethod>('pago_movil');
  const [originBank, setOriginBank] = useState<string>('Banco de Venezuela');
  const [destAccountId, setDestAccountId] = useState<string>('dest-01');
  const [payerName, setPayerName] = useState<string>('');
  const [payerIdOrPhone, setPayerIdOrPhone] = useState<string>('');
  const [payerEmail, setPayerEmail] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [receiptPreview, setReceiptPreview] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [confirmedRef, setConfirmedRef] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setErrorMessage('');
      setReferenceNumber('');
      setReceiptPreview('');
      setNotes('');
      api.getCompanyDestinationAccounts().then((accs) => {
        setDestAccounts(accs);
        const first = accs.find((a) => a.method === 'pago_movil') || accs[0];
        if (first) setDestAccountId(first.id);
      });
      api.getVenezuelanBanks().then(setBanks);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const cycleLabels: Record<BillingCycle, string> = {
    MONTHLY: 'Mensual',
    SEMIANNUAL: 'Semestral (10% Desc.)',
    ANNUAL: 'Anual (20% Desc.)'
  };

  const isVesMethod = ['pago_movil', 'transferencia_ves'].includes(paymentMethod);
  const currency: PaymentReportCurrency = isVesMethod ? 'VES' : 'USD';
  const amountToPay = isVesMethod ? totalBs : totalUsd;

  const matchingAccounts = destAccounts.filter((a) => a.method === paymentMethod);
  const activeAccount = matchingAccounts.find((a) => a.id === destAccountId) || matchingAccounts[0] || destAccounts[0];

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

  const handleSelectMethod = (m: PaymentReportMethod) => {
    setPaymentMethod(m);
    const firstMatching = destAccounts.find((a) => a.method === m);
    if (firstMatching) {
      setDestAccountId(firstMatching.id);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('El comprobante no debe superar los 5 MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGoToConsignment = () => {
    setErrorMessage('');
    setCurrentStep(2);
  };

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
        order_id: `SUB-${planName.toUpperCase().replace(/\s+/g, '-')}-${Date.now().toString().slice(-6)}`,
        concept: `Renovación Suscripción: ${planName} (${cycleLabels[selectedCycle]}) + ${extraRegisters} Cajas Add-on`,
        payment_method: paymentMethod,
        origin_bank: isVesMethod ? originBank : undefined,
        dest_bank: destLabel,
        payer_name: payerName.trim() || undefined,
        payer_id_or_phone: payerIdOrPhone.trim() || undefined,
        payer_email: payerEmail.trim() || undefined,
        reference_number: referenceNumber.trim(),
        amount_paid: Number(amountToPay.toFixed(2)),
        currency: currency,
        exchange_rate: exchangeRate,
        payment_date: paymentDate,
        receipt_url: receiptPreview || undefined,
        notes: notes.trim() ? `[Renovación Suscripción] ${notes.trim()}` : '[Renovación Suscripción Xion Manager]'
      };

      const result = await api.createPaymentReport(payload);
      setConfirmedRef(referenceNumber.trim());
      setCurrentStep(3);
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
      <div className="glass-panel w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border-t sm:border border-slate-700/80 shadow-2xl bg-slate-900/98 flex flex-col">
        {/* Mobile Grabber Bar */}
        <div className="w-12 h-1.5 bg-slate-700/70 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />

        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
              <Receipt className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Renovar Suscripción</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  Xion Pay
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Módulo exclusivo para renovar tu licencia de Xion Manager
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Minimalist Stepper Header (Only shown on Steps 1 & 2) */}
        {currentStep !== 3 && (
          <div className="px-4 sm:px-5 py-2.5 border-b border-slate-800/60 bg-slate-950/40 flex items-center justify-between text-xs">
            <div className={`flex items-center gap-2 font-medium ${currentStep === 1 ? 'text-cyan-400' : 'text-slate-400'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${currentStep === 1 ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>
                1
              </span>
              <span className="font-semibold">1. Elige Método y Datos</span>
            </div>
            <div className="h-px w-6 sm:w-10 bg-slate-800" />
            <div className={`flex items-center gap-2 font-medium ${currentStep === 2 ? 'text-cyan-400' : 'text-slate-500'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${currentStep === 2 ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                2
              </span>
              <span className="font-semibold">2. Consignar Comprobante</span>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-5 flex-1 space-y-4">
          {/* Summary Mini-Card (Always visible in Steps 1 & 2) */}
          {currentStep !== 3 && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800/90 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">
                  {planName} · Ciclo {cycleLabels[selectedCycle]}
                </span>
                <span className="text-xs text-slate-300">
                  {extraRegisters > 0 ? `+${extraRegisters} cajas add-on extras` : 'Sin cajas add-on extras'}
                </span>
                <span className="text-[10px] text-cyan-400 font-mono block mt-0.5">
                  Tasa oficial Xion-Pay: Bs. {exchangeRate.toFixed(2)} / USD
                </span>
              </div>
              <div className="text-right">
                <div className="text-lg font-black text-white leading-tight">
                  ${totalUsd.toFixed(2)} USD
                </div>
                <div className="text-[11px] font-mono text-cyan-400 font-bold">
                  ≈ Bs. {totalBs.toFixed(2)}
                </div>
              </div>
            </div>
          )}

          {/* STEP 1: Choose Method & Display Required Bank Details */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Selecciona la vía para pagar a Xion Pay:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'pago_movil', label: 'Pago Móvil', icon: Smartphone, tag: 'VES' },
                    { id: 'transferencia_ves', label: 'Transferencia', icon: Building2, tag: 'Bancos VE' },
                    { id: 'zelle', label: 'Zelle', icon: Globe, tag: 'USD' },
                    { id: 'binance_pay', label: 'Binance Pay', icon: DollarSign, tag: 'USDT' }
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = paymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleSelectMethod(m.id as PaymentReportMethod)}
                        className={`p-2.5 rounded-2xl border text-left transition-all active:scale-95 ${
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

              {/* Exact Bank Details Card for Transferring */}
              <div className="p-4 rounded-2xl bg-cyan-950/25 border border-cyan-500/30 space-y-3">
                <div className="flex items-center justify-between border-b border-cyan-900/50 pb-2">
                  <div className="flex items-center gap-2 text-cyan-300 text-xs font-bold">
                    <Building2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Datos Requeridos para Realizar el Pago</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {isVesMethod ? `BCV: Bs. ${exchangeRate.toFixed(2)}` : 'Moneda: USD'}
                  </span>
                </div>

                {/* Destination Accounts Selector (if multiple exist for method, e.g. Banesco / BDV) */}
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

                {/* Detailed Information Box */}
                <div className="space-y-2 text-xs">
                  {/* Monto exacto */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
                    <span className="text-slate-400 text-[11px]">Monto exacto a transferir:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-cyan-300 text-sm">
                        {isVesMethod ? `Bs. ${totalBs.toFixed(2)}` : `$${totalUsd.toFixed(2)} USD`}
                      </span>
                      {renderCopyButton(isVesMethod ? totalBs.toFixed(2) : totalUsd.toFixed(2), 'monto')}
                    </div>
                  </div>

                  {/* Bank Name / Channel */}
                  {activeAccount?.bank_name && (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/50">
                      <span className="text-slate-400 text-[11px]">Banco Destino:</span>
                      <span className="font-bold text-slate-200">{activeAccount.bank_name}</span>
                    </div>
                  )}

                  {/* Titular */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/50">
                    <span className="text-slate-400 text-[11px]">Titular de la Cuenta:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200 text-right truncate max-w-[170px]">
                        {activeAccount?.account_holder || 'Xion Inversiones C.A.'}
                      </span>
                      {renderCopyButton(activeAccount?.account_holder || 'Xion Inversiones C.A.', 'titular')}
                    </div>
                  </div>

                  {/* RIF or Tax ID */}
                  {activeAccount?.tax_id && (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/50">
                      <span className="text-slate-400 text-[11px]">RIF:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-200">{activeAccount.tax_id}</span>
                        {renderCopyButton(activeAccount.tax_id, 'rif')}
                      </div>
                    </div>
                  )}

                  {/* Phone for Pago Movil */}
                  {activeAccount?.phone && (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/50">
                      <span className="text-slate-400 text-[11px]">Teléfono Pago Móvil:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-cyan-300">{activeAccount.phone}</span>
                        {renderCopyButton(activeAccount.phone, 'phone')}
                      </div>
                    </div>
                  )}

                  {/* Account Number */}
                  {activeAccount?.account_number && (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/50">
                      <span className="text-slate-400 text-[11px]">Nº de Cuenta:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold text-slate-200 truncate max-w-[150px] sm:max-w-[200px]">
                          {activeAccount.account_number}
                        </span>
                        {renderCopyButton(activeAccount.account_number, 'acc')}
                      </div>
                    </div>
                  )}

                  {/* Email for Zelle / Binance */}
                  {activeAccount?.email && (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/50">
                      <span className="text-slate-400 text-[11px]">Correo / Pay ID:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-cyan-300 truncate max-w-[150px] sm:max-w-[200px]">
                          {activeAccount.email}
                        </span>
                        {renderCopyButton(activeAccount.email, 'email')}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/80 text-[11px] text-slate-300 flex items-center gap-2 border border-slate-800">
                  <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Realiza la operación en tu banco con estos datos y continúa para subir el capture.</span>
                </div>
              </div>

              {/* Action Button: Proceed to Consign */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleGoToConsignment}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 active:scale-95 min-h-[48px]"
                >
                  <span>Ya realicé el pago · Continuar a Consignar</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Upload Receipt & Consign Subscription Payment */}
          {currentStep === 2 && (
            <form onSubmit={handleSubmitConsignment} className="space-y-4 animate-in fade-in duration-150">
              {errorMessage && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Receipt Upload Box (Drag and Drop / File Input) */}
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
                          <span>Comprobante listo</span>
                        </span>
                        <span className="text-[10px] text-slate-400">Capture cargado correctamente</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReceiptPreview('')}
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
                      Toca aquí para subir o tomar foto del capture
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Formatos JPG, PNG o PDF (Máximo 5MB)
                    </span>
                  </div>
                )}
              </div>

              {/* Form Grid: Reference Number, Date, Origin Bank */}
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
                  {/* Origin Bank (VES only) */}
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
                          <option key={b.code} value={b.name}>
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
                      Nota Adicional (Opcional)
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ej. Pago cuenta jurídica"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none min-h-[44px]"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons: Back and Consign */}
              <div className="pt-3 border-t border-slate-800/80 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="w-full sm:w-auto px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 min-h-[44px]"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Volver a ver datos de pago</span>
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60 min-h-[48px]"
                >
                  {isSubmitting ? (
                    <span>Consignando pago...</span>
                  ) : (
                    <>
                      <span>Consignar Pago de Suscripción</span>
                      <Check className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Minimalist Confirmation / Success Screen */}
          {currentStep === 3 && (
            <div className="py-6 px-4 text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                <Clock className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Estado: Pendiente por Aprobar</span>
                </span>
                <h4 className="text-lg font-bold text-white pt-1">¡Pago de Renovación Reportado!</h4>
                <p className="text-xs text-slate-300 max-w-sm mx-auto">
                  Tu reporte ha sido registrado con éxito en Xion-Pay. Mientras el pago es conciliado, dispones de una prórroga de contingencia operativa de 24 a 48 horas.
                </p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Contingencia operativa activada automáticamente</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs inline-block text-left space-y-1.5 min-w-[260px]">
                <div className="text-slate-400 flex justify-between gap-4">
                  <span>Referencia:</span>
                  <strong className="text-cyan-400 font-mono">{confirmedRef}</strong>
                </div>
                <div className="text-slate-400 flex justify-between gap-4">
                  <span>Monto:</span>
                  <strong className="text-white">{isVesMethod ? `Bs. ${totalBs.toFixed(2)}` : `$${totalUsd.toFixed(2)} USD`}</strong>
                </div>
                <div className="text-slate-400 flex justify-between gap-4">
                  <span>Estado:</span>
                  <strong className="text-amber-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Pendiente por Aprobar</span>
                  </strong>
                </div>
                <div className="text-slate-400 flex justify-between gap-4">
                  <span>Destino:</span>
                  <strong className="text-slate-200">Xion Pay Oficial</strong>
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

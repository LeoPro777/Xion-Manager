import React, { useState, useEffect } from 'react';
import {
  Receipt,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Building2,
  Smartphone,
  Globe,
  DollarSign,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  Eye,
  Plus,
  Minus,
  AlertCircle,
  X
} from 'lucide-react';
import { api } from '../services/api';
import {
  PaymentReportItem,
  PaymentReportMethod,
  CompanyDestinationAccount,
  AccountStatus,
  BillingCycle
} from '../types';
import { SubscriptionRenewalModal } from '../components/SubscriptionRenewalModal';
import { SubscriptionPaymentsListModal } from '../components/SubscriptionPaymentsListModal';

export const PaymentReportsPage: React.FC = () => {
  // Filter & Search State
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');

  // Data State
  const [reports, setReports] = useState<PaymentReportItem[]>([]);
  const [destAccounts, setDestAccounts] = useState<CompanyDestinationAccount[]>([]);
  const [exchangeRate, setExchangeRate] = useState<number>(37.50);
  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Renewal Configuration State
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>('MONTHLY');
  const [extraRegisters, setExtraRegisters] = useState<number>(1);
  const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
  const [isPaymentsListModalOpen, setIsPaymentsListModalOpen] = useState(false);

  // Preview & Copy State
  const [previewReceipt, setPreviewReceipt] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load Data
  const loadReports = async () => {
    setIsLoading(true);
    try {
      const data = await api.getPaymentReports({
        status: statusFilter === 'all' ? 'all' : statusFilter,
        payment_method: methodFilter,
        search: searchQuery
      });
      setReports(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([
      api.getCompanyDestinationAccounts().then(setDestAccounts),
      api.getExchangeRate().then((cfg) => setExchangeRate(cfg.current_exchange_rate_bs)),
      api.getAccountStatus().then(setAccountStatus)
    ]);
  }, []);

  useEffect(() => {
    loadReports();
  }, [statusFilter, methodFilter, searchQuery]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Pricing Calculation
  const planName = accountStatus?.plan_name || 'Plan Pro';
  const basePrice = planName.toLowerCase().includes('enterprise') ? 99 : planName.toLowerCase().includes('pro') ? 49 : 29;
  const discount = selectedCycle === 'ANNUAL' ? 0.2 : selectedCycle === 'SEMIANNUAL' ? 0.1 : 0;
  const months = selectedCycle === 'ANNUAL' ? 12 : selectedCycle === 'SEMIANNUAL' ? 6 : 1;
  const totalUsd = ((basePrice + extraRegisters * 10) * months) * (1 - discount);
  const totalBs = totalUsd * exchangeRate;

  // KPIs
  const pendingCount = reports.filter(r => r.status === 'pending').length;
  const approvedCount = reports.filter(r => r.status === 'approved').length;

  const getMethodIcon = (m: string) => {
    switch (m) {
      case 'pago_movil':
        return <Smartphone className="w-3.5 h-3.5 text-cyan-400" />;
      case 'transferencia_ves':
        return <Building2 className="w-3.5 h-3.5 text-blue-400" />;
      case 'zelle':
        return <Globe className="w-3.5 h-3.5 text-purple-400" />;
      case 'binance_pay':
        return <DollarSign className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Receipt className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const getMethodLabel = (m: string) => {
    switch (m) {
      case 'pago_movil':
        return 'Pago Móvil VES';
      case 'transferencia_ves':
        return 'Transferencia VES';
      case 'zelle':
        return 'Zelle USD';
      case 'binance_pay':
        return 'Binance Pay';
      default:
        return m.replace('_', ' ').toUpperCase();
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Bar */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
            <Receipt className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
              <span>Gestión de Pagos de Suscripción</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                Xion Pay
              </span>
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400">
              Al reportar una renovación o pago de suscripción, el registro queda en estado <strong>Pendiente</strong> hasta que sea validado y aprobado.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={() => setIsPaymentsListModalOpen(true)}
            className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700/60 transition-all flex items-center justify-center gap-1.5 active:scale-95"
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Ver Modal de Pagos</span>
          </button>

          <button
            type="button"
            onClick={() => setIsRenewalModalOpen(true)}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-1.5 active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Renovar Suscripción</span>
          </button>
        </div>
      </div>

      {/* Top Banner: Subscription Status & Quick Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Subscription Plan Card */}
        <div className="lg:col-span-8 glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
                Tu Licencia Activa
              </span>
              <h3 className="text-xl font-black text-white">{planName}</h3>
            </div>
            {accountStatus && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 self-start sm:self-auto">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{accountStatus.traffic_light.label}</span>
                <span className="text-slate-400 font-normal">· Vence en {accountStatus.days_remaining} días</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Cycle Selector */}
            <div className="space-y-1.5">
              <label className="text-slate-400 font-semibold block">Ciclo para renovar:</label>
              <div className="grid grid-cols-3 gap-1">
                {(['MONTHLY', 'SEMIANNUAL', 'ANNUAL'] as BillingCycle[]).map((cycle) => (
                  <button
                    key={cycle}
                    type="button"
                    onClick={() => setSelectedCycle(cycle)}
                    className={`py-1.5 px-1 rounded-lg text-[10px] font-bold border transition-all ${
                      selectedCycle === cycle
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                        : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {cycle === 'MONTHLY' ? '1 Mes' : cycle === 'SEMIANNUAL' ? '6 Meses' : '1 Año'}
                  </button>
                ))}
              </div>
            </div>

            {/* Extra Registers */}
            <div className="space-y-1.5">
              <label className="text-slate-400 font-semibold block">Cajas Add-on:</label>
              <div className="flex items-center gap-2 bg-slate-900/70 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setExtraRegisters(Math.max(0, extraRegisters - 1))}
                  className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 font-bold active:scale-95"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="flex-1 text-center font-bold text-cyan-400 text-xs">
                  {extraRegisters} {extraRegisters === 1 ? 'caja' : 'cajas'}
                </span>
                <button
                  type="button"
                  onClick={() => setExtraRegisters(extraRegisters + 1)}
                  className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 font-bold active:scale-95"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Price Preview */}
            <div className="space-y-1.5 sm:text-right">
              <label className="text-slate-400 font-semibold block">Total a renovar:</label>
              <div>
                <div className="text-base font-black text-white">${totalUsd.toFixed(2)} USD</div>
                <div className="text-[11px] font-mono font-bold text-cyan-400">
                  ≈ Bs. {totalBs.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsRenewalModalOpen(true)}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <Receipt className="w-4 h-4" />
            <span>Pagar o Renovar Ahora (Pago Móvil / Transferencia)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right: BCV & Official Accounts Info */}
        <div className="lg:col-span-4 glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>Tasa Oficial BCV</span>
            </span>
            <span className="text-base font-black text-cyan-300 font-mono">
              Bs. {exchangeRate.toFixed(2)}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <span className="text-[11px] text-slate-400 block font-semibold">
              Cuentas oficiales para realizar tu pago:
            </span>
            {destAccounts.slice(0, 2).map((acc) => (
              <div key={acc.id} className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] space-y-0.5">
                <div className="flex justify-between font-bold text-slate-200">
                  <span>{acc.bank_name || acc.method.toUpperCase()}</span>
                  <span className="text-cyan-400 uppercase font-mono text-[9px]">{acc.method.replace('_', ' ')}</span>
                </div>
                <div className="text-slate-400 truncate">Titular: {acc.account_holder}</div>
                {acc.phone && <div className="text-cyan-300 font-mono">Pago Móvil: {acc.phone}</div>}
                {acc.tax_id && <div className="text-slate-400 font-mono">RIF: {acc.tax_id}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Section: Lista de Pagos (Pendientes por Aprobar y Aprobados) */}
      <div className="glass-panel p-4 sm:p-6 rounded-2xl border border-slate-800 space-y-4">
        {/* Navigation Tabs for Payment Statuses */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800">
            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              className={`py-2 px-3.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                statusFilter === 'pending'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pendientes por Aprobar</span>
              {pendingCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] flex items-center justify-center ml-0.5">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('approved')}
              className={`py-2 px-3.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                statusFilter === 'approved'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Pagos Aprobados</span>
              {approvedCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 font-black text-[9px] flex items-center justify-center ml-0.5">
                  {approvedCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`py-2 px-3.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'all'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Todos ({reports.length})</span>
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por referencia, banco..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Informative Banner when showing Pending payments */}
        {statusFilter === 'pending' && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              La lógica al reportar una renovación o primer pago es que el pago queda en estado <strong>Pendiente por Aprobar</strong>. En breve el equipo de Xion valida la acreditación y activa tu período contratado.
            </span>
          </div>
        )}

        {/* Payments List */}
        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Cargando lista de pagos...
          </div>
        ) : reports.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mx-auto text-slate-500">
              <Receipt className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-300">
              {statusFilter === 'pending'
                ? 'No tienes pagos pendientes por aprobar'
                : statusFilter === 'approved'
                ? 'No hay pagos aprobados registrados'
                : 'No se encontraron pagos registrados'}
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {statusFilter === 'pending'
                ? 'Cuando realices una transferencia o Pago Móvil y reportes el comprobante, quedará listado aquí en espera de verificación.'
                : 'Una vez validados tus comprobantes por el equipo de Xion, aparecerán aquí con su estado Aprobado.'}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsRenewalModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/30 text-cyan-300 font-semibold text-xs transition-all active:scale-95"
              >
                Reportar Pago de Renovación
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => {
              const isPending = report.status === 'pending';
              const isApproved = report.status === 'approved';
              const isRejected = report.status === 'rejected';

              return (
                <div
                  key={report.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isPending
                      ? 'bg-amber-950/10 border-amber-500/30'
                      : isApproved
                      ? 'bg-emerald-950/10 border-emerald-500/30'
                      : 'bg-slate-900/50 border-slate-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: Method, Reference, Dates */}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                        {getMethodIcon(report.payment_method)}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-white">
                            {getMethodLabel(report.payment_method)}
                          </span>

                          {/* Status Badge */}
                          {isPending && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-400" />
                              <span>Pendiente por Aprobar</span>
                            </span>
                          )}
                          {isApproved && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Aprobado / Conciliado</span>
                            </span>
                          )}
                          {isRejected && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                              <XCircle className="w-3 h-3 text-rose-400" />
                              <span>Rechazado</span>
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 flex-wrap">
                          <span>Referencia:</span>
                          <strong className="text-cyan-300">{report.reference_number || report.id}</strong>
                          <button
                            type="button"
                            onClick={() => handleCopy(report.reference_number || report.id, report.id)}
                            className="p-0.5 hover:text-white text-slate-400 active:scale-90"
                            title="Copiar referencia"
                          >
                            {copiedId === report.id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                          <span>· Fecha: {report.payment_date || report.created_at?.slice(0, 10)}</span>
                          {report.origin_bank && <span>· Banco: {report.origin_bank}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Right: Amounts & View Receipt Action */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-0 border-slate-800">
                      <div className="text-left sm:text-right">
                        <div className="text-base font-black text-white leading-tight">
                          {report.currency === 'VES'
                            ? `Bs. ${report.amount_paid.toFixed(2)}`
                            : `$${report.amount_paid.toFixed(2)} ${report.currency}`}
                        </div>
                        {report.amount_base_equivalent && report.currency === 'VES' && (
                          <div className="text-[10px] font-mono text-cyan-400">
                            ≈ ${report.amount_base_equivalent.toFixed(2)} USD
                          </div>
                        )}
                      </div>

                      {report.receipt_url && (
                        <button
                          type="button"
                          onClick={() => setPreviewReceipt(report.receipt_url!)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold flex items-center gap-1 active:scale-95 transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver Comprobante</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {isRejected && report.rejection_reason && (
                    <div className="mt-2.5 p-2 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300">
                      <strong>Motivo de rechazo:</strong> {report.rejection_reason}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Subscription Renewal Modal (Multi-step Minimalist Assistant) */}
      <SubscriptionRenewalModal
        isOpen={isRenewalModalOpen}
        onClose={() => setIsRenewalModalOpen(false)}
        planName={planName}
        selectedCycle={selectedCycle}
        extraRegisters={extraRegisters}
        totalUsd={totalUsd}
        totalBs={totalBs}
        exchangeRate={exchangeRate}
        onViewPaymentsList={() => setIsPaymentsListModalOpen(true)}
        onSuccess={() => {
          loadReports();
          api.getAccountStatus().then(setAccountStatus);
        }}
      />

      {/* Subscription Payments List Modal */}
      <SubscriptionPaymentsListModal
        isOpen={isPaymentsListModalOpen}
        onClose={() => setIsPaymentsListModalOpen(false)}
        onOpenRenewal={() => setIsRenewalModalOpen(true)}
      />

      {/* Full Receipt Lightbox Modal */}
      {previewReceipt && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
          <div className="relative max-w-lg w-full bg-slate-900 rounded-3xl border border-slate-700 overflow-hidden shadow-2xl p-4 flex flex-col space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-slate-200">Comprobante de Pago</span>
              <button
                type="button"
                onClick={() => setPreviewReceipt(null)}
                className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto rounded-xl bg-slate-950 flex items-center justify-center p-2">
              <img
                src={previewReceipt}
                alt="Comprobante"
                className="max-w-full max-h-[65vh] object-contain rounded-lg"
              />
            </div>
            <button
              type="button"
              onClick={() => setPreviewReceipt(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
            >
              Cerrar Vista Previa
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  CheckCircle2,
  XCircle,
  Receipt,
  Search,
  Plus,
  Copy,
  Check,
  Eye,
  Building2,
  Smartphone,
  Globe,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { PaymentReportItem, PaymentReportStatus } from '../types';

interface SubscriptionPaymentsListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRenewal?: () => void;
  initialFilter?: 'pending' | 'approved' | 'all';
}

export const SubscriptionPaymentsListModal: React.FC<SubscriptionPaymentsListModalProps> = ({
  isOpen,
  onClose,
  onOpenRenewal,
  initialFilter = 'pending'
}) => {
  const [reports, setReports] = useState<PaymentReportItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<'pending' | 'approved' | 'all'>(initialFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [previewReceipt, setPreviewReceipt] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const data = await api.getPaymentReports({
        status: activeFilter === 'all' ? 'all' : activeFilter,
        search: searchQuery
      });
      setReports(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setActiveFilter(initialFilter);
      loadReports();
    }
  }, [isOpen, initialFilter]);

  useEffect(() => {
    if (isOpen) {
      loadReports();
    }
  }, [activeFilter, searchQuery]);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRef(id);
    setTimeout(() => setCopiedRef(null), 2000);
  };

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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-xl max-h-[92vh] overflow-hidden rounded-t-3xl sm:rounded-3xl border-t sm:border border-slate-700/80 shadow-2xl bg-slate-900/98 flex flex-col">
        {/* Mobile Grabber Bar */}
        <div className="w-12 h-1.5 bg-slate-700/70 rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
              <Receipt className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Mis Pagos de Suscripción</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  Xion Pay
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Consulta el estado de tus pagos pendientes por aprobar y aprobados
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

        {/* Filter Navigation & Search */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/40 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 flex-1">
              <button
                type="button"
                onClick={() => setActiveFilter('pending')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  activeFilter === 'pending'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Pendientes por Aprobar</span>
                {pendingCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('approved')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  activeFilter === 'approved'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Pagos Aprobados</span>
                {approvedCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 font-black text-[9px] flex items-center justify-center">
                    {approvedCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                  activeFilter === 'all'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Todos</span>
              </button>
            </div>

            {onOpenRenewal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenRenewal();
                }}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-500/20 active:scale-95 transition-all shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo Pago</span>
              </button>
            )}
          </div>

          {/* Quick Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por referencia, banco o método..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Informative Banner on Pending Tab */}
        {activeFilter === 'pending' && (
          <div className="px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-300 text-[11px] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              Al reportar un pago, este queda en estado <strong>Pendiente por Aprobar</strong> hasta que el equipo de Xion verifique la acreditación.
            </span>
          </div>
        )}

        {/* Payments List Container */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-3">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Cargando historial de pagos...
            </div>
          ) : reports.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mx-auto text-slate-500">
                <Receipt className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-300">
                {activeFilter === 'pending'
                  ? 'No tienes pagos pendientes por aprobar'
                  : activeFilter === 'approved'
                  ? 'No hay pagos aprobados registrados'
                  : 'No se encontraron pagos registrados'}
              </h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {activeFilter === 'pending'
                  ? 'Cuando reportes una renovación por Pago Móvil o Transferencia aparecerá aquí hasta que sea verificada.'
                  : 'Tus pagos verificados y renovaciones exitosas se mostrarán en esta lista.'}
              </p>
              {onOpenRenewal && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenRenewal();
                    }}
                    className="px-5 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 hover:bg-cyan-500/30 text-cyan-300 font-semibold text-xs transition-all active:scale-95"
                  >
                    Reportar Renovación de Suscripción
                  </button>
                </div>
              )}
            </div>
          ) : (
            reports.map((report) => {
              const isPending = report.status === 'pending';
              const isApproved = report.status === 'approved';
              const isRejected = report.status === 'rejected';

              return (
                <div
                  key={report.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isPending
                      ? 'bg-amber-950/15 border-amber-500/30'
                      : isApproved
                      ? 'bg-emerald-950/15 border-emerald-500/30'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  {/* Top Bar: Method & Status Badge */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-center shrink-0">
                        {getMethodIcon(report.payment_method)}
                      </div>
                      <span className="text-xs font-bold text-slate-200">
                        {getMethodLabel(report.payment_method)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
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
                  </div>

                  {/* Middle Row: Amounts and Reference */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
                    <div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                        <span>Ref:</span>
                        <strong className="text-slate-100 font-bold">
                          {report.reference_number || report.id}
                        </strong>
                        <button
                          type="button"
                          onClick={() => handleCopy(report.reference_number || report.id, report.id)}
                          className="p-1 hover:text-cyan-300 text-slate-400 active:scale-90 transition-all"
                          title="Copiar referencia"
                        >
                          {copiedRef === report.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Fecha: {report.payment_date || report.created_at?.slice(0, 10)}
                        {report.origin_bank && ` · ${report.origin_bank}`}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-black text-white leading-tight">
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
                  </div>

                  {/* Rejection Note if Rejected */}
                  {isRejected && report.rejection_reason && (
                    <div className="mt-2 p-2 rounded-xl bg-rose-950/40 border border-rose-500/30 text-[11px] text-rose-300">
                      <strong>Motivo:</strong> {report.rejection_reason}
                    </div>
                  )}

                  {/* Receipt Preview Trigger */}
                  {report.receipt_url && (
                    <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                      <span className="text-[10px] text-slate-400">Comprobante adjuntado</span>
                      <button
                        type="button"
                        onClick={() => setPreviewReceipt(report.receipt_url!)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-semibold flex items-center gap-1 active:scale-95 transition-all"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Ver Comprobante</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Bottom Bar on Mobile */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/50 flex items-center justify-between gap-3">
          {onOpenRenewal && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenRenewal();
              }}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-1.5 active:scale-95 min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>Reportar Nuevo Pago</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all active:scale-95 min-h-[44px]"
          >
            Cerrar
          </button>
        </div>
      </div>

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

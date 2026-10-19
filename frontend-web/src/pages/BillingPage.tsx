import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle2, AlertTriangle, AlertCircle, Upload, ShieldCheck, Zap, Plus, Minus, ArrowRight, Receipt, ExternalLink, Clock } from 'lucide-react';
import { api } from '../services/api';
import { AccountStatus, BillingCycle, XionPayPlan } from '../types';
import { SubscriptionRenewalModal } from '../components/SubscriptionRenewalModal';
import { SubscriptionPaymentsListModal } from '../components/SubscriptionPaymentsListModal';

interface BillingPageProps {
  onNavigateToPaymentReports?: () => void;
}

export const BillingPage: React.FC<BillingPageProps> = ({ onNavigateToPaymentReports }) => {
  const [status, setStatus] = useState<AccountStatus | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>('MONTHLY');
  const [extraRegisters, setExtraRegisters] = useState<number>(1);
  const [paymentTab, setPaymentTab] = useState<'card' | 'report'>('report');
  const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
  const [isPaymentsListModalOpen, setIsPaymentsListModalOpen] = useState(false);
  const [xionPayRate, setXionPayRate] = useState<number>(37.50);
  const [tenantStoreRate, setTenantStoreRate] = useState<number>(36.50);
  const [xionPayPlans, setXionPayPlans] = useState<XionPayPlan[]>([]);

  useEffect(() => {
    api.getAccountStatus().then(setStatus);
    api.getXionPayConfig().then((cfg) => setXionPayRate(cfg.official_exchange_rate));
    api.getExchangeRate().then((cfg) => setTenantStoreRate(cfg.current_exchange_rate_bs));
    api.getXionPayPlans().then(setXionPayPlans);
  }, []);

  if (!status) return <div className="text-center py-12 text-slate-400">Cargando estado de cuenta...</div>;

  const currentPlan = xionPayPlans.find(p => p.name.toLowerCase().includes(status.plan_name.toLowerCase())) 
    || xionPayPlans.find(p => status.plan_name.toLowerCase().includes(p.code.toLowerCase()));

  const basePrice = currentPlan 
    ? (selectedCycle === 'ANNUAL' ? currentPlan.price_annual / 12 : selectedCycle === 'SEMIANNUAL' ? currentPlan.price_semiannual / 6 : currentPlan.price_monthly)
    : (status.plan_name.toLowerCase().includes('enterprise') ? 99 : status.plan_name.toLowerCase().includes('pro') ? 49 : 29);

  const discount = selectedCycle === 'ANNUAL' ? 0.2 : selectedCycle === 'SEMIANNUAL' ? 0.1 : 0;
  const months = selectedCycle === 'ANNUAL' ? 12 : selectedCycle === 'SEMIANNUAL' ? 6 : 1;
  const totalUsd = ((basePrice + extraRegisters * 10) * months) * (1 - discount);
  const totalBs = totalUsd * xionPayRate;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Bar */}
      <div className="glass-panel p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-800">
        <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
          <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 shrink-0" />
          <span>Mi Cuenta (Xion-Pay)</span>
        </h3>
        <p className="text-[11px] sm:text-xs text-slate-400 hidden xs:block">
          Gestiona tu suscripción, licencias de sucursales, consumo de cajas registradoras y reporta tus pagos
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Panel: Account Health & Resource Usage */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Salud de tu Cuenta</span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {status.traffic_light.label}
              </span>
            </div>

            <div>
              <h4 className="text-xl font-extrabold text-white">{status.plan_name}</h4>
              <p className="text-xs text-slate-400 mt-1">
                Facturación: <strong className="text-slate-200">{status.billing_cycle}</strong> · Vence en <strong className="text-cyan-400">{status.days_remaining} días</strong>
              </p>
            </div>

            {/* Resource Progress Bars */}
            <div className="space-y-4 pt-3 border-t border-slate-800">
              <h5 className="text-xs font-bold text-slate-300">Consumo de Recursos Contratados</h5>

              {/* Branches Bar */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400">Sucursales creadas</span>
                  <span className="font-bold text-white">
                    {status.resource_usage.branches.used} de {status.resource_usage.branches.limit}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                  <div
                    className="h-full bg-cyan-400 rounded-full"
                    style={{ width: `${status.resource_usage.branches.percentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Cash Registers Bar */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400">Cajas registradoras activas</span>
                  <span className="font-bold text-white">
                    {status.resource_usage.cash_registers.used} de {status.resource_usage.cash_registers.limit}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${status.resource_usage.cash_registers.percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400">
              ℹ️ Si requieres más cajas registradoras sin cambiar de plan base, puedes añadir cajas Add-on en la sección derecha.
            </div>
          </div>
        </div>

        {/* Right Panel: Plans, Upgrades & Payment Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
            <div>
              <h4 className="text-base font-bold text-slate-100">Renovación y Ampliación de Capacidad</h4>
              <p className="text-xs text-slate-400">Selecciona tu ciclo de facturación y configura tus terminales adicionales</p>
            </div>

            {/* Billing Cycle Selector */}
            <div className="grid grid-cols-3 gap-3">
              {(['MONTHLY', 'SEMIANNUAL', 'ANNUAL'] as BillingCycle[]).map((cycle) => {
                const isSelected = selectedCycle === cycle;
                const labels = { MONTHLY: 'Mensual', SEMIANNUAL: 'Semestral (-10%)', ANNUAL: 'Anual (-20%)' };
                return (
                  <button
                    key={cycle}
                    onClick={() => setSelectedCycle(cycle)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all ${isSelected
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-md shadow-cyan-500/10'
                        : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                  >
                    {labels[cycle]}
                  </button>
                );
              })}
            </div>

            {/* Add-on Cash Registers Calculator */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-200 block">Cajas Add-on Adicionales</span>
                <span className="text-[11px] text-slate-400">$10 USD / mes por caja extra</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setExtraRegisters(Math.max(0, extraRegisters - 1))}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 font-bold"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-base font-extrabold text-cyan-400 w-6 text-center">{extraRegisters}</span>
                <button
                  onClick={() => setExtraRegisters(extraRegisters + 1)}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 font-bold"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Payment Method Switcher */}
            <div className="space-y-4">
              <div className="flex border-b border-slate-800">
                <button
                  onClick={() => setPaymentTab('report')}
                  className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all ${paymentTab === 'report' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400'
                    }`}
                >
                  Reportar Pago Móvil / Transferencia
                </button>
                <button
                  onClick={() => setPaymentTab('card')}
                  className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all ${paymentTab === 'card' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-slate-400'
                    }`}
                >
                  Tarjeta Inmediata (Xion-Pay)
                </button>
              </div>

              {paymentTab === 'report' ? (
                <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
                      <Receipt className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-slate-100">
                        Renovación de Suscripción (Pago Móvil / Transferencia)
                      </h5>
                      <p className="text-[11px] text-slate-400">
                        Renueva tu licencia de Xion Manager con Pago Móvil, Transferencia VES, Zelle o Binance Pay.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300">
                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                      <div className="flex items-center justify-between mb-0.5">
                        <strong className="text-cyan-300 block">✓ Tasa Oficial Xion-Pay</strong>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
                          Bs. {xionPayRate.toFixed(2)}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mb-1">
                        (Diferente a la tasa POS de tu tienda: Bs. {tenantStoreRate.toFixed(2)})
                      </span>
                      <span>Monto calculado: <strong className="text-white">${totalUsd.toFixed(2)} USD</strong> (≈ Bs. {totalBs.toFixed(2)})</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                      <strong className="text-cyan-300 block mb-0.5">✓ Asistente en 2 Pasos</strong>
                      <span>Copia datos bancarios en 1 toque y consigna tu capture bancario al instante.</span>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <button
                      type="button"
                      onClick={() => setIsRenewalModalOpen(true)}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 active:scale-95 min-h-[48px]"
                    >
                      <Receipt className="w-4 h-4" />
                      <span>Iniciar Renovación de Suscripción</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsPaymentsListModalOpen(true)}
                      className="w-full py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 font-semibold text-xs border border-slate-700/60 transition-all flex items-center justify-center gap-2 active:scale-95 min-h-[44px]"
                    >
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>Ver Mis Pagos (Pendientes por Aprobar y Aprobados)</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center space-y-3 bg-slate-900/40 rounded-xl border border-slate-800">
                  <ShieldCheck className="w-8 h-8 text-cyan-400 mx-auto" />
                  <h5 className="text-sm font-bold text-slate-200">Pasarela Xion-Pay Segura</h5>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Procesamiento de tarjetas de crédito y débito internacionales con acreditación instantánea.
                  </p>
                  <button className="px-6 py-2.5 rounded-xl bg-cyan-500 text-white font-bold text-xs hover:bg-cyan-400">
                    Pagar Ahora con Tarjeta
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <SubscriptionRenewalModal
        isOpen={isRenewalModalOpen}
        onClose={() => setIsRenewalModalOpen(false)}
        planName={status.plan_name}
        selectedCycle={selectedCycle}
        extraRegisters={extraRegisters}
        totalUsd={totalUsd}
        totalBs={totalBs}
        exchangeRate={xionPayRate}
        onViewPaymentsList={() => setIsPaymentsListModalOpen(true)}
        onSuccess={() => {
          api.getAccountStatus().then(setStatus);
        }}
      />

      <SubscriptionPaymentsListModal
        isOpen={isPaymentsListModalOpen}
        onClose={() => setIsPaymentsListModalOpen(false)}
        onOpenRenewal={() => setIsRenewalModalOpen(true)}
      />
    </div>
  );
};

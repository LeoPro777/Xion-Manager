import React, { useState, useEffect } from 'react';
import { Settings, DollarSign, RefreshCw, Save, CheckCircle2, Shield, Percent, Radio, Monitor, Zap } from 'lucide-react';
import { api } from '../services/api';
import { SystemSettings } from '../types';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [exchangeRate, setExchangeRate] = useState<string>('37.50');
  const [taxRate, setTaxRate] = useState<string>('16.0');
  const [enableTaxes, setEnableTaxes] = useState<boolean>(true);
  const [autoSync, setAutoSync] = useState<boolean>(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    api.getExchangeRate().then((cfg) => {
      setSettings(cfg);
      setExchangeRate(cfg.current_exchange_rate_bs.toString());
      setTaxRate(cfg.tax_rate.toString());
      setEnableTaxes(cfg.enable_taxes);
      setAutoSync(cfg.auto_sync_pos);
    });
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const updated = await api.updateExchangeRate({
      current_exchange_rate_bs: parseFloat(exchangeRate) || 37.5,
      tax_rate: parseFloat(taxRate) || 16.0,
      enable_taxes: enableTaxes,
      auto_sync_pos: autoSync
    });
    setSettings(updated);
    setSaving(false);
    setSuccessMsg('¡Tasa cambiaria y ajustes actualizados exitosamente! La nueva tasa ha sido transmitida en tiempo real a las terminales Xion-POS.');
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  if (!settings) return <div className="text-center py-12 text-slate-400">Cargando configuraciones...</div>;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 glass-panel p-3.5 sm:p-4 rounded-xl sm:rounded-2xl">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
            <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 shrink-0" />
            <span>Configuraciones</span>
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-400 hidden xs:block">
            Establece la Tasa Oficial (Bs./USD) y parámetros fiscales sincronizados con Xion-POS
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold">
          <Zap className="w-3.5 h-3.5 fill-cyan-400" />
          <span>Sync POS: Activo</span>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Form Panel */}
        <form onSubmit={handleSaveSettings} className="lg:col-span-8 space-y-6">
          {/* Exchange Rate Card */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-100">Tasa Cambiaria Oficial (Bs. / USD)</h4>
                  <p className="text-xs text-slate-400">Monto en Bolívares equivalente a 1.00 Dólar estadounidense</p>
                </div>
              </div>
              <span className="text-[11px] font-mono text-slate-500">Última mod: {new Date(settings.updated_at).toLocaleTimeString('es-ES')}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1.5">Tasa Oficial (Bs.)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-lg font-extrabold text-cyan-400 focus:outline-none focus:border-cyan-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Bs. / $</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-1">
                <span className="text-slate-400 font-semibold block">Calculadora de Conversión Rápida</span>
                <div className="text-slate-200">
                  $10.00 USD = <strong className="text-cyan-400">{(parseFloat(exchangeRate || '0') * 10).toFixed(2)} Bs.</strong>
                </div>
                <div className="text-slate-200">
                  $50.00 USD = <strong className="text-cyan-400">{(parseFloat(exchangeRate || '0') * 50).toFixed(2)} Bs.</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Tax & Fiscal Settings */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-800/80 pb-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Percent className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-100">Configuración Fiscal e Impuestos</h4>
                <p className="text-xs text-slate-400">Porcentaje de IVA y aplicación en tickets de venta</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-1.5">Alícuota IVA (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-200 text-xs font-bold"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div>
                  <span className="text-xs font-bold text-slate-200 block">Habilitar Cobro de IVA</span>
                  <span className="text-[11px] text-slate-400">Aplica porcentaje en ventas POS</span>
                </div>
                <input
                  type="checkbox"
                  checked={enableTaxes}
                  onChange={(e) => setEnableTaxes(e.target.checked)}
                  className="w-5 h-5 accent-cyan-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Auto POS Sync Switch */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Monitor className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-100">Sincronización Automática con Terminales Xion-POS</h4>
                  <p className="text-xs text-slate-400">Transmite la tasa cambiaria actualizada en tiempo real a todas las cajas registradoras</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
                className="w-5 h-5 accent-cyan-500 cursor-pointer"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Guardando y Transmitiendo Tasa...' : 'Guardar Cambios y Transmitir Tasa a Xion-POS'}</span>
          </button>
        </form>

        {/* Right Info Panel */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              Gobernanza de Tasa en Xion-Manager
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Al modificar la tasa cambiaria en Xion-Manager, el servidor emite una notificación de actualización a través del canal WebSocket (<code className="text-cyan-300">/ws/live-sync</code>).
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Las terminales locales de <strong>Xion-POS</strong> actualizan automáticamente sus precios de venta en moneda local (Bs.) sin interrumpir las sesiones de caja abiertas.
            </p>

            <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-500 font-mono">
              Servidor Central: ONLINE<br />
              Canal Live Sync: ACTIVO<br />
              Moneda Referencia: USD ($)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

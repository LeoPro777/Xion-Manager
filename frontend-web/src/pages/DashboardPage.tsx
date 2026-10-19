import React, { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, ShoppingBag, Percent, ArrowUpRight, Store, Monitor, MapPin, X } from 'lucide-react';
import { api } from '../services/api';
import { DashboardMetrics, Branch, CashRegister } from '../types';
import { LocationMapPicker, MapMarkerItem } from '../components/LocationMapPicker';

export const DashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [showMapModal, setShowMapModal] = useState(false);

  useEffect(() => {
    api.getDashboardMetrics().then(setMetrics);
    api.getBranches().then(setBranches);
    api.getCashRegisters().then(setCashRegisters);
  }, []);

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
    ...cashRegisters.map(r => ({
      id: r.id,
      name: r.name,
      lat: r.latitude || (branches.find(b => b.id === r.branch_id)?.latitude || 10.6417),
      lng: r.longitude || (branches.find(b => b.id === r.branch_id)?.longitude || -71.6125),
      type: 'register' as const,
      subtitle: r.location_name || r.branch_name || 'Terminal POS',
      status: r.status === 'OPEN' ? 'En Turno' : 'Cerrada'
    }))
  ];

  if (!metrics) return <div className="text-center py-12 text-slate-400">Cargando métricas...</div>;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-4 glass-panel p-3.5 sm:p-4 rounded-xl sm:rounded-2xl">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-100">Resumen Ejecutivo de Negocio</h3>
          <p className="text-[11px] sm:text-xs text-slate-400 hidden xs:block">Métricas consolidadas en tiempo real desde terminales Xion-POS</p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg sm:rounded-xl px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs text-slate-300 flex-1 sm:flex-none">
            <Store className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <select 
              value={selectedBranch} 
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-transparent border-none text-slate-200 font-medium focus:outline-none cursor-pointer text-xs w-full"
            >
              <option value="all" className="bg-slate-900">Todas las Sucursales</option>
              {branches.map(b => (
                <option key={b.id} value={b.id} className="bg-slate-900">{b.name}</option>
              ))}
            </select>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg sm:rounded-xl px-2.5 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs text-slate-300 font-medium shrink-0">
            {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
          </div>
        </div>
      </div>

      {/* KPI Cards Grid - Compact Minimalist 2x2 Grid on Mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* KPI 1: Ventas Totales */}
        <div className="glass-panel p-3 sm:p-4 rounded-xl sm:rounded-2xl relative overflow-hidden group border border-slate-800/80 hover:border-cyan-500/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-400 truncate">Ventas Totales</span>
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
              <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <h4 className="text-base sm:text-xl lg:text-2xl font-black text-slate-100 tracking-tight truncate">
              ${metrics.total_sales.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            </h4>
            <div className="flex items-center gap-1 mt-1 text-[10px] sm:text-xs font-medium text-emerald-400 truncate">
              <ArrowUpRight className="w-3 h-3 shrink-0" />
              <span className="truncate">+{metrics.sales_change_pct}% vs. ant.</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Ingresos Brutos */}
        <div className="glass-panel p-3 sm:p-4 rounded-xl sm:rounded-2xl relative overflow-hidden group border border-slate-800/80 hover:border-blue-500/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-400 truncate">Ingresos Brutos</span>
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <h4 className="text-base sm:text-xl lg:text-2xl font-black text-slate-100 tracking-tight truncate">
              ${metrics.gross_income.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            </h4>
            <span className="text-[10px] sm:text-[11px] text-slate-400 mt-1 block truncate">Acumulado mes</span>
          </div>
        </div>

        {/* KPI 3: Transacciones */}
        <div className="glass-panel p-3 sm:p-4 rounded-xl sm:rounded-2xl relative overflow-hidden group border border-slate-800/80 hover:border-indigo-500/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-400 truncate">Transacciones POS</span>
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
              <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <h4 className="text-base sm:text-xl lg:text-2xl font-black text-slate-100 tracking-tight truncate">
              {metrics.transaction_count}
            </h4>
            <div className="flex items-center gap-1 mt-1 text-[10px] sm:text-xs font-medium text-emerald-400 truncate">
              <ArrowUpRight className="w-3 h-3 shrink-0" />
              <span className="truncate">+{metrics.transactions_change_pct}% volumen</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Margen Promedio */}
        <div className="glass-panel p-3 sm:p-4 rounded-xl sm:rounded-2xl relative overflow-hidden group border border-slate-800/80 hover:border-emerald-500/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-400 truncate">Margen Promedio</span>
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
              <Percent className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <h4 className="text-base sm:text-xl lg:text-2xl font-black text-slate-100 tracking-tight truncate">
              {metrics.avg_margin}%
            </h4>
            <span className="text-[10px] sm:text-[11px] text-slate-400 mt-1 block truncate">Rentabilidad catálogo</span>
          </div>
        </div>
      </div>

      {/* Branches Sales Breakdown Table */}
      <div className="glass-panel rounded-xl sm:rounded-2xl p-3.5 sm:p-6 border border-slate-800">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h4 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-1.5 sm:gap-2">
            <Store className="w-4 h-4 text-cyan-400" />
            <span>Rendimiento por Sucursal</span>
          </h4>
          <button 
            onClick={() => setShowMapModal(true)}
            className="text-[11px] sm:text-xs text-cyan-400 font-semibold cursor-pointer hover:underline flex items-center gap-1"
          >
            <MapPin className="w-3.5 h-3.5 text-rose-500" />
            <span>Ver mapa</span>
          </button>
        </div>

        {/* Mobile View: Clean native-style cards */}
        <div className="sm:hidden space-y-2.5">
          {branches.map((b) => (
            <div key={b.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 shrink-0 rounded-lg bg-slate-800 flex items-center justify-center text-cyan-400 font-bold text-[11px]">
                    {b.name.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="font-bold text-xs text-slate-100 truncate">{b.name}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                  Operativa
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">{b.address}</p>
              <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/60 text-xs">
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-300">
                  <Monitor className="w-3 h-3 text-cyan-400" />
                  {b.active_cash_registers_count} Cajas
                </span>
                <span className="font-bold text-emerald-400 text-xs">$6,240.25</span>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="p-3.5 rounded-l-xl">Sucursal</th>
                <th className="p-3.5">Dirección</th>
                <th className="p-3.5">Cajas Activas</th>
                <th className="p-3.5">Ventas del Día</th>
                <th className="p-3.5 text-right rounded-r-xl">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {branches.map((b) => (
                <tr key={b.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="p-3.5 font-semibold text-slate-100 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-cyan-400 font-bold text-xs">
                      {b.name.substring(0, 2).toUpperCase()}
                    </div>
                    {b.name}
                  </td>
                  <td className="p-3.5 text-slate-400 text-xs">{b.address}</td>
                  <td className="p-3.5 font-medium">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 text-slate-300 border border-slate-800 text-xs">
                      <Monitor className="w-3.5 h-3.5 text-cyan-400" />
                      {b.active_cash_registers_count} Cajas
                    </span>
                  </td>
                  <td className="p-3.5 font-bold text-emerald-400">$6,240.25</td>
                  <td className="p-3.5 text-right">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Operativa
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Global Map Modal */}
      {showMapModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-4xl max-h-[92vh] overflow-y-auto p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-rose-500" />
                <div>
                  <h4 className="text-base font-bold text-slate-100">
                    Mapa de Sedes y Cajas POS
                  </h4>
                  <p className="text-xs text-slate-400">
                    Vista geográfica en vivo estilo Google Maps ({allMarkers.length} terminales y sucursales)
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowMapModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-xl overflow-hidden border border-slate-800">
              <LocationMapPicker
                latitude={branches[0]?.latitude || 10.6417}
                longitude={branches[0]?.longitude || -71.6125}
                height="480px"
                markers={allMarkers}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

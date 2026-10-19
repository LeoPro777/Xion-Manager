import React, { useState } from 'react';
import { FileSpreadsheet, Download, FileText, Calendar, Filter, CheckCircle2, TrendingUp, Store, Package, Monitor } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [downloadingReport, setDownloadingReport] = useState<string | null>(null);
  const [successReport, setSuccessReport] = useState<string | null>(null);

  const reportCategories = [
    {
      id: 'sales',
      title: 'Ventas y Facturación Consolidada',
      description: 'Ingresos brutos, desgloses por método de pago (Pago Móvil, Zelle, Efectivo, Tarjeta) y márgenes netos.',
      icon: TrendingUp,
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
    },
    {
      id: 'branches',
      title: 'Rendimiento Comparativo por Sucursal',
      description: 'Ventas, volumen de tickets y promedio de compra comparando todas las sedes físicas activas.',
      icon: Store,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    },
    {
      id: 'cash',
      title: 'Auditoría de Cajas y Arqueos Ciegos',
      description: 'Historial exhaustivo de aperturas, cierres de turno, fondos iniciales y diferencias de dinero registradas.',
      icon: Monitor,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
    },
    {
      id: 'inventory',
      title: 'Rotación de Inventario y Existencias',
      description: 'Valorización de stock por sucursal, productos críticos por agotar y movimientos de mermas.',
      icon: Package,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    },
    {
      id: 'transfers',
      title: 'Movimientos de Traslado entre Sedes',
      description: 'Comprobantes de despacho vs. recepción, mercancía en tránsito y reporte de discrepancias físicas.',
      icon: FileSpreadsheet,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20'
    }
  ];

  const handleDownload = (reportId: string, format: 'PDF' | 'EXCEL') => {
    setDownloadingReport(`${reportId}-${format}`);
    setTimeout(() => {
      setDownloadingReport(null);
      setSuccessReport(`${reportId}-${format}`);
      setTimeout(() => setSuccessReport(null), 3000);
    }, 1200);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 glass-panel p-3.5 sm:p-4 rounded-xl sm:rounded-2xl">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 shrink-0" />
            <span>Centro de Reportes Descargables</span>
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-400 hidden xs:block">
            Informes detallados para toma de decisiones contables y financieras
          </p>
        </div>

        {/* Global Filter Bar */}
        <div className="flex items-center gap-2 text-xs overflow-x-auto w-full sm:w-auto">
          <div className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-slate-900 border border-slate-800 text-slate-300 whitespace-nowrap text-xs">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <span>Últimos 30 días</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl bg-slate-900 border border-slate-800 text-slate-300 whitespace-nowrap text-xs">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <span>Todas las sedes</span>
          </div>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {reportCategories.map((r) => {
          const Icon = r.icon;
          const isPdfDownloading = downloadingReport === `${r.id}-PDF`;
          const isExcelDownloading = downloadingReport === `${r.id}-EXCEL`;
          const isSuccess = successReport?.startsWith(r.id);

          return (
            <div key={r.id} className="glass-panel p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3 sm:space-y-4">
              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl border ${r.color} shrink-0`}>
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-100">{r.title}</h4>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">{r.description}</p>
              </div>

              {isSuccess && (
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Reporte generado y descargado correctamente.
                </div>
              )}

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-end gap-2 text-xs">
                <button
                  onClick={() => handleDownload(r.id, 'PDF')}
                  disabled={isPdfDownloading}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <FileText className="w-3.5 h-3.5 text-rose-400" />
                  <span>{isPdfDownloading ? 'Generando...' : 'Descargar PDF'}</span>
                </button>
                <button
                  onClick={() => handleDownload(r.id, 'EXCEL')}
                  disabled={isExcelDownloading}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold border border-emerald-500/40 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isExcelDownloading ? 'Exportando...' : 'Descargar Excel'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

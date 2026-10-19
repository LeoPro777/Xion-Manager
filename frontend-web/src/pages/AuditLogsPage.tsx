import React, { useState, useEffect } from 'react';
import { ShieldCheck, Monitor, History, AlertTriangle, CheckCircle2, Lock, Clock, Search } from 'lucide-react';
import { api } from '../services/api';
import { AuditLogItem, CashSessionSyncItem } from '../types';

export const AuditLogsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sessions' | 'system'>('sessions');
  const [sessions, setSessions] = useState<CashSessionSyncItem[]>([]);
  const [logs, setLogs] = useState<AuditLogItem[]>([]);

  useEffect(() => {
    api.getCashSessions().then(setSessions);
    api.getAuditLogs().then(setLogs);
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 glass-panel p-3.5 sm:p-4 rounded-xl sm:rounded-2xl">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 shrink-0" />
            <span>Auditoría General y Bitácora POS</span>
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-400 hidden xs:block">
            Registros inmutables: prohibida la eliminación de eventos o arqueos
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-900 p-1 rounded-lg sm:rounded-xl border border-slate-800 text-xs font-semibold overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('sessions')}
            className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap text-xs ${
              activeTab === 'sessions' ? 'bg-cyan-500 text-white shadow-md' : 'text-slate-400'
            }`}
          >
            <Monitor className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Bitácora de Cajas</span>
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap text-xs ${
              activeTab === 'system' ? 'bg-cyan-500 text-white shadow-md' : 'text-slate-400'
            }`}
          >
            <History className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Auditoría Sistema</span>
          </button>
        </div>
      </div>

      {activeTab === 'sessions' ? (
        /* Cash Sessions Timeline & Table */
        <div className="glass-panel rounded-xl sm:rounded-2xl p-3.5 sm:p-6 border border-slate-800 overflow-x-auto space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Lock className="w-4 h-4 text-cyan-400" />
              Historial de Turnos, Arqueos Ciegos y Descuadres
            </h4>
            <span className="text-xs text-slate-400">Datos sincronizados desde Xion-POS Hub</span>
          </div>

          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="p-3.5 rounded-l-xl">Caja / Sede</th>
                <th className="p-3.5">Cajero Apertura</th>
                <th className="p-3.5">Horario Turno</th>
                <th className="p-3.5">Fondo Inicial</th>
                <th className="p-3.5">Calculado</th>
                <th className="p-3.5">Declarado</th>
                <th className="p-3.5 text-right rounded-r-xl">Diferencia / Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sessions.map((s) => (
                <tr key={s.id} className="hover:bg-slate-900/40">
                  <td className="p-3.5">
                    <span className="font-bold text-slate-100 block">{s.cash_register_name}</span>
                    <span className="text-xs text-slate-400">{s.branch_name}</span>
                  </td>
                  <td className="p-3.5 text-xs text-slate-200 font-medium">{s.opened_by}</td>
                  <td className="p-3.5 text-xs text-slate-400 font-mono">
                    <div>{s.opened_at}</div>
                    {s.closed_at && <div className="text-slate-500">Cierre: {s.closed_at}</div>}
                  </td>
                  <td className="p-3.5 text-xs font-semibold">${s.initial_cash.toFixed(2)}</td>
                  <td className="p-3.5 text-xs font-bold text-slate-200">
                    ${s.calculated_cash ? s.calculated_cash.toFixed(2) : '-'}
                  </td>
                  <td className="p-3.5 text-xs font-bold text-slate-200">
                    ${s.declared_cash ? s.declared_cash.toFixed(2) : '-'}
                  </td>
                  <td className="p-3.5 text-right">
                    {s.status === 'DISCREPANCY' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Diferencia: ${s.difference?.toFixed(2)}
                      </span>
                    ) : s.status === 'CLOSED' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Cuadrada ($0.00)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        <Clock className="w-3.5 h-3.5" />
                        Turno Abierto
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* System Audit Log Table */
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 overflow-x-auto space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <History className="w-4 h-4 text-cyan-400" />
              Eventos de Seguridad y Trazabilidad Operativa
            </h4>
            <span className="text-xs text-slate-500 font-mono">Inmutable DB Table: audit_logs</span>
          </div>

          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="p-3.5 rounded-l-xl">Fecha / Hora</th>
                <th className="p-3.5">Usuario & Rol</th>
                <th className="p-3.5">Módulo</th>
                <th className="p-3.5">Acción</th>
                <th className="p-3.5">Descripción Detallada</th>
                <th className="p-3.5 text-right rounded-r-xl">Dirección IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-900/40">
                  <td className="p-3.5 text-slate-400">{log.timestamp}</td>
                  <td className="p-3.5 font-bold text-slate-200">
                    <div>{log.user_name}</div>
                    <span className="text-[10px] text-cyan-400 font-normal">{log.role}</span>
                  </td>
                  <td className="p-3.5 text-slate-300">{log.module}</td>
                  <td className="p-3.5 font-semibold text-emerald-400">{log.action_type}</td>
                  <td className="p-3.5 font-sans text-slate-300 max-w-xs">{log.description}</td>
                  <td className="p-3.5 text-right text-slate-500">{log.ip_address}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

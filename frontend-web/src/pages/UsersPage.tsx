import React, { useState, useEffect } from 'react';
import { Users as UsersIcon, UserCheck, UserX, Plus, Shield, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { User, Role } from '../types';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'APPROVED' | 'PENDING'>('ALL');
  const [actionMsg, setActionMsg] = useState('');

  useEffect(() => {
    api.getUsers().then(setUsers);
  }, []);

  const handleApproval = async (userId: string, newStatus: 'APPROVED' | 'REJECTED') => {
    const res = await api.updateUserApproval(userId, newStatus);
    setUsers(users.map(u => u.id === userId ? { ...u, approval_status: newStatus, is_active: newStatus === 'APPROVED' } : u));
    setActionMsg(res.message);
    setTimeout(() => setActionMsg(''), 4000);
  };

  const filteredUsers = users.filter(u => {
    if (filter === 'APPROVED') return u.approval_status === 'APPROVED';
    if (filter === 'PENDING') return u.approval_status === 'PENDING';
    return true;
  });

  const roleBadges: Record<Role, { label: string; color: string }> = {
    OWNER: { label: 'Dueño', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    ADMIN: { label: 'Administrador', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
    BRANCH_MANAGER: { label: 'Gerente Sucursal', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    SUPERVISOR: { label: 'Supervisor', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    AUDITOR: { label: 'Auditor Fiscal', color: 'bg-slate-500/10 text-slate-300 border-slate-500/20' },
    CASHIER: { label: 'Cajero POS', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 glass-panel p-3.5 sm:p-4 rounded-xl sm:rounded-2xl">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2">
            <UsersIcon className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 shrink-0" />
            <span>Usuarios y Permisos RBAC</span>
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-400 hidden xs:block">
            Flujo de autorización y asignación de sedes para operadores
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg sm:rounded-xl border border-slate-800 text-xs font-semibold overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg transition-all whitespace-nowrap text-xs ${filter === 'ALL' ? 'bg-cyan-500 text-white shadow-md' : 'text-slate-400'}`}
          >
            Todos ({users.length})
          </button>
          <button
            onClick={() => setFilter('PENDING')}
            className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg transition-all whitespace-nowrap text-xs ${filter === 'PENDING' ? 'bg-amber-500 text-white shadow-md' : 'text-amber-400'}`}
          >
            Pendientes ({users.filter(u => u.approval_status === 'PENDING').length})
          </button>
          <button
            onClick={() => setFilter('APPROVED')}
            className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg transition-all whitespace-nowrap text-xs ${filter === 'APPROVED' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-400'}`}
          >
            Aprobados
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
          ✓ {actionMsg}
        </div>
      )}

      {/* Users Table */}
      <div className="glass-panel rounded-xl sm:rounded-2xl p-3.5 sm:p-6 border border-slate-800 overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-900/80 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <tr>
              <th className="p-3.5 rounded-l-xl">Usuario / Nombre</th>
              <th className="p-3.5">Correo y Contacto</th>
              <th className="p-3.5">Rol RBAC</th>
              <th className="p-3.5">Sede Asignada</th>
              <th className="p-3.5">Estado Aprobación</th>
              <th className="p-3.5 text-right rounded-r-xl">Acciones Rápidas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredUsers.map((u) => {
              const badge = roleBadges[u.role] || { label: u.role, color: 'bg-slate-800 text-slate-300' };
              const isPending = u.approval_status === 'PENDING';
              return (
                <tr key={u.id} className="hover:bg-slate-900/40">
                  <td className="p-3.5 font-bold text-slate-100 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-300">
                      {u.full_name.substring(0, 2).toUpperCase()}
                    </div>
                    {u.full_name}
                  </td>
                  <td className="p-3.5 text-xs text-slate-400">
                    <span className="block text-slate-200 font-mono">{u.email}</span>
                    {u.phone || 'Sin teléfono'}
                  </td>
                  <td className="p-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.color}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="p-3.5 text-xs text-slate-300">
                    {u.branch_name || 'Acceso Global (Todas)'}
                  </td>
                  <td className="p-3.5">
                    {isPending ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Clock className="w-3.5 h-3.5" />
                        Pendiente Revisión
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Autorizado
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-right">
                    {isPending ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleApproval(u.id, 'APPROVED')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center gap-1"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          Aprobar
                        </button>
                        <button
                          onClick={() => handleApproval(u.id, 'REJECTED')}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white font-bold text-xs transition-colors flex items-center gap-1"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          Rechazar
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500 font-semibold">Activo</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

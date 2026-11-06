import React, { useState, useEffect } from 'react';
import { 
  Users as UsersIcon, UserCheck, UserX, Plus, Shield, CheckCircle2, 
  Clock, AlertCircle, QrCode, KeyRound, X, Copy, Check, Store,
  Smartphone, RefreshCw, Sparkles, Trash2, ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { User, Role, Branch } from '../types';
import { QrCodeSvg } from '../components/QrCodeSvg';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'APPROVED' | 'PENDING'>('ALL');
  const [actionMsg, setActionMsg] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);

  // Modal de Vinculación de Personal (Smart TV / Código 6 caracteres / QR)
  const [showPairingModal, setShowPairingModal] = useState(false);
  const [pairingTab, setPairingTab] = useState<'PENDING' | 'ENTER_CODE' | 'INVITE_QR'>('PENDING');
  const [pairingInputCode, setPairingInputCode] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role>('SUPERVISOR');
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [isApproving, setIsApproving] = useState(false);
  const [copiedInviteCode, setCopiedInviteCode] = useState(false);
  const [generatedInviteCode, setGeneratedInviteCode] = useState('XM-792');

  useEffect(() => {
    api.getUsers().then(setUsers);
    api.getBranches().then(b => {
      setBranches(b);
      if (b.length > 0) setSelectedBranchId(b[0].id);
    });
    api.getPendingStaffPairingRequests().then(reqs => {
      setPendingRequests(reqs);
      if (reqs.length === 0) setPairingTab('ENTER_CODE');
    });
  }, []);

  const handleOpenPairingModal = () => {
    api.getPendingStaffPairingRequests().then(reqs => {
      setPendingRequests(reqs);
      if (reqs.length > 0) {
        setPairingTab('PENDING');
      } else {
        setPairingTab('ENTER_CODE');
      }
    });
    setShowPairingModal(true);
  };

  const handleGenerateNewInviteCode = () => {
    const randomNum = Math.floor(100 + Math.random() * 900);
    setGeneratedInviteCode(`XM-${randomNum}`);
  };

  const handleCopyInviteCode = () => {
    navigator.clipboard.writeText(generatedInviteCode);
    setCopiedInviteCode(true);
    setTimeout(() => setCopiedInviteCode(false), 2000);
  };

  const handleApprovePairingCode = async (code: string, branchId?: string, roleOverride?: Role) => {
    setIsApproving(true);
    try {
      const activeBranch = branchId || selectedBranchId || branches[0]?.id;
      const targetRole = roleOverride || selectedRole;
      const res = await api.approveStaffPairingRequest(code, activeBranch, targetRole);
      setActionMsg(res.message || `Personal autorizado exitosamente con código ${code}`);
      setUsers(await api.getUsers());
      setPendingRequests(prev => prev.filter(p => p.pairing_code !== code));
      setShowPairingModal(false);
      setPairingInputCode('');
      setTimeout(() => setActionMsg(''), 4000);
    } catch {
      setActionMsg('Error autorizando código');
    } finally {
      setIsApproving(false);
    }
  };

  const handleRejectPairingRequest = async (code: string) => {
    try {
      await api.rejectStaffPairingRequest(code);
      setPendingRequests(prev => prev.filter(p => p.pairing_code !== code));
      setActionMsg(`Solicitud de vinculación ${code} descartada`);
      setTimeout(() => setActionMsg(''), 3000);
    } catch {}
  };


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

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg sm:rounded-xl border border-slate-800 text-xs font-semibold overflow-x-auto">
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

          <button
            onClick={handleOpenPairingModal}
            className="px-3 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20 active:scale-95 transition-all whitespace-nowrap"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Vincular Personal (Código / QR)</span>
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
          ✓ {actionMsg}
        </div>
      )}

      {/* Users Desktop Table (hidden on mobile) */}
      <div className="hidden md:block glass-panel rounded-2xl p-6 border border-slate-800 overflow-x-auto">
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
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-300 shrink-0">
                      {u.full_name.substring(0, 2).toUpperCase()}
                    </div>
                    <span>{u.full_name}</span>
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

      {/* Users Mobile Card View (md:hidden) */}
      <div className="md:hidden space-y-3">
        {filteredUsers.map((u) => {
          const badge = roleBadges[u.role] || { label: u.role, color: 'bg-slate-800 text-slate-300' };
          const isPending = u.approval_status === 'PENDING';
          return (
            <div key={u.id} className="glass-panel p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-cyan-400 shrink-0">
                    {u.full_name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white leading-tight">{u.full_name}</h4>
                    <span className="text-xs text-slate-400 font-mono">{u.email}</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${badge.color}`}>
                  {badge.label}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Store className="w-3.5 h-3.5 text-cyan-400" />
                  {u.branch_name || 'Acceso Global'}
                </span>
                {isPending ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400">
                    <Clock className="w-3 h-3" /> Pendiente
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" /> Autorizado
                  </span>
                )}
              </div>

              {isPending && (
                <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleApproval(u.id, 'APPROVED')}
                    className="py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs flex items-center justify-center gap-1"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Aprobar
                  </button>
                  <button
                    onClick={() => handleApproval(u.id, 'REJECTED')}
                    className="py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    Rechazar
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ========================================================
          MODAL: VINCULACIÓN SIMPLIFICADA Y RESPONSIVE
      ======================================================== */}
      {showPairingModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="glass-panel w-full sm:max-w-lg p-5 sm:p-6 rounded-t-3xl sm:rounded-2xl border border-slate-800 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                  <KeyRound className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-100">Vincular Personal al Negocio</h4>
                  <p className="text-[11px] text-slate-400">Enlace seguro de colaboradores mediante código o QR</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPairingModal(false)} 
                className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Sub-Tabs */}
            <div className="grid grid-cols-3 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setPairingTab('PENDING')}
                className={`py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  pairingTab === 'PENDING'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>En Espera</span>
                {pendingRequests.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-cyan-400 text-slate-950 text-[10px] font-black flex items-center justify-center">
                    {pendingRequests.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setPairingTab('ENTER_CODE')}
                className={`py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  pairingTab === 'ENTER_CODE'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Ingresar Código</span>
              </button>

              <button
                type="button"
                onClick={() => setPairingTab('INVITE_QR')}
                className={`py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  pairingTab === 'INVITE_QR'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Invitar QR</span>
              </button>
            </div>

            {/* TAB 1: SOLICITUDES EN ESPERA */}
            {pairingTab === 'PENDING' && (
              <div className="space-y-3">
                {pendingRequests.length > 0 ? (
                  pendingRequests.map((req) => (
                    <div key={req.pairing_code} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-cyan-400 text-base">{req.pairing_code}</span>
                            <span className="text-white font-bold text-xs">{req.full_name}</span>
                          </div>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            Rol sugerido: <strong className="text-slate-200">{req.role}</strong> • {req.email || 'Solicitud móvil'}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                          Pendiente
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <select
                          defaultValue={req.branch_id || selectedBranchId}
                          onChange={(e) => { req.branch_id = e.target.value; }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 text-xs"
                        >
                          {branches.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>

                        <select
                          defaultValue={req.role || selectedRole}
                          onChange={(e) => { req.role = e.target.value as Role; }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 text-xs"
                        >
                          <option value="SUPERVISOR">Almacén / Inventario</option>
                          <option value="BRANCH_MANAGER">Gerente Sucursal</option>
                          <option value="AUDITOR">Auditor Fiscal</option>
                          <option value="CASHIER">Cajero POS</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800/60">
                        <button
                          type="button"
                          onClick={() => handleRejectPairingRequest(req.pairing_code)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 font-bold text-xs"
                        >
                          Descartar
                        </button>
                        <button
                          type="button"
                          disabled={isApproving}
                          onClick={() => handleApprovePairingCode(req.pairing_code, req.branch_id, req.role)}
                          className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20"
                        >
                          {isApproving ? 'Autorizando...' : 'Aprobar y Vincular'}
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mx-auto">
                      <Clock className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold text-slate-300">No hay solicitudes de vinculación pendientes</p>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                      Cuando un colaborador genere su código o escanee el QR, aparecerá aquí para tu aprobación inmediata.
                    </p>
                    <button
                      type="button"
                      onClick={() => setPairingTab('ENTER_CODE')}
                      className="mt-2 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-bold"
                    >
                      Ingresar Código Manualmente →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: INGRESAR CÓDIGO */}
            {pairingTab === 'ENTER_CODE' && (
              <div className="space-y-3.5 text-xs">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-2">
                  <label className="block text-slate-300 font-bold text-xs uppercase tracking-wider">
                    Código Mostrado por el Colaborador
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Escribe los 6 caracteres de la pantalla del empleado:
                  </p>
                  <input
                    type="text"
                    maxLength={8}
                    placeholder="XM-842"
                    inputMode="text"
                    autoCapitalize="characters"
                    value={pairingInputCode}
                    onChange={(e) => setPairingInputCode(e.target.value.toUpperCase())}
                    className="w-full max-w-[220px] mx-auto text-center font-mono text-3xl font-black tracking-widest bg-slate-900 border-2 border-cyan-500/60 rounded-xl py-2 px-3 text-cyan-400 focus:outline-none focus:border-cyan-400 uppercase block"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Rol Operativo</label>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value as Role)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-semibold"
                    >
                      <option value="SUPERVISOR">Almacén / Inventario</option>
                      <option value="BRANCH_MANAGER">Gerente de Sucursal</option>
                      <option value="AUDITOR">Contador / Auditor Fiscal</option>
                      <option value="CASHIER">Cajero POS</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Sucursal Asignada</label>
                    <select
                      value={selectedBranchId}
                      onChange={(e) => setSelectedBranchId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-slate-100 font-semibold"
                    >
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPairingModal(false)}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-900 text-slate-400 hover:bg-slate-800 font-semibold text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={isApproving || !pairingInputCode.trim()}
                    onClick={() => handleApprovePairingCode(pairingInputCode)}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                  >
                    {isApproving ? 'Autorizando...' : 'Autorizar y Vincular'}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: INVITAR MEDIANTE QR */}
            {pairingTab === 'INVITE_QR' && (
              <div className="space-y-4 text-center">
                <div className="space-y-1">
                  <h5 className="text-sm font-bold text-white">Código QR de Invitación</h5>
                  <p className="text-xs text-slate-400">
                    Muestra este código para que el colaborador lo escanee con su app o móvil:
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center gap-3 py-2">
                  <QrCodeSvg
                    value={`xion://pair-staff?code=${generatedInviteCode}&branch=${selectedBranchId}&role=${selectedRole}`}
                    size={160}
                    logoText={selectedRole === 'BRANCH_MANAGER' ? 'GER' : selectedRole === 'AUDITOR' ? 'CON' : 'ALM'}
                  />

                  <div className="inline-flex items-center gap-3 p-2.5 px-4 rounded-xl bg-slate-900 border border-cyan-500/40">
                    <span className="font-mono text-2xl font-black text-cyan-400 tracking-widest">{generatedInviteCode}</span>
                    <button
                      type="button"
                      onClick={handleCopyInviteCode}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                      title="Copiar código"
                    >
                      {copiedInviteCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateNewInviteCode}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                      title="Generar otro código"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500">
                  Una vez el colaborador ingrese el código, el sistema completará la vinculación automáticamente.
                </p>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
};


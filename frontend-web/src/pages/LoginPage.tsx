import React, { useState } from 'react';
import { Shield, Zap, Lock, Mail, ArrowRight, UserCheck } from 'lucide-react';
import { Role, User } from '../types';
import { api } from '../services/api';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('admin@xion.com');
  const [password, setPassword] = useState('••••••••');
  const [loading, setLoading] = useState(false);

  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simular autenticación estándar
    const user = await api.loginBypass('OWNER');
    setLoading(false);
    onLoginSuccess(user);
  };

  const handleBypassRole = async (role: Role) => {
    setLoading(true);
    const user = await api.loginBypass(role);
    setLoading(false);
    onLoginSuccess(user);
  };

  const rolesList: { role: Role; label: string; desc: string; color: string }[] = [
    { role: 'OWNER', label: 'Dueño / Propietario', desc: 'Acceso total y compras Xion-Pay', color: 'from-amber-500/20 to-orange-500/10 text-amber-300 border-amber-500/40' },
    { role: 'ADMIN', label: 'Administrador', desc: 'Control multi-sucursal y stock', color: 'from-cyan-500/20 to-blue-500/10 text-cyan-300 border-cyan-500/40' },
    { role: 'BRANCH_MANAGER', label: 'Gerente Sucursal', desc: 'Operativa de su sede asignada', color: 'from-emerald-500/20 to-teal-500/10 text-emerald-300 border-emerald-500/40' },
    { role: 'SUPERVISOR', label: 'Supervisor', desc: 'Validación de arqueos y turnos', color: 'from-purple-500/20 to-indigo-500/10 text-purple-300 border-purple-500/40' },
    { role: 'AUDITOR', label: 'Auditor Fiscal', desc: 'Solo lectura y bitácoras', color: 'from-slate-500/20 to-zinc-500/10 text-slate-300 border-slate-500/40' },
    { role: 'CASHIER', label: 'Cajero POS', desc: 'Operador de caja asignada', color: 'from-blue-500/20 to-sky-500/10 text-blue-300 border-blue-500/40' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-xl space-y-6 relative z-10">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-black text-2xl text-white shadow-xl shadow-cyan-500/25 mx-auto">
            X
          </div>
          <h1 className="text-2xl font-black tracking-wide text-slate-100">XION-MANAGER</h1>
          <p className="text-xs text-slate-400">
            Plataforma Central Multi-Sucursal y Sincronización POS
          </p>
        </div>

        {/* Bypass Dev Banner (Development mode only) */}
        {import.meta.env.DEV && (
          <div className="glass-panel p-5 rounded-2xl border border-cyan-500/40 bg-cyan-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Zap className="w-4 h-4 fill-cyan-400" />
                Bypass de Acceso Rápido (Modo Demo / Dev)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                Sin Contraseña
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Selecciona cualquier rol para iniciar sesión instantáneamente y probar los permisos RBAC correspondientes:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
              {rolesList.map((r) => (
                <button
                  key={r.role}
                  onClick={() => handleBypassRole(r.role)}
                  disabled={loading}
                  className={`p-2.5 rounded-xl border text-left bg-gradient-to-br transition-all hover:scale-105 active:scale-95 ${r.color}`}
                >
                  <div className="font-bold text-xs truncate">{r.label}</div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">{r.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Standard Credentials Form */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
            Ingreso Estándar con Credenciales
          </h3>

          <form onSubmit={handleStandardLogin} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Correo Electrónico</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Contraseña</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 mt-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Accediendo...' : 'Iniciar Sesión'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

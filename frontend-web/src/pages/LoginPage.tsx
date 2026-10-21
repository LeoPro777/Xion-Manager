import React, { useState } from 'react';
import { Shield, Zap, Lock, Mail, ArrowRight, UserCheck, UserPlus, Phone } from 'lucide-react';
import { Role, User } from '../types';
import { api } from '../services/api';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

const DEFAULT_GOOGLE_CLIENT_ID = '926646602874-dakf4njbrmgg2fp4qokfflq7tlhid68j.apps.googleusercontent.com';

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('admin@xion.com');
  const [password, setPassword] = useState('••••••••');
  const [registerFullName, setRegisterFullName] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [googleClientId, setGoogleClientId] = useState<string>(
    (import.meta.env as any).VITE_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID
  );

  React.useEffect(() => {
    // 1. Obtener Google Client ID configurado dinámicamente en el backend
    fetch('/api/v1/auth/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.google_client_id) {
          setGoogleClientId(data.google_client_id);
        }
      })
      .catch(() => {});

    // 2. Carga asíncrona segura de Google Identity Services
    if (!document.getElementById('google-gsi-client')) {
      const script = document.createElement('script');
      script.id = 'google-gsi-client';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, []);

  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    const activeClientId = googleClientId || (import.meta.env as any).VITE_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID;

    // Google Identity Services (GSI)
    const google = (window as any).google;
    if (google?.accounts?.id) {
      google.accounts.id.initialize({
        client_id: activeClientId,
        callback: async (response: { credential: string }) => {
          if (!response?.credential) return;
          setLoading(true);
          try {
            const user = await api.loginWithGoogle(response.credential);
            onLoginSuccess(user);
          } catch (err: any) {
            setErrorMessage(err.message || 'Error al validar credencial de Google');
          } finally {
            setLoading(false);
          }
        }
      });
      google.accounts.id.prompt((notification: any) => {
        if (notification?.isNotDisplayed?.()) {
          console.warn('Google One Tap no desplegado:', notification?.getNotDisplayedReason?.());
        }
      });
    } else {
      // Modo desarrollo fallback si el SDK de Google está bloqueado
      if (import.meta.env.DEV) {
        setLoading(true);
        try {
          const user = await api.loginWithGoogle('mock-google-token:OWNER');
          onLoginSuccess(user);
        } catch (err: any) {
          setErrorMessage(err.message || 'Error al autenticar con Google OAuth');
        } finally {
          setLoading(false);
        }
        return;
      }
      setErrorMessage('Cargando servicios de Google... Por favor reintenta en un momento.');
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (isRegisterMode) {
      if (!registerFullName.trim()) {
        setErrorMessage('Por favor ingresa tu nombre completo.');
        return;
      }
      if (!email.trim() || !email.includes('@')) {
        setErrorMessage('Por favor ingresa un correo electrónico válido.');
        return;
      }
      if (password.length < 6) {
        setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
        return;
      }
      if (password !== registerConfirmPassword) {
        setErrorMessage('Las contraseñas no coinciden.');
        return;
      }

      setLoading(true);
      try {
        const newUser = await api.registerUser({
          full_name: registerFullName,
          email: email.trim().toLowerCase(),
          password: password,
          phone: registerPhone
        });
        onLoginSuccess(newUser);
      } catch (err: any) {
        setErrorMessage(err.message || 'Error al crear la cuenta');
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const user = await api.loginWithCredentials(email, password);
      onLoginSuccess(user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleBypassRole = async (role: Role) => {
    setErrorMessage(null);
    setLoading(true);
    try {
      const user = await api.loginBypass(role);
      onLoginSuccess(user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error en bypass');
    } finally {
      setLoading(false);
    }
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

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form Panel */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          {/* Google OAuth Button */}
          <div>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-900/80 hover:bg-slate-800/90 text-slate-100 font-medium text-xs transition-all flex items-center justify-center gap-3 shadow-sm hover:shadow-cyan-500/10 active:scale-[0.99]"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{loading ? 'Validando con Google...' : 'Continuar con Google'}</span>
            </button>
          </div>

          {/* Mode Selector Tab (Iniciar Sesión vs Registrarse) */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => { setIsRegisterMode(false); setErrorMessage(null); }}
              className={`py-1.5 rounded-lg font-bold transition-all ${
                !isRegisterMode ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => { setIsRegisterMode(true); setErrorMessage(null); }}
              className={`py-1.5 rounded-lg font-bold transition-all ${
                isRegisterMode ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Crear Cuenta (Registrarse)
            </button>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-800 w-full"></div>
            <span className="bg-slate-950 px-3 text-[10px] uppercase font-semibold text-slate-500 absolute">
              {isRegisterMode ? 'completa tus datos' : 'o ingresa con tu correo'}
            </span>
          </div>

          {/* Credentials Form */}
          <form onSubmit={handleAuthSubmit} className="space-y-3 text-xs pt-1">
            {isRegisterMode && (
              <>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Nombre Completo *</label>
                  <div className="relative">
                    <UserPlus className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Ej. Carlos Mendoza"
                      value={registerFullName}
                      onChange={(e) => setRegisterFullName(e.target.value)}
                      required
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Teléfono / WhatsApp</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="+58 414-1234567"
                      value={registerPhone}
                      onChange={(e) => setRegisterPhone(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Correo Electrónico *</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-semibold">Contraseña *</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {isRegisterMode && (
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Confirmar Contraseña *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    placeholder="Repite la contraseña"
                    value={registerConfirmPassword}
                    onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 mt-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Procesando...' : isRegisterMode ? 'Crear Cuenta y Comenzar Onboarding' : 'Iniciar Sesión'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

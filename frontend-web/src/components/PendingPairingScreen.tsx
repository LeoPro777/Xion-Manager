import React, { useState, useEffect } from 'react';
import { 
  KeyRound, QrCode, Copy, Check, Share2, LogOut, ShieldCheck, 
  RefreshCw, Clock, Sparkles, CheckCircle2, AlertTriangle, XCircle 
} from 'lucide-react';
import { User, Role } from '../types';
import { api } from '../services/api';
import { QrCodeSvg } from './QrCodeSvg';

interface PendingPairingScreenProps {
  currentUser: User;
  onApproved: (updatedUser: User) => void;
  onLogout: () => void;
}

export const PendingPairingScreen: React.FC<PendingPairingScreenProps> = ({
  currentUser,
  onApproved,
  onLogout
}) => {
  const [pairingCode, setPairingCode] = useState<string>('');
  const [qrPayload, setQrPayload] = useState<string>('');
  const [secondsLeft, setSecondsLeft] = useState<number>(900);
  const [pairingStatus, setPairingStatus] = useState<'PENDING' | 'APPROVED' | 'EXPIRED' | 'REJECTED'>('PENDING');
  const [isCopied, setIsCopied] = useState(false);
  const [isCopiedShare, setIsCopiedShare] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [approvedRole, setApprovedRole] = useState<string>('Colaborador');

  // Inicializar o generar código de 6 dígitos para el colaborador
  useEffect(() => {
    let isMounted = true;
    const initCode = async () => {
      try {
        const storedCode = localStorage.getItem(`xion_pairing_code_${currentUser.id}`);
        if (storedCode && storedCode.length === 6) {
          const status = await api.getStaffPairingStatus(storedCode);
          if (status.status !== 'EXPIRED' && status.status !== 'REJECTED') {
            if (isMounted) {
              setPairingCode(storedCode);
              setQrPayload(`xion://pair-staff?code=${storedCode}`);
              return;
            }
          }
        }
        const res = await api.selectCollaboratorRole(currentUser.id);
        if (isMounted && res.pairing_code) {
          setPairingCode(res.pairing_code);
          setQrPayload(res.qr_payload);
          setSecondsLeft(res.expires_in_seconds || 900);
          localStorage.setItem(`xion_pairing_code_${currentUser.id}`, res.pairing_code);
        }
      } catch (e: any) {
        if (isMounted) {
          const fallback = Math.floor(100000 + Math.random() * 900000).toString();
          setPairingCode(fallback);
          setQrPayload(`xion://pair-staff?code=${fallback}`);
          localStorage.setItem(`xion_pairing_code_${currentUser.id}`, fallback);
        }
      }
    };
    initCode();
    return () => { isMounted = false; };
  }, [currentUser.id]);

  // Temporizador regresivo de 15 minutos
  useEffect(() => {
    if (secondsLeft <= 0 || pairingStatus !== 'PENDING') return;
    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          setPairingStatus('EXPIRED');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft, pairingStatus]);

  // Polling en vivo para detectar cuando el Dueño aprueba la solicitud
  useEffect(() => {
    if (!pairingCode || pairingStatus !== 'PENDING') return;

    const interval = setInterval(async () => {
      try {
        const res = await api.getStaffPairingStatus(pairingCode);
        if (res.status === 'APPROVED') {
          setPairingStatus('APPROVED');
          setIsConnecting(true);
          setApprovedRole(res.role || 'CASHIER');

          // Refrescar usuario actualizado con business_id y rol asignado
          try {
            const freshUser = await api.getCurrentUser();
            if (freshUser) {
              localStorage.setItem('xion_user', JSON.stringify(freshUser));
              localStorage.setItem(`xion_onboarding_completed_${freshUser.id}`, 'true');
              setTimeout(() => {
                onApproved(freshUser);
              }, 1200);
              return;
            }
          } catch {}

          const updated: User = {
            ...currentUser,
            role: res.role || 'CASHIER',
            branch_id: res.branch_id,
            branch_name: res.branch_name || 'Sucursal Asignada',
            approval_status: 'APPROVED',
            onboarding_completed: true
          };
          localStorage.setItem('xion_user', JSON.stringify(updated));
          localStorage.setItem(`xion_onboarding_completed_${currentUser.id}`, 'true');
          setTimeout(() => {
            onApproved(updated);
          }, 1200);

        } else if (res.status === 'REJECTED') {
          setPairingStatus('REJECTED');
          setErrorMessage(res.message || 'La solicitud fue rechazada por el administrador.');
        } else if (res.status === 'EXPIRED') {
          setPairingStatus('EXPIRED');
        }
      } catch {}
    }, 2500);

    return () => clearInterval(interval);
  }, [pairingCode, pairingStatus, currentUser, onApproved]);

  const handleCopy = () => {
    if (!pairingCode) return;
    navigator.clipboard.writeText(pairingCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    if (!pairingCode) return;
    const text = `Hola, solicito acceso a Xion Manager. Mi código numérico de vinculación es: ${pairingCode}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    setErrorMessage(null);
    try {
      const res = await api.selectCollaboratorRole(currentUser.id);
      setPairingCode(res.pairing_code);
      setQrPayload(res.qr_payload);
      setSecondsLeft(res.expires_in_seconds || 900);
      setPairingStatus('PENDING');
      localStorage.setItem(`xion_pairing_code_${currentUser.id}`, res.pairing_code);
    } catch {
      const fallback = Math.floor(100000 + Math.random() * 900000).toString();
      setPairingCode(fallback);
      setQrPayload(`xion://pair-staff?code=${fallback}`);
      setSecondsLeft(900);
      setPairingStatus('PENDING');
      localStorage.setItem(`xion_pairing_code_${currentUser.id}`, fallback);
    } finally {
      setIsRegenerating(false);
    }
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden select-none">
      {/* Luces de Fondo Neón */}
      <div className="fixed top-10 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-10 right-1/4 w-[400px] h-[300px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Barra Superior */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between pb-4 border-b border-slate-800/80 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-black text-white shadow-lg shadow-cyan-500/30">
            XM
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-extrabold text-white">Xion Manager</h1>
            <p className="text-[11px] text-slate-400">Portal de Vinculación de Colaboradores</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>{currentUser.email}</span>
          </div>

          <button
            onClick={onLogout}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
            title="Cerrar sesión"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Cerrar Sesión</span>
          </button>
        </div>
      </header>

      {/* Contenido Central */}
      <main className="max-w-md w-full mx-auto my-auto py-6 relative z-10 space-y-5 animate-in fade-in duration-300">
        
        {/* Tarjeta Principal */}
        <div className="bg-slate-900/90 border border-cyan-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-cyan-950/40 text-center space-y-5">
          
          {/* Header de Estado */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] font-black uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Aislamiento de Seguridad Activo</span>
            </div>
            
            <h2 className="text-xl sm:text-2xl font-black text-white">
              {pairingStatus === 'APPROVED' ? '¡Vinculación Aprobada!' : 'Esperando Autorización'}
            </h2>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              {pairingStatus === 'APPROVED' 
                ? `El Dueño ha autorizado tu acceso como ${approvedRole}. Inicializando tu panel de trabajo...`
                : 'Tu cuenta está en espera. Entrega este código numérico de 6 dígitos o presenta el QR al Dueño para que autorice tu acceso en Xion Manager.'
              }
            </p>
          </div>

          {/* Estado de Aprobación EXITOSO */}
          {pairingStatus === 'APPROVED' && (
            <div className="p-6 rounded-2xl bg-emerald-500/15 border-2 border-emerald-500/50 text-emerald-300 space-y-3 animate-in zoom-in-95">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
              <div className="font-black text-base text-white">¡Bienvenido al Equipo!</div>
              <p className="text-xs text-emerald-200">
                Sincronizando módulos de tu sucursal y permisos asignados...
              </p>
            </div>
          )}

          {/* Estado EXPIRED */}
          {pairingStatus === 'EXPIRED' && (
            <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 space-y-3">
              <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
              <div className="font-bold text-sm">El código de 6 dígitos ha expirado</div>
              <p className="text-xs text-slate-300">
                Por seguridad los códigos vencen en 15 minutos. Genera un nuevo código para continuar.
              </p>
              <button
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-black text-xs inline-flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                <span>Generar Nuevo Código</span>
              </button>
            </div>
          )}

          {/* Estado REJECTED */}
          {pairingStatus === 'REJECTED' && (
            <div className="p-4 rounded-2xl bg-red-500/15 border border-red-500/40 text-red-300 space-y-3">
              <XCircle className="w-8 h-8 text-red-400 mx-auto" />
              <div className="font-bold text-sm">Solicitud Descartada</div>
              <p className="text-xs text-slate-300">{errorMessage || 'El Dueño rechazó la solicitud.'}</p>
              <button
                onClick={handleRegenerate}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
              >
                Intentar Nuevamente
              </button>
            </div>
          )}

          {/* Bloque Normal de Código PENDIENTE */}
          {pairingStatus === 'PENDING' && (
            <div className="space-y-4">
              
              {/* Caja de Código Gigante */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border-2 border-cyan-500/40 flex flex-col items-center justify-center space-y-2 relative overflow-hidden group">
                <div className="text-[10px] uppercase font-black text-slate-400 tracking-widest flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Código de 6 Dígitos</span>
                </div>

                <div className="font-mono text-3xl sm:text-4xl font-black tracking-[0.25em] text-cyan-300 text-center select-all pl-2">
                  {pairingCode || '------'}
                </div>

                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Expira en {formatCountdown(secondsLeft)}</span>
                </div>
              </div>

              {/* Botones de Acción Rápida */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-cyan-400" />}
                  <span>{isCopied ? '¡Copiado!' : 'Copiar Código'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="py-2.5 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  <Share2 className="w-4 h-4" />
                  <span>WhatsApp</span>
                </button>
              </div>

              {/* Código QR */}
              {qrPayload && (
                <div className="pt-2 flex flex-col items-center justify-center space-y-2">
                  <div className="p-3 bg-white rounded-2xl shadow-xl inline-block border-2 border-cyan-500/30">
                    <QrCodeSvg value={qrPayload} size={150} />
                  </div>
                  <span className="text-[11px] text-slate-400">Escaneo directo con cámara móvil o POS</span>
                </div>
              )}

              {/* Radar de Sondeo Activo */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-center gap-2 text-xs text-cyan-300 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping shrink-0" />
                <span>Sincronizando con el servidor en tiempo real...</span>
              </div>
            </div>
          )}

        </div>

      </main>

      {/* Pie de Página */}
      <footer className="max-w-4xl w-full mx-auto text-center pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 relative z-10">
        Xion-Manager • Protocolo de Vinculación Segura Multi-Tenant
      </footer>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Sparkles, Shield, Cpu, RefreshCw, CheckCircle2 } from 'lucide-react';

interface AppLoadingScreenProps {
  onFinished?: () => void;
  statusLabel?: string;
  progressPercent?: number;
}

export const AppLoadingScreen: React.FC<AppLoadingScreenProps> = ({
  onFinished,
  statusLabel = 'Inicializando entorno de alta velocidad...',
  progressPercent = 0
}) => {
  const [percent, setPercent] = useState(progressPercent);

  useEffect(() => {
    setPercent(progressPercent);
  }, [progressPercent]);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-4 select-none overflow-hidden animate-in fade-in duration-200">
      {/* Luces Ambientales Neón de Fondo */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-cyan-500/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed bottom-1/4 left-1/3 w-[450px] h-[300px] bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />

      {/* Contenedor Central */}
      <div className="max-w-md w-full text-center space-y-6 relative z-10 px-4">
        
        {/* Logo Central Pulsante */}
        <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 rounded-3xl bg-cyan-500/20 blur-xl animate-pulse" />
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 p-[2px] shadow-2xl shadow-cyan-500/40">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-white">
              <span className="font-mono text-3xl font-black tracking-tighter bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                XM
              </span>
            </div>
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-cyan-500 text-slate-950 flex items-center justify-center shadow-lg shadow-cyan-500/50">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Título de la Plataforma */}
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Xion Manager
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            Plataforma Cloud de Gestión Comercial y POS
          </p>
        </div>

        {/* Barra de Progreso Dinámica */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-300 flex items-center gap-1.5 truncate">
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0" />
              <span className="truncate">{statusLabel}</span>
            </span>
            <span className="font-mono text-cyan-400 text-sm ml-2 shrink-0">
              {Math.min(Math.round(percent), 100)}%
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-slate-900 border border-slate-800 p-0.5 overflow-hidden shadow-inner">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 transition-all duration-300 ease-out shadow-lg shadow-cyan-500/50"
              style={{ width: `${Math.min(Math.max(percent, 5), 100)}%` }}
            />
          </div>
        </div>

        {/* Pasos de Inicialización SPA */}
        <div className="grid grid-cols-3 gap-2 pt-2 text-[10px] font-semibold text-slate-400">
          <div className={`p-2 rounded-xl border transition-all ${
            percent >= 30 ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300' : 'bg-slate-900/40 border-slate-800 text-slate-400'
          }`}>
            <Shield className="w-3.5 h-3.5 mx-auto mb-1 text-cyan-400" />
            <span>Seguridad</span>
          </div>

          <div className={`p-2 rounded-xl border transition-all ${
            percent >= 70 ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300' : 'bg-slate-900/40 border-slate-800 text-slate-400'
          }`}>
            <Cpu className="w-3.5 h-3.5 mx-auto mb-1 text-blue-400" />
            <span>Módulos</span>
          </div>

          <div className={`p-2 rounded-xl border transition-all ${
            percent >= 98 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-slate-900/40 border-slate-800 text-slate-400'
          }`}>
            <CheckCircle2 className="w-3.5 h-3.5 mx-auto mb-1 text-emerald-400" />
            <span>Listo</span>
          </div>
        </div>

      </div>

      {/* Pie de Página */}
      <div className="absolute bottom-6 text-center text-[10px] text-slate-400 font-mono">
        Arquitectura SPA • Precarga Inteligente de Módulos
      </div>
    </div>
  );
};


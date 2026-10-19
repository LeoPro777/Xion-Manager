import React, { useState, useEffect } from 'react';
import { 
  Palette, 
  Type, 
  Monitor, 
  Sun, 
  Moon, 
  Laptop, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  Sparkles, 
  Sliders, 
  Store,
  Layers,
  Zap,
  Info
} from 'lucide-react';
import { api, DEFAULT_PREFERENCES, applySystemPreferences } from '../services/api';
import { SystemPreferences } from '../types';

export const PreferencesPage: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'theme' | 'typography' | 'display' | 'sync'>('theme');
  const [prefs, setPrefs] = useState<SystemPreferences>(DEFAULT_PREFERENCES);
  const [initialPrefs, setInitialPrefs] = useState<SystemPreferences>(DEFAULT_PREFERENCES);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    api.getPreferences().then((p) => {
      setPrefs(p);
      setInitialPrefs(p);
    });
  }, []);

  // Update real-time preview style as user tweaks settings
  const handlePreferenceChange = <K extends keyof SystemPreferences>(key: K, value: SystemPreferences[K]) => {
    const nextPrefs = { ...prefs, [key]: value };
    setPrefs(nextPrefs);
    // Apply immediately for live preview feedback
    applySystemPreferences(nextPrefs);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const saved = await api.updatePreferences(prefs);
      setPrefs(saved);
      setInitialPrefs(saved);
      setSuccessMessage('¡Preferencias del sistema actualizadas exitosamente y aplicadas al entorno!');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch {
      // fallback
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    setPrefs(initialPrefs);
    applySystemPreferences(initialPrefs);
    setSuccessMessage('Cambios descartados. Se restauraron los valores previos.');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const themeOptions = [
    { value: 'light', label: 'Claro', icon: Sun, desc: 'Fondo blanco y contrastes luminosos para entornos de oficina' },
    { value: 'dark', label: 'Oscuro', icon: Moon, desc: 'Paleta profunda de bajo cansancio visual optimizada para jornadas largas' },
    { value: 'auto', label: 'Automático', icon: Laptop, desc: 'Sincroniza con el esquema de color del sistema operativo' },
  ] as const;

  const colorPresets = [
    { name: 'Azul Xion', value: '#132DA8' },
    { name: 'Verde Éxito', value: '#059669' },
    { name: 'Morado Corporativo', value: '#7C3AED' },
    { name: 'Naranja Comercial', value: '#EA580C' },
    { name: 'Rosa Vibrante', value: '#DB2777' },
    { name: 'Cyan Tecnológico', value: '#0891B2' },
  ];

  const densityOptions = [
    { value: 'compact', label: 'Compacta', desc: 'Espacios reducidos para máxima visualización de datos' },
    { value: 'normal', label: 'Normal', desc: 'Balance ergonómico recomendado para pantallas estándar' },
    { value: 'comfortable', label: 'Cómoda', desc: 'Márgenes holgados ideales para pantallas táctiles' },
  ] as const;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 glass-panel p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Palette className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-lg font-bold text-slate-100 flex items-center gap-1.5 sm:gap-2">
                <span>Preferencias del Sistema</span>
                <span className="text-[9px] sm:text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  Sync
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 hidden xs:block">
                Apariencia, tipografía, densidad y sincronización entre el Manager y terminales POS
              </p>
            </div>
          </div>
        </div>

        {/* Global Save / Discard Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleDiscard}
            className="flex-1 sm:flex-none px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Descartar</span>
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 sm:flex-none px-4 py-1.5 sm:px-5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-md shadow-cyan-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Guardando...' : 'Guardar'}</span>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMessage && (
        <div className="p-3 sm:p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Structured Category Navigation Tabs - Prevents UI saturation */}
      <div className="flex items-center gap-1.5 border-b border-slate-800/80 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('theme')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg sm:rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeSubTab === 'theme'
              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <Palette className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Tema y Colores</span>
        </button>

        <button
          onClick={() => setActiveSubTab('typography')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg sm:rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeSubTab === 'typography'
              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <Type className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Tipografía</span>
        </button>

        <button
          onClick={() => setActiveSubTab('display')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg sm:rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeSubTab === 'display'
              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <Monitor className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Visualización</span>
        </button>

        <button
          onClick={() => setActiveSubTab('sync')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg sm:rounded-xl text-xs font-semibold transition-all shrink-0 ${
            activeSubTab === 'sync'
              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Sincronización POS</span>
        </button>
      </div>

      {/* Main Content Layout with Live Preview Column */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Controls */}
        <div className="lg:col-span-8 space-y-6">

          {/* TAB 1: TEMA Y COLORES */}
          {activeSubTab === 'theme' && (
            <div className="space-y-6">
              {/* Theme Mode Selector */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Sun className="w-4 h-4 text-cyan-400" />
                    Modo de Tema
                  </h3>
                  <p className="text-xs text-slate-400">Selecciona el modo de iluminación visual del panel</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {themeOptions.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = prefs.theme_mode === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handlePreferenceChange('theme_mode', opt.value)}
                        className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-3 ${
                          isSelected
                            ? 'bg-cyan-500/10 border-cyan-500/50 ring-2 ring-cyan-500/20 text-cyan-300'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <Icon className={`w-5 h-5 ${isSelected ? 'text-cyan-400' : 'text-slate-400'}`} />
                          {isSelected && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-100">{opt.label}</p>
                          <p className="text-[11px] text-slate-400 mt-1 leading-snug">{opt.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Primary Color Presets (Copied from Xion-POS) */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-cyan-400" />
                    Color de Resalte Principal
                  </h3>
                  <p className="text-xs text-slate-400">
                    Define el color de los acentos, botones de acción e indicadores clave de la interfaz
                  </p>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {colorPresets.map((color) => {
                    const isSelected = prefs.primary_color.toUpperCase() === color.value.toUpperCase();
                    return (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => handlePreferenceChange('primary_color', color.value)}
                        className={`h-20 rounded-xl transition-all relative flex flex-col items-center justify-center p-2 group ${
                          isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-950 scale-105' : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: color.value }}
                      >
                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-white/90 text-slate-950 flex items-center justify-center shadow-lg">
                            <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                          </div>
                        )}
                        <span className="absolute bottom-1.5 text-[10px] font-bold text-white drop-shadow-md truncate max-w-[90%]">
                          {color.name}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Color Picker input */}
                <div className="pt-2 flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={prefs.primary_color}
                      onChange={(e) => handlePreferenceChange('primary_color', e.target.value)}
                      className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <span className="text-xs text-slate-400">Color personalizado:</span>
                  </div>
                  <span className="font-mono text-xs font-bold px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-200">
                    {prefs.primary_color}
                  </span>
                </div>
              </div>

              {/* High Contrast Switch */}
              <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-100">Alto Contraste</h4>
                  <p className="text-xs text-slate-400">
                    Mejora la legibilidad incrementando la separación entre bordes, fondos y texto
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handlePreferenceChange('high_contrast', !prefs.high_contrast)}
                  className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                    prefs.high_contrast ? 'bg-cyan-500' : 'bg-slate-800'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      prefs.high_contrast ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: TIPOGRAFÍA Y ESCALA */}
          {activeSubTab === 'typography' && (
            <div className="space-y-6">
              <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <Type className="w-4 h-4 text-cyan-400" />
                      Escala Macro de Texto y Contraste
                    </h3>
                    <p className="text-xs text-slate-400">
                      Escalado proporcional en todo el sistema sin distorsión estética ni desbordes visuales
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-extrabold px-3 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-xl">
                      {prefs.font_size}px
                    </span>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[
                    { label: 'Compacto', size: 13 },
                    { label: 'Normal', size: 15 },
                    { label: 'Estándar', size: 16 },
                    { label: 'Ampliado', size: 18 },
                    { label: 'Grande', size: 20 },
                    { label: 'Extra', size: 22 },
                  ].map((preset) => {
                    const isSelected = prefs.font_size === preset.size;
                    return (
                      <button
                        key={preset.size}
                        type="button"
                        onClick={() => handlePreferenceChange('font_size', preset.size)}
                        className={`px-2.5 py-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-0.5 ${
                          isSelected
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm shadow-cyan-500/20'
                            : 'bg-slate-900/60 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                        }`}
                      >
                        <span>{preset.label}</span>
                        <span className="text-[10px] opacity-75 font-mono">{preset.size}px</span>
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-2 pt-2">
                  <input
                    type="range"
                    min={12}
                    max={22}
                    step={1}
                    value={prefs.font_size}
                    onChange={(e) => handlePreferenceChange('font_size', parseInt(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400 font-semibold px-1">
                    <span>Mínimo (12px)</span>
                    <span>Recomendado (16px)</span>
                    <span>Máxima Visibilidad (22px)</span>
                  </div>
                </div>

                {/* Multi-Tier High Contrast & Proportion Preview Card */}
                <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/80 space-y-3 shadow-inner">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                    <span className="text-[10px] font-bold tracking-wider uppercase text-cyan-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                      Muestra Proporcional de Alto Contraste en Vivo
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        Activo
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        Fideicomiso
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-base font-extrabold text-slate-100">
                      Comercial Xion C.A. — Gestión Multi-Sucursal y Cajas POS
                    </h4>
                    <p className="text-sm text-slate-200 mt-1 leading-relaxed">
                      La tipografía de todo el sistema ahora escala de forma macro y armónica. Cada etiqueta, botón, título y descripción conserva su jerarquía sin desalinear columnas ni cortar texto.
                    </p>
                    <p className="text-xs text-slate-400 mt-1.5">
                      📍 Av. Bolívar, Edificio Xion Torre A, Nivel PB — Tono de fuente ajustado a máxima nitidez sobre fondo actual.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: VISUALIZACIÓN Y RENDIMIENTO */}
          {activeSubTab === 'display' && (
            <div className="space-y-6">
              {/* Interface Density */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    Densidad de la Interfaz
                  </h3>
                  <p className="text-xs text-slate-400">
                    Controla el espaciado interno y el radio de redondeo de componentes
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {densityOptions.map((opt) => {
                    const isSelected = prefs.interface_density === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handlePreferenceChange('interface_density', opt.value)}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300 ring-2 ring-cyan-500/20'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <p className="text-xs font-bold text-slate-100">{opt.label}</p>
                        <p className="text-[11px] text-slate-400 mt-1 leading-snug">{opt.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Compact Mode Switch */}
              <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-100">Modo Compacto</h4>
                  <p className="text-xs text-slate-400">
                    Reduce el espaciado de tablas y listas para condensar más registros sin hacer scroll
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handlePreferenceChange('compact_mode', !prefs.compact_mode)}
                  className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                    prefs.compact_mode ? 'bg-cyan-500' : 'bg-slate-800'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      prefs.compact_mode ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Animations Switch */}
              <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-100">Animaciones y Efectos Visuales</h4>
                  <p className="text-xs text-slate-400">
                    Activa transiciones suaves al alternar vistas. Desactívalo para maximizar velocidad en hardware modesto
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handlePreferenceChange('animations', !prefs.animations)}
                  className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                    prefs.animations ? 'bg-cyan-500' : 'bg-slate-800'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      prefs.animations ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: SINCRONIZACIÓN POS */}
          {activeSubTab === 'sync' && (
            <div className="space-y-6">
              <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Store className="w-4 h-4 text-cyan-400" />
                    Paridad de Apariencia con Cajas Xion-POS
                  </h3>
                  <p className="text-xs text-slate-400">
                    Distribuye el esquema cromático y los parámetros ergonómicos a las terminales locales en su próxima sincronización
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-200">Sincronizar tema con terminales POS</span>
                    <p className="text-[11px] text-slate-400">
                      Las cajas heredarán el color de resalte ({prefs.primary_color}) y modo de visualización configurado aquí.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePreferenceChange('sync_with_pos', !prefs.sync_with_pos)}
                    className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                      prefs.sync_with_pos ? 'bg-cyan-500' : 'bg-slate-800'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        prefs.sync_with_pos ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-cyan-500/5 border border-cyan-500/20 text-xs text-slate-300 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <p>
                    Las terminales Xion-POS recibirán estas directivas de estilo a través del webhook de configuración central en el próximo latido de sincronización (heartbeat).
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Live Interface Sandbox / Preview */}
        <div className="lg:col-span-4 space-y-4 sticky top-6">
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                Previsualización en Vivo
              </span>
              <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                {prefs.theme_mode.toUpperCase()}
              </span>
            </div>

            {/* Mock Mini UI Card */}
            <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-950/70 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300">Venta en Curso #4029</span>
                <span 
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ backgroundColor: `${prefs.primary_color}20`, color: prefs.primary_color }}
                >
                  Activo
                </span>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-slate-400">Total a facturar</p>
                <p className="text-lg font-black text-slate-100">$ 45.00 <span className="text-xs text-slate-500 font-normal">/ 1,687.50 Bs</span></p>
              </div>

              {/* Sample Action Button with dynamically styled primary color */}
              <button
                type="button"
                className="w-full py-2.5 rounded-xl font-bold text-xs text-white shadow-md transition-all flex items-center justify-center gap-2"
                style={{ backgroundColor: prefs.primary_color }}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Cobrar con Xion-Pay</span>
              </button>
            </div>

            {/* Current Settings Summary */}
            <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 space-y-1.5 text-[11px] text-slate-400">
              <div className="flex justify-between">
                <span>Tema:</span>
                <span className="font-semibold text-slate-200 capitalize">{prefs.theme_mode}</span>
              </div>
              <div className="flex justify-between">
                <span>Color:</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: prefs.primary_color }} />
                  <span className="font-mono font-semibold text-slate-200">{prefs.primary_color}</span>
                </div>
              </div>
              <div className="flex justify-between">
                <span>Fuente:</span>
                <span className="font-semibold text-slate-200">{prefs.font_size}px</span>
              </div>
              <div className="flex justify-between">
                <span>Densidad:</span>
                <span className="font-semibold text-slate-200 capitalize">{prefs.interface_density}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Store,
  Package,
  ShoppingCart,
  Users,
  ShieldCheck,
  FileSpreadsheet,
  CreditCard,
  Settings,
  Bell,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
  Zap,
  Coins,
  Palette,
  HelpCircle,
  User as UserIcon,
  BookOpen,
  PhoneCall,
  ExternalLink,
  Menu,
  Sun,
  Moon,
  Receipt,
  Sparkles
} from 'lucide-react';
import { api, applySystemPreferences } from '../services/api';
import { NotificationItem, Role, User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User;
  setCurrentUser: (user: User) => void;
  onLogout: () => void;
}

export const DashboardLayout: React.FC<LayoutProps> = ({
  children,
  activeTab,
  setActiveTab,
  currentUser,
  setCurrentUser,
  onLogout
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [exchangeRate, setExchangeRate] = useState<number>(37.50);
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showMobileMoreSheet, setShowMobileMoreSheet] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return true;
  });

  const toggleTheme = async () => {
    const nextMode = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    const prefs = await api.getPreferences();
    const updated = { ...prefs, theme_mode: nextMode as 'light' | 'dark' };
    await api.updatePreferences(updated);
    applySystemPreferences(updated);
  };

  const userMenuRef = useRef<HTMLDivElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setShowSettingsMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu || showSettingsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu, showSettingsMenu]);

  useEffect(() => {
    api.getNotifications().then(setNotifications);
    api.getExchangeRate().then((cfg) => setExchangeRate(cfg.current_exchange_rate_bs));

    const handleSettingsUpdated = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.current_exchange_rate_bs) {
        setExchangeRate(Number(customEvent.detail.current_exchange_rate_bs));
      }
    };
    window.addEventListener('xion:settings-updated', handleSettingsUpdated);
    return () => window.removeEventListener('xion:settings-updated', handleSettingsUpdated);
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Panel Principal', icon: LayoutDashboard },
    { id: 'branches', label: 'Sucursales y Cajas', icon: Store },
    { id: 'inventory', label: 'Inventario y Traslados', icon: Package },
    { id: 'purchases', label: 'Compras y Proveedores', icon: ShoppingCart },
    { id: 'payment-methods', label: 'Métodos de Pago', icon: Coins },
    { id: 'payment-reports', label: 'Reportes de Pago', icon: Receipt },
    { id: 'users', label: 'Usuarios y Accesos', icon: Users },
    { id: 'audit', label: 'Auditoría y Bitácoras', icon: ShieldCheck },
    { id: 'reports', label: 'Centro de Reportes', icon: FileSpreadsheet },
  ];

  const tabTitles: Record<string, string> = {
    dashboard: 'Panel Principal',
    branches: 'Sucursales y Cajas',
    inventory: 'Inventario y Traslados',
    purchases: 'Compras y Proveedores',
    'payment-methods': 'Métodos de Pago',
    'payment-reports': 'Reportes de Pago',
    users: 'Usuarios y Accesos',
    audit: 'Auditoría y Bitácoras',
    reports: 'Centro de Reportes',
    billing: 'Mi Cuenta',
    settings: 'Configuraciones',
    preferences: 'Preferencias',
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'OWNER': return 'Dueño del Negocio';
      case 'ADMIN': return 'Administrador General';
      case 'BRANCH_MANAGER': return 'Gerente de Sucursal';
      case 'SUPERVISOR': return 'Supervisor de Turno';
      case 'AUDITOR': return 'Auditor Fiscal';
      case 'CASHIER': return 'Cajero Autorizado';
      default: return role || 'Usuario';
    }
  };

  const initials = (currentUser?.full_name || 'Usuario')
    .split(' ')
    .filter(Boolean)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleSwitchRole = async (role: Role) => {
    const newUser = await api.loginBypass(role);
    setCurrentUser(newUser);
    setShowUserMenu(false);
  };

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden text-slate-100">
      {/* Sidebar Navigation */}
      <aside className={`hidden md:flex ${isCollapsed ? 'w-20' : 'w-64'} glass-panel border-r border-slate-800/60 flex-col justify-between z-20 transition-all duration-300`}>
        <div>
          {/* Logo Header */}
          <div className="p-4 border-b border-slate-800/60 flex items-center justify-between min-h-[73px]">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-black text-xl shadow-lg shadow-cyan-500/20 text-white">
                X
              </div>
              {!isCollapsed && (
                <div className="truncate">
                  <h1 className="font-extrabold text-base tracking-wide bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent truncate">
                    XION-MANAGER
                  </h1>
                  <p className="text-[10px] text-cyan-400 font-medium tracking-wider uppercase truncate">
                    Control Multi-Sucursal
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
              title={isCollapsed ? "Expandir menú" : "Contraer menú"}
            >
              {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 mt-2 max-h-[calc(100vh-160px)] overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3.5'} py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-400 border border-cyan-500/30 shadow-md shadow-cyan-500/5'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                    }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Business Context */}
        <div className="p-4 border-t border-slate-800/60 bg-slate-900/40">
          <div className={`flex items-center ${isCollapsed ? 'flex-col gap-3' : 'justify-between'}`}>
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 shrink-0 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300">
                <Building2 className="w-4 h-4" />
              </div>
              {!isCollapsed && (
                <div className="truncate max-w-[110px]">
                  <p className="text-xs font-bold text-slate-200 truncate">Comercial Xion C.A.</p>
                  <p className="text-[10px] text-slate-400 truncate">{currentUser.branch_name || 'Corporativo'}</p>
                </div>
              )}
            </div>
            <button
              onClick={onLogout}
              title="Cerrar sesión"
              className="text-slate-400 hover:text-rose-400 transition-colors p-1.5 rounded-lg hover:bg-slate-800"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Topbar - Order & Layout Optimized for Mobile & Desktop */}
        <header className="h-14 sm:h-20 glass-panel border-b border-slate-800/60 px-2.5 sm:px-8 flex items-center justify-between z-30 shrink-0">
          {/* Left Title & Subtitle */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="md:hidden w-7 h-7 shrink-0 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-black text-xs shadow-md shadow-cyan-500/20 text-white">
              X
            </div>
            <div className="truncate min-w-0">
              <h1 className="text-sm sm:text-2xl font-bold text-slate-100 truncate">
                {tabTitles[activeTab] || 'Panel Principal'}
              </h1>
              <p className="text-[10px] sm:text-xs text-slate-400 truncate hidden xs:block">
                {currentUser.branch_name || 'Comercial Xion C.A.'}
              </p>
            </div>
          </div>

          {/* Right Action Icons & Dropdowns - Parity Sequence */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">

            {/* 1. Tasa Cambiaria Oficial */}
            <div className="flex items-center gap-1 rounded-lg sm:rounded-xl bg-slate-900/80 px-2 py-1 sm:px-3.5 sm:py-2 border border-slate-800 shadow-sm whitespace-nowrap">
              <span className="text-[10px] sm:text-xs font-medium text-slate-400 hidden xs:inline">Tasa:</span>
              <span className="font-mono text-[11px] sm:text-base font-bold text-cyan-400">
                {exchangeRate.toFixed(2)} Bs
              </span>
            </div>

            {/* 3. Notificaciones Bell */}
            <button
              onClick={() => setShowNotifDrawer(true)}
              className="relative flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-cyan-400 hover:border-slate-700 active:scale-95 transition-all"
              title="Notificaciones"
            >
              <Bell className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5 text-slate-200" />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="sr-only">Notificaciones</span>
            </button>

            {/* 5. Perfil de Usuario con Menú Desplegable */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowSettingsMenu(false);
                }}
                className="flex items-center gap-2 rounded-lg sm:rounded-xl transition-all hover:bg-slate-900/80 p-0.5 sm:p-1.5 border border-transparent hover:border-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                title="Perfil de usuario"
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center font-bold text-xs text-white shadow-md select-none">
                  {initials}
                </div>
                <div className="hidden lg:block text-left pr-1">
                  <p className="text-xs font-bold text-slate-200 leading-tight">{currentUser.full_name}</p>
                  <p className="text-[10px] text-cyan-400 font-medium leading-tight">{getRoleLabel(currentUser.role)}</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              </button>

              {/* User Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 top-12 w-64 glass-panel border border-slate-800 rounded-2xl p-2.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1">
                  <div className="px-3 py-2 border-b border-slate-800/80">
                    <p className="text-xs font-bold text-slate-100">{currentUser.full_name}</p>
                    <p className="text-[11px] text-cyan-400 font-medium">{getRoleLabel(currentUser.role)}</p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{currentUser.email}</p>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setShowProfileModal(true);
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-200 hover:bg-slate-900/80 flex items-center gap-2.5 transition-colors"
                    >
                      <UserIcon className="w-4 h-4 text-cyan-400" />
                      <span>Mi Perfil</span>
                    </button>

                    <button
                      onClick={() => {
                        localStorage.removeItem(`xion_onboarding_completed_${currentUser.id}`);
                        setCurrentUser({ ...currentUser, onboarding_completed: false });
                        setShowUserMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-cyan-300 hover:bg-cyan-950/40 flex items-center gap-2.5 transition-colors"
                    >
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      <span>Seleccionar Rol / Onboarding</span>
                    </button>
                  </div>

                  {/* Fast RBAC Switch Section (Dev Mode Only) */}
                  {import.meta.env.DEV && (
                    <div className="pt-2 border-t border-slate-800/80">
                      <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Zap className="w-3 h-3 text-cyan-400" />
                        <span>Bypass / Cambiar Rol</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 mt-1">
                        {(['OWNER', 'ADMIN', 'BRANCH_MANAGER', 'SUPERVISOR', 'AUDITOR', 'CASHIER'] as Role[]).map((r) => (
                          <button
                            key={r}
                            onClick={() => handleSwitchRole(r)}
                            className={`text-left px-2 py-1.5 rounded-lg text-[10px] font-semibold transition-colors flex items-center justify-between ${currentUser.role === r ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                              }`}
                          >
                            <span className="truncate">{r}</span>
                            {currentUser.role === r && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 6. Tuerca de Configuración General con Menú Desplegable (Xion-POS Parity) */}
            <div className="relative" ref={settingsMenuRef}>
              <button
                onClick={() => {
                  setShowSettingsMenu(!showSettingsMenu);
                  setShowUserMenu(false);
                }}
                className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-cyan-400 hover:border-slate-700 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                title="Configuración general"
              >
                <Settings className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5 text-slate-200" />
                <span className="sr-only">Configuración general</span>
              </button>

              {/* Settings Dropdown Menu */}
              {showSettingsMenu && (
                <div className="absolute right-0 top-12 w-60 glass-panel border border-slate-800 rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1">
                  {/* Configuraciones */}
                  <button
                    onClick={() => {
                      setActiveTab('settings');
                      setShowSettingsMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-200 hover:bg-slate-900/80 flex items-center gap-2.5 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-cyan-400" />
                    <span>Configuraciones</span>
                  </button>

                  {/* Preferencias */}
                  <button
                    onClick={() => {
                      setActiveTab('preferences');
                      setShowSettingsMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-200 hover:bg-slate-900/80 flex items-center gap-2.5 transition-colors"
                  >
                    <Palette className="w-4 h-4 text-cyan-400" />
                    <span>Preferencias</span>
                  </button>

                  {/* Mi Cuenta */}
                  <button
                    onClick={() => {
                      setActiveTab('billing');
                      setShowSettingsMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-200 hover:bg-slate-900/80 flex items-center gap-2.5 transition-colors"
                  >
                    <CreditCard className="w-4 h-4 text-cyan-400" />
                    <span>Mi cuenta</span>
                  </button>

                  {/* Ayuda */}
                  <button
                    onClick={() => {
                      setShowHelpModal(true);
                      setShowSettingsMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-200 hover:bg-slate-900/80 flex items-center gap-2.5 transition-colors"
                  >
                    <HelpCircle className="w-4 h-4 text-amber-400" />
                    <span>Ayuda</span>
                  </button>

                  <div className="my-1 border-t border-slate-800/80" />

                  {/* Cerrar Sesión */}
                  <button
                    onClick={() => {
                      setShowSettingsMenu(false);
                      onLogout();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 flex items-center gap-2.5 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </header>



        {/* Content Body */}
        <main className="flex-1 overflow-y-auto px-3 py-3.5 sm:p-6 pb-24 md:pb-6 bg-slate-950/80">
          {children}
        </main>

        {/* Notifications Slide-Out Drawer */}
        {showNotifDrawer && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex justify-end">
            <div className="w-full max-w-sm h-full glass-panel border-l border-slate-800 p-6 flex flex-col justify-between space-y-4 animate-in slide-in-from-right duration-200">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-cyan-400" />
                    <h4 className="font-bold text-sm text-white">Centro de Notificaciones</h4>
                  </div>
                  <button onClick={() => setShowNotifDrawer(false)} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3 overflow-y-auto max-h-[75vh] pr-1">
                  {notifications.map((n) => {
                    const badgeStyles = {
                      URGENT: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
                      WARNING: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
                      INFO: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                    };
                    return (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (n.link_tab) setActiveTab(n.link_tab);
                          setShowNotifDrawer(false);
                        }}
                        className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeStyles[n.severity]}`}>
                            {n.severity}
                          </span>
                          <span className="text-[10px] text-slate-500">{n.timestamp}</span>
                        </div>
                        <h5 className="text-xs font-bold text-slate-100">{n.title}</h5>
                        <p className="text-[11px] text-slate-400 leading-tight">{n.message}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={() => setShowNotifDrawer(false)}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-800"
              >
                Cerrar Panel
              </button>
            </div>
          </div>
        )}

        {/* Ayuda y Soporte Modal (from Settings Dropdown) */}
        {showHelpModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg glass-panel border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <HelpCircle className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-100">Centro de Ayuda y Soporte</h3>
                    <p className="text-[11px] text-slate-400">Ecosistema Xion-Manager & Xion-POS</p>
                  </div>
                </div>
                <button onClick={() => setShowHelpModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                  <span className="font-bold text-slate-200 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-cyan-400" />
                    Documentación y Manuales
                  </span>
                  <p className="text-slate-400 text-[11px]">
                    Accede a las especificaciones de sincronización bidireccional, gestión de cajas offline y reportes fiscales.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                  <span className="font-bold text-slate-200 flex items-center gap-2">
                    <PhoneCall className="w-4 h-4 text-emerald-400" />
                    Línea de Asistencia Técnica
                  </span>
                  <p className="text-slate-400 text-[11px]">
                    Soporte directo para incidencias con terminales de punto de venta e impresoras fiscales: soporte@xion.com
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20 text-slate-300 text-[11px]">
                  <strong>Versión actual:</strong> Xion-Manager v1.0.0-rc2 | Xion-POS Sync Hub v1.0
                </div>
              </div>

              <button
                onClick={() => setShowHelpModal(false)}
                className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md transition-all"
              >
                Entendido
              </button>
            </div>
          </div>
        )}

        {/* Mi Perfil Modal (from User Dropdown) */}
        {showProfileModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md glass-panel border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <UserIcon className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-100">Mi Perfil</h3>
                    <p className="text-[11px] text-slate-400">Información del usuario autenticado</p>
                  </div>
                </div>
                <button onClick={() => setShowProfileModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex justify-between">
                  <span className="text-slate-400">Nombre Completo:</span>
                  <span className="font-bold text-slate-200">{currentUser.full_name}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex justify-between">
                  <span className="text-slate-400">Correo Electrónico:</span>
                  <span className="font-bold text-slate-200">{currentUser.email}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex justify-between">
                  <span className="text-slate-400">Rol Operativo:</span>
                  <span className="font-bold text-cyan-400">{getRoleLabel(currentUser.role)}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex justify-between">
                  <span className="text-slate-400">Sucursal Asignada:</span>
                  <span className="font-bold text-slate-200">{currentUser.branch_name || 'Corporativo / Todas'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex justify-between">
                  <span className="text-slate-400">Estado de Aprobación:</span>
                  <span className="font-bold text-emerald-400">{currentUser.approval_status}</span>
                </div>
              </div>

              <button
                onClick={() => setShowProfileModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs border border-slate-800 transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {/* Mobile Bottom Navigation Bar (md:hidden) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 px-2 py-1.5 shadow-2xl">
          <div className="grid grid-cols-5 items-center justify-around">
            {/* 1. Panel */}
            <button
              onClick={() => {
                setActiveTab('dashboard');
                setShowMobileMoreSheet(false);
              }}
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all ${activeTab === 'dashboard'
                  ? 'text-cyan-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              <div className={`p-1 rounded-lg ${activeTab === 'dashboard' ? 'bg-cyan-500/15' : ''}`}>
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-[56px]">Panel</span>
            </button>

            {/* 2. Sucursales */}
            <button
              onClick={() => {
                setActiveTab('branches');
                setShowMobileMoreSheet(false);
              }}
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all ${activeTab === 'branches'
                  ? 'text-cyan-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              <div className={`p-1 rounded-lg ${activeTab === 'branches' ? 'bg-cyan-500/15' : ''}`}>
                <Store className="w-5 h-5" />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-[56px]">Sucursales</span>
            </button>

            {/* 3. Inventario */}
            <button
              onClick={() => {
                setActiveTab('inventory');
                setShowMobileMoreSheet(false);
              }}
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all ${activeTab === 'inventory'
                  ? 'text-cyan-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              <div className={`p-1 rounded-lg ${activeTab === 'inventory' ? 'bg-cyan-500/15' : ''}`}>
                <Package className="w-5 h-5" />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-[56px]">Inventario</span>
            </button>

            {/* 4. Compras */}
            <button
              onClick={() => {
                setActiveTab('purchases');
                setShowMobileMoreSheet(false);
              }}
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all ${activeTab === 'purchases'
                  ? 'text-cyan-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              <div className={`p-1 rounded-lg ${activeTab === 'purchases' ? 'bg-cyan-500/15' : ''}`}>
                <ShoppingCart className="w-5 h-5" />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-[56px]">Compras</span>
            </button>

            {/* 5. Más Módulos */}
            <button
              onClick={() => setShowMobileMoreSheet(!showMobileMoreSheet)}
              className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all relative ${showMobileMoreSheet || !['dashboard', 'branches', 'inventory', 'purchases'].includes(activeTab)
                  ? 'text-cyan-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              <div className={`p-1 rounded-lg relative ${showMobileMoreSheet || !['dashboard', 'branches', 'inventory', 'purchases'].includes(activeTab)
                  ? 'bg-cyan-500/15'
                  : ''
                }`}>
                <Menu className="w-5 h-5" />
                {!['dashboard', 'branches', 'inventory', 'purchases'].includes(activeTab) && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-slate-950" />
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-[56px]">Más</span>
            </button>
          </div>
        </nav>

        {/* Mobile More Sheet Modal (md:hidden) */}
        {showMobileMoreSheet && (
          <div className="md:hidden fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex flex-col justify-end animate-in fade-in duration-200">
            <div
              className="fixed inset-0"
              onClick={() => setShowMobileMoreSheet(false)}
            />
            <div className="relative z-10 w-full glass-panel bg-slate-900/95 border-t border-slate-800 rounded-t-3xl p-5 pb-8 space-y-4 max-h-[82vh] overflow-y-auto animate-in slide-in-from-bottom duration-250 shadow-2xl">
              {/* Handle Bar */}
              <div className="w-10 h-1 rounded-full bg-slate-700 mx-auto" />

              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-100">Todos los Módulos</h4>
                  <p className="text-[11px] text-slate-400">Navegación y herramientas de gestión</p>
                </div>
                <button
                  onClick={() => setShowMobileMoreSheet(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Grid of Secondary Modules */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'payment-methods', label: 'Métodos de Pago', icon: Coins },
                  { id: 'payment-reports', label: 'Reportes de Pago', icon: Receipt },
                  { id: 'users', label: 'Usuarios y Accesos', icon: Users },
                  { id: 'audit', label: 'Auditoría y Bitácoras', icon: ShieldCheck },
                  { id: 'reports', label: 'Centro de Reportes', icon: FileSpreadsheet },
                  { id: 'billing', label: 'Mi Cuenta', icon: CreditCard },
                  { id: 'settings', label: 'Configuraciones', icon: Settings },
                  { id: 'preferences', label: 'Preferencias', icon: Palette },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setShowMobileMoreSheet(false);
                      }}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all text-left ${isActive
                          ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-semibold shadow-sm'
                          : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/80'
                        }`}
                    >
                      <div className={`p-1.5 rounded-lg shrink-0 ${isActive ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-medium leading-tight truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tema + Ayuda y Soporte + Cerrar Sesión */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
                <button
                  onClick={toggleTheme}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-slate-200 text-xs font-medium flex items-center justify-center gap-2 transition-colors active:scale-95"
                >
                  {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-cyan-400" />}
                  <span>{isDark ? 'Modo Claro' : 'Modo Oscuro'}</span>
                </button>
                <button
                  onClick={() => {
                    setShowHelpModal(true);
                    setShowMobileMoreSheet(false);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-slate-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors active:scale-95"
                  title="Ayuda"
                >
                  <HelpCircle className="w-4 h-4 text-amber-400" />
                  <span className="hidden xs:inline">Ayuda</span>
                </button>
                <button
                  onClick={() => {
                    setShowMobileMoreSheet(false);
                    onLogout();
                  }}
                  className="py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors active:scale-95"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden xs:inline">Salir</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

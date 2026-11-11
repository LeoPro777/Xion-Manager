import React, { useState, useEffect } from 'react';
import { DashboardLayout } from './layouts/DashboardLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { BranchesPage } from './pages/BranchesPage';
import { InventoryPage } from './pages/InventoryPage';
import { PurchasesPage } from './pages/PurchasesPage';
import { UsersPage } from './pages/UsersPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { ReportsPage } from './pages/ReportsPage';
import { BillingPage } from './pages/BillingPage';
import { SettingsPage } from './pages/SettingsPage';
import { PaymentMethodsPage } from './pages/PaymentMethodsPage';
import { PaymentReportsPage } from './pages/PaymentReportsPage';
import { PreferencesPage } from './pages/PreferencesPage';
import { OnboardingWizardModal } from './components/OnboardingWizardModal';
import { AppLoadingScreen } from './components/AppLoadingScreen';
import { PendingPairingScreen } from './components/PendingPairingScreen';
import { User } from './types';
import { api, applySystemPreferences } from './services/api';

export const App: React.FC = () => {
  const [isPreloading, setIsPreloading] = useState<boolean>(false);
  const [preloadPercent, setPreloadPercent] = useState<number>(0);
  const [preloadStatus, setPreloadStatus] = useState<string>('Inicializando plataforma...');
  // 1. Restaurar sesión de forma síncrona desde localStorage para evitar parpadeos y redirección al Login
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const token = localStorage.getItem('xion_access_token');
      const savedUser = localStorage.getItem('xion_user');
      if (token && savedUser) {
        if (api.isTokenExpired(token)) {
          api.logout();
          return null;
        }
        return JSON.parse(savedUser);
      }
    } catch (e) {
      console.error('Error al restaurar sesión de usuario:', e);
    }
    return null;
  });

  // 2. Restaurar última pestaña activa
  const [activeTab, setActiveTab] = useState<string>(() => {
    return localStorage.getItem('xion_active_tab') || 'dashboard';
  });

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    localStorage.setItem('xion_active_tab', tab);
  };

  const handleUpdateUser = (user: User | null) => {
    setCurrentUser(user);
    if (user) {
      localStorage.setItem('xion_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('xion_user');
    }
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
  };

  useEffect(() => {
    const token = localStorage.getItem('xion_access_token');
    if (token) {
      if (api.isTokenExpired(token)) {
        handleLogout();
        return;
      }
      // Revalidar sesión en segundo plano sin interrumpir al usuario
      api.getUserProfile()
        .then((profile) => {
          if (profile?.user) {
            handleUpdateUser(profile.user);
          }
        })
        .catch((err) => {
          if (err?.status === 401 || err?.message?.includes('401')) {
            handleLogout();
          }
        });
    }

    api.getPreferences().then(applySystemPreferences);
  }, []);

  const handleLoginSuccess = async (user: User | null) => {
    handleUpdateUser(user);
    if (user) {
      if (user.approval_status === 'PENDING' && !user.business_id) {
        return;
      }
      setIsPreloading(true);
      await api.preloadCoreModules((pct, msg) => {
        setPreloadPercent(pct);
        setPreloadStatus(msg);
      });
      setIsPreloading(false);
    }
  };

  if (isPreloading) {
    return (
      <AppLoadingScreen 
        progressPercent={preloadPercent}
        statusLabel={preloadStatus}
      />
    );
  }

  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  if (currentUser.approval_status === 'PENDING' && !currentUser.business_id) {
    return (
      <PendingPairingScreen
        currentUser={currentUser}
        onApproved={async (approvedUser) => {
          handleUpdateUser(approvedUser);
          setIsPreloading(true);
          await api.preloadCoreModules((pct, msg) => {
            setPreloadPercent(pct);
            setPreloadStatus(msg);
          });
          setIsPreloading(false);
        }}
        onLogout={handleLogout}
      />
    );
  }

  useEffect(() => {
    if (currentUser?.id && (currentUser.business_id || currentUser.onboarding_completed === true || currentUser.is_new_user === false)) {
      localStorage.setItem(`xion_onboarding_completed_${currentUser.id}`, 'true');
    }
  }, [currentUser]);

  // Validación estricta: El formulario de onboarding inicial ÚNICAMENTE se muestra si el usuario es nuevo
  // (es decir, no existía previamente en la base de datos con empresa o registro previo completado).
  const isExistingUserInDb = Boolean(currentUser.business_id) || currentUser.is_new_user === false || currentUser.onboarding_completed === true;
  const isLocallyCompleted = localStorage.getItem(`xion_onboarding_completed_${currentUser.id}`) === 'true';

  const needsOnboarding = !isExistingUserInDb && !isLocallyCompleted && (currentUser.is_new_user === true || currentUser.onboarding_completed === false);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage />;
      case 'branches':
        return <BranchesPage />;
      case 'inventory':
        return <InventoryPage />;
      case 'purchases':
        return <PurchasesPage />;
      case 'payment-methods':
        return <PaymentMethodsPage />;
      case 'payment-reports':
        return <PaymentReportsPage />;
      case 'users':
        return <UsersPage />;
      case 'audit':
        return <AuditLogsPage />;
      case 'reports':
        return <ReportsPage />;
      case 'billing':
        return <BillingPage onNavigateToPaymentReports={() => setActiveTab('payment-reports')} />;
      case 'settings':
        return <SettingsPage />;
      case 'preferences':
        return <PreferencesPage />;
      default:
        return <DashboardPage />;
    }
  };


  return (
    <>
      <DashboardLayout 
        activeTab={activeTab} 
        setActiveTab={handleTabChange}
        currentUser={currentUser}
        setCurrentUser={handleUpdateUser}
        onLogout={handleLogout}
      >
        {renderContent()}
      </DashboardLayout>

      {needsOnboarding && (
        <OnboardingWizardModal
          currentUser={currentUser}
          onCompleted={(updatedUser) => {
            handleUpdateUser(updatedUser);
          }}
        />
      )}
    </>
  );
};

export default App;

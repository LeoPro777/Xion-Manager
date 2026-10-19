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
import { User } from './types';
import { api, applySystemPreferences } from './services/api';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  useEffect(() => {
    if (import.meta.env.DEV) {
      api.loginBypass('OWNER').then(setCurrentUser);
    }
    api.getPreferences().then(applySystemPreferences);
  }, []);

  if (!currentUser) {
    return <LoginPage onLoginSuccess={setCurrentUser} />;
  }

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
    <DashboardLayout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab}
      currentUser={currentUser}
      setCurrentUser={setCurrentUser}
      onLogout={() => setCurrentUser(null)}
    >
      {renderContent()}
    </DashboardLayout>
  );
};

export default App;

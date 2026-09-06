import React, { useState } from 'react';
import { LanguageProvider } from './context/LanguageContext';
import { NotificationProvider } from './context/NotificationContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar, ActiveTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Dashboard } from './components/dashboard/Dashboard';
import { PosScreen } from './components/pos/PosScreen';
import { ProductsView } from './components/products/ProductsView';
import { InventoryView } from './components/inventory/InventoryView';
import { ManufacturingView } from './components/manufacturing/ManufacturingView';
import { PurchasesView } from './components/purchases/PurchasesView';
import { BranchesView } from './components/branches/BranchesView';
import { CustomersView } from './components/customers/CustomersView';
import { UsersView } from './components/users/UsersView';
import { ReportsView } from './components/reports/ReportsView';
import { AuditLogsView } from './components/audit/AuditLogsView';
import { SettingsView } from './components/settings/SettingsView';
import { SecurityTestModal } from './components/security/SecurityTestModal';
import { TenantOnboardingModal } from './components/auth/TenantOnboardingModal';
import { ShiftSummaryModal } from './components/pos/ShiftSummaryModal';

const AppContent: React.FC = () => {
  const { isLoading, tenant } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Modals
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [showShiftSummary, setShowShiftSummary] = useState(false);

  if (isLoading && !tenant) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-[#F5F5F0] text-[#1C1C1E]">
        <div className="w-10 h-10 border-3 border-[#5A5A40]/30 border-t-[#5A5A40] rounded-full animate-spin mb-4" />
        <h2 className="text-base font-serif font-bold text-[#1C1C1E]">جاري تحميل بيئة المنشأة وعزل البيانات...</h2>
        <p className="text-xs text-[#7A7A75] mt-1">Multi-Tenant Enterprise POS/ERP System</p>
      </div>
    );
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            onNavigate={setActiveTab}
            onOpenSecurityModal={() => setShowSecurityModal(true)}
          />
        );
      case 'pos':
        return <PosScreen onOpenShiftSummary={() => setShowShiftSummary(true)} />;
      case 'products':
        return <ProductsView />;
      case 'inventory':
        return <InventoryView />;
      case 'manufacturing':
        return <ManufacturingView />;
      case 'purchases':
        return <PurchasesView />;
      case 'branches':
        return <BranchesView />;
      case 'customers':
        return <CustomersView />;
      case 'users':
        return <UsersView />;
      case 'reports':
        return <ReportsView />;
      case 'audit':
        return <AuditLogsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <Dashboard onNavigate={setActiveTab} onOpenSecurityModal={() => setShowSecurityModal(true)} />;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-slate-900 text-slate-800 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        setActiveTab={setActiveTab}
        collapsed={isSidebarCollapsed}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        setIsCollapsed={setIsSidebarCollapsed}
        onOpenSecurityModal={() => setShowSecurityModal(true)}
      />

      {/* Main App Container */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden bg-slate-100">
        {/* Top Header Bar */}
        <Header
          onOpenSecurityModal={() => setShowSecurityModal(true)}
          onOpenTenantModal={() => setShowTenantModal(true)}
          onOpenOnboardingModal={() => setShowTenantModal(true)}
        />

        {/* Dynamic View Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-50/70 relative">
          {renderActiveView()}
        </main>
      </div>

      {/* Security & RLS Test Modal */}
      <SecurityTestModal
        isOpen={showSecurityModal}
        onClose={() => setShowSecurityModal(false)}
      />

      {/* New Tenant Provisioning Modal */}
      <TenantOnboardingModal
        isOpen={showTenantModal}
        onClose={() => setShowTenantModal(false)}
      />

      {/* Shift Summary / Z-Report Modal */}
      {showShiftSummary && (
        <ShiftSummaryModal
          onClose={() => setShowShiftSummary(false)}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <NotificationProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </NotificationProvider>
    </LanguageProvider>
  );
}

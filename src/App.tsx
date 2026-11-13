import React, { useState } from 'react';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginScreen } from './components/auth/LoginScreen';
import { Navbar, ActiveTab } from './components/layout/Navbar';
import { DashboardView } from './views/DashboardView';
import { CentralStoreView } from './views/CentralStoreView';
import { BinCardView } from './views/BinCardView';
import { RecipesView } from './views/RecipesView';
import { SmartReconciliationView } from './views/SmartReconciliationView';
import { FBReportView } from './views/FBReportView';
import { DataVaultView } from './views/DataVaultView';
import { StandardFormsView } from './views/StandardFormsView';
import { CutOverView } from './views/CutOverView';
import { AutomatedReconciliationView } from './views/AutomatedReconciliationView';
import { FullReconciliationView } from './views/FullReconciliationView';
import { BranchDailyStockModuleView } from './views/BranchDailyStockModuleView';
import { StorekeeperPortalView } from './views/StorekeeperPortalView';
import { ExpensesView } from './views/ExpensesView';
import { HotelsAdminView } from './views/HotelsAdminView';
import { FinanceView } from './views/FinanceView';
import { HrPayrollView } from './views/HrPayrollView';
import { StationPortalView } from './views/StationPortalView';
import { StationType } from './types';

import { StockInModal } from './components/modals/StockInModal';
import { TransferModal } from './components/modals/TransferModal';
import { BranchUsageModal } from './components/modals/BranchUsageModal';
import { NewBranchModal } from './components/modals/NewBranchModal';
import { NewItemModal } from './components/modals/NewItemModal';
import { DesktopInstallModal } from './components/modals/DesktopInstallModal';
import { AiVoucherScannerModal } from './components/modals/AiVoucherScannerModal';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { formatEthiopianDate, getTodayDateString } from './utils/ethiopianDate';

const AppContent: React.FC = () => {
  const { language, t } = useLanguage();
  const { branches } = useApp();
  const { currentUser, loading } = useAuth();

  // Check if dedicated 5-role station direct URL portal is requested
  const [stationPortalMode, setStationPortalMode] = useState<{
    station: StationType;
    branchId: string;
  } | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const portal = params.get('portal');
      const branch = params.get('branch') || 'br-frasco-bello';
      if (portal && ['barman', 'juicer', 'cashier', 'storekeeper', 'chef'].includes(portal)) {
        return { station: portal as StationType, branchId: branch };
      }
    }
    return null;
  });

  // Check if legacy storekeeper URL param or direct portal mode is requested
  const [isStorekeeperMode, setIsStorekeeperMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const isPortal = params.get('portal') === 'storekeeper' || params.get('role') === 'storekeeper';
      const isHashCatalog = window.location.hash.includes('catalog=');
      return (isPortal || isHashCatalog) && !params.get('portal'); // stationPortalMode takes precedence
    }
    return false;
  });

  // Primary screen defaults directly to Branch Daily Stock & Reconciliation (Bello Fam)
  const [activeTab, setActiveTab] = useState<ActiveTab>('branchDailyInput');

  // Modals state
  const [stockInModalOpen, setStockInModalOpen] = useState(false);
  const [selectedStockInItem, setSelectedStockInItem] = useState<string | undefined>(undefined);

  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedTransferItem, setSelectedTransferItem] = useState<string | undefined>(undefined);
  const [selectedTransferBranch, setSelectedTransferBranch] = useState<string | undefined>(undefined);

  const [branchUsageModalOpen, setBranchUsageModalOpen] = useState(false);
  const [usageBranchId, setUsageBranchId] = useState<string>(branches[0]?.id || '');

  const [newBranchModalOpen, setNewBranchModalOpen] = useState(false);
  const [newItemModalOpen, setNewItemModalOpen] = useState(false);
  const [desktopInstallModalOpen, setDesktopInstallModalOpen] = useState(false);
  const [aiScannerModalOpen, setAiScannerModalOpen] = useState(false);

  // Selected item for Bin Card view
  const [binCardSelectedItemId, setBinCardSelectedItemId] = useState<string | undefined>(undefined);

  const handleOpenStockIn = (itemId?: string) => {
    setSelectedStockInItem(itemId);
    setStockInModalOpen(true);
  };

  const handleOpenTransfer = (itemId?: string, branchId?: string) => {
    setSelectedTransferItem(itemId);
    setSelectedTransferBranch(branchId);
    setTransferModalOpen(true);
  };

  const handleOpenBranchUsage = (branchId: string) => {
    setUsageBranchId(branchId);
    setBranchUsageModalOpen(true);
  };

  const handleSelectBinCardItem = (itemId: string) => {
    setBinCardSelectedItemId(itemId);
    setActiveTab('binCard');
  };

  const handleNavigateToReconcile = (branchId: string) => {
    setActiveTab('reconciliation');
  };

  // If dedicated 5-role Station Portal URL mode is active (?portal=barman/juicer/cashier/storekeeper/chef)
  if (stationPortalMode) {
    return (
      <StationPortalView
        initialStation={stationPortalMode.station}
        initialBranchId={stationPortalMode.branchId}
        isStandalone={true}
        onExit={() => {
          if (typeof window !== 'undefined') {
            window.history.replaceState({}, '', window.location.pathname);
          }
          setStationPortalMode(null);
          setActiveTab('branchDailyInput');
        }}
      />
    );
  }

  // If Storekeeper direct link mode is active (?portal=storekeeper), render isolated box portal
  if (isStorekeeperMode) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950 p-4 sm:p-6">
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-amber-500/5 via-amber-500/[0.02] to-transparent pointer-events-none -z-10 blur-3xl"></div>
        <StorekeeperPortalView
          onExitPortal={() => {
            setIsStorekeeperMode(false);
            setActiveTab('branchDailyInput');
          }}
        />
        <OfflineIndicator />
      </div>
    );
  }

  // Requirement 4: App opens only after email + password sign-in (Firebase Authentication)
  if (!currentUser) {
    if (loading) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-sans">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-amber-300 font-bold text-xs tracking-wider">
              {language === 'am' ? 'ሲስተሙ እየተዘጋጀ ነው...' : 'Initializing System...'}
            </span>
          </div>
        </div>
      );
    }
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950 relative">
      {/* Ambient subtle luxury gold mesh glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-amber-500/5 via-amber-500/[0.02] to-transparent pointer-events-none -z-10 blur-3xl"></div>

      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenStockIn={() => handleOpenStockIn()}
        onOpenTransfer={() => handleOpenTransfer()}
        onOpenDesktopInstall={() => setDesktopInstallModalOpen(true)}
        onOpenAiScanner={() => setAiScannerModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            setActiveTab={setActiveTab}
            onOpenStockIn={() => handleOpenStockIn()}
            onOpenTransfer={() => handleOpenTransfer()}
            onOpenNewBranch={() => setNewBranchModalOpen(true)}
            onOpenNewItem={() => setNewItemModalOpen(true)}
          />
        )}

        {activeTab === 'centralStore' && (
          <CentralStoreView
            onOpenStockIn={handleOpenStockIn}
            onOpenTransfer={handleOpenTransfer}
            onSelectBinCardItem={handleSelectBinCardItem}
            onOpenNewItem={() => setNewItemModalOpen(true)}
          />
        )}

        {activeTab === 'storekeeperPortal' && (
          <StorekeeperPortalView
            onExitPortal={() => setActiveTab('branchDailyInput')}
          />
        )}

        {activeTab === 'binCard' && (
          <BinCardView
            initialItemId={binCardSelectedItemId}
            onOpenStockIn={handleOpenStockIn}
            onOpenTransfer={handleOpenTransfer}
          />
        )}

        {activeTab === 'branchDailyInput' && (
          <BranchDailyStockModuleView
            initialMode="dailyInput"
            onOpenNewBranch={() => setNewBranchModalOpen(true)}
          />
        )}

        {activeTab === 'recipes' && (
          <BranchDailyStockModuleView
            initialMode="menuRecipes"
            onOpenNewBranch={() => setNewBranchModalOpen(true)}
          />
        )}

        {activeTab === 'fullReconciliation' && (
          <BranchDailyStockModuleView
            initialMode="varianceAudit"
            onOpenNewBranch={() => setNewBranchModalOpen(true)}
          />
        )}

        {activeTab === 'fbReport' && (
          <BranchDailyStockModuleView
            initialMode="fbControl"
            onOpenNewBranch={() => setNewBranchModalOpen(true)}
          />
        )}

        {activeTab === 'cutOver' && <CutOverView />}

        {activeTab === 'autoReconciliation' && <AutomatedReconciliationView />}

        {activeTab === 'reconciliation' && (
          <SmartReconciliationView />
        )}

        {activeTab === 'finance' && (
          <FinanceView />
        )}

        {activeTab === 'hrPayroll' && (
          <HrPayrollView />
        )}

        {activeTab === 'stationPortal' && (
          <StationPortalView onExit={() => setActiveTab('branchDailyInput')} />
        )}

        {activeTab === 'expenses' && (
          <ExpensesView />
        )}

        {activeTab === 'hotelsAdmin' && (
          <HotelsAdminView />
        )}

        {activeTab === 'dataVault' && (
          <DataVaultView />
        )}

        {activeTab === 'standardForms' && (
          <StandardFormsView />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-amber-500/20 py-4 px-6 text-xs text-slate-400 no-print">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-400">
              {t.appName}
            </span>
            <span>•</span>
            <span className="text-slate-400">{language === 'am' ? 'የተቀናጀ የስቶር፣ የቅርንጫፍ እና የሪሲፒ ማኔጅመንት' : 'Integrated ERP & Recipe Reconciliation'}</span>
          </div>
          <div className="text-[11px] text-amber-400/80 font-medium">
            🇪🇹 {formatEthiopianDate(getTodayDateString(), language)} | Powered by AI Studio Enterprise
          </div>
        </div>
      </footer>

      {/* Global Modals */}
      <StockInModal
        isOpen={stockInModalOpen}
        onClose={() => setStockInModalOpen(false)}
        preselectedItemId={selectedStockInItem}
      />

      <TransferModal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        preselectedItemId={selectedTransferItem}
        preselectedBranchId={selectedTransferBranch}
      />

      <BranchUsageModal
        isOpen={branchUsageModalOpen}
        onClose={() => setBranchUsageModalOpen(false)}
        branchId={usageBranchId}
      />

      <NewBranchModal
        isOpen={newBranchModalOpen}
        onClose={() => setNewBranchModalOpen(false)}
      />

      <NewItemModal
        isOpen={newItemModalOpen}
        onClose={() => setNewItemModalOpen(false)}
      />

      <DesktopInstallModal
        isOpen={desktopInstallModalOpen}
        onClose={() => setDesktopInstallModalOpen(false)}
      />

      <AiVoucherScannerModal
        isOpen={aiScannerModalOpen}
        onClose={() => setAiScannerModalOpen(false)}
        onNavigateToTab={setActiveTab}
      />

      {/* Connectivity & Offline Indicator */}
      <OfflineIndicator />
    </div>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

import React, { useState } from 'react';
import {
  LayoutDashboard,
  Warehouse,
  ClipboardList,
  GitBranch,
  ChefHat,
  CalendarDays,
  Scale,
  TrendingUp,
  PlusCircle,
  ArrowRightLeft,
  Calendar,
  Sparkles,
  Trash2,
  Database,
  HardDrive,
  Download,
  Users,
  UtensilsCrossed,
  ShieldCheck,
  CookingPot,
  Camera,
  FileText,
  FileSpreadsheet,
  RotateCcw,
  Copy,
  Check,
  Link2,
  Building2,
  Receipt,
  LogOut,
  Shield,
  ChevronDown,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { formatEthiopianDate, getTodayDateString } from '../../utils/ethiopianDate';
import { createStorekeeperShareableUrl } from '../../utils/shareableStorekeeperLink';

export type ActiveTab =
  | 'branchDailyInput'
  | 'finance'
  | 'hrPayroll'
  | 'stationPortal'
  | 'dashboard'
  | 'centralStore'
  | 'storekeeperPortal'
  | 'binCard'
  | 'recipes'
  | 'fullReconciliation'
  | 'autoReconciliation'
  | 'cutOver'
  | 'reconciliation'
  | 'fbReport'
  | 'standardForms'
  | 'dataVault'
  | 'expenses'
  | 'hotelsAdmin';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenStockIn: () => void;
  onOpenTransfer: () => void;
  onOpenDesktopInstall: () => void;
  onOpenAiScanner?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenStockIn,
  onOpenTransfer,
  onOpenDesktopInstall,
  onOpenAiScanner,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const { clearAllDataCompletely, exportFullBackup, restoreOriginalBaselineData, items, centralBinCards, hotels, currentHotelId, setCurrentHotelId, currentHotel } = useApp();
  const { currentUser, logout, isSuperAdmin } = useAuth();
  const todayStr = getTodayDateString();
  const ethDate = formatEthiopianDate(todayStr, language);

  const [copiedStorekeeperLink, setCopiedStorekeeperLink] = useState(false);
  const [stationLinksModalOpen, setStationLinksModalOpen] = useState(false);
  const [copiedStationKey, setCopiedStationKey] = useState<string | null>(null);

  const handleCopyStorekeeperLink = () => {
    // 1. Force push current items to server catalog
    fetch('/api/store/sync-catalog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    }).catch(() => {});

    // 2. Also encode into shareable URL hash for fallback
    const fullUrl = createStorekeeperShareableUrl(items);
    navigator.clipboard.writeText(fullUrl);
    setCopiedStorekeeperLink(true);
    setTimeout(() => setCopiedStorekeeperLink(false), 3000);
  };

  const handleCopyStationUrl = (stationKey: string, branchId: string = 'br-frasco-bello') => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/?portal=${stationKey}&branch=${branchId}`;
    navigator.clipboard.writeText(url);
    setCopiedStationKey(stationKey);
    setTimeout(() => setCopiedStationKey(null), 2500);
  };

  const primaryModules = [
    {
      id: 'operations',
      defaultTab: 'branchDailyInput' as ActiveTab,
      label: language === 'am' ? '📋 የብራንች ቁጥጥር' : '📋 Branch Operations',
      icon: ClipboardList,
      highlight: true,
      subTabs: [
        { id: 'branchDailyInput' as ActiveTab, label: language === 'am' ? '📋 ዕለታዊ ቆጠራ' : 'Daily Stock' },
        { id: 'fullReconciliation' as ActiveTab, label: language === 'am' ? '📊 የልዩነት ኦዲት' : 'Variance Audit' },
        { id: 'dashboard' as ActiveTab, label: language === 'am' ? '📈 ዳሽቦርድ' : 'Dashboard' },
      ],
    },
    {
      id: 'stationPortals',
      defaultTab: 'stationPortal' as ActiveTab,
      label: language === 'am' ? '📱 የቀጥታ ቆጠራ ፖርታል' : '📱 5 Station Portals',
      icon: UtensilsCrossed,
      isGold: true,
    },
    {
      id: 'inventory',
      defaultTab: 'centralStore' as ActiveTab,
      label: language === 'am' ? '🏪 ሴንትራል ስቶር' : '🏪 Central Store',
      icon: Warehouse,
      subTabs: [
        { id: 'centralStore' as ActiveTab, label: language === 'am' ? '🏪 GRN / SIV' : 'GRN / SIV' },
        { id: 'binCard' as ActiveTab, label: language === 'am' ? '📋 ቢን ካርዶች' : 'Bin Cards' },
        { id: 'storekeeperPortal' as ActiveTab, label: language === 'am' ? '👷‍♂️ ስቶር ቦክስ' : 'Storekeeper Box' },
      ],
    },
    {
      id: 'finance',
      defaultTab: 'finance' as ActiveTab,
      label: language === 'am' ? '💰 ፋይናንስና ወጪ' : '💰 Finance & Tax',
      icon: TrendingUp,
      subTabs: [
        { id: 'finance' as ActiveTab, label: language === 'am' ? '💰 P&L እና ታክስ (USALI)' : 'P&L Statement' },
        { id: 'expenses' as ActiveTab, label: language === 'am' ? '💸 ወጪዎች (Expenses)' : 'Daily Expenses' },
      ],
    },
    {
      id: 'hrPayroll',
      defaultTab: 'hrPayroll' as ActiveTab,
      label: language === 'am' ? '👥 ሰራተኞችና ፔይሮል' : '👥 HR & Payroll',
      icon: Users,
    },
    {
      id: 'recipes',
      defaultTab: 'recipes' as ActiveTab,
      label: language === 'am' ? '🍽️ ሜኑና ሬሲፒ' : '🍽️ Menu & Recipes',
      icon: ChefHat,
    },
    {
      id: 'admin',
      defaultTab: 'hotelsAdmin' as ActiveTab,
      label: language === 'am' ? '⚙️ አድሚንና ሲስተም' : '⚙️ Admin & Vault',
      icon: Building2,
      subTabs: [
        { id: 'hotelsAdmin' as ActiveTab, label: language === 'am' ? '🏨 ሆቴሎችና ተጠቃሚዎች' : 'Hotels & Users' },
        { id: 'dataVault' as ActiveTab, label: language === 'am' ? '💾 ዳታ ባክአፕ' : 'Data Vault' },
        { id: 'cutOver' as ActiveTab, label: language === 'am' ? '🔄 ፍሬሽ ስታርት' : 'Fresh Start' },
      ],
    },
  ];

  // Active module helper
  const activeModuleId = (() => {
    if (['branchDailyInput', 'fullReconciliation', 'dashboard', 'autoReconciliation', 'fbReport'].includes(activeTab)) {
      return 'operations';
    }
    if (activeTab === 'stationPortal') return 'stationPortals';
    if (['centralStore', 'binCard', 'storekeeperPortal'].includes(activeTab)) return 'inventory';
    if (['finance', 'expenses'].includes(activeTab)) return 'finance';
    if (activeTab === 'hrPayroll') return 'hrPayroll';
    if (activeTab === 'recipes') return 'recipes';
    return 'admin';
  })();

  const currentModule = primaryModules.find((m) => m.id === activeModuleId) || primaryModules[0];

  const handleWipeData = () => {
    if (window.confirm(language === 'am' ? 'ሙሉ ዳታዎችን አጽድተህ እንደ አዲስ ባዶ ማድረግ ትፈልጋለህ?' : 'Do you want to clear all data completely to a fresh blank start?')) {
      clearAllDataCompletely();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-xl border-b border-amber-500/20 shadow-2xl">
      {/* Top Luxury Banner with Ethiopian Date Ticker & Golden Accents */}
      <div className="px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-800/80 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/20">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400 shadow-sm shadow-amber-400"></span>
            </span>
            <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-500 tracking-wide text-xs sm:text-sm drop-shadow-sm">
              {currentHotel ? (language === 'am' ? (currentHotel.nameAm || currentHotel.name) : currentHotel.name) : 'BELLO FAM RESTAURANT GROUP • ቤሎ ፋም'}
            </span>
          </div>

          {/* Hotel Switcher Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-amber-500/30 rounded-xl px-2.5 py-1">
            <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <select
              value={currentHotelId}
              onChange={(e) => setCurrentHotelId(e.target.value)}
              className="bg-transparent text-amber-200 font-bold text-xs focus:outline-none cursor-pointer"
              title={language === 'am' ? 'ሆቴል / ድርጅት ይቀይሩ' : 'Switch Hotel / Business'}
            >
              {(Array.isArray(hotels) ? hotels : [])
                .filter((h) => h && !h.isArchived)
                .map((h) => (
                  <option key={h.id} value={h.id} className="bg-slate-900 text-white">
                    {language === 'am' ? (h.nameAm || h.name) : h.name} ({h.category})
                  </option>
                ))}
            </select>
          </div>

          <span className="hidden lg:inline text-amber-500/30">|</span>

          {/* Ethiopian Calendar Badge with Gold Trim */}
          <div className="flex items-center gap-2 bg-gradient-r from-slate-900 via-amber-950/30 to-slate-900 px-3 py-1 rounded-xl border border-amber-500/30 shadow-inner">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-amber-300 font-bold tracking-tight">🇪🇹 {ethDate}</span>
            <span className="text-slate-400 text-[11px] font-mono">({todayStr})</span>
          </div>
        </div>

        {/* Top Header Actions */}
        <div className="flex items-center gap-2.5 ml-auto">
          {/* Storekeeper Direct Link Button */}
          <button
            onClick={handleCopyStorekeeperLink}
            title={language === 'am' ? 'ለስቶር ኪፐር የሚላከውን ቀጥተኛ ሊንክ ቅዳ (እቃ ማስተላለፊያ እና ዋጋ መሙያ ብቻ)' : 'Copy direct link for storekeeper (Stock In with price & SIV only)'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs text-amber-300 bg-amber-950/40 border border-amber-500/50 hover:bg-amber-900/50 hover:border-amber-400 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            {copiedStorekeeperLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Link2 className="w-3.5 h-3.5 text-amber-400" />}
            <span className="font-extrabold">
              {copiedStorekeeperLink
                ? (language === 'am' ? 'ሊንኩ ተቀድቷል! ✅' : 'Link Copied! ✅')
                : (language === 'am' ? '🔗 የስቶር ኪፐር ሊንክ' : '🔗 Storekeeper Link')}
            </span>
          </button>

          {/* 5-Role Staff Station Links Hub Button */}
          <button
            onClick={() => setStationLinksModalOpen(true)}
            title={language === 'am' ? 'የባርማን፣ የጁሰር፣ የካሸር፣ የስቶር እና የሼፍ ቀጥተኛ ሊንኮች' : 'Direct count portals for Barman, Juicer, Cashier, Storekeeper & Chef'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-500/50 hover:bg-emerald-900/50 hover:border-emerald-400 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <UtensilsCrossed className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-extrabold">
              {language === 'am' ? '🔗 የ5ቱ ስቴሽኖች ሊንክ' : '🔗 5 Station Portals'}
            </span>
          </button>

          {/* Luxury Stock In Button */}
          <button
            onClick={onOpenStockIn}
            className="relative group overflow-hidden flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 shadow-md shadow-emerald-950/50 hover:shadow-emerald-500/25 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 ring-1 ring-emerald-400/40 cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{t.dashboard.stockInBtn}</span>
          </button>

          {/* Luxury Transfer Button */}
          <button
            onClick={onOpenTransfer}
            className="relative group overflow-hidden flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 shadow-md shadow-blue-950/50 hover:shadow-blue-500/25 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 ring-1 ring-blue-400/40 cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>{t.dashboard.transferBtn}</span>
          </button>

          {/* AI Voucher & Document Scanner Button */}
          {onOpenAiScanner && (
            <button
              onClick={onOpenAiScanner}
              title={language === 'am' ? 'የሰነዶችና የቫውቸሮች ፎቶ አንባቢ በ AI' : 'Scan Voucher / Slip Photo with AI'}
              className="relative group overflow-hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs text-amber-200 bg-gradient-to-r from-purple-900/70 via-slate-900 to-amber-950/70 border border-purple-500/50 hover:border-amber-400 shadow-md shadow-purple-950/50 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 ring-1 ring-purple-400/40 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span className="font-extrabold">{language === 'am' ? '📷 AI ሰነድ አንባቢ' : '📷 AI Scan'}</span>
            </button>
          )}

          {/* Dedicated Desktop & Mobile App Install Button */}
          <button
            onClick={onOpenDesktopInstall}
            title={language === 'am' ? 'መተግበሪያውን በኮምፒውተርዎ ወይም በስልክዎ ላይ በቀላሉ አውርደው እንደ ሶፍትዌር ይጠቀሙ' : 'Download and run app on PC / Mobile'}
            className="relative group overflow-hidden flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-black text-xs text-slate-950 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 hover:from-amber-200 hover:to-yellow-300 border border-amber-300 shadow-md shadow-amber-950/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer ring-1 ring-amber-400/50"
          >
            <HardDrive className="w-3.5 h-3.5 text-slate-950" />
            <span className="font-black">{language === 'am' ? '💻 መተግበሪያውን አውርድ / ጫን' : '💻 Download / Install App'}</span>
          </button>

          {/* Bilingual Switcher with luxury tactile feel */}
          <div className="flex items-center bg-slate-900/90 rounded-xl p-0.5 border border-amber-500/20 shadow-inner">
            <button
              onClick={() => setLanguage('am')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                language === 'am'
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-sm shadow-amber-500/30 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              አማርኛ 🇪🇹
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                language === 'en'
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-sm shadow-amber-500/30 font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              English 🌐
            </button>
          </div>

          {/* User Account Pill & Logout */}
          {currentUser && (
            <div className="flex items-center gap-1.5 pl-1 border-l border-slate-800">
              <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 px-2.5 py-1 rounded-xl">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black text-[10px] flex items-center justify-center">
                  {typeof currentUser.displayName === 'string' && currentUser.displayName.trim()
                    ? currentUser.displayName.trim().charAt(0).toUpperCase()
                    : 'U'}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[11px] font-bold text-white leading-tight truncate max-w-[100px] sm:max-w-[130px]">
                    {currentUser.displayName || currentUser.email}
                  </span>
                  <span className="text-[9px] text-amber-400 font-mono flex items-center gap-0.5">
                    {isSuperAdmin ? (
                      <>
                        <Shield className="w-2.5 h-2.5 text-amber-400 inline" />
                        <span>Super Admin</span>
                      </>
                    ) : (
                      currentUser.role || 'User'
                    )}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={logout}
                title={language === 'am' ? 'ከአካውንት ውጣ (Logout)' : 'Logout'}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Clean Slate Wipe Button */}
          <button
            onClick={handleWipeData}
            title={language === 'am' ? 'ሙሉ ዳታ አጽዳ (Reset / Blank)' : 'Clear All Data (Clean Slate)'}
            className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Consolidated Primary Modules Bar */}
      <div className="px-4 sm:px-6 border-t border-slate-800/60 bg-slate-950/90">
        <div className="flex items-center justify-between h-13 overflow-x-auto no-scrollbar">
          <nav className="flex items-center gap-1.5 sm:gap-2">
            {primaryModules.map((mod) => {
              const Icon = mod.icon;
              const isModuleActive = activeModuleId === mod.id;
              return (
                <button
                  key={mod.id}
                  onClick={() => setActiveTab(mod.defaultTab)}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                    isModuleActive
                      ? mod.isGold
                        ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 font-black ring-1 ring-amber-300/60'
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/20 font-bold ring-1 ring-emerald-400/40'
                      : mod.isGold
                      ? 'text-amber-400 hover:bg-amber-950/30 hover:text-amber-300 border border-amber-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{mod.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sub-Pills for the Active Module */}
        {currentModule?.subTabs && currentModule.subTabs.length > 1 && (
          <div className="pb-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-t border-slate-900/80 pt-1.5 animate-fadeIn">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider pl-1 pr-1.5">
              {language === 'am' ? 'ክፍሎች፡' : 'Sub-views:'}
            </span>
            {currentModule.subTabs.map((sub) => {
              const isSubActive = activeTab === sub.id;
              return (
                <button
                  key={sub.id}
                  onClick={() => setActiveTab(sub.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isSubActive
                      ? 'bg-slate-800 text-amber-300 border border-amber-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  {sub.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {/* 5 Station Direct Links Hub Modal */}
      {stationLinksModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-emerald-600 text-white">
                  <UtensilsCrossed className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    {language === 'am' ? 'የ5ቱ ስቴሽኖች የቀጥታ ቆጠራ ሊንኮች' : 'Staff Station Direct Link Hub'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {language === 'am'
                      ? 'ሰራተኞች በየስቴሽናቸው ሆነው በሞባይላቸው በቀጥታ እንዲሞሉ ይህን ሊንክ ይላኩላቸው'
                      : 'Copy or open isolated mobile count sheets for each station role'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setStationLinksModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {[
                {
                  key: 'barman',
                  nameAm: '1) የባርማን ዴሊ ቆጠራ (Barman Station)',
                  nameEn: '1) Barman Daily Beverage Count',
                  descAm: 'ቢራ፣ ወይን፣ አረቄ፣ ለስላሳና ኮክቴል ግብዓቶች',
                  color: 'from-amber-600 to-yellow-600',
                  badge: 'Bar',
                },
                {
                  key: 'juicer',
                  nameAm: '2) የጁሰር ዴሊ ቆጠራ (Fresh Juice Bar)',
                  nameEn: '2) Juicer Fresh Fruit & Dairy Count',
                  descAm: 'አቮካዶ፣ ማንጎ፣ ፓፓያ፣ ብርቱካን፣ ወተት፣ ስኳር',
                  color: 'from-emerald-600 to-teal-600',
                  badge: 'Juice',
                },
                {
                  key: 'cashier',
                  nameAm: '3) የካሸር ሽያጭና ርክክብ (Cashier / POS Station)',
                  nameEn: '3) Cashier POS & Cash Reconciliation',
                  descAm: 'የPOS ሽያጭ፣ የጥሬ ገንዘብ ሣጥን፣ ቴሌብር፣ ሲቢኢ ብርና ቮይድ',
                  color: 'from-rose-600 to-pink-600',
                  badge: 'Cashier',
                },
                {
                  key: 'storekeeper',
                  nameAm: '4) የስቶር ኪፐር ገቢና ወጪ (Store & Receiving)',
                  nameEn: '4) Storekeeper Receiving & Stock Issuance',
                  descAm: 'የሴንትራል ስቶር ገቢ (GRN)፣ ወጪ (SIV) እና ቀሪ ቆጠራ',
                  color: 'from-blue-600 to-indigo-600',
                  badge: 'Store',
                },
                {
                  key: 'chef',
                  nameAm: '5) የሼፍ ኪችን ኦርደርና ጥሬ ዕቃ (Kitchen KOT)',
                  nameEn: '5) Chef Kitchen KOT & Food Production',
                  descAm: 'ኪችን ኦርደር (KOT)፣ ስጋ፣ ዶሮ፣ ፓስታና የቅመማ ቅመም ቆጠራ',
                  color: 'from-purple-600 to-violet-600',
                  badge: 'Kitchen',
                },
              ].map((st) => {
                const isCopied = copiedStationKey === st.key;
                return (
                  <div
                    key={st.key}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded bg-gradient-to-r ${st.color} text-white`}>
                          {st.badge}
                        </span>
                        <h4 className="font-bold text-white text-xs sm:text-sm">
                          {language === 'am' ? st.nameAm : st.nameEn}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 pl-1">
                        {st.descAm}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyStationUrl(st.key)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{isCopied ? (language === 'am' ? 'ተቀድቷል!' : 'Copied!') : (language === 'am' ? 'ሊንክ ኮፒ' : 'Copy Link')}</span>
                      </button>

                      <a
                        href={`/?portal=${st.key}&branch=br-frasco-bello`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition"
                      >
                        {language === 'am' ? 'ክፈት ↗' : 'Open ↗'}
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setStationLinksModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
              >
                {language === 'am' ? 'ዝጋ' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

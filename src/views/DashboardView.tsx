import React from 'react';
import {
  Warehouse,
  GitBranch,
  AlertTriangle,
  TrendingUp,
  Scale,
  PlusCircle,
  ArrowRightLeft,
  Calendar,
  ChefHat,
  ChevronRight,
  ShieldCheck,
  Building2,
  PackagePlus,
  Sparkles,
  Layers,
  ArrowUpRight,
  CheckCircle2,
  Database,
  Users,
  FileText,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { ActiveTab } from '../components/layout/Navbar';
import { formatEthiopianDate, getTodayDateString } from '../utils/ethiopianDate';

interface DashboardViewProps {
  setActiveTab: (tab: ActiveTab) => void;
  onOpenStockIn: () => void;
  onOpenTransfer: () => void;
  onOpenNewBranch: () => void;
  onOpenNewItem: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  setActiveTab,
  onOpenStockIn,
  onOpenTransfer,
  onOpenNewBranch,
  onOpenNewItem,
}) => {
  const {
    items,
    branches,
    centralBinCards,
    branchLedgers,
    reconciliations,
    getBranchStockBalance,
    centralSentToEntries,
    branchDailyModules,
  } = useApp();
  const { language, t, formatCurrency } = useLanguage();
  const todayStr = getTodayDateString();

  // Central Store Total Value (ETB)
  const centralStoreTotalVal = items.reduce(
    (sum, item) => sum + (item.currentCentralStock || 0) * (item.weightedAvgCost || 0),
    0
  );

  // Total Branches Inventory Value (ETB)
  let totalBranchesVal = 0;
  branches.forEach((br) => {
    items.forEach((it) => {
      const bal = getBranchStockBalance(br.id, it.id);
      totalBranchesVal += bal * (it.weightedAvgCost || 0);
    });
  });

  // Low stock items in central store
  const lowStockItems = items.filter((it) => (it.currentCentralStock || 0) <= (it.minStockLevel || 0));

  // Today's reconciliations
  const todayReconciliations = reconciliations.filter((r) => r.date === todayStr);

  const isFreshStart = items.length === 0 && branches.length === 0;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Ultra-Luxury Hero Card with Glassmorphic Obsidian & Gold Gradient */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/40 p-6 sm:p-8 text-white shadow-2xl border border-amber-500/30">
        {/* Subtle decorative gold glow orbs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-bold tracking-wide backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>🇪🇹 {formatEthiopianDate(todayStr, language)}</span>
              <span className="text-amber-500/60">•</span>
              <span className="text-amber-200">{language === 'am' ? 'ንጹህ የንግድ አስተዳደር' : 'Enterprise ERP Suite'}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
                {t.appName}
              </span>
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              {language === 'am'
                ? 'የማዕከላዊ ስቶር ቢን ካርድ፣ የቅርንጫፎች ራሳቸውን የቻሉ ሌጀሮች፣ የገበያ ዋጋ መዋዠቅ እና ስማርት የሪሲፒ ሪኮንሲሌሽን ፎርሙላዎች ዝግጁ ሆነዋል።'
                : 'Central Store Master Bin Cards, Independent Branch Ledgers, Market Price Volatility & Smart Recipe Reconciliation formulas ready.'}
            </p>
          </div>

          {/* Luxury Executive Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onOpenNewItem}
              className="relative group overflow-hidden px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-amber-200 bg-slate-900/90 border border-amber-500/40 shadow-lg hover:bg-slate-850 hover:border-amber-400 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            >
              <span className="flex items-center gap-2">
                <PackagePlus className="w-4 h-4 text-amber-400" />
                <span>{language === 'am' ? '+ ጥሬ ዕቃ መዝግብ' : '+ Add Item'}</span>
              </span>
            </button>

            <button
              onClick={onOpenStockIn}
              className="relative group overflow-hidden px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 shadow-xl shadow-emerald-950/60 hover:shadow-emerald-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 ring-1 ring-emerald-400/40"
            >
              <span className="flex items-center gap-2">
                <PlusCircle className="w-4 h-4" />
                <span>{t.dashboard.stockInBtn}</span>
              </span>
            </button>

            <button
              onClick={onOpenTransfer}
              className="relative group overflow-hidden px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 shadow-xl shadow-blue-950/60 hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 ring-1 ring-blue-400/40"
            >
              <span className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4" />
                <span>{t.dashboard.transferBtn}</span>
              </span>
            </button>

            <button
              onClick={() => setActiveTab('reconciliation')}
              className="relative group overflow-hidden px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 shadow-xl shadow-amber-950/60 hover:shadow-amber-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 ring-1 ring-amber-300/60"
            >
              <span className="flex items-center gap-2">
                <Scale className="w-4 h-4" />
                <span>{t.dashboard.reconcileBtn}</span>
              </span>
            </button>

            <button
              onClick={() => setActiveTab('dataVault')}
              className="relative group overflow-hidden px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-amber-300 bg-slate-900 border border-amber-500/50 hover:bg-slate-850 hover:border-amber-400 transition-all"
            >
              <span className="flex items-center gap-1.5">
                <Database className="w-4 h-4 text-amber-400" />
                <span>{language === 'am' ? 'ዳታ ስቶሬጅ' : 'Vault'}</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Fresh Clean Slate Onboarding Hub (When arrays are empty) */}
      {isFreshStart && (
        <div className="bg-slate-900/80 rounded-3xl border border-amber-500/30 p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-950/80 text-amber-400 border border-amber-400/40">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white">
                {language === 'am' ? 'እንኳን ደህና መጡ! ሲስተሙ ባዶ ሆኖ ለአዲሱ ስራ ተዘጋጅቷል' : 'Welcome! Clean Slate Ready for Your Custom Data'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {language === 'am'
                  ? 'የተሞሉ የናሙና ዳታዎች በሙሉ ተወግደዋል። ከታች ያሉትን ደረጃዎች በመከተል የራስዎን ቅርንጫፎች፣ ጥሬ ዕቃዎች እና ሪሴፒዎች ያስገቡ፦'
                  : 'All sample data has been completely wiped. Use the luxury setup steps below to enter your real business data:'}
              </p>
            </div>
          </div>

          {/* 5 Luxury Setup Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Step 1: Add Branch */}
            <div
              onClick={onOpenNewBranch}
              className="group p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-slate-900/90 hover:border-amber-400 hover:shadow-xl hover:shadow-amber-500/10 cursor-pointer transition-all duration-200 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-purple-950 text-purple-300 font-bold border border-purple-800/40">
                  <Building2 className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">ደረጃ 1 / Step 1</span>
              </div>
              <h3 className="font-bold text-sm text-white group-hover:text-amber-400 transition-colors">
                {language === 'am' ? 'ቅርንጫፍ ይመዝግቡ' : 'Register Branches'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {language === 'am'
                  ? 'ቦሌ፣ ፒያሳ ወይም ሌሎች ቅርንጫፎችዎን ራሳቸውን የቻለ ሌጀር እንዲኖራቸው ይመዝግቡ።'
                  : 'Add your business branches to manage their independent stock ledgers.'}
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 group-hover:translate-x-1 transition-transform">
                {language === 'am' ? '+ አዲስ ቅርንጫፍ ጨምር' : '+ Add Branch'} <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </div>

            {/* Step 2: Add Inventory Items */}
            <div
              onClick={onOpenNewItem}
              className="group p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-slate-900/90 hover:border-amber-400 hover:shadow-xl hover:shadow-amber-500/10 cursor-pointer transition-all duration-200 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-emerald-950 text-emerald-300 font-bold border border-emerald-800/40">
                  <PackagePlus className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">ደረጃ 2 / Step 2</span>
              </div>
              <h3 className="font-bold text-sm text-white group-hover:text-emerald-400 transition-colors">
                {language === 'am' ? 'ጥሬ ዕቃ ይመዝግቡ' : 'Add Raw Materials'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {language === 'am'
                  ? 'ጤፍ፣ ስጋ፣ ሽንኩርት፣ በርበሬ፣ ዘይት እና ቅመማ ቅመሞችን እንደ አዲስ ይመዝግቡ።'
                  : 'Define inventory raw items with units and minimum stock reorder levels.'}
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 group-hover:translate-x-1 transition-transform">
                {language === 'am' ? '+ ጥሬ ዕቃ መዝግብ' : '+ Add Item'} <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </div>

            {/* Step 3: Record Goods Received (GRN) */}
            <div
              onClick={onOpenStockIn}
              className="group p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-slate-900/90 hover:border-amber-400 hover:shadow-xl hover:shadow-amber-500/10 cursor-pointer transition-all duration-200 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-blue-950 text-blue-300 font-bold border border-blue-800/40">
                  <Warehouse className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">ደረጃ 3 / Step 3</span>
              </div>
              <h3 className="font-bold text-sm text-white group-hover:text-blue-400 transition-colors">
                {language === 'am' ? 'የገባ እቃ መዝግብ (GRN)' : 'Stock In Purchases'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {language === 'am'
                  ? 'ገበያ የወጣበትን የአዲሱን ዋጋ እና የቀን ካላንደር በመጠቀም የገቡ እቃዎችን ያስገቡ።'
                  : 'Receive stock into Central Store with date picker and volatile market prices.'}
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-400 group-hover:translate-x-1 transition-transform">
                {language === 'am' ? 'የገባ እቃ አስገባ' : 'Record Stock In'} <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </div>

            {/* Step 4: Add Menu Recipes */}
            <div
              onClick={() => setActiveTab('recipes')}
              className="group p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-slate-900/90 hover:border-amber-400 hover:shadow-xl hover:shadow-amber-500/10 cursor-pointer transition-all duration-200 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-amber-950 text-amber-300 font-bold border border-amber-800/40">
                  <ChefHat className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">ደረጃ 4 / Step 4</span>
              </div>
              <h3 className="font-bold text-sm text-white group-hover:text-amber-400 transition-colors">
                {language === 'am' ? 'ሪሴፒዎችን ያዘጋጁ' : 'Create Custom Recipes'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {language === 'am'
                  ? 'ምግቦች ከስቶር ምን ያህል ጥሬ እቃ እንደሚወስዱ በራስዎ ፎርማት ይወስኑ።'
                  : 'Design custom food menus with ingredient composition for reconciliation.'}
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 group-hover:translate-x-1 transition-transform">
                {language === 'am' ? 'ሪሴፒ ፍጠር' : 'Open Recipes'} <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </div>

            {/* Step 5: Branch Daily Control */}
            <div
              onClick={() => setActiveTab('branchDailyInput')}
              className="group p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-slate-900/90 hover:border-amber-400 hover:shadow-xl hover:shadow-amber-500/15 cursor-pointer transition-all duration-200 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-yellow-950 text-yellow-300 font-bold border border-yellow-800/40">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">ደረጃ 5 / Step 5</span>
              </div>
              <h3 className="font-bold text-sm text-white group-hover:text-amber-400 transition-colors">
                {language === 'am' ? 'ዕለታዊ የብራንች ቁጥጥር' : 'Daily Branch Control'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {language === 'am'
                  ? 'የጠዋት ቆጠራ፣ ከስቶር የገባ፣ የካሸር ሽያጭ፣ የሼፍ ትዕዛዝ እና የማታ ቆጠራን በማቀናነስ የዕለት ልዩነትን ያግኙ።'
                  : 'Morning count, received, POS sales, chef orders, and evening count with live deduction formula.'}
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-yellow-400 group-hover:translate-x-1 transition-transform">
                {language === 'am' ? 'ወደ ዕለታዊ ቁጥጥር' : 'Open Daily Control'} <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Luxury KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Central Store Value */}
        <div className="bg-slate-900/80 p-5 rounded-2xl border border-amber-500/20 hover:border-amber-500/40 shadow-xl backdrop-blur-md space-y-2 transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">{t.dashboard.centralStoreVal}</span>
            <div className="p-2 rounded-xl bg-emerald-950/80 text-emerald-400 font-bold border border-emerald-500/30">
              <Warehouse className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-300">
            {formatCurrency(centralStoreTotalVal)}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
            <span>{items.length} {language === 'am' ? 'የጥሬ ዕቃዎች አይነቶች' : 'Material Items'}</span>
            <button
              onClick={() => setActiveTab('centralStore')}
              className="text-amber-400 hover:text-amber-300 font-bold hover:underline flex items-center gap-0.5"
            >
              {language === 'am' ? 'ዝርዝር እይ' : 'Details'} <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Branches Total Value */}
        <div className="bg-slate-900/80 p-5 rounded-2xl border border-amber-500/20 hover:border-amber-500/40 shadow-xl backdrop-blur-md space-y-2 transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">{t.dashboard.totalBranchVal}</span>
            <div className="p-2 rounded-xl bg-blue-950/80 text-blue-400 font-bold border border-blue-500/30">
              <GitBranch className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">
            {formatCurrency(totalBranchesVal)}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
            <span>{branches.length} {t.dashboard.activeBranches}</span>
            <button
              onClick={() => setActiveTab('branchDailyInput')}
              className="text-amber-400 hover:text-amber-300 font-bold hover:underline flex items-center gap-0.5"
            >
              {language === 'am' ? 'ዕለታዊ ቁጥጥር እይ' : 'Daily Control'} <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-slate-900/80 p-5 rounded-2xl border border-amber-500/20 hover:border-amber-500/40 shadow-xl backdrop-blur-md space-y-2 transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">{t.dashboard.lowStockAlerts}</span>
            <div className="p-2 rounded-xl bg-rose-950/80 text-rose-400 font-bold border border-rose-500/30">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white flex items-center gap-2">
            <span>{lowStockItems.length}</span>
            <span className="text-xs font-normal text-rose-400">
              {lowStockItems.length > 0 ? (language === 'am' ? 'ትኩረት ያስፈልጋቸዋል' : 'Need reordering') : (language === 'am' ? 'ሙሉ ነው' : 'Optimal')}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800 truncate">
            {lowStockItems.length > 0
              ? `${language === 'am' ? 'ለምሳሌ፡' : 'e.g.'} ${language === 'am' ? lowStockItems[0].nameAm : lowStockItems[0].nameEn}`
              : (language === 'am' ? 'ሁሉም ጥሬ እቃዎች በቂ ናቸው' : 'All items sufficiently stocked')}
          </div>
        </div>

        {/* Smart Reconciliation Status */}
        <div className="bg-slate-900/80 p-5 rounded-2xl border border-amber-500/20 hover:border-amber-500/40 shadow-xl backdrop-blur-md space-y-2 transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">{t.dashboard.dailyVariance}</span>
            <div className="p-2 rounded-xl bg-amber-950/80 text-amber-400 font-bold border border-amber-500/30">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-300">
            {todayReconciliations.length > 0
              ? formatCurrency(todayReconciliations[0].totalVarianceCostETB)
              : (language === 'am' ? 'ዝግጁ' : 'Ready')}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
            <span>
              {todayReconciliations.length} {language === 'am' ? 'ዛሬ የተሰሩ ሪኮንሲሌሽኖች' : 'Sessions today'}
            </span>
            <button
              onClick={() => setActiveTab('reconciliation')}
              className="text-amber-400 hover:text-amber-300 font-bold hover:underline flex items-center gap-0.5"
            >
              {language === 'am' ? 'ሪኮንሲል ስራ' : 'Reconcile'} <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Branches Status & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Branches Independent Ledger Status - Left 2 Columns */}
        <div className="lg:col-span-2 bg-slate-900/80 rounded-3xl border border-amber-500/20 p-6 shadow-2xl backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <span>{language === 'am' ? 'የባለቤት የቅርንጫፎች ማጠቃለያ ዳሽቦርድ (Owner Consolidation - Change 5.4)' : 'Owner Consolidated Branch Dashboard'}</span>
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'am'
                  ? '3ቱ ቅርንጫፎች (ፍራስኮ ቤሎ፣ ኮኮናት 6 ኪሎ፣ ኮኮናት ሾላ) ራሳቸውን ችለው የተቆጣጠሩት የዕለት ቆጠራ፣ የተላከ SIV እና የቫሪያንስ ውጤት'
                  : 'Independent daily count, sent-to SIV volume, and reconciliation variance consolidated per branch'}
              </p>
            </div>
            <button
              onClick={() => setActiveTab('branchDailyInput')}
              className="text-xs text-amber-400 hover:text-amber-300 font-bold hover:underline"
            >
              {language === 'am' ? 'ሁሉንም ቅርንጫፎች ክፈት →' : 'Open Branch Modules →'}
            </button>
          </div>

          {branches.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border-2 border-dashed border-slate-800 space-y-3">
              <Building2 className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-xs text-slate-400">
                {language === 'am' ? 'እስካሁን ምንም ቅርንጫፍ አልተመዘገበም።' : 'No branches registered yet.'}
              </p>
              <button
                onClick={onOpenNewBranch}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20"
              >
                + {t.branches.addNewBranch}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {branches.map((br) => {
                let brVal = 0;
                let itemCount = 0;
                items.forEach((it) => {
                  const bal = getBranchStockBalance(br.id, it.id);
                  if (bal > 0) itemCount++;
                  brVal += bal * (it.weightedAvgCost || 0);
                });

                // Today's daily module for this branch
                const todayModule = branchDailyModules.find(
                  (m) => m.branchId === br.id && m.date === todayStr
                );

                // Sent to this branch from Central Store
                const sentToThisBranch = centralSentToEntries.filter(
                  (e) => e.destinationBranchId === br.id
                );
                const totalSentVal = sentToThisBranch.reduce((sum, e) => sum + e.totalValue, 0);

                // Variance in today's module
                let todayNetVariance = 0;
                let hasDiscrepancy = false;
                if (todayModule) {
                  Object.values(todayModule.items).forEach((itemData) => {
                    if (itemData.status === 'shortage') {
                      todayNetVariance -= itemData.varianceValueEtb;
                      hasDiscrepancy = true;
                    } else if (itemData.status === 'overage') {
                      todayNetVariance += itemData.varianceValueEtb;
                      hasDiscrepancy = true;
                    }
                  });
                }

                return (
                  <div
                    key={br.id}
                    onClick={() => setActiveTab('branchDailyInput')}
                    className="p-4 rounded-2xl border border-slate-800 hover:border-amber-400/60 bg-slate-950/60 cursor-pointer transition-all space-y-3 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-white group-hover:text-amber-300 transition-colors">
                        🏢 {language === 'am' ? br.nameAm : br.nameEn}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-300 font-semibold border border-amber-500/20">
                        {br.code}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">
                          {language === 'am' ? 'የቅርንጫፍ ክምችት:' : 'Stock Value:'}
                        </span>
                        <span className="text-sm font-black text-white font-mono">
                          {formatCurrency(brVal)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">
                          {language === 'am' ? 'ከስቶር የተላከ SIV:' : 'Store Dispatches:'}
                        </span>
                        <span className="text-sm font-black text-blue-300 font-mono">
                          {sentToThisBranch.length} SIVs
                        </span>
                      </div>
                    </div>

                    {/* Today's Daily Module Status */}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                      <div>
                        <span className="text-[10px] text-slate-400 block">
                          {language === 'am' ? 'የዛሬ ቆጠራ እና ሪኮንሲሌሽን:' : 'Today Variance:'}
                        </span>
                        {todayModule ? (
                          <span
                            className={`font-black font-mono ${
                              todayNetVariance < 0 ? 'text-rose-400' : todayNetVariance > 0 ? 'text-amber-300' : 'text-emerald-400'
                            }`}
                          >
                            {formatCurrency(todayNetVariance)} ({todayNetVariance < 0 ? 'Shortage' : todayNetVariance > 0 ? 'Overage' : 'Balanced'})
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">
                            {language === 'am' ? 'ያልተዘጋጀ (Pending Count)' : 'Pending Count'}
                          </span>
                        )}
                      </div>

                      <span className="text-amber-400 text-xs font-bold group-hover:translate-x-1 transition-transform">
                        →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick Guidance Card */}
          <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-amber-300">
              <span>💡</span>
              <span>{language === 'am' ? 'የአሰራር መመሪያ (Core Workflow):' : 'Operating Principle:'}</span>
            </div>
            <p className="text-amber-200/90 leading-relaxed text-[11px]">
              {language === 'am'
                ? 'ከማዕከላዊ ስቶር እቃ ሲወጣ ከቢን ካርድ ይቀነሳል፣ ወደ ቅርንጫፉ ሲገባ ግን በቅርንጫፉ ራሱን የቻለ ሌጀር ላይ ይደመራል። ከዚህ በኋላ የሚደረጉ ማናቸውም የምግብ ማብሰያ ወጪዎችና ሽያጮች ከዛው ከቅርንጫፉ ሌጀር ብቻ ነው ሚቀነሱት።'
                : 'Central Store issues reduce the master Bin Card and add to the branch ledger. From then on, daily kitchen usage and menu sales deduct strictly from that branch’s ledger, preserving independent balances.'}
            </p>
          </div>
        </div>

        {/* Right Column: Ethiopian Market Price Volatility Ticker */}
        <div className="bg-slate-900/80 rounded-3xl border border-amber-500/20 p-6 shadow-2xl backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-400" />
              <span>{t.dashboard.priceFluctuationSummary}</span>
            </h2>
            <button
              onClick={() => setActiveTab('centralStore')}
              className="text-xs text-amber-400 hover:text-amber-300 font-bold hover:underline"
            >
              {t.common.viewAll}
            </button>
          </div>

          {items.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              {language === 'am' ? 'እስካሁን ምንም ጥሬ እቃ አልተመዘገበም።' : 'No inventory items registered yet.'}
            </div>
          ) : (
            <div className="space-y-2.5">
              {items.slice(0, 5).map((it) => {
                const diff = (it.lastPurchasePrice || 0) - (it.weightedAvgCost || 0);
                const diffPercent = (it.weightedAvgCost || 0) > 0 ? (diff / it.weightedAvgCost) * 100 : 0;
                return (
                  <div
                    key={it.id}
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <span className="font-bold text-white block">
                        {language === 'am' ? it.nameAm : it.nameEn}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {language === 'am' ? 'አማካይ:' : 'Avg:'} {formatCurrency(it.weightedAvgCost)} / {it.unitAm}
                      </span>
                    </div>
                    <div className="text-right space-y-0.5">
                      <span className="font-black text-amber-300 block">
                        {formatCurrency(it.lastPurchasePrice)}
                      </span>
                      <span
                        className={`text-[10px] font-bold ${
                          diff > 0
                            ? 'text-rose-400'
                            : diff < 0
                            ? 'text-emerald-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {diff > 0 ? `+${diffPercent.toFixed(1)}%` : diff < 0 ? `${diffPercent.toFixed(1)}%` : '0%'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <button
            onClick={onOpenStockIn}
            className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-amber-500/30 hover:border-amber-400 text-amber-300 text-xs font-bold text-center transition-all block shadow-sm"
          >
            {language === 'am' ? '+ አዲስ የገበያ ዋጋ አስገባ (GRN)' : '+ Log New Market Price (GRN)'}
          </button>
        </div>
      </div>
    </div>
  );
};

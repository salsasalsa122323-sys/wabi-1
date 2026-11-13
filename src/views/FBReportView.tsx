import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Scale,
  Calendar,
  Building2,
  Download,
  Printer,
  Search,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  ChefHat,
  Receipt,
  UtensilsCrossed,
  Layers,
  FileSpreadsheet,
  HelpCircle,
  Sparkles,
  Info,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { DatePickerField } from '../components/common/DatePickerField';
import { getTodayDateString, formatEthiopianDate } from '../utils/ethiopianDate';
import { exportToCSV } from '../utils/persistentStorage';

export const FBReportView: React.FC = () => {
  const {
    branches,
    items,
    recipes,
    reconciliations,
    branchLedgers,
  } = useApp();
  const { language, formatCurrency } = useLanguage();

  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [searchItem, setSearchItem] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'shortage' | 'excess' | 'balanced'>('all');

  // Filter reconciliations based on branch and date
  const filteredSessions = useMemo(() => {
    return reconciliations.filter((s) => {
      const matchBranch = selectedBranchId === 'all' || s.branchId === selectedBranchId;
      const matchDate = !selectedDate || s.date === selectedDate;
      return matchBranch && matchDate;
    });
  }, [reconciliations, selectedBranchId, selectedDate]);

  // Aggregate items from sessions
  const aggregatedItems = useMemo(() => {
    const itemMap: Record<
      string,
      {
        itemId: string;
        itemNameAm: string;
        itemNameEn: string;
        unitAm: string;
        unitCost: number;
        beginningTotal: number;
        transfersTotal: number;
        endingTotal: number;
        actualTotal: number;
        theoreticalTotal: number;
        varianceTotal: number;
        financialImpactTotal: number;
        status: 'balanced' | 'shortage' | 'excess' | 'critical';
      }
    > = {};

    filteredSessions.forEach((sess) => {
      sess.details.forEach((d) => {
        if (!itemMap[d.itemId]) {
          itemMap[d.itemId] = {
            itemId: d.itemId,
            itemNameAm: d.itemNameAm,
            itemNameEn: d.itemNameEn,
            unitAm: d.unitAm,
            unitCost: d.unitCost,
            beginningTotal: 0,
            transfersTotal: 0,
            endingTotal: 0,
            actualTotal: 0,
            theoreticalTotal: 0,
            varianceTotal: 0,
            financialImpactTotal: 0,
            status: 'balanced',
          };
        }

        const entry = itemMap[d.itemId];
        entry.beginningTotal += d.beginningStock || 0;
        entry.transfersTotal += d.transfersIn || 0;
        entry.endingTotal += d.endingStock || 0;
        entry.actualTotal += d.physicalActualUsed || 0;
        entry.theoreticalTotal += d.theoreticalRequired || 0;
        entry.varianceTotal += d.variance || 0;
        entry.financialImpactTotal += d.financialImpactETB || 0;
      });
    });

    return Object.values(itemMap).map((it) => {
      it.actualTotal = Number(it.actualTotal.toFixed(3));
      it.theoreticalTotal = Number(it.theoreticalTotal.toFixed(3));
      it.varianceTotal = Number(it.varianceTotal.toFixed(3));
      it.financialImpactTotal = Number(it.financialImpactTotal.toFixed(2));

      if (it.varianceTotal > 0.005) {
        it.status = 'shortage';
      } else if (it.varianceTotal < -0.005) {
        it.status = 'excess';
      } else {
        it.status = 'balanced';
      }
      return it;
    });
  }, [filteredSessions]);

  // Executive Totals
  const totalRevenue = useMemo(() => {
    return filteredSessions.reduce((sum, s) => sum + (s.totalCashRevenueETB || 0), 0);
  }, [filteredSessions]);

  const totalTheoreticalCost = useMemo(() => {
    return aggregatedItems.reduce((sum, it) => sum + (it.theoreticalTotal * it.unitCost), 0);
  }, [aggregatedItems]);

  const totalActualCost = useMemo(() => {
    return aggregatedItems.reduce((sum, it) => sum + (it.actualTotal * it.unitCost), 0);
  }, [aggregatedItems]);

  const totalVarianceCost = useMemo(() => {
    return aggregatedItems.reduce((sum, it) => sum + it.financialImpactTotal, 0);
  }, [aggregatedItems]);

  const totalManagementValue = useMemo(() => {
    return filteredSessions.reduce((sum, s) => sum + (s.totalManagementCostETB || 0), 0);
  }, [filteredSessions]);

  // Actual Food Cost %: (Actual Ingredients Cost / Total Revenue) * 100
  const actualFoodCostPercent = totalRevenue > 0
    ? Number(((totalActualCost / totalRevenue) * 100).toFixed(1))
    : 0;

  // Theoretical Food Cost %: (Theoretical Cost / Total Revenue) * 100
  const theoreticalFoodCostPercent = totalRevenue > 0
    ? Number(((totalTheoreticalCost / totalRevenue) * 100).toFixed(1))
    : 0;

  // Filter items by search and status
  const displayedItems = aggregatedItems.filter((it) => {
    const q = searchItem.toLowerCase().trim();
    const matchSearch = !q || it.itemNameAm.toLowerCase().includes(q) || it.itemNameEn.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || it.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const exportReportCSV = () => {
    const headers = [
      'Item Name (Amharic)',
      'Item Name (English)',
      'Unit',
      'Beginning Inventory',
      'Transfers Received',
      'Ending Count',
      'Actual Consumption',
      'Theoretical Requirement',
      'Variance (Short / Over)',
      'Unit Cost (ETB)',
      'Financial Impact (ETB)',
      'F&B Audit Status',
    ];

    const rows = displayedItems.map((d) => [
      `"${d.itemNameAm}"`,
      `"${d.itemNameEn}"`,
      d.unitAm,
      d.beginningTotal,
      d.transfersTotal,
      d.endingTotal,
      d.actualTotal,
      d.theoreticalTotal,
      d.varianceTotal,
      d.unitCost,
      d.financialImpactTotal,
      d.status,
    ]);

    exportToCSV(`FB_Control_Audit_${selectedDate}_${selectedBranchId}.csv`, headers, rows);
  };

  return (
    <div className="space-y-6 animate-fadeIn text-slate-100">
      {/* Luxury Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900 border border-amber-500/30 shadow-2xl relative overflow-hidden">
        <div className="space-y-1.5 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold shadow-sm">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>F&B Food & Beverage Cost Control Suite</span>
            <span>•</span>
            <span className="text-emerald-400">የምግብ ወጪ ቁጥጥርና የሰራተኞች ፍትሃዊ ጥበቃ</span>
          </div>

          <h1 className="text-xl sm:text-3xl font-black text-white flex items-center gap-3">
            <Scale className="w-8 h-8 text-amber-400" />
            <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
              {language === 'am' ? 'ፕሮፌሽናል የኤፍ ኤንድ ቢ (F&B) የቁጥጥር እና ሪፖርቲንግ ማዕከል' : 'Professional Restaurant F&B Control & Audit Suite'}
            </span>
          </h1>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            {language === 'am'
              ? 'የእያንዳንዱን ቅርንጫፍ ትክክለኛ የምግብ ወጪ ፐርሰንቴጅ (Food Cost %)، የጥሬ ዕቃዎች ሾርትና ኦቨር እና ያለአግባብ ሰራተኞች እንዳይከሰሱ የተጠያቂነት ማረጋገጫ ሪፖርት።'
              : 'Enterprise Food Cost % monitoring, item-by-item variance, and fair staff accountability audit.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 relative z-10 shrink-0">
          <button
            onClick={exportReportCSV}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-950 text-amber-300 hover:bg-slate-800 border border-amber-500/30 flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>CSV {language === 'am' ? 'አውርድ' : 'Export'}</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 text-slate-950 font-black shadow-lg shadow-amber-500/20 flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>{language === 'am' ? 'ሪፖርት አትም (Print)' : 'Print'}</span>
          </button>
        </div>
      </div>

      {/* Filter Bar: Branch, Date & Search */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/20 flex flex-wrap items-center justify-between gap-4">
        {/* Branch Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="text-xs font-bold text-amber-400 flex items-center gap-1 shrink-0 mr-1">
            <Building2 className="w-4 h-4" />
            <span>{language === 'am' ? 'ቅርንጫፍ:' : 'Branch:'}</span>
          </span>
          <button
            onClick={() => setSelectedBranchId('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedBranchId === 'all'
                ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {language === 'am' ? 'ሁሉም ቅርንጫፎች (All)' : 'All Branches'}
          </button>
          {branches.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelectedBranchId(b.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedBranchId === b.id
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {language === 'am' ? b.nameAm : b.nameEn}
            </button>
          ))}
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2">
          <div className="w-44">
            <DatePickerField value={selectedDate} onChange={setSelectedDate} />
          </div>
        </div>
      </div>

      {/* Executive F&B KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Actual Food Cost % */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-amber-500/30 shadow-xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>{language === 'am' ? 'የምግብ ወጪ % (Actual Food Cost)' : 'Actual Food Cost %'}</span>
            <UtensilsCrossed className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl sm:text-3xl font-black font-mono ${
              actualFoodCostPercent > 35
                ? 'text-rose-400'
                : actualFoodCostPercent >= 28
                ? 'text-emerald-400'
                : 'text-amber-300'
            }`}>
              {actualFoodCostPercent}%
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              (ሪሲፒ: {theoreticalFoodCostPercent}%)
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            {actualFoodCostPercent > 35 ? (
              <span className="text-rose-400 font-bold">⚠️ ከስታንዳርድ (35%) በላይ ሆኗል</span>
            ) : (
              <span className="text-emerald-400 font-bold">✅ በአለም አቀፍ ስታንዳርድ ውስጥ ነው</span>
            )}
          </p>
        </div>

        {/* Metric 2: Total Food Revenue */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-amber-500/30 shadow-xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>{language === 'am' ? 'ጠቅላላ የምግብ ሽያጭ ገቢ' : 'Total Food Revenue'}</span>
            <Receipt className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
            {formatCurrency(totalRevenue)}
          </div>
          <p className="text-[11px] text-slate-400">
            {language === 'am' ? 'በካሽ ሪጅስተር ማሽን የተመዘገበ' : 'Billed from cash register'}
          </p>
        </div>

        {/* Metric 3: Total Food Cost Value */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-amber-500/30 shadow-xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>{language === 'am' ? 'የወጣው ጥሬ ዕቃ ወጪ' : 'Total Food Cost'}</span>
            <DollarSign className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono">
            {formatCurrency(totalActualCost)}
          </div>
          <p className="text-[11px] text-slate-400">
            {language === 'am' ? 'በእጅ ያለቀው የጥሬ ዕቃዎች ወጪ' : 'Actual consumed materials cost'}
          </p>
        </div>

        {/* Metric 4: Net Variance (Short / Over) */}
        <div className={`p-5 rounded-2xl bg-slate-900 border shadow-xl space-y-1 ${
          totalVarianceCost > 0
            ? 'border-rose-500/50 bg-rose-950/20'
            : totalVarianceCost < 0
            ? 'border-emerald-500/50 bg-emerald-950/20'
            : 'border-amber-500/30'
        }`}>
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>{language === 'am' ? 'ጠቅላላ ሾርት / ኦቨር (ልዩነት)' : 'Net Stock Variance'}</span>
            <Scale className="w-4 h-4 text-amber-400" />
          </div>
          <div className={`text-2xl sm:text-3xl font-black font-mono ${
            totalVarianceCost > 0 ? 'text-rose-400' : totalVarianceCost < 0 ? 'text-emerald-400' : 'text-white'
          }`}>
            {totalVarianceCost > 0 ? `-${formatCurrency(totalVarianceCost)}` : totalVarianceCost < 0 ? `+${formatCurrency(Math.abs(totalVarianceCost))}` : formatCurrency(0)}
          </div>
          <p className="text-[11px] font-bold">
            {totalVarianceCost > 0 ? (
              <span className="text-rose-400">⚠️ ጉድለት/ኪሳራ (Shortage Gap)</span>
            ) : totalVarianceCost < 0 ? (
              <span className="text-emerald-400">✨ የተቆጠበ ትርፍ (Cost Savings)</span>
            ) : (
              <span className="text-slate-400">ተመጣጣኝ (Balanced)</span>
            )}
          </p>
        </div>
      </div>

      {/* Staff Protection & Variance Root-Cause Decomposition */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-amber-500/30 shadow-2xl space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="text-sm sm:text-base font-black text-amber-300">
              {language === 'am' ? 'የሰራተኞች ፍትሃዊ ጥበቃ እና የተጠያቂነት መለያ ማዕከል (Fair Staff Accountability Guard)' : 'Staff Accountability & Root Cause Isolation'}
            </h3>
            <p className="text-xs text-slate-400">
              {language === 'am'
                ? 'ሰራተኞች ያለአግባብ እንዳይከሰሱ እና እንዳይከፍሉ ልዩነቱ የተፈጠረበትን ትክክለኛ ምክንያት ይለያል'
                : 'Protects staff from unfair penalties by isolating exact discrepancy channels'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="font-bold text-amber-400 block">1. የካሽ ሪጅስተር ክፍተት</span>
            <p className="text-slate-400 text-[11px]">
              ኩሽና ምግብ አብስሎ ያወጣ ሲሆን ካሸሩ ጋር በደረሰኝ ያልተመዘገበ ክፍተት ካለ → ተጠያቂነቱ የካሽ ወይም የአስተናጋጅ ነው።
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="font-bold text-sky-400 block">2. የሼፎች አበሳሰል / ፖርሽን</span>
            <p className="text-slate-400 text-[11px]">
              በሪሲፒው ከተፈቀደው ግራም በላይ ስጋ ወይም ቅቤ ማባከን → የኩሽና ቁጥጥርና ፖርሽን ሚዛን ማስተካከል ይጠይቃል።
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="font-bold text-blue-400 block">3. የማኔጅመንት ምግብ ({formatCurrency(totalManagementValue)})</span>
            <p className="text-slate-400 text-[11px]">
              በማኔጅመንትና እንግዶች የተፈረመበት ምግብ → የድርጅቱ ወጪ እንጂ በሰራተኞች ላይ የሚቆጠር ጉድለት አይደለም!
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="font-bold text-teal-400 block">4. የስቶር ብልሽት / ስርቆት</span>
            <p className="text-slate-400 text-[11px]">
              በማታ ኢንዲንግ ቆጠራ ወቅት የሚገኝ አካላዊ ጉድለት → የጥሬ ዕቃዎች ማከማቻ ፍተሻና የካሜራ ክትትል ያስፈልገዋል።
            </p>
          </div>
        </div>
      </div>

      {/* Item-by-Item Deep Audit Explorer Table */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-amber-500/30 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              <span>{language === 'am' ? 'በእያንዳንዱ ጥሬ ዕቃ ዝርዝር የቁጥጥር ሰንጠረዥ' : 'Item-by-Item F&B Variance Audit'}</span>
            </h3>
            <p className="text-xs text-slate-400">
              {displayedItems.length} {language === 'am' ? 'የተተነተኑ ጥሬ ዕቃዎች' : 'audited items'}
            </p>
          </div>

          {/* Search & Status Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative w-48 sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder={language === 'am' ? 'ጥሬ ዕቃ ይፈልጉ...' : 'Search item...'}
                value={searchItem}
                onChange={(e) => setSearchItem(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex items-center bg-slate-950 rounded-xl p-0.5 border border-slate-800 text-[11px]">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  statusFilter === 'all' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                {language === 'am' ? 'ሁሉም' : 'All'}
              </button>
              <button
                onClick={() => setStatusFilter('shortage')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  statusFilter === 'shortage' ? 'bg-rose-500 text-white' : 'text-rose-400 hover:text-white'
                }`}
              >
                🔴 {language === 'am' ? 'ሾርት' : 'Shortage'}
              </button>
              <button
                onClick={() => setStatusFilter('excess')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  statusFilter === 'excess' ? 'bg-emerald-500 text-slate-950' : 'text-emerald-400 hover:text-white'
                }`}
              >
                🟢 {language === 'am' ? 'ኦቨር' : 'Over'}
              </button>
            </div>
          </div>
        </div>

        {displayedItems.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-950 rounded-2xl border border-dashed border-slate-800">
            {language === 'am'
              ? 'ለተመረጠው ቀን ወይም ቅርንጫፍ የተመዘገበ ሪኮንሲሌሽን አልተገኘም። በ"ስማርት ሪኮንሲሌሽን" ገጽ ላይ የዛሬውን ስራ አጽድቀው ያስገቡ።'
              : 'No reconciliation data found for this selection. Please perform reconciliation first.'}
          </div>
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px] font-bold uppercase tracking-wider bg-slate-950/60">
                  <th className="py-2.5 px-3">{language === 'am' ? 'ጥሬ ዕቃ' : 'Material'}</th>
                  <th className="py-2.5 px-3 text-center">{language === 'am' ? 'መለኪያ' : 'Unit'}</th>
                  <th className="py-2.5 px-3 text-center text-amber-400">{language === 'am' ? 'ቢግኒንግ' : 'Beg'}</th>
                  <th className="py-2.5 px-3 text-center text-blue-400">{language === 'am' ? 'የገባ' : 'In'}</th>
                  <th className="py-2.5 px-3 text-center text-teal-400">{language === 'am' ? 'ኢንዲንግ' : 'Ending'}</th>
                  <th className="py-2.5 px-3 text-center text-white">{language === 'am' ? 'በእጅ ያለቀው' : 'Actual'}</th>
                  <th className="py-2.5 px-3 text-center text-amber-300">{language === 'am' ? 'በሪሲፒው' : 'Recipe'}</th>
                  <th className="py-2.5 px-3 text-center">{language === 'am' ? 'ልዩነት (Short/Over)' : 'Variance'}</th>
                  <th className="py-2.5 px-3 text-right">{language === 'am' ? 'የገንዘብ ተጽእኖ' : 'Cost Impact'}</th>
                  <th className="py-2.5 px-3 text-center">{language === 'am' ? 'ሁኔታ' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {displayedItems.map((it) => {
                  const isShortage = it.status === 'shortage';
                  const isExcess = it.status === 'excess';

                  return (
                    <tr
                      key={it.itemId}
                      className={`hover:bg-slate-950/50 transition-colors ${
                        isShortage ? 'bg-rose-950/15' : isExcess ? 'bg-emerald-950/15' : ''
                      }`}
                    >
                      <td className="py-3 px-3 font-bold text-white">
                        <div>{it.itemNameAm}</div>
                        <div className="text-[10px] text-slate-500 font-normal">{it.itemNameEn}</div>
                      </td>

                      <td className="py-3 px-3 text-center text-slate-400 font-bold">
                        {it.unitAm}
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-bold text-amber-300">
                        {it.beginningTotal}
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-bold text-blue-400">
                        +{it.transfersTotal}
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-bold text-teal-300">
                        {it.endingTotal}
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-black text-white bg-slate-950/60 rounded-xl">
                        {it.actualTotal}
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-black text-amber-300">
                        {it.theoreticalTotal}
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-black">
                        <span className={isShortage ? 'text-rose-400' : isExcess ? 'text-emerald-400' : 'text-slate-400'}>
                          {it.varianceTotal > 0 ? `+${it.varianceTotal}` : it.varianceTotal} {it.unitAm}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-black">
                        <span className={isShortage ? 'text-rose-400' : isExcess ? 'text-emerald-400' : 'text-slate-400'}>
                          {it.financialImpactTotal > 0
                            ? `-${formatCurrency(it.financialImpactTotal)}`
                            : it.financialImpactTotal < 0
                            ? `+${formatCurrency(Math.abs(it.financialImpactTotal))}`
                            : formatCurrency(0)}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        {isShortage ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                            ጉድለት (Short)
                          </span>
                        ) : isExcess ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                            ትርፍ (Over)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold">
                            ተመጣጣኝ
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Printable Official Signature Certification Blocks */}
        <div className="pt-8 mt-6 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-slate-400">
          <div className="border-t border-dashed border-slate-700 pt-3 space-y-1">
            <span className="font-bold text-white block">ያዘጋጀው (F&B Controller):</span>
            <div className="h-6"></div>
            <span className="text-[11px] text-slate-500">ፊርማ እና ቀን ____________________</span>
          </div>

          <div className="border-t border-dashed border-slate-700 pt-3 space-y-1">
            <span className="font-bold text-white block">የተረጋገጠው (Head Chef):</span>
            <div className="h-6"></div>
            <span className="text-[11px] text-slate-500">ፊርማ እና ቀን ____________________</span>
          </div>

          <div className="border-t border-dashed border-slate-700 pt-3 space-y-1">
            <span className="font-bold text-white block">የጸደቀው (General Manager):</span>
            <div className="h-6"></div>
            <span className="text-[11px] text-slate-500">ፊርማ እና ቀን ____________________</span>
          </div>
        </div>
      </div>
    </div>
  );
};

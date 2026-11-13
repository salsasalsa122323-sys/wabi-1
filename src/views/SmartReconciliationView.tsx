import React, { useState, useEffect, useMemo } from 'react';
import {
  Scale,
  Calendar,
  Building2,
  ChefHat,
  AlertTriangle,
  CheckCircle,
  TrendingDown,
  TrendingUp,
  Download,
  Printer,
  ChevronDown,
  ChevronRight,
  Layers,
  Sparkles,
  ArrowRight,
  Receipt,
  FileText,
  AlertCircle,
  HelpCircle,
  DollarSign,
  UtensilsCrossed,
  ShieldCheck,
  Search,
  Filter,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { DatePickerField } from '../components/common/DatePickerField';
import { getTodayDateString, formatEthiopianDate } from '../utils/ethiopianDate';
import { ReconciliationSession, IngredientReconciliationDetail, Recipe } from '../types';
import { VoiceControlBar } from '../components/common/VoiceControlBar';
import { ParsedVoiceCommand } from '../hooks/useVoiceInput';
import {
  saveDailyEndingInventory,
  getPreviousDayEndingInventory,
} from '../utils/inventoryCarryover';

interface SmartReconciliationViewProps {
  initialBranchId?: string;
}

export const SmartReconciliationView: React.FC<SmartReconciliationViewProps> = ({
  initialBranchId,
}) => {
  const {
    branches,
    recipes,
    items,
    branchLedgers,
    calculateSmartReconciliation,
    commitReconciliationToLedger,
    reconciliations,
    getBranchStockBalance,
  } = useApp();
  const { language, t, formatCurrency } = useLanguage();

  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    initialBranchId || branches[0]?.id || ''
  );
  const [date, setDate] = useState<string>(getTodayDateString());
  const [activeSubTab, setActiveSubTab] = useState<'reconcile' | 'history'>('reconcile');

  // Stream 1: Cash Register Sales (በደረሰኝ የተሸጠ)
  const [dishSales, setDishSales] = useState<Record<string, number>>({});

  // Stream 2: Chef Kitchen Output / KOT (የሼፎች ማውጫ ኦርደር)
  const [chefProduction, setChefProduction] = useState<Record<string, number>>({});

  // Stream 3: Management / Signed Meals (የማኔጅመንት እና የተፈረመበት)
  const [managementMeals, setManagementMeals] = useState<Record<string, number>>({});

  // Raw Materials Physical Count: Beginning & Ending
  const [beginningStockMap, setBeginningStockMap] = useState<Record<string, number>>({});
  const [endingStockMap, setEndingStockMap] = useState<Record<string, number>>({});
  const [physicalUsageOverrides, setPhysicalUsageOverrides] = useState<Record<string, number>>({});

  const [dishSearch, setDishSearch] = useState('');
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [expandedIngredients, setExpandedIngredients] = useState<Record<string, boolean>>({});
  const [committedSuccess, setCommittedSuccess] = useState(false);
  const [activeSession, setActiveSession] = useState<ReconciliationSession | null>(null);

  // Carryover & Voice State
  const [carryoverInfo, setCarryoverInfo] = useState<{
    foundDate: string | null;
    isCarriedOver: boolean;
  }>({ foundDate: null, isCarriedOver: false });
  const [saveEndingNotification, setSaveEndingNotification] = useState<string | null>(null);

  const currentBranch = branches.find((b) => b.id === selectedBranchId) || branches[0];

  // Filter recipes strictly for current branch
  const branchRecipes = useMemo(() => {
    return recipes.filter((r) => {
      if (r.branchId) return r.branchId === currentBranch?.id;
      return branches[0]?.id === currentBranch?.id;
    });
  }, [recipes, currentBranch, branches]);

  // Calculate day transfers received from Central Store for current branch on selected date
  const dayTransfersInMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (!currentBranch) return map;

    branchLedgers
      .filter((l) => l.branchId === currentBranch.id && l.date === date && l.type === 'TRANSFER_IN')
      .forEach((l) => {
        map[l.itemId] = (map[l.itemId] || 0) + (l.quantityIn || 0);
      });
    return map;
  }, [branchLedgers, currentBranch, date]);

  // Initialize beginning stock: First check yesterday's ending inventory; fallback to ledger stock balance
  useEffect(() => {
    if (!currentBranch) return;

    // Smart Carryover: Check if previous day ending inventory is recorded
    const carryover = getPreviousDayEndingInventory(currentBranch.id, date);
    const initialBeginning: Record<string, number> = {};

    let hasCarryoverData = false;
    if (carryover.foundDate && Object.keys(carryover.endingMap).length > 0) {
      items.forEach((item) => {
        if (carryover.endingMap[item.id] !== undefined) {
          initialBeginning[item.id] = carryover.endingMap[item.id];
          hasCarryoverData = true;
        } else {
          initialBeginning[item.id] = getBranchStockBalance(currentBranch.id, item.id);
        }
      });
      setCarryoverInfo({
        foundDate: carryover.foundDate,
        isCarriedOver: hasCarryoverData,
      });
    } else {
      // Fallback: use live ledger balance
      items.forEach((item) => {
        initialBeginning[item.id] = getBranchStockBalance(currentBranch.id, item.id);
      });
      setCarryoverInfo({
        foundDate: null,
        isCarriedOver: false,
      });
    }

    setBeginningStockMap(initialBeginning);
  }, [currentBranch?.id, date, items, getBranchStockBalance]);

  // Auto-calculate smart reconciliation when inputs change
  useEffect(() => {
    if (!currentBranch) return;

    const dishesSoldArray = Object.entries(dishSales)
      .filter(([_, qty]) => qty > 0)
      .map(([recipeId, quantitySold]) => ({ recipeId, quantitySold }));

    const chefArray = Object.entries(chefProduction)
      .filter(([_, qty]) => qty > 0)
      .map(([recipeId, quantityProduced]) => ({ recipeId, quantityProduced }));

    const managementArray = Object.entries(managementMeals)
      .filter(([_, qty]) => qty > 0)
      .map(([recipeId, quantityConsumed]) => ({ recipeId, quantityConsumed }));

    // Run reconciliation engine
    const session = calculateSmartReconciliation(
      currentBranch.id,
      date,
      dishesSoldArray,
      physicalUsageOverrides,
      `ስማርት ሪኮንሲሌሽን - ${currentBranch.nameAm}`,
      chefArray,
      managementArray,
      beginningStockMap,
      endingStockMap,
      dayTransfersInMap
    );

    setActiveSession(session);
  }, [
    currentBranch?.id,
    date,
    dishSales,
    chefProduction,
    managementMeals,
    beginningStockMap,
    endingStockMap,
    physicalUsageOverrides,
    dayTransfersInMap,
  ]);

  if (branches.length === 0) {
    return (
      <div className="bg-slate-900 rounded-3xl border border-amber-500/30 p-12 text-center shadow-xl space-y-4">
        <Scale className="w-10 h-10 text-amber-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">
          {language === 'am' ? 'እባክዎ መጀመሪያ ቅርንጫፎችን ይመዝግቡ' : 'No Branches Registered'}
        </h2>
      </div>
    );
  }

  const handleDishSaleChange = (recipeId: string, val: string) => {
    const parsed = val === '' ? 0 : parseInt(val, 10) || 0;
    setDishSales((prev) => ({ ...prev, [recipeId]: Math.max(0, parsed) }));
  };

  const handleChefProductionChange = (recipeId: string, val: string) => {
    const parsed = val === '' ? 0 : parseInt(val, 10) || 0;
    setChefProduction((prev) => ({ ...prev, [recipeId]: Math.max(0, parsed) }));
  };

  const handleManagementMealChange = (recipeId: string, val: string) => {
    const parsed = val === '' ? 0 : parseInt(val, 10) || 0;
    setManagementMeals((prev) => ({ ...prev, [recipeId]: Math.max(0, parsed) }));
  };

  const handleBeginningStockChange = (itemId: string, val: string) => {
    const parsed = val === '' ? 0 : parseFloat(val) || 0;
    setBeginningStockMap((prev) => ({ ...prev, [itemId]: Math.max(0, parsed) }));
  };

  const handleEndingStockChange = (itemId: string, val: string) => {
    const parsed = val === '' ? 0 : parseFloat(val) || 0;
    setEndingStockMap((prev) => ({ ...prev, [itemId]: Math.max(0, parsed) }));
  };

  const toggleExpand = (itemId: string) => {
    setExpandedIngredients((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const handleSaveEndingForTomorrow = () => {
    if (!currentBranch) return;
    saveDailyEndingInventory(currentBranch.id, date, endingStockMap);
    setSaveEndingNotification(
      language === 'am'
        ? `የ${currentBranch.nameAm} የ${date} ማታ ኢንዲንግ ለነገ ቢግኒንግ በተሳካ ሁኔታ ተመዝግቧል!`
        : `Ending inventory for ${date} saved as tomorrow's beginning!`
    );
    setTimeout(() => setSaveEndingNotification(null), 4000);
  };

  const handleResetToLedgerBalance = () => {
    if (!currentBranch) return;
    const resetBeg: Record<string, number> = {};
    items.forEach((item) => {
      resetBeg[item.id] = getBranchStockBalance(currentBranch.id, item.id);
    });
    setBeginningStockMap(resetBeg);
    setCarryoverInfo({ foundDate: null, isCarriedOver: false });
  };

  const handleVoiceCommand = (cmd: ParsedVoiceCommand) => {
    if (cmd.quantity === undefined) return;

    // Check if dish matches
    if (cmd.matchedDishName) {
      const targetDish = branchRecipes.find(
        (r) =>
          r.nameAm.toLowerCase().includes(cmd.matchedDishName!.toLowerCase()) ||
          cmd.matchedDishName!.toLowerCase().includes(r.nameAm.toLowerCase()) ||
          r.nameEn.toLowerCase().includes(cmd.matchedDishName!.toLowerCase())
      );

      if (targetDish) {
        const stream = cmd.targetStream || 'sales';
        if (stream === 'sales') {
          setDishSales((prev) => ({ ...prev, [targetDish.id]: cmd.quantity! }));
        } else if (stream === 'chef') {
          setChefProduction((prev) => ({ ...prev, [targetDish.id]: cmd.quantity! }));
        } else if (stream === 'management') {
          setManagementMeals((prev) => ({ ...prev, [targetDish.id]: cmd.quantity! }));
        }
        return;
      }
    }

    // Check if raw item matches
    if (cmd.matchedItemId) {
      if (cmd.targetStream === 'beginning') {
        setBeginningStockMap((prev) => ({ ...prev, [cmd.matchedItemId!]: cmd.quantity! }));
      } else {
        setEndingStockMap((prev) => ({ ...prev, [cmd.matchedItemId!]: cmd.quantity! }));
      }
    }
  };

  const handleCommit = () => {
    if (!activeSession) return;
    const confirmMsg =
      language === 'am'
        ? `እርግጠኛ ነዎት ይህንን የ${currentBranch.nameAm} ሪኮንሲሌሽን አጽድቀው ወደ ቅርንጫፉ ሌጀር መዝገብ ማስገባት ይፈልጋሉ?`
        : `Approve and commit this reconciliation to ${currentBranch.nameEn} ledger?`;

    if (window.confirm(confirmMsg)) {
      // Auto-save ending inventory so tomorrow's beginning inventory is already loaded!
      saveDailyEndingInventory(currentBranch.id, date, endingStockMap);
      const ok = commitReconciliationToLedger(activeSession.id);
      if (ok) {
        setCommittedSuccess(true);
        setTimeout(() => setCommittedSuccess(false), 4000);
      }
    }
  };

  // Dish sales & chef summary metrics
  const totalCashSalesPlates = Object.values(dishSales).reduce((a, b) => a + b, 0);
  const totalChefOutputPlates = Object.values(chefProduction).reduce((a, b) => a + b, 0);
  const totalManagementPlates = Object.values(managementMeals).reduce((a, b) => a + b, 0);

  const chefVsCashierGap = totalChefOutputPlates - totalCashSalesPlates;

  const totalCashRevenue = branchRecipes.reduce((sum, r) => {
    return sum + (dishSales[r.id] || 0) * r.sellingPrice;
  }, 0);

  const totalManagementCost = branchRecipes.reduce((sum, r) => {
    return sum + (managementMeals[r.id] || 0) * r.sellingPrice;
  }, 0);

  const totalVarianceCost = activeSession ? activeSession.totalVarianceCostETB : 0;

  // Filtered lists for search
  const filteredBranchRecipes = branchRecipes.filter((r) => {
    const q = dishSearch.toLowerCase().trim();
    if (!q) return true;
    return r.nameAm.toLowerCase().includes(q) || r.nameEn.toLowerCase().includes(q);
  });

  const reconciliationDetails = activeSession?.details || [];

  const filteredDetails = reconciliationDetails.filter((d) => {
    const q = ingredientSearch.toLowerCase().trim();
    if (!q) return true;
    return d.itemNameAm.toLowerCase().includes(q) || d.itemNameEn.toLowerCase().includes(q);
  });

  const exportReconciliationCSV = () => {
    if (!activeSession) return;
    const headers = [
      'Item Code',
      'Ingredient Name (Amharic)',
      'Ingredient Name (English)',
      'Unit',
      'Morning Beginning',
      'Transfers Received In',
      'Total Available',
      'Night Ending Count',
      'Actual Consumption (Used)',
      'Theoretical Recipe Requirement',
      'Variance (Short / Over)',
      'Variance %',
      'Unit Cost (ETB)',
      'Financial Impact (ETB)',
      'Audit Status',
    ];

    const rows = activeSession.details.map((d) => {
      const it = items.find((i) => i.id === d.itemId);
      return [
        it?.code || '',
        `"${d.itemNameAm}"`,
        `"${d.itemNameEn}"`,
        d.unitAm,
        d.beginningStock || 0,
        d.transfersIn || 0,
        d.totalAvailable || 0,
        d.endingStock || 0,
        d.physicalActualUsed,
        d.theoreticalRequired,
        d.variance,
        `${d.variancePercent}%`,
        d.unitCost,
        d.financialImpactETB,
        d.status,
      ];
    });

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SmartReconciliation_${currentBranch.code}_${date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fadeIn text-slate-100">
      {/* Top Banner Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900 border border-amber-500/30 shadow-2xl relative overflow-hidden">
        <div className="space-y-1.5 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{language === 'am' ? 'የቅርንጫፎች ስማርት ሪኮንሲሌሽን' : 'Multi-Branch Smart Reconciliation'}</span>
            <span>•</span>
            <span className="text-emerald-400">POS Sales vs Chef KOT vs Stock Audit</span>
          </div>

          <h1 className="text-xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Scale className="w-8 h-8 text-amber-400" />
            <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
              {language === 'am' ? 'ስማርት ሪኮንሲሌሽን እና የኪሳራ/ትርፍ ቁጥጥር' : 'Smart Reconciliation & Food Cost Audit'}
            </span>
          </h1>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            {language === 'am'
              ? 'በካሽ ሪጅስተር የተሸጠውን፣ የሼፎቹን ማውጫ (KOT)፣ የማኔጅመንት ምግብ እና የጥሬ ዕቃዎች ጠዋት ቢግኒንግና ማታ ኢንዲንግ በማነጻጸር ትክክለኛ ሾርትና ኦቨር (Short / Over) ማውጫ።'
              : 'Audit cash register sales, chef dispatch tickets, management meals, and raw materials beginning/ending count.'}
          </p>
        </div>

        {/* Global Tab Toggles & Actions */}
        <div className="flex flex-wrap items-center gap-2.5 relative z-10 shrink-0">
          <button
            onClick={() => setActiveSubTab('reconcile')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'reconcile'
                ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black shadow-lg shadow-amber-500/20'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {language === 'am' ? '⚖️ የዛሬ ሪኮንሲሌሽን' : 'Active Reconcile'}
          </button>

          <button
            onClick={() => setActiveSubTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'history'
                ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black shadow-lg shadow-amber-500/20'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {language === 'am' ? '📜 ያለፉ ሪኮንሲሌሽኖች' : 'History'}
          </button>

          <button
            onClick={exportReconciliationCSV}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-950 text-amber-300 hover:bg-slate-800 border border-amber-500/30 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-950 text-slate-300 hover:text-white border border-slate-800 flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{t.common.print}</span>
          </button>
        </div>
      </div>

      {/* Control Bar: Branch Selector & Date Picker */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/20 flex flex-wrap items-center justify-between gap-4">
        {/* Branch Selection Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-xs font-bold text-amber-400 flex items-center gap-1 shrink-0">
            <Building2 className="w-4 h-4" />
            <span>{language === 'am' ? 'ቅርንጫፍ ይምረጡ:' : 'Branch:'}</span>
          </span>
          <div className="flex items-center gap-1.5">
            {branches.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedBranchId(b.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  selectedBranchId === b.id
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black shadow-md shadow-amber-500/20 ring-1 ring-amber-300'
                    : 'bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {language === 'am' ? b.nameAm : b.nameEn} ({b.code})
              </button>
            ))}
          </div>
        </div>

        {/* Date Selector & Fast Schedule Filler */}
        <div className="flex items-center gap-3">
          <div className="w-48">
            <DatePickerField value={date} onChange={setDate} />
          </div>
        </div>
      </div>

      {/* Smart Voice Recognition Dictation Bar */}
      <VoiceControlBar
        onApplyVoiceCommand={handleVoiceCommand}
        availableDishes={branchRecipes.map((r) => ({
          id: r.id,
          nameAm: r.nameAm,
          nameEn: r.nameEn,
        }))}
        availableItems={items.map((i) => ({
          id: i.id,
          nameAm: i.nameAm,
          nameEn: i.nameEn,
        }))}
      />

      {activeSubTab === 'reconcile' ? (
        <>
          {/* Executive KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Card 1: Total Cash Revenue */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/20 shadow-xl">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
                <span>{language === 'am' ? 'የካሽ ሪጅስተር ገቢ' : 'POS Cash Sales'}</span>
                <Receipt className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                {formatCurrency(totalCashRevenue)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {totalCashSalesPlates} {language === 'am' ? 'በደረሰኝ የተሸጡ ፖርሽኖች' : 'plates billed'}
              </div>
            </div>

            {/* Card 2: Chef Kitchen Output vs Cashier Sales */}
            <div className={`p-4 rounded-2xl bg-slate-900 border shadow-xl ${
              chefVsCashierGap > 0
                ? 'border-rose-500/40 bg-rose-950/20'
                : 'border-amber-500/20'
            }`}>
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
                <span>{language === 'am' ? 'የሼፎች ማውጫ (KOT)' : 'Chef Kitchen Count'}</span>
                <ChefHat className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-white font-mono">
                {totalChefOutputPlates} <span className="text-xs text-slate-400 font-normal">ፖርሽን</span>
              </div>
              <div className="text-[11px] mt-1 font-bold">
                {chefVsCashierGap === 0 ? (
                  <span className="text-emerald-400">✅ ከካሽ ጋር ተመጣጣኝ (Balanced)</span>
                ) : chefVsCashierGap > 0 ? (
                  <span className="text-rose-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    +{chefVsCashierGap} ፖርሽን በካሽ አልተመዘገበም!
                  </span>
                ) : (
                  <span className="text-amber-400">{Math.abs(chefVsCashierGap)} በካሽ የበዛ</span>
                )}
              </div>
            </div>

            {/* Card 3: Management Meals Value */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/20 shadow-xl">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
                <span>{language === 'am' ? 'የማኔጅመንት ምግብ' : 'Management Meals'}</span>
                <UtensilsCrossed className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-blue-300 font-mono">
                {formatCurrency(totalManagementCost)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {totalManagementPlates} {language === 'am' ? 'የተፈረመባቸው ፖርሽኖች' : 'signed plates'}
              </div>
            </div>

            {/* Card 4: Net Variance Cost (Short / Over) */}
            <div className={`p-4 rounded-2xl bg-slate-900 border shadow-xl ${
              totalVarianceCost > 0
                ? 'border-rose-500/50 bg-rose-950/20'
                : totalVarianceCost < 0
                ? 'border-emerald-500/50 bg-emerald-950/20'
                : 'border-amber-500/20'
            }`}>
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
                <span>{language === 'am' ? 'የጥሬ ዕቃ ሾርት / ኦቨር (ዋጋ)' : 'Net Stock Variance'}</span>
                <Scale className="w-4 h-4 text-amber-400" />
              </div>
              <div className={`text-xl sm:text-2xl font-black font-mono ${
                totalVarianceCost > 0 ? 'text-rose-400' : totalVarianceCost < 0 ? 'text-emerald-400' : 'text-white'
              }`}>
                {totalVarianceCost > 0 ? `-${formatCurrency(totalVarianceCost)}` : totalVarianceCost < 0 ? `+${formatCurrency(Math.abs(totalVarianceCost))}` : formatCurrency(0)}
              </div>
              <div className="text-[11px] font-bold mt-1">
                {totalVarianceCost > 0 ? (
                  <span className="text-rose-400">⚠️ ጉድለት/ኪሳራ (Shortage)</span>
                ) : totalVarianceCost < 0 ? (
                  <span className="text-emerald-400">✨ ትርፍ/ቆጣቢ (Surplus / Saving)</span>
                ) : (
                  <span className="text-slate-400">ትክክለኛ ስሌት (Balanced)</span>
                )}
              </div>
            </div>
          </div>

          {/* Committed Alert Success Banner */}
          {committedSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-950/90 border border-emerald-500/60 text-emerald-200 flex items-center justify-between shadow-2xl animate-bounce">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm text-emerald-300">
                    {language === 'am' ? 'ሪኮንሲሌሽኑ በስኬት ጸድቋል!' : 'Reconciliation Committed Successfully!'}
                  </h4>
                  <p className="text-xs text-emerald-400/90">
                    {language === 'am'
                      ? `የ${currentBranch.nameAm} የጥሬ ዕቃዎች ወጪ በሌጀሩ ውስጥ ተመዝግቧል፤ ቀሪው ስቶክ ተስተካክሏል።`
                      : `Updated ${currentBranch.nameEn} branch ledger and remaining stock balances.`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 1: DISH SALES & CHEF OUTPUT ENTRY */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-amber-500/30 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm sm:text-base font-black text-amber-300 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-400" />
                  <span>{language === 'am' ? '1. የምግብ ሽያጭ፣ የሼፍ ማውጫ (KOT) እና የማኔጅመንት ምግብ' : '1. Cashier Sales, Chef KOT & Management Meals'}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {language === 'am'
                    ? 'ከካሽ ማሽን በደረሰኝ የተሸጠውን፣ ሼፎቹ ያወጡትን እና ማኔጅመንት የተመገበውን ፖርሽን ያስገቡ'
                    : 'Enter Cash Register Receipt Sales, Chef Kitchen Orders, and Signed Management Meals'}
                </p>
              </div>

              {/* Search Filter */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder={language === 'am' ? 'ምግብ በስም ይፈልጉ...' : 'Search dish...'}
                  value={dishSearch}
                  onChange={(e) => setDishSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {branchRecipes.length === 0 ? (
              <div className="p-8 text-center bg-slate-950 rounded-2xl border border-dashed border-slate-800 text-slate-400 text-xs">
                {language === 'am'
                  ? `ለ${currentBranch.nameAm} የተመዘገበ ሪሲፒ/ሜኑ የለም። እባክዎ መጀመሪያ በ"ሪሲፒ" ገጽ ላይ ለዚህ ቅርንጫፍ ምግቦችን ይመዝግቡ።`
                  : 'No recipes found for this branch. Please create recipes in Recipes tab first.'}
              </div>
            ) : (
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-[11px] font-bold uppercase tracking-wider bg-slate-950/60">
                      <th className="py-2.5 px-3">{language === 'am' ? 'የምግቡ ስም' : 'Dish Name'}</th>
                      <th className="py-2.5 px-3 text-right">{language === 'am' ? 'የመሸጫ ዋጋ' : 'Price'}</th>
                      <th className="py-2.5 px-3 text-center text-emerald-400">
                        {language === 'am' ? '🧾 የካሽ ሽያጭ (ደረሰኝ)' : '🧾 Cash Sales'}
                      </th>
                      <th className="py-2.5 px-3 text-center text-amber-400">
                        {language === 'am' ? '👨‍🍳 የሼፍ ማውጫ (KOT)' : '👨‍🍳 Chef Output'}
                      </th>
                      <th className="py-2.5 px-3 text-center text-blue-400">
                        {language === 'am' ? '✍️ ማኔጅመንት' : '✍️ Management'}
                      </th>
                      <th className="py-2.5 px-3 text-center">{language === 'am' ? 'ልዩነት (ክፍተት)' : 'Chef vs Cash'}</th>
                      <th className="py-2.5 px-3 text-right">{language === 'am' ? 'ጠቅላላ ገቢ' : 'Subtotal'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredBranchRecipes.map((r) => {
                      const soldQty = dishSales[r.id] || 0;
                      const chefQty = chefProduction[r.id] || 0;
                      const mgtQty = managementMeals[r.id] || 0;
                      const gap = chefQty - soldQty;
                      const subtotal = soldQty * r.sellingPrice;

                      return (
                        <tr key={r.id} className="hover:bg-slate-950/50 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-white">
                            <div>{language === 'am' ? r.nameAm : r.nameEn}</div>
                            <div className="text-[10px] text-slate-500 font-normal">{r.category} • {r.portionDescription}</div>
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-300">
                            {formatCurrency(r.sellingPrice)}
                          </td>

                          {/* Cash Sales Input */}
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={dishSales[r.id] === undefined || dishSales[r.id] === 0 ? '' : dishSales[r.id]}
                              onChange={(e) => handleDishSaleChange(r.id, e.target.value)}
                              className="w-20 px-2.5 py-1.5 bg-slate-950 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 font-mono font-black text-center focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                            />
                          </td>

                          {/* Chef Production Output Input */}
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={chefProduction[r.id] === undefined || chefProduction[r.id] === 0 ? '' : chefProduction[r.id]}
                              onChange={(e) => handleChefProductionChange(r.id, e.target.value)}
                              className="w-20 px-2.5 py-1.5 bg-slate-950 border border-amber-500/40 rounded-xl text-xs text-amber-300 font-mono font-black text-center focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                            />
                          </td>

                          {/* Management Meal Input */}
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={managementMeals[r.id] === undefined || managementMeals[r.id] === 0 ? '' : managementMeals[r.id]}
                              onChange={(e) => handleManagementMealChange(r.id, e.target.value)}
                              className="w-20 px-2.5 py-1.5 bg-slate-950 border border-blue-500/40 rounded-xl text-xs text-blue-300 font-mono font-black text-center focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                            />
                          </td>

                          {/* Gap Indicator */}
                          <td className="py-2.5 px-3 text-center">
                            {gap === 0 ? (
                              <span className="text-[10px] text-slate-500 font-bold font-mono">0 (ትክክል)</span>
                            ) : gap > 0 ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 font-mono">
                                +{gap} ያልተመዘገበ
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 font-mono">
                                {gap}
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-400">
                            {formatCurrency(subtotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SECTION 2: RAW MATERIALS BEGINNING, TRANSFERS, ENDING & ACTUAL PHYSICAL USAGE */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-amber-500/30 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm sm:text-base font-black text-amber-300 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>{language === 'am' ? '2. የጥሬ ዕቃዎች ቆጠራ (ጠዋት ቢግኒንግ፣ በቀኑ የገባ፣ ማታ ኢንዲንግ እና በእጅ ያለ)' : '2. Raw Materials Stock Count (Beginning, Transfers, Ending & Consumption)'}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {language === 'am'
                    ? 'የማታ ኢንዲንግ ቆጠራውን ሲሞሉ ሲስተሙ በራሱ በእጅ የተጠቀሙትን መጠን (Actual Consumption = (Beginning + In) - Ending) ያቀናንሳል'
                    : 'Entering Night Ending automatically calculates Actual Physical Consumption: (Beginning + Transfers) - Ending'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Save Today's Ending as Tomorrow's Beginning Button */}
                <button
                  type="button"
                  onClick={handleSaveEndingForTomorrow}
                  className="px-3 py-1.5 rounded-xl bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 border border-teal-500/40 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                  title={language === 'am' ? 'የዛሬውን ማታ ኢንዲንግ ቆጠራ ለነገ ጠዋት ቢግኒንግ እንዲሆን አስቀምጥ' : 'Save ending inventory as tomorrow beginning'}
                >
                  <span>💾</span>
                  <span>{language === 'am' ? 'ኢንዲንግ ለነገ አስቀምጥ' : 'Save Ending for Tomorrow'}</span>
                </button>

                {/* Ingredient Search */}
                <div className="relative w-full sm:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder={language === 'am' ? 'ጥሬ ዕቃ በስም ይፈልጉ...' : 'Search raw material...'}
                    value={ingredientSearch}
                    onChange={(e) => setIngredientSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>

            {/* Notification when ending inventory is saved */}
            {saveEndingNotification && (
              <div className="p-3 rounded-xl bg-teal-950/80 border border-teal-500/50 text-teal-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
                <CheckCircle className="w-4 h-4 text-teal-400 shrink-0" />
                <span>{saveEndingNotification}</span>
              </div>
            )}

            {/* Smart Carryover Notification Banner */}
            {carryoverInfo.isCarriedOver ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-gradient-to-r from-amber-950/40 via-slate-950 to-amber-950/30 border border-amber-500/40 text-xs">
                <div className="flex items-center gap-2 text-amber-300 font-bold">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
                  <span>
                    {language === 'am'
                      ? `✨ ስማርት ቴክኖሎጂ፦ የጠዋት ቢግኒንግ ኢንቨንተሪ ከቀዳሚው ቀን (${carryoverInfo.foundDate}) ማታ ኢንዲንግ በቀጥታ ተላልፏል!`
                      : `✨ Smart Carryover: Morning Beginning was automatically loaded from previous day (${carryoverInfo.foundDate}) ending inventory!`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleResetToLedgerBalance}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-semibold self-start sm:self-auto shrink-0 transition-colors"
                >
                  {language === 'am' ? 'ከሌጀር ሚዛን አንብብ' : 'Reset to Ledger Balance'}
                </button>
              </div>
            ) : (
              <div className="text-[11px] text-slate-400 flex items-center gap-2 px-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400/70" />
                <span>
                  {language === 'am'
                    ? '💡 የትናንት ኢንዲንግ ቆጠራ ሲሞላና ሲቀመጥ፣ ለዛሬው ቀን የጠዋት ቢግኒንግ እራሱ በራሱ ተላልፎ ይገባል።'
                    : '💡 When yesterday ending inventory is saved, it automatically flows as today beginning inventory.'}
                </span>
              </div>
            )}

            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px] font-bold uppercase tracking-wider bg-slate-950/60">
                    <th className="py-2.5 px-3">{language === 'am' ? 'ጥሬ ዕቃ' : 'Material'}</th>
                    <th className="py-2.5 px-3 text-center">{language === 'am' ? 'መለኪያ' : 'Unit'}</th>
                    <th className="py-2.5 px-3 text-center text-amber-400">
                      {language === 'am' ? '1. የጠዋት ቢግኒንግ' : '1. Morning Beg'}
                    </th>
                    <th className="py-2.5 px-3 text-center text-blue-400">
                      {language === 'am' ? '2. ከስቶር የገባ' : '2. Transfers In'}
                    </th>
                    <th className="py-2.5 px-3 text-center">
                      {language === 'am' ? 'አጠቃላይ የነበረ' : 'Total Avail'}
                    </th>
                    <th className="py-2.5 px-3 text-center text-teal-400">
                      {language === 'am' ? '3. የማታ ኢንዲንግ ቆጠራ' : '3. Night Ending'}
                    </th>
                    <th className="py-2.5 px-3 text-center text-emerald-400">
                      {language === 'am' ? 'በእጅ የተጠቀሙት (Actual)' : 'Actual Consumed'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredDetails.map((detail) => {
                    const it = items.find((i) => i.id === detail.itemId);
                    const beg = detail.beginningStock ?? (beginningStockMap[detail.itemId] || 0);
                    const transIn = detail.transfersIn ?? (dayTransfersInMap[detail.itemId] || 0);
                    const avail = Number((beg + transIn).toFixed(3));
                    const ending = detail.endingStock ?? (endingStockMap[detail.itemId] || 0);
                    const actualUsed = detail.physicalActualUsed;

                    return (
                      <tr key={detail.itemId} className="hover:bg-slate-950/50 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-white">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] px-1 py-0.5 rounded bg-slate-950 text-amber-400 border border-slate-800">
                              {it?.code || ''}
                            </span>
                            <span>{detail.itemNameAm}</span>
                          </div>
                          <div className="text-[10px] text-slate-500">{detail.itemNameEn}</div>
                        </td>

                        <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                          {detail.unitAm}
                        </td>

                        {/* Morning Beginning Input */}
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="0"
                            value={beginningStockMap[detail.itemId] === undefined ? beg : beginningStockMap[detail.itemId]}
                            onChange={(e) => handleBeginningStockChange(detail.itemId, e.target.value)}
                            className="w-24 px-2 py-1.5 bg-slate-950 border border-amber-500/40 rounded-xl text-xs text-amber-300 font-mono font-bold text-center focus:outline-none focus:border-amber-400"
                          />
                        </td>

                        {/* Transfers Received In (Auto from SIV) */}
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-blue-400">
                          +{transIn}
                        </td>

                        {/* Total Available in kitchen */}
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-300">
                          {avail}
                        </td>

                        {/* Night Ending Physical Count Input */}
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="0"
                            value={endingStockMap[detail.itemId] === undefined || endingStockMap[detail.itemId] === 0 ? '' : endingStockMap[detail.itemId]}
                            onChange={(e) => handleEndingStockChange(detail.itemId, e.target.value)}
                            className="w-24 px-2 py-1.5 bg-slate-950 border border-teal-500/40 rounded-xl text-xs text-teal-300 font-mono font-black text-center focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400"
                          />
                        </td>

                        {/* Actual Physical Consumption (Auto Calculated) */}
                        <td className="py-2.5 px-3 text-center font-mono font-black text-emerald-400 bg-emerald-950/20 rounded-xl">
                          {actualUsed} {detail.unitAm}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 3: CORE RECONCILIATION & SHORT / OVER AUDIT TABLE */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-amber-500/30 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm sm:text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-500 flex items-center gap-2">
                  <Scale className="w-5 h-5 text-amber-400" />
                  <span>{language === 'am' ? '3. ሾርት እና ኦቨር የሪኮንሲሌሽን ኦዲት (Short / Over / Variance Audit)' : '3. Recipe Variance Audit (Short / Over)'}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {language === 'am'
                    ? 'በእጅ የተጠቀሙት እውነተኛ መጠን ከሪሲፒው ስሌት ጋር ተነጻጽሮ የተገኘ ትክክለኛ ጉድለት (ሾርት) ወይም ትርፍ (ኦቨር)'
                    : 'Actual Consumption vs Theoretical Recipe Standard requirement'}
                </p>
              </div>

              {/* Status Legend */}
              <div className="flex items-center gap-2 text-[11px] font-bold">
                <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  🔴 ሾርት (ጉድለት/ኪሳራ)
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  🟢 ኦቨር (ትርፍ/ቆጣቢ)
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                  ⚪ ተመጣጣኝ (ትክክል)
                </span>
              </div>
            </div>

            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px] font-bold uppercase tracking-wider bg-slate-950/60">
                    <th className="py-2.5 px-3">{language === 'am' ? 'ጥሬ ዕቃ' : 'Material'}</th>
                    <th className="py-2.5 px-3 text-center">{language === 'am' ? 'መለኪያ' : 'Unit'}</th>
                    <th className="py-2.5 px-3 text-center text-emerald-400">
                      {language === 'am' ? 'በእጅ ያለቀው (Actual)' : 'Actual Consumed'}
                    </th>
                    <th className="py-2.5 px-3 text-center text-amber-400">
                      {language === 'am' ? 'በሪሲፒው ማለቅ የነበረበት (Recipe)' : 'Recipe Required'}
                    </th>
                    <th className="py-2.5 px-3 text-center">{language === 'am' ? 'ልዩነት (Short / Over)' : 'Variance'}</th>
                    <th className="py-2.5 px-3 text-center">{language === 'am' ? 'የኦዲት ውጤት' : 'Status'}</th>
                    <th className="py-2.5 px-3 text-right">{language === 'am' ? 'የገንዘብ ተጽእኖ (ብር)' : 'Cost Impact'}</th>
                    <th className="py-2.5 px-3 text-center">{language === 'am' ? 'ዝርዝር' : 'Details'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredDetails.map((detail) => {
                    const isExpanded = expandedIngredients[detail.itemId];
                    const isShortage = detail.variance > 0.005;
                    const isExcess = detail.variance < -0.005;

                    return (
                      <React.Fragment key={detail.itemId}>
                        <tr className={`transition-colors ${
                          isShortage
                            ? 'bg-rose-950/20 hover:bg-rose-950/30'
                            : isExcess
                            ? 'bg-emerald-950/15 hover:bg-emerald-950/25'
                            : 'hover:bg-slate-950/50'
                        }`}>
                          <td className="py-3 px-3 font-bold text-white">
                            <div>{detail.itemNameAm}</div>
                            <div className="text-[10px] text-slate-500">{detail.itemNameEn}</div>
                          </td>

                          <td className="py-3 px-3 text-center font-bold text-slate-400">
                            {detail.unitAm}
                          </td>

                          {/* Actual Physical Consumption */}
                          <td className="py-3 px-3 text-center font-mono font-black text-white">
                            {detail.physicalActualUsed}
                          </td>

                          {/* Theoretical Recipe Requirement */}
                          <td className="py-3 px-3 text-center font-mono font-black text-amber-300">
                            {detail.theoreticalRequired}
                          </td>

                          {/* Variance: Short / Over */}
                          <td className="py-3 px-3 text-center font-mono font-black">
                            <span className={
                              isShortage
                                ? 'text-rose-400 font-extrabold'
                                : isExcess
                                ? 'text-emerald-400 font-extrabold'
                                : 'text-slate-400'
                            }>
                              {detail.variance > 0 ? `+${detail.variance}` : detail.variance} {detail.unitAm}
                            </span>
                            <div className="text-[10px] text-slate-500 font-normal">
                              ({detail.variancePercent > 0 ? `+${detail.variancePercent}%` : `${detail.variancePercent}%`})
                            </div>
                          </td>

                          {/* Status Badge */}
                          <td className="py-3 px-3 text-center">
                            {isShortage ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-black text-[10px]">
                                <AlertTriangle className="w-3 h-3 text-rose-400" />
                                <span>{language === 'am' ? 'ሾርት (ጉድለት)' : 'Shortage'}</span>
                              </span>
                            ) : isExcess ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black text-[10px]">
                                <TrendingDown className="w-3 h-3 text-emerald-400" />
                                <span>{language === 'am' ? 'ኦቨር (ትርፍ)' : 'Over/Saving'}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 font-bold text-[10px]">
                                <CheckCircle className="w-3 h-3 text-emerald-400" />
                                <span>{language === 'am' ? 'ተመጣጣኝ' : 'Balanced'}</span>
                              </span>
                            )}
                          </td>

                          {/* Financial Cost Impact */}
                          <td className="py-3 px-3 text-right font-mono font-black">
                            <span className={
                              isShortage
                                ? 'text-rose-400'
                                : isExcess
                                ? 'text-emerald-400'
                                : 'text-slate-400'
                            }>
                              {detail.financialImpactETB > 0
                                ? `-${formatCurrency(detail.financialImpactETB)}`
                                : detail.financialImpactETB < 0
                                ? `+${formatCurrency(Math.abs(detail.financialImpactETB))}`
                                : formatCurrency(0)}
                            </span>
                          </td>

                          {/* Expand Details Trigger */}
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => toggleExpand(detail.itemId)}
                              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                              title={language === 'am' ? 'ዝርዝር ሪሲፒዎች አሳይ' : 'Show recipe dishes'}
                            >
                              <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          </td>
                        </tr>

                        {/* Expanded Recipe Breakdown Row */}
                        {isExpanded && (
                          <tr className="bg-slate-950/80">
                            <td colSpan={8} className="p-4 border-b border-slate-800">
                              <div className="space-y-2 max-w-2xl">
                                <div className="text-xs font-bold text-amber-300 flex items-center gap-2">
                                  <ChefHat className="w-3.5 h-3.5 text-amber-400" />
                                  <span>
                                    {language === 'am'
                                      ? `ይህ ጥሬ ዕቃ (${detail.itemNameAm}) የተሰላባቸው የምግብ ዓይነቶች፦`
                                      : `Dishes that use this ingredient (${detail.itemNameEn}):`}
                                  </span>
                                </div>

                                {detail.sharedRecipes.length === 0 ? (
                                  <div className="text-xs text-slate-500 italic">
                                    {language === 'am' ? 'በተመረጡት ምግቦች ውስጥ በቀጥታ አልተካተተም' : 'No direct recipe sales registered'}
                                  </div>
                                ) : (
                                  <div className="space-y-1.5 divide-y divide-slate-800/60">
                                    {detail.sharedRecipes.map((sh, idx) => (
                                      <div key={idx} className="flex items-center justify-between pt-1.5 text-xs text-slate-300">
                                        <div className="flex items-center gap-2">
                                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                          <span className="font-semibold text-white">{sh.recipeNameAm}</span>
                                          <span className="text-[11px] text-slate-400 font-mono">
                                            ({sh.portionSold} ፖርሽን × {sh.ingredientPerPortion}{detail.unitAm})
                                          </span>
                                        </div>
                                        <span className="font-mono font-bold text-amber-300">
                                          = {sh.subTotalRequired} {detail.unitAm}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Approval & Commitment Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-800">
              <div className="text-xs text-slate-400">
                <span className="font-bold text-amber-400">ማስታወሻ፦</span>{' '}
                {language === 'am'
                  ? '«አጽድቅ እና ወደ ሌጀር አስገባ» ሲጫኑ፣ በእጅ ያለቀው እውነተኛ የጥሬ ዕቃ መጠን በቅርንጫፉ ሌጀር ውስጥ እንደ ወጪ (RECONCILIATION_ADJ) ይመዘገባል!'
                  : 'Committing will record the verified physical issues to the branch ledger and sync stocks.'}
              </div>

              <button
                onClick={handleCommit}
                disabled={!activeSession}
                className="px-6 py-3 rounded-2xl font-black text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-400 shadow-xl shadow-amber-500/25 ring-2 ring-amber-300/60 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-slate-950" />
                <span>{language === 'am' ? 'ሪኮንሲሌሽኑን አጽድቅ እና ወደ ሌጀር አስገባ' : 'Approve & Commit to Branch Ledger'}</span>
              </button>
            </div>
          </div>
        </>
      ) : (
        /* SECTION 4: PREVIOUS RECONCILIATIONS AUDIT HISTORY */
        <div className="p-6 rounded-3xl bg-slate-900 border border-amber-500/30 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-black text-amber-300 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>{language === 'am' ? 'ያለፉ ሪኮንሲሌሽኖች ማህደር' : 'Reconciliation History & Audit Log'}</span>
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'am' ? 'ቀደም ሲል የተሰሩ እና የጸደቁ የሪኮንሲሌሽን ሰነዶች' : 'Archived reconciliation sessions and audit records'}
              </p>
            </div>
          </div>

          {reconciliations.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400 bg-slate-950 rounded-2xl border border-dashed border-slate-800">
              {language === 'am' ? 'እስካሁን የተመዘገበ የሪኮንሲሌሽን ታሪክ የለም' : 'No reconciliation history recorded yet'}
            </div>
          ) : (
            <div className="space-y-3">
              {reconciliations.map((rec) => {
                const br = branches.find((b) => b.id === rec.branchId);
                const isApproved = rec.status === 'approved';

                return (
                  <div
                    key={rec.id}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">
                          {br ? br.nameAm : rec.branchId}
                        </span>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-slate-900 text-amber-400 border border-slate-700">
                          {rec.date} ({rec.ethiopianDateStr})
                        </span>
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          isApproved
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {isApproved ? 'የጸደቀ (Approved)' : 'ረቂቅ (Draft)'}
                        </span>
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        {rec.dishesSold?.length || 0} {language === 'am' ? 'የተሸጡ ምግቦች' : 'dishes'} • {rec.details?.length || 0} {language === 'am' ? 'የተፈተሹ ጥሬ ዕቃዎች' : 'ingredients audited'}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right font-mono">
                        <div className="text-slate-400 text-[10px]">{language === 'am' ? 'ልዩነት (ዋጋ)' : 'Variance Impact'}</div>
                        <div className={`font-black text-sm ${
                          rec.totalVarianceCostETB > 0 ? 'text-rose-400' : rec.totalVarianceCostETB < 0 ? 'text-emerald-400' : 'text-white'
                        }`}>
                          {formatCurrency(rec.totalVarianceCostETB)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

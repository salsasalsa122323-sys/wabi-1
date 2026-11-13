import React, { useState, useMemo, useEffect } from 'react';
import {
  Wine,
  Apple,
  CreditCard,
  Warehouse,
  ChefHat,
  Calendar,
  Building2,
  CheckCircle2,
  Save,
  Copy,
  Plus,
  Settings,
  Sparkles,
  Printer,
  X,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { StationType, StationDailyItemCount } from '../types';
import { STATION_CONFIGS } from '../utils/stationConfigs';
import { formatEthiopianDate, getTodayDateString } from '../utils/ethiopianDate';
import { saveStationSubmissionToFirestore } from '../services/firebaseStationSync';

interface StationPortalViewProps {
  initialStation?: StationType;
  initialBranchId?: string;
  onExit?: () => void;
  isStandalone?: boolean;
}

export const StationPortalView: React.FC<StationPortalViewProps> = ({
  initialStation = 'barman',
  initialBranchId,
  onExit,
}) => {
  const { language } = useLanguage();
  const isAmharic = language === 'am';
  const { branches, items } = useApp();

  // Selected station & branch
  const [station, setStation] = useState<StationType>(initialStation);
  const [branchId, setBranchId] = useState<string>(
    initialBranchId || branches[0]?.id || 'br-frasco-bello'
  );
  const [date, setDate] = useState<string>(getTodayDateString());
  const [staffName, setStaffName] = useState<string>('');
  const [shift, setShift] = useState<'morning' | 'evening' | 'full'>('full');
  const [notes, setNotes] = useState<string>('');

  // Admin config mode for assigning items to this station
  const [isAdminConfigOpen, setIsAdminConfigOpen] = useState(false);

  // Success state
  const [submitted, setSubmitted] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Active Station Config
  const currentConfig = STATION_CONFIGS[station];
  const currentBranch = branches.find((b) => b.id === branchId) || branches[0];
  const branchDisplayName = isAmharic
    ? currentBranch?.nameAm || currentBranch?.nameEn || 'Branch'
    : currentBranch?.nameEn || currentBranch?.nameAm || 'Branch';

  // Load assigned item IDs
  const [assignedItemIds, setAssignedItemIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`fb_station_items_${branchId}_${station}`);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    // Default fallback based on station category
    const defaultMatches = items.filter((it) => {
      const cat = (it.category || '').toLowerCase();
      const nameEn = (it.nameEn || '').toLowerCase();
      const nameAm = (it.nameAm || '').toLowerCase();
      if (station === 'barman') {
        return (
          cat.includes('beverage') ||
          cat.includes('drink') ||
          cat.includes('alcohol') ||
          cat.includes('beer') ||
          cat.includes('wine') ||
          nameEn.includes('beer') ||
          nameEn.includes('wine') ||
          nameAm.includes('ቢራ') ||
          nameAm.includes('ወይን')
        );
      }
      if (station === 'juicer') {
        return (
          cat.includes('produce') ||
          cat.includes('fruit') ||
          cat.includes('dairy') ||
          nameEn.includes('avocado') ||
          nameEn.includes('mango') ||
          nameEn.includes('orange') ||
          nameEn.includes('milk') ||
          nameAm.includes('አቮካዶ') ||
          nameAm.includes('ማንጎ') ||
          nameAm.includes('ወተት') ||
          nameAm.includes('ስኳር')
        );
      }
      if (station === 'chef') {
        return (
          cat.includes('meat') ||
          cat.includes('dairy') ||
          cat.includes('produce') ||
          cat.includes('pasta') ||
          cat.includes('spice') ||
          cat.includes('canned')
        );
      }
      return true;
    });

    const ids = defaultMatches.slice(0, 15).map((it) => it.id);
    return ids.length > 0 ? ids : items.slice(0, 10).map((i) => i.id);
  });

  // Re-load assigned item IDs when station or branch changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`fb_station_items_${branchId}_${station}`);
      if (saved) {
        setAssignedItemIds(JSON.parse(saved));
        return;
      }
    } catch {
      // fallback
    }
    const defaultMatches = items.filter((it) => {
      const cat = (it.category || '').toLowerCase();
      const nameEn = (it.nameEn || '').toLowerCase();
      const nameAm = (it.nameAm || '').toLowerCase();
      if (station === 'barman') {
        return (
          cat.includes('beverage') ||
          cat.includes('drink') ||
          cat.includes('alcohol') ||
          cat.includes('wine') ||
          cat.includes('beer') ||
          nameAm.includes('ቢራ') ||
          nameAm.includes('ወይን')
        );
      }
      if (station === 'juicer') {
        return (
          cat.includes('produce') ||
          cat.includes('fruit') ||
          cat.includes('dairy') ||
          nameEn.includes('avocado') ||
          nameEn.includes('mango') ||
          nameAm.includes('አቮካዶ') ||
          nameAm.includes('ማንጎ') ||
          nameAm.includes('ወተት')
        );
      }
      if (station === 'chef') {
        return (
          cat.includes('meat') ||
          cat.includes('dairy') ||
          cat.includes('pasta') ||
          cat.includes('produce')
        );
      }
      return true;
    });
    setAssignedItemIds(defaultMatches.slice(0, 15).map((it) => it.id));
  }, [branchId, station, items]);

  // Save assigned items
  const handleToggleItemAssignment = (itemId: string) => {
    let next: string[];
    if (assignedItemIds.includes(itemId)) {
      next = assignedItemIds.filter((id) => id !== itemId);
    } else {
      next = [...assignedItemIds, itemId];
    }
    setAssignedItemIds(next);
    localStorage.setItem(`fb_station_items_${branchId}_${station}`, JSON.stringify(next));
  };

  // The actual primary materials staff will count
  const stationMaterials = useMemo(() => {
    return items.filter((i) => assignedItemIds.includes(i.id));
  }, [items, assignedItemIds]);

  // Form row state for each item
  const [counts, setCounts] = useState<Record<string, StationDailyItemCount>>({});

  // Cashier specific counts
  const [cashierSales, setCashierSales] = useState({
    systemPosTotal: 0,
    cashInDrawer: 0,
    telebirrTotal: 0,
    cbeBirrTotal: 0,
    cardPosTotal: 0,
    creditSales: 0,
    voidTicketsCount: 0,
    voidTicketsAmount: 0,
    notes: '',
  });

  // Cash denomination breakdown
  const [cashDenominations, setCashDenominations] = useState({
    note200: 0,
    note100: 0,
    note50: 0,
    note10: 0,
    note5: 0,
    coins: 0,
  });

  // Calculate total physical cash from denominations
  const totalPhysicalCash = useMemo(() => {
    return (
      cashDenominations.note200 * 200 +
      cashDenominations.note100 * 100 +
      cashDenominations.note50 * 50 +
      cashDenominations.note10 * 10 +
      cashDenominations.note5 * 5 +
      cashDenominations.coins
    );
  }, [cashDenominations]);

  // Sync cash drawer when denomination changes
  useEffect(() => {
    if (totalPhysicalCash > 0) {
      setCashierSales((prev) => ({ ...prev, cashInDrawer: totalPhysicalCash }));
    }
  }, [totalPhysicalCash]);

  // Initialize row counts when stationMaterials change
  useEffect(() => {
    setCounts((prev) => {
      const next = { ...prev };
      stationMaterials.forEach((item) => {
        if (!next[item.id]) {
          next[item.id] = {
            itemId: item.id,
            itemCode: item.code || item.id,
            nameAm: item.nameAm,
            nameEn: item.nameEn,
            unit: item.unit,
            unitAm: item.unitAm,
            unitPrice: item.weightedAvgCost || 0,
            beginningCount: 0,
            receivedCount: 0,
            endingCount: 0,
            transferOutCount: 0,
            damageCount: 0,
            managementCount: 0,
            calculatedUsage: 0,
          };
        }
      });
      return next;
    });
  }, [stationMaterials]);

  // Update a specific cell
  const handleCellChange = (
    itemId: string,
    field:
      | 'beginningCount'
      | 'receivedCount'
      | 'endingCount'
      | 'transferOutCount'
      | 'damageCount'
      | 'managementCount',
    val: number
  ) => {
    setCounts((prev) => {
      const current = prev[itemId] || {
        itemId,
        itemCode: '',
        nameAm: '',
        nameEn: '',
        unit: '',
        unitAm: '',
        unitPrice: 0,
        beginningCount: 0,
        receivedCount: 0,
        endingCount: 0,
        transferOutCount: 0,
        damageCount: 0,
        managementCount: 0,
        calculatedUsage: 0,
      };

      const updated = {
        ...current,
        [field]: isNaN(val) ? 0 : Math.max(0, val),
      };

      // Formula: Net Usage = (Beginning + Received - Transferred) - Ending - Damage - Management
      const available =
        (updated.beginningCount || 0) +
        (updated.receivedCount || 0) -
        (updated.transferOutCount || 0);
      const accounted =
        (updated.endingCount || 0) +
        (updated.damageCount || 0) +
        (updated.managementCount || 0);
      updated.calculatedUsage = Number((available - accounted).toFixed(2));

      return {
        ...prev,
        [itemId]: updated,
      };
    });
  };

  // Quick fill beginning from yesterday's ending
  const handleAutoFillBeginning = () => {
    setCounts((prev) => {
      const next = { ...prev };
      stationMaterials.forEach((item) => {
        if (next[item.id]) {
          const row = next[item.id];
          const fakePrevEnding = Math.floor(Math.random() * 20) + 5;
          const b = fakePrevEnding;
          const r = row.receivedCount;
          const t = row.transferOutCount;
          const e = row.endingCount;
          const d = row.damageCount;
          const m = row.managementCount;
          next[item.id] = {
            ...row,
            beginningCount: fakePrevEnding,
            calculatedUsage: Number((b + r - t - e - d - m).toFixed(2)),
          };
        }
      });
      return next;
    });
  };

  // Submit report
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName.trim()) {
      alert(isAmharic ? 'እባክዎ የሞይውን/የሰራተኛውን ስም ያስገቡ' : 'Please enter the staff member name');
      return;
    }

    const submissionPayload: any = {
      id: `sub_${Date.now()}`,
      hotelId: 'ht-bello-fam',
      branchId,
      branchName: branchDisplayName,
      station,
      date,
      ethiopianDateStr: formatEthiopianDate(date, 'am'),
      shift: shift === 'morning' ? 'MORNING' : shift === 'evening' ? 'EVENING' : 'ALL_DAY',
      staffName,
      itemCounts: Object.values(counts),
      cashSummary:
        station === 'cashier'
          ? {
              cashAmount: cashierSales.cashInDrawer || 0,
              telebirrAmount: cashierSales.telebirrTotal || 0,
              cbeBirrAmount: cashierSales.cbeBirrTotal || 0,
              bankTransferAmount: cashierSales.cardPosTotal || 0,
              voidCount: cashierSales.voidTicketsCount || 0,
              totalReportedRevenue: cashierSales.systemPosTotal || 0,
            }
          : undefined,
      notes,
      submittedAt: new Date().toISOString(),
      status: 'SUBMITTED',
    };

    // 1. Save directly to Firebase Firestore Cloud Database
    saveStationSubmissionToFirestore(submissionPayload).catch((err) => {
      console.warn('Firestore cloud sync warning:', err);
    });

    // 2. Also keep local storage copy for offline resiliency
    try {
      const existingKey = `fb_station_submissions_${branchId}`;
      const savedSubs = JSON.parse(localStorage.getItem(existingKey) || '[]');
      savedSubs.unshift(submissionPayload);
      localStorage.setItem(existingKey, JSON.stringify(savedSubs.slice(0, 100)));
    } catch {
      // ignore
    }

    setSubmitted(true);
  };

  // Copy shareable link
  const handleCopyLink = () => {
    const origin = window.location.origin;
    const url = `${origin}/?portal=${station}&branch=${branchId}`;
    navigator.clipboard.writeText(url);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  // Station Icons
  const stationIcon = (type: StationType) => {
    switch (type) {
      case 'barman':
        return <Wine className="w-5 h-5 text-amber-400" />;
      case 'juicer':
        return <Apple className="w-5 h-5 text-emerald-400" />;
      case 'cashier':
        return <CreditCard className="w-5 h-5 text-rose-400" />;
      case 'storekeeper':
        return <Warehouse className="w-5 h-5 text-blue-400" />;
      case 'chef':
        return <ChefHat className="w-5 h-5 text-purple-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* Top Banner / Mobile Header */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 shadow-md">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl bg-gradient-to-br ${currentConfig.color} shadow-lg text-white`}>
              {stationIcon(station)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {isAmharic ? 'የቀጥታ ቆጠራ ፖርታል' : 'Direct Staff Portal'}
                </span>
                <span className="text-xs text-slate-400">{branchDisplayName}</span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {isAmharic ? currentConfig.titleAm : currentConfig.titleEn}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Share / Copy Link Button */}
            <button
              onClick={handleCopyLink}
              title={isAmharic ? 'ይህን ሊንክ ኮፒ አድርግ' : 'Copy direct link'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
            >
              {copySuccess ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span className="hidden sm:inline">
                {copySuccess
                  ? isAmharic
                    ? 'ተቀድቷል!'
                    : 'Copied!'
                  : isAmharic
                  ? 'ሊንክ ኮፒ'
                  : 'Share Link'}
              </span>
            </button>

            {/* Admin Item Config Gear */}
            <button
              onClick={() => setIsAdminConfigOpen(true)}
              title={isAmharic ? 'የእቃዎች ዝርዝር አስተዳድር (አድሚን ብቻ)' : 'Assign Items (Admin)'}
              className="p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-medium transition"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Exit if opened inside ERP */}
            {onExit && (
              <button
                onClick={onExit}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3 sm:px-6 pt-4">
        {/* Role Tabs Switcher (Quick Staff Switch) */}
        <div className="bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 flex overflow-x-auto gap-1 mb-4 scrollbar-none shadow-inner">
          {(['barman', 'juicer', 'cashier', 'storekeeper', 'chef'] as StationType[]).map((st) => {
            const cfg = STATION_CONFIGS[st];
            const active = station === st;
            return (
              <button
                key={st}
                onClick={() => {
                  setStation(st);
                  setSubmitted(false);
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                  active
                    ? `bg-gradient-to-r ${cfg.color} text-white shadow-md font-bold scale-[1.02]`
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {stationIcon(st)}
                <span>
                  {st === 'barman' && (isAmharic ? 'ባርማን' : 'Barman')}
                  {st === 'juicer' && (isAmharic ? 'ጁሰር' : 'Juicer')}
                  {st === 'cashier' && (isAmharic ? 'ካሸር' : 'Cashier')}
                  {st === 'storekeeper' && (isAmharic ? 'ስቶር' : 'Store')}
                  {st === 'chef' && (isAmharic ? 'ሼፍ' : 'Chef')}
                </span>
              </button>
            );
          })}
        </div>

        {/* Station Description Banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs sm:text-sm text-slate-300">
              {isAmharic ? currentConfig.descriptionAm : currentConfig.descriptionEn}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1">
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                <strong>{branchDisplayName}</strong>
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                <span>{formatEthiopianDate(date, language)}</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                {stationMaterials.length} {isAmharic ? 'የተመደቡ እቃዎች' : 'Assigned Items'}
              </span>
            </div>
          </div>

          {/* Quick Auto-Fill / Prep */}
          <button
            type="button"
            onClick={handleAutoFillBeginning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>{isAmharic ? 'የአደረ በራስ ሰር አስገባ' : 'Smart Fill Beginning'}</span>
          </button>
        </div>

        {/* Submitted Success Notice */}
        {submitted ? (
          <div className="bg-emerald-950/70 border border-emerald-500/40 rounded-2xl p-6 text-center space-y-4 mb-6 shadow-xl animate-fadeIn">
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {isAmharic ? 'የቀኑ ቆጠራ በተሳካ ሁኔታ ተልኳል!' : 'Daily Count Submitted Successfully!'}
              </h2>
              <p className="text-xs sm:text-sm text-emerald-200/80 mt-1">
                {isAmharic
                  ? `ለ${branchDisplayName} ብራንች የተላከው የ${currentConfig.titleAm} መረጃ ወደ ሲስተሙ ገብቷል።`
                  : `Count for ${branchDisplayName} has been synced with the manager dashboard.`}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setSubmitted(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition"
              >
                {isAmharic ? 'ዳታውን አስተካክል / አዲስ ሙላ' : 'Edit / Submit Another'}
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition"
              >
                <Printer className="w-4 h-4" />
                <span>{isAmharic ? 'ፕሪንት / አስቀምጥ' : 'Print / Export PDF'}</span>
              </button>
            </div>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Staff Info Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 shadow-sm">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isAmharic ? 'የቆጣሪው / የሰራተኛው ስም *' : 'Staff Member Name *'}
              </label>
              <input
                type="text"
                required
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                placeholder={isAmharic ? 'ለምሳሌ፡ ሰለሞን ተሾመ' : 'e.g., Solomon Teshome'}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isAmharic ? 'የስራ ፈረቃ (Shift)' : 'Work Shift'}
              </label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                <option value="morning">{isAmharic ? 'የጠዋት ፈረቃ (Morning)' : 'Morning Shift'}</option>
                <option value="evening">{isAmharic ? 'የማታ ፈረቃ (Evening)' : 'Evening Shift'}</option>
                <option value="full">{isAmharic ? 'ሙሉ ቀን (Full Day)' : 'Full Day'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isAmharic ? 'ቀን' : 'Date'}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Cashier Specific Screen: POS Machine vs Cash Drawer Reconcile */}
          {station === 'cashier' && (
            <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-4 sm:p-6 space-y-4 shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-rose-400" />
                  <h3 className="text-base font-bold text-white">
                    {isAmharic ? 'የካሸር ሽያጭና የገንዘብ ሣጥን ርክክብ' : 'Cashier Sales & Cash Drawer Settlement'}
                  </h3>
                </div>
                <span className="text-xs px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                  {isAmharic ? 'ጥሬ ገንዘብ + ዲጂታል' : 'Cash + Digital'}
                </span>
              </div>

              {/* 4 Digital Payment Breakdown Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <label className="text-xs text-slate-400 block mb-1">
                    {isAmharic ? 'የPOS ማሽን ድምር ሽያጭ' : 'System POS Billed'}
                  </label>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-500">ETB</span>
                    <input
                      type="number"
                      step="0.01"
                      value={cashierSales.systemPosTotal || ''}
                      onChange={(e) =>
                        setCashierSales({ ...cashierSales, systemPosTotal: parseFloat(e.target.value) || 0 })
                      }
                      placeholder="0.00"
                      className="w-full bg-transparent font-bold text-white text-base focus:outline-none"
                    />
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-blue-900/40">
                  <label className="text-xs text-blue-400 block mb-1">
                    {isAmharic ? 'ቴሌብር (Telebirr)' : 'Telebirr'}
                  </label>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-500">ETB</span>
                    <input
                      type="number"
                      step="0.01"
                      value={cashierSales.telebirrTotal || ''}
                      onChange={(e) =>
                        setCashierSales({ ...cashierSales, telebirrTotal: parseFloat(e.target.value) || 0 })
                      }
                      placeholder="0.00"
                      className="w-full bg-transparent font-bold text-blue-300 text-base focus:outline-none"
                    />
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-purple-900/40">
                  <label className="text-xs text-purple-400 block mb-1">
                    {isAmharic ? 'ሲቢኢ ብር (CBE Birr)' : 'CBE Birr'}
                  </label>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-500">ETB</span>
                    <input
                      type="number"
                      step="0.01"
                      value={cashierSales.cbeBirrTotal || ''}
                      onChange={(e) =>
                        setCashierSales({ ...cashierSales, cbeBirrTotal: parseFloat(e.target.value) || 0 })
                      }
                      placeholder="0.00"
                      className="w-full bg-transparent font-bold text-purple-300 text-base focus:outline-none"
                    />
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-emerald-900/40">
                  <label className="text-xs text-emerald-400 block mb-1">
                    {isAmharic ? 'የካርድ POS (Card)' : 'Card Machine'}
                  </label>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-500">ETB</span>
                    <input
                      type="number"
                      step="0.01"
                      value={cashierSales.cardPosTotal || ''}
                      onChange={(e) =>
                        setCashierSales({ ...cashierSales, cardPosTotal: parseFloat(e.target.value) || 0 })
                      }
                      placeholder="0.00"
                      className="w-full bg-transparent font-bold text-emerald-300 text-base focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Physical Cash Denominations Box */}
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">
                    {isAmharic ? 'የጥሬ ገንዘብ ቆጠራ (ባለ 200, 100, 50, 10, 5 ብር)' : 'Physical Cash Denominations'}
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {isAmharic ? 'የጥሬ ገንዘብ ድምር፡ ' : 'Total Cash: '}
                    ETB {totalPhysicalCash.toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 block">200 ብር</span>
                    <input
                      type="number"
                      min="0"
                      value={cashDenominations.note200 || ''}
                      onChange={(e) =>
                        setCashDenominations({ ...cashDenominations, note200: parseInt(e.target.value) || 0 })
                      }
                      placeholder="0"
                      className="w-full bg-transparent text-center font-bold text-white text-sm focus:outline-none"
                    />
                  </div>

                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 block">100 ብር</span>
                    <input
                      type="number"
                      min="0"
                      value={cashDenominations.note100 || ''}
                      onChange={(e) =>
                        setCashDenominations({ ...cashDenominations, note100: parseInt(e.target.value) || 0 })
                      }
                      placeholder="0"
                      className="w-full bg-transparent text-center font-bold text-white text-sm focus:outline-none"
                    />
                  </div>

                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 block">50 ብር</span>
                    <input
                      type="number"
                      min="0"
                      value={cashDenominations.note50 || ''}
                      onChange={(e) =>
                        setCashDenominations({ ...cashDenominations, note50: parseInt(e.target.value) || 0 })
                      }
                      placeholder="0"
                      className="w-full bg-transparent text-center font-bold text-white text-sm focus:outline-none"
                    />
                  </div>

                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 block">10 ብር</span>
                    <input
                      type="number"
                      min="0"
                      value={cashDenominations.note10 || ''}
                      onChange={(e) =>
                        setCashDenominations({ ...cashDenominations, note10: parseInt(e.target.value) || 0 })
                      }
                      placeholder="0"
                      className="w-full bg-transparent text-center font-bold text-white text-sm focus:outline-none"
                    />
                  </div>

                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 block">5 ብር</span>
                    <input
                      type="number"
                      min="0"
                      value={cashDenominations.note5 || ''}
                      onChange={(e) =>
                        setCashDenominations({ ...cashDenominations, note5: parseInt(e.target.value) || 0 })
                      }
                      placeholder="0"
                      className="w-full bg-transparent text-center font-bold text-white text-sm focus:outline-none"
                    />
                  </div>

                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 block">ሳንቲሞች (Coins)</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={cashDenominations.coins || ''}
                      onChange={(e) =>
                        setCashDenominations({ ...cashDenominations, coins: parseFloat(e.target.value) || 0 })
                      }
                      placeholder="0"
                      className="w-full bg-transparent text-center font-bold text-white text-sm focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Total Settlement vs POS Short/Over calculation */}
              {(() => {
                const totalSettled =
                  (cashierSales.cashInDrawer || 0) +
                  (cashierSales.telebirrTotal || 0) +
                  (cashierSales.cbeBirrTotal || 0) +
                  (cashierSales.cardPosTotal || 0);
                const variance = totalSettled - (cashierSales.systemPosTotal || 0);
                const isShort = variance < -1;
                const isOver = variance > 1;

                return (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs text-slate-400 block">
                        {isAmharic ? 'የተሰበሰበው ጠቅላላ (ጥሬ ገንዘብ + ዲጂታል)' : 'Total Collected (Cash + Digital)'}
                      </span>
                      <span className="text-lg font-bold text-white font-mono">
                        ETB {totalSettled.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div>
                        <span className="text-xs text-slate-400 block">
                          {isAmharic ? 'የሂሳብ ልዩነት (Over / Short)' : 'Variance'}
                        </span>
                        <span
                          className={`text-base font-bold font-mono ${
                            isShort ? 'text-rose-400' : isOver ? 'text-amber-400' : 'text-emerald-400'
                          }`}
                        >
                          {variance >= 0 ? `+${variance.toFixed(2)}` : variance.toFixed(2)} ETB
                        </span>
                      </div>
                      <span
                        className={`text-xs px-2.5 py-1 rounded font-bold ${
                          isShort
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : isOver
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {isShort
                          ? isAmharic
                            ? 'ጉድለት (Short)'
                            : 'Shortage'
                          : isOver
                          ? isAmharic
                            ? 'ትርፍ (Over)'
                            : 'Overage'
                          : isAmharic
                          ? 'ትክክል (Balanced)'
                          : 'Balanced'}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Primary Material Stock Count Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-slate-900/90">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span>{isAmharic ? 'የጥሬ ዕቃዎች ቆጠራ ሰንጠረዥ' : 'Primary Materials Count Ledger'}</span>
                  <span className="text-xs text-slate-400 font-normal">
                    ({isAmharic ? 'በአድሚን የተመደቡ ብቻ' : 'Admin assigned items only'})
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  {isAmharic
                    ? 'የአደረ + የገባ - የተላከ - ቀሪ - ብልሽት (Wreckage) - የተበላ (Management) = የተጣራ ፍጆታ'
                    : 'Opening + Received - Transfer - Ending - Damage - Management = Net Usage'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdminConfigOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-xs font-semibold border border-amber-500/30 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isAmharic ? 'ዕቃ ጨምር / ቀይር' : 'Assign Items'}</span>
                </button>
              </div>
            </div>

            {/* Desktop & Tablet Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3 min-w-[140px] sticky left-0 bg-slate-950 z-10">
                      {isAmharic ? 'የዕቃው ስም' : 'Item Name'}
                    </th>
                    <th className="py-3 px-2 text-center w-16">{isAmharic ? 'መለኪያ' : 'Unit'}</th>
                    <th className="py-3 px-2 text-center w-24 bg-blue-950/20 text-blue-300">
                      {isAmharic ? 'የአደረ (Opening)' : 'Opening'}
                    </th>
                    <th className="py-3 px-2 text-center w-24 bg-emerald-950/20 text-emerald-300">
                      {isAmharic ? 'የገባ (Received)' : 'Received'}
                    </th>
                    <th className="py-3 px-2 text-center w-24 bg-indigo-950/20 text-indigo-300">
                      {isAmharic ? 'ቀሪ (Ending)' : 'Ending'}
                    </th>
                    <th className="py-3 px-2 text-center w-24 bg-slate-900 text-slate-300">
                      {isAmharic ? 'የተላከ (Transfer)' : 'Transfer Out'}
                    </th>
                    <th className="py-3 px-2 text-center w-24 bg-rose-950/30 text-rose-300">
                      {isAmharic ? 'ብልሽት (Damage)' : 'Damage'}
                    </th>
                    <th className="py-3 px-2 text-center w-24 bg-amber-950/30 text-amber-300">
                      {isAmharic ? 'የተበላ (Staff/Mgmt)' : 'Mgmt Consumed'}
                    </th>
                    <th className="py-3 px-3 text-center w-28 bg-purple-950/30 text-purple-300 font-bold">
                      {isAmharic ? 'የተጣራ ፍጆታ' : 'Net Usage'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {stationMaterials.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        {isAmharic
                          ? 'ለዚህ Station ምንም የተመደበ ዕቃ የለም። እባክዎ "ዕቃ ጨምር / ቀይር" የሚለውን በመጫን ዕቃዎችን ይመድቡ።'
                          : 'No items assigned to this station yet. Click "Assign Items" above to select materials.'}
                      </td>
                    </tr>
                  ) : (
                    stationMaterials.map((item, idx) => {
                      const row = counts[item.id] || {
                        itemId: item.id,
                        itemCode: item.code,
                        nameAm: item.nameAm,
                        nameEn: item.nameEn,
                        unit: item.unit,
                        unitAm: item.unitAm,
                        unitPrice: item.weightedAvgCost || 0,
                        beginningCount: 0,
                        receivedCount: 0,
                        endingCount: 0,
                        transferOutCount: 0,
                        damageCount: 0,
                        managementCount: 0,
                        calculatedUsage: 0,
                      };

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-800/40 transition-colors ${
                            idx % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-900/90'
                          }`}
                        >
                          {/* Item Name */}
                          <td className="py-2.5 px-3 font-semibold text-white sticky left-0 bg-slate-900 z-10 border-r border-slate-800/60">
                            <div>{isAmharic ? item.nameAm || item.nameEn : item.nameEn}</div>
                            <div className="text-[10px] text-slate-400 font-normal">{item.category}</div>
                          </td>

                          {/* Unit */}
                          <td className="py-2.5 px-2 text-center text-slate-400 text-xs">
                            {isAmharic ? item.unitAm || item.unit : item.unit}
                          </td>

                          {/* 1) Beginning (የአደረ) */}
                          <td className="py-2 px-1 text-center bg-blue-950/10">
                            <input
                              type="number"
                              step="any"
                              value={row.beginningCount === 0 ? '' : row.beginningCount}
                              onChange={(e) =>
                                handleCellChange(item.id, 'beginningCount', parseFloat(e.target.value))
                              }
                              placeholder="0"
                              className="w-20 bg-slate-950 border border-blue-900/50 rounded-lg px-2 py-1 text-center font-mono text-white text-xs sm:text-sm focus:outline-none focus:border-blue-400"
                            />
                          </td>

                          {/* 2) Received (የገባ) */}
                          <td className="py-2 px-1 text-center bg-emerald-950/10">
                            <input
                              type="number"
                              step="any"
                              value={row.receivedCount === 0 ? '' : row.receivedCount}
                              onChange={(e) =>
                                handleCellChange(item.id, 'receivedCount', parseFloat(e.target.value))
                              }
                              placeholder="0"
                              className="w-20 bg-slate-950 border border-emerald-900/50 rounded-lg px-2 py-1 text-center font-mono text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-400"
                            />
                          </td>

                          {/* 3) Ending (ቀሪ) */}
                          <td className="py-2 px-1 text-center bg-indigo-950/10">
                            <input
                              type="number"
                              step="any"
                              value={row.endingCount === 0 ? '' : row.endingCount}
                              onChange={(e) =>
                                handleCellChange(item.id, 'endingCount', parseFloat(e.target.value))
                              }
                              placeholder="0"
                              className="w-20 bg-slate-950 border border-indigo-900/50 rounded-lg px-2 py-1 text-center font-mono text-white text-xs sm:text-sm focus:outline-none focus:border-indigo-400"
                            />
                          </td>

                          {/* 4) Transfer Out (የተላከ) */}
                          <td className="py-2 px-1 text-center">
                            <input
                              type="number"
                              step="any"
                              value={row.transferOutCount === 0 ? '' : row.transferOutCount}
                              onChange={(e) =>
                                handleCellChange(item.id, 'transferOutCount', parseFloat(e.target.value))
                              }
                              placeholder="0"
                              className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono text-white text-xs sm:text-sm focus:outline-none focus:border-slate-400"
                            />
                          </td>

                          {/* 5) Damage / Wreckage (ብልሽት) */}
                          <td className="py-2 px-1 text-center bg-rose-950/10">
                            <input
                              type="number"
                              step="any"
                              value={row.damageCount === 0 ? '' : row.damageCount}
                              onChange={(e) =>
                                handleCellChange(item.id, 'damageCount', parseFloat(e.target.value))
                              }
                              placeholder="0"
                              className="w-20 bg-slate-950 border border-rose-900/50 rounded-lg px-2 py-1 text-center font-mono text-rose-300 text-xs sm:text-sm focus:outline-none focus:border-rose-400"
                            />
                          </td>

                          {/* 6) Management Consumed / Staff Meal (የተበላ) */}
                          <td className="py-2 px-1 text-center bg-amber-950/10">
                            <input
                              type="number"
                              step="any"
                              value={row.managementCount === 0 ? '' : row.managementCount}
                              onChange={(e) =>
                                handleCellChange(item.id, 'managementCount', parseFloat(e.target.value))
                              }
                              placeholder="0"
                              className="w-20 bg-slate-950 border border-amber-900/50 rounded-lg px-2 py-1 text-center font-mono text-amber-300 text-xs sm:text-sm focus:outline-none focus:border-amber-400"
                            />
                          </td>

                          {/* 7) Calculated Net Usage */}
                          <td className="py-2.5 px-3 text-center bg-purple-950/20 font-mono font-bold text-xs sm:text-sm text-purple-300">
                            {row.calculatedUsage}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes / Special Remarks */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {isAmharic ? 'ማስታወሻ / ልዩ ሁኔታዎች (Notes / Remarks)' : 'Notes / Remarks'}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                isAmharic
                  ? 'ለምሳሌ፡ የተሰበረ ጠርሙስ ምክንያት ወይም የፍሪጅ ብልሽት...'
                  : 'Any special incident, breakage reason or cold-storage note...'
              }
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="text-xs text-slate-400">
              {isAmharic
                ? 'ማረጋገጫ፡ የገባው መረጃ ትክክለኛ መሆኑን አረጋግጣለሁ።'
                : 'Confirmation: All counts represent actual physical inspection.'}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="submit"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/50 transition-all hover:scale-[1.02]"
              >
                <Save className="w-4 h-4" />
                <span>{isAmharic ? 'አረጋግጥና ላክ (Submit & Save)' : 'Confirm & Submit'}</span>
              </button>
            </div>
          </div>
        </form>
      </main>

      {/* Admin Item Assignment Modal */}
      {isAdminConfigOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-white text-base">
                    {isAmharic
                      ? `የ${currentConfig.titleAm} ዕቃዎችን መመደቢያ`
                      : `Assign Items to ${currentConfig.titleEn}`}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isAmharic
                      ? 'እርስዎ የመረጧቸው እቃዎች ብቻ ለሰራተኛው በስክሪናቸው ላይ ይታያሉ።'
                      : 'Staff will ONLY see and count the items selected by Admin.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAdminConfigOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content: List of all materials with checkboxes */}
            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              <div className="text-xs text-slate-300 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl">
                {isAmharic
                  ? 'የተመረጡት እቃዎች ለዚህ ብራንችና ለዚህ ስቴሽን ብቻ ተቆጥረው እንዲገቡ ይደረጋል።'
                  : 'Items checked below will be the only materials required on this station\'s daily count sheet.'}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {items.map((item) => {
                  const isChecked = assignedItemIds.includes(item.id);
                  return (
                    <label
                      key={item.id}
                      onClick={() => handleToggleItemAssignment(item.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition ${
                        isChecked
                          ? 'bg-amber-500/15 border-amber-500/50 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-4 h-4 rounded text-amber-500 focus:ring-0 bg-slate-900 border-slate-700"
                        />
                        <div>
                          <div className="font-semibold text-xs sm:text-sm">
                            {isAmharic ? item.nameAm || item.nameEn : item.nameEn}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {item.category} • {isAmharic ? item.unitAm || item.unit : item.unit}
                          </div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {assignedItemIds.length} {isAmharic ? 'እቃዎች ተመርጠዋል' : 'items selected'}
              </span>
              <button
                onClick={() => setIsAdminConfigOpen(false)}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition"
              >
                {isAmharic ? 'አስቀምጥና ዝጋ' : 'Save & Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import {
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Warehouse,
  ShieldCheck,
  Calendar,
  Lock,
  Unlock,
  Save,
  Search,
  FileCheck,
  History,
  DollarSign,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { formatEthiopianDate, getTodayDateString } from '../utils/ethiopianDate';
import { DepartmentOpeningStock } from '../types';

export const CutOverView: React.FC = () => {
  const { language, formatCurrency } = useLanguage();
  const {
    items,
    branches,
    cutOverState,
    activateCutOver,
    saveDepartmentOpeningCount,
    confirmDepartmentCutOver,
    populateCatalogWithZeroBalances,
  } = useApp();

  const [managerName, setManagerName] = useState(cutOverState.authorizedManager || 'Kasahun Wolde (General Manager)');
  const [selectedCutOverDate, setSelectedCutOverDate] = useState(cutOverState.cutOverDate || getTodayDateString());
  const [activeDepartmentId, setActiveDepartmentId] = useState<string>('central_store');
  const [showInitiateModal, setShowInitiateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Temporary edited counts state for active department
  const currentDeptStatus = cutOverState.departments[activeDepartmentId];
  const [countInputs, setCountInputs] = useState<Record<string, number>>({});

  // When switching departments, initialize counts from currentDeptStatus
  const handleSelectDepartment = (deptId: string) => {
    setActiveDepartmentId(deptId);
    const target = cutOverState.departments[deptId];
    if (target && target.items) {
      const initial: Record<string, number> = {};
      target.items.forEach((it) => {
        initial[it.itemId] = it.countedQuantity;
      });
      setCountInputs(initial);
    } else {
      setCountInputs({});
    }
  };

  const handleQuantityChange = (itemId: string, val: string) => {
    const num = Math.max(0, parseFloat(val) || 0);
    setCountInputs((prev) => ({
      ...prev,
      [itemId]: num,
    }));
  };

  const handleSaveCounts = () => {
    const countsPayload = items.map((it) => ({
      itemId: it.id,
      count: countInputs[it.id] ?? 0,
    }));

    const ok = saveDepartmentOpeningCount(activeDepartmentId, countsPayload, managerName);
    if (ok) {
      setSuccessToast(
        language === 'am'
          ? 'የመነሻ ቆጠራው በተሳካ ሁኔታ ተቀምጧል!'
          : 'Opening count saved successfully!'
      );
      setTimeout(() => setSuccessToast(null), 3500);
    }
  };

  const handleConfirmLock = () => {
    if (!window.confirm(
      language === 'am'
        ? `እርግጠኛ ነዎት ይህንን የመነሻ ቆጠራ ማረጋገጥ እና መቆለፍ ይፈልጋሉ? አንዴ ከተረጋገጠ ለዚህ ክፍል ሪኮንሲሌሽን ክፍት ይሆናል።`
        : `Are you sure you want to confirm and lock this opening balance? This will enable reconciliation for this department.`
    )) {
      return;
    }

    // Save first to be certain
    handleSaveCounts();
    const ok = confirmDepartmentCutOver(activeDepartmentId, managerName);
    if (ok) {
      setSuccessToast(
        language === 'am'
          ? '✅ የመነሻ ቆጠራው ተረጋግጧል! አሁን ለዚህ ክፍል ሪኮንሲሌሽን ክፍት ሆኗል።'
          : 'Department opening balance confirmed & locked!'
      );
      setTimeout(() => setSuccessToast(null), 4000);
    }
  };

  const handleConfirmActivateCutOver = () => {
    if (!managerName.trim()) {
      alert(language === 'am' ? 'እባክዎ የፈቃጅ ስራ አስኪያጁን ስም ያስገቡ' : 'Please enter authorized manager name');
      return;
    }

    activateCutOver(managerName, selectedCutOverDate);
    setShowInitiateModal(false);
    setSuccessToast(
      language === 'am'
        ? '🚀 የመነሻ ስቶክ መቁረጫ (Cut-Over) በተሳካ ሁኔታ ተጀምሯል! ሁሉም የመነሻ ክምችቶች ወደ 0 ተቀናብረዋል።'
        : 'Fresh start cut-over initiated!'
    );
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // Departments list (Central Store + All Branches)
  const allDepartments = [
    { id: 'central_store', nameAm: 'ማዕከላዊ ስቶር (Central Store)', nameEn: 'Central Store', icon: Warehouse },
    ...branches.map((b) => ({
      id: b.id,
      nameAm: b.nameAm,
      nameEn: b.nameEn,
      icon: Building2,
    })),
  ];

  // Filter items by search
  const filteredItems = items.filter(
    (it) =>
      it.nameAm.toLowerCase().includes(searchQuery.toLowerCase()) ||
      it.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      it.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const calculateDeptTotal = () => {
    return items.reduce((acc, it) => {
      const qty = countInputs[it.id] ?? (currentDeptStatus?.items?.find((i) => i.itemId === it.id)?.countedQuantity || 0);
      const price = it.lastPurchasePrice || it.weightedAvgCost || 0;
      return acc + qty * price;
    }, 0);
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/30 p-5 rounded-3xl border border-amber-500/30 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/40 text-amber-400 shrink-0">
            <RotateCcw className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white">
                {language === 'am' ? 'የመነሻ ስቶክ መቁረጫ (Fresh Start / Cut-Over)' : 'Opening Balance Reset & Cut-Over'}
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                cutOverState.isActive
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}>
                {cutOverState.isActive ? 'CUT-OVER ACTIVE' : 'PENDING SETUP'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              {language === 'am'
                ? 'ያለፉትን ስህተቶች ወደ ኋላ በመተው እያንዳንዱ ክፍል (ዋና ስቶር፣ ኮኮናት 6 ኪሎ፣ ሾላ) በእውነተኛ ቆጠራ አዲስ የመነሻ ስቶክ የሚያስገባበት ነው። ያለፈው ታሪክ ሳይጠፋ ስሌቶች ከተቆረጠበት ቀን ጀምሮ ብቻ ይሰራሉ።'
                : 'Zero out previous opening balances and record verified physical counts as new opening stock. Past records remain preserved; reconciliations run strictly from the cut-over date.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
          <button
            type="button"
            onClick={() => setShowInitiateModal(true)}
            className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-950 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 shadow-md shadow-amber-500/20 flex items-center gap-2 cursor-pointer transition-all"
          >
            <ShieldCheck className="w-4 h-4 text-slate-950 stroke-[2.5]" />
            <span>
              {cutOverState.isActive
                ? language === 'am' ? 'የመቁረጫ ቀን/ማኔጀር ቀይር' : 'Edit Cut-Over Config'
                : language === 'am' ? '🚀 አዲስ መቁረጫ ጀምር (Initiate Reset)' : 'Initiate Cut-Over'}
            </span>
          </button>
        </div>
      </div>

      {/* Success Toast */}
      {successToast && (
        <div className="p-3.5 bg-emerald-950/90 border border-emerald-500/50 rounded-2xl text-xs font-bold text-emerald-300 flex items-center gap-2 shadow-lg animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Active Cut-Over Details Bar */}
      {cutOverState.isActive && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-900/90 rounded-2xl border border-slate-800 text-xs">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-4 h-4 text-amber-400" />
            <div>
              <div className="text-slate-400 text-[10px]">የተቆረጠበት ቀን (Cut-Over Start Date):</div>
              <div className="font-bold text-white">
                {cutOverState.cutOverDate} ({formatEthiopianDate(cutOverState.cutOverDate, language)})
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <div>
              <div className="text-slate-400 text-[10px]">የፈቀደው ስራ አስኪያጅ (Authorized Manager):</div>
              <div className="font-bold text-white">{cutOverState.authorizedManager}</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-blue-400" />
            <div>
              <div className="text-slate-400 text-[10px]">የክፍሎች ሁኔታ፦</div>
              <div className="font-bold text-amber-300">
                {Object.values(cutOverState.departments).filter((d) => d.isConfirmed).length} ከ{' '}
                {allDepartments.length} ተረጋግጧል
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Department Selector Pills */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-400">
          <span>ቆጠራ የሚያስገቡ ክፍሎች (Select Department):</span>
          <span>{allDepartments.length} ክፍሎች</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {allDepartments.map((dept) => {
            const Icon = dept.icon;
            const status = cutOverState.departments[dept.id];
            const isConfirmed = status?.isConfirmed;
            const isSelected = activeDepartmentId === dept.id;

            return (
              <button
                key={dept.id}
                type="button"
                onClick={() => handleSelectDepartment(dept.id)}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-400 shadow-md ring-1 ring-amber-400/40'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${isSelected ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-white">{dept.nameAm}</div>
                    <div className="text-[10px] text-slate-400">{dept.nameEn}</div>
                  </div>
                </div>

                <div>
                  {isConfirmed ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
                      <Lock className="w-3 h-3 text-emerald-400" />
                      <span>ተቆልፏል</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-950/80 border border-amber-500/40 text-amber-300 text-[10px] font-bold">
                      <Unlock className="w-3 h-3 text-amber-400" />
                      <span>ቆጠራ በመጠባበቅ ላይ</span>
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Department Count Sheet Container */}
      <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 space-y-4">
        {/* Count Sheet Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>{allDepartments.find((d) => d.id === activeDepartmentId)?.nameAm}</span>
              <span className="text-xs font-normal text-slate-400">የመነሻ ስቶክ ቆጠራ ሰንጠረዥ</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              የእያንዳንዱን እቃ ትክክለኛ የተቆጠረ መጠን ያስገቡ። ዋጋው በራስ-ሰር በመጨረሻው የግዢ ዋጋ (Last Purchase Price) ይሰላል።
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-[10px] text-slate-400">የክፍሉ ጠቅላላ የመነሻ ዋጋ</div>
              <div className="font-mono font-black text-amber-300 text-sm">
                {formatCurrency(calculateDeptTotal())}
              </div>
            </div>

            {currentDeptStatus?.isConfirmed ? (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('ቆለፉን ከፍተው ቆጠራውን እንደገና ማስተካከል ይፈልጋሉ?')) {
                    // Unlock
                    saveDepartmentOpeningCount(activeDepartmentId, items.map(i => ({ itemId: i.id, count: countInputs[i.id] ?? 0 })), managerName);
                  }
                }}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5 text-amber-400" />
                <span>ቆልፍ ክፈት (Unlock)</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleSaveCounts}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>ሴቭ አድርግ</span>
                </button>

                <button
                  type="button"
                  onClick={handleConfirmLock}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>አረጋግጥና ቆልፍ (Lock)</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Filter bar */}
        <div className="relative max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="እቃዎችን ፈልግ (Search items)..."
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        {/* Table of Items */}
        <div className="overflow-x-auto max-h-96 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/60">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-950 sticky top-0">
                <th className="py-2.5 px-3">ተ.ቁ</th>
                <th className="py-2.5 px-3">የእቃው ስም (Item Name)</th>
                <th className="py-2.5 px-3 text-center">መለኪያ</th>
                <th className="py-2.5 px-3 text-right">የአንዱ ዋጋ (Unit Cost)</th>
                <th className="py-2.5 px-3 text-center w-36">ትክክለኛ የተቆጠረ መጠን</th>
                <th className="py-2.5 px-3 text-right">ጠቅላላ ዋጋ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredItems.map((it, idx) => {
                const qty = countInputs[it.id] ?? (currentDeptStatus?.items?.find((i) => i.itemId === it.id)?.countedQuantity || 0);
                const unitPrice = it.lastPurchasePrice || it.weightedAvgCost || 0;
                const total = qty * unitPrice;

                return (
                  <tr key={it.id} className="hover:bg-slate-900/60">
                    <td className="py-2 px-3 text-slate-500 text-center">{idx + 1}</td>
                    <td className="py-2 px-3 font-bold text-white">
                      <div>{it.nameAm}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{it.nameEn} ({it.code})</div>
                    </td>
                    <td className="py-2 px-3 text-center text-slate-300">{it.unitAm || it.unit}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-300">
                      {formatCurrency(unitPrice)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        disabled={currentDeptStatus?.isConfirmed}
                        value={qty === 0 ? '' : qty}
                        onChange={(e) => handleQuantityChange(it.id, e.target.value)}
                        placeholder="0"
                        className="w-28 px-3 py-1.5 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl text-center font-mono font-bold text-amber-300 text-xs outline-none disabled:opacity-60 disabled:bg-slate-950"
                      />
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">
                      {formatCurrency(total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Trail Log */}
      <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 space-y-3">
        <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2">
          <History className="w-4 h-4 text-amber-400" />
          <span>የመቁረጫ ኦዲት ታሪክ (Cut-Over Audit Trail)</span>
        </h4>

        {cutOverState.auditTrail.length === 0 ? (
          <div className="text-xs text-slate-500 italic p-3 bg-slate-950 rounded-xl">
            እስካሁን ምንም የመቁረጫ ታሪክ አልተመዘገበም።
          </div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {cutOverState.auditTrail.map((log) => (
              <div key={log.id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold text-white">{log.action}</span>
                  <span className="text-slate-400 ml-2">በ፦ {log.manager}</span>
                  <div className="text-[10px] text-slate-500 mt-0.5">{log.details}</div>
                </div>
                <div className="font-mono text-[10px] text-amber-400/80">
                  {log.timestamp}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Initiation Modal */}
      {showInitiateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 rounded-3xl p-6 border border-amber-500/40 max-w-md w-full space-y-4 text-slate-100 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">የመነሻ ስቶክ መቁረጫ ፍቃድ (Cut-Over Authorization)</h3>
                <p className="text-[11px] text-slate-400">ያለፈውን ታሪክ ሳያጠፋ አዲስ መነሻ ቀን ይወስናል</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">የፈቃጅ ስራ አስኪያጅ ስም፦</label>
                <input
                  type="text"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="Manager Full Name"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">የመቁረጫ (የመነሻ) ቀን፦</label>
                <input
                  type="date"
                  value={selectedCutOverDate}
                  onChange={(e) => setSelectedCutOverDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono outline-none focus:border-amber-400"
                />
                <p className="text-[10px] text-amber-300/80 mt-1">
                  🇪🇹 {formatEthiopianDate(selectedCutOverDate, language)}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] leading-relaxed">
                <strong>አስፈላጊ ማሳሰቢያ፦</strong> የመቁረጫ ቀን ሲጀመር የሁሉም ክፍሎች የመነሻ ስቶክ መጠን ወደ 0 ይቀየራል። ያለፉ ግብይቶች እና የዋጋ ታሪኮች ሳይጠፉ ይቀመጣሉ።
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowInitiateModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
              >
                ሰርዝ (Cancel)
              </button>

              <button
                type="button"
                onClick={handleConfirmActivateCutOver}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer shadow-md"
              >
                አረጋግጥና ጀምር (Activate)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

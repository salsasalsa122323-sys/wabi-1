import React, { useState } from 'react';
import {
  GitBranch,
  Building2,
  Calendar,
  ClipboardList,
  DollarSign,
  ChefHat,
  Scale,
  Sparkles,
  Upload,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  FileSpreadsheet,
  ArrowRight,
  Filter,
  Check,
  Eye,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { formatEthiopianDate, getTodayDateString } from '../utils/ethiopianDate';
import { BranchDailyControllerSheet } from '../types';

interface BranchControllerInputViewProps {
  onNavigateToReconciliation?: (branchId: string, period: string) => void;
}

export const BranchControllerInputView: React.FC<BranchControllerInputViewProps> = ({
  onNavigateToReconciliation,
}) => {
  const {
    branches,
    items,
    recipes,
    selectedPrimaryItemIds,
    togglePrimaryItem,
    selectAllPrimaryItems,
    selectDefaultPrimaryItems,
    saveBranchDailyControllerSheet,
    branchDailySheets,
    deleteBranchDailyControllerSheet,
  } = useApp();

  const { language, formatCurrency } = useLanguage();

  const [selectedBranchId, setSelectedBranchId] = useState<string>(branches[0]?.id || '');
  const [inputDate, setInputDate] = useState<string>(getTodayDateString());
  const [controllerName, setControllerName] = useState('Kasahun Wolde (Cost Controller)');
  const [activeStep, setActiveStep] = useState<'beginning' | 'sales' | 'ending' | 'chefOrders' | 'history'>('beginning');

  // Primary Material Selector Modal
  const [isPrimarySelectorOpen, setIsPrimarySelectorOpen] = useState(false);
  const [primarySearch, setPrimarySearch] = useState('');

  // Paste from Excel modal
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteTarget, setPasteTarget] = useState<'beginning' | 'sales' | 'ending' | 'chefOrders'>('beginning');
  const [pastedRawText, setPastedRawText] = useState('');

  // Photo / Document OCR modal
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<any>(null);

  // Success Notification
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const currentBranch = branches.find((b) => b.id === selectedBranchId) || branches[0];
  const ethDate = formatEthiopianDate(inputDate, language);

  // 1. Beginning Inventory State: Record of item quantities
  const [beginningMap, setBeginningMap] = useState<Record<string, number>>({});
  
  // 2. Cashier Sales State: Array of items sold
  const [salesList, setSalesList] = useState<Array<{
    dishName: string;
    recipeId?: string;
    quantitySold: number;
    unitPrice: number;
    totalAmount: number;
  }>>([
    { dishName: 'ልዩ የክትፎ በቅቤ', quantitySold: 24, unitPrice: 420, totalAmount: 10080 },
    { dishName: 'የበሬ ጥብስ በፍርምባ', quantitySold: 18, unitPrice: 380, totalAmount: 6840 },
    { dishName: 'ልዩ የኮኮናት በርገር', quantitySold: 35, unitPrice: 280, totalAmount: 9800 },
  ]);

  // 3. Ending Physical Inventory State: Record of counted quantities
  const [endingMap, setEndingMap] = useState<Record<string, number>>({});

  // 4. Chef Kitchen Orders State: Array of production tickets
  const [chefOrdersList, setChefOrdersList] = useState<Array<{
    dishName: string;
    orderTicketNo: string;
    quantityProduced: number;
    chefName?: string;
    notes?: string;
  }>>([
    { dishName: 'ልዩ የክትፎ በቅቤ', orderTicketNo: 'TKT-041', quantityProduced: 24, chefName: 'ሳልሳዊ ስዩም (Manager)' },
    { dishName: 'የበሬ ጥብስ በፍርምባ', orderTicketNo: 'TKT-042', quantityProduced: 18, chefName: 'ሳልሳዊ ስዩም (Manager)' },
    { dishName: 'ልዩ የኮኮናት በርገር', orderTicketNo: 'TKT-043', quantityProduced: 35, chefName: 'Chef Sisay' },
  ]);

  // Primary items list
  const primaryItems = items.filter((it) => selectedPrimaryItemIds.includes(it.id));
  const displayedItemsForCounts = primaryItems.length > 0 ? primaryItems : items;

  // Total cashier sales amount
  const totalSalesAmount = salesList.reduce((sum, s) => sum + (s.totalAmount || s.quantitySold * s.unitPrice), 0);

  // Handle Pasting raw table text
  const handleApplyPastedText = () => {
    if (!pastedRawText.trim()) return;
    const lines = pastedRawText.trim().split('\n');

    if (pasteTarget === 'beginning') {
      const updated = { ...beginningMap };
      lines.forEach((line) => {
        const parts = line.split(/[\t,;]+/);
        if (parts.length >= 2) {
          const rawName = parts[0].trim().toLowerCase();
          const qty = parseFloat(parts[1]) || 0;
          const found = items.find(
            (i) => i.nameAm.toLowerCase().includes(rawName) || i.nameEn.toLowerCase().includes(rawName) || i.code.toLowerCase() === rawName
          );
          if (found) updated[found.id] = qty;
        }
      });
      setBeginningMap(updated);
    } else if (pasteTarget === 'ending') {
      const updated = { ...endingMap };
      lines.forEach((line) => {
        const parts = line.split(/[\t,;]+/);
        if (parts.length >= 2) {
          const rawName = parts[0].trim().toLowerCase();
          const qty = parseFloat(parts[1]) || 0;
          const found = items.find(
            (i) => i.nameAm.toLowerCase().includes(rawName) || i.nameEn.toLowerCase().includes(rawName) || i.code.toLowerCase() === rawName
          );
          if (found) updated[found.id] = qty;
        }
      });
      setEndingMap(updated);
    } else if (pasteTarget === 'sales') {
      const newSales: typeof salesList = [];
      lines.forEach((line) => {
        const parts = line.split(/[\t,;]+/);
        if (parts.length >= 2) {
          const dishName = parts[0].trim();
          const qty = parseFloat(parts[1]) || 1;
          const price = parseFloat(parts[2]) || 0;
          const total = parseFloat(parts[3]) || (qty * price);
          newSales.push({
            dishName,
            quantitySold: qty,
            unitPrice: price,
            totalAmount: total,
          });
        }
      });
      if (newSales.length > 0) setSalesList(newSales);
    } else if (pasteTarget === 'chefOrders') {
      const newOrders: typeof chefOrdersList = [];
      lines.forEach((line, idx) => {
        const parts = line.split(/[\t,;]+/);
        if (parts.length >= 2) {
          const dishName = parts[0].trim();
          const qty = parseFloat(parts[1]) || 1;
          const ticket = parts[2]?.trim() || `TKT-${String(idx + 1).padStart(3, '0')}`;
          const chef = parts[3]?.trim() || 'Head Chef';
          newOrders.push({
            dishName,
            orderTicketNo: ticket,
            quantityProduced: qty,
            chefName: chef,
          });
        }
      });
      if (newOrders.length > 0) setChefOrdersList(newOrders);
    }

    setIsPasteModalOpen(false);
    setPastedRawText('');
  };

  // OCR Document scanner handler
  const handleOcrFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const res = await fetch('/api/scan-voucher', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64,
            mimeType: file.type || 'image/jpeg',
          }),
        });
        if (res.ok) {
          const resData = await res.json();
          if (resData.success && resData.data) {
            setOcrResult(resData.data);
          }
        }
        setOcrLoading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('OCR scan failed:', err);
      setOcrLoading(false);
    }
  };

  // Apply OCR extracted items to current step
  const handleApplyOcrItems = () => {
    if (!ocrResult || !ocrResult.items) return;

    if (activeStep === 'beginning') {
      const updated = { ...beginningMap };
      ocrResult.items.forEach((it: any) => {
        const cleanName = (it.name || '').trim().toLowerCase();
        const found = items.find((i) => i.nameAm.toLowerCase().includes(cleanName) || i.nameEn.toLowerCase().includes(cleanName));
        if (found) updated[found.id] = Number(it.quantity) || 0;
      });
      setBeginningMap(updated);
    } else if (activeStep === 'ending') {
      const updated = { ...endingMap };
      ocrResult.items.forEach((it: any) => {
        const cleanName = (it.name || '').trim().toLowerCase();
        const found = items.find((i) => i.nameAm.toLowerCase().includes(cleanName) || i.nameEn.toLowerCase().includes(cleanName));
        if (found) updated[found.id] = Number(it.quantity) || 0;
      });
      setEndingMap(updated);
    } else if (activeStep === 'sales') {
      const newItems = ocrResult.items.map((it: any) => ({
        dishName: it.name || 'Dish',
        quantitySold: Number(it.quantity) || 1,
        unitPrice: Number(it.unitPrice) || 0,
        totalAmount: Number(it.subTotal) || ((Number(it.quantity) || 1) * (Number(it.unitPrice) || 0)),
      }));
      setSalesList(newItems);
    } else if (activeStep === 'chefOrders') {
      const newOrders = ocrResult.items.map((it: any, idx: number) => ({
        dishName: it.name || 'Dish',
        orderTicketNo: ocrResult.referenceNo || `TKT-${String(idx + 1).padStart(3, '0')}`,
        quantityProduced: Number(it.quantity) || 1,
        chefName: ocrResult.signedBy || 'Chef',
      }));
      setChefOrdersList(newOrders);
    }

    setIsOcrModalOpen(false);
    setOcrResult(null);
  };

  // Save controller sheet
  const handleSaveAndReconcile = () => {
    const beginningArr = displayedItemsForCounts.map((it) => ({
      itemId: it.id,
      itemName: it.nameAm,
      quantity: beginningMap[it.id] || 0,
      unit: it.unitAm,
      unitCost: it.lastPurchasePrice || it.weightedAvgCost || 0,
    }));

    const endingArr = displayedItemsForCounts.map((it) => ({
      itemId: it.id,
      itemName: it.nameAm,
      quantity: endingMap[it.id] || 0,
      unit: it.unitAm,
    }));

    const sheet: BranchDailyControllerSheet = {
      id: `ctrl-sheet-${selectedBranchId}-${inputDate}`,
      branchId: selectedBranchId,
      branchName: currentBranch ? currentBranch.nameAm : 'ኮኮናት ቅርንጫፍ',
      date: inputDate,
      ethiopianDateStr: ethDate,
      submittedBy: controllerName,
      submittedAt: new Date().toISOString(),
      beginningInventory: beginningArr,
      cashierSales: salesList,
      endingInventory: endingArr,
      chefOrders: chefOrdersList,
    };

    const res = saveBranchDailyControllerSheet(sheet);
    if (res.success) {
      setSuccessNotice(
        language === 'am'
          ? `የ${currentBranch?.nameAm} የ${ethDate} ዕለታዊ ዳታ በተሳካ ሁኔታ ተመዝግቧል! ሪኮንሲሌሽን ዝግጁ ነው።`
          : `Daily controller sheet saved for ${currentBranch?.nameEn}. Reconciliation ready!`
      );
      setTimeout(() => setSuccessNotice(null), 5000);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner: Controller Centralized Autonomy */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-amber-950/40 p-5 rounded-3xl border border-amber-500/30 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
              {language === 'am' ? 'የኮስት ኮንትሮለር ማዕከል' : 'Cost Controller Hub'}
            </span>
            <span className="text-xs text-slate-400">
              {language === 'am' ? '🛡️ እራስገዝ የብራንች ቁጥጥር (Autonomous Isolation)' : 'Autonomous Branch Control'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <ClipboardList className="w-6 h-6 text-amber-400" />
            <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
              {language === 'am' ? 'የብራንቾች ዕለታዊ ዳታ መክተቻ እና ሪኮንሲሌሽን' : 'Branch Daily Controller Input & Reconciliation'}
            </span>
          </h1>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            {language === 'am'
              ? 'ዳታው በኮንትሮለር ብቻ ይገባል፤ ከስቶር በቀጥታ አይደመርም። በ4ቱ ቁልፍ ክፍሎች (ቢግኒንግ፣ ሽያጭ፣ ኤንዲንግ፣ የሼፍ ኦርደር) መረጃውን ያስገቡና በዋና ዋና ፕራይመሪ ማቴሪያሎች ላይ ኦዲቱን ያካሂዱ።'
              : 'Direct controller input for 4 critical vectors: Beginning Stock, POS Sales, Ending Count, and Chef Orders. Zero store auto-summing.'}
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsPrimarySelectorOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-bold transition-all shadow-md"
          >
            <Filter className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {language === 'am' ? `🎯 ፕራይመሪ ማቴሪያል ምረጥ (${selectedPrimaryItemIds.length})` : `Primary Materials (${selectedPrimaryItemIds.length})`}
            </span>
          </button>
          <button
            onClick={() => {
              setPasteTarget(activeStep === 'history' ? 'beginning' : activeStep);
              setIsPasteModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all shadow-md"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>{language === 'am' ? '📋 ከExcel ፔስት አድርግ' : 'Paste from Excel'}</span>
          </button>
          <button
            onClick={() => setIsOcrModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all shadow-md"
          >
            <Camera className="w-3.5 h-3.5 text-cyan-400" />
            <span>{language === 'am' ? '📸 የወረቀት ሰነድ ስካን' : 'Scan Voucher'}</span>
          </button>
          <button
            onClick={handleSaveAndReconcile}
            className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-amber-500/25 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>{language === 'am' ? '⚡ መዝግብ እና ሪኮንሳይል አድርግ' : 'Save & Reconcile'}</span>
          </button>
        </div>
      </div>

      {/* Success Banner */}
      {successNotice && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-500/40 rounded-2xl flex items-center justify-between text-xs text-emerald-200 animate-fadeIn shadow-xl">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-bold">{successNotice}</span>
          </div>
          {onNavigateToReconciliation && (
            <button
              onClick={() => onNavigateToReconciliation(selectedBranchId, inputDate)}
              className="flex items-center gap-1 px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-xs transition-all shadow-md"
            >
              <span>{language === 'am' ? 'የሪኮንሲሌሽን ሪፖርት እይ' : 'View Reconciliation'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Controller Parameters Control Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-900/80 p-4 rounded-2xl border border-amber-500/20 backdrop-blur-md shadow-xl">
        {/* Branch Selection */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1">
            {language === 'am' ? 'የሚሰራበት ቅርንጫፍ (Branch):' : 'Select Branch:'}
          </label>
          <div className="relative">
            <Building2 className="w-4 h-4 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-400 transition-all appearance-none cursor-pointer"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nameAm} ({b.nameEn}) - {b.code}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Selection */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1">
            {language === 'am' ? 'የስራ ቀን (Date & Ethiopian):' : 'Work Date:'}
          </label>
          <div className="relative">
            <Calendar className="w-4 h-4 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="date"
              value={inputDate}
              onChange={(e) => setInputDate(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 transition-all"
            />
          </div>
          <span className="text-[10px] text-amber-400/90 font-mono mt-0.5 block">
            {ethDate}
          </span>
        </div>

        {/* Controller Name */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 mb-1">
            {language === 'am' ? 'ዳታውን የከተተው ኮንትሮለር ስም:' : 'Controller Name:'}
          </label>
          <input
            type="text"
            value={controllerName}
            onChange={(e) => setControllerName(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-amber-400 transition-all"
          />
        </div>
      </div>

      {/* Primary Materials Indicator Strip */}
      <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-amber-500/20 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-300">
            {language === 'am' ? '🎯 ንቁ ፕራይመሪ ማቴሪያሎች:' : 'Active Primary Items:'}
          </span>
          {primaryItems.length === 0 ? (
            <span className="text-amber-400/80 italic">
              {language === 'am' ? 'ሁሉም እቃዎች ተመርጠዋል' : 'All items active'}
            </span>
          ) : (
            primaryItems.map((p) => (
              <span
                key={p.id}
                className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30"
              >
                {language === 'am' ? p.nameAm : p.nameEn}
              </span>
            ))
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPrimarySelectorOpen(true)}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-bold border border-slate-700"
          >
            {language === 'am' ? 'መምረጫውን ክፈት' : 'Open Selector'}
          </button>
        </div>
      </div>

      {/* 4 Steps Navigation Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <button
          onClick={() => setActiveStep('beginning')}
          className={`p-3 rounded-2xl border text-left transition-all ${
            activeStep === 'beginning'
              ? 'bg-amber-500/15 border-amber-500 text-white shadow-lg shadow-amber-500/10'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <div className="text-[10px] font-mono text-amber-400 font-bold">1. የመነሻ ክምችት</div>
          <div className="text-xs font-black mt-0.5">Beginning Stock</div>
        </button>

        <button
          onClick={() => setActiveStep('sales')}
          className={`p-3 rounded-2xl border text-left transition-all ${
            activeStep === 'sales'
              ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-lg shadow-emerald-500/10'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <div className="text-[10px] font-mono text-emerald-400 font-bold">2. የካሸር ሽያጭ</div>
          <div className="text-xs font-black mt-0.5">Cashier POS Sales</div>
        </button>

        <button
          onClick={() => setActiveStep('ending')}
          className={`p-3 rounded-2xl border text-left transition-all ${
            activeStep === 'ending'
              ? 'bg-cyan-500/15 border-cyan-500 text-white shadow-lg shadow-cyan-500/10'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <div className="text-[10px] font-mono text-cyan-400 font-bold">3. የቀን መጨረሻ ቆጠራ</div>
          <div className="text-xs font-black mt-0.5">Ending Inventory</div>
        </button>

        <button
          onClick={() => setActiveStep('chefOrders')}
          className={`p-3 rounded-2xl border text-left transition-all ${
            activeStep === 'chefOrders'
              ? 'bg-purple-500/15 border-purple-500 text-white shadow-lg shadow-purple-500/10'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <div className="text-[10px] font-mono text-purple-400 font-bold">4. የሼፎች ኦርደር</div>
          <div className="text-xs font-black mt-0.5">Chef Tickets</div>
        </button>

        <button
          onClick={() => setActiveStep('history')}
          className={`p-3 rounded-2xl border text-left transition-all ${
            activeStep === 'history'
              ? 'bg-blue-500/15 border-blue-500 text-white shadow-lg shadow-blue-500/10'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <div className="text-[10px] font-mono text-blue-400 font-bold">5. የተመዘገቡ ታሪክ</div>
          <div className="text-xs font-black mt-0.5">Sheet Archive</div>
        </button>
      </div>

      {/* STEP 1: BEGINNING INVENTORY */}
      {activeStep === 'beginning' && (
        <div className="bg-slate-900/80 rounded-3xl border border-amber-500/20 shadow-2xl overflow-hidden backdrop-blur-md space-y-4 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <span>📦 የቅርንጫፉ የዕለቱ መነሻ ክምችት (Beginning Inventory)</span>
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'am'
                  ? 'ለተመረጡ ፕራይመሪ ማቴሪያሎች መነሻ ክምችት ያስገቡ። ቅመማ ቅመም ሳይጨመር ስራው ቀላል ይሆናል።'
                  : 'Enter opening stock for primary staple items.'}
              </p>
            </div>
            <button
              onClick={() => {
                setPasteTarget('beginning');
                setIsPasteModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-amber-300 rounded-xl text-xs font-bold"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{language === 'am' ? 'ከExcel ኮፒ ፔስት' : 'Paste from Excel'}</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                  <th className="py-2.5 px-3">{language === 'am' ? 'ኮድ' : 'Code'}</th>
                  <th className="py-2.5 px-3">{language === 'am' ? 'የእቃ ስም' : 'Item Name'}</th>
                  <th className="py-2.5 px-3">{language === 'am' ? 'መለኪያ' : 'Unit'}</th>
                  <th className="py-2.5 px-3 text-right">{language === 'am' ? 'ነጠላ ዋጋ (ETB)' : 'Unit Cost'}</th>
                  <th className="py-2.5 px-3 text-right">{language === 'am' ? 'መነሻ ክምችት (Beginning Qty)' : 'Beginning Qty'}</th>
                  <th className="py-2.5 px-3 text-right">{language === 'am' ? 'ጠቅላላ ዋጋ (ETB)' : 'Total (ETB)'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {displayedItemsForCounts.map((item) => {
                  const qty = beginningMap[item.id] || 0;
                  const unitCost = item.lastPurchasePrice || item.weightedAvgCost || 0;
                  const total = qty * unitCost;

                  return (
                    <tr key={item.id} className="hover:bg-slate-850/50">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-amber-300 font-bold">
                        {item.code}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-white">{item.nameAm}</div>
                        <div className="text-[10px] text-slate-400">{item.nameEn}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">
                        {item.unitAm}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                        {unitCost.toLocaleString()} ETB
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={beginningMap[item.id] !== undefined ? beginningMap[item.id] : ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setBeginningMap((prev) => ({
                              ...prev,
                              [item.id]: Math.max(0, val),
                            }));
                          }}
                          placeholder="0"
                          className="w-28 px-3 py-1.5 bg-slate-950 border border-amber-500/40 rounded-xl text-right text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-400"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right font-black font-mono text-amber-300">
                        {formatCurrency(total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STEP 2: CASHIER POS SALES */}
      {activeStep === 'sales' && (
        <div className="bg-slate-900/80 rounded-3xl border border-emerald-500/20 shadow-2xl overflow-hidden backdrop-blur-md space-y-4 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <span>💳 የካሸር ሽያጭ (Cashier POS Sales Portions)</span>
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'am'
                  ? 'በካሸር የተሸጡ ምግቦችንና መጠጦችን ፖርሽን ያስገቡ። ሲስተሙ በሪሲፒው መሰረት የሚያስፈልገውን ግብአት ያሰላል።'
                  : 'Enter menu dishes sold to determine theoretical recipe ingredient usage.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setPasteTarget('sales');
                  setIsPasteModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-emerald-300 rounded-xl text-xs font-bold"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>{language === 'am' ? 'ከExcel ፔስት' : 'Paste from Excel'}</span>
              </button>
              <button
                onClick={() =>
                  setSalesList((prev) => [
                    ...prev,
                    { dishName: '', quantitySold: 1, unitPrice: 0, totalAmount: 0 },
                  ])
                }
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{language === 'am' ? 'አዲስ ሽያጭ ጨምር' : 'Add Item'}</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">{language === 'am' ? 'የምግብ / መጠጥ ስም' : 'Menu Dish Name'}</th>
                  <th className="py-2.5 px-3 text-right">{language === 'am' ? 'የተሸጠ ፖርሽን' : 'Sold Portions'}</th>
                  <th className="py-2.5 px-3 text-right">{language === 'am' ? 'የሽያጭ ዋጋ (ETB)' : 'Selling Price'}</th>
                  <th className="py-2.5 px-3 text-right">{language === 'am' ? 'ጠቅላላ ገቢ (ETB)' : 'Total Revenue'}</th>
                  <th className="py-2.5 px-3 text-center">{language === 'am' ? 'እርምጃ' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {salesList.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-850/50">
                    <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={item.dishName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSalesList((prev) =>
                            prev.map((s, i) => (i === idx ? { ...s, dishName: val } : s))
                          );
                        }}
                        placeholder="ለምሳሌ: ልዩ የክትፎ በቅቤ ወይም ፒዛ"
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-400"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <input
                        type="number"
                        min="1"
                        value={item.quantitySold || ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setSalesList((prev) =>
                            prev.map((s, i) =>
                              i === idx ? { ...s, quantitySold: val, totalAmount: val * s.unitPrice } : s
                            )
                          );
                        }}
                        className="w-20 px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-right text-xs font-mono font-bold text-emerald-300 focus:outline-none focus:border-emerald-400"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <input
                        type="number"
                        min="0"
                        value={item.unitPrice || ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setSalesList((prev) =>
                            prev.map((s, i) =>
                              i === idx ? { ...s, unitPrice: val, totalAmount: s.quantitySold * val } : s
                            )
                          );
                        }}
                        className="w-24 px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-right text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-400"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right font-black font-mono text-emerald-400">
                      {formatCurrency(item.totalAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => setSalesList((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-slate-950/80 rounded-2xl border border-emerald-500/20 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              {language === 'am' ? 'ጠቅላላ የተሸጡ አይነቶች:' : 'Total Items:'}{' '}
              <strong className="text-white">{salesList.length}</strong>
            </span>
            <span className="text-slate-400">
              {language === 'am' ? 'ጠቅላላ የካሸር ሽያጭ ገቢ:' : 'Total Sales Revenue:'}{' '}
              <strong className="text-emerald-300 font-black text-sm">
                {formatCurrency(totalSalesAmount)}
              </strong>
            </span>
          </div>
        </div>
      )}

      {/* STEP 3: ENDING PHYSICAL INVENTORY */}
      {activeStep === 'ending' && (
        <div className="bg-slate-900/80 rounded-3xl border border-cyan-500/20 shadow-2xl overflow-hidden backdrop-blur-md space-y-4 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <span>📋 የቀን መጨረሻ አካላዊ ቆጠራ (Ending Physical Inventory)</span>
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'am'
                  ? 'በቀኑ መጨረሻ በቅርንጫፉ የቀረውን አካላዊ ቆጠራ ያስገቡ። ልዩነቱ ከካሸር ሽያጭ ጋር ይነጻጸራል።'
                  : 'Enter closing physical count to compute actual vs expected ingredient usage.'}
              </p>
            </div>
            <button
              onClick={() => {
                setPasteTarget('ending');
                setIsPasteModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-cyan-300 rounded-xl text-xs font-bold"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{language === 'am' ? 'ከExcel ፔስት' : 'Paste from Excel'}</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                  <th className="py-2.5 px-3">{language === 'am' ? 'እቃ' : 'Item'}</th>
                  <th className="py-2.5 px-3">{language === 'am' ? 'መለኪያ' : 'Unit'}</th>
                  <th className="py-2.5 px-3 text-right">{language === 'am' ? 'የመነሻ ክምችት' : 'Beginning'}</th>
                  <th className="py-2.5 px-3 text-right">{language === 'am' ? 'የቀን መጨረሻ ቆጠራ (Ending Count)' : 'Ending Count'}</th>
                  <th className="py-2.5 px-3 text-right">{language === 'am' ? 'የወጣው አጠቃላይ' : 'Actual Usage'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {displayedItemsForCounts.map((item) => {
                  const beg = beginningMap[item.id] || 0;
                  const ending = endingMap[item.id] || 0;
                  const actualUsed = Math.max(0, beg - ending);

                  return (
                    <tr key={item.id} className="hover:bg-slate-850/50">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-white">{item.nameAm}</div>
                        <div className="text-[10px] text-cyan-300 font-mono">{item.code}</div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">{item.unitAm}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                        {beg}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={endingMap[item.id] !== undefined ? endingMap[item.id] : ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setEndingMap((prev) => ({
                              ...prev,
                              [item.id]: Math.max(0, val),
                            }));
                          }}
                          placeholder="0"
                          className="w-28 px-3 py-1.5 bg-slate-950 border border-cyan-500/40 rounded-xl text-right text-xs font-mono font-bold text-cyan-300 focus:outline-none focus:border-cyan-400"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                        {actualUsed} {item.unitAm}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STEP 4: CHEF ORDERS / PRODUCTION TICKETS */}
      {activeStep === 'chefOrders' && (
        <div className="bg-slate-900/80 rounded-3xl border border-purple-500/20 shadow-2xl overflow-hidden backdrop-blur-md space-y-4 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <span>👨‍🍳 የሼፎች ኦርደር እና የምርት ትኬቶች (Chef Orders)</span>
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'am'
                  ? 'ሼፎች ያዘጋጇቸውን ትኬቶች ያስገቡ። ከካሸር ሽያጭ ጋር ተነጻጽሮ ያልተሸጠ ወይም ሳይመረት የተሸጠ ይለያል።'
                  : 'Enter kitchen chef production tickets to cross-match against cashier sales.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setPasteTarget('chefOrders');
                  setIsPasteModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-purple-300 rounded-xl text-xs font-bold"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>{language === 'am' ? 'ከExcel ፔስት' : 'Paste from Excel'}</span>
              </button>
              <button
                onClick={() =>
                  setChefOrdersList((prev) => [
                    ...prev,
                    { dishName: '', orderTicketNo: `TKT-${String(prev.length + 1).padStart(3, '0')}`, quantityProduced: 1, chefName: 'Head Chef' },
                  ])
                }
                className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{language === 'am' ? 'አዲስ ትኬት ጨምር' : 'Add Ticket'}</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                  <th className="py-2.5 px-3">የትኬት ቁጥር</th>
                  <th className="py-2.5 px-3">{language === 'am' ? 'የምግብ ስም' : 'Dish Name'}</th>
                  <th className="py-2.5 px-3 text-right">{language === 'am' ? 'የተመረተ ፖርሽን' : 'Portions'}</th>
                  <th className="py-2.5 px-3">{language === 'am' ? 'ያዘጋጀው ሼፍ' : 'Chef'}</th>
                  <th className="py-2.5 px-3 text-center">{language === 'am' ? 'እርምጃ' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {chefOrdersList.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-850/50">
                    <td className="py-2.5 px-3 font-mono text-purple-300 font-bold">
                      <input
                        type="text"
                        value={item.orderTicketNo}
                        onChange={(e) => {
                          const val = e.target.value;
                          setChefOrdersList((prev) =>
                            prev.map((c, i) => (i === idx ? { ...c, orderTicketNo: val } : c))
                          );
                        }}
                        className="w-24 px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-purple-300"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={item.dishName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setChefOrdersList((prev) =>
                            prev.map((c, i) => (i === idx ? { ...c, dishName: val } : c))
                          );
                        }}
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-400"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <input
                        type="number"
                        min="1"
                        value={item.quantityProduced || ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setChefOrdersList((prev) =>
                            prev.map((c, i) => (i === idx ? { ...c, quantityProduced: val } : c))
                          );
                        }}
                        className="w-20 px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-right text-xs font-mono font-bold text-purple-300 focus:outline-none focus:border-purple-400"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={item.chefName || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setChefOrdersList((prev) =>
                            prev.map((c, i) => (i === idx ? { ...c, chefName: val } : c))
                          );
                        }}
                        className="w-32 px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-300"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => setChefOrdersList((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STEP 5: HISTORY ARCHIVE */}
      {activeStep === 'history' && (
        <div className="bg-slate-900/80 rounded-3xl border border-blue-500/20 shadow-2xl overflow-hidden backdrop-blur-md p-5 sm:p-6 space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-base font-black text-white">
              {language === 'am' ? 'የቀደሙ የዕለታዊ ግቤቶች ታሪክ (Controller Sheet Archive)' : 'Controller Sheets Archive'}
            </h2>
            <p className="text-xs text-slate-400">
              {language === 'am' ? 'በኮንትሮለር የተመዘገቡ የብራንች ዕለታዊ ፎርሞች ዝርዝር' : 'Previously submitted daily controller sheets.'}
            </p>
          </div>

          {branchDailySheets.length === 0 ? (
            <div className="py-16 text-center text-slate-500 space-y-2">
              <FileText className="w-10 h-10 mx-auto text-slate-600" />
              <p>{language === 'am' ? 'እስካሁን ምንም ዕለታዊ ፎርም አልተመዘገበም' : 'No sheets recorded yet.'}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {branchDailySheets.map((s: BranchDailyControllerSheet) => (
                <div key={s.id} className="py-3.5 flex items-center justify-between gap-3 hover:bg-slate-850/40 px-3 rounded-xl">
                  <div>
                    <div className="font-bold text-white text-xs">{s.branchName}</div>
                    <div className="text-[11px] text-slate-400">
                      {s.date} ({s.ethiopianDateStr}) • {s.submittedBy}
                    </div>
                    <div className="text-[10px] text-amber-400 mt-0.5">
                      {s.beginningInventory.length} መነሻ እቃዎች • {s.cashierSales.length} ሽያጮች • {s.chefOrders.length} የሼፍ ትኬቶች
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {onNavigateToReconciliation && (
                      <button
                        onClick={() => onNavigateToReconciliation(s.branchId, s.date)}
                        className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-xs font-bold border border-amber-500/30"
                      >
                        {language === 'am' ? 'ሪኮንሲሌሽን' : 'Reconcile'}
                      </button>
                    )}
                    <button
                      onClick={() => deleteBranchDailyControllerSheet(s.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: PRIMARY MATERIALS SELECTOR (Zero Fatigue) */}
      {isPrimarySelectorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-amber-500/20 bg-slate-950/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/20 border border-amber-500/40 rounded-2xl text-amber-400">
                  <Filter className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {language === 'am' ? '🎯 ፕራይመሪ ማቴሪያል መምረጫ (Primary Material Selector)' : 'Primary Material Selector'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {language === 'am'
                      ? 'ስራው አሰልቺ እንዳይሆን ዋና ዋና እቃዎችን (ስጋ፣ ጤፍ፣ ዘይት፣ ቅቤ) ብቻ መርጠው ይቆጣጠሩ። ሽሮ፣ በርበሬና ቅመማ ቅመም ሳይካተቱ ይቀራሉ።'
                      : 'Select core primary materials to eliminate operational fatigue.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPrimarySelectorOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Selector Toolbar */}
            <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={selectAllPrimaryItems}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-xl font-bold hover:bg-slate-700"
                >
                  {language === 'am' ? 'ሁሉንም ምረጥ' : 'Select All'}
                </button>
              </div>
              <div className="text-slate-400">
                {language === 'am' ? 'የተመረጡት ብዛት:' : 'Selected:'}{' '}
                <strong className="text-amber-400">{selectedPrimaryItemIds.length}</strong> / {items.length}
              </div>
            </div>

            {/* Items Grid with Checkboxes */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {items.map((item) => {
                const isSelected = selectedPrimaryItemIds.includes(item.id);
                const isSpice = item.category === 'spices';

                return (
                  <div
                    key={item.id}
                    onClick={() => togglePrimaryItem(item.id)}
                    className={`p-3 rounded-2xl border cursor-pointer flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500 text-white shadow-md'
                        : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs flex items-center gap-1.5">
                        <span>{item.nameAm}</span>
                        {isSpice && (
                          <span className="text-[9px] px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded">
                            ቅመም
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {item.code} • {item.unitAm}
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-amber-500 border-amber-400 text-slate-950 font-bold'
                          : 'border-slate-700 bg-slate-900'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end">
              <button
                onClick={() => setIsPrimarySelectorOpen(false)}
                className="px-6 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black rounded-xl text-xs"
              >
                {language === 'am' ? 'ምርጫውን አረጋግጥ' : 'Done'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: PASTE RAW TEXT FROM EXCEL/SHEETS */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-amber-400" />
                <span>{language === 'am' ? 'ከExcel / Sheets ረድፎችን ኮፒ አድርገህ እዚህ ፔስት አድርግ' : 'Paste Table from Excel'}</span>
              </h3>
              <button onClick={() => setIsPasteModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-slate-300">
              {language === 'am'
                ? 'በExcel ውስጥ ያሉትን አምዶች (Columns) ኮፒ (Ctrl+C) በማድረግ እዚህ ሳጥን ውስጥ Ctrl+V ይበሉ። ሲስተሙ እያንዳንዱን ረድፍ አውቆ ይከፋፍለዋል።'
                : 'Copy rows directly from Excel and paste here. Tab-separated columns will be parsed automatically.'}
            </p>

            <textarea
              rows={8}
              value={pastedRawText}
              onChange={(e) => setPastedRawText(e.target.value)}
              placeholder="የእቃ ስም [Tab] መጠን [Tab] ዋጋ ..."
              className="w-full p-3 bg-slate-950 border border-slate-700 rounded-2xl text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-400"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsPasteModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
              >
                {language === 'am' ? 'ይቅር' : 'Cancel'}
              </button>
              <button
                onClick={handleApplyPastedText}
                className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-xs font-black"
              >
                {language === 'am' ? 'አስገባ እና ሙላ' : 'Apply to Table'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: DOCUMENT / PHOTO OCR SCANNER */}
      {isOcrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-cyan-500/40 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-cyan-400" />
                <span>{language === 'am' ? 'የወረቀት ሰነድ / ደረሰኝ በAI ማንበቢያ (Smart OCR)' : 'Voucher & Document OCR'}</span>
              </h3>
              <button onClick={() => setIsOcrModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-slate-300">
              {language === 'am'
                ? 'የሼፎች የእጅ ጽሁፍ ወረቀት፣ የቆጠራ ቅጽ ወይም የካሸር Z-ሪፖርት ፎቶ አንስተው እዚህ ይጫኑ። አርቴፊሻል ኢንተለጀንስ (Gemini) ሰርስሮ ያወጣዋል።'
                : 'Upload photo of handwritten kitchen slip or cashier Z-report. Gemini AI will extract items.'}
            </p>

            <div className="border-2 border-dashed border-cyan-500/40 rounded-2xl p-6 text-center bg-slate-950/50">
              <input
                type="file"
                accept="image/*"
                onChange={handleOcrFileUpload}
                className="hidden"
                id="ocr-file-input"
              />
              <label
                htmlFor="ocr-file-input"
                className="cursor-pointer flex flex-col items-center justify-center gap-2 text-cyan-400 hover:text-cyan-300"
              >
                <Camera className="w-8 h-8" />
                <span className="text-xs font-bold">
                  {ocrLoading ? 'ሰነዱ እየተነበበ ነው... (Scanning)' : 'ፎቶ ምረጥ ወይም ካሜራ ክፈት'}
                </span>
              </label>
            </div>

            {ocrResult && (
              <div className="p-4 bg-slate-950 rounded-2xl border border-cyan-500/30 text-xs space-y-2">
                <div className="font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>የተገኘ ሰነድ: {ocrResult.documentTypeAm || ocrResult.documentType}</span>
                </div>
                <div className="text-slate-300">{ocrResult.summaryAmharic}</div>
                <div className="text-[11px] text-cyan-400">
                  {ocrResult.items?.length || 0} እቃዎች ተለይተዋል
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsOcrModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
              >
                {language === 'am' ? 'ዝጋ' : 'Close'}
              </button>
              {ocrResult && (
                <button
                  onClick={handleApplyOcrItems}
                  className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl text-xs font-black"
                >
                  {language === 'am' ? 'ወደ ፎርሙ አስገባ' : 'Apply to Sheet'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

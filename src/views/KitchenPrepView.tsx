import React, { useState, useMemo } from 'react';
import {
  ChefHat,
  CookingPot,
  PlusCircle,
  Layers,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
  Trash2,
  Edit2,
  Download,
  Printer,
  Scale,
  DollarSign,
  UtensilsCrossed,
  Info,
  Clock,
  History,
  BookOpen,
  Search,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { DatePickerField } from '../components/common/DatePickerField';
import { SmartItemSelector } from '../components/common/SmartItemSelector';
import { VoiceControlBar } from '../components/common/VoiceControlBar';
import { ParsedVoiceCommand } from '../hooks/useVoiceInput';
import { getTodayDateString, formatEthiopianDate } from '../utils/ethiopianDate';
import { KitchenPrepItem, KitchenPrepBatch, KitchenPrepIngredient } from '../types';

export const KitchenPrepView: React.FC = () => {
  const {
    branches,
    items,
    kitchenPrepItems,
    kitchenPrepBatches,
    saveKitchenPrepItem,
    deleteKitchenPrepItem,
    recordKitchenPrepProduction,
    deleteKitchenPrepBatch,
    getBranchStockBalance,
  } = useApp();
  const { language, formatCurrency } = useLanguage();

  const [activeTab, setActiveTab] = useState<'produce' | 'formulas' | 'history'>('produce');
  const [selectedBranchId, setSelectedBranchId] = useState<string>(branches[0]?.id || '');
  const [date, setDate] = useState<string>(getTodayDateString());

  // Production Form State
  const [selectedPrepId, setSelectedPrepId] = useState<string>(kitchenPrepItems[0]?.id || '');
  const [prepSearchQuery, setPrepSearchQuery] = useState<string>('');
  const [quantityToProduce, setQuantityToProduce] = useState<number | ''>(5);
  const [prepNotes, setPrepNotes] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Formula Modal / Form State
  const [isFormulaModalOpen, setIsFormulaModalOpen] = useState(false);
  const [isEditingFormula, setIsEditingFormula] = useState(false);
  const [editingFormulaId, setEditingFormulaId] = useState<string | null>(null);
  const [formulaNameAm, setFormulaNameAm] = useState('');
  const [formulaNameEn, setFormulaNameEn] = useState('');
  const [formulaCategory, setFormulaCategory] = useState<KitchenPrepItem['category']>('sauce');
  const [formulaOutputUnit, setFormulaOutputUnit] = useState('kg');
  const [formulaOutputUnitAm, setFormulaOutputUnitAm] = useState('ኪ.ግ');
  const [formulaBatchYield, setFormulaBatchYield] = useState<number>(1);
  const [formulaNotes, setFormulaNotes] = useState('');
  const [formulaIngredients, setFormulaIngredients] = useState<KitchenPrepIngredient[]>([]);

  // Filter prep items for the current branch and search query
  const branchPrepItems = useMemo(() => {
    const list = kitchenPrepItems.filter(
      (p) => !p.branchId || p.branchId === 'all' || p.branchId === selectedBranchId
    );
    const q = prepSearchQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter(
      (p) => p.nameAm.toLowerCase().includes(q) || p.nameEn.toLowerCase().includes(q)
    );
  }, [kitchenPrepItems, selectedBranchId, prepSearchQuery]);

  const currentPrep = kitchenPrepItems.find((p) => p.id === selectedPrepId) || branchPrepItems[0];
  const currentBranch = branches.find((b) => b.id === selectedBranchId) || branches[0];

  // Calculate live deduction preview
  const deductionPreview = useMemo(() => {
    if (!currentPrep || !quantityToProduce || quantityToProduce <= 0) return [];

    const ratio = Number(quantityToProduce) / (currentPrep.batchYield || 1);
    return currentPrep.ingredients.map((ing) => {
      const item = items.find((i) => i.id === ing.itemId);
      const needed = Number((ing.quantity * ratio).toFixed(3));
      const inStock = selectedBranchId && item ? getBranchStockBalance(selectedBranchId, item.id) : 0;
      const unitCost = item?.weightedAvgCost || item?.lastPurchasePrice || 0;
      const subTotal = Number((needed * unitCost).toFixed(2));
      const hasEnough = inStock >= needed;

      return {
        item,
        needed,
        inStock,
        unitCost,
        subTotal,
        hasEnough,
      };
    });
  }, [currentPrep, quantityToProduce, selectedBranchId, items, getBranchStockBalance]);

  const totalBatchCost = deductionPreview.reduce((sum, d) => sum + d.subTotal, 0);

  const handleProduceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId || !currentPrep || !quantityToProduce || quantityToProduce <= 0) {
      setErrorMsg(language === 'am' ? 'እባክዎ ትክክለኛ መጠን ያስገቡ' : 'Please enter a valid quantity');
      return;
    }

    const res = recordKitchenPrepProduction({
      branchId: selectedBranchId,
      prepItemId: currentPrep.id,
      quantityProduced: Number(quantityToProduce),
      date,
      notes: prepNotes,
    });

    if (res.success) {
      setSuccessMsg(
        language === 'am'
          ? `የ${currentPrep.nameAm} ዝግጅት (${quantityToProduce} ${currentPrep.outputUnitAm}) በተሳካ ሁኔታ ተመዝግቧል! ጥሬ ዕቃዎቹ ከስቶር ተቀንሰዋል።`
          : `Batch produced successfully! Raw ingredients deducted from store.`
      );
      setPrepNotes('');
      setTimeout(() => setSuccessMsg(null), 5000);
    } else {
      setErrorMsg(res.error || 'Failed to record prep production');
      setTimeout(() => setErrorMsg(null), 5000);
    }
  };

  const handleVoiceCommand = (cmd: ParsedVoiceCommand) => {
    if (cmd.quantity === undefined) return;

    // Check if user spoke a prep item name (e.g. Bolognese, Pesto, Burger Patty)
    const lower = cmd.rawText.toLowerCase();
    const matched = kitchenPrepItems.find(
      (p) =>
        lower.includes(p.nameAm.toLowerCase()) ||
        lower.includes(p.nameEn.toLowerCase()) ||
        (cmd.matchedDishName && lower.includes(cmd.matchedDishName.toLowerCase()))
    );

    if (matched) {
      setSelectedPrepId(matched.id);
      setQuantityToProduce(cmd.quantity);
      setSuccessMsg(
        language === 'am'
          ? `በድምጽ ተቀብሏል፦ ${matched.nameAm} (${cmd.quantity} ${matched.outputUnitAm})`
          : `Voice selected: ${matched.nameEn} (${cmd.quantity})`
      );
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  // Open modal to add or edit formula
  const openFormulaModal = (item?: KitchenPrepItem) => {
    if (item) {
      setIsEditingFormula(true);
      setEditingFormulaId(item.id);
      setFormulaNameAm(item.nameAm);
      setFormulaNameEn(item.nameEn);
      setFormulaCategory(item.category);
      setFormulaOutputUnit(item.outputUnit);
      setFormulaOutputUnitAm(item.outputUnitAm);
      setFormulaBatchYield(item.batchYield);
      setFormulaNotes(item.preparationNotes || '');
      setFormulaIngredients([...item.ingredients]);
    } else {
      setIsEditingFormula(false);
      setEditingFormulaId(null);
      setFormulaNameAm('');
      setFormulaNameEn('');
      setFormulaCategory('sauce');
      setFormulaOutputUnit('kg');
      setFormulaOutputUnitAm('ኪ.ግ');
      setFormulaBatchYield(1);
      setFormulaNotes('');
      setFormulaIngredients(
        items.length > 0 ? [{ itemId: items[0]?.id || '', quantity: 1 }] : []
      );
    }
    setIsFormulaModalOpen(true);
  };

  const closeFormulaModal = () => {
    setIsFormulaModalOpen(false);
    setEditingFormulaId(null);
  };

  const handleSaveFormula = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formulaNameAm.trim() || formulaIngredients.length === 0) return;

    const itemToSave: KitchenPrepItem = {
      id: editingFormulaId || `prep-${Date.now()}`,
      branchId: selectedBranchId || 'all',
      nameAm: formulaNameAm.trim(),
      nameEn: formulaNameEn.trim() || formulaNameAm.trim(),
      category: formulaCategory,
      outputUnit: formulaOutputUnit,
      outputUnitAm: formulaOutputUnitAm,
      batchYield: formulaBatchYield || 1,
      ingredients: formulaIngredients.filter((i) => i.itemId && i.quantity > 0),
      preparationNotes: formulaNotes.trim(),
      isActive: true,
    };

    saveKitchenPrepItem(itemToSave);
    setSelectedPrepId(itemToSave.id);
    closeFormulaModal();
    setSuccessMsg(
      language === 'am'
        ? `የ"${itemToSave.nameAm}" ፎርሙላ በተሳካ ሁኔታ ተቀምጧል! አሁን በቀጥታ ማዘጋጀት ይችላሉ።`
        : `Formula "${itemToSave.nameEn}" saved successfully!`
    );
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  const handleAddFormulaIngredient = () => {
    setFormulaIngredients((prev) => [
      ...prev,
      { itemId: items[0]?.id || '', quantity: 0.1 },
    ]);
  };

  const handleRemoveFormulaIngredient = (idx: number) => {
    setFormulaIngredients((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateFormulaIngredient = (
    idx: number,
    field: 'itemId' | 'quantity',
    val: any
  ) => {
    setFormulaIngredients((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: val };
      return updated;
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn text-slate-100">
      {/* Top Banner Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900 border border-amber-500/30 shadow-2xl relative overflow-hidden">
        <div className="space-y-1.5 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
            <CookingPot className="w-3.5 h-3.5 text-amber-400" />
            <span>{language === 'am' ? 'የኩሽና ቅድመ-ዝግጅት እና የሶሶች ማምረቻ' : 'Kitchen Prep & Sub-Recipe Production'}</span>
            <span>•</span>
            <span className="text-emerald-400">Auto-Deducts Raw Materials from Store</span>
          </div>

          <h1 className="text-xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <ChefHat className="w-8 h-8 text-amber-400" />
            <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
              {language === 'am' ? 'የሶስ፣ የፓቲ እና የቅድመ-ዝግጅት ቁጥጥር' : 'Sauce, Patty & Kitchen Prep Control'}
            </span>
          </h1>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            {language === 'am'
              ? 'ቦሎኛይስ፣ ፔስቶ፣ ዛፈራኖ፣ ቶማቶ ሶስ እንዲሁም የበርገር ፓቲና የፒዛ ስጋ ሲዘጋጁ፣ ሲስተሙ በሪሲፒው መሰረት ስጋ፣ ቲማቲም፣ ዘይትና ቅመሞችን ከስቶር በራሱ ቀንሶ ያዘጋጃል።'
              : 'Prepare sauces and burger patties in batches. System automatically calculates and deducts raw meat, tomatoes, oil, and spices from stock.'}
          </p>
        </div>

        {/* Global Tab Toggles */}
        <div className="flex flex-wrap items-center gap-2.5 relative z-10 shrink-0">
          <button
            onClick={() => setActiveTab('produce')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'produce'
                ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black shadow-lg shadow-amber-500/20'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <CookingPot className="w-4 h-4" />
            <span>{language === 'am' ? '🍲 የዛሬ ዝግጅት አምርት' : 'Produce Batch'}</span>
          </button>

          <button
            onClick={() => setActiveTab('formulas')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'formulas'
                ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black shadow-lg shadow-amber-500/20'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>{language === 'am' ? '📋 የሶስ/የፓቲ ፎርሙላዎች' : 'Formulas (Sub-Recipes)'}</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black shadow-lg shadow-amber-500/20'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>{language === 'am' ? '📜 የተዘጋጁበት ታሪክ' : 'Production Log'}</span>
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

        {/* Date Selector */}
        <div className="w-44">
          <DatePickerField value={date} onChange={setDate} />
        </div>
      </div>

      {/* Voice Assistant */}
      <VoiceControlBar
        onApplyVoiceCommand={handleVoiceCommand}
        availableDishes={kitchenPrepItems.map((p) => ({
          id: p.id,
          nameAm: p.nameAm,
          nameEn: p.nameEn,
        }))}
      />

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fadeIn shadow-xl">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs font-bold flex items-center gap-2 animate-fadeIn shadow-xl">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* TAB 1: PRODUCE BATCH & AUTO-DEDUCT */}
      {activeTab === 'produce' && (
        kitchenPrepItems.length === 0 ? (
          <div className="p-8 sm:p-12 rounded-3xl bg-slate-900 border border-amber-500/30 shadow-2xl text-center space-y-6 max-w-2xl mx-auto my-6 animate-fadeIn">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-xl">
              <CookingPot className="w-10 h-10" />
            </div>
            <div className="space-y-2.5">
              <h3 className="text-xl font-black text-amber-300">
                {language === 'am' ? 'ምንም አይነት የተመዘገበ የሶስ ወይም የቅድመ-ዝግጅት ፎርሙላ የለም' : 'No Sub-Recipe Formulas Registered Yet'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-lg mx-auto">
                {language === 'am'
                  ? 'እንደ ማዮኔዝ፣ ቦሎኛይስ፣ ዛፋራኖ ሶስ፣ ወይም የበርገር ፓቲ ያሉ የራስዎትን ሶሶች በራስዎ የመለኪያ እና የጥሬ ዕቃ ፎርሙላ እዚህ ይመዝግቡ። አንዴ ሲመዘግቡ በቀጥታ በ 1 ክሊክ ማምረት እና ከስቶር በራስ-ሰር መቀነስ ይችላሉ።'
                  : 'Register your custom sauces, patties, or preps with your own measurements and ingredient deduction formulas.'}
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => openFormulaModal()}
                className="px-6 py-3.5 rounded-2xl font-black text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 shadow-xl shadow-amber-500/25 ring-2 ring-amber-300/60 transition-all inline-flex items-center gap-2.5 cursor-pointer"
              >
                <PlusCircle className="w-5 h-5 text-slate-950" />
                <span>{language === 'am' ? '➕ የራስዎን አዲስ የሶስ/የዝግጅት ፎርሙላ እዚህ ይመዝግቡ' : '➕ Register Your First Custom Formula'}</span>
              </button>
            </div>
          </div>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Fast Production Form */}
          <div className="lg:col-span-5 p-6 rounded-3xl bg-slate-900 border border-amber-500/30 shadow-2xl space-y-5">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-amber-300 flex items-center gap-2">
                <CookingPot className="w-5 h-5 text-amber-400" />
                <span>{language === 'am' ? 'የዛሬ ባች ማምረቻ' : 'Batch Production'}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {language === 'am'
                  ? 'የተመረተውን መጠን ያስገቡ፤ ሲስተሙ በራሱ ጥሬ ዕቃዎችን ከስቶር ይቀንሳል'
                  : 'Enter quantity prepared to automatically deduct raw ingredients'}
              </p>
            </div>

            <form onSubmit={handleProduceSubmit} className="space-y-4">
              {/* Select Prep Item */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-amber-300">
                    {language === 'am' ? 'የሚዘጋጀው ሶስ ወይም ፓቲ ይምረጡ' : 'Select Prep Item'} <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">
                    ({branchPrepItems.length} {language === 'am' ? 'ዝግጅቶች' : 'preps'})
                  </span>
                </div>

                {/* Instant Search Bar */}
                <div className="relative flex items-center mb-2.5">
                  <Search className="w-3.5 h-3.5 text-amber-400 absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    value={prepSearchQuery}
                    onChange={(e) => setPrepSearchQuery(e.target.value)}
                    placeholder={language === 'am' ? 'ማዮኔዝ፣ ቦሎኛይስ፣ ፓቲ፣ ፒዛ ስጋ... ፈልግ' : 'Search Mayonnaise, Bolognese, Patty, Meat...'}
                    className="w-full pl-8 pr-8 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50"
                  />
                  {prepSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setPrepSearchQuery('')}
                      className="absolute right-2.5 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1">
                  {branchPrepItems.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-2xl">
                      {language === 'am' ? 'ምንም አይነት የተዘጋጀ ሶስ አልተገኘም' : 'No prep item found'}
                    </div>
                  ) : (
                    branchPrepItems.map((prep) => {
                    const isSelected = prep.id === selectedPrepId;
                    return (
                      <button
                        type="button"
                        key={prep.id}
                        onClick={() => setSelectedPrepId(prep.id)}
                        className={`p-3 rounded-2xl text-left border transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/40 border-amber-400 shadow-md ring-1 ring-amber-400/50'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${isSelected ? 'bg-amber-400 text-slate-950' : 'bg-slate-900 text-amber-400'}`}>
                            <ChefHat className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-xs text-white">
                              {language === 'am' ? prep.nameAm : prep.nameEn}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              መነሻ ፎርሙላ: {prep.batchYield} {prep.outputUnitAm} • {prep.ingredients.length} ጥሬ ዕቃዎች
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                        )}
                      </button>
                    );
                  }))}
                </div>
              </div>

              {/* Quantity to Produce */}
              {currentPrep && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-300">
                      {language === 'am' ? 'የተዘጋጀው መጠን' : 'Quantity Produced'} ({currentPrep.outputUnitAm})
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      መለኪያ: {currentPrep.outputUnitAm}
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      required
                      placeholder="0.0"
                      value={quantityToProduce}
                      onChange={(e) => setQuantityToProduce(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="w-full px-4 py-3 bg-slate-900 border border-amber-500/40 rounded-xl text-base text-amber-300 font-mono font-black focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/40"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">
                      {currentPrep.outputUnitAm}
                    </span>
                  </div>

                  {/* Fast Quick Buttons */}
                  <div className="flex items-center gap-1.5 pt-1">
                    {[1, 2, 5, 10, 20, 50].map((num) => (
                      <button
                        type="button"
                        key={num}
                        onClick={() => setQuantityToProduce(num)}
                        className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-300 transition-colors"
                      >
                        +{num} {currentPrep.outputUnitAm}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  {language === 'am' ? 'ማስታወሻ (አማራጭ)' : 'Notes (Optional)'}
                </label>
                <input
                  type="text"
                  placeholder={language === 'am' ? 'ለምሳሌ፡ ለዛሬው ምሽት የተዘጋጀ...' : 'e.g. Prepared for dinner shift...'}
                  value={prepNotes}
                  onChange={(e) => setPrepNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!currentPrep || !quantityToProduce || quantityToProduce <= 0}
                className="w-full py-3.5 px-6 rounded-2xl font-black text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 shadow-xl shadow-amber-500/25 ring-2 ring-amber-300/60 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <CookingPot className="w-5 h-5 text-slate-950" />
                <span>
                  {language === 'am'
                    ? `🍲 ${quantityToProduce || 0} ${currentPrep?.outputUnitAm || ''} ${currentPrep?.nameAm || ''} አዘጋጅና ከስቶር ቀንስ`
                    : `Produce & Auto-Deduct ${quantityToProduce || 0} ${currentPrep?.outputUnitAm || ''}`}
                </span>
              </button>
            </form>
          </div>

          {/* Right Column: Live Deduction Breakdown & Stock Health */}
          <div className="lg:col-span-7 space-y-5">
            <div className="p-6 rounded-3xl bg-slate-900 border border-amber-500/30 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-400 flex items-center gap-2">
                    <Scale className="w-5 h-5 text-amber-400" />
                    <span>{language === 'am' ? 'ከስቶር የሚቀነሱ ጥሬ ዕቃዎች ዝርዝር (Live Deduction)' : 'Live Raw Materials Deduction'}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {language === 'am'
                      ? `ይህንን ${quantityToProduce || 0} ${currentPrep?.outputUnitAm} ${currentPrep?.nameAm} ለማዘጋጀት ከ${currentBranch.nameAm} ስቶር በቅጽበት የሚቀነሰው፦`
                      : `Exact raw materials to be deducted upon production:`}
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">
                    {language === 'am' ? 'የማዘጋጃ ጠቅላላ ወጪ' : 'Total Batch Cost'}
                  </div>
                  <div className="text-lg font-black text-emerald-400 font-mono">
                    {formatCurrency(totalBatchCost)}
                  </div>
                </div>
              </div>

              {deductionPreview.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 bg-slate-950 rounded-2xl border border-dashed border-slate-800">
                  {language === 'am' ? 'የሚዘጋጀውን ሶስ እና መጠን ይምረጡ' : 'Select prep item and quantity to preview'}
                </div>
              ) : (
                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-[11px] font-bold uppercase tracking-wider bg-slate-950/60">
                        <th className="py-2.5 px-3">{language === 'am' ? 'ጥሬ ዕቃ' : 'Material'}</th>
                        <th className="py-2.5 px-3 text-center">{language === 'am' ? 'የሚቀነሰው መጠን' : 'To Deduct'}</th>
                        <th className="py-2.5 px-3 text-center">{language === 'am' ? 'በስቶር ያለው' : 'In Stock'}</th>
                        <th className="py-2.5 px-3 text-right">{language === 'am' ? 'የአንዱ ዋጋ' : 'Unit Cost'}</th>
                        <th className="py-2.5 px-3 text-right">{language === 'am' ? 'ጠቅላላ ዋጋ' : 'Total Cost'}</th>
                        <th className="py-2.5 px-3 text-center">{language === 'am' ? 'ሁኔታ' : 'Status'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {deductionPreview.map((d, idx) => (
                        <tr key={idx} className="hover:bg-slate-950/50 transition-colors">
                          <td className="py-3 px-3 font-bold text-white">
                            <div>{language === 'am' ? d.item?.nameAm : d.item?.nameEn}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{d.item?.code}</div>
                          </td>

                          <td className="py-3 px-3 text-center font-mono font-black text-amber-400">
                            -{d.needed} {d.item?.unitAm}
                          </td>

                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-300">
                            {d.inStock} {d.item?.unitAm}
                          </td>

                          <td className="py-3 px-3 text-right font-mono text-slate-400">
                            {formatCurrency(d.unitCost)}
                          </td>

                          <td className="py-3 px-3 text-right font-mono font-black text-emerald-400">
                            {formatCurrency(d.subTotal)}
                          </td>

                          <td className="py-3 px-3 text-center">
                            {d.hasEnough ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                <span>በቂ ስቶክ አለ</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px] border border-amber-500/30">
                                <AlertTriangle className="w-3 h-3 text-amber-400" />
                                <span>አነስተኛ ክምችት</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* How it works info */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/20 via-slate-950 to-slate-950 border border-amber-500/20 text-xs text-slate-300 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <span className="font-bold text-amber-300">ስማርት ማቀናነስ፦</span>{' '}
                  {language === 'am'
                    ? 'ይህ ዝግጅት እንደተመዘገበ በቅርንጫፉ ሌጀር ላይ እንደ ወጪ (KITCHEN_USAGE) በቀጥታ ይቀናነሳል። ማታ ሪኮንሲሌሽን ላይ ደግሞ የተሸጠው ምግብ ይህንን ሶስ ምን ያህል እንደተጠቀመ በራሱ ያነጻጽራል!'
                    : 'Recorded production auto-deducts raw items from branch ledger and feeds directly into evening reconciliation.'}
                </p>
              </div>
            </div>
          </div>
        </div>
        )
      )}

      {/* TAB 2: FORMULAS / SUB-RECIPES */}
      {activeTab === 'formulas' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-amber-300 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-400" />
                <span>{language === 'am' ? 'የሶስ፣ የፓቲ እና የቅድመ-ዝግጅት ፎርሙላዎች' : 'Sub-Recipe Formulas'}</span>
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'am'
                  ? 'ለ 1 ኪሎ ወይም ለ 1 ሊትር ሶስ/ፓቲ የሚያስፈልጉ የጥሬ ዕቃዎች መስፈሪያ ሪሲፒዎች'
                  : 'Ingredient requirements defined per 1 kg or unit batch yield'}
              </p>
            </div>

            <button
              onClick={() => openFormulaModal()}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 shadow-md flex items-center gap-1.5 transition-all"
            >
              <PlusCircle className="w-4 h-4 text-slate-950" />
              <span>{language === 'am' ? 'አዲስ ፎርሙላ መዝግብ' : 'Add New Formula'}</span>
            </button>
          </div>

          {kitchenPrepItems.length === 0 ? (
            <div className="p-8 sm:p-12 rounded-3xl bg-slate-900 border border-amber-500/30 shadow-2xl text-center space-y-6 max-w-2xl mx-auto my-6 animate-fadeIn">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-xl">
                <BookOpen className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-amber-300">
                  {language === 'am' ? 'እስካሁን ምንም ፎርሙላ አልተመዘገበም' : 'No Formulas Registered Yet'}
                </h3>
                <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                  {language === 'am'
                    ? 'አዲስ የሶስ ወይም የፓቲ ስም በመስጠት፣ የሚፈለገውን የመነሻ ምርት መጠን (Batch Yield) እና የሚቀነሱ ጥሬ ዕቃዎችን እዚህ ያዋቅሩ።'
                    : 'Create your custom sub-recipe formula with your target yield and deduction quantities.'}
                </p>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => openFormulaModal()}
                  className="px-5 py-3 rounded-2xl font-black text-xs text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 shadow-xl ring-2 ring-amber-300/60 transition-all inline-flex items-center gap-2 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4 text-slate-950" />
                  <span>{language === 'am' ? '➕ አዲስ ፎርሙላ መዝግብ' : 'Add New Formula'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {kitchenPrepItems.map((prep) => {
                // Calculate estimated cost per batch yield
                const estimatedCost = prep.ingredients.reduce((sum, ing) => {
                  const item = items.find((i) => i.id === ing.itemId);
                  const cost = item?.weightedAvgCost || item?.lastPurchasePrice || 0;
                  return sum + ing.quantity * cost;
                }, 0);

                const costPerUnit = prep.batchYield > 0 ? estimatedCost / prep.batchYield : estimatedCost;

                return (
                  <div
                    key={prep.id}
                    className="p-5 rounded-3xl bg-slate-900 border border-amber-500/30 hover:border-amber-400/60 shadow-xl transition-all space-y-3.5 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-slate-950 text-amber-400 border border-slate-800">
                          {prep.category.toUpperCase()}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openFormulaModal(prep)}
                            className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                            title="Edit formula"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(language === 'am' ? 'ይህንን የሶስ ፎርሙላ መሰረዝ ይፈልጋሉ?' : 'Delete this formula?')) {
                                deleteKitchenPrepItem(prep.id);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Delete formula"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <h4 className="text-sm font-black text-white">
                        {language === 'am' ? prep.nameAm : prep.nameEn}
                      </h4>
                      {prep.preparationNotes && (
                        <p className="text-[11px] text-slate-400 line-clamp-2">
                          {prep.preparationNotes}
                        </p>
                      )}

                      <div className="pt-2 border-t border-slate-800/80 space-y-1">
                        <div className="text-[11px] font-bold text-amber-300">
                          ግብአቶች (ለ {prep.batchYield} {prep.outputUnitAm})፦
                        </div>
                        <div className="space-y-1">
                          {prep.ingredients.map((ing, i) => {
                            const item = items.find((it) => it.id === ing.itemId);
                            return (
                              <div key={i} className="flex items-center justify-between text-xs text-slate-300">
                                <span>• {item ? (language === 'am' ? item.nameAm : item.nameEn) : ing.itemId}</span>
                                <span className="font-mono font-bold text-amber-400">
                                  {ing.quantity} {item?.unitAm || ''}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">{language === 'am' ? 'የ1 አሃድ ማዘጋጃ ወጪ' : 'Cost per unit'}</span>
                        <span className="font-black text-emerald-400 font-mono text-sm">
                          {formatCurrency(costPerUnit)} / {prep.outputUnitAm}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedPrepId(prep.id);
                          setActiveTab('produce');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-bold transition-all cursor-pointer"
                      >
                        {language === 'am' ? 'አሁን አዘጋጅ' : 'Produce'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: HISTORY & PRODUCTION LOG */}
      {activeTab === 'history' && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-amber-500/30 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-black text-amber-300 flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" />
                <span>{language === 'am' ? 'የተዘጋጁ ሶሶችና ፓቲዎች ታሪክ' : 'Production Batch History'}</span>
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'am'
                  ? 'የተመረቱት ሶሶች እና ከስቶር የተቆረጡት ጥሬ ዕቃዎች ኦዲት ማህደር'
                  : 'Audit trail of produced batches and deducted store items'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-950 text-slate-300 hover:text-white border border-slate-800 flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{language === 'am' ? 'ፕሪንት' : 'Print'}</span>
              </button>
            </div>
          </div>

          {kitchenPrepBatches.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 bg-slate-950 rounded-2xl border border-dashed border-slate-800">
              {language === 'am' ? 'እስካሁን የተመዘገበ የዝግጅት ታሪክ የለም' : 'No batches produced yet'}
            </div>
          ) : (
            <div className="space-y-3">
              {kitchenPrepBatches.map((batch) => {
                const br = branches.find((b) => b.id === batch.branchId);
                return (
                  <div
                    key={batch.id}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 transition-all space-y-2.5 text-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/60 pb-2">
                      <div className="flex items-center gap-2.5">
                        <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                          <CookingPot className="w-4 h-4" />
                        </span>
                        <div>
                          <div className="font-bold text-white text-sm">
                            {batch.quantityProduced} {batch.outputUnitAm} {language === 'am' ? batch.prepItemNameAm : batch.prepItemNameEn}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {br ? br.nameAm : batch.branchId} • {batch.date} ({batch.ethiopianDateStr})
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">{language === 'am' ? 'የማዘጋጃ ወጪ' : 'Production Cost'}</span>
                          <span className="font-mono font-black text-emerald-400 text-sm">
                            {formatCurrency(batch.totalCostETB)}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            if (window.confirm(language === 'am' ? 'ይህንን የዝግጅት መዝገብ መሰረዝ ይፈልጋሉ?' : 'Delete this batch record?')) {
                              deleteKitchenPrepBatch(batch.id);
                            }
                          }}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-900 transition-colors"
                          title="Delete record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Deducted Items list */}
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {language === 'am' ? 'ከስቶር የተቆረጡ ጥሬ ዕቃዎች፦' : 'Deducted Raw Items:'}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {batch.deductedItems.map((it, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-xl bg-slate-900 text-slate-300 text-[11px] border border-slate-800 font-mono"
                          >
                            {it.itemNameAm}: <strong className="text-amber-400">-{it.quantityDeducted} {it.unitAm}</strong> ({formatCurrency(it.subTotalCost)})
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Global Formula Add/Edit Modal */}
      {isFormulaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-amber-500/40 text-slate-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-amber-500/20 bg-slate-950">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-400" />
                <span>{isEditingFormula ? (language === 'am' ? 'የሶስ/የፓቲ ፎርሙላ ማስተካከያ' : 'Edit Formula') : (language === 'am' ? 'አዲስ የሶስ/የፓቲ ፎርሙላ መመዝገቢያ' : 'New Formula')}</span>
              </h3>
              <button
                type="button"
                onClick={closeFormulaModal}
                className="text-slate-400 hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveFormula} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1">
                  {language === 'am' ? 'የሶስ/የዝግጅት እቃ ስም (በአማርኛ)' : 'Formula Name (Amharic)'} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ለምሳሌ፡ ማዮኔዝ፣ ቦሎኛይስ ሶስ፣ ዛፋራኖ፣ የበርገር ፓቲ..."
                  value={formulaNameAm}
                  onChange={(e) => setFormulaNameAm(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1">
                  {language === 'am' ? 'የሶስ ስም (በእንግሊዝኛ)' : 'Formula Name (English)'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mayonnaise, Bolognese Sauce, Burger Patty..."
                  value={formulaNameEn}
                  onChange={(e) => setFormulaNameEn(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-amber-300 mb-1">
                    {language === 'am' ? 'ምድብ' : 'Category'}
                  </label>
                  <select
                    value={formulaCategory}
                    onChange={(e) => setFormulaCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="sauce">ሶስ (Sauce)</option>
                    <option value="patty">የበርገር ፓቲ (Burger Patty)</option>
                    <option value="meat_prep">የተቀመመ ስጋ (Meat Prep)</option>
                    <option value="dressing">ድሬሲንግ (Dressing)</option>
                    <option value="bakery">ቂጣ / ዳቦ (Bakery/Bun)</option>
                    <option value="other">ሌላ (Other)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-300 mb-1">
                    {language === 'am' ? 'የውጤት መለኪያ' : 'Output Unit'}
                  </label>
                  <div className="flex gap-1.5">
                    <select
                      value={formulaOutputUnitAm}
                      onChange={(e) => {
                        setFormulaOutputUnitAm(e.target.value);
                        setFormulaOutputUnit(e.target.value === 'ፍሬ' ? 'pcs' : e.target.value === 'ሊትር' ? 'liter' : 'kg');
                      }}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="ኪ.ግ">ኪ.ግ (kg)</option>
                      <option value="ሊትር">ሊትር (liter)</option>
                      <option value="ፍሬ">ፍሬ (pcs)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Batch Yield */}
              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1">
                  {language === 'am' ? 'የመነሻ ባች ብዛት (Batch Yield)' : 'Base Yield'}
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.1"
                  required
                  value={formulaBatchYield}
                  onChange={(e) => setFormulaBatchYield(parseFloat(e.target.value) || 1)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono"
                />
                <span className="text-[10px] text-slate-400">
                  የሚቀጥሉት ጥሬ ዕቃዎች ለ {formulaBatchYield} {formulaOutputUnitAm} የሚዘጋጁ ናቸው።
                </span>
              </div>

              {/* Ingredients List */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300">
                    {language === 'am' ? 'የሚያስፈልጉ ጥሬ ዕቃዎች' : 'Ingredients Required'}
                  </span>
                  <button
                    type="button"
                    onClick={handleAddFormulaIngredient}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>{language === 'am' ? 'ጥሬ ዕቃ ጨምር' : 'Add Item'}</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {formulaIngredients.map((ing, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={ing.itemId}
                        onChange={(e) => handleUpdateFormulaIngredient(idx, 'itemId', e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                      >
                        {items.map((it) => (
                          <option key={it.id} value={it.id}>
                            {language === 'am' ? it.nameAm : it.nameEn} ({it.unitAm})
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        step="any"
                        min="0.001"
                        placeholder="ብዛት"
                        value={ing.quantity}
                        onChange={(e) => handleUpdateFormulaIngredient(idx, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-24 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-amber-300 font-mono text-center"
                      />

                      <button
                        type="button"
                        onClick={() => handleRemoveFormulaIngredient(idx)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  {language === 'am' ? 'ማስታወሻ' : 'Preparation Notes'}
                </label>
                <textarea
                  rows={2}
                  value={formulaNotes}
                  onChange={(e) => setFormulaNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeFormulaModal}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 cursor-pointer"
                >
                  {language === 'am' ? 'ሰርዝ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 shadow-md font-black cursor-pointer"
                >
                  {language === 'am' ? 'አስቀምጥ' : 'Save Formula'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

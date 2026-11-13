import React, { useState } from 'react';
import {
  X,
  Flame,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Briefcase,
  Users,
  ChefHat,
  Package,
  Sparkles,
  Info,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { DatePickerField } from '../common/DatePickerField';
import { getTodayDateString } from '../../utils/ethiopianDate';

interface BranchUsageModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: string;
}

export const BranchUsageModal: React.FC<BranchUsageModalProps> = ({
  isOpen,
  onClose,
  branchId,
}) => {
  const {
    items,
    branches,
    recipes,
    recordBranchThreeWayUsage,
    getBranchStockBalance,
  } = useApp();
  const { language, t, formatCurrency } = useLanguage();

  const currentBranch = branches.find((b) => b.id === branchId) || branches[0];

  // 3 Primary Reduction Channels as strictly required by user
  // 1) ቀጥታ በገንዘብ የተሸጠ (CASH_SALE)
  // 2) ማኔጅመንት የተጠቀመው (MANAGEMENT_USE)
  // 3) የስታፍ ምግብ (STAFF_MEAL)
  // 4) ብክነት (WASTE_DAMAGE)
  const [channelType, setChannelType] = useState<'CASH_SALE' | 'MANAGEMENT_USE' | 'STAFF_MEAL' | 'WASTE_DAMAGE'>('CASH_SALE');
  
  // Mode: Menu Recipe Dish or Direct Raw Item
  const [entryMode, setEntryMode] = useState<'recipe' | 'item'>('recipe');

  // Filter recipes strictly for current branch
  const branchRecipes = recipes.filter((r) => r.branchId === currentBranch?.id);

  // Form Fields
  const [date, setDate] = useState(getTodayDateString());
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>(branchRecipes[0]?.id || '');
  const [selectedItemId, setSelectedItemId] = useState<string>(items[0]?.id || '');
  const [portions, setPortions] = useState<number | ''>(1);
  const [customPrice, setCustomPrice] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [beneficiary, setBeneficiary] = useState('');
  const [reasonNotes, setReasonNotes] = useState('');
  const [refNo, setRefNo] = useState(`USE-${Date.now().toString().slice(-4)}`);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState(false);

  if (!isOpen || !currentBranch) return null;

  // Selected recipe details
  const activeRecipe = branchRecipes.find((r) => r.id === selectedRecipeId) || branchRecipes[0];
  const effectiveSellingPrice = typeof customPrice === 'number'
    ? customPrice
    : (activeRecipe ? activeRecipe.sellingPrice : 0);

  // Selected item details (for direct item mode)
  const activeItem = items.find((i) => i.id === selectedItemId) || items[0];
  const branchItemStock = activeItem ? getBranchStockBalance(currentBranch.id, activeItem.id) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (entryMode === 'recipe') {
      if (!activeRecipe) {
        setErrorMsg(language === 'am' ? 'እባክዎ መጀመሪያ ለዚህ ብራንች ሜኑ/ሪሲፒ ይፍጠሩ' : 'No recipes found for this branch');
        return;
      }
      const portionsCount = typeof portions === 'number' ? portions : 0;
      if (portionsCount <= 0) {
        setErrorMsg(language === 'am' ? 'እባክዎ የፖርሽን መጠን ያስገቡ' : 'Please enter valid portions');
        return;
      }

      const res = recordBranchThreeWayUsage({
        branchId: currentBranch.id,
        date,
        type: channelType,
        mode: 'recipe',
        recipeId: activeRecipe.id,
        portions: portionsCount,
        sellingPrice: effectiveSellingPrice,
        totalCashRevenue: channelType === 'CASH_SALE' ? portionsCount * effectiveSellingPrice : 0,
        beneficiaryOrGuest: beneficiary.trim(),
        reasonOrNotes: reasonNotes.trim(),
        refNo: refNo || `${channelType.slice(0, 3)}-${Date.now().toString().slice(-4)}`,
        recordedBy: currentBranch.manager,
      });

      if (res.success) {
        setSuccessMsg(true);
        setTimeout(() => {
          setSuccessMsg(false);
          onClose();
        }, 900);
      } else {
        setErrorMsg(res.error || 'ስህተት ተከስቷል');
      }
    } else {
      // Direct Item mode
      if (!activeItem) {
        setErrorMsg(language === 'am' ? 'እባክዎ ዕቃ ይምረጡ' : 'Please select an item');
        return;
      }
      const parsedQty = typeof quantity === 'number' ? quantity : 0;
      if (parsedQty <= 0) {
        setErrorMsg(language === 'am' ? 'እባክዎ ትክክለኛ መጠን ያስገቡ' : 'Please enter a valid quantity');
        return;
      }
      if (parsedQty > branchItemStock) {
        setErrorMsg(
          language === 'am'
            ? `በቂ የቅርንጫፍ ክምችት የለም! በ${currentBranch.nameAm} ያለው: ${branchItemStock} ${activeItem.unitAm}`
            : `Insufficient stock in branch! Available: ${branchItemStock} ${activeItem.unit}`
        );
        return;
      }

      const res = recordBranchThreeWayUsage({
        branchId: currentBranch.id,
        date,
        type: channelType,
        mode: 'item',
        itemId: activeItem.id,
        quantity: parsedQty,
        sellingPrice: typeof customPrice === 'number' ? customPrice : 0,
        totalCashRevenue: channelType === 'CASH_SALE' && typeof customPrice === 'number' ? parsedQty * customPrice : 0,
        beneficiaryOrGuest: beneficiary.trim(),
        reasonOrNotes: reasonNotes.trim(),
        refNo: refNo || `${channelType.slice(0, 3)}-${Date.now().toString().slice(-4)}`,
        recordedBy: currentBranch.manager,
      });

      if (res.success) {
        setSuccessMsg(true);
        setTimeout(() => {
          setSuccessMsg(false);
          onClose();
        }, 900);
      } else {
        setErrorMsg(res.error || 'ስህተት ተከስቷል');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-amber-500/30 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-500/20 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                {language === 'am' ? 'የቅርንጫፍ ሽያጭ እና ወጪ ቅነሳ' : 'Branch Sales & Consumption'}
              </h3>
              <p className="text-[11px] text-amber-400 font-medium">
                {language === 'am' ? `${currentBranch.nameAm} (${currentBranch.code}) ውስጥ ብቻ የሚቀነስ` : `Deducted strictly from ${currentBranch.nameEn}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-xl flex items-center gap-2 text-rose-300 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl flex items-center gap-2 text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{language === 'am' ? 'ወጪው በቅርንጫፉ ስቶር ተቀናንሶ በተሳካ ሁኔታ ተመዝግቧል!' : 'Recorded and deducted from branch stock!'}</span>
            </div>
          )}

          {/* 3 Primary Reduction Channels Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              {language === 'am' ? 'የቅነሳው / የሽያጩ አይነት ይምረጡ:' : 'Select Reduction / Sale Channel:'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setChannelType('CASH_SALE')}
                className={`py-2 px-2 text-xs font-bold rounded-xl border flex flex-col items-center gap-1 transition-all ${
                  channelType === 'CASH_SALE'
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white border-emerald-400 shadow-md ring-1 ring-emerald-300'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                <span className="text-[11px] text-center leading-tight">
                  {language === 'am' ? '1. ቀጥታ በገንዘብ የተሸጠ' : '1. Cash Sale'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setChannelType('MANAGEMENT_USE')}
                className={`py-2 px-2 text-xs font-bold rounded-xl border flex flex-col items-center gap-1 transition-all ${
                  channelType === 'MANAGEMENT_USE'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white border-blue-400 shadow-md ring-1 ring-blue-300'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                <span className="text-[11px] text-center leading-tight">
                  {language === 'am' ? '2. ማኔጅመንት የተጠቀመው' : '2. Management'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setChannelType('STAFF_MEAL')}
                className={`py-2 px-2 text-xs font-bold rounded-xl border flex flex-col items-center gap-1 transition-all ${
                  channelType === 'STAFF_MEAL'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 border-amber-300 shadow-md font-black ring-1 ring-amber-300'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4" />
                <span className="text-[11px] text-center leading-tight">
                  {language === 'am' ? '3. የስታፍ ምግብ' : '3. Staff Meal'}
                </span>
              </button>
            </div>
          </div>

          {/* Date Picker */}
          <DatePickerField
            label={language === 'am' ? 'የተከናወነበት ቀን' : 'Transaction Date'}
            value={date}
            onChange={setDate}
            required
            helperText={language === 'am' ? 'የኢትዮጵያ ቀን' : 'Ethiopian Date'}
          />

          {/* Entry Mode Toggle: Menu Recipe vs Direct Item */}
          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setEntryMode('recipe')}
              className={`flex-1 py-1.5 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                entryMode === 'recipe'
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ChefHat className="w-3.5 h-3.5" />
              <span>{language === 'am' ? 'በሜኑ ሪሲፒ (በፖርሽን ተሰልቶ ይቀነስ)' : 'By Menu Recipe (Portion)'}</span>
            </button>
            <button
              type="button"
              onClick={() => setEntryMode('item')}
              className={`flex-1 py-1.5 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                entryMode === 'item'
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>{language === 'am' ? 'በቀጥታ ጥሬ እቃ (ቀጥታ መጠን)' : 'Direct Raw Item'}</span>
            </button>
          </div>

          {/* MODE A: RECIPE DISH */}
          {entryMode === 'recipe' ? (
            <div className="space-y-3">
              {branchRecipes.length === 0 ? (
                <div className="p-4 bg-slate-950 rounded-2xl border border-dashed border-amber-500/30 text-center space-y-2">
                  <p className="text-xs text-slate-300">
                    {language === 'am'
                      ? `በ${currentBranch.nameAm} እስካሁን የተመዘገበ ሜኑ/ሪሲፒ የለም።`
                      : `No recipes found for ${currentBranch.nameEn}.`}
                  </p>
                  <p className="text-[11px] text-amber-400">
                    {language === 'am'
                      ? 'እባክዎ መጀመሪያ ወደ "ሜኑ እና ሪሲፒ" ገጽ ሄደው ለዚህ ብራንች ሪሲፒ ይመዝግቡ ወይም ከታች ያለውን "በቀጥታ ጥሬ እቃ" አማራጭ ይጠቀሙ።'
                      : 'Create recipes for this branch first, or switch to Direct Raw Item mode.'}
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      {language === 'am' ? 'የምግብ ሜኑ / ሪሲፒ ይምረጡ:' : 'Select Menu Recipe:'}
                    </label>
                    <select
                      value={selectedRecipeId}
                      onChange={(e) => setSelectedRecipeId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                    >
                      {branchRecipes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {language === 'am' ? r.nameAm : r.nameEn} — {formatCurrency(r.sellingPrice)} ({r.portionDescription})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        {language === 'am' ? 'የተሸጠ/የወጣ ፖርሽን ብዛት:' : 'Portions Count:'} <span className="text-amber-400">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        required
                        value={portions}
                        onChange={(e) => setPortions(e.target.value === '' ? '' : parseInt(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                      />
                    </div>
                    {channelType === 'CASH_SALE' ? (
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          {language === 'am' ? 'የ 1 ፖርሽን መሸጫ ዋጋ (ብር):' : 'Unit Price (ETB):'}
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={customPrice !== '' ? customPrice : (activeRecipe?.sellingPrice || '')}
                          onChange={(e) => setCustomPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          {channelType === 'MANAGEMENT_USE'
                            ? (language === 'am' ? 'የተጠቃሚው ማኔጀር ስም:' : 'Manager Name:')
                            : (language === 'am' ? 'የስታፍ ፈረቃ / ክፍል:' : 'Staff Shift / Dept:')}
                        </label>
                        <input
                          type="text"
                          placeholder={channelType === 'MANAGEMENT_USE' ? 'አቶ ዳዊት (ስራ አስኪያጅ)' : 'የምሳ ሰዓት ኪችን ሰራተኞች'}
                          value={beneficiary}
                          onChange={(e) => setBeneficiary(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                        />
                      </div>
                    )}
                  </div>

                  {/* Live Breakdown Preview of Ingredients to Deduct */}
                  {activeRecipe && (
                    <div className="bg-slate-950 p-3 rounded-2xl border border-amber-500/20 text-xs space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-amber-300 font-bold">
                        <span>{language === 'am' ? 'ከዚህ ቅርንጫፍ ስቶር የሚቀነሱ ግብአቶች:' : 'Ingredients to Deduct from Branch:'}</span>
                        {channelType === 'CASH_SALE' && (
                          <span className="text-emerald-400 font-black font-mono">
                            {language === 'am' ? 'ጠቅላላ ገቢ:' : 'Total Cash:'} {formatCurrency((typeof portions === 'number' ? portions : 1) * effectiveSellingPrice)}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        {activeRecipe.ingredients.map((ing) => {
                          const it = items.find((i) => i.id === ing.itemId);
                          const totalDeduct = Number((ing.quantity * (typeof portions === 'number' ? portions : 1)).toFixed(3));
                          const curStock = getBranchStockBalance(currentBranch.id, ing.itemId);
                          const hasEnough = curStock >= totalDeduct;
                          return (
                            <div key={ing.itemId} className="flex items-center justify-between text-[11px] py-0.5">
                              <span className="text-slate-300">
                                {it ? (language === 'am' ? it.nameAm : it.nameEn) : ing.itemId}
                              </span>
                              <span className={`font-mono font-bold ${hasEnough ? 'text-amber-400' : 'text-rose-400'}`}>
                                -{totalDeduct} {it?.unitAm} (ያለው: {curStock})
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            /* MODE B: DIRECT ITEM */
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {language === 'am' ? 'የሚቀነሰው ጥሬ ዕቃ ይምረጡ:' : 'Select Item to Deduct:'}
                </label>
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                >
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {language === 'am' ? it.nameAm : it.nameEn} ({it.unitAm}) — {language === 'am' ? 'በብራንቹ ያለው:' : 'Branch Stock:'} {getBranchStockBalance(currentBranch.id, it.id)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {language === 'am' ? `መጠን (${activeItem?.unitAm || ''}):` : 'Quantity:'} <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.001"
                    max={branchItemStock}
                    required
                    placeholder="0.00"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                  />
                </div>
                {channelType === 'CASH_SALE' ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      {language === 'am' ? 'የመሸጫ ዋጋ (ብር):' : 'Selling Price (ETB):'}
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      {channelType === 'MANAGEMENT_USE'
                        ? (language === 'am' ? 'የተጠቃሚ ስም / ኃላፊ:' : 'Manager / Beneficiary:')
                        : (language === 'am' ? 'የሰራተኛ ክፍል / ሽፍት:' : 'Staff Shift / Dept:')}
                    </label>
                    <input
                      type="text"
                      placeholder={channelType === 'MANAGEMENT_USE' ? 'ስራ አስኪያጅ' : 'የጠዋት ፈረቃ ሰራተኞች'}
                      value={beneficiary}
                      onChange={(e) => setBeneficiary(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                    />
                  </div>
                )}
              </div>

              {/* Branch Available Balance Indicator */}
              <div className="p-2.5 bg-slate-950 rounded-xl border border-amber-500/20 flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  {language === 'am' ? `በ${currentBranch.nameAm} ያለው ክምችት:` : 'Branch Balance:'}
                </span>
                <span className="font-mono font-black text-amber-300">
                  {branchItemStock} {activeItem?.unitAm}
                </span>
              </div>
            </div>
          )}

          {/* Reference No & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                {language === 'am' ? 'የሰነድ ቁጥር (Ref No):' : 'Ref Number:'}
              </label>
              <input
                type="text"
                value={refNo}
                onChange={(e) => setRefNo(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-400/40"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                {language === 'am' ? 'ማስታወሻ / ምክንያት:' : 'Reason / Notes:'}
              </label>
              <input
                type="text"
                placeholder={language === 'am' ? 'ለምሳሌ፡ የደንበኞች ሽያጭ፣ የስራ አመራር ስብሰባ...' : 'Notes...'}
                value={reasonNotes}
                onChange={(e) => setReasonNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-400/40"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-amber-500/25 ring-1 ring-amber-300"
            >
              {language === 'am' ? 'ከቅርንጫፉ ስቶር ቀንሰህ መዝግብ' : 'Deduct from Branch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Building2,
  PlusCircle,
  Trash2,
  Printer,
  CheckCircle2,
  AlertCircle,
  Flame,
  Layers,
  Utensils,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { DatePickerField } from '../components/common/DatePickerField';
import { formatEthiopianDate, getTodayDateString } from '../utils/ethiopianDate';
import { StaffMealExecution, RecipeIngredient } from '../types';
import { SmartItemSelector } from '../components/common/SmartItemSelector';
import { safeLocalStorageSet } from '../utils/persistentStorage';

interface DayMealPlan {
  dayNumber: number; // 1 to 7
  dayKey: string;
  nameAm: string;
  nameEn: string;
  mealName: string; // ተጠቃሚው እራሱ የሚሰጠው ሜኑ
  headcount: number; // የሰራተኛ ቁጥር
  ingredients: RecipeIngredient[]; // ተጠቃሚው የሚሰጠው ሪሲፒ
  isDeducted?: boolean;
}

export const StaffMealControllingView: React.FC = () => {
  const {
    branches,
    items,
    staffMealExecutions,
    executeStaffMealAndDeduct,
    getBranchStockBalance,
  } = useApp();

  const { language, formatCurrency } = useLanguage();

  // Selected branch
  const [selectedBranchId, setSelectedBranchId] = useState<string>(branches[0]?.id || '');
  const currentBranch = branches.find((b) => b.id === selectedBranchId) || branches[0];

  // Week start date (Monday)
  const [weekStartDate, setWeekStartDate] = useState<string>(getTodayDateString());

  // Notification message
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Storage key for 7-day schedule
  const storageKey = `eth_erp_week7_${selectedBranchId}_${weekStartDate}`;

  // 7 Days: ሰኞ እስከ እሁድ (ከቀን 1 እስከ ቀን 7)
  const defaultWeekDays: DayMealPlan[] = [
    { dayNumber: 1, dayKey: 'monday', nameAm: 'ሰኞ', nameEn: 'Monday', mealName: '', headcount: 15, ingredients: [] },
    { dayNumber: 2, dayKey: 'tuesday', nameAm: 'ማክሰኞ', nameEn: 'Tuesday', mealName: '', headcount: 15, ingredients: [] },
    { dayNumber: 3, dayKey: 'wednesday', nameAm: 'ረቡዕ', nameEn: 'Wednesday', mealName: '', headcount: 15, ingredients: [] },
    { dayNumber: 4, dayKey: 'thursday', nameAm: 'ሐሙስ', nameEn: 'Thursday', mealName: '', headcount: 15, ingredients: [] },
    { dayNumber: 5, dayKey: 'friday', nameAm: 'አርብ', nameEn: 'Friday', mealName: '', headcount: 15, ingredients: [] },
    { dayNumber: 6, dayKey: 'saturday', nameAm: 'ቅዳሜ', nameEn: 'Saturday', mealName: '', headcount: 15, ingredients: [] },
    { dayNumber: 7, dayKey: 'sunday', nameAm: 'እሁድ', nameEn: 'Sunday', mealName: '', headcount: 15, ingredients: [] },
  ];

  const [days, setDays] = useState<DayMealPlan[]>(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : defaultWeekDays;
  });

  // Re-load when branch or week date changes
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      setDays(JSON.parse(saved));
    } else {
      setDays(defaultWeekDays);
    }
    setNotification(null);
  }, [selectedBranchId, weekStartDate]);

  // Auto-save schedule safely
  const saveScheduleToStorage = (updatedDays: DayMealPlan[]) => {
    setDays(updatedDays);
    safeLocalStorageSet(storageKey, updatedDays);
  };

  // Day handlers
  const handleMealNameChange = (dayIdx: number, val: string) => {
    const updated = [...days];
    updated[dayIdx].mealName = val;
    saveScheduleToStorage(updated);
  };

  const handleHeadcountChange = (dayIdx: number, val: number) => {
    const updated = [...days];
    updated[dayIdx].headcount = Math.max(1, val || 1);
    saveScheduleToStorage(updated);
  };

  const handleAddIngredient = (dayIdx: number) => {
    if (items.length === 0) return;
    const updated = [...days];
    updated[dayIdx].ingredients.push({
      itemId: items[0].id,
      quantity: 0.1, // 100g per person
    });
    saveScheduleToStorage(updated);
  };

  const handleUpdateIngredient = (dayIdx: number, ingIdx: number, field: 'itemId' | 'quantity', val: any) => {
    const updated = [...days];
    if (field === 'itemId') {
      updated[dayIdx].ingredients[ingIdx].itemId = val;
    } else {
      updated[dayIdx].ingredients[ingIdx].quantity = parseFloat(val) || 0;
    }
    saveScheduleToStorage(updated);
  };

  const handleRemoveIngredient = (dayIdx: number, ingIdx: number) => {
    const updated = [...days];
    updated[dayIdx].ingredients.splice(ingIdx, 1);
    saveScheduleToStorage(updated);
  };

  // Calculate day cost per person and total cost
  const calculateDayCost = (day: DayMealPlan) => {
    let costPerPerson = 0;
    day.ingredients.forEach((ing) => {
      const it = items.find((i) => i.id === ing.itemId);
      const unitCost = it?.weightedAvgCost || 0;
      costPerPerson += ing.quantity * unitCost;
    });
    const totalDayCost = costPerPerson * day.headcount;
    return { costPerPerson, totalDayCost };
  };

  // Deduct single day from store
  const handleDeductDay = (dayIdx: number) => {
    const day = days[dayIdx];
    if (!day.mealName.trim()) {
      setNotification({
        type: 'error',
        text: language === 'am' ? `እባክዎ መጀመሪያ ለ${day.nameAm} ሜኑ (የምግብ ስም) ያስገቡ` : `Please enter meal name for ${day.nameEn}`,
      });
      return;
    }
    if (day.ingredients.length === 0) {
      setNotification({
        type: 'error',
        text: language === 'am' ? `እባክዎ ለ${day.nameAm} ሪሲፒ (የጥሬ ዕቃ ዝርዝር) ያስገቡ` : `Please enter ingredients for ${day.nameEn}`,
      });
      return;
    }

    const { costPerPerson, totalDayCost } = calculateDayCost(day);

    const ingredientDetails = day.ingredients.map((ing) => {
      const it = items.find((i) => i.id === ing.itemId);
      const unitCost = it?.weightedAvgCost || 0;
      const totalQtyUsed = Number((ing.quantity * day.headcount).toFixed(3));
      const totalCost = Number((totalQtyUsed * unitCost).toFixed(2));

      return {
        itemId: ing.itemId,
        itemNameAm: it?.nameAm || ing.itemId,
        unitAm: it?.unitAm || 'መለኪያ',
        qtyPerPerson: ing.quantity,
        totalQtyUsed,
        unitCost,
        totalCost,
      };
    });

    const execution: StaffMealExecution = {
      id: `exec-${day.dayKey}-${Date.now()}`,
      branchId: selectedBranchId,
      date: weekStartDate,
      ethiopianDateStr: formatEthiopianDate(weekStartDate, language),
      dayOfWeek: day.dayKey as any,
      recipeId: `custom-${day.dayKey}`,
      recipeNameAm: day.mealName,
      headcount: day.headcount,
      staffNames: [`${day.headcount} ሰራተኞች (${day.nameAm})`],
      totalCostETB: Number(totalDayCost.toFixed(2)),
      costPerPersonETB: Number(costPerPerson.toFixed(2)),
      ingredientDetails,
      cookingChef: 'የወጥ ቤት ሃላፊ',
      notes: `${day.nameAm} - ${day.mealName}`,
      createdAt: new Date().toISOString(),
    };

    const res = executeStaffMealAndDeduct(execution);
    if (res.success) {
      const updated = [...days];
      updated[dayIdx].isDeducted = true;
      saveScheduleToStorage(updated);

      setNotification({
        type: 'success',
        text:
          language === 'am'
            ? `የ${day.nameAm} ምግብ (${day.mealName}) ጥሬ ዕቃዎች ከ${currentBranch?.nameAm || 'ቅርንጫፍ'} ስቶክ ተቀናንሰዋል! (ወጪ: ${formatCurrency(totalDayCost)})`
            : `${day.nameEn} ingredients deducted from branch store successfully! (${formatCurrency(totalDayCost)})`,
      });
    } else {
      setNotification({ type: 'error', text: res.error || 'Failed to deduct from store' });
    }
  };

  // 1-Week Totals Calculation
  const weeklyIngredientsMap: Record<string, { totalQty: number; daysUsed: string[] }> = {};
  let weeklyTotalHeadcount = 0;
  let weeklyTotalCost = 0;

  days.forEach((day) => {
    if (!day.mealName.trim() || day.ingredients.length === 0) return;
    weeklyTotalHeadcount += day.headcount;

    day.ingredients.forEach((ing) => {
      const it = items.find((i) => i.id === ing.itemId);
      const unitCost = it?.weightedAvgCost || 0;
      const totalIngQty = ing.quantity * day.headcount;
      weeklyTotalCost += totalIngQty * unitCost;

      if (!weeklyIngredientsMap[ing.itemId]) {
        weeklyIngredientsMap[ing.itemId] = { totalQty: 0, daysUsed: [] };
      }
      weeklyIngredientsMap[ing.itemId].totalQty += totalIngQty;
      if (!weeklyIngredientsMap[ing.itemId].daysUsed.includes(day.nameAm)) {
        weeklyIngredientsMap[ing.itemId].daysUsed.push(day.nameAm);
      }
    });
  });

  const weeklyPullList = Object.entries(weeklyIngredientsMap).map(([itemId, info]) => {
    const it = items.find((i) => i.id === itemId);
    const unitCost = it?.weightedAvgCost || 0;
    const totalCost = Number((info.totalQty * unitCost).toFixed(2));
    const curBranchStock = getBranchStockBalance(selectedBranchId, itemId);
    const isShortage = curBranchStock < info.totalQty;
    const shortageQty = isShortage ? Number((info.totalQty - curBranchStock).toFixed(3)) : 0;

    return {
      itemId,
      item: it,
      totalQtyNeeded: Number(info.totalQty.toFixed(3)),
      unitCost,
      totalCost,
      curBranchStock,
      isShortage,
      shortageQty,
      daysUsed: info.daysUsed,
    };
  });

  // Bulk Deduct Full 1-Week
  const handleDeductFullWeek = () => {
    if (weeklyPullList.length === 0) {
      alert(language === 'am' ? 'በስኬጁሉ ውስጥ ምንም ሜኑ ወይም ጥሬ ዕቃ አልተሞላም' : 'No meals or ingredients in schedule');
      return;
    }

    if (
      !window.confirm(
        language === 'am'
          ? `የሙሉ 1 ሳምንት የሰራተኞች ምግብ ጥሬ እቃዎች (ጠቅላላ ${formatCurrency(weeklyTotalCost)}) ከስቶክ እንዲቀነሱ ትፈልጋለህ?`
          : `Deduct full 1-week staff meal ingredients (${formatCurrency(weeklyTotalCost)}) from branch stock?`
      )
    ) {
      return;
    }

    const execution: StaffMealExecution = {
      id: `exec-week-full-${Date.now()}`,
      branchId: selectedBranchId,
      date: weekStartDate,
      ethiopianDateStr: formatEthiopianDate(weekStartDate, language),
      dayOfWeek: 'monday',
      recipeId: 'weekly-7days',
      recipeNameAm: 'የ1 ሳምንት የሰራተኞች ምግብ (ከሰኞ እስከ እሁድ)',
      headcount: weeklyTotalHeadcount,
      staffNames: [`ጠቅላላ ${weeklyTotalHeadcount} የሳምንቱ ምግቦች`],
      totalCostETB: Number(weeklyTotalCost.toFixed(2)),
      costPerPersonETB: weeklyTotalHeadcount > 0 ? Number((weeklyTotalCost / weeklyTotalHeadcount).toFixed(2)) : 0,
      ingredientDetails: weeklyPullList.map((p) => ({
        itemId: p.itemId,
        itemNameAm: p.item?.nameAm || p.itemId,
        unitAm: p.item?.unitAm || 'መለኪያ',
        qtyPerPerson: Number((p.totalQtyNeeded / (weeklyTotalHeadcount || 1)).toFixed(4)),
        totalQtyUsed: p.totalQtyNeeded,
        unitCost: p.unitCost,
        totalCost: p.totalCost,
      })),
      cookingChef: 'የወጥ ቤት ሃላፊ',
      notes: `የሙሉ 1 ሳምንት የሰራተኞች ምግብ ማዘዣ`,
      createdAt: new Date().toISOString(),
    };

    const res = executeStaffMealAndDeduct(execution);
    if (res.success) {
      const updated = days.map((d) => ({ ...d, isDeducted: true }));
      saveScheduleToStorage(updated);

      setNotification({
        type: 'success',
        text:
          language === 'am'
            ? `የሙሉ 1 ሳምንት የሰራተኞች ምግብ ጥሬ እቃዎች (ጠቅላላ ${formatCurrency(weeklyTotalCost)}) በተሳካ ሁኔታ ከስቶክ ተቀናንሰዋል!`
            : `Full 1-week ingredients deducted from store successfully!`,
      });
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Top Banner: Branch Switcher & Week Picker */}
      <div className="rounded-3xl bg-slate-900 border border-amber-500/30 p-6 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-2xl text-slate-950 font-bold shadow-md shadow-amber-500/20">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-100 to-amber-400">
                  {language === 'am'
                    ? 'የአንድ ሳምንት የሰራተኞች ምግብ ስኬጁል እና ኮስት'
                    : '1-Week Staff Meal Schedule & Costing'}
                </h1>
                <p className="text-xs text-slate-400">
                  {language === 'am'
                    ? 'ከቀን 1 እስከ ቀን 7 (ከሰኞ እስከ እሁድ) ሜኑ እና ሪሲፒ ይስጡ፤ ሲስተሙ ከስቶር እያቀናበረ ወጪውን አስልቶ ይቀንሳል'
                    : 'Enter your 7-day menu & recipe. The system automatically coordinates with store stock and deducts ingredients.'}
                </p>
              </div>
            </div>
          </div>

          {/* Controls: Branch and Print */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
              <Building2 className="w-4 h-4 text-amber-400 ml-1.5" />
              {branches.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBranchId(b.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedBranchId === b.id
                      ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {language === 'am' ? b.nameAm : b.nameEn}
                </button>
              ))}
            </div>

            <button
              onClick={() => window.print()}
              className="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-300 hover:text-amber-400 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Printer className="w-4 h-4" />
              {language === 'am' ? 'ፕሪንት' : 'Print'}
            </button>
          </div>
        </div>

        {/* Date Selector and 1-Week Summary Strip */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-56">
              <DatePickerField
                label={language === 'am' ? 'የሳምንቱ መጀመሪያ ቀን (ሰኞ)' : 'Week Start (Monday)'}
                value={weekStartDate}
                onChange={setWeekStartDate}
              />
            </div>
            <div className="text-xs text-amber-400 font-bold">
              {formatEthiopianDate(weekStartDate, language)}
              <span className="block text-[10px] text-slate-400 font-normal">
                {language === 'am' ? 'ለ7 ቀናት (ከሰኞ እስከ እሁድ)' : 'Full 7 Days (Mon - Sun)'}
              </span>
            </div>
          </div>

          {/* 1-Week Totals */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="p-2.5 px-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">{language === 'am' ? 'የሳምንቱ ጠቅላላ ምግቦች:' : 'Total Meals:'}</span>
              <span className="text-sm font-bold text-amber-300 font-mono">{weeklyTotalHeadcount} {language === 'am' ? 'ሰው' : 'meals'}</span>
            </div>
            <div className="p-2.5 px-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">{language === 'am' ? 'የሳምንቱ ጠቅላላ ወጪ:' : 'Total 1-Week Cost:'}</span>
              <span className="text-sm font-bold text-yellow-400 font-mono">{formatCurrency(weeklyTotalCost)}</span>
            </div>
            <div className="p-2.5 px-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">{language === 'am' ? 'የ1 ሰው አማካይ ወጪ:' : 'Avg Cost / Meal:'}</span>
              <span className="text-sm font-bold text-emerald-400 font-mono">
                {formatCurrency(weeklyTotalHeadcount > 0 ? weeklyTotalCost / weeklyTotalHeadcount : 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Notification banner */}
      {notification && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-2.5 text-xs ${
            notification.type === 'success'
              ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300'
              : 'bg-rose-950/80 border border-rose-500/50 text-rose-300'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* 7 DAYS SCHEDULE (ከሰኞ እስከ እሁድ / ከቀን 1 እስከ ቀን 7) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Utensils className="w-4 h-4 text-amber-400" />
            <span>{language === 'am' ? 'ከሰኞ እስከ እሁድ የ7ቱ ቀናት ሜኑ እና ሪሲፒ' : '7 Days Menu & Recipe Input (Mon - Sun)'}</span>
          </h2>
          <span className="text-xs text-slate-400">
            {language === 'am' ? 'ሜኑ እና ጥሬ ዕቃዎችን እራስዎ ያስገቡ' : 'Enter your menu and raw materials'}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {days.map((day, dayIdx) => {
            const { costPerPerson, totalDayCost } = calculateDayCost(day);

            return (
              <div
                key={day.dayKey}
                className="rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 p-4 transition-all space-y-4"
              >
                {/* Day Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center font-bold text-amber-400 font-mono text-sm">
                      {day.dayNumber}
                    </div>
                    <div>
                      <span className="font-extrabold text-sm text-slate-100 block">
                        ቀን {day.dayNumber} - {day.nameAm} ({day.nameEn})
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {language === 'am' ? 'የቀኑ የምግብ ፕላን እና ሪሲፒ' : 'Day meal plan and recipe'}
                      </span>
                    </div>
                  </div>

                  {/* Day Cost Summary & Deduct Action */}
                  <div className="flex items-center gap-3">
                    <div className="text-right text-xs">
                      <span className="text-[10px] text-slate-400 block">{language === 'am' ? 'የቀኑ ወጪ:' : 'Day Total:'}</span>
                      <span className="font-mono font-bold text-yellow-400 text-sm">
                        {formatCurrency(totalDayCost)}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        ({formatCurrency(costPerPerson)} / ሰው)
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeductDay(dayIdx)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        day.isDeducted
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                          : 'bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 shadow-md shadow-amber-500/20 hover:opacity-95'
                      }`}
                    >
                      <Flame className="w-3.5 h-3.5" />
                      {day.isDeducted
                        ? language === 'am' ? 'ከስቶክ ተቀናንሷል ✓' : 'Deducted ✓'
                        : language === 'am' ? 'ከስቶር ቀንሰው' : 'Deduct from Store'}
                    </button>
                  </div>
                </div>

                {/* Menu Name and Headcount Input */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-8">
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      {language === 'am' ? 'የሚዘጋጀው ምግብ / ሜኑ (እርስዎ የሚሰጡት ስም) *' : 'Meal Name / Menu (Your Input) *'}
                    </label>
                    <input
                      type="text"
                      placeholder={language === 'am' ? 'ለምሳሌ፡ ሽሮ ወጥ፣ ምስር በድንች፣ ሩዝ በአትክልት...' : 'e.g. Shiro Wot, Rice, Lentils...'}
                      value={day.mealName}
                      onChange={(e) => handleMealNameChange(dayIdx, e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-400 font-semibold"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      {language === 'am' ? 'የሰራተኛ ብዛት (Headcount) *' : 'Number of Staff *'}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        value={day.headcount}
                        onChange={(e) => handleHeadcountChange(dayIdx, parseInt(e.target.value) || 1)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono font-bold text-center focus:outline-none focus:border-amber-400"
                      />
                      <span className="text-xs text-slate-400 shrink-0">{language === 'am' ? 'ሰው' : 'pax'}</span>
                    </div>
                  </div>
                </div>

                {/* Recipe & Ingredients Table */}
                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-amber-400" />
                        {language === 'am' ? 'የምግቡ ሪሲፒ (ለ1 ሰራተኛ የሚወጣ ጥሬ ዕቃ):' : 'Recipe Ingredients (Per 1 Staff):'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {language === 'am' ? 'ለ1 ሰው የሚወጣውን መጠን ያስገቡ፤ ሲስተሙ በሰራተኛው ብዛት ያባዛል' : 'Enter amount for 1 person; scaled by headcount'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddIngredient(dayIdx)}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold hover:bg-amber-500/30 flex items-center gap-1 transition-all"
                    >
                      <PlusCircle className="w-3 h-3" />
                      {language === 'am' ? '+ ጥሬ ዕቃ ጨምር' : '+ Add Item'}
                    </button>
                  </div>

                  {day.ingredients.length === 0 ? (
                    <div className="p-3 text-center text-[11px] text-slate-500 border border-dashed border-slate-800 rounded-xl">
                      {language === 'am'
                        ? 'ምንም ጥሬ ዕቃ አልተጨመረም። "+ ጥሬ ዕቃ ጨምር" የሚለውን ጠቅ በማድረግ ሪሲፒውን ያስገቡ'
                        : 'No ingredients added. Click "+ Add Item" to specify recipe ingredients.'}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {day.ingredients.map((ing, ingIdx) => {
                        const it = items.find((i) => i.id === ing.itemId);
                        const unitCost = it?.weightedAvgCost || 0;
                        const ingPortionCost = ing.quantity * unitCost;
                        const ingTotalDayQty = Number((ing.quantity * day.headcount).toFixed(3));
                        const ingTotalDayCost = Number((ingTotalDayQty * unitCost).toFixed(2));
                        const curBranchStock = getBranchStockBalance(selectedBranchId, ing.itemId);
                        const isShort = curBranchStock < ingTotalDayQty;

                        return (
                          <div
                            key={ingIdx}
                            className="p-2 rounded-xl bg-slate-900 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                          >
                            {/* Item Selector */}
                            <SmartItemSelector
                              items={items}
                              selectedItemId={ing.itemId}
                              onSelectItem={(id) => handleUpdateIngredient(dayIdx, ingIdx, 'itemId', id)}
                              className="flex-1 min-w-[200px]"
                            />

                            {/* Quantity Per Person */}
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-400">{language === 'am' ? 'ለ1 ሰው:' : 'Per Person:'}</span>
                              <input
                                type="number"
                                step="0.001"
                                min="0"
                                value={ing.quantity}
                                onChange={(e) => handleUpdateIngredient(dayIdx, ingIdx, 'quantity', e.target.value)}
                                className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono text-xs text-amber-300 focus:outline-none focus:border-amber-400"
                              />
                              <span className="text-[10px] text-slate-400 w-10">{it?.unitAm || ''}</span>
                            </div>

                            {/* Scaled Day Total for all staff */}
                            <div className="flex items-center gap-3 text-right">
                              <div>
                                <span className="font-mono font-bold text-amber-300 block text-[11px]">
                                  {ingTotalDayQty} {it?.unitAm || ''}
                                </span>
                                <span className={`text-[9px] block ${isShort ? 'text-rose-400 font-bold' : 'text-slate-500'}`}>
                                  {language === 'am' ? 'በስቶክ:' : 'Stock:'} {curBranchStock} {it?.unitAm || ''}
                                </span>
                              </div>

                              <span className="font-mono text-xs text-slate-300 w-16 text-right">
                                {formatCurrency(ingTotalDayCost)}
                              </span>

                              <button
                                type="button"
                                onClick={() => handleRemoveIngredient(dayIdx, ingIdx)}
                                className="p-1 text-slate-500 hover:text-rose-400"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 1-WEEK AGGREGATED MATERIAL REQUISITION PULL SHEET */}
      <div className="rounded-3xl bg-slate-900 border border-amber-500/30 p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              <span>{language === 'am' ? 'ለሙሉ 1 ሳምንት የሚያስፈልግ ጠቅላላ የጥሬ ዕቃ ማዘዣ' : '1-Week Aggregated Material Requisition'}</span>
            </h3>
            <p className="text-xs text-slate-400">
              {language === 'am'
                ? 'ከሰኞ እስከ እሁድ የተሞሉት ምግቦች በሙሉ ተደምረው ለሳምንቱ የሚያስፈልገውን ጠቅላላ ጥሬ ዕቃ ያሳያል'
                : 'All 7 days summed up to show the entire week’s required raw materials from the store.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDeductFullWeek}
              disabled={weeklyPullList.length === 0}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 hover:opacity-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Flame className="w-4 h-4" />
              {language === 'am'
                ? `የሙሉ 1 ሳምንት ጥሬ እቃ ከስቶክ ቀንሰው (${formatCurrency(weeklyTotalCost)})`
                : `Deduct Full 1-Week (${formatCurrency(weeklyTotalCost)})`}
            </button>
          </div>
        </div>

        {/* Requisition Table */}
        {weeklyPullList.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            {language === 'am' ? 'በቀኖቹ ውስጥ ሜኑ እና ሪሲፒ ሲያስገቡ የሳምንቱ ማዘዣ እዚህ ይሰላል' : 'Ingredients will appear here once recipes are entered.'}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-900/50">
                  <th className="p-3">#</th>
                  <th className="p-3">{language === 'am' ? 'የጥሬ ዕቃ ስም' : 'Item Name'}</th>
                  <th className="p-3 text-right">{language === 'am' ? 'የ1 ሳምንት የሚያስፈልግ ድምር' : '1-Week Total Qty'}</th>
                  <th className="p-3 text-right">{language === 'am' ? 'በብራንች ስቶክ ያለው' : 'Branch Stock'}</th>
                  <th className="p-3 text-center">{language === 'am' ? 'የስቶክ ሁኔታ' : 'Stock Status'}</th>
                  <th className="p-3 text-right">{language === 'am' ? 'ነጠላ ዋጋ' : 'Unit Cost'}</th>
                  <th className="p-3 text-right">{language === 'am' ? 'የ1 ሳምንት ጠቅላላ ዋጋ' : '1-Week Total Cost'}</th>
                  <th className="p-3">{language === 'am' ? 'የሚዘጋጅባቸው ቀናት' : 'Days Used'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {weeklyPullList.map((ing, idx) => (
                  <tr key={ing.itemId} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-3 font-mono text-slate-500">{idx + 1}</td>
                    <td className="p-3 font-bold text-slate-200">{ing.item?.nameAm || ing.itemId}</td>
                    <td className="p-3 text-right font-mono font-bold text-amber-300">
                      {ing.totalQtyNeeded} {ing.item?.unitAm || ''}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-300">
                      {ing.curBranchStock} {ing.item?.unitAm || ''}
                    </td>
                    <td className="p-3 text-center">
                      {ing.isShortage ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                          {language === 'am' ? `እጥረት: ${ing.shortageQty}${ing.item?.unitAm}` : `Short: ${ing.shortageQty}`}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          {language === 'am' ? 'በቂ ነው' : 'In Stock'}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-400">
                      {formatCurrency(ing.unitCost)}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-yellow-400">
                      {formatCurrency(ing.totalCost)}
                    </td>
                    <td className="p-3 text-slate-400 text-[11px]">
                      {ing.daysUsed.join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

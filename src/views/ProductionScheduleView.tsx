import React, { useState } from 'react';
import {
  CalendarDays,
  PlusCircle,
  Trash2,
  Scale,
  ClipboardList,
  CheckCircle,
  Building2,
  Clock,
  ArrowRight,
  Boxes,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { DatePickerField } from '../components/common/DatePickerField';
import { getTodayDateString, formatEthiopianDate } from '../utils/ethiopianDate';
import { ProductionSchedule, ScheduleMenuItem } from '../types';

interface ProductionScheduleViewProps {
  onNavigateToReconcile: (branchId: string, scheduleId: string) => void;
}

export const ProductionScheduleView: React.FC<ProductionScheduleViewProps> = ({
  onNavigateToReconcile,
}) => {
  const { schedules, recipes, items, branches, saveSchedule, deleteSchedule, getBranchStockBalance } = useApp();
  const { language, t, formatCurrency } = useLanguage();

  const [selectedBranchId, setSelectedBranchId] = useState<string>(branches[0]?.id || '');
  const [date, setDate] = useState<string>(getTodayDateString());
  const [shift, setShift] = useState<'morning' | 'lunch' | 'dinner' | 'all_day' | 'catering'>('all_day');
  const [scheduleName, setScheduleName] = useState('');
  const [scheduledItems, setScheduledItems] = useState<ScheduleMenuItem[]>([]);
  const [notes, setNotes] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const currentBranch = branches.find((b) => b.id === selectedBranchId) || branches[0];

  if (branches.length === 0 || recipes.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-xl space-y-4">
        <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 inline-block">
          <CalendarDays className="w-10 h-10" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          {language === 'am' ? 'የማምረቻ ስኬጁል ለማዘጋጀት መጀመሪያ ቅርንጫፍ እና ሪሴፒ ያስፈልጋል' : 'Branches & Recipes needed for Production Schedule'}
        </h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          {language === 'am'
            ? 'ስኬጁል ሲዘጋጅ በውስጡ የሚካተቱ ምግቦችና የሚወጡ ጥሬ እቃዎች በራስ-ሰር ተደምረው የሚሰሉት ከሪሴፒዎችዎ ነው።'
            : 'Register at least one branch and create menu recipes to enable daily shift scheduling and store pull lists.'}
        </p>
      </div>
    );
  }

  const handleAddItem = () => {
    setScheduledItems([
      ...scheduledItems,
      { recipeId: recipes[0]?.id || '', portionsPlanned: 20, portionsSold: 0 },
    ]);
  };

  const handleRemoveItem = (idx: number) => {
    setScheduledItems(scheduledItems.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx: number, field: 'recipeId' | 'portionsPlanned' | 'portionsSold', val: any) => {
    const updated = [...scheduledItems];
    updated[idx] = { ...updated[idx], [field]: val };
    setScheduledItems(updated);
  };

  // Calculate Aggregated Raw Material Pull List for this schedule
  const pullListMap: Record<string, number> = {};
  scheduledItems.forEach((sc) => {
    const rec = recipes.find((r) => r.id === sc.recipeId);
    if (!rec) return;
    const count = sc.portionsPlanned || 0;
    rec.ingredients.forEach((ing) => {
      pullListMap[ing.itemId] = (pullListMap[ing.itemId] || 0) + ing.quantity * count;
    });
  });

  const pullList = Object.entries(pullListMap).map(([itemId, qtyNeeded]) => {
    const it = items.find((i) => i.id === itemId);
    const branchStock = currentBranch ? getBranchStockBalance(currentBranch.id, itemId) : 0;
    const centralStock = it ? it.currentCentralStock : 0;
    const cost = (it?.weightedAvgCost || 0) * qtyNeeded;

    return {
      item: it,
      qtyNeeded: Number(qtyNeeded.toFixed(2)),
      branchStock,
      centralStock,
      cost,
    };
  });

  const totalPullCost = pullList.reduce((sum, p) => sum + p.cost, 0);

  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId || scheduledItems.length === 0) return;

    const newSchedule: ProductionSchedule = {
      id: `sch-${Date.now()}`,
      branchId: selectedBranchId,
      date,
      ethiopianDateStr: formatEthiopianDate(date, language),
      shift,
      name: scheduleName.trim() || `${currentBranch?.nameAm} - ${shift}`,
      items: scheduledItems.filter((it) => it.recipeId && it.portionsPlanned > 0),
      notes: notes.trim(),
      status: 'planned',
    };

    saveSchedule(newSchedule);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <CalendarDays className="w-6 h-6 text-purple-600" />
            <span>{t.schedule.title}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t.schedule.subtitle}
          </p>
        </div>
      </div>

      {/* Main Grid: Create / Configure Schedule (Left) + Automatic Pull List (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Schedule Configuration (7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-600" />
              <span>{t.schedule.createSchedule}</span>
            </h2>
            {savedSuccess && (
              <span className="flex items-center gap-1 text-emerald-600 font-semibold text-xs">
                <CheckCircle className="w-4 h-4" />
                <span>{language === 'am' ? 'ስኬጁሉ ተቀምጧል!' : 'Schedule saved!'}</span>
              </span>
            )}
          </div>

          <form onSubmit={handleSaveSchedule} className="space-y-4">
            {/* Branch & Date (Point 1 - Calendar Everywhere) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t.common.branch} <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                >
                  {branches.map((br) => (
                    <option key={br.id} value={br.id}>
                      {language === 'am' ? br.nameAm : br.nameEn} ({br.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* DatePickerField with Ethiopian Calendar Integration */}
              <div>
                <DatePickerField
                  label={t.common.date}
                  value={date}
                  onChange={setDate}
                  required
                />
              </div>
            </div>

            {/* Shift & Title */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t.schedule.shift}
                </label>
                <select
                  value={shift}
                  onChange={(e) => setShift(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                >
                  <option value="all_day">{t.schedule.allDay}</option>
                  <option value="morning">{t.schedule.morning}</option>
                  <option value="lunch">{t.schedule.lunch}</option>
                  <option value="dinner">{t.schedule.dinner}</option>
                  <option value="catering">{t.schedule.catering}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {language === 'am' ? 'የስኬጁል ስም / መግለጫ' : 'Schedule Title'}
                </label>
                <input
                  type="text"
                  placeholder="ለምሳሌ፡ የቅዳሜ የምሳ ልዩ ስኬጁል"
                  value={scheduleName}
                  onChange={(e) => setScheduleName(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* Scheduled Dishes List */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                  {t.schedule.dishesToCook} ({scheduledItems.length})
                </label>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 font-bold"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>{language === 'am' ? '+ ምግብ ጨምር' : '+ Add Dish'}</span>
                </button>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {scheduledItems.map((item, idx) => {
                  const rec = recipes.find((r) => r.id === item.recipeId);
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700"
                    >
                      <div className="flex-1">
                        <select
                          value={item.recipeId}
                          onChange={(e) => handleItemChange(idx, 'recipeId', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                        >
                          {recipes.map((r) => (
                            <option key={r.id} value={r.id}>
                              {language === 'am' ? r.nameAm : r.nameEn} ({r.portionDescription})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-28">
                        <input
                          type="number"
                          min="1"
                          placeholder={t.schedule.plannedPortions}
                          value={item.portionsPlanned}
                          onChange={(e) =>
                            handleItemChange(
                              idx,
                              'portionsPlanned',
                              e.target.value === '' ? '' : parseInt(e.target.value) || 0
                            )
                          }
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-right font-bold"
                        />
                      </div>

                      <span className="text-xs text-slate-400 w-12 text-center">
                        {language === 'am' ? 'ሰው' : 'pax'}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                {t.common.notes}
              </label>
              <input
                type="text"
                placeholder={language === 'am' ? 'ተጨማሪ መመሪያ ወይም ማስታወሻ...' : 'Schedule instructions...'}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="submit"
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-all"
              >
                {t.common.save}
              </button>
            </div>
          </form>
        </div>

        {/* Right Panel: Auto-Calculated Material Pull List (5 Cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Boxes className="w-5 h-5 text-emerald-600" />
                  <span>{t.schedule.rawMaterialsPullList}</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  {language === 'am'
                    ? 'ለተመረጡት ምግቦች የሚያስፈልገው ጠቅላላ ጥሬ እቃ ተደምሮ'
                    : 'Aggregated raw material required from Store'}
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-xs">
                {pullList.length} {language === 'am' ? 'አይነቶች' : 'Items'}
              </span>
            </div>

            {/* Pull Items Table */}
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1 text-xs">
              {pullList.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  {language === 'am' ? 'እስካሁን ምንም ምግብ አልተመረጠም' : 'No menu dishes added to schedule yet'}
                </div>
              ) : (
                pullList.map((p, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-slate-900 dark:text-slate-100 block">
                        {p.item ? (language === 'am' ? p.item.nameAm : p.item.nameEn) : ''}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {language === 'am' ? 'በብራንች ያለው:' : 'In Branch:'} {p.branchStock} {p.item?.unitAm} |{' '}
                        {language === 'am' ? 'ዋና ስቶር:' : 'Central:'} {p.centralStock} {p.item?.unitAm}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-sm text-purple-700 dark:text-purple-400 block">
                        {p.qtyNeeded} {p.item?.unitAm}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {formatCurrency(p.cost)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Bottom Summary & 1-Click Launch to Smart Reconciliation */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600 dark:text-slate-400">
                {language === 'am' ? 'የጥሬ እቃዎች ጠቅላላ ወጪ:' : 'Total Pull List Cost:'}
              </span>
              <span className="text-base font-bold text-emerald-700 dark:text-emerald-400">
                {formatCurrency(totalPullCost)}
              </span>
            </div>

            <button
              type="button"
              onClick={() => onNavigateToReconcile(selectedBranchId, '')}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs sm:text-sm shadow-sm transition-all"
            >
              <Scale className="w-4 h-4" />
              <span>{t.schedule.sendToReconcile}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  AlertCircle,
  PlusCircle,
  History,
  ChefHat,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { formatEthiopianDate } from '../utils/ethiopianDate';

interface PriceTrackingViewProps {
  onOpenStockIn: (itemId?: string) => void;
}

export const PriceTrackingView: React.FC<PriceTrackingViewProps> = ({ onOpenStockIn }) => {
  const { items, recipes } = useApp();
  const { language, t, formatCurrency } = useLanguage();

  const [selectedItemId, setSelectedItemId] = useState<string>(items[0]?.id || '');
  const selectedItem = items.find((i) => i.id === selectedItemId) || items[0];

  if (items.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-xl space-y-4">
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 inline-block">
          <TrendingUp className="w-10 h-10" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          {language === 'am' ? 'የገበያ ዋጋ መዋዠቅን ለመከታተል መጀመሪያ ጥሬ እቃዎችን ያስገቡ' : 'No items found for price tracking'}
        </h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          {language === 'am'
            ? 'አዳዲስ እቃዎች በ GRN ሲገቡ በገበያው ዋጋ መሰረት አማካይ ወጪያቸው (WAC) እና የዋጋ ልዩነታቸው (+/- %) እዚህ ይተነተናል።'
            : 'Register raw materials and accept purchase batches to track price inflation trends and food cost impact.'}
        </p>
        <button
          onClick={() => onOpenStockIn()}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-950/40"
        >
          {language === 'am' ? '+ የመጀመሪያ እቃ በገበያ ዋጋ ተቀበል' : '+ Accept First Goods (GRN)'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
            <span>{t.priceTracking.title}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t.priceTracking.subtitle}
          </p>
        </div>

        <button
          onClick={() => onOpenStockIn(selectedItemId)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{language === 'am' ? '+ አዲስ የገበያ ዋጋ ተቀበል (GRN)' : '+ Accept New Market Rate'}</span>
        </button>
      </div>

      {/* Volatility Overview Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((it) => {
          const isSelected = it.id === selectedItemId;
          const priceDiff = it.lastPurchasePrice - it.weightedAvgCost;
          const diffPercent = it.weightedAvgCost > 0 ? (priceDiff / it.weightedAvgCost) * 100 : 0;
          const isIncrease = priceDiff > 0;

          return (
            <div
              key={it.id}
              onClick={() => setSelectedItemId(it.id)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-3 ${
                isSelected
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500 shadow-sm'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    {language === 'am' ? it.nameAm : it.nameEn}
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">{it.code}</span>
                </div>
                <span
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isIncrease
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                      : priceDiff < 0
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {isIncrease ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  <span>{isIncrease ? `+${diffPercent.toFixed(1)}%` : `${diffPercent.toFixed(1)}%`}</span>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">{t.priceTracking.latestPrice}</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {formatCurrency(it.lastPurchasePrice)} / {it.unitAm}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">{t.centralStore.avgCost}</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {formatCurrency(it.weightedAvgCost)} / {it.unitAm}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>{it.priceHistory.length} {language === 'am' ? 'የግዢ ታሪክ መዝገቦች' : 'price records'}</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  {language === 'am' ? 'ዝርዝር ታሪክ እይ →' : 'View history →'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Item Detailed Purchase Price History */}
      {selectedItem && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden space-y-4">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  {language === 'am' ? selectedItem.nameAm : selectedItem.nameEn} — {t.priceTracking.priceHistory}
                </h3>
                <p className="text-xs text-slate-500">
                  {language === 'am'
                    ? 'በየጊዜው በገበያው ዋጋ ገቢ የተደረገባቸው ሰነዶችና አቅራቢዎች'
                    : 'Historical purchase log showing rate fluctuations across batches'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">
                {language === 'am' ? 'አሁን አማካይ ወጪ:' : 'Current WAC:'} <strong>{formatCurrency(selectedItem.weightedAvgCost)}</strong>
              </span>
              <button
                onClick={() => onOpenStockIn(selectedItem.id)}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
              >
                + {language === 'am' ? 'አዲስ ዋጋ አስገባ' : 'Log New Rate'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">{t.common.date}</th>
                  <th className="py-3 px-4">{language === 'am' ? 'የሰነድ ቁጥር (GRN)' : 'GRN #'}</th>
                  <th className="py-3 px-4">{t.common.supplier}</th>
                  <th className="py-3 px-4 text-right">{language === 'am' ? 'የተገዛ ብዛት' : 'Purchased Qty'}</th>
                  <th className="py-3 px-4 text-right font-black">{language === 'am' ? 'የአንዱ የገበያ ዋጋ' : 'Market Price'}</th>
                  <th className="py-3 px-4 text-right">{t.common.totalPrice}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {selectedItem.priceHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">
                      {language === 'am' ? 'ምንም የዋጋ ታሪክ አልተመዘገበም' : 'No price records found'}
                    </td>
                  </tr>
                ) : (
                  selectedItem.priceHistory.map((rec, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{rec.date}</div>
                        <div className="text-[10px] text-amber-700 dark:text-amber-400">
                          🇪🇹 {rec.ethiopianDateStr}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {rec.grnNumber}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                        {rec.supplier}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-slate-100">
                        {rec.quantity} {selectedItem.unitAm}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-emerald-700 dark:text-emerald-400 text-sm">
                        {formatCurrency(rec.price)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-800 dark:text-slate-200">
                        {formatCurrency(rec.price * rec.quantity)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cost Impact Simulator on Menu Recipes */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600">
            <ChefHat className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
              {t.priceTracking.costImpactOnRecipes}
            </h3>
            <p className="text-xs text-slate-500">
              {language === 'am'
                ? 'የጥሬ እቃዎች የገበያ ዋጋ ሲቀያየር በምግብ ሪሴፒዎች የወጪ ስሌት (Food Cost) ላይ ያመጣው ተጽእኖ'
                : 'Dynamic cost-per-plate adjustments reflecting latest ingredient purchase prices'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {recipes.map((rec) => {
            const cost = rec.ingredients.reduce((sum, ing) => {
              const it = items.find((i) => i.id === ing.itemId);
              const rate = it?.lastPurchasePrice || it?.weightedAvgCost || 0;
              return sum + ing.quantity * rate;
            }, 0);

            const margin = rec.sellingPrice > 0 ? ((rec.sellingPrice - cost) / rec.sellingPrice) * 100 : 0;

            return (
              <div
                key={rec.id}
                className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs"
              >
                <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {language === 'am' ? rec.nameAm : rec.nameEn}
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>{language === 'am' ? 'የመሸጫ ዋጋ:' : 'Selling Price:'}</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {formatCurrency(rec.sellingPrice)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>{language === 'am' ? 'የአሁኑ የምግብ ወጪ:' : 'Food Cost:'}</span>
                  <span className="font-bold text-amber-700 dark:text-amber-400">
                    {formatCurrency(cost)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span>{language === 'am' ? 'የትርፍ ህዳግ:' : 'Gross Margin:'}</span>
                  <span className={`font-bold ${margin > 40 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {margin.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

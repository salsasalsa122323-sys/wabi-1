import React, { useState } from 'react';
import { X, TrendingUp, AlertCircle, CheckCircle2, PackagePlus, DollarSign, Calendar, Layers } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { DatePickerField } from '../common/DatePickerField';
import { SmartItemSelector } from '../common/SmartItemSelector';
import { getTodayDateString } from '../../utils/ethiopianDate';

interface StockInModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedItemId?: string;
}

export const StockInModal: React.FC<StockInModalProps> = ({
  isOpen,
  onClose,
  preselectedItemId,
}) => {
  const { items, recordStockIn } = useApp();
  const { language, t, formatCurrency } = useLanguage();

  const [itemId, setItemId] = useState(preselectedItemId || (items[0]?.id || ''));
  const [date, setDate] = useState(getTodayDateString());
  const [quantity, setQuantity] = useState<number | ''>('');
  const [unitPrice, setUnitPrice] = useState<number | ''>('');
  const [supplier, setSupplier] = useState('');
  const [grnNumber, setGrnNumber] = useState(`GRN-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
  const [notes, setNotes] = useState('');
  const [successMsg, setSuccessMsg] = useState(false);

  if (!isOpen) return null;

  const selectedItem = items.find((i) => i.id === itemId);

  // Calculate simulated new Weighted Average Cost (WAC)
  const currentStock = selectedItem ? selectedItem.currentCentralStock : 0;
  const currentWac = selectedItem ? selectedItem.weightedAvgCost : 0;
  const lastPrice = selectedItem ? selectedItem.lastPurchasePrice : 0;

  const parsedQty = typeof quantity === 'number' ? quantity : 0;
  const parsedPrice = typeof unitPrice === 'number' ? unitPrice : 0;

  const totalNewQty = currentStock + parsedQty;
  const projectedWac = totalNewQty > 0
    ? ((currentStock * currentWac) + (parsedQty * parsedPrice)) / totalNewQty
    : parsedPrice;

  const priceDiff = parsedPrice > 0 && lastPrice > 0 ? parsedPrice - lastPrice : 0;
  const priceDiffPercent = lastPrice > 0 ? (priceDiff / lastPrice) * 100 : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemId || !parsedQty || !parsedPrice) return;

    recordStockIn({
      itemId,
      quantity: parsedQty,
      unitPrice: parsedPrice,
      date,
      supplier: supplier || (language === 'am' ? 'አገር ውስጥ የጅምላ ነጋዴ' : 'Local Wholesale Supplier'),
      grnNumber,
      notes,
    });

    setSuccessMsg(true);
    setTimeout(() => {
      setSuccessMsg(false);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-amber-500/40 text-slate-100 transition-all">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-500/20 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {language === 'am' ? 'አዲስ እቃ ወደ ስቶር ገቢ ማድረጊያ' : t.modals.stockInTitle}
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'am' ? 'የገባ እቃ በገበያው አዲሱ ዋጋ ይቀበሉ' : 'Accept received goods at current market rates'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="p-8 text-center space-y-4">
            <PackagePlus className="w-10 h-10 text-emerald-400 mx-auto" />
            <h4 className="font-bold text-sm text-white">
              {language === 'am' ? 'እቃዎችን ገቢ ለማድረግ መጀመሪያ አዲስ ጥሬ እቃ መመዝገብ አለበት' : 'Please register a raw material first'}
            </h4>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              {language === 'am' ? 'ጥሬ እቃዎችን ከላይ በሚገኘው «+ ጥሬ ዕቃ መዝግብ» በተን ይመዝግቡ።' : 'Use the "+ Add Item" button on the dashboard to register your materials.'}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
            >
              {t.common.close}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {successMsg && (
              <div className="p-3.5 bg-emerald-950/80 border border-emerald-500/50 rounded-2xl flex items-center gap-2 text-emerald-300 text-xs font-bold">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>{t.common.success}! {language === 'am' ? 'እቃው ወደ ማዕከላዊ ስቶር ገቢ ተደርጓል።' : 'Goods recorded into central store.'}</span>
              </div>
            )}

            {/* Calendar Date Picker */}
            <DatePickerField
              label={t.modals.selectDate}
              value={date}
              onChange={setDate}
              required
              helperText={language === 'am' ? 'የገባበት ትክክለኛ ቀን' : 'Arrival Date'}
            />

            {/* Smart Item Selector */}
            <div>
              <label className="block text-xs font-bold text-amber-300 mb-1.5">
                {t.modals.selectItem} <span className="text-rose-400">*</span>
              </label>
              <SmartItemSelector
                items={items}
                selectedItemId={itemId}
                onSelectItem={setItemId}
                placeholder={language === 'am' ? 'የሚገባውን ጥሬ እቃ ይምረጡ...' : 'Select item...'}
              />
            </div>

            {/* Quantity & Unit Price Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1.5">
                  {t.common.quantity} {selectedItem ? `(${selectedItem.unitAm})` : ''} <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  placeholder="0.00"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-amber-500/30 rounded-xl text-xs sm:text-sm text-white placeholder:text-slate-500 focus:bg-slate-900 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/40 font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1.5">
                  {language === 'am' ? 'የ1 አሃድ የመግዣ ዋጋ (ብር)' : t.modals.enterPrice} <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  placeholder="0.00"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-amber-500/30 rounded-xl text-xs sm:text-sm text-amber-300 placeholder:text-slate-500 focus:bg-slate-900 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/40 font-mono font-bold"
                  required
                />
              </div>
            </div>

            {/* Market Price Fluctuation Insight Box */}
            {selectedItem && parsedPrice > 0 && (
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-amber-500/20 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-slate-400">
                  <span>{language === 'am' ? 'የቀድሞ የገበያ ዋጋ:' : 'Previous Price:'}</span>
                  <span className="font-bold text-white font-mono">{formatCurrency(lastPrice)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{language === 'am' ? 'የዋጋ መዋዠቅ (+/- %):' : 'Price Change:'}</span>
                  <span
                    className={`font-black font-mono flex items-center gap-1 ${
                      priceDiff > 0
                        ? 'text-rose-400'
                        : priceDiff < 0
                        ? 'text-emerald-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {priceDiff > 0 ? `+${priceDiffPercent.toFixed(1)}% (ጨምሯል 📈)` : priceDiff < 0 ? `${priceDiffPercent.toFixed(1)}% (ቀንሷል 📉)` : 'ተመሳሳይ'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-800 text-xs">
                  <span className="text-emerald-400 font-bold">{language === 'am' ? 'አዲሱ አማካይ ዋጋ (Projected WAC):' : 'Projected WAC:'}</span>
                  <span className="font-black text-emerald-300 font-mono">{formatCurrency(projectedWac)}</span>
                </div>
              </div>
            )}

            {/* GRN & Supplier */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1.5">
                  {t.modals.grnNumber}
                </label>
                <input
                  type="text"
                  value={grnNumber}
                  onChange={(e) => setGrnNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-amber-500/30 rounded-xl text-xs text-white placeholder:text-slate-500 focus:bg-slate-900 focus:border-amber-400 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1.5">
                  {t.modals.supplierName}
                </label>
                <input
                  type="text"
                  placeholder={language === 'am' ? 'ለምሳሌ፡ መገናኛ የጅምላ ገበያ' : 'e.g. Merkato Wholesale'}
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-amber-500/30 rounded-xl text-xs text-white placeholder:text-slate-500 focus:bg-slate-900 focus:border-amber-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-amber-300 mb-1.5">
                {t.common.notes}
              </label>
              <input
                type="text"
                placeholder={language === 'am' ? 'ተጨማሪ መረጃ ወይም ደረሰኝ ቁጥር...' : 'Optional notes...'}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-amber-500/30 rounded-xl text-xs text-white placeholder:text-slate-500 focus:bg-slate-900 focus:border-amber-400"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl text-xs shadow-lg shadow-emerald-950/50 transition-all ring-1 ring-emerald-400/40"
              >
                {language === 'am' ? 'እቃውን አስገባ (Record Stock In)' : t.common.save}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

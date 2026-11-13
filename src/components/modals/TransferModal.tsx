import React, { useState } from 'react';
import { X, ArrowRightLeft, AlertCircle, CheckCircle2, Building2, Package } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { DatePickerField } from '../common/DatePickerField';
import { getTodayDateString } from '../../utils/ethiopianDate';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedItemId?: string;
  preselectedBranchId?: string;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  preselectedItemId,
  preselectedBranchId,
}) => {
  const { items, branches, transferToBranch, getBranchStockBalance } = useApp();
  const { language, t, formatCurrency } = useLanguage();

  const [itemId, setItemId] = useState(preselectedItemId || (items[0]?.id || ''));
  const [branchId, setBranchId] = useState(preselectedBranchId || (branches[0]?.id || ''));
  const [date, setDate] = useState(getTodayDateString());
  const [quantity, setQuantity] = useState<number | ''>('');
  const [sivNumber, setSivNumber] = useState(`SIV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState(false);

  if (!isOpen) return null;

  const selectedItem = items.find((i) => i.id === itemId);
  const selectedBranch = branches.find((b) => b.id === branchId);

  const centralStock = selectedItem ? selectedItem.currentCentralStock : 0;
  const branchCurrentStock = (selectedItem && selectedBranch)
    ? getBranchStockBalance(branchId, itemId)
    : 0;

  const parsedQty = typeof quantity === 'number' ? quantity : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!itemId || !branchId || !parsedQty) {
      setErrorMsg(language === 'am' ? 'እባክዎ ሁሉንም መረጃዎች ያስገቡ' : 'Please fill all required fields');
      return;
    }

    if (parsedQty > centralStock) {
      setErrorMsg(
        language === 'am'
          ? `በቂ የማዕከላዊ መጋዘን ክምችት የለም! ያለው: ${centralStock} ${selectedItem?.unitAm}`
          : `Insufficient stock in central store! Available: ${centralStock} ${selectedItem?.unit}`
      );
      return;
    }

    const res = transferToBranch({
      itemId,
      branchId,
      quantity: parsedQty,
      date,
      sivNumber,
      notes,
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
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-amber-500/30 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-500/20 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                {language === 'am' ? 'ከዋናው ስቶር ለቅርንጫፍ በ SIV ማስተላለፊያ' : 'Store Issue Voucher (SIV) Dispatch'}
              </h3>
              <p className="text-[11px] text-amber-400 font-medium">
                {language === 'am'
                  ? 'ከማዕከላዊ ስቶር ይቀነሳል፤ ወደ "የተላከለት (Sent To)" ሌጀር ይመዘገባል (የቅርንጫፍ ክምችትን በቀጥታ አይጨምርም)'
                  : 'Deducted from Central Store to Sent-To ledger (Never automatically adds to branch stock)'}
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

        {items.length === 0 || branches.length === 0 ? (
          <div className="p-8 text-center space-y-4">
            <ArrowRightLeft className="w-10 h-10 text-amber-400 mx-auto" />
            <h4 className="font-bold text-sm text-white">
              {language === 'am' ? 'ለቅርንጫፍ ለማስተላለፍ መጀመሪያ ቅርንጫፍ እና ጥሬ እቃ መመዝገብ አለበት' : 'Branches & items required for transfer'}
            </h4>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              {language === 'am' ? 'እባክዎ መጀመሪያ ቅርንጫፍዎን እና ጥሬ እቃዎችዎን ይመዝግቡ።' : 'Please register at least one branch and raw material first.'}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-950 text-white rounded-xl text-xs font-bold border border-slate-700"
            >
              {t.common.close}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
            {errorMsg && (
              <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-xl flex items-center gap-2 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl flex items-center gap-2 text-emerald-300 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>
                  {language === 'am'
                    ? 'እቃው ከማዕከላዊ ስቶር ተቀንሶ ወደ "የተላከለት" ሌጀር ተመዝግቧል (የቅርንጫፉ ክምችት ሳይነካ)!'
                    : 'Dispatched to Sent-To ledger. Branch balance is completely unchanged.'}
                </span>
              </div>
            )}

            {/* Calendar Date Picker */}
            <DatePickerField
              label={language === 'am' ? 'የወጣበት ቀን (Dispatch Date)' : 'Transfer Date'}
              value={date}
              onChange={setDate}
              required
              helperText={language === 'am' ? 'የኢትዮጵያ ቀን' : 'Ethiopian Date'}
            />

            {/* Item Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                {language === 'am' ? 'የሚተላለፈው ጥሬ ዕቃ:' : 'Select Item to Transfer:'} <span className="text-amber-400">*</span>
              </label>
              <select
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                required
              >
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {language === 'am' ? it.nameAm : it.nameEn} ({it.unitAm}) — {language === 'am' ? 'ማዕከላዊ ስቶር ውስጥ ያለው:' : 'Central Stock:'} {it.currentCentralStock}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Branch */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                {language === 'am' ? 'ተረካቢ ቅርንጫፍ (Target Branch):' : 'Target Branch:'} <span className="text-amber-400">*</span>
              </label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                required
              >
                {branches.map((br) => (
                  <option key={br.id} value={br.id}>
                    {language === 'am' ? br.nameAm : br.nameEn} ({br.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Balance Comparison Card */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950 rounded-2xl border border-amber-500/20 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">
                  {language === 'am' ? 'በማዕከላዊ ስቶር ያለው:' : 'Main Store Stock:'}
                </span>
                <span className="text-sm font-bold text-amber-300 font-mono">
                  {centralStock} {selectedItem?.unitAm}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">
                  {language === 'am' ? `በ${selectedBranch?.nameAm || 'ቅርንጫፉ'} ያለው:` : 'Branch Current:'}
                </span>
                <span className="text-sm font-bold text-blue-400 font-mono">
                  {branchCurrentStock} {selectedItem?.unitAm}
                </span>
              </div>
            </div>

            {/* Quantity & SIV Number */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {language === 'am' ? `የሚላክ መጠን (${selectedItem?.unitAm || ''}):` : 'Quantity:'} <span className="text-amber-400">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  max={centralStock}
                  placeholder="0.00"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {language === 'am' ? 'የ SIV ቁጥር (Store Issue Voucher):' : 'SIV Number:'}
                </label>
                <input
                  type="text"
                  value={sivNumber}
                  onChange={(e) => setSivNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                {language === 'am' ? 'የዝውውር ማስታወሻ / ምክንያት:' : 'Dispatch Notes:'}
              </label>
              <input
                type="text"
                placeholder={language === 'am' ? 'ለምሳሌ፡ ለሳምንቱ መደበኛ ስራ የተላከ...' : 'Notes...'}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-400/40"
              />
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
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-950/60 ring-1 ring-blue-400/40"
              >
                {language === 'am' ? 'በ SIV ለቅርንጫፍ አስተላልፍ' : 'Issue SIV to Branch'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

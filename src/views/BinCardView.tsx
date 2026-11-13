import React, { useState } from 'react';
import {
  ClipboardList,
  Printer,
  Download,
  Calendar,
  Filter,
  PlusCircle,
  ArrowRightLeft,
  Warehouse,
  CheckCircle,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { DatePickerField } from '../components/common/DatePickerField';
import { formatEthiopianDate, getRelativeDateString, getTodayDateString } from '../utils/ethiopianDate';

interface BinCardViewProps {
  initialItemId?: string;
  onOpenStockIn: (itemId?: string) => void;
  onOpenTransfer: (itemId?: string) => void;
}

export const BinCardView: React.FC<BinCardViewProps> = ({
  initialItemId,
  onOpenStockIn,
  onOpenTransfer,
}) => {
  const { items, centralBinCards } = useApp();
  const { language, t, formatCurrency } = useLanguage();

  const [selectedItemId, setSelectedItemId] = useState<string>(
    initialItemId || items[0]?.id || ''
  );

  // Date filters - Defaults to last 30 days
  const [startDate, setStartDate] = useState(getRelativeDateString(-30));
  const [endDate, setEndDate] = useState(getTodayDateString());
  const [filterType, setFilterType] = useState<string>('ALL');

  const selectedItem = items.find((i) => i.id === selectedItemId);

  // Filter bin cards for this specific item within date range
  const itemBinCards = centralBinCards
    .filter((entry) => entry.itemId === selectedItemId)
    .filter((entry) => {
      const isAfterStart = !startDate || entry.date >= startDate;
      const isBeforeEnd = !endDate || entry.date <= endDate;
      const matchesType = filterType === 'ALL' || entry.type === filterType;
      return isAfterStart && isBeforeEnd && matchesType;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Export to CSV
  const exportToCSV = () => {
    if (!selectedItem) return;
    const headers = [
      'Date (Gregorian)',
      'Ethiopian Date',
      'Ref No',
      'Type',
      'Qty In',
      'Qty Out',
      'Unit Price (ETB)',
      'Balance',
      'Party / Destination',
      'Recorded By',
    ];

    const rows = itemBinCards.map((e) => [
      e.date,
      e.ethiopianDateStr,
      e.refNo,
      e.type,
      e.quantityIn,
      e.quantityOut,
      e.unitPrice,
      e.balance,
      `"${e.supplierOrDestination}"`,
      `"${e.recordedBy}"`,
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BinCard_${selectedItem.code}_${endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const printBinCard = () => {
    window.print();
  };

  if (!selectedItem || items.length === 0) {
    return (
      <div className="bg-slate-900/80 rounded-3xl border border-amber-500/30 p-12 text-center shadow-2xl space-y-4 backdrop-blur-md">
        <div className="p-4 rounded-2xl bg-amber-950/80 text-amber-400 inline-block border border-amber-400/30">
          <ClipboardList className="w-10 h-10" />
        </div>
        <h2 className="text-lg font-bold text-white">
          {language === 'am' ? 'የቢን ካርድ መዝገብን ለማየት መጀመሪያ ጥሬ እቃዎችን ያስገቡ' : 'No items found for Bin Card'}
        </h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          {language === 'am'
            ? 'አዲስ ጥሬ እቃ ወደ ስቶር ሲመዘገብ የራሱ የሆነ የገቢ፣ የወጪ እና የቀሪ ክምችት ቢን ካርድ ወዲያውኑ ይዘጋጅለታል።'
            : 'Register a raw material item first. Each item automatically receives a dedicated Stock Bin Card.'}
        </p>
        <button
          onClick={() => onOpenStockIn()}
          className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-amber-500/20"
        >
          {language === 'am' ? '+ ጥሬ እቃ ወይም ገቢ እቃ መዝግብ' : '+ Record New Item / Stock In'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Item Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <ClipboardList className="w-6 h-6 text-amber-400" />
            <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
              {t.binCard.title}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {t.binCard.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          <button
            onClick={() => onOpenStockIn(selectedItemId)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950/50 transition-all ring-1 ring-emerald-400/40"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{language === 'am' ? '+ የገባ እቃ መዝግብ' : '+ Stock In (GRN)'}</span>
          </button>
          <button
            onClick={() => onOpenTransfer(selectedItemId)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-950/50 transition-all ring-1 ring-blue-400/40"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>{language === 'am' ? 'ለቅርንጫፍ አስተላልፍ' : 'Transfer to Branch'}</span>
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 border border-amber-500/40 hover:border-amber-400 text-amber-300 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>{t.common.exportCsv}</span>
          </button>
          <button
            onClick={printBinCard}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <Printer className="w-4 h-4 text-slate-300" />
            <span>{t.common.print}</span>
          </button>
        </div>
      </div>

      {/* Filter and Item Selector Bar (no-print) */}
      <div className="bg-slate-900/80 p-5 rounded-3xl border border-amber-500/20 shadow-2xl backdrop-blur-md space-y-4 no-print">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Select Item */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-amber-300 mb-1.5">
              {t.binCard.selectItem}
            </label>
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl text-sm font-bold text-white focus:outline-none transition-all"
            >
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  [{it.code}] {language === 'am' ? it.nameAm : it.nameEn} ({it.unitAm}) — {language === 'am' ? 'ቀሪ:' : 'Bal:'} {it.currentCentralStock}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date Picker - Requirement 1 */}
          <div>
            <DatePickerField
              label={language === 'am' ? 'ከቀን (Start Date)' : 'From Date'}
              value={startDate}
              onChange={setStartDate}
            />
          </div>

          {/* End Date Picker - Requirement 1 */}
          <div>
            <DatePickerField
              label={language === 'am' ? 'እስከ ቀን (End Date)' : 'To Date'}
              value={endDate}
              onChange={setEndDate}
            />
          </div>
        </div>

        {/* Quick Filter by Transaction Type */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800 text-xs">
          <span className="text-slate-400 font-semibold">{t.common.filter}:</span>
          {[
            { id: 'ALL', label: t.common.all },
            { id: 'IN_PURCHASE', label: language === 'am' ? 'የገቡ ብቻ (GRN)' : 'Receipts (In)' },
            { id: 'OUT_BRANCH_TRANSFER', label: language === 'am' ? 'የተላለፉ ብቻ (SIV)' : 'Transfers (Out)' },
            { id: 'OUT_DAMAGE', label: language === 'am' ? 'ብክነት/ጉዳት' : 'Damages' },
          ].map((tp) => (
            <button
              key={tp.id}
              onClick={() => setFilterType(tp.id)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                filterType === tp.id
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-md shadow-amber-500/25 ring-1 ring-amber-300/50 font-black'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              {tp.label}
            </button>
          ))}
        </div>
      </div>

      {/* Official Bin Card Printable Container */}
      {selectedItem && (
        <div className="bg-slate-900/80 rounded-3xl border border-amber-500/25 shadow-2xl overflow-hidden backdrop-blur-md">
          {/* Bin Card Header Banner with Gold Trim */}
          <div className="p-6 border-b border-amber-500/20 bg-slate-950/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase tracking-wider text-amber-400 font-black flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{language === 'am' ? 'የስቶክ ቢን ካርድ መዝገብ ቅጽ' : 'OFFICIAL STOCK BIN CARD RECORD'}</span>
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                  {language === 'am' ? selectedItem.nameAm : selectedItem.nameEn}
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                  <span>{language === 'am' ? 'ኮድ:' : 'Code:'} <strong className="text-amber-300 font-mono">{selectedItem.code}</strong></span>
                  <span>•</span>
                  <span>{language === 'am' ? 'መለኪያ:' : 'Unit:'} <strong className="text-white">{selectedItem.unitAm} ({selectedItem.unit})</strong></span>
                  <span>•</span>
                  <span>{language === 'am' ? 'ምድብ:' : 'Category:'} <strong className="text-white">{selectedItem.category}</strong></span>
                  <span>•</span>
                  <span>{language === 'am' ? 'ማስጠንቀቂያ ጣሪያ:' : 'Min Alert:'} <strong className="text-amber-300">{selectedItem.minStockLevel} {selectedItem.unitAm}</strong></span>
                </div>
              </div>

              {/* Current Central Balance Highlight */}
              <div className="flex items-center gap-4 bg-slate-950 p-4 rounded-2xl border border-amber-500/30 shadow-inner">
                <div>
                  <span className="text-[11px] text-slate-400 block font-semibold">
                    {language === 'am' ? 'የአሁን ቀሪ በማዕከላዊ ስቶር:' : 'Current Central Balance:'}
                  </span>
                  <span className="text-2xl font-black text-white">
                    {selectedItem.currentCentralStock.toLocaleString()} {selectedItem.unitAm}
                  </span>
                </div>
                <div className="border-l border-slate-800 pl-4">
                  <span className="text-[11px] text-slate-400 block font-semibold">
                    {language === 'am' ? 'አማካይ ዋጋ (WAC):' : 'Weighted Avg Cost:'}
                  </span>
                  <span className="text-base font-black text-amber-300">
                    {formatCurrency(selectedItem.weightedAvgCost)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bin Card Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/90 border-b border-amber-500/20 text-slate-300 font-bold uppercase tracking-wide text-[11px]">
                  <th className="py-3.5 px-4">{t.common.date}</th>
                  <th className="py-3.5 px-4">{t.binCard.refHeader}</th>
                  <th className="py-3.5 px-4">{t.binCard.transType}</th>
                  <th className="py-3.5 px-4 text-right bg-emerald-950/30 text-emerald-300 font-black">
                    {t.binCard.inQty}
                  </th>
                  <th className="py-3.5 px-4 text-right bg-rose-950/30 text-rose-300 font-black">
                    {t.binCard.outQty}
                  </th>
                  <th className="py-3.5 px-4 text-right">{t.binCard.unitRate}</th>
                  <th className="py-3.5 px-4 text-right bg-slate-950 text-amber-300 font-black">
                    {t.binCard.balQty}
                  </th>
                  <th className="py-3.5 px-4">{t.binCard.party}</th>
                  <th className="py-3.5 px-4">{t.common.recordedBy}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                {itemBinCards.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400 font-sans">
                      {language === 'am'
                        ? 'በዚህ የቀን ገደብ ውስጥ የተመዘገበ እንቅስቃሴ የለም'
                        : 'No transactions found for the selected date range'}
                    </td>
                  </tr>
                ) : (
                  itemBinCards.map((entry) => {
                    const isTransfer = entry.type === 'OUT_BRANCH_TRANSFER';
                    const isPurchase = entry.type === 'IN_PURCHASE';

                    return (
                      <tr
                        key={entry.id}
                        className="hover:bg-amber-500/[0.04] transition-colors"
                      >
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-bold text-white">
                            {entry.date}
                          </div>
                          <div className="text-[10px] text-amber-400 font-semibold">
                            🇪🇹 {entry.ethiopianDateStr}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-amber-300 whitespace-nowrap">
                          {entry.refNo}
                        </td>
                        <td className="py-3.5 px-4">
                          {isPurchase && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/50">
                              {language === 'am' ? 'የገባ እቃ (GRN)' : 'Stock In'}
                            </span>
                          )}
                          {isTransfer && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800/50">
                              {language === 'am' ? 'ዝውውር ለቅርንጫፍ (SIV)' : 'Transfer Out'}
                            </span>
                          )}
                          {entry.type === 'OUT_DAMAGE' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800/50">
                              {language === 'am' ? 'ብክነት / ጉዳት' : 'Damage/Waste'}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-emerald-400 bg-emerald-950/20">
                          {entry.quantityIn > 0 ? `+${entry.quantityIn} ${selectedItem.unitAm}` : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-rose-400 bg-rose-950/20">
                          {entry.quantityOut > 0 ? `-${entry.quantityOut} ${selectedItem.unitAm}` : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-300 font-medium">
                          {formatCurrency(entry.unitPrice)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-amber-300 bg-slate-950/80">
                          {entry.balance.toLocaleString()} {selectedItem.unitAm}
                        </td>
                        <td className="py-3.5 px-4 text-white">
                          <div className="font-semibold">{entry.supplierOrDestination}</div>
                          {entry.notes && (
                            <div className="text-[10px] text-slate-400 truncate max-w-xs">
                              {entry.notes}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                          {entry.recordedBy}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Notes */}
          <div className="p-4 bg-slate-950/80 border-t border-amber-500/20 flex items-center justify-between text-xs text-slate-400">
            <span>
              {language === 'am' ? 'ጠቅላላ የተመዘገቡ እንቅስቃሴዎች:' : 'Total recorded transactions:'} <strong className="text-white">{itemBinCards.length}</strong>
            </span>
            <span className="italic text-amber-400/80">
              {language === 'am' ? 'ማዕከላዊ ስቶር ቢን ካርድ መዝገብ' : 'Central Store Master Bin Card Registry'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

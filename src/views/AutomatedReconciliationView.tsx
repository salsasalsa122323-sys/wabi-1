import React, { useState, useMemo } from 'react';
import {
  Scale,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Building2,
  Calendar,
  FileCheck,
  ShieldCheck,
  ArrowRightLeft,
  DollarSign,
  AlertCircle,
  HelpCircle,
  Clock,
  Warehouse,
  ChefHat,
  Receipt,
  Check,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { formatEthiopianDate, getTodayDateString } from '../utils/ethiopianDate';
import { AutomatedReconciliationReport } from '../types';

export const AutomatedReconciliationView: React.FC = () => {
  const { language, formatCurrency } = useLanguage();
  const {
    branches,
    cutOverState,
    automatedReports,
    runAutomatedCrossMatching,
    approveReconciliationReport,
  } = useApp();

  const [selectedBranchId, setSelectedBranchId] = useState<string>(branches[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [managerNotes, setManagerNotes] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const selectedBranch = branches.find((b) => b.id === selectedBranchId) || branches[0];

  // Find existing report or trigger calculation
  const currentReport = useMemo(() => {
    return automatedReports.find(
      (r) => r.branchId === selectedBranchId && r.date === selectedDate
    );
  }, [automatedReports, selectedBranchId, selectedDate]);

  // Check if department cut-over opening balance has been confirmed
  const deptCutOver = cutOverState.departments[selectedBranchId];
  const isCutOverConfirmed = deptCutOver?.isConfirmed;

  const handleRunReconciliation = () => {
    if (!isCutOverConfirmed) {
      alert(
        language === 'am'
          ? `የ${selectedBranch.nameAm} የመነሻ ስቶክ ቆጠራ እስካሁን አልተረጋገጠም! እባክዎ በቅድሚያ ወደ "መነሻ ስቶክ መቁረጫ (Cut-Over)" ገጽ ሄደው ቆጠራውን ያረጋግጡ።`
          : 'Department opening balance has not been confirmed! Please confirm opening balance in Cut-Over first.'
      );
      return;
    }

    const report = runAutomatedCrossMatching(selectedBranchId, selectedDate);
    setStatusMessage('✅ አውቶማቲክ የ 3-ወገን ሪኮንሲሌሽን ተጠናቋል! ዝርዝሩ ተዘጋጅቷል።');
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleApproveReport = () => {
    if (!currentReport) return;
    approveReconciliationReport(currentReport.id, managerNotes);
    setStatusMessage('✅ የሪኮንሲሌሽን ሪፖርቱ በማኔጀር ተረጋግጧል!');
    setTimeout(() => setStatusMessage(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/30 p-5 rounded-3xl border border-amber-500/30 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/40 text-amber-400 shrink-0">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white">
                {language === 'am' ? 'አውቶማቲክ ሪኮንሲሌሽን እና ቁጥጥር (AI Cross-Matching)' : 'Automated 3-Way Reconciliation'}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-500/40">
                ZERO-MANUAL ENGINE
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              {language === 'am'
                ? 'ስቶር ያወጣውን (SIV) ከሼፉ ርክክብ ጋር፣ የኩሽናውን እውነተኛ ፍጆታ (Opening + In - Remaining - Waste) ከካሸር ሽያጭ ሪሲፒ ጋር አመሳክሮ ጉድለትን በገንዘብ ያወጣል።'
                : 'Automated 3-way cross-matching between Store Issues, Kitchen Usage Logs, and Cashier POS recipe consumption.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center">
          <button
            type="button"
            onClick={handleRunReconciliation}
            className="px-5 py-2.5 rounded-2xl font-bold text-xs text-slate-950 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 shadow-xl shadow-amber-500/25 flex items-center gap-2 cursor-pointer transition-all"
          >
            <Sparkles className="w-4 h-4 text-slate-950 stroke-[2.5]" />
            <span>{language === 'am' ? '⚡ ሪኮንሲሌሽን አከናውን (Run Reconciliation)' : 'Run Reconciliation'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {statusMessage && (
        <div className="p-3.5 bg-emerald-950/90 border border-emerald-500/50 rounded-2xl text-xs font-bold text-emerald-300 flex items-center gap-2 shadow-lg animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Cut-Over Guard Warning if not confirmed */}
      {!isCutOverConfirmed && (
        <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs font-bold flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>
              ለ{selectedBranch.nameAm} የመነሻ ስቶክ ቆጠራ እስካሁን አልተረጋገጠም! ሪኮንሲሌሽን ለመስራት በቅድሚያ የመነሻ ቆጠራውን ማረጋገጥ ግዴታ ነው።
            </span>
          </div>
        </div>
      )}

      {/* Filters (Branch & Date) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 p-3 rounded-2xl border border-slate-800 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-400" />
            <span className="text-slate-400 font-bold">ቅርንጫፍ፦</span>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold outline-none focus:border-amber-400"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nameAm} ({b.nameEn})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span className="text-slate-400 font-bold">ቀን፦</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono outline-none focus:border-amber-400"
            />
            <span className="text-slate-400 text-[11px]">
              ({formatEthiopianDate(selectedDate, language)})
            </span>
          </div>
        </div>

        {/* Missing Submissions Checklist Status */}
        {currentReport && (
          <div className="flex items-center gap-2 text-[11px] font-bold">
            <span className="text-slate-400">የክፍሎች ሁኔታ፦</span>
            <span className={`px-2 py-0.5 rounded-lg border ${
              currentReport.missingSubmissions.storeSivMissing
                ? 'bg-rose-950/60 text-rose-400 border-rose-500/40'
                : 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40'
            }`}>
              ስቶር SIV {currentReport.missingSubmissions.storeSivMissing ? '✕ ጎድሏል' : '✓ ቀርቧል'}
            </span>
            <span className={`px-2 py-0.5 rounded-lg border ${
              currentReport.missingSubmissions.chefCountMissing
                ? 'bg-rose-950/60 text-rose-400 border-rose-500/40'
                : 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40'
            }`}>
              የሼፍ ቆጠራ {currentReport.missingSubmissions.chefCountMissing ? '✕ ጎድሏል' : '✓ ቀርቧል'}
            </span>
            <span className={`px-2 py-0.5 rounded-lg border ${
              currentReport.missingSubmissions.cashierSalesMissing
                ? 'bg-rose-950/60 text-rose-400 border-rose-500/40'
                : 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40'
            }`}>
              የካሸር ሽያጭ {currentReport.missingSubmissions.cashierSalesMissing ? '✕ ጎድሏል' : '✓ ቀርቧል'}
            </span>
          </div>
        )}
      </div>

      {/* Main Report Dashboard */}
      {currentReport ? (
        <div className="space-y-6">
          {/* Top KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="text-[11px] text-slate-400">እውነተኛ የኩሽና ፍጆታ (Actual Usage Cost)</div>
              <div className="text-lg font-black font-mono text-white">
                {formatCurrency(currentReport.totalActualUsageCost)}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="text-[11px] text-slate-400">በሽያጭ መውጣት የነበረበት (Expected Sales Cost)</div>
              <div className="text-lg font-black font-mono text-blue-400">
                {formatCurrency(currentReport.totalExpectedCost)}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="text-[11px] text-slate-400">የታየ ጠቅላላ ጉድለት/ኪሳራ (Variance Loss)</div>
              <div className={`text-lg font-black font-mono ${
                currentReport.totalVarianceLossValue > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}>
                {currentReport.totalVarianceLossValue > 0 ? '-' : ''}
                {formatCurrency(currentReport.totalVarianceLossValue)}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <div className="text-[11px] text-slate-400">የዕለቱ የካሸር ሽያጭ ገቢ (Sales Revenue)</div>
              <div className="text-lg font-black font-mono text-emerald-300">
                {formatCurrency(currentReport.totalSalesRevenue)}
              </div>
            </div>
          </div>

          {/* Transfer Mismatch Alert Box (Store Issued vs Chef Received) */}
          {currentReport.transferMismatches.length > 0 && (
            <div className="bg-rose-950/40 rounded-3xl p-5 border border-rose-500/50 space-y-3">
              <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                <span>
                  የስቶር እና የሼፍ የርክክብ ልዩነት ተገኝቷል! ({currentReport.transferMismatches.length} እቃዎች)
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                ስቶር ኪፐሩ በ SIV የወጣ ብሎ የላከው መጠን እና የብራንቹ ሼፍ ተረክቤያለሁ ብሎ የመዘገበው እኩል አይደለም።
              </p>

              <div className="overflow-x-auto rounded-xl border border-rose-500/30 bg-slate-950/80">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-rose-500/30 text-slate-400 bg-slate-950">
                      <th className="p-2">የእቃው ስም</th>
                      <th className="p-2 text-center">ስቶር የሰጠው</th>
                      <th className="p-2 text-center">ሼፉ የተቀበለው</th>
                      <th className="p-2 text-center">ልዩነት</th>
                      <th className="p-2 text-right">የጉዳት ዋጋ</th>
                      <th className="p-2">SIV ቁጥር</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-500/20">
                    {currentReport.transferMismatches.map((m, i) => (
                      <tr key={i}>
                        <td className="p-2 font-bold text-white">{m.itemName}</td>
                        <td className="p-2 text-center font-mono">{m.storeIssuedQty} {m.unit}</td>
                        <td className="p-2 text-center font-mono font-bold text-amber-300">{m.chefReceivedQty} {m.unit}</td>
                        <td className="p-2 text-center font-mono font-black text-rose-400">{m.difference} {m.unit}</td>
                        <td className="p-2 text-right font-mono font-bold text-rose-400">{formatCurrency(m.lossValue)}</td>
                        <td className="p-2 font-mono text-[11px] text-slate-400">{m.sivNo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Detailed Item Usage & Recipe Reconciliation Table */}
          <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-amber-400" />
                <span>የእቃዎች ትክክለኛ ፍጆታ እና የሽያጭ ሪሲፒ ንጽጽር ሰንጠረዥ</span>
              </h3>
              <span className="text-xs text-slate-400">
                ቀመር፦ የመነሻ ስቶክ + የገባ - የቀረ ቆጠራ - ብክነት = እውነተኛ ፍጆታ
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-950">
                    <th className="py-2.5 px-3">የእቃው ስም</th>
                    <th className="py-2.5 px-2 text-center">መነሻ</th>
                    <th className="py-2.5 px-2 text-center">የገባ</th>
                    <th className="py-2.5 px-2 text-center">የቀረ ቆጠራ</th>
                    <th className="py-2.5 px-2 text-center">ብክነት</th>
                    <th className="py-2.5 px-3 text-center bg-slate-900 font-bold text-amber-300">እውነተኛ ፍጆታ</th>
                    <th className="py-2.5 px-3 text-center bg-blue-950/40 font-bold text-blue-300">በሽያጭ የታሰበ</th>
                    <th className="py-2.5 px-3 text-center font-bold">ልዩነት (Variance)</th>
                    <th className="py-2.5 px-3 text-right">የልዩነት ዋጋ</th>
                    <th className="py-2.5 px-3 text-center">ሁኔታ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {currentReport.itemReconciliations.map((item) => (
                    <tr key={item.itemId} className="hover:bg-slate-900/60">
                      <td className="py-2 px-3 font-bold text-white">
                        {item.itemName}
                        <div className="text-[10px] text-slate-400">@ {formatCurrency(item.unitCost)}/{item.unit}</div>
                      </td>
                      <td className="py-2 px-2 text-center font-mono text-slate-300">{item.openingStock}</td>
                      <td className="py-2 px-2 text-center font-mono text-emerald-400">+{item.receivedFromStore}</td>
                      <td className="py-2 px-2 text-center font-mono text-slate-300">{item.remainingStockOnHand}</td>
                      <td className="py-2 px-2 text-center font-mono text-rose-400">{item.recordedWastage}</td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-amber-300 bg-slate-900/80">
                        {item.actualUsage} {item.unit}
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-blue-300 bg-blue-950/20">
                        {item.expectedUsageFromSales} {item.unit}
                      </td>
                      <td className={`py-2 px-3 text-center font-mono font-black ${
                        item.varianceQuantity < 0 ? 'text-rose-400' : item.varianceQuantity > 0 ? 'text-blue-400' : 'text-emerald-400'
                      }`}>
                        {item.varianceQuantity > 0 ? `+${item.varianceQuantity}` : item.varianceQuantity} {item.unit}
                      </td>
                      <td className={`py-2 px-3 text-right font-mono font-bold ${
                        item.varianceValue < 0 ? 'text-rose-400' : 'text-slate-300'
                      }`}>
                        {formatCurrency(Math.abs(item.varianceValue))}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {item.varianceType === 'NORMAL' && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                            ትክክል ✓
                          </span>
                        )}
                        {item.varianceType === 'SHORTAGE_LOSS' && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-[10px] font-bold border border-rose-500/30">
                            ጉድለት ✕
                          </span>
                        )}
                        {item.varianceType === 'SURPLUS' && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold border border-blue-500/30">
                            ትርፍ ↑
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Manager Sign-off Area */}
            <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex-1 w-full sm:max-w-md">
                <input
                  type="text"
                  value={managerNotes}
                  onChange={(e) => setManagerNotes(e.target.value)}
                  placeholder="የማኔጀር ኦዲት ማስታወሻ..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs outline-none focus:border-amber-400"
                />
              </div>

              <div>
                {currentReport.managerApproved ? (
                  <span className="px-4 py-2 rounded-xl bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>ይህ ሪፖርት በማኔጀር ጸድቋል (Approved)</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleApproveReport}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    <span>ሪፖርቱን አጽድቅ (Approve Report)</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-10 rounded-3xl bg-slate-900 border border-dashed border-slate-800 text-center space-y-3">
          <Scale className="w-12 h-12 text-slate-600 mx-auto" />
          <h4 className="text-base font-bold text-white">ለዚህ ቀን እስካሁን ሪኮንሲሌሽን አልተሰራም</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            የስቶር፣ የሼፍ እና የካሸር ቅጾች ከገቡ በኋላ ከላይ ያለውን "⚡ ሪኮንሲሌሽን አከናውን" በተን ሲጫኑ፤ AI የ 3ቱን ክፍሎች መረጃ አመሳክሮ የጉድለት እና ትርፍ ሪፖርት ያቀርብልዎታል።
          </p>
        </div>
      )}
    </div>
  );
};

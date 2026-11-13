import React, { useState } from 'react';
import {
  Scale,
  RefreshCw,
  Download,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  ArrowRightLeft,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Building2,
  Calendar,
  Sparkles,
  Search,
  Eye,
  Check,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import {
  FullReconciliationReport,
  ItemUsageVariance,
  StoreTransferDiscrepancy,
  SalesDiscrepancy,
  ExcelParsedRow,
} from '../types';
import { getTodayDateString, formatEthiopianDate } from '../utils/ethiopianDate';
import { MenuSearchBox } from '../components/common/MenuSearchBox';
import { smartMatchMenuItem } from '../utils/searchMatcher';

export const FullReconciliationView: React.FC = () => {
  const {
    branches,
    items,
    uploadedBatches,
    fullReconciliationReports,
    runFullReconciliation,
    approveFullReconciliationReport,
    exportReportToExcel,
    selectedPrimaryItemIds,
    togglePrimaryItem,
    selectAllPrimaryItems,
    selectDefaultPrimaryItems,
  } = useApp();
  const { language, formatCurrency } = useLanguage();

  const [selectedBranchId, setSelectedBranchId] = useState<string>(branches[0]?.id || '');
  const [selectedPeriod, setSelectedPeriod] = useState<string>(getTodayDateString());
  const [isCalculating, setIsCalculating] = useState(false);
  const [narrativeLang, setNarrativeLang] = useState<'am' | 'en'>(language === 'am' ? 'am' : 'en');
  const [activeTab, setActiveTab] = useState<'items' | 'transfers' | 'sales' | 'anomalies'>('items');
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [isPrimarySelectorOpen, setIsPrimarySelectorOpen] = useState(false);

  // Drill-down row inspection modal state
  const [drillDownRows, setDrillDownRows] = useState<ExcelParsedRow[] | null>(null);
  const [drillDownTitle, setDrillDownTitle] = useState('');

  // Manager approval modal
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [managerNotes, setManagerNotes] = useState('');

  const currentBranch = branches.find((b) => b.id === selectedBranchId) || branches[0];

  // Active report for current branch & period
  const activeReport = fullReconciliationReports.find(
    (r) => r.branchId === selectedBranchId && r.period === selectedPeriod
  ) || fullReconciliationReports.find((r) => r.branchId === selectedBranchId) || fullReconciliationReports[0];

  const handleRunReconciliation = async () => {
    setIsCalculating(true);
    try {
      await runFullReconciliation(selectedBranchId, selectedPeriod);
    } catch (err) {
      console.error('Reconciliation failed:', err);
    } finally {
      setIsCalculating(false);
    }
  };

  // Filter items in the table
  const filteredItemVariances = (activeReport?.itemVariances || []).filter((iv) => {
    return smartMatchMenuItem(itemSearchQuery, {
      nameAm: iv.itemNameAm,
      nameEn: iv.itemNameEn,
      category: iv.status,
    });
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
            {language === 'am' ? 'አውቶማቲክ የሪኮንሲሌሽን ሞተር (Step 6 & 9)' : '4-Stage Automated Reconciliation'}
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5 mt-1">
            <Scale className="w-6 h-6 text-amber-400" />
            <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
              {language === 'am' ? 'የቅርንጫፎች አጠቃላይ የሂሳብ ማዛመጃ እና ኦዲት' : 'Multi-Branch F&B Reconciliation & Audit'}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            {language === 'am'
              ? 'ስቶር ─► ቅርንጫፍ ─► ሽያጭ 4ቱን ደረጃዎች በራስ-ሰር በማነጻጸር ትክክለኛ የግብአት አጠቃቀምን ከካሸር ሽያጭ እና ሪሲፒ ጋር ያዛምዳል፤ ጉድለቶችን በብር አስልቶ ሪፖርት ያወጣል።'
              : 'Executes the Store ─► Branch Transfers ─► Recipe Consumption ─► POS Sales reconciliation chain. Pinpoints exact shrinkage and generates Excel spreadsheets.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {activeReport && (
            <button
              onClick={() => exportReportToExcel(activeReport)}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-slate-950 font-black rounded-xl text-xs transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <FileSpreadsheet className="w-4 h-4 text-slate-950" />
              <span>{language === 'am' ? 'ኤክሴል አውርድ (.xlsx)' : 'Export Excel (.xlsx)'}</span>
            </button>
          )}

          <button
            onClick={handleRunReconciliation}
            disabled={isCalculating}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 text-slate-950 font-black rounded-xl text-xs sm:text-sm transition-all flex items-center gap-2 shadow-lg shadow-amber-500/25 ring-1 ring-amber-300/60"
          >
            <RefreshCw className={`w-4 h-4 ${isCalculating ? 'animate-spin' : ''}`} />
            <span>{isCalculating ? (language === 'am' ? 'በማስላት ላይ...' : 'Calculating...') : (language === 'am' ? '⚡ ሪኮንሲሌሽን አስላ' : '⚡ Run Reconciliation')}</span>
          </button>
        </div>
      </div>

      {/* Control Bar: Branch Selector & Period */}
      <div className="bg-slate-900/90 p-3 sm:p-4 rounded-2xl border border-amber-500/25 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 shrink-0 px-1">
            <Building2 className="w-4 h-4" />
            <span>{language === 'am' ? 'ቅርንጫፍ:' : 'Branch:'}</span>
          </span>
          {branches.map((br) => {
            const isSelected = br.id === selectedBranchId;
            return (
              <button
                key={br.id}
                onClick={() => setSelectedBranchId(br.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  isSelected
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-md font-black'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {language === 'am' ? br.nameAm : br.nameEn}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPrimarySelectorOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-950 hover:bg-slate-800 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <span>🎯 {language === 'am' ? `ፕራይመሪ ማቴሪያሎች (${selectedPrimaryItemIds.length})` : `Primary Items (${selectedPrimaryItemIds.length})`}</span>
          </button>

          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-amber-400" />
            <input
              type="date"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-1 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono outline-none focus:border-amber-400"
            />
          </div>
        </div>
      </div>

      {/* Missing Data Banners */}
      {activeReport?.missingDataWarnings && activeReport.missingDataWarnings.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/30 text-xs space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>{language === 'am' ? 'ያልተሟሉ የኤክሴል ፋይሎች ማንቂያ (Missing Ingestion Files):' : 'Missing Ingestion Files Warning:'}</span>
          </div>
          <div className="space-y-1 text-slate-300 text-[11px]">
            {activeReport.missingDataWarnings.map((w, idx) => (
              <p key={idx} className="flex items-center gap-1.5">
                • <span>{w}</span>
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Primary KPI Metrics Cards */}
      {activeReport && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-amber-500/20 space-y-1 shadow-lg">
            <span className="text-[11px] text-slate-400 block font-semibold">
              {language === 'am' ? 'የካሸር ሽያጭ ገቢ (POS Revenue)' : 'Total POS Sales'}
            </span>
            <div className="text-lg sm:text-xl font-black text-white font-mono">
              {formatCurrency(activeReport.totalSalesRevenue)}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-amber-500/20 space-y-1 shadow-lg">
            <span className="text-[11px] text-slate-400 block font-semibold">
              {language === 'am' ? 'የሚጠበቅ ወጪ (Recipe Theory)' : 'Theoretical Cost'}
            </span>
            <div className="text-lg sm:text-xl font-black text-amber-300 font-mono">
              {formatCurrency(activeReport.totalExpectedCost)}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-amber-500/20 space-y-1 shadow-lg">
            <span className="text-[11px] text-slate-400 block font-semibold">
              {language === 'am' ? 'ትክክለኛ ፍጆታ (Actual Usage)' : 'Actual Kitchen Cost'}
            </span>
            <div className="text-lg sm:text-xl font-black text-amber-200 font-mono">
              {formatCurrency(activeReport.totalActualUsageCost)}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-amber-500/20 space-y-1 shadow-lg">
            <span className="text-[11px] text-slate-400 block font-semibold">
              {language === 'am' ? 'የጉድለት/ልዩነት ዋጋ (Net Variance Loss)' : 'Net Variance Loss'}
            </span>
            <div className={`text-lg sm:text-xl font-black font-mono ${activeReport.totalVarianceLossValue > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {activeReport.totalVarianceLossValue > 0 ? `-${formatCurrency(activeReport.totalVarianceLossValue)}` : 'ETB 0.00'}
            </div>
          </div>
        </div>
      )}

      {/* AI Plain-Language Human Auditor Narrative Box */}
      {activeReport && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-amber-950/30 p-5 rounded-3xl border border-amber-500/30 shadow-2xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-black text-white">
                {language === 'am'
                  ? 'የኦዲተር ማጠቃለያ ትንተና (Human Controller Narrative)'
                  : 'Executive Controller Audit Narrative'}
              </h3>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
              <button
                onClick={() => setNarrativeLang('am')}
                className={`px-2.5 py-0.5 rounded-lg font-bold transition-all ${
                  narrativeLang === 'am' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                አማርኛ
              </button>
              <button
                onClick={() => setNarrativeLang('en')}
                className={`px-2.5 py-0.5 rounded-lg font-bold transition-all ${
                  narrativeLang === 'en' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                English
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
            {narrativeLang === 'am'
              ? (activeReport.aiAuditNarrativeAm || 'የሪኮንሲሌሽን ትንተና ለማመንጨት "ሪኮንሲሌሽን አስላ" የሚለውን ይጫኑ።')
              : (activeReport.aiAuditNarrativeEn || 'Click "Run Reconciliation" to synthesize the executive narrative.')}
          </p>

          {/* Action Items List */}
          {activeReport.actionItems && activeReport.actionItems.length > 0 && (
            <div className="pt-2 border-t border-slate-800/80">
              <span className="text-[11px] font-bold text-amber-400 block mb-1.5">
                {language === 'am' ? 'የማኔጅመንት አፋጣኝ የቁጥጥር እርምጃዎች (Action Items):' : 'Immediate Management Actions:'}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {activeReport.actionItems.map((act, idx) => (
                  <div key={idx} className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 flex items-start gap-1.5">
                    <span className="text-amber-400 font-bold shrink-0">{idx + 1}.</span>
                    <span>{act}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reconciliation Detail Tabs */}
      <div className="space-y-4">
        <div className="flex border-b border-slate-800 gap-4 text-xs font-bold">
          <button
            onClick={() => setActiveTab('items')}
            className={`pb-2.5 transition-all flex items-center gap-1.5 ${
              activeTab === 'items'
                ? 'border-b-2 border-amber-400 text-amber-300 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>{language === 'am' ? '1. የግብአት አጠቃቀም እና ሪሲፒ (Item Usage)' : '1. Item Usage & Recipes'}</span>
            <span className="font-mono text-[10px] text-slate-500">({activeReport?.itemVariances?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('transfers')}
            className={`pb-2.5 transition-all flex items-center gap-1.5 ${
              activeTab === 'transfers'
                ? 'border-b-2 border-amber-400 text-amber-300 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>{language === 'am' ? '2. የስቶር እና ኩሽና ዝውውር (SIV Match)' : '2. Store Transfer Match'}</span>
            <span className="font-mono text-[10px] text-slate-500">({activeReport?.storeTransferDiscrepancies?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('sales')}
            className={`pb-2.5 transition-all flex items-center gap-1.5 ${
              activeTab === 'sales'
                ? 'border-b-2 border-amber-400 text-amber-300 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>{language === 'am' ? '3. የካሸር ሽያጭ እና ኩሽና ምርት (Sales vs Production)' : '3. Sales vs Production'}</span>
            <span className="font-mono text-[10px] text-slate-500">({activeReport?.salesDiscrepancies?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('anomalies')}
            className={`pb-2.5 transition-all flex items-center gap-1.5 ${
              activeTab === 'anomalies'
                ? 'border-b-2 border-amber-400 text-amber-300 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>{language === 'am' ? '4. አኖማሊዎች (Anomalies)' : '4. Anomaly Flags'}</span>
            <span className="font-mono text-[10px] text-rose-400">({activeReport?.anomalies?.length || 0})</span>
          </button>
        </div>

        {/* TAB 1: ITEM USAGE & RECIPES VARIANCE */}
        {activeTab === 'items' && (
          <div className="space-y-3">
            <MenuSearchBox
              query={itemSearchQuery}
              onChange={setItemSearchQuery}
              placeholder={language === 'am' ? 'በእቃ ስም ወይም ሁኔታ ፈልግ...' : 'Filter items by name or status...'}
              resultCount={filteredItemVariances.length}
              totalCount={activeReport?.itemVariances?.length || 0}
            />

            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/70">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-slate-400 border-b border-slate-800 font-bold text-[11px]">
                    <th className="py-2.5 px-3">{language === 'am' ? 'የዕቃ ስም' : 'Item Name'}</th>
                    <th className="py-2.5 px-3">{language === 'am' ? 'መለኪያ' : 'Unit'}</th>
                    <th className="py-2.5 px-3 text-right">{language === 'am' ? 'የመነሻ ቆጠራ' : 'Opening'}</th>
                    <th className="py-2.5 px-3 text-right">{language === 'am' ? 'የተረከበው' : 'Received'}</th>
                    <th className="py-2.5 px-3 text-right">{language === 'am' ? 'ብክነት' : 'Waste'}</th>
                    <th className="py-2.5 px-3 text-right">{language === 'am' ? 'የመጨረሻ ቆጠራ' : 'Ending'}</th>
                    <th className="py-2.5 px-3 text-right font-black text-amber-300">{language === 'am' ? 'ትክክለኛ ፍጆታ' : 'Actual Use'}</th>
                    <th className="py-2.5 px-3 text-right">{language === 'am' ? 'የሚጠበቅ (ሽያጭ)' : 'Expected'}</th>
                    <th className="py-2.5 px-3 text-right font-black">{language === 'am' ? 'ልዩነት' : 'Variance'}</th>
                    <th className="py-2.5 px-3 text-right font-black">{language === 'am' ? 'የጉድለት ዋጋ' : 'Loss (ETB)'}</th>
                    <th className="py-2.5 px-3 text-center">{language === 'am' ? 'ሁኔታ' : 'Status'}</th>
                    <th className="py-2.5 px-3 text-center">{language === 'am' ? 'ኤክሴል መስመር' : 'Provenance'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {filteredItemVariances.map((iv) => {
                    const isShortage = iv.status === 'Shortage' || iv.varianceQuantity > 0.05;
                    const isOverage = iv.status === 'Overage' || iv.varianceQuantity < -0.05;
                    return (
                      <tr key={iv.id} className="hover:bg-slate-900/50 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-white">
                          <span>{language === 'am' ? iv.itemNameAm : iv.itemNameEn}</span>
                          {iv.suspectedCause && (
                            <span className="block text-[10px] text-slate-400 font-normal truncate max-w-xs">
                              {iv.suspectedCause}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">{iv.unit}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-300 text-right">{iv.openingStock}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-300 text-right">{iv.receivedFromStore}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-400 text-right">{iv.wastage}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-300 text-right">{iv.closingStock}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-amber-300 text-right">{iv.actualUsage}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-300 text-right">{iv.expectedUsageFromSales}</td>
                        <td className={`py-2.5 px-3 font-mono font-black text-right ${isShortage ? 'text-rose-400' : isOverage ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {iv.varianceQuantity > 0 ? `+${iv.varianceQuantity}` : iv.varianceQuantity}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-black text-right text-white">
                          {iv.varianceValueEtb > 0 ? formatCurrency(iv.varianceValueEtb) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {isShortage ? (
                            <span className="text-[10px] font-black text-rose-400">ጉድለት (Shortage)</span>
                          ) : isOverage ? (
                            <span className="text-[10px] font-bold text-amber-400">ትርፍ (Overage)</span>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-400">ትክክል (Matched)</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            title="Drill-down to Excel row"
                            onClick={() => {
                              setDrillDownRows(iv.sourceRows || []);
                              setDrillDownTitle(`${iv.itemNameAm} — Excel Provenance`);
                            }}
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-700 transition-colors inline-flex items-center gap-1 text-[10px]"
                          >
                            <Eye className="w-3 h-3" />
                            <span>{iv.sourceRows?.length || 0} rows</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: STORE VS KITCHEN SIV TRANSFER */}
        {activeTab === 'transfers' && (
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/70">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-slate-400 border-b border-slate-800 font-bold text-[11px]">
                  <th className="py-2.5 px-3">SIV No</th>
                  <th className="py-2.5 px-3">{language === 'am' ? 'የዕቃ ስም' : 'Item Name'}</th>
                  <th className="py-2.5 px-3">{language === 'am' ? 'መለኪያ' : 'Unit'}</th>
                  <th className="py-2.5 px-3 text-right">{language === 'am' ? 'ስቶር የወጣው (Issued)' : 'Store Issued'}</th>
                  <th className="py-2.5 px-3 text-right">{language === 'am' ? 'ኩሽና የተረከበው (Received)' : 'Branch Received'}</th>
                  <th className="py-2.5 px-3 text-right">{language === 'am' ? 'ልዩነት' : 'Discrepancy'}</th>
                  <th className="py-2.5 px-3 text-right">{language === 'am' ? 'የጉድለት ዋጋ (ETB)' : 'Loss Value'}</th>
                  <th className="py-2.5 px-3 text-center">{language === 'am' ? 'ሁኔታ' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {(activeReport?.storeTransferDiscrepancies || []).map((td) => (
                  <tr key={td.id} className="hover:bg-slate-900/50">
                    <td className="py-2.5 px-3 font-mono text-amber-400 font-bold">{td.sivNumber}</td>
                    <td className="py-2.5 px-3 font-semibold text-white">{td.itemName}</td>
                    <td className="py-2.5 px-3 text-slate-400">{td.unit}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-300 text-right">{td.storeIssuedQty}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-300 text-right">{td.branchReceivedQty}</td>
                    <td className={`py-2.5 px-3 font-mono font-black text-right ${td.discrepancyQty !== 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {td.discrepancyQty > 0 ? `+${td.discrepancyQty}` : td.discrepancyQty}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-black text-right text-white">
                      {td.discrepancyValueEtb > 0 ? formatCurrency(td.discrepancyValueEtb) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {td.status === 'SHORTAGE_AT_BRANCH' ? (
                        <span className="text-[10px] font-black text-rose-400">ኩሽናው ያላረጋገጠው (Shortage)</span>
                      ) : td.status === 'STORE_UNACKNOWLEDGED' ? (
                        <span className="text-[10px] font-bold text-amber-400">ስቶር ያልተመዘገበ (No SIV)</span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-400">ተጣጥሟል (Matched)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: POS CASHIER SALES VS KITCHEN TICKETS */}
        {activeTab === 'sales' && (
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/70">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-slate-400 border-b border-slate-800 font-bold text-[11px]">
                  <th className="py-2.5 px-3">{language === 'am' ? 'የምግብ/ሜኑ ስም' : 'Menu Dish'}</th>
                  <th className="py-2.5 px-3">{language === 'am' ? 'ቀን/ሺፍት' : 'Date / Shift'}</th>
                  <th className="py-2.5 px-3 text-right">{language === 'am' ? 'በካሸር የተሸጠ' : 'Cashier Sold'}</th>
                  <th className="py-2.5 px-3 text-right">{language === 'am' ? 'ኩሽና ያዘጋጀው' : 'Kitchen Produced'}</th>
                  <th className="py-2.5 px-3 text-right">{language === 'am' ? 'ልዩነት' : 'Discrepancy'}</th>
                  <th className="py-2.5 px-3 text-right">{language === 'am' ? 'የሽያጭ ዋጋ' : 'Menu Price'}</th>
                  <th className="py-2.5 px-3 text-right">{language === 'am' ? 'የገንዘብ ልዩነት' : 'Amount Difference'}</th>
                  <th className="py-2.5 px-3 text-center">{language === 'am' ? 'ሁኔታ' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {(activeReport?.salesDiscrepancies || []).map((sd) => (
                  <tr key={sd.id} className="hover:bg-slate-900/50">
                    <td className="py-2.5 px-3 font-semibold text-white">{sd.menuItemName}</td>
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{sd.date}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-200 text-right font-bold">{sd.cashierSoldQty}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-300 text-right">{sd.kitchenProducedQty}</td>
                    <td className={`py-2.5 px-3 font-mono font-black text-right ${sd.discrepancyQty !== 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {sd.discrepancyQty > 0 ? `+${sd.discrepancyQty}` : sd.discrepancyQty}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-300 text-right">{formatCurrency(sd.menuPrice)}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-white text-right">
                      {sd.discrepancyAmount > 0 ? formatCurrency(sd.discrepancyAmount) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {sd.status === 'SOLD_UNPRODUCED' ? (
                        <span className="text-[10px] font-black text-amber-400">ኩሽና ትኬት የሌለው (Sold Unproduced)</span>
                      ) : sd.status === 'PRODUCED_UNSOLD' ? (
                        <span className="text-[10px] font-black text-rose-400">ሳይሸጥ የቀረ/የተዘጋጀ (Produced Unsold)</span>
                      ) : (
                        <span className="text-[10px] font-bold text-emerald-400">ተጣጥሟል (Matched)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 4: ANOMALIES & AUDIT PATTERNS */}
        {activeTab === 'anomalies' && (
          <div className="space-y-3">
            {(activeReport?.anomalies || []).map((a, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
                  a.severity === 'HIGH'
                    ? 'bg-rose-950/20 border-rose-500/40 text-rose-200'
                    : a.severity === 'MEDIUM'
                    ? 'bg-amber-950/20 border-amber-500/40 text-amber-200'
                    : 'bg-slate-900 border-slate-800 text-slate-300'
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 ${a.severity === 'HIGH' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-white">{a.title}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase">
                      {a.severity} SEVERITY
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{a.description}</p>
                  {a.affectedItems && a.affectedItems.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {a.affectedItems.map((item, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[10px] text-amber-300 font-mono">
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Drill-down Excel Provenance Modal */}
      {drillDownRows && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full border border-amber-500/40 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-amber-500/20 bg-slate-950">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm text-white">{drillDownTitle}</h3>
              </div>
              <button onClick={() => setDrillDownRows(null)} className="text-slate-400 hover:text-white p-1">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-400 text-[11px]">
                {language === 'am'
                  ? 'ይህ አሃዝ በቀጥታ ከተጫኑት የኤክሴል ፋይሎች የተገኘበት ትክክለኛ የመረጃ ምንጭ እና የመስመር ቁጥሮች:'
                  : 'Source provenance tracking back to the original uploaded Excel files and row indices:'}
              </p>

              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[11px] font-bold">
                      <th className="py-2 px-3">Excel File</th>
                      <th className="py-2 px-3">Sheet</th>
                      <th className="py-2 px-3">Row #</th>
                      <th className="py-2 px-3 text-right">Qty</th>
                      <th className="py-2 px-3 text-right">Price</th>
                      <th className="py-2 px-3">Date / Ref</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {drillDownRows.map((dr) => (
                      <tr key={dr.id} className="hover:bg-slate-900/50">
                        <td className="py-2 px-3 font-mono text-amber-300 font-bold">{dr.sourceFile}</td>
                        <td className="py-2 px-3 text-slate-400">{dr.sourceSheet}</td>
                        <td className="py-2 px-3 font-mono font-bold text-white">Row {dr.sourceRowNumber}</td>
                        <td className="py-2 px-3 font-mono text-right text-emerald-400 font-bold">{dr.quantity} {dr.unit}</td>
                        <td className="py-2 px-3 font-mono text-right text-slate-300">{dr.unitPrice > 0 ? formatCurrency(dr.unitPrice) : '-'}</td>
                        <td className="py-2 px-3 text-slate-400 text-[11px]">{dr.refNo || dr.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setDrillDownRows(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
                >
                  {language === 'am' ? 'ዝጋ (Close)' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRIMARY MATERIALS SELECTOR MODAL */}
      {isPrimarySelectorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-amber-500/20 bg-slate-950/80 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-white">
                  {language === 'am' ? '🎯 የሪኮንሲሌሽን ፕራይመሪ ማቴሪያል መምረጫ' : 'Primary Materials Reconciliation Selector'}
                </h3>
                <p className="text-xs text-slate-400">
                  {language === 'am'
                    ? 'ስራው አሰልቺ እንዳይሆን ዋና ዋና እቃዎችን ብቻ መርጠው ያመሳክሩ። ሽሮ፣ በርበሬና ቅመማ ቅመም ሳይካተቱ በዋና ወጪዎች ላይ ያተኩራሉ።'
                    : 'Select primary materials to track. Minor condiments and spices are excluded.'}
                </p>
              </div>
              <button
                onClick={() => setIsPrimarySelectorOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

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
                {language === 'am' ? 'የተመረጡ ፕራይመሪ እቃዎች:' : 'Selected Primary Items:'}{' '}
                <strong className="text-amber-400">{selectedPrimaryItemIds.length}</strong> / {items.length}
              </div>
            </div>

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
                onClick={() => {
                  setIsPrimarySelectorOpen(false);
                  handleRunReconciliation();
                }}
                className="px-6 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black rounded-xl text-xs shadow-md shadow-amber-500/20"
              >
                {language === 'am' ? 'ምርጫውን አረጋግጥ እና እንደገና አስላ' : 'Apply & Re-calculate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

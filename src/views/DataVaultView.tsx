import React, { useState, useEffect } from 'react';
import {
  Database,
  HardDrive,
  Download,
  Upload,
  FileSpreadsheet,
  ShieldCheck,
  RotateCcw,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Layers,
  Archive,
  RefreshCw,
  FolderLock,
  ChevronRight,
  KeyRound,
  Copy,
  Check,
  ArrowRightLeft,
  FolderDown,
  PlayCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { BackupSnapshot, exportToCSV } from '../utils/persistentStorage';
import { formatEthiopianDate, getTodayDateString } from '../utils/ethiopianDate';

export const DataVaultView: React.FC = () => {
  const {
    items,
    branches,
    centralBinCards,
    branchLedgers,
    recipes,
    schedules,
    reconciliations,
    branchDailyClosings,
    exportFullBackup,
    restoreBackupFromFile,
    clearAllDataCompletely,
    loadSampleTemplate,
    createManualSnapshot,
    loadAllSnapshots,
    restoreSnapshotById,
    deleteSnapshotById,
    getSyncCode,
    applySyncCode,
  } = useApp();

  const { language } = useLanguage();
  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>([]);
  const [snapshotLabel, setSnapshotLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const [copiedSyncCode, setCopiedSyncCode] = useState(false);
  const [inputSyncCode, setInputSyncCode] = useState('');

  const todayStr = getTodayDateString();
  const ethDate = formatEthiopianDate(todayStr, language);

  const fetchSnapshots = async () => {
    try {
      const list = await loadAllSnapshots();
      setSnapshots(list);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSnapshots();
  }, []);

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    const label = snapshotLabel.trim() || (language === 'am' ? `ስናፕሾት - ${ethDate}` : `Snapshot - ${todayStr}`);
    setLoading(true);
    try {
      const snap = await createManualSnapshot(label);
      if (snap) {
        setSnapshotLabel('');
        await fetchSnapshots();
        showStatus(language === 'am' ? 'የዳታው ስናፕሾት በስኬት ተቀምጧል!' : 'Snapshot saved successfully!');
      }
    } catch {
      showStatus(language === 'am' ? 'ስናፕሾት ማስቀመጥ አልተቻለም' : 'Failed to save snapshot', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreSnapshot = async (snap: BackupSnapshot) => {
    const confirmMsg =
      language === 'am'
        ? `እርግጠኛ ነዎት ወደዚህ ስናፕሾት ("${snap.label}") መመለስ ይፈልጋሉ? አሁን ያለው ዳታ በዚህ ይተካል!`
        : `Are you sure you want to restore snapshot "${snap.label}"? Current data will be replaced!`;
    if (window.confirm(confirmMsg)) {
      setLoading(true);
      const success = await restoreSnapshotById(snap);
      setLoading(false);
      if (success) {
        showStatus(language === 'am' ? 'ዳታው ወደነበረበት በስኬት ተመልሷል!' : 'Database restored from snapshot successfully!');
      } else {
        showStatus(language === 'am' ? 'ዳታውን መመለስ አልተቻለም' : 'Failed to restore snapshot', 'error');
      }
    }
  };

  const handleDeleteSnapshot = async (id: string) => {
    if (window.confirm(language === 'am' ? 'ይህንን ስናፕሾት መሰረዝ ይፈልጋሉ?' : 'Delete this snapshot?')) {
      await deleteSnapshotById(id);
      await fetchSnapshots();
      showStatus(language === 'am' ? 'ስናፕሾቱ ተሰርዟል' : 'Snapshot deleted');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmMsg =
      language === 'am'
        ? `"${file.name}" የሚለውን የዳታ ፋይል ወደ ሲስተሙ መጫን ይፈልጋሉ? አሁን ያለው መረጃ በዚህ ፋይል ይተካል!`
        : `Load database from file "${file.name}"? Current data will be replaced!`;

    if (window.confirm(confirmMsg)) {
      setLoading(true);
      const success = await restoreBackupFromFile(file);
      setLoading(false);
      setFileInputKey(Date.now());
      if (success) {
        showStatus(language === 'am' ? 'የዳታ ፋይሉ በስኬት ወደ ሲስተሙ ተጭኗል!' : 'Database imported and restored successfully!');
      } else {
        showStatus(language === 'am' ? 'ፋይሉን ማንበብ አልተቻለም፡ እባክዎ ትክክለኛ የ JSON ፋይል ይምረጡ' : 'Invalid backup file', 'error');
      }
    } else {
      setFileInputKey(Date.now());
    }
  };

  const handleCopySyncCode = () => {
    try {
      const code = getSyncCode();
      navigator.clipboard.writeText(code);
      setCopiedSyncCode(true);
      showStatus(language === 'am' ? 'የዳታ ማስተላለፊያ ኮድ ተቀድቷል! ወደ ስልክዎ በቴሌግራም/ዋትስአፕ ይላኩት' : 'Sync code copied! Send to your phone via Telegram/WhatsApp');
      setTimeout(() => setCopiedSyncCode(false), 3000);
    } catch {
      showStatus(language === 'am' ? 'ኮድ ማመንጨት አልተቻለም' : 'Failed to generate sync code', 'error');
    }
  };

  const handleApplySyncCode = async () => {
    if (!inputSyncCode.trim()) {
      showStatus(language === 'am' ? 'እባክዎ መጀመሪያ ኮዱን እዚህ ያስገቡ' : 'Please paste sync code first', 'error');
      return;
    }
    setLoading(true);
    const success = await applySyncCode(inputSyncCode);
    setLoading(false);
    if (success) {
      setInputSyncCode('');
      showStatus(language === 'am' ? 'ዳታው በስኬት ተጭኗል! ሁሉም እቃዎች፣ ሪሲፒዎች እና ስኬጁሎች ተመሳስለዋል' : 'Data imported from sync code successfully!');
    } else {
      showStatus(language === 'am' ? 'የተሳሳተ ኮድ ነው። እባክዎ እንደገና በትክክል ኮፒ አድርገው ይሞክሩ' : 'Invalid sync code', 'error');
    }
  };

  // CSV Exports
  const handleExportItemsCSV = () => {
    const headers = ['Code', 'Name (Amharic)', 'Name (English)', 'Category', 'Unit', 'Central Stock', 'Weighted Avg Cost (ETB)', 'Last Price (ETB)'];
    const rows = items.map((i) => [
      i.code,
      i.nameAm,
      i.nameEn,
      i.category,
      i.unitAm || i.unit,
      i.currentCentralStock,
      i.weightedAvgCost,
      i.lastPurchasePrice,
    ]);
    exportToCSV(`Central_Store_Inventory_${todayStr}.csv`, headers, rows);
  };

  const handleExportBinCardCSV = () => {
    const headers = ['Date', 'Ethiopian Date', 'Ref No', 'Type', 'Item Code', 'Item Name', 'Qty In', 'Qty Out', 'Balance', 'Unit Price', 'Destination / Supplier'];
    const rows = centralBinCards.map((b) => {
      const item = items.find((i) => i.id === b.itemId);
      return [
        b.date,
        b.ethiopianDateStr || '',
        b.refNo,
        b.type,
        item?.code || '',
        item?.nameAm || '',
        b.quantityIn || 0,
        b.quantityOut || 0,
        b.balance || 0,
        b.unitPrice || 0,
        b.supplierOrDestination || '',
      ];
    });
    exportToCSV(`Central_Bin_Cards_${todayStr}.csv`, headers, rows);
  };

  const handleExportBranchLedgersCSV = () => {
    const headers = ['Date', 'Ethiopian Date', 'Branch', 'Item', 'Ref No', 'Type', 'Qty In', 'Qty Out', 'Balance', 'Unit Cost', 'Reason / Menu'];
    const rows = branchLedgers.map((l) => {
      const item = items.find((i) => i.id === l.itemId);
      const branch = branches.find((br) => br.id === l.branchId);
      return [
        l.date,
        l.ethiopianDateStr || '',
        branch?.nameAm || l.branchId,
        item?.nameAm || l.itemId,
        l.refNo,
        l.type,
        l.quantityIn || 0,
        l.quantityOut || 0,
        l.balance || 0,
        l.unitCost || 0,
        l.reasonOrMenu || '',
      ];
    });
    exportToCSV(`Branch_Ledgers_${todayStr}.csv`, headers, rows);
  };

  const handleExportRecipesCSV = () => {
    const headers = ['Recipe ID', 'Branch', 'Dish Name (Amharic)', 'Dish Name (English)', 'Category', 'Selling Price (ETB)', 'Total Ingredients Count', 'Portion Description'];
    const rows = recipes.map((r) => {
      const br = branches.find((b) => b.id === r.branchId);
      return [
        r.id,
        br ? br.nameAm : (r.branchId || 'All Branches'),
        r.nameAm,
        r.nameEn,
        r.category,
        r.sellingPrice,
        r.ingredients.length,
        r.portionDescription || '',
      ];
    });
    exportToCSV(`Recipes_List_${todayStr}.csv`, headers, rows);
  };

  // Estimated data size
  const totalRecords =
    items.length +
    branches.length +
    centralBinCards.length +
    branchLedgers.length +
    recipes.length +
    schedules.length +
    reconciliations.length +
    (branchDailyClosings ? branchDailyClosings.length : 0);

  const approximateKb = Math.max(12, Math.round(JSON.stringify({ items, branches, centralBinCards, branchLedgers, recipes, branchDailyClosings }).length / 1024));

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Golden Luxury Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/60 p-6 sm:p-8 text-white shadow-2xl border border-amber-500/30">
        {/* Ambient gold glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold tracking-wide backdrop-blur-md shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>{language === 'am' ? 'የዳታ ማከማቻ ዋስትና (High-Capacity Vault)' : 'High-Capacity Persistent Enterprise Vault'}</span>
              <span className="text-amber-500">•</span>
              <span className="text-amber-200">IndexedDB + LocalStorage Double Redundancy</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              <Database className="w-8 h-8 text-amber-400" />
              <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
                {language === 'am' ? 'ትልቅ የዳታ ማከማቻ እና ፋይል ስቶሬጅ ማዕከል' : 'Enterprise Data Vault & Storage Center'}
              </span>
            </h1>

            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              {language === 'am'
                ? 'በዚህ ሲስተም ውስጥ የሚገቡ እያንዳንዱ የጥሬ እቃዎች ዝርዝር፣ የገበያ ዋጋዎች፣ የቢን ካርድ መረጃዎች፣ የቅርንጫፍ ሌጀሮች እና ሪሲፒዎች በሙሉ በኮምፒውተርዎ ላይ ባለው ትልቅ IndexedDB ማከማቻ ውስጥ በቋሚነት ይቀመጣሉ። በማንኛውም ጊዜ ሙሉ የዳታ ቅጂ (Backup JSON) ማውረድ ወይም ወደነበረበት መመለስ ይችላሉ።'
                : 'All raw materials, volatile market prices, bin cards, independent branch ledgers, and recipes are permanently stored in your computer using high-capacity IndexedDB. You can export complete backups (.json) or restore anytime.'}
            </p>
          </div>

          {/* Quick Backup Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={exportFullBackup}
              className="relative group overflow-hidden px-5 py-3 rounded-2xl font-black text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 shadow-xl shadow-amber-500/20 hover:shadow-amber-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 ring-2 ring-amber-300/60 flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4 text-slate-950" />
              <span>{language === 'am' ? 'ሙሉ ዳታ አውርድ (.JSON)' : 'Download Full Backup (.JSON)'}</span>
            </button>

            <label className="cursor-pointer relative group overflow-hidden px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm text-amber-300 bg-slate-900/90 border border-amber-500/40 shadow-lg hover:bg-slate-850 hover:border-amber-400 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2">
              <Upload className="w-4 h-4 text-amber-400" />
              <span>{language === 'am' ? 'ከፋይል መልስ (.JSON)' : 'Restore from File'}</span>
              <input
                key={fileInputKey}
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Status Alert Notification */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 border shadow-lg transition-all animate-slideDown ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/70 border-rose-500/40 text-rose-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="text-sm font-semibold">{statusMessage.text}</span>
        </div>
      )}

      {/* Windows Local Disk (C:) Dedicated Offline Suite */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-500/15 via-slate-900 to-slate-950 border border-amber-500/40 shadow-2xl backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-400">
                {language === 'am' ? '📁 ወደ ኮምፒውተር Local Disk (C:) መጫኛ እና ዳታ መጠበቂያ' : 'Windows PC Local Disk (C:) Offline Suite'}
              </h2>
              <p className="text-xs text-slate-300">
                {language === 'am'
                  ? 'አፕሊኬሽኑን በኮምፒውተርዎ C: ድራይቭ ላይ እንደ ሶፍትዌር በማስቀመጥ ያለ ኢንተርኔት በደህንነት ይጠቀሙ'
                  : 'Run the entire application and database directly on your PC Local Disk (C:) without internet'}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-amber-300 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/30 w-fit">
            {language === 'am' ? '100% ራሱን የቻለ ሶፍትዌር' : '100% Standalone'}
          </span>
        </div>

        {/* Step-by-step roadmap */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-[10px] shrink-0 border border-amber-500/30">1</span>
              <strong className="text-amber-300 text-xs">
                {language === 'am' ? 'ደረጃ 1፦ ፋይሎችን ማውረድ' : 'Step 1: Download Package'}
              </strong>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed">
              {language === 'am'
                ? 'ከታች ያለውን አዝራር በመጫን የዊንዶውስ ፋይሎችን ያውርዱ፤ ከዚያ በኮምፒውተርዎ Local Disk (C:) ውስጥ C:\\Ethiopia_Restaurant_ERP በሚል ፎልደር ይክፈቱት።'
                : 'Download the Windows package and extract into "C:\\Ethiopia_Restaurant_ERP" on your computer.'}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-[10px] shrink-0 border border-amber-500/30">2</span>
              <strong className="text-amber-300 text-xs">
                {language === 'am' ? 'ደረጃ 2፦ SETUP_WINDOWS.bat' : 'Step 2: Run Setup'}
              </strong>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed">
              {language === 'am'
                ? 'በፎልደሩ ውስጥ የሚገኘውን «SETUP_WINDOWS.bat» የሚለውን ፋይል ደብል ክሊክ ያድርጉ። አስፈላጊ ፋይሎችን አንዴ ብቻ ጭኖ ያዘጋጅልዎታል።'
                : 'Double click "SETUP_WINDOWS.bat" inside the folder. It prepares all runtime components automatically.'}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px] shrink-0 border border-emerald-500/30">3</span>
              <strong className="text-emerald-300 text-xs">
                {language === 'am' ? 'ደረጃ 3፦ START_ERP.bat' : 'Step 3: Daily Launch'}
              </strong>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed">
              {language === 'am'
                ? 'በየቀኑ «START_ERP.bat» ደብል ክሊክ ሲያደርጉ አፕሊኬሽኑ ወዲያውኑ በኮምፒውተርዎ ላይ ይከፈታል። በዴስክቶፕዎ ላይ Shortcut ማስቀመጥ ይችላሉ!'
                : 'Double click "START_ERP.bat" daily to open the app locally. You can right click and send shortcut to Desktop!'}
            </p>
          </div>
        </div>

        {/* Action download buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <a
            href="/api/export-full-source-zip"
            download="Ethiopia_FNB_ERP_CleanZero_FullStack.zip"
            className="px-4 py-2.5 rounded-xl font-black text-xs text-slate-950 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
          >
            <FolderDown className="w-4 h-4 text-slate-950" />
            <span>{language === 'am' ? '📦 ሙሉ ሲስተም ፋይል አውርድ (.zip — Clean Zero Full-Stack)' : '📦 Download Complete Full-Stack Source (.zip)'}</span>
          </a>

          <a
            href="/Ethiopia_Restaurant_ERP_Source.tar.gz"
            download="Ethiopia_Restaurant_ERP_CleanZero_Package.tar.gz"
            className="px-3.5 py-2.5 rounded-xl font-bold text-xs text-amber-200 bg-slate-800 hover:bg-slate-700 border border-amber-500/40 flex items-center gap-2 transition-all"
          >
            <FolderDown className="w-4 h-4 text-amber-400" />
            <span>{language === 'am' ? '📦 .tar.gz ፓኬጅ አውርድ' : '📦 Download (.tar.gz)'}</span>
          </a>

          <a
            href="/START_ERP.bat"
            download="START_ERP.bat"
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5"
          >
            <PlayCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>START_ERP.bat</span>
          </a>

          <a
            href="/SETUP_WINDOWS.bat"
            download="SETUP_WINDOWS.bat"
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>SETUP_WINDOWS.bat</span>
          </a>

          <a
            href="/README_WINDOWS_AMHARIC.txt"
            download="README_WINDOWS_AMHARIC.txt"
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>{language === 'am' ? 'የአማርኛ መመሪያ ሰነድ (.txt)' : 'Amharic Guide (.txt)'}</span>
          </a>
        </div>
      </div>

      {/* Instant Sync & Device Transfer Hub */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 border border-amber-500/30 shadow-2xl backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-amber-300">
                {language === 'am' ? '📱 ፈጣን የሞባይል ስልክ/ላፕቶፕ ዳታ ማስተላለፊያ (Sync Hub)' : 'Mobile & Laptop Instant Data Sync Hub'}
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'am' ? 'በኮምፒውተርዎ የሞሉትን መረጃ በቀላሉ ኮድ በመቅዳት ወደ ስልክዎ ያዛውሩ' : 'Quickly transfer data between your PC and phone via sync code'}
              </p>
            </div>
          </div>
          <span className="text-[11px] text-amber-400/80 font-mono bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 w-fit">
            {language === 'am' ? 'ያለ ኔትወርክ ሰርቨር ይሰራል' : 'Peer-to-Peer Safe'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Step 1: Export Code */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2.5">
            <div className="font-bold text-amber-300 text-xs flex items-center justify-between">
              <span>{language === 'am' ? '1. ከኮምፒውተርዎ ዳታ ለመውሰድ፦' : '1. Copy data from this device:'}</span>
              <span className="text-[10px] text-slate-400">({items.length} {language === 'am' ? 'እቃዎች' : 'items'})</span>
            </div>
            <p className="text-slate-400 text-xs">
              {language === 'am'
                ? 'ይህንን አዝራር ሲጫኑ ሙሉ መረጃዎ ወደ አንድ አጭር ኮድ ይቀየራል። ኮዱን ለራስዎ በቴሌግራም/ዋትስአፕ ይላኩት።'
                : 'Generates a one-click sync code. Send it to your phone via Telegram or WhatsApp.'}
            </p>
            <button
              onClick={handleCopySyncCode}
              className={`w-full py-2.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-xs ${
                copiedSyncCode
                  ? 'bg-emerald-500 text-slate-950 font-black'
                  : 'bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 text-slate-950 shadow-md shadow-amber-500/20'
              }`}
            >
              {copiedSyncCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>
                {copiedSyncCode
                  ? (language === 'am' ? '✅ ኮዱ ተቀድቷል!' : '✅ Copied!')
                  : (language === 'am' ? 'የዳታ ማስተላለፊያ ኮድ ቅዳ (Copy Sync Code)' : 'Copy Sync Code')}
              </span>
            </button>
          </div>

          {/* Step 2: Import Code */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2.5">
            <div className="font-bold text-emerald-400 text-xs">
              <span>{language === 'am' ? '2. በስልክዎ ላይ ዳታ ለማስገባት፦' : '2. Paste data into this device:'}</span>
            </div>
            <p className="text-slate-400 text-xs">
              {language === 'am'
                ? 'ከቴሌግራም የቀዱትን ኮድ እዚህ ሳጥን ውስጥ ፔስት አድርገው «አስገባ» የሚለውን ይጫኑ።'
                : 'Paste the sync code here on your phone and click import.'}
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={language === 'am' ? 'ኮዱን እዚህ ፔስት (Paste) ያድርጉ...' : 'Paste sync code here...'}
                value={inputSyncCode}
                onChange={(e) => setInputSyncCode(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
              />
              <button
                onClick={handleApplySyncCode}
                disabled={loading}
                className="px-4 py-2 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 text-xs shrink-0 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>{language === 'am' ? 'አስገባ' : 'Import'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Storage Metrics & Health Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-amber-500/20 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">{language === 'am' ? 'የጥሬ እቃዎች ቁጥር' : 'Raw Materials'}</span>
            <Archive className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{items.length}</div>
          <div className="text-[11px] text-amber-400/80 mt-1">{language === 'am' ? 'የተመዘገቡ እቃዎች' : 'Catalog items'}</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-amber-500/20 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">{language === 'am' ? 'የቢን ካርድ መዝገቦች' : 'Bin Card Entries'}</span>
            <FileText className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{centralBinCards.length}</div>
          <div className="text-[11px] text-emerald-400/80 mt-1">{language === 'am' ? 'የስቶር ገቢና ወጪ' : 'Stock transactions'}</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-amber-500/20 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">{language === 'am' ? 'የቅርንጫፍ ሌጀር መዝገቦች' : 'Branch Ledger Records'}</span>
            <Layers className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{branchLedgers.length}</div>
          <div className="text-[11px] text-blue-400/80 mt-1">{language === 'am' ? 'የቅርንጫፎች እንቅስቃሴ' : 'Branch activities'}</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-amber-500/20 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">{language === 'am' ? 'የማከማቻ መጠን (Storage)' : 'Storage Health'}</span>
            <ShieldCheck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-300">~{approximateKb} KB</div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>{language === 'am' ? '100% ደህንነቱ የተጠበቀ' : 'Encrypted & Safe'}</span>
          </div>
        </div>
      </div>

      {/* CSV & Excel Departmental Exports */}
      <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 shadow-2xl backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base sm:text-lg font-bold text-white">
              {language === 'am' ? 'የዳታ ሰነዶችን በኤክሴል (CSV) የማውረጃ ማዕከል' : 'Departmental Excel / CSV Data Exports'}
            </h2>
          </div>
          <span className="text-xs text-slate-400">Excel / Google Sheets / LibreOffice Compatible</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={handleExportItemsCSV}
            className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900/90 transition-all text-left group"
          >
            <div className="text-xs text-emerald-400 font-bold mb-1 flex items-center justify-between">
              <span>{language === 'am' ? 'ማዕከላዊ ስቶር' : 'Central Store'}</span>
              <Download className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
            </div>
            <div className="text-sm font-bold text-white mb-1">{language === 'am' ? 'የእቃዎች ዝርዝር' : 'Materials Inventory'}</div>
            <div className="text-[11px] text-slate-400">{items.length} {language === 'am' ? 'እቃዎች' : 'items'} (.csv)</div>
          </button>

          <button
            onClick={handleExportBinCardCSV}
            className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-900/90 transition-all text-left group"
          >
            <div className="text-xs text-amber-400 font-bold mb-1 flex items-center justify-between">
              <span>{language === 'am' ? 'ቢን ካርድ' : 'Master Bin Card'}</span>
              <Download className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
            </div>
            <div className="text-sm font-bold text-white mb-1">{language === 'am' ? 'የስቶር ገቢና ወጪ' : 'Bin Card Transactions'}</div>
            <div className="text-[11px] text-slate-400">{centralBinCards.length} {language === 'am' ? 'መዝገቦች' : 'records'} (.csv)</div>
          </button>

          <button
            onClick={handleExportBranchLedgersCSV}
            className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-900/90 transition-all text-left group"
          >
            <div className="text-xs text-blue-400 font-bold mb-1 flex items-center justify-between">
              <span>{language === 'am' ? 'የቅርንጫፍ ሌጀሮች' : 'Branch Ledgers'}</span>
              <Download className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
            </div>
            <div className="text-sm font-bold text-white mb-1">{language === 'am' ? 'የሁሉም ቅርንጫፎች ሂሳብ' : 'Branch Activity Ledger'}</div>
            <div className="text-[11px] text-slate-400">{branchLedgers.length} {language === 'am' ? 'መዝገቦች' : 'records'} (.csv)</div>
          </button>

          <button
            onClick={handleExportRecipesCSV}
            className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-900/90 transition-all text-left group"
          >
            <div className="text-xs text-purple-400 font-bold mb-1 flex items-center justify-between">
              <span>{language === 'am' ? 'ሜኑ እና ሪሲፒ' : 'Menu & Recipes'}</span>
              <Download className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
            </div>
            <div className="text-sm font-bold text-white mb-1">{language === 'am' ? 'የምግብ ዝርዝርና ወጪ' : 'Recipe Costing & Ingredients'}</div>
            <div className="text-[11px] text-slate-400">{recipes.length} {language === 'am' ? 'ሪሲፒዎች' : 'recipes'} (.csv)</div>
          </button>
        </div>
      </div>

      {/* Point-in-time Snapshots Section */}
      <div className="p-6 rounded-3xl bg-slate-900/70 border border-amber-500/20 shadow-2xl backdrop-blur-md space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <span>{language === 'am' ? 'የአካባቢ ፈጣን ስናፕሾቶች (Local Restore Points)' : 'Local Snapshots & Recovery Checkpoints'}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {language === 'am'
                ? 'ከማንኛውም ትልቅ ስራ በፊት (ለምሳሌ ከዕለታዊ ሪኮንሲሌሽን በፊት) ፈጣን ስናፕሾት ይውሰዱ።'
                : 'Take an instant local recovery checkpoint before major inventory or reconciliation tasks.'}
            </p>
          </div>

          {/* Create Snapshot Form */}
          <form onSubmit={handleCreateSnapshot} className="flex items-center gap-2">
            <input
              type="text"
              value={snapshotLabel}
              onChange={(e) => setSnapshotLabel(e.target.value)}
              placeholder={language === 'am' ? 'የስናፕሾት ስም (ምሳሌ፡ ከዛሬው ሽያጭ በፊት)...' : 'Snapshot name...'}
              className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 w-52 sm:w-64"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5 whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{language === 'am' ? 'ስናፕሾት ያዝ' : 'Save Checkpoint'}</span>
            </button>
          </form>
        </div>

        {/* Snapshots Table */}
        {snapshots.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-950/40 border border-slate-800/80 text-slate-400 text-xs">
            {language === 'am'
              ? 'ምንም የተያዘ ስናፕሾት የለም። ከላይ ባለው ቅጽ የመጀመሪያውን ስናፕሾት መያዝ ይችላሉ።'
              : 'No local snapshots yet. Save your first checkpoint above.'}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="p-3.5">{language === 'am' ? 'የስናፕሾት ስም' : 'Label'}</th>
                  <th className="p-3.5">{language === 'am' ? 'የተመዘገበበት ሰዓት' : 'Timestamp'}</th>
                  <th className="p-3.5">{language === 'am' ? 'የእቃዎች ብዛት' : 'Items'}</th>
                  <th className="p-3.5">{language === 'am' ? 'ጠቅላላ ትራንዛክሽኖች' : 'Transactions'}</th>
                  <th className="p-3.5 text-right">{language === 'am' ? 'ተግባራት' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                {snapshots.map((snap) => (
                  <tr key={snap.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 font-bold text-amber-300 flex items-center gap-2">
                      <FolderLock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{snap.label}</span>
                    </td>
                    <td className="p-3.5 text-slate-400">
                      {new Date(snap.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3.5 text-slate-300">{snap.itemCount}</td>
                    <td className="p-3.5 text-slate-300">{snap.transactionCount}</td>
                    <td className="p-3.5 text-right space-x-2">
                      <button
                        onClick={() => handleRestoreSnapshot(snap)}
                        className="px-3 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 font-bold text-[11px] transition-all"
                      >
                        {language === 'am' ? 'ወደዚህ መልስ' : 'Restore'}
                      </button>
                      <button
                        onClick={() => handleDeleteSnapshot(snap.id)}
                        className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Advanced Database Initialization & Safety Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Blank Starter File Templates for New Store & Menu Entry */}
        <div className="p-5 rounded-3xl bg-slate-900/70 border border-emerald-500/30 shadow-xl space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <FileSpreadsheet className="w-4 h-4" />
            <span>{language === 'am' ? '📥 ባዶ የኤክሴል/CSV ማዘጋጃ ፋይሎች (Starter Templates)' : '📥 Blank Store & Menu Starter Templates'}</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            {language === 'am'
              ? 'የራስዎን አዲስ የስቶር ዕቃዎችና የሜኑ ዝርዝሮች በኤክሴል አደራጅተው ለመመዝገብ ባዶ ቴምፕሌት ፋይሎችን እዚህ ያውርዱ።'
              : 'Download clean blank CSV starter files to organize your own store items and menus.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                exportToCSV(
                  `Blank_Store_Products_Template_${todayStr}.csv`,
                  ['Code', 'Name (Amharic)', 'Name (English)', 'Category', 'Unit', 'Unit (Amharic)', 'Purchase Price (ETB)', 'Min Stock'],
                  []
                );
                showStatus(language === 'am' ? 'ባዶ የስቶር ዕቃዎች ቴምፕሌት ፋይል ወርዷል!' : 'Blank Store Products CSV downloaded!');
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 hover:bg-emerald-900/80 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{language === 'am' ? 'ባዶ የስቶር ዕቃ ፋይል (.csv)' : 'Blank Store Items (.csv)'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                exportToCSV(
                  `Blank_Menu_Recipes_Template_${todayStr}.csv`,
                  ['Branch Name', 'Dish Name (Amharic)', 'Dish Name (English)', 'Category', 'Selling Price (ETB)', 'Ingredient Item', 'Quantity', 'Unit'],
                  []
                );
                showStatus(language === 'am' ? 'ባዶ የሜኑ ዝርዝር ቴምፕሌት ፋይል ወርዷል!' : 'Blank Menu CSV downloaded!');
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-amber-300 bg-amber-950/60 border border-amber-500/40 hover:bg-amber-900/80 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{language === 'am' ? 'ባዶ የሜኑ ፋይል (.csv)' : 'Blank Menu Template (.csv)'}</span>
            </button>
          </div>
        </div>

        {/* Clean Slate Wipe */}
        <div className="p-5 rounded-3xl bg-slate-900/70 border border-rose-900/40 shadow-xl space-y-3">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
            <Trash2 className="w-4 h-4" />
            <span>{language === 'am' ? 'ሙሉ ዳታ አጽዳ (Clean Slate / Blank Start)' : 'Reset Database to Completely Blank'}</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            {language === 'am'
              ? 'ሁሉንም ዳታዎች በማጽዳት ባዶ አድርገው ከዜሮ ጀምረው የራስዎን እውነተኛ እቃዎች እና ሽያጮች ለመመዝገብ ይጠቀሙበት።'
              : 'Wipe all records to start 100% blank from beginning as requested, entering your own real items and recipes.'}
          </p>
          <button
            onClick={() => {
              if (window.confirm(language === 'am' ? 'ሙሉ ዳታዎችን አጽድተህ እንደ አዲስ ባዶ ማድረግ ትፈልጋለህ?' : 'Clear all data to a blank slate?')) {
                clearAllDataCompletely();
                showStatus(language === 'am' ? 'ሲስተሙ ሙሉ በሙሉ ባዶ ተደርጓል!' : 'Database completely reset to clean state!');
              }
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold text-rose-300 bg-rose-950/60 border border-rose-500/40 hover:bg-rose-900/80 transition-all flex items-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{language === 'am' ? 'ሙሉ ዳታ አጽዳ (ባዶ አድርግ)' : 'Clear All Data (Clean Slate)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

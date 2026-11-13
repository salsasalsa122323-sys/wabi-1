import React, { useState, useRef } from 'react';
import {
  X,
  HardDrive,
  Download,
  Upload,
  Database,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  FileJson,
  Sparkles,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';

interface DataStorageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DataStorageModal: React.FC<DataStorageModalProps> = ({ isOpen, onClose }) => {
  const {
    items,
    branches,
    centralBinCards,
    branchLedgers,
    recipes,
    schedules,
    reconciliations,
    exportFullBackup,
    restoreBackupFromFile,
  } = useApp();

  const { language, t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const totalRecords =
    items.length +
    branches.length +
    centralBinCards.length +
    branchLedgers.length +
    recipes.length +
    schedules.length +
    reconciliations.length;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreStatus('idle');
    setErrorMessage('');

    const success = await restoreBackupFromFile(file);
    if (success) {
      setRestoreStatus('success');
      setTimeout(() => {
        setRestoreStatus('idle');
        onClose();
      }, 1500);
    } else {
      setRestoreStatus('error');
      setErrorMessage(
        language === 'am'
          ? 'ፋይሉን ማንበብ አልተቻለም። እባክዎ ትክክለኛ የኢትዮጵያ ERP ባክአፕ ፋይል ይምረጡ።'
          : 'Failed to restore backup file. Please select a valid JSON backup file.'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md">
      <div className="bg-slate-900 border border-amber-500/30 rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden text-slate-100">
        {/* Luxury Gold & Emerald Header */}
        <div className="px-6 py-5 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20 font-black">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-500">
                {language === 'am' ? 'የዳታ ስቶሬጅ እና የባክአፕ ማዕከል' : 'High-Capacity Storage & Backup Vault'}
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'am'
                  ? 'ዳታዎችዎ እንዳይጠፉ በ IndexedDB እና በፋይል ባክአፕ በደህንነት ይጠበቃሉ'
                  : 'Enterprise multi-gigabyte IndexedDB storage & JSON backup manager'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 text-xs">
          {/* Status Alert if restored */}
          {restoreStatus === 'success' && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-xl flex items-center gap-2.5 text-emerald-300 font-semibold">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{language === 'am' ? 'ዳታው በተሳካ ሁኔታ ወደ ሲስተሙ ተመልሷል!' : 'Backup data restored successfully!'}</span>
            </div>
          )}

          {restoreStatus === 'error' && (
            <div className="p-3 bg-rose-950/80 border border-rose-500/40 rounded-xl flex items-center gap-2.5 text-rose-300 font-semibold">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Storage Engine Status Badge Card */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-300 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-emerald-400" />
                <span>{language === 'am' ? 'የስቶሬጅ ሞተር ሁኔታ (Storage Health):' : 'Storage Engine Health:'}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{language === 'am' ? 'ንቁ እና አስተማማኝ (Active)' : 'Active & Resilient'}</span>
              </span>
            </div>

            <p className="text-slate-400 leading-relaxed text-[11px]">
              {language === 'am'
                ? 'ሲስተሙ ዘመናዊውን IndexedDB ሞተር ይጠቀማል። በሺዎች የሚቆጠሩ የቢን ካርድና የሌጀር ግብይቶችን ያለምንም የቦታ እጥረት በኮምፒውተርዎ ላይ ለረጅም ጊዜ በቋሚነት ያከማቻል።'
                : 'Utilizes high-capacity browser IndexedDB architecture capable of persisting thousands of ledger & bin card transactions securely.'}
            </p>

            {/* Counts Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80">
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-500 block">{language === 'am' ? 'ጥሬ ዕቃዎች' : 'Items'}</span>
                <span className="font-bold text-amber-400 text-sm">{items.length}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-500 block">{language === 'am' ? 'ቅርንጫፎች' : 'Branches'}</span>
                <span className="font-bold text-purple-400 text-sm">{branches.length}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-500 block">{language === 'am' ? 'የቢን ካርድ ሰነዶች' : 'Bin Cards'}</span>
                <span className="font-bold text-emerald-400 text-sm">{centralBinCards.length}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-500 block">{language === 'am' ? 'የሌጀር ግብይቶች' : 'Ledgers'}</span>
                <span className="font-bold text-blue-400 text-sm">{branchLedgers.length}</span>
              </div>
            </div>
          </div>

          {/* Action 1: Export Full Backup */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/25 space-y-2">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-bold text-amber-300 text-sm block">
                  {language === 'am' ? '1. ሙሉ የዳታ ባክአፕ ፋይል አውርድ' : '1. Download Full Database Backup'}
                </span>
                <span className="text-[11px] text-slate-400 block">
                  {language === 'am'
                    ? 'ሁሉንም እቃዎች፣ የቢን ካርድ መዝገቦች፣ ሌጀሮችና ሪሴፒዎች በ JSON ፋይል ኮምፒውተርዎ ላይ ያስቀምጣል'
                    : 'Exports all records, bin cards, branch transactions & recipes as a JSON archive'}
                </span>
              </div>
              <button
                onClick={exportFullBackup}
                className="px-4 py-2 rounded-xl font-bold text-xs text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-lg shadow-amber-500/20 flex items-center gap-1.5 shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>{language === 'am' ? 'ባክአፕ ውሰድ' : 'Export File'}</span>
              </button>
            </div>
          </div>

          {/* Action 2: Restore Backup File */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-bold text-slate-200 text-sm block">
                  {language === 'am' ? '2. ከባክአፕ ፋይል ወደ ሲስተሙ መልስ' : '2. Restore Backup from File'}
                </span>
                <span className="text-[11px] text-slate-400 block">
                  {language === 'am'
                    ? 'ቀደም ሲል ያስቀመጡትን የባክአፕ ፋይል መርጠው ሁሉንም ዳታ በአንድ ጠቅታ ይመልሱ'
                    : 'Upload previously saved JSON backup to restore all business records'}
                </span>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl font-bold text-xs text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center gap-1.5 shrink-0"
              >
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>{language === 'am' ? 'ፋይል ምረጥ' : 'Select File'}</span>
              </button>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
            >
              {t.common.close}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

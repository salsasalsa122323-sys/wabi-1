import React, { useState, useMemo } from 'react';
import {
  X,
  ClipboardPaste,
  Check,
  AlertTriangle,
  HelpCircle,
  UtensilsCrossed,
  Receipt,
  RotateCcw,
  PlusCircle,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { Recipe } from '../../types';

export interface MenuSalesSmartPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipes: Recipe[];
  branchName: string;
  selectedDate: string;
  currentChefSales: Record<string, number>;
  currentCashierSales: Record<string, number>;
  onApplySales: (
    chefSales: Record<string, number>,
    cashierSales: Record<string, number>,
    mode: 'replace' | 'add'
  ) => void;
  language: 'am' | 'en';
}

interface ParsedMenuRow {
  rawLine: string;
  rawName: string;
  matchedRecipeId: string;
  quantity: number;
  status: 'matched' | 'needs_review' | 'not_found';
  confidence: number;
}

// Comprehensive aliases for common Bello Fam / Kokonut / Cocoon dishes
const MENU_ALIASES: Record<string, string[]> = {
  bolognese: ['bolognese', 'spaghetti bolognese', 'ቦሎኔዝ', 'ስፓጌቲ ቦሎኔዝ', 'bolognaise'],
  carbonara: ['carbonara', 'spaghetti carbonara', 'ካርቦናራ', 'ስፓጌቲ ካርቦናራ'],
  alfredo: ['alfredo', 'tagliatelle alfredo', 'አልፍሬዶ', 'ታሌቴሊ አልፍሬዶ', 'fettuccine alfredo'],
  tuna: ['tuna', 'spaghetti tuna', 'ቱና', 'ስፓጌቲ ቱና'],
  arrabbiata: ['arrabbiata', 'penne arrabbiata', 'አራቢያታ', 'ፔኔ አራቢያታ', 'arabiata'],
  lasagna: ['lasagna', 'lasagne', 'ላዛኛ', 'የስጋ ላዛኛ', 'beef lasagna'],
  burger: ['burger', 'beef burger', 'ቺዝ በርገር', 'በርገር', 'cheese burger'],
  pizza_margherita: ['margherita', 'margarita', 'ማርገሪታ', 'ፒዛ ማርገሪታ'],
  pizza_bello: ['bello special', 'bello pizza', 'ቤሎ ስፔሻል', 'የቤሎ ፒዛ'],
  chicken_breast: ['chicken breast', 'የዶሮ ጡት', 'የዶሮ ስጋ', 'grilled chicken'],
  fish_cutlet: ['fish cutlet', 'የአሳ ኩትሌት', 'የአሳ ቁርጥራጭ', 'fried fish'],
  club_sandwich: ['club sandwich', 'ክለብ ሳንድዊች'],
  special_salad: ['chef salad', 'special salad', 'ስፔሻል ሰላጣ'],
};

// Normalize text for resilient fuzzy matching
function normalizeText(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[፣፤።,.:;_\-\t\r\n/|\\()[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Compute string similarity (0.0 to 1.0)
function computeStringSimilarity(s1: string, s2: string): number {
  const norm1 = normalizeText(s1);
  const norm2 = normalizeText(s2);
  if (!norm1 || !norm2) return 0;
  if (norm1 === norm2) return 1.0;
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.85;

  const words1 = norm1.split(' ').filter(Boolean);
  const words2 = norm2.split(' ').filter(Boolean);
  let matchCount = 0;
  for (const w1 of words1) {
    if (words2.some((w2) => w2 === w1 || (w1.length > 3 && w2.includes(w1)) || (w2.length > 3 && w1.includes(w2)))) {
      matchCount++;
    }
  }
  const ratio = (matchCount * 2) / (words1.length + words2.length);
  return Math.min(ratio, 0.95);
}

export const MenuSalesSmartPasteModal: React.FC<MenuSalesSmartPasteModalProps> = ({
  isOpen,
  onClose,
  recipes,
  branchName,
  selectedDate,
  currentChefSales,
  currentCashierSales,
  onApplySales,
  language,
}) => {
  const [chefPasteText, setChefPasteText] = useState('');
  const [cashierPasteText, setCashierPasteText] = useState('');

  // Mode for re-pasting when sales already exist
  const hasExistingChefSales = Object.values(currentChefSales).some((v) => v > 0);
  const hasExistingCashierSales = Object.values(currentCashierSales).some((v) => v > 0);
  const hasAnyExistingSales = hasExistingChefSales || hasExistingCashierSales;

  const [applyMode, setApplyMode] = useState<'replace' | 'add'>('replace');
  const [activePreviewTab, setActivePreviewTab] = useState<'chef' | 'cashier'>('chef');

  // Parse lines into structured rows with matching
  const matchDishName = (rawName: string): { recipeId: string; status: 'matched' | 'needs_review' | 'not_found'; score: number } => {
    const cleanRaw = normalizeText(rawName);
    if (!cleanRaw) return { recipeId: '', status: 'not_found', score: 0 };

    // 1. Direct match with Amharic or English name
    for (const r of recipes) {
      const am = normalizeText(r.nameAm);
      const en = normalizeText(r.nameEn);
      if (cleanRaw === am || cleanRaw === en) {
        return { recipeId: r.id, status: 'matched', score: 1.0 };
      }
    }

    // 2. Substring or high similarity
    let bestRecipeId = '';
    let bestScore = 0;

    for (const r of recipes) {
      const simAm = computeStringSimilarity(cleanRaw, r.nameAm);
      const simEn = computeStringSimilarity(cleanRaw, r.nameEn);
      const maxSim = Math.max(simAm, simEn);

      if (maxSim > bestScore) {
        bestScore = maxSim;
        bestRecipeId = r.id;
      }

      // Check alias dictionary
      for (const [key, aliases] of Object.entries(MENU_ALIASES)) {
        if (aliases.some((al) => cleanRaw.includes(al))) {
          if (normalizeText(r.nameEn).includes(key) || normalizeText(r.nameAm).includes(key) || aliases.some((al) => normalizeText(r.nameAm).includes(al) || normalizeText(r.nameEn).includes(al))) {
            if (bestScore < 0.8) {
              bestScore = 0.8;
              bestRecipeId = r.id;
            }
          }
        }
      }
    }

    if (bestScore >= 0.75) {
      return { recipeId: bestRecipeId, status: 'matched', score: bestScore };
    }
    if (bestScore >= 0.4) {
      return { recipeId: bestRecipeId, status: 'needs_review', score: bestScore };
    }
    return { recipeId: '', status: 'not_found', score: 0 };
  };

  // Helper to parse input text into rows
  const parseTextToRows = (rawText: string): ParsedMenuRow[] => {
    if (!rawText.trim()) return [];
    const lines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const parsed: ParsedMenuRow[] = [];

    for (const line of lines) {
      // Common table paste format: Name [TAB] Quantity, or Name, Quantity, or Name Quantity
      const parts = line.split(/[\t,|;]+/).map((p) => p.trim()).filter(Boolean);

      let nameCandidate = '';
      let qtyCandidate = 0;

      if (parts.length >= 2) {
        // e.g. "Spaghetti Bolognese", "12" or "12", "Spaghetti Bolognese"
        const numIdx = parts.findIndex((p) => !isNaN(Number(p)));
        if (numIdx !== -1) {
          qtyCandidate = Math.max(0, parseFloat(parts[numIdx]) || 0);
          nameCandidate = parts.filter((_, idx) => idx !== numIdx).join(' ');
        } else {
          nameCandidate = parts[0];
          qtyCandidate = 1;
        }
      } else {
        // Single line e.g. "Spaghetti Bolognese 12" or "12 Spaghetti Bolognese"
        const trailingNumberMatch = line.match(/^(.*?)\s+(\d+(\.\d+)?)$/);
        const leadingNumberMatch = line.match(/^(\d+(\.\d+)?)\s+(.*)$/);

        if (trailingNumberMatch) {
          nameCandidate = trailingNumberMatch[1].trim();
          qtyCandidate = parseFloat(trailingNumberMatch[2]) || 0;
        } else if (leadingNumberMatch) {
          qtyCandidate = parseFloat(leadingNumberMatch[1]) || 0;
          nameCandidate = leadingNumberMatch[3].trim();
        } else {
          nameCandidate = line.trim();
          qtyCandidate = 1;
        }
      }

      // Skip table headers if pasted accidentally
      const lower = nameCandidate.toLowerCase();
      if (lower.includes('item') || lower.includes('menu') || lower.includes('dish') || lower.includes('ምግብ') || lower.includes('ብዛት') || lower.includes('qty')) {
        continue;
      }

      const match = matchDishName(nameCandidate);
      parsed.push({
        rawLine: line,
        rawName: nameCandidate,
        matchedRecipeId: match.recipeId,
        quantity: qtyCandidate,
        status: match.status,
        confidence: match.score,
      });
    }

    return parsed;
  };

  const [chefRows, setChefRows] = useState<ParsedMenuRow[]>([]);
  const [cashierRows, setCashierRows] = useState<ParsedMenuRow[]>([]);

  // Update parsed rows when text changes
  const handleUpdateChefText = (text: string) => {
    setChefPasteText(text);
    setChefRows(parseTextToRows(text));
  };

  const handleUpdateCashierText = (text: string) => {
    setCashierPasteText(text);
    setCashierRows(parseTextToRows(text));
  };

  // Direct paste from clipboard
  const handlePasteClipboardChef = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) handleUpdateChefText(text);
    } catch (e) {
      console.warn('Clipboard read error:', e);
    }
  };

  const handlePasteClipboardCashier = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) handleUpdateCashierText(text);
    } catch (e) {
      console.warn('Clipboard read error:', e);
    }
  };

  // Re-map an individual row
  const handleRemapChefRow = (index: number, newRecipeId: string) => {
    setChefRows((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        matchedRecipeId: newRecipeId,
        status: newRecipeId ? 'matched' : 'not_found',
      };
      return copy;
    });
  };

  const handleRemapCashierRow = (index: number, newRecipeId: string) => {
    setCashierRows((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        matchedRecipeId: newRecipeId,
        status: newRecipeId ? 'matched' : 'not_found',
      };
      return copy;
    });
  };

  // Edit quantity in preview
  const handleQuantityChangeChef = (index: number, qty: number) => {
    setChefRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], quantity: Math.max(0, qty) };
      return copy;
    });
  };

  const handleQuantityChangeCashier = (index: number, qty: number) => {
    setCashierRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], quantity: Math.max(0, qty) };
      return copy;
    });
  };

  // Remove a row from preview
  const handleRemoveRowChef = (index: number) => {
    setChefRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveRowCashier = (index: number) => {
    setCashierRows((prev) => prev.filter((_, i) => i !== index));
  };

  // Confirm and apply
  const handleConfirmAndApply = () => {
    const finalChef: Record<string, number> = {};
    const finalCashier: Record<string, number> = {};

    // Collect chef sales
    chefRows.forEach((row) => {
      if (row.matchedRecipeId && row.quantity > 0) {
        finalChef[row.matchedRecipeId] = (finalChef[row.matchedRecipeId] || 0) + row.quantity;
      }
    });

    // Collect cashier sales
    cashierRows.forEach((row) => {
      if (row.matchedRecipeId && row.quantity > 0) {
        finalCashier[row.matchedRecipeId] = (finalCashier[row.matchedRecipeId] || 0) + row.quantity;
      }
    });

    onApplySales(finalChef, finalCashier, applyMode);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-slate-900 border-2 border-indigo-500/50 rounded-3xl max-w-5xl w-full p-5 sm:p-7 shadow-2xl space-y-5 my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-indigo-500/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 text-indigo-300">
              <ClipboardPaste className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">
                  {language === 'am' ? 'የኪችን KOT እና የካሸር POS ቀጥታ ፔስት ማድረጊያ' : 'Smart Paste: Kitchen KOT & Cashier POS Sales'}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold border border-amber-500/40">
                  {branchName} ({selectedDate})
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {language === 'am'
                  ? 'የኤክሴል፣ የካሸር ሪፖርት ወይም የኩሽና ትኬት ጽሑፍ በቀጥታ እዚህ ፔስት ያድርጉ። ሲስተሙ ስሞችን በራሱ አመሳስሎ ሴሎችን ይሞላል።'
                  : 'Paste Excel, POS daily summary, or kitchen ticket lines. Fuzzy matching maps names automatically.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Existing Sales Notice & Re-pasting Mode Selector */}
        {hasAnyExistingSales && (
          <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                {language === 'am'
                  ? `በዚህ ቀን (${selectedDate}) ቀደም ሲል የተመዘገበ የሽያጭ ዳታ አለ። እንዴት ማስገባት ይፈልጋሉ?`
                  : `Existing sales recorded on ${selectedDate}. Choose how to apply new paste:`}
              </span>
            </div>

            <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-amber-500/30 shrink-0">
              <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg cursor-pointer text-xs font-bold transition-all text-amber-300 hover:text-white">
                <input
                  type="radio"
                  name="pasteMode"
                  value="replace"
                  checked={applyMode === 'replace'}
                  onChange={() => setApplyMode('replace')}
                  className="accent-amber-400"
                />
                <span>{language === 'am' ? '🔄 ተካ (Replace)' : 'Replace'}</span>
              </label>

              <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg cursor-pointer text-xs font-bold transition-all text-emerald-300 hover:text-white">
                <input
                  type="radio"
                  name="pasteMode"
                  value="add"
                  checked={applyMode === 'add'}
                  onChange={() => setApplyMode('add')}
                  className="accent-emerald-400"
                />
                <span>{language === 'am' ? '➕ ደምር / አክል (Add to Existing)' : 'Add to Existing'}</span>
              </label>
            </div>
          </div>
        )}

        {/* Side-by-Side Paste Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-shrink-0">
          {/* Left Column: Kitchen Ticket Order (Chef KOT) */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-indigo-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs">
                <UtensilsCrossed className="w-4 h-4" />
                <span>{language === 'am' ? '1. የሼፎች ትዕዛዝ (Kitchen KOT)' : '1. Kitchen Ticket Order (Chef KOT)'}</span>
              </div>
              <button
                type="button"
                onClick={handlePasteClipboardChef}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-indigo-200 bg-indigo-950/70 border border-indigo-500/40 hover:bg-indigo-900/60 transition-all cursor-pointer"
              >
                <ClipboardPaste className="w-3.5 h-3.5 text-indigo-400" />
                <span>{language === 'am' ? '📋 ከ Clipboard ለጥፍ' : 'Paste'}</span>
              </button>
            </div>

            <textarea
              rows={4}
              value={chefPasteText}
              onChange={(e) => handleUpdateChefText(e.target.value)}
              placeholder={
                language === 'am'
                  ? 'ጽሑፉን እዚህ ፔስት ያድርጉ...\nለምሳሌ፦\nስፓጌቲ ቦሎኔዝ 12\nታሌቴሊ አልፍሬዶ 8\nስፓጌቲ ቱና 6'
                  : 'Paste Chef KOT lines here...\ne.g.\nSpaghetti Bolognese 12\nTagliatelle Alfredo 8\nSpaghetti Tuna 6'
              }
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs font-mono text-indigo-200 focus:outline-none focus:border-indigo-400 placeholder-slate-600 resize-none"
            />
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{chefRows.length} {language === 'am' ? 'መስመሮች ተነበዋል' : 'lines detected'}</span>
              <span className="text-emerald-400 font-bold">
                {chefRows.filter((r) => r.status === 'matched').length} {language === 'am' ? 'ተመሳስለዋል' : 'matched'}
              </span>
            </div>
          </div>

          {/* Right Column: Cashier POS Machine Sales */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-rose-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
                <Receipt className="w-4 h-4" />
                <span>{language === 'am' ? '2. የካሸር ሪፖርት (Cashier POS)' : '2. Cashier POS Machine Sales'}</span>
              </div>
              <button
                type="button"
                onClick={handlePasteClipboardCashier}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-rose-200 bg-rose-950/70 border border-rose-500/40 hover:bg-rose-900/60 transition-all cursor-pointer"
              >
                <ClipboardPaste className="w-3.5 h-3.5 text-rose-400" />
                <span>{language === 'am' ? '📋 ከ Clipboard ለጥፍ' : 'Paste'}</span>
              </button>
            </div>

            <textarea
              rows={4}
              value={cashierPasteText}
              onChange={(e) => handleUpdateCashierText(e.target.value)}
              placeholder={
                language === 'am'
                  ? 'የካሸር ሽያጭ እዚህ ፔስት ያድርጉ...\nለምሳሌ፦\nSpaghetti Bolognese 12\nTagliatelle Alfredo 7\nSpaghetti Tuna 6'
                  : 'Paste Cashier POS lines here...\ne.g.\nSpaghetti Bolognese 12\nTagliatelle Alfredo 7\nSpaghetti Tuna 6'
              }
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs font-mono text-rose-200 focus:outline-none focus:border-rose-400 placeholder-slate-600 resize-none"
            />
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{cashierRows.length} {language === 'am' ? 'መስመሮች ተነበዋል' : 'lines detected'}</span>
              <span className="text-emerald-400 font-bold">
                {cashierRows.filter((r) => r.status === 'matched').length} {language === 'am' ? 'ተመሳስለዋል' : 'matched'}
              </span>
            </div>
          </div>
        </div>

        {/* Preview Tabs & Interactive Mapping Table */}
        <div className="space-y-3 flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActivePreviewTab('chef')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activePreviewTab === 'chef'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span>{language === 'am' ? 'የሼፍ ትኬት ዝርዝር' : 'Chef KOT Preview'} ({chefRows.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActivePreviewTab('cashier')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activePreviewTab === 'cashier'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>{language === 'am' ? 'የካሸር POS ዝርዝር' : 'Cashier POS Preview'} ({cashierRows.length})</span>
              </button>
            </div>

            <span className="text-[11px] text-slate-400 italic">
              {language === 'am'
                ? 'ያልተገኙ ወይም ማስተካከያ የሚሹ ምግቦችን ከዝርዝሩ መርጠው ያስተካክሉ።'
                : 'Unmatched lines do not block saving.'}
            </span>
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-y-auto border border-slate-800 rounded-2xl bg-slate-950/70 p-1">
            {activePreviewTab === 'chef' ? (
              chefRows.length === 0 ? (
                <div className="py-10 text-center text-slate-500 text-xs">
                  {language === 'am' ? 'የሼፎች ጽሑፍ አልተለጠፈም' : 'No Chef lines pasted yet'}
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold bg-slate-900/90">
                      <th className="py-2 px-3">{language === 'am' ? 'የተለጠፈው ጽሑፍ' : 'Pasted Text'}</th>
                      <th className="py-2 px-3">{language === 'am' ? 'የተገኘው የሜኑ ምግብ (ለመቀየር ይጫኑ)' : 'Matched Menu Dish'}</th>
                      <th className="py-2 px-2 text-right">{language === 'am' ? 'ብዛት' : 'Quantity'}</th>
                      <th className="py-2 px-2 text-center">{language === 'am' ? 'ሁኔታ' : 'Status'}</th>
                      <th className="py-2 px-2 text-center">{language === 'am' ? 'ድርጊት' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {chefRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-850/50">
                        <td className="py-2 px-3 font-mono text-indigo-300 max-w-[180px] truncate" title={row.rawName}>
                          {row.rawName}
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={row.matchedRecipeId}
                            onChange={(e) => handleRemapChefRow(idx, e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-400"
                          >
                            <option value="">{language === 'am' ? '-- ምግቡን ይምረጡ --' : '-- Select Dish --'}</option>
                            {recipes.map((r) => (
                              <option key={r.id} value={r.id}>
                                {language === 'am' ? r.nameAm : r.nameEn} ({r.category})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-2 text-right">
                          <input
                            type="number"
                            min="0"
                            value={row.quantity}
                            onChange={(e) => handleQuantityChangeChef(idx, parseFloat(e.target.value) || 0)}
                            className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-right text-xs font-mono font-bold text-amber-300 focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-2 text-center whitespace-nowrap">
                          {row.status === 'matched' && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/50 text-emerald-300 text-[10px] font-bold">
                              ✓ {language === 'am' ? 'ተገኝቷል' : 'Matched'}
                            </span>
                          )}
                          {row.status === 'needs_review' && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-950 border border-amber-500/50 text-amber-300 text-[10px] font-bold">
                              ⚠️ {language === 'am' ? 'ማረጋገጫ' : 'Needs Review'}
                            </span>
                          )}
                          {row.status === 'not_found' && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-950 border border-rose-500/50 text-rose-300 text-[10px] font-bold">
                              ✕ {language === 'am' ? 'አልተገኘም' : 'Not Found'}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRowChef(idx)}
                            className="text-slate-500 hover:text-rose-400 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : (
              cashierRows.length === 0 ? (
                <div className="py-10 text-center text-slate-500 text-xs">
                  {language === 'am' ? 'የካሸር ጽሑፍ አልተለጠፈም' : 'No Cashier lines pasted yet'}
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold bg-slate-900/90">
                      <th className="py-2 px-3">{language === 'am' ? 'የተለጠፈው ጽሑፍ' : 'Pasted Text'}</th>
                      <th className="py-2 px-3">{language === 'am' ? 'የተገኘው የሜኑ ምግብ (ለመቀየር ይጫኑ)' : 'Matched Menu Dish'}</th>
                      <th className="py-2 px-2 text-right">{language === 'am' ? 'ብዛት' : 'Quantity'}</th>
                      <th className="py-2 px-2 text-center">{language === 'am' ? 'ሁኔታ' : 'Status'}</th>
                      <th className="py-2 px-2 text-center">{language === 'am' ? 'ድርጊት' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {cashierRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-850/50">
                        <td className="py-2 px-3 font-mono text-rose-300 max-w-[180px] truncate" title={row.rawName}>
                          {row.rawName}
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={row.matchedRecipeId}
                            onChange={(e) => handleRemapCashierRow(idx, e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-rose-400"
                          >
                            <option value="">{language === 'am' ? '-- ምግቡን ይምረጡ --' : '-- Select Dish --'}</option>
                            {recipes.map((r) => (
                              <option key={r.id} value={r.id}>
                                {language === 'am' ? r.nameAm : r.nameEn} ({r.category})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-2 text-right">
                          <input
                            type="number"
                            min="0"
                            value={row.quantity}
                            onChange={(e) => handleQuantityChangeCashier(idx, parseFloat(e.target.value) || 0)}
                            className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-right text-xs font-mono font-bold text-amber-300 focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-2 text-center whitespace-nowrap">
                          {row.status === 'matched' && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/50 text-emerald-300 text-[10px] font-bold">
                              ✓ {language === 'am' ? 'ተገኝቷል' : 'Matched'}
                            </span>
                          )}
                          {row.status === 'needs_review' && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-950 border border-amber-500/50 text-amber-300 text-[10px] font-bold">
                              ⚠️ {language === 'am' ? 'ማረጋገጫ' : 'Needs Review'}
                            </span>
                          )}
                          {row.status === 'not_found' && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-950 border border-rose-500/50 text-rose-300 text-[10px] font-bold">
                              ✕ {language === 'am' ? 'አልተገኘም' : 'Not Found'}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRowCashier(idx)}
                            className="text-slate-500 hover:text-rose-400 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-800 pt-4">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>
              {language === 'am'
                ? `ዝግጁ የሆኑ ምግቦች፦ ሼፍ (${chefRows.filter((r) => r.matchedRecipeId && r.quantity > 0).length}) | ካሸር (${cashierRows.filter((r) => r.matchedRecipeId && r.quantity > 0).length})`
                : `Ready dishes: Chef (${chefRows.filter((r) => r.matchedRecipeId && r.quantity > 0).length}) | Cashier (${cashierRows.filter((r) => r.matchedRecipeId && r.quantity > 0).length})`}
            </span>
          </div>

          <div className="flex items-center gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              {language === 'am' ? 'ሰርዝ' : 'Cancel'}
            </button>

            <button
              type="button"
              onClick={handleConfirmAndApply}
              disabled={
                chefRows.filter((r) => r.matchedRecipeId && r.quantity > 0).length === 0 &&
                cashierRows.filter((r) => r.matchedRecipeId && r.quantity > 0).length === 0
              }
              className="px-5 py-2.5 rounded-xl text-xs font-black text-slate-950 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-slate-950" />
              <span>{language === 'am' ? 'አረጋግጥና አስገባ (Confirm & Save)' : 'Confirm & Apply Sales'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

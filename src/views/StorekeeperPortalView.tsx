import React, { useState, useMemo, useEffect } from 'react';
import {
  PackagePlus,
  ArrowRightLeft,
  Warehouse,
  Search,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Copy,
  Check,
  Calendar,
  Layers,
  FileSpreadsheet,
  Building2,
  Tag,
  DollarSign,
  Clock,
  Sparkles,
  PlusCircle,
  X,
  Share2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { formatEthiopianDate, getTodayDateString } from '../utils/ethiopianDate';
import { DatePickerField } from '../components/common/DatePickerField';
import { SmartItemSelector } from '../components/common/SmartItemSelector';
import { createStorekeeperShareableUrl, parseStorekeeperCatalogHash } from '../utils/shareableStorekeeperLink';
import { InventoryItem, ItemCategory, UnitType } from '../types';

interface StorekeeperPortalViewProps {
  onExitPortal?: () => void;
}

export const StorekeeperPortalView: React.FC<StorekeeperPortalViewProps> = ({ onExitPortal }) => {
  const {
    items,
    branches,
    recordStockIn,
    transferToBranch,
    centralBinCards,
    centralSentToEntries,
    addNewItem,
    bulkMergeItems,
  } = useApp();
  const { language, t, formatCurrency } = useLanguage();

  // Active sub-view or tab inside storekeeper portal
  const [activeBox, setActiveBox] = useState<'both' | 'grn' | 'siv' | 'stock'>('both');

  // --- Automatic Catalog Hash Import ---
  const [catalogSyncNotice, setCatalogSyncNotice] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Fetch live master catalog from server
    const fetchServerCatalog = async () => {
      try {
        const res = await fetch('/api/store/catalog');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data && Array.isArray(json.data.items) && json.data.items.length > 0) {
            bulkMergeItems(json.data.items);
            console.log(`[Storekeeper] Hydrated ${json.data.items.length} master items from server.`);
          }
        }
      } catch (err) {
        console.warn('Could not fetch server catalog:', err);
      }
    };
    fetchServerCatalog();

    // 2. Also check URL hash if catalog was passed in link
    const hash = window.location.hash;
    if (hash && hash.includes('catalog=')) {
      const parsedItems = parseStorekeeperCatalogHash(hash);
      if (parsedItems && parsedItems.length > 0) {
        bulkMergeItems(parsedItems);
        setCatalogSyncNotice(
          language === 'am'
            ? `የማኔጀሩ ሙሉ ${parsedItems.length} የስቶር እቃዎች ወደ ሲስተምዎ በስኬት ተጭነዋል!`
            : `All ${parsedItems.length} store items from manager synchronized successfully!`
        );
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        setTimeout(() => setCatalogSyncNotice(null), 8000);
      }
    }
  }, [bulkMergeItems, language]);

  // --- GRN (Stock In & Price Entry) State ---
  const [grnItemId, setGrnItemId] = useState<string>(items[0]?.id || '');
  const [grnDate, setGrnDate] = useState<string>(getTodayDateString());
  const [grnQuantity, setGrnQuantity] = useState<number | ''>('');
  const [grnUnitPrice, setGrnUnitPrice] = useState<number | ''>('');
  const [grnSupplier, setGrnSupplier] = useState<string>('');
  const [grnNumber, setGrnNumber] = useState<string>(
    `GRN-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`
  );
  const [grnNotes, setGrnNotes] = useState<string>('');
  const [grnSuccessMsg, setGrnSuccessMsg] = useState<string | null>(null);

  // --- SIV (Transfer Out to Branch) State ---
  const [sivItemId, setSivItemId] = useState<string>(items[0]?.id || '');
  const [sivBranchId, setSivBranchId] = useState<string>(branches[0]?.id || '');
  const [sivDate, setSivDate] = useState<string>(getTodayDateString());
  const [sivQuantity, setSivQuantity] = useState<number | ''>('');
  const [sivNumber, setSivNumber] = useState<string>(
    `SIV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`
  );
  const [sivNotes, setSivNotes] = useState<string>('');
  const [sivErrorMsg, setSivErrorMsg] = useState<string | null>(null);
  const [sivSuccessMsg, setSivSuccessMsg] = useState<string | null>(null);

  // --- New Raw Material Modal State ---
  const [newItemModalOpen, setNewItemModalOpen] = useState(false);
  const [newItemNameAm, setNewItemNameAm] = useState('');
  const [newItemNameEn, setNewItemNameEn] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<ItemCategory>('produce');
  const [newItemUnit, setNewItemUnit] = useState<UnitType>('kg');
  const [newItemPrice, setNewItemPrice] = useState<number | ''>('');
  const [newItemMinStock, setNewItemMinStock] = useState<number>(5);
  const [newItemSuccessNotice, setNewItemSuccessNotice] = useState<string | null>(null);

  // Stock list search
  const [stockSearch, setStockSearch] = useState<string>('');

  // Link copy feedback
  const [copiedLink, setCopiedLink] = useState(false);

  // PIN modal for exiting to manager
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState(false);

  // --- Direct Copy/Paste Data Sync State ---
  const [directSyncModalOpen, setDirectSyncModalOpen] = useState(false);
  const [directSyncText, setDirectSyncText] = useState('');
  const [directSyncError, setDirectSyncError] = useState<string | null>(null);
  const [directSyncSuccess, setDirectSyncSuccess] = useState<string | null>(null);
  const [copiedItemsData, setCopiedItemsData] = useState(false);

  const selectedGrnItem = items.find((i) => i.id === grnItemId);
  const selectedSivItem = items.find((i) => i.id === sivItemId);
  const selectedSivBranch = branches.find((b) => b.id === sivBranchId);

  const parsedGrnQty = typeof grnQuantity === 'number' ? grnQuantity : 0;
  const parsedGrnPrice = typeof grnUnitPrice === 'number' ? grnUnitPrice : 0;
  const grnTotalCost = parsedGrnQty * parsedGrnPrice;

  const parsedSivQty = typeof sivQuantity === 'number' ? sivQuantity : 0;
  const currentSivStock = selectedSivItem ? selectedSivItem.currentCentralStock : 0;

  // Handle GRN Submit
  const handleGrnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!grnItemId || !parsedGrnQty || !parsedGrnPrice) return;

    recordStockIn({
      itemId: grnItemId,
      quantity: parsedGrnQty,
      unitPrice: parsedGrnPrice,
      date: grnDate,
      supplier: grnSupplier || (language === 'am' ? 'አገር ውስጥ ገበያ' : 'Local Market'),
      grnNumber,
      notes: grnNotes,
      recordedBy: language === 'am' ? 'ስቶር ኪፐር (Storekeeper)' : 'Storekeeper',
    });

    // Push to server so manager's laptop immediately updates in real time
    fetch('/api/store/record-activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        activity: {
          type: 'GRN',
          itemId: grnItemId,
          itemNameAm: selectedGrnItem?.nameAm,
          itemNameEn: selectedGrnItem?.nameEn,
          quantity: parsedGrnQty,
          unitPrice: parsedGrnPrice,
          date: grnDate,
          supplier: grnSupplier || (language === 'am' ? 'አገር ውስጥ ገበያ' : 'Local Market'),
          grnNumber,
          notes: grnNotes,
          recordedBy: 'ስቶር ኪፐር (Storekeeper)',
        },
      }),
    }).catch((err) => console.warn('Activity sync failed:', err));

    setGrnSuccessMsg(
      language === 'am'
        ? `እቃው በስኬት ገቢ ተደርጓል! ${parsedGrnQty} ${selectedGrnItem?.unitAm} ${selectedGrnItem?.nameAm} በ ${formatCurrency(parsedGrnPrice)} ገብቷል።`
        : `Stock-In successful! ${parsedGrnQty} ${selectedGrnItem?.unit} of ${selectedGrnItem?.nameEn} recorded.`
    );
    setGrnQuantity('');
    setGrnUnitPrice('');
    setGrnNotes('');
    setGrnNumber(`GRN-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
    setTimeout(() => setGrnSuccessMsg(null), 5000);
  };

  // Handle SIV Submit
  const handleSivSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSivErrorMsg(null);

    if (!sivItemId || !sivBranchId || !parsedSivQty) {
      setSivErrorMsg(language === 'am' ? 'እባክዎ ሁሉንም አስፈላጊ መረጃዎች ይሙሉ' : 'Please fill all required fields');
      return;
    }

    if (parsedSivQty > currentSivStock) {
      setSivErrorMsg(
        language === 'am'
          ? `በቂ የስቶር ክምችት የለም! ያለው ክምችት: ${currentSivStock} ${selectedSivItem?.unitAm}`
          : `Insufficient stock in store! Available: ${currentSivStock} ${selectedSivItem?.unit}`
      );
      return;
    }

    const res = transferToBranch({
      itemId: sivItemId,
      branchId: sivBranchId,
      quantity: parsedSivQty,
      date: sivDate,
      sivNumber,
      notes: sivNotes,
      recordedBy: language === 'am' ? 'ስቶር ኪፐር (Storekeeper)' : 'Storekeeper',
    });

    if (res.success) {
      // Push SIV to server so manager's laptop immediately updates in real time
      fetch('/api/store/record-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity: {
            type: 'SIV',
            itemId: sivItemId,
            itemNameAm: selectedSivItem?.nameAm,
            itemNameEn: selectedSivItem?.nameEn,
            branchId: sivBranchId,
            branchNameAm: selectedSivBranch?.nameAm,
            branchNameEn: selectedSivBranch?.nameEn,
            quantity: parsedSivQty,
            unitPrice: selectedSivItem?.lastPurchasePrice || selectedSivItem?.weightedAvgCost || 0,
            date: sivDate,
            sivNumber,
            notes: sivNotes,
            recordedBy: 'ስቶር ኪፐር (Storekeeper)',
          },
        }),
      }).catch((err) => console.warn('Activity sync failed:', err));

      setSivSuccessMsg(
        language === 'am'
          ? `እቃው በ SIV ቁጥር ${sivNumber} ወደ ${selectedSivBranch?.nameAm || selectedSivBranch?.nameEn} በተሳካ ሁኔታ ተልኳል!`
          : `Dispatched ${parsedSivQty} to ${selectedSivBranch?.nameEn} via ${sivNumber}`
      );
      setSivQuantity('');
      setSivNotes('');
      setSivNumber(`SIV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
      setTimeout(() => setSivSuccessMsg(null), 5000);
    } else {
      setSivErrorMsg(res.error || 'ስህተት ተከስቷል');
    }
  };

  // Helper to map Unit to Amharic
  const getUnitAmLabel = (u: UnitType): string => {
    switch (u) {
      case 'kg': return 'ኪ.ግ';
      case 'liter': return 'ሊትር';
      case 'pcs': return 'ፍሬ';
      case 'pack': return 'ፓኬት';
      case 'bottle': return 'ጠርሙስ';
      case 'quintal': return 'ኩንታል';
      case 'gram': return 'ግራም';
      default: return u;
    }
  };

  // Handle Create New Item by Storekeeper
  const handleCreateNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemNameAm.trim()) return;

    const unitAm = getUnitAmLabel(newItemUnit);
    const parsedPrice = typeof newItemPrice === 'number' ? newItemPrice : 0;
    const generatedCode = `ITM-SK-${Date.now().toString().slice(-4)}`;
    const newId = `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const newItem: InventoryItem = {
      id: newId,
      nameAm: newItemNameAm.trim(),
      nameEn: newItemNameEn.trim() || newItemNameAm.trim(),
      code: generatedCode,
      category: newItemCategory,
      unit: newItemUnit,
      unitAm,
      minStockLevel: newItemMinStock || 5,
      currentCentralStock: 0,
      weightedAvgCost: parsedPrice,
      lastPurchasePrice: parsedPrice,
      priceHistory: parsedPrice > 0 ? [{
        date: getTodayDateString(),
        ethiopianDateStr: formatEthiopianDate(getTodayDateString(), language),
        price: parsedPrice,
        quantity: 0,
        supplier: 'አዲስ የተመዘገበ እቃ',
        grnNumber: 'INIT',
      }] : [],
    };

    addNewItem(newItem);

    // Sync to server so manager immediately gets it too
    fetch('/api/store/add-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item: newItem }),
    }).catch((err) => console.warn('Failed to push item to server:', err));

    // Auto-select this item for GRN immediately
    setGrnItemId(newItem.id);
    if (parsedPrice > 0) {
      setGrnUnitPrice(parsedPrice);
    }

    setNewItemSuccessNotice(
      language === 'am'
        ? `አዲሱ እቃ «${newItem.nameAm}» በስኬት ተመዝግቧል! አሁን መጠኑንና ዋጋውን ማስገባት ይችላሉ።`
        : `New item "${newItem.nameEn}" added successfully!`
    );

    // Reset form & close modal
    setNewItemNameAm('');
    setNewItemNameEn('');
    setNewItemPrice('');
    setNewItemModalOpen(false);
    setTimeout(() => setNewItemSuccessNotice(null), 6000);
  };

  // Direct manual apply pasted data
  const handleApplyPastedData = () => {
    setDirectSyncError(null);
    if (!directSyncText.trim()) return;

    try {
      let parsed: any[] = [];
      const trimmed = directSyncText.trim();
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        const raw = JSON.parse(trimmed);
        parsed = Array.isArray(raw) ? raw : (raw.items || []);
      } else {
        const binary = atob(trimmed);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const jsonStr = new TextDecoder().decode(bytes);
        const raw = JSON.parse(jsonStr);
        parsed = Array.isArray(raw) ? raw : (raw.items || []);
      }

      if (!Array.isArray(parsed) || parsed.length === 0) {
        setDirectSyncError('ትክክለኛ የአይተሞች ዳታ አልተገኘም! እባክዎ ከማኔጀሩ የተላከውን ኮድ በሙሉ ኮፒ አድርገው ፔስት ያድርጉ።');
        return;
      }

      const formatted: InventoryItem[] = parsed.map((it: any) => ({
        id: it.id || it.i || `itm-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        nameAm: it.nameAm || it.a || 'ዕቃ',
        nameEn: it.nameEn || it.e || it.nameAm || '',
        code: it.code || it.c || `ITM-${Date.now().toString().slice(-4)}`,
        category: it.category || it.g || 'produce',
        unit: it.unit || it.u || 'kg',
        unitAm: it.unitAm || it.ua || 'ኪ.ግ',
        minStockLevel: it.minStockLevel || it.m || 5,
        currentCentralStock: it.currentCentralStock || it.s || 0,
        weightedAvgCost: it.weightedAvgCost || it.w || it.lastPurchasePrice || it.p || 0,
        lastPurchasePrice: it.lastPurchasePrice || it.p || 0,
        priceHistory: it.priceHistory || [],
      }));

      bulkMergeItems(formatted);

      // Also sync to server
      fetch('/api/store/sync-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: formatted, managerName: 'Storekeeper Manual Paste' }),
      }).catch(() => {});

      setDirectSyncSuccess(`በስኬት ተከናውኗል! ${formatted.length} እቃዎች ሙሉ በሙሉ ተመሳስለዋል።`);
      setDirectSyncText('');
      setTimeout(() => {
        setDirectSyncSuccess(null);
        setDirectSyncModalOpen(false);
      }, 2500);
    } catch (err: any) {
      setDirectSyncError('የተሳሳተ የዳታ ፎርማት! እባክዎ የተላከውን ኮድ በሙሉ ይቅዱ።');
    }
  };

  // Copy items compact data
  const handleCopyItemsJson = () => {
    const compact = items.map((item) => ({
      i: item.id,
      a: item.nameAm,
      e: item.nameEn,
      c: item.code,
      g: item.category,
      u: item.unit,
      ua: item.unitAm,
      p: item.lastPurchasePrice || 0,
      w: item.weightedAvgCost || 0,
      s: item.currentCentralStock || 0,
    }));
    navigator.clipboard.writeText(JSON.stringify(compact));
    setCopiedItemsData(true);
    setTimeout(() => setCopiedItemsData(false), 3000);
  };

  // Copy Direct Storekeeper Link with full catalog embedded
  const handleCopyLink = () => {
    const fullUrl = createStorekeeperShareableUrl(items);
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  // Unlock / Return to manager with default PIN 1234 or empty
  const handleUnlockManager = () => {
    if (enteredPin === '1234' || enteredPin === '0000' || enteredPin === '') {
      setPinError(false);
      setPinModalOpen(false);
      const url = new URL(window.location.href);
      url.searchParams.delete('portal');
      url.searchParams.delete('role');
      window.history.replaceState({}, '', url.pathname + url.search);
      if (onExitPortal) {
        onExitPortal();
      }
    } else {
      setPinError(true);
    }
  };

  // Filtered store inventory
  const filteredInventory = useMemo(() => {
    return items.filter((item) => {
      const q = stockSearch.toLowerCase();
      return (
        item.nameAm.toLowerCase().includes(q) ||
        item.nameEn.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q)
      );
    });
  }, [items, stockSearch]);

  // Today's entries recorded by store keeper
  const todayStr = getTodayDateString();
  const todayGrnEntries = centralBinCards.filter(
    (b) => b.type === 'IN_PURCHASE' && b.date === todayStr
  );
  const todaySivEntries = centralSentToEntries.filter(
    (s) => s.date === todayStr
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fadeIn">
      {/* Catalog Synchronized Notice Banner */}
      {catalogSyncNotice && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 border-2 border-emerald-400 text-emerald-200 text-xs sm:text-sm font-black flex items-center justify-between gap-3 shadow-2xl animate-bounce">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            <span>{catalogSyncNotice}</span>
          </div>
          <button
            onClick={() => setCatalogSyncNotice(null)}
            className="p-1 rounded-lg text-emerald-400 hover:text-white hover:bg-emerald-900/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* New Item Added Notice */}
      {newItemSuccessNotice && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-950 via-yellow-950 to-slate-900 border-2 border-amber-400 text-amber-200 text-xs sm:text-sm font-black flex items-center justify-between gap-3 shadow-2xl animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-amber-400 shrink-0" />
            <span>{newItemSuccessNotice}</span>
          </div>
          <button
            onClick={() => setNewItemSuccessNotice(null)}
            className="p-1 rounded-lg text-amber-400 hover:text-white hover:bg-amber-900/60"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner / Storekeeper Header */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 p-5 sm:p-7 border border-amber-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-amber-400 shadow-inner">
              <Warehouse className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {language === 'am' ? 'የተገደበ አክሰስ • የተለየ የስቶር ኪፐር ፖርታል' : 'Restricted Storekeeper Portal'}
                </span>
                <span className="text-xs text-amber-400/80 font-mono">
                  🇪🇹 {formatEthiopianDate(todayStr, language)}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
                {language === 'am' ? 'የስቶር ኪፐር ዕቃ ማስገቢያና መላኪያ ሳጥን' : 'Storekeeper In/Out Dispatch Box'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                {language === 'am'
                  ? `እቃ ሲገባ የመግዣ ዋጋና መጠን መሙያ (GRN)፣ ወደ ቅርንጫፎች መላኪያ (SIV) እና አዳዲስ እቃዎችን መመዝገቢያ (${items.length} እቃዎች አሉ)`
                  : `Record incoming supplier goods with unit prices (GRN), dispatch to branches (SIV) and register new raw materials (${items.length} items)`}
              </p>
            </div>
          </div>

          {/* Action buttons on header */}
          <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto justify-end">
            {/* Quick Add New Item button */}
            <button
              onClick={() => setNewItemModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-xs font-black transition-all shadow-lg shadow-amber-500/20 active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{language === 'am' ? '➕ አዲስ እቃ መዝግብ' : '➕ Add New Item'}</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all shadow-md active:scale-95"
              title={language === 'am' ? 'የስቶር ኪፐር ቀጥተኛ ሊንክ ከነሙሉ እቃዎቹ ቅዳ' : 'Copy direct link with all items'}
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
              <span>{copiedLink ? (language === 'am' ? 'ሊንኩ ተቀድቷል!' : 'Link Copied!') : (language === 'am' ? 'ሊንኩን ቅዳ' : 'Copy Link')}</span>
            </button>

            {/* Direct Copy/Paste Sync Button */}
            <button
              onClick={() => setDirectSyncModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-950/80 hover:bg-purple-900 text-purple-200 border border-purple-500/40 text-xs font-bold transition-all shadow-md active:scale-95"
              title={language === 'am' ? 'የማኔጀሩን ዳታ በኮፒ/ፔስት ማመሳሰያ' : 'Copy/Paste direct data sync'}
            >
              <FileSpreadsheet className="w-4 h-4 text-purple-400" />
              <span>{language === 'am' ? '📋 ዳታ ኮፒ/ፔስት' : '📋 Copy/Paste Sync'}</span>
            </button>

            {onExitPortal && (
              <button
                onClick={() => setPinModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all active:scale-95"
              >
                <Lock className="w-4 h-4 text-amber-400" />
                <span>{language === 'am' ? 'የማኔጀር መግቢያ' : 'Manager Switch'}</span>
              </button>
            )}
          </div>
        </div>

        {/* View Switcher Bar */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={() => setActiveBox('both')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all ${
              activeBox === 'both'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            {language === 'am' ? 'ሁለቱንም ሳጥኖች አሳይ (GRN + SIV)' : 'Show Both Boxes'}
          </button>
          <button
            onClick={() => setActiveBox('grn')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all ${
              activeBox === 'grn'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-900/80 text-emerald-400 hover:bg-slate-800 border border-emerald-500/30'
            }`}
          >
            <PackagePlus className="w-4 h-4" />
            <span>{language === 'am' ? '🟢 እቃ ማስገቢያ ብቻ (GRN)' : '🟢 Stock In (GRN)'}</span>
          </button>
          <button
            onClick={() => setActiveBox('siv')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all ${
              activeBox === 'siv'
                ? 'bg-blue-500 text-slate-950 shadow-lg shadow-blue-500/20'
                : 'bg-slate-900/80 text-blue-400 hover:bg-slate-800 border border-blue-500/30'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>{language === 'am' ? '🔵 እቃ መላኪያ ብቻ (SIV)' : '🔵 Dispatch (SIV)'}</span>
          </button>
          <button
            onClick={() => setActiveBox('stock')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all ${
              activeBox === 'stock'
                ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/20'
                : 'bg-slate-900/80 text-amber-300 hover:bg-slate-800 border border-amber-500/30'
            }`}
          >
            <Warehouse className="w-4 h-4" />
            <span>{language === 'am' ? `📦 የስቶር ክምችት ዝርዝር (${items.length})` : `📦 Store Stock (${items.length})`}</span>
          </button>
        </div>
      </div>

      {/* Main Two Boxes Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ========================================================================= */}
        {/* BOX 1: እቃ ማስገቢያ እና ዋጋ መሙያ (GRN / Goods Receiving Voucher) */}
        {/* ========================================================================= */}
        {(activeBox === 'both' || activeBox === 'grn') && (
          <div className="bg-slate-900/90 rounded-3xl border-2 border-emerald-500/40 p-6 shadow-2xl flex flex-col justify-between">
            <div>
              {/* Box Title */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-emerald-500/20">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                    <PackagePlus className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                      {language === 'am' ? 'ሳጥን 1 • ዕቃ መቀበያ' : 'BOX 1 • GOODS RECEIVING'}
                    </span>
                    <h2 className="text-lg font-black text-white">
                      {language === 'am' ? 'እቃ ማስገቢያና ዋጋ መሙያ (GRN)' : 'Stock In & Price Entry'}
                    </h2>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setNewItemModalOpen(true)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black rounded-xl shadow-md transition-all active:scale-95"
                    title={language === 'am' ? 'አዲስ እቃ ለመመዝገብ' : 'Add new item'}
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>{language === 'am' ? '+ አዲስ እቃ' : '+ New Item'}</span>
                  </button>
                  <span className="px-2.5 py-1 bg-emerald-950/70 text-emerald-300 text-xs font-bold rounded-xl border border-emerald-500/40">
                    {language === 'am' ? 'ዋጋ ይሞላል' : 'Fills Price'}
                  </span>
                </div>
              </div>

              {grnSuccessMsg && (
                <div className="mb-4 p-4 rounded-2xl bg-emerald-950/90 border border-emerald-500/60 text-emerald-200 text-xs font-bold flex items-start gap-2.5 animate-fadeIn">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{grnSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handleGrnSubmit} className="space-y-4">
                {/* Date Picker */}
                <DatePickerField
                  label={language === 'am' ? 'የገባበት ቀን' : 'Receipt Date'}
                  value={grnDate}
                  onChange={setGrnDate}
                  required
                />

                {/* Item Selector with Add New Button integrated */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-amber-300">
                      {language === 'am' ? 'የሚገባውን ጥሬ እቃ ይምረጡ' : 'Select Raw Material'}{' '}
                      <span className="text-rose-400">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setNewItemModalOpen(true)}
                      className="text-xs text-amber-400 hover:text-amber-300 font-bold underline flex items-center gap-1"
                    >
                      <PlusCircle className="w-3 h-3" />
                      <span>{language === 'am' ? 'እቃው እዚህ ከሌለ አዲስ እቃ ጨምር' : 'Add new if not listed'}</span>
                    </button>
                  </div>
                  <SmartItemSelector
                    items={items}
                    selectedItemId={grnItemId}
                    onSelectItem={setGrnItemId}
                    placeholder={language === 'am' ? 'እቃ ፈልግ ወይም ምረጥ...' : 'Search raw material...'}
                  />
                  {selectedGrnItem && (
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400 px-1">
                      <span>{language === 'am' ? 'የመለኪያ አሃድ:' : 'Unit:'} <strong className="text-amber-300">{selectedGrnItem.unitAm} ({selectedGrnItem.unit})</strong></span>
                      <span>{language === 'am' ? 'የቀድሞ የመግዣ ዋጋ:' : 'Last Price:'} <strong className="text-white font-mono">{formatCurrency(selectedGrnItem.lastPurchasePrice || 0)}</strong></span>
                    </div>
                  )}
                </div>

                {/* Quantity and Price Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-amber-300 mb-1.5">
                      {language === 'am' ? 'የገባው መጠን (Quantity)' : 'Quantity'}{' '}
                      {selectedGrnItem ? `(${selectedGrnItem.unitAm})` : ''} <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.001"
                      placeholder="0.00"
                      value={grnQuantity}
                      onChange={(e) => setGrnQuantity(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="w-full px-3.5 py-3 bg-slate-950 border border-emerald-500/40 rounded-xl text-base text-white placeholder:text-slate-600 focus:bg-slate-900 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/40 font-mono font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-amber-300 mb-1.5">
                      {language === 'am' ? 'የ1 አሃድ የመግዣ ዋጋ (በብር)' : 'Unit Purchase Price (ETB)'}{' '}
                      <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      placeholder="0.00"
                      value={grnUnitPrice}
                      onChange={(e) => setGrnUnitPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      className="w-full px-3.5 py-3 bg-slate-950 border-2 border-amber-400 rounded-xl text-base text-amber-300 placeholder:text-slate-600 focus:bg-slate-900 focus:border-amber-300 focus:ring-2 focus:ring-amber-400/40 font-mono font-black"
                      required
                    />
                  </div>
                </div>

                {/* Live Computed Total Value Banner */}
                {grnTotalCost > 0 && (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-950 to-slate-900 border border-emerald-500/30 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">
                      {language === 'am' ? 'ጠቅላላ የዚህ እቃ ግዢ ዋጋ ድምር:' : 'Total Calculated Purchase Value:'}
                    </span>
                    <span className="text-base font-black text-emerald-400 font-mono">
                      {formatCurrency(grnTotalCost)}
                    </span>
                  </div>
                )}

                {/* GRN & Supplier */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      {language === 'am' ? 'የደረሰኝ / GRN ቁጥር' : 'GRN Voucher No.'}
                    </label>
                    <input
                      type="text"
                      value={grnNumber}
                      onChange={(e) => setGrnNumber(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      {language === 'am' ? 'አቅራቢ / ገበያ' : 'Supplier'}
                    </label>
                    <input
                      type="text"
                      placeholder={language === 'am' ? 'ለምሳሌ፡ መገናኛ የጅምላ ገበያ' : 'e.g. Merkato Wholesale'}
                      value={grnSupplier}
                      onChange={(e) => setGrnSupplier(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-600"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    {language === 'am' ? 'ማስታወሻ (አማራጭ)' : 'Notes (Optional)'}
                  </label>
                  <input
                    type="text"
                    placeholder={language === 'am' ? 'ለምሳሌ፡ ጥራት ያለው የፈረንሳይ ቅቤ...' : 'Notes...'}
                    value={grnNotes}
                    onChange={(e) => setGrnNotes(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-600"
                  />
                </div>

                {/* Submit GRN Button */}
                <button
                  type="submit"
                  disabled={!parsedGrnQty || !parsedGrnPrice}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-black text-sm transition-all shadow-xl shadow-emerald-500/20 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                >
                  <PackagePlus className="w-5 h-5" />
                  <span>
                    {language === 'am' ? 'እቃውን ገቢ አድርግና ዋጋውን መዝግብ (Save GRN)' : 'Record Stock In & Update Price'}
                  </span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* BOX 2: እቃ መላኪያ ወደ ቅርንጫፎች (SIV / Store Issue Voucher) */}
        {/* ========================================================================= */}
        {(activeBox === 'both' || activeBox === 'siv') && (
          <div className="bg-slate-900/90 rounded-3xl border-2 border-blue-500/40 p-6 shadow-2xl flex flex-col justify-between">
            <div>
              {/* Box Title */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-blue-500/20">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
                    <ArrowRightLeft className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">
                      {language === 'am' ? 'ሳጥን 2 • ዕቃ መላኪያ' : 'BOX 2 • DISPATCH TO BRANCH'}
                    </span>
                    <h2 className="text-lg font-black text-white">
                      {language === 'am' ? 'እቃ ወደ ቅርንጫፍ መላኪያ (SIV)' : 'Dispatch to Branch (SIV)'}
                    </h2>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-blue-950/70 text-blue-300 text-xs font-bold rounded-xl border border-blue-500/40">
                  {language === 'am' ? 'ከስቶር ይቀነሳል' : 'Deducts Store'}
                </span>
              </div>

              {sivSuccessMsg && (
                <div className="mb-4 p-4 rounded-2xl bg-blue-950/90 border border-blue-500/60 text-blue-200 text-xs font-bold flex items-start gap-2.5 animate-fadeIn">
                  <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <span>{sivSuccessMsg}</span>
                </div>
              )}

              {sivErrorMsg && (
                <div className="mb-4 p-4 rounded-2xl bg-rose-950/90 border border-rose-500/60 text-rose-200 text-xs font-bold flex items-start gap-2.5 animate-fadeIn">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <span>{sivErrorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSivSubmit} className="space-y-4">
                {/* Destination Branch Picker */}
                <div>
                  <label className="block text-xs font-bold text-amber-300 mb-1.5">
                    {language === 'am' ? 'እቃው የሚላክለት መዳረሻ ቅርንጫፍ' : 'Destination Branch'}{' '}
                    <span className="text-rose-400">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {branches.map((b) => (
                      <button
                        type="button"
                        key={b.id}
                        onClick={() => setSivBranchId(b.id)}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                          sivBranchId === b.id
                            ? 'bg-blue-600/30 border-blue-400 text-white shadow-md shadow-blue-500/20'
                            : 'bg-slate-950/80 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        <Building2 className="w-4 h-4 mx-auto mb-1 text-blue-400" />
                        <span className="truncate block">{b.nameAm || b.nameEn}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date Picker */}
                <DatePickerField
                  label={language === 'am' ? 'የተላከበት ቀን' : 'Dispatch Date'}
                  value={sivDate}
                  onChange={setSivDate}
                  required
                />

                {/* Item Selector */}
                <div>
                  <label className="block text-xs font-bold text-amber-300 mb-1.5">
                    {language === 'am' ? 'የሚላከው ጥሬ እቃ' : 'Material to Dispatch'}{' '}
                    <span className="text-rose-400">*</span>
                  </label>
                  <SmartItemSelector
                    items={items}
                    selectedItemId={sivItemId}
                    onSelectItem={setSivItemId}
                    placeholder={language === 'am' ? 'የሚላከውን እቃ ይምረጡ...' : 'Select item to dispatch...'}
                  />
                  {selectedSivItem && (
                    <div className="mt-1.5 flex items-center justify-between text-[11px] px-1">
                      <span className="text-slate-400">
                        {language === 'am' ? 'በስቶር ውስጥ ያለው ክምችት:' : 'Available in Store:'}
                      </span>
                      <span
                        className={`font-black font-mono ${
                          currentSivStock > 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {currentSivStock} {selectedSivItem.unitAm}
                      </span>
                    </div>
                  )}
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-xs font-bold text-amber-300 mb-1.5">
                    {language === 'am' ? 'የሚላከው መጠን (Quantity)' : 'Quantity to Dispatch'}{' '}
                    {selectedSivItem ? `(${selectedSivItem.unitAm})` : ''} <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.001"
                    max={currentSivStock > 0 ? currentSivStock : undefined}
                    placeholder="0.00"
                    value={sivQuantity}
                    onChange={(e) => setSivQuantity(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-full px-3.5 py-3 bg-slate-950 border border-blue-500/40 rounded-xl text-base text-white placeholder:text-slate-600 focus:bg-slate-900 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/40 font-mono font-bold"
                    required
                  />
                </div>

                {/* SIV Number & Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      {language === 'am' ? 'የማስተላለፊያ / SIV ቁጥር' : 'SIV Voucher No.'}
                    </label>
                    <input
                      type="text"
                      value={sivNumber}
                      onChange={(e) => setSivNumber(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      {language === 'am' ? 'ማስታወሻ / የተረካቢ ስም' : 'Recipient / Notes'}
                    </label>
                    <input
                      type="text"
                      placeholder={language === 'am' ? 'ለምሳሌ፡ ለዋና ሼፍ የተላከ...' : 'Notes...'}
                      value={sivNotes}
                      onChange={(e) => setSivNotes(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-600"
                    />
                  </div>
                </div>

                {/* Submit SIV Button */}
                <button
                  type="submit"
                  disabled={!parsedSivQty || parsedSivQty > currentSivStock}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm transition-all shadow-xl shadow-blue-500/20 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                >
                  <ArrowRightLeft className="w-5 h-5" />
                  <span>
                    {language === 'am'
                      ? `ወደ ${selectedSivBranch?.nameAm || 'ቅርንጫፍ'} ላክ (Dispatch SIV)`
                      : 'Dispatch to Branch via SIV'}
                  </span>
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: የዛሬ የተከናወኑ ስራዎች (Today's Storekeeper Activities Log) */}
      {/* ========================================================================= */}
      <div className="bg-slate-900/80 rounded-3xl border border-slate-800 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">
              {language === 'am' ? 'የዛሬ የስቶር እንቅስቃሴዎች (Today\'s In/Out Log)' : 'Today\'s Movements'}
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {todayGrnEntries.length} {language === 'am' ? 'የገቡ' : 'GRNs'} • {todaySivEntries.length} {language === 'am' ? 'የተላኩ' : 'SIVs'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Today's GRNs */}
          <div className="space-y-2">
            <h4 className="font-bold text-emerald-400 flex items-center gap-1.5">
              <PackagePlus className="w-4 h-4" />
              <span>{language === 'am' ? 'ዛሬ የገቡ እቃዎች (GRN)' : 'Today\'s Goods Received'}</span>
            </h4>
            {todayGrnEntries.length === 0 ? (
              <p className="text-slate-500 italic p-3 bg-slate-950/60 rounded-xl">
                {language === 'am' ? 'ዛሬ የገባ አዲስ እቃ እስካሁን የለም' : 'No goods received recorded today'}
              </p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {todayGrnEntries.map((e) => {
                  const item = items.find((i) => i.id === e.itemId);
                  const itemName = item ? (language === 'am' ? item.nameAm : item.nameEn) : 'ዕቃ';
                  const total = e.quantityIn * (e.unitPrice || 0);
                  return (
                    <div
                      key={e.id}
                      className="p-2.5 rounded-xl bg-slate-950/80 border border-emerald-500/20 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-bold text-white block">{itemName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {e.refNo || 'GRN'} • {formatCurrency(e.unitPrice || 0)} / {item?.unitAm || 'አሃድ'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-emerald-400 font-mono block">
                          +{e.quantityIn} {item?.unitAm || ''}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatCurrency(total)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Today's SIVs */}
          <div className="space-y-2">
            <h4 className="font-bold text-blue-400 flex items-center gap-1.5">
              <ArrowRightLeft className="w-4 h-4" />
              <span>{language === 'am' ? 'ዛሬ ወደ ቅርንጫፎች የተላኩ (SIV)' : 'Today\'s Branch Dispatches'}</span>
            </h4>
            {todaySivEntries.length === 0 ? (
              <p className="text-slate-500 italic p-3 bg-slate-950/60 rounded-xl">
                {language === 'am' ? 'ዛሬ ወደ ቅርንጫፍ የተላከ እቃ እስካሁን የለም' : 'No dispatches recorded today'}
              </p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {todaySivEntries.map((s) => (
                  <div
                    key={s.id}
                    className="p-2.5 rounded-xl bg-slate-950/80 border border-blue-500/20 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-white block">{s.itemNameAm || s.itemNameEn}</span>
                      <span className="text-[10px] text-blue-300 font-medium">
                        ➡️ ወደ {s.destinationBranchNameAm || s.destinationBranchNameEn} ({s.sivNumber})
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-blue-400 font-mono block">
                        -{s.quantity} {s.unitAm}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatCurrency(s.totalValue)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 4: የስቶር ወቅታዊ ክምችት (Store Stock Overview) */}
      {/* ========================================================================= */}
      {(activeBox === 'both' || activeBox === 'stock') && (
        <div className="bg-slate-900/80 rounded-3xl border border-slate-800 p-5 sm:p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <Warehouse className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-base font-bold text-white">
                  {language === 'am' ? `የስቶር ወቅታዊ ክምችት (${items.length} እቃዎች)` : `Current Store Inventory (${items.length})`}
                </h3>
                <p className="text-xs text-slate-400">
                  {language === 'am' ? 'በስቶር ውስጥ ያሉ ጥሬ እቃዎችና አሁን ያሉት የመግዣ ዋጋዎች' : 'Current raw material balances & prices'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {/* Add New Item Button */}
              <button
                onClick={() => setNewItemModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-md transition-all active:scale-95"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{language === 'am' ? '+ አዲስ እቃ መዝግብ' : '+ Add New Item'}</span>
              </button>

              {/* Search Input */}
              <div className="relative flex-1 sm:w-56">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={language === 'am' ? 'እቃ ፈልግ...' : 'Search items...'}
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">{language === 'am' ? 'የእቃው ስም' : 'Item Name'}</th>
                  <th className="py-3 px-4">{language === 'am' ? 'ምድብ' : 'Category'}</th>
                  <th className="py-3 px-4">{language === 'am' ? 'ኮድ' : 'Code'}</th>
                  <th className="py-3 px-4">{language === 'am' ? 'አሃድ' : 'Unit'}</th>
                  <th className="py-3 px-4 text-right">{language === 'am' ? 'የስቶር ክምችት' : 'Store Stock'}</th>
                  <th className="py-3 px-4 text-right">{language === 'am' ? 'የመጨረሻ ዋጋ' : 'Last Price'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                {filteredInventory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-4 font-bold text-white">
                      {language === 'am' ? item.nameAm : item.nameEn}
                    </td>
                    <td className="py-2.5 px-4 text-slate-400">
                      <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[10px]">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-400">{item.code}</td>
                    <td className="py-2.5 px-4 text-slate-300">{item.unitAm}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold">
                      <span
                        className={
                          item.currentCentralStock > 0
                            ? 'text-emerald-400'
                            : 'text-slate-500'
                        }
                      >
                        {item.currentCentralStock}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-amber-300 font-bold">
                      {formatCurrency(item.lastPurchasePrice || item.weightedAvgCost || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: አዲስ ጥሬ እቃ መመዝገቢያ (Storekeeper Add New Item Modal) */}
      {/* ========================================================================= */}
      {newItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 rounded-3xl border border-amber-500/40 max-w-md w-full overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-amber-500/20 bg-slate-950">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {language === 'am' ? 'አዲስ ጥሬ እቃ ወደ ስቶር መዝግብ' : 'Register New Raw Material'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {language === 'am' ? 'አዲስ እቃ ሲመጣ ስሙንና መለኪያውን እዚሁ ይመዝግቡ' : 'Add new items on arrival'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNewItemModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewItem} className="p-6 space-y-4 text-xs">
              {/* Item Name Amharic */}
              <div>
                <label className="block font-bold text-amber-300 mb-1">
                  {language === 'am' ? 'የእቃው ስም (በአማርኛ)' : 'Item Name (Amharic)'} <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={language === 'am' ? 'ለምሳሌ፡ ሮዝመሪ ወይም የፈረንሳይ ቅቤ' : 'e.g. Rosemary'}
                  value={newItemNameAm}
                  onChange={(e) => setNewItemNameAm(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-amber-500/30 rounded-xl text-white placeholder:text-slate-600 focus:border-amber-400"
                  autoFocus
                />
              </div>

              {/* Item Name English */}
              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  {language === 'am' ? 'የእቃው ስም (በእንግሊዝኛ - አማራጭ)' : 'Item Name (English - Optional)'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rosemary / French Butter"
                  value={newItemNameEn}
                  onChange={(e) => setNewItemNameEn(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder:text-slate-600 focus:border-amber-400"
                />
              </div>

              {/* Category & Unit Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-amber-300 mb-1">
                    {language === 'am' ? 'ምድብ (Category)' : 'Category'}
                  </label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value as ItemCategory)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-amber-500/30 rounded-xl text-white focus:border-amber-400"
                  >
                    <option value="produce">🥬 አትክልትና ፍራፍሬ</option>
                    <option value="meat">🥩 ስጋና ዶሮ</option>
                    <option value="dairy">🥛 የወተት ውጤቶች</option>
                    <option value="grain">🌾 እህልና ዱቄት</option>
                    <option value="oil">🛢️ ዘይትና ቅባት</option>
                    <option value="spices">🧂 ቅመማ ቅመም</option>
                    <option value="beverage">🥤 መጠጦች</option>
                    <option value="packaging">📦 ማሸጊያዎች</option>
                    <option value="other">🏷️ ሌሎች</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-amber-300 mb-1">
                    {language === 'am' ? 'መለኪያ አሃድ (Unit)' : 'Unit'}
                  </label>
                  <select
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value as UnitType)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-amber-500/30 rounded-xl text-white focus:border-amber-400 font-bold"
                  >
                    <option value="kg">ኪ.ግ (kg)</option>
                    <option value="liter">ሊትር (liter)</option>
                    <option value="pcs">ፍሬ / ቁጥር (pcs)</option>
                    <option value="pack">ፓኬት (pack)</option>
                    <option value="bottle">ጠርሙስ (bottle)</option>
                    <option value="quintal">ኩንታል (quintal)</option>
                    <option value="gram">ግራም (gram)</option>
                  </select>
                </div>
              </div>

              {/* Initial Price & Min Stock Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-amber-300 mb-1">
                    {language === 'am' ? 'የመግዣ ዋጋ (በብር)' : 'Unit Price (ETB)'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="0.00"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-amber-500/30 rounded-xl text-amber-300 font-mono font-bold placeholder:text-slate-600 focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    {language === 'am' ? 'አነስተኛ ክምችት ማስጠንቀቂያ' : 'Min Stock Alert'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newItemMinStock}
                    onChange={(e) => setNewItemMinStock(parseInt(e.target.value) || 5)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!newItemNameAm.trim()}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-400 text-slate-950 font-black text-xs shadow-xl shadow-amber-500/20 hover:from-amber-400 hover:to-yellow-300 active:scale-95 disabled:opacity-50"
                >
                  {language === 'am' ? 'እቃውን ወደ ስቶር ዝርዝር አስገባ (Save Item)' : 'Save Item to Store'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PIN Unlock Modal for switching to Manager */}
      {pinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 rounded-3xl border border-amber-500/40 p-6 max-w-sm w-full shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                {language === 'am' ? 'ወደ ማኔጀር ሲስተም መመለሻ' : 'Manager Access Verification'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {language === 'am'
                  ? 'የማኔጀር ፒን ኮድ ያስገቡ (ነባሪ ኮድ: 1234 ወይም ባዶ አድርገው ይጫኑ)'
                  : 'Enter manager PIN to access full ERP (Default: 1234)'}
              </p>
            </div>

            <input
              type="password"
              placeholder="PIN (1234)"
              value={enteredPin}
              onChange={(e) => setEnteredPin(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-amber-500/40 rounded-xl text-center text-lg tracking-widest text-white font-mono focus:border-amber-400"
              autoFocus
            />

            {pinError && (
              <p className="text-xs text-rose-400 font-bold">
                {language === 'am' ? 'የተሳሳተ ፒን ኮድ! እባክዎ 1234 ያስገቡ' : 'Invalid PIN! Please enter 1234'}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPinModalOpen(false)}
                className="py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                onClick={handleUnlockManager}
                className="py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
              >
                {language === 'am' ? 'ክፈት' : 'Unlock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIRECT COPY/PASTE SYNC MODAL */}
      {directSyncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 rounded-3xl border border-purple-500/40 max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-purple-500/20 bg-slate-950">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {language === 'am' ? 'የእቃዎች ዳታ ኮፒ/ፔስት ማመሳሰያ' : 'Master Items Direct Copy/Paste Sync'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {language === 'am' ? 'የማኔጀሩንና የስቶር ኪፐሩን አይተሞች 100% ተመሳሳይ ማድረጊያ' : 'Make items 100% identical between devices'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDirectSyncModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {directSyncSuccess && (
                <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-2xl flex items-center gap-2 text-emerald-300 font-bold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>{directSyncSuccess}</span>
                </div>
              )}

              {directSyncError && (
                <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-2xl flex items-center gap-2 text-rose-300 font-bold">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                  <span>{directSyncError}</span>
                </div>
              )}

              {/* Step 1: Copy Current Items */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white">
                      {language === 'am' ? '1. የኔን ሙሉ እቃዎች ኮፒ አድርግ' : '1. Copy All Current Items'}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      {language === 'am' ? `በዚህ ስክሪን ላይ ያሉትን ${items.length} እቃዎች ኮፒ ያደርጋል` : `Copies current ${items.length} items`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyItemsJson}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl font-bold border border-amber-500/30 active:scale-95"
                  >
                    {copiedItemsData ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedItemsData ? (language === 'am' ? 'ተቀድቷል! ✅' : 'Copied! ✅') : (language === 'am' ? 'ኮፒ አድርግ' : 'Copy')}</span>
                  </button>
                </div>
              </div>

              {/* Step 2: Paste Master Items */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-purple-500/30 space-y-2">
                <h4 className="font-bold text-purple-300">
                  {language === 'am' ? '2. ከማኔጀሩ የተላከውን ዳታ እዚህ ጋር ፔስት አድርግ' : '2. Paste Master Data Received from Manager'}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {language === 'am' ? 'ከማኔጀሩ የተላከውን ኮድ በሙሉ እዚህ ሳጥን ውስጥ ፔስት በማድረግ «ተግብር» የሚለውን ይጫኑ' : 'Paste the code from manager and click Apply'}
                </p>
                <textarea
                  rows={4}
                  placeholder={language === 'am' ? 'የተላከውን ኮድ እዚህ ጋር ፔስት ያድርጉ...' : 'Paste items data here...'}
                  value={directSyncText}
                  onChange={(e) => setDirectSyncText(e.target.value)}
                  className="w-full p-3 bg-slate-900 border border-purple-500/40 rounded-xl text-white font-mono text-xs placeholder:text-slate-600 focus:border-purple-400"
                />

                <button
                  type="button"
                  onClick={handleApplyPastedData}
                  disabled={!directSyncText.trim()}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black rounded-xl text-xs shadow-lg shadow-purple-500/25 active:scale-95 disabled:opacity-50"
                >
                  {language === 'am' ? 'ተግብርና እቃዎችን 100% አመሳስል (Apply & Match 100%)' : 'Apply & Match 100%'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

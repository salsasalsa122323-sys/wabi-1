import React, { useState } from 'react';
import {
  Warehouse,
  PlusCircle,
  ArrowRightLeft,
  Search,
  Filter,
  ClipboardList,
  AlertTriangle,
  TrendingUp,
  PackagePlus,
  RotateCcw,
  History,
  Download,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  X,
  ShieldCheck,
  Copy,
  Check,
  Link2,
  Printer,
  Edit3,
  Save,
  DollarSign,
  Trash2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { formatEthiopianDate, getRelativeDateString, getTodayDateString } from '../utils/ethiopianDate';
import { createStorekeeperShareableUrl } from '../utils/shareableStorekeeperLink';
import { InventoryItem } from '../types';

interface CentralStoreViewProps {
  onOpenStockIn: (itemId?: string) => void;
  onOpenTransfer: (itemId?: string) => void;
  onSelectBinCardItem: (itemId: string) => void;
  onOpenNewItem: () => void;
}

export const CentralStoreView: React.FC<CentralStoreViewProps> = ({
  onOpenStockIn,
  onOpenTransfer,
  onSelectBinCardItem,
  onOpenNewItem,
}) => {
  const {
    items,
    branches,
    centralBinCards,
    centralSentToEntries,
    centralStoreResets,
    resetCentralStoreStockToZero,
    bulkMergeItems,
    deleteItem,
  } = useApp();
  const { language, t, formatCurrency } = useLanguage();

  type StoreTab = 'inventory' | 'prices' | 'binCard' | 'sentTo' | 'resetAudit';
  const [activeStoreTab, setActiveStoreTab] = useState<StoreTab>('inventory');

  const handleDeleteItem = (item: InventoryItem) => {
    const confirmMsg =
      language === 'am'
        ? `እቃውን "${item.nameAm} (${item.code})" ከስቶር ሙሉ ለሙሉ ማስወገድ (መሰረዝ) ይፈልጋሉ?`
        : `Are you sure you want to permanently delete "${item.nameEn} (${item.code})" from Central Store?`;
    if (window.confirm(confirmMsg)) {
      deleteItem(item.id);
    }
  };

  // Search & category for inventory
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Reset Modal state
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resettingUser, setResettingUser] = useState('ዋና ስቶር ማኔጀር (General Store Manager)');
  const [resettingNotes, setResettingNotes] = useState('የመክፈቻ ሪሴት - የሁሉንም እቃዎች ቀሪ ክምችት ወደ 0 ማስተካከል (Opening Reset)');
  const [resetRunning, setResetRunning] = useState(false);
  const [resetSuccessNotice, setResetSuccessNotice] = useState(false);

  // Storekeeper Link & Direct Sync Modal states
  const [copiedStorekeeperLink, setCopiedStorekeeperLink] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [copiedItemsData, setCopiedItemsData] = useState(false);
  const [serverSyncSuccess, setServerSyncSuccess] = useState<string | null>(null);
  const [serverFetchSuccess, setServerFetchSuccess] = useState<string | null>(null);
  const [isSyncingServer, setIsSyncingServer] = useState(false);

  const handleCopyStorekeeperLink = () => {
    // 1. Force push current items to server catalog
    fetch('/api/store/sync-catalog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    }).catch(() => {});

    // 2. Also encode into shareable URL hash for fallback
    const fullUrl = createStorekeeperShareableUrl(items);
    navigator.clipboard.writeText(fullUrl);
    setCopiedStorekeeperLink(true);
    setTimeout(() => setCopiedStorekeeperLink(false), 3000);
  };

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

  const handlePushToServer = async () => {
    setIsSyncingServer(true);
    try {
      const res = await fetch('/api/store/sync-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (res.ok) {
        setServerSyncSuccess(
          language === 'am'
            ? `ሙሉ ${items.length} እቃዎች ወደ ሰርቨር ተልከው ለስቶር ኪፐሯ ዝግጁ ሆነዋል!`
            : `All ${items.length} items pushed to server catalog successfully!`
        );
        setTimeout(() => setServerSyncSuccess(null), 4000);
      }
    } catch (e) {
      console.warn('Sync failed:', e);
    } finally {
      setIsSyncingServer(false);
    }
  };

  const handleFetchFromServer = async () => {
    setIsSyncingServer(true);
    try {
      const res = await fetch('/api/store/catalog');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data && Array.isArray(json.data.items)) {
          bulkMergeItems(json.data.items);
          setServerFetchSuccess(
            language === 'am'
              ? `ከስቶር ኪፐር/ሰርቨር ${json.data.items.length} እቃዎች ተመሳስለዋል!`
              : `Fetched & merged ${json.data.items.length} items from server!`
          );
          setTimeout(() => setServerFetchSuccess(null), 4000);
        }
      }
    } catch (e) {
      console.warn('Fetch failed:', e);
    } finally {
      setIsSyncingServer(false);
    }
  };

  // Sent To Filters
  const [sentToBranchFilter, setSentToBranchFilter] = useState<string>('ALL');
  const [sentToStartDate, setSentToStartDate] = useState(getRelativeDateString(-30));
  const [sentToEndDate, setSentToEndDate] = useState(getTodayDateString());
  const [sentToItemFilter, setSentToItemFilter] = useState<string>('ALL');

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.nameAm.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const totalCentralVal = filteredItems.reduce(
    (sum, i) => sum + i.currentCentralStock * (i.lastPurchasePrice || i.weightedAvgCost || 0),
    0
  );

  // Filtered Sent To entries
  const filteredSentTo = centralSentToEntries
    .filter((entry) => {
      const matchBranch = sentToBranchFilter === 'ALL' || entry.destinationBranchId === sentToBranchFilter;
      const matchItem = sentToItemFilter === 'ALL' || entry.itemId === sentToItemFilter;
      const matchStart = !sentToStartDate || entry.date >= sentToStartDate;
      const matchEnd = !sentToEndDate || entry.date <= sentToEndDate;
      return matchBranch && matchItem && matchStart && matchEnd;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const sentToTotalQty = filteredSentTo.reduce((sum, e) => sum + e.quantity, 0);
  const sentToTotalVal = filteredSentTo.reduce((sum, e) => sum + e.totalValue, 0);

  // Export Sent To Report to CSV/Excel
  const handleExportSentTo = () => {
    const headers = [
      'Date (Gregorian)',
      'Date (Ethiopian)',
      'SIV Number',
      'Destination Branch',
      'Item Name',
      'Quantity',
      'Unit',
      'Unit Price (ETB)',
      'Total Value (ETB)',
      'Store Keeper',
      'Notes',
    ];

    const rows = filteredSentTo.map((e) => [
      e.date,
      e.ethiopianDateStr,
      e.sivNumber,
      `"${e.destinationBranchNameAm} (${e.destinationBranchNameEn})"`,
      `"${e.itemNameAm} (${e.itemNameEn})"`,
      e.quantity,
      e.unitAm,
      e.unitPrice,
      e.totalValue,
      `"${e.recordedBy}"`,
      `"${e.notes || ''}"`,
    ]);

    // Add totals row
    rows.push([
      'TOTAL',
      '',
      '',
      '',
      '',
      sentToTotalQty,
      '',
      '',
      sentToTotalVal,
      '',
      '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CentralStore_SentTo_Report_${sentToStartDate}_to_${sentToEndDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExecuteReset = async () => {
    setResetRunning(true);
    try {
      await resetCentralStoreStockToZero(resettingUser, resettingNotes);
      setResetSuccessNotice(true);
      setTimeout(() => {
        setResetSuccessNotice(false);
        setResetModalOpen(false);
      }, 1200);
    } finally {
      setResetRunning(false);
    }
  };

  // Bin Card sub-state inside Central Store
  const [selectedBinCardItemId, setSelectedBinCardItemId] = useState<string>(items[0]?.id || '');
  const [binCardStartDate, setBinCardStartDate] = useState(getRelativeDateString(-30));
  const [binCardEndDate, setBinCardEndDate] = useState(getTodayDateString());
  const [binCardTypeFilter, setBinCardTypeFilter] = useState<string>('ALL');

  // Item Quick Edit State
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editForm, setEditForm] = useState<{
    nameAm: string;
    nameEn: string;
    unit: string;
    unitAm: string;
    lastPurchasePrice: number;
    weightedAvgCost: number;
    minStockLevel: number;
    category: string;
  }>({
    nameAm: '',
    nameEn: '',
    unit: 'kg',
    unitAm: 'ኪ.ግ',
    lastPurchasePrice: 0,
    weightedAvgCost: 0,
    minStockLevel: 0,
    category: 'produce',
  });
  const [editSuccessNotice, setEditSuccessNotice] = useState<string | null>(null);

  const handleStartEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setEditForm({
      nameAm: item.nameAm,
      nameEn: item.nameEn,
      unit: item.unit,
      unitAm: item.unitAm,
      lastPurchasePrice: item.lastPurchasePrice || 0,
      weightedAvgCost: item.weightedAvgCost || 0,
      minStockLevel: item.minStockLevel || 0,
      category: item.category,
    });
  };

  const handleSaveEditItem = () => {
    if (!editingItem) return;
    const updated: InventoryItem = {
      ...editingItem,
      nameAm: editForm.nameAm.trim() || editingItem.nameAm,
      nameEn: editForm.nameEn.trim() || editingItem.nameEn,
      unit: (editForm.unit.trim() || editingItem.unit) as any,
      unitAm: editForm.unitAm.trim() || editingItem.unitAm,
      lastPurchasePrice: Math.max(0, Number(editForm.lastPurchasePrice) || 0),
      weightedAvgCost: Math.max(0, Number(editForm.weightedAvgCost) || 0),
      minStockLevel: Math.max(0, Number(editForm.minStockLevel) || 0),
      category: (editForm.category || editingItem.category) as any,
    };

    bulkMergeItems([updated]);

    // Force push to server catalog so storekeeper gets updated name/prices immediately
    fetch('/api/store/sync-catalog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: items.map((it) => (it.id === updated.id ? updated : it)),
      }),
    }).catch(() => {});

    setEditSuccessNotice(
      language === 'am'
        ? `እቃው "${updated.nameAm}" በተሳካ ሁኔታ ተስተካክሏል!`
        : `Item "${updated.nameEn}" updated successfully!`
    );
    setTimeout(() => {
      setEditSuccessNotice(null);
      setEditingItem(null);
    }, 1200);
  };

  // Bin Card calculations for selected item
  const selectedBinItem = items.find((i) => i.id === selectedBinCardItemId) || items[0];
  const itemBinCards = centralBinCards
    .filter((entry) => entry.itemId === (selectedBinItem?.id || ''))
    .filter((entry) => {
      const isAfterStart = !binCardStartDate || entry.date >= binCardStartDate;
      const isBeforeEnd = !binCardEndDate || entry.date <= binCardEndDate;
      const matchesType = binCardTypeFilter === 'ALL' || entry.type === binCardTypeFilter;
      return isAfterStart && isBeforeEnd && matchesType;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const binTotalIn = itemBinCards.reduce((acc, curr) => acc + (curr.quantityIn || 0), 0);
  const binTotalOut = itemBinCards.reduce((acc, curr) => acc + (curr.quantityOut || 0), 0);

  const handleExportBinCard = () => {
    if (!selectedBinItem) return;
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
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BinCard_${selectedBinItem.code}_${binCardStartDate}_to_${binCardEndDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <Warehouse className="w-6 h-6 text-amber-400" />
            <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
              {t.centralStore.title}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {language === 'am'
              ? 'የማዕከላዊ ስቶር እቃዎች፣ ወደ ቅርንጫፎች የተላኩ SIV መዝገብ እና የመክፈቻ ሪሴት ቁጥጥር'
              : 'Central Store inventory, Sent-To branch SIV dispatch ledger & opening reset controls'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Change 1 Reset Button */}
          <button
            onClick={() => setResetModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-black rounded-xl text-xs shadow-md transition-all ring-1 ring-amber-300"
            title={language === 'am' ? 'የማዕከላዊ ስቶር ክምችት ወደ 0 ማስተካከል (በኦዲት እና ባክአፕ)' : 'Reset Central Store Stock to 0 (With Audit & Backup)'}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{language === 'am' ? 'የመክፈቻ ሪሴት (Reset to 0)' : 'Opening Reset (0)'}</span>
          </button>

          {/* Direct Storekeeper Link Copy */}
          <button
            onClick={handleCopyStorekeeperLink}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-950/50 border border-amber-500/50 hover:bg-amber-900/60 hover:border-amber-400 text-amber-300 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95"
            title={language === 'am' ? 'ለስቶር ኪፐር የሚላከውን ቀጥተኛ ሊንክ ቅዳ (እቃ ማስተላለፊያ እና ዋጋ መሙያ ብቻ)' : 'Copy direct link for storekeeper'}
          >
            {copiedStorekeeperLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Link2 className="w-4 h-4 text-amber-400" />}
            <span>
              {copiedStorekeeperLink
                ? (language === 'am' ? 'ሊንኩ ተቀድቷል!' : 'Link Copied!')
                : (language === 'am' ? '🔗 የስቶር ኪፐር ሊንክ ቅዳ' : '🔗 Copy Storekeeper Link')}
            </span>
          </button>

          {/* Direct Copy/Sync Modal Button */}
          <button
            onClick={() => setSyncModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border border-amber-400/60 hover:border-amber-300 text-amber-200 hover:text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95"
            title={language === 'am' ? 'የእቃዎችን ዳታ ኮፒ አድርግ ወይም ከስቶር ኪፐር ጋር አመሳስል' : 'Copy items text or synchronize with Storekeeper'}
          >
            <Copy className="w-4 h-4 text-amber-400" />
            <span>{language === 'am' ? '📋 ዳታ ኮፒ/ፔስት' : '📋 Copy/Sync Data'}</span>
          </button>

          <button
            onClick={onOpenNewItem}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 border border-amber-500/40 hover:border-amber-400 hover:bg-slate-850 text-amber-300 rounded-xl text-xs font-bold shadow-md transition-all"
          >
            <PackagePlus className="w-4 h-4 text-amber-400" />
            <span>{t.centralStore.addNewItem}</span>
          </button>
          <button
            onClick={() => onOpenStockIn()}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950/60 transition-all ring-1 ring-emerald-400/40"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t.centralStore.stockIn}</span>
          </button>
          <button
            onClick={() => onOpenTransfer()}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-950/60 transition-all ring-1 ring-blue-400/40"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>{t.centralStore.stockOutTransfer}</span>
          </button>
        </div>
      </div>

      {/* Central Module Tab Navigation - 5 Integrated Linked Tabs */}
      <div className="flex items-center gap-2 border-b border-amber-500/20 pb-2 overflow-x-auto no-scrollbar">
        {/* Tab 1: Inventory Items */}
        <button
          onClick={() => setActiveStoreTab('inventory')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeStoreTab === 'inventory'
              ? 'bg-amber-400 text-slate-950 shadow-md font-black'
              : 'bg-slate-900/80 text-slate-300 hover:text-white border border-slate-800'
          }`}
        >
          <Warehouse className="w-3.5 h-3.5" />
          <span>{language === 'am' ? '📦 የእቃዎች ዝርዝር (Items)' : '📦 Items & Stock'}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-950/30">
            {items.length}
          </span>
        </button>

        {/* Tab 2: Stock & Prices in ETB */}
        <button
          onClick={() => setActiveStoreTab('prices')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeStoreTab === 'prices'
              ? 'bg-amber-400 text-slate-950 shadow-md font-black'
              : 'bg-slate-900/80 text-slate-300 hover:text-white border border-slate-800'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          <span>{language === 'am' ? '⚖️ ክምችትና ዋጋ በብር (Stock & Prices)' : '⚖️ Stock & Prices (ETB)'}</span>
        </button>

        {/* Tab 3: Bin Card Ledger */}
        <button
          onClick={() => setActiveStoreTab('binCard')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeStoreTab === 'binCard'
              ? 'bg-amber-400 text-slate-950 shadow-md font-black'
              : 'bg-slate-900/80 text-slate-300 hover:text-white border border-slate-800'
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5 text-amber-300" />
          <span>{language === 'am' ? '📋 ቢን ካርድ (Bin Card Ledger)' : '📋 Bin Card Ledger'}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-950/30">
            {centralBinCards.length}
          </span>
        </button>

        {/* Tab 4: Sent To Branches SIV */}
        <button
          onClick={() => setActiveStoreTab('sentTo')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeStoreTab === 'sentTo'
              ? 'bg-amber-400 text-slate-950 shadow-md font-black'
              : 'bg-slate-900/80 text-slate-300 hover:text-white border border-slate-800'
          }`}
        >
          <ArrowRightLeft className="w-3.5 h-3.5 text-blue-400" />
          <span>{language === 'am' ? '🚚 ለቅርንጫፎች የተላኩ SIV (Sent To)' : '🚚 Sent To SIV Ledger'}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-950/30">
            {centralSentToEntries.length}
          </span>
        </button>

        {/* Tab 5: Reset Audit Log */}
        <button
          onClick={() => setActiveStoreTab('resetAudit')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeStoreTab === 'resetAudit'
              ? 'bg-amber-400 text-slate-950 shadow-md font-black'
              : 'bg-slate-900/80 text-slate-300 hover:text-white border border-slate-800'
          }`}
        >
          <History className="w-3.5 h-3.5 text-yellow-400" />
          <span>{language === 'am' ? '🛡️ የመክፈቻ ሪሴት (Reset Audit)' : '🛡️ Reset Audit Log'}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-950/30">
            {centralStoreResets.length}
          </span>
        </button>
      </div>

      {/* TAB 1: INVENTORY TABLE */}
      {activeStoreTab === 'inventory' && (
        <div className="space-y-6">
          {/* Search & Category Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/80 p-4 rounded-2xl border border-amber-500/20 shadow-xl backdrop-blur-md">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={language === 'am' ? 'በስም ወይም በኮድ ፈልግ...' : 'Search raw materials...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-all"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar">
              <Filter className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              {['all', 'produce', 'meat', 'grain', 'oil', 'dairy', 'spices', 'beverage'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black shadow-md shadow-amber-500/25 ring-1 ring-amber-300/50'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {cat === 'all'
                    ? t.common.all
                    : cat === 'produce'
                    ? (language === 'am' ? 'አትክልት' : 'Produce')
                    : cat === 'meat'
                    ? (language === 'am' ? 'ስጋ' : 'Meat')
                    : cat === 'grain'
                    ? (language === 'am' ? 'እህል/ዱቄት' : 'Grain')
                    : cat === 'oil'
                    ? (language === 'am' ? 'ዘይት' : 'Oil')
                    : cat === 'dairy'
                    ? (language === 'am' ? 'ወተት/ቅቤ' : 'Dairy')
                    : cat === 'spices'
                    ? (language === 'am' ? 'ቅመማ ቅመም' : 'Spices')
                    : (language === 'am' ? 'መጠጥ' : 'Beverage')}
                </button>
              ))}
            </div>
          </div>

          {/* Main Stock Table */}
          <div className="bg-slate-900/80 rounded-3xl border border-amber-500/20 shadow-2xl overflow-hidden backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/90 border-b border-amber-500/20 text-slate-300 font-bold">
                    <th className="py-3.5 px-4">{language === 'am' ? 'ኮድ' : 'Code'}</th>
                    <th className="py-3.5 px-4">{t.common.item}</th>
                    <th className="py-3.5 px-4">{t.common.unit}</th>
                    <th className="py-3.5 px-4 text-right">{t.centralStore.currentStock}</th>
                    <th className="py-3.5 px-4 text-right">{t.centralStore.avgCost}</th>
                    <th className="py-3.5 px-4 text-right">{t.centralStore.lastPrice}</th>
                    <th className="py-3.5 px-4 text-right">{t.common.totalPrice}</th>
                    <th className="py-3.5 px-4 text-center">{t.common.status}</th>
                    <th className="py-3.5 px-4 text-center">{t.common.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <div className="space-y-2">
                          <p>{language === 'am' ? 'ምንም ጥሬ ዕቃ አልተገኘም' : 'No items found'}</p>
                          <button
                            onClick={onOpenNewItem}
                            className="text-xs text-amber-400 hover:text-amber-300 font-bold underline"
                          >
                            + {t.centralStore.addNewItem}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => {
                      const isLow = item.currentCentralStock <= item.minStockLevel;
                      const priceRate = item.lastPurchasePrice || item.weightedAvgCost || 0;
                      const totalVal = item.currentCentralStock * priceRate;

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-amber-500/[0.04] transition-colors"
                        >
                          <td className="py-3.5 px-4 font-mono text-[11px] text-amber-300 font-semibold">
                            {item.code}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-white">
                              {language === 'am' ? item.nameAm : item.nameEn}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {language === 'am' ? item.nameEn : item.nameAm}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-300">
                            {item.unitAm} ({item.unit})
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-white">
                            <span className={item.currentCentralStock === 0 ? 'text-amber-400/80 font-mono' : 'text-white font-mono'}>
                              {item.currentCentralStock.toLocaleString()} {item.unitAm}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-medium text-slate-300">
                            {formatCurrency(item.weightedAvgCost || 0)}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <span className="font-bold text-amber-300 block">
                              {formatCurrency(item.lastPurchasePrice || 0)}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-amber-300">
                            {formatCurrency(totalVal)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {item.currentCentralStock === 0 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-950 text-slate-400 border border-slate-700">
                                {language === 'am' ? '0 ክምችት' : 'Zero Stock'}
                              </span>
                            ) : isLow ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800/50">
                                <AlertTriangle className="w-3 h-3" />
                                <span>{language === 'am' ? 'አነስተኛ' : 'Low Stock'}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/50">
                                {language === 'am' ? 'በቂ ነው' : 'In Stock'}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => {
                                  setSelectedBinCardItemId(item.id);
                                  setActiveStoreTab('binCard');
                                }}
                                title={t.centralStore.viewBinCard}
                                className="p-1.5 text-slate-400 hover:text-amber-300 rounded-lg hover:bg-slate-800 transition-colors"
                              >
                                <ClipboardList className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleStartEditItem(item)}
                                title={language === 'am' ? 'ዋጋና መረጃ አስተካክል (Edit Price/Info)' : 'Edit item & price'}
                                className="p-1.5 text-slate-400 hover:text-cyan-300 rounded-lg hover:bg-slate-800 transition-colors"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => onOpenStockIn(item.id)}
                                title={t.centralStore.stockIn}
                                className="p-1.5 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-slate-800 transition-colors"
                              >
                                <PlusCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => onOpenTransfer(item.id)}
                                title={t.centralStore.stockOutTransfer}
                                className="p-1.5 text-slate-400 hover:text-blue-400 rounded-lg hover:bg-slate-800 transition-colors"
                              >
                                <ArrowRightLeft className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item)}
                                title={language === 'am' ? 'እቃውን ከስቶር አስወግድ (ሰርዝ)' : 'Delete item from store'}
                                className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="px-6 py-4 bg-slate-950/80 border-t border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
              <span>
                {language === 'am' ? 'የተገኙ እቃዎች ብዛት:' : 'Items shown:'} <strong className="text-white">{filteredItems.length}</strong>
              </span>
              <span>
                {language === 'am' ? 'የተጣራ አጠቃላይ የማዕከላዊ ዋጋ:' : 'Filtered Total Value:'}{' '}
                <strong className="text-amber-300 font-black text-sm">
                  {formatCurrency(totalCentralVal)}
                </strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STOCK & PRICE LIST IN ETB */}
      {activeStoreTab === 'prices' && (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-amber-500/30 shadow-lg">
              <span className="text-[11px] font-bold text-slate-400 block mb-1">
                {language === 'am' ? 'የተመዘገቡ ጥሬ እቃዎች' : 'Total Items Registered'}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-amber-300 font-mono">{items.length}</span>
                <span className="text-xs text-slate-400">{language === 'am' ? 'እቃዎች' : 'items'}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/30 shadow-lg">
              <span className="text-[11px] font-bold text-slate-400 block mb-1">
                {language === 'am' ? 'አጠቃላይ የስቶር ሀብት ግምት (ETB)' : 'Total Central Valuation (ETB)'}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-400 font-mono">
                  {formatCurrency(totalCentralVal)}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-blue-500/30 shadow-lg">
              <span className="text-[11px] font-bold text-slate-400 block mb-1">
                {language === 'am' ? 'የገበያ ዋጋ መከታተያ' : 'Price Tracking Currency'}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black text-blue-300">የኢትዮጵያ ብር (ETB)</span>
              </div>
            </div>
          </div>

          {/* Search & Category Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/80 p-4 rounded-2xl border border-amber-500/20 shadow-xl backdrop-blur-md">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={language === 'am' ? 'ዋጋ ለመፈለግ በስም ወይም በኮድ...' : 'Search by name or code...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-all"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar">
              <Filter className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              {['all', 'produce', 'meat', 'grain', 'oil', 'dairy', 'spices', 'beverage'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black shadow-md ring-1 ring-amber-300/50'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {cat === 'all'
                    ? t.common.all
                    : cat === 'produce'
                    ? (language === 'am' ? 'አትክልት' : 'Produce')
                    : cat === 'meat'
                    ? (language === 'am' ? 'ስጋ' : 'Meat')
                    : cat === 'grain'
                    ? (language === 'am' ? 'እህል/ዱቄት' : 'Grain')
                    : cat === 'oil'
                    ? (language === 'am' ? 'ዘይት' : 'Oil')
                    : cat === 'dairy'
                    ? (language === 'am' ? 'ወተት/ቅቤ' : 'Dairy')
                    : cat === 'spices'
                    ? (language === 'am' ? 'ቅመማ ቅመም' : 'Spices')
                    : (language === 'am' ? 'መጠጥ' : 'Beverage')}
                </button>
              ))}
            </div>
          </div>

          {/* Prices Table */}
          <div className="bg-slate-900/80 rounded-3xl border border-amber-500/20 shadow-2xl overflow-hidden backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/90 border-b border-amber-500/20 text-slate-300 font-bold">
                    <th className="py-3.5 px-4">{language === 'am' ? 'ኮድ' : 'Code'}</th>
                    <th className="py-3.5 px-4">{language === 'am' ? 'የእቃው ስም' : 'Item Name'}</th>
                    <th className="py-3.5 px-4">{language === 'am' ? 'መለኪያ' : 'Unit'}</th>
                    <th className="py-3.5 px-4 text-right">{language === 'am' ? 'ያለ ክምችት' : 'Current Stock'}</th>
                    <th className="py-3.5 px-4 text-right text-amber-300">{language === 'am' ? 'የቅርብ ግዢ ዋጋ (ETB)' : 'Last Purchase (ETB)'}</th>
                    <th className="py-3.5 px-4 text-right">{language === 'am' ? 'አማካይ ወጪ (WAC)' : 'Avg Cost (WAC)'}</th>
                    <th className="py-3.5 px-4 text-right">{language === 'am' ? 'አጠቃላይ ዋጋ (ETB)' : 'Total Value (ETB)'}</th>
                    <th className="py-3.5 px-4 text-center">{language === 'am' ? 'ዝቅተኛ መጠን' : 'Min Level'}</th>
                    <th className="py-3.5 px-4 text-center">{language === 'am' ? 'ተግባራት' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                  {filteredItems.map((item) => {
                    const priceRate = item.lastPurchasePrice || item.weightedAvgCost || 0;
                    const totalVal = item.currentCentralStock * priceRate;

                    return (
                      <tr key={item.id} className="hover:bg-amber-500/[0.04] transition-colors">
                        <td className="py-3.5 px-4 font-mono text-[11px] text-amber-300 font-bold">
                          {item.code}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white">
                            {language === 'am' ? item.nameAm : item.nameEn}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {language === 'am' ? item.nameEn : item.nameAm}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 font-medium">
                          {item.unitAm} ({item.unit})
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-white font-bold">
                          {item.currentCentralStock.toLocaleString()} {item.unitAm}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              defaultValue={item.lastPurchasePrice || 0}
                              onBlur={(e) => {
                                const newPrice = parseFloat(e.target.value) || 0;
                                if (newPrice !== item.lastPurchasePrice) {
                                  const updated = { ...item, lastPurchasePrice: newPrice };
                                  bulkMergeItems([updated]);
                                  fetch('/api/store/sync-catalog', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      items: items.map((it) => (it.id === item.id ? updated : it)),
                                    }),
                                  }).catch(() => {});
                                }
                              }}
                              className="w-24 px-2 py-1 bg-slate-950 border border-amber-500/50 rounded-lg text-right font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-400 text-xs shadow-inner"
                              title={language === 'am' ? 'እዚሁ ላይ ዋጋ በመጻፍ ይቀይሩ (Blur to save)' : 'Type to update price in ETB'}
                            />
                            <span className="text-[10px] text-amber-400/80 font-bold font-mono">ብር</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                          {formatCurrency(item.weightedAvgCost || 0)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-emerald-400 font-mono">
                          {formatCurrency(totalVal)}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                          {item.minStockLevel || 0} {item.unitAm}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleStartEditItem(item)}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-400/40 hover:bg-amber-500/30 text-amber-200 text-[11px] font-bold flex items-center gap-1 transition-all"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-amber-300" />
                              <span>{language === 'am' ? 'ሙሉ ዝርዝር' : 'Edit'}</span>
                            </button>
                            <button
                              onClick={() => {
                                setSelectedBinCardItemId(item.id);
                                setActiveStoreTab('binCard');
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-colors"
                              title={language === 'am' ? 'ቢን ካርድ እይ' : 'View Bin Card'}
                            >
                              <ClipboardList className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                              title={language === 'am' ? 'እቃውን ከስቶር አስወግድ (ሰርዝ)' : 'Delete from Store'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: INTEGRATED BIN CARD LEDGER */}
      {activeStoreTab === 'binCard' && (
        <div className="space-y-6">
          {/* Top Item Selector & Actions Bar */}
          <div className="bg-slate-900/90 p-4 sm:p-5 rounded-3xl border border-amber-500/30 shadow-2xl space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Item Selector */}
              <div className="flex-1 space-y-1.5">
                <label className="text-xs font-black text-amber-300 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" />
                  <span>{language === 'am' ? 'የሚመረጠው እቃ ቢን ካርድ (Select Raw Material)' : 'Select Item Bin Card'}</span>
                </label>
                <select
                  value={selectedBinCardItemId}
                  onChange={(e) => setSelectedBinCardItemId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-amber-500/40 rounded-xl text-xs sm:text-sm text-white font-bold focus:outline-none focus:border-amber-400 transition-all cursor-pointer"
                >
                  {items.map((it) => (
                    <option key={it.id} value={it.id} className="bg-slate-950 text-white">
                      {it.code} — {language === 'am' ? it.nameAm : it.nameEn} ({it.unitAm}) | ቀሪ፡ {it.currentCentralStock} {it.unitAm} | ዋጋ፡ {it.lastPurchasePrice || 0} ብር
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => onOpenStockIn(selectedBinItem?.id)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600/90 hover:bg-emerald-500 text-white shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{language === 'am' ? '+ እቃ ተቀበል (GRN)' : '+ Stock In (GRN)'}</span>
                </button>

                <button
                  onClick={() => onOpenTransfer(selectedBinItem?.id)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600/90 hover:bg-blue-500 text-white shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>{language === 'am' ? '🚚 ለቅርንጫፍ ላክ (SIV)' : '🚚 Dispatch (SIV)'}</span>
                </button>

                <button
                  onClick={handleExportBinCard}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>CSV</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-cyan-400" />
                  <span>{language === 'am' ? 'አትም' : 'Print'}</span>
                </button>
              </div>
            </div>

            {/* Selected Item Stat Strip */}
            {selectedBinItem && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800">
                <div className="p-3 rounded-2xl bg-slate-950/80 border border-amber-500/20">
                  <span className="text-[10px] text-slate-400 block font-bold">
                    {language === 'am' ? 'ያለ ቀሪ ክምችት' : 'Current Balance'}
                  </span>
                  <span className="text-base sm:text-lg font-black text-amber-300 font-mono">
                    {selectedBinItem.currentCentralStock.toLocaleString()} {selectedBinItem.unitAm}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950/80 border border-emerald-500/20">
                  <span className="text-[10px] text-slate-400 block font-bold">
                    {language === 'am' ? 'የገባ ድምር (In)' : 'Total Received'}
                  </span>
                  <span className="text-base sm:text-lg font-black text-emerald-400 font-mono">
                    +{binTotalIn.toLocaleString()} {selectedBinItem.unitAm}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950/80 border border-blue-500/20">
                  <span className="text-[10px] text-slate-400 block font-bold">
                    {language === 'am' ? 'የወጣ ድምር (Out)' : 'Total Dispatched'}
                  </span>
                  <span className="text-base sm:text-lg font-black text-blue-300 font-mono">
                    -{binTotalOut.toLocaleString()} {selectedBinItem.unitAm}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950/80 border border-yellow-500/20">
                  <span className="text-[10px] text-slate-400 block font-bold">
                    {language === 'am' ? 'የቅርብ ግዢ ዋጋ' : 'Last Purchase Price'}
                  </span>
                  <span className="text-base sm:text-lg font-black text-yellow-300 font-mono">
                    {formatCurrency(selectedBinItem.lastPurchasePrice || 0)}
                  </span>
                </div>
              </div>
            )}

            {/* Filters: Dates & Transaction Type */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800 text-xs">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-slate-400">{language === 'am' ? 'ከቀን፦' : 'From:'}</span>
                <input
                  type="date"
                  value={binCardStartDate}
                  onChange={(e) => setBinCardStartDate(e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">{language === 'am' ? 'እስከ ቀን፦' : 'To:'}</span>
                <input
                  type="date"
                  value={binCardEndDate}
                  onChange={(e) => setBinCardEndDate(e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-white font-mono"
                />
              </div>

              <div className="flex items-center gap-1.5 ml-auto">
                <Filter className="w-3.5 h-3.5 text-amber-400" />
                <select
                  value={binCardTypeFilter}
                  onChange={(e) => setBinCardTypeFilter(e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-bold"
                >
                  <option value="ALL">{language === 'am' ? 'ሁሉም እንቅስቃሴዎች' : 'All Transactions'}</option>
                  <option value="IN_PURCHASE">{language === 'am' ? 'የገባ እቃ (GRN)' : 'Stock In (GRN)'}</option>
                  <option value="OUT_BRANCH_TRANSFER">{language === 'am' ? 'ለቅርንጫፍ የተላለፈ (SIV)' : 'Branch Transfer (SIV)'}</option>
                  <option value="OUT_DAMAGE">{language === 'am' ? 'ብክነት / ጉዳት' : 'Damage / Waste'}</option>
                  <option value="ADJUSTMENT">{language === 'am' ? 'የቆጠራ ማስተካከያ' : 'Stock Adjustment'}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bin Card Entries Ledger Table */}
          <div className="bg-slate-900/80 rounded-3xl border border-amber-500/20 shadow-2xl overflow-hidden backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/90 border-b border-amber-500/20 text-slate-300 font-bold">
                    <th className="py-3.5 px-4">{language === 'am' ? 'ቀን (ኢትዮጵያ / ፈረንጅ)' : 'Date'}</th>
                    <th className="py-3.5 px-4">{language === 'am' ? 'ማጣቀሻ (Ref / SIV)' : 'Ref No'}</th>
                    <th className="py-3.5 px-4">{language === 'am' ? 'የእንቅስቃሴ አይነት' : 'Type'}</th>
                    <th className="py-3.5 px-4 text-right text-emerald-400">{language === 'am' ? 'የገባ (In)' : 'Qty In'}</th>
                    <th className="py-3.5 px-4 text-right text-rose-400">{language === 'am' ? 'የወጣ (Out)' : 'Qty Out'}</th>
                    <th className="py-3.5 px-4 text-right text-white font-bold">{language === 'am' ? 'ቀሪ ክምችት' : 'Balance'}</th>
                    <th className="py-3.5 px-4 text-right">{language === 'am' ? 'የአንዱ ዋጋ (ETB)' : 'Unit Price'}</th>
                    <th className="py-3.5 px-4">{language === 'am' ? 'አቅራቢ / መዳረሻ ቅርንጫፍ' : 'Party / Destination'}</th>
                    <th className="py-3.5 px-4">{language === 'am' ? 'መዝጋቢ' : 'Staff'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                  {itemBinCards.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <div className="space-y-2">
                          <p className="text-sm">
                            {language === 'am'
                              ? 'ለተመረጠው እቃ በዚህ የቀን ገደብ ውስጥ ምንም የቢን ካርድ እንቅስቃሴ አልተመዘገበም'
                              : 'No Bin Card entries found for this item in the selected period.'}
                          </p>
                          <div className="flex items-center justify-center gap-3 pt-2">
                            <button
                              onClick={() => onOpenStockIn(selectedBinItem?.id)}
                              className="text-xs text-emerald-400 hover:text-emerald-300 font-bold underline"
                            >
                              + {language === 'am' ? 'የመጀመሪያ እቃ በ GRN አስገባ' : 'Receive First Goods (GRN)'}
                            </button>
                            <span className="text-slate-600">|</span>
                            <button
                              onClick={() => onOpenTransfer(selectedBinItem?.id)}
                              className="text-xs text-blue-400 hover:text-blue-300 font-bold underline"
                            >
                              🚚 {language === 'am' ? 'ለቅርንጫፍ በ SIV ላክ' : 'Dispatch via SIV'}
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    itemBinCards.map((entry) => {
                      const isPurchase = entry.type === 'IN_PURCHASE';
                      const isTransfer = entry.type === 'OUT_BRANCH_TRANSFER';
                      const isDamage = entry.type === 'OUT_DAMAGE';

                      return (
                        <tr key={entry.id} className="hover:bg-amber-500/[0.04] transition-colors font-mono">
                          <td className="py-3 px-4">
                            <div className="text-amber-300 font-bold text-[11px]">{entry.ethiopianDateStr}</div>
                            <div className="text-[10px] text-slate-500">{entry.date}</div>
                          </td>
                          <td className="py-3 px-4 font-bold text-white text-[11px]">
                            {entry.refNo}
                          </td>
                          <td className="py-3 px-4">
                            {isPurchase ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/50">
                                {language === 'am' ? 'የገባ (GRN)' : 'Stock In'}
                              </span>
                            ) : isTransfer ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800/50">
                                {language === 'am' ? 'የተላከ (SIV)' : 'Transfer Out'}
                              </span>
                            ) : isDamage ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800/50">
                                {language === 'am' ? 'ብክነት' : 'Waste/Damage'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800/50">
                                {language === 'am' ? 'ማስተካከያ' : 'Adjustment'}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-emerald-400">
                            {entry.quantityIn > 0 ? `+${entry.quantityIn.toLocaleString()}` : '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-rose-400">
                            {entry.quantityOut > 0 ? `-${entry.quantityOut.toLocaleString()}` : '-'}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-white bg-slate-950/40">
                            {entry.balance.toLocaleString()} {selectedBinItem?.unitAm}
                          </td>
                          <td className="py-3 px-4 text-right text-amber-300 font-bold">
                            {formatCurrency(entry.unitPrice || 0)}
                          </td>
                          <td className="py-3 px-4 font-sans text-slate-300">
                            <span className="font-semibold">{entry.supplierOrDestination || '-'}</span>
                            {entry.notes && <div className="text-[10px] text-slate-500 italic">{entry.notes}</div>}
                          </td>
                          <td className="py-3 px-4 font-sans text-[11px] text-slate-400">
                            {entry.recordedBy || 'ስቶር ኪፐር'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Bin Card Footer */}
            <div className="px-6 py-4 bg-slate-950/80 border-t border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
              <span>
                {language === 'am' ? 'የተመዘገቡ እንቅስቃሴዎች:' : 'Total Ledger Transactions:'}{' '}
                <strong className="text-white">{itemBinCards.length}</strong>
              </span>
              <span>
                {language === 'am' ? 'ወቅታዊ ቀሪ ክምችት:' : 'Current Stock:'}{' '}
                <strong className="text-amber-300 font-black text-sm">
                  {selectedBinItem?.currentCentralStock.toLocaleString()} {selectedBinItem?.unitAm}
                </strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SENT TO BRANCHES SIV LEDGER (CHANGE 2) */}
      {activeStoreTab === 'sentTo' && (
        <div className="space-y-6">
          {/* Destination Branch Filter Bar */}
          <div className="bg-slate-900/80 p-4 rounded-2xl border border-amber-500/20 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-blue-400" />
                  <span>{language === 'am' ? 'የመዳረሻ ቅርንጫፎች ማጣሪያ (Destination Groups)' : 'Destination Branch Groups'}</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  {language === 'am'
                    ? 'ከዋናው ስቶር የወጡ እቃዎች መዳረሻ። ማሳሰቢያ፦ የቅርንጫፍ ክምችትን በራሳቸው አይጨምሩም!'
                    : 'Dispatches from Central Store. Note: Never automatically added to branch stock!'}
                </p>
              </div>

              <button
                onClick={handleExportSentTo}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-amber-500/30 text-amber-300 text-xs font-bold transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{language === 'am' ? 'በኤክሴል አውርድ (.csv)' : 'Export to Excel (.csv)'}</span>
              </button>
            </div>

            {/* Destination Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setSentToBranchFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  sentToBranchFilter === 'ALL'
                    ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                    : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
                }`}
              >
                {language === 'am' ? 'ሁሉም መዳረሻዎች (All)' : 'All Destinations'} ({centralSentToEntries.length})
              </button>

              {branches.map((b) => {
                const count = centralSentToEntries.filter((e) => e.destinationBranchId === b.id).length;
                return (
                  <button
                    key={b.id}
                    onClick={() => setSentToBranchFilter(b.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      sentToBranchFilter === b.id
                        ? 'bg-blue-500 text-white font-black shadow-md shadow-blue-500/30'
                        : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800'
                    }`}
                  >
                    🏢 {language === 'am' ? b.nameAm : b.nameEn} ({count})
                  </button>
                );
              })}
            </div>

            {/* Date range & item filter */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/60">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  {language === 'am' ? 'የመነሻ ቀን (From)' : 'Start Date'}
                </label>
                <input
                  type="date"
                  value={sentToStartDate}
                  onChange={(e) => setSentToStartDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  {language === 'am' ? 'የመጨረሻ ቀን (To)' : 'End Date'}
                </label>
                <input
                  type="date"
                  value={sentToEndDate}
                  onChange={(e) => setSentToEndDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  {language === 'am' ? 'የዕቃ ማጣሪያ' : 'Item Filter'}
                </label>
                <select
                  value={sentToItemFilter}
                  onChange={(e) => setSentToItemFilter(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="ALL">{language === 'am' ? 'ሁሉም እቃዎች' : 'All Items'}</option>
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {language === 'am' ? it.nameAm : it.nameEn} ({it.unitAm})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900/80 p-4 rounded-2xl border border-amber-500/20">
              <span className="text-[11px] text-slate-400 block">
                {language === 'am' ? 'ጠቅላላ የተላኩ SIV ሰነዶች' : 'Total Dispatched Vouchers'}
              </span>
              <span className="text-xl font-black text-white font-mono mt-1 block">
                {filteredSentTo.length}
              </span>
            </div>
            <div className="bg-slate-900/80 p-4 rounded-2xl border border-amber-500/20">
              <span className="text-[11px] text-slate-400 block">
                {language === 'am' ? 'ጠቅላላ የተላከ መጠን' : 'Total Dispatched Quantity'}
              </span>
              <span className="text-xl font-black text-blue-300 font-mono mt-1 block">
                {sentToTotalQty.toLocaleString()}
              </span>
            </div>
            <div className="bg-slate-900/80 p-4 rounded-2xl border border-amber-500/20">
              <span className="text-[11px] text-slate-400 block">
                {language === 'am' ? 'ጠቅላላ የወጣ ዋጋ (ETB)' : 'Total Dispatch Value (ETB)'}
              </span>
              <span className="text-xl font-black text-amber-300 font-mono mt-1 block">
                {formatCurrency(sentToTotalVal)}
              </span>
            </div>
          </div>

          {/* Sent To Table */}
          <div className="bg-slate-900/80 rounded-3xl border border-amber-500/20 shadow-2xl overflow-hidden backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/90 border-b border-amber-500/20 text-slate-300 font-bold">
                    <th className="py-3.5 px-4">{language === 'am' ? 'ቀን' : 'Date'}</th>
                    <th className="py-3.5 px-4">{language === 'am' ? 'የ SIV ቁጥር' : 'SIV No.'}</th>
                    <th className="py-3.5 px-4">{language === 'am' ? 'መዳረሻ ቅርንጫፍ' : 'Destination Branch'}</th>
                    <th className="py-3.5 px-4">{t.common.item}</th>
                    <th className="py-3.5 px-4 text-right">{t.common.quantity}</th>
                    <th className="py-3.5 px-4">{t.common.unit}</th>
                    <th className="py-3.5 px-4 text-right">{language === 'am' ? 'ነጠላ ዋጋ' : 'Unit Price'}</th>
                    <th className="py-3.5 px-4 text-right">{language === 'am' ? 'ጠቅላላ ዋጋ' : 'Total Value'}</th>
                    <th className="py-3.5 px-4">{language === 'am' ? 'መዝጋቢ' : 'Store Keeper'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                  {filteredSentTo.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        {language === 'am'
                          ? 'ለተመረጠው መዳረሻ የተላከ SIV የለም'
                          : 'No dispatched SIV records found for the selected destination filter'}
                      </td>
                    </tr>
                  ) : (
                    filteredSentTo.map((entry) => (
                      <tr key={entry.id} className="hover:bg-amber-500/[0.04] transition-colors">
                        <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                          <span className="font-bold text-white block">{entry.date}</span>
                          <span className="text-[10px] text-amber-400">{entry.ethiopianDateStr}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-amber-300">
                          {entry.sivNumber}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-blue-300">
                          🏢 {language === 'am' ? entry.destinationBranchNameAm : entry.destinationBranchNameEn}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-white">
                          {language === 'am' ? entry.itemNameAm : entry.itemNameEn}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-white font-mono">
                          {entry.quantity}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {entry.unitAm}
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-slate-300">
                          {formatCurrency(entry.unitPrice)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-amber-300">
                          {formatCurrency(entry.totalValue)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                          {entry.recordedBy}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 bg-slate-950/80 border-t border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
              <span>
                {language === 'am' ? 'የተገኙ SIV መዝገቦች:' : 'Filtered Dispatches:'} <strong className="text-white">{filteredSentTo.length}</strong>
              </span>
              <span>
                {language === 'am' ? 'ጠቅላላ የወጣ ዋጋ:' : 'Total Value:'}{' '}
                <strong className="text-amber-300 font-black text-sm">
                  {formatCurrency(sentToTotalVal)}
                </strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: RESET AUDIT LOG (CHANGE 1.2) */}
      {activeStoreTab === 'resetAudit' && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 p-5 rounded-2xl border border-amber-500/20">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-yellow-400" />
              <span>{language === 'am' ? 'የመክፈቻ ሪሴት ኦዲት መዝገብ (Opening Reset Audit Trail)' : 'Opening Reset Audit Trail Log'}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {language === 'am'
                ? 'የማዕከላዊ ስቶር ክምችት ወደ 0 ሲስተካከል የተመዘገበው ኦፊሴላዊ የኦዲት መረጃ። አውቶማቲክ ባክአፕ ተይዟል፤ ምንም አይነት የዕቃ ማስተር ዳታ፣ ዋጋ ወይም ሪሲፒ አልተደለተም።'
                : 'Official audit records of Central Store stock reset to 0. Auto backup created; no item master, price or recipe hard deletes.'}
            </p>
          </div>

          <div className="space-y-4">
            {centralStoreResets.length === 0 ? (
              <div className="p-12 text-center text-slate-400 bg-slate-900/50 rounded-2xl border border-slate-800">
                {language === 'am'
                  ? 'እስካሁን ምንም የመክፈቻ ሪሴት ኦዲት አልተመዘገበም። "የመክፈቻ ሪሴት" የሚለውን በመጫን ማስጀመር ይችላሉ።'
                  : 'No opening reset records logged yet. Click "Opening Reset (0)" to initiate.'}
              </div>
            ) : (
              centralStoreResets.map((audit) => (
                <div
                  key={audit.id}
                  className="bg-slate-900/90 rounded-2xl border border-amber-500/20 p-5 space-y-4 shadow-xl"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/30">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">
                          {audit.notes}
                        </h4>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>👤 {audit.user}</span>
                          <span>•</span>
                          <span>🇪🇹 {audit.ethiopianDateStr}</span>
                          <span>•</span>
                          <span>🕒 {new Date(audit.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-amber-400/10 text-amber-300 border border-amber-400/30 rounded-xl text-xs font-bold">
                        {language === 'am' ? 'የተስተካከሉ እቃዎች:' : 'Items Reset:'} {audit.itemsResetCount}
                      </span>
                      <span className="px-2.5 py-1 bg-slate-950 text-slate-300 border border-slate-800 rounded-xl text-xs font-mono">
                        {language === 'am' ? 'የነበረ ክምችት ድምር:' : 'Prev Stock Total:'} {audit.totalPreviousStock}
                      </span>
                    </div>
                  </div>

                  {/* Snapshot items preview */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-800 font-semibold">
                          <th className="py-2 px-3">{language === 'am' ? 'ኮድ' : 'Code'}</th>
                          <th className="py-2 px-3">{t.common.item}</th>
                          <th className="py-2 px-3 text-right">{language === 'am' ? 'የቀድሞ ክምችት' : 'Previous Qty'}</th>
                          <th className="py-2 px-3 text-right">{language === 'am' ? 'አዲስ ክምችት' : 'New Qty'}</th>
                          <th className="py-2 px-3 text-right">{language === 'am' ? 'ዋጋ (ብር)' : 'Unit Price'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {audit.itemSnapshots.map((snap) => (
                          <tr key={snap.itemId} className="text-slate-300">
                            <td className="py-2 px-3 font-mono text-amber-400">{snap.itemCode}</td>
                            <td className="py-2 px-3 font-medium text-white">
                              {language === 'am' ? snap.itemNameAm : snap.itemNameEn}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-rose-300">
                              {snap.previousQuantity} {snap.unitAm}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">
                              {snap.newQuantity} {snap.unitAm}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-400">
                              {formatCurrency(snap.unitPrice)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* CHANGE 1: RESET MODAL */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-amber-500/30">
            <div className="flex items-center justify-between px-6 py-4 border-b border-amber-500/20 bg-slate-950">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    {language === 'am'
                      ? 'የማዕከላዊ ስቶር ክምችት ወደ 0 ማስተካከል (Opening Reset)'
                      : 'Reset Central Store Stock to 0 (Opening Reset)'}
                  </h3>
                  <p className="text-[11px] text-amber-400 font-medium">
                    {language === 'am'
                      ? 'በአውቶማቲክ ባክአፕ እና ኦዲት መዝገብ ይከናወናል'
                      : 'Dated adjustment with auto-backup and audit trail'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setResetModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {resetSuccessNotice ? (
                <div className="p-4 bg-emerald-950/80 border border-emerald-500/40 rounded-2xl flex items-center gap-3 text-emerald-300 text-xs">
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                  <div>
                    <h5 className="font-bold text-sm text-emerald-200">
                      {language === 'am' ? 'ሪሴቱ በተሳካ ሁኔታ ተጠናቋል!' : 'Reset Completed Successfully!'}
                    </h5>
                    <p className="text-[11px] text-emerald-300/90 mt-0.5">
                      {language === 'am'
                        ? 'የማዕከላዊ ስቶር ክምችት ወደ 0 ሆኗል፤ አውቶማቲክ ባክአፕ ተይዟል፤ የዕቃዎች ማስተር ዳታ አልተነካም።'
                        : 'Every Central Store item is now 0. Automatic backup snapshot created.'}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-4 bg-amber-950/40 border border-amber-500/30 rounded-2xl text-xs space-y-2">
                    <div className="flex items-center gap-2 text-amber-300 font-bold">
                      <AlertTriangle className="w-4 h-4" />
                      <span>{language === 'am' ? 'የመክፈቻ ሪሴት መመሪያ (Change 1 Rules):' : 'Opening Reset Specifications:'}</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
                      <li>
                        {language === 'am'
                          ? 'የማዕከላዊ ስቶር ወቅታዊ ቀሪ ክምችት (Physical Stock) ወደ 0 ይሆናል።'
                          : 'Every item on-hand balance in Central Store is set to 0.'}
                      </li>
                      <li>
                        {language === 'am'
                          ? 'ከዚህ በፊት አውቶማቲክ ባክአፕ ይወሰዳል (ምንም ሃርድ ዲሊት የለም)።'
                          : 'An automatic database backup is taken before execution (No hard deletes).'}
                      </li>
                      <li>
                        {language === 'am'
                          ? 'የዕቃዎች መረጃ፣ ኮዶች፣ መለኪያዎች፣ የመግዣ ዋጋዎች፣ ሜኑዎችና ሪሲፒዎች አይነኩም።'
                          : 'Item master data, codes, units, purchase prices, menus, and recipes remain untouched.'}
                      </li>
                      <li>
                        {language === 'am'
                          ? 'ከዚህ ቀን ጀምሮ ስቶር የሚጨምረው በአዲስ GRN ብቻ ሲሆን የሚቀንሰው በ SIV ብቻ ነው።'
                          : 'Central Store balance begins at 0 and changes only via new GRVs and SIVs.'}
                      </li>
                    </ul>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      {language === 'am' ? 'ፈቃድ የሰጠው ማኔጀር / ተጠቃሚ ስም' : 'Authorized Manager / User'}
                    </label>
                    <input
                      type="text"
                      value={resettingUser}
                      onChange={(e) => setResettingUser(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      {language === 'am' ? 'የኦዲት ማስታወሻ' : 'Audit Note'}
                    </label>
                    <textarea
                      rows={2}
                      value={resettingNotes}
                      onChange={(e) => setResettingNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setResetModalOpen(false)}
                      className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700"
                    >
                      {t.common.cancel}
                    </button>
                    <button
                      type="button"
                      disabled={resetRunning}
                      onClick={handleExecuteReset}
                      className="px-5 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black rounded-xl text-xs shadow-lg hover:from-amber-400 hover:to-yellow-400 transition-all flex items-center gap-1.5"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${resetRunning ? 'animate-spin' : ''}`} />
                      <span>
                        {resetRunning
                          ? (language === 'am' ? 'ባክአፕ እየተያዘ ነው...' : 'Backing up & Resetting...')
                          : (language === 'am' ? 'አረጋግጥና ወደ 0 ቀይር' : 'Confirm & Reset to 0')}
                      </span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Direct Copy/Sync Modal between Manager & Storekeeper */}
      {syncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-2 border-amber-500/40 rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl relative space-y-6">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300">
                  <Copy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-amber-300">
                    {language === 'am' ? 'የስቶር እቃዎች ዳታ ማመሳሰያ (Sync Center)' : 'Store Catalog Sync Center'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {language === 'am'
                      ? 'እርስዎ ጋር ያሉትን ሙሉ እቃዎች ለስቶር ኪፐሯ ማመሳሰል እና ከሷ መቀበል'
                      : 'Copy or synchronize your store catalog with the storekeeper across all devices'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSyncModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status alerts */}
            {serverSyncSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{serverSyncSuccess}</span>
              </div>
            )}
            {serverFetchSuccess && (
              <div className="p-3.5 rounded-2xl bg-cyan-950/60 border border-cyan-500/50 text-cyan-200 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>{serverFetchSuccess}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Option 1: 1-Click Copy Master Items */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-200">
                    {language === 'am' ? '1. የኔን ሙሉ እቃዎች ኮፒ አድርግ (Copy Text)' : '1. Copy Master Items'}
                  </span>
                  <span className="text-[11px] font-bold text-amber-400 font-mono">
                    {items.length} {language === 'am' ? 'እቃዎች' : 'items'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {language === 'am'
                    ? 'ይህንን በመጫን ሙሉ የእቃዎቾን ዝርዝር በኮድ ኮፒ ያድርጉ። በቴሌግራም/ዋትስአፕ ለስቶር ኪፐሯ መላክ ወይም ስልኳ ላይ ፔስት ማድረግ ይችላሉ።'
                    : 'Copies compact catalog code to clipboard to send via Telegram/WhatsApp or paste directly.'}
                </p>
                <button
                  onClick={handleCopyItemsJson}
                  className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer font-black"
                >
                  {copiedItemsData ? <Check className="w-4 h-4 text-slate-950" /> : <Copy className="w-4 h-4 text-slate-950" />}
                  <span>
                    {copiedItemsData
                      ? (language === 'am' ? 'ሙሉ ዳታው ተቀድቷል! ✅' : 'Items Data Copied! ✅')
                      : (language === 'am' ? '📋 ሙሉ የእቃዎችን ዳታ ኮፒ አድርግ' : '📋 Copy Items Data Text')}
                  </span>
                </button>
              </div>

              {/* Option 2: Live Server Sync */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5">
                <span className="text-xs font-black text-white">
                  {language === 'am' ? '2. በቀጥታ ወደ ሰርቨር አመሳስል (Live Cloud Sync)' : '2. Live Server Sync'}
                </span>
                <p className="text-[11px] text-slate-400">
                  {language === 'am'
                    ? 'ይህ በራስ ሰር በየ12 ሰከንዶች ይገናኛል። አሁን ወዲያውኑ ማመሳሰል ከፈለጉ ከታች ያሉትን ቁልፎች ይጫኑ፦'
                    : 'Auto-sync runs continuously in background. You can also force push/pull instantly below:'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={handlePushToServer}
                    disabled={isSyncingServer}
                    className="py-2.5 px-3 rounded-xl font-bold text-xs bg-emerald-600/80 hover:bg-emerald-500 border border-emerald-400 text-white shadow-md flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Download className="w-3.5 h-3.5 rotate-180" />
                    <span>{language === 'am' ? 'ወደ ሰርቨር ላክ (Push)' : 'Push to Server'}</span>
                  </button>
                  <button
                    onClick={handleFetchFromServer}
                    disabled={isSyncingServer}
                    className="py-2.5 px-3 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 border border-slate-600 text-cyan-200 shadow-md flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{language === 'am' ? 'ከስቶር ኪፐር አምጣ (Pull)' : 'Pull from Server'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800/80">
              <button
                onClick={() => setSyncModalOpen(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                {t.common.close || 'ዝጋ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Quick Edit Modal (Price, Unit, Min Level, Names) */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-2 border-amber-500/50 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative space-y-5">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-amber-300">
                    {language === 'am' ? 'የእቃ መረጃና ዋጋ ማስተካከያ' : 'Edit Item & Price'}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {editingItem.code} — {editingItem.nameAm}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editSuccessNotice && (
              <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{editSuccessNotice}</span>
              </div>
            )}

            <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
              {/* Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    {language === 'am' ? 'የእቃው ስም (አማርኛ)' : 'Name (Amharic)'}
                  </label>
                  <input
                    type="text"
                    value={editForm.nameAm}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, nameAm: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    {language === 'am' ? 'የእቃው ስም (English)' : 'Name (English)'}
                  </label>
                  <input
                    type="text"
                    value={editForm.nameEn}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, nameEn: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Unit & UnitAm */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    {language === 'am' ? 'መለኪያ አይነት (Unit Type)' : 'Unit Type'}
                  </label>
                  <select
                    value={editForm.unit}
                    onChange={(e) => {
                      const u = e.target.value;
                      const uAm =
                        u === 'kg'
                          ? 'ኪ.ግ'
                          : u === 'liter'
                          ? 'ሊትር'
                          : u === 'quintal'
                          ? 'ኩንታል'
                          : u === 'gram'
                          ? 'ግራም'
                          : u === 'pcs'
                          ? 'ፍሬ'
                          : u === 'pack'
                          ? 'ፓኬት'
                          : 'ጠርሙስ';
                      setEditForm((prev) => ({ ...prev, unit: u, unitAm: uAm }));
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="kg">kg (ኪ.ግ)</option>
                    <option value="liter">liter (ሊትር)</option>
                    <option value="quintal">quintal (ኩንታል)</option>
                    <option value="gram">gram (ግራም)</option>
                    <option value="pcs">pcs (ፍሬ/ቁጥር)</option>
                    <option value="pack">pack (ፓኬት)</option>
                    <option value="bottle">bottle (ጠርሙስ)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    {language === 'am' ? 'የመለኪያ ጽሁፍ (አማርኛ)' : 'Unit Label (Amharic)'}
                  </label>
                  <input
                    type="text"
                    value={editForm.unitAm}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, unitAm: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Prices in ETB */}
              <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/30 space-y-3">
                <span className="text-xs font-black text-amber-300 block">
                  {language === 'am' ? '💰 የዋጋ ማስተካከያ በኢትዮጵያ ብር (ETB Price Settings)' : '💰 ETB Price Settings'}
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      {language === 'am' ? 'የቅርብ ግዢ ዋጋ (Last Purchase Rate)' : 'Last Purchase Price (ETB)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editForm.lastPurchasePrice || ''}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          lastPurchasePrice: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-amber-500/50 rounded-xl text-xs font-bold text-amber-300 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      {language === 'am' ? 'አማካይ ወጪ (Weighted Avg Cost - WAC)' : 'Avg Cost (WAC in ETB)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editForm.weightedAvgCost || ''}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          weightedAvgCost: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Min Stock Level & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    {language === 'am' ? 'ዝቅተኛ ክምችት ማስጠንቀቂያ (Min Level)' : 'Min Stock Alert Level'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.minStockLevel || ''}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        minStockLevel: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    {language === 'am' ? 'ምድብ (Category)' : 'Category'}
                  </label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="produce">{language === 'am' ? 'አትክልትና ፍራፍሬ' : 'Produce'}</option>
                    <option value="meat">{language === 'am' ? 'ስጋና የዶሮ ውጤቶች' : 'Meat'}</option>
                    <option value="grain">{language === 'am' ? 'እህልና ዱቄት' : 'Grain'}</option>
                    <option value="dairy">{language === 'am' ? 'ወተትና ቅቤ' : 'Dairy'}</option>
                    <option value="spices">{language === 'am' ? 'ቅመማ ቅመም' : 'Spices'}</option>
                    <option value="oil">{language === 'am' ? 'ዘይትና ቅባት' : 'Oil'}</option>
                    <option value="beverage">{language === 'am' ? 'መጠጦች' : 'Beverage'}</option>
                    <option value="packaging">{language === 'am' ? 'ማሸጊያዎች' : 'Packaging'}</option>
                    <option value="other">{language === 'am' ? 'ሌሎች' : 'Other'}</option>
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400">
                💡{' '}
                {language === 'am'
                  ? 'ይህን ሲያስቀምጡ የስቶር ኪፐር ቦክስ ስልክ ላይ ያለው ካታሎግ ወዲያውኑ አብሮ ይዘምናል!'
                  : 'Saving here also immediately synchronizes this item and price to the storekeeper portal!'}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                {t.common.cancel || 'ተመለስ'}
              </button>
              <button
                type="button"
                onClick={handleSaveEditItem}
                className="px-5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4 text-slate-950" />
                <span>{language === 'am' ? 'አስቀምጥና አመሳስል (Save)' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

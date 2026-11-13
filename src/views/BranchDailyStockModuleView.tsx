import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  GitBranch,
  Building2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Plus,
  Trash2,
  Download,
  Printer,
  Upload,
  ArrowRightLeft,
  FileSpreadsheet,
  Sparkles,
  HelpCircle,
  Save,
  Check,
  Search,
  Filter,
  User,
  ShieldAlert,
  Info,
  Mic,
  MicOff,
  Volume2,
  UtensilsCrossed,
  Receipt,
  ShieldCheck,
  BrainCircuit,
  TrendingDown,
  TrendingUp,
  X,
  FileText,
  BadgeAlert,
  ArrowDown,
  Clock,
  ClipboardList,
  DollarSign,
  PackagePlus,
  Edit3,
  ChevronLeft,
  ChevronRight,
  Layers,
  ChefHat,
  Scale,
  PieChart,
  BarChart3,
  Target,
  FileCheck,
  RefreshCw,
  Copy,
  CheckSquare,
  ClipboardCheck,
  ClipboardPaste,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { formatEthiopianDate, getTodayDateString, getRelativeDateString, getDateOffset } from '../utils/ethiopianDate';
import { downloadWordDocument } from '../utils/wordExporter';
import {
  BranchTrackedItem,
  BranchDailyModuleRecord,
  BranchDailyItemData,
  BranchInterTransfer,
  Recipe,
  InventoryItem,
  StationDailySubmission,
} from '../types';
import { saveDailyAuditToFirestore, syncFullERPToFirestore } from '../services/firebaseService';
import { subscribeToStationSubmissions } from '../services/firebaseStationSync';
import { MenuSalesSmartPasteModal } from '../components/modals/MenuSalesSmartPasteModal';

export type BranchModuleMode = 'dailyInput' | 'menuRecipes' | 'varianceAudit' | 'fbControl' | 'ownerReport';

export interface BranchDailyStockModuleViewProps {
  initialBranchId?: string;
  initialMode?: BranchModuleMode;
  onOpenNewBranch?: () => void;
}

// F&B Data Matcher / Parser Interfaces (5 Document Types)
export type FnbDocType = 'BEGINNING_BALANCE' | 'ENDING_BALANCE' | 'CHEF_SOLD_LIST' | 'CASHIER_SALES' | 'DAMAGE';

export interface FnbMatchedItem {
  id: string;
  name: string;
  matched_system_name: string;
  quantity: number;
  unit: string;
  confidence: 'ከፍተኛ' | 'መካከለኛ' | 'ዝቅተኛ';
  converted: boolean;
  unit_price?: number;
  line_total?: number;
  calc_error?: boolean;
  warning?: string | null;
  note?: string | null;
}

export interface FnbNeedsReviewItem {
  raw_text: string;
  reason: string;
  suggested_matches?: Array<{
    id: string;
    name: string;
    confidence: 'መካከለኛ' | 'ዝቅተኛ';
  }>;
}

export interface FnbNewItem {
  raw_name: string;
  quantity: number;
  unit: string;
  unit_price?: number;
}

export interface FnbSheetTotal {
  stated: number | null;
  calculated: number;
  matches: boolean;
  difference: number;
}

export interface FnbAiMatchResult {
  doc_type: FnbDocType | string;
  matched: FnbMatchedItem[];
  needs_review: FnbNeedsReviewItem[];
  new_items: FnbNewItem[];
  sheet_total?: FnbSheetTotal;
}

// Menu sales line item
interface MenuSaleEntry {
  id: string;
  recipeId: string;
  dishName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalEtb: number;
  note?: string;
}

// Management consumption line item (STRICTLY AS A MENU ITEM)
interface ManagementMenuEntry {
  id: string;
  recipeId: string;
  dishName: string;
  quantity: number;
  beneficiary: string;
  reason: string;
  totalCostEtb: number;
}

// Wastage / Damage line item
interface DamageEntry {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unit: string;
  reason: string;
  lossValueEtb: number;
}

// Inter-branch transfer out line item
interface TransferOutEntry {
  id: string;
  itemId: string;
  itemName: string;
  destinationBranchId: string;
  destinationBranchName: string;
  quantity: number;
  unit: string;
  sivNumber: string;
  notes: string;
}

// AI Audit Analysis Item Result
interface AIAuditItemResult {
  itemId: string;
  itemCode: string;
  itemName: string;
  countUnit: string;
  unitPrice: number;
  beginningCount: number;
  receivedQty: number;
  runningTotal: number;
  recipeUsageSales: number;
  recipeUsageMgmt: number;
  totalRecipeUsage: number;
  damageQty: number;
  transferOutQty: number;
  expectedEnding: number;
  actualEnding: number;
  varianceQty: number;
  varianceValueEtb: number;
  variancePercent: number;
  status: 'OK' | 'WARNING' | 'INVESTIGATE';
  statusLabelAm: string;
  statusLabelEn: string;
  contributingDishes: string[];
  diagnosisAm: string;
  diagnosisEn: string;
}

export const BranchDailyStockModuleView: React.FC<BranchDailyStockModuleViewProps> = ({
  initialBranchId,
  initialMode,
  onOpenNewBranch,
}) => {
  const {
    branches,
    items,
    recipes,
    branchTrackedItems,
    saveBranchTrackedItem,
    removeBranchTrackedItem,
    bulkRemoveBranchTrackedItems,
    getTrackedItemsForBranch,
    cloneTrackedItemsFromBranch,
    syncTrackedItemsAcrossBranches,
    branchDailyModules,
    saveBranchDailyModule,
    getBeginningStockForBranchItem,
    branchInterTransfers,
    recordInterBranchTransfer,
    clearAllDataCompletely,
    addNewItem,
    bulkMergeItems,
    currentHotelId,
    getMonthlyExpenseSummary,
    logAuditTrail,
  } = useApp();

  const { language, formatCurrency } = useLanguage();

  // Mode: 5 Interconnected Pillars of Daily Branch Control
  const [viewMode, setViewMode] = useState<BranchModuleMode>(initialMode || 'dailyInput');

  useEffect(() => {
    if (initialMode) {
      setViewMode(initialMode);
    }
  }, [initialMode]);

  // Branch Selection: Self-Governing Units (Frasco Bello, Cocoon Shola, Cocoon 6 Kilo, Pasta Factory)
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    initialBranchId || branches[0]?.id || 'br-frasco-bello'
  );
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [selectedShift, setSelectedShift] = useState<'ALL_DAY' | 'MORNING' | 'EVENING'>('ALL_DAY');
  const [managerName, setManagerName] = useState('ሳልሳዊ ስዩም (Branch Manager)');

  // Requirement 1: Each branch has its own independent list (no auto-sync on mount)
  // State for Primary Materials Multi-select & Soft Removal
  const [selectedTrackedItemIds, setSelectedTrackedItemIds] = useState<string[]>([]);
  const [itemToRemove, setItemToRemove] = useState<{ id: string; name: string } | null>(null);
  const [showBulkRemoveConfirm, setShowBulkRemoveConfirm] = useState(false);
  const [removalReason, setRemovalReason] = useState('');

  // Requirement 2: Side-by-side smart paste for Kitchen Ticket Order & POS Sales
  const [isMenuSmartPasteOpen, setIsMenuSmartPasteOpen] = useState(false);

  // Synchronization notice & mirror flag
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [applyToBothSholaAndSixKilo, setApplyToBothSholaAndSixKilo] = useState<boolean>(false);

  // Clone & Sync Actions
  const handleCloneSholaToSixKilo = () => {
    const res = cloneTrackedItemsFromBranch('br-cocoon-shola', 'br-kokonut-6kilo');
    setSyncNotice(
      language === 'am'
        ? `ከኮኮናት ሾላ ወደ ኮኮናት 6 ኪሎ ${res.count} ፕራይመሪ ዕቃዎች በተሳካ ሁኔታ ተገልብጠዋል!`
        : `Successfully cloned ${res.count} primary materials from Cocoon Shola to Cocoon 6 Kilo!`
    );
    setTimeout(() => setSyncNotice(null), 4000);
  };

  const handleCloneSixKiloToShola = () => {
    const res = cloneTrackedItemsFromBranch('br-kokonut-6kilo', 'br-cocoon-shola');
    setSyncNotice(
      language === 'am'
        ? `ከኮኮናት 6 ኪሎ ወደ ኮኮናት ሾላ ${res.count} ፕራይመሪ ዕቃዎች በተሳካ ሁኔታ ተገልብጠዋል!`
        : `Successfully cloned ${res.count} primary materials from Cocoon 6 Kilo to Cocoon Shola!`
    );
    setTimeout(() => setSyncNotice(null), 4000);
  };

  const handleSyncSholaAndSixKilo = () => {
    const res = syncTrackedItemsAcrossBranches(['br-cocoon-shola', 'br-kokonut-6kilo']);
    setSyncNotice(
      language === 'am'
        ? `የኮኮናት ሾላ እና የኮኮናት 6 ኪሎ ፕራይመሪ ዕቃዎች ሙሉ በሙሉ ተመሳስለዋል (${res.count} ዕቃዎች)!`
        : `Cocoon Shola and Cocoon 6 Kilo primary materials are now 100% synchronized (${res.count} items)!`
    );
    setTimeout(() => setSyncNotice(null), 4000);
  };

  // Recipe Search & Category Filters for Menu & Recipes view
  const [recipeSearchQuery, setRecipeSearchQuery] = useState('');
  const [recipeCategoryFilter, setRecipeCategoryFilter] = useState('ALL');

  // New Primary Material State (Supports Bulk Multi-Select & Register New)
  const [newPrimaryModalOpen, setNewPrimaryModalOpen] = useState(false);
  const [newPrimaryMode, setNewPrimaryMode] = useState<'existing' | 'new'>('existing');
  const [selectedExistingItemId, setSelectedExistingItemId] = useState('');
  const [selectedExistingItemIds, setSelectedExistingItemIds] = useState<string[]>([]);
  const [primarySearchFilter, setPrimarySearchFilter] = useState('');
  const [primaryCategoryFilter, setPrimaryCategoryFilter] = useState('ALL');
  const [newPrimaryForm, setNewPrimaryForm] = useState({
    code: '',
    nameAm: '',
    nameEn: '',
    unit: 'kg',
    unitAm: 'ኪ.ግ',
    category: 'produce',
    unitPrice: 0,
    openingCount: 0,
    receivedCount: 0,
  });
  const [newPrimarySuccessNotice, setNewPrimarySuccessNotice] = useState<string | null>(null);

  // Branch Stock 3-Column Excel Importer (Beginning, Received, Ending)
  const [stockExcelModalOpen, setStockExcelModalOpen] = useState(false);
  const [stockExcelText, setStockExcelText] = useState('');
  const [stockExcelSuccessNotice, setStockExcelSuccessNotice] = useState<string | null>(null);
  const [copiedStockExcelTemplate, setCopiedStockExcelTemplate] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isDraggingChefFile, setIsDraggingChefFile] = useState(false);
  const [isDraggingCashierFile, setIsDraggingCashierFile] = useState(false);
  const [isDraggingDamageFile, setIsDraggingDamageFile] = useState(false);

  // Chef Standardized Quick Count Slip & Instant Input Parser
  const [chefSlipModalOpen, setChefSlipModalOpen] = useState(false);
  const [chefSlipTab, setChefSlipTab] = useState<'parser' | 'printable'>('parser');
  const [chefPasteText, setChefPasteText] = useState('');
  const [chefPasteTarget, setChefPasteTarget] = useState<'actual' | 'received' | 'beginning'>('actual');
  const [copiedChefTemplate, setCopiedChefTemplate] = useState(false);

  // F&B Control 4-Document AI Data Matcher Assistant
  const [fnbDocType, setFnbDocType] = useState<FnbDocType>('BEGINNING_BALANCE');
  const [isAiMatching, setIsAiMatching] = useState(false);
  const [aiMatchResult, setAiMatchResult] = useState<FnbAiMatchResult | null>(null);
  const [aiMatchError, setAiMatchError] = useState<string | null>(null);
  const [applySuccessNotice, setApplySuccessNotice] = useState<string | null>(null);

  // Sample texts for the 4 document types
  const sampleDataMap: Record<FnbDocType, string> = {
    BEGINNING_BALANCE: `የበሬ ስጋ 25 kg
ዶሮ ደረት 15 ኪ.ግ
ሽንኩርት 18 kg
ቲማቲም 20 kg
ድንች 30 kg
እንቁላል 120 pcs
ዘይት 10 lt
አይብ (Cheese) 5 ኪ.ግ
በርገር ዳቦ 50 ፍሬ
ስኳር 12 kg`,
    ENDING_BALANCE: `ስጋ 11 kg
ዶሮ ደረት 7 ኪ.ግ
ሽንኩርት 6 kg
ቲማቲም 8 ኪ.ግ
ድንች 12 kg
እንቁላል 40
ዘይት 4.5
አይብ 1.5 kg
በርገር ዳቦ 15
ስኳር 8`,
    CHEF_SOLD_LIST: `ኮኮናት ስፔሻል በርገር 25
ቺዝ በርገር 14
ስፔሻል የበሬ ጥብስ 18
ክለብ ሳንድዊች 12
ስፔሻል ፓስታ 20
አቮካዶ ጁስ 16
ማንጎ ጁስ 10
ስፕሪንግ ሮል 8`,
    CASHIER_SALES: `ኮኮናት ስፔሻል በርገር 25 x 350 = 8750
ቺዝ በርገር 14 x 380 = 5320
ስፔሻል የበሬ ጥብስ 18 x 450 = 8100
ክለብ ሳንድዊች 12 x 320 = 3840
ስፔሻል ፓስታ 20 x 280 = 5600
አቮካዶ ጁስ 16 x 160 = 2560
ማንጎ ጁስ 10 x 150 = 1500
ስፕሪንግ ሮል 8 x 200 = 1600
ጠቅላላ ድምር: 37270`,
    DAMAGE: `የበሬ ስጋ 1.5 kg የተበላሸ
ቲማቲም 2.5 ኪ.ግ የበሰበሰ
እንቁላል 6 pcs የተሰበረ
የላም ወተት 1.5 lt የኮመጠጠ
በርገር ዳቦ 4 ፍሬ የደረቀ
ድንች 3 kg የበሰበሰ`,
  };

  const handleLoadSample = (type: FnbDocType) => {
    setFnbDocType(type);
    const text = sampleDataMap[type];
    setChefPasteText(text);
    setAiMatchError(null);
    runLocalFallbackMatcher(type, text);
  };

  // Executive Owner Report Compact Synthesized View Toggle
  const [showFullDetailedTable, setShowFullDetailedTable] = useState(false);

  // Inline amend price handler
  const handleAmendItemPrice = (itemId: string, newPrice: number) => {
    const target = items.find((i) => i.id === itemId);
    if (!target) return;
    const cleanPrice = Math.max(0, Number(newPrice) || 0);
    const updated = { ...target, lastPurchasePrice: cleanPrice, weightedAvgCost: cleanPrice };
    bulkMergeItems([updated]);
    fetch('/api/store/sync-catalog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: items.map((it) => (it.id === updated.id ? updated : it)),
      }),
    }).catch(() => {});
  };

  // Add primary material handler
  const handleSaveNewPrimaryMaterial = () => {
    const isSholaOrSixKilo = selectedBranchId === 'br-cocoon-shola' || selectedBranchId === 'br-kokonut-6kilo';
    const sisterBranchId = selectedBranchId === 'br-cocoon-shola' ? 'br-kokonut-6kilo' : 'br-cocoon-shola';

    if (newPrimaryMode === 'existing') {
      const targetIds = selectedExistingItemIds.length > 0
        ? selectedExistingItemIds
        : (selectedExistingItemId ? [selectedExistingItemId] : []);

      if (targetIds.length === 0) return;

      targetIds.forEach((itemId) => {
        const existing = items.find((i) => i.id === itemId);
        if (!existing) return;

        const trackedId = `${selectedBranchId}_${existing.id}`;
        saveBranchTrackedItem({
          id: trackedId,
          branchId: selectedBranchId,
          itemId: existing.id,
          countUnit: existing.unit,
          countUnitAm: existing.unitAm,
          isActive: true,
          addedAt: new Date().toISOString(),
        });

        // Mirror to sister branch (Cocoon Shola <-> Cocoon 6 Kilo)
        if (applyToBothSholaAndSixKilo && isSholaOrSixKilo) {
          saveBranchTrackedItem({
            id: `${sisterBranchId}_${existing.id}`,
            branchId: sisterBranchId,
            itemId: existing.id,
            countUnit: existing.unit,
            countUnitAm: existing.unitAm,
            isActive: true,
            addedAt: new Date().toISOString(),
          });
        }

        if (targetIds.length === 1) {
          if (newPrimaryForm.openingCount > 0) {
            setBeginningCounts((prev) => ({ ...prev, [existing.id]: Number(newPrimaryForm.openingCount) }));
          }
          if (newPrimaryForm.receivedCount > 0) {
            setReceivedCounts((prev) => ({ ...prev, [existing.id]: Number(newPrimaryForm.receivedCount) }));
          }
          if (newPrimaryForm.unitPrice > 0) {
            handleAmendItemPrice(existing.id, Number(newPrimaryForm.unitPrice));
          }
        }
      });

      setNewPrimarySuccessNotice(
        language === 'am'
          ? (applyToBothSholaAndSixKilo && isSholaOrSixKilo
              ? `✅ ${targetIds.length} ፕራይመሪ ማቴሪያሎች ለኮኮናት ሾላ እና ለ6 ኪሎ በአንዴ ተጨምረዋል!`
              : `✅ ${targetIds.length} ፕራይመሪ ማቴሪያሎች በአንዴ ተጨምረዋል!`)
          : `✅ Added ${targetIds.length} primary materials successfully!`
      );
      setTimeout(() => {
        setNewPrimarySuccessNotice(null);
        setNewPrimaryModalOpen(false);
        setSelectedExistingItemId('');
        setSelectedExistingItemIds([]);
      }, 1200);
      return;
    } else {
      const newId = `raw-${Date.now()}`;
      const newCode = newPrimaryForm.code.trim() || `RM-${Math.floor(100 + Math.random() * 900)}`;
      const cleanPrice = Math.max(0, Number(newPrimaryForm.unitPrice) || 0);
      const newItem: any = {
        id: newId,
        code: newCode,
        nameAm: newPrimaryForm.nameAm.trim() || 'አዲስ ጥሬ እቃ',
        nameEn: newPrimaryForm.nameEn.trim() || 'New Raw Material',
        category: newPrimaryForm.category || 'produce',
        unit: newPrimaryForm.unit || 'kg',
        unitAm: newPrimaryForm.unitAm || 'ኪ.ግ',
        minStockLevel: 5,
        currentCentralStock: 0,
        weightedAvgCost: cleanPrice,
        lastPurchasePrice: cleanPrice,
        priceHistory: [],
      };

      addNewItem(newItem);

      saveBranchTrackedItem({
        id: `${selectedBranchId}_${newId}`,
        branchId: selectedBranchId,
        itemId: newId,
        countUnit: newItem.unit,
        countUnitAm: newItem.unitAm,
        isActive: true,
        addedAt: new Date().toISOString(),
      });

      // Mirror to sister branch (Cocoon Shola <-> Cocoon 6 Kilo)
      if (applyToBothSholaAndSixKilo && isSholaOrSixKilo) {
        saveBranchTrackedItem({
          id: `${sisterBranchId}_${newId}`,
          branchId: sisterBranchId,
          itemId: newId,
          countUnit: newItem.unit,
          countUnitAm: newItem.unitAm,
          isActive: true,
          addedAt: new Date().toISOString(),
        });
      }

      if (newPrimaryForm.openingCount > 0) {
        setBeginningCounts((prev) => ({ ...prev, [newId]: Number(newPrimaryForm.openingCount) }));
      }
      if (newPrimaryForm.receivedCount > 0) {
        setReceivedCounts((prev) => ({ ...prev, [newId]: Number(newPrimaryForm.receivedCount) }));
      }

      fetch('/api/store/sync-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [...items, newItem] }),
      }).catch(() => {});
    }

    setNewPrimarySuccessNotice(
      language === 'am'
        ? (applyToBothSholaAndSixKilo && isSholaOrSixKilo
            ? 'አዲሱ ፕራይመሪ ማቴሪያል ለኮኮናት ሾላ እና ለ6 ኪሎ እኩል ተጨምሯል!'
            : 'አዲሱ ፕራይመሪ ማቴሪያል በተሳካ ሁኔታ ተጨምሯል!')
        : 'New primary material added successfully!'
    );
    setTimeout(() => {
      setNewPrimarySuccessNotice(null);
      setNewPrimaryModalOpen(false);
      setNewPrimaryForm({
        code: '',
        nameAm: '',
        nameEn: '',
        unit: 'kg',
        unitAm: 'ኪ.ግ',
        category: 'produce',
        unitPrice: 0,
        openingCount: 0,
        receivedCount: 0,
      });
    }, 1200);
  };

  const handleConfirmSingleRemove = () => {
    if (!itemToRemove) return;
    removeBranchTrackedItem(
      selectedBranchId,
      itemToRemove.id,
      selectedDate,
      removalReason || (language === 'am' ? 'በተጠቃሚው የተወገደ' : 'Removed by user')
    );
    setSelectedTrackedItemIds((prev) => prev.filter((id) => id !== itemToRemove.id));
    setItemToRemove(null);
    setRemovalReason('');
  };

  const handleConfirmBulkRemove = () => {
    if (selectedTrackedItemIds.length === 0) return;
    bulkRemoveBranchTrackedItems(
      selectedBranchId,
      selectedTrackedItemIds,
      selectedDate,
      removalReason || (language === 'am' ? 'በጅምላ የተወገዱ' : 'Bulk removed')
    );
    setSelectedTrackedItemIds([]);
    setShowBulkRemoveConfirm(false);
    setRemovalReason('');
  };

  const handleApplyMenuSales = (
    chefSales: Record<string, number>,
    cashierSales: Record<string, number>,
    mode: 'replace' | 'add'
  ) => {
    if (mode === 'replace') {
      setChefMenuSales(chefSales);
      setCashierMenuSales(cashierSales);
    } else {
      setChefMenuSales((prev) => {
        const next = { ...prev };
        Object.entries(chefSales).forEach(([id, qty]) => {
          next[id] = (next[id] || 0) + qty;
        });
        return next;
      });
      setCashierMenuSales((prev) => {
        const next = { ...prev };
        Object.entries(cashierSales).forEach(([id, qty]) => {
          next[id] = (next[id] || 0) + qty;
        });
        return next;
      });
    }

    logAuditTrail({
      action: 'PASTE_SALES_APPLIED',
      details: `${selectedBranchId} (${selectedDate}): Chef dishes ${Object.keys(chefSales).length}, Cashier dishes ${Object.keys(cashierSales).length} (mode: ${mode})`,
    });
  };

  const currentBranch = useMemo(
    () => branches.find((b) => b.id === selectedBranchId) || branches[0],
    [branches, selectedBranchId]
  );

  // Active recipes for this branch
  const branchRecipes = useMemo(() => {
    if (!currentBranch) return [];
    return recipes.filter((r) => !r.branchId || r.branchId === currentBranch.id);
  }, [recipes, currentBranch]);

  // Tracked key items for this branch from selectedDate onward (Requirement 1: soft removal)
  const trackedItemsList = useMemo(() => {
    if (!currentBranch) return [];
    return getTrackedItemsForBranch(currentBranch.id, selectedDate);
  }, [currentBranch, branchTrackedItems, items, selectedDate]);

  // Requirement 3: Monthly Expenses for Owner Report
  const currentMonth = useMemo(() => selectedDate.slice(0, 7), [selectedDate]);
  const monthlyExpenseSummary = useMemo(() => {
    return getMonthlyExpenseSummary(currentHotelId, selectedBranchId, currentMonth);
  }, [getMonthlyExpenseSummary, currentHotelId, selectedBranchId, currentMonth]);

  // Live quick search query for tracked stock items table
  const [trackedItemSearchQuery, setTrackedItemSearchQuery] = useState('');

  // Filtered tracked items for table display
  const filteredTrackedItemsList = useMemo(() => {
    if (!trackedItemSearchQuery.trim()) return trackedItemsList;
    const q = trackedItemSearchQuery.trim().toLowerCase();
    return trackedItemsList.filter((ti) => {
      const it = items.find((i) => i.id === ti.itemId);
      if (!it) return false;
      const nAm = (it.nameAm || '').toLowerCase();
      const nEn = (it.nameEn || '').toLowerCase();
      const cd = (it.code || '').toLowerCase();
      return nAm.includes(q) || nEn.includes(q) || cd.includes(q);
    });
  }, [trackedItemsList, trackedItemSearchQuery, items]);

  // =========================================================================
  // SECTION 2: BEGINNING & RECEIVED (Raw Material Physical Counts)
  // =========================================================================
  const [beginningCounts, setBeginningCounts] = useState<Record<string, number>>({});
  const [receivedCounts, setReceivedCounts] = useState<Record<string, number>>({});

  // =========================================================================
  // SECTION 3: CHEF MENU SALES ENTRY (with Live Instant Search 🔍)
  // =========================================================================
  const [chefMenuSearchQuery, setChefMenuSearchQuery] = useState('');
  const [chefMenuSales, setChefMenuSales] = useState<Record<string, number>>({});

  // Filtered dishes for chef entry as user types in search box
  const filteredChefRecipes = useMemo(() => {
    const q = chefMenuSearchQuery.trim().toLowerCase();
    if (!q) return branchRecipes;
    return branchRecipes.filter(
      (r) =>
        (r.nameAm || '').toLowerCase().includes(q) ||
        (r.nameEn || '').toLowerCase().includes(q) ||
        (r.category || '').toLowerCase().includes(q)
    );
  }, [branchRecipes, chefMenuSearchQuery]);

  // =========================================================================
  // SECTION 4: CASHIER/POS MENU SALES ENTRY (Manual or Excel Paste)
  // =========================================================================
  const [cashierMenuSearchQuery, setCashierMenuSearchQuery] = useState('');
  const [cashierMenuSales, setCashierMenuSales] = useState<Record<string, number>>({});
  const [excelPasteModalOpen, setExcelPasteModalOpen] = useState(false);
  const [excelPasteText, setExcelPasteText] = useState('');

  const filteredCashierRecipes = useMemo(() => {
    const q = cashierMenuSearchQuery.trim().toLowerCase();
    if (!q) return branchRecipes;
    return branchRecipes.filter(
      (r) =>
        (r.nameAm || '').toLowerCase().includes(q) ||
        (r.nameEn || '').toLowerCase().includes(q) ||
        (r.category || '').toLowerCase().includes(q)
    );
  }, [branchRecipes, cashierMenuSearchQuery]);

  // =========================================================================
  // SECTION 5: MANAGEMENT MENU CONSUMPTION (STRICTLY AS A MENU ITEM)
  // =========================================================================
  const [managementMenuEntries, setManagementMenuEntries] = useState<ManagementMenuEntry[]>([]);
  const [selectedMgmtRecipeId, setSelectedMgmtRecipeId] = useState('');
  const [mgmtQuantity, setMgmtQuantity] = useState<number | ''>(1);
  const [mgmtBeneficiary, setMgmtBeneficiary] = useState('ማኔጀር / እንግዳ (Manager / Guest)');
  const [mgmtReason, setMgmtReason] = useState('የስራ ላይ ማኔጅመንት አበል (On-duty Allowance)');

  const handleAddManagementMenu = (e: React.FormEvent) => {
    e.preventDefault();
    const recipe = branchRecipes.find((r) => r.id === selectedMgmtRecipeId);
    if (!recipe || !mgmtQuantity || mgmtQuantity <= 0) return;

    const newEntry: ManagementMenuEntry = {
      id: `mgmt-${Date.now()}`,
      recipeId: recipe.id,
      dishName: language === 'am' ? recipe.nameAm : recipe.nameEn,
      quantity: Number(mgmtQuantity),
      beneficiary: mgmtBeneficiary,
      reason: mgmtReason,
      totalCostEtb: Number(mgmtQuantity) * (recipe.sellingPrice * 0.4),
    };

    setManagementMenuEntries((prev) => [newEntry, ...prev]);
    setSelectedMgmtRecipeId('');
    setMgmtQuantity(1);
  };

  const handleRemoveManagementMenu = (id: string) => {
    setManagementMenuEntries((prev) => prev.filter((m) => m.id !== id));
  };

  // =========================================================================
  // SECTION 6: WASTAGE / DAMAGE + INTER-BRANCH TRANSFER OUT
  // =========================================================================
  const [damageCounts, setDamageCounts] = useState<Record<string, number>>({});
  const [damageNotes, setDamageNotes] = useState<Record<string, string>>({});

  const [transferOutCounts, setTransferOutCounts] = useState<Record<string, number>>({});
  const [transferOutDestinations, setTransferOutDestinations] = useState<Record<string, string>>({});

  // =========================================================================
  // SECTION 7: ENDING PHYSICAL COUNT (Evening Count)
  // =========================================================================
  const [actualEndingCounts, setActualEndingCounts] = useState<Record<string, number>>({});

  // =========================================================================
  // LIVE STATION CLOUD SYNC (Firebase Firestore Submissions from Phones)
  // =========================================================================
  const [liveSubmissions, setLiveSubmissions] = useState<StationDailySubmission[]>([]);
  const [dismissLiveBanner, setDismissLiveBanner] = useState(false);

  useEffect(() => {
    const unsub = subscribeToStationSubmissions((subs) => {
      if (subs && subs.length > 0) {
        setLiveSubmissions(subs);
        setDismissLiveBanner(false);
      }
    });
    return () => unsub();
  }, []);

  const handleApplySubmissionToSheet = (sub: StationDailySubmission) => {
    if (!sub || !sub.itemCounts) return;

    setActualEndingCounts((prev) => {
      const updated = { ...prev };
      sub.itemCounts.forEach((c) => {
        if (c.endingCount > 0) updated[c.itemId] = c.endingCount;
      });
      return updated;
    });

    setDamageCounts((prev) => {
      const updated = { ...prev };
      sub.itemCounts.forEach((c) => {
        if (c.damageCount > 0) updated[c.itemId] = c.damageCount;
      });
      return updated;
    });

    setTransferOutCounts((prev) => {
      const updated = { ...prev };
      sub.itemCounts.forEach((c) => {
        if (c.transferOutCount > 0) updated[c.itemId] = c.transferOutCount;
      });
      return updated;
    });

    alert(
      language === 'am'
        ? `የ${sub.staffName} (${sub.station}) የቀጥታ ቆጠራ መረጃዎች ወደ እርስዎ የዕለቱ ሰንጠረዥ ገብተዋል!`
        : `Live counts from ${sub.staffName} (${sub.station}) applied directly to your daily sheet!`
    );
  };

  // Parser memo for Chef Quick Count Text Input
  const parsedChefEntries = useMemo(() => {
    if (!chefPasteText.trim()) return [];
    const lines = chefPasteText.split(/[\n,;]+/);
    const results: Array<{
      originalText: string;
      matchedItem: BranchTrackedItem | null;
      rawItem: InventoryItem | null;
      parsedQty: number;
    }> = [];

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      // Extract number (supports integers and decimals like 12, 12.5, 0.5)
      const numMatch = trimmed.match(/(\d+(?:\.\d+)?)/);
      if (!numMatch) return;
      const parsedQty = parseFloat(numMatch[1]);
      if (isNaN(parsedQty)) return;

      // Extract text part by removing digits, punctuation like : = -
      const cleanText = trimmed
        .replace(/(\d+(?:\.\d+)?)/g, '')
        .replace(/[:=–\-_()]/g, ' ')
        .trim()
        .toLowerCase();

      if (!cleanText) return;

      // Find best match in trackedItemsList
      let bestMatch: BranchTrackedItem | null = null;
      let matchedRaw: InventoryItem | null = null;
      let highestScore = 0;

      trackedItemsList.forEach((ti) => {
        const it = items.find((i) => i.id === ti.itemId);
        if (!it) return;

        const nameAm = (it.nameAm || '').toLowerCase();
        const nameEn = (it.nameEn || '').toLowerCase();
        const code = (it.code || '').toLowerCase();

        let score = 0;
        if (cleanText === nameAm || cleanText === nameEn) score = 100;
        else if (nameAm.includes(cleanText) || cleanText.includes(nameAm)) score = 80;
        else {
          const searchTokens = cleanText.split(/\s+/).filter((t) => t.length > 1);
          searchTokens.forEach((tok) => {
            if (nameAm.includes(tok)) score += 25;
            if (nameEn.includes(tok)) score += 20;
            if (code.includes(tok)) score += 15;
          });
        }

        if (score > highestScore && score >= 20) {
          highestScore = score;
          bestMatch = ti;
          matchedRaw = it;
        }
      });

      results.push({
        originalText: trimmed,
        matchedItem: bestMatch,
        rawItem: matchedRaw,
        parsedQty,
      });
    });

    return results;
  }, [chefPasteText, trackedItemsList, items]);

  const handleApplyChefParsedCounts = () => {
    const valid = parsedChefEntries.filter((e) => e.matchedItem !== null);
    if (valid.length === 0) {
      alert(language === 'am' ? 'ምንም የሚዛመድ ጥሬ እቃ አልተገኘም! እባክዎ ጽሁፉን ያረጋግጡ።' : 'No matching items found. Please check your text.');
      return;
    }

    if (chefPasteTarget === 'actual') {
      setActualEndingCounts((prev) => {
        const next = { ...prev };
        valid.forEach((e) => {
          if (e.matchedItem) next[e.matchedItem.itemId] = e.parsedQty;
        });
        return next;
      });
    } else if (chefPasteTarget === 'received') {
      setReceivedCounts((prev) => {
        const next = { ...prev };
        valid.forEach((e) => {
          if (e.matchedItem) next[e.matchedItem.itemId] = e.parsedQty;
        });
        return next;
      });
    } else {
      setBeginningCounts((prev) => {
        const next = { ...prev };
        valid.forEach((e) => {
          if (e.matchedItem) next[e.matchedItem.itemId] = e.parsedQty;
        });
        return next;
      });
    }

    setChefPasteText('');
    setChefSlipModalOpen(false);
    alert(
      language === 'am'
        ? `${valid.length} የሼፎች ቆጠራዎች ወዲያውኑ ወደ ሲስተም ተገልብጠዋል!`
        : `Successfully converted and applied ${valid.length} chef counts!`
    );
  };

  // =========================================================================
  // SHARED NORMALIZATION & ALIAS DICTIONARIES FOR ROCK-SOLID AUTO-MATCHING
  // =========================================================================

  // Amharic character normalization for high-accuracy phonetic matching
  const normalizeAmharic = (str: string): string => {
    return str
      .replace(/[ሐኀኻ]/g, 'ሀ')
      .replace(/[ሑኁ]/g, 'ሁ')
      .replace(/[ሒኂ]/g, 'ሂ')
      .replace(/[ሓኃ]/g, 'ሃ')
      .replace(/[ሔኄ]/g, 'ሄ')
      .replace(/[ሕኅ]/g, 'ህ')
      .replace(/[ሖኆ]/g, 'ሆ')
      .replace(/ሠ/g, 'ሰ')
      .replace(/ሡ/g, 'ሱ')
      .replace(/ሢ/g, 'ሲ')
      .replace(/ሣ/g, 'ሳ')
      .replace(/ሤ/g, 'ሴ')
      .replace(/ሥ/g, 'ስ')
      .replace(/ሦ/g, 'ሶ')
      .replace(/ዐ/g, 'አ')
      .replace(/ዑ/g, 'ኡ')
      .replace(/ዒ/g, 'ኢ')
      .replace(/ዓ/g, 'ኣ')
      .replace(/ዔ/g, 'ኤ')
      .replace(/ዕ/g, 'እ')
      .replace(/ዖ/g, 'ኦ')
      .replace(/ጸ/g, 'ፀ')
      .replace(/ጹ/g, 'ፁ')
      .replace(/ጺ/g, 'ፂ')
      .replace(/ጻ/g, 'ፃ')
      .replace(/ጼ/g, 'ፄ')
      .replace(/ጽ/g, 'ፅ')
      .replace(/ጾ/g, 'ፆ')
      .toLowerCase()
      .trim();
  };

  // Common raw material item aliases
  const COMMON_ALIASES: Record<string, string[]> = {
    'የበሬ ስጋ': ['ስጋ', 'beef', 'የበሬ', 'steak', 'minced beef'],
    'ዶሮ ደረት': ['ደረት', 'ዶሮ', 'chicken', 'breast', 'ቺከን', 'ቺክን'],
    'ሙሉ ዶሮ': ['ሙሉ ዶሮ', 'whole chicken'],
    'ቀይ ሽንኩርት': ['ሽንኩርት', 'ቀይሽንኩርት', 'onion', 'red onion'],
    'ነጭ ሽንኩርት': ['ነጭሽንኩርት', 'garlic', 'ጋርሊክ'],
    'ቲማቲም': ['tomato', 'ቶማቶ'],
    'ድንች': ['ቺፕስ', 'chips', 'french fries', 'potato', 'ፖቴቶ'],
    'በርገር ዳቦ': ['ቡን', 'bun', 'burger bun', 'በርገር'],
    'ሳንድዊች ዳቦ': ['ሳንድዊች', 'toast', 'bread', 'ዳቦ'],
    'አይብ': ['ቺዝ', 'cheese', 'mozzarella', 'ሞዛሬላ', 'ቼዳር', 'cheddar'],
    'እንቁላል': ['egg', 'eggs'],
    'ዘይት': ['cooking oil', 'oil'],
    'ስኳር': ['sugar'],
    'ወተት': ['milk'],
    'ቡና': ['የቡና ፍሬ', 'coffee', 'beans'],
    'ሻይ ቅጠል': ['ሻይ', 'tea', 'tea leaves'],
    'ማዮኔዝ': ['mayo', 'mayonnaise'],
    'ኬቻፕ': ['ketchup', 'catsup'],
    'ሰናፍጭ': ['mustard', 'ሠናፍጭ'],
    'አቦካዶ': ['avocado', 'አቮካዶ'],
    'ማንጎ': ['mango'],
    'ብርቱካን': ['orange'],
    'ሙዝ': ['banana'],
    'ሎሚ': ['lemon', 'lime'],
    'ፓፓያ': ['papaya'],
    'አናናስ': ['pineapple'],
    'ሀባብ': ['watermelon', 'ሐባብ'],
    'እንጆሪ': ['strawberry'],
    'ቱና': ['tuna'],
    'ቋሊማ': ['sausage', 'ሶሴጅ'],
    'ሞርታዴላ': ['mortadella'],
    'እንጉዳይ': ['mushroom'],
    'ፒዛ ሶስ': ['pizza sauce'],
    'ሶያ ሶስ': ['soya sauce', 'soy sauce'],
    'ጨው': ['salt'],
    'በርበሬ': ['berbere'],
    'ሚጥሚጣ': ['mitmita'],
    'ዝንጅብል': ['ginger'],
    'ከሪ ፓውደር': ['curry', 'ከሪ'],
    'እርድ': ['turmeric'],
    'እርጎ': ['yogurt'],
    'አይስክሬም': ['ice cream'],
    'ማር': ['honey'],
    'ዱቄት': ['flour'],
    'ፓስታ': ['pasta'],
    'ማካሮኒ': ['macaroni'],
    'ሩዝ': ['rice'],
    'ቅቤ': ['butter'],
  };

  // Common dish aliases for Chef and Cashier POS reports
  const RECIPE_ALIASES: Record<string, string[]> = {
    'ስፔሻል ቢፍ በርገር': ['ቢፍ በርገር', 'በርገር', 'ስፔሻል በርገር', 'burger', 'beef burger'],
    'ቺዝ በርገር': ['ቺዝበርገር', 'cheese burger', 'cheeseburger'],
    'ዶሮ በርገር': ['ቺከን በርገር', 'chicken burger'],
    'ድርብ ቢፍ በርገር': ['ድርብ በርገር', 'double burger', 'double beef'],
    'ክለብ ሳንድዊች': ['ክለብ', 'club sandwich', 'ሳንድዊች'],
    'የዶሮ ሳንድዊች': ['ዶሮ ሳንድዊች', 'chicken sandwich'],
    'የቱና ሳንድዊች': ['ቱና ሳንድዊች', 'tuna sandwich'],
    'ስፔሻል ጥብስ': ['ጥብስ', 'የበሬ ጥብስ', 'ስፔሻል የበሬ ጥብስ', 'tibs', 'beef tibs'],
    'የዶሮ ጥብስ': ['ዶሮ ጥብስ', 'chicken tibs'],
    'ስፓጌቲ ቦሎኔዝ': ['ቦሎኔዝ', 'ስፓጌቲ', 'spaghetti', 'bolognese', 'pasta bolognese'],
    'ስፓጌቲ ቱና': ['ቱና ስፓጌቲ', 'tuna spaghetti'],
    'ታሌቴሊ አልፍሬዶ': ['አልፍሬዶ', 'ታሌቴሊ', 'tagliatelle', 'alfredo'],
    'ፔኔ አራቢያታ': ['አራቢያታ', 'ፔኔ', 'arrabbiata', 'penne'],
    'ማርገሪታ ፒዛ': ['ማርገሪታ', 'margherita', 'ፒዛ'],
    'ቢፍ ፒዛ': ['የበሬ ፒዛ', 'beef pizza'],
    'ዶሮ ፒዛ': ['የዶሮ ፒዛ', 'chicken pizza'],
    'ቱና ፒዛ': ['tuna pizza'],
    'አቮካዶ ጁስ': ['አቦካዶ ጁስ', 'አቮካዶ', 'avocado juice', 'avocado'],
    'ማንጎ ጁስ': ['ማንጎ', 'mango juice', 'mango'],
    'ስፕሪስ ጁስ': ['ስፕሪስ', 'spris'],
    'ስፔሻል ጁስ': ['special juice'],
    'እንጆሪ ጁስ': ['እንጆሪ', 'strawberry juice'],
    'ሀባብ ጁስ': ['ሐባብ ጁስ', 'ሀባብ', 'watermelon juice'],
    'ፓፓያ ጁስ': ['ፓፓያ', 'papaya juice'],
    'ብርቱካን ጁስ': ['ብርቱካን', 'orange juice'],
    'ማኪያቶ': ['macchiato'],
    'ካፑቺኖ': ['cappuccino'],
    'ሻይ': ['tea', 'black tea'],
    'ስፔሻል ሻይ': ['special tea'],
    'ጥቁር ቡና': ['ቡና', 'coffee', 'black coffee'],
    'ፍሬሽ ወተት': ['ወተት', 'milk', 'fresh milk'],
    'ቺፕስ': ['ፈረንሳይኛ ጥብስ', 'chips', 'french fries', 'fries'],
    'ስፕሪንግ ሮል': ['spring roll', 'ስፕሪንግሮል'],
  };

  // Local deterministic fallback matcher (ensures 100% operation offline and instant live preview)
  const runLocalFallbackMatcher = (forcedDocType?: FnbDocType, forcedText?: string) => {
    const type = forcedDocType || fnbDocType;
    const text = (forcedText !== undefined ? forcedText : chefPasteText).trim();
    if (!text) return;

    const lines = text.split(/[\r\n]+/);
    const matchedList: FnbMatchedItem[] = [];
    const needsReviewList: FnbNeedsReviewItem[] = [];
    const newItemsList: FnbNewItem[] = [];
    const seenIds = new Set<string>();

    let statedSheetTotal: number | null = null;
    let calculatedSheetTotal = 0;

    const isRawMaterialDoc = type === 'BEGINNING_BALANCE' || type === 'ENDING_BALANCE' || type === 'DAMAGE';

    lines.forEach((line) => {
      const rawLine = line.trim();
      if (!rawLine || rawLine.startsWith('---') || rawLine.startsWith('===')) return;

      // Skip common Excel header lines
      const lower = rawLine.toLowerCase();
      if (
        (lower.includes('item') || lower.includes('dish') || lower.includes('food') || lower.includes('name') || lower.includes('no')) &&
        (lower.includes('qty') || lower.includes('price') || lower.includes('total') || lower.includes('count') || lower.includes('beg') || lower.includes('end'))
      ) return;
      if (
        (rawLine.includes('ስም') || rawLine.includes('ምግብ') || rawLine.includes('እቃ') || rawLine.includes('ተ.ቁ')) &&
        (rawLine.includes('ብዛት') || rawLine.includes('ዋጋ') || rawLine.includes('ድምር') || rawLine.includes('መነሻ') || rawLine.includes('መዝጊያ') || rawLine.includes('የተሸጠ'))
      ) return;

      // Check for sheet total line (e.g. Total: 27960, ድምር: 37270)
      if (rawLine.match(/(?:ጠቅላላ\s*ድምር|ድምር|total|grand\s*total)[:=\s]+(\d+(?:\.\d+)?)/i)) {
        const totalMatch = rawLine.match(/(?:ጠቅላላ\s*ድምር|ድምር|total|grand\s*total)[:=\s]+(\d+(?:\.\d+)?)/i);
        if (totalMatch) {
          statedSheetTotal = parseFloat(totalMatch[1]);
        }
        return;
      }

      // Check if delimited (Tab, Comma, Semicolon, Pipe)
      let parts: string[] = [];
      if (rawLine.includes('\t')) parts = rawLine.split('\t');
      else if (rawLine.includes(',')) parts = rawLine.split(',');
      else if (rawLine.includes(';')) parts = rawLine.split(';');
      else if (rawLine.includes('|')) parts = rawLine.split('|');

      while (parts.length > 0 && parts[parts.length - 1].trim() === '') parts.pop();

      if (isRawMaterialDoc) {
        // ==========================================
        // RAW MATERIAL MATCHING (ITEM_LIST / DAMAGE)
        // ==========================================
        let converted = false;
        let detectedUnit = 'kg';
        let parsedQty = 0;
        let cleanName = '';
        let damageNote = '';

        if (parts.length >= 2) {
          let nameCand = parts[0].trim();
          let valParts = parts.slice(1);
          // Check if parts[0] is an index (1, 1., #1, etc.)
          if (/^\s*#?\d{1,4}[\.\)\-:]?\s*$/.test(parts[0]) && parts.length >= 2) {
            nameCand = parts[1].trim();
            valParts = parts.slice(2);
          }
          cleanName = nameCand
            .replace(/^\s*#?\d{1,4}[\.\)\-:\s]+/, '')
            .replace(/\([^)]*\)/g, ' ')
            .replace(/[:=–\-_/]/g, ' ')
            .trim();

          for (const vp of valParts) {
            const vTrim = vp.trim();
            if (!vTrim) continue;
            // Reason text for damage
            if (type === 'DAMAGE' && /[a-zA-Z\u1200-\u137F]/.test(vTrim) && !/^(kg|kilo|pcs|lt|g|gm|ሊትር|ፍሬ|ኪግ)$/i.test(vTrim)) {
              damageNote = vTrim;
              continue;
            }
            if (/^(kg|kilo|pcs|lt|g|gm|ሊትር|ፍሬ|ኪግ)$/i.test(vTrim)) {
              detectedUnit = vTrim.toLowerCase();
              continue;
            }
            const numMatch = vTrim.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
            if (numMatch && parsedQty === 0) {
              parsedQty = parseFloat(numMatch[0]);
            }
          }
        } else {
          // Free text line (e.g. "የበሬ ስጋ 1.5 ኪግ የተበላሸ" or "1. ቲማቲም 2 ኪግ")
          let working = rawLine.replace(/^\s*#?\d{1,4}[\.\)\-:\s]+/, '').trim();

          // Check grams
          const gramMatch = working.match(/(\d+(?:\.\d+)?)\s*(?:g|gm|gram|ግራም)\b/i);
          if (gramMatch) {
            parsedQty = parseFloat(gramMatch[1]) / 1000;
            converted = true;
            detectedUnit = 'kg';
            working = working.replace(gramMatch[0], ' ');
          } else {
            const numMatch = working.match(/(\d+(?:\.\d+)?)/);
            if (numMatch) {
              parsedQty = parseFloat(numMatch[1]);
              working = working.replace(numMatch[0], ' ');
            }
            if (working.match(/(?:lt|liter|ሊትር)/i)) detectedUnit = 'lt';
            else if (working.match(/(?:pcs|piece|ፍሬ|ቁጥር)/i)) detectedUnit = 'pcs';
            else if (working.match(/(?:kg|kilo|ኪ\.?ግ)/i)) detectedUnit = 'kg';
          }

          if (type === 'DAMAGE') {
            const noteMatch = working.match(/(የተበላሸ|የበሰበሰ|የተሰበረ|የኮመጠጠ|የደረቀ|የተጎዳ|spoilage|damaged|broken|expired)/i);
            if (noteMatch) {
              damageNote = noteMatch[0];
              working = working.replace(noteMatch[0], ' ');
            }
          }

          cleanName = working
            .replace(/(?:kg|kilo|ኪ\.?ግ|lt|liter|ሊትር|pcs|piece|ፍሬ|g|gm|gram|ግራም)/gi, '')
            .replace(/[:=–\-_()]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        }

        if (!cleanName && parsedQty === 0) return;
        const normKey = normalizeAmharic(cleanName);

        // Match against tracked items
        let bestItem: InventoryItem | null = null;
        let bestTi: BranchTrackedItem | null = null;
        let score = 0;

        for (const ti of trackedItemsList) {
          const it = items.find((i) => i.id === ti.itemId);
          if (!it) continue;

          const nAm = (it.nameAm || '').toLowerCase();
          const nEn = (it.nameEn || '').toLowerCase();
          const normAm = normalizeAmharic(nAm);

          let s = 0;
          if (cleanName === nAm || cleanName === nEn || normKey === normAm) s = 100;
          else if (normAm.includes(normKey) || normKey.includes(normAm)) s = 85;
          else if (nEn.includes(cleanName) || cleanName.includes(nEn)) s = 75;
          else {
            for (const [canonicalName, aliases] of Object.entries(COMMON_ALIASES)) {
              const normCanonical = normalizeAmharic(canonicalName);
              if (normAm.includes(normCanonical) || normCanonical.includes(normAm)) {
                if (aliases.some((a) => normKey.includes(normalizeAmharic(a)))) {
                  s = Math.max(s, 75);
                }
              }
            }
            const tokens = normKey.split(/\s+/).filter((t) => t.length > 1);
            for (const tok of tokens) {
              if (normAm.includes(tok)) s += 30;
              if (nEn.includes(tok)) s += 25;
            }
          }

          if (s > score && s >= 25) {
            score = s;
            bestItem = it;
            bestTi = ti;
          }
        }

        // If not in trackedItemsList, search master inventory (134 items)
        if (!bestItem) {
          for (const it of items) {
            const nAm = (it.nameAm || '').toLowerCase();
            const normAm = normalizeAmharic(nAm);
            let s = 0;
            if (cleanName === nAm || normKey === normAm) s = 100;
            else if (normAm.includes(normKey) || normKey.includes(normAm)) s = 85;
            else {
              for (const [canonicalName, aliases] of Object.entries(COMMON_ALIASES)) {
                const normCanonical = normalizeAmharic(canonicalName);
                if (normAm.includes(normCanonical) || normCanonical.includes(normAm)) {
                  if (aliases.some((a) => normKey.includes(normalizeAmharic(a)))) {
                    s = Math.max(s, 75);
                  }
                }
              }
            }
            if (s > score && s >= 30) {
              score = s;
              bestItem = it;
              if (currentBranch) {
                bestTi = {
                  id: `${currentBranch.id}_${it.id}`,
                  branchId: currentBranch.id,
                  itemId: it.id,
                  countUnit: it.unit,
                  countUnitAm: it.unitAm,
                  isActive: true,
                  conversionFactor: 1,
                  enableCrossCheck: false,
                  addedAt: new Date().toISOString(),
                };
              }
            }
          }
        }

        if (bestItem && bestTi) {
          const isDuplicate = seenIds.has(bestItem.id);
          seenIds.add(bestItem.id);

          const confidence: 'ከፍተኛ' | 'መካከለኛ' | 'ዝቅተኛ' =
            score >= 80 ? 'ከፍተኛ' : score >= 50 ? 'መካከለኛ' : 'ዝቅተኛ';

          matchedList.push({
            id: bestItem.id,
            name: cleanName || rawLine,
            matched_system_name: bestItem.nameAm,
            quantity: parsedQty,
            unit: bestTi.countUnitAm || bestTi.countUnit || detectedUnit,
            confidence,
            converted,
            unit_price: bestItem.lastPurchasePrice || 0,
            line_total: parsedQty * (bestItem.lastPurchasePrice || 0),
            calc_error: false,
            warning: isDuplicate ? 'ድግግሞሽ (Duplicate Item)' : damageNote || null,
            note: damageNote || null,
          });
        } else if (cleanName) {
          newItemsList.push({
            raw_name: cleanName,
            quantity: parsedQty,
            unit: detectedUnit,
            unit_price: 0,
          });
        }
      } else {
        // ==========================================
        // SALES MATCHING (CHEF_SOLD_LIST or CASHIER_SALES)
        // ==========================================
        let qty = 0;
        let unitPrice = 0;
        let lineTotal = 0;
        let cleanName = '';

        if (parts.length >= 2) {
          let nameCand = parts[0].trim();
          let valParts = parts.slice(1);
          // Check if parts[0] is an index (1, 1., #1, etc.)
          if (/^\s*#?\d{1,4}[\.\)\-:]?\s*$/.test(parts[0]) && parts.length >= 2) {
            nameCand = parts[1].trim();
            valParts = parts.slice(2);
          }
          cleanName = nameCand
            .replace(/^\s*#?\d{1,4}[\.\)\-:\s]+/, '')
            .replace(/\([^)]*\)/g, ' ')
            .replace(/[:=–\-_/]/g, ' ')
            .trim();

          const nums: number[] = [];
          for (const vp of valParts) {
            const vTrim = vp.trim();
            if (!vTrim) continue;
            const parsed = parseFloat(vTrim.replace(/,/g, '').replace(/[^\d.-]/g, ''));
            if (!isNaN(parsed)) nums.push(parsed);
          }

          if (nums.length >= 3) {
            qty = nums[0];
            unitPrice = nums[1];
            lineTotal = nums[2];
          } else if (nums.length === 2) {
            qty = nums[0];
            unitPrice = nums[1];
            lineTotal = qty * unitPrice;
          } else if (nums.length === 1) {
            qty = nums[0];
          }
        } else {
          // Free text line: e.g. "1. ስፓጌቲ ቦሎኔዝ 12 x 350 = 4200" or "ኮኮናት በርገር 15"
          let working = rawLine.replace(/^\s*#?\d{1,4}[\.\)\-:\s]+/, '').trim();

          // Check format: DishName Qty x Price = LineTotal
          const calcMatch = working.match(/(.+?)\s+(\d+(?:\.\d+)?)\s*[xX*]\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/);
          if (calcMatch) {
            cleanName = calcMatch[1].trim();
            qty = parseFloat(calcMatch[2]);
            unitPrice = parseFloat(calcMatch[3]);
            lineTotal = parseFloat(calcMatch[4]);
          } else {
            // General format: Name Qty [Price] [Total]
            const allNums = working.match(/\d+(?:\.\d+)?/g);
            if (allNums && allNums.length >= 1) {
              qty = parseFloat(allNums[0]);
              if (allNums.length >= 2) unitPrice = parseFloat(allNums[1]);
              if (allNums.length >= 3) lineTotal = parseFloat(allNums[2]);
              else if (unitPrice > 0) lineTotal = qty * unitPrice;
            }
            cleanName = working
              .replace(/\d+(?:\.\d+)?/g, '')
              .replace(/[:=–\-_()xX*]/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
          }
        }

        if (!cleanName && qty === 0) return;
        const normKey = normalizeAmharic(cleanName);

        // Match against branchRecipes
        let bestRecipe: Recipe | null = null;
        let score = 0;

        for (const r of branchRecipes) {
          const nAm = (r.nameAm || '').toLowerCase();
          const nEn = (r.nameEn || '').toLowerCase();
          const normAm = normalizeAmharic(nAm);

          let s = 0;
          if (cleanName === nAm || cleanName === nEn || normKey === normAm) s = 100;
          else if (normAm.includes(normKey) || normKey.includes(normAm)) s = 85;
          else if (nEn.includes(cleanName) || cleanName.includes(nEn)) s = 75;
          else {
            // Check recipe aliases
            for (const [canonicalDish, aliases] of Object.entries(RECIPE_ALIASES)) {
              const normCanonical = normalizeAmharic(canonicalDish);
              if (normAm.includes(normCanonical) || normCanonical.includes(normAm)) {
                if (aliases.some((a) => normKey.includes(normalizeAmharic(a)))) {
                  s = Math.max(s, 80);
                }
              }
            }
            const tokens = normKey.split(/\s+/).filter((t) => t.length > 1);
            for (const tok of tokens) {
              if (normAm.includes(tok)) s += 30;
              if (nEn.includes(tok)) s += 25;
            }
          }

          if (s > score && s >= 25) {
            score = s;
            bestRecipe = r;
          }
        }

        if (bestRecipe) {
          const isDuplicate = seenIds.has(bestRecipe.id);
          seenIds.add(bestRecipe.id);

          const officialPrice = bestRecipe.sellingPrice || 0;
          const priceUsed = unitPrice > 0 ? unitPrice : officialPrice;
          const calculatedLine = qty * priceUsed;
          if (lineTotal === 0) lineTotal = calculatedLine;

          const isCalcMismatch = type === 'CASHIER_SALES' && Math.abs(calculatedLine - lineTotal) > 1;
          calculatedSheetTotal += lineTotal;

          const confidence: 'ከፍተኛ' | 'መካከለኛ' | 'ዝቅተኛ' =
            score >= 80 ? 'ከፍተኛ' : score >= 50 ? 'መካከለኛ' : 'ዝቅተኛ';

          matchedList.push({
            id: bestRecipe.id,
            name: cleanName || rawLine,
            matched_system_name: bestRecipe.nameAm,
            quantity: qty,
            unit: 'portion',
            confidence,
            converted: false,
            unit_price: priceUsed,
            line_total: lineTotal,
            calc_error: isCalcMismatch,
            warning: isCalcMismatch
              ? 'ስሌት አይመጣጠንም (Price x Qty ≠ Total)'
              : isDuplicate
              ? 'ድግግሞሽ (Duplicate Dish)'
              : null,
          });
        } else if (cleanName) {
          newItemsList.push({
            raw_name: cleanName,
            quantity: qty,
            unit: 'portion',
            unit_price: unitPrice,
          });
        }
      }
    });

    const sheetTotalResult: FnbSheetTotal = {
      stated: statedSheetTotal,
      calculated: calculatedSheetTotal,
      matches: statedSheetTotal !== null ? Math.abs(statedSheetTotal - calculatedSheetTotal) < 1 : true,
      difference: statedSheetTotal !== null ? Math.round((calculatedSheetTotal - statedSheetTotal) * 100) / 100 : 0,
    };

    setAiMatchResult({
      doc_type: type,
      matched: matchedList,
      needs_review: needsReviewList,
      new_items: newItemsList,
      sheet_total: sheetTotalResult,
    });
  };

  const handleRunAiMatch = async () => {
    if (!chefPasteText.trim()) return;
    setIsAiMatching(true);
    setAiMatchError(null);

    const itemList = trackedItemsList.map((ti) => {
      const it = items.find((i) => i.id === ti.itemId);
      return {
        id: ti.itemId,
        name: it?.nameAm || it?.nameEn || ti.itemId,
        nameEn: it?.nameEn || '',
        code: it?.code || '',
        unit: ti.countUnitAm || ti.countUnit || it?.unit || 'kg',
        aliases: [it?.nameEn, it?.code].filter(Boolean),
      };
    });

    const menuList = branchRecipes.map((r) => ({
      id: r.id,
      name: r.nameAm,
      nameEn: r.nameEn || '',
      price: r.sellingPrice,
      aliases: [r.nameEn].filter(Boolean),
    }));

    try {
      const res = await fetch('/api/match-fnb-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc_type: fnbDocType,
          pasted_data: chefPasteText,
          item_list: itemList,
          menu_list: menuList,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setAiMatchResult(json.data);
      } else {
        runLocalFallbackMatcher();
      }
    } catch {
      runLocalFallbackMatcher();
    } finally {
      setIsAiMatching(false);
    }
  };

  const handleApplyMatchedData = () => {
    if (!aiMatchResult || aiMatchResult.matched.length === 0) return;

    let count = 0;
    if (fnbDocType === 'BEGINNING_BALANCE') {
      setBeginningCounts((prev) => {
        const next = { ...prev };
        aiMatchResult.matched.forEach((m) => {
          if (m.id) {
            next[m.id] = m.quantity;
            count++;
          }
        });
        return next;
      });
      setApplySuccessNotice(
        language === 'am'
          ? `✅ ${count} የመነሻ ባላንስ እቃዎች በተሳካ ሁኔታ ተሞልተዋል!`
          : `✅ Applied ${count} beginning balance counts!`
      );
    } else if (fnbDocType === 'ENDING_BALANCE') {
      setActualEndingCounts((prev) => {
        const next = { ...prev };
        aiMatchResult.matched.forEach((m) => {
          if (m.id) {
            next[m.id] = m.quantity;
            count++;
          }
        });
        return next;
      });
      setApplySuccessNotice(
        language === 'am'
          ? `✅ ${count} የመዝጊያ/የጠዋት ቆጠራ እቃዎች በተሳካ ሁኔታ ተሞልተዋል!`
          : `✅ Applied ${count} ending physical counts!`
      );
    } else if (fnbDocType === 'CHEF_SOLD_LIST') {
      setChefMenuSales((prev) => {
        const next = { ...prev };
        aiMatchResult.matched.forEach((m) => {
          if (m.id) {
            next[m.id] = m.quantity;
            count++;
          }
        });
        return next;
      });
      setApplySuccessNotice(
        language === 'am'
          ? `✅ ${count} የሼፍ ሽያጭ ምግቦች በተሳካ ሁኔታ ተሞልተዋል!`
          : `✅ Applied ${count} chef sold dishes!`
      );
    } else if (fnbDocType === 'CASHIER_SALES') {
      setCashierMenuSales((prev) => {
        const next = { ...prev };
        aiMatchResult.matched.forEach((m) => {
          if (m.id) {
            next[m.id] = m.quantity;
            count++;
          }
        });
        return next;
      });
      setApplySuccessNotice(
        language === 'am'
          ? `✅ ${count} የካሸር ሽያጭ ምግቦች በተሳካ ሁኔታ ተሞልተዋል!`
          : `✅ Applied ${count} cashier billed dishes!`
      );
    } else if (fnbDocType === 'DAMAGE') {
      setDamageCounts((prev) => {
        const next = { ...prev };
        aiMatchResult.matched.forEach((m) => {
          if (m.id) {
            next[m.id] = m.quantity;
            count++;
          }
        });
        return next;
      });
      setDamageNotes((prev) => {
        const next = { ...prev };
        aiMatchResult.matched.forEach((m) => {
          if (m.id && (m.note || m.warning)) {
            next[m.id] = m.note || m.warning || 'ብክነት';
          }
        });
        return next;
      });
      setApplySuccessNotice(
        language === 'am'
          ? `✅ ${count} የብክነት/ዳሜጅ ዕቃዎች በተሳካ ሁኔታ ተሞልተዋል!`
          : `✅ Applied ${count} damage / spoilage items!`
      );
    }

    // Auto-save changes immediately into persistent DB and backend
    setTimeout(() => {
      handleSaveDayAudit();
    }, 200);

    setTimeout(() => {
      setApplySuccessNotice(null);
      setChefSlipModalOpen(false);
    }, 1200);
  };

  // Helper functions for Instant Paste, Upload, and Drop across all sections
  const handleOpenFnbMatcher = (docType: FnbDocType) => {
    setFnbDocType(docType);
    if (docType === 'CHEF_SOLD_LIST') setChefPasteTarget('actual');
    else if (docType === 'BEGINNING_BALANCE') setChefPasteTarget('beginning');
    else if (docType === 'ENDING_BALANCE') setChefPasteTarget('actual');
    setChefSlipTab('parser');
    setChefSlipModalOpen(true);
    if (chefPasteText.trim()) {
      runLocalFallbackMatcher(docType, chefPasteText);
    }
  };

  const parseFnbTextAndOpenModal = (docType: FnbDocType, text: string) => {
    const trimmed = text.trim();
    setFnbDocType(docType);
    setChefPasteText(trimmed);
    setChefSlipTab('parser');
    setChefSlipModalOpen(true);
    if (trimmed) {
      runLocalFallbackMatcher(docType, trimmed);
    }
  };

  const handleFnbFileUpload = (docType: FnbDocType, file: File) => {
    const fileName = file.name.toLowerCase();
    const isBinaryExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    if (isBinaryExcel) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const buffer = event.target?.result as ArrayBuffer;
        if (buffer) {
          try {
            const workbook = XLSX.read(buffer, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const tsv = XLSX.utils.sheet_to_csv(worksheet, { FS: '\t' });
            if (tsv && tsv.trim()) {
              parseFnbTextAndOpenModal(docType, tsv.trim());
            }
          } catch (err) {
            console.error('F&B Excel parse error:', err);
            alert(language === 'am' ? 'የኤክሴል ፋይሉን ማንበብ አልተቻለም። እባክዎ ኮፒ አድርገው ፔስት ያድርጉ።' : 'Could not read Excel file.');
          }
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result;
        if (typeof content === 'string' && content.trim()) {
          parseFnbTextAndOpenModal(docType, content.trim());
        }
      };
      reader.readAsText(file);
    }
  };

  const handleFnbInstantPaste = async (docType: FnbDocType) => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        parseFnbTextAndOpenModal(docType, text.trim());
      } else {
        handleOpenFnbMatcher(docType);
      }
    } catch (err) {
      console.warn('Clipboard read permission restricted by browser:', err);
      handleOpenFnbMatcher(docType);
    }
  };

  const handleFnbFileDrop = (docType: FnbDocType, e: React.DragEvent) => {
    e.preventDefault();
    if (docType === 'CHEF_SOLD_LIST') setIsDraggingChefFile(false);
    else if (docType === 'CASHIER_SALES') setIsDraggingCashierFile(false);
    else if (docType === 'DAMAGE') setIsDraggingDamageFile(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFnbFileUpload(docType, file);
    }
  };

  const handleCopyChefTemplate = () => {
    const header = `📋 ${currentBranch?.nameAm || 'የቅርንጫፍ'} - የሼፎች ፈጣን ቆጠራ ፎርም\nቀን፦ ${formatEthiopianDate(selectedDate, 'am')} (${selectedDate})\n----------------------------------------\n`;
    const rows = trackedItemsList
      .map((ti, idx) => {
        const it = items.find((i) => i.id === ti.itemId);
        const name = it?.nameAm || it?.nameEn || ti.itemId;
        const unit = ti.countUnitAm || ti.countUnit;
        return `${idx + 1}. ${name} (${unit}) = `;
      })
      .join('\n');
    const footer = `\n----------------------------------------\n👉 ከላይ ባለው ዝርዝር ላይ የቀኑን ቆጠራ ቁጥር ብቻ ጽፈው መልሰው ይላኩልን!`;
    const full = header + rows + footer;
    navigator.clipboard.writeText(full);
    setCopiedChefTemplate(true);
    setTimeout(() => setCopiedChefTemplate(false), 3000);
  };

  // =========================================================================
  // 4-COLUMN STOCK EXCEL IMPORTER (BEGINNING, RECEIVED, ENDING, TRANSFER)
  // =========================================================================

  const parsedStockExcelRows = useMemo(() => {
    if (!stockExcelText.trim()) return [];

    const lines = stockExcelText.split(/[\r\n]+/);
    const results: Array<{
      rawText: string;
      rawName: string;
      matchedItem: BranchTrackedItem | null;
      rawItem: InventoryItem | null;
      beginning: number;
      received: number;
      ending: number;
      transfer: number;
      confidence: 'ከፍተኛ' | 'መካከለኛ' | 'ዝቅተኛ' | 'አልተገኘም';
    }> = [];

    const knownUnitsRegex = /^(kg|k\.g\.?|kilo|gram|gm|g|liter|litre|lit|l|pcs|pc|piece|pieces|pack|carton|box|bottle|bottles|portion|can|cans|ኪግ|ኪ\.ግ|ኪሎ|ግራም|ግ|ሊትር|ሊ|ፍሬ|ቁጥር|ካርቶን|ሳጥን|ጠርሙስ|ጣሳ|ሰው|ፖርሽን|ጥቅል|ባኮ|unit)$/i;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('---') || trimmed.startsWith('===')) continue;

      // Skip common Excel header lines
      const lower = trimmed.toLowerCase();
      if (
        (lower.includes('item') || lower.includes('name') || lower.includes('desc') || lower.includes('no')) &&
        (lower.includes('beg') || lower.includes('rec') || lower.includes('end') || lower.includes('trans') || lower.includes('qty') || lower.includes('bal'))
      ) continue;
      if (
        (trimmed.includes('ስም') || trimmed.includes('እቃ') || trimmed.includes('ተ.ቁ') || trimmed.includes('ኮድ')) &&
        (trimmed.includes('መነሻ') || trimmed.includes('ገቢ') || trimmed.includes('መዝጊያ') || trimmed.includes('የተላከ') || trimmed.includes('ቆጠራ') || trimmed.includes('ተቀበሉት'))
      ) continue;

      // Split by tab (Excel copy/paste), comma (CSV), semicolon, or pipe
      let parts: string[] = [];
      if (trimmed.includes('\t')) {
        parts = trimmed.split('\t');
      } else if (trimmed.includes(',')) {
        parts = trimmed.split(',');
      } else if (trimmed.includes(';')) {
        parts = trimmed.split(';');
      } else if (trimmed.includes('|')) {
        parts = trimmed.split('|');
      }

      // Strip trailing empty cells
      while (parts.length > 0 && parts[parts.length - 1].trim() === '') {
        parts.pop();
      }

      let rawName = '';
      let beginning = 0;
      let received = 0;
      let ending = 0;
      let transfer = 0;

      if (parts.length >= 2) {
        let nameCandidate = '';
        let valueParts: string[] = [];

        // Check if parts[0] is just a row index (e.g., "1", "1.", "#1", "ITM-01", "01") and parts[1] is the actual item name
        const isPart0Index = /^\s*#?\d{1,4}[\.\)\-:]?\s*$/.test(parts[0]) || /^\s*itm-?\d+\s*$/i.test(parts[0]);
        if (isPart0Index && parts.length >= 2 && !/^\s*-?\d+(?:\.\d+)?\s*$/.test(parts[1])) {
          nameCandidate = parts[1].trim();
          valueParts = parts.slice(2);
        } else {
          nameCandidate = parts[0].trim();
          valueParts = parts.slice(1);
        }

        // Clean nameCandidate: remove leading numbers, parenthesized units, symbols
        rawName = nameCandidate
          .replace(/^\s*#?\d{1,4}[\.\)\-:\s]+/, '')
          .replace(/\([^)]*\)/g, ' ')
          .replace(/\[[^\]]*\]/g, ' ')
          .replace(/[:=–\-_/]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim() || nameCandidate;

        const numericParts: number[] = [];
        for (const vp of valueParts) {
          const vTrim = vp.trim();
          if (!vTrim) continue;
          if (knownUnitsRegex.test(vTrim)) continue; // skip unit column

          let cleanedNumStr = vTrim;
          if (/^\d+,\d{1,2}$/.test(cleanedNumStr)) {
            cleanedNumStr = cleanedNumStr.replace(',', '.');
          } else {
            cleanedNumStr = cleanedNumStr.replace(/,/g, '');
          }
          const numMatch = cleanedNumStr.match(/-?\d+(?:\.\d+)?/);
          if (numMatch) {
            const parsed = parseFloat(numMatch[0]);
            if (!isNaN(parsed)) numericParts.push(parsed);
          }
        }

        if (numericParts.length >= 4) {
          beginning = numericParts[0];
          received = numericParts[1];
          ending = numericParts[2];
          transfer = numericParts[3];
        } else if (numericParts.length === 3) {
          beginning = numericParts[0];
          received = numericParts[1];
          ending = numericParts[2];
        } else if (numericParts.length === 2) {
          beginning = numericParts[0];
          ending = numericParts[1];
        } else if (numericParts.length === 1) {
          ending = numericParts[0];
        }
      } else {
        // Space separated line or labeled line
        const begMatch = trimmed.match(/(?:መነሻ|beginning|beg)[:\s]+(-?\d+(?:\.\d+)?)/i);
        const recMatch = trimmed.match(/(?:ገቢ|ተቀበሉት|received|rec)[:\s]+(-?\d+(?:\.\d+)?)/i);
        const endMatch = trimmed.match(/(?:መዝጊያ|እጃቸው|ending|end)[:\s]+(-?\d+(?:\.\d+)?)/i);
        const transMatch = trimmed.match(/(?:ተላከ|የተላከ|transfer|trans)[:\s]+(-?\d+(?:\.\d+)?)/i);

        if (begMatch || recMatch || endMatch || transMatch) {
          if (begMatch) beginning = parseFloat(begMatch[1]);
          if (recMatch) received = parseFloat(recMatch[1]);
          if (endMatch) ending = parseFloat(endMatch[1]);
          if (transMatch) transfer = parseFloat(transMatch[1]);
          rawName = trimmed
            .replace(/(?:መነሻ|beginning|beg)[:\s]+(-?\d+(?:\.\d+)?)/gi, '')
            .replace(/(?:ገቢ|ተቀበሉት|received|rec)[:\s]+(-?\d+(?:\.\d+)?)/gi, '')
            .replace(/(?:መዝጊያ|እጃቸው|ending|end)[:\s]+(-?\d+(?:\.\d+)?)/gi, '')
            .replace(/(?:ተላከ|የተላከ|transfer|trans)[:\s]+(-?\d+(?:\.\d+)?)/gi, '')
            .replace(/^\s*#?\d+[\.\)\-:\s]+/, '')
            .replace(/\([^)]*\)/g, ' ')
            .replace(/[:=–\-_/]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        } else {
          // Space-delimited: ItemName Beg Rec End Trans
          const allNums = trimmed.match(/(-?\d+(?:\.\d+)?)/g);
          if (allNums && allNums.length >= 1) {
            const nums = allNums.map((n) => parseFloat(n));
            if (nums.length >= 4) {
              beginning = nums[nums.length - 4];
              received = nums[nums.length - 3];
              ending = nums[nums.length - 2];
              transfer = nums[nums.length - 1];
            } else if (nums.length === 3) {
              beginning = nums[nums.length - 3];
              received = nums[nums.length - 2];
              ending = nums[nums.length - 1];
            } else if (nums.length === 2) {
              beginning = nums[0];
              ending = nums[1];
            } else {
              ending = nums[0];
            }
            rawName = trimmed
              .replace(/(-?\d+(?:\.\d+)?)/g, '')
              .replace(/^\s*#?\d+[\.\)\-:\s]+/, '')
              .replace(/\([^)]*\)/g, ' ')
              .replace(/[:=–\-_/]/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
          } else {
            rawName = trimmed;
          }
        }
      }

      const cleanKey = rawName.toLowerCase().replace(/[:=–\-_()]/g, ' ').replace(/\s+/g, ' ').trim();
      if (!cleanKey) continue;
      const normKey = normalizeAmharic(cleanKey);

      // Match against trackedItemsList
      let bestMatch: BranchTrackedItem | null = null;
      let matchedRaw: InventoryItem | null = null;
      let highestScore = 0;

      for (const ti of trackedItemsList) {
        const it = items.find((i) => i.id === ti.itemId);
        if (!it) continue;

        const nAm = (it.nameAm || '').toLowerCase();
        const nEn = (it.nameEn || '').toLowerCase();
        const cd = (it.code || '').toLowerCase();
        const normAm = normalizeAmharic(nAm);

        let s = 0;
        if (cleanKey === nAm || cleanKey === nEn || normKey === normAm) {
          s = 100;
        } else if (normAm.includes(normKey) || normKey.includes(normAm)) {
          s = 85;
        } else if (nEn.includes(cleanKey) || cleanKey.includes(nEn)) {
          s = 80;
        } else {
          // Check common aliases
          for (const [canonicalName, aliases] of Object.entries(COMMON_ALIASES)) {
            const normCanonical = normalizeAmharic(canonicalName);
            if (normAm.includes(normCanonical) || normCanonical.includes(normAm)) {
              if (aliases.some((a) => normKey.includes(normalizeAmharic(a)))) {
                s = Math.max(s, 75);
              }
            }
          }
          // Token overlap
          const tokens = normKey.split(/\s+/).filter((t) => t.length > 1);
          for (const tok of tokens) {
            if (normAm.includes(tok)) s += 30;
            if (nEn.includes(tok)) s += 25;
            if (cd.includes(tok)) s += 20;
          }
        }

        if (s > highestScore && s >= 25) {
          highestScore = s;
          bestMatch = ti;
          matchedRaw = it;
        }
      }

      // If still not found in trackedItemsList, search master inventory (all 134 items)
      if (!bestMatch) {
        for (const it of items) {
          const nAm = (it.nameAm || '').toLowerCase();
          const nEn = (it.nameEn || '').toLowerCase();
          const cd = (it.code || '').toLowerCase();
          const normAm = normalizeAmharic(nAm);

          let s = 0;
          if (cleanKey === nAm || cleanKey === nEn || normKey === normAm) {
            s = 100;
          } else if (normAm.includes(normKey) || normKey.includes(normAm)) {
            s = 85;
          } else if (nEn.includes(cleanKey) || cleanKey.includes(nEn)) {
            s = 80;
          } else {
            for (const [canonicalName, aliases] of Object.entries(COMMON_ALIASES)) {
              const normCanonical = normalizeAmharic(canonicalName);
              if (normAm.includes(normCanonical) || normCanonical.includes(normAm)) {
                if (aliases.some((a) => normKey.includes(normalizeAmharic(a)))) {
                  s = Math.max(s, 75);
                }
              }
            }
          }

          if (s > highestScore && s >= 30 && currentBranch) {
            highestScore = s;
            matchedRaw = it;
            bestMatch = {
              id: `${currentBranch.id}_${it.id}`,
              branchId: currentBranch.id,
              itemId: it.id,
              countUnit: it.unit,
              countUnitAm: it.unitAm,
              isActive: true,
              conversionFactor: 1,
              enableCrossCheck: false,
              addedAt: new Date().toISOString(),
            };
          }
        }
      }

      const confidence =
        highestScore >= 80 ? 'ከፍተኛ' : highestScore >= 50 ? 'መካከለኛ' : highestScore >= 25 ? 'ዝቅተኛ' : 'አልተገኘም';

      results.push({
        rawText: trimmed,
        rawName,
        matchedItem: bestMatch,
        rawItem: matchedRaw,
        beginning,
        received,
        ending,
        transfer,
        confidence,
      });
    }

    return results;
  }, [stockExcelText, trackedItemsList, items, currentBranch]);

  const handleApplyStockExcelCounts = () => {
    const valid = parsedStockExcelRows.filter((r) => r.matchedItem !== null);
    if (valid.length === 0) {
      alert(language === 'am' ? 'ምንም የሚዛመዱ እቃዎች አልተገኙም!' : 'No matching items found.');
      return;
    }

    setBeginningCounts((prev) => {
      const next = { ...prev };
      valid.forEach((r) => {
        if (r.matchedItem) next[r.matchedItem.itemId] = r.beginning;
      });
      return next;
    });

    setReceivedCounts((prev) => {
      const next = { ...prev };
      valid.forEach((r) => {
        if (r.matchedItem) next[r.matchedItem.itemId] = r.received;
      });
      return next;
    });

    setActualEndingCounts((prev) => {
      const next = { ...prev };
      valid.forEach((r) => {
        if (r.matchedItem) next[r.matchedItem.itemId] = r.ending;
      });
      return next;
    });

    setTransferOutCounts((prev) => {
      const next = { ...prev };
      valid.forEach((r) => {
        if (r.matchedItem && r.transfer > 0) next[r.matchedItem.itemId] = r.transfer;
      });
      return next;
    });

    setStockExcelSuccessNotice(
      language === 'am'
        ? `✅ ${valid.length} የዕቃዎች መነሻ (Beg)፣ የተቀበሉት (Rec)፣ እጃቸው ላይ ያለ (End) እና የተላከ (Trans) ቆጠራዎች ተሞልተዋል!`
        : `✅ Successfully imported counts for ${valid.length} items (Beg, Rec, End, Trans)!`
    );

    // Auto-save changes immediately into persistent DB and backend
    setTimeout(() => {
      handleSaveDayAudit();
    }, 200);

    setTimeout(() => {
      setStockExcelSuccessNotice(null);
      setStockExcelModalOpen(false);
      setStockExcelText('');
    }, 1500);
  };

  const handleCopyStockExcelTemplate = () => {
    const header = `የዕቃ ስም (Item Name)\tመነሻ ቆጠራ (Beginning)\tየተቀበሉት (Received)\tእጃቸው ላይ ያለ (Ending)\tየተላከ (Transfer)\n`;
    const rows = trackedItemsList
      .map((ti) => {
        const it = items.find((i) => i.id === ti.itemId);
        const name = it?.nameAm || it?.nameEn || ti.itemId;
        return `${name}\t0\t0\t0\t0`;
      })
      .join('\n');
    const full = header + rows;
    navigator.clipboard.writeText(full);
    setCopiedStockExcelTemplate(true);
    setTimeout(() => setCopiedStockExcelTemplate(false), 2000);
  };

  const handleLoadStockExcelSample = () => {
    const sample = `የዕቃ ስም	መነሻ	የተቀበሉት	እጃቸው ያለ	የተላከ
1	የበሬ ስጋ	25	15	11	2
2	ዶሮ ደረት	18	10	7	0
3	ሽንኩርት	20	15	6	1
4	ቲማቲም	25	18	8	0
5	ድንች	35	20	12	3
6	እንቁላል	120	60	40	0
7	ዘይት	12	5	4.5	0.5
8	አይብ	6	3	1.5	0
9	በርገር ዳቦ	50	30	15	5
10	ስኳር	15	0	8	0`;
    setStockExcelText(sample);
  };

  const parseExcelBufferAndSetText = (buffer: ArrayBuffer) => {
    try {
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const tsv = XLSX.utils.sheet_to_csv(worksheet, { FS: '\t' });
      if (tsv && tsv.trim()) {
        setStockExcelText(tsv.trim());
        setStockExcelModalOpen(true);
      }
    } catch (err) {
      console.error('Excel binary parse error:', err);
      alert(language === 'am' ? 'የኤክሴል ፋይሉን ማንበብ አልተቻለም። እባክዎ CSV ወይም ኮፒ አድርገው ፔስት ያድርጉ።' : 'Could not parse Excel file.');
    }
  };

  const handleStockExcelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isBinaryExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    if (isBinaryExcel) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const buffer = event.target?.result as ArrayBuffer;
        if (buffer) parseExcelBufferAndSetText(buffer);
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result;
        if (typeof content === 'string' && content.trim()) {
          setStockExcelText(content.trim());
          setStockExcelModalOpen(true);
        }
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  const handleStockFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isBinaryExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    if (isBinaryExcel) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const buffer = event.target?.result as ArrayBuffer;
        if (buffer) parseExcelBufferAndSetText(buffer);
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result;
        if (typeof content === 'string' && content.trim()) {
          setStockExcelText(content.trim());
          setStockExcelModalOpen(true);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleInstantPasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        setStockExcelText(text.trim());
        setStockExcelModalOpen(true);
      } else {
        setStockExcelModalOpen(true);
      }
    } catch (err) {
      console.warn('Clipboard read error or iframe permission restriction:', err);
      setStockExcelModalOpen(true);
    }
  };
  // =========================================================================
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const [recordedDates, setRecordedDates] = useState<string[]>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarViewMonth, setCalendarViewMonth] = useState<Date>(new Date());
  const [rollOverSuccessNotice, setRollOverSuccessNotice] = useState<string | null>(null);

  const isInitialLoadRef = useRef(true);

  // Load list of all dates that have recorded data or drafts for this branch
  const loadBranchRecordedDates = () => {
    try {
      const idxRaw = localStorage.getItem(`BELLO_DAILY_INDEX_${selectedBranchId}`);
      const parsedIdx = idxRaw ? JSON.parse(idxRaw) : [];
      const dates: string[] = Array.isArray(parsedIdx)
        ? parsedIdx.filter((d): d is string => typeof d === 'string')
        : [];
      // Combine with branchDailyModules from AppContext
      branchDailyModules.forEach((m) => {
        if (m && m.branchId === selectedBranchId && typeof m.date === 'string' && !dates.includes(m.date)) {
          dates.push(m.date);
        }
      });
      setRecordedDates(Array.from(new Set(dates)).sort());
    } catch (e) {
      console.warn('Index load error:', e);
    }
  };

  // Primary Hydration Effect: Runs whenever branch or date is changed
  useEffect(() => {
    if (!currentBranch) return;
    isInitialLoadRef.current = true;
    loadBranchRecordedDates();

    // 1. Check local storage for freshest draft/saved record for this specific branch & date
    const localKey = `BELLO_DAILY_RECORD_${selectedBranchId}_${selectedDate}`;
    let loadedData: any = null;
    try {
      const raw = localStorage.getItem(localKey);
      if (raw) loadedData = JSON.parse(raw);
    } catch (e) {
      console.warn('Draft read error:', e);
    }

    // 2. If not found in localStorage, check AppContext branchDailyModules
    if (!loadedData) {
      const mod = branchDailyModules.find(
        (m) => m.branchId === selectedBranchId && m.date === selectedDate
      );
      if (mod) {
        const beg: Record<string, number> = {};
        const rec: Record<string, number> = {};
        const end: Record<string, number> = {};
        const dmg: Record<string, number> = {};
        const trOut: Record<string, number> = {};
        Object.entries(mod.items || {}).forEach(([itemId, data]) => {
          if (data.beginningInventory !== undefined) beg[itemId] = data.beginningInventory;
          if (data.received !== undefined) rec[itemId] = data.received;
          if (data.actualEnding !== undefined) end[itemId] = data.actualEnding;
          if (data.wastageDamage !== undefined) dmg[itemId] = data.wastageDamage;
          if (data.transferOut !== undefined) trOut[itemId] = data.transferOut;
        });

        const chefSales: Record<string, number> = {};
        mod.chefCaptainOrderEntries?.forEach((e) => {
          if (e.recipeId) chefSales[e.recipeId] = e.quantityPrepared;
        });

        const cashierSales: Record<string, number> = {};
        mod.cashierSalesEntries?.forEach((e) => {
          if (e.recipeId) cashierSales[e.recipeId] = e.quantitySold;
        });

        loadedData = {
          beginningCounts: beg,
          receivedCounts: rec,
          chefMenuSales: chefSales,
          cashierMenuSales: cashierSales,
          managementMenuEntries: mod.managementAllowanceEntries?.map((m, idx) => ({
            id: `mgmt-${idx}`,
            recipeId: m.recipeId || '',
            dishName: m.itemName,
            quantity: m.quantityConsumed,
            beneficiary: m.authorizedBy || 'ማኔጅመንት',
            reason: m.notes || 'የስራ ላይ አበል',
            totalCostEtb: m.totalCostEtb || 0,
          })) || [],
          damageCounts: dmg,
          damageNotes: {},
          transferOutCounts: trOut,
          transferOutDestinations: {},
          actualEndingCounts: end,
          shift: mod.shift || 'ALL_DAY',
          managerName:
            mod.managerName && !mod.managerName.includes('ዳንኤል')
              ? mod.managerName
              : 'ሳልሳዊ ስዩም (Branch Manager)',
          savedAt: mod.savedAt,
        };
      }
    }

    const asRecord = (val: any): Record<string, any> =>
      val && typeof val === 'object' && !Array.isArray(val) ? val : {};

    if (loadedData && typeof loadedData === 'object' && !Array.isArray(loadedData)) {
      // Hydrate all fields exactly as left with safe object/array shape guarantees
      setBeginningCounts(asRecord(loadedData.beginningCounts));
      setReceivedCounts(asRecord(loadedData.receivedCounts));
      setChefMenuSales(asRecord(loadedData.chefMenuSales));
      setCashierMenuSales(asRecord(loadedData.cashierMenuSales));
      setManagementMenuEntries(Array.isArray(loadedData.managementMenuEntries) ? loadedData.managementMenuEntries.filter(Boolean) : []);
      setDamageCounts(asRecord(loadedData.damageCounts));
      setDamageNotes(asRecord(loadedData.damageNotes));
      setTransferOutCounts(asRecord(loadedData.transferOutCounts));
      setTransferOutDestinations(asRecord(loadedData.transferOutDestinations));
      setActualEndingCounts(asRecord(loadedData.actualEndingCounts));
      if (typeof loadedData.shift === 'string' && loadedData.shift) setSelectedShift(loadedData.shift);
      if (typeof loadedData.managerName === 'string' && loadedData.managerName) {
        setManagerName(
          loadedData.managerName.includes('ዳንኤል')
            ? 'ሳልሳዊ ስዩም (Branch Manager)'
            : loadedData.managerName
        );
      } else {
        setManagerName('ሳልሳዊ ስዩም (Branch Manager)');
      }
      setSaveStatus('saved');
      setLastSavedTime(loadedData.savedAt ? new Date(loadedData.savedAt).toLocaleTimeString() : 'ቀድሞ የተቀመጠ');
    } else {
      // Brand new date: initialize beginning count from previous day ending count
      const initialBeg: Record<string, number> = {};
      trackedItemsList.forEach((tracked) => {
        const prev = getBeginningStockForBranchItem(currentBranch.id, tracked.itemId, selectedDate);
        initialBeg[tracked.itemId] = prev;
      });
      setBeginningCounts(initialBeg);
      setReceivedCounts({});
      setChefMenuSales({});
      setCashierMenuSales({});
      setManagementMenuEntries([]);
      setDamageCounts({});
      setDamageNotes({});
      setTransferOutCounts({});
      setTransferOutDestinations({});
      setActualEndingCounts({});
      setSaveStatus('saved');
    }

    const t = setTimeout(() => {
      isInitialLoadRef.current = false;
    }, 250);
    return () => clearTimeout(t);
  }, [selectedBranchId, selectedDate, currentBranch, trackedItemsList]);

  // Continuous Auto-Save: Debounced by 1200ms
  useEffect(() => {
    if (isInitialLoadRef.current) return;
    setSaveStatus('saving');

    const timer = setTimeout(() => {
      const recordToSave = {
        branchId: selectedBranchId,
        date: selectedDate,
        shift: selectedShift,
        managerName,
        savedAt: new Date().toISOString(),
        beginningCounts,
        receivedCounts,
        chefMenuSales,
        cashierMenuSales,
        managementMenuEntries,
        damageCounts,
        damageNotes,
        transferOutCounts,
        transferOutDestinations,
        actualEndingCounts,
      };

      const localKey = `BELLO_DAILY_RECORD_${selectedBranchId}_${selectedDate}`;
      try {
        localStorage.setItem(localKey, JSON.stringify(recordToSave));

        // Update branch dates index
        const idxRaw = localStorage.getItem(`BELLO_DAILY_INDEX_${selectedBranchId}`);
        const parsedIdx = idxRaw ? JSON.parse(idxRaw) : [];
        const safeIdxList = Array.isArray(parsedIdx)
          ? parsedIdx.filter((d): d is string => typeof d === 'string')
          : [];
        const dateSet = new Set<string>(safeIdxList);
        dateSet.add(selectedDate);
        const dateArr = Array.from(dateSet).sort();
        localStorage.setItem(`BELLO_DAILY_INDEX_${selectedBranchId}`, JSON.stringify(dateArr));
        setRecordedDates(dateArr);
      } catch (err) {
        console.warn('Local save error:', err);
      }

      fetch('/api/branch-daily-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: selectedBranchId,
          date: selectedDate,
          record: recordToSave,
        }),
      }).catch(() => {});

      setSaveStatus('saved');
      setLastSavedTime(new Date().toLocaleTimeString());
    }, 1200);

    return () => clearTimeout(timer);
  }, [
    beginningCounts,
    receivedCounts,
    chefMenuSales,
    cashierMenuSales,
    managementMenuEntries,
    damageCounts,
    damageNotes,
    transferOutCounts,
    transferOutDestinations,
    actualEndingCounts,
    selectedShift,
    managerName,
    selectedBranchId,
    selectedDate,
  ]);

  // Roll Over Ending Physical Counts into Next Day's Beginning Inventory
  const handleRollOverToNextDay = () => {
    const nextDate = getDateOffset(selectedDate, 1);
    const nextKey = `BELLO_DAILY_RECORD_${selectedBranchId}_${nextDate}`;
    
    let nextRecord: any = {};
    try {
      const raw = localStorage.getItem(nextKey);
      if (raw) nextRecord = JSON.parse(raw);
    } catch {}

    const updatedNext = {
      ...nextRecord,
      branchId: selectedBranchId,
      date: nextDate,
      beginningCounts: { ...actualEndingCounts },
      savedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(nextKey, JSON.stringify(updatedNext));
      const idxRaw = localStorage.getItem(`BELLO_DAILY_INDEX_${selectedBranchId}`);
      const dateSet = new Set<string>(idxRaw ? JSON.parse(idxRaw) : []);
      dateSet.add(nextDate);
      localStorage.setItem(`BELLO_DAILY_INDEX_${selectedBranchId}`, JSON.stringify(Array.from(dateSet)));
      loadBranchRecordedDates();
    } catch {}

    fetch('/api/branch-daily-save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        branchId: selectedBranchId,
        date: nextDate,
        record: updatedNext,
      }),
    }).catch(() => {});

    setRollOverSuccessNotice(
      language === 'am'
        ? `የ${formatEthiopianDate(selectedDate)} ማጠቃለያ ቆጠራ ለቀጣዩ ቀን (${formatEthiopianDate(nextDate)}) መነሻ ቆጠራ ሆኖ በስኬት ተላልፏል! ✅`
        : `Ending counts from ${selectedDate} rolled forward to ${nextDate} as beginning stock! ✅`
    );
    setTimeout(() => setRollOverSuccessNotice(null), 5000);
  };

  // Helper to get calendar days for calendarViewMonth with recorded data indicators
  const calendarDays = useMemo(() => {
    const year = calendarViewMonth.getFullYear();
    const month = calendarViewMonth.getMonth(); // 0-11
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const adjustedFirstDay = (firstDayIndex + 6) % 7; // Monday = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: Array<{ day: number; dateStr: string; hasData: boolean; isCurrentMonth: boolean }> = [];

    for (let i = 0; i < adjustedFirstDay; i++) {
      days.push({ day: 0, dateStr: '', hasData: false, isCurrentMonth: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const hasData = recordedDates.includes(dateStr);
      days.push({ day: d, dateStr, hasData, isCurrentMonth: true });
    }

    return days;
  }, [calendarViewMonth, recordedDates]);

  const handlePrevMonth = () => {
    setCalendarViewMonth(new Date(calendarViewMonth.getFullYear(), calendarViewMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarViewMonth(new Date(calendarViewMonth.getFullYear(), calendarViewMonth.getMonth() + 1, 1));
  };

  // =========================================================================
  // VOICE ENTRY ENGINE (Web Speech API with Read-Back Confirmation)
  // =========================================================================
  const [isListening, setIsListening] = useState(false);
  const [voiceTargetField, setVoiceTargetField] = useState<{
    section: 'beginning' | 'received' | 'chef' | 'cashier' | 'ending';
    id: string;
    label: string;
  } | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceConfirmModalOpen, setVoiceConfirmModalOpen] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startVoiceInput = (
    section: 'beginning' | 'received' | 'chef' | 'cashier' | 'ending',
    id: string,
    label: string
  ) => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        language === 'am'
          ? 'የድምጽ ግቤት በዚህ ብራውዘር ላይ አይደገፍም። እባክዎ ኪቦርድ ተጠቅመው ቁጥሩን ይተይቡ።'
          : 'Web Speech recognition is not supported on this browser. Please type the number directly.'
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = language === 'am' ? 'am-ET' : 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      setVoiceTargetField({ section, id, label });
      setIsListening(true);
      setVoiceTranscript('');

      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setVoiceTranscript(text);
        setIsListening(false);
        setVoiceConfirmModalOpen(true);

        // Read-back audio confirmation using SpeechSynthesis
        if ('speechSynthesis' in window) {
          const msg = new SpeechSynthesisUtterance(
            language === 'am'
              ? `ተመዝግቧል፦ ${text}። ትክክል ነው?`
              : `Recorded: ${text}. Is this correct?`
          );
          msg.lang = language === 'am' ? 'am-ET' : 'en-US';
          window.speechSynthesis.speak(msg);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.warn('Voice input error:', err);
      setIsListening(false);
    }
  };

  const handleConfirmVoiceInput = () => {
    if (!voiceTargetField) return;
    const parsedNum = parseFloat(voiceTranscript.replace(/[^0-9.]/g, ''));
    if (!isNaN(parsedNum)) {
      const { section, id } = voiceTargetField;
      if (section === 'beginning') {
        setBeginningCounts((prev) => ({ ...prev, [id]: parsedNum }));
      } else if (section === 'received') {
        setReceivedCounts((prev) => ({ ...prev, [id]: parsedNum }));
      } else if (section === 'chef') {
        setChefMenuSales((prev) => ({ ...prev, [id]: parsedNum }));
      } else if (section === 'cashier') {
        setCashierMenuSales((prev) => ({ ...prev, [id]: parsedNum }));
      } else if (section === 'ending') {
        setActualEndingCounts((prev) => ({ ...prev, [id]: parsedNum }));
      }
    }
    setVoiceConfirmModalOpen(false);
    setVoiceTargetField(null);
  };

  // =========================================================================
  // SECTION 8 & 9: "ተንትን" (ANALYZE) & AI AUDIT ENGINE
  // =========================================================================
  const [analysisActive, setAnalysisActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [saveDayNotice, setSaveDayNotice] = useState(false);

  // Helper: Recipe theoretical usage calculator
  const calculateAnalysis = useMemo(() => {
    // --- STAGE 1: MENU RECONCILIATION (Chef vs Cashier) ---
    const menuReconciliationRows = branchRecipes.map((recipe) => {
      const chefQty = chefMenuSales[recipe.id] || 0;
      const cashierQty = cashierMenuSales[recipe.id] || 0;
      const variance = chefQty - cashierQty;

      let status: 'EQUAL' | 'CHEF_HIGHER' | 'CASHIER_HIGHER' = 'EQUAL';
      let meaningAm = 'ንጹህ ✅';
      let meaningEn = 'Clean ✅';

      if (variance > 0) {
        status = 'CHEF_HIGHER';
        meaningAm = 'ምግቡ ከኩሽና ወጥቷል ግን በPOS አልተመዘገበም (ያልተመዘገበ ሽያጭ / በነጻ የተሰጠ / ስርቆት 🚨)';
        meaningEn = 'Food left kitchen without POS billing (Unbilled Sale / Giveaway / Leakage 🚨)';
      } else if (variance < 0) {
        status = 'CASHIER_HIGHER';
        meaningAm = 'ተመዝግቧል ግን ሼፉ አላስታወቀም (የመዝገብ ስህተት / የተሰረዘ ትዕዛዝ ⚠️)';
        meaningEn = 'Billed in POS without kitchen declaration (Clerical Error / Void Order ⚠️)';
      }

      return {
        recipeId: recipe.id,
        dishName: language === 'am' ? recipe.nameAm : recipe.nameEn,
        sellingPrice: recipe.sellingPrice,
        chefQty,
        cashierQty,
        variance,
        varianceEtb: Math.abs(variance) * recipe.sellingPrice,
        status,
        meaningAm,
        meaningEn,
      };
    });

    const hasMenuDiscrepancy = menuReconciliationRows.some((m) => m.variance !== 0);
    const unbilledChefDishes = menuReconciliationRows.filter((m) => m.status === 'CHEF_HIGHER');
    const voidCashierDishes = menuReconciliationRows.filter((m) => m.status === 'CASHIER_HIGHER');

    // --- STAGE 2: RECIPE-BASED THEORETICAL USAGE PER RAW INGREDIENT ---
    // Confirmed Menu Qty: use Cashier sales (or Chef sales if cashier empty)
    const confirmedSalesPortions: Record<string, number> = {};
    branchRecipes.forEach((r) => {
      const billed = cashierMenuSales[r.id];
      const chef = chefMenuSales[r.id];
      confirmedSalesPortions[r.id] = billed !== undefined && billed > 0 ? billed : chef || 0;
    });

    // Management portions aggregated by recipe
    const managementPortions: Record<string, number> = {};
    managementMenuEntries.forEach((m) => {
      managementPortions[m.recipeId] = (managementPortions[m.recipeId] || 0) + m.quantity;
    });

    // Map ingredients to their theoretical usages
    const ingredientSalesUsage: Record<string, number> = {};
    const ingredientMgmtUsage: Record<string, number> = {};
    const ingredientContributingDishes: Record<string, string[]> = {};

    branchRecipes.forEach((recipe) => {
      const salesQty = confirmedSalesPortions[recipe.id] || 0;
      const mgmtQty = managementPortions[recipe.id] || 0;
      const dishDisplayName = language === 'am' ? (recipe.nameAm || recipe.nameEn || recipe.id) : (recipe.nameEn || recipe.nameAm || recipe.id);

      (Array.isArray(recipe.ingredients) ? recipe.ingredients : []).forEach((ing) => {
        // Sales usage
        const usageSales = salesQty * ing.quantity;
        ingredientSalesUsage[ing.itemId] = (ingredientSalesUsage[ing.itemId] || 0) + usageSales;

        // Management usage
        const usageMgmt = mgmtQty * ing.quantity;
        ingredientMgmtUsage[ing.itemId] = (ingredientMgmtUsage[ing.itemId] || 0) + usageMgmt;

        // Track dish names
        if (salesQty > 0 || mgmtQty > 0) {
          if (!ingredientContributingDishes[ing.itemId]) {
            ingredientContributingDishes[ing.itemId] = [];
          }
          if (!ingredientContributingDishes[ing.itemId].includes(dishDisplayName)) {
            ingredientContributingDishes[ing.itemId].push(dishDisplayName);
          }
        }
      });
    });

    // --- STAGE 3: EXPECTED ENDING VS ACTUAL PHYSICAL ENDING ---
    const itemAuditResults: AIAuditItemResult[] = trackedItemsList.map((tracked) => {
      const raw = items.find((i) => i.id === tracked.itemId);
      const unitPrice = raw?.lastPurchasePrice || raw?.weightedAvgCost || 100;

      const beg = beginningCounts[tracked.itemId] || 0;
      const rec = receivedCounts[tracked.itemId] || 0;
      const runningTotal = Number((beg + rec).toFixed(3));

      const usageSales = Number((ingredientSalesUsage[tracked.itemId] || 0).toFixed(3));
      const usageMgmt = Number((ingredientMgmtUsage[tracked.itemId] || 0).toFixed(3));
      const totalRecipeUsage = Number((usageSales + usageMgmt).toFixed(3));

      const dmg = damageCounts[tracked.itemId] || 0;
      const trOut = transferOutCounts[tracked.itemId] || 0;

      // Expected Ending = Beg + Rec - Recipe Usage (Sales + Mgmt) - Damage - Transfer Out
      const expected = Number((runningTotal - totalRecipeUsage - dmg - trOut).toFixed(3));
      const actual = actualEndingCounts[tracked.itemId] || 0;

      const varianceQty = Number((actual - expected).toFixed(3));
      const varianceValueEtb = Number(Math.abs(varianceQty * unitPrice).toFixed(2));
      const variancePercent = expected > 0 ? (varianceQty / expected) * 100 : 0;

      // Classification: OK / WARNING / INVESTIGATE
      let status: 'OK' | 'WARNING' | 'INVESTIGATE' = 'OK';
      let statusLabelAm = 'ትክክል ✅';
      let statusLabelEn = 'Clean ✅';
      let diagnosisAm = 'ምንም አይነት ጉልህ ልዩነት የለም፤ ቆጠራው ንጹህ ነው።';
      let diagnosisEn = 'No significant discrepancy; counts are clean.';

      if (varianceQty < -0.05) {
        // Shortage
        if (Math.abs(variancePercent) > 5 || varianceValueEtb > 500) {
          status = 'INVESTIGATE';
          statusLabelAm = 'ይመርመር 🚨';
          statusLabelEn = 'Investigate 🚨';
          diagnosisAm = `ከፍተኛ ጉድለት (${Math.abs(varianceQty)} ${tracked.countUnitAm} / ${formatCurrency(
            varianceValueEtb
          )}) ተገኝቷል።`;
          diagnosisEn = `Critical shortage of ${Math.abs(varianceQty)} ${tracked.countUnit} (${formatCurrency(
            varianceValueEtb
          )}) detected.`;
        } else {
          status = 'WARNING';
          statusLabelAm = 'ተጠንቀቅ ⚠️';
          statusLabelEn = 'Warning ⚠️';
          diagnosisAm = `መጠነኛ ጉድለት (${Math.abs(varianceQty)} ${tracked.countUnitAm})፤ የፖርሽን አወጣጥ ክትትል ያስፈልጋል።`;
          diagnosisEn = `Moderate shortage of ${Math.abs(varianceQty)} ${tracked.countUnit}; monitor portioning.`;
        }
      } else if (varianceQty > 0.05) {
        // Overage
        status = 'WARNING';
        statusLabelAm = 'ተጠንቀቅ (ትርፍ) ⚠️';
        statusLabelEn = 'Warning (Overage) ⚠️';
        diagnosisAm = `ትርፍ ስቶክ (${varianceQty} ${tracked.countUnitAm})፤ ምናልባት ያልተመዘገበ ገቢ ወይም የቆጠራ ስህተት ሊሆን ይችላል።`;
        diagnosisEn = `Overage (${varianceQty} ${tracked.countUnit}); possible unrecorded delivery or counting error.`;
      }

      return {
        itemId: tracked.itemId,
        itemCode: raw?.code || tracked.itemId,
        itemName: language === 'am' ? raw?.nameAm || tracked.itemId : raw?.nameEn || tracked.itemId,
        countUnit: tracked.countUnitAm,
        unitPrice,
        beginningCount: beg,
        receivedQty: rec,
        runningTotal,
        recipeUsageSales: usageSales,
        recipeUsageMgmt: usageMgmt,
        totalRecipeUsage,
        damageQty: dmg,
        transferOutQty: trOut,
        expectedEnding: expected,
        actualEnding: actual,
        varianceQty,
        varianceValueEtb,
        variancePercent,
        status,
        statusLabelAm,
        statusLabelEn,
        contributingDishes: ingredientContributingDishes[tracked.itemId] || [],
        diagnosisAm,
        diagnosisEn,
      };
    });

    const totalShortageValue = itemAuditResults
      .filter((r) => r.varianceQty < 0)
      .reduce((sum, r) => sum + r.varianceValueEtb, 0);

    const investigateItems = itemAuditResults.filter((r) => r.status === 'INVESTIGATE');
    const warningItems = itemAuditResults.filter((r) => r.status === 'WARNING');

    // --- STAGE 4: AI AUDIT CONCLUSION & EXPERT DIAGNOSIS ---
    let aiDiagnosisAm = '';
    let aiDiagnosisEn = '';
    let aiReasoningAm = '';
    let aiReasoningEn = '';

    if (!hasMenuDiscrepancy && investigateItems.length === 0 && warningItems.length === 0) {
      aiDiagnosisAm =
        'የቀኑ የብራንች ኦዲት ፍጹም ንጹህ ነው! በሼፍ እና በካሸር መካከል ምንም ልዩነት የለም፤ ሁሉም ቆጠራዎች ከሬሲፒ ስሌት ጋር በትክክል ይጣጣማሉ።';
      aiDiagnosisEn =
        'The branch daily audit is completely clean! Zero discrepancies between Chef and Cashier; all physical counts align with recipe theoretical consumption.';
      aiReasoningAm =
        'ደረጃ 1 (የሜኑ ሪኮንሲሊየሽን) 100% ተጣጥሟል። ደረጃ 2 (የሬሲፒ ፍጆታ) ከምሽቱ ቆጠራ ጋር በ±0.5% መቻቻል ውስጥ ንጹህ ነው።';
      aiReasoningEn =
        'Stage 1 (Menu reconciliation) matched 100%. Stage 2 (Recipe usage) matched evening count within ±0.5% tolerance.';
    } else if (!hasMenuDiscrepancy && (investigateItems.length > 0 || warningItems.length > 0)) {
      const topItems = investigateItems.map((i) => i.itemName).join('፣ ');
      aiDiagnosisAm = `የሜኑ ሽያጩ አስተማማኝ ነው፤ የሼፎች ትዕዛዝ እና የካሸር ሽያጭ ሙሉ በሙሉ ይጣጣማል። ነገር ግን በእቃ ደረጃ (${topItems}) ላይ ${formatCurrency(
        totalShortageValue
      )} ጉድለት ተገኝቷል። ሽያጩ ንጹህ ስለሆነ ችግሩ ከሬሲፒ በላይ መጠቀም (Over-portioning)፣ የወጥ ቤት ብክነት፣ ስርቆት ወይም የቆጠራ ስህተት ሊሆን ይችላል።`;
      aiDiagnosisEn = `Sales recording is reliable; Chef orders and Cashier POS match completely. However, an ingredient-level shortage of ${formatCurrency(
        totalShortageValue
      )} was detected on (${topItems}). Since billing is intact, the root cause is kitchen over-portioning, unrecorded spoilage, theft, or physical count error.`;
      aiReasoningAm =
        'ምግቦች ከኩሽና ሳይከፈልባቸው አልወጡም። ልዩነቱ የተፈጠረው በምግብ አሰራር ወቅት ከሬሲፒው ግራም በላይ በማውጣት ወይም ሳይመዘገብ በባከነ ጥሬ ዕቃ ምክንያት ነው። የሚጋሩትን ሜኑዎች የፖርሽን ሚዛን ያረጋግጡ።';
      aiReasoningEn =
        'No unbilled dishes left kitchen. Discrepancy stems from excess ingredient weight per plate or unrecorded prep spoilage. Verify kitchen portion scale calibration.';
    } else if (hasMenuDiscrepancy && investigateItems.length > 0) {
      const unbilledNames = unbilledChefDishes.map((d) => d.dishName).join('፣ ');
      aiDiagnosisAm = `ትኩረት! በሁለቱም ደረጃዎች (በሜኑ እና በእቃ) ክፍተት ተገኝቷል፦ በኩሽና የወጡ ነገር ግን በካሸር ያልተመዘገቡ ምግቦች (${unbilledNames}) አሉ። በእቃ ደረጃም ${formatCurrency(
        totalShortageValue
      )} ጉድለት አለ። የመጀመሪያው እርምጃ ያልተከፈለበት ሽያጭ ወይም የካፕቴን ኦርደር ስህተት መሆኑን ማጣራት ነው።`;
      aiDiagnosisEn = `Alert! Discrepancies exist at BOTH Menu level and Ingredient level: dishes (${unbilledNames}) left kitchen unbilled. Ingredient shortage totals ${formatCurrency(
        totalShortageValue
      )}. Priority action: audit Cashier POS void tickets and KOT duplicates.`;
      aiReasoningAm =
        'ደረጃ 1 ላይ የሼፎች ኦርደር ከካሸር በልጧል፤ ይህም በቀጥታ ደረጃ 3 ላይ ባሉት ጥሬ እቃዎች ላይ ጉድለት እንዲታይ አድርጓል። ምግቡ ወጥቶ ክፍያ ካልተሰበሰበ የኩሽናውን KOT ከPOS ሪፖርት ጋር ያናብቡ።';
      aiReasoningEn =
        'Chef orders exceeded cashier POS billing, directly cascading into raw ingredient shortages. Cross-reference kitchen physical duplicate captain slips against POS daily summary.';
    } else {
      aiDiagnosisAm =
        'በሜኑ ደረጃ የካሸር ሽያጭ እና የሼፎች ኦርደር መጠነኛ አለመጣጣም አሳይተዋል፤ ነገር ግን የእቃ ቆጠራው በአጠቃላይ ተቀባይነት ባለው ክልል ውስጥ ይገኛል።';
      aiDiagnosisEn =
        'Minor menu-level ticket variances detected between Cashier and Chef; however raw ingredient physical ending counts remain within acceptable thresholds.';
      aiReasoningAm =
        'የጥሬ ዕቃ ቆጠራው ንጹህ ነው። የቲኬት ሰነድ ስህተቶች ወይም የተሰረዙ ትዕዛዞች በካሸር በኩል መኖራቸውን ያጣሩ።';
      aiReasoningEn =
        'Raw material balances are safe. Check cashier void orders or clerical receipt input timings.';
    }

    return {
      menuReconciliationRows,
      hasMenuDiscrepancy,
      unbilledChefDishes,
      voidCashierDishes,
      itemAuditResults,
      totalShortageValue,
      investigateItems,
      warningItems,
      aiDiagnosisAm,
      aiDiagnosisEn,
      aiReasoningAm,
      aiReasoningEn,
    };
  }, [
    branchRecipes,
    chefMenuSales,
    cashierMenuSales,
    managementMenuEntries,
    trackedItemsList,
    items,
    beginningCounts,
    receivedCounts,
    damageCounts,
    transferOutCounts,
    actualEndingCounts,
    language,
    formatCurrency,
  ]);

  // Synthesized Executive Department Category Breakdown (የተቀነባበረ የውሂብ ድብልቅ ማጠቃለያ በክፍልፋይ)
  const executiveCategoryBreakdown = useMemo(() => {
    const categories: Record<string, {
      categoryKey: string;
      labelAm: string;
      labelEn: string;
      itemCount: number;
      beginningValue: number;
      receivedValue: number;
      recipeUsageValue: number;
      expectedValue: number;
      actualValue: number;
      varianceValue: number;
      hasInvestigation: boolean;
    }> = {
      meat: { categoryKey: 'meat', labelAm: '🥩 ስጋና ዶሮ (Meat & Poultry)', labelEn: 'Meat & Poultry', itemCount: 0, beginningValue: 0, receivedValue: 0, recipeUsageValue: 0, expectedValue: 0, actualValue: 0, varianceValue: 0, hasInvestigation: false },
      produce: { categoryKey: 'produce', labelAm: '🥬 አትክልትና ፍራፍሬ (Produce)', labelEn: 'Produce', itemCount: 0, beginningValue: 0, receivedValue: 0, recipeUsageValue: 0, expectedValue: 0, actualValue: 0, varianceValue: 0, hasInvestigation: false },
      dairy: { categoryKey: 'dairy', labelAm: '🧀 የወተት ተዋጽኦና ቅቤ (Dairy & Butter)', labelEn: 'Dairy & Butter', itemCount: 0, beginningValue: 0, receivedValue: 0, recipeUsageValue: 0, expectedValue: 0, actualValue: 0, varianceValue: 0, hasInvestigation: false },
      bakery: { categoryKey: 'bakery', labelAm: '🍞 የዳቦና መጋገሪያ (Bakery)', labelEn: 'Bakery & Bread', itemCount: 0, beginningValue: 0, receivedValue: 0, recipeUsageValue: 0, expectedValue: 0, actualValue: 0, varianceValue: 0, hasInvestigation: false },
      grains: { categoryKey: 'grains', labelAm: '🍝 ፓስታ፣ እህልና ጥራጥሬ (Grains & Pasta)', labelEn: 'Grains & Pasta', itemCount: 0, beginningValue: 0, receivedValue: 0, recipeUsageValue: 0, expectedValue: 0, actualValue: 0, varianceValue: 0, hasInvestigation: false },
      spices: { categoryKey: 'spices', labelAm: '🧂 ዘይት፣ ቅመማቅመም እና ስኳር (Oils, Spices & Sugar)', labelEn: 'Oils, Spices & Sugar', itemCount: 0, beginningValue: 0, receivedValue: 0, recipeUsageValue: 0, expectedValue: 0, actualValue: 0, varianceValue: 0, hasInvestigation: false },
      beverages: { categoryKey: 'beverages', labelAm: '☕ መጠጦችና ቡና (Beverages, Coffee & Tea)', labelEn: 'Beverages', itemCount: 0, beginningValue: 0, receivedValue: 0, recipeUsageValue: 0, expectedValue: 0, actualValue: 0, varianceValue: 0, hasInvestigation: false },
      other: { categoryKey: 'other', labelAm: '📦 ሌሎችና ማሸጊያዎች (Packaging & Other)', labelEn: 'Packaging & Other', itemCount: 0, beginningValue: 0, receivedValue: 0, recipeUsageValue: 0, expectedValue: 0, actualValue: 0, varianceValue: 0, hasInvestigation: false },
    };

    calculateAnalysis.itemAuditResults.forEach((item) => {
      const raw = items.find((i) => i.id === item.itemId);
      const cat = raw?.category || 'other';
      const targetCat = categories[cat] || categories['other'];

      targetCat.itemCount += 1;
      targetCat.beginningValue += (item.beginningCount * item.unitPrice);
      targetCat.receivedValue += (item.receivedQty * item.unitPrice);
      targetCat.recipeUsageValue += (item.totalRecipeUsage * item.unitPrice);
      targetCat.expectedValue += (item.expectedEnding * item.unitPrice);
      targetCat.actualValue += (item.actualEnding * item.unitPrice);
      targetCat.varianceValue += item.varianceValueEtb;
      if (item.status === 'INVESTIGATE') {
        targetCat.hasInvestigation = true;
      }
    });

    return Object.values(categories).filter((c) => c.itemCount > 0);
  }, [calculateAnalysis.itemAuditResults, items]);

  // Top 5 Actionable Discrepancies (ዋና ዋና ልዩነቶችና የኦዲት ማጣሪያዎች)
  const topActionableAnomalies = useMemo(() => {
    return calculateAnalysis.itemAuditResults
      .filter((i) => i.varianceQty !== 0)
      .sort((a, b) => Math.abs(b.varianceValueEtb) - Math.abs(a.varianceValueEtb))
      .slice(0, 5);
  }, [calculateAnalysis.itemAuditResults]);

  const handleRunAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setAnalysisActive(true);
      // Smooth scroll to results
      const resultsEl = document.getElementById('audit-results-panel');
      if (resultsEl) {
        resultsEl.scrollIntoView({ behavior: 'smooth' });
      }
    }, 400);
  };

  // Save the complete day's audit
  const handleSaveDayAudit = () => {
    if (!currentBranch) return;

    const itemsMap: Record<string, BranchDailyItemData> = {};
    calculateAnalysis.itemAuditResults.forEach((res) => {
      itemsMap[res.itemId] = {
        itemId: res.itemId,
        itemCode: res.itemCode,
        itemName: res.itemName,
        countUnit: res.countUnit,
        unitCostEtb: res.unitPrice,
        beginningInventory: res.beginningCount,
        received: res.receivedQty,
        runningTotal: res.runningTotal,
        chefCaptainOrderQty: 0,
        cashierSalesQty: 0,
        salesTheoreticalQty: res.recipeUsageSales,
        managementConsumption: res.recipeUsageMgmt,
        wastageDamage: res.damageQty,
        transferOut: res.transferOutQty,
        expectedEnding: res.expectedEnding,
        actualEnding: res.actualEnding,
        variance: res.varianceQty,
        variancePercent: res.variancePercent,
        varianceValueEtb: res.varianceValueEtb,
        status: res.varianceQty === 0 ? 'balanced' : res.varianceQty < 0 ? 'shortage' : 'overage',
        notes: res.diagnosisAm,
      };
    });

    const record: BranchDailyModuleRecord = {
      id: `module-${currentBranch.id}-${selectedDate}`,
      branchId: currentBranch.id,
      branchName: currentBranch.nameAm || currentBranch.nameEn,
      date: selectedDate,
      ethiopianDateStr: formatEthiopianDate(selectedDate),
      shift: selectedShift,
      managerName,
      savedAt: new Date().toISOString(),
      items: itemsMap,
      cashierSalesEntries: [],
      chefCaptainOrderEntries: [],
      managementAllowanceEntries: [],
      scannedPhotos: [],
      status: 'closed',
      closedAt: new Date().toISOString(),
    };

    saveBranchDailyModule(record);
    saveDailyAuditToFirestore(record).catch((err) => {
      console.warn('[Firestore] Background audit sync notice:', err);
    });
    setSaveDayNotice(true);
    setTimeout(() => setSaveDayNotice(false), 4000);
  };

  // Handle Excel paste for Cashier sales
  const handleApplyExcelSales = () => {
    if (!excelPasteText.trim()) return;
    const lines = excelPasteText.trim().split('\n');
    const newSales = { ...cashierMenuSales };

    lines.forEach((line) => {
      const parts = line.split(/[\t,;]+/).map((p) => p.trim());
      if (parts.length < 2) return;
      const namePart = parts[0].toLowerCase();
      const qtyPart = parseFloat(parts[1]);
      if (isNaN(qtyPart)) return;

      const matched = branchRecipes.find((r) => {
        const nAm = (r.nameAm || '').toLowerCase();
        const nEn = (r.nameEn || '').toLowerCase();
        return (
          (nAm && (nAm.includes(namePart) || namePart.includes(nAm))) ||
          (nEn && (nEn.includes(namePart) || namePart.includes(nEn)))
        );
      });

      if (matched) {
        newSales[matched.id] = (newSales[matched.id] || 0) + qtyPart;
      }
    });

    setCashierMenuSales(newSales);
    setExcelPasteModalOpen(false);
    setExcelPasteText('');
  };

  // Owner Report Key Metrics Calculations
  const totalCashierRevenue = useMemo(() => {
    return calculateAnalysis.menuReconciliationRows.reduce((sum, r) => sum + r.cashierQty * r.sellingPrice, 0);
  }, [calculateAnalysis.menuReconciliationRows]);

  const totalChefRevenue = useMemo(() => {
    return calculateAnalysis.menuReconciliationRows.reduce((sum, r) => sum + r.chefQty * r.sellingPrice, 0);
  }, [calculateAnalysis.menuReconciliationRows]);

  const cashierVarianceEtb = useMemo(() => {
    return calculateAnalysis.menuReconciliationRows
      .filter((r) => r.variance > 0)
      .reduce((sum, r) => sum + r.varianceEtb, 0);
  }, [calculateAnalysis.menuReconciliationRows]);

  const totalMgmtValue = useMemo(() => {
    return managementMenuEntries.reduce((sum, m) => sum + m.totalCostEtb, 0);
  }, [managementMenuEntries]);

  const totalDamageValue = useMemo(() => {
    return Object.entries(damageCounts).reduce((sum, [itemId, qty]) => {
      const raw = items.find((i) => i.id === itemId);
      const price = raw?.lastPurchasePrice || raw?.weightedAvgCost || 0;
      return sum + (qty || 0) * price;
    }, 0);
  }, [damageCounts, items]);

  const totalTheoreticalCost = useMemo(() => {
    return calculateAnalysis.itemAuditResults.reduce((sum, r) => sum + r.totalRecipeUsage * r.unitPrice, 0);
  }, [calculateAnalysis.itemAuditResults]);

  const theoreticalFoodCostPct = totalCashierRevenue > 0 ? (totalTheoreticalCost / totalCashierRevenue) * 100 : 0;

  const actualConsumptionCost = useMemo(() => {
    return calculateAnalysis.itemAuditResults.reduce((sum, r) => {
      const consumed = Math.max(0, r.runningTotal - r.actualEnding);
      return sum + consumed * r.unitPrice;
    }, 0);
  }, [calculateAnalysis.itemAuditResults]);

  const netVarianceEtb = useMemo(() => {
    return calculateAnalysis.itemAuditResults.reduce((sum, r) => sum + r.varianceQty * r.unitPrice, 0);
  }, [calculateAnalysis.itemAuditResults]);

  const handleExportOwnerReportCSV = () => {
    const branchName = language === 'am' ? (currentBranch?.nameAm || currentBranch?.nameEn || '') : (currentBranch?.nameEn || currentBranch?.nameAm || '');
    const lines = [
      `"BELLO FAM RESTAURANT GROUP • ቤሎ ፋም - OFFICIAL OWNER DAILY F&B DATA BLEND AUDIT REPORT (የውሂብ ድብልቅ)"`,
      `"Branch:","${branchName}"`,
      `"Date:","${selectedDate} (${formatEthiopianDate(selectedDate)})"`,
      `"Shift:","${selectedShift}"`,
      `"Branch Manager:","${managerName}"`,
      `"Report Generated:","${new Date().toLocaleString()}"`,
      ``,
      `"EXECUTIVE FINANCIAL SUMMARY (ETB)"`,
      `"Total Cashier POS Revenue","${totalCashierRevenue.toFixed(2)}"`,
      `"Total Chef Orders Potential Revenue","${totalChefRevenue.toFixed(2)}"`,
      `"Sales Variance (Chef vs Cashier)","${(totalChefRevenue - totalCashierRevenue).toFixed(2)}"`,
      `"Theoretical Recipe Food Cost","${totalTheoreticalCost.toFixed(2)}"`,
      `"Theoretical Food Cost %","${theoreticalFoodCostPct.toFixed(1)}%"`,
      `"Actual Physical Consumption Cost","${actualConsumptionCost.toFixed(2)}"`,
      `"Net Discrepancy / Variance Value","${netVarianceEtb.toFixed(2)}"`,
      `"Management Consumption Expense","${totalMgmtValue.toFixed(2)}"`,
      `"Damage & Wastage Loss","${totalDamageValue.toFixed(2)}"`,
      ``,
      `"SECTION 1: MENU & POS SALES RECONCILIATION"`,
      `"Dish Name","Selling Price","Chef KOT Portions","Cashier Billed Portions","Portion Variance (+/-)","Revenue Variance (ETB)","Audit Finding"`,
      ...calculateAnalysis.menuReconciliationRows.map(
        (m) =>
          `"${m.dishName}","${m.sellingPrice}","${m.chefQty}","${m.cashierQty}","${m.variance}","${m.varianceEtb}","${m.meaningAm}"`
      ),
      ``,
      `"SECTION 2: PRIMARY MATERIALS INVENTORY RECONCILIATION"`,
      `"Item Code","Material Name","Unit","Unit Price (ETB)","Morning Beg Count","Received Count","Running Total Available","Recipe Sales Usage","Management Usage","Total Recipe Usage","Damage/Waste","Transfer Out","Expected Ending","Actual Ending Count","Variance Qty (+/-)","Variance Value (ETB)","Audit Status"`,
      ...calculateAnalysis.itemAuditResults.map(
        (r) =>
          `"${r.itemCode}","${r.itemName}","${r.countUnit}","${r.unitPrice}","${r.beginningCount}","${r.receivedQty}","${r.runningTotal}","${r.recipeUsageSales}","${r.recipeUsageMgmt}","${r.totalRecipeUsage}","${r.damageQty}","${r.transferOutQty}","${r.expectedEnding}","${r.actualEnding}","${r.varianceQty}","${r.varianceValueEtb}","${r.statusLabelAm}"`
      ),
      ``,
      `"SECTION 3: MANAGEMENT HOSPITALITY PORTIONS"`,
      `"Dish Name","Portions","Beneficiary / Guest","Reason","Total Value (ETB)"`,
      ...managementMenuEntries.map((m) => `"${m.dishName}","${m.quantity}","${m.beneficiary}","${m.reason}","${m.totalCostEtb}"`),
      ``,
      `"SECTION 4: AI AUDITOR EXECUTIVE DIAGNOSIS"`,
      `"${calculateAnalysis.aiDiagnosisAm.replace(/"/g, '""')}"`,
      `"${calculateAnalysis.aiReasoningAm.replace(/"/g, '""')}"`,
      ``,
      `"SIGNATURES"`,
      `"Prepared By (F&B Controller):","____________________"`,
      `"Verified By (Branch Manager):","____________________"`,
      `"Approved By (Owner / General Manager):","____________________"`,
    ];

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + lines.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Owner_Report_Data_Blend_${(currentBranch?.nameEn || 'Branch').replace(/\s+/g, '_')}_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportOwnerReportWord = () => {
    const menuRows = calculateAnalysis.menuReconciliationRows.map((m) => ({
      dishName: m.dishName,
      sellingPrice: m.sellingPrice,
      chefQty: m.chefQty,
      cashierQty: m.cashierQty,
      variance: m.variance,
      varianceEtb: m.varianceEtb,
      meaning: language === 'am' ? m.meaningAm : m.meaningEn,
    }));

    const itemRows = calculateAnalysis.itemAuditResults.map((r) => ({
      itemCode: r.itemCode,
      itemName: r.itemName,
      countUnit: r.countUnit,
      unitPrice: r.unitPrice,
      beginningCount: r.beginningCount,
      receivedQty: r.receivedQty,
      runningTotal: r.runningTotal,
      recipeUsageSales: r.recipeUsageSales,
      recipeUsageMgmt: r.recipeUsageMgmt,
      totalRecipeUsage: r.totalRecipeUsage,
      damageQty: r.damageQty,
      transferOutQty: r.transferOutQty,
      expectedEnding: r.expectedEnding,
      actualEnding: r.actualEnding,
      varianceQty: r.varianceQty,
      varianceValueEtb: r.varianceValueEtb,
      statusLabel: language === 'am' ? r.statusLabelAm : r.statusLabelEn,
    }));

    const mgmtRows = managementMenuEntries.map((m) => ({
      dishName: m.dishName,
      quantity: m.quantity,
      beneficiary: m.beneficiary,
      reason: m.reason,
      costEtb: m.totalCostEtb,
    }));

    const dmgRows = Object.entries(damageCounts)
      .filter(([_, qty]) => (qty || 0) > 0)
      .map(([itemId, qty]) => {
        const it = items.find((i) => i.id === itemId);
        const price = it?.lastPurchasePrice || it?.weightedAvgCost || 0;
        return {
          itemName: it ? (language === 'am' ? it.nameAm : it.nameEn) : itemId,
          quantity: qty,
          unit: it?.unitAm || it?.unit || 'ኪ.ግ',
          lossEtb: qty * price,
          reason: damageNotes[itemId] || (language === 'am' ? 'ብክነት / ስብራት' : 'Damage / Waste'),
        };
      });

    downloadWordDocument({
      branchName: language === 'am' ? (currentBranch?.nameAm || currentBranch?.nameEn || '') : (currentBranch?.nameEn || currentBranch?.nameAm || ''),
      branchCode: currentBranch?.code || '',
      selectedDate,
      ethiopianDateStr: formatEthiopianDate(selectedDate, language),
      selectedShift: selectedShift === 'ALL_DAY' ? (language === 'am' ? 'ሙሉ ቀን' : 'All Day') : selectedShift,
      managerName,
      totalCashierRevenue,
      totalChefRevenue,
      cashierVarianceEtb,
      totalTheoreticalCost,
      theoreticalFoodCostPct,
      actualConsumptionCost,
      netVarianceEtb,
      totalMgmtValue,
      totalDamageValue,
      aiDiagnosis: language === 'am' ? calculateAnalysis.aiDiagnosisAm : calculateAnalysis.aiDiagnosisEn,
      aiReasoning: language === 'am' ? calculateAnalysis.aiReasoningAm : calculateAnalysis.aiReasoningEn,
      menuRows,
      itemRows,
      managementEntries: mgmtRows,
      damageEntries: dmgRows,
      categoryBreakdown: executiveCategoryBreakdown,
    });
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto text-slate-100 animate-fadeIn">
      {/* Live Staff Phone Submissions Sync Notification Banner */}
      {!dismissLiveBanner && liveSubmissions.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 border border-emerald-500/50 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {language === 'am' ? '📱 የቀጥታ ሰራተኞች ቆጠራ ደርሷል (Live Cloud Sync)' : 'Live Staff Phone Counts Received'}
                </span>
                <span className="text-xs text-slate-400">
                  {String(liveSubmissions[0]?.station || '').toUpperCase()} • {String(liveSubmissions[0]?.staffName || '')}
                </span>
              </div>
              <p className="text-xs text-slate-200 mt-1">
                {language === 'am'
                  ? `ከ${String(liveSubmissions[0]?.staffName || '')} (${String(liveSubmissions[0]?.station || '')}) ${Array.isArray(liveSubmissions[0]?.itemCounts) ? liveSubmissions[0].itemCounts.length : 0} የተቆጠሩ እቃዎች በስልካቸው ተልከዋል!`
                  : `${Array.isArray(liveSubmissions[0]?.itemCounts) ? liveSubmissions[0].itemCounts.length : 0} counts submitted via phone by ${String(liveSubmissions[0]?.staffName || '')}!`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => handleApplySubmissionToSheet(liveSubmissions[0])}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{language === 'am' ? 'ቀጥታ ወደ ሰንጠረዥ አስገባ (Apply)' : 'Apply to Sheet'}</span>
            </button>
            <button
              onClick={() => setDismissLiveBanner(true)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs transition"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 1: HEADER & BRANCH SELECTOR (Single-Screen Linear Flow)
          ========================================================================= */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 p-5 sm:p-6 rounded-3xl border border-amber-500/30 shadow-2xl space-y-4 backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-3 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-950 shadow-lg shadow-amber-500/20 font-black">
              <Building2 className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-400 bg-clip-text text-transparent">
                  {language === 'am' ? 'ዕለታዊ የብራንች ቁጥጥር' : 'Daily Branch Control'}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 font-bold">
                  Bello Fam
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {language === 'am'
                  ? 'መነሻ → የሜኑ ሪኮንሲሊየሽን (ሼፍ vs ካሸር) → በሬሲፒ ፍጆታ ስሌት → ማኔጅመንት → የመጨረሻ ቆጠራና AI ማጠቃለያ'
                  : 'Beginning → Menu Reconciliation (Chef vs Cashier) → Recipe Usage → Management → Ending & AI Analysis'}
              </p>
            </div>
          </div>

          {/* Quick Global Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Auto-Save Status Button */}
            <button
              onClick={handleSaveDayAudit}
              title={language === 'am' ? 'የቀኑን መዝገብ አስቀምጥ' : 'Save day audit record'}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black shadow-md border transition-all cursor-pointer ${
                saveStatus === 'saved'
                  ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200'
                  : saveStatus === 'saving'
                  ? 'bg-amber-950/80 border-amber-400 text-amber-200 animate-pulse'
                  : 'bg-slate-900 border-amber-500/60 text-amber-300 hover:bg-slate-800'
              }`}
            >
              {saveStatus === 'saved' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{language === 'am' ? 'ተቀምጧል ✓' : 'Saved ✓'}</span>
                </>
              ) : saveStatus === 'saving' ? (
                <>
                  <Save className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  <span>{language === 'am' ? 'በማስቀመጥ ላይ...' : 'Saving...'}</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 text-amber-400" />
                  <span>{language === 'am' ? '💾 አስቀምጥ' : '💾 Save'}</span>
                </>
              )}
            </button>

            {/* Clean-Zero Reset Button */}
            <button
              onClick={() => {
                if (
                  window.confirm(
                    language === 'am'
                      ? 'ሁሉንም ዳታ (ስቶር፣ ሜኑዎች፣ ቆጠራዎች እና የቆዩ ሂሳቦች) ሙሉ ለሙሉ ከዜሮ (0) ማስጀመር ይፈልጋሉ?'
                      : 'Reset all items, menus, balances, and records completely to zero (0)?'
                  )
                ) {
                  clearAllDataCompletely();
                }
              }}
              title={language === 'am' ? 'ሁሉንም ዳታ ከዜሮ (0) አጽዳ' : 'Reset all data completely to 0'}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black text-rose-200 bg-rose-950/70 hover:bg-rose-900/80 shadow-md border border-rose-500/40 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
              <span>{language === 'am' ? '🗑️ ከዜሮ አስጀምር (Reset 0)' : '🗑️ Reset to 0'}</span>
            </button>

            {/* Print Count Sheet */}
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-200 bg-slate-950/80 border border-slate-800 hover:bg-slate-850 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>{language === 'am' ? 'ቅጽ አትም' : 'Print'}</span>
            </button>
          </div>
        </div>

        {/* 24-Hour Hospitality Operating Day Notice Banner */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-950 border border-amber-500/40 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 border border-amber-500/30">
              <Clock className="w-4 h-4" />
            </span>
            <div>
              <p className="font-extrabold text-amber-300 text-xs sm:text-sm flex items-center gap-1.5">
                <span>{language === 'am' ? '⏰ የ24-ሰዓት የሬስቶራንት የስራ ቀን ዑደት' : '⏰ 24-Hour Restaurant Operating Cycle'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {language === 'am' ? 'ዳታ በፍጹም አይጠፋም' : 'Zero Data Loss'}
                </span>
              </p>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {language === 'am'
                  ? 'የአንድ ሙሉ ቀን የስራ ዑደት በነገው ጠዋት (11:00 - 12:00 ሰዓት) በሚደረገው ቆጠራ ይዘጋል። ቀኑ ቢቀያየርም ወይም በማንኛውም ጊዜ ቢመለሱ የሞሉት መረጃ በፍጹም አይጠፋም ወይም ዜሮ አይሆንም!'
                  : 'A business day cycle closes with the next morning physical count (11:00-12:00 AM). Data is permanently saved per date and never auto-zeroed!'}
              </p>
            </div>
          </div>
          {lastSavedTime && (
            <span className="text-[10px] text-emerald-400 font-mono shrink-0 bg-emerald-950/70 px-2.5 py-1.5 rounded-xl border border-emerald-500/40 shadow-sm flex items-center gap-1.5">
              <Check className="w-3 h-3 text-emerald-400" />
              <span>{language === 'am' ? `ሴቭ የተደረገበት፦ ${lastSavedTime}` : `Saved at: ${lastSavedTime}`}</span>
            </span>
          )}
        </div>

        {/* 5 INTERCONNECTED PILLARS OF BRANCH DAILY CONTROL */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setViewMode('dailyInput')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'dailyInput'
                ? 'bg-amber-400 text-slate-950 font-black shadow-lg ring-2 ring-amber-300'
                : 'bg-slate-900/90 text-slate-300 hover:text-white border border-slate-800 hover:bg-slate-850'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>{language === 'am' ? '📋 ዕለታዊ መሙያና ቆጠራ' : '📋 Daily Input & Count'}</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('menuRecipes')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'menuRecipes'
                ? 'bg-amber-400 text-slate-950 font-black shadow-lg ring-2 ring-amber-300'
                : 'bg-slate-900/90 text-slate-300 hover:text-white border border-slate-800 hover:bg-slate-850'
            }`}
          >
            <ChefHat className="w-4 h-4 text-amber-400" />
            <span>{language === 'am' ? '🍽️ የሜኑ ሪሲፒ' : '🍽️ Menu & Recipes'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-200 font-mono">
              {branchRecipes.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setViewMode('varianceAudit');
              setAnalysisActive(true);
            }}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'varianceAudit'
                ? 'bg-amber-400 text-slate-950 font-black shadow-lg ring-2 ring-amber-300'
                : 'bg-slate-900/90 text-slate-300 hover:text-white border border-slate-800 hover:bg-slate-850'
            }`}
          >
            <Scale className="w-4 h-4 text-amber-400" />
            <span>{language === 'am' ? '📊 የልዩነት እና ኦዲት ሪፖርት' : '📊 Variance & Audit'}</span>
            {Math.abs(netVarianceEtb) > 50 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/30 text-rose-300 font-mono font-bold animate-pulse">
                !
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setViewMode('fbControl');
              setAnalysisActive(true);
            }}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'fbControl'
                ? 'bg-amber-400 text-slate-950 font-black shadow-lg ring-2 ring-amber-300'
                : 'bg-slate-900/90 text-slate-300 hover:text-white border border-slate-800 hover:bg-slate-850'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-amber-400" />
            <span>{language === 'am' ? '🛡️ ኤፍ ኤንድ ቢ ኮንትሮል' : '🛡️ F&B Control'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setViewMode('ownerReport');
              setAnalysisActive(true);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'ownerReport'
                ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-black shadow-lg ring-2 ring-yellow-300'
                : 'bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-transparent text-amber-300 hover:text-white border border-amber-500/40 hover:bg-amber-900/40'
            }`}
          >
            <FileText className="w-4 h-4 text-amber-400" />
            <span className="font-extrabold">{language === 'am' ? '👑 ለባለቤት ይፋዊ ሪፖርት (የውሂብ ድብልቅ - Word)' : '👑 Official Owner’s Report (Data Blend)'}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-400/20 text-amber-200 border border-amber-400/30 font-bold">
              {language === 'am' ? 'የውሂብ ድብልቅ' : 'Data Blend'}
            </span>
          </button>
        </div>

        {/* 4 Self-Governing Branch Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
          <span className="text-xs font-bold text-slate-400 mr-1">
            {language === 'am' ? 'ቅርንጫፍ ይምረጡ:' : 'Select Branch:'}
          </span>
          {branches.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelectedBranchId(b.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedBranchId === b.id
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black shadow-lg shadow-amber-500/25 ring-2 ring-amber-300'
                  : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>{language === 'am' ? b.nameAm : b.nameEn}</span>
            </button>
          ))}
        </div>

        {/* Date, Shift, and Manager Control Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800/80 text-xs">
          <div>
            <label className="text-[11px] text-slate-400 block mb-1 font-bold">
              {language === 'am' ? 'የስራ ቀን (Date)' : 'Selected Date'}
            </label>
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-white text-xs w-full focus:outline-none"
              />
            </div>
            <span className="text-[10px] text-amber-400/90 mt-1 block">
              🇪🇹 {formatEthiopianDate(selectedDate)}
            </span>

            {/* Quick date shortcuts & calendar toggle */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedDate(getRelativeDateString(-1))}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                  selectedDate === getRelativeDateString(-1)
                    ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                {language === 'am' ? '⏪ ትናንት (የዛሬ ጠዋት ቆጠራ)' : '⏪ Yesterday'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(getTodayDateString())}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                  selectedDate === getTodayDateString()
                    ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                {language === 'am' ? '⏺️ ዛሬ (የነገ ጠዋት ቆጠራ)' : '⏺️ Today'}
              </button>
              <button
                type="button"
                onClick={() => setCalendarOpen(!calendarOpen)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1 transition-all ${
                  calendarOpen
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                    : 'bg-amber-950/50 text-amber-300 border-amber-500/40 hover:bg-amber-900/50'
                }`}
              >
                <Calendar className="w-3 h-3" />
                <span>{language === 'am' ? '📅 ካሌንደር' : '📅 Calendar'}</span>
                {recordedDates.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5"></span>
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1 font-bold">
              {language === 'am' ? 'የስራ ፈረቃ (Shift)' : 'Shift / Period'}
            </label>
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 font-bold"
            >
              <option value="ALL_DAY">{language === 'am' ? 'ሙሉ ቀን (Full Day)' : 'Full Day'}</option>
              <option value="MORNING">{language === 'am' ? 'የጠዋት ፈረቃ (Morning)' : 'Morning Shift'}</option>
              <option value="EVENING">{language === 'am' ? 'የማታ ፈረቃ (Evening)' : 'Evening Shift'}</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1 font-bold">
              {language === 'am' ? 'የቅርንጫፉ ማኔጀር' : 'Branch Manager'}
            </label>
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                className="bg-transparent text-white text-xs w-full focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Expandable Visual Month Calendar with Recorded Dates Marked */}
        {calendarOpen && (
          <div className="p-4 bg-slate-950/95 border-2 border-amber-500/40 rounded-2xl space-y-3 mt-3 animate-fadeIn">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white">
                  {calendarViewMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </span>
                <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950 px-2 py-0.5 rounded-md border border-emerald-500/30">
                  {recordedDates.length} {language === 'am' ? 'የተመዘገቡ ቀናት' : 'Recorded Days'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarOpen(false)}
                  className="p-1 text-slate-400 hover:text-white ml-2 text-xs font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              {language === 'am'
                ? 'አረንጓዴ ነጥብ (●) ያለባቸው ቀናት ቀደም ሲል የተመዘገበ ዳታ አላቸው። ማንኛውንም ቀን በመጫን የቀኑን ሙሉ ቆጠራና ሪፖርት ማየት ይችላሉ፦'
                : 'Dates marked with a green dot (●) have recorded data. Click any date to view or edit:'}
            </p>

            <div className="grid grid-cols-7 gap-1 text-center">
              {['ሰኞ', 'ማክ', 'ረቡዕ', 'ሐሙስ', 'አርብ', 'ቅዳሜ', 'እሁድ'].map((d, i) => (
                <div key={i} className="text-[10px] font-bold text-slate-400 py-1">
                  {d}
                </div>
              ))}
              {calendarDays.map((cd, idx) => {
                if (!cd.isCurrentMonth) {
                  return <div key={idx} className="p-1.5 opacity-0 pointer-events-none" />;
                }
                const isSelected = cd.dateStr === selectedDate;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedDate(cd.dateStr);
                      setCalendarOpen(false);
                    }}
                    className={`relative p-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center cursor-pointer ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 font-black ring-2 ring-amber-300 shadow-md'
                        : cd.hasData
                        ? 'bg-emerald-950/40 text-emerald-200 border border-emerald-500/40 hover:bg-emerald-900/40'
                        : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <span>{cd.day}</span>
                    {cd.hasData && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mt-0.5"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {viewMode === 'dailyInput' && (
        <>
          {/* =========================================================================
              SECTION 2: STEP 1 — የመነሻ ቆጠራ እና የተቀበሉት እቃዎች (Beginning + Received)
              ========================================================================= */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingFile(true);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setIsDraggingFile(false);
              }
            }}
            onDrop={handleStockFileDrop}
            className={`p-5 rounded-3xl border shadow-xl space-y-4 backdrop-blur-md relative transition-all ${
              isDraggingFile ? 'bg-teal-950/40 border-teal-400 ring-4 ring-teal-500/40' : 'bg-slate-900/90 border-amber-500/20'
            }`}
          >
            {isDraggingFile && (
              <div className="absolute inset-0 z-30 bg-teal-950/90 border-2 border-dashed border-teal-400 rounded-3xl flex flex-col items-center justify-center gap-2 p-6 pointer-events-none backdrop-blur-sm animate-fadeIn">
                <FileSpreadsheet className="w-12 h-12 text-teal-400 animate-bounce" />
                <h4 className="text-base font-black text-teal-200">
                  {language === 'am' ? '📥 የ Excel (.xlsx, .xls) ወይም CSV ፋይሉን እዚህ ይልቀቁ!' : '📥 Drop Excel (.xlsx, .xls) or CSV file here!'}
                </h4>
                <p className="text-xs text-teal-300/80">
                  {language === 'am' ? 'ሲለቁት ወዲያውኑ አንብቦ መነሻ፣ ገቢ፣ መዝጊያና የተላከውን ያዘጋጃል' : 'System will immediately parse Beginning, Received, Ending & Transfer'}
                </p>
              </div>
            )}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-500/20 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-black text-sm border border-amber-500/30">
              1
            </span>
            <div>
              <h3 className="font-black text-sm sm:text-base text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <span>
                  {language === 'am'
                    ? 'ደረጃ 1፦ ዕለታዊ የጥሬ ዕቃዎች ቆጠራ (Beginning, Received, Ending, Transfer)'
                    : 'Step 1: Daily Raw Materials Stock Table (Beginning, Received, Ending, Transfer)'}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'am'
                  ? 'አራቱም ቁልፍ ቆጠራዎች (መነሻ ቁጥር፣ የተቀበሉት፣ እጃቸው ላይ ያለ፣ የተላከ) ለመሙላት እንዲመች አጠገብ ለአጠገብ በአንድ ላይ ተቀምጠዋል።'
                  : 'All 4 key inventory counts (Beginning, Received, Ending on hand, Transfer out) positioned side-by-side for seamless data entry.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Standardized Chef Handover & Quick Text Import Button */}
            <button
              type="button"
              onClick={() => setChefSlipModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl text-xs shadow-md transition-all cursor-pointer border border-emerald-400/40"
            >
              <ClipboardCheck className="w-4 h-4 text-emerald-200" />
              <span>{language === 'am' ? '📝 የሼፎች ፈጣን ቆጠራ' : '📝 Chef Quick Slip'}</span>
            </button>

            {/* Quick Run Analysis Button right at Step 1 */}
            <button
              type="button"
              onClick={handleRunAnalysis}
              disabled={isAnalyzing}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black rounded-xl text-xs shadow-md transition-all cursor-pointer border border-amber-200"
              title={language === 'am' ? 'ሙሉ ሪኮንሳይሌሽኑንና ልዩነቱን ወዲያውኑ ተንትን' : 'Run Full F&B Reconciliation Analysis'}
            >
              {isAnalyzing ? (
                <RotateCcw className="w-3.5 h-3.5 animate-spin text-slate-950" />
              ) : (
                <BrainCircuit className="w-3.5 h-3.5 text-slate-950" />
              )}
              <span>{isAnalyzing ? (language === 'am' ? 'እየተተነተነ...' : 'Analyzing...') : (language === 'am' ? '⚡ ተንትን (Run Audit)' : '⚡ Analyze')}</span>
            </button>

            {/* Bulk Multi-select Primary Material Button */}
            <button
              type="button"
              onClick={() => setNewPrimaryModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-slate-800 to-slate-900 hover:bg-slate-700 text-amber-300 font-black rounded-xl text-xs shadow-md transition-all cursor-pointer border border-amber-500/40"
            >
              <PackagePlus className="w-4 h-4 text-amber-400" />
              <span>{language === 'am' ? '+ ፕራይመሪ ዕቃ ጨምር' : '+ Add Primary Item'}</span>
            </button>

            {/* Requirement 1: Multi-select Remove Selected Button */}
            {selectedTrackedItemIds.length > 0 && (
              <button
                type="button"
                onClick={() => setShowBulkRemoveConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-rose-700 to-red-600 hover:from-rose-600 hover:to-red-500 text-white font-black rounded-xl text-xs shadow-md transition-all cursor-pointer border border-rose-400/50 animate-pulse"
                title={language === 'am' ? 'የተመረጡትን እቃዎች ከቆጠራ ዝርዝር አስወግድ' : 'Remove Selected Items from tracking'}
              >
                <Trash2 className="w-4 h-4 text-white" />
                <span>
                  {language === 'am'
                    ? `🗑️ የተመረጡትን አስወግድ (${selectedTrackedItemIds.length})`
                    : `🗑️ Remove Selected (${selectedTrackedItemIds.length})`}
                </span>
              </button>
            )}

            {/* 1-Click Direct Paste from Clipboard Button */}
            <button
              type="button"
              onClick={handleInstantPasteFromClipboard}
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-black rounded-xl text-xs shadow-md transition-all cursor-pointer border border-emerald-400/50"
              title={language === 'am' ? 'ከኮምፒውተር ክሊፕቦርድ ቀጥታ ፔስት አድርግ' : 'Instant Paste from Clipboard'}
            >
              <ClipboardPaste className="w-4 h-4 text-emerald-200" />
              <span>{language === 'am' ? '📋 ቀጥታ Paste' : '📋 Direct Paste'}</span>
            </button>

            {/* Direct File Picker (.xlsx, .xls, .csv) */}
            <label className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-teal-300 font-bold rounded-xl text-xs shadow-sm transition-all cursor-pointer border border-teal-500/40">
              <Upload className="w-4 h-4 text-teal-400" />
              <span>{language === 'am' ? '📁 Excel/CSV ፋይል ጫን' : '📁 Upload File'}</span>
              <input
                type="file"
                accept=".csv,.tsv,.txt,.xlsx,.xls"
                onChange={handleStockExcelFileUpload}
                className="hidden"
              />
            </label>

            {/* 4-Column Excel Modal Launcher */}
            <button
              type="button"
              onClick={() => setStockExcelModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold rounded-xl text-xs shadow-sm transition-all cursor-pointer border border-slate-700"
              title="የExcel ማስገቢያ ሳጥን እና የቴምፕሌት ገጽ"
            >
              <FileSpreadsheet className="w-4 h-4 text-slate-400" />
              <span>{language === 'am' ? '📊 Excel ሳጥን' : '📊 Excel Tool'}</span>
            </button>

            {/* Roll Over to Next Day Button */}
            <button
              type="button"
              onClick={handleRollOverToNextDay}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
              title={language === 'am' ? 'ይህንን ቆጠራ ለነገ ጠዋት መነሻ (Beginning) አድርግ' : 'Roll Over this ending count as tomorrow beginning count'}
            >
              <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
              <span>{language === 'am' ? '🔄 ለነገ ጠዋት መነሻ አድርግ' : '🔄 Roll Over to Next Day'}</span>
            </button>

            {/* Shola & 6 Kilo Mirror / Clone Tools */}
            {selectedBranchId === 'br-kokonut-6kilo' && (
              <button
                type="button"
                onClick={handleCloneSholaToSixKilo}
                title={language === 'am' ? 'የኮኮናት ሾላን ፕራይመሪ እቃዎች ወደ 6 ኪሎ ገልብጥ' : 'Clone from Cocoon Shola'}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-950/80 hover:bg-blue-900 text-blue-200 border border-blue-500/40 font-bold rounded-xl text-xs shadow-sm transition-all cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-blue-400" />
                <span>{language === 'am' ? '🔄 ከሾላ ገልብጥ' : '🔄 Clone Shola'}</span>
              </button>
            )}

            {selectedBranchId === 'br-cocoon-shola' && (
              <button
                type="button"
                onClick={handleCloneSixKiloToShola}
                title={language === 'am' ? 'የኮኮናት 6 ኪሎን ፕራይመሪ እቃዎች ወደ ሾላ ገልብጥ' : 'Clone from Cocoon 6 Kilo'}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-950/80 hover:bg-blue-900 text-blue-200 border border-blue-500/40 font-bold rounded-xl text-xs shadow-sm transition-all cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-blue-400" />
                <span>{language === 'am' ? '🔄 ከ6 ኪሎ ገልብጥ' : '🔄 Clone 6 Kilo'}</span>
              </button>
            )}

            {(selectedBranchId === 'br-cocoon-shola' || selectedBranchId === 'br-kokonut-6kilo') && (
              <button
                type="button"
                onClick={handleSyncSholaAndSixKilo}
                title={language === 'am' ? 'የሾላ እና 6 ኪሎን ፕራይመሪ እቃዎች 100% አመሳስል' : 'Synchronize Shola & 6 Kilo Items'}
                className="flex items-center gap-1.5 px-3 py-2 bg-purple-950/80 hover:bg-purple-900 text-purple-200 border border-purple-500/40 font-bold rounded-xl text-xs shadow-sm transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
                <span>{language === 'am' ? '⚡ አመሳስል' : '⚡ Sync'}</span>
              </button>
            )}

            {/* 1-Click Firestore Cloud Sync Button */}
            <button
              type="button"
              onClick={async () => {
                setSyncNotice(language === 'am' ? 'ዳታውን ወደ Firebase Firestore እየገለበጠ ነው...' : 'Syncing data to Firebase Firestore...');
                const res = await syncFullERPToFirestore({
                  branches,
                  items,
                  recipes,
                  trackedItems: trackedItemsList,
                });
                setSyncNotice(res.message);
                setTimeout(() => setSyncNotice(null), 6000);
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/10 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/50 font-black rounded-xl text-xs shadow-sm transition-all cursor-pointer"
              title={language === 'am' ? 'ሙሉ ቅርንጫፎች፣ ጥሬ ዕቃዎችና ሬሲፒዎችን ወደ Firebase Cloud ይገልብጣል' : 'Sync all data to Firebase Cloud Firestore'}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>{language === 'am' ? '🔥 ወደ Firebase ገልብጥ' : '🔥 Firebase Sync'}</span>
            </button>

            <div className="text-xs text-amber-300 font-mono bg-amber-950/60 px-3 py-1.5 rounded-xl border border-amber-500/40 font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{trackedItemsList.length} {language === 'am' ? 'ዕቃዎች' : 'items'}</span>
            </div>

            {/* Instant Live Search Filter for Items */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-amber-500/30 text-xs">
              <Search className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <input
                type="text"
                value={trackedItemSearchQuery}
                onChange={(e) => setTrackedItemSearchQuery(e.target.value)}
                placeholder={language === 'am' ? 'ዕቃ ፈልግ (ስጋ፣ ሽንኩርት...)' : 'Filter item...'}
                className="bg-transparent text-white text-xs w-32 focus:outline-none placeholder-slate-500"
              />
              {trackedItemSearchQuery && (
                <button onClick={() => setTrackedItemSearchQuery('')} className="text-slate-400 hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sync notification banner */}
        {syncNotice && (
          <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-950/90 to-purple-950/90 border border-blue-400/50 text-blue-100 text-xs font-bold flex items-center justify-between gap-2 shadow-lg animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{syncNotice}</span>
            </div>
            <button
              onClick={() => setSyncNotice(null)}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Table of Tracked Items */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-300 font-bold bg-slate-950/80">
                {/* Checkbox for Select All */}
                <th className="py-2.5 px-2 text-center w-8">
                  <input
                    type="checkbox"
                    checked={
                      filteredTrackedItemsList.length > 0 &&
                      filteredTrackedItemsList.every((t) => selectedTrackedItemIds.includes(t.itemId))
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        const allIds = Array.from(
                          new Set([...selectedTrackedItemIds, ...filteredTrackedItemsList.map((t) => t.itemId)])
                        );
                        setSelectedTrackedItemIds(allIds);
                      } else {
                        const visibleIds = new Set(filteredTrackedItemsList.map((t) => t.itemId));
                        setSelectedTrackedItemIds((prev) => prev.filter((id) => !visibleIds.has(id)));
                      }
                    }}
                    className="accent-amber-400 w-3.5 h-3.5 cursor-pointer rounded"
                    title={language === 'am' ? 'ሁሉንም ምረጥ' : 'Select All'}
                  />
                </th>
                <th className="py-2.5 px-3">{language === 'am' ? 'የዕቃ ኮድ' : 'Code'}</th>
                <th className="py-2.5 px-3 min-w-[130px]">{language === 'am' ? 'የጥሬ ዕቃ ስም' : 'Tracked Raw Material'}</th>
                <th className="py-2.5 px-2 text-center">{language === 'am' ? 'መለኪያ' : 'Unit'}</th>
                <th className="py-2.5 px-2 text-right text-amber-300">{language === 'am' ? 'ዋጋ (ETB)' : 'Price'}</th>

                {/* 1. Beginning - መነሻ ቁጥር */}
                <th className="py-2.5 px-3 text-right bg-amber-950/30 border-l border-r border-amber-500/20 text-amber-300 font-black">
                  <div className="flex flex-col items-end">
                    <span className="text-[11px]">{language === 'am' ? 'Beginning' : 'Beginning'}</span>
                    <span className="text-[10px] text-amber-400/80 font-normal">{language === 'am' ? 'መነሻ ቁጥር' : 'Opening Count'}</span>
                  </div>
                </th>

                {/* 2. Received - የተቀበሉት */}
                <th className="py-2.5 px-3 text-right bg-blue-950/30 border-r border-blue-500/20 text-blue-300 font-black">
                  <div className="flex flex-col items-end">
                    <span className="text-[11px]">{language === 'am' ? 'Received' : 'Received'}</span>
                    <span className="text-[10px] text-blue-400/80 font-normal">{language === 'am' ? 'የተቀበሉት' : 'Day Delivery'}</span>
                  </div>
                </th>

                {/* 3. Ending - እጃቸው ላይ ያለ */}
                <th className="py-2.5 px-3 text-right bg-emerald-950/30 border-r border-emerald-500/20 text-emerald-300 font-black">
                  <div className="flex flex-col items-end">
                    <span className="text-[11px]">{language === 'am' ? 'Ending' : 'Ending'}</span>
                    <span className="text-[10px] text-emerald-400/80 font-normal">{language === 'am' ? 'እጃቸው ላይ ያለ' : 'Physical On Hand'}</span>
                  </div>
                </th>

                {/* 4. Transfer - የተላከ */}
                <th className="py-2.5 px-3 text-right bg-purple-950/30 border-r border-purple-500/20 text-purple-300 font-black">
                  <div className="flex flex-col items-end">
                    <span className="text-[11px]">{language === 'am' ? 'Transfer' : 'Transfer'}</span>
                    <span className="text-[10px] text-purple-400/80 font-normal">{language === 'am' ? 'የተላከ' : 'Transfer Out'}</span>
                  </div>
                </th>

                {/* Estimated Usage Preview */}
                <th className="py-2.5 px-3 text-right text-slate-300 font-black">
                  {language === 'am' ? 'የቀኑ አጠቃቀም' : 'Est. Usage'}
                </th>

                <th className="py-2.5 px-2 text-center">{language === 'am' ? 'ተግባር' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredTrackedItemsList.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-10 px-4 text-center">
                    <div className="space-y-3 max-w-md mx-auto">
                      <p className="text-sm font-bold text-slate-300">
                        {language === 'am'
                          ? 'በዚህ ቅርንጫፍ እስካሁን ምንም ፕራይመሪ ዕቃ አልተጨመረም (ባዶ/ዜሮ ጅማሬ)።'
                          : 'No primary materials added for this branch yet (Clean Zero Start).'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {language === 'am'
                          ? 'ከዚህ በታች ያለውን አዝራር በመጫን የራስዎን አዲስ ጥሬ ዕቃዎች ያክሉ።'
                          : 'Click below to add your own raw materials to track for this branch.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => setNewPrimaryModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 text-slate-950 font-black text-xs shadow-lg cursor-pointer"
                      >
                        <PackagePlus className="w-4 h-4" />
                        <span>{language === 'am' ? '+ አዲስ ፕራይመሪ ዕቃ ጨምር' : '+ Add First Primary Item'}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              {filteredTrackedItemsList.map((tracked) => {
                const raw = items.find((i) => i.id === tracked.itemId);
                const beg = beginningCounts[tracked.itemId] || 0;
                const rec = receivedCounts[tracked.itemId] || 0;
                const end = actualEndingCounts[tracked.itemId];
                const trans = transferOutCounts[tracked.itemId] || 0;
                const unitPrice = raw?.lastPurchasePrice || raw?.weightedAvgCost || 0;
                const runningTotal = Number((beg + rec - trans).toFixed(3));
                const hasEnd = end !== undefined && end !== null && end !== ('' as unknown as number);
                const estUsage = hasEnd ? Number((runningTotal - Number(end)).toFixed(3)) : null;

                return (
                  <tr key={tracked.id} className="hover:bg-slate-850/50 transition-colors">
                    {/* Item Multi-select Checkbox */}
                    <td className="py-2.5 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={selectedTrackedItemIds.includes(tracked.itemId)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTrackedItemIds((prev) => [...prev, tracked.itemId]);
                          } else {
                            setSelectedTrackedItemIds((prev) => prev.filter((id) => id !== tracked.itemId));
                          }
                        }}
                        className="accent-amber-400 w-3.5 h-3.5 cursor-pointer rounded"
                      />
                    </td>

                    {/* Item Code */}
                    <td className="py-2.5 px-3 font-mono text-amber-400 font-bold whitespace-nowrap">
                      {raw?.code}
                    </td>

                    {/* Item Name */}
                    <td className="py-2.5 px-3 font-bold text-white">
                      <span className="block leading-tight">{language === 'am' ? raw?.nameAm : raw?.nameEn}</span>
                      {raw?.nameAm && raw?.nameEn && (
                        <span className="text-[10px] text-slate-400 font-normal block">
                          {language === 'am' ? raw.nameEn : raw.nameAm}
                        </span>
                      )}
                    </td>

                    {/* Unit */}
                    <td className="py-2.5 px-2 text-center font-semibold text-slate-300 whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800/70 text-[11px]">
                        {tracked.countUnitAm}
                      </span>
                    </td>

                    {/* Inline amendable price input */}
                    <td className="py-2.5 px-2 text-right">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          defaultValue={unitPrice}
                          onBlur={(e) => {
                            const newP = parseFloat(e.target.value) || 0;
                            handleAmendItemPrice(tracked.itemId, newP);
                          }}
                          className="w-14 px-1.5 py-1 bg-slate-950 border border-amber-500/40 rounded-lg text-right font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-400 text-xs shadow-inner"
                          title={language === 'am' ? 'ዋጋ ሲቀየር እዚሁ ይተይቡ' : 'Type to amend unit price'}
                        />
                        <span className="text-[10px] text-amber-400 font-mono">ብር</span>
                      </div>
                    </td>

                    {/* 1. Beginning - መነሻ ቁጥር Input */}
                    <td className="py-2 px-3 text-right bg-amber-950/15 border-l border-r border-amber-500/20">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="0"
                          value={beginningCounts[tracked.itemId] ?? ''}
                          onChange={(e) =>
                            setBeginningCounts((prev) => ({
                              ...prev,
                              [tracked.itemId]: parseFloat(e.target.value) || 0,
                            }))
                          }
                          className="w-18 px-2 py-1 bg-slate-950 border border-amber-500/40 rounded-lg text-right font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-400 text-xs shadow-inner"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            startVoiceInput(
                              'beginning',
                              tracked.itemId,
                              `${raw?.nameAm || raw?.nameEn} መነሻ ቆጠራ`
                            )
                          }
                          title={language === 'am' ? 'በድምጽ ይናገሩ' : 'Voice Input'}
                          className="p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                        >
                          <Mic className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* 2. Received - የተቀበሉት Input */}
                    <td className="py-2 px-3 text-right bg-blue-950/15 border-r border-blue-500/20">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="0"
                          value={receivedCounts[tracked.itemId] ?? ''}
                          onChange={(e) =>
                            setReceivedCounts((prev) => ({
                              ...prev,
                              [tracked.itemId]: parseFloat(e.target.value) || 0,
                            }))
                          }
                          className="w-18 px-2 py-1 bg-slate-950 border border-blue-500/40 rounded-lg text-right font-mono font-bold text-blue-300 focus:outline-none focus:border-blue-400 text-xs shadow-inner"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            startVoiceInput(
                              'received',
                              tracked.itemId,
                              `${raw?.nameAm || raw?.nameEn} የተቀበሉት`
                            )
                          }
                          title={language === 'am' ? 'በድምጽ ይናገሩ' : 'Voice Input'}
                          className="p-1 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                        >
                          <Mic className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* 3. Ending - እጃቸው ላይ ያለ Input */}
                    <td className="py-2 px-3 text-right bg-emerald-950/15 border-r border-emerald-500/20">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="0"
                          value={actualEndingCounts[tracked.itemId] ?? ''}
                          onChange={(e) =>
                            setActualEndingCounts((prev) => ({
                              ...prev,
                              [tracked.itemId]: parseFloat(e.target.value) || 0,
                            }))
                          }
                          className="w-18 px-2 py-1 bg-slate-950 border border-emerald-500/40 rounded-lg text-right font-mono font-bold text-emerald-300 focus:outline-none focus:border-emerald-400 text-xs shadow-inner"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            startVoiceInput(
                              'ending',
                              tracked.itemId,
                              `${raw?.nameAm || raw?.nameEn} እጃቸው ላይ ያለ ቆጠራ`
                            )
                          }
                          title={language === 'am' ? 'በድምጽ ይናገሩ' : 'Voice Input'}
                          className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                        >
                          <Mic className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* 4. Transfer - የተላከ Input */}
                    <td className="py-2 px-3 text-right bg-purple-950/15 border-r border-purple-500/20">
                      <div className="flex flex-col items-end gap-1">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="0"
                          value={transferOutCounts[tracked.itemId] ?? ''}
                          onChange={(e) =>
                            setTransferOutCounts((prev) => ({
                              ...prev,
                              [tracked.itemId]: parseFloat(e.target.value) || 0,
                            }))
                          }
                          className="w-18 px-2 py-1 bg-slate-950 border border-purple-500/40 rounded-lg text-right font-mono font-bold text-purple-300 focus:outline-none focus:border-purple-400 text-xs shadow-inner"
                        />
                        {(transferOutCounts[tracked.itemId] || 0) > 0 && (
                          <select
                            value={transferOutDestinations[tracked.itemId] || ''}
                            onChange={(e) =>
                              setTransferOutDestinations((prev) => ({
                                ...prev,
                                [tracked.itemId]: e.target.value,
                              }))
                            }
                            className="w-24 text-[10px] px-1 py-0.5 bg-slate-950 border border-purple-500/40 rounded text-purple-200 focus:outline-none truncate"
                            title={language === 'am' ? 'የተላከበት ቅርንጫፍ' : 'Destination'}
                          >
                            <option value="">{language === 'am' ? '-- ቅርንጫፍ --' : '-- Branch --'}</option>
                            {branches
                              .filter((b) => b.id !== currentBranch?.id)
                              .map((b) => (
                                <option key={b.id} value={b.id}>
                                  {language === 'am' ? b.nameAm : b.nameEn}
                                </option>
                              ))}
                          </select>
                        )}
                      </div>
                    </td>

                    {/* Estimated Usage Preview */}
                    <td className="py-2.5 px-3 text-right font-mono text-xs whitespace-nowrap">
                      {hasEnd ? (
                        <div className="flex flex-col items-end">
                          <span className={`font-black ${(estUsage ?? 0) >= 0 ? 'text-teal-300' : 'text-rose-400'}`}>
                            {estUsage} {tracked.countUnitAm}
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {(estUsage ?? 0) >= 0 ? 'የተጠቀሙት' : 'ትርፍ (Overage)'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-slate-300">
                            {runningTotal} {tracked.countUnitAm}
                          </span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            {language === 'am' ? 'መነሻ + ገቢ - የተላከ' : 'Available Stock'}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Action: Remove with confirmation modal */}
                    <td className="py-2.5 px-2 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          setItemToRemove({
                            id: tracked.itemId,
                            name: raw?.nameAm || raw?.nameEn || tracked.itemId,
                          })
                        }
                        className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                        title={language === 'am' ? 'ከዚህ ቅርንጫፍ ቆጠራ አስወግድ' : 'Remove from branch tracking'}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          REQUIREMENT 2: SIDE-BY-SIDE SMART PASTE BOXES (KITCHEN KOT + POS MACHINE)
          ========================================================================= */}
      <div className="bg-gradient-to-r from-indigo-950/60 via-slate-900 to-rose-950/60 p-4 rounded-3xl border border-amber-500/30 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300">
            <ClipboardPaste className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-sm text-white">
              {language === 'am' ? '📋 የኪችን KOT እና የካሸር POS ቀጥታ ፔስት ማድረጊያ' : '📋 Side-by-Side Smart Paste: KOT & POS Sales'}
            </h3>
            <p className="text-xs text-slate-400">
              {language === 'am'
                ? 'የሼፎችን እና የካሸሮችን ዳታ በአንድ ላይ ፔስት ያድርጉ፤ ስሞችን አመሳስሎ በየሳጥናቸው ይከታል'
                : 'Paste Kitchen ticket and Cashier POS summary simultaneously with fuzzy matching and interactive preview'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsMenuSmartPasteOpen(true)}
          className="px-4 py-2 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-amber-500/25 transition-all cursor-pointer flex items-center gap-2 shrink-0 active:scale-95"
        >
          <ClipboardPaste className="w-4 h-4 text-slate-950" />
          <span>{language === 'am' ? '📋 ፔስት መክፈቻ ሳጥን (Open Smart Paste)' : 'Open Smart Paste'}</span>
        </button>
      </div>

      {/* =========================================================================
          SECTION 3: STEP 2 — የሼፎች የሸጡት የሜኑ ግቤት (Chef Sold Menu Counts)
          ========================================================================= */}
      <div className="bg-slate-900/90 p-5 rounded-3xl border border-indigo-500/30 shadow-xl space-y-4 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-500/20 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-black text-sm border border-indigo-500/30">
              2
            </span>
            <div>
              <h3 className="font-black text-sm sm:text-base text-white flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4 text-indigo-400" />
                <span>{language === 'am' ? 'የሼፎች የሸጡት የሜኑ ብዛት (KOT)' : 'Step 2: Chef Sold Menu Counts (Kitchen KOT)'}</span>
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'am'
                  ? 'በሜኑ ላይ የተመሰረተ ግቤት፦ በኩሽና የወጡ ምግቦች ብዛት (ለምሳሌ ስፓጌቲ ቦሎኔዝ 12፣ ታሌቴሊ አልፍሬዶ 8፣ ስፓጌቲ ቱና 6)'
                  : 'Menu-based inputs: Actual dishes prepared and served by the kitchen chefs.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Direct Smart Paste for Chef KOT */}
            <button
              type="button"
              onClick={() => setIsMenuSmartPasteOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-200 bg-indigo-950/80 border border-indigo-500/50 hover:bg-indigo-900/60 transition-all cursor-pointer shadow"
            >
              <ClipboardPaste className="w-3.5 h-3.5 text-indigo-300" />
              <span>{language === 'am' ? '📋 KOT ፔስት' : 'Paste KOT'}</span>
            </button>
            {/* Quick AI Match from Chef slip */}
            <button
              type="button"
              onClick={() => {
                setFnbDocType('CHEF_SOLD_LIST');
                setChefSlipTab('parser');
                setChefSlipModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow transition-all shrink-0 cursor-pointer"
            >
              <BrainCircuit className="w-3.5 h-3.5 text-indigo-200" />
              <span>{language === 'am' ? '⚡ ከወረቀት አመሳስል' : '⚡ Match KOT'}</span>
            </button>

            {/* Smart Search Box 🔍 (Instant filter while typing) */}
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-indigo-500/40 w-full sm:w-64">
              <Search className="w-4 h-4 text-indigo-400 shrink-0" />
              <input
                type="text"
                value={chefMenuSearchQuery}
                onChange={(e) => setChefMenuSearchQuery(e.target.value)}
                placeholder={language === 'am' ? 'ሜኑ ፈልግ (ለምሳሌ ስፓጌቲ)...' : 'Filter dish (e.g. spaghetti)...'}
                className="bg-transparent text-white text-xs w-full focus:outline-none placeholder-slate-500"
              />
              {chefMenuSearchQuery && (
                <button onClick={() => setChefMenuSearchQuery('')} className="text-slate-500 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Grid of Dishes for Fast Input */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredChefRecipes.map((recipe) => {
            const count = chefMenuSales[recipe.id] || 0;
            return (
              <div
                key={recipe.id}
                className={`p-3.5 rounded-2xl border transition-all ${
                  count > 0
                    ? 'bg-indigo-950/40 border-indigo-500/60 shadow-md ring-1 ring-indigo-500/30'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-xs text-white">
                      {language === 'am' ? recipe.nameAm : recipe.nameEn}
                    </h4>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      {recipe.category} • {formatCurrency(recipe.sellingPrice)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      value={chefMenuSales[recipe.id] ?? ''}
                      onChange={(e) =>
                        setChefMenuSales((prev) => ({
                          ...prev,
                          [recipe.id]: parseFloat(e.target.value) || 0,
                        }))
                      }
                      placeholder="0"
                      className="w-16 px-2 py-1 bg-slate-900 border border-indigo-500/40 rounded-lg text-right font-mono font-bold text-indigo-300 focus:outline-none focus:border-indigo-400 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        startVoiceInput(
                          'chef',
                          recipe.id,
                          `${recipe.nameAm || recipe.nameEn} የሼፍ ብዛት`
                        )
                      }
                      title={language === 'am' ? 'በድምጽ ይናገሩ' : 'Voice Input'}
                      className="p-1 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-md transition-colors"
                    >
                      <Mic className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          SECTION 4: STEP 3 — የካሽየር (POS) የሽያጭ ግቤት (Cashier/POS Menu Sales)
          ========================================================================= */}
      <div className="bg-slate-900/90 p-5 rounded-3xl border border-rose-500/30 shadow-xl space-y-4 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rose-500/20 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-black text-sm border border-rose-500/30">
              3
            </span>
            <div>
              <h3 className="font-black text-sm sm:text-base text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-rose-400" />
                <span>{language === 'am' ? 'የካሽየር (POS) የሸጠው የሜኑ ዝርዝር' : 'Step 3: Cashier / POS Billed Sales'}</span>
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'am'
                  ? 'ከካሽየር ሪፖርት ወይም ከPOS ሲስተም የተከፈለበት የሜኑ ብዛት። በሜኑ ደረጃ ከሼፍ ጋር ይነጻጸራል።'
                  : 'Billed sales imported from Cashier POS report. Cross-matched against Chef orders.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Direct Smart Paste for POS Sales */}
            <button
              type="button"
              onClick={() => setIsMenuSmartPasteOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-200 bg-rose-950/80 border border-rose-500/50 hover:bg-rose-900/60 transition-all cursor-pointer shadow"
            >
              <ClipboardPaste className="w-3.5 h-3.5 text-rose-300" />
              <span>{language === 'am' ? '📋 POS ፔስት' : 'Paste POS'}</span>
            </button>

            {/* Quick AI Match for Cashier Sales */}
            <button
              type="button"
              onClick={() => {
                setFnbDocType('CASHIER_SALES');
                setChefSlipTab('parser');
                setChefSlipModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-teal-200 bg-teal-950/80 border border-teal-500/40 hover:bg-teal-900/60 transition-all cursor-pointer"
            >
              <BrainCircuit className="w-3.5 h-3.5 text-teal-400" />
              <span>{language === 'am' ? '⚡ ከወረቀት አመሳስል' : '⚡ Match POS'}</span>
            </button>

            {/* Excel Paste Button */}
            <button
              onClick={() => setExcelPasteModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-200 bg-rose-950/60 border border-rose-500/40 hover:bg-rose-900/50 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-rose-400" />
              <span>{language === 'am' ? '📋 Excel/CSV ለጥፍ' : 'Paste Excel/CSV'}</span>
            </button>

            {/* Smart Search */}
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-rose-500/40 w-48 sm:w-64">
              <Search className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <input
                type="text"
                value={cashierMenuSearchQuery}
                onChange={(e) => setCashierMenuSearchQuery(e.target.value)}
                placeholder={language === 'am' ? 'ካሸር ሜኑ ፈልግ...' : 'Search dish...'}
                className="bg-transparent text-white text-xs w-full focus:outline-none placeholder-slate-500"
              />
            </div>
          </div>
        </div>

        {/* Grid of Dishes for Cashier Input with Live Discrepancy Preview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredCashierRecipes.map((recipe) => {
            const cashierQty = cashierMenuSales[recipe.id] || 0;
            const chefQty = chefMenuSales[recipe.id] || 0;
            const diff = chefQty - cashierQty;

            return (
              <div
                key={recipe.id}
                className={`p-3.5 rounded-2xl border transition-all ${
                  cashierQty > 0
                    ? 'bg-rose-950/30 border-rose-500/50 shadow-md ring-1 ring-rose-500/20'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-xs text-white">
                      {language === 'am' ? recipe.nameAm : recipe.nameEn}
                    </h4>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      {language === 'am' ? 'የሼፍ ትዕዛዝ:' : 'Chef Order:'}{' '}
                      <strong className="text-indigo-400">{chefQty}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      value={cashierMenuSales[recipe.id] ?? ''}
                      onChange={(e) =>
                        setCashierMenuSales((prev) => ({
                          ...prev,
                          [recipe.id]: parseFloat(e.target.value) || 0,
                        }))
                      }
                      placeholder="0"
                      className="w-16 px-2 py-1 bg-slate-900 border border-rose-500/40 rounded-lg text-right font-mono font-bold text-rose-300 focus:outline-none focus:border-rose-400 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        startVoiceInput(
                          'cashier',
                          recipe.id,
                          `${recipe.nameAm || recipe.nameEn} የካሸር ሽያጭ`
                        )
                      }
                      title={language === 'am' ? 'በድምጽ ይናገሩ' : 'Voice Input'}
                      className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition-colors"
                    >
                      <Mic className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Micro Live Status Indicator */}
                {chefQty > 0 || cashierQty > 0 ? (
                  <div className="pt-2 mt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-400">
                      {language === 'am' ? 'ልዩነት:' : 'Variance:'}
                    </span>
                    {diff === 0 ? (
                      <span className="text-emerald-400 font-bold">ንጹህ (0) ✅</span>
                    ) : diff > 0 ? (
                      <span className="text-amber-400 font-bold">
                        +{diff} {language === 'am' ? 'ያልተመዘገበ' : 'unbilled'} 🚨
                      </span>
                    ) : (
                      <span className="text-rose-400 font-bold">
                        {diff} {language === 'am' ? 'የተሰረዘ/ስህተት' : 'void'} ⚠️
                      </span>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          SECTION 5: STEP 4 — የማኔጅመንት ፍጆታ (STRICTLY AS MENU ITEMS)
          ========================================================================= */}
      <div className="bg-slate-900/90 p-5 rounded-3xl border border-purple-500/30 shadow-xl space-y-4 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-500/20 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-black text-sm border border-purple-500/30">
              4
            </span>
            <div>
              <h3 className="font-black text-sm sm:text-base text-white">
                {language === 'am' ? 'የማኔጅመንት ፍጆታ ግቤት (በሜኑ ብቻ)' : 'Step 4: Management Consumption (Strictly As Menu Items)'}
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'am'
                  ? 'ማኔጅመንት ፍጆታን በጥሬ እቃ መመዝገብ አይፈቀድም! እንደ ሜኑ ብቻ ይገባል (ለምሳሌ 2 ስፓጌቲ ቱና)፤ ከሬሲፒው ጋር ልክ እንደ ሽያጭ ይሰላል።'
                  : 'Management consumption is NEVER recorded as raw items; entered strictly as menu dishes.'}
              </p>
            </div>
          </div>

          <div className="px-3 py-1 bg-purple-950/60 border border-purple-500/30 rounded-xl text-purple-300 font-bold text-xs">
            {language === 'am' ? 'ጠቅላላ ፍጆታ:' : 'Total Mgmt:'}{' '}
            {(Array.isArray(managementMenuEntries) ? managementMenuEntries : []).reduce((sum, m) => sum + (m?.quantity || 0), 0)}{' '}
            {language === 'am' ? 'ፖርሽን' : 'portions'}
          </div>
        </div>

        {/* Input Form for adding a management menu dish */}
        <form
          onSubmit={handleAddManagementMenu}
          className="grid grid-cols-1 sm:grid-cols-5 gap-3 p-3.5 bg-slate-950/70 rounded-2xl border border-slate-800 text-xs"
        >
          <div className="sm:col-span-2">
            <label className="text-[11px] text-slate-400 block mb-1 font-bold">
              {language === 'am' ? 'የተበላው የሜኑ ምግብ' : 'Consumed Menu Dish'}
            </label>
            <select
              value={selectedMgmtRecipeId}
              onChange={(e) => setSelectedMgmtRecipeId(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-400"
            >
              <option value="">{language === 'am' ? '-- ሜኑ ይምረጡ --' : '-- Select Menu Dish --'}</option>
              {branchRecipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {language === 'am' ? r.nameAm : r.nameEn} ({formatCurrency(r.sellingPrice)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1 font-bold">
              {language === 'am' ? 'ብዛት (ፖርሽን)' : 'Portions'}
            </label>
            <input
              type="number"
              min="0.5"
              step="any"
              value={mgmtQuantity}
              onChange={(e) => setMgmtQuantity(parseFloat(e.target.value) || '')}
              required
              placeholder="1"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-400 font-mono font-bold"
            />
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1 font-bold">
              {language === 'am' ? 'ተጠቃሚ / እንግዳ' : 'Beneficiary'}
            </label>
            <input
              type="text"
              value={mgmtBeneficiary}
              onChange={(e) => setMgmtBeneficiary(e.target.value)}
              required
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-400"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer"
            >
              + {language === 'am' ? 'መዝግብ' : 'Add'}
            </button>
          </div>
        </form>

        {/* List of recorded management menu dishes */}
        {managementMenuEntries.length > 0 && (
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-400 block">
              {language === 'am' ? 'የተመዘገቡ የማኔጅመንት ምግቦች:' : 'Recorded Management Meals:'}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {managementMenuEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="p-3 bg-purple-950/20 border border-purple-500/30 rounded-xl flex items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <h5 className="font-bold text-white">{entry.dishName}</h5>
                    <span className="text-[11px] text-purple-300 font-mono block">
                      {entry.quantity} {language === 'am' ? 'ፖርሽን' : 'portions'} • {entry.beneficiary}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveManagementMenu(entry.id)}
                    className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          SECTION 6: STEP 5 — ብክነት (DAMAGE) እና ወደ ሌላ ቅርንጫፍ የተላከ
          ========================================================================= */}
      <div className="bg-slate-900/90 p-5 rounded-3xl border border-amber-500/20 shadow-xl space-y-4 backdrop-blur-md">
        <div className="flex items-center gap-2.5 border-b border-amber-500/20 pb-3">
          <span className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-black text-sm border border-amber-500/30">
            5
          </span>
          <div>
            <h3 className="font-black text-sm sm:text-base text-white">
              {language === 'am' ? 'ብክነት (Damage) እና ወደ ሌላ ቅርንጫፍ የተላከ እቃ' : 'Step 5: Spoilage / Damage & Inter-Branch Transfers Out'}
            </h3>
            <p className="text-xs text-slate-400">
              {language === 'am'
                ? 'የተበላሸ ወይም ወደ ሌላ ቅርንጫፍ የተላለፈ እቃ ለብቻቸው እዚህ ይመዘገባሉ፤ ከዚህ ቅርንጫፍ ብቻ ይቀነሳሉ።'
                : 'Spoilage and transfers to other branches recorded separately and deducted locally.'}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold bg-slate-950/60">
                <th className="py-2.5 px-3">{language === 'am' ? 'የጥሬ ዕቃ ስም' : 'Tracked Item'}</th>
                <th className="py-2.5 px-2 text-center">{language === 'am' ? 'መለኪያ' : 'Unit'}</th>
                <th className="py-2.5 px-3 text-right text-rose-300">
                  {language === 'am' ? 'ብክነት / የተበላሸ (Damage)' : 'Damage Qty'}
                </th>
                <th className="py-2.5 px-3 text-right text-indigo-300">
                  {language === 'am' ? 'ወደ ሌላ ቅርንጫፍ የተላከ (Transfer Out)' : 'Transfer Out Qty'}
                </th>
                <th className="py-2.5 px-3">{language === 'am' ? 'የተላከበት ቅርንጫፍ' : 'Destination'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {trackedItemsList.map((tracked) => {
                const raw = items.find((i) => i.id === tracked.itemId);
                return (
                  <tr key={tracked.id} className="hover:bg-slate-850/50">
                    <td className="py-2.5 px-3 font-bold text-white">
                      {language === 'am' ? raw?.nameAm : raw?.nameEn}
                    </td>
                    <td className="py-2.5 px-2 text-center text-slate-400">
                      {tracked.countUnitAm}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={damageCounts[tracked.itemId] ?? ''}
                        onChange={(e) =>
                          setDamageCounts((prev) => ({
                            ...prev,
                            [tracked.itemId]: parseFloat(e.target.value) || 0,
                          }))
                        }
                        placeholder="0"
                        className="w-20 px-2 py-1 bg-slate-950 border border-rose-500/30 rounded-lg text-right font-mono font-bold text-rose-300 focus:outline-none text-xs"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={transferOutCounts[tracked.itemId] ?? ''}
                        onChange={(e) =>
                          setTransferOutCounts((prev) => ({
                            ...prev,
                            [tracked.itemId]: parseFloat(e.target.value) || 0,
                          }))
                        }
                        placeholder="0"
                        className="w-20 px-2 py-1 bg-slate-950 border border-indigo-500/30 rounded-lg text-right font-mono font-bold text-indigo-300 focus:outline-none text-xs"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <select
                        value={transferOutDestinations[tracked.itemId] || ''}
                        onChange={(e) =>
                          setTransferOutDestinations((prev) => ({
                            ...prev,
                            [tracked.itemId]: e.target.value,
                          }))
                        }
                        className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs"
                      >
                        <option value="">{language === 'am' ? '-- ቅርንጫፍ --' : '-- Branch --'}</option>
                        {branches
                          .filter((b) => b.id !== currentBranch?.id)
                          .map((b) => (
                            <option key={b.id} value={b.id}>
                              {language === 'am' ? b.nameAm : b.nameEn}
                            </option>
                          ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          SECTION 7: STEP 6 — የነገው ጠዋት ትክክለኛ ቆጠራ (Ending Physical Count)
          ========================================================================= */}
      <div className="bg-slate-900/90 p-5 rounded-3xl border border-emerald-500/30 shadow-xl space-y-4 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-500/20 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm border border-emerald-500/40">
              6
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-sm sm:text-base text-white">
                  {language === 'am' ? 'ደረጃ 6፦ የነገው ጠዋት ትክክለኛ ቆጠራ (Ending Physical Count)' : 'Step 6: Next Morning Actual Physical Count'}
                </h3>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{language === 'am' ? 'በነገው ጠዋት 11:00 - 12:00 ሰዓት የሚሞላ' : 'Next morning 11:00-12:00 AM count'}</span>
                </span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-blue-400" />
                  <span>{language === 'am' ? 'ከላይ በደረጃ 1 የሞሉት እዚህ በራስ-ሰር ተሞልቷል (ድጋሚ መሙላት አያስፈልግም ✓)' : 'Auto-synced with Step 1 (No re-entry needed ✓)'}</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {language === 'am'
                  ? 'የአንድ ሙሉ ቀን የስራ ዑደት በነገው ጠዋት (11-12 ሰዓት) በሚደረገው ቆጠራ ይዘጋል። ይህ ቆጠራ በቀጥታ ለነገ መነሻ (Beginning) ሆኖ ይሸጋገራል።'
                  : 'A full day closes with next morning count (11-12 AM). This count rolls forward as tomorrow morning opening stock.'}
              </p>
            </div>
          </div>

          {/* Roll Over to Next Day Button */}
          <button
            type="button"
            onClick={handleRollOverToNextDay}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black shadow-md border border-emerald-400 transition-all cursor-pointer shrink-0"
            title={language === 'am' ? 'ይህንን ቆጠራ ለነገ ጠዋት መክፈቻ እንደ መነሻ አድርግ' : 'Roll Over this ending count as tomorrow morning beginning count'}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{language === 'am' ? '🔄 ለነገ ጠዋት መነሻ (Beginning) አድርግ' : '🔄 Roll Over to Next Day'}</span>
          </button>
        </div>

        {/* Roll-over success toast notification */}
        {rollOverSuccessNotice && (
          <div className="p-3 rounded-2xl bg-emerald-950/80 border border-emerald-400 text-emerald-200 text-xs font-bold flex items-center justify-between gap-2 shadow-lg animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{rollOverSuccessNotice}</span>
            </div>
            <button
              onClick={() => setRollOverSuccessNotice(null)}
              className="p-1 text-emerald-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {trackedItemsList.map((tracked) => {
            const raw = items.find((i) => i.id === tracked.itemId);
            const actualVal = actualEndingCounts[tracked.itemId];

            return (
              <div
                key={tracked.id}
                className="p-3.5 bg-slate-950/80 border border-emerald-500/30 rounded-2xl space-y-2 hover:border-emerald-400 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">
                    {language === 'am' ? raw?.nameAm : raw?.nameEn}
                  </span>
                  <span className="font-mono text-[10px] text-amber-400">
                    {tracked.countUnitAm}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={actualVal ?? ''}
                    onChange={(e) =>
                      setActualEndingCounts((prev) => ({
                        ...prev,
                        [tracked.itemId]: parseFloat(e.target.value) || 0,
                      }))
                    }
                    placeholder="0"
                    className="w-full px-3 py-1.5 bg-slate-900 border border-emerald-500/40 rounded-xl text-right font-mono font-black text-emerald-300 text-sm focus:outline-none focus:border-emerald-400"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      startVoiceInput(
                        'ending',
                        tracked.itemId,
                        `${raw?.nameAm || raw?.nameEn} የምሽት ቆጠራ`
                      )
                    }
                    title={language === 'am' ? 'በድምጽ ይናገሩ' : 'Voice Input'}
                    className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          SECTION 8: "ተንትን" (ANALYZE) ACTION BUTTON
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-4">
        <button
          onClick={handleRunAnalysis}
          disabled={isAnalyzing}
          className="relative group overflow-hidden px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-black text-base sm:text-lg shadow-2xl shadow-amber-500/40 hover:shadow-amber-400/60 hover:scale-[1.02] active:scale-[0.99] transition-all cursor-pointer flex items-center gap-3 border-2 border-yellow-200"
        >
          {isAnalyzing ? (
            <RotateCcw className="w-6 h-6 animate-spin text-slate-950" />
          ) : (
            <BrainCircuit className="w-6 h-6 text-slate-950 group-hover:rotate-12 transition-transform" />
          )}
          <span>
            {isAnalyzing
              ? language === 'am'
                ? 'እየተተነተነ ነው...'
                : 'Analyzing...'
              : language === 'am'
              ? '⚡ ተንትን (Run F&B AI Audit)'
              : '⚡ Analyze Branch Reconciliation'}
          </span>
        </button>
      </div>

      {/* =========================================================================
          SECTION 9: COMPREHENSIVE SINGLE-SCREEN AUDIT RESULTS PANEL
          ========================================================================= */}
      {analysisActive && (
        <div id="audit-results-panel" className="space-y-6 pt-2 animate-fadeIn">
          {/* Executive Header Banner */}
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/60 p-6 rounded-3xl border border-amber-500/40 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-500/20 pb-4">
              <div className="flex items-center gap-3">
                <span className="p-3 rounded-2xl bg-amber-400 text-slate-950 font-black shadow-lg">
                  <BrainCircuit className="w-6 h-6" />
                </span>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-white">
                    {language === 'am' ? 'የዕለቱ የF&B ቁጥጥር እና የAI ማጠቃለያ' : 'Executive F&B Audit & AI Conclusion'}
                  </h2>
                  <span className="text-xs text-amber-300 font-mono">
                    🏢 {language === 'am' ? (currentBranch?.nameAm || '') : (currentBranch?.nameEn || '')} • 📅 {selectedDate} (🇪🇹 {formatEthiopianDate(selectedDate)})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('ownerReport');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black rounded-xl text-xs shadow-lg flex items-center gap-1.5 cursor-pointer border border-amber-300"
                >
                  <FileText className="w-4 h-4 text-slate-950" />
                  <span>{language === 'am' ? '👑 ለባለቤት የሚቀርብ ይፋዊ የውሂብ ድብልቅ ሪፖርት ክፈት' : '👑 Open Official Data Blend Report'}</span>
                </button>

                <button
                  onClick={handleSaveDayAudit}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs shadow-lg flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{language === 'am' ? 'ቀኑን ዝጋና አስቀምጥ' : 'Save & Close Day'}</span>
                </button>
              </div>
            </div>

            {saveDayNotice && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-300 font-bold text-xs flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>
                  {language === 'am'
                    ? 'የቀኑ ቆጠራና ሪኮንሲሊየሽን በተሳካ ሁኔታ ተቀምጧል! የምሽቱ ቆጠራ ለነገ መነሻ ሆኖ ተላልፏል።'
                    : 'Daily audit saved successfully! Ending counts carried over to next morning.'}
                </span>
              </div>
            )}

            {/* AI Expert Auditor Narrative Box */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-amber-500/30 space-y-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-amber-300">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>{language === 'am' ? 'የሰው ተንታኝ መሰል የAI ማጠቃለያ (AI Auditor Conclusion):' : 'AI Auditor Executive Diagnosis:'}</span>
              </div>

              <p className="text-sm font-semibold text-slate-200 leading-relaxed">
                {language === 'am' ? calculateAnalysis.aiDiagnosisAm : calculateAnalysis.aiDiagnosisEn}
              </p>

              {/* AI Reasoning Transparency (ሥራ አስኪያጁ እንዲያምነው) */}
              <div className="pt-2 border-t border-slate-800/80 flex items-start gap-2 text-xs text-slate-400">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-300 block">
                    {language === 'am' ? 'የስሌት አመክንዮ (AI Reasoning Transparency):' : 'Calculation Logic Transparency:'}
                  </strong>
                  <span>
                    {language === 'am' ? calculateAnalysis.aiReasoningAm : calculateAnalysis.aiReasoningEn}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* =======================================================================
              STAGE 1: MENU RECONCILIATION TABLE (Chef vs Cashier)
              ======================================================================= */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-indigo-500/30 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-indigo-500/20 pb-3">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-indigo-400" />
                <h3 className="font-black text-sm text-white">
                  {language === 'am' ? 'ደረጃ 1፦ የሜኑ ሪኮንሲሊየሽን (የሼፍ ትዕዛዝ vs የካሸር ሽያጭ)' : 'Stage 1: Menu Reconciliation (Chef Orders vs Cashier POS)'}
                </h3>
              </div>

              <span className="text-xs font-mono font-bold text-slate-400">
                {language === 'am' ? 'እቃ አይቀንስም፤ የቲኬት ንፅፅር ብቻ' : 'Menu ticket comparison'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold bg-slate-950/60">
                    <th className="py-2.5 px-3">{language === 'am' ? 'የምግብ ስም' : 'Menu Dish'}</th>
                    <th className="py-2.5 px-3 text-right">{language === 'am' ? 'ዋጋ' : 'Price'}</th>
                    <th className="py-2.5 px-3 text-right text-indigo-300">{language === 'am' ? 'የሼፍ ብዛት (KOT)' : 'Chef Qty'}</th>
                    <th className="py-2.5 px-3 text-right text-rose-300">{language === 'am' ? 'የካሸር ብዛት (POS)' : 'Cashier Qty'}</th>
                    <th className="py-2.5 px-3 text-right">{language === 'am' ? 'ልዩነት' : 'Variance'}</th>
                    <th className="py-2.5 px-4">{language === 'am' ? 'ሁኔታና ትርጉም' : 'Status & Meaning'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {calculateAnalysis.menuReconciliationRows
                    .filter((r) => r.chefQty > 0 || r.cashierQty > 0)
                    .map((row) => (
                      <tr key={row.recipeId} className="hover:bg-slate-850/50">
                        <td className="py-2.5 px-3 font-bold text-white">{row.dishName}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-400">{formatCurrency(row.sellingPrice)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-400">{row.chefQty}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-400">{row.cashierQty}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-black">
                          {row.variance === 0 ? (
                            <span className="text-emerald-400">0</span>
                          ) : row.variance > 0 ? (
                            <span className="text-amber-400">+{row.variance}</span>
                          ) : (
                            <span className="text-rose-400">{row.variance}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-[11px] font-semibold">
                          {row.status === 'EQUAL' ? (
                            <span className="text-emerald-400">{language === 'am' ? row.meaningAm : row.meaningEn}</span>
                          ) : row.status === 'CHEF_HIGHER' ? (
                            <span className="text-amber-300">{language === 'am' ? row.meaningAm : row.meaningEn}</span>
                          ) : (
                            <span className="text-rose-300">{language === 'am' ? row.meaningAm : row.meaningEn}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* =======================================================================
              STAGE 2 & 3: RAW MATERIAL EXPECTED VS ACTUAL ENDING TABLE
              ======================================================================= */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-amber-500/30 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-500/20 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-sm text-white">
                  {language === 'am'
                    ? 'ደረጃ 2 እና 3፦ በሬሲፒ የተመሰረተ ፍጆታ እና የሚጠበቀው vs ትክክለኛ ቆጠራ'
                    : 'Stage 2 & 3: Recipe-Based Theoretical Usage vs Physical Ending'}
                </h3>
              </div>

              <div className="flex items-center gap-2 flex-wrap text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setFnbDocType('ENDING_BALANCE');
                    setChefPasteTarget('actual');
                    setChefSlipTab('parser');
                    setChefSlipModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-200 bg-emerald-950/80 border border-emerald-500/40 hover:bg-emerald-900/60 transition-all cursor-pointer"
                >
                  <BrainCircuit className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{language === 'am' ? '⚡ የማታ/የጠዋት ቆጠራ አመሳስል' : '⚡ Match Ending'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStockExcelModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-teal-200 bg-teal-950/80 border border-teal-500/40 hover:bg-teal-900/60 transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-teal-400" />
                  <span>{language === 'am' ? '📊 የቀኑ ቆጠራ Excel መክተቻ' : '📊 Excel Import'}</span>
                </button>

                <span className="text-slate-400 font-mono hidden md:inline">
                  {language === 'am' ? 'የሚጠበቀው = መነሻ + ገቢ − ሬሲፒ ፍጆታ − ብክነት − ዝውውር' : 'Expected = Beg + Rec − Recipe Usage − Damage − Transfer'}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold bg-slate-950/60">
                    <th className="py-2.5 px-3">{language === 'am' ? 'የጥሬ ዕቃ ስም' : 'Raw Item'}</th>
                    <th className="py-2.5 px-2 text-center">{language === 'am' ? 'መለኪያ' : 'Unit'}</th>
                    <th className="py-2.5 px-3 text-right">{language === 'am' ? 'መነሻ+ገቢ' : 'Beg+Rec'}</th>
                    <th className="py-2.5 px-3 text-right text-indigo-300">{language === 'am' ? 'የሽያጭ ሬሲፒ' : 'Sales Usage'}</th>
                    <th className="py-2.5 px-3 text-right text-purple-300">{language === 'am' ? 'ማኔጅመንት ሬሲፒ' : 'Mgmt Usage'}</th>
                    <th className="py-2.5 px-3 text-right text-amber-300 font-bold">{language === 'am' ? 'የሚጠበቅ ቀሪ' : 'Expected'}</th>
                    <th className="py-2.5 px-3 text-right text-emerald-300 font-black">{language === 'am' ? 'ትክክለኛ ቆጠራ' : 'Actual'}</th>
                    <th className="py-2.5 px-3 text-right font-black">{language === 'am' ? 'ልዩነት (Qty)' : 'Variance'}</th>
                    <th className="py-2.5 px-3 text-right font-black text-rose-400">{language === 'am' ? 'የጉድለት ዋጋ (ETB)' : 'Loss (ETB)'}</th>
                    <th className="py-2.5 px-3 text-center">{language === 'am' ? 'ደረጃ' : 'Level'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {calculateAnalysis.itemAuditResults.map((item) => (
                    <tr
                      key={item.itemId}
                      className={`hover:bg-slate-850/50 ${
                        item.status === 'INVESTIGATE'
                          ? 'bg-rose-950/20'
                          : item.status === 'WARNING'
                          ? 'bg-amber-950/10'
                          : ''
                      }`}
                    >
                      <td className="py-3 px-3">
                        <strong className="text-white block">{item.itemName}</strong>
                        {item.contributingDishes.length > 0 && (
                          <span className="text-[10px] text-slate-400 block truncate max-w-xs">
                            {item.contributingDishes.join(', ')}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center text-slate-400">{item.countUnit}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-300">{item.runningTotal}</td>
                      <td className="py-3 px-3 text-right font-mono text-indigo-300 font-semibold">{item.recipeUsageSales}</td>
                      <td className="py-3 px-3 text-right font-mono text-purple-300 font-semibold">{item.recipeUsageMgmt}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-amber-300 bg-amber-950/10">{item.expectedEnding}</td>
                      <td className="py-3 px-3 text-right font-mono font-black text-emerald-400 bg-emerald-950/10">{item.actualEnding}</td>
                      <td className="py-3 px-3 text-right font-mono font-black">
                        {item.varianceQty === 0 ? (
                          <span className="text-emerald-400">0</span>
                        ) : item.varianceQty > 0 ? (
                          <span className="text-emerald-300">+{item.varianceQty}</span>
                        ) : (
                          <span className="text-rose-400">{item.varianceQty}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-rose-400">
                        {item.varianceQty < 0 ? formatCurrency(item.varianceValueEtb) : '-'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {item.status === 'OK' && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 text-[10px]">
                            {language === 'am' ? item.statusLabelAm : item.statusLabelEn}
                          </span>
                        )}
                        {item.status === 'WARNING' && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30 text-[10px]">
                            {language === 'am' ? item.statusLabelAm : item.statusLabelEn}
                          </span>
                        )}
                        {item.status === 'INVESTIGATE' && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-black border border-rose-500/40 text-[10px] animate-pulse">
                            {language === 'am' ? item.statusLabelAm : item.statusLabelEn}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* =========================================================================
          PILLAR 2: MENU & RECIPES (የሜኑ ሪሲፒ ክፍል)
          ========================================================================= */}
      {viewMode === 'menuRecipes' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header Banner */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-amber-500/20 shadow-xl space-y-4 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-500/20 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <ChefHat className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <span>{language === 'am' ? 'የሜኑ ሪሲፒና የምግብ ዝግጅት ቁጥጥር' : 'Menu & Recipe Management'}</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 font-bold">
                      {currentBranch?.nameAm || ''}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {language === 'am'
                      ? 'የእያንዳንዱ ምግብ ዝርዝር ሪሲፒ፣ የጥሬ ዕቃ መጠን፣ የክፍል ወጪ (Portion Cost) እና የዛሬ ሽያጭ ፍጆታ'
                      : 'Dish recipe formulations, ingredient grammages, portion cost, and today’s live depletions'}
                  </p>
                </div>
              </div>

              {/* Summary Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
                  <span className="text-slate-400">{language === 'am' ? 'ጠቅላላ ምግቦች፦ ' : 'Total Dishes: '}</span>
                  <span className="text-amber-300 font-bold">{branchRecipes.length}</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
                  <span className="text-slate-400">{language === 'am' ? 'የሼፍ ሽያጭ ዋጋ፦ ' : 'Chef Sales: '}</span>
                  <span className="text-emerald-400 font-bold">{formatCurrency(totalChefRevenue)}</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
                  <span className="text-slate-400">{language === 'am' ? 'አማካይ Food Cost፦ ' : 'Avg Food Cost: '}</span>
                  <span className="text-amber-400 font-bold">{theoreticalFoodCostPct.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder={language === 'am' ? 'ምግብ በስም ወይም በኮድ ፈልግ...' : 'Search recipes...'}
                  value={recipeSearchQuery}
                  onChange={(e) => setRecipeSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 font-medium"
                />
              </div>

              <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
                {['ALL', 'pasta', 'pizza', 'meat', 'breakfast', 'beverage'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setRecipeCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      recipeCategoryFilter === cat
                        ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                        : 'bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {cat === 'ALL'
                      ? (language === 'am' ? 'ሁሉም (All)' : 'All')
                      : cat === 'pasta'
                      ? (language === 'am' ? 'ፓስታ' : 'Pasta')
                      : cat === 'pizza'
                      ? (language === 'am' ? 'ፒዛ' : 'Pizza')
                      : cat === 'meat'
                      ? (language === 'am' ? 'ስጋና ዋና ምግብ' : 'Meat/Mains')
                      : cat === 'breakfast'
                      ? (language === 'am' ? 'ቁርስ' : 'Breakfast')
                      : (language === 'am' ? 'መጠጥ' : 'Beverages')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Recipe Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {branchRecipes
              .filter((r) => {
                const qLower = recipeSearchQuery.toLowerCase();
                const matchesSearch =
                  recipeSearchQuery.trim() === '' ||
                  (r.nameAm || '').toLowerCase().includes(qLower) ||
                  (r.nameEn || '').toLowerCase().includes(qLower) ||
                  (r.id || '').toLowerCase().includes(qLower);
                const matchesCat =
                  recipeCategoryFilter === 'ALL' ||
                  (r.category || '').toLowerCase() === recipeCategoryFilter.toLowerCase();
                return matchesSearch && matchesCat;
              })
              .map((recipe) => {
                const ingredientsList = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
                const portionCost = ingredientsList.reduce((acc, ing) => {
                  const it = items.find((i) => i.id === ing.itemId);
                  const price = it?.lastPurchasePrice || it?.weightedAvgCost || 0;
                  return acc + (ing.quantity || 0) * price;
                }, 0);
                const foodCostPct = recipe.sellingPrice > 0 ? (portionCost / recipe.sellingPrice) * 100 : 0;
                const marginEtb = recipe.sellingPrice - portionCost;
                const chefSold = chefMenuSales[recipe.id] || 0;
                const cashierSold = cashierMenuSales[recipe.id] || 0;
                const mgmtSold = managementMenuEntries.filter((m) => m.recipeId === recipe.id).reduce((s, m) => s + m.quantity, 0);

                return (
                  <div
                    key={recipe.id}
                    className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 shadow-lg space-y-4 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                            {(recipe.id || '').toUpperCase()}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {recipe.category || 'Kitchen'}
                          </span>
                        </div>
                        <h3 className="font-black text-base text-white mt-1">
                          {language === 'am' ? (recipe.nameAm || recipe.nameEn) : (recipe.nameEn || recipe.nameAm)}
                        </h3>
                        <p className="text-xs text-slate-400">
                          {language === 'am' ? (recipe.nameEn || recipe.nameAm) : (recipe.nameAm || recipe.nameEn)}
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="text-base font-black font-mono text-emerald-400">
                          {formatCurrency(recipe.sellingPrice)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {language === 'am' ? 'የመሸጫ ዋጋ' : 'Selling Price'}
                        </div>
                      </div>
                    </div>

                    {/* Financial Metrics Row */}
                    <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-slate-950 border border-slate-800/80 text-center">
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold">{language === 'am' ? 'የአንዱ ወጪ' : 'Portion Cost'}</div>
                        <div className="text-xs font-black font-mono text-amber-300 mt-0.5">
                          {formatCurrency(portionCost)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold">{language === 'am' ? 'የትርፍ ህዳግ' : 'Gross Margin'}</div>
                        <div className="text-xs font-black font-mono text-emerald-400 mt-0.5">
                          {formatCurrency(marginEtb)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold">{language === 'am' ? 'Food Cost %' : 'Cost %'}</div>
                        <div className={`text-xs font-black font-mono mt-0.5 ${
                          foodCostPct > 45 ? 'text-rose-400' : foodCostPct > 35 ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          {foodCostPct.toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    {/* Today's Sales Status */}
                    <div className="p-2.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <UtensilsCrossed className="w-3.5 h-3.5 text-amber-400" />
                        <span className="font-bold text-slate-300">{language === 'am' ? 'የዛሬ ሽያጭ፦' : 'Today’s Sales:'}</span>
                      </div>
                      <div className="flex items-center gap-3 font-mono text-xs">
                        <span className="text-amber-300 font-bold" title="Chef KOT Sold">
                          🍳 {chefSold}
                        </span>
                        <span className="text-emerald-400 font-bold" title="Cashier POS Sold">
                          🧾 {cashierSold}
                        </span>
                        {mgmtSold > 0 && (
                          <span className="text-purple-300 font-bold" title="Management Portion">
                            👑 {mgmtSold}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Ingredients Breakdown */}
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
                        <span>{language === 'am' ? 'የሪሲፒ ጥሬ ዕቃዎች ዝርዝር' : 'Recipe Ingredients'}</span>
                        <span className="text-[10px] text-slate-500">
                          {ingredientsList.length} {language === 'am' ? 'ጥሬ እቃዎች' : 'items'}
                        </span>
                      </div>
                      <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                        {ingredientsList.map((ing, idx) => {
                          const it = items.find((i) => i.id === ing.itemId);
                          const price = it?.lastPurchasePrice || it?.weightedAvgCost || 0;
                          const cost = ing.quantity * price;
                          return (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-2 rounded-xl bg-slate-950/70 border border-slate-800/60 text-[11px]"
                            >
                              <div className="truncate pr-2">
                                <span className="font-bold text-slate-200">
                                  {it ? (language === 'am' ? it.nameAm : it.nameEn) : ing.itemId}
                                </span>
                                <span className="text-slate-500 text-[10px] ml-1.5 font-mono">
                                  ({ing.quantity} {it?.unitAm || it?.unit || 'ኪ.ግ'})
                                </span>
                              </div>
                              <div className="font-mono text-amber-300 font-bold shrink-0">
                                {formatCurrency(cost)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* =========================================================================
          PILLAR 3: VARIANCE & AUDIT REPORT (የልዩነት እና ኦዲት ሪፖርት ክፍል)
          ========================================================================= */}
      {viewMode === 'varianceAudit' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-amber-500/20 shadow-xl space-y-4 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-500/20 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <Scale className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <span>{language === 'am' ? 'የልዩነት እና የፎረንሲክ ኦዲት ሪፖርት' : 'Variance & Forensic Audit Report'}</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 font-bold">
                      {currentBranch?.nameAm || ''}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {language === 'am'
                      ? 'የሜኑ ቲኬት ልዩነት (ሼፍ vs ካሽየር) + የጥሬ ዕቃ ቆጠራ ልዩነት + የገንዘብ ኪሳራና ማጣሪያ'
                      : 'Stage 1 Menu vs POS Ticket Variances + Stage 2 Primary Stock Variances + Financial Reconciliation'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('ownerReport');
                    setAnalysisActive(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer"
                >
                  {language === 'am' ? '👑 ወደ ባለቤት ይፋዊ የውሂብ ድብልቅ ሪፖርት እለፍ' : '👑 Open Executive Data Blend Report'}
                </button>
              </div>
            </div>

            {/* 4 Financial Audit KPI Scorecards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-1">
                <div className="text-[11px] text-slate-400 font-bold">{language === 'am' ? 'የካሽየር ገቢ' : 'POS Billed'}</div>
                <div className="text-lg font-black font-mono text-emerald-400">{formatCurrency(totalCashierRevenue)}</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-rose-500/30 space-y-1">
                <div className="text-[11px] text-slate-400 font-bold">{language === 'am' ? 'ያልተመዘገበ የሜኑ ሽያጭ (Unbilled)' : 'Unbilled Menu Sales'}</div>
                <div className="text-lg font-black font-mono text-rose-400">{formatCurrency(cashierVarianceEtb)}</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-1">
                <div className="text-[11px] text-slate-400 font-bold">{language === 'am' ? 'የጥሬ ዕቃ የተጣራ ልዩነት' : 'Stock Variance'}</div>
                <div className={`text-lg font-black font-mono ${netVarianceEtb < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {netVarianceEtb >= 0 ? '+' : ''}{formatCurrency(netVarianceEtb)}
                </div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-purple-500/30 space-y-1">
                <div className="text-[11px] text-slate-400 font-bold">{language === 'am' ? 'ጠቅላላ የገንዘብ ክፍተት (Total Gap)' : 'Total Financial Gap'}</div>
                <div className="text-lg font-black font-mono text-purple-300">
                  {formatCurrency(Math.abs(netVarianceEtb) + cashierVarianceEtb)}
                </div>
              </div>
            </div>
          </div>

          {/* Section 1: Menu vs POS Tickets Variance Table */}
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-amber-500/20 shadow-xl space-y-3">
            <h3 className="text-sm font-black text-amber-300 flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4 text-amber-400" />
              <span>{language === 'am' ? 'ክፍል 1፦ የሜኑ ሽያጭ ልዩነት (ሼፍ ኪችን vs ካሽየር POS)' : 'Stage 1: Menu vs POS Ticket Variances'}</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold bg-slate-950/60">
                    <th className="py-2.5 px-3">{language === 'am' ? 'የምግብ ስም' : 'Dish'}</th>
                    <th className="py-2.5 px-2 text-right">{language === 'am' ? 'ዋጋ' : 'Price'}</th>
                    <th className="py-2.5 px-2 text-center text-amber-300">{language === 'am' ? 'የሼፍ ብዛት' : 'Chef KOT'}</th>
                    <th className="py-2.5 px-2 text-center text-emerald-300">{language === 'am' ? 'የካሽየር POS' : 'POS Billed'}</th>
                    <th className="py-2.5 px-2 text-center">{language === 'am' ? 'ልዩነት' : 'Variance'}</th>
                    <th className="py-2.5 px-3 text-right">{language === 'am' ? 'የገንዘብ ልዩነት' : 'Variance (ETB)'}</th>
                    <th className="py-2.5 px-3">{language === 'am' ? 'የኦዲት ትንታኔ' : 'Audit Finding'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {calculateAnalysis.menuReconciliationRows.map((m, idx) => (
                    <tr key={idx} className={m.variance !== 0 ? 'bg-rose-950/20' : 'hover:bg-slate-800/30'}>
                      <td className="py-2.5 px-3 font-bold text-white">{m.dishName}</td>
                      <td className="py-2.5 px-2 text-right font-mono text-slate-300">{formatCurrency(m.sellingPrice)}</td>
                      <td className="py-2.5 px-2 text-center font-mono font-bold text-amber-300">{m.chefQty}</td>
                      <td className="py-2.5 px-2 text-center font-mono font-bold text-emerald-300">{m.cashierQty}</td>
                      <td className={`py-2.5 px-2 text-center font-mono font-bold ${
                        m.variance > 0 ? 'text-rose-400' : m.variance < 0 ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        {m.variance > 0 ? `+${m.variance}` : m.variance}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-400">
                        {m.varianceEtb > 0 ? formatCurrency(m.varianceEtb) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-300">
                        {language === 'am' ? m.meaningAm : m.meaningEn}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Primary Materials Stock Variance Table */}
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-amber-500/20 shadow-xl space-y-3">
            <h3 className="text-sm font-black text-amber-300 flex items-center gap-2">
              <Scale className="w-4 h-4 text-amber-400" />
              <span>{language === 'am' ? 'ክፍል 2፦ የጥሬ ዕቃዎች ቆጠራ ልዩነት (Stock Variance Matrix)' : 'Stage 2: Primary Materials Physical Stock Variance'}</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold bg-slate-950/60">
                    <th className="py-2.5 px-3">{language === 'am' ? 'ኮድ' : 'Code'}</th>
                    <th className="py-2.5 px-3">{language === 'am' ? 'ጥሬ ዕቃ' : 'Material'}</th>
                    <th className="py-2.5 px-2 text-center">{language === 'am' ? 'መለኪያ' : 'Unit'}</th>
                    <th className="py-2.5 px-2 text-right">{language === 'am' ? 'መነሻ + የገባ' : 'Beg + Rec'}</th>
                    <th className="py-2.5 px-2 text-right">{language === 'am' ? 'የሪሲፒ ፍጆታ' : 'Recipe Used'}</th>
                    <th className="py-2.5 px-2 text-right">{language === 'am' ? 'የሚጠበቅ' : 'Expected'}</th>
                    <th className="py-2.5 px-2 text-right text-amber-300">{language === 'am' ? 'ትክክለኛ ቆጠራ' : 'Actual Count'}</th>
                    <th className="py-2.5 px-2 text-right">{language === 'am' ? 'ልዩነት መጠን' : 'Var Qty'}</th>
                    <th className="py-2.5 px-3 text-right">{language === 'am' ? 'ልዩነት ዋጋ (ETB)' : 'Var (ETB)'}</th>
                    <th className="py-2.5 px-2 text-center">{language === 'am' ? 'ሁኔታ' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {calculateAnalysis.itemAuditResults.map((r, idx) => (
                    <tr key={idx} className={r.status === 'INVESTIGATE' ? 'bg-rose-950/20' : 'hover:bg-slate-800/30'}>
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{r.itemCode}</td>
                      <td className="py-2.5 px-3 font-bold text-white font-sans">{r.itemName}</td>
                      <td className="py-2.5 px-2 text-center text-slate-400">{r.countUnit}</td>
                      <td className="py-2.5 px-2 text-right text-slate-300">{r.runningTotal.toFixed(2)}</td>
                      <td className="py-2.5 px-2 text-right text-purple-300">{r.totalRecipeUsage.toFixed(2)}</td>
                      <td className="py-2.5 px-2 text-right text-slate-300">{r.expectedEnding.toFixed(2)}</td>
                      <td className="py-2.5 px-2 text-right font-black text-amber-300">{r.actualEnding.toFixed(2)}</td>
                      <td className={`py-2.5 px-2 text-right font-bold ${
                        r.varianceQty < 0 ? 'text-rose-400' : r.varianceQty > 0 ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        {r.varianceQty >= 0 ? '+' : ''}{r.varianceQty.toFixed(2)}
                      </td>
                      <td className={`py-2.5 px-3 text-right font-black ${
                        r.varianceValueEtb < 0 ? 'text-rose-400' : r.varianceValueEtb > 0 ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        {r.varianceValueEtb >= 0 ? '+' : ''}{formatCurrency(r.varianceValueEtb)}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.status === 'OK'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                        }`}>
                          {language === 'am' ? r.statusLabelAm : r.statusLabelEn}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: AI Forensic Auditor Diagnosis */}
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-amber-500/30 shadow-xl space-y-3">
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-black text-amber-300">
                {language === 'am' ? 'የAI ፎረንሲክ ኦዲተር ትንታኔ እና መፍትሄዎች' : 'AI Forensic Auditor Diagnosis'}
              </h3>
            </div>
            <p className="text-xs text-white leading-relaxed font-medium bg-slate-950 p-4 rounded-2xl border border-slate-800">
              {language === 'am' ? calculateAnalysis.aiDiagnosisAm : calculateAnalysis.aiDiagnosisEn}
            </p>
            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-4 rounded-2xl border border-slate-800">
              {language === 'am' ? calculateAnalysis.aiReasoningAm : calculateAnalysis.aiReasoningEn}
            </p>
          </div>
        </div>
      )}

      {/* =========================================================================
          PILLAR 4: F&B CONTROL & ANALYSIS (ኤፍ ኤንድ ቢ ኮንትሮል ክፍል)
          ========================================================================= */}
      {viewMode === 'fbControl' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header */}
          <div className="bg-slate-900/90 p-5 rounded-3xl border border-amber-500/20 shadow-xl space-y-4 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-500/20 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <span>{language === 'am' ? 'ኤፍ ኤንድ ቢ ኮንትሮልና የወጪ አስተዳደር' : 'F&B Cost Control & Operations'}</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 font-bold">
                      {currentBranch?.nameAm || ''}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {language === 'am'
                      ? 'የFood Cost % ትንታኔ፣ ትክክለኛ የጥሬ ዕቃ ፍጆታ ወጪ፣ ከፍተኛ ወጪ የፈጁ እቃዎችና የትርፍ ህዳግ'
                      : 'Executive Cost of Goods Sold (COGS), actual vs theoretical food cost %, and top cost drivers'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportOwnerReportWord}
                  className="px-3.5 py-2 rounded-xl bg-blue-950 hover:bg-blue-900 text-blue-200 border border-blue-500/40 font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span>{language === 'am' ? 'በ Word አውርድ' : 'Export Word'}</span>
                </button>
              </div>
            </div>

            {/* Financial & Operational KPI Gauges */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-[11px] text-slate-400 font-bold">{language === 'am' ? 'ትክክለኛ የፍጆታ ወጪ' : 'Actual Consumption Cost'}</div>
                <div className="text-xl font-black font-mono text-white">{formatCurrency(actualConsumptionCost)}</div>
                <div className="text-[10px] text-slate-500">{language === 'am' ? 'መነሻ + የገባ - የጠዋት ቆጠራ' : 'Beg + Rec - Count'}</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-1">
                <div className="text-[11px] text-slate-400 font-bold">{language === 'am' ? 'የምግብ ወጪ (Food Cost %)' : 'Food Cost %'}</div>
                <div className={`text-xl font-black font-mono ${
                  theoreticalFoodCostPct > 45 ? 'text-rose-400' : theoreticalFoodCostPct > 35 ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {theoreticalFoodCostPct.toFixed(1)}%
                </div>
                <div className="text-[10px] text-slate-500">{language === 'am' ? 'የዒላማ ጣሪያ፦ 32 - 35%' : 'Benchmark: 32 - 35%'}</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-purple-500/30 space-y-1">
                <div className="text-[11px] text-slate-400 font-bold">{language === 'am' ? 'የማኔጅመንት መስተንግዶ' : 'Management Ratio'}</div>
                <div className="text-xl font-black font-mono text-purple-300">{formatCurrency(totalMgmtValue)}</div>
                <div className="text-[10px] text-slate-500">{managementMenuEntries.length} {language === 'am' ? 'የተመዘገቡ ምግቦች' : 'dishes'}</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-rose-500/30 space-y-1">
                <div className="text-[11px] text-slate-400 font-bold">{language === 'am' ? 'ብክነትና ስብራት' : 'Damage & Waste'}</div>
                <div className="text-xl font-black font-mono text-rose-400">{formatCurrency(totalDamageValue)}</div>
                <div className="text-[10px] text-slate-500">
                  {Object.keys(damageCounts).filter((k) => (damageCounts[k] || 0) > 0).length} {language === 'am' ? 'የተመዘገቡ ብክነቶች' : 'waste entries'}
                </div>
              </div>
            </div>

            {/* Requirement 3: Monthly Expenses Integration in Owner Report */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/20 border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-amber-400" />
                  <span className="font-black text-xs text-white">
                    {language === 'am' ? `💳 የወሩ አጠቃላይ ወጪዎች (${currentMonth})` : `💳 Monthly Operating Expenses (${currentMonth})`}
                  </span>
                </div>
                <span className="text-xs text-amber-300 font-bold font-mono">
                  {language === 'am' ? 'የወሩ አጠቃላይ ወጪ፦ ' : 'Grand Total: '}
                  <span className="font-black text-sm">{formatCurrency(monthlyExpenseSummary.grandTotal)}</span>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-emerald-500/30">
                  <span className="text-[10px] text-slate-400 block">{language === 'am' ? 'በደረሰኝ (With Receipt)' : 'With Receipt'}</span>
                  <span className="font-bold font-mono text-emerald-400">{formatCurrency(monthlyExpenseSummary.totalWithReceipt)}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-blue-500/30">
                  <span className="text-[10px] text-slate-400 block">{language === 'am' ? 'የተሰላ 15% ቫት (VAT)' : '15% VAT'}</span>
                  <span className="font-bold font-mono text-blue-400">{formatCurrency(monthlyExpenseSummary.totalVat)}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-rose-500/30">
                  <span className="text-[10px] text-slate-400 block">{language === 'am' ? 'ያለ ደረሰኝ (Without Receipt)' : 'Without Receipt'}</span>
                  <span className="font-bold font-mono text-rose-400">{formatCurrency(monthlyExpenseSummary.totalWithoutReceipt)}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-amber-500/30">
                  <span className="text-[10px] text-slate-400 block">{language === 'am' ? 'አጠቃላይ ወጪ (Grand Total)' : 'Grand Total'}</span>
                  <span className="font-black font-mono text-amber-300">{formatCurrency(monthlyExpenseSummary.grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Top 10 Cost Drivers Table */}
          <div className="p-5 rounded-3xl bg-slate-900/90 border border-amber-500/20 shadow-xl space-y-3">
            <h3 className="text-sm font-black text-amber-300 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <span>{language === 'am' ? 'ከፍተኛ ወጪ የፈጁ 10 ጥሬ ዕቃዎች (Top 10 Raw Material Cost Drivers)' : 'Top 10 Cost Drivers'}</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold bg-slate-950/60">
                    <th className="py-2.5 px-3">{language === 'am' ? 'ደረጃ' : '#' }</th>
                    <th className="py-2.5 px-3">{language === 'am' ? 'የጥሬ ዕቃ ስም' : 'Material'}</th>
                    <th className="py-2.5 px-2 text-right">{language === 'am' ? 'የአንዱ ዋጋ' : 'Unit Price'}</th>
                    <th className="py-2.5 px-2 text-right">{language === 'am' ? 'የተፈጀ መጠን' : 'Qty Used'}</th>
                    <th className="py-2.5 px-3 text-right">{language === 'am' ? 'አጠቃላይ ወጪ (ETB)' : 'Total Cost (ETB)'}</th>
                    <th className="py-2.5 px-3">{language === 'am' ? 'የወጪ ድርሻ %' : '% of Total'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {calculateAnalysis.itemAuditResults
                    .slice()
                    .sort((a, b) => b.totalRecipeUsage * b.unitPrice - a.totalRecipeUsage * a.unitPrice)
                    .slice(0, 10)
                    .map((item, idx) => {
                      const itemTotalCost = item.totalRecipeUsage * item.unitPrice;
                      const pctOfTotal = totalTheoreticalCost > 0 ? (itemTotalCost / totalTheoreticalCost) * 100 : 0;
                      return (
                        <tr key={idx} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 text-slate-500 font-bold">#{idx + 1}</td>
                          <td className="py-2.5 px-3 font-bold text-white font-sans">{item.itemName}</td>
                          <td className="py-2.5 px-2 text-right text-slate-300">{formatCurrency(item.unitPrice)}</td>
                          <td className="py-2.5 px-2 text-right text-amber-300 font-bold">
                            {item.totalRecipeUsage.toFixed(2)} {item.countUnit}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-emerald-400">
                            {formatCurrency(itemTotalCost)}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full"
                                  style={{ width: `${Math.min(100, pctOfTotal)}%` }}
                                ></div>
                              </div>
                              <span className="text-[11px] text-slate-400">{pctOfTotal.toFixed(1)}%</span>
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

      {/* =========================================================================
          PILLAR 5: OFFICIAL COMPREHENSIVE EXECUTIVE F&B OWNER'S REPORT (ለባለቤቶች የሚቀርብ ይፋዊ ሪፖርት)
          ========================================================================= */}
      {viewMode === 'ownerReport' && (
        <div id="executive-owner-report" className="space-y-6 animate-fadeIn">
          {/* Executive Printable Letterhead Container */}
          <div className="bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 p-6 sm:p-8 rounded-3xl border-2 border-amber-500/40 shadow-2xl space-y-6">
            
            {/* Top Toolbar (Hidden on print) */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-amber-500/20 print:hidden">
              <button
                type="button"
                onClick={() => setViewMode('dailyInput')}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-300 bg-slate-800/90 hover:bg-slate-700 hover:text-white border border-slate-700 transition-all cursor-pointer"
              >
                <ClipboardList className="w-4 h-4 text-amber-400" />
                <span>{language === 'am' ? '← ወደ ዕለታዊ መሙያ ተመለስ' : '← Back to Daily Input'}</span>
              </button>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleExportOwnerReportWord}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black text-blue-200 bg-gradient-to-r from-blue-900 via-indigo-950 to-blue-900 hover:from-blue-800 hover:to-indigo-900 border border-blue-400/50 transition-all cursor-pointer shadow-md"
                >
                  <FileText className="w-4 h-4 text-blue-300" />
                  <span>{language === 'am' ? '📄 በ Word (.doc) አውርድ' : '📄 Export Word (.doc)'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportOwnerReportCSV}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 transition-all cursor-pointer shadow-sm"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>{language === 'am' ? '📥 በ Excel / CSV አውርድ' : '📥 Export CSV'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black text-slate-950 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 border border-amber-300 transition-all cursor-pointer shadow-lg"
                >
                  <Printer className="w-4 h-4 text-slate-950" />
                  <span>{language === 'am' ? '🖨️ ይፋዊ ሪፖርት አትም (Print / PDF)' : '🖨️ Print Report / PDF'}</span>
                </button>
              </div>
            </div>

            {/* Official Letterhead */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-800 pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-amber-400">
                  <Building2 className="w-6 h-6 text-amber-400" />
                  <span className="text-xs font-black tracking-widest uppercase">
                    BELLO FAM RESTAURANT GROUP • የቤሎ ፋም ሬስቶራንት ግሩፕ
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {language === 'am'
                    ? 'ይፋዊ የዕለታዊ የውሂብ ድብልቅ F&B ቁጥጥር፣ የሜኑ ሽያጭና የጥሬ ዕቃ ሪኮንሲሊየሽን ሪፖርት'
                    : 'Official Executive Daily F&B Data Blend Control & Variance Audit Report'}
                </h1>
                <p className="text-xs text-slate-400">
                  {language === 'am'
                    ? 'ለባለቤቶች የሚቀርብ ይፋዊ የውሂብ ድብልቅ፦ የሽያጭ፣ የምግብ ሪሲፒ ፍጆታና የቆጠራ ማጠቃለያ'
                    : 'Executive unified data blend presenting sales, recipe depletions, inventory reconciliation, and variances'}
                </p>
              </div>

              <div className="text-right sm:border-l sm:border-slate-800 sm:pl-5 space-y-1 text-xs shrink-0 font-mono">
                <div className="text-amber-300 font-bold text-sm">
                  {currentBranch?.nameAm || ''} ({currentBranch?.code || ''})
                </div>
                <div className="text-slate-300">
                  🇪🇹 {formatEthiopianDate(selectedDate)}
                </div>
                <div className="text-slate-400 text-[11px]">
                  G.C. {selectedDate} • {selectedShift === 'ALL_DAY' ? 'ሙሉ ቀን' : selectedShift}
                </div>
                <div className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30 inline-block">
                  BF-FNB-{currentBranch?.code || 'BR'}-{selectedDate.replace(/-/g, '')}
                </div>
              </div>
            </div>

            {/* Executive KPI Scorecards (8 core metrics) */}
            <div>
              <div className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-amber-400" />
                <span>{language === 'am' ? 'የገንዘብና የቁጥጥር ቁልፍ ማጠቃለያ (Executive Financial Scorecard)' : 'Executive Financial Scorecard'}</span>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Cashier Revenue */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-emerald-500/30 shadow-md space-y-1">
                  <div className="text-[11px] text-slate-400 font-bold flex items-center justify-between">
                    <span>{language === 'am' ? 'የካሽየር የተመዘገበ ገቢ' : 'POS Billed Revenue'}</span>
                    <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="text-lg sm:text-xl font-black font-mono text-emerald-400">
                    {formatCurrency(totalCashierRevenue)}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {language === 'am' ? 'በካሽየር ሲስተም የገባ ህጋዊ ሽያጭ' : 'Verified cashier receipts'}
                  </div>
                </div>

                {/* 2. Chef Revenue */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-indigo-500/30 shadow-md space-y-1">
                  <div className="text-[11px] text-slate-400 font-bold flex items-center justify-between">
                    <span>{language === 'am' ? 'የወጥ ቤት አቅም ገቢ' : 'Kitchen Sales Value'}</span>
                    <UtensilsCrossed className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <div className="text-lg sm:text-xl font-black font-mono text-indigo-300">
                    {formatCurrency(totalChefRevenue)}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {language === 'am' ? 'በሼፍ የወጡ ምግቦች ዋጋ' : 'Total food dispensed by chefs'}
                  </div>
                </div>

                {/* 3. Sales Discrepancy */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-md space-y-1">
                  <div className="text-[11px] text-slate-400 font-bold flex items-center justify-between">
                    <span>{language === 'am' ? 'የቲኬት ሽያጭ ልዩነት' : 'Unbilled Sales Discrepancy'}</span>
                    {cashierVarianceEtb === 0 ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    )}
                  </div>
                  <div className={`text-lg sm:text-xl font-black font-mono ${cashierVarianceEtb === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {cashierVarianceEtb === 0 ? '0.00 ብር' : formatCurrency(cashierVarianceEtb)}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {cashierVarianceEtb === 0
                      ? (language === 'am' ? 'ምንም ያልተመታ ሽያጭ የለም ✓' : 'Zero unbilled tickets')
                      : (language === 'am' ? 'ከኩሽና ወጥቶ ያልተመታ ሽያጭ 🚨' : 'Unbilled kitchen orders')}
                  </div>
                </div>

                {/* 4. Theoretical Food Cost */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-amber-500/30 shadow-md space-y-1">
                  <div className="text-[11px] text-slate-400 font-bold flex items-center justify-between">
                    <span>{language === 'am' ? 'ቲዎሪቲካል የሪሲፒ ወጪ' : 'Theoretical Food Cost'}</span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="text-lg sm:text-xl font-black font-mono text-amber-300">
                    {formatCurrency(totalTheoreticalCost)}
                  </div>
                  <div className="text-[10px] text-amber-400 font-bold font-mono">
                    Food Cost %፦ {theoreticalFoodCostPct.toFixed(1)}%
                  </div>
                </div>

                {/* 5. Actual Consumption Cost */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-md space-y-1">
                  <div className="text-[11px] text-slate-400 font-bold flex items-center justify-between">
                    <span>{language === 'am' ? 'ትክክለኛ የጥሬ ዕቃ ፍጆታ' : 'Actual Consumption Cost'}</span>
                    <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div className="text-lg sm:text-xl font-black font-mono text-white">
                    {formatCurrency(actualConsumptionCost)}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {language === 'am' ? 'መነሻ + የገባ - የጠዋት ቆጠራ' : 'Beg + Rec - Actual Count'}
                  </div>
                </div>

                {/* 6. Net Stock Variance */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-md space-y-1">
                  <div className="text-[11px] text-slate-400 font-bold flex items-center justify-between">
                    <span>{language === 'am' ? 'የተጣራ የጥሬ ዕቃ ልዩነት' : 'Net Stock Variance Value'}</span>
                    {netVarianceEtb < -100 ? (
                      <BadgeAlert className="w-3.5 h-3.5 text-rose-400" />
                    ) : (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </div>
                  <div className={`text-lg sm:text-xl font-black font-mono ${
                    netVarianceEtb < -100
                      ? 'text-rose-400'
                      : netVarianceEtb > 100
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}>
                    {netVarianceEtb >= 0 ? '+' : ''}{formatCurrency(netVarianceEtb)}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {netVarianceEtb < 0
                      ? (language === 'am' ? 'ከሪሲፒ በላይ የወጣ/የጠፋ እቃ' : 'Unexplained stock shortage')
                      : netVarianceEtb === 0
                      ? (language === 'am' ? 'ፍጹም ንጹህ ባላንስ ✓' : 'Perfect match')
                      : (language === 'am' ? 'ትርፍ ስቶክ' : 'Overage')}
                  </div>
                </div>

                {/* 7. Management Expense */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-purple-500/30 shadow-md space-y-1">
                  <div className="text-[11px] text-slate-400 font-bold flex items-center justify-between">
                    <span>{language === 'am' ? 'የማኔጅመንት መስተንግዶ' : 'Management Expense'}</span>
                    <User className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                  <div className="text-lg sm:text-xl font-black font-mono text-purple-300">
                    {formatCurrency(totalMgmtValue)}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {managementMenuEntries.length} {language === 'am' ? 'የተመዘገቡ መስተንግዶዎች' : 'authorized entries'}
                  </div>
                </div>

                {/* 8. Wastage & Damage */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-rose-500/30 shadow-md space-y-1">
                  <div className="text-[11px] text-slate-400 font-bold flex items-center justify-between">
                    <span>{language === 'am' ? 'የብልሽትና ስብራት ኪሳራ' : 'Wastage & Damage Loss'}</span>
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  </div>
                  <div className="text-lg sm:text-xl font-black font-mono text-rose-400">
                    {formatCurrency(totalDamageValue)}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {language === 'am' ? 'የወጥ ቤት ብክነትና ቆሻሻ' : 'Kitchen prep loss & waste'}
                  </div>
                </div>
              </div>
            </div>

            {/* Executive Diagnosis & Auditor Assessment Narrative Box */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-black uppercase text-amber-300">
                    {language === 'am' ? 'የF&B ኦዲተር የሙያ ማጠቃለያና ትንታኔ (Executive Auditor Assessment)' : 'Executive Auditor Assessment'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {cashierVarianceEtb === 0 && calculateAnalysis.investigateItems.length === 0 ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      {language === 'am' ? '✅ ንጹህ የቁጥጥር ቀን - ምንም ያልተፈታ ልዩነት የለም' : '✅ Audit Clean - Fully Reconciled'}
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                      {language === 'am' ? '🚨 ማጣራት የሚሹ ልዩነቶች ተገኝተዋል' : '🚨 Discrepancies Requiring Review'}
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs sm:text-sm font-semibold text-slate-200 leading-relaxed">
                {language === 'am' ? calculateAnalysis.aiDiagnosisAm : calculateAnalysis.aiDiagnosisEn}
              </p>

              <div className="pt-2 border-t border-slate-800/80 flex items-start gap-2 text-xs text-slate-400">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-300 block mb-0.5">
                    {language === 'am' ? 'የኦዲት ስሌት አመክንዮ (Audit Logic Transparency):' : 'Audit Logic Transparency:'}
                  </strong>
                  <span>{language === 'am' ? calculateAnalysis.aiReasoningAm : calculateAnalysis.aiReasoningEn}</span>
                </div>
              </div>
            </div>

            {/* SECTION I: MENU & CASHIER POS RECONCILIATION */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black text-xs border border-indigo-500/30">
                    I
                  </span>
                  <h3 className="font-black text-sm text-white">
                    {language === 'am' ? 'ክፍል 1፦ የሜኑ ሽያጭና የካሽየር POS ማመሳከሪያ' : 'Section I: Menu Production vs Cashier POS Reconciliation'}
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {language === 'am' ? 'በሼፍ የወጣ vs በካሽየር የተመዘገበ' : 'Chef KOT vs Cashier Tickets'}
                </span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-800">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold bg-slate-950">
                      <th className="py-2.5 px-3">{language === 'am' ? 'የምግብ ስም' : 'Menu Dish'}</th>
                      <th className="py-2.5 px-3 text-right">{language === 'am' ? 'የአንዱ ዋጋ' : 'Menu Price'}</th>
                      <th className="py-2.5 px-3 text-right text-indigo-300">{language === 'am' ? 'የሼፍ ትእዛዝ (KOT)' : 'Chef Count'}</th>
                      <th className="py-2.5 px-3 text-right text-emerald-300">{language === 'am' ? 'የካሽየር POS' : 'Cashier Count'}</th>
                      <th className="py-2.5 px-3 text-right">{language === 'am' ? 'ልዩነት' : 'Variance'}</th>
                      <th className="py-2.5 px-3 text-right">{language === 'am' ? 'የገንዘብ ተጽዕኖ' : 'Financial Impact'}</th>
                      <th className="py-2.5 px-4">{language === 'am' ? 'የኦዲት ሁኔታ' : 'Audit Status'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 bg-slate-950/40">
                    {calculateAnalysis.menuReconciliationRows
                      .filter((r) => r.chefQty > 0 || r.cashierQty > 0)
                      .map((row) => (
                        <tr key={row.recipeId} className="hover:bg-slate-900/60">
                          <td className="py-2.5 px-3 font-bold text-white">{row.dishName}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-400">{formatCurrency(row.sellingPrice)}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-400">{row.chefQty}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">{row.cashierQty}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-black">
                            {row.variance === 0 ? (
                              <span className="text-emerald-400">0</span>
                            ) : row.variance > 0 ? (
                              <span className="text-rose-400">+{row.variance}</span>
                            ) : (
                              <span className="text-amber-400">{row.variance}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-400">
                            {row.variance > 0 ? formatCurrency(row.varianceEtb) : '-'}
                          </td>
                          <td className="py-2.5 px-4">
                            {row.status === 'EQUAL' && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 text-[10px]">
                                {language === 'am' ? 'ትክክል ✓' : 'Clean ✓'}
                              </span>
                            )}
                            {row.status === 'CHEF_HIGHER' && (
                              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-black border border-rose-500/40 text-[10px]">
                                {language === 'am' ? 'ያልተመዘገበ ሽያጭ 🚨' : 'Unbilled Sale 🚨'}
                              </span>
                            )}
                            {row.status === 'CASHIER_HIGHER' && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 text-[10px]">
                                {language === 'am' ? 'የመዝገብ ስህተት ⚠️' : 'Void Order ⚠️'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    {calculateAnalysis.menuReconciliationRows.filter((r) => r.chefQty > 0 || r.cashierQty > 0).length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-500">
                          {language === 'am' ? 'በዚህ ቀን ምንም የተመዘገበ የሜኑ ሽያጭ የለም።' : 'No menu sales recorded for this date.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {calculateAnalysis.menuReconciliationRows.filter((r) => r.chefQty > 0 || r.cashierQty > 0).length > 0 && (
                    <tfoot className="border-t-2 border-slate-700 bg-slate-950 font-bold font-mono text-xs">
                      <tr>
                        <td className="py-3 px-3 text-white">{language === 'am' ? 'አጠቃላይ ድምር (Totals)' : 'Totals'}</td>
                        <td></td>
                        <td className="py-3 px-3 text-right text-indigo-400">
                          {calculateAnalysis.menuReconciliationRows.reduce((s, r) => s + r.chefQty, 0)}
                        </td>
                        <td className="py-3 px-3 text-right text-emerald-400">
                          {calculateAnalysis.menuReconciliationRows.reduce((s, r) => s + r.cashierQty, 0)}
                        </td>
                        <td></td>
                        <td className="py-3 px-3 text-right text-rose-400">
                          {formatCurrency(cashierVarianceEtb)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* SECTION II: SYNTHESIZED EXECUTIVE CATEGORY SUMMARY & AUDIT FORENSICS */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-xs border border-amber-500/30">
                    II
                  </span>
                  <div>
                    <h3 className="font-black text-sm text-white">
                      {language === 'am'
                        ? 'ክፍል 2፦ የተቀነባበረ የውሂብ ድብልቅ ማጠቃለያ (Synthesized Category Breakdown)'
                        : 'Section II: Synthesized Executive Department Category Breakdown'}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {language === 'am'
                        ? 'ለስራ አስኪያጅና ለባለቤቶች የተቀነባበረ አጠቃላይ የክፍልፋዮች (ስጋ፣ አትክልት፣ ወተት፣ ዳቦ፣ መጠጥ) የገንዘብና ፍጆታ ሚዛን'
                        : 'Executive aggregated financial summary by department category'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-amber-300 font-mono bg-amber-950/50 px-2.5 py-1 rounded-lg border border-amber-500/30 font-bold">
                    {calculateAnalysis.itemAuditResults.length} {language === 'am' ? 'የተቆጠሩ እቃዎች' : 'Tracked Items'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowFullDetailedTable((prev) => !prev)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-300 bg-slate-900 border border-amber-500/40 hover:bg-slate-800 hover:text-white transition-all cursor-pointer shadow-sm"
                  >
                    <span>{showFullDetailedTable ? (language === 'am' ? '▲ ዝርዝሩን ደብቅ' : '▲ Hide Full Table') : (language === 'am' ? '▼ ሙሉ ዝርዝር 52 እቃዎች አሳይ' : '▼ Show Full 52 Items')}</span>
                  </button>
                </div>
              </div>

              {/* Synthesized Department Breakdown Table */}
              <div className="overflow-x-auto rounded-2xl border border-amber-500/30 shadow-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold bg-slate-950">
                      <th className="py-2.5 px-3">{language === 'am' ? 'የዲፓርትመንት ክፍልፋይ (Category)' : 'Department Category'}</th>
                      <th className="py-2.5 px-2 text-center">{language === 'am' ? 'እቃዎች' : 'Items'}</th>
                      <th className="py-2.5 px-3 text-right">{language === 'am' ? 'መነሻ ዋጋ' : 'Beg Value'}</th>
                      <th className="py-2.5 px-3 text-right">{language === 'am' ? 'የገባ ዋጋ' : 'Rec Value'}</th>
                      <th className="py-2.5 px-3 text-right text-indigo-300">{language === 'am' ? 'የሪሲፒ ፍጆታ' : 'Recipe Use'}</th>
                      <th className="py-2.5 px-3 text-right text-amber-300 bg-amber-950/10">{language === 'am' ? 'መገኘት የነበረበት' : 'Expected'}</th>
                      <th className="py-2.5 px-3 text-right text-emerald-300 bg-emerald-950/10 font-bold">{language === 'am' ? 'የተቆጠረ ዋጋ' : 'Actual Count'}</th>
                      <th className="py-2.5 px-3 text-right">{language === 'am' ? 'የተጣራ ልዩነት' : 'Net Variance'}</th>
                      <th className="py-2.5 px-3 text-center">{language === 'am' ? 'ሁኔታ' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 bg-slate-950/40">
                    {executiveCategoryBreakdown.map((cat) => (
                      <tr key={cat.categoryKey} className="hover:bg-slate-900/60 font-medium">
                        <td className="py-3 px-3 font-bold text-white">
                          {language === 'am' ? cat.labelAm : cat.labelEn}
                        </td>
                        <td className="py-3 px-2 text-center font-mono text-slate-400">
                          {cat.itemCount}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-300">
                          {formatCurrency(cat.beginningValue)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-300">
                          {formatCurrency(cat.receivedValue)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-indigo-300 font-bold">
                          {formatCurrency(cat.recipeUsageValue)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-amber-300 bg-amber-950/10">
                          {formatCurrency(cat.expectedValue)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-emerald-400 bg-emerald-950/10">
                          {formatCurrency(cat.actualValue)}
                        </td>
                        <td className={`py-3 px-3 text-right font-mono font-black ${
                          cat.varianceValue < -50
                            ? 'text-rose-400'
                            : cat.varianceValue > 50
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}>
                          {cat.varianceValue >= 0 ? '+' : ''}{formatCurrency(cat.varianceValue)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {cat.hasInvestigation ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-black border border-rose-500/40 text-[10px]">
                              {language === 'am' ? '🚨 ማጣራት' : '🚨 Review'}
                            </span>
                          ) : Math.abs(cat.varianceValue) > 100 ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 text-[10px]">
                              {language === 'am' ? '⚠️ ጥንቃቄ' : '⚠️ Warning'}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 text-[10px]">
                              {language === 'am' ? '✅ ንጹህ' : '✅ Balanced'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-slate-700 bg-slate-950 font-bold font-mono text-xs">
                    <tr>
                      <td className="py-3 px-3 text-white">{language === 'am' ? 'አጠቃላይ ድምር (Grand Total)' : 'Grand Total'}</td>
                      <td className="py-3 px-2 text-center text-slate-400">
                        {executiveCategoryBreakdown.reduce((s, c) => s + c.itemCount, 0)}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-300">
                        {formatCurrency(executiveCategoryBreakdown.reduce((s, c) => s + c.beginningValue, 0))}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-300">
                        {formatCurrency(executiveCategoryBreakdown.reduce((s, c) => s + c.receivedValue, 0))}
                      </td>
                      <td className="py-3 px-3 text-right text-indigo-300">
                        {formatCurrency(executiveCategoryBreakdown.reduce((s, c) => s + c.recipeUsageValue, 0))}
                      </td>
                      <td className="py-3 px-3 text-right text-amber-300">
                        {formatCurrency(executiveCategoryBreakdown.reduce((s, c) => s + c.expectedValue, 0))}
                      </td>
                      <td className="py-3 px-3 text-right text-emerald-400 font-black">
                        {formatCurrency(executiveCategoryBreakdown.reduce((s, c) => s + c.actualValue, 0))}
                      </td>
                      <td className="py-3 px-3 text-right text-rose-400 font-black">
                        {netVarianceEtb >= 0 ? '+' : ''}{formatCurrency(netVarianceEtb)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Top 5 Actionable Discrepancies Forensics Box */}
              {topActionableAnomalies.length > 0 && (
                <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-rose-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      <span>{language === 'am' ? 'ዋና ዋና ልዩነቶችና የኦዲት ማጣሪያዎች (Top Actionable Variances)' : 'Top Actionable Variances'}</span>
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {language === 'am' ? 'ከፍተኛ የገንዘብ ተጽዕኖ ያላቸው 5 እቃዎች' : 'Top 5 financial impact items'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {topActionableAnomalies.map((item) => (
                      <div key={item.itemId} className="p-3 rounded-xl bg-slate-950/80 border border-rose-500/20 space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold text-white">
                          <span>{item.itemName}</span>
                          <span className="text-rose-400 font-mono">
                            {item.varianceQty > 0 ? `+${item.varianceQty}` : item.varianceQty} {item.countUnit}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>{language === 'am' ? 'የገንዘብ ጉድለት፦' : 'Shortage Value:'}</span>
                          <strong className="text-rose-400 font-mono">
                            {formatCurrency(item.varianceValueEtb)}
                          </strong>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {language === 'am' ? 'መገኘት የነበረበት፦ ' : 'Expected: '}{item.expectedEnding} {item.countUnit} • {language === 'am' ? 'የተቆጠረ፦ ' : 'Actual: '}{item.actualEnding}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Granular 52-Row Full Table (Expanded on demand) */}
              {showFullDetailedTable && (
                <div className="space-y-2 pt-2 animate-fadeIn">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                    <span>{language === 'am' ? 'ዝርዝር የ52ቱ ጥሬ ዕቃዎች ሙሉ ኦዲት ሰንጠረዥ፦' : 'Full 52 Primary Materials Audit Schedule:'}</span>
                    <button
                      type="button"
                      onClick={() => setShowFullDetailedTable(false)}
                      className="text-amber-400 hover:underline text-[11px]"
                    >
                      {language === 'am' ? 'ሰንጠረዡን ደብቅ ▲' : 'Collapse Schedule ▲'}
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-800">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-bold bg-slate-950">
                          <th className="py-2.5 px-3">{language === 'am' ? 'የጥሬ ዕቃ ስም' : 'Item Name'}</th>
                          <th className="py-2.5 px-2 text-right">{language === 'am' ? 'ዋጋ (ብር)' : 'Price'}</th>
                          <th className="py-2.5 px-2 text-center">{language === 'am' ? 'መለኪያ' : 'Unit'}</th>
                          <th className="py-2.5 px-2 text-right">{language === 'am' ? 'መነሻ' : 'Beg'}</th>
                          <th className="py-2.5 px-2 text-right">{language === 'am' ? 'የገባ' : 'Rec'}</th>
                          <th className="py-2.5 px-2 text-right">{language === 'am' ? 'አጠቃላይ' : 'Total Beg'}</th>
                          <th className="py-2.5 px-2 text-right text-indigo-300">{language === 'am' ? 'ሽያጭ ሪሲፒ' : 'Recipe Use'}</th>
                          <th className="py-2.5 px-2 text-right text-purple-300">{language === 'am' ? 'ማኔጅመንት' : 'Mgmt'}</th>
                          <th className="py-2.5 px-2 text-right text-rose-300">{language === 'am' ? 'ብልሽት' : 'Dmg'}</th>
                          <th className="py-2.5 px-2 text-right text-amber-300 bg-amber-950/20">{language === 'am' ? 'መገኘት የነበረበት' : 'Expected'}</th>
                          <th className="py-2.5 px-2 text-right text-emerald-300 bg-emerald-950/20 font-black">{language === 'am' ? 'የጠዋት ቆጠራ' : 'Actual'}</th>
                          <th className="py-2.5 px-2 text-right">{language === 'am' ? 'ልዩነት' : 'Variance'}</th>
                          <th className="py-2.5 px-2 text-right">{language === 'am' ? 'በብር ልዩነት' : 'ETB Value'}</th>
                          <th className="py-2.5 px-3 text-center">{language === 'am' ? 'ደረጃ' : 'Status'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 bg-slate-950/40">
                        {calculateAnalysis.itemAuditResults.map((item) => (
                          <tr key={item.itemId} className="hover:bg-slate-900/60">
                            <td className="py-2.5 px-3 font-bold text-white">
                              <div>{item.itemName}</div>
                              <span className="text-[10px] text-slate-500 font-mono">{item.itemCode}</span>
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono text-slate-400">{item.unitPrice}</td>
                            <td className="py-2.5 px-2 text-center text-slate-400">{item.countUnit}</td>
                            <td className="py-2.5 px-2 text-right font-mono text-slate-300">{item.beginningCount}</td>
                            <td className="py-2.5 px-2 text-right font-mono text-slate-300">{item.receivedQty}</td>
                            <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-200">{item.runningTotal}</td>
                            <td className="py-2.5 px-2 text-right font-mono text-indigo-300 font-semibold">{item.recipeUsageSales}</td>
                            <td className="py-2.5 px-2 text-right font-mono text-purple-300 font-semibold">{item.recipeUsageMgmt}</td>
                            <td className="py-2.5 px-2 text-right font-mono text-rose-300 font-semibold">{item.damageQty}</td>
                            <td className="py-2.5 px-2 text-right font-mono font-bold text-amber-300 bg-amber-950/10">{item.expectedEnding}</td>
                            <td className="py-2.5 px-2 text-right font-mono font-black text-emerald-400 bg-emerald-950/10">{item.actualEnding}</td>
                            <td className="py-2.5 px-2 text-right font-mono font-black">
                              {item.varianceQty === 0 ? (
                                <span className="text-emerald-400">0</span>
                              ) : item.varianceQty > 0 ? (
                                <span className="text-emerald-300">+{item.varianceQty}</span>
                              ) : (
                                <span className="text-rose-400">{item.varianceQty}</span>
                              )}
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono font-bold text-rose-400">
                              {item.varianceQty < 0 ? formatCurrency(item.varianceValueEtb) : item.varianceQty > 0 ? `+${formatCurrency(item.varianceValueEtb)}` : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {item.status === 'OK' && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 text-[10px]">
                                  {language === 'am' ? item.statusLabelAm : item.statusLabelEn}
                                </span>
                              )}
                              {item.status === 'WARNING' && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30 text-[10px]">
                                  {language === 'am' ? item.statusLabelAm : item.statusLabelEn}
                                </span>
                              )}
                              {item.status === 'INVESTIGATE' && (
                                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-black border border-rose-500/40 text-[10px] animate-pulse">
                                  {language === 'am' ? item.statusLabelAm : item.statusLabelEn}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t-2 border-slate-700 bg-slate-950 font-bold font-mono text-xs">
                        <tr>
                          <td colSpan={11} className="py-3 px-3 text-white">
                            {language === 'am' ? 'የተጣራ የጥሬ ዕቃ ልዩነት ጠቅላላ ድምር (Net Shortage Value):' : 'Total Net Shortage Value:'}
                          </td>
                          <td></td>
                          <td className="py-3 px-2 text-right text-rose-400 font-black">
                            {formatCurrency(calculateAnalysis.totalShortageValue)}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION III & IV: MANAGEMENT CONSUMPTION AND DAMAGE LOGS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
              
              {/* Management Consumption */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-black text-xs border border-purple-500/30">
                    III
                  </span>
                  <h3 className="font-black text-sm text-white">
                    {language === 'am' ? 'ክፍል 3፦ የማኔጅመንት መስተንግዶ ዝርዝር' : 'Section III: Management Hospitality Log'}
                  </h3>
                </div>

                {managementMenuEntries.length > 0 ? (
                  <div className="overflow-x-auto rounded-2xl border border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 bg-slate-950 font-bold">
                          <th className="py-2 px-3">{language === 'am' ? 'የምግብ ስም' : 'Dish'}</th>
                          <th className="py-2 px-2 text-right">{language === 'am' ? 'ብዛት' : 'Qty'}</th>
                          <th className="py-2 px-3">{language === 'am' ? 'የፈቀደው' : 'Authorized'}</th>
                          <th className="py-2 px-3">{language === 'am' ? 'ምክንያት' : 'Reason'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 bg-slate-950/40 font-mono">
                        {managementMenuEntries.map((m, idx) => {
                          const r = branchRecipes.find((rc) => rc.id === m.recipeId);
                          return (
                            <tr key={idx} className="hover:bg-slate-900/50">
                              <td className="py-2 px-3 font-sans text-white font-bold">
                                {language === 'am' ? r?.nameAm || m.recipeId : r?.nameEn || m.recipeId}
                              </td>
                              <td className="py-2 px-2 text-right text-purple-300 font-bold">{m.quantity}</td>
                              <td className="py-2 px-3 text-slate-300 font-sans">{m.beneficiary || '-'}</td>
                              <td className="py-2 px-3 text-slate-400 font-sans">{m.reason || '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-slate-400 text-xs text-center">
                    {language === 'am' ? 'በዚህ ቀን ምንም አይነት የማኔጅመንት መስተንግዶ አልተመዘገበም።' : 'No management hospitality recorded.'}
                  </div>
                )}
              </div>

              {/* Kitchen Damage & Wastage Log */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center font-black text-xs border border-rose-500/30">
                    IV
                  </span>
                  <h3 className="font-black text-sm text-white">
                    {language === 'am' ? 'ክፍል 4፦ የወጥ ቤት ብልሽትና ኪሳራ መዝገብ' : 'Section IV: Kitchen Wastage & Damage Log'}
                  </h3>
                </div>

                {Object.keys(damageCounts).filter((k) => (damageCounts[k] || 0) > 0).length > 0 ? (
                  <div className="overflow-x-auto rounded-2xl border border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 bg-slate-950 font-bold">
                          <th className="py-2 px-3">{language === 'am' ? 'የጥሬ ዕቃ ስም' : 'Item'}</th>
                          <th className="py-2 px-2 text-right">{language === 'am' ? 'ብዛት' : 'Qty'}</th>
                          <th className="py-2 px-2 text-right">{language === 'am' ? 'ዋጋ በብር' : 'Loss ETB'}</th>
                          <th className="py-2 px-3">{language === 'am' ? 'ምክንያት' : 'Reason / Note'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 bg-slate-950/40 font-mono">
                        {Object.keys(damageCounts)
                          .filter((k) => (damageCounts[k] || 0) > 0)
                          .map((k) => {
                            const it = items.find((i) => i.id === k);
                            const price = it?.lastPurchasePrice || it?.weightedAvgCost || 0;
                            const qty = damageCounts[k] || 0;
                            return (
                              <tr key={k} className="hover:bg-slate-900/50">
                                <td className="py-2 px-3 font-sans text-white font-bold">
                                  {language === 'am' ? it?.nameAm || k : it?.nameEn || k}
                                </td>
                                <td className="py-2 px-2 text-right text-rose-400 font-bold">{qty} {it?.unitAm}</td>
                                <td className="py-2 px-2 text-right text-rose-400">{formatCurrency(qty * price)}</td>
                                <td className="py-2 px-3 text-slate-400 font-sans">{damageNotes[k] || '-'}</td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-slate-400 text-xs text-center">
                    {language === 'am' ? 'በዚህ ቀን ምንም አይነት የተበላሸ ወይም የተሰበረ እቃ አልተመዘገበም።' : 'No wastage or damage recorded.'}
                  </div>
                )}
              </div>
            </div>

            {/* SECTION V: OFFICIAL AUDIT SIGN-OFF CERTIFICATIONS */}
            <div className="pt-6 border-t-2 border-amber-500/30 space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-xs border border-emerald-500/30">
                  V
                </span>
                <h3 className="font-black text-sm text-white">
                  {language === 'am' ? 'ክፍል 5፦ ይፋዊ የኦዲት ማጽደቂያ ፊርማዎች (Official Certification Sign-Off)' : 'Section V: Official Certification Sign-Off'}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                {/* 1. F&B Controller */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <span>{language === 'am' ? 'F&B ቁጥጥር ኦፊሰር' : 'F&B Controller'}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    {language === 'am'
                      ? 'የቀኑ የሜኑ ሽያጭ እና የጥሬ ዕቃዎች ቆጠራ በሬሲፒ ተሰልቶ ትክክለኛነቱ ተረጋግጧል።'
                      : 'All recipe usages, menu tickets, and physical inventory variances audited.'}
                  </p>
                  <div className="pt-4 border-t border-slate-800/80 space-y-2 text-xs font-mono text-slate-300">
                    <div>{language === 'am' ? 'ስም፦ ____________________' : 'Name: ____________________'}</div>
                    <div>{language === 'am' ? 'ፊርማ፦ __________________' : 'Signature: _______________'}</div>
                    <div>{language === 'am' ? `ቀን፦ ${selectedDate}` : `Date: ${selectedDate}`}</div>
                  </div>
                </div>

                {/* 2. Branch Manager */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-amber-400" />
                    <span>{language === 'am' ? 'የቅርንጫፍ ስራ አስኪያጅ' : 'Branch Manager'}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    {language === 'am'
                      ? 'በኩሽና የወጡ ምግቦች፣ የተቀበሉት እቃዎችና የተመዘገቡት ወጪዎች ትክክል መሆናቸውን አረጋግጣለሁ።'
                      : 'Certified chef production, received deliveries, and reported kitchen status.'}
                  </p>
                  <div className="pt-4 border-t border-slate-800/80 space-y-2 text-xs font-mono text-slate-300">
                    <div>{language === 'am' ? `ስም፦ ${managerName}` : `Name: ${managerName}`}</div>
                    <div>{language === 'am' ? 'ፊርማ፦ __________________' : 'Signature: _______________'}</div>
                    <div>{language === 'am' ? `ቀን፦ ${selectedDate}` : `Date: ${selectedDate}`}</div>
                  </div>
                </div>

                {/* 3. Owner / Managing Director */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/40 space-y-3">
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-amber-400" />
                    <span>{language === 'am' ? 'የድርጅቱ ባለቤት / ጠቅላላ ስራ አስኪያጅ' : 'Owner / General Manager'}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    {language === 'am'
                      ? 'ይፋዊው ሪፖርት ተገምግሞ በድርጅቱ የበላይ አመራር ዘንድ ተመዝግቧል።'
                      : 'Executive review approved and archived into restaurant financial ledger.'}
                  </p>
                  <div className="pt-4 border-t border-slate-800/80 space-y-2 text-xs font-mono text-slate-300">
                    <div className="flex items-center gap-4 text-xs font-bold text-amber-400">
                      <span>[  ] {language === 'am' ? 'ጸድቋል ✓' : 'Approved ✓'}</span>
                      <span>[  ] {language === 'am' ? 'ማጣራት ይደረግ' : 'Review'}</span>
                    </div>
                    <div>{language === 'am' ? 'ፊርማ፦ __________________' : 'Signature: _______________'}</div>
                    <div>{language === 'am' ? 'ቀን፦ ____________________' : 'Date: ____________________'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Footer Notice */}
            <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 font-mono">
              <div>BELLO FAM RESTAURANT GROUP • F&B CONTROL SYSTEM • 24-HOUR AUDIT CYCLE</div>
              <div>{language === 'am' ? 'በኮምፒውተር የተዘጋጀ ይፋዊ የኦዲት ሰነድ' : 'Official Computer Generated F&B Audit Document'}</div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VOICE ENTRY READ-BACK CONFIRMATION MODAL
          ========================================================================= */}
      {voiceConfirmModalOpen && voiceTargetField && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 rounded-3xl p-6 border border-amber-500/40 shadow-2xl max-w-sm w-full space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/20 text-amber-400 mx-auto flex items-center justify-center font-black">
              <Volume2 className="w-6 h-6 animate-pulse" />
            </div>

            <div>
              <h3 className="font-bold text-base text-white">
                {language === 'am' ? 'ይህ ተመዝግቧል፤ ትክክል ነው?' : 'Recorded! Is this correct?'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">{voiceTargetField.label}</p>
            </div>

            <div className="p-4 bg-slate-950 rounded-2xl border border-amber-500/30">
              <span className="text-2xl font-mono font-black text-amber-300">
                {voiceTranscript || '0'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVoiceConfirmModalOpen(false)}
                className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs"
              >
                {language === 'am' ? 'አይደለም (Cancel)' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmVoiceInput}
                className="py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-xs shadow-md cursor-pointer"
              >
                {language === 'am' ? 'አዎ ትክክል ነው ✅' : 'Yes, Confirm ✅'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          EXCEL PASTE MODAL FOR CASHIER SALES
          ========================================================================= */}
      {excelPasteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 rounded-3xl p-6 border border-rose-500/40 shadow-2xl max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-rose-400" />
                <span>{language === 'am' ? 'ከካሽየር ሪፖርት Excel/CSV ለጥፍ' : 'Paste Cashier Sales (Excel/CSV)'}</span>
              </h3>
              <button onClick={() => setExcelPasteModalOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              {language === 'am'
                ? 'ከኤክሴል ወይም ከPOS ሪፖርት የምግብ ስም እና ብዛት ኮፒ አድርገው እዚህ ይለጥፉ (ምሳሌ፦ ስፓጌቲ ቦሎኔዝ [Tab] 12)'
                : 'Copy dish name and sold quantity columns from Excel and paste here.'}
            </p>

            <textarea
              rows={6}
              value={excelPasteText}
              onChange={(e) => setExcelPasteText(e.target.value)}
              placeholder="ስፓጌቲ ቦሎኔዝ	12&#10;ታሌቴሊ አልፍሬዶ	8&#10;ስፓጌቲ ቱና	6"
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-mono text-white focus:outline-none focus:border-rose-400"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setExcelPasteModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
              >
                {language === 'am' ? 'ሰርዝ' : 'Cancel'}
              </button>
              <button
                onClick={handleApplyExcelSales}
                className="px-5 py-2 bg-gradient-to-r from-rose-600 to-pink-600 text-white font-bold rounded-xl text-xs shadow-md"
              >
                {language === 'am' ? 'ጫንና አናብብ' : 'Import Sales'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ADD NEW PRIMARY MATERIAL MODAL (ከስቶር መምረጥ ወይም አዲስ መመዝገብ)
          ========================================================================= */}
      {newPrimaryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-2 border-amber-500/50 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative space-y-5">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300">
                  <PackagePlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-amber-300">
                    {language === 'am' ? 'አዲስ ፕራይመሪ ማቴሪያል መጨመሪያ' : 'Add New Primary Material'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {language === 'am'
                      ? 'ለዚህ ቅርንጫፍ እለታዊ ቆጠራ የሚሆን ጥሬ እቃ ይጨምሩ'
                      : 'Track a new primary material for this branch daily control'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setNewPrimaryModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {newPrimarySuccessNotice && (
              <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{newPrimarySuccessNotice}</span>
              </div>
            )}

            {/* Mode Toggle: Existing from Catalog vs Register New */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setNewPrimaryMode('existing')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  newPrimaryMode === 'existing'
                    ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {language === 'am' ? '📦 ከስቶር ካታሎግ ምረጥ' : 'Select from Store'}
              </button>
              <button
                type="button"
                onClick={() => setNewPrimaryMode('new')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  newPrimaryMode === 'new'
                    ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {language === 'am' ? '➕ አዲስ ጥሬ ዕቃ ፍጠር' : 'Register New Item'}
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {newPrimaryMode === 'existing' ? (
                /* Mode 1: Multi-Select from existing store catalog */
                <div className="space-y-3">
                  {/* Search and Category Filters */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-700">
                      <Search className="w-4 h-4 text-amber-400 shrink-0" />
                      <input
                        type="text"
                        value={primarySearchFilter}
                        onChange={(e) => setPrimarySearchFilter(e.target.value)}
                        placeholder={language === 'am' ? 'እቃ በስም ወይም በኮድ ይፈልጉ...' : 'Search item name or code...'}
                        className="bg-transparent text-white text-xs w-full focus:outline-none placeholder-slate-500"
                      />
                      {primarySearchFilter && (
                        <button
                          type="button"
                          onClick={() => setPrimarySearchFilter('')}
                          className="text-slate-500 hover:text-white text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Quick Selection Ribbon */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="font-bold text-amber-300">
                        {selectedExistingItemIds.length > 0
                          ? (language === 'am'
                              ? `✓ ${selectedExistingItemIds.length} እቃዎች ተመርጠዋል`
                              : `✓ ${selectedExistingItemIds.length} items selected`)
                          : (language === 'am' ? 'ዕቃዎችን መርጠው ሳጥኑን ያብሩ (Check items):' : 'Select items below:')}
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const available = items
                              .filter((it) => !trackedItemsList.some((t) => t.itemId === it.id))
                              .filter((it) => {
                                const q = primarySearchFilter.trim().toLowerCase();
                                if (!q) return true;
                                return (
                                  (it.nameAm || '').toLowerCase().includes(q) ||
                                  (it.nameEn || '').toLowerCase().includes(q) ||
                                  (it.code || '').toLowerCase().includes(q)
                                );
                              })
                              .map((it) => it.id);
                            setSelectedExistingItemIds(available);
                          }}
                          className="text-[11px] font-bold text-amber-300 hover:text-amber-200 underline cursor-pointer"
                        >
                          {language === 'am' ? 'ሁሉንም ምረጥ' : 'Select All'}
                        </button>
                        <span className="text-slate-600">•</span>
                        <button
                          type="button"
                          onClick={() => setSelectedExistingItemIds([])}
                          className="text-[11px] font-bold text-slate-400 hover:text-white underline cursor-pointer"
                        >
                          {language === 'am' ? 'ምርጫ አጽዳ' : 'Clear'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Multi-Select Scrollable Item Cards List */}
                  <div className="max-h-56 overflow-y-auto space-y-1.5 p-1 border border-slate-800 rounded-2xl bg-slate-950/70 divide-y divide-slate-800/60">
                    {items
                      .filter((it) => !trackedItemsList.some((t) => t.itemId === it.id))
                      .filter((it) => {
                        const q = primarySearchFilter.trim().toLowerCase();
                        if (!q) return true;
                        return (
                          (it.nameAm || '').toLowerCase().includes(q) ||
                          (it.nameEn || '').toLowerCase().includes(q) ||
                          (it.code || '').toLowerCase().includes(q)
                        );
                      })
                      .map((it) => {
                        const isSelected = selectedExistingItemIds.includes(it.id);
                        return (
                          <div
                            key={it.id}
                            onClick={() => {
                              setSelectedExistingItemIds((prev) =>
                                isSelected ? prev.filter((id) => id !== it.id) : [...prev, it.id]
                              );
                              setSelectedExistingItemId(it.id);
                            }}
                            className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-amber-500/20 border border-amber-500/50 text-white shadow-sm'
                                : 'hover:bg-slate-900/80 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}} // handled by parent div
                                className="w-4 h-4 rounded text-amber-400 focus:ring-amber-400 bg-slate-900 border-slate-700 pointer-events-none"
                              />
                              <div className="truncate">
                                <span className="font-bold text-white block truncate">
                                  {language === 'am' ? it.nameAm : it.nameEn}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {it.code} • {it.unitAm || it.unit}
                                </span>
                              </div>
                            </div>

                            <span className="font-mono font-bold text-amber-400 text-xs shrink-0 ml-2">
                              {it.lastPurchasePrice || it.weightedAvgCost || 0} ብር
                            </span>
                          </div>
                        );
                      })}

                    {items.filter((it) => !trackedItemsList.some((t) => t.itemId === it.id)).length === 0 && (
                      <div className="p-4 text-center text-xs text-slate-500">
                        {language === 'am' ? 'ሁሉም የስቶር እቃዎች አስቀድመው ተጨምረዋል!' : 'All store items are already tracked!'}
                      </div>
                    )}
                  </div>

                  {/* Single item initial counts if exactly 1 item selected */}
                  {selectedExistingItemIds.length === 1 && (
                    <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <span className="text-[11px] font-bold text-slate-300 block">
                        {language === 'am' ? 'ለዚህ እቃ የመጀመሪያ ቆጠራ (አስፈላጊ ከሆነ)፦' : 'Initial count for this item (optional):'}
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">ዋጋ (Price)</label>
                          <input
                            type="number"
                            value={newPrimaryForm.unitPrice || ''}
                            onChange={(e) =>
                              setNewPrimaryForm((prev) => ({
                                ...prev,
                                unitPrice: parseFloat(e.target.value) || 0,
                              }))
                            }
                            className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-amber-300"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">መነሻ (Beg)</label>
                          <input
                            type="number"
                            value={newPrimaryForm.openingCount || ''}
                            onChange={(e) =>
                              setNewPrimaryForm((prev) => ({
                                ...prev,
                                openingCount: parseFloat(e.target.value) || 0,
                              }))
                            }
                            className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">ገቢ (Rec)</label>
                          <input
                            type="number"
                            value={newPrimaryForm.receivedCount || ''}
                            onChange={(e) =>
                              setNewPrimaryForm((prev) => ({
                                ...prev,
                                receivedCount: parseFloat(e.target.value) || 0,
                              }))
                            }
                            className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bulk helper notice when multiple selected */}
                  {selectedExistingItemIds.length > 1 && (
                    <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-[11px] text-amber-200">
                      💡 {selectedExistingItemIds.length} እቃዎች ተመርጠዋል። ከስር «የተመረጡትን እቃዎች በአንዴ ጨምር» ሲሉ ሁሉም በአንዴ ወደ ቅርንጫፉ ቆጠራ ሰንጠረዥ ይገባሉ!
                    </div>
                  )}
                </div>
              ) : (
                /* Mode 2: Register completely new item */
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1">
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        {language === 'am' ? 'የዕቃ ኮድ' : 'Code'}
                      </label>
                      <input
                        type="text"
                        placeholder="RM-..."
                        value={newPrimaryForm.code}
                        onChange={(e) => setNewPrimaryForm((prev) => ({ ...prev, code: e.target.value }))}
                        className="w-full px-2.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        {language === 'am' ? 'የእቃው ስም (አማርኛ)' : 'Name (Amharic)'}
                      </label>
                      <input
                        type="text"
                        placeholder="ለምሳሌ ስጋ፣ ዱቄት..."
                        value={newPrimaryForm.nameAm}
                        onChange={(e) => setNewPrimaryForm((prev) => ({ ...prev, nameAm: e.target.value }))}
                        className="w-full px-2.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        {language === 'am' ? 'የእቃው ስም (English)' : 'Name (English)'}
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Beef, Flour..."
                        value={newPrimaryForm.nameEn}
                        onChange={(e) => setNewPrimaryForm((prev) => ({ ...prev, nameEn: e.target.value }))}
                        className="w-full px-2.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        {language === 'am' ? 'ምድብ' : 'Category'}
                      </label>
                      <select
                        value={newPrimaryForm.category}
                        onChange={(e) => setNewPrimaryForm((prev) => ({ ...prev, category: e.target.value }))}
                        className="w-full px-2.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                      >
                        <option value="produce">አትክልት</option>
                        <option value="meat">ስጋ</option>
                        <option value="grain">እህል</option>
                        <option value="dairy">ወተት</option>
                        <option value="oil">ዘይት</option>
                        <option value="spices">ቅመም</option>
                        <option value="beverage">መጠጥ</option>
                        <option value="other">ሌላ</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        {language === 'am' ? 'መለኪያ' : 'Unit'}
                      </label>
                      <select
                        value={newPrimaryForm.unit}
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
                          setNewPrimaryForm((prev) => ({ ...prev, unit: u, unitAm: uAm }));
                        }}
                        className="w-full px-2.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                      >
                        <option value="kg">kg (ኪ.ግ)</option>
                        <option value="liter">liter (ሊትር)</option>
                        <option value="quintal">quintal (ኩንታል)</option>
                        <option value="gram">gram (ግራም)</option>
                        <option value="pcs">pcs (ፍሬ)</option>
                        <option value="pack">pack (ፓኬት)</option>
                        <option value="bottle">bottle (ጠርሙስ)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        {language === 'am' ? 'የአንዱ ዋጋ በብር (ETB)' : 'Unit Price (ETB)'}
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="0.00"
                        value={newPrimaryForm.unitPrice || ''}
                        onChange={(e) =>
                          setNewPrimaryForm((prev) => ({
                            ...prev,
                            unitPrice: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="w-full px-2.5 py-2 bg-slate-950 border border-amber-500/50 rounded-xl text-xs font-bold text-amber-300 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        {language === 'am' ? 'የጠዋት ቆጠራ (Beg Count)' : 'Morning Count'}
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={newPrimaryForm.openingCount || ''}
                        onChange={(e) =>
                          setNewPrimaryForm((prev) => ({
                            ...prev,
                            openingCount: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="w-full px-2.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        {language === 'am' ? 'የተቀበሉት (Received)' : 'Received Qty'}
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={newPrimaryForm.receivedCount || ''}
                        onChange={(e) =>
                          setNewPrimaryForm((prev) => ({
                            ...prev,
                            receivedCount: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="w-full px-2.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Mirror Checkbox for Cocoon Shola and Cocoon 6 Kilo */}
            <div className="pt-2 border-t border-slate-800">
              <label className="flex items-center gap-2.5 text-xs text-amber-300 font-bold cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={applyToBothSholaAndSixKilo}
                  onChange={(e) => setApplyToBothSholaAndSixKilo(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-400 focus:ring-amber-400 bg-slate-950 border-slate-700"
                />
                <span>
                  {language === 'am'
                    ? '⚡ ለኮኮናት ሾላ እና ለኮኮናት 6 ኪሎ እኩል ጨምር (ለሁለቱም ቅርንጫፎች)'
                    : '⚡ Apply simultaneously to both Cocoon Shola and Cocoon 6 Kilo'}
                </span>
              </label>
              <p className="text-[10px] text-slate-400 ml-6.5 mt-0.5">
                {language === 'am'
                  ? 'የሁለቱም እህትማማች ቅርንጫፎች ፕራይመሪ ዕቃዎች 100% ተመሳሳይና የተመሳሰሉ ሆነው ይቀጥላሉ።'
                  : 'Ensures both sister branches maintain 100% identical primary material lists.'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setNewPrimaryModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                {language === 'am' ? 'ሰርዝ' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSaveNewPrimaryMaterial}
                className="px-5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 text-slate-950" />
                <span>
                  {language === 'am'
                    ? (selectedExistingItemIds.length > 1
                        ? `✓ የተመረጡትን (${selectedExistingItemIds.length}) እቃዎች በአንዴ ጨምር`
                        : 'መዝግብና ወደ ቆጠራ አስገባ')
                    : (selectedExistingItemIds.length > 1
                        ? `Add Selected (${selectedExistingItemIds.length}) Items`
                        : 'Save & Track')}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          BRANCH STOCK 3-COLUMN EXCEL IMPORTER MODAL (መነሻ፣ ገቢ እና መዝጊያ ቆጠራ)
          ========================================================================= */}
      {stockExcelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-teal-500/40 rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden text-slate-100 my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-teal-500/20 bg-gradient-to-r from-slate-950 via-slate-900 to-teal-950/40">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-emerald-200 to-teal-400">
                    {language === 'am' ? '📊 የቀኑ ቆጠራ Excel መክተቻ (መነሻ፣ ገቢ፣ መዝጊያ)' : '📊 Daily Stock Counts Excel Importer'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {currentBranch?.nameAm} • 🇪🇹 {formatEthiopianDate(selectedDate)} ({selectedDate})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setStockExcelModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Success Notice */}
            {stockExcelSuccessNotice && (
              <div className="m-4 p-3.5 rounded-2xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{stockExcelSuccessNotice}</span>
              </div>
            )}

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              {/* Instructions and Toolbar */}
              <div className="p-3.5 rounded-2xl bg-teal-950/30 border border-teal-500/30 space-y-2.5">
                <p className="text-teal-200 text-xs leading-relaxed">
                  {language === 'am'
                    ? '💡 ከExcel ወይም ከCSV ኮፒ ያደረጉትን ጽሑፍ እዚህ ሳጥን ውስጥ ይለጥፉ (Paste)። ሲስተሙ እያንዳንዱን እቃ በስሙ ለይቶ መነሻ ባላንስ፣ የቀኑ ገቢ እና የመዝጊያ ቆጠራውን በየቦታው ይሞላል!'
                    : 'Copy columns from Excel (Item Name, Beginning, Received, Ending) and paste below. The system automatically places each number into its exact field!'}
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {/* Instant Paste from Clipboard */}
                  <button
                    type="button"
                    onClick={handleInstantPasteFromClipboard}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer border border-emerald-400/40"
                  >
                    <ClipboardPaste className="w-4 h-4 text-emerald-100" />
                    <span>{language === 'am' ? '📋 ከ Clipboard አሁን ለጥፍ' : '📋 Paste from Clipboard'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyStockExcelTemplate}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 border border-teal-500/40 text-teal-300 hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    {copiedStockExcelTemplate ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5 text-teal-400" />}
                    <span>
                      {copiedStockExcelTemplate
                        ? (language === 'am' ? 'ፎርማቱ ተቀድቷል! ✅' : 'Template Copied! ✅')
                        : (language === 'am' ? '📋 የ Excel ፎርማት ቅዳ' : '📋 Copy Excel Template')}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLoadStockExcelSample}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 border border-amber-500/40 text-amber-300 hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span>{language === 'am' ? '📋 ምሳሌ ዳታ አስገባ' : '📋 Load Sample Data'}</span>
                  </button>

                  <label className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all">
                    <Upload className="w-3.5 h-3.5 text-slate-400" />
                    <span>{language === 'am' ? '📁 CSV/Excel ፋይል ምረጥ' : '📁 Upload File'}</span>
                    <input
                      type="file"
                      accept=".csv,.tsv,.txt,.xlsx,.xls"
                      onChange={handleStockExcelFileUpload}
                      className="hidden"
                    />
                  </label>

                  {stockExcelText && (
                    <button
                      type="button"
                      onClick={() => setStockExcelText('')}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-900 text-slate-400 hover:text-white text-xs font-bold"
                    >
                      {language === 'am' ? 'አጽዳ' : 'Clear'}
                    </button>
                  )}
                </div>
              </div>

              {/* Instant Top Action Card if items are parsed */}
              {parsedStockExcelRows.filter((r) => r.matchedItem !== null).length > 0 && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-teal-950/90 to-slate-900 border-2 border-emerald-400/60 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xl animate-fadeIn">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black shrink-0 border border-emerald-500/40">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    </span>
                    <div>
                      <h4 className="text-sm font-black text-emerald-200">
                        {language === 'am'
                          ? `🎯 ${parsedStockExcelRows.filter((r) => r.matchedItem !== null).length} እቃዎች ተዘጋጅተዋል — ወዲያውኑ ይላኩ!`
                          : `🎯 ${parsedStockExcelRows.filter((r) => r.matchedItem !== null).length} Items Ready to Apply!`}
                      </h4>
                      <p className="text-[11px] text-slate-300">
                        {language === 'am'
                          ? '«✓ አረጋግጥና አስገባ» የሚለውን ሲጫኑ ሁሉም ቆጠራዎች ወዲያውኑ ገብተው ራሳቸው ይቀመጣሉ'
                          : 'Click Confirm & Insert to immediately apply all 4 counts and auto-save.'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyStockExcelCounts}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-black text-xs text-slate-950 bg-gradient-to-r from-emerald-300 via-teal-300 to-emerald-400 hover:from-emerald-200 hover:to-teal-200 shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-2 cursor-pointer transition-all border border-emerald-200"
                  >
                    <Check className="w-4 h-4 text-slate-950" />
                    <span>
                      {language === 'am'
                        ? `✓ አረጋግጥና አስገባ (${parsedStockExcelRows.filter((r) => r.matchedItem !== null).length} እቃዎች)`
                        : `✓ Confirm & Insert (${parsedStockExcelRows.filter((r) => r.matchedItem !== null).length} Items)`}
                    </span>
                  </button>
                </div>
              )}

              {/* Format Badge */}
              <div className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 font-mono flex items-center justify-between">
                <span>የአምድ ቅደም ተከተል፦ የዕቃ ስም [Tab] መነሻ ቆጠራ [Tab] የተቀበሉት [Tab] እጃቸው ላይ ያለ [Tab] የተላከ</span>
                <span className="text-teal-400">{stockExcelText.trim().split(/[\r\n]+/).filter(Boolean).length} መስመሮች</span>
              </div>

              {/* Textarea with Drag & Drop */}
              <div className="relative">
                <textarea
                  rows={7}
                  value={stockExcelText}
                  onChange={(e) => setStockExcelText(e.target.value)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleStockFileDrop}
                  placeholder="የበሬ ስጋ	25	15	11	2&#10;ዶሮ ደረት	18	10	7	0&#10;ሽንኩርት	20	15	6	1&#10;ቲማቲም	25	18	8	0&#10;ድንች	35	20	12	3&#10;&#10;💡 (ወይም ከ Excel / Sheets ኮፒ አድርገው እዚህ ሳጥን ውስጥ Ctrl+V ይጫኑ ወይም የ Excel ፋይል እዚህ ይጎትቱ)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-3 text-xs font-mono text-teal-300 placeholder:text-slate-600 focus:outline-none focus:border-teal-400 leading-relaxed"
                />
              </div>

              {/* Live Parsed Preview Table */}
              {parsedStockExcelRows.length > 0 && (
                <div className="space-y-2.5 p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-teal-300">
                      {language === 'am' ? 'የተለዩ እቃዎች ቅድመ-እይታ (Live Matched Preview):' : 'Matched Items Preview:'}
                    </span>
                    <span className="font-mono text-[11px] text-emerald-400">
                      {parsedStockExcelRows.filter((r) => r.matchedItem !== null).length} / {parsedStockExcelRows.length} {language === 'am' ? 'ተለይተዋል' : 'matched'}
                    </span>
                  </div>

                  <div className="max-h-60 overflow-y-auto overflow-x-auto border border-slate-800/80 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-bold text-[11px]">
                          <th className="py-2 px-3">የዕቃ ስም (Item)</th>
                          <th className="py-2 px-2 text-center">ሁኔታ</th>
                          <th className="py-2 px-3 text-right text-amber-300">መነሻ (Beg)</th>
                          <th className="py-2 px-3 text-right text-blue-300">የተቀበሉት (Rec)</th>
                          <th className="py-2 px-3 text-right text-emerald-300">እጃቸው ያለ (End)</th>
                          <th className="py-2 px-3 text-right text-purple-300">የተላከ (Trans)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50 font-mono">
                        {parsedStockExcelRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/50">
                            <td className="py-2 px-3">
                              <span className="font-bold text-white block">
                                {row.matchedItem ? (row.rawItem?.nameAm || row.rawItem?.nameEn) : row.rawName}
                              </span>
                              {row.matchedItem && row.rawName !== (row.rawItem?.nameAm || row.rawItem?.nameEn) && (
                                <span className="text-[10px] text-slate-400">"{row.rawName}"</span>
                              )}
                            </td>
                            <td className="py-2 px-2 text-center">
                              {row.matchedItem ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                  {row.confidence}
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                  አልተገኘም
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right text-amber-300 font-bold">
                              {row.beginning} {row.matchedItem?.countUnitAm || row.matchedItem?.countUnit || ''}
                            </td>
                            <td className="py-2 px-3 text-right text-blue-300 font-bold">
                              {row.received} {row.matchedItem?.countUnitAm || row.matchedItem?.countUnit || ''}
                            </td>
                            <td className="py-2 px-3 text-right text-emerald-300 font-bold">
                              {row.ending} {row.matchedItem?.countUnitAm || row.matchedItem?.countUnit || ''}
                            </td>
                            <td className="py-2 px-3 text-right text-purple-300 font-bold">
                              {row.transfer} {row.matchedItem?.countUnitAm || row.matchedItem?.countUnit || ''}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Apply Button */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={handleApplyStockExcelCounts}
                      disabled={parsedStockExcelRows.filter((r) => r.matchedItem !== null).length === 0}
                      className="px-6 py-2.5 rounded-xl font-black text-xs text-slate-950 bg-gradient-to-r from-teal-400 via-emerald-300 to-teal-400 hover:from-teal-300 hover:to-emerald-200 shadow-lg shadow-teal-950/50 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-40"
                    >
                      <Check className="w-4 h-4" />
                      <span>
                        {language === 'am'
                          ? `✓ ቆጠራዎችን ወደ ሰንጠረዡ አስገባ (${parsedStockExcelRows.filter((r) => r.matchedItem !== null).length} እቃዎች) ✓`
                          : `Apply Counts to Sheet (${parsedStockExcelRows.filter((r) => r.matchedItem !== null).length} items) ✓`}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          CHEF QUICK COUNT SLIP & INSTANT TEXT CONVERTER MODAL (የሼፎች ፈጣን ቆጠራ ፎርም)
          ========================================================================= */}
      {chefSlipModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden text-slate-100 my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-emerald-500/20 bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/30">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-emerald-400">
                    {language === 'am'
                      ? '🧠 የምግብና መጠጥ ዳታ ማመሳሰያ ረዳት (F&B Data Matcher)'
                      : '🧠 F&B Control Data Matcher Assistant'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {currentBranch?.nameAm} • 🇪🇹 {formatEthiopianDate(selectedDate)} ({selectedDate}) • 4 የወረቀት ዓይነቶች
                  </p>
                </div>
              </div>
              <button
                onClick={() => setChefSlipModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex items-center border-b border-slate-800 px-5 pt-3 gap-2 text-xs font-bold">
              <button
                onClick={() => setChefSlipTab('parser')}
                className={`pb-3 px-3 border-b-2 flex items-center gap-2 transition-all ${
                  chefSlipTab === 'parser'
                    ? 'border-emerald-400 text-emerald-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>{language === 'am' ? '⚡ ዳታ ማመሳሰያና ገልባጭ (AI Data Matcher)' : '⚡ AI Data Matcher & Importer'}</span>
              </button>

              <button
                onClick={() => setChefSlipTab('printable')}
                className={`pb-3 px-3 border-b-2 flex items-center gap-2 transition-all ${
                  chefSlipTab === 'printable'
                    ? 'border-emerald-400 text-emerald-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span>{language === 'am' ? '📄 ባለ 1-ገጽ የወረቀት ርክክብ ፎርም (Printable Slip)' : '📄 Printable Slip (A4)'}</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              
              {/* TAB 1: 4-DOCUMENT AI DATA MATCHER & CONVERTER */}
              {chefSlipTab === 'parser' && (
                <div className="space-y-4">
                  {/* DOC_TYPE Selector (4 Document Types) */}
                  <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-slate-200">
                        {language === 'am' ? '1. የወረቀቱን ዓይነት ይምረጡ (Select Document Type)፦' : '1. Select Document Type:'}
                      </span>
                      <span className="text-[11px] font-mono text-emerald-400 font-bold">DOC_TYPE: {fnbDocType}</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setFnbDocType('BEGINNING_BALANCE');
                          setChefPasteTarget('beginning');
                          setAiMatchResult(null);
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          fnbDocType === 'BEGINNING_BALANCE'
                            ? 'bg-amber-500/20 border-amber-500 text-amber-200 font-black shadow-md'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <PackagePlus className="w-4 h-4 text-amber-400 shrink-0" />
                          <span className="text-xs font-bold">የመጀመሪያ ባላንስ</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block truncate">BEGINNING_BALANCE (ስቶር)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setFnbDocType('ENDING_BALANCE');
                          setChefPasteTarget('actual');
                          setAiMatchResult(null);
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          fnbDocType === 'ENDING_BALANCE'
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-200 font-black shadow-md'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="text-xs font-bold">የመዝጊያ ባላንስ</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block truncate">ENDING_BALANCE (ስቶር)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setFnbDocType('CHEF_SOLD_LIST');
                          setAiMatchResult(null);
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          fnbDocType === 'CHEF_SOLD_LIST'
                            ? 'bg-indigo-500/20 border-indigo-500 text-indigo-200 font-black shadow-md'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <UtensilsCrossed className="w-4 h-4 text-indigo-400 shrink-0" />
                          <span className="text-xs font-bold">የሼፍ ሽያጭ ዝርዝር</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block truncate">CHEF_SOLD_LIST (ሜኑ)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setFnbDocType('CASHIER_SALES');
                          setAiMatchResult(null);
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          fnbDocType === 'CASHIER_SALES'
                            ? 'bg-teal-500/20 border-teal-500 text-teal-200 font-black shadow-md'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <Receipt className="w-4 h-4 text-teal-400 shrink-0" />
                          <span className="text-xs font-bold">የካሸር ሽያጭ</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block truncate">CASHIER_SALES (POS)</span>
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded-xl flex items-center gap-2">
                      <Info className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        {fnbDocType === 'BEGINNING_BALANCE' && 'የጠዋት መነሻ ቆጠራ፤ ከጥሬ ዕቃዎች (ITEM_LIST) ጋር በስም፣ በዩኒትና በብዛት ይዛመዳል።'}
                        {fnbDocType === 'ENDING_BALANCE' && 'የማታ/የነገ ጠዋት የመዝጊያ ቆጠራ፤ ከጥሬ ዕቃዎች (ITEM_LIST) ጋር ይዛመዳል።'}
                        {fnbDocType === 'CHEF_SOLD_LIST' && 'የሼፎች የኩሽና የተዘጋጀ ምግብ (KOT)፤ ከሜኑ ምግቦች (MENU_LIST) ጋር ይዛመዳል።'}
                        {fnbDocType === 'CASHIER_SALES' && 'የካሸር (POS) ሽያጭ፤ ዋጋ x ብዛት = ድምር በማረጋገጥ ከሜኑ ምግቦች (MENU_LIST) ጋር ይዛመዳል።'}
                      </span>
                    </div>
                  </div>

                  {/* Textarea & Controls */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                      <label className="font-bold text-slate-300">
                        {language === 'am' ? '2. ከወረቀት የተገለበጠውን ጽሑፍ እዚህ ፔስት ያድርጉ፦' : '2. Paste Paper Text Here:'}
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleLoadSample(fnbDocType)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-bold border border-amber-500/30 flex items-center gap-1 transition-all"
                        >
                          <FileText className="w-3 h-3 text-amber-400" />
                          <span>{language === 'am' ? '📋 ምሳሌ ጽሁፍ አስገባ' : '📋 Load Sample'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleCopyChefTemplate}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 text-[11px] font-bold border border-emerald-500/30 flex items-center gap-1 transition-all"
                        >
                          <Copy className="w-3 h-3 text-emerald-400" />
                          <span>{copiedChefTemplate ? 'ተቀድቷል ✓' : (language === 'am' ? 'ፎርማት ቅዳ' : 'Copy Template')}</span>
                        </button>

                        {chefPasteText && (
                          <button
                            type="button"
                            onClick={() => {
                              setChefPasteText('');
                              setAiMatchResult(null);
                            }}
                            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[11px]"
                          >
                            {language === 'am' ? 'አጽዳ' : 'Clear'}
                          </button>
                        )}
                      </div>
                    </div>

                    <textarea
                      rows={6}
                      value={chefPasteText}
                      onChange={(e) => setChefPasteText(e.target.value)}
                      placeholder={
                        fnbDocType === 'BEGINNING_BALANCE' || fnbDocType === 'ENDING_BALANCE'
                          ? 'የበሬ ስጋ 25 kg\nዶሮ 15\nሽንኩርት 18 kg\nቲማቲም 20\nእንቁላል 120\nዘይት 10'
                          : 'ስፔሻል ጥብስ 14 x 450 = 6300\nኮኮናት በርገር 22 x 350 = 7700\nክለብ ሳንድዊች 12 x 320 = 3840'
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-3 text-xs font-mono text-emerald-300 placeholder:text-slate-600 focus:outline-none focus:border-emerald-400 leading-relaxed"
                    />

                    {/* Match Action Buttons */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-[11px] text-slate-500">
                        {chefPasteText.trim().split(/[\r\n]+/).filter(Boolean).length} {language === 'am' ? 'መስመሮች' : 'lines'}
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => runLocalFallbackMatcher()}
                          disabled={!chefPasteText.trim()}
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                        >
                          <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
                          <span>{language === 'am' ? 'ቀጥታ ፍተሻ' : 'Quick Parse'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleRunAiMatch}
                          disabled={isAiMatching || !chefPasteText.trim()}
                          className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:from-emerald-400 hover:to-teal-300 text-slate-950 text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-950/60 transition-all cursor-pointer disabled:opacity-50"
                        >
                          {isAiMatching ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4" />
                          )}
                          <span>
                            {isAiMatching
                              ? (language === 'am' ? 'እያመሳሰለ ነው...' : 'Matching with AI...')
                              : (language === 'am' ? '🧠 በአይ አመሳስል (Match with AI)' : '🧠 Match with AI')}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Success notification banner */}
                  {applySuccessNotice && (
                    <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{applySuccessNotice}</span>
                    </div>
                  )}

                  {/* AI Match Results View */}
                  {aiMatchResult && (
                    <div className="space-y-3.5 p-4 rounded-2xl bg-slate-950/95 border border-emerald-500/30">
                      {/* Summary Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40">
                          <span className="text-[10px] text-emerald-300 font-bold block">የተመሳሰሉ (Matched)</span>
                          <span className="text-base font-black text-emerald-400 font-mono">
                            {aiMatchResult.matched.length}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/40">
                          <span className="text-[10px] text-amber-300 font-bold block">ማረጋገጫ የሚያስፈልጋቸው</span>
                          <span className="text-base font-black text-amber-400 font-mono">
                            {aiMatchResult.needs_review?.length || 0}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-500/40">
                          <span className="text-[10px] text-blue-300 font-bold block">አዳዲስ ዕቃዎች</span>
                          <span className="text-base font-black text-blue-400 font-mono">
                            {aiMatchResult.new_items?.length || 0}
                          </span>
                        </div>

                        {aiMatchResult.sheet_total && (
                          <div className={`p-2.5 rounded-xl border ${
                            aiMatchResult.sheet_total.matches
                              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                              : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                          }`}>
                            <span className="text-[10px] font-bold block">የወረቀት ድምር (Sheet Total)</span>
                            <span className="text-xs font-black font-mono block">
                              {aiMatchResult.sheet_total.stated
                                ? `${aiMatchResult.sheet_total.stated.toLocaleString()} ETB`
                                : `${aiMatchResult.sheet_total.calculated.toLocaleString()} ETB`}
                            </span>
                            <span className="text-[9px]">
                              {aiMatchResult.sheet_total.matches ? '✅ 100% ይዛመዳል' : `⚠️ ልዩነት፦ ${aiMatchResult.sheet_total.difference} ETB`}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Matched Items Table */}
                      <div className="space-y-2">
                        <span className="font-black text-xs text-emerald-300 block">
                          {language === 'am' ? 'የተመሳሰሉ ዕቃዎች ዝርዝር (Matched Items)፦' : 'Matched Items:'}
                        </span>

                        <div className="max-h-60 overflow-y-auto space-y-1.5 divide-y divide-slate-800/80 pr-1">
                          {aiMatchResult.matched.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between py-1.5 text-xs gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0 ${
                                  item.confidence === 'ከፍተኛ'
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                    : item.confidence === 'መካከለኛ'
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                    : 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                                }`}>
                                  {item.confidence}
                                </span>

                                <div className="truncate">
                                  <strong className="text-white text-xs block truncate">{item.matched_system_name}</strong>
                                  <span className="text-[10px] text-slate-400 font-mono">"{item.name}"</span>
                                </div>

                                {item.converted && (
                                  <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[9px] border border-blue-500/40 shrink-0">
                                    🔄 ዩኒት ተቀይሯል
                                  </span>
                                )}

                                {item.warning && (
                                  <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[9px] border border-rose-500/40 shrink-0">
                                    ⚠️ {item.warning}
                                  </span>
                                )}
                              </div>

                              <div className="text-right shrink-0">
                                <span className="font-mono font-black text-emerald-300 text-xs block">
                                  {item.quantity} {item.unit}
                                </span>
                                {item.line_total !== undefined && item.line_total > 0 && (
                                  <span className="text-[10px] font-mono text-slate-400">
                                    @{item.unit_price} = {item.line_total.toLocaleString()} ETB
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Needs Review Section */}
                      {aiMatchResult.needs_review && aiMatchResult.needs_review.length > 0 && (
                        <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-1.5">
                          <span className="font-black text-amber-300 text-xs block">
                            ⚠️ ማረጋገጫ የሚያስፈልጋቸው መስመሮች ({aiMatchResult.needs_review.length})፦
                          </span>
                          <div className="space-y-1">
                            {aiMatchResult.needs_review.map((nr, idx) => (
                              <div key={idx} className="text-[11px] text-slate-300 flex items-start gap-2">
                                <span className="text-amber-400">•</span>
                                <div>
                                  <span className="font-mono text-amber-200">"{nr.raw_text}"</span>
                                  <span className="text-slate-400 ml-1.5">— {nr.reason}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* New Items Section */}
                      {aiMatchResult.new_items && aiMatchResult.new_items.length > 0 && (
                        <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-500/30 space-y-1.5">
                          <span className="font-black text-blue-300 text-xs block">
                            ➕ በሲስተሙ ውስጥ የሌሉ አዳዲስ ዕቃዎች ({aiMatchResult.new_items.length})፦
                          </span>
                          <div className="space-y-1">
                            {aiMatchResult.new_items.map((ni, idx) => (
                              <div key={idx} className="text-[11px] text-slate-300 flex items-center justify-between">
                                <span className="font-mono text-blue-200">{ni.raw_name}</span>
                                <span className="text-slate-400 font-mono">{ni.quantity} {ni.unit}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Apply Action Button */}
                      <div className="pt-3 border-t border-slate-800 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={handleApplyMatchedData}
                          disabled={aiMatchResult.matched.length === 0}
                          className="px-6 py-2.5 rounded-xl font-black text-xs text-slate-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 hover:from-emerald-300 hover:to-teal-200 shadow-lg shadow-emerald-950/50 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-40"
                        >
                          <Check className="w-4 h-4" />
                          <span>
                            {language === 'am'
                              ? `ዳታውን ወደ ሲስተም ገልብጥ (${aiMatchResult.matched.length} እቃዎች) ✓`
                              : `Apply Matched Data to System (${aiMatchResult.matched.length} items) ✓`}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: PRINTABLE 1-PAGE CHEF HANDOVER SLIP */}
              {chefSlipTab === 'printable' && (
                <div className="space-y-4">
                  {/* Print Action Bar */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <span className="text-xs text-slate-400">
                      {language === 'am' ? 'ይህንን ባለ 1-ገጽ ፎርም አትመው ለዋና ሼፉ ይሰጡታል፦' : 'Print this 1-page form for kitchen chefs:'}
                    </span>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-4 py-2 bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                    >
                      <Printer className="w-4 h-4 text-slate-950" />
                      <span>{language === 'am' ? '🖨️ ፎርሙን አትም (Print Slip)' : '🖨️ Print Slip'}</span>
                    </button>
                  </div>

                  {/* Printable Sheet View */}
                  <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4 font-sans text-white">
                    {/* Header */}
                    <div className="text-center space-y-1 border-b border-slate-800 pb-3">
                      <div className="text-xs font-black text-amber-400 uppercase tracking-widest">
                        BELLO FAM RESTAURANT GROUP • የቤሎ ፋም ሬስቶራንት ግሩፕ
                      </div>
                      <h3 className="text-base font-black text-white">
                        የሼፎች የዕለታዊ ርክክብና የጥሬ ዕቃዎች ቆጠራ ፎርም (Chef Daily Handover Sheet)
                      </h3>
                      <div className="flex items-center justify-center gap-4 text-xs text-slate-300 font-mono pt-1">
                        <span><strong>ቅርንጫፍ፦</strong> {currentBranch?.nameAm}</span>
                        <span>•</span>
                        <span><strong>ቀን፦</strong> 🇪🇹 {formatEthiopianDate(selectedDate)}</span>
                        <span>•</span>
                        <span><strong>ስራ አስኪያጅ፦</strong> ሳልሳዊ ስዩም</span>
                      </div>
                    </div>

                    {/* Compact Table */}
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-700 bg-slate-900 text-slate-300 font-bold">
                          <th className="py-2 px-2 text-center w-8">#</th>
                          <th className="py-2 px-3">{language === 'am' ? 'የጥሬ ዕቃ ስም' : 'Item'}</th>
                          <th className="py-2 px-2 text-center">{language === 'am' ? 'መለኪያ' : 'Unit'}</th>
                          <th className="py-2 px-3 text-right">{language === 'am' ? 'መነሻ ቆጠራ' : 'Beg'}</th>
                          <th className="py-2 px-3 text-right">{language === 'am' ? 'የቀኑ ገቢ' : 'Rec'}</th>
                          <th className="py-2 px-3 text-right text-emerald-300 font-bold">{language === 'am' ? 'የነገ ጠዋት ቆጠራ' : 'Actual'}</th>
                          <th className="py-2 px-3 text-right text-rose-300">{language === 'am' ? 'ብልሽት' : 'Wastage'}</th>
                          <th className="py-2 px-4 text-center">{language === 'am' ? 'የሼፍ ፊርማ' : 'Signature'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-[11px]">
                        {trackedItemsList.map((ti, idx) => {
                          const it = items.find((i) => i.id === ti.itemId);
                          return (
                            <tr key={ti.id} className="hover:bg-slate-900/40">
                              <td className="py-1.5 px-2 text-center text-slate-500 font-mono">{idx + 1}</td>
                              <td className="py-1.5 px-3 font-semibold text-slate-200">{it?.nameAm || it?.nameEn || ti.itemId}</td>
                              <td className="py-1.5 px-2 text-center text-slate-400 font-mono">{ti.countUnitAm || ti.countUnit}</td>
                              <td className="py-1.5 px-3 text-right font-mono text-slate-300">{beginningCounts[ti.itemId] || '_____'}</td>
                              <td className="py-1.5 px-3 text-right font-mono text-slate-300">{receivedCounts[ti.itemId] || '_____'}</td>
                              <td className="py-1.5 px-3 text-right font-mono font-bold text-emerald-400">{actualEndingCounts[ti.itemId] || '_____'}</td>
                              <td className="py-1.5 px-3 text-right font-mono text-rose-300">{damageCounts[ti.itemId] || '_____'}</td>
                              <td className="py-1.5 px-4 text-center text-slate-500 font-mono">___________</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Signature Block */}
                    <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-800 text-xs">
                      <div className="space-y-2 text-center">
                        <span className="text-slate-400 block font-bold">1. የዋና ሼፍ ርክክብ</span>
                        <div className="border-b border-dashed border-slate-600 h-6"></div>
                        <span className="text-[10px] text-slate-500">ስም / ፊርማ / ቀን</span>
                      </div>
                      <div className="space-y-2 text-center">
                        <span className="text-slate-400 block font-bold">2. የስቶር ኪፐር ማረጋገጫ</span>
                        <div className="border-b border-dashed border-slate-600 h-6"></div>
                        <span className="text-[10px] text-slate-500">ስም / ፊርማ / ቀን</span>
                      </div>
                      <div className="space-y-2 text-center">
                        <span className="text-slate-400 block font-bold">3. የብራንች ስራ አስኪያጅ</span>
                        <div className="border-b border-dashed border-slate-600 h-6 font-bold text-amber-300 flex items-center justify-center text-[11px]">
                          ሳልሳዊ ስዩም (Salsawi Seyoum)
                        </div>
                        <span className="text-[10px] text-slate-500">ይፋዊ ማጽደቂያ ፊርማ</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Requirement 2: Side-by-Side Smart Paste Modal (Kitchen KOT & Cashier POS Sales) */}
      <MenuSalesSmartPasteModal
        isOpen={isMenuSmartPasteOpen}
        onClose={() => setIsMenuSmartPasteOpen(false)}
        recipes={branchRecipes}
        branchName={currentBranch?.nameAm || ''}
        selectedDate={selectedDate}
        currentChefSales={chefMenuSales}
        currentCashierSales={cashierMenuSales}
        onApplySales={handleApplyMenuSales}
        language={language}
      />

      {/* Requirement 1: Single Primary Material Soft Removal Modal */}
      {itemToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border-2 border-rose-500/50 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-rose-500/20 pb-3">
              <div className="p-2.5 rounded-2xl bg-rose-500/20 text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-sm text-white">
                  {language === 'am' ? 'ፕራይመሪ ዕቃን ከቆጠራ ማስወገድ' : 'Remove Primary Material'}
                </h3>
                <span className="text-xs text-rose-300 font-bold">
                  {itemToRemove.name} ({currentBranch?.nameAm || ''})
                </span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
              <p>
                {language === 'am'
                  ? `ይህ እቃ ከቀን ${selectedDate} ጀምሮ ከዚህ ቅርንጫፍ ቆጠራ ዝርዝር ይወገዳል።`
                  : `This item will be removed from this branch tracking from ${selectedDate} onward.`}
              </p>
              <p className="text-amber-300 text-[11px]">
                {language === 'am'
                  ? '✓ የቀደመው ታሪክና በሴንትራል ስቶር ያለው ዋና እቃ ሳይነካ ይቀመጣል። ወደፊትም በማንኛውም ጊዜ መልሰው ማካተት ይችላሉ።'
                  : '✓ Historical records and Central Store item remain intact. You can add it back anytime.'}
              </p>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 font-bold block mb-1">
                {language === 'am' ? 'የማስወገጃ ምክንያት (አማራጭ)፦' : 'Removal Reason (Optional):'}
              </label>
              <input
                type="text"
                value={removalReason}
                onChange={(e) => setRemovalReason(e.target.value)}
                placeholder={language === 'am' ? 'ለምሳሌ፡ የሜኑ ለውጥ፣ ከአቅርቦት ውጪ...' : 'e.g. Menu change, not in use...'}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-400"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setItemToRemove(null);
                  setRemovalReason('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800"
              >
                {language === 'am' ? 'ሰርዝ' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmSingleRemove}
                className="px-4 py-2 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-500 shadow-md transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{language === 'am' ? 'አረጋግጥና አስወግድ' : 'Confirm Remove'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Requirement 1: Bulk Remove Selected Confirmation Modal */}
      {showBulkRemoveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border-2 border-rose-500/50 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-rose-500/20 pb-3">
              <div className="p-2.5 rounded-2xl bg-rose-500/20 text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-sm text-white">
                  {language === 'am' ? 'የተመረጡትን ዕቃዎች በጅምላ ማስወገድ' : 'Bulk Remove Selected Items'}
                </h3>
                <span className="text-xs text-rose-300 font-bold">
                  {selectedTrackedItemIds.length} {language === 'am' ? 'የተመረጡ እቃዎች' : 'selected items'} ({currentBranch?.nameAm || ''})
                </span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
              <p>
                {language === 'am'
                  ? `እነዚህ ${selectedTrackedItemIds.length} እቃዎች ከቀን ${selectedDate} ጀምሮ ከዚህ ቅርንጫፍ ቆጠራ ዝርዝር ይወገዳሉ።`
                  : `These ${selectedTrackedItemIds.length} items will be removed from this branch tracking from ${selectedDate} onward.`}
              </p>
              <p className="text-amber-300 text-[11px]">
                {language === 'am'
                  ? '✓ ያለፈው ታሪክ እና በሴንትራል ስቶር ያለው ዳታ ሳይነካ ይቀመጣል። ወደፊትም በማንኛውም ጊዜ መልሰው ማካተት ይችላሉ።'
                  : '✓ Historical data and Central Store items remain intact. You can add them back anytime.'}
              </p>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 font-bold block mb-1">
                {language === 'am' ? 'የማስወገጃ ምክንያት (አማራጭ)፦' : 'Removal Reason (Optional):'}
              </label>
              <input
                type="text"
                value={removalReason}
                onChange={(e) => setRemovalReason(e.target.value)}
                placeholder={language === 'am' ? 'ለምሳሌ፡ የክለሳ ስራ፣ የሜኑ ለውጥ...' : 'e.g. Audit revision, seasonal menu...'}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-400"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowBulkRemoveConfirm(false);
                  setRemovalReason('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800"
              >
                {language === 'am' ? 'ሰርዝ' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkRemove}
                className="px-4 py-2 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-500 shadow-md transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{language === 'am' ? 'አረጋግጥና አስወግድ' : 'Confirm Bulk Remove'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

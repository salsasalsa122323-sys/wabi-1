import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  InventoryItem,
  Branch,
  CentralBinCardEntry,
  BranchLedgerEntry,
  Recipe,
  ProductionSchedule,
  ReconciliationSession,
  IngredientReconciliationDetail,
  BranchDailyClosing,
  BranchTransactionType,
  StaffMealRecipe,
  StaffMember,
  StaffWeeklySchedule,
  StaffMealExecution,
  KitchenPrepItem,
  KitchenPrepBatch,
  KitchenPrepReconciliationDetail,
  CutOverState,
  DepartmentOpeningStock,
  DepartmentCutOverStatus,
  StandardizedDepartmentForm,
  AutomatedReconciliationReport,
  TransferMismatch,
  ItemReconciliationResult,
  ExcelUploadedBatch,
  LearnedAlias,
  FullReconciliationReport,
  CentralStoreResetAudit,
  CentralSentToEntry,
  BranchTrackedItem,
  BranchDailyItemData,
  BranchDailyModuleRecord,
  BranchInterTransfer,
  AuditCorrectionRecord,
  BranchDailyControllerSheet,
  Hotel,
  ExpenseRecord,
  ExpenseCategory,
  PaymentMethod,
  ExpenseMonthlySummary,
} from '../types';
import { saveDailyEndingInventory, getPreviousDayEndingInventory } from '../utils/inventoryCarryover';
import { runDeterministicReconciliationChain } from '../utils/reconciliationChain';
import { exportReconciliationToExcel } from '../utils/excelExporter';
import {
  INITIAL_ITEMS,
  INITIAL_BRANCHES,
  INITIAL_CENTRAL_BIN_CARD,
  INITIAL_BRANCH_LEDGERS,
  INITIAL_RECIPES,
  INITIAL_SCHEDULES,
  SAMPLE_ITEMS,
  SAMPLE_BRANCHES,
  SAMPLE_RECIPES,
  DEFAULT_ZERO_BALANCE_ITEMS,
  DEFAULT_BRANCHES,
  DEFAULT_ZERO_BALANCE_RECIPES,
} from '../data/initialData';
import { INITIAL_PREP_ITEMS } from '../data/initialPrepItems';
import { formatEthiopianDate, getTodayDateString } from '../utils/ethiopianDate';
import {
  saveToPersistentDB,
  getFromPersistentDB,
  downloadDatabaseBackup,
  readDatabaseBackupFile,
  saveBackupSnapshot,
  getAllBackupSnapshots,
  deleteBackupSnapshot,
  BackupSnapshot,
  generateSyncCode,
  parseSyncCode,
  safeLocalStorageSet,
  cleanStaleLocalStorage,
  clearAllPersistentDB,
  clearLocalBusinessStorageKeys,
} from '../utils/persistentStorage';

export interface StockInPayload {
  itemId: string;
  quantity: number;
  unitPrice: number;
  date: string;
  supplier: string;
  grnNumber: string;
  notes?: string;
  recordedBy?: string;
}

export interface TransferPayload {
  itemId: string;
  branchId: string;
  quantity: number;
  date: string;
  sivNumber: string;
  notes?: string;
  recordedBy?: string;
}

export interface BranchUsagePayload {
  branchId: string;
  itemId: string;
  quantity: number;
  date: string;
  type: BranchTransactionType;
  reasonOrMenu: string;
  refNo: string;
  recordedBy?: string;
}

export interface BranchThreeWayUsagePayload {
  branchId: string;
  date: string; // YYYY-MM-DD
  type: 'CASH_SALE' | 'MANAGEMENT_USE' | 'STAFF_MEAL' | 'WASTE_DAMAGE' | 'KITCHEN_USAGE';
  mode: 'recipe' | 'item';
  recipeId?: string;
  portions?: number;
  itemId?: string;
  quantity?: number;
  sellingPrice?: number;
  totalCashRevenue?: number;
  beneficiaryOrGuest?: string; // ማኔጅመንት ስም/እንግዳ ወይም የሰራተኞች ሽፍት
  reasonOrNotes?: string;
  refNo?: string;
  recordedBy?: string;
}

interface AppContextType {
  items: InventoryItem[];
  branches: Branch[];
  centralBinCards: CentralBinCardEntry[];
  branchLedgers: BranchLedgerEntry[];
  recipes: Recipe[];
  schedules: ProductionSchedule[];
  reconciliations: ReconciliationSession[];
  branchDailyClosings: BranchDailyClosing[];
  staffMealRecipes: StaffMealRecipe[];
  staffMembers: StaffMember[];
  staffWeeklySchedules: StaffWeeklySchedule[];
  staffMealExecutions: StaffMealExecution[];
  kitchenPrepItems: KitchenPrepItem[];
  kitchenPrepBatches: KitchenPrepBatch[];
  
  // Actions
  recordStockIn: (payload: StockInPayload) => boolean;
  transferToBranch: (payload: TransferPayload) => { success: boolean; error?: string };
  recordBranchUsage: (payload: BranchUsagePayload) => { success: boolean; error?: string };
  recordBranchThreeWayUsage: (payload: BranchThreeWayUsagePayload) => { success: boolean; error?: string };
  setBeginningStock: (branchId: string, itemId: string, quantity: number, date?: string, unitCost?: number) => boolean;
  closeBranchDailyAccount: (closing: BranchDailyClosing) => boolean;
  deleteBranchDailyClosing: (closingId: string) => void;
  saveRecipe: (recipe: Recipe) => void;
  deleteRecipe: (id: string, scope?: 'thisBranch' | 'allBranches') => void;
  duplicateRecipeToBranch: (sourceRecipeId: string, targetBranchId: string, customPrice?: number) => Recipe | null;
  saveSchedule: (schedule: ProductionSchedule) => void;
  deleteSchedule: (id: string) => void;
  // Kitchen Prep (Sub-Recipe) actions
  saveKitchenPrepItem: (item: KitchenPrepItem) => void;
  deleteKitchenPrepItem: (id: string) => void;
  recordKitchenPrepProduction: (payload: {
    branchId: string;
    prepItemId: string;
    quantityProduced: number;
    date?: string;
    notes?: string;
  }) => { success: boolean; error?: string; batch?: KitchenPrepBatch };
  deleteKitchenPrepBatch: (id: string) => void;
  // Staff Meal actions
  saveStaffMealRecipe: (recipe: StaffMealRecipe) => void;
  deleteStaffMealRecipe: (id: string) => void;
  saveStaffMember: (member: StaffMember) => void;
  deleteStaffMember: (id: string) => void;
  saveStaffWeeklySchedule: (schedule: StaffWeeklySchedule) => void;
  executeStaffMealAndDeduct: (execution: StaffMealExecution) => { success: boolean; error?: string };
  deleteStaffMealExecution: (id: string) => void;
  addNewBranch: (branch: Branch) => void;
  deleteBranch: (id: string) => void;
  createDefaultThreeBranches: () => void;
  addNewItem: (item: InventoryItem) => void;
  bulkMergeItems: (newItems: InventoryItem[]) => void;
  deleteItem: (id: string) => void;
  calculateSmartReconciliation: (
    branchId: string,
    date: string,
    dishesSold: { recipeId: string; quantitySold: number }[],
    physicalUsageMap: Record<string, number>,
    notes?: string,
    chefDishesProduced?: { recipeId: string; quantityProduced: number }[],
    managementDishes?: { recipeId: string; quantityConsumed: number }[],
    beginningStockMap?: Record<string, number>,
    endingStockMap?: Record<string, number>,
    transfersInMap?: Record<string, number>,
    prepEndingFridgeStockMap?: Record<string, number>
  ) => ReconciliationSession;
  commitReconciliationToLedger: (reconciliationId: string) => boolean;
  getBranchStockBalance: (branchId: string, itemId: string) => number;
  clearAllDataCompletely: () => void;
  loadSampleTemplate: () => void;
  exportFullBackup: () => void;
  restoreBackupFromFile: (file: File) => Promise<boolean>;
  createManualSnapshot: (label: string) => Promise<BackupSnapshot | null>;
  loadAllSnapshots: () => Promise<BackupSnapshot[]>;
  restoreSnapshotById: (snapshot: BackupSnapshot) => Promise<boolean>;
  deleteSnapshotById: (id: string) => Promise<boolean>;
  getSyncCode: () => string;
  applySyncCode: (code: string) => Promise<boolean>;

  // Fresh Start (Cut-Over)
  cutOverState: CutOverState;
  activateCutOver: (managerName: string, cutOverDate: string) => void;
  saveDepartmentOpeningCount: (
    departmentId: string,
    counts: Array<{ itemId: string; count: number }>,
    managerName: string
  ) => boolean;
  confirmDepartmentCutOver: (departmentId: string, managerName: string) => boolean;

  // Department Forms
  departmentForms: StandardizedDepartmentForm[];
  submitDepartmentForm: (
    form: Omit<StandardizedDepartmentForm, 'id' | 'submittedAt' | 'status' | 'validationErrors'>
  ) => { success: boolean; errors?: string[] };

  // Automated Cross-Matching
  automatedReports: AutomatedReconciliationReport[];
  runAutomatedCrossMatching: (branchId: string, date: string) => AutomatedReconciliationReport;
  approveReconciliationReport: (reportId: string, managerNotes?: string) => void;

  // Cocoon Shola to 6 Kilo Menu Copying
  copyCocoonSholaToSixKilo: () => {
    success: boolean;
    copiedCount: number;
    skippedCount: number;
    conflicts: string[];
    message: string;
  };

  // Excel File Ingestion & 4-Stage Reconciliation
  uploadedBatches: ExcelUploadedBatch[];
  learnedAliases: LearnedAlias[];
  fullReconciliationReports: FullReconciliationReport[];
  addUploadedBatch: (batch: ExcelUploadedBatch) => void;
  deleteUploadedBatch: (batchId: string) => void;
  saveLearnedAlias: (rawExcelName: string, targetItemId: string, targetItemName: string) => void;
  runFullReconciliation: (branchId: string, period: string) => Promise<FullReconciliationReport>;
  approveFullReconciliationReport: (reportId: string, managerNotes?: string) => void;
  exportReportToExcel: (report: FullReconciliationReport) => void;

  // Change 1: Reset Central Store Stock to Zero
  centralStoreResets: CentralStoreResetAudit[];
  resetCentralStoreStockToZero: (user?: string, notes?: string) => Promise<CentralStoreResetAudit>;

  // Change 2: Central Store Sent-To Ledger
  centralSentToEntries: CentralSentToEntry[];

  // Change 3 & 4: Branch Tracked Items & Independent Daily Module
  branchTrackedItems: BranchTrackedItem[];
  saveBranchTrackedItem: (item: BranchTrackedItem) => void;
  removeBranchTrackedItem: (branchId: string, itemId: string, targetDate?: string, reason?: string) => void;
  getTrackedItemsForBranch: (branchId: string, targetDate?: string) => BranchTrackedItem[];
  cloneTrackedItemsFromBranch: (sourceBranchId: string, targetBranchId: string) => { success: boolean; count: number };
  syncTrackedItemsAcrossBranches: (targetBranchIds?: string[]) => { success: boolean; count: number };
  logAuditTrail: (entry: { action: string; details: string; branchId?: string; userId?: string }) => void;

  branchDailyModules: BranchDailyModuleRecord[];
  saveBranchDailyModule: (record: BranchDailyModuleRecord) => void;
  getBeginningStockForBranchItem: (branchId: string, itemId: string, targetDate: string) => number;

  // Change 3.1(g) & T6: Inter-branch transfers
  branchInterTransfers: BranchInterTransfer[];
  recordInterBranchTransfer: (transfer: Omit<BranchInterTransfer, 'id' | 'ethiopianDateStr' | 'status'>) => { success: boolean; error?: string };
  acceptInterBranchTransfer: (transferId: string, receivedBy?: string) => { success: boolean };

  // Audit corrections
  auditCorrections: AuditCorrectionRecord[];
  saveAuditCorrection: (correction: Omit<AuditCorrectionRecord, 'id' | 'timestamp'>) => void;

  // Primary items selection for daily counts & reconciliations
  selectedPrimaryItemIds: string[];
  togglePrimaryItem: (itemId: string) => void;
  selectAllPrimaryItems: () => void;
  selectDefaultPrimaryItems: () => void;

  // Controller daily sheets
  branchDailySheets: BranchDailyControllerSheet[];
  saveBranchDailyControllerSheet: (sheet: BranchDailyControllerSheet) => { success: boolean; sheet?: BranchDailyControllerSheet };
  deleteBranchDailyControllerSheet: (sheetId: string) => void;

  // Catalog zero initial balances
  populateCatalogWithZeroBalances: (managerName?: string) => void;

  // Restore original complete 3-branch baseline data
  restoreOriginalBaselineData: () => void;

  // Multi-Hotel System
  hotels: Hotel[];
  currentHotelId: string;
  currentHotel: Hotel;
  setCurrentHotelId: (hotelId: string) => void;
  addHotel: (hotel: Omit<Hotel, 'id' | 'createdAt' | 'isArchived'>) => Hotel;
  updateHotel: (id: string, updates: Partial<Hotel>) => void;
  archiveHotel: (id: string) => void;

  // Expenses Management & 15% VAT
  expenses: ExpenseRecord[];
  recordExpense: (expense: Omit<ExpenseRecord, 'id' | 'createdAt' | 'amountBeforeVat' | 'vatAmount' | 'totalAmount'>) => ExpenseRecord;
  updateExpense: (id: string, updates: Partial<ExpenseRecord>, reason?: string) => boolean;
  deleteExpense: (id: string, reason?: string) => boolean;
  getMonthlyExpenseSummary: (hotelId: string, branchId?: string, periodMonth?: string) => ExpenseMonthlySummary;

  // Primary Material Bulk Remove
  bulkRemoveBranchTrackedItems: (branchId: string, itemIds: string[], targetDate?: string, reason?: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Storage key with v4 clean scratch prefix to guarantee completely empty initial state as requested
const STORAGE_PREFIX = 'eth_erp_v4_scratch_';

function safeStorageParse<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (!saved || saved === 'undefined' || saved === 'null') return fallback;
    const parsed = JSON.parse(saved);
    if (Array.isArray(fallback)) {
      return (Array.isArray(parsed) ? parsed.filter((x) => x !== null && x !== undefined) : fallback) as T;
    }
    if (fallback && typeof fallback === 'object') {
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return fallback;
      return parsed as T;
    }
    return parsed;
  } catch (err) {
    console.warn(`Failed to parse storage item ${key}:`, err);
    return fallback;
  }
}

/**
 * Robust cascade storage parser that scans active and historical storage keys
 * Prevents user data loss across version upgrades, phone/laptop sessions, and prefix changes.
 */
function safeStorageParseCascade<T>(suffix: string, fallback: T): T {
  const prefixes = [
    STORAGE_PREFIX,
    'eth_erp_v3_',
    'eth_erp_v2_',
    'eth_erp_v1_',
    'eth_erp_',
    'bello_fam_',
    '',
  ];
  for (const prefix of prefixes) {
    const key = `${prefix}${suffix}`;
    try {
      const saved = localStorage.getItem(key);
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        if (Array.isArray(fallback)) {
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter((x) => x !== null && x !== undefined);
            if (cleaned.length > 0) return cleaned as T;
          }
        } else if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Object.keys(parsed).length > 0) {
          return parsed as T;
        }
      }
    } catch {
      // ignore
    }
  }
  return fallback;
}

function sanitizeItems(raw: any): InventoryItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((it) => it && typeof it === 'object' && typeof it.id === 'string')
    .map((it) => ({
      ...it,
      code: typeof it.code === 'string' ? it.code : it.id,
      nameAm: typeof it.nameAm === 'string' ? it.nameAm : String(it.nameEn || it.id || ''),
      nameEn: typeof it.nameEn === 'string' ? it.nameEn : String(it.nameAm || it.id || ''),
      unit: typeof it.unit === 'string' ? it.unit : 'kg',
      unitAm: typeof it.unitAm === 'string' ? it.unitAm : String(it.unit || 'ኪ.ግ'),
    }));
}

function sanitizeBranches(raw: any): Branch[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((b) => b && typeof b === 'object' && typeof b.id === 'string')
    .map((b) => ({
      ...b,
      code: typeof b.code === 'string' ? b.code : b.id,
      nameAm: typeof b.nameAm === 'string' ? b.nameAm : String(b.nameEn || b.id || ''),
      nameEn: typeof b.nameEn === 'string' ? b.nameEn : String(b.nameAm || b.id || ''),
    }));
}

function sanitizeRecipes(raw: any): Recipe[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r) => r && typeof r === 'object' && typeof r.id === 'string')
    .map((r) => ({
      ...r,
      nameAm: typeof r.nameAm === 'string' ? r.nameAm : String(r.nameEn || r.id || ''),
      nameEn: typeof r.nameEn === 'string' ? r.nameEn : String(r.nameAm || r.id || ''),
      category: typeof r.category === 'string' ? r.category : 'Kitchen',
      sellingPrice: typeof r.sellingPrice === 'number' && !isNaN(r.sellingPrice) ? r.sellingPrice : 0,
      ingredients: Array.isArray(r.ingredients)
        ? r.ingredients.filter((ing: any) => ing && typeof ing === 'object' && typeof ing.itemId === 'string')
        : [],
    }));
}

function sanitizeDailyModules(raw: any): BranchDailyModuleRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m) => m && typeof m === 'object' && typeof m.branchId === 'string' && typeof m.date === 'string')
    .map((m) => ({
      ...m,
      items: m.items && typeof m.items === 'object' && !Array.isArray(m.items) ? m.items : {},
    }));
}

function sanitizeExpenses(raw: any): ExpenseRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((e) => e && typeof e === 'object')
    .map((e) => ({
      ...e,
      date: typeof e.date === 'string' ? e.date : '',
      totalAmount: typeof e.totalAmount === 'number' ? e.totalAmount : Number(e.totalAmount) || 0,
      amountBeforeVat: typeof e.amountBeforeVat === 'number' ? e.amountBeforeVat : Number(e.amountBeforeVat) || 0,
      vatAmount: typeof e.vatAmount === 'number' ? e.vatAmount : Number(e.vatAmount) || 0,
    }));
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Run cleanup and asynchronously hydrate from IndexedDB on startup
  useEffect(() => {
    cleanStaleLocalStorage();

    let isMounted = true;
    const hydrateFromIndexedDB = async () => {
      try {
        const [
          dbItems,
          dbBranches,
          dbBinCards,
          dbBranchLedgers,
          dbRecipes,
          dbSchedules,
          dbReconciliations,
          dbClosings,
          dbStaffRecipes,
          dbStaffMembers,
          dbStaffSchedules,
          dbStaffExecutions,
          dbKitchenPrepItems,
          dbKitchenPrepBatches,
          dbTrackedItems,
          dbDailyModules,
        ] = await Promise.all([
          getFromPersistentDB<InventoryItem[]>('items'),
          getFromPersistentDB<Branch[]>('branches'),
          getFromPersistentDB<CentralBinCardEntry[]>('centralBinCards'),
          getFromPersistentDB<BranchLedgerEntry[]>('branchLedgers'),
          getFromPersistentDB<Recipe[]>('recipes'),
          getFromPersistentDB<ProductionSchedule[]>('schedules'),
          getFromPersistentDB<ReconciliationSession[]>('reconciliations'),
          getFromPersistentDB<BranchDailyClosing[]>('branchDailyClosings'),
          getFromPersistentDB<StaffMealRecipe[]>('staffMealRecipes'),
          getFromPersistentDB<StaffMember[]>('staffMembers'),
          getFromPersistentDB<StaffWeeklySchedule[]>('staffWeeklySchedules'),
          getFromPersistentDB<StaffMealExecution[]>('staffMealExecutions'),
          getFromPersistentDB<KitchenPrepItem[]>('kitchenPrepItems'),
          getFromPersistentDB<KitchenPrepBatch[]>('kitchenPrepBatches'),
          getFromPersistentDB<BranchTrackedItem[]>('branchTrackedItems'),
          getFromPersistentDB<BranchDailyModuleRecord[]>('branchDailyModules'),
        ]);

        if (!isMounted) return;

        // If IndexedDB has records, hydrate React state smoothly with non-destructive shape checks
        const safeDbItems = sanitizeItems(dbItems);
        if (safeDbItems.length > 0) setItems(safeDbItems);
        const safeDbBranches = sanitizeBranches(dbBranches);
        if (safeDbBranches.length > 0) setBranches(safeDbBranches);
        if (Array.isArray(dbBinCards) && dbBinCards.length > 0) setCentralBinCards(dbBinCards.filter(Boolean));
        if (Array.isArray(dbBranchLedgers) && dbBranchLedgers.length > 0) setBranchLedgers(dbBranchLedgers.filter(Boolean));
        const safeDbRecipes = sanitizeRecipes(dbRecipes);
        if (safeDbRecipes.length > 0) setRecipes(safeDbRecipes);
        if (Array.isArray(dbSchedules) && dbSchedules.length > 0) setSchedules(dbSchedules.filter(Boolean));
        if (Array.isArray(dbReconciliations) && dbReconciliations.length > 0) setReconciliations(dbReconciliations.filter(Boolean));
        if (Array.isArray(dbClosings) && dbClosings.length > 0) setBranchDailyClosings(dbClosings.filter(Boolean));
        if (Array.isArray(dbStaffRecipes) && dbStaffRecipes.length > 0) setStaffMealRecipes(dbStaffRecipes.filter(Boolean));
        if (Array.isArray(dbStaffMembers) && dbStaffMembers.length > 0) setStaffMembers(dbStaffMembers.filter(Boolean));
        if (Array.isArray(dbStaffSchedules) && dbStaffSchedules.length > 0) setStaffWeeklySchedules(dbStaffSchedules.filter(Boolean));
        if (Array.isArray(dbStaffExecutions) && dbStaffExecutions.length > 0) setStaffMealExecutions(dbStaffExecutions.filter(Boolean));
        if (Array.isArray(dbTrackedItems) && dbTrackedItems.length > 0) setBranchTrackedItems(dbTrackedItems.filter(Boolean));
        const safeDbDailyModules = sanitizeDailyModules(dbDailyModules);
        if (safeDbDailyModules.length > 0) setBranchDailyModules(safeDbDailyModules);
        if (Array.isArray(dbKitchenPrepItems)) {
          const defaultSampleIds = new Set([
            'prep-mayo', 'prep-bolognese', 'prep-pesto', 'prep-zafferano',
            'prep-tomato', 'prep-burger-patty', 'prep-pizza-meat', 'prep-dressing'
          ]);
          const userOnly = dbKitchenPrepItems.filter((item) => item && !defaultSampleIds.has(item.id));
          setKitchenPrepItems(userOnly);
        }
        if (Array.isArray(dbKitchenPrepBatches) && dbKitchenPrepBatches.length > 0) setKitchenPrepBatches(dbKitchenPrepBatches.filter(Boolean));
      } catch (err) {
        console.warn('Hydration from IndexedDB error:', err);
      }
    };

    hydrateFromIndexedDB();
    return () => {
      isMounted = false;
    };
  }, []);

  const DEFAULT_BELLO_FAM_BRANCHES: Branch[] = [
    {
      id: 'br-frasco-bello',
      code: 'BR-BEL-01',
      nameAm: 'ፍራስኮ ቤሎ',
      nameEn: 'Frasco Bello',
      location: 'ቤሎ አደባባይ',
      manager: 'አቶ ብሩክ ወንድሙ (General Manager)',
      phone: '+251 911 555 777',
    },
    {
      id: 'br-kokonut-6kilo',
      code: 'BR-KOK-02',
      nameAm: 'ኮኮናት 6 ኪሎ',
      nameEn: 'Cocoon 6 Kilo',
      location: '6 ኪሎ አደባባይ አጠገብ',
      manager: 'ሳልሳዊ ስዩም (Branch Manager)',
      phone: '+251 911 111 222',
    },
    {
      id: 'br-cocoon-shola',
      code: 'BR-SHO-03',
      nameAm: 'ኮኮናት ሾላ',
      nameEn: 'Cocoon Shola',
      location: 'ሾላ ገበያ አጠገብ',
      manager: 'ሰለሞን አስራት (Ops Manager)',
      phone: '+251 911 333 444',
    },
    {
      id: 'br-pasta-factory',
      code: 'BR-PAS-04',
      nameAm: 'ፓስታ ፋብሪካ',
      nameEn: 'Pasta Factory',
      location: 'ቤሎ ማምረቻ ማዕከል',
      manager: 'አቶ ቴዎድሮስ አለሙ (Production Head)',
      phone: '+251 911 888 999',
    },
  ];

  const [items, setItems] = useState<InventoryItem[]>(() =>
    sanitizeItems(safeStorageParse<InventoryItem[]>(`${STORAGE_PREFIX}items`, []))
  );

  const [branches, setBranches] = useState<Branch[]>(() => {
    const saved = sanitizeBranches(safeStorageParse<Branch[]>(`${STORAGE_PREFIX}branches`, []));
    if (!saved || saved.length === 0) {
      return DEFAULT_BELLO_FAM_BRANCHES;
    }
    return saved;
  });

  const [centralBinCards, setCentralBinCards] = useState<CentralBinCardEntry[]>(() =>
    safeStorageParse<CentralBinCardEntry[]>(`${STORAGE_PREFIX}bin_cards`, [])
  );

  const [branchLedgers, setBranchLedgers] = useState<BranchLedgerEntry[]>(() =>
    safeStorageParse<BranchLedgerEntry[]>(`${STORAGE_PREFIX}branch_ledgers`, [])
  );

  const [recipes, setRecipes] = useState<Recipe[]>(() =>
    sanitizeRecipes(safeStorageParse<Recipe[]>(`${STORAGE_PREFIX}recipes`, []))
  );

  const [schedules, setSchedules] = useState<ProductionSchedule[]>(() =>
    safeStorageParse<ProductionSchedule[]>(`${STORAGE_PREFIX}schedules`, [])
  );

  const [reconciliations, setReconciliations] = useState<ReconciliationSession[]>(() =>
    safeStorageParseCascade('reconciliations', [])
  );

  const [branchDailyClosings, setBranchDailyClosings] = useState<BranchDailyClosing[]>(() =>
    safeStorageParseCascade('daily_closings', [])
  );

  const [staffMealRecipes, setStaffMealRecipes] = useState<StaffMealRecipe[]>(() =>
    safeStorageParseCascade('staff_recipes', [])
  );

  const [staffMembers, setStaffMembers] = useState<StaffMember[]>(() =>
    safeStorageParseCascade('staff_members', [])
  );

  const [staffWeeklySchedules, setStaffWeeklySchedules] = useState<StaffWeeklySchedule[]>(() =>
    safeStorageParseCascade('staff_schedules', [])
  );

  const [staffMealExecutions, setStaffMealExecutions] = useState<StaffMealExecution[]>(() =>
    safeStorageParseCascade('staff_executions', [])
  );

  // New F&B Control States (Changes 1 - 5)
  const [centralStoreResets, setCentralStoreResets] = useState<CentralStoreResetAudit[]>(() =>
    safeStorageParseCascade('central_resets', [])
  );

  const [centralSentToEntries, setCentralSentToEntries] = useState<CentralSentToEntry[]>(() =>
    safeStorageParseCascade('sent_to_ledger', [])
  );

  const [branchTrackedItems, setBranchTrackedItems] = useState<BranchTrackedItem[]>(() =>
    safeStorageParseCascade('tracked_items', [])
  );

  const [branchDailyModules, setBranchDailyModules] = useState<BranchDailyModuleRecord[]>(() =>
    sanitizeDailyModules(safeStorageParseCascade('daily_modules', []))
  );

  const [branchInterTransfers, setBranchInterTransfers] = useState<BranchInterTransfer[]>(() =>
    safeStorageParseCascade('inter_transfers', [])
  );

  const [auditCorrections, setAuditCorrections] = useState<AuditCorrectionRecord[]>(() =>
    safeStorageParseCascade('audit_corrections', [])
  );

  // Multi-Hotel States
  const DEFAULT_HOTEL: Hotel = {
    id: 'hotel_bello_fam',
    name: 'Bello Fam Restaurant Group',
    nameAm: 'ቤሎ ፋም ሬስቶራንት ግሩፕ',
    category: 'restaurant',
    categoryAm: 'ሬስቶራንት እና ካፌ',
    code: 'BEL-GRP',
    address: 'አዲስ አበባ (Addis Ababa)',
    phone: '+251 911 111 222',
    managerName: 'ሳልሳዊ ስዩም (Salsawi Seyoum)',
    isArchived: false,
    createdAt: '2026-10-01T08:00:00Z',
  };

  const [hotels, setHotels] = useState<Hotel[]>(() => {
    const saved = safeStorageParseCascade<Hotel[]>('hotels', [DEFAULT_HOTEL]);
    if (!saved || saved.length === 0) return [DEFAULT_HOTEL];
    if (!saved.some((h) => h.id === DEFAULT_HOTEL.id)) return [DEFAULT_HOTEL, ...saved];
    return saved;
  });

  const [currentHotelId, setCurrentHotelIdState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('active_hotel_id');
      if (saved) return saved;
    } catch {}
    return DEFAULT_HOTEL.id;
  });

  // Daily Expenses States
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(() => {
    return sanitizeExpenses(safeStorageParseCascade<ExpenseRecord[]>('daily_expenses', []));
  });

  const [kitchenPrepItems, setKitchenPrepItems] = useState<KitchenPrepItem[]>(() =>
    safeStorageParse<KitchenPrepItem[]>(`${STORAGE_PREFIX}kitchen_prep_items`, [])
  );

  const [kitchenPrepBatches, setKitchenPrepBatches] = useState<KitchenPrepBatch[]>(() =>
    safeStorageParse(`${STORAGE_PREFIX}kitchen_prep_batches`, [])
  );

  // Fresh Start (Cut-Over) State
  const [cutOverState, setCutOverState] = useState<CutOverState>(() => {
    const fallbackCutOver: CutOverState = {
      isActive: true,
      cutOverDate: getTodayDateString(),
      ethiopianCutOverDate: formatEthiopianDate(getTodayDateString()),
      authorizedManager: 'Kasahun Wolde (General Manager)',
      activatedAt: new Date().toISOString(),
      auditTrail: [
        {
          id: 'audit-cutover-init',
          timestamp: new Date().toLocaleString(),
          manager: 'Kasahun Wolde (General Manager)',
          action: 'CUT_OVER_INITIALIZED',
          details: 'Opening balances reset to 0 across Central Store, Cocoon 6 Kilo, and Cocoon Shola.',
        },
      ],
      departments: {
        central_store: {
          departmentId: 'central_store',
          departmentName: 'ማዕከላዊ ስቶር (Central Store)',
          isConfirmed: true,
          confirmedAt: new Date().toISOString(),
          confirmedBy: 'Kasahun Wolde',
          items: [],
          totalDepartmentValue: 0,
        },
      },
    };
    const parsed = safeStorageParse<CutOverState>(`${STORAGE_PREFIX}cut_over_state`, fallbackCutOver);
    return {
      ...fallbackCutOver,
      ...parsed,
      auditTrail: Array.isArray(parsed?.auditTrail) ? parsed.auditTrail : fallbackCutOver.auditTrail,
      departments:
        parsed?.departments && typeof parsed.departments === 'object' && !Array.isArray(parsed.departments)
          ? parsed.departments
          : fallbackCutOver.departments,
    };
  });

  useEffect(() => {
    safeLocalStorageSet(`${STORAGE_PREFIX}cut_over_state`, cutOverState);
    saveToPersistentDB('cutOverState' as any, cutOverState);
  }, [cutOverState]);

  // Standardized Department Forms
  const [departmentForms, setDepartmentForms] = useState<StandardizedDepartmentForm[]>(() =>
    safeStorageParse<StandardizedDepartmentForm[]>(`${STORAGE_PREFIX}dept_forms`, [])
  );

  useEffect(() => {
    safeLocalStorageSet(`${STORAGE_PREFIX}dept_forms`, departmentForms);
    saveToPersistentDB('departmentForms' as any, departmentForms);
  }, [departmentForms]);

  // Automated 3-Way Reconciliation Reports
  const [automatedReports, setAutomatedReports] = useState<AutomatedReconciliationReport[]>(() =>
    safeStorageParse<AutomatedReconciliationReport[]>(`${STORAGE_PREFIX}automated_reports`, [])
  );

  useEffect(() => {
    safeLocalStorageSet(`${STORAGE_PREFIX}automated_reports`, automatedReports);
    saveToPersistentDB('automatedReports' as any, automatedReports);
  }, [automatedReports]);

  // Excel Ingestion Batches
  const [uploadedBatches, setUploadedBatches] = useState<ExcelUploadedBatch[]>(() =>
    safeStorageParse<ExcelUploadedBatch[]>(`${STORAGE_PREFIX}uploaded_batches`, [])
  );

  useEffect(() => {
    safeLocalStorageSet(`${STORAGE_PREFIX}uploaded_batches`, uploadedBatches);
  }, [uploadedBatches]);

  // Learned Aliases
  const [learnedAliases, setLearnedAliases] = useState<LearnedAlias[]>(() =>
    safeStorageParse<LearnedAlias[]>(`${STORAGE_PREFIX}learned_aliases`, [])
  );

  useEffect(() => {
    safeLocalStorageSet(`${STORAGE_PREFIX}learned_aliases`, learnedAliases);
  }, [learnedAliases]);

  // Full 4-Stage Reconciliation Reports
  const [fullReconciliationReports, setFullReconciliationReports] = useState<FullReconciliationReport[]>(() =>
    safeStorageParse<FullReconciliationReport[]>(`${STORAGE_PREFIX}full_recon_reports`, [])
  );

  useEffect(() => {
    safeLocalStorageSet(`${STORAGE_PREFIX}full_recon_reports`, fullReconciliationReports);
  }, [fullReconciliationReports]);

  // Safety Recipe Protection: Ensure an immutable backup snapshot is saved
  useEffect(() => {
    try {
      if (recipes && recipes.length > 0) {
        const vault = localStorage.getItem('ETHIOPIA_ERP_RECIPE_VAULT_BACKUP');
        if (!vault) {
          localStorage.setItem(
            'ETHIOPIA_ERP_RECIPE_VAULT_BACKUP',
            JSON.stringify({
              backedUpAt: new Date().toISOString(),
              recipesCount: recipes.length,
              recipes: recipes,
            })
          );
        }
      }
    } catch (e) {
      console.warn('Recipe vault backup error:', e);
    }
  }, [recipes]);

  useEffect(() => {
    safeLocalStorageSet(`${STORAGE_PREFIX}kitchen_prep_items`, kitchenPrepItems);
    saveToPersistentDB('kitchenPrepItems', kitchenPrepItems);
  }, [kitchenPrepItems]);

  useEffect(() => {
    safeLocalStorageSet(`${STORAGE_PREFIX}kitchen_prep_batches`, kitchenPrepBatches);
    saveToPersistentDB('kitchenPrepBatches', kitchenPrepBatches);
  }, [kitchenPrepBatches]);

  useEffect(() => {
    safeLocalStorageSet(`${STORAGE_PREFIX}hotels`, hotels);
    saveToPersistentDB('hotels' as any, hotels);
  }, [hotels]);

  useEffect(() => {
    safeLocalStorageSet(`${STORAGE_PREFIX}daily_expenses`, expenses);
    saveToPersistentDB('daily_expenses' as any, expenses);
  }, [expenses]);

  // Save changes safely to localStorage & high-capacity IndexedDB, plus sync with server
  useEffect(() => {
    safeLocalStorageSet(`${STORAGE_PREFIX}items`, items);
    saveToPersistentDB('items', items);

    // Sync master catalog with server so storekeeper and manager devices match 100%
    if (items.length > 0) {
      fetch('/api/store/sync-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, managerName: 'AutoSync' }),
      }).catch(() => {});
    }
  }, [items]);

  // Periodic polling for server master catalog updates (e.g. when storekeeper adds an item on her phone)
  useEffect(() => {
    let isSubscribed = true;
    const pollServerCatalog = async () => {
      try {
        const res = await fetch('/api/store/catalog');
        if (!res.ok) return;
        const json = await res.json();
        if (json.success && json.data && Array.isArray(json.data.items) && json.data.items.length > 0) {
          if (!isSubscribed) return;
          setItems((prev) => {
            const map = new Map<string, InventoryItem>();
            prev.forEach((it) => map.set(it.id, it));
            let changed = false;
            json.data.items.forEach((it: InventoryItem) => {
              const existing = map.get(it.id);
              if (!existing) {
                map.set(it.id, it);
                changed = true;
              } else if (JSON.stringify(existing) !== JSON.stringify(it)) {
                map.set(it.id, { ...existing, ...it });
                changed = true;
              }
            });
            if (changed) {
              const merged = Array.from(map.values());
              safeLocalStorageSet(`${STORAGE_PREFIX}items`, merged);
              saveToPersistentDB('items', merged);
              return merged;
            }
            return prev;
          });
        }
      } catch {
        // silent
      }
    };

    pollServerCatalog();
    const timer = setInterval(pollServerCatalog, 8000);
    return () => {
      isSubscribed = false;
      clearInterval(timer);
    };
  }, []);

  // Real-time live polling for storekeeper activities (GRN stock-ins and SIV dispatches)
  // Ensures manager's display immediately updates when storekeeper enters data on phone!
  useEffect(() => {
    let isSubscribed = true;
    const pollActivities = async () => {
      try {
        const res = await fetch('/api/store/activities');
        if (!res.ok) return;
        const json = await res.json();
        if (json.success && Array.isArray(json.activities) && json.activities.length > 0) {
          if (!isSubscribed) return;
          const activities: any[] = json.activities;

          // Check if there are new GRN activities not yet in centralBinCards
          setCentralBinCards((prevBin) => {
            const existingRefs = new Set(prevBin.map((b) => b.refNo));
            const newEntries: CentralBinCardEntry[] = [];
            activities.forEach((act) => {
              if (act.type === 'GRN' && act.grnNumber && !existingRefs.has(act.grnNumber)) {
                newEntries.push({
                  id: act.id || `bin-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                  itemId: act.itemId,
                  date: act.date,
                  ethiopianDateStr: formatEthiopianDate(act.date),
                  refNo: act.grnNumber,
                  type: 'IN_PURCHASE',
                  quantityIn: act.quantity,
                  quantityOut: 0,
                  unitPrice: act.unitPrice,
                  balance: 0, // balance updated dynamically
                  supplierOrDestination: act.supplier || 'አቅራቢ (Supplier)',
                  notes: act.notes || 'በስቶር ኪፐር የተመዘገበ ገቢ እቃ',
                  recordedBy: act.recordedBy || 'ስቶር ኪፐር (Storekeeper)',
                });
                existingRefs.add(act.grnNumber);
              }
            });
            if (newEntries.length > 0) {
              const merged = [...newEntries, ...prevBin];
              safeLocalStorageSet(`${STORAGE_PREFIX}bin_cards`, merged);
              saveToPersistentDB('centralBinCards', merged);
              return merged;
            }
            return prevBin;
          });

          // Check if there are new SIV activities not yet in centralSentToEntries
          setCentralSentToEntries((prevSent) => {
            const existingSivs = new Set(prevSent.map((s) => s.sivNumber));
            const newSentEntries: CentralSentToEntry[] = [];
            activities.forEach((act) => {
              if (act.type === 'SIV' && act.sivNumber && !existingSivs.has(act.sivNumber)) {
                newSentEntries.push({
                  id: act.id || `sent-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                  date: act.date,
                  ethiopianDateStr: formatEthiopianDate(act.date),
                  sivNumber: act.sivNumber,
                  destinationBranchId: act.branchId,
                  destinationBranchNameAm: act.branchNameAm || act.destinationBranchNameAm || 'ቅርንጫፍ',
                  destinationBranchNameEn: act.branchNameEn || act.destinationBranchNameEn || 'Branch',
                  itemId: act.itemId,
                  itemNameAm: act.itemNameAm,
                  itemNameEn: act.itemNameEn || act.itemNameAm,
                  quantity: act.quantity,
                  unit: act.unit || 'unit',
                  unitAm: act.unitAm || 'ፍሬ',
                  unitPrice: act.unitPrice || 0,
                  totalValue: Number(((act.quantity || 0) * (act.unitPrice || 0)).toFixed(2)),
                  notes: act.notes || 'በስቶር ኪፐር የተመዘገበ SIV',
                  recordedBy: act.recordedBy || 'ስቶር ኪፐር (Storekeeper)',
                  createdAt: act.serverTimestamp || new Date().toISOString(),
                });
                existingSivs.add(act.sivNumber);
              }
            });
            if (newSentEntries.length > 0) {
              const mergedSent = [...newSentEntries, ...prevSent];
              safeLocalStorageSet(`${STORAGE_PREFIX}sent_to_ledger`, mergedSent);
              saveToPersistentDB('centralSentToEntries', mergedSent);
              return mergedSent;
            }
            return prevSent;
          });
        }
      } catch {
        // silent
      }
    };

    pollActivities();
    const actTimer = setInterval(pollActivities, 4000);
    return () => {
      isSubscribed = false;
      clearInterval(actTimer);
    };
  }, []);

  useEffect(() => {
    safeLocalStorageSet(`${STORAGE_PREFIX}branches`, branches);
    saveToPersistentDB('branches', branches);
  }, [branches]);

  useEffect(() => {
    safeLocalStorageSet(`${STORAGE_PREFIX}bin_cards`, centralBinCards);
    saveToPersistentDB('centralBinCards', centralBinCards);
  }, [centralBinCards]);

  useEffect(() => {
    safeLocalStorageSet(`${STORAGE_PREFIX}branch_ledgers`, branchLedgers);
    saveToPersistentDB('branchLedgers', branchLedgers);
  }, [branchLedgers]);

  useEffect(() => {
    safeLocalStorageSet(`${STORAGE_PREFIX}recipes`, recipes);
    saveToPersistentDB('recipes', recipes);
  }, [recipes]);

  useEffect(() => {
    safeLocalStorageSet(`${STORAGE_PREFIX}schedules`, schedules);
    saveToPersistentDB('schedules', schedules);
  }, [schedules]);

  useEffect(() => {
    safeLocalStorageSet(`${STORAGE_PREFIX}reconciliations`, reconciliations);
    saveToPersistentDB('reconciliations', reconciliations);
  }, [reconciliations]);

  useEffect(() => {
    safeLocalStorageSet(`${STORAGE_PREFIX}daily_closings`, branchDailyClosings);
    saveToPersistentDB('branchDailyClosings', branchDailyClosings);
  }, [branchDailyClosings]);

  useEffect(() => {
    safeLocalStorageSet(`${STORAGE_PREFIX}staff_recipes`, staffMealRecipes);
    saveToPersistentDB('staffMealRecipes', staffMealRecipes);
  }, [staffMealRecipes]);

  useEffect(() => {
    safeLocalStorageSet(`${STORAGE_PREFIX}staff_members`, staffMembers);
    saveToPersistentDB('staffMembers', staffMembers);
  }, [staffMembers]);

  useEffect(() => {
    safeLocalStorageSet(`${STORAGE_PREFIX}staff_schedules`, staffWeeklySchedules);
    saveToPersistentDB('staffWeeklySchedules', staffWeeklySchedules);
  }, [staffWeeklySchedules]);

  useEffect(() => {
    safeLocalStorageSet(`${STORAGE_PREFIX}staff_executions`, staffMealExecutions);
    saveToPersistentDB('staffMealExecutions', staffMealExecutions);
  }, [staffMealExecutions]);

  useEffect(() => {
    safeLocalStorageSet(`${STORAGE_PREFIX}central_resets`, centralStoreResets);
    saveToPersistentDB('centralStoreResets', centralStoreResets);
  }, [centralStoreResets]);

  useEffect(() => {
    safeLocalStorageSet(`${STORAGE_PREFIX}sent_to_ledger`, centralSentToEntries);
    saveToPersistentDB('centralSentToEntries', centralSentToEntries);
  }, [centralSentToEntries]);

  useEffect(() => {
    safeLocalStorageSet(`${STORAGE_PREFIX}tracked_items`, branchTrackedItems);
    saveToPersistentDB('branchTrackedItems', branchTrackedItems);
  }, [branchTrackedItems]);

  useEffect(() => {
    safeLocalStorageSet(`${STORAGE_PREFIX}daily_modules`, branchDailyModules);
    saveToPersistentDB('branchDailyModules', branchDailyModules);
  }, [branchDailyModules]);

  useEffect(() => {
    safeLocalStorageSet(`${STORAGE_PREFIX}inter_transfers`, branchInterTransfers);
    saveToPersistentDB('branchInterTransfers', branchInterTransfers);
  }, [branchInterTransfers]);

  useEffect(() => {
    safeLocalStorageSet(`${STORAGE_PREFIX}audit_corrections`, auditCorrections);
    saveToPersistentDB('auditCorrections', auditCorrections);
  }, [auditCorrections]);

  // Primary items selection for daily counts & reconciliations
  const [selectedPrimaryItemIds, setSelectedPrimaryItemIds] = useState<string[]>(() =>
    safeStorageParse<string[]>(`${STORAGE_PREFIX}primary_item_ids`, [])
  );

  useEffect(() => {
    safeLocalStorageSet(`${STORAGE_PREFIX}primary_item_ids`, selectedPrimaryItemIds);
  }, [selectedPrimaryItemIds]);

  const togglePrimaryItem = (itemId: string) => {
    setSelectedPrimaryItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const selectAllPrimaryItems = () => {
    setSelectedPrimaryItemIds(items.map((i) => i.id));
  };

  const selectDefaultPrimaryItems = () => {
    setSelectedPrimaryItemIds([]);
  };

  // Controller daily sheets
  const [branchDailySheets, setBranchDailySheets] = useState<BranchDailyControllerSheet[]>(() =>
    safeStorageParse<BranchDailyControllerSheet[]>(`${STORAGE_PREFIX}branch_daily_sheets`, [])
  );

  useEffect(() => {
    safeLocalStorageSet(`${STORAGE_PREFIX}branch_daily_sheets`, branchDailySheets);
    saveToPersistentDB('branchDailySheets' as any, branchDailySheets);
  }, [branchDailySheets]);

  const saveBranchDailyControllerSheet = (
    sheet: BranchDailyControllerSheet
  ): { success: boolean; sheet?: BranchDailyControllerSheet } => {
    let updated: BranchDailyControllerSheet[];
    const idx = branchDailySheets.findIndex((s) => s.id === sheet.id);
    if (idx >= 0) {
      updated = [...branchDailySheets];
      updated[idx] = sheet;
    } else {
      updated = [sheet, ...branchDailySheets];
    }
    setBranchDailySheets(updated);
    return { success: true, sheet };
  };

  const deleteBranchDailyControllerSheet = (sheetId: string) => {
    setBranchDailySheets((prev) => prev.filter((s) => s.id !== sheetId));
  };

  const populateCatalogWithZeroBalances = (_managerName?: string) => {
    clearAllDataCompletely();
  };

  /**
   * Calculate current stock balance of an item at a specific branch
   * Beginning + Transfer In - Cash Sale - Management - Staff Meal - Waste - Kitchen
   */
  const getBranchStockBalance = (branchId: string, itemId: string): number => {
    if (!branchId || !itemId) return 0;
    const entries = branchLedgers.filter(
      (entry) => entry.branchId === branchId && entry.itemId === itemId
    );
    let bal = 0;
    entries.forEach((e) => {
      bal += (e.quantityIn || 0) - (e.quantityOut || 0);
    });
    return Math.max(0, Number(bal.toFixed(4)));
  };

  /**
   * 1. RECORD GOODS RECEIVED IN CENTRAL STORE (GRN / የገባ እቃ)
   * Formula: Weighted Average Cost (WAC) = ((OldQty * OldCost) + (NewQty * NewPrice)) / (OldQty + NewQty)
   */
  const recordStockIn = (payload: StockInPayload): boolean => {
    const targetItem = items.find((i) => i.id === payload.itemId);
    if (!targetItem) return false;

    const oldQty = targetItem.currentCentralStock || 0;
    const oldCost = targetItem.weightedAvgCost || 0;
    const newQty = payload.quantity;
    const newPrice = payload.unitPrice;

    // Real Weighted Average Cost formula
    const totalQty = oldQty + newQty;
    const newWac = totalQty > 0 ? ((oldQty * oldCost) + (newQty * newPrice)) / totalQty : newPrice;

    const ethDate = formatEthiopianDate(payload.date);

    setItems((prev) =>
      prev.map((item) => {
        if (item.id === payload.itemId) {
          const newPriceRecord = {
            date: payload.date,
            ethiopianDateStr: ethDate,
            price: newPrice,
            quantity: newQty,
            supplier: payload.supplier,
            grnNumber: payload.grnNumber,
          };
          return {
            ...item,
            currentCentralStock: totalQty,
            weightedAvgCost: Number(newWac.toFixed(2)),
            lastPurchasePrice: newPrice,
            priceHistory: [newPriceRecord, ...(item.priceHistory || [])],
          };
        }
        return item;
      })
    );

    // Master Bin Card Entry
    const newBinCard: CentralBinCardEntry = {
      id: `bin-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      itemId: payload.itemId,
      date: payload.date,
      ethiopianDateStr: ethDate,
      refNo: payload.grnNumber,
      type: 'IN_PURCHASE',
      quantityIn: newQty,
      quantityOut: 0,
      unitPrice: newPrice,
      balance: totalQty,
      supplierOrDestination: payload.supplier || 'አቅራቢ (Supplier)',
      notes: payload.notes || `በአዲሱ የገበያ ዋጋ (${newPrice} ብር) ገቢ የተደረገ`,
      recordedBy: payload.recordedBy || 'ዋና ስቶር ኪፐር (Store Keeper)',
    };

    setCentralBinCards((prev) => [newBinCard, ...prev]);
    return true;
  };

  /**
   * CHANGE 1: RESET CENTRAL STORE STOCK TO ZERO
   * 1.1 Sets current on-hand quantity of every item in Central Store to 0.
   * 1.2 Dated, audit-logged "Opening Reset" adjustment, with automatic backup before it runs. No hard deletes.
   * 1.3 Leaves untouched: item master data and codes, units, prices and last purchase price, min/max levels, menus, recipes.
   * 1.4 Central Store Beginning Balance = 0. Stock increases only via new GRVs and decreases only via new SIVs.
   */
  const resetCentralStoreStockToZero = async (
    user: string = 'ስቶር ማኔጀር (Store Manager)',
    notes: string = 'የማዕከላዊ ስቶር ክምችት ወደ 0 ማስተካከል (Opening Reset)'
  ): Promise<CentralStoreResetAudit> => {
    // 1. Automatic backup before reset (No hard deletes)
    try {
      await saveBackupSnapshot(`Pre-Reset Central Store Stock Backup (${new Date().toLocaleString()})`, {
        version: '4.0.0',
        exportedAt: new Date().toISOString(),
        systemName: 'Bello Fam F&B Control - Pre-Reset Stock Backup',
        items,
        branches,
        centralBinCards,
        branchLedgers,
        recipes,
        schedules,
        reconciliations,
        branchDailyClosings,
        staffMealRecipes,
        staffMembers,
        staffWeeklySchedules,
        staffMealExecutions,
        centralStoreResets,
        centralSentToEntries,
        branchTrackedItems,
        branchDailyModules,
        branchInterTransfers,
        auditCorrections,
      });
    } catch (err) {
      console.warn('Auto backup before opening reset:', err);
    }

    const todayStr = getTodayDateString();
    const ethDate = formatEthiopianDate(todayStr);
    const timestamp = new Date().toISOString();

    const snapshots: CentralStoreResetAudit['itemSnapshots'] = [];
    const newBinCardEntries: CentralBinCardEntry[] = [];
    let totalPrevStock = 0;

    items.forEach((item) => {
      const prevQty = item.currentCentralStock || 0;
      totalPrevStock += prevQty;
      const unitCost = item.lastPurchasePrice || item.weightedAvgCost || 0;

      snapshots.push({
        itemId: item.id,
        itemCode: item.code,
        itemNameAm: item.nameAm,
        itemNameEn: item.nameEn,
        previousQuantity: prevQty,
        newQuantity: 0,
        unitAm: item.unitAm,
        unitPrice: unitCost,
      });

      // Audit-logged adjustment voucher in central bin cards
      newBinCardEntries.push({
        id: `bin-reset-${item.id}-${Date.now()}`,
        itemId: item.id,
        date: todayStr,
        ethiopianDateStr: ethDate,
        refNo: `RESET-OPENING-001`,
        type: 'ADJUSTMENT',
        quantityIn: 0,
        quantityOut: prevQty,
        unitPrice: unitCost,
        balance: 0,
        supplierOrDestination: 'የመክፈቻ ሪሴት (Opening Stock Reset)',
        notes: `Opening Reset / የመነሻ ክምችት ማስተካከያ: የቀድሞ ${prevQty} ${item.unitAm} ወደ 0 ተስተካክሏል`,
        recordedBy: user,
      });
    });

    // Set Central Store on-hand balance to 0 for every item
    setItems((prev) =>
      prev.map((i) => ({
        ...i,
        currentCentralStock: 0,
      }))
    );

    setCentralBinCards((prev) => [...newBinCardEntries, ...prev]);

    const auditRecord: CentralStoreResetAudit = {
      id: `audit-reset-${Date.now()}`,
      timestamp,
      ethiopianDateStr: ethDate,
      user,
      notes,
      itemsResetCount: items.length,
      totalPreviousStock: totalPrevStock,
      itemSnapshots: snapshots,
    };

    setCentralStoreResets((prev) => [auditRecord, ...prev]);
    localStorage.setItem(`${STORAGE_PREFIX}initial_reset_done`, 'true');
    return auditRecord;
  };

  /**
   * CHANGE 2: CENTRAL STORE ISSUES NEVER INCREASE BRANCH STOCK
   * 2.1 Deducts quantity from Central Store balance;
   *     Records in "Sent To" ledger inside Central Store module, grouped by destination.
   * 2.2 NEVER automatically adds issued quantities to any branch's inventory, balance, or dashboard!
   */
  const transferToBranch = (payload: TransferPayload): { success: boolean; error?: string } => {
    const targetItem = items.find((i) => i.id === payload.itemId);
    const targetBranch = branches.find((b) => b.id === payload.branchId);

    if (!targetItem) return { success: false, error: 'ዕቃው አልተገኘም (Item not found)' };
    if (!targetBranch) return { success: false, error: 'ቅርንጫፉ አልተገኘም (Branch not found)' };

    if (targetItem.currentCentralStock < payload.quantity) {
      return {
        success: false,
        error: `በቂ የማዕከላዊ ስቶር ክምችት የለም! ያለው: ${targetItem.currentCentralStock} ${targetItem.unitAm}፣ የተጠየቀው: ${payload.quantity} ${targetItem.unitAm}`,
      };
    }

    const ethDate = formatEthiopianDate(payload.date);
    const newCentralStock = targetItem.currentCentralStock - payload.quantity;
    const effectivePrice = targetItem.lastPurchasePrice || targetItem.weightedAvgCost || 0;

    // 1. (a) Deduct quantity from Central Store balance
    setItems((prev) =>
      prev.map((i) => (i.id === payload.itemId ? { ...i, currentCentralStock: newCentralStock } : i))
    );

    // 2. Decrement Central Bin Card
    const newBinCard: CentralBinCardEntry = {
      id: `bin-siv-${Date.now()}`,
      itemId: payload.itemId,
      date: payload.date,
      ethiopianDateStr: ethDate,
      refNo: payload.sivNumber,
      type: 'OUT_BRANCH_TRANSFER',
      branchId: payload.branchId,
      quantityIn: 0,
      quantityOut: payload.quantity,
      unitPrice: effectivePrice,
      balance: newCentralStock,
      supplierOrDestination: `${targetBranch.nameAm} (${targetBranch.nameEn})`,
      notes: payload.notes || `ወደ ${targetBranch.nameAm} በ SIV የተላከ`,
      recordedBy: payload.recordedBy || 'ዋና ስቶር ኪፐር',
    };
    setCentralBinCards((prev) => [newBinCard, ...prev]);

    // 3. (b) Record in "Sent To" ledger inside Central Store module, grouped by destination
    // CRITICAL: NEVER automatically add issued quantities to any branch's inventory, balance, or dashboard!
    const sentEntry: CentralSentToEntry = {
      id: `sent-siv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      date: payload.date,
      ethiopianDateStr: ethDate,
      sivNumber: payload.sivNumber,
      destinationBranchId: payload.branchId,
      destinationBranchNameAm: targetBranch.nameAm,
      destinationBranchNameEn: targetBranch.nameEn,
      itemId: payload.itemId,
      itemNameAm: targetItem.nameAm,
      itemNameEn: targetItem.nameEn,
      quantity: payload.quantity,
      unit: targetItem.unit,
      unitAm: targetItem.unitAm,
      unitPrice: effectivePrice,
      totalValue: Number((payload.quantity * effectivePrice).toFixed(2)),
      notes: payload.notes || '',
      recordedBy: payload.recordedBy || 'ዋና ስቶር ኪፐር (Central Store Keeper)',
      createdAt: new Date().toISOString(),
    };
    setCentralSentToEntries((prev) => [sentEntry, ...prev]);

    return { success: true };
  };

  // Tracked items are 100% user-configured per branch (zero pre-seeded items)

  const getTrackedItemsForBranch = (branchId: string, targetDate?: string): BranchTrackedItem[] => {
    // Strictly return user-configured primary items for this branch (clean-zero start: zero pre-seeded items)
    return branchTrackedItems.filter((ti) => {
      if (ti.branchId !== branchId) return false;
      if (ti.isActive === false) return false;
      if (ti.removedFromDate && targetDate && targetDate >= ti.removedFromDate) return false;
      return true;
    });
  };

  const cloneTrackedItemsFromBranch = (
    sourceBranchId: string,
    targetBranchId: string
  ): { success: boolean; count: number } => {
    const sourceList = getTrackedItemsForBranch(sourceBranchId);

    const clonedItems: BranchTrackedItem[] = sourceList.map((ti) => ({
      id: `${targetBranchId}_${ti.itemId}`,
      branchId: targetBranchId,
      itemId: ti.itemId,
      countUnit: ti.countUnit,
      countUnitAm: ti.countUnitAm,
      isActive: true,
      conversionFactor: ti.conversionFactor,
      enableCrossCheck: ti.enableCrossCheck,
      addedAt: new Date().toISOString(),
    }));

    setBranchTrackedItems((prev) => {
      const remaining = prev.filter((ti) => ti.branchId !== targetBranchId);
      return [...remaining, ...clonedItems];
    });

    return { success: true, count: clonedItems.length };
  };

  const syncTrackedItemsAcrossBranches = (
    targetBranchIds: string[] = ['br-cocoon-shola', 'br-kokonut-6kilo']
  ): { success: boolean; count: number } => {
    const itemMap = new Map<string, BranchTrackedItem>();

    branchTrackedItems
      .filter((ti) => targetBranchIds.includes(ti.branchId) && ti.isActive)
      .forEach((ti) => {
        if (!itemMap.has(ti.itemId)) {
          itemMap.set(ti.itemId, ti);
        }
      });

    const newTrackedList: BranchTrackedItem[] = [];
    targetBranchIds.forEach((bId) => {
      itemMap.forEach((ti, itemId) => {
        newTrackedList.push({
          id: `${bId}_${itemId}`,
          branchId: bId,
          itemId,
          countUnit: ti.countUnit,
          countUnitAm: ti.countUnitAm,
          isActive: true,
          conversionFactor: ti.conversionFactor,
          enableCrossCheck: ti.enableCrossCheck,
          addedAt: new Date().toISOString(),
        });
      });
    });

    setBranchTrackedItems((prev) => {
      const remaining = prev.filter((ti) => !targetBranchIds.includes(ti.branchId));
      return [...remaining, ...newTrackedList];
    });

    return { success: true, count: itemMap.size };
  };

  const saveBranchTrackedItem = (item: BranchTrackedItem) => {
    const it = items.find((i) => i.id === item.itemId);
    saveAuditCorrection({
      user: 'ሳልሳዊ ስዩም (Salsawi Seyoum)',
      module: 'PRIMARY_MATERIALS_CONTROL',
      branchId: item.branchId,
      recordId: `${item.branchId}_${item.itemId}`,
      previousValue: null,
      newValue: { ...item, isActive: true },
      reason: `Added/restored primary material "${it?.nameAm || it?.nameEn || item.itemId}" to branch tracking list`,
      ownerNotified: true,
    });

    setBranchTrackedItems((prev) => {
      const copy = [...prev];
      const idx = copy.findIndex((t) => t.branchId === item.branchId && t.itemId === item.itemId);
      if (idx >= 0) {
        copy[idx] = {
          ...item,
          isActive: true,
          removedFromDate: undefined,
          removalReason: undefined,
        };
      } else {
        copy.push({
          ...item,
          isActive: true,
        });
      }
      return copy;
    });
  };

  const removeBranchTrackedItem = (
    branchId: string,
    itemId: string,
    targetDate?: string,
    reason?: string
  ) => {
    const it = items.find((i) => i.id === itemId);
    const effectiveDate = targetDate || getTodayDateString();

    saveAuditCorrection({
      user: 'ሳልሳዊ ስዩም (Salsawi Seyoum)',
      module: 'PRIMARY_MATERIALS_CONTROL',
      branchId,
      recordId: `${branchId}_${itemId}`,
      previousValue: { isActive: true },
      newValue: { isActive: false, removedFromDate: effectiveDate, reason },
      reason: reason || `Removed primary material "${it?.nameAm || it?.nameEn || itemId}" from ${effectiveDate} onward`,
      ownerNotified: true,
    });

    setBranchTrackedItems((prev) => {
      const copy = [...prev];
      const idx = copy.findIndex((t) => t.branchId === branchId && t.itemId === itemId);
      if (idx >= 0) {
        copy[idx] = {
          ...copy[idx],
          isActive: false,
          removedFromDate: effectiveDate,
          removalReason: reason || 'Soft removed by manager',
        };
        return copy;
      } else {
        const raw = items.find((i) => i.id === itemId);
        copy.push({
          id: `${branchId}_${itemId}`,
          branchId,
          itemId,
          countUnit: raw?.unit || 'kg',
          countUnitAm: raw?.unitAm || 'ኪ.ግ',
          isActive: false,
          removedFromDate: effectiveDate,
          removalReason: reason || 'Soft removed by manager',
        });
        return copy;
      }
    });
  };

  const bulkRemoveBranchTrackedItems = (
    branchId: string,
    itemIds: string[],
    targetDate?: string,
    reason?: string
  ) => {
    itemIds.forEach((id) => removeBranchTrackedItem(branchId, id, targetDate, reason));
  };

  // ==========================================
  // MULTI-HOTEL MANAGEMENT FUNCTIONS
  // ==========================================
  const setCurrentHotelId = (hotelId: string) => {
    setCurrentHotelIdState(hotelId);
    try {
      localStorage.setItem('active_hotel_id', hotelId);
    } catch {}
  };

  const currentHotel = useMemo(() => {
    return hotels.find((h) => h.id === currentHotelId) || hotels[0] || DEFAULT_HOTEL;
  }, [hotels, currentHotelId]);

  const addHotel = (hotelData: Omit<Hotel, 'id' | 'createdAt' | 'isArchived'>): Hotel => {
    const newId = `hotel_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newHotel: Hotel = {
      ...hotelData,
      id: newId,
      isArchived: false,
      createdAt: new Date().toISOString(),
    };

    setHotels((prev) => [...prev, newHotel]);
    setCurrentHotelId(newId);

    // Create an initial main branch for the new hotel
    const initialBranch: Branch = {
      id: `br-${newId}-main`,
      hotelId: newId,
      code: `${newHotel.code || 'BR'}-01`,
      nameAm: `${newHotel.nameAm || newHotel.name} ዋና ቅርንጫፍ`,
      nameEn: `${newHotel.name} Main Branch`,
      location: newHotel.address || 'ዋና ቅርንጫፍ',
      manager: newHotel.managerName || 'ስራ አስኪያጅ',
      phone: newHotel.phone || '',
    };
    setBranches((prev) => [...prev, initialBranch]);

    saveAuditCorrection({
      user: 'ሳልሳዊ ስዩም (Super Admin)',
      module: 'HOTELS_MANAGEMENT',
      recordId: newId,
      previousValue: null,
      newValue: newHotel,
      reason: `Added new hotel/business: "${newHotel.name}" (${newHotel.category})`,
      ownerNotified: true,
    });

    return newHotel;
  };

  const updateHotel = (id: string, updates: Partial<Hotel>) => {
    setHotels((prev) =>
      prev.map((h) => {
        if (h.id === id) {
          saveAuditCorrection({
            user: 'ሳልሳዊ ስዩም (Super Admin)',
            module: 'HOTELS_MANAGEMENT',
            recordId: id,
            previousValue: h,
            newValue: { ...h, ...updates },
            reason: `Updated hotel details for "${h.name}"`,
            ownerNotified: true,
          });
          return { ...h, ...updates };
        }
        return h;
      })
    );
  };

  const archiveHotel = (id: string) => {
    if (id === DEFAULT_HOTEL.id) {
      alert('የመጀመሪያውን ዋና ሆቴል (ቤሎ ፋም) አርካይቭ ማድረግ አይቻልም! (Cannot archive baseline hotel)');
      return;
    }
    updateHotel(id, { isArchived: true });
  };

  // ==========================================
  // EXPENSES MANAGEMENT & 15% VAT FUNCTIONS
  // ==========================================
  const computeExpenseVatAndTotals = (
    enteredAmount: number,
    hasReceipt: boolean,
    isVatInclusive: boolean
  ) => {
    if (!hasReceipt) {
      return {
        amountBeforeVat: enteredAmount,
        vatAmount: 0,
        totalAmount: enteredAmount,
      };
    }
    // 15% VAT
    if (isVatInclusive) {
      const totalAmount = enteredAmount;
      const amountBeforeVat = parseFloat((enteredAmount / 1.15).toFixed(2));
      const vatAmount = parseFloat((totalAmount - amountBeforeVat).toFixed(2));
      return { amountBeforeVat, vatAmount, totalAmount };
    } else {
      const amountBeforeVat = enteredAmount;
      const vatAmount = parseFloat((enteredAmount * 0.15).toFixed(2));
      const totalAmount = parseFloat((amountBeforeVat + vatAmount).toFixed(2));
      return { amountBeforeVat, vatAmount, totalAmount };
    }
  };

  const recordExpense = (
    data: Omit<ExpenseRecord, 'id' | 'createdAt' | 'amountBeforeVat' | 'vatAmount' | 'totalAmount'>
  ): ExpenseRecord => {
    const { amountBeforeVat, vatAmount, totalAmount } = computeExpenseVatAndTotals(
      data.enteredAmount,
      data.hasReceipt,
      data.isVatInclusive
    );

    const newExpense: ExpenseRecord = {
      ...data,
      id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      amountBeforeVat,
      vatAmount,
      totalAmount,
      isDeleted: false,
      createdAt: new Date().toISOString(),
    };

    setExpenses((prev) => [newExpense, ...prev]);

    saveAuditCorrection({
      user: data.recordedBy || 'ሳልሳዊ ስዩም',
      module: 'EXPENSES_CONTROL',
      branchId: data.branchId,
      recordId: newExpense.id,
      previousValue: null,
      newValue: newExpense,
      reason: `Recorded expense: ${data.description} (${totalAmount} ETB, ${data.hasReceipt ? 'With receipt' : 'Without receipt'})`,
      ownerNotified: true,
    });

    return newExpense;
  };

  const updateExpense = (
    id: string,
    updates: Partial<ExpenseRecord>,
    reason = 'Updated expense details'
  ): boolean => {
    const existing = expenses.find((e) => e.id === id);
    if (!existing) return false;

    const enteredAmount = updates.enteredAmount !== undefined ? updates.enteredAmount : existing.enteredAmount;
    const hasReceipt = updates.hasReceipt !== undefined ? updates.hasReceipt : existing.hasReceipt;
    const isVatInclusive = updates.isVatInclusive !== undefined ? updates.isVatInclusive : existing.isVatInclusive;

    const { amountBeforeVat, vatAmount, totalAmount } = computeExpenseVatAndTotals(
      enteredAmount,
      hasReceipt,
      isVatInclusive
    );

    const updatedRecord: ExpenseRecord = {
      ...existing,
      ...updates,
      amountBeforeVat,
      vatAmount,
      totalAmount,
      updatedAt: new Date().toISOString(),
    };

    saveAuditCorrection({
      user: 'ሳልሳዊ ስዩም (Salsawi Seyoum)',
      module: 'EXPENSES_CONTROL',
      branchId: existing.branchId,
      recordId: id,
      previousValue: existing,
      newValue: updatedRecord,
      reason,
      ownerNotified: true,
    });

    setExpenses((prev) => prev.map((e) => (e.id === id ? updatedRecord : e)));
    return true;
  };

  const deleteExpense = (id: string, reason = 'Deleted expense'): boolean => {
    return updateExpense(id, { isDeleted: true }, reason);
  };

  const getMonthlyExpenseSummary = (
    hotelId: string,
    branchId?: string,
    periodMonth?: string
  ): ExpenseMonthlySummary => {
    const targetMonth = periodMonth || getTodayDateString().substring(0, 7);

    const activeList = (Array.isArray(expenses) ? expenses : []).filter((e) => {
      if (!e || e.isDeleted) return false;
      if (hotelId && hotelId !== 'all' && e.hotelId && e.hotelId !== hotelId) return false;
      if (branchId && branchId !== 'all' && e.branchId !== branchId) return false;
      if (typeof e.date !== 'string' || !e.date.startsWith(targetMonth)) return false;
      return true;
    });

    let totalWithReceipt = 0;
    let totalWithoutReceipt = 0;
    let totalVat = 0;
    let totalBeforeVat = 0;
    let grandTotal = 0;

    const categoryTotals: Record<ExpenseCategory, number> = {
      utilities: 0,
      transport: 0,
      maintenance: 0,
      cleaning: 0,
      kitchen_supplies: 0,
      marketing: 0,
      labor_casual: 0,
      other: 0,
    };

    activeList.forEach((e) => {
      grandTotal += e.totalAmount;
      totalBeforeVat += e.amountBeforeVat;
      totalVat += e.vatAmount;
      if (e.hasReceipt) {
        totalWithReceipt += e.totalAmount;
      } else {
        totalWithoutReceipt += e.totalAmount;
      }
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.totalAmount;
    });

    return {
      periodMonth: targetMonth,
      hotelId,
      branchId: branchId || 'all',
      totalWithReceipt: parseFloat(totalWithReceipt.toFixed(2)),
      totalWithoutReceipt: parseFloat(totalWithoutReceipt.toFixed(2)),
      totalVat: parseFloat(totalVat.toFixed(2)),
      totalBeforeVat: parseFloat(totalBeforeVat.toFixed(2)),
      grandTotal: parseFloat(grandTotal.toFixed(2)),
      categoryTotals,
      recordCount: activeList.length,
    };
  };

  /**
   * CHANGE 3: BRANCH DAILY STOCK MODULE
   * 3.2 Adds Beginning + Received and displays running total
   * 3.3 Ending Balance of Day 1 automatically becomes Beginning of Day 2
   */
  const getBeginningStockForBranchItem = (branchId: string, itemId: string, targetDate: string): number => {
    // 1. Look for explicit saved record on targetDate
    const existingModule = branchDailyModules.find(
      (m) => m && m.branchId === branchId && m.date === targetDate
    );
    if (existingModule?.items?.[itemId] && existingModule.items[itemId].beginningInventory !== undefined) {
      return existingModule.items[itemId].beginningInventory;
    }

    // 2. Check previous day ending carryover (Day 1 Ending becomes Day 2 Beginning)
    const carryover = getPreviousDayEndingInventory(branchId, targetDate);
    if (carryover.foundDate && carryover.endingMap[itemId] !== undefined) {
      return carryover.endingMap[itemId];
    }

    // 3. Fallback to any prior module ending
    const priorModules = branchDailyModules
      .filter((m) => m && m.branchId === branchId && m.date < targetDate && m.items?.[itemId])
      .sort((a, b) => b.date.localeCompare(a.date));
    if (priorModules.length > 0 && priorModules[0].items?.[itemId]?.actualEnding !== undefined) {
      return priorModules[0].items[itemId].actualEnding;
    }

    return 0;
  };

  const saveBranchDailyModule = (record: BranchDailyModuleRecord) => {
    setBranchDailyModules((prev) => {
      const idx = prev.findIndex((m) => m.branchId === record.branchId && m.date === record.date);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = record;
        return updated;
      }
      return [record, ...prev];
    });

    // Automatically carry over actual ending inventory so the next day's beginning inventory picks it up!
    const endingMap: Record<string, number> = {};
    Object.entries(record.items || {}).forEach(([itemId, data]) => {
      if (data) endingMap[itemId] = data.actualEnding;
    });
    saveDailyEndingInventory(record.branchId, record.date, endingMap);
  };

  /**
   * CHANGE 3.1(g) & ACCEPTANCE TEST T6: INTER-BRANCH TRANSFERS
   * Transfer Out reduces sending branch expected ending;
   * Added to receiving branch ONLY when receiving branch enters/accepts into Received.
   */
  const recordInterBranchTransfer = (
    transfer: Omit<BranchInterTransfer, 'id' | 'ethiopianDateStr' | 'status'>
  ): { success: boolean; error?: string } => {
    const fromBranch = branches.find((b) => b.id === transfer.fromBranchId);
    const toBranch = branches.find((b) => b.id === transfer.toBranchId);
    const item = items.find((i) => i.id === transfer.itemId);

    if (!fromBranch || !toBranch || !item) {
      return { success: false, error: 'Invalid branch or item' };
    }

    const newTransfer: BranchInterTransfer = {
      ...transfer,
      id: `itran-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      ethiopianDateStr: formatEthiopianDate(transfer.date),
      status: 'PENDING',
      itemNameAm: item.nameAm,
      itemNameEn: item.nameEn,
      unitAm: transfer.unitAm || item.unitAm,
    };

    setBranchInterTransfers((prev) => [newTransfer, ...prev]);
    return { success: true };
  };

  const acceptInterBranchTransfer = (transferId: string, receivedBy?: string): { success: boolean } => {
    setBranchInterTransfers((prev) =>
      prev.map((t) => {
        if (t.id === transferId) {
          return {
            ...t,
            status: 'RECEIVED',
            receivedBy: receivedBy || 'Branch Manager',
            receivedAt: new Date().toISOString(),
          };
        }
        return t;
      })
    );
    return { success: true };
  };

  /**
   * AUDIT CORRECTION (No hard deletes, keeps audit trail and notifies owner)
   */
  const saveAuditCorrection = (correction: Omit<AuditCorrectionRecord, 'id' | 'timestamp'>) => {
    const auditRecord: AuditCorrectionRecord = {
      ...correction,
      id: `corr-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: new Date().toISOString(),
      ownerNotified: true,
    };
    setAuditCorrections((prev) => [auditRecord, ...prev]);
  };

  /**
   * 3. SET BRANCH BEGINNING INVENTORY (መነሻ ክምችት)
   * Each branch has its own beginning inventory per item.
   */
  const setBeginningStock = (
    branchId: string,
    itemId: string,
    quantity: number,
    date?: string,
    unitCost?: number
  ): boolean => {
    const targetBranch = branches.find((b) => b.id === branchId);
    const targetItem = items.find((i) => i.id === itemId);
    if (!targetBranch || !targetItem) return false;

    const effectiveDate = date || getTodayDateString();
    const ethDate = formatEthiopianDate(effectiveDate);
    const cost = unitCost !== undefined ? unitCost : (targetItem.weightedAvgCost || targetItem.lastPurchasePrice || 0);

    // Look for existing BEGINNING_STOCK entry for this branch and item
    const existingIndex = branchLedgers.findIndex(
      (e) => e.branchId === branchId && e.itemId === itemId && e.type === 'BEGINNING_STOCK'
    );

    if (existingIndex >= 0) {
      setBranchLedgers((prev) => {
        const copy = [...prev];
        copy[existingIndex] = {
          ...copy[existingIndex],
          quantityIn: quantity,
          balance: quantity,
          unitCost: cost,
          totalValue: Number((quantity * cost).toFixed(2)),
          date: effectiveDate,
          ethiopianDateStr: ethDate,
        };
        return copy;
      });
    } else {
      const entry: BranchLedgerEntry = {
        id: `beg-${branchId}-${itemId}-${Date.now()}`,
        branchId,
        itemId,
        date: effectiveDate,
        ethiopianDateStr: ethDate,
        refNo: `BEG-${targetItem.code || Date.now().toString().slice(-4)}`,
        type: 'BEGINNING_STOCK',
        quantityIn: quantity,
        quantityOut: 0,
        balance: quantity,
        unitCost: cost,
        totalValue: Number((quantity * cost).toFixed(2)),
        reasonOrMenu: 'የቅርንጫፍ መነሻ ክምችት (Beginning Inventory)',
        recordedBy: targetBranch.manager || 'የቅርንጫፍ አስተዳዳሪ',
      };
      setBranchLedgers((prev) => [entry, ...prev]);
    }
    return true;
  };

  /**
   * 4. RECORD BRANCH THREE-WAY CONSUMPTION / SALES
   * 1) Direct Cash Sale (ቀጥታ በገንዘብ የተሸጠ)
   * 2) Management Consumption (ማኔጅመንት የተጠቀመው)
   * 3) Staff Meal (የስታፍ ምግብ)
   * Plus Waste/Damage.
   * Supports either menu recipe dish (deducts ingredient proportions) or raw item direct deduction.
   */
  const recordBranchThreeWayUsage = (
    payload: BranchThreeWayUsagePayload
  ): { success: boolean; error?: string } => {
    const targetBranch = branches.find((b) => b.id === payload.branchId);
    if (!targetBranch) return { success: false, error: 'ቅርንጫፉ አልተገኘም' };

    const ethDate = formatEthiopianDate(payload.date);

    // MODE A: MENU RECIPE DISH
    if (payload.mode === 'recipe' && payload.recipeId) {
      const recipe = recipes.find((r) => r.id === payload.recipeId);
      if (!recipe) return { success: false, error: 'የተመረጠው ሪሲፒ/ሜኑ አልተገኘም' };

      const portions = payload.portions || 1;
      if (portions <= 0) return { success: false, error: 'እባክዎ ትክክለኛ የፖርሽን መጠን ያስገቡ' };

      // Validate stock availability for all ingredients
      for (const ing of recipe.ingredients) {
        const item = items.find((i) => i.id === ing.itemId);
        const requiredQty = Number((ing.quantity * portions).toFixed(4));
        const currentBal = getBranchStockBalance(payload.branchId, ing.itemId);
        if (currentBal < requiredQty) {
          const itemName = item ? item.nameAm : ing.itemId;
          const unit = item ? item.unitAm : '';
          return {
            success: false,
            error: `ለ${recipe.nameAm} የሚያስፈልገው "${itemName}" በቂ ክምችት የለም! ያለው: ${currentBal} ${unit}፣ የሚያስፈልገው: ${requiredQty} ${unit}`,
          };
        }
      }

      // Compute sales revenue if cash sale
      const unitPrice = payload.sellingPrice !== undefined ? payload.sellingPrice : recipe.sellingPrice;
      const totalCash = payload.totalCashRevenue !== undefined ? payload.totalCashRevenue : portions * unitPrice;

      const newEntries: BranchLedgerEntry[] = [];
      const timestamp = Date.now();

      recipe.ingredients.forEach((ing, index) => {
        const item = items.find((i) => i.id === ing.itemId);
        const requiredQty = Number((ing.quantity * portions).toFixed(4));
        const currentBal = getBranchStockBalance(payload.branchId, ing.itemId);
        const newBal = Number((currentBal - requiredQty).toFixed(4));
        const cost = item ? (item.weightedAvgCost || item.lastPurchasePrice || 0) : 0;

        let channelName = 'ቀጥታ ሽያጭ';
        if (payload.type === 'MANAGEMENT_USE') channelName = 'የማኔጅመንት አጠቃቀም';
        else if (payload.type === 'STAFF_MEAL') channelName = 'የስታፍ ምግብ';
        else if (payload.type === 'WASTE_DAMAGE') channelName = 'ብክነት';

        const entry: BranchLedgerEntry = {
          id: `bled-${payload.type.toLowerCase()}-${timestamp}-${index}`,
          branchId: payload.branchId,
          itemId: ing.itemId,
          date: payload.date,
          ethiopianDateStr: ethDate,
          refNo: payload.refNo || `${payload.type.slice(0, 3)}-${timestamp.toString().slice(-4)}`,
          type: payload.type,
          quantityIn: 0,
          quantityOut: requiredQty,
          balance: newBal,
          unitCost: cost,
          totalValue: Number((requiredQty * cost).toFixed(2)),
          sellingPrice: index === 0 ? unitPrice : undefined,
          cashRevenue: index === 0 && payload.type === 'CASH_SALE' ? totalCash : undefined,
          beneficiaryOrGuest: payload.beneficiaryOrGuest,
          recipeId: recipe.id,
          portionsSold: portions,
          reasonOrMenu: `${recipe.nameAm} (${portions} ፖርሽን) [${channelName}]${payload.reasonOrNotes ? ` - ${payload.reasonOrNotes}` : ''}`,
          recordedBy: payload.recordedBy || targetBranch.manager,
        };
        newEntries.push(entry);
      });

      setBranchLedgers((prev) => [...newEntries, ...prev]);
      return { success: true };
    }

    // MODE B: DIRECT RAW / PACKAGED ITEM
    if (payload.mode === 'item' && payload.itemId) {
      const targetItem = items.find((i) => i.id === payload.itemId);
      if (!targetItem) return { success: false, error: 'ዕቃው አልተገኘም' };

      const qty = payload.quantity || 0;
      if (qty <= 0) return { success: false, error: 'እባክዎ ትክክለኛ መጠን ያስገቡ' };

      const currentBranchStock = getBranchStockBalance(payload.branchId, payload.itemId);
      if (currentBranchStock < qty) {
        return {
          success: false,
          error: `በቂ የቅርንጫፍ ክምችት የለም! በቅርንጫፉ ያለው: ${currentBranchStock} ${targetItem.unitAm}፣ የተጠየቀው: ${qty} ${targetItem.unitAm}`,
        };
      }

      const newBranchBalance = Number((currentBranchStock - qty).toFixed(4));
      const cost = targetItem.weightedAvgCost || targetItem.lastPurchasePrice || 0;
      const unitPrice = payload.sellingPrice || 0;
      const totalCash = payload.totalCashRevenue !== undefined ? payload.totalCashRevenue : (qty * unitPrice);

      let channelName = 'ቀጥታ ሽያጭ';
      if (payload.type === 'MANAGEMENT_USE') channelName = 'የማኔጅመንት አጠቃቀም';
      else if (payload.type === 'STAFF_MEAL') channelName = 'የስታፍ ምግብ';
      else if (payload.type === 'WASTE_DAMAGE') channelName = 'ብክነት';

      const newLedgerEntry: BranchLedgerEntry = {
        id: `bled-${payload.type.toLowerCase()}-${Date.now()}`,
        branchId: payload.branchId,
        itemId: payload.itemId,
        date: payload.date,
        ethiopianDateStr: ethDate,
        refNo: payload.refNo || `${payload.type.slice(0, 3)}-${Date.now().toString().slice(-4)}`,
        type: payload.type,
        quantityIn: 0,
        quantityOut: qty,
        balance: newBranchBalance,
        unitCost: cost,
        totalValue: Number((qty * cost).toFixed(2)),
        sellingPrice: unitPrice > 0 ? unitPrice : undefined,
        cashRevenue: payload.type === 'CASH_SALE' ? totalCash : undefined,
        beneficiaryOrGuest: payload.beneficiaryOrGuest,
        reasonOrMenu: `${targetItem.nameAm} [${channelName}]${payload.reasonOrNotes ? ` - ${payload.reasonOrNotes}` : ''}`,
        recordedBy: payload.recordedBy || targetBranch.manager,
      };

      setBranchLedgers((prev) => [newLedgerEntry, ...prev]);
      return { success: true };
    }

    return { success: false, error: 'ያልተሟላ የመረጃ ጥያቄ' };
  };

  /**
   * Compatibility wrapper for existing legacy branch usage
   */
  const recordBranchUsage = (payload: BranchUsagePayload): { success: boolean; error?: string } => {
    return recordBranchThreeWayUsage({
      branchId: payload.branchId,
      date: payload.date,
      type: payload.type === 'DIRECT_SALE' ? 'CASH_SALE' : (payload.type as any),
      mode: 'item',
      itemId: payload.itemId,
      quantity: payload.quantity,
      reasonOrNotes: payload.reasonOrMenu,
      refNo: payload.refNo,
      recordedBy: payload.recordedBy,
    });
  };

  /**
   * 5. BRANCH DAILY/PERIODIC ACCOUNT & INVENTORY CLOSING (የዕለት ሂሳብ መዝጊያ)
   */
  const closeBranchDailyAccount = (closing: BranchDailyClosing): boolean => {
    setBranchDailyClosings((prev) => {
      const idx = prev.findIndex((c) => c.id === closing.id || (c.branchId === closing.branchId && c.date === closing.date));
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = closing;
        return copy;
      }
      return [closing, ...prev];
    });

    // Record any physical variance adjustment to branch ledgers if not zero
    closing.itemSummaries.forEach((summary) => {
      if (summary.varianceQty !== 0) {
        const currentBal = getBranchStockBalance(closing.branchId, summary.itemId);
        const adjEntry: BranchLedgerEntry = {
          id: `bled-adj-${closing.id}-${summary.itemId}`,
          branchId: closing.branchId,
          itemId: summary.itemId,
          date: closing.date,
          ethiopianDateStr: closing.ethiopianDateStr,
          refNo: `CLOSE-ADJ-${closing.closingNumber}`,
          type: 'RECONCILIATION_ADJ',
          quantityIn: summary.varianceQty < 0 ? Math.abs(summary.varianceQty) : 0,
          quantityOut: summary.varianceQty > 0 ? summary.varianceQty : 0,
          balance: summary.actualPhysicalStock,
          unitCost: summary.unitCost,
          totalValue: Math.abs(summary.varianceCostETB),
          reasonOrMenu: `የዕለት ሂሳብ መዝጊያ ቆጠራ ማስተካከያ (ልዩነት: ${summary.varianceQty} ${summary.unitAm})`,
          recordedBy: closing.closedBy,
        };
        setBranchLedgers((prev) => [adjEntry, ...prev]);
      }
    });

    return true;
  };

  const deleteBranchDailyClosing = (closingId: string) => {
    setBranchDailyClosings((prev) => prev.filter((c) => c.id !== closingId));
  };

  /**
   * 6. RECIPE MANAGEMENT - BRANCH SPECIFIC
   */
  const saveRecipe = (recipe: Recipe) => {
    setRecipes((prev) => {
      const idx = prev.findIndex((r) => r.id === recipe.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = recipe;
        return updated;
      }
      return [recipe, ...prev];
    });
  };

  const deleteRecipe = (id: string, scope: 'thisBranch' | 'allBranches' = 'thisBranch') => {
    const target = recipes.find((r) => r.id === id);
    if (!target) return;

    if (scope === 'allBranches') {
      const targetNameEn = (target.nameEn || '').trim().toLowerCase();
      const targetNameAm = (target.nameAm || '').trim().toLowerCase();
      setRecipes((prev) =>
        prev.filter((r) => {
          if (r.id === id) return false;
          if (targetNameEn && r.nameEn && r.nameEn.trim().toLowerCase() === targetNameEn) return false;
          if (targetNameAm && r.nameAm && r.nameAm.trim().toLowerCase() === targetNameAm) return false;
          return true;
        })
      );
      logAuditTrail({
        action: 'delete_recipe_all_branches',
        details: `Deleted recipe "${target.nameEn || target.nameAm}" from all branches`,
        branchId: target.branchId,
      });
    } else {
      setRecipes((prev) => prev.filter((r) => r.id !== id));
      logAuditTrail({
        action: 'delete_recipe',
        details: `Deleted recipe "${target.nameEn || target.nameAm}" from branch`,
        branchId: target.branchId,
      });
    }
  };

  /**
   * Clone a recipe to another branch with customized price or portions
   */
  const duplicateRecipeToBranch = (
    sourceRecipeId: string,
    targetBranchId: string,
    customPrice?: number
  ): Recipe | null => {
    const source = recipes.find((r) => r.id === sourceRecipeId);
    if (!source) return null;

    const newRecipe: Recipe = {
      ...source,
      id: `rec-${targetBranchId}-${Date.now().toString().slice(-4)}`,
      branchId: targetBranchId,
      sellingPrice: customPrice !== undefined ? customPrice : source.sellingPrice,
      isActive: true,
    };

    saveRecipe(newRecipe);
    return newRecipe;
  };

  /**
   * 7. SCHEDULES & PRODUCTION
   */
  const saveSchedule = (schedule: ProductionSchedule) => {
    setSchedules((prev) => {
      const idx = prev.findIndex((s) => s.id === schedule.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = schedule;
        return updated;
      }
      return [schedule, ...prev];
    });
  };

  const deleteSchedule = (id: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== id));
  };

  /**
   * 7.5 STAFF MEALS & CONTROLLING (ከሰኞ እስከ አርብ እና በፐርሰን የሚሰራ ኮንትሮሊንግ)
   */
  const saveStaffMealRecipe = (recipe: StaffMealRecipe) => {
    setStaffMealRecipes((prev) => {
      const idx = prev.findIndex((r) => r.id === recipe.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = recipe;
        return updated;
      }
      return [recipe, ...prev];
    });
  };

  const deleteStaffMealRecipe = (id: string) => {
    setStaffMealRecipes((prev) => prev.filter((r) => r.id !== id));
  };

  const saveStaffMember = (member: StaffMember) => {
    setStaffMembers((prev) => {
      const idx = prev.findIndex((m) => m.id === member.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = member;
        return updated;
      }
      return [member, ...prev];
    });
  };

  const deleteStaffMember = (id: string) => {
    setStaffMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const saveStaffWeeklySchedule = (schedule: StaffWeeklySchedule) => {
    setStaffWeeklySchedules((prev) => {
      const idx = prev.findIndex(
        (s) =>
          s.id === schedule.id ||
          (s.branchId === schedule.branchId && s.weekStartDate === schedule.weekStartDate)
      );
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = schedule;
        return updated;
      }
      return [schedule, ...prev];
    });
  };

  const executeStaffMealAndDeduct = (
    execution: StaffMealExecution
  ): { success: boolean; error?: string } => {
    if (!execution.branchId || !execution.recipeId || execution.headcount <= 0) {
      return {
        success: false,
        error:
          'ቅርንጫፍ፣ የሰራተኞች ሪሲፒ እና ትክክለኛ የሰራተኛ ቁጥር መመረጥ አለበት (Branch, recipe, and headcount required).',
      };
    }

    // Create branch ledger entries for each consumed ingredient
    const newLedgerEntries: BranchLedgerEntry[] = [];
    execution.ingredientDetails.forEach((ing) => {
      if (ing.totalQtyUsed <= 0) return;
      const curBal = getBranchStockBalance(execution.branchId, ing.itemId);
      const newBal = curBal - ing.totalQtyUsed;

      const entry: BranchLedgerEntry = {
        id: `bled-stf-${execution.id}-${ing.itemId}-${Math.random().toString(36).substring(2, 6)}`,
        branchId: execution.branchId,
        itemId: ing.itemId,
        date: execution.date,
        ethiopianDateStr: execution.ethiopianDateStr,
        refNo: `STF-${execution.id.slice(-6)}`,
        type: 'STAFF_MEAL',
        quantityIn: 0,
        quantityOut: ing.totalQtyUsed,
        balance: newBal,
        unitCost: ing.unitCost,
        totalValue: Number(ing.totalCost.toFixed(2)),
        sellingPrice: 0,
        cashRevenue: 0,
        beneficiaryOrGuest: `${execution.headcount} ሰራተኞች: ${execution.staffNames.slice(0, 3).join(', ')}${
          execution.staffNames.length > 3 ? ` ወዘተ (${execution.headcount} ሰው)` : ''
        }`,
        recipeId: execution.recipeId,
        portionsSold: execution.headcount,
        reasonOrMenu: `የሰራተኞች ምግብ: ${execution.recipeNameAm} (${execution.headcount} ሰራተኛ - በፐርሰን ${execution.costPerPersonETB.toFixed(2)} ብር)`,
        recordedBy: execution.cookingChef || 'የወጥ ቤት ሃላፊ / Staff Kitchen Chef',
      };
      newLedgerEntries.push(entry);
    });

    setBranchLedgers((prev) => [...newLedgerEntries, ...prev]);
    setStaffMealExecutions((prev) => [execution, ...prev]);
    return { success: true };
  };

  const deleteStaffMealExecution = (id: string) => {
    setStaffMealExecutions((prev) => prev.filter((e) => e.id !== id));
  };

  /**
   * 7.8 KITCHEN PREP (SUB-RECIPES) & BATCH PRODUCTION
   * ቦሎኛይስ ሶስ፣ ፔስቶ ሶስ፣ ዛፈራኖ፣ ቶማቶ ሶስ፣ የበርገር ፓቲ እና የፒዛ ስጋ ዝግጅት
   */
  const saveKitchenPrepItem = (item: KitchenPrepItem) => {
    setKitchenPrepItems((prev) => {
      const idx = prev.findIndex((p) => p.id === item.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = item;
        return updated;
      }
      return [item, ...prev];
    });
  };

  const deleteKitchenPrepItem = (id: string) => {
    setKitchenPrepItems((prev) => prev.filter((p) => p.id !== id));
  };

  const recordKitchenPrepProduction = (payload: {
    branchId: string;
    prepItemId: string;
    quantityProduced: number;
    date?: string;
    notes?: string;
  }): { success: boolean; error?: string; batch?: KitchenPrepBatch } => {
    const { branchId, prepItemId, quantityProduced, notes } = payload;
    const date = payload.date || getTodayDateString();
    const ethDate = formatEthiopianDate(date);

    if (!branchId || !prepItemId || quantityProduced <= 0) {
      return { success: false, error: 'ትክክለኛ ቅርንጫፍ፣ የዝግጅት እቃ እና የተመረተ መጠን ያስፈልጋል' };
    }

    const prepItem = kitchenPrepItems.find((p) => p.id === prepItemId);
    if (!prepItem) {
      return { success: false, error: 'የተመረጠው የቅድመ-ዝግጅት ሪሲፒ አልተገኘም' };
    }

    const ratio = quantityProduced / (prepItem.batchYield || 1);
    const newLedgerEntries: BranchLedgerEntry[] = [];
    const deductedItems: {
      itemId: string;
      itemNameAm: string;
      quantityDeducted: number;
      unitAm: string;
      unitCost: number;
      subTotalCost: number;
    }[] = [];

    let totalCostETB = 0;

    prepItem.ingredients.forEach((ing) => {
      const item = items.find((i) => i.id === ing.itemId);
      if (!item) return;

      const rawNeeded = Number((ing.quantity * ratio).toFixed(3));
      const curBal = getBranchStockBalance(branchId, ing.itemId);
      const newBal = Number((curBal - rawNeeded).toFixed(3));
      const unitCost = item.weightedAvgCost || item.lastPurchasePrice || 1;
      const subTotal = Number((rawNeeded * unitCost).toFixed(2));
      totalCostETB += subTotal;

      const entry: BranchLedgerEntry = {
        id: `bled-prep-${Date.now()}-${ing.itemId}-${Math.random().toString(36).substring(2, 5)}`,
        branchId,
        itemId: ing.itemId,
        date,
        ethiopianDateStr: ethDate,
        refNo: `PREP-${Date.now().toString().slice(-4)}`,
        type: 'KITCHEN_USAGE',
        quantityIn: 0,
        quantityOut: rawNeeded,
        balance: newBal,
        unitCost,
        totalValue: subTotal,
        sellingPrice: 0,
        cashRevenue: 0,
        reasonOrMenu: `ለ${prepItem.nameAm} ዝግጅት የወጣ (${quantityProduced} ${prepItem.outputUnitAm})`,
        recordedBy: 'የኩሽና ቁጥጥር / Kitchen Prep Control',
      };
      newLedgerEntries.push(entry);

      deductedItems.push({
        itemId: ing.itemId,
        itemNameAm: item.nameAm,
        quantityDeducted: rawNeeded,
        unitAm: item.unitAm,
        unitCost,
        subTotalCost: subTotal,
      });
    });

    const batch: KitchenPrepBatch = {
      id: `prep-batch-${Date.now()}`,
      branchId,
      prepItemId,
      prepItemNameAm: prepItem.nameAm,
      prepItemNameEn: prepItem.nameEn,
      date,
      ethiopianDateStr: ethDate,
      quantityProduced,
      outputUnitAm: prepItem.outputUnitAm,
      totalCostETB: Number(totalCostETB.toFixed(2)),
      deductedItems,
      notes,
      recordedBy: 'ስራ አስኪያጅ / Owner Control',
      createdAt: new Date().toISOString(),
    };

    setBranchLedgers((prev) => [...newLedgerEntries, ...prev]);
    setKitchenPrepBatches((prev) => [batch, ...prev]);

    return { success: true, batch };
  };

  const deleteKitchenPrepBatch = (id: string) => {
    setKitchenPrepBatches((prev) => prev.filter((b) => b.id !== id));
  };

  /**
   * 8. BRANCH & ITEM MASTERS
   */
  const addNewBranch = (branch: Branch) => {
    setBranches((prev) => [...prev, branch]);
  };

  const deleteBranch = (id: string) => {
    setBranches((prev) => prev.filter((b) => b.id !== id));
  };

  const createDefaultThreeBranches = () => {
    const defaultBranches: Branch[] = [
      {
        id: 'br-bole',
        code: 'BR-BOL-01',
        nameAm: 'ቦሌ ቅርንጫፍ',
        nameEn: 'Bole Branch',
        location: 'ቦሌ መድኃኔዓለም ፊት ለፊት',
        manager: 'አቶ ዳዊት ከበደ',
        phone: '+251 911 234 567',
      },
      {
        id: 'br-piassa',
        code: 'BR-PIA-02',
        nameAm: 'ፒያሳ ቅርንጫፍ',
        nameEn: 'Piassa Branch',
        location: 'ቸርችል ጎዳና፣ ቴዎድሮስ አደባባይ',
        manager: 'ወ/ሮ ትዕግስት ኃይሉ',
        phone: '+251 911 345 678',
      },
      {
        id: 'br-cmc',
        code: 'BR-CMC-03',
        nameAm: 'ሲኤምሲ ቅርንጫፍ',
        nameEn: 'CMC Branch',
        location: 'ሲኤምሲ ሚካኤል አደባባይ',
        manager: 'አቶ ዮናስ ታደሰ',
        phone: '+251 911 456 789',
      },
    ];
    setBranches(defaultBranches);
  };

  const addNewItem = (item: InventoryItem) => {
    setItems((prev) => [...prev, item]);
  };

  const bulkMergeItems = (newItems: InventoryItem[]) => {
    setItems((prev) => {
      const map = new Map<string, InventoryItem>();
      prev.forEach((item) => map.set(item.id, item));
      newItems.forEach((item) => map.set(item.id, item));
      return Array.from(map.values());
    });
  };

  const deleteItem = (id: string) => {
    setItems((prev) => {
      const updated = prev.filter((i) => i.id !== id);
      fetch('/api/store/sync-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: updated }),
      }).catch(() => {});
      return updated;
    });
  };

  /**
   * 9. SMART RECONCILIATION ENGINE
   */
  const calculateSmartReconciliation = (
    branchId: string,
    date: string,
    dishesSold: { recipeId: string; quantitySold: number }[],
    physicalUsageMap: Record<string, number>,
    notes?: string,
    chefDishesProduced: { recipeId: string; quantityProduced: number }[] = [],
    managementDishes: { recipeId: string; quantityConsumed: number }[] = [],
    beginningStockMap: Record<string, number> = {},
    endingStockMap: Record<string, number> = {},
    transfersInMap: Record<string, number> = {},
    prepEndingFridgeStockMap: Record<string, number> = {}
  ): ReconciliationSession => {
    const ethDate = formatEthiopianDate(date);
    const ingredientAggregation: Record<
      string,
      {
        totalTheoretical: number;
        sharedDishes: {
          recipeNameAm: string;
          recipeNameEn: string;
          portionSold: number;
          ingredientPerPortion: number;
          subTotalRequired: number;
        }[];
      }
    > = {};

    // 1. Calculate from Cash Register Sales
    dishesSold.forEach((dish) => {
      if (dish.quantitySold <= 0) return;
      const recipe = recipes.find((r) => r.id === dish.recipeId);
      if (!recipe) return;

      recipe.ingredients.forEach((ing) => {
        if (!ingredientAggregation[ing.itemId]) {
          ingredientAggregation[ing.itemId] = {
            totalTheoretical: 0,
            sharedDishes: [],
          };
        }
        const needed = dish.quantitySold * ing.quantity;
        ingredientAggregation[ing.itemId].totalTheoretical += needed;
        ingredientAggregation[ing.itemId].sharedDishes.push({
          recipeNameAm: `${recipe.nameAm} (ሽያጭ)`,
          recipeNameEn: `${recipe.nameEn} (Cash Sale)`,
          portionSold: dish.quantitySold,
          ingredientPerPortion: ing.quantity,
          subTotalRequired: Number(needed.toFixed(3)),
        });
      });
    });

    // 2. Calculate from Management / Signed Meals
    managementDishes.forEach((dish) => {
      if (dish.quantityConsumed <= 0) return;
      const recipe = recipes.find((r) => r.id === dish.recipeId);
      if (!recipe) return;

      recipe.ingredients.forEach((ing) => {
        if (!ingredientAggregation[ing.itemId]) {
          ingredientAggregation[ing.itemId] = {
            totalTheoretical: 0,
            sharedDishes: [],
          };
        }
        const needed = dish.quantityConsumed * ing.quantity;
        ingredientAggregation[ing.itemId].totalTheoretical += needed;
        ingredientAggregation[ing.itemId].sharedDishes.push({
          recipeNameAm: `${recipe.nameAm} (ማኔጅመንት)`,
          recipeNameEn: `${recipe.nameEn} (Management)`,
          portionSold: dish.quantityConsumed,
          ingredientPerPortion: ing.quantity,
          subTotalRequired: Number(needed.toFixed(3)),
        });
      });
    });

    const details: IngredientReconciliationDetail[] = [];
    let totalVarianceCostETB = 0;

    const allItemIds = new Set([
      ...Object.keys(ingredientAggregation),
      ...Object.keys(beginningStockMap),
      ...Object.keys(endingStockMap),
      ...Object.keys(physicalUsageMap),
    ]);

    allItemIds.forEach((itemId) => {
      const item = items.find((i) => i.id === itemId);
      if (!item) return;

      const agg = ingredientAggregation[itemId] || { totalTheoretical: 0, sharedDishes: [] };
      const theoretical = Number(agg.totalTheoretical.toFixed(3));

      const beg = beginningStockMap[itemId] !== undefined ? beginningStockMap[itemId] : getBranchStockBalance(branchId, itemId);
      const trans = transfersInMap[itemId] !== undefined ? transfersInMap[itemId] : 0;
      const totalAvail = Number((beg + trans).toFixed(3));
      
      const ending = endingStockMap[itemId] !== undefined ? endingStockMap[itemId] : 0;
      
      // Calculate actual physical consumption: (Beginning + In) - Ending
      let actual = 0;
      if (physicalUsageMap[itemId] !== undefined) {
        actual = physicalUsageMap[itemId];
      } else if (endingStockMap[itemId] !== undefined) {
        actual = Math.max(0, Number((totalAvail - ending).toFixed(3)));
      } else {
        actual = theoretical;
      }

      const variance = Number((actual - theoretical).toFixed(3));
      const variancePercent = theoretical > 0 ? Number(((variance / theoretical) * 100).toFixed(1)) : 0;
      const costPerUnit = item.weightedAvgCost || item.lastPurchasePrice || 1;
      const financialImpact = Number((variance * costPerUnit).toFixed(2));
      totalVarianceCostETB += financialImpact;

      let status: 'balanced' | 'shortage' | 'excess' | 'critical' = 'balanced';
      if (variance > 0.005) {
        status = variancePercent > 15 ? 'critical' : 'shortage';
      } else if (variance < -0.005) {
        status = 'excess';
      }

      details.push({
        itemId,
        itemNameAm: item.nameAm,
        itemNameEn: item.nameEn,
        unit: item.unit,
        unitAm: item.unitAm,
        unitCost: costPerUnit,
        beginningStock: beg,
        transfersIn: trans,
        totalAvailable: totalAvail,
        endingStock: ending,
        theoreticalRequired: theoretical,
        physicalActualUsed: actual,
        variance,
        variancePercent,
        financialImpactETB: financialImpact,
        status,
        sharedRecipes: agg.sharedDishes,
      });
    });

    const totalCashRevenueETB = dishesSold.reduce((acc, d) => {
      const r = recipes.find((x) => x.id === d.recipeId);
      return acc + (d.quantitySold * (r?.sellingPrice || 0));
    }, 0);

    const totalManagementCostETB = (managementDishes || []).reduce((acc, d) => {
      const r = recipes.find((x) => x.id === d.recipeId);
      return acc + (d.quantityConsumed * (r?.sellingPrice || 0));
    }, 0);

    // 3. Calculate Kitchen Prep Reconciliations (የተዘጋጁ ሶሶችና ፓቲዎች ቆጠራ እና ሪኮንሲሌሽን)
    const prepDetails: KitchenPrepReconciliationDetail[] = [];
    const activePrepItems = kitchenPrepItems.filter(
      (p) => !p.branchId || p.branchId === 'all' || p.branchId === branchId
    );

    activePrepItems.forEach((prep) => {
      const producedToday = kitchenPrepBatches
        .filter((b) => b.branchId === branchId && b.date === date && b.prepItemId === prep.id)
        .reduce((sum, b) => sum + b.quantityProduced, 0);

      let theoreticalUsed = 0;
      const usedInDishes: {
        dishNameAm: string;
        portionSold: number;
        saucePerPortion: number;
        totalSauceRequired: number;
      }[] = [];

      const allDishes = [
        ...dishesSold.map((d) => ({ recipeId: d.recipeId, qty: d.quantitySold, type: 'ሽያጭ' })),
        ...(managementDishes || []).map((d) => ({ recipeId: d.recipeId, qty: d.quantityConsumed, type: 'ማኔጅመንት' })),
      ];

      allDishes.forEach(({ recipeId, qty, type }) => {
        if (qty <= 0) return;
        const recipe = recipes.find((r) => r.id === recipeId);
        if (!recipe) return;

        recipe.ingredients.forEach((ing) => {
          if (
            (ing.isPrepItem && (ing.itemId === prep.id || ing.prepItemId === prep.id)) ||
            ing.itemId === prep.id
          ) {
            const req = Number((qty * ing.quantity).toFixed(3));
            theoreticalUsed += req;
            usedInDishes.push({
              dishNameAm: `${recipe.nameAm} (${type})`,
              portionSold: qty,
              saucePerPortion: ing.quantity,
              totalSauceRequired: req,
            });
          }
        });
      });

      const beginningFridgeStock = 0;
      const totalAvailable = Number((beginningFridgeStock + producedToday).toFixed(3));
      const endingFridgeStock = prepEndingFridgeStockMap && prepEndingFridgeStockMap[prep.id] !== undefined
        ? prepEndingFridgeStockMap[prep.id]
        : Math.max(0, Number((totalAvailable - theoreticalUsed).toFixed(3)));

      const actualUsed = Math.max(0, Number((totalAvailable - endingFridgeStock).toFixed(3)));
      const variance = Number((actualUsed - theoreticalUsed).toFixed(3));

      let status: 'balanced' | 'shortage' | 'excess' = 'balanced';
      if (variance > 0.01) {
        status = 'shortage';
      } else if (variance < -0.01) {
        status = 'excess';
      }

      if (producedToday > 0 || theoreticalUsed > 0 || endingFridgeStock > 0 || prep.isActive) {
        prepDetails.push({
          prepItemId: prep.id,
          nameAm: prep.nameAm,
          nameEn: prep.nameEn,
          outputUnitAm: prep.outputUnitAm,
          beginningFridgeStock,
          producedToday,
          totalAvailable,
          theoreticalUsed: Number(theoreticalUsed.toFixed(3)),
          endingFridgeStock,
          actualUsed,
          variance,
          status,
          usedInDishes,
        });
      }
    });

    const session: ReconciliationSession = {
      id: `rec-sess-${Date.now()}`,
      branchId,
      date,
      ethiopianDateStr: ethDate,
      dishesSold,
      chefDishesProduced,
      managementDishes,
      details,
      prepDetails,
      totalVarianceCostETB: Number(totalVarianceCostETB.toFixed(2)),
      totalCashRevenueETB: Number(totalCashRevenueETB.toFixed(2)),
      totalManagementCostETB: Number(totalManagementCostETB.toFixed(2)),
      status: 'draft',
      notes,
      createdAt: new Date().toISOString(),
    };

    setReconciliations((prev) => [session, ...prev]);
    return session;
  };

  const commitReconciliationToLedger = (reconciliationId: string): boolean => {
    const session = reconciliations.find((s) => s.id === reconciliationId);
    if (!session) return false;

    session.details.forEach((detail) => {
      const curBal = getBranchStockBalance(session.branchId, detail.itemId);
      const newBal = curBal - detail.physicalActualUsed;

      const ledgerEntry: BranchLedgerEntry = {
        id: `bled-rec-${session.id}-${detail.itemId}`,
        branchId: session.branchId,
        itemId: detail.itemId,
        date: session.date,
        ethiopianDateStr: session.ethiopianDateStr,
        refNo: `REC-ADJ-${session.id.slice(-4)}`,
        type: 'RECONCILIATION_ADJ',
        quantityIn: 0,
        quantityOut: detail.physicalActualUsed,
        balance: newBal,
        unitCost: detail.unitCost,
        totalValue: Number((detail.physicalActualUsed * detail.unitCost).toFixed(2)),
        reasonOrMenu: `ስማርት ሪኮንሲሌሽን: የተሰላ ${detail.theoreticalRequired}${detail.unitAm}፣ የወጣ ${detail.physicalActualUsed}${detail.unitAm} (ልዩነት: ${detail.variance}${detail.unitAm})`,
        recordedBy: 'የቅርንጫፍ ተቆጣጣሪ (Reconciliation Auditor)',
      };

      setBranchLedgers((prev) => [ledgerEntry, ...prev]);
    });

    setReconciliations((prev) =>
      prev.map((s) => (s.id === reconciliationId ? { ...s, status: 'approved' } : s))
    );

    return true;
  };

  // Full clean wipe function (resets everything cleanly to 0 across state, localStorage, IndexedDB, and server)
  const clearAllDataCompletely = () => {
    setItems([]);
    setBranches(DEFAULT_BELLO_FAM_BRANCHES);
    setCentralBinCards([]);
    setBranchLedgers([]);
    setRecipes([]);
    setSchedules([]);
    setReconciliations([]);
    setBranchDailyClosings([]);
    setStaffMealRecipes([]);
    setStaffMembers([]);
    setStaffWeeklySchedules([]);
    setStaffMealExecutions([]);
    setKitchenPrepItems([]);
    setKitchenPrepBatches([]);
    setCentralStoreResets([]);
    setCentralSentToEntries([]);
    setBranchTrackedItems([]);
    setBranchDailyModules([]);
    setBranchInterTransfers([]);
    setAuditCorrections([]);
    setExpenses([]);
    setDepartmentForms([]);
    setAutomatedReports([]);
    setUploadedBatches([]);
    setLearnedAliases([]);
    setFullReconciliationReports([]);
    setBranchDailySheets([]);
    setSelectedPrimaryItemIds([]);
    setHotels([DEFAULT_HOTEL]);
    setCurrentHotelIdState(DEFAULT_HOTEL.id);

    clearLocalBusinessStorageKeys();
    clearAllPersistentDB();
    fetch('/api/store/reset-zero', { method: 'POST' }).catch(() => {});
  };

  const loadSampleTemplate = () => {
    clearAllDataCompletely();
  };

  const restoreOriginalBaselineData = () => {
    clearAllDataCompletely();
  };

  const createManualSnapshot = async (label: string): Promise<BackupSnapshot | null> => {
    return await saveBackupSnapshot(label, {
      version: '4.0.0',
      exportedAt: new Date().toISOString(),
      systemName: 'Ethiopian Enterprise ERP - Master Data Vault',
      items,
      branches,
      centralBinCards,
      branchLedgers,
      recipes,
      schedules,
      reconciliations,
      branchDailyClosings,
      staffMealRecipes,
      staffMembers,
      staffWeeklySchedules,
      staffMealExecutions,
      centralStoreResets,
      centralSentToEntries,
      branchTrackedItems,
      branchDailyModules,
      branchInterTransfers,
      auditCorrections,
    });
  };

  const loadAllSnapshots = async (): Promise<BackupSnapshot[]> => {
    return await getAllBackupSnapshots();
  };

  const restoreSnapshotById = async (snapshot: BackupSnapshot): Promise<boolean> => {
    try {
      const backup = snapshot.data;
      if (backup.items) setItems(backup.items);
      if (backup.branches) setBranches(backup.branches);
      if (backup.centralBinCards) setCentralBinCards(backup.centralBinCards);
      if (backup.branchLedgers) setBranchLedgers(backup.branchLedgers);
      if (backup.recipes) setRecipes(backup.recipes);
      if (backup.schedules) setSchedules(backup.schedules);
      if (backup.reconciliations) setReconciliations(backup.reconciliations);
      if (backup.branchDailyClosings) setBranchDailyClosings(backup.branchDailyClosings);
      if (backup.staffMealRecipes) setStaffMealRecipes(backup.staffMealRecipes);
      if (backup.staffMembers) setStaffMembers(backup.staffMembers);
      if (backup.staffWeeklySchedules) setStaffWeeklySchedules(backup.staffWeeklySchedules);
      if (backup.staffMealExecutions) setStaffMealExecutions(backup.staffMealExecutions);
      if (backup.centralStoreResets) setCentralStoreResets(backup.centralStoreResets);
      if (backup.centralSentToEntries) setCentralSentToEntries(backup.centralSentToEntries);
      if (backup.branchTrackedItems) setBranchTrackedItems(backup.branchTrackedItems);
      if (backup.branchDailyModules) setBranchDailyModules(backup.branchDailyModules);
      if (backup.branchInterTransfers) setBranchInterTransfers(backup.branchInterTransfers);
      if (backup.auditCorrections) setAuditCorrections(backup.auditCorrections);

      await saveToPersistentDB('items', backup.items || []);
      await saveToPersistentDB('branches', backup.branches || []);
      await saveToPersistentDB('centralBinCards', backup.centralBinCards || []);
      await saveToPersistentDB('branchLedgers', backup.branchLedgers || []);
      await saveToPersistentDB('recipes', backup.recipes || []);
      await saveToPersistentDB('schedules', backup.schedules || []);
      await saveToPersistentDB('reconciliations', backup.reconciliations || []);
      await saveToPersistentDB('branchDailyClosings', backup.branchDailyClosings || []);
      await saveToPersistentDB('staffMealRecipes', backup.staffMealRecipes || []);
      await saveToPersistentDB('staffMembers', backup.staffMembers || []);
      await saveToPersistentDB('staffWeeklySchedules', backup.staffWeeklySchedules || []);
      await saveToPersistentDB('staffMealExecutions', backup.staffMealExecutions || []);
      return true;
    } catch (err) {
      console.error('Failed to restore snapshot:', err);
      return false;
    }
  };

  const deleteSnapshotById = async (id: string): Promise<boolean> => {
    return await deleteBackupSnapshot(id);
  };

  const exportFullBackup = () => {
    downloadDatabaseBackup({
      items,
      branches,
      centralBinCards,
      branchLedgers,
      recipes,
      schedules,
      reconciliations,
      branchDailyClosings,
      staffMealRecipes,
      staffMembers,
      staffWeeklySchedules,
      staffMealExecutions,
      centralStoreResets,
      centralSentToEntries,
      branchTrackedItems,
      branchDailyModules,
      branchInterTransfers,
      auditCorrections,
    });
  };

  const restoreBackupFromFile = async (file: File): Promise<boolean> => {
    try {
      const backup = await readDatabaseBackupFile(file);
      if (backup.items) setItems(backup.items);
      if (backup.branches) setBranches(backup.branches);
      if (backup.centralBinCards) setCentralBinCards(backup.centralBinCards);
      if (backup.branchLedgers) setBranchLedgers(backup.branchLedgers);
      if (backup.recipes) setRecipes(backup.recipes);
      if (backup.schedules) setSchedules(backup.schedules);
      if (backup.reconciliations) setReconciliations(backup.reconciliations);
      if (backup.branchDailyClosings) setBranchDailyClosings(backup.branchDailyClosings);
      if (backup.staffMealRecipes) setStaffMealRecipes(backup.staffMealRecipes);
      if (backup.staffMembers) setStaffMembers(backup.staffMembers);
      if (backup.staffWeeklySchedules) setStaffWeeklySchedules(backup.staffWeeklySchedules);
      if (backup.staffMealExecutions) setStaffMealExecutions(backup.staffMealExecutions);

      await saveToPersistentDB('items', backup.items || []);
      await saveToPersistentDB('branches', backup.branches || []);
      await saveToPersistentDB('centralBinCards', backup.centralBinCards || []);
      await saveToPersistentDB('branchLedgers', backup.branchLedgers || []);
      await saveToPersistentDB('recipes', backup.recipes || []);
      await saveToPersistentDB('schedules', backup.schedules || []);
      await saveToPersistentDB('reconciliations', backup.reconciliations || []);
      await saveToPersistentDB('branchDailyClosings', backup.branchDailyClosings || []);
      await saveToPersistentDB('staffMealRecipes', backup.staffMealRecipes || []);
      await saveToPersistentDB('staffMembers', backup.staffMembers || []);
      await saveToPersistentDB('staffWeeklySchedules', backup.staffWeeklySchedules || []);
      await saveToPersistentDB('staffMealExecutions', backup.staffMealExecutions || []);
      return true;
    } catch (err) {
      console.error('Failed to restore backup:', err);
      return false;
    }
  };

  const getSyncCode = (): string => {
    return generateSyncCode({
      items,
      branches,
      centralBinCards,
      branchLedgers,
      recipes,
      schedules,
      reconciliations,
      branchDailyClosings,
      staffMealRecipes,
      staffMembers,
      staffWeeklySchedules,
      staffMealExecutions,
    });
  };

  const applySyncCode = async (code: string): Promise<boolean> => {
    try {
      const backup = parseSyncCode(code);
      if (!backup) return false;
      if (backup.items) setItems(backup.items);
      if (backup.branches) setBranches(backup.branches);
      if (backup.centralBinCards) setCentralBinCards(backup.centralBinCards);
      if (backup.branchLedgers) setBranchLedgers(backup.branchLedgers);
      if (backup.recipes) setRecipes(backup.recipes);
      if (backup.schedules) setSchedules(backup.schedules);
      if (backup.reconciliations) setReconciliations(backup.reconciliations);
      if (backup.branchDailyClosings) setBranchDailyClosings(backup.branchDailyClosings);
      if (backup.staffMealRecipes) setStaffMealRecipes(backup.staffMealRecipes);
      if (backup.staffMembers) setStaffMembers(backup.staffMembers);
      if (backup.staffWeeklySchedules) setStaffWeeklySchedules(backup.staffWeeklySchedules);
      if (backup.staffMealExecutions) setStaffMealExecutions(backup.staffMealExecutions);

      await saveToPersistentDB('items', backup.items || []);
      await saveToPersistentDB('branches', backup.branches || []);
      await saveToPersistentDB('centralBinCards', backup.centralBinCards || []);
      await saveToPersistentDB('branchLedgers', backup.branchLedgers || []);
      await saveToPersistentDB('recipes', backup.recipes || []);
      await saveToPersistentDB('schedules', backup.schedules || []);
      await saveToPersistentDB('reconciliations', backup.reconciliations || []);
      await saveToPersistentDB('branchDailyClosings', backup.branchDailyClosings || []);
      await saveToPersistentDB('staffMealRecipes', backup.staffMealRecipes || []);
      await saveToPersistentDB('staffMembers', backup.staffMembers || []);
      await saveToPersistentDB('staffWeeklySchedules', backup.staffWeeklySchedules || []);
      await saveToPersistentDB('staffMealExecutions', backup.staffMealExecutions || []);
      return true;
    } catch (err) {
      console.error('Failed to apply sync code:', err);
      return false;
    }
  };

  // --------------------------------------------------------------------------
  // FRESH START (OPENING BALANCE RESET / CUT-OVER) ACTIONS
  // --------------------------------------------------------------------------
  const activateCutOver = (managerName: string, cutOverDate: string) => {
    setCutOverState((prev) => {
      const updatedDepts: Record<string, DepartmentCutOverStatus> = {};
      ['central_store', ...branches.map((b) => b.id)].forEach((deptId) => {
        const deptName = deptId === 'central_store' ? 'ማዕከላዊ ስቶር' : (branches.find((b) => b.id === deptId)?.nameAm || deptId);
        updatedDepts[deptId] = {
          departmentId: deptId,
          departmentName: deptName,
          isConfirmed: false,
          items: items.map((it) => ({
            itemId: it.id,
            itemNameAm: it.nameAm,
            itemNameEn: it.nameEn,
            unit: it.unitAm || it.unit,
            unitCost: it.lastPurchasePrice || it.weightedAvgCost || 0,
            countedQuantity: 0,
            totalOpeningValue: 0,
          })),
          totalDepartmentValue: 0,
        };
      });

      return {
        isActive: true,
        cutOverDate,
        ethiopianCutOverDate: formatEthiopianDate(cutOverDate),
        authorizedManager: managerName,
        activatedAt: new Date().toISOString(),
        auditTrail: [
          {
            id: `audit-${Date.now()}`,
            timestamp: new Date().toLocaleString(),
            manager: managerName,
            action: 'CUT_OVER_RESET_ACTIVATED',
            details: `All opening balances reset to 0 starting from ${cutOverDate}`,
          },
          ...prev.auditTrail,
        ],
        departments: updatedDepts,
      };
    });
  };

  const saveDepartmentOpeningCount = (
    departmentId: string,
    counts: Array<{ itemId: string; count: number }>,
    managerName: string
  ): boolean => {
    setCutOverState((prev) => {
      const dept = prev.departments[departmentId] || {
        departmentId,
        departmentName: departmentId === 'central_store' ? 'ማዕከላዊ ስቶር' : (branches.find((b) => b.id === departmentId)?.nameAm || departmentId),
        isConfirmed: false,
        items: [],
        totalDepartmentValue: 0,
      };

      let totalVal = 0;
      const updatedItems: DepartmentOpeningStock[] = items.map((it) => {
        const match = counts.find((c) => c.itemId === it.id);
        const qty = match ? Math.max(0, match.count) : 0;
        const unitCost = it.lastPurchasePrice || it.weightedAvgCost || 0;
        const itemTotal = qty * unitCost;
        totalVal += itemTotal;
        return {
          itemId: it.id,
          itemNameAm: it.nameAm,
          itemNameEn: it.nameEn,
          unit: it.unitAm || it.unit,
          unitCost,
          countedQuantity: qty,
          totalOpeningValue: itemTotal,
        };
      });

      return {
        ...prev,
        auditTrail: [
          {
            id: `audit-${Date.now()}`,
            timestamp: new Date().toLocaleString(),
            manager: managerName,
            action: 'DEPARTMENT_COUNT_SAVED',
            details: `Opening counts saved for ${dept.departmentName}. Total value: ${totalVal.toFixed(2)} ETB`,
          },
          ...prev.auditTrail,
        ],
        departments: {
          ...prev.departments,
          [departmentId]: {
            ...dept,
            items: updatedItems,
            totalDepartmentValue: totalVal,
          },
        },
      };
    });
    return true;
  };

  const confirmDepartmentCutOver = (departmentId: string, managerName: string): boolean => {
    setCutOverState((prev) => {
      const dept = prev.departments[departmentId];
      if (!dept) return prev;

      if (departmentId !== 'central_store') {
        const newLedgerEntries: BranchLedgerEntry[] = dept.items
          .filter((it) => it.countedQuantity > 0)
          .map((it, idx) => ({
            id: `bled-cutover-${departmentId}-${it.itemId}-${Date.now()}-${idx}`,
            branchId: departmentId,
            itemId: it.itemId,
            date: prev.cutOverDate || getTodayDateString(),
            ethiopianDateStr: formatEthiopianDate(prev.cutOverDate || getTodayDateString()),
            refNo: `CUTOVER-BEG-${Date.now().toString().slice(-4)}`,
            type: 'BEGINNING_STOCK',
            quantityIn: it.countedQuantity,
            quantityOut: 0,
            balance: it.countedQuantity,
            unitCost: it.unitCost,
            totalValue: it.totalOpeningValue,
            reasonOrMenu: 'Cut-Over Fresh Start Opening Balance',
            beneficiaryOrGuest: 'Cut-Over Physical Count Verification',
            notes: `Authorized by ${managerName}`,
            recordedBy: managerName,
          }));

        if (newLedgerEntries.length > 0) {
          setBranchLedgers((lPrev) => [...newLedgerEntries, ...lPrev]);
        }
      }

      return {
        ...prev,
        auditTrail: [
          {
            id: `audit-${Date.now()}`,
            timestamp: new Date().toLocaleString(),
            manager: managerName,
            action: 'DEPARTMENT_COUNT_LOCKED_CONFIRMED',
            details: `Department opening stock confirmed & locked for ${dept.departmentName}. Reconciliation now unlocked.`,
          },
          ...prev.auditTrail,
        ],
        departments: {
          ...prev.departments,
          [departmentId]: {
            ...dept,
            isConfirmed: true,
            confirmedAt: new Date().toISOString(),
            confirmedBy: managerName,
          },
        },
      };
    });
    return true;
  };

  // --------------------------------------------------------------------------
  // DEPARTMENT FORMS SUBMISSION
  // --------------------------------------------------------------------------
  const submitDepartmentForm = (
    form: Omit<StandardizedDepartmentForm, 'id' | 'submittedAt' | 'status' | 'validationErrors'>
  ) => {
    const errors: string[] = [];
    if (!form.submittedBy?.trim()) errors.push('Submitted by name is required');
    if (!form.referenceNo?.trim()) errors.push('Reference/SIV number is required');
    if (!form.items || form.items.length === 0) errors.push('At least one item is required');
    form.items?.forEach((it) => {
      if (it.quantity < 0) errors.push(`Negative quantity for ${it.name}`);
    });

    if (errors.length > 0) {
      return { success: false, errors };
    }

    const newForm: StandardizedDepartmentForm = {
      ...form,
      id: `dept-form-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      submittedAt: new Date().toISOString(),
      status: 'VALIDATED',
    };

    setDepartmentForms((prev) => [newForm, ...prev]);
    return { success: true };
  };

  // --------------------------------------------------------------------------
  // AUTOMATED THREE-WAY RECONCILIATION
  // --------------------------------------------------------------------------
  const runAutomatedCrossMatching = (branchId: string, date: string): AutomatedReconciliationReport => {
    const branch = branches.find((b) => b.id === branchId) || branches[0];
    const ethDate = formatEthiopianDate(date);

    // 1. Cross-Match Store Issued SIV vs Chef Received SIV
    const storeIssueForms = departmentForms.filter(
      (f) => f.formCategory === 'STORE_ISSUE_SIV' && f.branchId === branchId && f.date === date
    );
    const chefReceiptForms = departmentForms.filter(
      (f) => f.formCategory === 'CHEF_RECEIPT_SIV' && f.branchId === branchId && f.date === date
    );

    const storeIssuedMap: Record<string, { qty: number; sivNo: string }> = {};
    storeIssueForms.forEach((f) => {
      f.items.forEach((it) => {
        const k = it.itemId || it.name;
        if (!storeIssuedMap[k]) storeIssuedMap[k] = { qty: 0, sivNo: f.referenceNo };
        storeIssuedMap[k].qty += it.quantity;
      });
    });

    const chefReceivedMap: Record<string, number> = {};
    chefReceiptForms.forEach((f) => {
      f.items.forEach((it) => {
        const k = it.itemId || it.name;
        chefReceivedMap[k] = (chefReceivedMap[k] || 0) + it.quantity;
      });
    });

    const transferMismatches: TransferMismatch[] = [];
    Object.keys(storeIssuedMap).forEach((k) => {
      const issued = storeIssuedMap[k].qty;
      const received = chefReceivedMap[k] || 0;
      const diff = Number((received - issued).toFixed(3));
      const catalogItem = items.find((i) => i.id === k || i.nameAm === k);
      const unitCost = catalogItem?.lastPurchasePrice || catalogItem?.weightedAvgCost || 100;

      if (Math.abs(diff) > 0.001) {
        transferMismatches.push({
          itemId: catalogItem?.id || k,
          itemName: catalogItem?.nameAm || k,
          unit: catalogItem?.unitAm || catalogItem?.unit || 'ኪ.ግ',
          unitCost,
          storeIssuedQty: issued,
          chefReceivedQty: received,
          difference: diff,
          lossValue: Number((Math.abs(diff) * unitCost).toFixed(2)),
          sivNo: storeIssuedMap[k].sivNo,
          status: 'MISMATCH_FLAGGED',
        });
      }
    });

    // 2. Chef Ending Count, Wastage, Cashier POS Sales
    const chefCountForms = departmentForms.filter(
      (f) => f.formCategory === 'CHEF_STOCK_COUNT' && f.branchId === branchId && f.date === date
    );
    const chefWasteForms = departmentForms.filter(
      (f) => f.formCategory === 'CHEF_WASTE_LOG' && f.branchId === branchId && f.date === date
    );
    const cashierSalesForms = departmentForms.filter(
      (f) => f.formCategory === 'CASHIER_POS_SALES' && f.branchId === branchId && f.date === date
    );

    const remainingStockMap: Record<string, number> = {};
    chefCountForms.forEach((f) => {
      f.items.forEach((it) => {
        const k = it.itemId || it.name;
        remainingStockMap[k] = it.quantity;
      });
    });

    const wastageMap: Record<string, number> = {};
    chefWasteForms.forEach((f) => {
      f.items.forEach((it) => {
        const k = it.itemId || it.name;
        wastageMap[k] = (wastageMap[k] || 0) + it.quantity;
      });
    });

    const expectedUsageFromSalesMap: Record<string, { qty: number; salesCount: number }> = {};
    let totalSalesRev = 0;

    cashierSalesForms.forEach((f) => {
      f.items.forEach((it) => {
        totalSalesRev += it.totalValue || (it.unitPrice || 0) * it.quantity;
        const recipe = recipes.find((r) => r.id === it.menuId || r.nameAm === it.name);
        if (recipe) {
          recipe.ingredients.forEach((ing) => {
            if (!expectedUsageFromSalesMap[ing.itemId]) {
              expectedUsageFromSalesMap[ing.itemId] = { qty: 0, salesCount: 0 };
            }
            expectedUsageFromSalesMap[ing.itemId].qty += Number((ing.quantity * it.quantity).toFixed(3));
            expectedUsageFromSalesMap[ing.itemId].salesCount += it.quantity;
          });
        }
      });
    });

    // Opening stocks from Cut-Over
    const deptCutOver = cutOverState.departments[branchId];
    const openingStockMap: Record<string, number> = {};
    deptCutOver?.items?.forEach((it) => {
      openingStockMap[it.itemId] = it.countedQuantity;
    });

    let totalActualUsageCost = 0;
    let totalExpectedCost = 0;
    let totalVarianceLoss = 0;

    const itemReconciliations: ItemReconciliationResult[] = items.map((it) => {
      const opening = openingStockMap[it.id] || 0;
      const received = chefReceivedMap[it.id] || chefReceivedMap[it.nameAm] || storeIssuedMap[it.id]?.qty || 0;
      const remaining = remainingStockMap[it.id] || remainingStockMap[it.nameAm] || 0;
      const waste = wastageMap[it.id] || wastageMap[it.nameAm] || 0;

      const actualUsage = Math.max(0, Number((opening + received - remaining - waste).toFixed(3)));
      const expected = expectedUsageFromSalesMap[it.id]?.qty || 0;
      const salesCount = expectedUsageFromSalesMap[it.id]?.salesCount || 0;

      const varianceQty = Number((expected - actualUsage).toFixed(3));
      const unitCost = it.lastPurchasePrice || it.weightedAvgCost || 100;
      const varianceVal = Number((varianceQty * unitCost).toFixed(2));

      totalActualUsageCost += actualUsage * unitCost;
      totalExpectedCost += expected * unitCost;
      if (varianceQty < 0) {
        totalVarianceLoss += Math.abs(varianceVal);
      }

      let varianceType: 'NORMAL' | 'SHORTAGE_LOSS' | 'SURPLUS' | 'POSSIBLE_THEFT' = 'NORMAL';
      if (varianceQty < -0.01) {
        varianceType = Math.abs(varianceVal) > 500 ? 'POSSIBLE_THEFT' : 'SHORTAGE_LOSS';
      } else if (varianceQty > 0.01) {
        varianceType = 'SURPLUS';
      }

      return {
        itemId: it.id,
        itemName: it.nameAm,
        unit: it.unitAm || it.unit,
        unitCost,
        openingStock: opening,
        receivedFromStore: received,
        remainingStockOnHand: remaining,
        recordedWastage: waste,
        actualUsage,
        expectedUsageFromSales: expected,
        varianceQuantity: varianceQty,
        varianceValue: varianceVal,
        varianceType,
        salesCount,
      };
    });

    const report: AutomatedReconciliationReport = {
      id: `auto-rec-${branchId}-${date}-${Date.now()}`,
      branchId,
      branchName: branch.nameAm,
      date,
      ethiopianDateStr: ethDate,
      generatedAt: new Date().toISOString(),
      transferMismatches,
      itemReconciliations: itemReconciliations.filter(
        (r) => r.openingStock > 0 || r.receivedFromStore > 0 || r.actualUsage > 0 || r.expectedUsageFromSales > 0
      ),
      missingSubmissions: {
        storeSivMissing: storeIssueForms.length === 0,
        chefCountMissing: chefCountForms.length === 0,
        cashierSalesMissing: cashierSalesForms.length === 0,
      },
      totalActualUsageCost: Number(totalActualUsageCost.toFixed(2)),
      totalExpectedCost: Number(totalExpectedCost.toFixed(2)),
      totalVarianceLossValue: Number(totalVarianceLoss.toFixed(2)),
      totalSalesRevenue: Number(totalSalesRev.toFixed(2)),
      managerApproved: false,
    };

    setAutomatedReports((prev) => [
      report,
      ...prev.filter((r) => !(r.branchId === branchId && r.date === date)),
    ]);

    return report;
  };

  const approveReconciliationReport = (reportId: string, managerNotes?: string) => {
    setAutomatedReports((prev) =>
      prev.map((r) =>
        r.id === reportId ? { ...r, managerApproved: true, managerNotes } : r
      )
    );
  };

  // --------------------------------------------------------------------------
  // COCOON SHOLA TO COCOON 6 KILO MENU DUPLICATION
  // --------------------------------------------------------------------------
  const copyCocoonSholaToSixKilo = () => {
    const shola = branches.find(
      (b) => b.nameAm.includes('ሾላ') || b.nameEn.toLowerCase().includes('shola') || b.id.includes('shola')
    );
    const sixKilo = branches.find(
      (b) => b.nameAm.includes('6 ኪሎ') || b.nameEn.toLowerCase().includes('6 kilo') || b.id.includes('6kilo') || b.id.includes('kokonut')
    );

    if (!shola || !sixKilo) {
      return {
        success: false,
        copiedCount: 0,
        skippedCount: 0,
        conflicts: ['Cocoon Shola or Cocoon 6 Kilo branch not found'],
        message: 'ቅርንጫፍ አልተገኘም (Branches not found)',
      };
    }

    try {
      localStorage.setItem(
        `RECIPE_BACKUP_BEFORE_SHOLA_COPY_${Date.now()}`,
        JSON.stringify(recipes)
      );
    } catch (e) {
      console.warn(e);
    }

    const sholaRecipes = recipes.filter((r) => r.branchId === shola.id);
    const sixKiloRecipes = recipes.filter((r) => r.branchId === sixKilo.id);
    const existingSixKiloNames = new Set(
      sixKiloRecipes.map((r) => r.nameAm.trim().toLowerCase())
    );

    let copiedCount = 0;
    let skippedCount = 0;
    const conflicts: string[] = [];
    const newClonedRecipes: Recipe[] = [];

    sholaRecipes.forEach((sRecipe) => {
      const normalizedName = sRecipe.nameAm.trim().toLowerCase();
      if (existingSixKiloNames.has(normalizedName)) {
        skippedCount++;
        conflicts.push(`${sRecipe.nameAm} (Already exists in Cocoon 6 Kilo)`);
      } else {
        copiedCount++;
        newClonedRecipes.push({
          ...sRecipe,
          id: `rec-6kilo-${Date.now()}-${copiedCount}-${Math.random().toString(36).substring(2, 5)}`,
          branchId: sixKilo.id,
          ingredients: sRecipe.ingredients.map((ing) => ({ ...ing })),
        });
      }
    });

    if (newClonedRecipes.length > 0) {
      setRecipes((prev) => [...prev, ...newClonedRecipes]);
    }

    return {
      success: true,
      copiedCount,
      skippedCount,
      conflicts,
      message: `${copiedCount} items copied to Cocoon 6 Kilo (${skippedCount} duplicates skipped)`,
    };
  };

  // --------------------------------------------------------------------------
  // EXCEL FILE INGESTION & 4-STAGE RECONCILIATION
  // --------------------------------------------------------------------------
  const addUploadedBatch = (batch: ExcelUploadedBatch) => {
    setUploadedBatches((prev) => [batch, ...prev.filter((b) => b.id !== batch.id)]);
  };

  const deleteUploadedBatch = (batchId: string) => {
    setUploadedBatches((prev) => prev.filter((b) => b.id !== batchId));
  };

  const saveLearnedAlias = (rawExcelName: string, targetItemId: string, targetItemName: string) => {
    const newAlias: LearnedAlias = {
      id: `alias-${Date.now()}`,
      rawExcelName: rawExcelName.trim(),
      targetItemId,
      targetItemName,
      createdAt: new Date().toISOString(),
    };
    setLearnedAliases((prev) => [
      newAlias,
      ...prev.filter((a) => a.rawExcelName.toLowerCase() !== rawExcelName.trim().toLowerCase()),
    ]);
  };

  const runFullReconciliation = async (branchId: string, period: string): Promise<FullReconciliationReport> => {
    const targetBranch = branches.find((b) => b.id === branchId) || branches[0];

    // 1. Run deterministic calculations
    const baseReport = runDeterministicReconciliationChain({
      branch: targetBranch,
      period,
      items,
      recipes,
      uploadedBatches,
      learnedAliases,
      toleranceMarginPercent: 0,
    });

    // 2. Call AI narrative generator via server endpoint
    try {
      const summaryPayload = {
        branchName: targetBranch.nameAm || targetBranch.nameEn,
        period,
        reconciliationData: {
          totalSalesRevenue: baseReport.totalSalesRevenue,
          totalExpectedCost: baseReport.totalExpectedCost,
          totalActualUsageCost: baseReport.totalActualUsageCost,
          totalVarianceLossValue: baseReport.totalVarianceLossValue,
          topVariances: baseReport.itemVariances.slice(0, 8).map((v) => ({
            item: v.itemNameAm,
            actualUsage: `${v.actualUsage} ${v.unit}`,
            expectedUsage: `${v.expectedUsageFromSales} ${v.unit}`,
            diff: `${v.varianceQuantity} ${v.unit}`,
            valueEtb: v.varianceValueEtb,
            status: v.status,
          })),
          transferMismatches: baseReport.storeTransferDiscrepancies.map((t) => ({
            siv: t.sivNumber,
            item: t.itemName,
            storeIssued: t.storeIssuedQty,
            branchReceived: t.branchReceivedQty,
            status: t.status,
          })),
          salesMismatches: baseReport.salesDiscrepancies.map((s) => ({
            dish: s.menuItemName,
            sold: s.cashierSoldQty,
            produced: s.kitchenProducedQty,
            status: s.status,
          })),
        },
      };

      const res = await fetch('/api/generate-controller-narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(summaryPayload),
      });

      if (res.ok) {
        const aiRes = await res.json();
        if (aiRes.success && aiRes.data) {
          baseReport.aiAuditNarrativeAm = aiRes.data.executiveSummaryAm || '';
          baseReport.aiAuditNarrativeEn = aiRes.data.executiveSummaryEn || '';
          if (aiRes.data.anomalies && aiRes.data.anomalies.length > 0) {
            baseReport.anomalies = [...aiRes.data.anomalies, ...baseReport.anomalies];
          }
          if (aiRes.data.actionItems && aiRes.data.actionItems.length > 0) {
            baseReport.actionItems = aiRes.data.actionItems;
          }
        }
      }
    } catch (err) {
      console.warn('AI narrative generation offline or failed:', err);
      baseReport.aiAuditNarrativeAm = `የ${targetBranch.nameAm} የ${period} የሪኮንሲሌሽን ትንተና ተሰርቷል። አጠቃላይ የሽያጭ ገቢ ${baseReport.totalSalesRevenue.toLocaleString()} ብር ሲሆን የዕቃ አጠቃቀም ወጪ ${baseReport.totalActualUsageCost.toLocaleString()} ብር ነው። ጠቅላላ የተገኘው የልዩነት/ጉድለት ዋጋ ${baseReport.totalVarianceLossValue.toLocaleString()} ብር ነው።`;
      baseReport.aiAuditNarrativeEn = `Reconciliation analysis completed for ${targetBranch.nameEn} on ${period}. Total POS sales recorded at ${baseReport.totalSalesRevenue.toLocaleString()} ETB, with actual kitchen ingredient consumption valued at ${baseReport.totalActualUsageCost.toLocaleString()} ETB. Total variance loss is ${baseReport.totalVarianceLossValue.toLocaleString()} ETB.`;
    }

    setFullReconciliationReports((prev) => [
      baseReport,
      ...prev.filter((r) => !(r.branchId === branchId && r.period === period)),
    ]);

    return baseReport;
  };

  const approveFullReconciliationReport = (reportId: string, managerNotes?: string) => {
    setFullReconciliationReports((prev) =>
      prev.map((r) =>
        r.id === reportId ? { ...r, managerApproved: true, managerNotes } : r
      )
    );
  };

  const exportReportToExcel = (report: FullReconciliationReport) => {
    exportReconciliationToExcel(report);
  };

  const logAuditTrail = (entry: { action: string; details: string; branchId?: string; userId?: string }) => {
    try {
      const stored = localStorage.getItem('audit_trail_log_v2');
      const list = stored ? JSON.parse(stored) : [];
      list.unshift({
        id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        ...entry,
      });
      localStorage.setItem('audit_trail_log_v2', JSON.stringify(list.slice(0, 500)));
    } catch (e) {
      console.warn('Could not write audit log:', e);
    }
  };

  return (
    <AppContext.Provider
      value={{
        items,
        branches,
        centralBinCards,
        branchLedgers,
        recipes,
        schedules,
        reconciliations,
        branchDailyClosings,
        staffMealRecipes,
        staffMembers,
        staffWeeklySchedules,
        staffMealExecutions,
        kitchenPrepItems,
        kitchenPrepBatches,
        // Cut-over / Fresh Start
        cutOverState,
        activateCutOver,
        saveDepartmentOpeningCount,
        confirmDepartmentCutOver,
        // Department forms
        departmentForms,
        submitDepartmentForm,
        // Automated reconciliation
        automatedReports,
        runAutomatedCrossMatching,
        approveReconciliationReport,
        // Excel Ingestion & 4-Stage Reconciliation
        uploadedBatches,
        learnedAliases,
        fullReconciliationReports,
        addUploadedBatch,
        deleteUploadedBatch,
        saveLearnedAlias,
        runFullReconciliation,
        approveFullReconciliationReport,
        exportReportToExcel,
        // Menu copy
        copyCocoonSholaToSixKilo,
        recordStockIn,
        transferToBranch,
        recordBranchUsage,
        recordBranchThreeWayUsage,
        setBeginningStock,
        closeBranchDailyAccount,
        deleteBranchDailyClosing,
        saveRecipe,
        deleteRecipe,
        duplicateRecipeToBranch,
        saveSchedule,
        deleteSchedule,
        saveKitchenPrepItem,
        deleteKitchenPrepItem,
        recordKitchenPrepProduction,
        deleteKitchenPrepBatch,
        saveStaffMealRecipe,
        deleteStaffMealRecipe,
        saveStaffMember,
        deleteStaffMember,
        saveStaffWeeklySchedule,
        executeStaffMealAndDeduct,
        deleteStaffMealExecution,
        addNewBranch,
        deleteBranch,
        createDefaultThreeBranches,
        addNewItem,
        bulkMergeItems,
        deleteItem,
        calculateSmartReconciliation,
        commitReconciliationToLedger,
        getBranchStockBalance,
        clearAllDataCompletely,
        loadSampleTemplate,
        exportFullBackup,
        restoreBackupFromFile,
        createManualSnapshot,
        loadAllSnapshots,
        restoreSnapshotById,
        deleteSnapshotById,
        getSyncCode,
        applySyncCode,
        // Change 1: Reset Central Store to Zero
        centralStoreResets,
        resetCentralStoreStockToZero,
        // Change 2: Central Store Sent-To Ledger
        centralSentToEntries,
        // Change 3 & 4: Tracked items & Daily Module
        branchTrackedItems,
        saveBranchTrackedItem,
        removeBranchTrackedItem,
        getTrackedItemsForBranch,
        cloneTrackedItemsFromBranch,
        syncTrackedItemsAcrossBranches,
        branchDailyModules,
        saveBranchDailyModule,
        getBeginningStockForBranchItem,
        // Change 3.1(g) & T6: Inter-branch transfers
        branchInterTransfers,
        recordInterBranchTransfer,
        acceptInterBranchTransfer,
        // Audit corrections
        auditCorrections,
        saveAuditCorrection,
        // Primary items selection
        selectedPrimaryItemIds,
        togglePrimaryItem,
        selectAllPrimaryItems,
        selectDefaultPrimaryItems,
        // Controller daily sheets
        branchDailySheets,
        saveBranchDailyControllerSheet,
        deleteBranchDailyControllerSheet,
        // Catalog zero initial balances
        populateCatalogWithZeroBalances,
        // Restore original baseline data
        restoreOriginalBaselineData,
        // Multi-Hotel System
        hotels,
        currentHotelId,
        currentHotel,
        setCurrentHotelId,
        addHotel,
        updateHotel,
        archiveHotel,
        // Expenses Management
        expenses,
        recordExpense,
        updateExpense,
        deleteExpense,
        getMonthlyExpenseSummary,
        // Bulk Remove Tracked Items
        bulkRemoveBranchTrackedItems,
        logAuditTrail,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

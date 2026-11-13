export type Language = 'am' | 'en';

export type ItemCategory = 
  | 'produce'    // አትክልት እና ፍራፍሬ
  | 'meat'       // ስጋ እና የዶሮ ውጤቶች
  | 'grain'      // እህል እና ዱቄት
  | 'dairy'      // የወተት ውጤቶች
  | 'spices'     // ቅመማ ቅመም
  | 'oil'        // ዘይት እና ቅባት
  | 'beverage'   // መጠጦች
  | 'packaging'  // ማሸጊያዎች
  | 'other';     // ሌሎች

export type UnitType = 'kg' | 'liter' | 'quintal' | 'gram' | 'pcs' | 'pack' | 'bottle';

export interface PriceRecord {
  date: string;
  ethiopianDateStr: string;
  price: number;
  quantity: number;
  supplier: string;
  grnNumber: string;
}

export interface InventoryItem {
  id: string;
  nameAm: string;
  nameEn: string;
  code: string;
  category: ItemCategory;
  unit: UnitType;
  unitAm: string;
  minStockLevel: number;
  currentCentralStock: number;
  weightedAvgCost: number; // በብር (ETB)
  lastPurchasePrice: number; // የመጨረሻ የገበያ ዋጋ
  priceHistory: PriceRecord[];
  description?: string;
}

export interface Branch {
  id: string;
  hotelId?: string;
  nameAm: string;
  nameEn: string;
  code: string;
  location: string;
  manager: string;
  phone: string;
  isArchived?: boolean;
}

export type CentralTransactionType = 
  | 'IN_PURCHASE'          // የገባ እቃ (GRN)
  | 'OUT_BRANCH_TRANSFER'  // ለቅርንጫፍ የተላለፈ (SIV)
  | 'OUT_DAMAGE'           // ብክነት / የተበላሸ
  | 'ADJUSTMENT';          // የቆጠራ ማስተካከያ

export interface CentralBinCardEntry {
  id: string;
  itemId: string;
  date: string; // YYYY-MM-DD
  ethiopianDateStr: string;
  refNo: string; // e.g. GRN-010, SIV-025
  type: CentralTransactionType;
  branchId?: string; // Target branch if transfer
  quantityIn: number;
  quantityOut: number;
  unitPrice: number; // Purchase price or cost price
  balance: number;
  supplierOrDestination: string;
  notes: string;
  recordedBy: string;
}

export type BranchTransactionType = 
  | 'BEGINNING_STOCK'    // የመነሻ ክምችት (Beginning Inventory)
  | 'TRANSFER_IN'        // ከማዕከላዊ ስቶር በ SIV የገባ (Store Issue Voucher Receipt)
  | 'CASH_SALE'          // 1. ቀጥታ በገንዘብ የተሸጠ (Direct Cash Sale / Menu Portions)
  | 'MANAGEMENT_USE'     // 2. ማኔጅመንት የተጠቀመው (Management Hospitality / Consumption)
  | 'STAFF_MEAL'         // 3. የስታፍ ምግብ (Staff Meals & Employee Consumption)
  | 'KITCHEN_USAGE'      // ለማእድ ቤት ዝግጅት የወጣ (General Kitchen Preparation)
  | 'DIRECT_SALE'        // በቀጥታ የተሸጠ (Legacy compatibility)
  | 'WASTE_DAMAGE'       // ብክነት ወይም ጉዳት
  | 'RECONCILIATION_ADJ'; // በቆጠራ / በሪኮንሲሌሽን የተስተካከለ

export interface BranchLedgerEntry {
  id: string;
  branchId: string;
  itemId: string;
  date: string; // YYYY-MM-DD
  ethiopianDateStr: string;
  refNo: string; // e.g. BEG-01, SIV-025, SL-01, MGT-01, STF-01
  type: BranchTransactionType;
  quantityIn: number;
  quantityOut: number;
  balance: number;
  unitCost: number;
  totalValue: number; // Cost value
  sellingPrice?: number; // Cash sale price per unit/portion
  cashRevenue?: number; // Total cash revenue collected
  beneficiaryOrGuest?: string; // Who used it (Management / Staff shift / Guest)
  recipeId?: string; // Associated menu dish id
  portionsSold?: number; // Portions sold or consumed
  reasonOrMenu: string;
  recordedBy: string;
}

export interface RecipeIngredient {
  itemId: string;
  quantity: number; // quantity needed per 1 portion (in item's base unit)
  unit?: string;
  isPrepItem?: boolean; // if true, itemId or prepItemId refers to a KitchenPrepItem (e.g. Bolognese Sauce)
  prepItemId?: string;
}

export interface KitchenPrepIngredient {
  itemId: string;
  quantity: number; // raw material needed per base batch yield
  unit?: string;
}

export interface KitchenPrepItem {
  id: string;
  branchId?: string; // specific branch (e.g. Bello for sauces, Coconu/Juice for patties) or undefined/'all'
  nameAm: string;    // e.g. 'ቦሎኛይስ ሶስ', 'ፔስቶ ሶስ', 'ዛፈራኖ ሶስ', 'ቶማቶ ሶስ', 'የበርገር ፓቲ', 'የፒዛ ስጋ'
  nameEn: string;
  category: 'sauce' | 'patty' | 'meat_prep' | 'dressing' | 'bakery' | 'other';
  outputUnit: string; // 'kg' | 'liter' | 'pcs'
  outputUnitAm: string; // 'ኪ.ግ' | 'ሊትር' | 'ፍሬ'
  batchYield: number; // e.g. 1 kg or 10 pcs
  ingredients: KitchenPrepIngredient[];
  preparationNotes?: string;
  isActive: boolean;
}

export interface KitchenPrepBatch {
  id: string;
  branchId: string;
  prepItemId: string;
  prepItemNameAm: string;
  prepItemNameEn: string;
  date: string;
  ethiopianDateStr: string;
  quantityProduced: number;
  outputUnitAm: string;
  totalCostETB: number;
  deductedItems: {
    itemId: string;
    itemNameAm: string;
    quantityDeducted: number;
    unitAm: string;
    unitCost: number;
    subTotalCost: number;
  }[];
  notes?: string;
  recordedBy: string;
  createdAt: string;
}

export interface Recipe {
  id: string;
  branchId: string; // እያንዳንዱ ብራንች የራሱ ሜኑ/ዋጋ/ሪሲፒ አለው (Branch-specific recipe)
  nameAm: string;
  nameEn: string;
  category: string;
  portionDescription: string;
  sellingPrice: number; // የመሸጫ ዋጋ (ETB) - ለዚህ ብራንች የተለየ
  ingredients: RecipeIngredient[];
  preparationNotes?: string;
  isActive: boolean;
}

export interface ScheduleMenuItem {
  recipeId: string;
  portionsPlanned: number;
  portionsSold: number;
}

export interface ProductionSchedule {
  id: string;
  branchId: string;
  date: string; // YYYY-MM-DD
  ethiopianDateStr: string;
  shift: 'morning' | 'lunch' | 'dinner' | 'all_day' | 'catering';
  name: string;
  items: ScheduleMenuItem[];
  notes?: string;
  status: 'planned' | 'in_progress' | 'reconciled';
}

export interface IngredientReconciliationDetail {
  itemId: string;
  itemNameAm: string;
  itemNameEn: string;
  unit: string;
  unitAm: string;
  unitCost: number;
  beginningStock?: number; // የጠዋት ቢግኒንግ ክምችት
  transfersIn?: number;    // በቀኑ ከማዕከላዊ ስቶር የገባ
  totalAvailable?: number; // በቀኑ የነበረ አጠቃላይ ግብአት (Beginning + TransfersIn)
  endingStock?: number;    // የማታ ኢንዲንግ ቆጠራ
  theoreticalRequired: number; // በሪሲፒው መሰረት መውጣት የነበረበት
  physicalActualUsed: number;  // በእጅ የተጠቀሙት እውነተኛ መጠን ((Beginning + In) - Ending)
  variance: number; // Short or Over: Actual - Theoretical
  variancePercent: number;
  financialImpactETB: number; // የገንዘብ ተጽእኖ በብር (Variance * UnitCost)
  status: 'balanced' | 'shortage' | 'excess' | 'critical';
  sharedRecipes: {
    recipeNameAm: string;
    recipeNameEn: string;
    portionSold: number;
    ingredientPerPortion: number;
    subTotalRequired: number;
  }[];
}

export interface KitchenPrepReconciliationDetail {
  prepItemId: string;
  nameAm: string;
  nameEn: string;
  outputUnitAm: string;
  beginningFridgeStock: number; // ጠዋት በፍሪጅ የነበረ የተዘጋጀ ሶስ/ፓቲ
  producedToday: number;        // ዛሬ በባች የተመረተ (+ ከስቶር ጥሬ ዕቃ ተቀንሶ የተዘጋጀ)
  totalAvailable: number;       // ጠቅላላ ዝግጁ ሶስ (Beginning + Produced)
  theoreticalUsed: number;      // በሽያጭ የወጣ (Dishes sold * sauce per portion)
  endingFridgeStock: number;    // ማታ በፍሪጅ የተቆጠረ ቀሪ
  actualUsed: number;           // በእጅ የወጣ ((Beg + Prod) - Ending)
  variance: number;             // Short / Over
  status: 'balanced' | 'shortage' | 'excess';
  usedInDishes: {
    dishNameAm: string;
    portionSold: number;
    saucePerPortion: number;
    totalSauceRequired: number;
  }[];
}

export interface ReconciliationSession {
  id: string;
  branchId: string;
  date: string;
  ethiopianDateStr: string;
  dishesSold: { recipeId: string; quantitySold: number }[]; // የካሽ ሪጅስተር ሽያጭ
  chefDishesProduced?: { recipeId: string; quantityProduced: number }[]; // የሼፎች ማውጫ ኦርደር (KOT)
  managementDishes?: { recipeId: string; quantityConsumed: number }[]; // የማኔጅመንት/የተፈረመበት ምግብ
  details: IngredientReconciliationDetail[];
  prepDetails?: KitchenPrepReconciliationDetail[]; // የተዘጋጁ ሶሶችና ፓቲዎች ሪኮንሲሌሽን
  totalVarianceCostETB: number;
  totalCashRevenueETB?: number;
  totalManagementCostETB?: number;
  status: 'draft' | 'approved';
  approvedBy?: string;
  notes?: string;
  createdAt: string;
}

export interface BranchDailyClosingItemSummary {
  itemId: string;
  itemNameAm: string;
  itemNameEn: string;
  unitAm: string;
  unitCost: number;
  beginningStock: number;
  receivedSIV: number;
  cashSaleQty: number;
  managementQty: number;
  staffMealQty: number;
  damageQty: number;
  totalOutQty: number;
  expectedClosingStock: number;
  actualPhysicalStock: number;
  varianceQty: number;
  varianceCostETB: number;
  status: 'balanced' | 'shortage' | 'excess';
}

export interface BranchDailyClosing {
  id: string;
  branchId: string;
  date: string;
  ethiopianDateStr: string;
  closingNumber: string;
  closedBy: string;
  closedAt: string;
  totalCashSalesETB: number;
  totalManagementCostETB: number;
  totalStaffMealCostETB: number;
  totalMaterialCostETB: number;
  totalVarianceCostETB: number;
  itemSummaries: BranchDailyClosingItemSummary[];
  notes?: string;
  status: 'closed';
}

// ==========================================
// የሰራተኞች ምግብ እና ከሰኞ-አርብ ስኬጁል ኮንትሮሊንግ (Staff Meal & Controlling)
// ==========================================

export interface StaffMealRecipe {
  id: string;
  branchId: string;
  nameAm: string;
  nameEn: string;
  category: 'breakfast' | 'lunch' | 'dinner' | 'general';
  portionUnit: string; // e.g. '1 ሰራተኛ / 1 ሰው'
  ingredients: RecipeIngredient[];
  cookingInstructions: string; // እንዴት እንዴት ማብሰል እንዳለብን (Cooking steps, sequence, heat, tips)
  targetCostPerPerson?: number; // ኢላማ የተደረገ የአንድ ሰራተኛ ወጪ (ETB)
  notes?: string;
  createdAt: string;
}

export interface StaffMember {
  id: string;
  branchId: string;
  fullName: string;       // የሰራተኛው ስም
  employeeNumber: string; // የሰራተኛ ቁጥር (e.g. EMP-001)
  department: string;     // የስራ ክፍል (ለምሳሌ፦ ማእድ ቤት፣ አስተናጋጅ፣ ጥበቃ፣ ጽዳት...)
  isActive: boolean;
}

export type WeekDayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface StaffDaySchedule {
  dayKey: WeekDayKey;
  dayNameAm: string; // 'ሰኞ' | 'ማክሰኞ' | 'ረቡዕ' | 'ሐሙስ' | 'አርብ' | 'ቅዳሜ' | 'እሁድ'
  mealType: 'breakfast' | 'lunch' | 'dinner';
  recipeId?: string;
  customMealName?: string;
  headcount: number; // የታቀደ የሰራተኛ ቁጥር
  employeeIds: string[]; // የተመደቡ ሰራተኞች
  cookingNotes?: string; // የማብሰያ ልዩ ማስታወሻ
  status: 'planned' | 'served' | 'skipped';
}

export interface StaffWeeklySchedule {
  id: string;
  branchId: string;
  weekStartDate: string; // Monday date YYYY-MM-DD
  ethiopianDateStr: string;
  scheduleType?: '5_days' | '7_days';
  days: {
    monday: StaffDaySchedule;
    tuesday: StaffDaySchedule;
    wednesday: StaffDaySchedule;
    thursday: StaffDaySchedule;
    friday: StaffDaySchedule;
    saturday?: StaffDaySchedule;
    sunday?: StaffDaySchedule;
  };
  notes?: string;
  status: 'draft' | 'active' | 'completed';
}

export interface StaffMealExecution {
  id: string;
  branchId: string;
  date: string;
  ethiopianDateStr: string;
  dayOfWeek: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';
  recipeId: string;
  recipeNameAm: string;
  headcount: number; // የሰራተኞች ቁጥር
  staffNames: string[]; // የሰራተኞች ስም ዝርዝር
  totalCostETB: number; // ጠቅላላ የሰራተኞች ምግብ ወጪ
  costPerPersonETB: number; // የአንድ ሰራተኛ ምግብ ዋጋ (በፐርሰን)
  ingredientDetails: {
    itemId: string;
    itemNameAm: string;
    unitAm: string;
    qtyPerPerson: number; // የአንድ ሰራተኛ ድርሻ
    totalQtyUsed: number; // ለሁሉም ሰራተኞች የወጣው ጠቅላላ
    unitCost: number;
    totalCost: number;
  }[];
  cookingChef?: string;
  notes?: string;
  createdAt: string;
}

// --------------------------------------------------------------------------
// FRESH START (OPENING BALANCE RESET / CUT-OVER) TYPES
// --------------------------------------------------------------------------
export interface DepartmentOpeningStock {
  itemId: string;
  itemNameAm: string;
  itemNameEn: string;
  unit: string;
  unitCost: number; // Most recent purchase price (lastPurchasePrice)
  countedQuantity: number;
  totalOpeningValue: number;
}

export interface DepartmentCutOverStatus {
  departmentId: string; // 'central_store' or branchId
  departmentName: string;
  isConfirmed: boolean;
  confirmedAt?: string;
  confirmedBy?: string;
  items: DepartmentOpeningStock[];
  totalDepartmentValue: number;
}

export interface CutOverState {
  isActive: boolean;
  cutOverDate: string; // The start date from which calculations and reconciliations run
  ethiopianCutOverDate?: string;
  authorizedManager: string;
  activatedAt: string;
  auditTrail: Array<{
    id: string;
    timestamp: string;
    manager: string;
    action: string;
    details: string;
  }>;
  departments: Record<string, DepartmentCutOverStatus>;
}

// --------------------------------------------------------------------------
// DEPARTMENT FORMS & AUTOMATIC DATA CONVERSION
// --------------------------------------------------------------------------
export type DepartmentRole = 'STORE' | 'KITCHEN' | 'CASHIER';
export type FormCategory = 
  | 'STORE_GRN'           // Goods Received from Suppliers
  | 'STORE_ISSUE_SIV'     // Issued to Branch Kitchens
  | 'CHEF_RECEIPT_SIV'    // Received by Branch Kitchens
  | 'CHEF_USAGE_LOG'      // Daily Kitchen Prep / Usage
  | 'CHEF_WASTE_LOG'      // Kitchen Spoilage / Waste
  | 'CHEF_STOCK_COUNT'    // Daily Ending Physical Count
  | 'CASHIER_POS_SALES';  // Items Sold per Shift/Day

export interface DepartmentFormItem {
  id: string;
  itemId?: string;
  menuId?: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
  totalValue?: number;
  notes?: string;
}

export interface StandardizedDepartmentForm {
  id: string;
  departmentRole: DepartmentRole;
  formCategory: FormCategory;
  branchId: string; // 'central' or branchId
  branchName: string;
  date: string;
  ethiopianDateStr?: string;
  shift: 'MORNING' | 'EVENING' | 'FULL_DAY';
  submittedBy: string;
  submittedAt: string;
  referenceNo: string;
  items: DepartmentFormItem[];
  status: 'VALIDATED' | 'HAS_MISMATCH' | 'RECONCILED';
  validationErrors?: string[];
}

// --------------------------------------------------------------------------
// AUTOMATED CROSS-MATCHING & RECONCILIATION RESULT
// --------------------------------------------------------------------------
export interface TransferMismatch {
  itemId: string;
  itemName: string;
  unit: string;
  unitCost: number;
  storeIssuedQty: number;
  chefReceivedQty: number;
  difference: number; // chefReceived - storeIssued
  lossValue: number;
  sivNo: string;
  status: 'MISMATCH_FLAGGED' | 'RESOLVED';
}

export interface ItemReconciliationResult {
  itemId: string;
  itemName: string;
  unit: string;
  unitCost: number;
  openingStock: number;
  receivedFromStore: number;
  remainingStockOnHand: number;
  recordedWastage: number;
  actualUsage: number; // Opening + Received - Remaining - Wastage
  expectedUsageFromSales: number; // SUM(Sold Portions * Recipe Qty)
  varianceQuantity: number; // Actual - Expected
  varianceValue: number; // Variance * UnitCost
  varianceType: 'NORMAL' | 'SHORTAGE_LOSS' | 'SURPLUS' | 'POSSIBLE_THEFT';
  salesCount: number;
}

export interface AutomatedReconciliationReport {
  id: string;
  branchId: string;
  branchName: string;
  date: string;
  ethiopianDateStr: string;
  generatedAt: string;
  transferMismatches: TransferMismatch[];
  itemReconciliations: ItemReconciliationResult[];
  missingSubmissions: {
    storeSivMissing: boolean;
    chefCountMissing: boolean;
    cashierSalesMissing: boolean;
  };
  totalActualUsageCost: number;
  totalExpectedCost: number;
  totalVarianceLossValue: number;
  totalSalesRevenue: number;
  managerApproved: boolean;
  managerNotes?: string;
}

// --------------------------------------------------------------------------
// EXCEL INGESTION & 4-STAGE ENTERPRISE RECONCILIATION TYPES
// --------------------------------------------------------------------------
export type ExcelFileType =
  | 'store_receipts'       // Goods Received Note into main store
  | 'store_issues'         // SIV issued from store to branch kitchen
  | 'price_catalog'        // Item catalog with prices
  | 'kitchen_stock_counts' // Branch physical stock count
  | 'kitchen_production'   // Kitchen chef daily production report
  | 'cashier_sales';       // Cashier POS sales

export interface ColumnMappingConfig {
  itemName?: string;
  itemCode?: string;
  quantity?: string;
  unit?: string;
  unitPrice?: string;
  totalPrice?: string;
  branchName?: string;
  date?: string;
  shift?: string;
  refNo?: string;
  openingStock?: string;
  receivedStock?: string;
  closingStock?: string;
  wastage?: string;
  supplier?: string;
}

export interface ExcelUploadedBatch {
  id: string;
  fileName: string;
  sheetName: string;
  fileType: ExcelFileType;
  fileTypeLabelAm: string;
  detectedBranch: string;
  detectedDatePeriod: string;
  uploadedAt: string;
  totalRows: number;
  validRowsCount: number;
  flaggedRowsCount: number;
  headers: string[];
  columnMapping: ColumnMappingConfig;
  confidence: number;
  parsedRows: ExcelParsedRow[];
}

export interface ExcelParsedRow {
  id: string;
  batchId: string;
  sourceFile: string;
  sourceSheet: string;
  sourceRowNumber: number; // 1-indexed in Excel
  itemName: string;
  itemCode?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalAmount: number;
  branchName: string;
  date: string;
  shift?: string;
  refNo?: string;
  openingStock?: number;
  receivedStock?: number;
  closingStock?: number;
  wastage?: number;
  supplier?: string;
  rawValues: Record<string, any>;
  hasWarning?: boolean;
  warningMessage?: string;
}

export interface StoreTransferDiscrepancy {
  id: string;
  itemId: string;
  itemName: string;
  unit: string;
  sivNumber: string;
  refNo?: string;
  storeIssuedQty: number;
  branchReceivedQty: number;
  discrepancyQty: number; // branchReceived - storeIssued
  unitCost: number;
  discrepancyValueEtb: number;
  status: 'MATCHED' | 'SHORTAGE_AT_BRANCH' | 'OVER_RECEIVED' | 'STORE_UNACKNOWLEDGED';
  storeSourceRow?: ExcelParsedRow;
  branchSourceRow?: ExcelParsedRow;
}

export interface SalesDiscrepancy {
  id: string;
  menuItemId: string;
  menuItemName: string;
  date?: string;
  shift?: string;
  cashierSoldQty: number;
  kitchenProducedQty: number;
  discrepancyQty: number; // cashierSold - kitchenProduced
  menuPrice: number;
  discrepancyAmount: number;
  status: 'MATCHED' | 'SOLD_UNPRODUCED' | 'PRODUCED_UNSOLD' | 'PRICE_DISCREPANCY';
  cashierSourceRow?: ExcelParsedRow;
  kitchenSourceRow?: ExcelParsedRow;
}

export interface ItemUsageVariance {
  id: string;
  itemId: string;
  itemNameAm: string;
  itemNameEn: string;
  unit: string;
  unitCost: number;
  openingStock: number;
  receivedFromStore: number;
  wastage: number;
  closingStock: number;
  actualUsage: number; // Opening + Received - Closing - Wastage
  expectedUsageFromSales: number; // Sum(Sold Portions * Recipe Qty)
  varianceQuantity: number; // Actual - Expected (positive = over-consumed/shortage; negative = under-consumed)
  varianceValueEtb: number;
  status: 'Matched' | 'Shortage' | 'Overage' | 'Not matched' | 'Missing data';
  suspectedCause?: string;
  notes?: string;
  sourceRows: ExcelParsedRow[];
}

export interface AnomalyFinding {
  title: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  affectedItems?: string[];
}

export interface FullReconciliationReport {
  id: string;
  branchId: string;
  branchName: string;
  period: string; // e.g. "2026-10-28"
  generatedAt: string;
  totalSalesRevenue: number;
  totalExpectedCost: number;
  totalActualUsageCost: number;
  totalVarianceLossValue: number;
  aiAuditNarrativeAm: string;
  aiAuditNarrativeEn: string;
  anomalies: AnomalyFinding[];
  actionItems: string[];
  itemVariances: ItemUsageVariance[];
  storeTransferDiscrepancies: StoreTransferDiscrepancy[];
  salesDiscrepancies: SalesDiscrepancy[];
  missingDataWarnings: string[];
  managerApproved: boolean;
  managerNotes?: string;
}

export interface LearnedAlias {
  id: string;
  rawExcelName: string;
  targetItemId: string;
  targetItemName: string;
  createdAt: string;
}

// --------------------------------------------------------------------------
// BELLO FAM F&B ARCHITECTURE TYPES (CHANGES 1 - 5)
// --------------------------------------------------------------------------

export interface CentralStoreResetAudit {
  id: string;
  timestamp: string; // ISO string
  ethiopianDateStr: string;
  user: string;
  notes: string;
  itemsResetCount: number;
  totalPreviousStock: number;
  itemSnapshots: Array<{
    itemId: string;
    itemCode: string;
    itemNameAm: string;
    itemNameEn: string;
    previousQuantity: number;
    newQuantity: number;
    unitAm: string;
    unitPrice: number;
  }>;
}

export interface CentralSentToEntry {
  id: string;
  date: string; // YYYY-MM-DD
  ethiopianDateStr: string;
  sivNumber: string;
  destinationBranchId: string;
  destinationBranchNameAm: string;
  destinationBranchNameEn: string;
  itemId: string;
  itemNameAm: string;
  itemNameEn: string;
  quantity: number;
  unit: string;
  unitAm: string;
  unitPrice: number;
  totalValue: number;
  notes?: string;
  recordedBy: string;
  createdAt: string;
}

export interface BranchTrackedItem {
  id: string; // e.g. `${branchId}_${itemId}`
  branchId: string;
  hotelId?: string;
  itemId: string;
  countUnit: string; // e.g. 'portions' | 'kg' | 'pcs'
  countUnitAm: string;
  isActive: boolean;
  conversionFactor?: number; // Optional per-item conversion factor (e.g. 1 kg meat = 8 portions)
  enableCrossCheck?: boolean; // Default false (optional setting, default OFF)
  addedAt?: string;
  removedFromDate?: string; // Soft removal from this date onward (past dates remain intact)
  removalReason?: string;
}

export interface BranchDailyItemData {
  itemId: string;
  itemCode?: string;
  itemName?: string;
  itemNameAm?: string;
  itemNameEn?: string;
  countUnit?: string;
  unitAm?: string;
  unitCostEtb?: number;
  runningTotal?: number;
  beginningInventory: number; // actual morning count (የመነሻ ቆጠራ)
  received: number; // entered from chefs file (after portioning, in branch count unit)
  cashierSalesQty: number; // actual cashier sales recorded (የካሸር ሽያጭ)
  chefCaptainOrderQty: number; // kitchen / chef captain orders prepared (የሼፎች ካፕቴን ኦርደር)
  salesTheoreticalQty: number; // theoretical usage from cashier/POS sold dishes * recipe
  managementConsumption: number; // items eaten by management (የማኔጅመንት አሎአንስ)
  wastageDamage: number; // wastage / damage (ብክነት)
  transferOut: number; // transfer out to another branch (ዝውውር)
  transferOutDestinationBranchId?: string;
  expectedEnding: number; // Beginning + Received - Sales/Usage - Mgt - Waste - TransferOut
  actualEnding: number; // actual evening count (የመጨረሻ ቆጠራ)
  variance: number; // Actual Ending - Expected Ending (የቆጠራ ልዩነት)
  variancePercent: number;
  varianceValueEtb: number; // Math.abs(variance) * lastPurchasePrice
  captainVsCashierVariance?: number; // Chef Captain Order Qty - Cashier Sales Qty (ያልተከፈለበት/የተዘጋጀ ልዩነት)
  captainVsCashierVarianceValueEtb?: number;
  status: 'balanced' | 'shortage' | 'overage';
  notes?: string;
}

export interface BranchDailyModuleRecord {
  id: string;
  branchId: string;
  branchName: string;
  date: string; // YYYY-MM-DD
  ethiopianDateStr: string;
  shift?: string;
  managerName: string;
  savedAt: string;
  items: Record<string, BranchDailyItemData>;
  cashierSalesEntries?: Array<{ recipeId?: string; dishName: string; quantitySold: number; unitPrice?: number; totalEtb?: number }>;
  chefCaptainOrderEntries?: Array<{ recipeId?: string; dishName: string; captainOrderNo?: string; quantityPrepared: number }>;
  managementAllowanceEntries?: Array<{ recipeId?: string; itemName: string; authorizedBy?: string; quantityConsumed: number; notes?: string; totalCostEtb?: number }>;
  scannedPhotos?: Array<{
    id: string;
    photoUrl?: string;
    documentType: string;
    documentTypeAm: string;
    referenceNo?: string;
    scannedAt: string;
    detectedDate?: string;
    summaryAmharic?: string;
    itemCount: number;
  }>;
  status: 'draft' | 'closed';
  closedAt?: string;
}

export interface BranchInterTransfer {
  id: string;
  date: string; // YYYY-MM-DD
  ethiopianDateStr: string;
  fromBranchId: string;
  fromBranchName: string;
  toBranchId: string;
  toBranchName: string;
  itemId: string;
  itemNameAm: string;
  itemNameEn: string;
  quantity: number;
  unit: string;
  unitAm: string;
  status: 'PENDING' | 'RECEIVED' | 'REJECTED';
  sentBy: string;
  receivedBy?: string;
  receivedAt?: string;
  notes?: string;
}

export interface AuditCorrectionRecord {
  id: string;
  timestamp: string;
  user: string;
  module: string;
  branchId?: string;
  recordId: string;
  previousValue: any;
  newValue: any;
  reason: string;
  ownerNotified: boolean;
}

export interface BranchDailyControllerSheet {
  id: string;
  branchId: string;
  branchName: string;
  date: string;
  ethiopianDateStr: string;
  submittedBy: string;
  submittedAt: string;
  beginningInventory: Array<{
    itemId: string;
    itemName: string;
    quantity: number;
    unit: string;
    unitCost?: number;
  }>;
  cashierSales: Array<{
    dishName: string;
    recipeId?: string;
    quantitySold: number;
    unitPrice: number;
    totalAmount: number;
  }>;
  endingInventory: Array<{
    itemId: string;
    itemName: string;
    quantity: number;
    unit: string;
  }>;
  chefOrders: Array<{
    dishName: string;
    orderTicketNo: string;
    quantityProduced: number;
    chefName?: string;
    notes?: string;
  }>;
  status?: string;
}

// ============================================================================
// 1. MULTI-HOTEL SYSTEM & USER ROLES (MULTI-BUSINESS ARCHITECTURE)
// ============================================================================

export type HotelCategory =
  | 'restaurant'
  | 'hotel'
  | 'cafe'
  | 'bakery'
  | 'bar_lounge'
  | 'factory'
  | 'other';

export interface Hotel {
  id: string;
  name: string;
  nameAm?: string;
  category: HotelCategory;
  categoryAm?: string;
  code: string;
  address?: string;
  phone?: string;
  managerName?: string;
  isArchived?: boolean;
  createdAt: string;
}

export type UserRole =
  | 'super_admin'    // Complete system access across all hotels (Salsawi Seyoum)
  | 'hotel_manager'  // General Manager for a specific hotel & its branches
  | 'chef'           // Kitchen chef (KOT, prep, recipes, physical count)
  | 'store_keeper'   // Storekeeper (GRN, SIV, stock issues)
  | 'cashier';       // Cashier (POS sales entry & billings)

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  hotelId: string; // 'all' for super_admin or specific hotel.id
  branchId: string; // 'all' for super_admin/hotel_manager or specific branch.id
  disabled: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

// ============================================================================
// 2. DAILY EXPENSES & 15% VAT ACCOUNTING
// ============================================================================

export type ExpenseCategory =
  | 'utilities'        // መብራት/ውሃ/ስልክ/ኢንተርኔት
  | 'transport'        // ትራንስፖርትና ነዳጅ
  | 'maintenance'      // ጥገና እና ማደስ
  | 'cleaning'         // ጽዳትና ሳሙና እቃዎች
  | 'kitchen_supplies' // የወጥ ቤት ማብሰያና እቃዎች
  | 'marketing'        // ማስታወቂያና ፕሮሞሽን
  | 'labor_casual'     // የቀን ሰራተኛና የቀን ጉልበት
  | 'other';           // ሌሎች ልዩ ልዩ ወጪዎች

export type PaymentMethod =
  | 'cash'             // ጥሬ ገንዘብ (Cash)
  | 'bank_transfer'    // የባንክ ሒሳብ ማስተላለፍ (CBE, Awash, etc.)
  | 'telebirr'         // ቴሌብር (Telebirr)
  | 'cbe_birr'         // ሲቢኢ ብር (CBE Birr)
  | 'check';           // ቼክ (Bank Check)

export interface ExpenseRecord {
  id: string;
  hotelId: string;
  branchId: string;
  date: string; // YYYY-MM-DD
  ethiopianDateStr: string;
  category: ExpenseCategory;
  description: string;
  paymentMethod: PaymentMethod;
  hasReceipt: boolean;
  receiptNumber?: string;
  receiptPhotoUrl?: string; // base64 or photo URL
  isVatInclusive: boolean; // true: amount includes 15% VAT; false: VAT is added on top
  enteredAmount: number;
  amountBeforeVat: number;
  vatAmount: number; // 15% VAT
  totalAmount: number;
  recordedBy: string;
  createdAt: string;
  updatedAt?: string;
  isDeleted?: boolean; // Soft delete
}

export interface ExpenseMonthlySummary {
  periodMonth: string; // YYYY-MM
  hotelId: string;
  branchId: string;
  totalWithReceipt: number;
  totalWithoutReceipt: number;
  totalVat: number;
  totalBeforeVat: number;
  grandTotal: number;
  categoryTotals: Record<ExpenseCategory, number>;
  recordCount: number;
}

// ==========================================
// 5 DEDICATED ROLE STATION PORTALS
// 1) Barman, 2) Juicer, 3) Cashier, 4) Storekeeper, 5) Chef
// ==========================================
export type StationType =
  | 'barman'        // የባርማን (Barman / Alcoholic & Soft Beverages)
  | 'juicer'        // የጁሰር (Juicer / Fresh Fruit & Juice Bar)
  | 'cashier'       // የካሸር (Cashier / POS & Cash Handover)
  | 'storekeeper'   // የስቶር ኪፐር (Storekeeper / Central Store & Receiving)
  | 'chef';         // የሼፍ (Chef / Kitchen KOT & Food Production)

export interface StationConfig {
  id: string;
  station: StationType;
  titleAm: string;
  titleEn: string;
  descriptionAm: string;
  descriptionEn: string;
  color: string;
  defaultItemCategories: string[];
}

export interface StationItemAssignment {
  id: string;
  hotelId: string;
  branchId: string;
  station: StationType;
  itemId: string;
  assignedBy: string;
  assignedAt: string;
}

export interface StationDailyItemCount {
  itemId: string;
  itemCode: string;
  nameAm: string;
  nameEn: string;
  unit: string;
  unitAm: string;
  unitPrice: number;
  beginningCount: number;     // የአደረ (መነሻ)
  receivedCount: number;      // የገባ
  endingCount: number;        // ቀሪ (እጃቸው ላይ ያለ)
  transferOutCount: number;   // ለሌላ branch የተላከ
  transferDestination?: string;
  damageCount: number;         // Wreckage / Damage / ብልሽት
  managementCount: number;    // Management / የተበላ (Staff meal / Tasting)
  calculatedUsage: number;    // (Beginning + Received - TransferOut) - Ending - Damage - Management
}

export interface StationDailySubmission {
  id: string;
  hotelId: string;
  branchId: string;
  station: StationType;
  date: string;
  ethiopianDateStr: string;
  shift: 'MORNING' | 'EVENING' | 'ALL_DAY';
  staffName: string;
  staffPhone?: string;
  pinVerified?: boolean;
  itemCounts: StationDailyItemCount[];
  cashSummary?: {
    cashAmount: number;
    telebirrAmount: number;
    cbeBirrAmount: number;
    bankTransferAmount: number;
    voidCount: number;
    totalReportedRevenue: number;
  };
  notes?: string;
  submittedAt: string;
  status: 'SUBMITTED' | 'APPROVED' | 'DISCREPANCY_FLAGGED';
  reviewedBy?: string;
}

// ==========================================
// HOTEL & RESTAURANT STANDARD FINANCE SYSTEM (USALI + ETHIOPIAN TAX)
// ==========================================
export type AccountCategory =
  | 'ASSET'           // ሀብት (Cash, Bank, Inventory, AR)
  | 'LIABILITY'       // እዳ (VAT Payable, AP, Pension Payable)
  | 'EQUITY'          // የባለቤት ካፒታል (Capital, Retained Earnings)
  | 'REVENUE'         // ገቢ (Food, Beverage, Juice, Events)
  | 'COGS'            // የሸቀጥ ወጪ (Food COGS, Bar COGS)
  | 'EXPENSE';        // የስራ ማስኬጃ ወጪ (Salaries, Rent, Utilities)

export interface ChartOfAccount {
  code: string;
  nameAm: string;
  nameEn: string;
  category: AccountCategory;
  isDebitNormal: boolean;
  balance: number;
  description?: string;
}

export interface JournalLine {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface JournalVoucher {
  id: string;
  hotelId: string;
  branchId: string;
  voucherNumber: string;
  date: string;
  ethiopianDateStr: string;
  referenceDoc?: string;
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
  preparedBy: string;
  status: 'DRAFT' | 'POSTED';
  createdAt: string;
}

export interface ProfitAndLossReport {
  periodMonth: string;
  hotelId: string;
  branchId?: string;
  foodRevenue: number;
  beverageRevenue: number;
  juiceRevenue: number;
  serviceChargeRevenue: number;
  otherRevenue: number;
  totalRevenue: number;
  foodCost: number;
  beverageCost: number;
  totalCogs: number;
  grossProfit: number;
  grossMarginPct: number;
  foodCostPct: number;
  beverageCostPct: number;
  operatingExpenses: {
    salariesAndWages: number;
    rent: number;
    utilities: number;
    repairsAndMaintenance: number;
    transportFuel: number;
    packagingAndSupplies: number;
    marketing: number;
    miscellaneous: number;
    totalOpex: number;
  };
  ebitda: number;
  ebitdaMarginPct: number;
  estimatedTaxes: number;
  netProfit: number;
  netMarginPct: number;
}

// ==========================================
// STANDARD HR & ETHIOPIAN PAYROLL SYSTEM
// Proclamation No. 979/2016 + Labor Proclamation 1156/2019
// ==========================================
export type DepartmentType =
  | 'SERVICE_FOH'     // አገልግሎት / ፍሮንት (Waiters, Hostess, Runners)
  | 'BAR'             // ባር (Barman, Baristas)
  | 'JUICE_BAR'       // ጁስ ባር (Juicers, Fruit prep)
  | 'KITCHEN_BOH'     // ኩሽና (Executive Chef, Line Cook, Prep)
  | 'STEWARDING'      // እቃ ማጠብና ጽዳት (Dishwashers, Cleaners)
  | 'CASHIER_POS'     // ካሸርና ሂሳብ (Cashiers, Cash Custodians)
  | 'STORE_PURCHASE'  // ስቶርና ግዢ (Storekeepers, Purchasers)
  | 'MANAGEMENT_ADMIN';// አስተዳደርና አመራር (Managers, HR, Accountants)

export interface JobDescription {
  roleId: string;
  titleAm: string;
  titleEn: string;
  department: DepartmentType;
  reportsTo: string;
  objectiveAm: string;
  objectiveEn: string;
  dutiesAm: string[];
  dutiesEn: string[];
  kpisAm: string[];
  kpisEn: string[];
  qualificationsAm: string[];
  qualificationsEn: string[];
  dressCodeAm: string;
  dressCodeEn: string;
}

export interface Employee {
  id: string;
  hotelId: string;
  branchId: string;
  employeeCode: string;
  nameAm: string;
  nameEn: string;
  phone: string;
  nationalId?: string; // Kebele or Fayda ID
  emergencyContact: string;
  gender: 'MALE' | 'FEMALE';
  department: DepartmentType;
  jobTitle: string;
  hireDate: string;
  employmentType: 'PERMANENT' | 'CONTRACT' | 'CASUAL' | 'PROBATION';
  basicSalary: number; // በብር
  allowances: {
    transport: number;
    housing: number;
    food: number;
    position: number;
  };
  bankAccount?: {
    bankName: string;
    accountNumber: string;
  };
  assignedStation?: StationType;
  stationPin?: string; // 4-digit PIN for quick station login
  status: 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED';
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  branchId: string;
  date: string;
  shift: 'MORNING' | 'EVENING' | 'ALL_DAY';
  status: 'PRESENT' | 'ABSENT' | 'SICK_LEAVE' | 'ANNUAL_LEAVE' | 'OFF_DAY' | 'LATE';
  overtimeHours: number; // የትርፍ ሰዓት
  overtimeType?: 'NORMAL_DAY' | 'NIGHT' | 'WEEKEND' | 'HOLIDAY';
  clockInTime?: string;
  clockOutTime?: string;
}

export interface PayrollPayslip {
  id: string;
  periodMonth: string; // YYYY-MM
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: DepartmentType;
  jobTitle: string;
  branchId: string;
  // Earnings
  basicSalary: number;
  transportAllowance: number;
  housingAllowance: number;
  foodAllowance: number;
  positionAllowance: number;
  overtimePay: number;
  serviceChargeTipsBonus: number;
  grossTaxableIncome: number;
  totalGrossEarnings: number;
  // Statutory Deductions (Ethiopia)
  employeeIncomeTax: number;   // PAYE የስራ ግብር
  employeePension: number;     // 7% የጡረታ መዋጮ
  employerPension: number;     // 11% ቀጣሪ ጡረታ
  otherDeductions: number;     // ቅጣት፣ ቅድመ ክፍያ ብድር
  totalDeductions: number;
  // Net
  netPay: number;              // የተጣራ ደመወዝ
  paymentStatus: 'PENDING' | 'PAID';
  paymentDate?: string;
}

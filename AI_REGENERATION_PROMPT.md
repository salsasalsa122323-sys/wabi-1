# Ethiopian Multi-Branch Restaurant ERP & Central Store System
## Master AI Regeneration Prompt & Full Architecture Blueprint

> **How to use this:** Copy and paste the section below into any AI coding tool (ChatGPT, Claude 3.5 Sonnet, Cursor, v0.dev, Bolt.new, Windsurf, or GitHub Copilot) to generate this exact application from scratch.

---

### 📋 COPY-PASTE PROMPT FOR ANY AI GENERATOR:

```text
You are an expert full-stack React and TypeScript engineer. Build a high-end, production-ready enterprise web application:
"Ethiopian Multi-Branch Restaurant & Central Store Recipe ERP" (የኢትዮጵያ ምግብ ቤትና ስቶር ማኔጅመንት ሲስተም).

### Core Concept & Business Logic:
1. One Central Store (ማዕከላዊ ስቶር) feeds multiple independent branches (e.g. Bello, Coconu, Piassa, Bole, etc.).
2. The user is the sole owner/manager who controls the entire business from one central dashboard.
3. Central Store Operations:
   - Goods Received Note (GRN / ገቢ ዕቃ): Records purchases from suppliers with unit price, GRN number, supplier name. Computes real-time Weighted Average Cost (WAC) formula:
     New WAC = ((Old Qty * Old WAC) + (New Qty * Purchase Price)) / (Old Qty + New Qty)
   - Store Issue Voucher (SIV / የወጣ እቃ): Transfers raw materials (meat, flour, spices, oil, cheese) from Central Store to designated branches, strictly decrementing central stock and incrementing branch ledger.
   - Master Bin Card (ማስተር ቢን ካርድ): Immutable audit trail of every gram/kg/liter moving in and out with running balances.

4. Sub-Recipe / Kitchen Preparation Batching (የሶስ እና የቅድመ-ዝግጅት ማምረቻ):
   - Specialized prep items that are produced in a branch before being used in final customer dishes.
   - Examples: Bolognese Sauce (ቦሎኛይስ ሶስ), Tomato Base (ቶማቶ ሶስ), Pesto Sauce (ፔስቶ ሶስ), Zafferano Sauce (ዛፈራኖ ሶስ), Burger Patties (የበርገር ፓቲ), Pizza Meat Topping (የፒዛ ስጋ).
   - Each prep recipe defines raw ingredient requirements for a base batch yield (e.g. 1 kg of Bolognese requires 0.5 kg beef, 0.3 kg tomato, 0.05 liter oil, spices).
   - Branch specificity: e.g. Bello produces sauces; Coconu produces burger patties; Pizza branch produces seasoned meat.
   - Batch Production Record: When the branch manager records producing e.g. "5 kg Bolognese Sauce", the system automatically deducts the raw ingredients from the branch stock ledger and increments the ready-made prep batch.

5. Branch Recipe & 3-Way Consumption (የቅርንጫፍ ሜኑ እና የ3-አቅጣጫ ፍጆታ):
   - Each branch has its own custom menu recipes and selling prices (ETB).
   - Dishes can use both raw items and kitchen prep items (e.g., Spaghetti Bolognese uses 1 portion Pasta + 0.25 kg Bolognese Sauce).
   - 3-Way Outflow Channels:
     a) Direct Cash Sale (ቀጥታ ሽያጭ) - generates cash revenue & deducts dish ingredients.
     b) Management / Guest Consumption (የማኔጅመንት አጠቃቀም) - recorded for VIP/owner guests with name & reason.
     c) Staff Meal (የሰራተኞች ምግብ) - recorded per shift/headcount.
     d) Kitchen Waste & Damage (ብክነት) - recorded with reasons.

6. Smart Reconciliation & Carryover (ስማርት ሪኮንሲሌሽን እና የዕለት ቆጠራ):
   - Beginning Stock (የጠዋት ክምችት) + SIV Transfers In = Total Available Stock.
   - Theoretical Usage (ቲዎሪቲካል ፍጆታ) calculated automatically by multiplying (Dishes Sold * Recipe Quantities) + Management + Staff Meal.
   - Ending Physical Count (የማታ ቆጠራ) compared against Expected Stock.
   - Variance (ልዩነት) calculation in quantity and monetary value (ETB).
   - Smart Carryover: Yesterday's ending inventory automatically becomes Today's beginning inventory.

7. F&B Food Cost Analysis (የምግብ ዋጋ ሪፖርት):
   - Live Food Cost Percentage = (Total Cost of Ingredients Consumed / Total Sales Revenue) * 100
   - Cost variance, revenue summary, branch comparisons, and high-margin vs low-margin dish analytics.

8. Multi-Gigabyte Persistent Vault & Quota Protection:
   - Primary authoritative storage MUST use browser IndexedDB (object stores: `erp_records` and `erp_snapshots`), providing gigabytes of capacity without 5MB quota errors.
   - Wrap any localStorage writes with safe try-catch (`safeLocalStorageSet`) to never crash on QuotaExceededError.
   - Asynchronous hydration on mount from IndexedDB.
   - Instant JSON database backup export and restore, snapshot vault, and UTF-8 CSV exports with Excel BOM for Amharic support.

9. UI/UX & Design Constitution:
   - Ultra-premium Obsidian/Gold dark palette:
     * Background: Deep Obsidian `#0B0F17` & Slate `#111827`
     * Accents: Amber/Gold `#D97706` / `#F59E0B`
     * Text: Crisp white `#F9FAFB` & slate `#9CA3AF`
     * Borders: Subtle gold/slate borders `rgba(217, 119, 6, 0.2)`
   - Bento-grid responsive cards, smooth transitions, status badges with semantic colors (Emerald for profit/match, Rose for shortage/loss, Amber for pending).
   - Dual Language Support (Amharic አማርኛ by default, with English toggle).
   - Ethiopian Calendar (የኢትዮጵያ ዘመን አቆጣጠር) integration alongside Gregorian dates.
```

---

### 🏗️ PROJECT DIRECTORY STRUCTURE

```
src/
├── types/
│   └── index.ts                 # Central domain models (Items, Branches, Recipes, Batches, Ledgers)
├── utils/
│   ├── ethiopianDate.ts         # Ethiopian date converter & formatter
│   ├── persistentStorage.ts     # IndexedDB vault + safe localStorage engine
│   └── inventoryCarryover.ts    # Automated daily stock rollover
├── context/
│   ├── AppContext.tsx           # Global state, business logic, WAC calculation & dispatchers
│   └── LanguageContext.tsx      # Dual Amharic/English context & currency formatters
├── i18n/
│   └── translations.ts          # Comprehensive Amharic & English dictionary
├── components/
│   ├── layout/
│   │   └── Navbar.tsx           # Luxury navigation bar with branch switcher & language toggle
│   ├── common/
│   │   ├── SmartItemSelector.tsx# Fast searchable raw material & prep item picker
│   │   ├── DatePickerField.tsx  # Dual Ethiopian/Gregorian date selector
│   │   └── OfflineIndicator.tsx # Offline status & sync monitor
│   └── modals/
│       ├── StockInModal.tsx     # Central Store GRN receipt form
│       ├── TransferModal.tsx    # SIV Store to Branch dispatch form
│       ├── BranchUsageModal.tsx # 3-way sales/consumption logger
│       ├── NewItemModal.tsx     # Inventory item creator
│       ├── NewBranchModal.tsx   # Branch creator
│       └── DataStorageModal.tsx # Backup/restore/snapshot manager
└── views/
    ├── DashboardView.tsx        # Executive KPIs, stock alerts & quick actions
    ├── CentralStoreView.tsx     # Main warehouse GRN & SIV control
    ├── BinCardView.tsx          # Real-time Master Bin Card audit log
    ├── KitchenPrepView.tsx      # Sub-Recipe Sauces & Patty batch production
    ├── RecipesView.tsx          # Branch-specific menu pricing & ingredients
    ├── BranchLedgersView.tsx    # Branch inventory movement & balance sheets
    ├── SmartReconciliationView.tsx # End-of-day theoretical vs physical reconciliation
    ├── FBReportView.tsx         # Food cost percentage & revenue intelligence
    ├── PriceTrackingView.tsx    # Raw material price history & inflation analysis
    ├── StaffMealControllingView.tsx # Staff meals & headcount tracking
    └── DataVaultView.tsx        # High-capacity backups, snapshots & exports
```

---

### 📦 CORE DATA SCHEMAS (`src/types/index.ts`)

```typescript
export interface InventoryItem {
  id: string;
  code: string;
  nameAm: string;
  nameEn: string;
  category: 'meat' | 'grain' | 'vegetable' | 'dairy' | 'spice' | 'oil' | 'beverage' | 'packaging' | 'other';
  unit: string;
  unitAm: string;
  minStockLevel: number;
  currentCentralStock: number;
  weightedAvgCost: number; // WAC (ብር)
  lastPurchasePrice: number;
  priceHistory: {
    date: string;
    ethiopianDateStr: string;
    price: number;
    quantity: number;
    supplier: string;
    grnNumber: string;
  }[];
}

export interface Branch {
  id: string;
  code: string;
  nameAm: string;
  nameEn: string;
  location: string;
  manager: string;
  phone: string;
}

export interface KitchenPrepItem {
  id: string;
  branchId?: string; // Specific to a branch (e.g. Bello for sauces, Coconu for patties)
  nameAm: string;
  nameEn: string;
  category: 'sauce' | 'patty' | 'meat_prep' | 'dressing' | 'bakery' | 'other';
  outputUnit: string;
  outputUnitAm: string;
  batchYield: number; // e.g. 1 kg or 10 pcs
  ingredients: {
    itemId: string;
    quantity: number;
    unit?: string;
  }[];
  preparationNotes?: string;
  isActive: boolean;
}

export interface Recipe {
  id: string;
  branchId: string;
  nameAm: string;
  nameEn: string;
  category: string;
  portionDescription: string;
  sellingPrice: number;
  ingredients: {
    itemId: string;
    quantity: number;
    unit?: string;
    isPrepItem?: boolean;
    prepItemId?: string;
  }[];
  preparationNotes?: string;
  isActive: boolean;
}

export interface CentralBinCardEntry {
  id: string;
  itemId: string;
  date: string;
  ethiopianDateStr: string;
  refNo: string;
  type: 'IN_PURCHASE' | 'OUT_BRANCH_TRANSFER' | 'ADJUSTMENT';
  branchId?: string;
  quantityIn: number;
  quantityOut: number;
  unitPrice: number;
  balance: number;
  supplierOrDestination: string;
  notes?: string;
  recordedBy: string;
}

export interface BranchLedgerEntry {
  id: string;
  branchId: string;
  itemId: string;
  date: string;
  ethiopianDateStr: string;
  refNo: string;
  type: 'TRANSFER_IN' | 'DIRECT_SALE' | 'CASH_SALE' | 'MANAGEMENT_USE' | 'STAFF_MEAL' | 'WASTE_DAMAGE' | 'KITCHEN_USAGE' | 'RECONCILIATION_ADJ' | 'BEGINNING_STOCK';
  quantityIn: number;
  quantityOut: number;
  balance: number;
  unitCost: number;
  totalValue: number;
  sellingPrice?: number;
  totalRevenue?: number;
  beneficiaryOrGuest?: string;
  reasonOrMenu: string;
  recordedBy: string;
}
```

---

### 💡 PERSISTENT STORAGE ENGINE (`src/utils/persistentStorage.ts`)

```typescript
const DB_NAME = 'EthiopiaERP_Enterprise_DB';
const DB_VERSION = 2;
const STORE_NAME = 'erp_records';
const SNAPSHOTS_STORE = 'erp_snapshots';

export async function saveToPersistentDB(key: string, data: any): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put(data, key);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function safeLocalStorageSet(key: string, data: any): boolean {
  try {
    const serialized = JSON.stringify(data);
    if (serialized.length > 1500000) return false; // Prevent exceeding 5MB quota
    localStorage.setItem(key, serialized);
    return true;
  } catch (err) {
    console.warn(`LocalStorage quota reached for ${key}. Safely handled by IndexedDB.`);
    return false;
  }
}
```

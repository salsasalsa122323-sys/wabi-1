import { InventoryItem, Branch, CentralBinCardEntry, BranchLedgerEntry, Recipe, ProductionSchedule } from '../types';

// Bello Fam Master Branches: Frasco Bello, Cocoon 6 Kilo & Cocoon Shola
export const DEFAULT_BRANCHES: Branch[] = [
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
];

// Clean-Zero Start: ZERO pre-seeded store items, ZERO pre-seeded menus/recipes.
// User inputs 100% of their own store items, primary materials, and menus from scratch.
export const DEFAULT_ZERO_BALANCE_ITEMS: InventoryItem[] = [];
export const DEFAULT_ZERO_BALANCE_RECIPES: Recipe[] = [];

export const INITIAL_BRANCHES: Branch[] = DEFAULT_BRANCHES;
export const INITIAL_ITEMS: InventoryItem[] = [];
export const INITIAL_CENTRAL_BIN_CARD: CentralBinCardEntry[] = [];
export const INITIAL_BRANCH_LEDGERS: BranchLedgerEntry[] = [];
export const INITIAL_RECIPES: Recipe[] = [];
export const INITIAL_SCHEDULES: ProductionSchedule[] = [];

export const SAMPLE_BRANCHES: Branch[] = DEFAULT_BRANCHES;
export const SAMPLE_ITEMS: InventoryItem[] = [];
export const SAMPLE_RECIPES: Recipe[] = [];

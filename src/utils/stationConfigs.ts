import { StationType, StationConfig, JobDescription, ChartOfAccount } from '../types';

export const STATION_CONFIGS: Record<StationType, StationConfig> = {
  barman: {
    id: 'station_barman',
    station: 'barman',
    titleAm: 'የባርማን ዴሊ ቆጠራ (Bar Station)',
    titleEn: 'Barman Daily Beverage Count',
    descriptionAm: 'የቢራ፣ የወይን፣ የአረቄ፣ የለስላሳ መጠጦች እና የኮክቴል ጥሬ እቃዎች እለታዊ ቆጠራና ርክክብ',
    descriptionEn: 'Daily inventory control for beers, wines, spirits, soft drinks, and cocktail ingredients',
    color: 'from-amber-600 to-yellow-600',
    defaultItemCategories: ['beverage', 'alcohol', 'soft_drink', 'liquor', 'wine', 'beer'],
  },
  juicer: {
    id: 'station_juicer',
    station: 'juicer',
    titleAm: 'የጁሰር ዴሊ ቆጠራ (Fresh Juice Bar)',
    titleEn: 'Juicer Fresh Fruit & Dairy Count',
    descriptionAm: 'የአቮካዶ፣ ማንጎ፣ ፓፓያ፣ ብርቱካን፣ ወተት፣ ስኳር፣ ዝንጅብልና ሌሎች የፍራፍሬ ግብዓቶች እለታዊ ቆጠራ',
    descriptionEn: 'Daily inventory control for avocados, mangoes, papayas, milk, sugar, and fresh fruits',
    color: 'from-emerald-600 to-teal-600',
    defaultItemCategories: ['produce', 'fruit', 'dairy', 'sweetener'],
  },
  cashier: {
    id: 'station_cashier',
    station: 'cashier',
    titleAm: 'የካሸር ሽያጭና የጥሬ ገንዘብ ርክክብ (Cashier / POS)',
    titleEn: 'Cashier POS & Cash Reconciliation',
    descriptionAm: 'የቀኑ የPOS ሽያጭ፣ የጥሬ ገንዘብ፣ የቴሌብር፣ የሲቢኢ ብርና የቮይድ ትኬቶች እለታዊ ቆጠራና ርክክብ',
    descriptionEn: 'Daily sales billing, cash register tally, Telebirr, CBE Birr, and void ticket reconciliation',
    color: 'from-rose-600 to-pink-600',
    defaultItemCategories: ['menu_sales', 'cash_drawer'],
  },
  storekeeper: {
    id: 'station_storekeeper',
    station: 'storekeeper',
    titleAm: 'የስቶር ኪፐር ገቢና ወጪ (Store & Receiving)',
    titleEn: 'Storekeeper Receiving & Stock Issuance',
    descriptionAm: 'የሴንትራል ስቶር ዕቃዎች ገቢ (GRN)፣ ለብራንች የወጡ (SIV) እና የቀኑ ቀሪ ቆጠራ',
    descriptionEn: 'Central store deliveries (GRN), branch requisitions (SIV), and stock balance counts',
    color: 'from-blue-600 to-indigo-600',
    defaultItemCategories: ['dry_goods', 'canned', 'spices', 'packaging', 'meat', 'dairy', 'produce'],
  },
  chef: {
    id: 'station_chef',
    station: 'chef',
    titleAm: 'የሼፍ ኪችን ኦርደርና ጥሬ ዕቃ (Kitchen KOT)',
    titleEn: 'Chef Kitchen KOT & Food Production',
    descriptionAm: 'በኩሽና የወጡ ምግቦች ብዛት (KOT)፣ የስጋ፣ የዶሮ፣ የፓስታና የቅመማ ቅመም እለታዊ የጥሬ ዕቃ ቆጠራ',
    descriptionEn: 'Actual kitchen ticket orders (KOT), meat, poultry, pasta, and primary recipe ingredients',
    color: 'from-purple-600 to-violet-600',
    defaultItemCategories: ['meat', 'poultry', 'pasta', 'dairy', 'produce', 'spices'],
  },
};

// ==========================================
// ETHIOPIAN PAYROLL & TAX ENGINE (Proclamation No. 979/2016)
// ==========================================
export interface EthiopianTaxBreakdown {
  taxableIncome: number;
  taxRatePct: number;
  deductionConstant: number;
  incomeTaxPayable: number;
  employeePension: number; // 7%
  employerPension: number; // 11%
  totalPension: number;    // 18%
}

export function calculateEthiopianPayeTax(grossTaxableIncome: number): EthiopianTaxBreakdown {
  const taxable = Math.max(0, grossTaxableIncome);
  let rate = 0;
  let constant = 0;

  if (taxable <= 600) {
    rate = 0;
    constant = 0;
  } else if (taxable <= 1650) {
    rate = 0.10;
    constant = 60;
  } else if (taxable <= 3200) {
    rate = 0.15;
    constant = 142.50;
  } else if (taxable <= 5250) {
    rate = 0.20;
    constant = 302.50;
  } else if (taxable <= 7800) {
    rate = 0.25;
    constant = 565;
  } else if (taxable <= 10900) {
    rate = 0.30;
    constant = 955;
  } else {
    rate = 0.35;
    constant = 1500;
  }

  const tax = Math.max(0, taxable * rate - constant);
  const employeePension = Number((taxable * 0.07).toFixed(2));
  const employerPension = Number((taxable * 0.11).toFixed(2));

  return {
    taxableIncome: Number(taxable.toFixed(2)),
    taxRatePct: rate * 100,
    deductionConstant: constant,
    incomeTaxPayable: Number(tax.toFixed(2)),
    employeePension,
    employerPension,
    totalPension: Number((employeePension + employerPension).toFixed(2)),
  };
}

// Generate Station Portal URL
export function createStationShareableUrl(station: StationType, branchId: string): string {
  if (typeof window === 'undefined') return '';
  const origin = window.location.origin;
  return `${origin}/?portal=${station}&branch=${branchId}`;
}

// ==========================================
// STANDARD CHART OF ACCOUNTS (USALI + ETHIOPIAN TAX)
// ==========================================
export const DEFAULT_CHART_OF_ACCOUNTS: ChartOfAccount[] = [
  // 1000 - Assets (ሀብት)
  { code: '1010', nameAm: 'ዋና የጥሬ ገንዘብ ካዝና (Cash in Vault)', nameEn: 'Cash in Vault', category: 'ASSET', isDebitNormal: true, balance: 0 },
  { code: '1020', nameAm: 'የንግድ ባንክ ሒሳብ (CBE Account)', nameEn: 'Commercial Bank of Ethiopia (CBE)', category: 'ASSET', isDebitNormal: true, balance: 0 },
  { code: '1030', nameAm: 'አዋሽ ባንክ ሒሳብ (Awash Bank)', nameEn: 'Awash Bank Account', category: 'ASSET', isDebitNormal: true, balance: 0 },
  { code: '1040', nameAm: 'ቴሌብር የንግድ ሒሳብ (Telebirr Merchant)', nameEn: 'Telebirr Merchant Account', category: 'ASSET', isDebitNormal: true, balance: 0 },
  { code: '1050', nameAm: 'የካሸሮች የጥሬ ገንዘብ መነሻ (Cashier Floats)', nameEn: 'Cashier Till Floats', category: 'ASSET', isDebitNormal: true, balance: 0 },
  { code: '1100', nameAm: 'የሴንትራል ስቶር ዕቃ ክምችት (Central Store Inventory)', nameEn: 'Central Store Food & Beverage Inventory', category: 'ASSET', isDebitNormal: true, balance: 0 },
  { code: '1120', nameAm: 'የቅርንጫፎች ዕቃ ክምችት (Branch Inventory)', nameEn: 'Branch Operating Inventory', category: 'ASSET', isDebitNormal: true, balance: 0 },
  { code: '1200', nameAm: 'የተሰብሳቢ ሒሳቦች (Accounts Receivable)', nameEn: 'Accounts Receivable (Corporate Catering)', category: 'ASSET', isDebitNormal: true, balance: 0 },

  // 2000 - Liabilities (እዳ)
  { code: '2010', nameAm: 'የአቅራቢዎች ተከፋይ ሒሳብ (Accounts Payable)', nameEn: 'Trade Accounts Payable (Suppliers)', category: 'LIABILITY', isDebitNormal: false, balance: 0 },
  { code: '2020', nameAm: 'ተከፋይ 15% ቫት (15% VAT Payable)', nameEn: '15% VAT Output Tax Payable', category: 'LIABILITY', isDebitNormal: false, balance: 0 },
  { code: '2030', nameAm: 'ተከፋይ የስራ ግብር (PAYE Tax Payable)', nameEn: 'Employee PAYE Income Tax Payable', category: 'LIABILITY', isDebitNormal: false, balance: 0 },
  { code: '2040', nameAm: 'ተከፋይ የጡረታ መዋጮ (18% Pension Payable)', nameEn: '18% Pension Contribution Payable', category: 'LIABILITY', isDebitNormal: false, balance: 0 },
  { code: '2050', nameAm: 'ተከፋይ 2% ዊዝሆልዲንግ ታክስ (2% WHT Payable)', nameEn: '2% Withholding Tax Payable', category: 'LIABILITY', isDebitNormal: false, balance: 0 },
  { code: '2060', nameAm: 'ተከፋይ የአገልግሎት ክፍያ (Service Charge Payable)', nameEn: '10% Staff Service Charge Pool', category: 'LIABILITY', isDebitNormal: false, balance: 0 },

  // 3000 - Equity (የባለቤት ካፒታል)
  { code: '3010', nameAm: 'የባለቤት ካፒታል (Owner Capital - Salsawi Seyoum)', nameEn: 'Owner Capital (Salsawi Seyoum)', category: 'EQUITY', isDebitNormal: false, balance: 0 },
  { code: '3020', nameAm: 'ያልተከፋፈለ የተጣራ ትርፍ (Retained Earnings)', nameEn: 'Retained Earnings', category: 'EQUITY', isDebitNormal: false, balance: 0 },

  // 4000 - Revenue (ገቢ)
  { code: '4010', nameAm: 'የምግብ ሽያጭ ገቢ (Food Sales Revenue)', nameEn: 'Food Dining & Takeaway Sales', category: 'REVENUE', isDebitNormal: false, balance: 0 },
  { code: '4020', nameAm: 'የባርና መጠጥ ሽያጭ ገቢ (Beverage & Bar Sales)', nameEn: 'Bar Alcoholic & Soft Beverage Sales', category: 'REVENUE', isDebitNormal: false, balance: 0 },
  { code: '4030', nameAm: 'የፍራፍሬና ጁስ ሽያጭ ገቢ (Fresh Juice Sales)', nameEn: 'Fresh Fruit Juice & Smoothie Sales', category: 'REVENUE', isDebitNormal: false, balance: 0 },
  { code: '4040', nameAm: 'የኬተሪንግና የዝግጅት ገቢ (Catering & Events)', nameEn: 'Banquets & Event Catering Revenue', category: 'REVENUE', isDebitNormal: false, balance: 0 },

  // 5000 - Cost of Goods Sold (የተሸጡ ዕቃዎች ወጪ - COGS)
  { code: '5010', nameAm: 'የምግብ ጥሬ ዕቃ ፍጆታ ወጪ (Food COGS)', nameEn: 'Food Raw Material Cost of Sales', category: 'COGS', isDebitNormal: true, balance: 0 },
  { code: '5020', nameAm: 'የመጠጥና ባር ዕቃ ወጪ (Beverage COGS)', nameEn: 'Bar & Beverage Cost of Sales', category: 'COGS', isDebitNormal: true, balance: 0 },
  { code: '5030', nameAm: 'የጁስና ፍራፍሬ ወጪ (Fresh Juice COGS)', nameEn: 'Juice Fruit & Dairy Cost of Sales', category: 'COGS', isDebitNormal: true, balance: 0 },

  // 6000 - Operating Expenses (የስራ ማስኬጃ ወጪዎች)
  { code: '6010', nameAm: 'የሰራተኞች ደመወዝ ወጪ (Salaries & Wages)', nameEn: 'Staff Basic Salaries & Allowances', category: 'EXPENSE', isDebitNormal: true, balance: 0 },
  { code: '6020', nameAm: 'የቀጣሪ 11% የጡረታ ወጪ (Employer Pension Expense)', nameEn: 'Employer 11% Pension Contribution Expense', category: 'EXPENSE', isDebitNormal: true, balance: 0 },
  { code: '6030', nameAm: 'የቤትና የህንጻ ኪራይ (Rent Expense)', nameEn: 'Restaurant Premises Rent Expense', category: 'EXPENSE', isDebitNormal: true, balance: 0 },
  { code: '6040', nameAm: 'የውሃና የመብራት ወጪ (Utilities - Water & Power)', nameEn: 'Utilities Expense (Water, Electricity, Generator Fuel)', category: 'EXPENSE', isDebitNormal: true, balance: 0 },
  { code: '6050', nameAm: 'ጥገናና ዕድሳት (Repairs & Maintenance)', nameEn: 'Kitchen & Bar Equipment Repairs', category: 'EXPENSE', isDebitNormal: true, balance: 0 },
  { code: '6060', nameAm: 'ማሸጊያና የጽዳት ዕቃዎች (Packaging & Cleaning)', nameEn: 'Takeaway Packaging & Stewarding Chemicals', category: 'EXPENSE', isDebitNormal: true, balance: 0 },
  { code: '6070', nameAm: 'የመጓጓዣና ነዳጅ ወጪ (Transport & Fuel)', nameEn: 'Purchasing Logistics & Vehicle Fuel', category: 'EXPENSE', isDebitNormal: true, balance: 0 },
];

// ==========================================
// STANDARD HOSPITALITY JOB DESCRIPTIONS
// ==========================================
export const STANDARD_JOB_DESCRIPTIONS: JobDescription[] = [
  {
    roleId: 'role_waiter',
    titleAm: 'አስተናጋጅ / ዌይተር (Waiter / Waitress)',
    titleEn: 'Front of House Waiter / Waitress',
    department: 'SERVICE_FOH',
    reportsTo: 'የቅርንጫፍ ስራ አስኪያጅ (Branch Manager) / ሱፐርቫይዘር',
    objectiveAm: 'ለደንበኞች ከፍተኛ ጥራት ያለው የኢትዮጵያና የአለም አቀፍ ደረጃ መስተንግዶ መስጠት፣ ትክክለኛ የሜኑ ገለጻ ማድረግና የሽያጭ ደረሰኝ ማስተናገድ።',
    objectiveEn: 'Provide impeccable food and beverage guest service, take accurate table orders, promote specials, and ensure customer satisfaction.',
    dutiesAm: [
      'ጠረጴዛዎችን በንጽህና ማዘጋጀት፣ ጨው፣ በርበሬና የወረቀት መጥረጊያዎችን ማሟላት',
      'ደንበኞችን በፈገግታ መቀበልና የሜኑ ምግቦችንና ዋጋዎችን በግልጽ ማስረዳት',
      'ትዕዛዞችን በካሸር POS ሲስተም ወይም በKOT ትኬት ያለ ምንም ስህተት ማስገባት',
      'የወጡ ምግቦችን ከኩሽና ወይም ከመጠጥ ባር በፍጥነትና በሙቀት ለደንበኛው ማድረስ',
      'ክፍያዎችን በካሸር በኩል ማስከፈልና የካሽ ወይም የዲጂታል (ቴሌብር/ባንክ) ደረሰኝ መስጠት',
    ],
    dutiesEn: [
      'Set tables with clean cutlery, condiments, napkins, and glassware prior to service',
      'Warmly greet guests, present food and beverage menus, and explain daily chef specials',
      'Accurately key in guest orders through the POS / KOT system with guest dietary notes',
      'Deliver freshly plated dishes and beverages to tables at the correct temperature',
      'Present guest folios and facilitate payment settlement with cashier',
    ],
    kpisAm: ['የደንበኞች እርካታ መጠን (>95%)', 'የትዕዛዝ ስህተት ዜሮ ማድረግ', 'የሽያጭ ማሳደግ (Upselling)'],
    kpisEn: ['Guest satisfaction rating (>95%)', 'Zero table order ticket discrepancies', 'Beverage upselling performance'],
    qualificationsAm: ['የሆቴልና ቱሪዝም ዲፕሎማ ወይም 1+ አመት ልምድ', 'ጥሩ የንግግርና የደንበኛ አቀባበል ችሎታ', 'ንቁና ታታሪ'],
    qualificationsEn: ['Certificate/Diploma in Hospitality or 1+ year service experience', 'Polite, active, and fluent customer communication'],
    dressCodeAm: 'ሙሉ ጥቁር ሱሪ/ቀሚስ፣ ነጭ ሸሚዝ፣ ጥቁር ክራባትና የአፕሮን ልብስ',
    dressCodeEn: 'Black trousers/skirt, pressed white shirt, black apron, and non-slip black shoes',
  },
  {
    roleId: 'role_barman',
    titleAm: 'ባርማን / የመጠጥ አዘጋጅ (Barman / Barista)',
    titleEn: 'Barman / Beverage Specialist',
    department: 'BAR',
    reportsTo: 'የቅርንጫፍ ስራ አስኪያጅ (Branch Manager)',
    objectiveAm: 'የቀዝቃዛና የሙቅ መጠጦችን፣ ኮክቴሎችንና ቢራዎችን በስታንዳርድ ሬሲፒ መሰረት ማዘጋጀትና የባር እቃዎችን እለታዊ ቆጠራ ማካሄድ።',
    objectiveEn: 'Prepare alcoholic and non-alcoholic drinks according to standard recipe portioning, maintaining zero bar shrinkage.',
    dutiesAm: [
      'በየቀኑ ጠዋት የባር ቆጠራ (የአደረ፣ የገባ፣ የተሸጠ፣ ቀሪ) ማካሄድና በባርማን ፖርታል መመዝገብ',
      'የጠርሙስ ስብራትና ብልሽት (Wreckage/Damage) ሲኖር ወዲያውኑ መመዝገብ',
      'ኮክቴሎችን በብርጭቆ መለኪያ (Jigger/Oz) ስታንዳርድ ብቻ ማዘጋጀት',
      'የፍሪጅና የባር ቆጣሪዎችን ንጽህና በየሰዓቱ መጠበቅ',
      'ከሴንትራል ስቶር የመጡ መጠጦችን በSIV ቫውቸር ተቀብሎ መደርደር',
    ],
    dutiesEn: [
      'Conduct daily physical opening and closing bottle counts via the Barman Station Portal',
      'Immediately log broken bottles or damaged beverages in the wreckage ledger',
      'Pour all spirits and cocktails using strict jigger/portion controls according to recipes',
      'Keep beverage chillers and bar countertops immaculately sanitized',
      'Receive SIV beverage transfers from Central Store and log onto the bar bin card',
    ],
    kpisAm: ['የመጠጥ ልዩነት/ጉድለት ከ 0.5% በታች', 'የመጠጥ ጥራትና ፍጥነት', 'የስብራት ቁጥጥር'],
    kpisEn: ['Beverage variance below 0.5%', 'Consistent cocktail quality and prep speed', 'Zero unrecorded breakage'],
    qualificationsAm: ['የባርማንና ባሪስታ ስልጠና ሰርተፊኬት', '1+ አመት በከፍተኛ ሆቴል/ሬስቶራንት የሰራ'],
    qualificationsEn: ['Certified Barman/Barista training', '1+ year experience in reputable lounge/hotel bar'],
    dressCodeAm: 'የባርማን ጥቁር ዩኒፎርም፣ የቆዳ ወይም የጨርቅ ባር አፕሮን',
    dressCodeEn: 'Black professional bar vest, crisp shirt, bow tie, and bar apron',
  },
  {
    roleId: 'role_juicer',
    titleAm: 'ጁሰር / የፍራፍሬ አዘጋጅ (Juicer / Fresh Fruit Bartender)',
    titleEn: 'Juicer & Fresh Fruit Bar Master',
    department: 'JUICE_BAR',
    reportsTo: 'የቅርንጫፍ ስራ አስኪያጅ (Branch Manager)',
    objectiveAm: 'ንጹህና ጤናማ ትኩስ ፍራፍሬዎችን መርጦ ማዘጋጀት፣ አቮካዶ፣ ማንጎ፣ ፓፓያ፣ ወተትና ስኳርን በሬሲፒ በመጠቀም ጁስ ማቅረብ።',
    objectiveEn: 'Produce fresh fruit juices, smoothies, and fruit platters following hygiene and strict weight recipes.',
    dutiesAm: [
      'የቀኑን የፍራፍሬ ግብዓቶች (አቮካዶ፣ ማንጎ፣ ፓፓያ፣ ብርቱካን፣ ወተት) መነሻና ቀሪ በጁሰር ፖርታል መመዝገብ',
      'የበሰበሰ ወይም የተበላሸ ፍራፍሬ ሲኖር በWreckage Damage መመዝገብ',
      'የጁስ ማሽኖችን፣ ቢላዎችንና መክተፊያዎችን በየጊዜው በሙቅ ውሃና ሳሙና ማጽዳት',
      'በአንድ ብርጭቆ የሚገባውን የፍራፍሬ ግራም በሬሲፒው መሰረት ጠብቆ መጭመቅ',
      'ለሰራተኛ የተሰጠ ወይም የተበላ ፍራፍሬ ሲኖር በManagement Tally መመዝገብ',
    ],
    dutiesEn: [
      'Log daily fruit inputs (avocado, mango, papaya, milk) and on-hand counts via the Juicer Portal',
      'Log any overripe or spoiled fruit directly in the station spoilage register',
      'Disinfect fruit blenders, knives, and prep cutting boards after every batch',
      'Adhere to the standard gram portion for each glass of juice to protect food cost',
      'Record any manager-approved fruit tasting or staff smoothies under management consumption',
    ],
    kpisAm: ['የፍራፍሬ ብክነት ከ 3% በታች', 'ትኩስነትና የንጽህና ደረጃ 100%', 'የደንበኛ አድናቆት'],
    kpisEn: ['Fruit wastage under 3%', '100% food hygiene score', 'Zero customer complaints on taste/freshness'],
    qualificationsAm: ['የምግብ አያያዝና ንጽህና ስልጠና', 'የጁስና የፍራፍሬ አሰራር ልምድ'],
    qualificationsEn: ['Food hygiene & food safety certification', 'Prior fresh juice bar experience'],
    dressCodeAm: 'አረንጓዴ ወይም ነጭ ንጹህ አፕሮን፣ የጸጉር ቆብና ጓንት',
    dressCodeEn: 'Clean juice bar apron, hair net / chef cap, and food handling gloves',
  },
  {
    roleId: 'role_cashier',
    titleAm: 'ካሸር / የሂሳብ ተቀባይ (Branch Cashier)',
    titleEn: 'Head Cashier & POS Custodian',
    department: 'CASHIER_POS',
    reportsTo: 'የፋይናንስ ኦፊሰር (Finance Officer) / የቅርንጫፍ ስራ አስኪያጅ',
    objectiveAm: 'የደንበኞችን የሽያጭ ክፍያ በPOS ማሽን በትክክል መመዝገብ፣ ጥሬ ገንዘብ፣ ቴሌብርና የባንክ ክፍያዎችን ማመሳከርና የቀን ሂሳብ ማዘጋጀት።',
    objectiveEn: 'Execute flawless cashier billing, handle cash drawer settlement, reconcile POS transactions with digital payments.',
    dutiesAm: [
      'ጠዋት የመነሻ ጥሬ ገንዘብ (Float Cash) ቆጥሮ መረከብ',
      'ለእያንዳንዱ ሽያጭ ህጋዊ የPOS ደረሰኝ ወዲያውኑ ማውጣት',
      'የቴሌብርና የባንክ ክፍያዎች ሲደረጉ የግብይት ቁጥር (SMS/Ref) ማረጋገጥ',
      'የተሰረዘ ወይም ቮይድ (Void) ትኬት ካለ ምክንያት ጠቅሶ በስራ አስኪያጅ ማስፈረም',
      'በቀኑ መጨረሻ የሽያጭ ሪፖርት አውጥቶ በካሸር ፖርታል መመዝገብና ገንዘቡን ማስረከብ',
    ],
    dutiesEn: [
      'Count and verify morning till cash float balance at shift opening',
      'Generate authorized POS sales receipts for every dining and takeout transaction',
      'Verify transaction reference codes for all Telebirr and bank mobile transfers',
      'Require manager sign-off for any void or cancelled check with written audit reasons',
      'Balance cash drawer against POS daily summary and submit figures via the Cashier Portal',
    ],
    kpisAm: ['የገንዘብ ጉድለት/ትርፍ ዜሮ (0.00 ETB)', 'የተሟላ የሽያጭ ደረሰኝ መስጠት', 'ፈጣን አገልግሎት'],
    kpisEn: ['Zero cash drawer variance (0.00 ETB)', '100% receipt issuance compliance', 'Speed of checkout'],
    qualificationsAm: ['የአካውንቲንግ ወይም የፋይናንስ ዲፕሎማ', 'የPOS ሲስተም ዕውቀት', 'ታማኝነትና ትክክለኛነት'],
    qualificationsEn: ['Diploma in Accounting, Finance, or Banking', 'POS software fluency', 'High integrity and numerical speed'],
    dressCodeAm: 'ዘመናዊና የተከበረ የቢሮ/ካሸር ልብስ፣ የድርጅቱ መለያ ባጅ',
    dressCodeEn: 'Smart corporate attire with Bello Fam company identification badge',
  },
  {
    roleId: 'role_chef',
    titleAm: 'ዋና ሼፍ / ኪችን ማስተር (Executive / Sous Chef)',
    titleEn: 'Executive & Line Kitchen Chef',
    department: 'KITCHEN_BOH',
    reportsTo: 'የምግብና መጠጥ ቁጥጥር (F&B Controller) / ስራ አስኪያጅ',
    objectiveAm: 'ምግቦችን በስታንዳርድ ሬሲፒ መሰረት ማብሰል፣ የኩሽና ጥሬ ዕቃዎችን መቆጣጠርና የኩሽና ትኬት (KOT) ቆጠራን መምራት።',
    objectiveEn: 'Deliver delicious, standardized culinary dishes, maintain kitchen portion controls, and manage daily kitchen stock.',
    dutiesAm: [
      'በየቀኑ ጠዋትና ማታ የጥሬ ዕቃዎች ቆጠራ (ስጋ፣ ዶሮ፣ ፓስታ፣ አትክልት) ማካሄድ',
      'የኩሽና የትዕዛዝ ቅጂዎችን (KOT Slips) በሙሉ ጠብቆ ለኦዲት ማቅረብ',
      'ምግቦች ሲበስሉ በሬሲፒው ግራም መሰረት ብቻ እንዲዘጋጁ ማዘዝ',
      'የተበላሸ ምግብ ወይም ብክነት ሲኖር በWreckage Damage መዝግቦ ለስራ አስኪያጅ ማሳወቅ',
      'የሰራተኞች ምግብ (Staff Meal) ሲዘጋጅ መጠንና ወጪውን መዝግቦ መያዝ',
    ],
    dutiesEn: [
      'Conduct daily physical stock audits for raw meats, poultry, pasta, and dairy via Chef Portal',
      'Retain and organize all kitchen duplicate captain slips (KOTs) for daily sales reconciliation',
      'Enforce strict adherence to standardized recipe gram weights during food prep',
      'Immediately log spoiled sauces or burnt food under kitchen wastage records',
      'Record raw materials consumed for staff lunch/dinner under staff meal allocation',
    ],
    kpisAm: ['የምግብ ወጪ (Food Cost %) በ 32-35% ጣሪያ ውስጥ መጠበቅ', 'የምግብ ጣዕም ወጥነት', 'የኩሽና ንጽህና'],
    kpisEn: ['Maintain food cost % within 32-35% target', 'Culinary consistency & plating precision', 'Kitchen sanitation rating'],
    qualificationsAm: ['የምግብ ማብሰል ጥበብ (Culinary Arts) ዲፕሎማ', '3+ አመት የሼፍነት ልምድ'],
    qualificationsEn: ['Diploma in Culinary Arts / Commercial Cooking', '3+ years culinary line lead experience'],
    dressCodeAm: 'ነጭ የሼፍ ኮት፣ የሼፍ ቆብ፣ ጥቁር ሱሪና የማያንሸራትት ጫማ',
    dressCodeEn: 'White double-breasted chef jacket, tall chef toque/cap, apron, and steel-toe kitchen clogs',
  },
  {
    roleId: 'role_storekeeper',
    titleAm: 'ስቶር ኪፐር / የንብረት ሃላፊ (Storekeeper)',
    titleEn: 'Materials & Central Storekeeper',
    department: 'STORE_PURCHASE',
    reportsTo: 'የንብረት አስተዳዳሪ (Inventory Manager) / ፋይናንስ ኦፊሰር',
    objectiveAm: 'ወደ ስቶር የሚገቡ እቃዎችን (GRN) በክብደትና በጥራት መረከብ፣ ለብራንቾች በSIV ማስተላለፍና የቢን ካርድ ባላንስ መጠበቅ።',
    objectiveEn: 'Inspect and receive vendor food deliveries with digital scales, disburse goods via authorized SIVs, and keep bin cards updated.',
    dutiesAm: [
      'የገቡ እቃዎችን ዋጋ፣ ክብደትና ጥራት ፈትሾ በGRN መዝግቦ መረከብ',
      'ያለ ህጋዊ የSIV ወጪ ማዘዣ ቫውቸር ምንም አይነት እቃ ለቅርንጫፍ አለመልቀቅ',
      'የአትክልትና የስጋ ማቀዝቀዣዎችን የሙቀት መጠን በቀን 3 ጊዜ መቆጣጠር',
      'በየቀኑ የስቶር ቀሪ ቆጠራን በስቶር ኪፐር ፖርታል ማረጋገጥ',
      'የማለቂያ ቀናቸው (Expiry Date) የተቃረቡ እቃዎችን ቀድመው እንዲወጡ (FIFO) ማድረግ',
    ],
    dutiesEn: [
      'Inspect vendor deliveries against purchase orders and generate official GRNs with unit pricing',
      'Never release any inventory to branches without an authorized and signed SIV voucher',
      'Monitor walk-in chiller and freezer temperatures three times daily to protect perishable stock',
      'Execute daily closing counts and reconcile physical shelf stock with the Storekeeper Portal',
      'Enforce First-In-First-Out (FIFO) stock rotation to eliminate spoilage before expiry',
    ],
    kpisAm: ['የስቶር ልዩነት ዜሮ (0.00%)', 'ትክክለኛ የGRN እና የSIV ሰነዶች', 'ዜሮ የዕቃ ማለቂያ ብክነት'],
    kpisEn: ['Zero store bin card variance (0.00%)', '100% voucher documentation compliance', 'Zero expired stock loss'],
    qualificationsAm: ['የሰፕላይ ቼይን ወይም የአካውንቲንግ ዲፕሎማ', '2+ አመት የስቶር ስራ ልምድ'],
    qualificationsEn: ['Diploma in Supply Chain Management or Accounting', '2+ years hospitality storekeeping experience'],
    dressCodeAm: 'የስቶር ኪፐር የስራ ካፖርት/ጃኬት፣ የእጅ ጓንትና የስራ ጫማ',
    dressCodeEn: 'Durable warehouse coat/vest, heavy-duty gloves, and steel-toe warehouse boots',
  },
];

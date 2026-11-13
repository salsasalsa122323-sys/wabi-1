import {
  ExcelParsedRow,
  ExcelUploadedBatch,
  FullReconciliationReport,
  InventoryItem,
  Recipe,
  Branch,
  ItemUsageVariance,
  StoreTransferDiscrepancy,
  SalesDiscrepancy,
  AnomalyFinding,
  LearnedAlias,
} from '../types';
import { convertQuantity } from './unitConverter';
import { smartMatchMenuItem } from './searchMatcher';

export interface ReconciliationChainInput {
  branch: Branch;
  period: string; // YYYY-MM-DD
  items: InventoryItem[];
  recipes: Recipe[];
  uploadedBatches: ExcelUploadedBatch[];
  learnedAliases: LearnedAlias[];
  toleranceMarginPercent?: number; // default 0 (strict)
  selectedPrimaryItemIds?: string[]; // primary materials filter to avoid controller fatigue
}

/**
 * Executes the 4-Stage Deterministic Reconciliation Chain
 * Store -> Store-to-Branch Transfers -> Branch Usage vs Recipes -> POS vs Kitchen Sales
 */
export function runDeterministicReconciliationChain(
  input: ReconciliationChainInput
): FullReconciliationReport {
  const {
    branch,
    period,
    items,
    recipes,
    uploadedBatches,
    learnedAliases,
    toleranceMarginPercent = 0,
    selectedPrimaryItemIds,
  } = input;

  const branchId = branch.id;
  const branchName = branch.nameAm || branch.nameEn;

  // Helper: Resolve raw item name from Excel to InventoryItem using aliases or fuzzy matching
  const resolveItem = (rawName: string): InventoryItem | undefined => {
    if (!rawName) return undefined;
    const cleanRaw = rawName.trim().toLowerCase();

    // 1. Check persistent learned aliases first
    const aliasMatch = learnedAliases.find(
      (a) => a.rawExcelName.trim().toLowerCase() === cleanRaw
    );
    if (aliasMatch) {
      const found = items.find((i) => i.id === aliasMatch.targetItemId);
      if (found) return found;
    }

    // 2. Exact match by nameAm, nameEn, or code
    const exact = items.find(
      (i) =>
        i.nameAm.trim().toLowerCase() === cleanRaw ||
        i.nameEn.trim().toLowerCase() === cleanRaw ||
        (i.code && i.code.trim().toLowerCase() === cleanRaw)
    );
    if (exact) return exact;

    // 3. Smart fuzzy matching
    return items.find((i) =>
      smartMatchMenuItem(cleanRaw, {
        nameAm: i.nameAm,
        nameEn: i.nameEn,
        code: i.code,
      })
    );
  };

  // Helper: Filter rows belonging to this branch (or Central Store for store issues)
  const isBranchRow = (row: ExcelParsedRow): boolean => {
    if (!row.branchName) return true; // Default to current branch if unspecified
    const bLower = row.branchName.toLowerCase();
    const targetNameLower = branch.nameEn.toLowerCase();
    const targetAmLower = branch.nameAm.toLowerCase();
    const targetCode = branch.code.toLowerCase();

    return (
      bLower.includes(targetNameLower) ||
      bLower.includes(targetAmLower) ||
      bLower.includes(targetCode) ||
      (branchId.includes('6kilo') && (bLower.includes('6 kilo') || bLower.includes('6kilo') || bLower.includes('kokonut'))) ||
      (branchId.includes('shola') && bLower.includes('shola'))
    );
  };

  // Extract relevant rows from uploaded batches
  const storeIssueRows: ExcelParsedRow[] = [];
  const kitchenCountRows: ExcelParsedRow[] = [];
  const kitchenProdRows: ExcelParsedRow[] = [];
  const cashierSalesRows: ExcelParsedRow[] = [];

  uploadedBatches.forEach((batch) => {
    if (batch.fileType === 'store_issues') {
      batch.parsedRows.forEach((r) => {
        if (isBranchRow(r)) storeIssueRows.push(r);
      });
    } else if (batch.fileType === 'kitchen_stock_counts') {
      batch.parsedRows.forEach((r) => {
        if (isBranchRow(r)) kitchenCountRows.push(r);
      });
    } else if (batch.fileType === 'kitchen_production') {
      batch.parsedRows.forEach((r) => {
        if (isBranchRow(r)) kitchenProdRows.push(r);
      });
    } else if (batch.fileType === 'cashier_sales') {
      batch.parsedRows.forEach((r) => {
        if (isBranchRow(r)) cashierSalesRows.push(r);
      });
    }
  });

  // Track missing data warnings
  const missingDataWarnings: string[] = [];
  if (storeIssueRows.length === 0) {
    missingDataWarnings.push(`የስቶር ማስተላለፊያ (Store Issues SIV) ፋይል ለ${branchName} አልተካተተም`);
  }
  if (kitchenCountRows.length === 0) {
    missingDataWarnings.push(`የኩሽና ቆጠራ (Kitchen Stock Count) ፋይል ለ${branchName} አልተካተተም`);
  }
  if (cashierSalesRows.length === 0) {
    missingDataWarnings.push(`የካሸር ሽያጭ (Cashier Sales) ፋይል ለ${branchName} አልተካተተም`);
  }

  // --------------------------------------------------------------------------
  // STAGE 2: STORE -> BRANCH TRANSFER CROSS-MATCHING (SIV Issued vs Received)
  // --------------------------------------------------------------------------
  const storeTransferDiscrepancies: StoreTransferDiscrepancy[] = [];

  // Group store issues by item and SIV
  const storeIssuesByItem: Record<string, { totalQty: number; rows: ExcelParsedRow[]; siv: string }> = {};
  storeIssueRows.forEach((r) => {
    const item = resolveItem(r.itemName);
    const key = item ? item.id : r.itemName.toLowerCase().trim();
    if (!storeIssuesByItem[key]) {
      storeIssuesByItem[key] = { totalQty: 0, rows: [], siv: r.refNo || 'SIV-AUTO' };
    }
    storeIssuesByItem[key].totalQty += r.quantity;
    storeIssuesByItem[key].rows.push(r);
  });

  // Compare with kitchen receipts reported in stock count rows
  const kitchenReceiptsByItem: Record<string, { totalQty: number; rows: ExcelParsedRow[] }> = {};
  kitchenCountRows.forEach((r) => {
    const item = resolveItem(r.itemName);
    const key = item ? item.id : r.itemName.toLowerCase().trim();
    const qty = r.receivedStock !== undefined && r.receivedStock !== null ? r.receivedStock : r.quantity;
    if (!kitchenReceiptsByItem[key]) {
      kitchenReceiptsByItem[key] = { totalQty: 0, rows: [] };
    }
    kitchenReceiptsByItem[key].totalQty += qty;
    kitchenReceiptsByItem[key].rows.push(r);
  });

  // Check all store-issued items
  Object.keys(storeIssuesByItem).forEach((key) => {
    const storeData = storeIssuesByItem[key];
    const kitchenData = kitchenReceiptsByItem[key] || { totalQty: 0, rows: [] };
    const item = items.find((i) => i.id === key);
    const itemName = item ? (item.nameAm || item.nameEn) : (storeData.rows[0]?.itemName || key);
    const unit = item ? (item.unitAm || item.unit) : (storeData.rows[0]?.unit || 'kg');
    const unitCost = item ? (item.lastPurchasePrice || item.weightedAvgCost || 0) : (storeData.rows[0]?.unitPrice || 0);

    const diff = kitchenData.totalQty - storeData.totalQty;
    const diffValue = Math.abs(diff) * unitCost;

    let status: StoreTransferDiscrepancy['status'] = 'MATCHED';
    if (Math.abs(diff) > 0.001) {
      status = diff < 0 ? 'SHORTAGE_AT_BRANCH' : 'OVER_RECEIVED';
    }

    storeTransferDiscrepancies.push({
      id: `std-${key}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      itemId: key,
      itemName,
      unit,
      sivNumber: storeData.siv,
      refNo: storeData.siv,
      storeIssuedQty: Number(storeData.totalQty.toFixed(3)),
      branchReceivedQty: Number(kitchenData.totalQty.toFixed(3)),
      discrepancyQty: Number(diff.toFixed(3)),
      unitCost: Number(unitCost.toFixed(2)),
      discrepancyValueEtb: Number(diffValue.toFixed(2)),
      status,
      storeSourceRow: storeData.rows[0],
      branchSourceRow: kitchenData.rows[0],
    });
  });

  // Check items received by kitchen but not in store issues
  Object.keys(kitchenReceiptsByItem).forEach((key) => {
    if (!storeIssuesByItem[key]) {
      const kitchenData = kitchenReceiptsByItem[key];
      const item = items.find((i) => i.id === key);
      const itemName = item ? (item.nameAm || item.nameEn) : (kitchenData.rows[0]?.itemName || key);
      const unit = item ? (item.unitAm || item.unit) : (kitchenData.rows[0]?.unit || 'kg');
      const unitCost = item ? (item.lastPurchasePrice || item.weightedAvgCost || 0) : 0;

      storeTransferDiscrepancies.push({
        id: `std-extra-${key}-${Date.now()}`,
        itemId: key,
        itemName,
        unit,
        sivNumber: 'NO-STORE-SIV',
        refNo: 'UNACKNOWLEDGED',
        storeIssuedQty: 0,
        branchReceivedQty: Number(kitchenData.totalQty.toFixed(3)),
        discrepancyQty: Number(kitchenData.totalQty.toFixed(3)),
        unitCost: Number(unitCost.toFixed(2)),
        discrepancyValueEtb: Number((kitchenData.totalQty * unitCost).toFixed(2)),
        status: 'STORE_UNACKNOWLEDGED',
        branchSourceRow: kitchenData.rows[0],
      });
    }
  });

  // --------------------------------------------------------------------------
  // STAGE 4: POS CASHIER SALES VS KITCHEN PRODUCTION MATCHING
  // --------------------------------------------------------------------------
  const salesDiscrepancies: SalesDiscrepancy[] = [];

  // Group cashier sales by dish name
  const cashierSalesByDish: Record<string, { qty: number; totalAmount: number; unitPrice: number; rows: ExcelParsedRow[] }> = {};
  cashierSalesRows.forEach((r) => {
    const dishKey = r.itemName.trim().toLowerCase();
    if (!cashierSalesByDish[dishKey]) {
      cashierSalesByDish[dishKey] = { qty: 0, totalAmount: 0, unitPrice: r.unitPrice || 0, rows: [] };
    }
    cashierSalesByDish[dishKey].qty += r.quantity;
    cashierSalesByDish[dishKey].totalAmount += r.totalAmount || (r.quantity * r.unitPrice);
    cashierSalesByDish[dishKey].rows.push(r);
  });

  // Group kitchen production tickets by dish name
  const kitchenProdByDish: Record<string, { qty: number; rows: ExcelParsedRow[] }> = {};
  kitchenProdRows.forEach((r) => {
    const dishKey = r.itemName.trim().toLowerCase();
    if (!kitchenProdByDish[dishKey]) {
      kitchenProdByDish[dishKey] = { qty: 0, rows: [] };
    }
    kitchenProdByDish[dishKey].qty += r.quantity;
    kitchenProdByDish[dishKey].rows.push(r);
  });

  const allDishKeys = Array.from(new Set([...Object.keys(cashierSalesByDish), ...Object.keys(kitchenProdByDish)]));

  allDishKeys.forEach((dishKey) => {
    const cashData = cashierSalesByDish[dishKey] || { qty: 0, totalAmount: 0, unitPrice: 0, rows: [] };
    const prodData = kitchenProdByDish[dishKey] || { qty: 0, rows: [] };
    const dishName = cashData.rows[0]?.itemName || prodData.rows[0]?.itemName || dishKey;
    const diff = cashData.qty - prodData.qty;
    const unitPrice = cashData.unitPrice || (prodData.rows[0]?.unitPrice || 0);

    let status: SalesDiscrepancy['status'] = 'MATCHED';
    if (Math.abs(diff) > 0.001) {
      if (prodData.qty === 0 && cashData.qty > 0) {
        status = 'SOLD_UNPRODUCED';
      } else if (cashData.qty === 0 && prodData.qty > 0) {
        status = 'PRODUCED_UNSOLD';
      } else if (diff > 0) {
        status = 'SOLD_UNPRODUCED';
      } else {
        status = 'PRODUCED_UNSOLD';
      }
    }

    salesDiscrepancies.push({
      id: `sd-${dishKey}-${Date.now()}`,
      menuItemId: dishKey,
      menuItemName: dishName,
      date: cashData.rows[0]?.date || prodData.rows[0]?.date || period,
      shift: cashData.rows[0]?.shift || prodData.rows[0]?.shift,
      cashierSoldQty: cashData.qty,
      kitchenProducedQty: prodData.qty,
      discrepancyQty: diff,
      menuPrice: unitPrice,
      discrepancyAmount: Number((Math.abs(diff) * unitPrice).toFixed(2)),
      status,
      cashierSourceRow: cashData.rows[0],
      kitchenSourceRow: prodData.rows[0],
    });
  });

  // --------------------------------------------------------------------------
  // STAGE 3: BRANCH USAGE RECONCILIATION (ACTUAL USAGE VS RECIPE EXPECTED)
  // --------------------------------------------------------------------------
  // Branch recipes
  const branchRecipes = recipes.filter(
    (r) => !r.branchId || r.branchId === branchId
  );

  // Compute Expected Ingredient Usage based on Cashier POS sales & recipes
  const expectedIngredientUsage: Record<string, { qty: number; sourceRows: ExcelParsedRow[] }> = {};

  Object.keys(cashierSalesByDish).forEach((dishKey) => {
    const cashData = cashierSalesByDish[dishKey];
    // Find recipe matching dish name
    const recipe = branchRecipes.find(
      (r) =>
        r.nameAm.trim().toLowerCase() === dishKey ||
        r.nameEn.trim().toLowerCase() === dishKey ||
        smartMatchMenuItem(dishKey, { nameAm: r.nameAm, nameEn: r.nameEn })
    );

    if (recipe) {
      recipe.ingredients.forEach((ing) => {
        if (!expectedIngredientUsage[ing.itemId]) {
          expectedIngredientUsage[ing.itemId] = { qty: 0, sourceRows: [] };
        }
        const needed = ing.quantity * cashData.qty;
        expectedIngredientUsage[ing.itemId].qty += needed;
        expectedIngredientUsage[ing.itemId].sourceRows.push(...cashData.rows);
      });
    }
  });

  // Calculate Actual Usage for each item present in Kitchen Counts or Store Issues
  const itemVariances: ItemUsageVariance[] = [];
  const processedItemIds = new Set<string>();

  kitchenCountRows.forEach((countRow) => {
    const item = resolveItem(countRow.itemName);
    const itemId = item ? item.id : countRow.itemName.trim().toLowerCase();

    // Primary items filter: focus on core materials (meat, oil, teff, dairy) to eliminate fatigue
    if (selectedPrimaryItemIds && selectedPrimaryItemIds.length > 0) {
      if (!selectedPrimaryItemIds.includes(itemId)) {
        return;
      }
    }

    if (processedItemIds.has(itemId)) return;
    processedItemIds.add(itemId);

    const unit = item ? (item.unitAm || item.unit) : (countRow.unit || 'kg');
    const unitCost = item ? (item.lastPurchasePrice || item.weightedAvgCost || 0) : (countRow.unitPrice || 0);

    const openingStock = cleanPositive(countRow.openingStock);
    const storeIssueMatch = storeIssuesByItem[itemId]?.totalQty || 0;
    const receivedFromStore = countRow.receivedStock !== undefined && countRow.receivedStock !== null
      ? cleanPositive(countRow.receivedStock)
      : storeIssueMatch;
    const wastage = cleanPositive(countRow.wastage);
    const closingStock = countRow.closingStock !== undefined && countRow.closingStock !== null
      ? cleanPositive(countRow.closingStock)
      : cleanPositive(countRow.quantity);

    // Actual Usage = Opening + Received - Closing - Wastage
    const actualUsage = Math.max(0, openingStock + receivedFromStore - closingStock - wastage);

    // Expected Usage
    const expected = expectedIngredientUsage[itemId]?.qty || 0;

    // Variance Quantity = Actual Usage - Expected Usage
    // Positive difference means actual consumption was greater than recipe sales -> Shortage / Loss
    const varianceQty = actualUsage - expected;
    const varianceValueEtb = Number((varianceQty * unitCost).toFixed(2));

    let status: ItemUsageVariance['status'] = 'Matched';
    let suspectedCause: string | undefined = undefined;

    if (expected === 0 && actualUsage > 0) {
      status = 'Not matched';
      suspectedCause = 'ምንም የካሸር ሽያጭ ሳይመዘገብ ግብአት ወጪ ተደርጓል (Consumed with zero POS sales)';
    } else if (varianceQty > 0.05) {
      status = 'Shortage';
      suspectedCause = 'ከመደበኛ ሪሲፒ በላይ ወጪ ሆኗል ወይም ብክነት አልተመዘገበም (Possible shrinkage or over-portioning)';
    } else if (varianceQty < -0.05) {
      status = 'Overage';
      suspectedCause = 'ሳይመዘገብ የተሸጠ ወይም በሪሲፒው አነስተኛ መጠን ተጠቅሟል (Under-portioning or unrecorded receipt)';
    }

    itemVariances.push({
      id: `var-${itemId}-${Date.now()}`,
      itemId,
      itemNameAm: item ? item.nameAm : countRow.itemName,
      itemNameEn: item ? item.nameEn : countRow.itemName,
      unit,
      unitCost,
      openingStock: Number(openingStock.toFixed(3)),
      receivedFromStore: Number(receivedFromStore.toFixed(3)),
      wastage: Number(wastage.toFixed(3)),
      closingStock: Number(closingStock.toFixed(3)),
      actualUsage: Number(actualUsage.toFixed(3)),
      expectedUsageFromSales: Number(expected.toFixed(3)),
      varianceQuantity: Number(varianceQty.toFixed(3)),
      varianceValueEtb,
      status,
      suspectedCause,
      sourceRows: [countRow, ...(storeIssuesByItem[itemId]?.rows || [])],
    });
  });

  // Also check expected items from recipe sales that might have been missing from the count rows
  Object.keys(expectedIngredientUsage).forEach((expectedItemId) => {
    if (processedItemIds.has(expectedItemId)) return;
    if (selectedPrimaryItemIds && selectedPrimaryItemIds.length > 0 && !selectedPrimaryItemIds.includes(expectedItemId)) {
      return;
    }
    processedItemIds.add(expectedItemId);
    const item = items.find((i) => i.id === expectedItemId);
    const unit = item ? (item.unitAm || item.unit) : 'kg';
    const unitCost = item ? (item.lastPurchasePrice || item.weightedAvgCost || 0) : 0;
    const expected = expectedIngredientUsage[expectedItemId].qty;

    itemVariances.push({
      id: `var-miss-${expectedItemId}-${Date.now()}`,
      itemId: expectedItemId,
      itemNameAm: item ? item.nameAm : expectedItemId,
      itemNameEn: item ? item.nameEn : expectedItemId,
      unit,
      unitCost,
      openingStock: 0,
      receivedFromStore: 0,
      wastage: 0,
      closingStock: 0,
      actualUsage: 0,
      expectedUsageFromSales: Number(expected.toFixed(3)),
      varianceQuantity: Number((-expected).toFixed(3)),
      varianceValueEtb: Number((-expected * unitCost).toFixed(2)),
      status: 'Missing data',
      suspectedCause: 'በሽያጭ ውስጥ የተካተተ ግብአት ግን በቆጠራ መዝገብ ላይ አልተገኘም (Missing physical count)',
      sourceRows: expectedIngredientUsage[expectedItemId].sourceRows,
    });
  });


  // Calculate totals
  let totalSalesRevenue = 0;
  cashierSalesRows.forEach((r) => {
    totalSalesRevenue += r.totalAmount || (r.quantity * (r.unitPrice || 0));
  });

  let totalActualUsageCost = 0;
  let totalExpectedCost = 0;
  let totalVarianceLossValue = 0;

  itemVariances.forEach((iv) => {
    totalActualUsageCost += iv.actualUsage * iv.unitCost;
    totalExpectedCost += iv.expectedUsageFromSales * iv.unitCost;
    if (iv.varianceValueEtb > 0) {
      totalVarianceLossValue += iv.varianceValueEtb;
    }
  });

  // Sort variances by monetary impact (highest loss first)
  itemVariances.sort((a, b) => Math.abs(b.varianceValueEtb) - Math.abs(a.varianceValueEtb));

  // --------------------------------------------------------------------------
  // ANOMALY PATTERN DETECTION
  // --------------------------------------------------------------------------
  const anomalies: AnomalyFinding[] = [];

  // Check 1: Top monetary loss
  const highLossItems = itemVariances.filter((iv) => iv.varianceValueEtb > 1000);
  if (highLossItems.length > 0) {
    anomalies.push({
      title: 'ከፍተኛ የገንዘብ ጉድለት የታየባቸው ግብአቶች (High Financial Impact)',
      severity: 'HIGH',
      description: `${highLossItems.length} ግብአቶች ከ1,000 ብር በላይ ጉድለት አሳይተዋል። አፋጣኝ አካላዊ ቆጠራ እና ቁጥጥር ያስፈልጋል።`,
      affectedItems: highLossItems.map((i) => i.itemNameAm),
    });
  }

  // Check 2: Unacknowledged Store Transfers
  const unacknowledgedTransfers = storeTransferDiscrepancies.filter(
    (td) => td.status === 'SHORTAGE_AT_BRANCH' || td.status === 'STORE_UNACKNOWLEDGED'
  );
  if (unacknowledgedTransfers.length > 0) {
    anomalies.push({
      title: 'የስቶር እና የኩሽና የዝውውር ልዩነት (SIV Transfer Discrepancy)',
      severity: 'HIGH',
      description: 'ስቶር የወጣው እና ሼፉ የተረከበው የSIV እቃ መጠን ልዩነት አለው። ደረሰኞች መመሳከር አለባቸው።',
      affectedItems: unacknowledgedTransfers.map((t) => t.itemName),
    });
  }

  // Check 3: POS vs Kitchen Ticket mismatch
  const salesMismatches = salesDiscrepancies.filter((sd) => sd.status !== 'MATCHED');
  if (salesMismatches.length > 0) {
    anomalies.push({
      title: 'የካሸር ሽያጭ እና የኩሽና ትኬት ልዩነት (POS vs Kitchen Ticket Discrepancy)',
      severity: 'MEDIUM',
      description: 'በካሸር የተመዘገበው የምግብ ብዛት እና ኩሽናው ያዘጋጀው ትኬት አይጣጣምም።',
      affectedItems: salesMismatches.map((s) => s.menuItemName),
    });
  }

  return {
    id: `recon-${branchId}-${period}-${Date.now()}`,
    branchId,
    branchName,
    period,
    generatedAt: new Date().toISOString(),
    totalSalesRevenue: Number(totalSalesRevenue.toFixed(2)),
    totalExpectedCost: Number(totalExpectedCost.toFixed(2)),
    totalActualUsageCost: Number(totalActualUsageCost.toFixed(2)),
    totalVarianceLossValue: Number(totalVarianceLossValue.toFixed(2)),
    aiAuditNarrativeAm: '',
    aiAuditNarrativeEn: '',
    anomalies,
    actionItems: [
      `ከሼፉ ጋር የ${highLossItems[0]?.itemNameAm || 'ዋና ዋና ግብአቶች'} አካላዊ ቆጠራ በአስቸኳይ ማረጋገጥ`,
      'የስቶር SIV ደረሰኝ ፊርማዎችን ከቅርንጫፉ ርክክብ ጋር ማነጻጸር',
      'በካሸር እና በኩሽና መካከል ያሉ ያልተጣጣሙ ትኬቶችን ማጣራት',
    ],
    itemVariances,
    storeTransferDiscrepancies,
    salesDiscrepancies,
    missingDataWarnings,
    managerApproved: false,
  };
}

function cleanPositive(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  const num = Number(val);
  return isNaN(num) ? 0 : Math.max(0, num);
}

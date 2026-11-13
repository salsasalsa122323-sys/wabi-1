import * as XLSX from 'xlsx';
import { FullReconciliationReport } from '../types';

/**
 * Generates and downloads a multi-sheet Excel (.xlsx) reconciliation workbook
 * tailored for F&B Cost Controllers and General Management.
 */
export function exportReconciliationToExcel(report: FullReconciliationReport) {
  const wb = XLSX.utils.book_new();

  // 1. Executive Summary Sheet
  const summaryRows = [
    ['ETHIOPIA F&B MULTI-BRANCH RECONCILIATION AUDIT REPORT'],
    ['Branch / Entity:', report.branchName],
    ['Audit Period:', report.period],
    ['Report Generated At:', new Date().toLocaleString()],
    ['Status:', report.managerApproved ? 'APPROVED BY MANAGEMENT' : 'PENDING REVIEW'],
    [],
    ['FINANCIAL AUDIT TOTALS (ETB)'],
    ['Total Sales Revenue (Cashier POS):', report.totalSalesRevenue],
    ['Theoretical Cost of Goods Sold (Recipe Expected):', report.totalExpectedCost],
    ['Actual Kitchen Consumption Cost:', report.totalActualUsageCost],
    ['Net Variance Value (Loss / Surplus):', report.totalVarianceLossValue],
    [],
    ['EXECUTIVE AUDITOR NARRATIVE (AMHARIC)'],
    [report.aiAuditNarrativeAm || 'ምንም ማስታወሻ አልተሰጠም።'],
    [],
    ['EXECUTIVE AUDITOR NARRATIVE (ENGLISH)'],
    [report.aiAuditNarrativeEn || 'No audit narrative generated.'],
    [],
    ['KEY ANOMALIES & AUDIT FINDINGS'],
    ['Severity', 'Finding Title', 'Description', 'Affected Items'],
    ...(report.anomalies || []).map((a) => [
      a.severity,
      a.title,
      a.description,
      (a.affectedItems || []).join(', '),
    ]),
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Executive Summary');

  // 2. Item Usage & Recipe Variances Sheet
  const varianceHeaders = [
    'Item Name (Amharic)',
    'Item Name (English)',
    'Unit',
    'Unit Cost (ETB)',
    'Opening Count',
    'Store Received',
    'Kitchen Wastage',
    'Closing Count',
    'Actual Usage',
    'Expected Usage (Sales)',
    'Variance Qty',
    'Variance Value (ETB)',
    'Audit Status',
    'Suspected Cause',
  ];
  const varianceData = (report.itemVariances || []).map((iv) => [
    iv.itemNameAm,
    iv.itemNameEn,
    iv.unit,
    iv.unitCost,
    iv.openingStock,
    iv.receivedFromStore,
    iv.wastage,
    iv.closingStock,
    iv.actualUsage,
    iv.expectedUsageFromSales,
    iv.varianceQuantity,
    iv.varianceValueEtb,
    iv.status,
    iv.notes || '',
  ]);
  const wsVariances = XLSX.utils.aoa_to_sheet([varianceHeaders, ...varianceData]);
  XLSX.utils.book_append_sheet(wb, wsVariances, 'Item Variances');

  // 3. Store vs Kitchen Transfers Sheet
  const transferHeaders = [
    'SIV / Ref No',
    'Item Name',
    'Unit',
    'Store Issued Qty',
    'Branch Received Qty',
    'Discrepancy Qty',
    'Discrepancy Value (ETB)',
    'Status',
  ];
  const transferData = (report.storeTransferDiscrepancies || []).map((td) => [
    td.sivNumber || td.refNo || '-',
    td.itemName,
    td.unit,
    td.storeIssuedQty,
    td.branchReceivedQty,
    td.discrepancyQty,
    td.discrepancyValueEtb,
    td.status,
  ]);
  const wsTransfers = XLSX.utils.aoa_to_sheet([transferHeaders, ...transferData]);
  XLSX.utils.book_append_sheet(wb, wsTransfers, 'Transfer Cross-Match');

  // 4. POS Cashier Sales vs Kitchen Production Sheet
  const salesHeaders = [
    'Menu Item / Dish',
    'Date / Shift',
    'Cashier Sold Qty',
    'Kitchen Produced Qty',
    'Difference Qty',
    'Menu Price (ETB)',
    'Discrepancy Amount (ETB)',
    'Status',
  ];
  const salesData = (report.salesDiscrepancies || []).map((sd) => [
    sd.menuItemName,
    sd.date || sd.shift || '-',
    sd.cashierSoldQty,
    sd.kitchenProducedQty,
    sd.discrepancyQty,
    sd.menuPrice,
    sd.discrepancyAmount,
    sd.status,
  ]);
  const wsSales = XLSX.utils.aoa_to_sheet([salesHeaders, ...salesData]);
  XLSX.utils.book_append_sheet(wb, wsSales, 'Sales Matching');

  // Write and trigger download
  const cleanBranch = report.branchName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `F&B_Reconciliation_${cleanBranch}_${report.period}.xlsx`;
  XLSX.writeFile(wb, filename);
}

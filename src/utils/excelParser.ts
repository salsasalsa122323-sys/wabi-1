import * as XLSX from 'xlsx';
import { getTodayDateString, formatEthiopianDate } from './ethiopianDate';

export interface ParsedSheetData {
  fileName: string;
  sheetName: string;
  headers: string[];
  rows: Record<string, any>[];
  totalRows: number;
}

export interface ExcelProvenanceRow {
  sourceFile: string;
  sourceSheet: string;
  sourceRowNumber: number; // 1-indexed Excel row
  rawValues: Record<string, any>;
  cleanedItemName: string;
  cleanedCode?: string;
  cleanedQuantity: number;
  cleanedUnit: string;
  cleanedUnitPrice: number;
  cleanedTotalAmount: number;
  cleanedBranch?: string;
  cleanedDate?: string;
  cleanedShift?: string;
  cleanedRefNo?: string;
  status: 'VALID' | 'WARNING' | 'INVALID';
  validationMessage?: string;
}

/**
 * Parses an Excel ArrayBuffer and extracts clean rows and headers for each sheet.
 */
export function parseExcelWorkbook(
  arrayBuffer: ArrayBuffer,
  fileName: string
): ParsedSheetData[] {
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  const results: ParsedSheetData[] = [];

  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) return;

    // Convert sheet to JSON array with header detection
    const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, {
      raw: false,
      dateNF: 'yyyy-mm-dd',
      defval: '',
    });

    if (rawJson.length === 0) return;

    // Detect headers from first row keys
    const headers = Object.keys(rawJson[0]).map((h) => h.trim());

    // Clean empty rows
    const cleanRows = rawJson.filter((row) => {
      return Object.values(row).some((val) => val !== '' && val !== null && val !== undefined);
    });

    results.push({
      fileName,
      sheetName,
      headers,
      rows: cleanRows,
      totalRows: cleanRows.length,
    });
  });

  return results;
}

/**
 * Normalizes numbers that might be formatted with currency symbols, commas or strings.
 */
export function cleanNumber(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Cleans and converts dates into standard YYYY-MM-DD string.
 */
export function cleanDate(val: any): string {
  if (!val) return getTodayDateString();
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().slice(0, 10);
  }
  const str = String(val).trim();
  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // Try parsing common DD/MM/YYYY or MM/DD/YYYY
  const parts = str.split(/[/.-]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    } else if (parts[2].length === 4) {
      // DD-MM-YYYY or MM-DD-YYYY
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }
  return getTodayDateString();
}

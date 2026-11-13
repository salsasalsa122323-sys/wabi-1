/**
 * Smart Inventory Carryover Engine:
 * Automatically carries over Yesterday's Ending Inventory to become Today's Beginning Inventory.
 * Eliminates repetitive manual beginning inventory entries across branches.
 */

import { safeLocalStorageSet } from './persistentStorage';

const STORAGE_KEY_PREFIX = 'eth_erp_ending_inv_';

export interface EndingInventoryRecord {
  branchId: string;
  date: string; // YYYY-MM-DD
  endingStockMap: Record<string, number>; // itemId -> quantity
  savedAt: string;
}

/**
 * Saves ending inventory for a branch on a specific date
 */
export function saveDailyEndingInventory(
  branchId: string,
  date: string,
  endingStockMap: Record<string, number>
): void {
  if (typeof window === 'undefined') return;
  try {
    const key = `${STORAGE_KEY_PREFIX}${branchId}_${date}`;
    const record: EndingInventoryRecord = {
      branchId,
      date,
      endingStockMap,
      savedAt: new Date().toISOString(),
    };
    safeLocalStorageSet(key, record);
  } catch (err) {
    console.warn('Failed to save ending inventory carryover:', err);
  }
}

/**
 * Finds the most recent previous day's ending inventory for a branch before currentDate
 */
export function getPreviousDayEndingInventory(
  branchId: string,
  currentDate: string
): { foundDate: string | null; endingMap: Record<string, number> } {
  if (typeof window === 'undefined') return { foundDate: null, endingMap: {} };

  try {
    const prefix = `${STORAGE_KEY_PREFIX}${branchId}_`;
    const keys: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) {
        keys.push(k);
      }
    }

    // Extract all recorded dates
    const records: EndingInventoryRecord[] = [];
    keys.forEach((k) => {
      try {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw) as EndingInventoryRecord;
          if (parsed && parsed.date && parsed.date < currentDate) {
            records.push(parsed);
          }
        }
      } catch {
        // ignore
      }
    });

    if (records.length === 0) {
      return { foundDate: null, endingMap: {} };
    }

    // Sort descending by date to get the closest preceding day
    records.sort((a, b) => b.date.localeCompare(a.date));
    const latestPrevious = records[0];

    return {
      foundDate: latestPrevious.date,
      endingMap: latestPrevious.endingStockMap || {},
    };
  } catch (err) {
    console.warn('Failed to lookup previous day ending inventory:', err);
    return { foundDate: null, endingMap: {} };
  }
}

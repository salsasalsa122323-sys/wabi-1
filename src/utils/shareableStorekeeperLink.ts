import { InventoryItem } from '../types';

/**
 * Creates a smart shareable URL for the Storekeeper containing:
 * 1. The dedicated ?portal=storekeeper mode
 * 2. An encoded snapshot of all current store items in the URL hash (#catalog=...)
 * This allows the storekeeper on ANY separate phone or device to immediately have all items without needing a login or manual export/import!
 */
export function createStorekeeperShareableUrl(items: InventoryItem[]): string {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set('portal', 'storekeeper');

  // Pack items concisely (compact keys: i=id, a=nameAm, e=nameEn, c=code, g=category, u=unit, ua=unitAm, p=price, w=wac, s=stock, m=minStock)
  const compact = items.map((item) => ({
    i: item.id,
    a: item.nameAm,
    e: item.nameEn,
    c: item.code,
    g: item.category,
    u: item.unit,
    ua: item.unitAm,
    p: item.lastPurchasePrice || 0,
    w: item.weightedAvgCost || 0,
    s: item.currentCentralStock || 0,
    m: item.minStockLevel || 5,
  }));

  try {
    const jsonStr = JSON.stringify(compact);
    // encode UTF-8 to base64
    const bytes = new TextEncoder().encode(jsonStr);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const b64 = btoa(binary);
    url.hash = `catalog=${encodeURIComponent(b64)}`;
  } catch (err) {
    console.warn('Failed to encode catalog hash:', err);
  }

  return url.toString();
}

/**
 * Unpacks the catalog hash if present when storekeeper opens the URL on their phone/laptop
 */
export function parseStorekeeperCatalogHash(hash: string): InventoryItem[] | null {
  try {
    if (!hash || !hash.includes('catalog=')) return null;
    const match = hash.match(/catalog=([^&]+)/);
    if (!match || !match[1]) return null;
    const b64 = decodeURIComponent(match[1]);
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const jsonStr = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;

    return parsed.map((m: any) => ({
      id: m.i,
      nameAm: m.a,
      nameEn: m.e,
      code: m.c,
      category: m.g || 'other',
      unit: m.u || 'kg',
      unitAm: m.ua || 'ኪ.ግ',
      lastPurchasePrice: m.p || 0,
      weightedAvgCost: m.w || m.p || 0,
      currentCentralStock: m.s || 0,
      minStockLevel: m.m || 5,
      priceHistory: [],
    }));
  } catch (err) {
    console.error('Failed to parse catalog hash:', err);
    return null;
  }
}

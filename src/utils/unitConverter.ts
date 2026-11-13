/**
 * Unit Normalization and Conversion Utility for Ethiopian F&B Operations
 * Standardizes units across Store, Kitchen, POS and Recipe formulas.
 */

export type StandardUnitCategory = 'weight' | 'volume' | 'count' | 'unknown';

export interface NormalizedUnitInfo {
  canonicalUnit: string;
  category: StandardUnitCategory;
  conversionFactorToBase: number; // Factor to convert this unit into the base unit of its category
}

const UNIT_MAP: Record<string, NormalizedUnitInfo> = {
  // Weight (Base: kg)
  'kg': { canonicalUnit: 'kg', category: 'weight', conversionFactorToBase: 1 },
  'kilo': { canonicalUnit: 'kg', category: 'weight', conversionFactorToBase: 1 },
  'kilogram': { canonicalUnit: 'kg', category: 'weight', conversionFactorToBase: 1 },
  'ኪግ': { canonicalUnit: 'kg', category: 'weight', conversionFactorToBase: 1 },
  'ኪ.ግ': { canonicalUnit: 'kg', category: 'weight', conversionFactorToBase: 1 },
  'ኪሎ': { canonicalUnit: 'kg', category: 'weight', conversionFactorToBase: 1 },

  'g': { canonicalUnit: 'g', category: 'weight', conversionFactorToBase: 0.001 },
  'gram': { canonicalUnit: 'g', category: 'weight', conversionFactorToBase: 0.001 },
  'grams': { canonicalUnit: 'g', category: 'weight', conversionFactorToBase: 0.001 },
  'ግራም': { canonicalUnit: 'g', category: 'weight', conversionFactorToBase: 0.001 },
  'ግ': { canonicalUnit: 'g', category: 'weight', conversionFactorToBase: 0.001 },

  // Volume (Base: lt / litre)
  'lt': { canonicalUnit: 'lt', category: 'volume', conversionFactorToBase: 1 },
  'l': { canonicalUnit: 'lt', category: 'volume', conversionFactorToBase: 1 },
  'liter': { canonicalUnit: 'lt', category: 'volume', conversionFactorToBase: 1 },
  'litre': { canonicalUnit: 'lt', category: 'volume', conversionFactorToBase: 1 },
  'litres': { canonicalUnit: 'lt', category: 'volume', conversionFactorToBase: 1 },
  'ሊትር': { canonicalUnit: 'lt', category: 'volume', conversionFactorToBase: 1 },
  'ሊ': { canonicalUnit: 'lt', category: 'volume', conversionFactorToBase: 1 },

  'ml': { canonicalUnit: 'ml', category: 'volume', conversionFactorToBase: 0.001 },
  'milliliter': { canonicalUnit: 'ml', category: 'volume', conversionFactorToBase: 0.001 },
  'ሚሊ': { canonicalUnit: 'ml', category: 'volume', conversionFactorToBase: 0.001 },
  'ሚ.ሊ': { canonicalUnit: 'ml', category: 'volume', conversionFactorToBase: 0.001 },

  // Count (Base: pcs)
  'pcs': { canonicalUnit: 'pcs', category: 'count', conversionFactorToBase: 1 },
  'pc': { canonicalUnit: 'pcs', category: 'count', conversionFactorToBase: 1 },
  'piece': { canonicalUnit: 'pcs', category: 'count', conversionFactorToBase: 1 },
  'pieces': { canonicalUnit: 'pcs', category: 'count', conversionFactorToBase: 1 },
  'ፍሬ': { canonicalUnit: 'pcs', category: 'count', conversionFactorToBase: 1 },
  'ቁራጭ': { canonicalUnit: 'pcs', category: 'count', conversionFactorToBase: 1 },
  'ነጠላ': { canonicalUnit: 'pcs', category: 'count', conversionFactorToBase: 1 },

  'dozen': { canonicalUnit: 'dozen', category: 'count', conversionFactorToBase: 12 },
  'doz': { canonicalUnit: 'dozen', category: 'count', conversionFactorToBase: 12 },
  'ደርዘን': { canonicalUnit: 'dozen', category: 'count', conversionFactorToBase: 12 },

  'pkt': { canonicalUnit: 'pkt', category: 'count', conversionFactorToBase: 1 },
  'packet': { canonicalUnit: 'pkt', category: 'count', conversionFactorToBase: 1 },
  'ፓኬት': { canonicalUnit: 'pkt', category: 'count', conversionFactorToBase: 1 },

  'carton': { canonicalUnit: 'carton', category: 'count', conversionFactorToBase: 1 },
  'ctn': { canonicalUnit: 'carton', category: 'count', conversionFactorToBase: 1 },
  'ካርቶን': { canonicalUnit: 'carton', category: 'count', conversionFactorToBase: 1 },

  'bottle': { canonicalUnit: 'bottle', category: 'count', conversionFactorToBase: 1 },
  'ጠርሙስ': { canonicalUnit: 'bottle', category: 'count', conversionFactorToBase: 1 },
  'ጣሳ': { canonicalUnit: 'can', category: 'count', conversionFactorToBase: 1 },
  'can': { canonicalUnit: 'can', category: 'count', conversionFactorToBase: 1 },
};

export function normalizeUnit(rawUnit?: string): NormalizedUnitInfo {
  if (!rawUnit) {
    return { canonicalUnit: 'pcs', category: 'count', conversionFactorToBase: 1 };
  }
  const clean = rawUnit.trim().toLowerCase().replace(/[.\s]/g, '');
  if (UNIT_MAP[clean]) {
    return UNIT_MAP[clean];
  }
  return { canonicalUnit: rawUnit.trim(), category: 'unknown', conversionFactorToBase: 1 };
}

/**
 * Converts a quantity from one unit to another within the same category (e.g. g to kg).
 * If incompatible or unknown, returns the original quantity.
 */
export function convertQuantity(qty: number, fromUnit?: string, toUnit?: string): number {
  if (!fromUnit || !toUnit || fromUnit.trim().toLowerCase() === toUnit.trim().toLowerCase()) {
    return qty;
  }
  const uFrom = normalizeUnit(fromUnit);
  const uTo = normalizeUnit(toUnit);

  if (uFrom.category !== uTo.category || uFrom.category === 'unknown') {
    return qty; // Incompatible or unknown, fallback to raw qty
  }

  // Convert to base unit, then to target unit
  const baseQty = qty * uFrom.conversionFactorToBase;
  return baseQty / uTo.conversionFactorToBase;
}

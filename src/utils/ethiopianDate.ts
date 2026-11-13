/**
 * Ethiopian Calendar (ዓመተ ምሕረት) Conversion and Utility Helpers
 */

export interface EthiopianDate {
  year: number;
  month: number; // 1-13
  day: number;
  monthNameAm: string;
  monthNameEn: string;
}

export const ETHIOPIAN_MONTHS = [
  { id: 1, am: 'መስከረም', en: 'Meskerem' },
  { id: 2, am: 'ጥቅምት', en: 'Tikimt' },
  { id: 3, am: 'ኅዳር', en: 'Hidar' },
  { id: 4, am: 'ታኅሣሥ', en: 'Tahsas' },
  { id: 5, am: 'ጥር', en: 'Tir' },
  { id: 6, am: 'የካቲት', en: 'Yakatit' },
  { id: 7, am: 'መጋቢት', en: 'Megabit' },
  { id: 8, am: 'ሚያዝያ', en: 'Miazia' },
  { id: 9, am: 'ግንቦት', en: 'Ginbot' },
  { id: 10, am: 'ሰኔ', en: 'Sene' },
  { id: 11, am: 'ሐምሌ', en: 'Hamle' },
  { id: 12, am: 'ነሐሴ', en: 'Nehase' },
  { id: 13, am: 'ጳጉሜን', en: 'Pagume' },
];

/**
 * Converts a Gregorian Date to an Ethiopian Calendar date.
 * Uses the proven JDN (Julian Day Number) algorithm for precise conversion.
 */
export function gregorianToEthiopian(date: Date | string): EthiopianDate {
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;
  
  if (isNaN(d.getTime())) {
    return {
      year: 2017,
      month: 2,
      day: 9,
      monthNameAm: 'ጥቅምት',
      monthNameEn: 'Tikimt',
    };
  }

  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-12
  const day = d.getDate();

  // Julian Day Number calculation
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  
  const jdn = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;

  // Ethiopian Calendar Epoch offset
  const ethJdnOffset = 1723856;
  const r = (jdn - ethJdnOffset) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);
  
  const ethYear = 4 * Math.floor((jdn - ethJdnOffset) / 1461) + Math.floor(r / 365) - Math.floor(r / 1460);
  const ethMonth = Math.floor(n / 30) + 1;
  const ethDay = (n % 30) + 1;

  const validMonth = Math.min(Math.max(ethMonth, 1), 13);
  const monthMeta = ETHIOPIAN_MONTHS[validMonth - 1] || ETHIOPIAN_MONTHS[0];

  return {
    year: ethYear,
    month: validMonth,
    day: ethDay,
    monthNameAm: monthMeta.am,
    monthNameEn: monthMeta.en,
  };
}

/**
 * Format helper: returns both Amharic and English representations
 */
export function formatEthiopianDate(gregorianDateStr: string, lang: 'am' | 'en' = 'am'): string {
  const eth = gregorianToEthiopian(gregorianDateStr);
  if (lang === 'am') {
    return `${eth.day} ${eth.monthNameAm} ${eth.year} ዓ.ም`;
  }
  return `${eth.monthNameEn} ${eth.day}, ${eth.year} E.C.`;
}

/**
 * Returns today's ISO date string YYYY-MM-DD
 */
export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get relative date string (e.g. -1 for yesterday)
 */
export function getRelativeDateString(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Add or subtract days from a specific date string (YYYY-MM-DD)
 */
export function getDateOffset(dateStr: string, daysOffset: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + daysOffset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}


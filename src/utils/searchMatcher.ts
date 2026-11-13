/**
 * Smart Fuzzy & Partial Word Matcher for Ethiopian F&B Menu Items & Ingredients
 * - Case-insensitive
 * - Handles partial words ("bur" -> "Burger")
 * - Tolerates extra spaces and common Amharic/English variations
 * - Matches by Amharic name, English name, category, or code
 */

export function smartMatchMenuItem(
  query: string,
  target: {
    nameAm?: string;
    nameEn?: string;
    category?: string;
    code?: string;
    id?: string;
  }
): boolean {
  if (!query || !query.trim()) return true;

  const cleanQuery = query.toLowerCase().trim().replace(/\s+/g, ' ');
  const queryTerms = cleanQuery.split(' ').filter(Boolean);

  const searchableText = [
    target.nameAm || '',
    target.nameEn || '',
    target.category || '',
    target.code || '',
    target.id || '',
  ]
    .join(' ')
    .toLowerCase()
    .replace(/\s+/g, ' ');

  // Direct substring match
  if (searchableText.includes(cleanQuery)) {
    return true;
  }

  // Every typed term must match partially in the searchable text
  const allTermsMatch = queryTerms.every((term) => {
    if (searchableText.includes(term)) return true;

    // Amharic character normalization (e.g., ሀ/ሐ/ኀ, ሠ/ሰ, አ/ዐ, ጸ/ፀ)
    const normalizedTarget = normalizeAmharic(searchableText);
    const normalizedTerm = normalizeAmharic(term);
    if (normalizedTarget.includes(normalizedTerm)) return true;

    // Small fuzzy match (character transposition / single typo tolerance)
    return isFuzzySubstr(normalizedTerm, normalizedTarget);
  });

  return allTermsMatch;
}

// Normalizes common Amharic orthographic homophones
function normalizeAmharic(text: string): string {
  return text
    .replace(/[ሐኀ]/g, 'ሀ')
    .replace(/[ሑኁ]/g, 'ሁ')
    .replace(/[ሒኂ]/g, 'ሂ')
    .replace(/[ሓኃ]/g, 'ሃ')
    .replace(/[ሔኄ]/g, 'ሄ')
    .replace(/[ሕኅ]/g, 'ህ')
    .replace(/[ሖኆ]/g, 'ሆ')
    .replace(/[ሠ]/g, 'ሰ')
    .replace(/[ሡ]/g, 'ሱ')
    .replace(/[ሢ]/g, 'ሲ')
    .replace(/[ሣ]/g, 'ሳ')
    .replace(/[ሤ]/g, 'ሴ')
    .replace(/[ሥ]/g, 'ስ')
    .replace(/[ሦ]/g, 'ሶ')
    .replace(/[ዐ]/g, 'አ')
    .replace(/[ዑ]/g, 'ኡ')
    .replace(/[ዒ]/g, 'ኢ')
    .replace(/[ዓ]/g, 'ኣ')
    .replace(/[ዔ]/g, 'ኤ')
    .replace(/[ዕ]/g, 'እ')
    .replace(/[ዖ]/g, 'ኦ')
    .replace(/[ፀ]/g, 'ጸ')
    .replace(/[ፁ]/g, 'ጹ')
    .replace(/[ፂ]/g, 'ጺ')
    .replace(/[ፃ]/g, 'ጻ')
    .replace(/[ፄ]/g, 'ጼ')
    .replace(/[ፅ]/g, 'ጽ')
    .replace(/[ፆ]/g, 'ጾ');
}

function isFuzzySubstr(needle: string, haystack: string): boolean {
  if (needle.length < 3) return false;
  // If needle has length >= 3 and is almost in haystack
  const words = haystack.split(' ');
  return words.some((word) => levenshteinDistance(needle, word.slice(0, needle.length + 1)) <= 1);
}

function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

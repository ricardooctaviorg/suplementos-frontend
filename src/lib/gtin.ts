/**
 * GTIN validation and normalization (EAN-8, UPC-A, EAN-13, GTIN-14).
 * Every code is sent and looked up in its 14-digit form.
 * Keep in sync with the backend's `src/shared/gtin.ts`.
 */

const VALID_LENGTHS = [8, 12, 13, 14];

function hasValidCheckDigit(digits: string): boolean {
  const numbers = digits.split("").map(Number);
  const checkDigit = numbers.pop();
  if (checkDigit === undefined) return false;

  let sum = 0;
  let weight = 3;
  for (let i = numbers.length - 1; i >= 0; i--) {
    sum += (numbers[i] ?? 0) * weight;
    weight = weight === 3 ? 1 : 3;
  }
  return (10 - (sum % 10)) % 10 === checkDigit;
}

/** Returns the GTIN normalized to 14 digits, or `null` if it is invalid. */
export function normalizeGtin(raw: string): string | null {
  if (/[^\d\s-]/.test(raw)) return null;
  const digits = raw.replace(/[\s-]/g, "");
  if (!VALID_LENGTHS.includes(digits.length)) return null;
  if (!hasValidCheckDigit(digits)) return null;
  return digits.padStart(14, "0");
}

export function isValidGtin(raw: string): boolean {
  return normalizeGtin(raw) !== null;
}

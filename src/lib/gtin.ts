/**
 * Validación y normalización de GTIN (EAN-8, UPC-A, EAN-13, GTIN-14).
 * Todo código se envía y se consulta en su forma de 14 dígitos.
 * Mantener sincronizado con `src/shared/gtin.ts` del backend.
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

/** Devuelve el GTIN normalizado a 14 dígitos, o `null` si no es válido. */
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

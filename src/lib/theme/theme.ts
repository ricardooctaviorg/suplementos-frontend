export interface TenantColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

export const DEFAULT_COLORS: TenantColors = {
  primary: "#0f766e",
  secondary: "#334155",
  accent: "#f59e0b",
  background: "#ffffff",
  text: "#0f172a",
};

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/**
 * Converts the tenant palette into CSS variables for the `style` attribute.
 * Each color is validated as strict hex (prevents style injection);
 * invalid values fall back to the default color.
 */
export function themeToCssVars(colors: Partial<TenantColors>): Record<string, string> {
  const pick = (value: string | undefined, fallback: string) =>
    value !== undefined && HEX_COLOR.test(value) ? value : fallback;

  return {
    "--color-primary": pick(colors.primary, DEFAULT_COLORS.primary),
    "--color-secondary": pick(colors.secondary, DEFAULT_COLORS.secondary),
    "--color-accent": pick(colors.accent, DEFAULT_COLORS.accent),
    "--color-background": pick(colors.background, DEFAULT_COLORS.background),
    "--color-text": pick(colors.text, DEFAULT_COLORS.text),
  };
}

export interface ThemeColors {
  background: string;
  word: string;
  orp: string;
}

export const DEFAULT_COLORS: ThemeColors = {
  background: '#38393d',
  word: '#FFFFFF',
  orp: '#E53935',
};

export function isValidHexColor(color: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(color);
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;

  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

export function hexToRgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  if (!rgb1 || !rgb2) return 0;

  const luminance = (rgb: { r: number; g: number; b: number }) => {
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const l1 = luminance(rgb1);
  const l2 = luminance(rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

export function hasAdequateContrast(
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA'
): boolean {
  const ratio = getContrastRatio(foreground, background);
  const minRatio = level === 'AAA' ? 7 : 4.5;
  return ratio >= minRatio;
}

export function applyColorsToDocument(colors: ThemeColors): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  root.style.setProperty('--color-bg', colors.background);
  root.style.setProperty('--color-text', colors.word);
  root.style.setProperty('--color-orp', colors.orp);

  const textRgb = hexToRgb(colors.word);
  const orpRgb = hexToRgb(colors.orp);
  const bgRgb = hexToRgb(colors.background);

  if (textRgb) {
    root.style.setProperty('--color-text-90', `rgba(${textRgb.r}, ${textRgb.g}, ${textRgb.b}, 0.9)`);
    root.style.setProperty('--color-text-80', `rgba(${textRgb.r}, ${textRgb.g}, ${textRgb.b}, 0.8)`);
    root.style.setProperty('--color-text-60', `rgba(${textRgb.r}, ${textRgb.g}, ${textRgb.b}, 0.6)`);
    root.style.setProperty('--color-text-50', `rgba(${textRgb.r}, ${textRgb.g}, ${textRgb.b}, 0.5)`);
    root.style.setProperty('--color-text-40', `rgba(${textRgb.r}, ${textRgb.g}, ${textRgb.b}, 0.4)`);
    root.style.setProperty('--color-text-30', `rgba(${textRgb.r}, ${textRgb.g}, ${textRgb.b}, 0.3)`);
    root.style.setProperty('--color-text-20', `rgba(${textRgb.r}, ${textRgb.g}, ${textRgb.b}, 0.2)`);
    root.style.setProperty('--color-text-10', `rgba(${textRgb.r}, ${textRgb.g}, ${textRgb.b}, 0.1)`);
    root.style.setProperty('--color-text-05', `rgba(${textRgb.r}, ${textRgb.g}, ${textRgb.b}, 0.05)`);
  }

  if (orpRgb) {
    root.style.setProperty('--color-orp-light', `rgba(${orpRgb.r}, ${orpRgb.g}, ${orpRgb.b}, 0.3)`);
    root.style.setProperty('--color-orp-bg', `rgba(${orpRgb.r}, ${orpRgb.g}, ${orpRgb.b}, 0.2)`);
  }

  if (bgRgb) {
    const lighter = {
      r: Math.min(255, bgRgb.r + 20),
      g: Math.min(255, bgRgb.g + 20),
      b: Math.min(255, bgRgb.b + 20),
    };
    root.style.setProperty('--color-bg-light', `rgb(${lighter.r}, ${lighter.g}, ${lighter.b})`);

    const darker = {
      r: Math.max(0, bgRgb.r - 15),
      g: Math.max(0, bgRgb.g - 15),
      b: Math.max(0, bgRgb.b - 15),
    };
    root.style.setProperty('--color-bg-dark', `rgb(${darker.r}, ${darker.g}, ${darker.b})`);
  }
}

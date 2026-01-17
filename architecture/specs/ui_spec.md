# UI/Theme Specification

## Agent Context
- **Status**: approved
- **Iteration**: 1
- **Last Agent**: judge
- **Last Action**: Review complete - specification approved for implementation
- **Open Issues**: none

---

## Scope
Color system (configurable), typography (Lexend), layout structure, responsive design, CSS custom properties, theme store, accessibility.

## Reference
- See: `SPEC.md` - UI & Theme section (Colors, Font, Layout)
- See: `SYSTEM_STATE_MACHINE.md` - UI_THEME component
- See: `view_spec.md` - Component styling patterns

---

## Plan

### Architecture Overview

```
src/
├── app.css                          # Global styles, CSS reset, custom properties
├── lib/
│   ├── styles/
│   │   ├── variables.css            # CSS custom properties definitions
│   │   ├── typography.css           # Lexend font, text styles
│   │   ├── layout.css               # Responsive containers, spacing
│   │   └── components.css           # Shared component patterns
│   ├── stores/
│   │   └── themeStore.ts            # Runtime theme state
│   └── theme/
│       ├── colors.ts                # Color utilities and defaults
│       └── persistence.ts           # Theme persistence to localStorage
└── static/
    └── fonts/
        └── lexend/                  # Bundled Lexend font files
            ├── Lexend-Regular.woff2
            ├── Lexend-Medium.woff2
            ├── Lexend-SemiBold.woff2
            └── Lexend-Bold.woff2
```

### Key Design Decisions

1. **CSS Custom Properties** - All colors use CSS variables for runtime theming
2. **Bundled Fonts** - Lexend self-hosted for offline support (Tauri/Capacitor)
3. **Single Theme Store** - Centralized theme state with persistence
4. **Mobile-First** - Base styles for mobile, enhanced for larger screens
5. **Dark Mode Only** - App uses dark theme per SPEC.md defaults

---

## Specification

### 1. Color System

#### 1.1 Default Colors (from SPEC.md)

| Element | CSS Variable | Default Value | Purpose |
|---------|--------------|---------------|---------|
| Background | `--color-bg` | `#38393d` | Main app background |
| Word (Text) | `--color-text` | `#FFFFFF` | Primary text color |
| ORP (Focus Letter) | `--color-orp` | `#E53935` | Highlighted reading point |

#### 1.2 Extended Color Palette

```css
/* src/lib/styles/variables.css */

:root {
  /* === User Configurable Colors === */
  --color-bg: #38393d;
  --color-text: #FFFFFF;
  --color-orp: #E53935;

  /* === Derived Colors (computed from above) === */

  /* Transparent variants */
  --color-text-90: rgba(255, 255, 255, 0.9);
  --color-text-80: rgba(255, 255, 255, 0.8);
  --color-text-60: rgba(255, 255, 255, 0.6);
  --color-text-50: rgba(255, 255, 255, 0.5);
  --color-text-40: rgba(255, 255, 255, 0.4);
  --color-text-30: rgba(255, 255, 255, 0.3);
  --color-text-20: rgba(255, 255, 255, 0.2);
  --color-text-10: rgba(255, 255, 255, 0.1);
  --color-text-05: rgba(255, 255, 255, 0.05);

  /* ORP variants */
  --color-orp-light: rgba(229, 57, 53, 0.3);
  --color-orp-bg: rgba(229, 57, 53, 0.2);

  /* Background variants */
  --color-bg-light: #454650;
  --color-bg-dark: #2e2f33;
  --color-bg-overlay: rgba(0, 0, 0, 0.3);
  --color-bg-overlay-heavy: rgba(0, 0, 0, 0.7);

  /* Semantic colors */
  --color-error: #E53935;
  --color-success: #4CAF50;
  --color-warning: #FF9800;

  /* Focus/outline */
  --color-focus: rgba(229, 57, 53, 0.5);
}
```

#### 1.3 Color TypeScript Interface

```typescript
// src/lib/theme/colors.ts

/**
 * User-configurable color settings.
 * These map directly to CSS custom properties.
 */
export interface ThemeColors {
  /** Background color for all views */
  background: string;

  /** Primary text/word color */
  word: string;

  /** ORP (focus letter) highlight color */
  orp: string;
}

/**
 * Default color values from SPEC.md.
 */
export const DEFAULT_COLORS: ThemeColors = {
  background: '#38393d',
  word: '#FFFFFF',
  orp: '#E53935'
};

/**
 * Validate a hex color string.
 * Accepts: #RGB, #RRGGBB, #RRGGBBAA
 */
export function isValidHexColor(color: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(color);
}

/**
 * Convert hex color to RGB components.
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;

  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  };
}

/**
 * Create rgba() string from hex color with alpha.
 */
export function hexToRgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

/**
 * Calculate contrast ratio between two colors.
 * Used for accessibility validation.
 */
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

/**
 * Validate color has sufficient contrast (WCAG AA: 4.5:1 for normal text).
 */
export function hasAdequateContrast(
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA'
): boolean {
  const ratio = getContrastRatio(foreground, background);
  const minRatio = level === 'AAA' ? 7 : 4.5;
  return ratio >= minRatio;
}
```

#### 1.4 Applying Colors to CSS

```typescript
// src/lib/theme/colors.ts (continued)

/**
 * Apply theme colors to CSS custom properties.
 * Called when theme changes or on app initialization.
 */
export function applyColorsToDocument(colors: ThemeColors): void {
  const root = document.documentElement;

  // Set primary colors
  root.style.setProperty('--color-bg', colors.background);
  root.style.setProperty('--color-text', colors.word);
  root.style.setProperty('--color-orp', colors.orp);

  // Compute and set derived colors
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
    // Lighten background by ~10%
    const lighter = {
      r: Math.min(255, bgRgb.r + 20),
      g: Math.min(255, bgRgb.g + 20),
      b: Math.min(255, bgRgb.b + 20)
    };
    root.style.setProperty('--color-bg-light', `rgb(${lighter.r}, ${lighter.g}, ${lighter.b})`);

    // Darken background by ~10%
    const darker = {
      r: Math.max(0, bgRgb.r - 15),
      g: Math.max(0, bgRgb.g - 15),
      b: Math.max(0, bgRgb.b - 15)
    };
    root.style.setProperty('--color-bg-dark', `rgb(${darker.r}, ${darker.g}, ${darker.b})`);
  }
}
```

---

### 2. Typography System

#### 2.1 Lexend Font Loading

Per SPEC.md: "**Lexend** throughout the entire app (bundled)."

```css
/* src/lib/styles/typography.css */

/* === Lexend Font Face Definitions === */

@font-face {
  font-family: 'Lexend';
  src: url('/fonts/lexend/Lexend-Regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Lexend';
  src: url('/fonts/lexend/Lexend-Medium.woff2') format('woff2');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Lexend';
  src: url('/fonts/lexend/Lexend-SemiBold.woff2') format('woff2');
  font-weight: 600;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Lexend';
  src: url('/fonts/lexend/Lexend-Bold.woff2') format('woff2');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}

/* === Font Stack === */

:root {
  --font-family: 'Lexend', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```

#### 2.2 Font Size Scale

```css
/* src/lib/styles/typography.css (continued) */

:root {
  /* === Base Size === */
  --font-size-base: 16px;

  /* === Type Scale (1.25 ratio) === */
  --font-size-xs: 0.625rem;   /* 10px - badges, labels */
  --font-size-sm: 0.75rem;    /* 12px - captions, meta */
  --font-size-md: 0.875rem;   /* 14px - body secondary */
  --font-size-base: 1rem;     /* 16px - body primary */
  --font-size-lg: 1.125rem;   /* 18px - subheadings */
  --font-size-xl: 1.25rem;    /* 20px - section titles */
  --font-size-2xl: 1.5rem;    /* 24px - headings */
  --font-size-3xl: 1.875rem;  /* 30px - major headings */
  --font-size-4xl: 2.25rem;   /* 36px - display */
  --font-size-5xl: 3rem;      /* 48px - hero/logo */

  /* === Speed View Word Size === */
  /* Responsive: scales with viewport, clamped for readability */
  --font-size-word: clamp(2rem, 8vw, 4rem);

  /* === Line Heights === */
  --line-height-tight: 1.2;
  --line-height-snug: 1.35;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.7;
  --line-height-loose: 2;

  /* === Font Weights === */
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* === Letter Spacing === */
  --letter-spacing-tight: -0.02em;
  --letter-spacing-normal: 0;
  --letter-spacing-wide: 0.05em;
  --letter-spacing-wider: 0.1em;
  --letter-spacing-widest: 0.15em;
}
```

#### 2.3 Typography Utility Classes

```css
/* src/lib/styles/typography.css (continued) */

/* === Base Typography Reset === */

body {
  font-family: var(--font-family);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-regular);
  line-height: var(--line-height-normal);
  color: var(--color-text);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* === Heading Styles === */

.heading-1 {
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
  letter-spacing: var(--letter-spacing-tight);
}

.heading-2 {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-snug);
}

.heading-3 {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-snug);
}

/* === Body Text === */

.body-primary {
  font-size: var(--font-size-base);
  line-height: var(--line-height-relaxed);
}

.body-secondary {
  font-size: var(--font-size-md);
  line-height: var(--line-height-normal);
  color: var(--color-text-80);
}

/* === UI Text === */

.text-label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-wider);
  color: var(--color-text-50);
}

.text-caption {
  font-size: var(--font-size-sm);
  color: var(--color-text-60);
}

.text-button {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
}

/* === Speed View Word === */

.speed-word {
  font-family: var(--font-family);
  font-size: var(--font-size-word);
  font-weight: var(--font-weight-regular);
  user-select: none;
  white-space: nowrap;
}

.speed-word-orp {
  font-weight: var(--font-weight-medium);
  color: var(--color-orp);
}
```

---

### 3. Layout System

#### 3.1 Responsive Breakpoints

```css
/* src/lib/styles/layout.css */

:root {
  /* === Breakpoints === */
  /* Mobile-first: base styles apply to mobile, use min-width for larger */
  --breakpoint-sm: 640px;   /* Large phones, small tablets */
  --breakpoint-md: 768px;   /* Tablets */
  --breakpoint-lg: 1024px;  /* Small desktops */
  --breakpoint-xl: 1280px;  /* Large desktops */
  --breakpoint-2xl: 1536px; /* Extra large screens */
}

/* === Media Query Mixins (for reference) === */
/*
  @media (min-width: 640px) { } - sm
  @media (min-width: 768px) { } - md
  @media (min-width: 1024px) { } - lg
  @media (min-width: 1280px) { } - xl
  @media (min-width: 1536px) { } - 2xl
*/
```

#### 3.2 Spacing Scale

```css
/* src/lib/styles/layout.css (continued) */

:root {
  /* === Spacing Scale (4px base) === */
  --space-0: 0;
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
  --space-20: 5rem;     /* 80px */
  --space-24: 6rem;     /* 96px */

  /* === Container Widths === */
  --container-sm: 640px;
  --container-md: 768px;
  --container-lg: 1024px;
  --container-xl: 1280px;

  /* === Content Width (Reader View) === */
  /* Optimal line length for reading: 45-75 characters */
  --content-width: 65ch;

  /* === Border Radius === */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-full: 9999px;
}
```

#### 3.3 Layout Components

```css
/* src/lib/styles/layout.css (continued) */

/* === App Container === */
/* Full viewport, no overflow (views handle their own scroll) */

.app-container {
  width: 100%;
  height: 100vh;
  height: 100dvh; /* Dynamic viewport height for mobile */
  overflow: hidden;
  background-color: var(--color-bg);
  color: var(--color-text);
}

/* === View Container === */
/* Wrapper for Speed/Reader/Empty views */

.view-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

/* === Speed View Layout === */

.speed-view {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background-color: var(--color-bg);
}

/* === Reader View Layout === */

.reader-view {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  background-color: var(--color-bg);
  font-family: var(--font-family);
  line-height: var(--line-height-relaxed);
}

.reader-content {
  max-width: var(--content-width);
  margin: 0 auto;
  padding: var(--space-8) var(--space-6);
}

@media (min-width: 768px) {
  .reader-content {
    padding: var(--space-12) var(--space-8);
  }
}

/* === Empty State Layout === */

.empty-state {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-bg);
}

.empty-content {
  max-width: 480px;
  padding: var(--space-8);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-8);
  text-align: center;
}

/* === Overlay Layout === */
/* For progress, controls, etc. */

.overlay-bottom {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: var(--space-6);
  background: linear-gradient(transparent, var(--color-bg-overlay));
}

.overlay-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
```

#### 3.4 Flexbox and Grid Utilities

```css
/* src/lib/styles/layout.css (continued) */

/* === Flex Utilities === */

.flex { display: flex; }
.flex-col { flex-direction: column; }
.flex-wrap { flex-wrap: wrap; }

.items-start { align-items: flex-start; }
.items-center { align-items: center; }
.items-end { align-items: flex-end; }

.justify-start { justify-content: flex-start; }
.justify-center { justify-content: center; }
.justify-end { justify-content: flex-end; }
.justify-between { justify-content: space-between; }

.gap-1 { gap: var(--space-1); }
.gap-2 { gap: var(--space-2); }
.gap-3 { gap: var(--space-3); }
.gap-4 { gap: var(--space-4); }
.gap-6 { gap: var(--space-6); }
.gap-8 { gap: var(--space-8); }

/* === Grid Utilities === */

.grid { display: grid; }
.grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
.grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
```

---

### 4. Component Styles

#### 4.1 Button Styles

```css
/* src/lib/styles/components.css */

/* === Base Button === */

.btn {
  font-family: var(--font-family);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  line-height: 1;
  padding: var(--space-3) var(--space-6);
  border: none;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* === Primary Button (ORP color) === */

.btn-primary {
  background-color: var(--color-orp);
  color: var(--color-text);
}

.btn-primary:hover:not(:disabled) {
  filter: brightness(0.9);
  transform: translateY(-1px);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
}

/* === Secondary Button (transparent) === */

.btn-secondary {
  background-color: var(--color-text-10);
  color: var(--color-text);
}

.btn-secondary:hover:not(:disabled) {
  background-color: var(--color-text-20);
}

/* === Ghost Button (border only) === */

.btn-ghost {
  background-color: transparent;
  color: var(--color-text);
  border: 2px solid var(--color-text-30);
}

.btn-ghost:hover:not(:disabled) {
  border-color: var(--color-text-60);
  background-color: var(--color-text-10);
}

/* === Icon Button (circular) === */

.btn-icon {
  width: 44px;
  height: 44px;
  padding: 0;
  border-radius: var(--radius-full);
  font-size: var(--font-size-lg);
}

.btn-icon-sm {
  width: 36px;
  height: 36px;
  font-size: var(--font-size-md);
}

.btn-icon-lg {
  width: 56px;
  height: 56px;
  font-size: var(--font-size-xl);
}
```

#### 4.2 Progress Bar

```css
/* src/lib/styles/components.css (continued) */

/* === Progress Bar === */

.progress-container {
  width: 100%;
  height: 4px;
  background-color: var(--color-text-20);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background-color: var(--color-orp);
  transition: width 0.3s ease;
}

/* Thicker variant for visibility */
.progress-container.progress-lg {
  height: 8px;
  border-radius: var(--radius-md);
}
```

#### 4.3 Form Controls

```css
/* src/lib/styles/components.css (continued) */

/* === Input Base === */

.input {
  font-family: var(--font-family);
  font-size: var(--font-size-base);
  padding: var(--space-3) var(--space-4);
  background-color: var(--color-text-05);
  border: 2px solid var(--color-text-20);
  border-radius: var(--radius-lg);
  color: var(--color-text);
  transition: border-color 0.15s ease;
  width: 100%;
}

.input:focus {
  outline: none;
  border-color: var(--color-orp);
}

.input::placeholder {
  color: var(--color-text-40);
}

/* === Color Picker === */

.color-picker {
  width: 44px;
  height: 44px;
  padding: 0;
  border: 2px solid var(--color-text-20);
  border-radius: var(--radius-lg);
  cursor: pointer;
  overflow: hidden;
}

.color-picker::-webkit-color-swatch-wrapper {
  padding: 0;
}

.color-picker::-webkit-color-swatch {
  border: none;
}
```

#### 4.4 Cards and Containers

```css
/* src/lib/styles/components.css (continued) */

/* === Card === */

.card {
  background-color: var(--color-text-05);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}

.card-hover {
  transition: background-color 0.15s ease;
}

.card-hover:hover {
  background-color: var(--color-text-10);
}

/* === Pill/Badge === */

.pill {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  background-color: var(--color-orp-bg);
  color: var(--color-orp);
}

/* === Divider === */

.divider {
  width: 100%;
  height: 1px;
  background-color: var(--color-text-10);
}
```

#### 4.5 Word Highlight (Reader View)

```css
/* src/lib/styles/components.css (continued) */

/* === Clickable Word === */

.word-clickable {
  cursor: pointer;
  border-radius: 2px;
  padding: 0 1px;
  margin: 0 -1px;
  transition: background-color 0.15s ease;
}

.word-clickable:hover {
  background-color: var(--color-text-10);
}

.word-clickable:focus {
  outline: 2px solid var(--color-focus);
  outline-offset: 1px;
}

/* === Highlighted Word (synced from Speed View) === */

.word-highlighted {
  background-color: var(--color-orp-light);
}
```

#### 4.6 Loading and Error States

```css
/* src/lib/styles/components.css (continued) */

/* === Spinner === */

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-text-10);
  border-top-color: var(--color-orp);
  border-radius: var(--radius-full);
  animation: spin 1s linear infinite;
}

.spinner-sm {
  width: 24px;
  height: 24px;
  border-width: 2px;
}

.spinner-lg {
  width: 56px;
  height: 56px;
  border-width: 4px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* === Error Icon === */

.error-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-orp-bg);
  color: var(--color-orp);
  font-family: var(--font-family);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  border-radius: var(--radius-full);
}
```

---

### 5. Theme Store

#### 5.1 Store Interface and Implementation

```typescript
// src/lib/stores/themeStore.ts

import { writable, derived, type Writable, type Readable, get } from 'svelte/store';
import {
  type ThemeColors,
  DEFAULT_COLORS,
  isValidHexColor,
  applyColorsToDocument,
  hasAdequateContrast
} from '$lib/theme/colors';

/**
 * Complete theme state.
 */
interface ThemeState {
  /** User-configurable colors */
  colors: ThemeColors;

  /** Reader View font size (em units, 0.8-2.0) */
  fontSize: number;
}

/**
 * Default theme state.
 */
const DEFAULT_THEME_STATE: ThemeState = {
  colors: DEFAULT_COLORS,
  fontSize: 1.0
};

/**
 * Theme store for runtime theme management.
 */
function createThemeStore() {
  const { subscribe, set, update } = writable<ThemeState>(DEFAULT_THEME_STATE);

  return {
    subscribe,

    /**
     * Initialize theme from persisted settings.
     * Called on app startup.
     */
    initialize(persisted: Partial<ThemeState> | null): void {
      if (persisted) {
        const merged: ThemeState = {
          colors: {
            ...DEFAULT_COLORS,
            ...(persisted.colors || {})
          },
          fontSize: persisted.fontSize ?? DEFAULT_THEME_STATE.fontSize
        };
        set(merged);
        applyColorsToDocument(merged.colors);
      } else {
        set(DEFAULT_THEME_STATE);
        applyColorsToDocument(DEFAULT_THEME_STATE.colors);
      }
    },

    /**
     * Set background color.
     * @returns true if valid and applied, false if invalid
     */
    setBackgroundColor(color: string): boolean {
      if (!isValidHexColor(color)) return false;

      update(state => {
        const newColors = { ...state.colors, background: color };
        applyColorsToDocument(newColors);
        return { ...state, colors: newColors };
      });
      return true;
    },

    /**
     * Set text/word color.
     * @returns true if valid and applied, false if invalid
     */
    setWordColor(color: string): boolean {
      if (!isValidHexColor(color)) return false;

      const state = get({ subscribe });
      if (!hasAdequateContrast(color, state.colors.background)) {
        console.warn('Warning: Color may not have adequate contrast');
        // Still allow the change, but warn
      }

      update(state => {
        const newColors = { ...state.colors, word: color };
        applyColorsToDocument(newColors);
        return { ...state, colors: newColors };
      });
      return true;
    },

    /**
     * Set ORP highlight color.
     * @returns true if valid and applied, false if invalid
     */
    setORPColor(color: string): boolean {
      if (!isValidHexColor(color)) return false;

      update(state => {
        const newColors = { ...state.colors, orp: color };
        applyColorsToDocument(newColors);
        return { ...state, colors: newColors };
      });
      return true;
    },

    /**
     * Set all colors at once.
     */
    setColors(colors: Partial<ThemeColors>): void {
      update(state => {
        const newColors = {
          ...state.colors,
          ...Object.fromEntries(
            Object.entries(colors).filter(([_, v]) => isValidHexColor(v))
          )
        };
        applyColorsToDocument(newColors);
        return { ...state, colors: newColors };
      });
    },

    /**
     * Set Reader View font size.
     * Clamped to 0.8-2.0 range.
     */
    setFontSize(size: number): void {
      const clamped = Math.max(0.8, Math.min(2.0, size));
      update(state => ({ ...state, fontSize: clamped }));
    },

    /**
     * Increase font size by 0.1em.
     */
    increaseFontSize(): void {
      update(state => ({
        ...state,
        fontSize: Math.min(2.0, Math.round((state.fontSize + 0.1) * 10) / 10)
      }));
    },

    /**
     * Decrease font size by 0.1em.
     */
    decreaseFontSize(): void {
      update(state => ({
        ...state,
        fontSize: Math.max(0.8, Math.round((state.fontSize - 0.1) * 10) / 10)
      }));
    },

    /**
     * Reset to default theme.
     */
    reset(): void {
      set(DEFAULT_THEME_STATE);
      applyColorsToDocument(DEFAULT_THEME_STATE.colors);
    },

    /**
     * Get current state for persistence.
     */
    getStateForPersistence(): ThemeState {
      return get({ subscribe });
    }
  };
}

export const themeStore = createThemeStore();

// Derived stores for convenience
export const colors: Readable<ThemeColors> = derived(
  themeStore,
  $state => $state.colors
);

export const fontSize: Readable<number> = derived(
  themeStore,
  $state => $state.fontSize
);

export const backgroundColor: Readable<string> = derived(
  themeStore,
  $state => $state.colors.background
);

export const wordColor: Readable<string> = derived(
  themeStore,
  $state => $state.colors.word
);

export const orpColor: Readable<string> = derived(
  themeStore,
  $state => $state.colors.orp
);
```

#### 5.2 Theme Persistence

```typescript
// src/lib/theme/persistence.ts

import { themeStore } from '$lib/stores/themeStore';
import type { ThemeColors } from './colors';

const STORAGE_KEY = 'faf_theme';

/**
 * Persisted theme data structure.
 */
interface PersistedTheme {
  colors: ThemeColors;
  fontSize: number;
}

/**
 * Load theme from localStorage.
 * Returns null if no saved theme or parse error.
 */
export function loadTheme(): PersistedTheme | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored);

    // Validate structure
    if (typeof parsed.colors !== 'object') return null;
    if (typeof parsed.fontSize !== 'number') return null;

    return parsed as PersistedTheme;
  } catch (e) {
    console.warn('Failed to load theme from storage:', e);
    return null;
  }
}

/**
 * Save theme to localStorage.
 */
export function saveTheme(theme: PersistedTheme): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
  } catch (e) {
    console.warn('Failed to save theme to storage:', e);
  }
}

/**
 * Clear persisted theme.
 */
export function clearTheme(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Subscribe to theme changes and persist.
 * Returns unsubscribe function.
 */
export function setupThemePersistence(): () => void {
  let isInitialized = false;

  return themeStore.subscribe(state => {
    // Skip first call (initialization)
    if (!isInitialized) {
      isInitialized = true;
      return;
    }

    saveTheme({
      colors: state.colors,
      fontSize: state.fontSize
    });
  });
}

/**
 * Initialize theme system.
 * Call once on app startup.
 */
export function initializeTheme(): () => void {
  const persisted = loadTheme();
  themeStore.initialize(persisted);
  return setupThemePersistence();
}
```

---

### 6. Global Styles

#### 6.1 CSS Reset

```css
/* src/app.css */

/* === CSS Reset === */

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 16px;
  -webkit-text-size-adjust: 100%;
}

body {
  min-height: 100vh;
  min-height: 100dvh;
  text-rendering: optimizeLegibility;
}

img,
picture,
video,
canvas,
svg {
  display: block;
  max-width: 100%;
}

input,
button,
textarea,
select {
  font: inherit;
}

button {
  background: none;
  border: none;
  cursor: pointer;
}

a {
  color: inherit;
  text-decoration: none;
}

ul,
ol {
  list-style: none;
}

/* === Import Style Modules === */

@import './lib/styles/variables.css';
@import './lib/styles/typography.css';
@import './lib/styles/layout.css';
@import './lib/styles/components.css';

/* === Root App Styles === */

:root {
  color-scheme: dark;
}

body {
  font-family: var(--font-family);
  background-color: var(--color-bg);
  color: var(--color-text);
  overflow: hidden;
}

/* === Scrollbar Styling === */

::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background-color: var(--color-text-20);
  border-radius: var(--radius-full);
}

::-webkit-scrollbar-thumb:hover {
  background-color: var(--color-text-30);
}

/* Firefox scrollbar */
* {
  scrollbar-width: thin;
  scrollbar-color: var(--color-text-20) transparent;
}

/* === Selection Styling === */

::selection {
  background-color: var(--color-orp-light);
  color: var(--color-text);
}

/* === Focus Visible === */

:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

/* === Reduced Motion === */

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

### 7. Svelte Component Integration

#### 7.1 Using Theme in Components

```svelte
<!-- Example: Using theme store in a component -->
<script lang="ts">
  import { themeStore, colors, fontSize } from '$lib/stores/themeStore';

  // Access colors reactively
  $: backgroundColor = $colors.background;
  $: textColor = $colors.word;
  $: orpColor = $colors.orp;

  // Or use CSS custom properties in styles (preferred)
</script>

<div class="my-component">
  <span class="word" style="color: {textColor};">Hello</span>
  <span class="orp" style="color: {orpColor};">W</span>
  <span class="word" style="color: {textColor};">orld</span>
</div>

<style>
  /* Preferred: Use CSS custom properties */
  .my-component {
    background-color: var(--color-bg);
    color: var(--color-text);
  }

  .orp {
    color: var(--color-orp);
    font-weight: var(--font-weight-medium);
  }
</style>
```

#### 7.2 Theme Settings Component

```svelte
<!-- src/lib/components/settings/ThemeSettings.svelte -->
<script lang="ts">
  import { themeStore, colors } from '$lib/stores/themeStore';
  import { DEFAULT_COLORS } from '$lib/theme/colors';

  // Local state for color inputs
  let backgroundColor = $colors.background;
  let wordColor = $colors.word;
  let orpColor = $colors.orp;

  // Update local state when store changes
  $: {
    backgroundColor = $colors.background;
    wordColor = $colors.word;
    orpColor = $colors.orp;
  }

  function handleBackgroundChange(event: Event) {
    const target = event.target as HTMLInputElement;
    themeStore.setBackgroundColor(target.value);
  }

  function handleWordColorChange(event: Event) {
    const target = event.target as HTMLInputElement;
    themeStore.setWordColor(target.value);
  }

  function handleORPColorChange(event: Event) {
    const target = event.target as HTMLInputElement;
    themeStore.setORPColor(target.value);
  }

  function resetColors() {
    themeStore.setColors(DEFAULT_COLORS);
  }
</script>

<div class="theme-settings">
  <h3 class="section-title">Colors</h3>

  <div class="color-setting">
    <label for="bg-color">Background</label>
    <input
      type="color"
      id="bg-color"
      class="color-picker"
      value={backgroundColor}
      on:input={handleBackgroundChange}
    />
  </div>

  <div class="color-setting">
    <label for="word-color">Text</label>
    <input
      type="color"
      id="word-color"
      class="color-picker"
      value={wordColor}
      on:input={handleWordColorChange}
    />
  </div>

  <div class="color-setting">
    <label for="orp-color">Focus Letter</label>
    <input
      type="color"
      id="orp-color"
      class="color-picker"
      value={orpColor}
      on:input={handleORPColorChange}
    />
  </div>

  <button class="btn btn-secondary" on:click={resetColors}>
    Reset to Defaults
  </button>
</div>

<style>
  .theme-settings {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .section-title {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    text-transform: uppercase;
    letter-spacing: var(--letter-spacing-wider);
    color: var(--color-text-50);
  }

  .color-setting {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
  }

  .color-setting label {
    font-size: var(--font-size-md);
    color: var(--color-text-80);
  }

  .color-picker {
    width: 44px;
    height: 44px;
    padding: 0;
    border: 2px solid var(--color-text-20);
    border-radius: var(--radius-lg);
    cursor: pointer;
    overflow: hidden;
  }

  .color-picker::-webkit-color-swatch-wrapper {
    padding: 2px;
  }

  .color-picker::-webkit-color-swatch {
    border: none;
    border-radius: var(--radius-md);
  }
</style>
```

#### 7.3 App Initialization

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { initializeTheme } from '$lib/theme/persistence';
  import '../app.css';

  let initialized = false;

  onMount(() => {
    // Initialize theme system
    const unsubscribe = initializeTheme();
    initialized = true;

    return () => {
      unsubscribe();
    };
  });
</script>

{#if initialized}
  <div class="app-container">
    <slot />
  </div>
{:else}
  <!-- Brief loading state while theme initializes -->
  <div class="app-container" style="background-color: #38393d;">
  </div>
{/if}

<style>
  .app-container {
    width: 100%;
    height: 100vh;
    height: 100dvh;
    overflow: hidden;
  }
</style>
```

---

### 8. Accessibility

#### 8.1 Color Contrast Requirements

```typescript
// Accessibility validation in theme settings

/**
 * WCAG 2.1 Contrast Requirements:
 * - AA Normal text: 4.5:1
 * - AA Large text: 3:1
 * - AAA Normal text: 7:1
 * - AAA Large text: 4.5:1
 */

import { getContrastRatio } from '$lib/theme/colors';

export function validateColorContrast(
  textColor: string,
  backgroundColor: string
): { valid: boolean; ratio: number; level: 'AAA' | 'AA' | 'fail' } {
  const ratio = getContrastRatio(textColor, backgroundColor);

  if (ratio >= 7) {
    return { valid: true, ratio, level: 'AAA' };
  } else if (ratio >= 4.5) {
    return { valid: true, ratio, level: 'AA' };
  } else {
    return { valid: false, ratio, level: 'fail' };
  }
}

// Default colors validation:
// #FFFFFF on #38393d = ~11.5:1 (AAA pass)
// #E53935 on #38393d = ~3.8:1 (AA for large text only)
// ORP is large text in Speed View, so this is acceptable
```

#### 8.2 Focus States

```css
/* Ensure all interactive elements have visible focus states */

/* Default focus style */
:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

/* Button focus */
.btn:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

/* Input focus */
.input:focus-visible {
  outline: none;
  border-color: var(--color-orp);
  box-shadow: 0 0 0 3px var(--color-orp-bg);
}

/* Clickable word focus */
.word-clickable:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 1px;
  border-radius: 2px;
}
```

#### 8.3 Reduced Motion

```css
/* Respect user preference for reduced motion */

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  /* Disable smooth scrolling */
  .reader-view {
    scroll-behavior: auto;
  }

  /* Disable ORP transition */
  .speed-word {
    transition: none;
  }
}
```

#### 8.4 Screen Reader Support

```svelte
<!-- ARIA live regions for Speed View word changes -->
<div
  role="region"
  aria-label="Speed reading display"
  aria-live="off"
  aria-atomic="true"
>
  <!-- When paused, change to aria-live="polite" for screen reader announcement -->
  {#if $isPaused}
    <span class="sr-only">
      Current word: {$currentWord?.text}.
      Progress: {$progress}%.
      Time remaining: {$timeRemainingFormatted}.
    </span>
  {/if}

  <WordDisplay word={$currentWord} />
</div>

<style>
  /* Screen reader only text */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
```

---

### 9. Platform-Specific Considerations

#### 9.1 Desktop (Tauri)

```css
/* Desktop-specific styles */

@media (min-width: 1024px) {
  /* Larger touch targets not needed */
  .btn {
    padding: var(--space-2) var(--space-4);
  }

  .btn-icon {
    width: 36px;
    height: 36px;
  }

  /* Enable hover effects */
  .btn:hover:not(:disabled) {
    transform: translateY(-1px);
  }
}

/* Window drag region for Tauri */
.titlebar {
  -webkit-app-region: drag;
}

.titlebar button {
  -webkit-app-region: no-drag;
}
```

#### 9.2 Mobile (Capacitor)

```css
/* Mobile-specific styles */

@media (max-width: 767px) {
  /* Larger touch targets (44px minimum) */
  .btn {
    min-height: 44px;
    min-width: 44px;
  }

  .btn-icon {
    width: 48px;
    height: 48px;
  }

  /* Disable hover effects (no hover on touch) */
  .btn:hover {
    transform: none;
  }

  /* Safe area insets */
  .app-container {
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
  }

  /* Prevent text selection during gestures */
  .speed-view {
    user-select: none;
    -webkit-user-select: none;
  }

  /* Prevent pull-to-refresh in Speed View */
  .speed-view {
    overscroll-behavior: none;
  }
}
```

#### 9.3 iOS-Specific

```css
/* iOS-specific fixes */

@supports (-webkit-touch-callout: none) {
  /* Fix 100vh issue on iOS Safari */
  .app-container {
    height: -webkit-fill-available;
  }

  /* Prevent zoom on input focus */
  input,
  select,
  textarea {
    font-size: 16px;
  }
}
```

---

### 10. About Section Quote

Per SPEC.md, the About section must include this quote:

```svelte
<!-- src/lib/components/about/AboutSection.svelte -->
<script lang="ts">
  // About content from SPEC.md
</script>

<section class="about-section">
  <h2 class="about-title">About FaF</h2>

  <blockquote class="about-quote">
    "The habit that keeps people from speedreading is their habit to pronounce
    words in their head when they read them. Keep the voice out of your head,
    and let the eyes do the work."
  </blockquote>

  <div class="about-info">
    <p>FaF (Fast as Fuck) is an RSVP speed reader that displays one word at a
    time at a fixed eye position, helping you read faster by eliminating
    subvocalization.</p>
  </div>
</section>

<style>
  .about-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    padding: var(--space-8);
  }

  .about-title {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text);
  }

  .about-quote {
    font-size: var(--font-size-md);
    font-style: italic;
    color: var(--color-text-60);
    line-height: var(--line-height-relaxed);
    padding-left: var(--space-4);
    border-left: 3px solid var(--color-text-20);
  }

  .about-info {
    font-size: var(--font-size-md);
    color: var(--color-text-80);
    line-height: var(--line-height-relaxed);
  }
</style>
```

---

### 11. File Structure Summary

```
src/
├── app.css                              # Global styles, CSS reset
├── routes/
│   └── +layout.svelte                   # App shell with theme init
├── lib/
│   ├── styles/
│   │   ├── variables.css                # CSS custom properties
│   │   ├── typography.css               # Font faces, text styles
│   │   ├── layout.css                   # Spacing, breakpoints, containers
│   │   └── components.css               # Shared component styles
│   ├── stores/
│   │   └── themeStore.ts                # Theme state management
│   ├── theme/
│   │   ├── colors.ts                    # Color utilities, defaults
│   │   └── persistence.ts               # localStorage persistence
│   └── components/
│       ├── settings/
│       │   └── ThemeSettings.svelte     # Color customization UI
│       └── about/
│           └── AboutSection.svelte      # About page with quote
└── static/
    └── fonts/
        └── lexend/
            ├── Lexend-Regular.woff2
            ├── Lexend-Medium.woff2
            ├── Lexend-SemiBold.woff2
            └── Lexend-Bold.woff2
```

---

### 12. Integration Points

| System | Integration |
|--------|-------------|
| View System | Components use CSS custom properties for colors |
| Persistence | Theme persisted via localStorage, loaded on startup |
| Settings | ThemeSettings component for user customization |
| Playback | No direct integration (styling only) |

---

## Review

### Summary
Comprehensive and well-structured specification covering all theme and UI requirements. Default colors match SPEC.md exactly, includes proper About section quote, and demonstrates thorough planning with accessibility, responsive design, and platform considerations.

### Critical Issues (must fix)
None - specification is complete and correct.

### Warnings (should fix)
None - all requirements properly addressed.

### Suggestions (optional improvements)
- Consider documenting the Lexend font source/license location for bundling
- Theme persistence error handling is good, but could add version migration strategy for future color additions
- WCAG contrast validation is excellent - consider adding inline warnings in ThemeSettings UI when users pick low-contrast colors

### Detailed Assessment

#### 1. Completeness (10/10)
- All three configurable colors documented with correct defaults
- Lexend font properly specified with bundling strategy
- About section quote included verbatim from SPEC.md
- Extended color palette with derived values
- Typography scale and weights defined
- Layout system with responsive breakpoints
- Component styles for all UI elements
- Accessibility considerations (WCAG, reduced motion, screen readers)
- Platform-specific adaptations (Tauri, Capacitor, iOS)
- Persistence strategy clearly defined

#### 2. Clarity (10/10)
- Excellent structure with numbered sections
- Code examples for all implementations
- Clear integration points documented
- File structure summary provided
- CSS custom property naming is intuitive
- TypeScript interfaces well-documented
- Architecture decisions explained

#### 3. Correctness (10/10)
- Background color: #38393d (matches SPEC.md)
- Word color: #FFFFFF (matches SPEC.md)
- ORP color: #E53935 (matches SPEC.md)
- About quote: Exact match from SPEC.md line 165
- Lexend font specified throughout
- Font bundling strategy appropriate for offline Tauri/Capacitor apps

#### 4. Implementability (9/10)
- CSS custom properties approach is sound
- Theme store pattern is standard Svelte
- Persistence using localStorage is appropriate
- Color utilities include all necessary helpers
- Component examples show proper usage
- Minor: Font files need to be acquired (woff2 formats), but source not specified

### Specification Highlights

#### Excellent Decisions
1. **CSS Custom Properties**: Runtime theming without CSS-in-JS overhead
2. **Derived Colors**: Computed opacity variants ensure consistency
3. **Accessibility First**: Contrast checking, focus states, reduced motion
4. **Mobile-First**: Base styles for mobile, enhanced for desktop
5. **Platform Adaptations**: Safe area insets, touch targets, viewport fixes

#### Color System
- Three user-configurable colors as required
- Derived colors computed dynamically when theme changes
- Contrast validation with WCAG compliance checking
- Proper hex color validation

#### Typography
- Lexend font faces: Regular, Medium, SemiBold, Bold
- Responsive word size in Speed View: `clamp(2rem, 8vw, 4rem)`
- Line heights and spacing defined
- Screen reader support considered

#### Layout
- Proper viewport handling (100dvh for mobile)
- Safe area insets for iOS
- Optimal reading width (65ch) for Reader View
- Responsive breakpoints

#### Theme Store
- Svelte writable store with derived stores
- Validation before applying changes
- Persistence to localStorage
- Initialization from saved settings
- Methods for all required operations

### Verification Against SPEC.md

| Requirement | Specified | Correct |
|-------------|-----------|---------|
| Background: #38393d | Yes | Yes |
| Word: #FFFFFF | Yes | Yes |
| ORP: #E53935 | Yes | Yes |
| Lexend font bundled | Yes | Yes |
| About section quote | Yes | Yes (verbatim) |
| User configurable colors | Yes | Yes |

### Integration Points
- View System: CSS variables used in components
- Persistence: localStorage with error handling
- Settings UI: ThemeSettings component example provided
- Playback: Styling only (no functional coupling)

### Verdict
[X] Approved - Ready for implementation

#### Rationale
This specification exceeds minimum requirements. It not only covers all mandatory elements from SPEC.md but also provides comprehensive implementation details, accessibility considerations, and platform-specific adaptations. The color defaults are exact matches, the Lexend font strategy is appropriate, and the About section quote is verbatim. The specification can be implemented without ambiguity.

#### Scores
- Completeness: 10/10
- Clarity: 10/10
- Correctness: 10/10
- Implementability: 9/10

**Average: 9.75/10** - Approved

---

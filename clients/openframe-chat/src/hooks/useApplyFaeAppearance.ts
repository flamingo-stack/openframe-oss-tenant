import { useEffect } from 'react';
import { useChatConfig } from './useChatConfig';

// ODS accent custom properties overridden by the configured accent color.
// `--ods-accent` is the canonical token; the `--color-accent-*` aliases are
// what components actually consume for hover/active/focus states.
const ACCENT_CSS_VARS = [
  '--ods-accent',
  '--color-accent-primary',
  '--color-accent-hover',
  '--color-accent-active',
  '--color-accent-focus',
];

/**
 * Applies FaeSettings appearance to the document:
 * - `applicationTheme` (DARK | LIGHT | SYSTEM) -> `data-theme` on <html>;
 *   ODS defaults to dark when the attribute is absent, SYSTEM follows the
 *   OS preference live via `prefers-color-scheme`.
 * - `accentColor` -> inline ODS accent CSS variables on <html>.
 * Everything is reverted when settings are missing (defaults win).
 */
export function useApplyFaeAppearance() {
  const { faeSettings } = useChatConfig();
  const theme = faeSettings?.applicationTheme;
  const accentColor = faeSettings?.accentColor;

  useEffect(() => {
    const root = document.documentElement;

    if (!theme) {
      root.removeAttribute('data-theme');
      return;
    }

    if (theme === 'SYSTEM') {
      const media = window.matchMedia('(prefers-color-scheme: light)');
      const applySystemTheme = () => root.setAttribute('data-theme', media.matches ? 'light' : 'dark');
      applySystemTheme();
      media.addEventListener('change', applySystemTheme);
      return () => {
        media.removeEventListener('change', applySystemTheme);
        root.removeAttribute('data-theme');
      };
    }

    root.setAttribute('data-theme', theme === 'LIGHT' ? 'light' : 'dark');
    return () => root.removeAttribute('data-theme');
  }, [theme]);

  useEffect(() => {
    if (!accentColor) return;

    const root = document.documentElement;
    for (const cssVar of ACCENT_CSS_VARS) {
      root.style.setProperty(cssVar, accentColor);
    }
    return () => {
      for (const cssVar of ACCENT_CSS_VARS) {
        root.style.removeProperty(cssVar);
      }
    };
  }, [accentColor]);
}

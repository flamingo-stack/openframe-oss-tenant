import { useEffect } from 'react';
import { deriveAccentShades } from '../utils/accentShades';
import { useChatConfig } from './useChatConfig';

// Maps each overridden ODS custom property to which accent shade it gets.
// `base` is the accent itself; `hover`/`active` are ODS-style darkened steps so
// interaction states stay visually distinct instead of collapsing to one color.
// `--ods-accent` is the canonical token; `--color-accent-*` are the aliases
// components consume. `--ods-flamingo-pink-*` back the lib's
// `bg-ods-flamingo-pink` / `text-ods-flamingo-pink`, used by the assistant
// Avatar fill and fae author name - overriding them recolors those to the accent.
const ACCENT_VAR_SHADES = {
  '--ods-accent': 'base',
  '--color-accent-primary': 'base',
  '--color-accent-focus': 'base',
  '--color-accent-hover': 'hover',
  '--color-accent-active': 'active',
  '--ods-flamingo-pink-base': 'base',
  '--ods-flamingo-pink-hover': 'hover',
  '--ods-flamingo-pink-action': 'active',
} as const;

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
    const shades = deriveAccentShades(accentColor);
    const cssVars = Object.keys(ACCENT_VAR_SHADES) as Array<keyof typeof ACCENT_VAR_SHADES>;

    for (const cssVar of cssVars) {
      root.style.setProperty(cssVar, shades[ACCENT_VAR_SHADES[cssVar]]);
    }
    return () => {
      for (const cssVar of cssVars) {
        root.style.removeProperty(cssVar);
      }
    };
  }, [accentColor]);
}

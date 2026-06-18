'use client';

import { useEffect, useState } from 'react';
import type { ApplicationTheme } from '../../types/ai-settings';

export type ResolvedTheme = 'dark' | 'light';

/** Resolves ApplicationTheme to 'dark' | 'light'; `SYSTEM` follows `prefers-color-scheme`. */
export function useResolvedTheme(theme: ApplicationTheme): ResolvedTheme {
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>('dark');

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const media = window.matchMedia('(prefers-color-scheme: light)');
    const sync = () => setSystemTheme(media.matches ? 'light' : 'dark');

    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  if (theme === 'LIGHT') return 'light';
  if (theme === 'DARK') return 'dark';
  return systemTheme;
}

import { useEffect, useState } from 'react';

export type DocumentTheme = 'light' | 'dark';

// `data-theme` on <html> is the resolved theme (set by useApplyFaeAppearance,
// including SYSTEM). Absent attribute means ODS default = dark.
function readDocumentTheme(): DocumentTheme {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

/**
 * Reactively tracks the resolved document theme (`data-theme` on <html>),
 * updating when it changes (e.g. SYSTEM following the OS, or a settings switch).
 */
export function useDocumentTheme(): DocumentTheme {
  const [theme, setTheme] = useState<DocumentTheme>(readDocumentTheme);

  useEffect(() => {
    const sync = () => setTheme(readDocumentTheme());
    sync();

    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  return theme;
}

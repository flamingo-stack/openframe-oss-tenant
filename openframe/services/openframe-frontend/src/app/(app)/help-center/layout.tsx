import type { CSSProperties, ReactNode } from 'react';
import { HelpCenterRuntimeProvider } from './help-center-runtime-provider';

/**
 * OpenFrame host-grid override for the lib `PageShell` padding, applied as
 * `--page-shell-*` CSS vars on a wrapper around the whole `/help-center` subtree.
 * The cascade scopes it here (no process-wide global) and every surface's
 * PageShell — DevSectionPage, Legal, ReleaseDetail, FAQs, tickets — inherits it
 * with no per-page prop. Mirrors the old `px-[var(--spacing-system-l)]
 * pb-[var(--spacing-system-l)]`: flat horizontal spacing, bottom-only vertical,
 * no responsive bump.
 */
const PAGE_SHELL_OVERRIDE: CSSProperties = {
  '--page-shell-px': 'var(--spacing-system-l)',
  '--page-shell-px-md': 'var(--spacing-system-l)',
  '--page-shell-pt': '0px',
  '--page-shell-pt-md': '0px',
  '--page-shell-pb': 'var(--spacing-system-l)',
  '--page-shell-pb-md': 'var(--spacing-system-l)',
} as CSSProperties;

/**
 * Wraps every `/help-center/*` route in the section's nested ChatRuntime
 * override (host-mode navigation + in-app content hrefs). Server component;
 * the provider it mounts is the only client boundary. The `PAGE_SHELL_OVERRIDE`
 * wrapper sets the lib `PageShell`'s host padding via CSS vars, scoped here.
 */
export default function HelpCenterLayout({ children }: { children: ReactNode }) {
  return (
    <div style={PAGE_SHELL_OVERRIDE}>
      <HelpCenterRuntimeProvider>{children}</HelpCenterRuntimeProvider>
    </div>
  );
}

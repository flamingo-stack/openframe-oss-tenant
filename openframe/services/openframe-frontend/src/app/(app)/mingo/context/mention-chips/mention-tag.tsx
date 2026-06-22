'use client';

/**
 * Presentational shell every per-type mention chip renders into — the real lib
 * `Tag` (variant `badge`: ods-card + ods-border, mono-uppercase), rendered as a
 * `<span>` via `as="span"` and shrunk to inline height.
 *
 * Why `as="span"`: these chips are emitted INLINE inside markdown text, which
 * react-markdown wraps in a `<p>`. The default `<Tag>` root is a `<div>`, and a
 * block `<div>` inside `<p>` is invalid HTML (hydration error) — same reason the
 * lib's inline `card://` pills are spans. `Tag`'s `as` prop renders the same
 * skin on an inline element.
 *
 * When `href` is set the chip is a link that opens the entity's page in a NEW
 * TAB. Also exports the loading skeleton and an error boundary so a per-type
 * chip is always: skeleton while fetching → resolved chip → plain id chip if the
 * fetch throws (never crashes the message).
 */

import { Tag } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { Component, type ReactNode } from 'react';

// Tweaks on top of Tag's `badge` skin so the mention matches the canonical
// context chip (`ChatContextChipStrip`). We KEEP Tag's natural height (h-8 =
// 32px) and padding — only adjust for inline flow + a neutral hover:
//   - `align-middle`         → vertically center the chip in the text line.
//   - `hover:border-ods-border` → kill the badge variant's default
//     `hover:border-ods-accent` (bright yellow border) which the context chips
//     don't have (last hover:border utility wins via tailwind-merge).
//   - `[&_svg]:size-4`       → 16px lead icon, matching the context chips.
//   - `[&_svg]:text-ods-text-secondary` → grey lead icon (label stays primary),
//     matching the context chips' muted glyph.
// NB: no `cursor-pointer` here — the link cursor comes from the `<a>` wrapper, so
// a chip WITHOUT an href (e.g. user — no detail page) doesn't look clickable.
const CHIP_CLASS = 'max-w-[16rem] align-middle [&_svg]:size-4 [&_svg]:text-ods-text-secondary hover:border-ods-border';

interface MentionTagProps {
  icon?: ReactNode;
  label: ReactNode;
  /** Entity detail-page URL. When set, the chip opens it in a new tab. */
  href?: string;
}

export function MentionTag({ icon, label, href }: MentionTagProps) {
  // Wrap the label so it's NOT a string — Tag only sets the native `title`
  // tooltip for string labels, and that browser tooltip (a grey box on hover)
  // looks unpolished. Tag still truncates via its own label span.
  const chip = <Tag as="span" variant="badge" icon={icon} label={<>{label}</>} className={CHIP_CLASS} />;
  if (!href) return chip;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="no-underline">
      {chip}
    </a>
  );
}

/** Loading state — same chip shell with an inline skeleton bar for the label.
 *  (An inline span, not the lib `Skeleton` div — the chip lives inside a `<p>`.) */
export function MentionTagSkeleton({ icon }: { icon?: ReactNode }) {
  return (
    <MentionTag
      icon={icon}
      label={<span className="inline-block h-3 w-20 animate-pulse rounded bg-ods-border align-middle" />}
    />
  );
}

/**
 * Catches a fetch throw in a per-type chip and renders the fallback (a plain id
 * chip) instead of letting the error propagate up and blank the whole message.
 */
export class MentionErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

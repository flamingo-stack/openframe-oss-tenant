'use client';

import { cn } from '@flamingo-stack/openframe-frontend-core/utils';
import { scriptV2ShellType } from '../utils/shell-types';

interface ScriptShellBadgeProps {
  /** Lowercase shell id (e.g. 'cmd'). */
  value: string;
  className?: string;
  iconClassName?: string;
}

/**
 * Scripts v2 shell badge: icon + label sourced from `SCRIPT_V2_SHELL_TYPES`.
 * Mirrors the core `ShellTypeBadge` layout but uses the host-owned v2 icon set
 * and the `CMD` label, so the table stays consistent with the editor select.
 */
export function ScriptShellBadge({ value, className, iconClassName }: ScriptShellBadgeProps) {
  const shell = scriptV2ShellType(value);
  const Icon = shell?.icon;

  return (
    <span className={cn('flex items-center gap-2', className)}>
      {/* Force the system-greys/grey (#888) tint over the icon's default currentColor;
          iconClassName comes after so callers keep size/override control. */}
      {Icon && <Icon className={cn('w-5 h-5 text-ods-text-secondary', iconClassName)} />}
      <span>{shell?.label ?? value}</span>
    </span>
  );
}

import {
  PowershellLogoGreyIcon,
  TerminalIcon,
  TerminalSquareIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import type { ShellTypeDefinition } from '@flamingo-stack/openframe-frontend-core/types';
import { ScriptShell } from '@/generated/schema-enums';

/**
 * Scripts v2 owns its shell presentation instead of consuming the core library's
 * `SHELL_TYPES`: product wants the `CMD` label (not "Batch"), the v2 icon set, and
 * a grey PowerShell glyph. Only the shells the v2 UI offers are listed — this also
 * removes the need to filter by `ALLOWED_SHELL_IDS` at the call sites.
 *
 * Shape matches the core `ShellTypeDefinition` so it stays drop-in compatible with
 * the shared `ScriptFormFields` shell select.
 */
export const SCRIPT_V2_SHELL_TYPES: ShellTypeDefinition[] = [
  { id: ScriptShell.POWERSHELL, label: 'PowerShell', value: 'powershell', icon: PowershellLogoGreyIcon },
  { id: ScriptShell.CMD, label: 'CMD', value: 'cmd', icon: TerminalSquareIcon },
  { id: ScriptShell.BASH, label: 'Bash', value: 'bash', icon: TerminalIcon },
];

/** Resolve a shell definition by its lowercase id (e.g. 'cmd'). */
export function scriptV2ShellType(value: string): ShellTypeDefinition | undefined {
  return SCRIPT_V2_SHELL_TYPES.find(s => s.value === value);
}

/** Display label for a lowercase shell id, falling back to the raw value. */
export function scriptV2ShellLabel(value: string): string {
  return scriptV2ShellType(value)?.label ?? value;
}

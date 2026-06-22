import type { ScriptArgument } from '@flamingo-stack/openframe-frontend-core';
import type { ScriptPlatform, ScriptShell } from '@/__generated__/scriptDetailRelayQuery.graphql';
import { EDIT_SCRIPT_DEFAULT_VALUES, type EditScriptFormData } from '../../types/edit-script.types';
import { parseKeyValues, serializeKeyValues } from '../../utils/script-key-values';

/**
 * Translation layer between the UI's (tactical-shaped) form model and the
 * native OpenFrame GraphQL Script model. The v2 views intentionally reuse the
 * existing presentational components, so every model difference is contained
 * here.
 */

// ---------------------------------------------------------------------------
// Shell <-> ScriptShell enum
// ---------------------------------------------------------------------------

const SHELL_TO_ENUM: Record<string, ScriptShell> = {
  powershell: 'POWERSHELL',
  cmd: 'CMD',
  bash: 'BASH',
  python: 'PYTHON',
  nushell: 'NUSHELL',
  shell: 'SHELL',
};

/**
 * Shells the frontend is allowed to create / run with. The backend `ScriptShell`
 * enum exposes more (PYTHON, NUSHELL, SHELL), but per product the UI only offers
 * these three. Used to limit both the editor's shell select and the list filter.
 */
export const ALLOWED_SHELL_IDS: string[] = ['cmd', 'bash', 'powershell'];

export function shellToEnum(shell: string): ScriptShell {
  return SHELL_TO_ENUM[shell?.toLowerCase()] ?? 'SHELL';
}

/** Lowercase id consumed by ShellTypeBadge / ScriptInfoSection / the editor. */
export function shellToId(shell: ScriptShell | string | null | undefined): string {
  return (shell ?? 'shell').toString().toLowerCase();
}

// ---------------------------------------------------------------------------
// Platform <-> ScriptPlatform enum (UI ids: windows / darwin / linux)
// ---------------------------------------------------------------------------

const PLATFORM_ID_TO_ENUM: Record<string, ScriptPlatform> = {
  windows: 'WINDOWS',
  darwin: 'MACOS',
  linux: 'LINUX',
};

const PLATFORM_ENUM_TO_ID: Record<string, string> = {
  WINDOWS: 'windows',
  MACOS: 'darwin',
  LINUX: 'linux',
};

export function platformsToEnums(ids: string[]): ScriptPlatform[] {
  return ids.map(id => PLATFORM_ID_TO_ENUM[id?.toLowerCase()]).filter((v): v is ScriptPlatform => !!v);
}

export function platformsToIds(enums: ReadonlyArray<ScriptPlatform | string> | null | undefined): string[] {
  if (!enums) return [];
  return enums.map(e => PLATFORM_ENUM_TO_ID[e as string]).filter((v): v is string => !!v);
}

// ---------------------------------------------------------------------------
// Env vars <-> ScriptEnvVar { name, value, secret }
// ---------------------------------------------------------------------------

export interface ScriptEnvVarInput {
  name: string;
  value: string;
  secret: boolean;
}

/** Form key/value pairs -> GraphQL ScriptEnvVarInput[] (secret defaults to false). */
export function envVarsToInput(pairs: ScriptArgument[]): ScriptEnvVarInput[] {
  return pairs.filter(p => p.key.trim() !== '').map(p => ({ name: p.key, value: p.value ?? '', secret: false }));
}

/** GraphQL env vars -> "name=value" strings (consumed by ScriptArgumentsCard). */
export function envVarsToStrings(
  envVars: ReadonlyArray<{ name: string; value?: string | null }> | null | undefined,
): string[] {
  if (!envVars) return [];
  return envVars.map(e => (e.value ? `${e.name}=${e.value}` : e.name));
}

/** GraphQL env vars -> form key/value pairs. */
export function envVarsToPairs(
  envVars: ReadonlyArray<{ name: string; value?: string | null }> | null | undefined,
): ScriptArgument[] {
  if (!envVars) return [];
  return envVars.map((e, i) => ({ id: `env-${i}`, key: e.name, value: e.value ?? '' }));
}

// ---------------------------------------------------------------------------
// Form payload -> Create / Update input
// ---------------------------------------------------------------------------

export interface ScriptWriteInput {
  name: string;
  description: string;
  shell: ScriptShell;
  scriptBody: string;
  tag: string | null;
  supportedPlatforms: ScriptPlatform[];
  defaultTimeoutSeconds: number;
  defaultArgs: string[];
  envVars: ScriptEnvVarInput[];
}

export function formToWriteInput(data: EditScriptFormData): ScriptWriteInput {
  return {
    name: data.name,
    description: data.description,
    shell: shellToEnum(data.shell),
    scriptBody: data.script_body,
    // Category is not exposed in v2; preserve an existing tag on edit, else null.
    tag: data.category?.trim() ? data.category : null,
    supportedPlatforms: platformsToEnums(data.supported_platforms),
    defaultTimeoutSeconds: data.default_timeout,
    // Args are stored as "key value" strings, matching the legacy tactical shape.
    defaultArgs: serializeKeyValues(data.args, ' '),
    envVars: envVarsToInput(data.env_vars),
  };
}

// ---------------------------------------------------------------------------
// Relay script node -> form values
// ---------------------------------------------------------------------------

export interface ScriptDetailNode {
  id: string;
  name: string;
  description?: string | null;
  shell: ScriptShell | string;
  scriptBody: string;
  tag?: string | null;
  supportedPlatforms?: ReadonlyArray<ScriptPlatform | string> | null;
  defaultTimeoutSeconds?: number | null;
  defaultArgs?: ReadonlyArray<string> | null;
  envVars?: ReadonlyArray<{ name: string; value?: string | null; secret?: boolean }> | null;
}

export function relayScriptToForm(node: ScriptDetailNode): EditScriptFormData {
  return {
    name: node.name ?? '',
    shell: shellToId(node.shell),
    default_timeout: node.defaultTimeoutSeconds ?? EDIT_SCRIPT_DEFAULT_VALUES.default_timeout,
    args: parseKeyValues(node.defaultArgs ? [...node.defaultArgs] : [], ' '),
    script_body: node.scriptBody ?? '',
    run_as_user: false,
    env_vars: envVarsToPairs(node.envVars),
    description: node.description ?? '',
    supported_platforms: platformsToIds(node.supportedPlatforms),
    category: node.tag ?? '',
  };
}

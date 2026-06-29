import type { ScriptArgument } from '@flamingo-stack/openframe-frontend-core';
// Value import: the generated module exports each enum as both a `const` (values)
// and a `type` under the same name, so these stand in for hardcoded literals.
import { PrivilegeLevel, ScriptPlatform, ScriptShell } from '@/generated/schema-enums';
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

/** UI shell id is just the lowercased enum value — reverse map derived, not hardcoded. */
const SHELL_BY_ID: Record<string, ScriptShell> = Object.fromEntries(
  Object.values(ScriptShell).map(shell => [shell.toLowerCase(), shell]),
);

export function shellToEnum(shell: string): ScriptShell {
  return SHELL_BY_ID[shell?.toLowerCase()] ?? ScriptShell.SHELL;
}

/** Lowercase id consumed by ScriptShellBadge / ScriptInfoSection / the editor. */
export function shellToId(shell: ScriptShell | string | null | undefined): string {
  return (shell ?? ScriptShell.SHELL).toString().toLowerCase();
}

// ---------------------------------------------------------------------------
// Platform <-> ScriptPlatform enum (UI ids: windows / darwin / linux)
// ---------------------------------------------------------------------------

// UI ids mostly match the lowercased enum, except darwin <-> MACOS, so the
// id->enum aliases stay explicit; the reverse map is derived from them.
const PLATFORM_ID_TO_ENUM: Record<string, ScriptPlatform> = {
  windows: ScriptPlatform.WINDOWS,
  darwin: ScriptPlatform.MACOS,
  linux: ScriptPlatform.LINUX,
};

const PLATFORM_ENUM_TO_ID: Record<string, string> = Object.fromEntries(
  Object.entries(PLATFORM_ID_TO_ENUM).map(([id, enumValue]) => [enumValue, id]),
);

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
  privilegeLevel: PrivilegeLevel;
  scriptBody: string;
  supportedPlatforms: ScriptPlatform[];
  defaultTimeoutSeconds: number;
  defaultArgs: string[];
  envVars: ScriptEnvVarInput[];
  /** Ids of existing Tag entities to assign — replaces the current set (PUT semantics). */
  tagIds: string[];
}

export function formToWriteInput(data: EditScriptFormData): ScriptWriteInput {
  return {
    name: data.name,
    description: data.description,
    shell: shellToEnum(data.shell),
    // `run_as_user` maps to the backend privilege level (USER vs elevated ADMIN).
    privilegeLevel: data.run_as_user ? PrivilegeLevel.USER : PrivilegeLevel.ADMIN,
    scriptBody: data.script_body,
    supportedPlatforms: platformsToEnums(data.supported_platforms),
    defaultTimeoutSeconds: data.default_timeout,
    // Args are stored as "key value" strings, matching the legacy tactical shape.
    defaultArgs: serializeKeyValues(data.args, ' '),
    envVars: envVarsToInput(data.env_vars),
    // Tag entities assigned via the tags picker; replaces the current set.
    tagIds: data.tag_ids,
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
  privilegeLevel?: PrivilegeLevel | string | null;
  scriptBody: string;
  tags?: ReadonlyArray<{ id: string; key: string }> | null;
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
    run_as_user: node.privilegeLevel === PrivilegeLevel.USER,
    env_vars: envVarsToPairs(node.envVars),
    description: node.description ?? '',
    supported_platforms: platformsToIds(node.supportedPlatforms),
    category: node.tags?.[0]?.key ?? '',
    tag_ids: node.tags?.map(t => t.id) ?? [],
  };
}

import type { ScriptArgument } from '@flamingo-stack/openframe-frontend-core';

export function parseKeyValues(arr: string[] | undefined, separator = '='): ScriptArgument[] {
  if (!arr || arr.length === 0) return [];
  return arr.map((item, index) => {
    const idx = item.indexOf(separator);
    if (idx === -1) return { id: `arg-${index}`, key: item, value: '' };
    return { id: `arg-${index}`, key: item.substring(0, idx), value: item.substring(idx + 1) };
  });
}

export function serializeKeyValues(pairs: ScriptArgument[], separator = '='): string[] {
  return pairs.filter(p => p.key.trim() !== '').map(p => (p.value ? `${p.key}${separator}${p.value}` : p.key));
}

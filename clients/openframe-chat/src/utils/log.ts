import { invoke } from '@tauri-apps/api/core';

type Level = 'info' | 'warn' | 'error' | 'debug';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

function send(level: Level, scope: string, message: string): void {
  if (!isTauri) return;
  void invoke('log_from_js', { level, scope, message }).catch(() => {});
}

function fmt(meta: unknown[]): string {
  if (meta.length === 0) return '';
  try {
    return ' ' + meta.map(m => (typeof m === 'string' ? m : JSON.stringify(m))).join(' ');
  } catch {
    return ' [unserializable]';
  }
}

export const log = {
  info: (scope: string, msg: string, ...meta: unknown[]) => send('info', scope, msg + fmt(meta)),
  warn: (scope: string, msg: string, ...meta: unknown[]) => send('warn', scope, msg + fmt(meta)),
  error: (scope: string, msg: string, ...meta: unknown[]) => send('error', scope, msg + fmt(meta)),
  debug: (scope: string, msg: string, ...meta: unknown[]) => send('debug', scope, msg + fmt(meta)),
};

export function maskToken(token: string): string {
  if (token.length <= 8) return '****';
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

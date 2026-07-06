// Keyboard mapping + wire encoding for the MeshCentral KVM desktop protocol.
// MNG_KVM_KEY (cmd 1) wire actions: 0=down, 1=up, 3=extended-up, 4=extended-down.
// macOS/Linux agents remap 4→down and treat any non-zero action as a release, so the
// extended flag is a Windows-only injection hint (KEYEVENTF_EXTENDEDKEY) and safe everywhere.

export const IS_MAC_BROWSER =
  typeof navigator !== 'undefined' && /mac/i.test(navigator.platform || navigator.userAgent);

const CODE_TO_VK: Record<string, number> = {
  ShiftLeft: 0x10,
  ShiftRight: 0x10,
  ControlLeft: 0x11,
  ControlRight: 0x11,
  AltLeft: 0x12,
  AltRight: 0x12,
  MetaLeft: 0x5b,
  MetaRight: 0x5c,

  Backspace: 0x08,
  Tab: 0x09,
  Enter: 0x0d,
  NumpadEnter: 0x0d,
  Pause: 0x13,
  CapsLock: 0x14,
  Escape: 0x1b,
  Space: 0x20,

  PageUp: 0x21,
  PageDown: 0x22,
  End: 0x23,
  Home: 0x24,
  ArrowLeft: 0x25,
  ArrowUp: 0x26,
  ArrowRight: 0x27,
  ArrowDown: 0x28,
  PrintScreen: 0x2c,
  Insert: 0x2d,
  Delete: 0x2e,

  ContextMenu: 0x5d,

  NumpadMultiply: 0x6a,
  NumpadAdd: 0x6b,
  NumpadSubtract: 0x6d,
  NumpadDecimal: 0x6e,
  NumpadDivide: 0x6f,
  NumLock: 0x90,
  ScrollLock: 0x91,

  Semicolon: 0xba,
  Equal: 0xbb,
  Comma: 0xbc,
  Minus: 0xbd,
  Period: 0xbe,
  Slash: 0xbf,
  Backquote: 0xc0,
  BracketLeft: 0xdb,
  Backslash: 0xdc,
  BracketRight: 0xdd,
  Quote: 0xde,
};

const KEY_TO_VK: Record<string, number> = {
  Shift: 0x10,
  Control: 0x11,
  Alt: 0x12,
  Meta: 0x5b,
  ' ': 0x20,
  Backspace: 0x08,
  Tab: 0x09,
  Enter: 0x0d,
  Escape: 0x1b,
  Esc: 0x1b,
  Delete: 0x2e,
  Insert: 0x2d,
  Home: 0x24,
  End: 0x23,
  PageUp: 0x21,
  PageDown: 0x22,
  ArrowLeft: 0x25,
  ArrowUp: 0x26,
  ArrowRight: 0x27,
  ArrowDown: 0x28,
  CapsLock: 0x14,
  NumLock: 0x90,
  ScrollLock: 0x91,
};

export function keyboardEventToVk(e: KeyboardEvent): number | null {
  const code = e.code ?? '';
  // Letters/digits map by produced character (layout-aware), so Ctrl/Cmd shortcuts follow
  // the key label rather than the physical position — e.g. Ctrl+A on AZERTY must send
  // VK 'A', not the VK of the QWERTY key at that position. Matches the reference client's
  // default (event.keyCode) behavior without the deprecated API.
  if (typeof e.key === 'string' && e.key.length === 1 && !code.startsWith('Numpad')) {
    const ch = e.key.toUpperCase();
    if ((ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9')) return ch.charCodeAt(0);
  }
  if (code.startsWith('Key') && code.length === 4) return code.charCodeAt(3);
  if (code.startsWith('Digit') && code.length === 6) return code.charCodeAt(5);
  const fn = /^F([1-9]|1[0-9]|2[0-4])$/.exec(code);
  if (fn) return 111 + parseInt(fn[1], 10);
  if (code.startsWith('Numpad') && code.length === 7) {
    const digit = code.charCodeAt(6);
    if (digit >= 48 && digit <= 57) return digit + 48; // VK_NUMPAD0..9 = 0x60..0x69
  }
  if (CODE_TO_VK[code] != null) return CODE_TO_VK[code];
  if (typeof e.key === 'string' && KEY_TO_VK[e.key] != null) return KEY_TO_VK[e.key];
  // Legacy fallback covers codes absent above (e.g. IntlBackslash → 226 = VK_OEM_102).
  const legacy = (e as unknown as { keyCode?: number }).keyCode;
  return typeof legacy === 'number' && legacy > 0 ? legacy : null;
}

// Reference client's extended set: Arrow* plus this table (agent-desktop-0.0.2.js).
const EXTENDED_CODES = new Set([
  'ShiftRight',
  'AltRight',
  'ControlRight',
  'Home',
  'End',
  'Insert',
  'Delete',
  'PageUp',
  'PageDown',
  'NumpadDivide',
  'NumpadEnter',
  'NumLock',
  'Pause',
]);

export function isExtendedKey(e: KeyboardEvent): boolean {
  const code = e.code ?? '';
  return code.startsWith('Arrow') || EXTENDED_CODES.has(code);
}

export function isAltGraphPressed(e: KeyboardEvent): boolean {
  return typeof e.getModifierState === 'function' && e.getModifierState('AltGraph');
}

// MNG_KVM_KEY (cmd 1), 6 bytes: [0..1]=cmd BE, [2..3]=size BE, [4]=action, [5]=vk
export function encodeKeyEvent(action: 1 | 2, vk: number, extended: boolean): Uint8Array {
  let wireAction = action - 1; // 0=down, 1=up
  if (extended) wireAction = wireAction === 1 ? 3 : 4; // 3=extended-up, 4=extended-down

  const buf = new Uint8Array(6);
  buf[0] = 0x00;
  buf[1] = 0x01;
  buf[2] = 0x00;
  buf[3] = 0x06;
  buf[4] = wireAction & 0xff;
  buf[5] = vk & 0xff;
  return buf;
}

// MNG_KVM_KEY_UNICODE (cmd 85), 7 bytes: [4]=action (0=down, 1=up), [5..6]=codepoint BE.
// Windows injects via KEYEVENTF_UNICODE; macOS/Linux type on the down action only.
export function encodeUnicodeKey(action: 1 | 2, codepoint: number): Uint8Array {
  const buf = new Uint8Array(7);
  buf[0] = 0x00;
  buf[1] = 0x55;
  buf[2] = 0x00;
  buf[3] = 0x07;
  buf[4] = (action - 1) & 0xff;
  buf[5] = (codepoint >> 8) & 0xff;
  buf[6] = codepoint & 0xff;
  return buf;
}

const COMBO_TOKEN_VKS: Record<string, { vk: number; extended?: boolean }> = {
  ctrl: { vk: 0x11 },
  shift: { vk: 0x10 },
  alt: { vk: 0x12 },
  win: { vk: 0x5b, extended: true },
  meta: { vk: 0x5b, extended: true },
  esc: { vk: 0x1b },
  tab: { vk: 0x09 },
  enter: { vk: 0x0d },
  space: { vk: 0x20 },
  del: { vk: 0x2e, extended: true },
  delete: { vk: 0x2e, extended: true },
  up: { vk: 0x26, extended: true },
  down: { vk: 0x28, extended: true },
  left: { vk: 0x25, extended: true },
  right: { vk: 0x27, extended: true },
};

export interface ComboKeyEvent {
  action: 1 | 2;
  vk: number;
  extended: boolean;
}

// 'ctrl+shift+esc' → presses in order, releases in reverse order.
export function comboToSequence(combo: string): ComboKeyEvent[] | null {
  const tokens = combo
    .toLowerCase()
    .split('+')
    .map(t => t.trim())
    .filter(Boolean);
  if (tokens.length === 0) return null;

  const keys: Array<{ vk: number; extended: boolean }> = [];
  for (const token of tokens) {
    const mapped = COMBO_TOKEN_VKS[token];
    if (mapped) {
      keys.push({ vk: mapped.vk, extended: mapped.extended === true });
      continue;
    }
    if (/^[a-z0-9]$/.test(token)) {
      keys.push({ vk: token.toUpperCase().charCodeAt(0), extended: false });
      continue;
    }
    const fn = /^f([1-9]|1[0-9]|2[0-4])$/.exec(token);
    if (fn) {
      keys.push({ vk: 111 + parseInt(fn[1], 10), extended: false });
      continue;
    }
    return null;
  }

  return [
    ...keys.map(k => ({ action: 1 as const, vk: k.vk, extended: k.extended })),
    ...[...keys].reverse().map(k => ({ action: 2 as const, vk: k.vk, extended: k.extended })),
  ];
}

export interface AccentShades {
  /** The accent color itself - used for `base`/primary/focus states. */
  base: string;
  /** Hover state - base darkened by one step. */
  hover: string;
  /** Active/pressed state - base darkened by two steps. */
  active: string;
}

// ODS derives interaction shades by subtracting a fixed amount from every RGB
// channel: hover = base - 10, action = base - 20 (clamped to [0, 255]). This is
// the exact convention used by the dark-theme primitives (flamingo pink, cyan,
// green, red, warning - all step by 10/channel; open-yellow only differs where
// a channel clamps at 0). We mirror it so a configured accent gets matching
// hover/active shades instead of a flat single color.
const HOVER_STEP = 10;
const ACTIVE_STEP = 20;

/**
 * Derives ODS-style hover/active shades from an accent base color.
 * Falls back to the input for every state when the color can't be parsed,
 * so callers never break on an unexpected value.
 */
export function deriveAccentShades(color: string): AccentShades {
  const rgb = parseHexColor(color);
  if (!rgb) {
    return { base: color, hover: color, active: color };
  }
  return {
    base: toHexColor(rgb),
    hover: toHexColor(darken(rgb, HOVER_STEP)),
    active: toHexColor(darken(rgb, ACTIVE_STEP)),
  };
}

type Rgb = [number, number, number];

function parseHexColor(color: string): Rgb | null {
  const hex = color.trim().replace(/^#/, '');

  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    return [parseInt(hex[0] + hex[0], 16), parseInt(hex[1] + hex[1], 16), parseInt(hex[2] + hex[2], 16)];
  }

  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
  }

  return null;
}

function darken([r, g, b]: Rgb, step: number): Rgb {
  const clamp = (channel: number) => Math.max(0, Math.min(255, channel - step));
  return [clamp(r), clamp(g), clamp(b)];
}

function toHexColor([r, g, b]: Rgb): string {
  const channel = (value: number) => value.toString(16).padStart(2, '0');
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

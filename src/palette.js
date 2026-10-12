/**
 * Publication palette: the shared "follow and shift" algorithm.
 *
 * An author picks up to three colours (Accent, Background, Text), each as an
 * explicit light and dark pair. A theme declares, in an optional `palette`
 * block of its theme.json, which of those three seeds each colour inside
 * each of 40 palette-drivable tokens follows. This module derives the final
 * value of every token from the theme and the author's picks, and checks the
 * result against the contrast pairs. The template (at render), theme-tooling
 * (at theme release) and the App (while picking) all import it, so the three
 * can never disagree.
 *
 * Pure browser-safe ESM: no Node built-ins, no I/O, no dependencies. All
 * colour arithmetic is in OKLab/OKLCH with the standard sRGB transfer
 * function; every result is rounded to 8 bits and written as lowercase hex.
 *
 * The 40 drivable keys, their value types and the per-type colour counts live
 * here and nowhere else; the JSON Schema generators and the semantic
 * validator import them from this module.
 *
 * @module
 */

/** The `palette.profile` value a theme must carry. */
export const PALETTE_PROFILE = 'gala-palette-follow-v1';

/** The three roles an author may pick, in canonical order. */
export const PALETTE_ROLES = /** @type {readonly PaletteRole[]} */ (
  Object.freeze(['accent', 'canvas', 'text'])
);

/** The two colour modes, in canonical order. */
export const PALETTE_MODES = /** @type {readonly PaletteMode[]} */ (
  Object.freeze(['light', 'dark'])
);

/** The seed token each role is read from, and the token that carries it. */
export const PALETTE_SEED_KEYS = Object.freeze({
  accent: 'color-accent',
  canvas: 'color-canvas',
  text: 'color-text',
});

/**
 * Every palette-drivable token key and its value type, in theme catalog
 * order. A theme binds any subset; every other key is always theme-owned.
 *
 * @type {Readonly<Record<string, 'color' | 'paint' | 'border' | 'shadow'>>}
 */
export const PALETTE_KEY_TYPES = Object.freeze({
  'border-button': 'border',
  'border-card': 'border',
  'border-chip': 'border',
  'border-media-divider': 'border',
  'border-quote': 'border',
  'border-row-divider': 'border',
  'border-section-rule': 'border',
  'color-accent': 'color',
  'color-accent-2': 'color',
  'color-border': 'color',
  'color-btn-panel': 'color',
  'color-btn-panel-text': 'color',
  'color-btn-text': 'color',
  'color-canvas': 'color',
  'color-chip-text': 'color',
  'color-focus': 'color',
  'color-footer': 'color',
  'color-header': 'color',
  'color-icon-accent': 'color',
  'color-link': 'color',
  'color-link-underline': 'color',
  'color-link-underline-hover': 'color',
  'color-link-visited': 'color',
  'color-on-accent': 'color',
  'color-panel-muted': 'color',
  'color-panel-text': 'color',
  'color-selection': 'color',
  'color-surface': 'color',
  'color-surface-raised': 'color',
  'color-text': 'color',
  'color-text-faint': 'color',
  'color-text-muted': 'color',
  'color-toc-active': 'color',
  'color-toc-active-text': 'color',
  'paint-button': 'paint',
  'paint-chip': 'paint',
  'paint-page-decor': 'paint',
  'paint-panel': 'paint',
  'shadow-avatar-ring': 'shadow',
  'shadow-button': 'shadow',
});

/** The 40 palette-drivable token keys, in theme catalog order. */
export const PALETTE_DRIVABLE_KEYS = Object.freeze(
  Object.keys(PALETTE_KEY_TYPES),
);

/**
 * The most colours one value of each drivable type can hold under the token
 * grammar: one colour, one border colour, three shadow layers, and three
 * gradients of five stops. A value's exact count is `paletteColourCount`.
 */
export const PALETTE_MAX_COLOURS_BY_TYPE = Object.freeze({
  color: 1,
  border: 1,
  shadow: 3,
  paint: 15,
});

/**
 * The contrast pairs every palette must clear on its final values, per
 * mode: the 17 theme-tooling pairs plus the focus ring and the three status
 * colours on the canvas. A pair flagged `skipWhenNotPlainColor` is skipped
 * (never silently passed) when its background is `none`, translucent,
 * transparent or an unreadable gradient.
 */
export const PALETTE_PAIRS = Object.freeze(
  [
    ['color-text', 'color-canvas', 4.5],
    ['color-text', 'color-surface', 4.5],
    ['color-text-muted', 'color-canvas', 4.5],
    ['color-text-muted', 'color-surface', 4.5],
    ['color-link', 'color-canvas', 4.5],
    ['color-chip-text', 'paint-chip', 4.5, true],
    ['color-btn-text', 'paint-button', 4.5, true],
    ['color-btn-panel-text', 'color-btn-panel', 4.5],
    ['color-panel-text', 'paint-panel', 4.5, true],
    ['color-code-text', 'color-code-canvas', 4.5],
    ['color-syntax-comment', 'color-code-canvas', 4.5],
    ['color-syntax-function', 'color-code-canvas', 4.5],
    ['color-syntax-keyword', 'color-code-canvas', 4.5],
    ['color-syntax-number', 'color-code-canvas', 4.5],
    ['color-syntax-string', 'color-code-canvas', 4.5],
    ['color-on-accent', 'color-accent', 4.5],
    ['color-toc-active-text', 'color-toc-active', 4.5, true],
    ['color-focus', 'color-canvas', 3],
    ['color-danger', 'color-canvas', 4.5],
    ['color-success', 'color-canvas', 4.5],
    ['color-warning', 'color-canvas', 4.5],
  ].map(([foreground, background, minimum, skip]) =>
    Object.freeze({
      label: `${foreground} on ${background}`,
      foreground: /** @type {string} */ (foreground),
      background: /** @type {string} */ (background),
      minimum: /** @type {number} */ (minimum),
      skipWhenNotPlainColor: skip === true,
    }),
  ),
);

/** Limits of the Background role (OKLab lightness). */
export const PALETTE_CANVAS_BAND = Object.freeze({
  lightMin: 0.9,
  darkMax: 0.3,
});

/** The margin above a pair's minimum that the readability clamp aims for. */
export const PALETTE_CLAMP_MARGIN = 0.1;

/** Chroma below which a seed counts as neutral (no usable hue). */
const NEUTRAL_CHROMA = 0.02;

const HEX_COLOUR = /#[0-9a-f]{6}(?:[0-9a-f]{2})?/gu;
const PICK_HEX = /^#[0-9a-f]{6}$/u;

/**
 * @typedef {'accent' | 'canvas' | 'text'} PaletteRole
 * @typedef {'light' | 'dark'} PaletteMode
 * @typedef {{ light: string, dark: string }} PalettePair
 * @typedef {Partial<Record<PaletteRole, PalettePair>>} PaletteTokens
 * @typedef {{ key: string, type: string, light: string, dark: string }} PaletteThemeToken
 * @typedef {{
 *   key: string,
 *   light: (PaletteRole | null)[],
 *   dark: (PaletteRole | null)[],
 * }} PaletteFollow
 * @typedef {{ profile: string, follow: PaletteFollow[] }} ThemePalette
 * @typedef {{ palette?: ThemePalette, tokens: PaletteThemeToken[] }} PaletteTheme
 * @typedef {{
 *   key: string,
 *   mode: PaletteMode,
 *   from: string,
 *   to: string,
 *   pair: string,
 * }} PaletteAdjustment
 * @typedef {{
 *   profile: string,
 *   seeds: Record<PaletteMode, Record<PaletteRole, string>>,
 *   bound: string[],
 *   tokens: Record<string, PalettePair>,
 *   adjusted: PaletteAdjustment[],
 * }} DerivedPalette
 * @typedef {{
 *   label: string,
 *   foreground: string,
 *   background: string,
 *   minimum: number,
 *   status: 'pass' | 'fail' | 'skipped',
 *   ratio: number | null,
 *   reason?: string,
 *   worstStop?: string,
 * }} PairResult
 * @typedef {{
 *   code: 'APPEARANCE_PALETTE_CONTRAST',
 *   pair: string,
 *   mode: PaletteMode,
 *   ratio: number | null,
 *   minimum: number,
 *   foregroundKey: string,
 *   backgroundKey: string,
 *   reason?: string,
 * }} PaletteFailure
 * @typedef {{
 *   mode: PaletteMode,
 *   ok: boolean,
 *   results: PairResult[],
 *   failures: PaletteFailure[],
 * }} PaletteCheck
 * @typedef {{
 *   code: 'APPEARANCE_PALETTE_BAND' | 'APPEARANCE_PALETTE_TEXT_CONTRAST',
 *   mode: PaletteMode,
 *   role: PaletteRole,
 *   value: number,
 *   limit: number,
 * }} PickedFailure
 */

/**
 * Error raised for a malformed theme palette block or malformed picked
 * colours. `code` is one of `THEME_PALETTE_MISSING`, `THEME_PALETTE_INVALID`
 * or `APPEARANCE_PALETTE_INVALID`.
 */
export class PaletteError extends Error {
  /**
   * @param {string} code stable machine-readable code
   * @param {string} detail human-readable detail
   */
  constructor(code, detail) {
    super(`${code}: ${detail}`);
    this.name = 'PaletteError';
    /** @type {string} */
    this.code = code;
    /** @type {string} */
    this.detail = detail;
  }
}

/**
 * The number of colour literals (`#rrggbb` or `#rrggbbaa`) in a token
 * value. `transparent` and `none` are not colours. A theme's `follow` list
 * for that value, in that mode, has exactly this length.
 *
 * @param {string} value token value
 * @returns {number} colour count
 */
export function paletteColourCount(value) {
  return (value.match(HEX_COLOUR) ?? []).length;
}

/* ---------------------------------------------------------------------- */
/* Colour arithmetic                                                       */
/* ---------------------------------------------------------------------- */

/**
 * @param {string} hex `#rrggbb` or `#rrggbbaa`
 * @returns {[number, number, number]} 8-bit channels
 */
function channelsOf(hex) {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

/**
 * @param {number} c sRGB channel in [0, 1]
 * @returns {number} linear light
 */
function toLinear(c) {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/**
 * @param {number} x linear light
 * @returns {number} sRGB channel
 */
function fromLinear(x) {
  return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
}

/**
 * @param {string} hex `#rrggbb[aa]`
 * @returns {{ L: number, C: number, h: number }} OKLCH, hue in degrees
 */
function toOklch(hex) {
  const [r8, g8, b8] = channelsOf(hex);
  const r = toLinear(r8 / 255);
  const g = toLinear(g8 / 255);
  const b = toLinear(b8 / 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.hypot(a, bb);
  const h = ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360;
  return { L, C, h };
}

/**
 * @param {number} L OKLab lightness
 * @param {number} C chroma
 * @param {number} h hue in degrees
 * @returns {[number, number, number]} linear sRGB (may be out of gamut)
 */
function oklchToLinear(L, C, h) {
  const a = C * Math.cos((h * Math.PI) / 180);
  const b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/**
 * @param {[number, number, number]} linear linear sRGB
 * @returns {boolean} whether every channel is inside the sRGB gamut
 */
function inGamut(linear) {
  return linear.every((x) => x >= -1e-6 && x <= 1 + 1e-6);
}

/**
 * @param {number} value channel in [0, 1]
 * @returns {string} two lowercase hex digits
 */
function byteHex(value) {
  const byte = Math.min(255, Math.max(0, Math.round(value * 255)));
  return byte.toString(16).padStart(2, '0');
}

/**
 * Convert OKLCH to `#rrggbb`, reducing chroma until the colour is inside the
 * sRGB gamut, then rounding to 8 bits.
 *
 * @param {number} L OKLab lightness
 * @param {number} C chroma
 * @param {number} h hue in degrees
 * @returns {string} lowercase `#rrggbb`
 */
function fromOklch(L, C, h) {
  const lightness = Math.min(1, Math.max(0, L));
  let chroma = Math.max(0, C);
  if (!inGamut(oklchToLinear(lightness, chroma, h))) {
    let low = 0;
    let high = chroma;
    for (let step = 0; step < 32; step += 1) {
      const middle = (low + high) / 2;
      if (inGamut(oklchToLinear(lightness, middle, h))) low = middle;
      else high = middle;
    }
    chroma = low;
  }
  const [r, g, b] = oklchToLinear(lightness, chroma, h);
  return `#${byteHex(fromLinear(Math.max(0, r)))}${byteHex(fromLinear(Math.max(0, g)))}${byteHex(fromLinear(Math.max(0, b)))}`;
}

/**
 * WCAG relative luminance of an 8-bit `#rrggbb` colour.
 *
 * @param {string} hex colour
 * @returns {number} luminance in [0, 1]
 */
function luminance(hex) {
  const [r8, g8, b8] = channelsOf(hex);
  const channel = (/** @type {number} */ c8) => {
    const c = c8 / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r8) + 0.7152 * channel(g8) + 0.0722 * channel(b8);
}

/**
 * @param {string} a `#rrggbb`
 * @param {string} b `#rrggbb`
 * @returns {number} WCAG contrast ratio, at least 1
 */
function contrastRatio(a, b) {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/**
 * Piecewise-linear lightness map fixing 0 and 1 and sending `from` to `to`.
 *
 * @param {number} lightness lightness to map
 * @param {number} from theme seed lightness
 * @param {number} to author seed lightness
 * @returns {number} mapped lightness
 */
function mapLightness(lightness, from, to) {
  if (from <= 1e-9) return to + lightness * (1 - to);
  if (from >= 1 - 1e-9) return (lightness * to) / from;
  return lightness <= from
    ? (lightness * to) / from
    : to + ((lightness - from) * (1 - to)) / (1 - from);
}

/**
 * Move one colour by the perceptual change that turns the theme's seed into
 * the author's seed, keeping the colour's alpha.
 *
 * @param {string} colour `#rrggbb[aa]` literal from the theme
 * @param {string} themeSeed the theme's own seed (`#rrggbb[aa]`)
 * @param {string} authorSeed the author's seed (`#rrggbb`)
 * @returns {string} shifted `#rrggbb[aa]`
 */
function shiftColour(colour, themeSeed, authorSeed) {
  if (colour.slice(0, 7) === themeSeed.slice(0, 7)) {
    return authorSeed.slice(0, 7) + colour.slice(7);
  }
  const from = toOklch(themeSeed);
  const to = toOklch(authorSeed);
  const source = toOklch(colour);
  const neutral = from.C < NEUTRAL_CHROMA;
  const hue = neutral ? to.h : (source.h + (to.h - from.h) + 720) % 360;
  const chroma = neutral ? to.C : source.C * (to.C / from.C);
  const lightness = mapLightness(source.L, from.L, to.L);
  return fromOklch(lightness, chroma, hue) + colour.slice(7);
}

/**
 * Replace the colours of one token value, one role entry per colour.
 *
 * @param {string} value the theme's literal value
 * @param {(PaletteRole | null)[]} follow one entry per colour
 * @param {Record<PaletteRole, string>} themeSeeds the theme's seeds
 * @param {Record<PaletteRole, string>} seeds the effective seeds
 * @returns {string} the derived value
 */
function deriveValue(value, follow, themeSeeds, seeds) {
  let index = 0;
  return value.replace(HEX_COLOUR, (colour) => {
    const role = follow[index];
    index += 1;
    if (role === null || role === undefined) return colour;
    const themeSeed = themeSeeds[role];
    const seed = seeds[role];
    if (themeSeed === seed) return colour;
    return shiftColour(colour, themeSeed, seed);
  });
}

/* ---------------------------------------------------------------------- */
/* Validation                                                              */
/* ---------------------------------------------------------------------- */

/**
 * @param {unknown} value candidate
 * @returns {value is PaletteRole} whether it names a palette role
 */
function isRole(value) {
  return (
    typeof value === 'string' && PALETTE_ROLES.some((role) => role === value)
  );
}

/**
 * @param {unknown} value candidate
 * @returns {value is Record<string, unknown>} whether it is a plain object
 */
function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Validate a theme's `palette` block against its own tokens: the profile,
 * that every key is palette-drivable and appears at most once, that each
 * list length equals the number of colours in the value of that mode, and
 * that every entry is `accent`, `canvas`, `text` or `null`.
 *
 * @param {PaletteTheme} theme theme.json
 * @returns {ThemePalette} the validated block
 * @throws {PaletteError} `THEME_PALETTE_MISSING` or `THEME_PALETTE_INVALID`
 */
export function validateThemePalette(theme) {
  const palette = /** @type {unknown} */ (theme.palette);
  if (palette === undefined) {
    throw new PaletteError('THEME_PALETTE_MISSING', 'theme has no palette');
  }
  const invalid = (/** @type {string} */ detail) =>
    new PaletteError('THEME_PALETTE_INVALID', detail);
  if (!isRecord(palette) || !Array.isArray(palette.follow)) {
    throw invalid('palette must be {profile, follow[]}');
  }
  if (
    Object.keys(palette).length !== 2 ||
    palette.profile !== PALETTE_PROFILE
  ) {
    throw invalid(`palette.profile must be ${PALETTE_PROFILE}`);
  }
  const seen = new Set();
  for (const entry of /** @type {unknown[]} */ (palette.follow)) {
    if (!isRecord(entry) || Object.keys(entry).length !== 3) {
      throw invalid('follow entry must be {key, light, dark}');
    }
    const key = entry.key;
    if (
      typeof key !== 'string' ||
      !Object.hasOwn(PALETTE_KEY_TYPES, key) ||
      seen.has(key)
    ) {
      throw invalid(`follow key ${String(key)} is not drivable or repeated`);
    }
    seen.add(key);
    const token = theme.tokens.find((row) => row.key === key);
    if (!token) throw invalid(`theme has no token ${key}`);
    for (const mode of PALETTE_MODES) {
      const list = entry[mode];
      if (
        !Array.isArray(list) ||
        list.length !== paletteColourCount(token[mode]) ||
        !list.every((role) => role === null || isRole(role))
      ) {
        throw invalid(`${key} ${mode} follow list does not match its value`);
      }
    }
  }
  return /** @type {ThemePalette} */ (palette);
}

/**
 * Validate the author's picked colours (`appearance.tokens`).
 *
 * @param {unknown} tokens candidate
 * @returns {PaletteTokens} the same value, typed
 * @throws {PaletteError} `APPEARANCE_PALETTE_INVALID`
 */
export function validatePaletteTokens(tokens) {
  const invalid = (/** @type {string} */ detail) =>
    new PaletteError('APPEARANCE_PALETTE_INVALID', detail);
  if (!isRecord(tokens)) throw invalid('tokens must be an object');
  for (const [role, pair] of Object.entries(tokens)) {
    if (!isRole(role)) throw invalid(`unknown role ${role}`);
    if (
      !isRecord(pair) ||
      Object.keys(pair).length !== 2 ||
      typeof pair.light !== 'string' ||
      typeof pair.dark !== 'string' ||
      !PICK_HEX.test(pair.light) ||
      !PICK_HEX.test(pair.dark)
    ) {
      throw invalid(`${role} must be {light, dark} lowercase #rrggbb`);
    }
  }
  return /** @type {PaletteTokens} */ (tokens);
}

/* ---------------------------------------------------------------------- */
/* Pair evaluation                                                         */
/* ---------------------------------------------------------------------- */

/**
 * @param {string} value token value
 * @returns {string | undefined} why it is not a plain opaque colour
 */
function whyNotPlain(value) {
  if (/^#[0-9a-f]{6}(?:ff)?$/u.test(value)) return undefined;
  if (/^#[0-9a-f]{6}00$/u.test(value)) return 'fully transparent';
  if (/^#[0-9a-f]{8}$/u.test(value)) return 'translucent';
  if (value === 'none') return 'none';
  return 'a gradient';
}

/**
 * Evaluate one pair on final values.
 *
 * @param {{ label: string, minimum: number, skipWhenNotPlainColor: boolean }} pair the pair
 * @param {string} foreground foreground token value
 * @param {string} background background token value
 * @returns {Omit<PairResult, 'label' | 'foreground' | 'background' | 'minimum'>} outcome
 */
function evaluatePair(pair, foreground, background) {
  let unmeasurable = whyNotPlain(background) ?? whyNotPlain(foreground);
  if (unmeasurable === 'a gradient' && whyNotPlain(foreground) === undefined) {
    const stops = background.match(HEX_COLOUR) ?? [];
    const readable =
      /^(?:repeating-)?(?:linear|radial)-gradient\(/u.test(background) &&
      !background.includes('transparent') &&
      stops.length >= 2 &&
      stops.every((stop) => stop.length === 7 || stop.endsWith('ff'));
    if (readable) {
      const fg = foreground.slice(0, 7);
      let worst = { ratio: Number.POSITIVE_INFINITY, stop: '' };
      for (const stop of stops) {
        const ratio = contrastRatio(fg, stop.slice(0, 7));
        if (ratio < worst.ratio) worst = { ratio, stop: stop.slice(0, 7) };
      }
      return {
        status: worst.ratio >= pair.minimum ? 'pass' : 'fail',
        ratio: worst.ratio,
        worstStop: worst.stop,
      };
    }
    unmeasurable = 'an unreadable gradient';
  }
  if (unmeasurable !== undefined) {
    return pair.skipWhenNotPlainColor
      ? { status: 'skipped', ratio: null, reason: unmeasurable }
      : { status: 'fail', ratio: null, reason: unmeasurable };
  }
  const ratio = contrastRatio(foreground.slice(0, 7), background.slice(0, 7));
  return { status: ratio >= pair.minimum ? 'pass' : 'fail', ratio };
}

/* ---------------------------------------------------------------------- */
/* Derivation                                                              */
/* ---------------------------------------------------------------------- */

/**
 * Move a bound foreground's lightness by the smallest step that lifts every
 * one of its pairs to the minimum plus the clamp margin. Hue and chroma are
 * kept. Returns the original value when no lightness can reach the target.
 *
 * @param {string} colour `#rrggbb` foreground
 * @param {string[]} backgrounds the opaque backgrounds (plain or stop) it sits on
 * @param {number} target ratio to reach against every background
 * @returns {string} the adjusted colour, or `colour` itself
 */
function clampForeground(colour, backgrounds, target) {
  const start = toOklch(colour);
  const meanLuminance =
    backgrounds.reduce((sum, bg) => sum + luminance(bg), 0) /
    backgrounds.length;
  const preferred = luminance(colour) >= meanLuminance ? 1 : -1;
  const passes = (/** @type {string} */ candidate) =>
    backgrounds.every((bg) => contrastRatio(candidate, bg) >= target);
  for (let step = 1; step <= 400; step += 1) {
    for (const direction of [preferred, -preferred]) {
      const lightness = start.L + direction * step * 0.0025;
      if (lightness < 0 || lightness > 1) continue;
      const candidate = fromOklch(lightness, start.C, start.h);
      if (passes(candidate)) return candidate;
    }
  }
  return colour;
}

/**
 * Derive every token's final value from a theme and the author's picks.
 *
 * Each colour bound to a seed whose effective value differs from the theme's
 * own is moved in OKLCH (hue rotated by the hue difference, chroma scaled by
 * the chroma ratio or set to the author's when the theme's seed is neutral,
 * lightness through a piecewise-linear map), gamut-mapped by reducing chroma
 * and rounded to 8 bits. A seed unchanged keeps the theme's literal exactly,
 * and a colour equal to the theme's seed becomes the author's seed exactly.
 * Where a contrast pair's foreground is bound (and not itself a seed), its
 * lightness is then moved by the smallest step reaching the minimum plus
 * 0.1; a failing pair with a theme-owned or seed foreground is not adjusted
 * and is reported by `checkPalette`.
 *
 * @param {PaletteTheme} theme theme.json (needs `tokens` and `palette`)
 * @param {PaletteTokens} tokens the author's `appearance.tokens` (`{}` = theme colours)
 * @returns {DerivedPalette} the derived palette
 * @throws {PaletteError} on a malformed theme palette or malformed picks
 */
export function derivePalette(theme, tokens) {
  const palette = validateThemePalette(theme);
  const picks = validatePaletteTokens(tokens);
  const themeSeeds =
    /** @type {Record<PaletteMode, Record<PaletteRole, string>>} */ ({
      light: {},
      dark: {},
    });
  for (const role of /** @type {PaletteRole[]} */ (PALETTE_ROLES)) {
    const seedToken = theme.tokens.find(
      (row) => row.key === PALETTE_SEED_KEYS[role],
    );
    if (!seedToken) {
      throw new PaletteError(
        'THEME_PALETTE_INVALID',
        `theme has no ${PALETTE_SEED_KEYS[role]}`,
      );
    }
    themeSeeds.light[role] = seedToken.light;
    themeSeeds.dark[role] = seedToken.dark;
  }
  const seeds =
    /** @type {Record<PaletteMode, Record<PaletteRole, string>>} */ ({
      light: { ...themeSeeds.light },
      dark: { ...themeSeeds.dark },
    });
  for (const role of /** @type {PaletteRole[]} */ (PALETTE_ROLES)) {
    const pick = picks[role];
    if (pick) {
      seeds.light[role] = pick.light;
      seeds.dark[role] = pick.dark;
    }
  }

  /** @type {Record<string, PalettePair>} */
  const values = {};
  for (const row of theme.tokens)
    values[row.key] = { light: row.light, dark: row.dark };
  const bound = [];
  for (const entry of palette.follow) {
    bound.push(entry.key);
    const row = theme.tokens.find((token) => token.key === entry.key);
    if (!row) continue;
    values[entry.key] = {
      light: deriveValue(row.light, entry.light, themeSeeds.light, seeds.light),
      dark: deriveValue(row.dark, entry.dark, themeSeeds.dark, seeds.dark),
    };
  }

  /** @type {PaletteAdjustment[]} */
  const adjusted = [];
  /** @type {Set<string>} */
  const seedKeys = new Set(Object.values(PALETTE_SEED_KEYS));
  for (const mode of PALETTE_MODES) {
    const foregrounds = [
      ...new Set(PALETTE_PAIRS.map((pair) => pair.foreground)),
    ];
    for (const key of foregrounds) {
      if (!bound.includes(key) || seedKeys.has(key)) continue;
      const current = values[key]?.[mode];
      if (current === undefined || whyNotPlain(current) !== undefined) continue;
      const backgrounds = [];
      let failing = false;
      let failingPair = '';
      for (const pair of PALETTE_PAIRS.filter(
        (candidate) => candidate.foreground === key,
      )) {
        const background = values[pair.background]?.[mode];
        if (background === undefined) continue;
        const outcome = evaluatePair(pair, current, background);
        if (outcome.status === 'skipped' || outcome.ratio === null) continue;
        const stops =
          whyNotPlain(background) === 'a gradient'
            ? (background.match(HEX_COLOUR) ?? []).map((stop) =>
                stop.slice(0, 7),
              )
            : [background.slice(0, 7)];
        backgrounds.push(...stops);
        if (outcome.status === 'fail' && !failing) {
          failing = true;
          failingPair = pair.label;
        }
      }
      if (!failing) continue;
      const minimum = Math.max(
        ...PALETTE_PAIRS.filter((pair) => pair.foreground === key).map(
          (pair) => pair.minimum,
        ),
      );
      const next = clampForeground(
        current.slice(0, 7),
        backgrounds,
        minimum + PALETTE_CLAMP_MARGIN,
      );
      if (next !== current.slice(0, 7)) {
        const pairValue = /** @type {PalettePair} */ (values[key]);
        pairValue[mode] = next;
        adjusted.push({
          key,
          mode,
          from: current,
          to: next,
          pair: failingPair,
        });
      }
    }
  }

  return {
    profile: PALETTE_PROFILE,
    seeds,
    bound,
    tokens: values,
    adjusted,
  };
}

/**
 * Check every palette pair on the derived final values, in one mode.
 *
 * @param {DerivedPalette} derived result of `derivePalette`
 * @param {PaletteMode} mode `light` or `dark`
 * @returns {PaletteCheck} per-pair results and the failures (`APPEARANCE_PALETTE_CONTRAST`)
 */
export function checkPalette(derived, mode) {
  /** @type {PairResult[]} */
  const results = [];
  /** @type {PaletteFailure[]} */
  const failures = [];
  for (const pair of PALETTE_PAIRS) {
    const foreground = derived.tokens[pair.foreground]?.[mode];
    const background = derived.tokens[pair.background]?.[mode];
    const base = {
      label: pair.label,
      foreground: pair.foreground,
      background: pair.background,
      minimum: pair.minimum,
    };
    if (foreground === undefined || background === undefined) {
      const result = {
        ...base,
        status: /** @type {const} */ ('fail'),
        ratio: null,
        reason: 'token missing',
      };
      results.push(result);
    } else {
      results.push({ ...base, ...evaluatePair(pair, foreground, background) });
    }
  }
  for (const result of results) {
    if (result.status === 'fail') {
      failures.push({
        code: 'APPEARANCE_PALETTE_CONTRAST',
        pair: result.label,
        mode,
        ratio: result.ratio,
        minimum: result.minimum,
        foregroundKey: result.foreground,
        backgroundKey: result.background,
        ...(result.reason === undefined ? {} : { reason: result.reason }),
      });
    }
  }
  return { mode, ok: failures.length === 0, results, failures };
}

/**
 * Check the author's picks on their own, without a theme: Background
 * lightness inside the band (OKLab L at least 0.90 in light, at most 0.30 in
 * dark) and Text at least 4.5:1 on Background in each mode where both are
 * set. The author's colours are never adjusted.
 *
 * @param {PaletteTokens} tokens the author's `appearance.tokens`
 * @returns {{ ok: boolean, failures: PickedFailure[] }} outcome
 */
export function checkPickedColours(tokens) {
  const picks = validatePaletteTokens(tokens);
  /** @type {PickedFailure[]} */
  const failures = [];
  for (const mode of PALETTE_MODES) {
    const canvas = picks.canvas?.[mode];
    if (canvas !== undefined) {
      const lightness = toOklch(canvas).L;
      const limit =
        mode === 'light'
          ? PALETTE_CANVAS_BAND.lightMin
          : PALETTE_CANVAS_BAND.darkMax;
      if (mode === 'light' ? lightness < limit : lightness > limit) {
        failures.push({
          code: 'APPEARANCE_PALETTE_BAND',
          mode,
          role: 'canvas',
          value: lightness,
          limit,
        });
      }
    }
    const text = picks.text?.[mode];
    if (canvas !== undefined && text !== undefined) {
      const ratio = contrastRatio(text, canvas);
      if (ratio < 4.5) {
        failures.push({
          code: 'APPEARANCE_PALETTE_TEXT_CONTRAST',
          mode,
          role: 'text',
          value: ratio,
          limit: 4.5,
        });
      }
    }
  }
  return { ok: failures.length === 0, failures };
}

/**
 * Suggest the dark value for a light pick: the pick's hue and chroma at the
 * OKLab lightness of the theme's own dark seed for that role, gamut-mapped.
 *
 * @param {PaletteTheme} theme theme.json (needs `tokens`)
 * @param {PaletteRole} role the role being picked
 * @param {string} lightHex the author's light pick, lowercase `#rrggbb`
 * @returns {string} suggested dark `#rrggbb`
 * @throws {PaletteError} `APPEARANCE_PALETTE_INVALID` for a malformed pick or role
 */
export function suggestDarkSeed(theme, role, lightHex) {
  if (!isRole(role) || !PICK_HEX.test(lightHex)) {
    throw new PaletteError(
      'APPEARANCE_PALETTE_INVALID',
      'role or colour malformed',
    );
  }
  const seedToken = theme.tokens.find(
    (row) => row.key === PALETTE_SEED_KEYS[role],
  );
  if (!seedToken) {
    throw new PaletteError(
      'THEME_PALETTE_INVALID',
      `theme has no ${PALETTE_SEED_KEYS[role]}`,
    );
  }
  const pick = toOklch(lightHex);
  const target = toOklch(seedToken.dark);
  return fromOklch(target.L, pick.C, pick.h);
}

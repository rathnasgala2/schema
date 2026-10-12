/**
 * The number of colour literals (`#rrggbb` or `#rrggbbaa`) in a token
 * value. `transparent` and `none` are not colours. A theme's `follow` list
 * for that value, in that mode, has exactly this length.
 *
 * @param {string} value token value
 * @returns {number} colour count
 */
export function paletteColourCount(value: string): number;
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
export function validateThemePalette(theme: PaletteTheme): ThemePalette;
/**
 * Validate the author's picked colours (`appearance.tokens`).
 *
 * @param {unknown} tokens candidate
 * @returns {PaletteTokens} the same value, typed
 * @throws {PaletteError} `APPEARANCE_PALETTE_INVALID`
 */
export function validatePaletteTokens(tokens: unknown): PaletteTokens;
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
export function derivePalette(theme: PaletteTheme, tokens: PaletteTokens): DerivedPalette;
/**
 * Check every palette pair on the derived final values, in one mode.
 *
 * @param {DerivedPalette} derived result of `derivePalette`
 * @param {PaletteMode} mode `light` or `dark`
 * @returns {PaletteCheck} per-pair results and the failures (`APPEARANCE_PALETTE_CONTRAST`)
 */
export function checkPalette(derived: DerivedPalette, mode: PaletteMode): PaletteCheck;
/**
 * Check the author's picks on their own, without a theme: Background
 * lightness inside the band (OKLab L at least 0.90 in light, at most 0.30 in
 * dark) and Text at least 4.5:1 on Background in each mode where both are
 * set. The author's colours are never adjusted.
 *
 * @param {PaletteTokens} tokens the author's `appearance.tokens`
 * @returns {{ ok: boolean, failures: PickedFailure[] }} outcome
 */
export function checkPickedColours(tokens: PaletteTokens): {
    ok: boolean;
    failures: PickedFailure[];
};
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
export function suggestDarkSeed(theme: PaletteTheme, role: PaletteRole, lightHex: string): string;
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
export const PALETTE_PROFILE: "gala-palette-follow-v1";
/** The three roles an author may pick, in canonical order. */
export const PALETTE_ROLES: readonly PaletteRole[];
/** The two colour modes, in canonical order. */
export const PALETTE_MODES: readonly PaletteMode[];
/** The seed token each role is read from, and the token that carries it. */
export const PALETTE_SEED_KEYS: Readonly<{
    accent: "color-accent";
    canvas: "color-canvas";
    text: "color-text";
}>;
/**
 * Every palette-drivable token key and its value type, in theme catalog
 * order. A theme binds any subset; every other key is always theme-owned.
 *
 * @type {Readonly<Record<string, 'color' | 'paint' | 'border' | 'shadow'>>}
 */
export const PALETTE_KEY_TYPES: Readonly<Record<string, "color" | "paint" | "border" | "shadow">>;
/** The 40 palette-drivable token keys, in theme catalog order. */
export const PALETTE_DRIVABLE_KEYS: readonly string[];
/**
 * The most colours one value of each drivable type can hold under the token
 * grammar: one colour, one border colour, three shadow layers, and three
 * gradients of five stops. A value's exact count is `paletteColourCount`.
 */
export const PALETTE_MAX_COLOURS_BY_TYPE: Readonly<{
    color: 1;
    border: 1;
    shadow: 3;
    paint: 15;
}>;
/**
 * The contrast pairs every palette must clear on its final values, per
 * mode: the 17 theme-tooling pairs plus the focus ring and the three status
 * colours on the canvas. A pair flagged `skipWhenNotPlainColor` is skipped
 * (never silently passed) when its background is `none`, translucent,
 * transparent or an unreadable gradient.
 */
export const PALETTE_PAIRS: readonly Readonly<{
    label: `undefined on ${string}` | `undefined on ${number}` | `${string} on undefined` | `${string} on ${string}` | `${string} on ${number}` | `${string} on false` | `${string} on true` | `${number} on undefined` | `${number} on ${string}` | `${number} on ${number}` | `${number} on false` | `${number} on true` | `false on ${string}` | `false on ${number}` | `true on ${string}` | `true on ${number}`;
    foreground: string;
    background: string;
    minimum: number;
    skipWhenNotPlainColor: boolean;
}>[];
/** Limits of the Background role (OKLab lightness). */
export const PALETTE_CANVAS_BAND: Readonly<{
    lightMin: 0.9;
    darkMax: 0.3;
}>;
/** The margin above a pair's minimum that the readability clamp aims for. */
export const PALETTE_CLAMP_MARGIN: 0.1;
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
    constructor(code: string, detail: string);
    /** @type {string} */
    code: string;
    /** @type {string} */
    detail: string;
}
export type PaletteRole = "accent" | "canvas" | "text";
export type PaletteMode = "light" | "dark";
export type PalettePair = {
    light: string;
    dark: string;
};
export type PaletteTokens = Partial<Record<PaletteRole, PalettePair>>;
export type PaletteThemeToken = {
    key: string;
    type: string;
    light: string;
    dark: string;
};
export type PaletteFollow = {
    key: string;
    light: (PaletteRole | null)[];
    dark: (PaletteRole | null)[];
};
export type ThemePalette = {
    profile: string;
    follow: PaletteFollow[];
};
export type PaletteTheme = {
    palette?: ThemePalette;
    tokens: PaletteThemeToken[];
};
export type PaletteAdjustment = {
    key: string;
    mode: PaletteMode;
    from: string;
    to: string;
    pair: string;
};
export type DerivedPalette = {
    profile: string;
    seeds: Record<PaletteMode, Record<PaletteRole, string>>;
    bound: string[];
    tokens: Record<string, PalettePair>;
    adjusted: PaletteAdjustment[];
};
export type PairResult = {
    label: string;
    foreground: string;
    background: string;
    minimum: number;
    status: "pass" | "fail" | "skipped";
    ratio: number | null;
    reason?: string;
    worstStop?: string;
};
export type PaletteFailure = {
    code: "APPEARANCE_PALETTE_CONTRAST";
    pair: string;
    mode: PaletteMode;
    ratio: number | null;
    minimum: number;
    foregroundKey: string;
    backgroundKey: string;
    reason?: string;
};
export type PaletteCheck = {
    mode: PaletteMode;
    ok: boolean;
    results: PairResult[];
    failures: PaletteFailure[];
};
export type PickedFailure = {
    code: "APPEARANCE_PALETTE_BAND" | "APPEARANCE_PALETTE_TEXT_CONTRAST";
    mode: PaletteMode;
    role: PaletteRole;
    value: number;
    limit: number;
};

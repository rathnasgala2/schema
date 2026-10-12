import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { validateGalaDocument } from '../src/index.js';
import {
  PALETTE_CLAMP_MARGIN,
  PALETTE_DRIVABLE_KEYS,
  PALETTE_KEY_TYPES,
  PALETTE_MAX_COLOURS_BY_TYPE,
  PALETTE_PAIRS,
  PALETTE_PROFILE,
  PALETTE_ROLES,
  PALETTE_SEED_KEYS,
  PaletteError,
  checkPalette,
  checkPickedColours,
  derivePalette,
  paletteColourCount,
  suggestDarkSeed,
  validatePaletteTokens,
  validateThemePalette,
} from '../src/palette.js';
import { validateThemeContract } from '../scripts/internal-semantics/theme-composition-semantics.js';
import { THEME_TOKEN_CATALOG } from '../scripts/internal-semantics/theme-token-grammar.js';

/**
 * @param {string} file path under parity/palette
 * @returns {Promise<any>} parsed JSON
 */
async function readPalette(file) {
  return JSON.parse(await readFile(`parity/palette/${file}`, 'utf8'));
}

const APPEARANCE_ID = 'urn:gala:schema:appearance:2.0.0';
const THEME_ID = 'urn:gala:schema:theme-contract:2.0.0';

/**
 * @param {any} tokens candidate `appearance.tokens`
 * @returns {Promise<boolean>} whether the canonical appearance validates
 */
async function appearanceAccepts(tokens) {
  const base = JSON.parse(
    await readFile('examples/valid/appearance/canonical.json', 'utf8'),
  );
  return validateGalaDocument(APPEARANCE_ID, { ...base, tokens }).valid;
}

test('the drivable key list is the 40 keys of the token catalog, with the catalog types', () => {
  assert.equal(PALETTE_DRIVABLE_KEYS.length, 40);
  const catalogKeys = THEME_TOKEN_CATALOG.map(([key]) => key);
  assert.deepEqual(
    PALETTE_DRIVABLE_KEYS,
    catalogKeys.filter((key) => Object.hasOwn(PALETTE_KEY_TYPES, key)),
  );
  for (const [key, type] of THEME_TOKEN_CATALOG) {
    if (Object.hasOwn(PALETTE_KEY_TYPES, key)) {
      assert.equal(PALETTE_KEY_TYPES[key], type, key);
    }
  }
  // The 17 theme-owned keys named in the design are exactly the colour,
  // border and shadow tokens that are not drivable.
  const owned = THEME_TOKEN_CATALOG.filter(
    ([key, type]) =>
      ['color', 'paint', 'border', 'shadow'].includes(type) &&
      !Object.hasOwn(PALETTE_KEY_TYPES, key),
  ).map(([key]) => key);
  assert.equal(owned.length, 17);
  assert.deepEqual(Object.keys(PALETTE_SEED_KEYS), [...PALETTE_ROLES]);
  assert.equal(PALETTE_PAIRS.length, 21);
  assert.equal(PALETTE_CLAMP_MARGIN, 0.1);
});

test('colour counts follow the token grammar', () => {
  assert.equal(paletteColourCount('#2b59ff'), 1);
  assert.equal(paletteColourCount('none'), 0);
  assert.equal(paletteColourCount('1px solid #00000000'), 1);
  assert.equal(
    paletteColourCount(
      'radial-gradient(60rem 28rem at 88% -8%, #dfe7ff 0%, transparent 62%)',
    ),
    1,
  );
  assert.equal(paletteColourCount('0 0 0 2px #f7f8fa, 0 0 0 3px #e2e6ec'), 2);
  assert.equal(PALETTE_MAX_COLOURS_BY_TYPE.paint, 15);
});

test('the golden vectors reproduce exactly', async () => {
  const theme = await readPalette('theme-default.fixture.json');
  const vectors = await readPalette('golden-vectors.json');
  assert.equal(vectors.profile, PALETTE_PROFILE);
  assert.ok(vectors.cases.length >= 10);
  for (const vector of vectors.cases) {
    const derived = derivePalette(theme, vector.tokens);
    /** @type {Record<string, unknown>} */
    const bound = {};
    for (const key of derived.bound) bound[key] = derived.tokens[key];
    assert.deepEqual(bound, vector.expected.bound, vector.id);
    assert.deepEqual(derived.adjusted, vector.expected.adjusted, vector.id);
    assert.deepEqual(
      {
        light: checkPalette(derived, 'light').failures.map((f) => f.pair),
        dark: checkPalette(derived, 'dark').failures.map((f) => f.pair),
      },
      vector.expected.failures,
      vector.id,
    );
  }
});

test('the six design presets are present and the theme-colours vector is the theme literals', async () => {
  const theme = await readPalette('theme-default.fixture.json');
  const vectors = await readPalette('golden-vectors.json');
  const ids = vectors.cases.map((/** @type {any} */ c) => c.id);
  for (const id of [
    'theme-colours',
    'midnight',
    'oxblood',
    'forest',
    'plum',
    'ember',
    'graphite',
  ]) {
    assert.ok(ids.includes(id), id);
  }
  const derived = derivePalette(theme, {});
  for (const row of theme.tokens) {
    assert.deepEqual(
      derived.tokens[row.key],
      { light: row.light, dark: row.dark },
      row.key,
    );
  }
  assert.deepEqual(derived.adjusted, []);
  assert.equal(derived.bound.length, theme.palette.follow.length);
  for (const mode of /** @type {const} */ (['light', 'dark'])) {
    assert.equal(checkPalette(derived, mode).ok, true, mode);
  }
});

test('a picked seed becomes the seed token exactly and moves what follows it', async () => {
  const theme = await readPalette('theme-default.fixture.json');
  const derived = derivePalette(theme, {
    accent: { light: '#1f7a4d', dark: '#6fd3a0' },
  });
  assert.deepEqual(derived.tokens['color-accent'], {
    light: '#1f7a4d',
    dark: '#6fd3a0',
  });
  // Tokens that follow the accent changed; canvas-bound and theme-owned did not.
  assert.notEqual(derived.tokens['color-link']?.light, '#2148e0');
  assert.deepEqual(derived.tokens['color-canvas'], {
    light: '#f7f8fa',
    dark: '#0b0d11',
  });
  assert.deepEqual(derived.tokens['color-danger'], {
    light: '#a8241c',
    dark: '#ff8f8a',
  });
  // Every derived colour literal is lowercase hex.
  for (const key of derived.bound) {
    for (const mode of /** @type {const} */ (['light', 'dark'])) {
      const value = /** @type {any} */ (derived.tokens[key])[mode];
      assert.equal(value, value.toLowerCase(), key);
    }
  }
});

test('a yellow accent is clamped for readability, and the clamp is reported', async () => {
  const theme = await readPalette('theme-default.fixture.json');
  const derived = derivePalette(theme, {
    accent: { light: '#ffd60a', dark: '#ffd60a' },
  });
  const link = derived.adjusted.find((a) => a.key === 'color-link');
  assert.ok(link);
  assert.equal(link.mode, 'light');
  const light = checkPalette(derived, 'light');
  const linkResult = light.results.find(
    (r) => r.label === 'color-link on color-canvas',
  );
  assert.ok(linkResult?.ratio !== null && (linkResult?.ratio ?? 0) >= 4.5);
});

test('the stress corpus matches its recorded outcome on every pair', async () => {
  const theme = await readPalette('theme-default.fixture.json');
  const corpus = await readPalette('stress-corpus.json');
  assert.ok(corpus.palettes.length >= 40);
  let clean = 0;
  for (const palette of corpus.palettes) {
    assert.equal(checkPickedColours(palette.tokens).ok, true, palette.id);
    const derived = derivePalette(theme, palette.tokens);
    const failures = {
      light: checkPalette(derived, 'light').failures.map((f) => f.pair),
      dark: checkPalette(derived, 'dark').failures.map((f) => f.pair),
    };
    assert.deepEqual(failures, palette.expectedFailures, palette.id);
    if (failures.light.length === 0 && failures.dark.length === 0) clean += 1;
  }
  assert.ok(clean >= 30, `only ${clean} stress palettes are clean`);
  for (const rejected of corpus.rejectedPicks) {
    assert.deepEqual(
      checkPickedColours(rejected.tokens).failures.map(
        (f) => `${f.code}:${f.mode}`,
      ),
      rejected.codes,
      rejected.id,
    );
    assert.ok(rejected.codes.length > 0, rejected.id);
  }
});

test('a failing pair with a seed or theme-owned foreground is reported, not adjusted', async () => {
  const theme = await readPalette('theme-default.fixture.json');
  // Text picked too close to the theme's own surface: color-text is a seed.
  const derived = derivePalette(theme, {
    text: { light: '#cccccc', dark: '#e8ecf2' },
  });
  assert.deepEqual(derived.tokens['color-text']?.light, '#cccccc');
  const result = checkPalette(derived, 'light');
  assert.equal(result.ok, false);
  const failure = result.failures.find(
    (f) => f.pair === 'color-text on color-canvas',
  );
  assert.equal(failure?.code, 'APPEARANCE_PALETTE_CONTRAST');
  assert.equal(failure?.mode, 'light');
  assert.ok((failure?.ratio ?? 99) < 4.5);
});

test('a picked colour is checked for its band and for text on background', () => {
  assert.equal(
    checkPickedColours({ canvas: { light: '#f6f8fb', dark: '#0d1117' } }).ok,
    true,
  );
  assert.deepEqual(
    checkPickedColours({
      canvas: { light: '#808080', dark: '#808080' },
    }).failures.map((f) => `${f.code}:${f.mode}`),
    ['APPEARANCE_PALETTE_BAND:light', 'APPEARANCE_PALETTE_BAND:dark'],
  );
  assert.deepEqual(
    checkPickedColours({
      canvas: { light: '#ffffff', dark: '#000000' },
      text: { light: '#999999', dark: '#ffffff' },
    }).failures.map((f) => `${f.code}:${f.mode}`),
    ['APPEARANCE_PALETTE_TEXT_CONTRAST:light'],
  );
});

test('the dark suggestion keeps hue and chroma at the theme dark seed lightness', async () => {
  const theme = await readPalette('theme-default.fixture.json');
  const suggestion = suggestDarkSeed(theme, 'accent', '#2457e6');
  assert.match(suggestion, /^#[0-9a-f]{6}$/u);
  assert.equal(suggestion, suggestDarkSeed(theme, 'accent', '#2457e6'));
  assert.throws(
    () => suggestDarkSeed(theme, 'accent', '#2457E6'),
    (error) =>
      error instanceof PaletteError &&
      error.code === 'APPEARANCE_PALETTE_INVALID',
  );
});

test('malformed picks and malformed theme palettes raise coded errors', async () => {
  const theme = await readPalette('theme-default.fixture.json');
  /**
   * @param {() => unknown} action action under test
   * @param {string} code expected error code
   * @returns {void}
   */
  const rejects = (action, code) =>
    assert.throws(
      action,
      (error) => error instanceof PaletteError && error.code === code,
    );
  rejects(
    () => derivePalette({ tokens: theme.tokens }, {}),
    'THEME_PALETTE_MISSING',
  );
  rejects(
    () =>
      validatePaletteTokens({ accent: { light: '#ABCDEF', dark: '#abcdef' } }),
    'APPEARANCE_PALETTE_INVALID',
  );
  rejects(
    () => validatePaletteTokens({ accent: { light: '#abcdef' } }),
    'APPEARANCE_PALETTE_INVALID',
  );
  rejects(
    () =>
      validatePaletteTokens({
        accent: { light: '#abcdef80', dark: '#abcdef' },
      }),
    'APPEARANCE_PALETTE_INVALID',
  );
  rejects(
    () =>
      validatePaletteTokens({ link: { light: '#abcdef', dark: '#abcdef' } }),
    'APPEARANCE_PALETTE_INVALID',
  );
  /**
   * @param {(palette: any) => void} edit mutation of a palette copy
   * @returns {any} theme with the edited palette
   */
  const edited = (edit) => {
    const copy = structuredClone(theme);
    edit(copy.palette);
    return copy;
  };
  rejects(
    () => validateThemePalette(edited((p) => (p.profile = 'other'))),
    'THEME_PALETTE_INVALID',
  );
  rejects(
    () =>
      validateThemePalette(edited((p) => p.follow.push({ ...p.follow[0] }))),
    'THEME_PALETTE_INVALID',
  );
  rejects(
    () =>
      validateThemePalette(
        edited((p) =>
          p.follow.push({
            key: 'color-danger',
            light: ['accent'],
            dark: ['accent'],
          }),
        ),
      ),
    'THEME_PALETTE_INVALID',
  );
  rejects(
    () => validateThemePalette(edited((p) => p.follow[0].light.push(null))),
    'THEME_PALETTE_INVALID',
  );
  rejects(
    () => validateThemePalette(edited((p) => (p.follow[0].dark = ['other']))),
    'THEME_PALETTE_INVALID',
  );
});

test('appearance.tokens accepts the palette shapes and rejects the rest', async () => {
  assert.equal(await appearanceAccepts({}), true);
  assert.equal(
    await appearanceAccepts({ accent: { light: '#2457e6', dark: '#79a6ff' } }),
    true,
  );
  assert.equal(
    await appearanceAccepts({
      accent: { light: '#2457e6', dark: '#79a6ff' },
      canvas: { light: '#f6f8fb', dark: '#0d1117' },
      text: { light: '#111827', dark: '#e6edf3' },
    }),
    true,
  );
  // Uppercase hex, alpha, a missing dark value and an unknown role are invalid.
  assert.equal(
    await appearanceAccepts({ accent: { light: '#2457E6', dark: '#79a6ff' } }),
    false,
  );
  assert.equal(
    await appearanceAccepts({
      accent: { light: '#2457e6ff', dark: '#79a6ff' },
    }),
    false,
  );
  assert.equal(
    await appearanceAccepts({ accent: { light: '#2457e6' } }),
    false,
  );
  assert.equal(
    await appearanceAccepts({
      link: { light: '#2457e6', dark: '#79a6ff' },
    }),
    false,
  );
  assert.equal(
    await appearanceAccepts({
      accent: { light: '#2457e6', dark: '#79a6ff', extra: '#000000' },
    }),
    false,
  );
});

test('the theme-contract palette is optional, closed and validated by the schema and the semantic validator', async () => {
  const base = JSON.parse(
    await readFile('examples/valid/theme-contract/default-3.0.json', 'utf8'),
  );
  assert.equal(validateGalaDocument(THEME_ID, base).valid, true);
  const fixture = await readPalette('theme-default.fixture.json');
  const withPalette = { ...base, palette: fixture.palette };
  const schemaOk = validateGalaDocument(THEME_ID, withPalette);
  assert.equal(schemaOk.valid, true, JSON.stringify(schemaOk));
  assert.doesNotThrow(() => validateThemeContract(withPalette));
  // Schema rejections: unknown profile, unknown key, theme-owned key, unknown
  // role, an unknown member.
  for (const edit of [
    (/** @type {any} */ p) => (p.profile = 'gala-palette-follow-v2'),
    (/** @type {any} */ p) => (p.follow[0].key = 'color-danger'),
    (/** @type {any} */ p) => (p.follow[0].light = ['other']),
    (/** @type {any} */ p) => (p.follow[0].extra = true),
    (/** @type {any} */ p) => (p.extra = true),
  ]) {
    const copy = structuredClone(withPalette);
    edit(copy.palette);
    assert.equal(validateGalaDocument(THEME_ID, copy).valid, false);
  }
  // Semantic rejections the schema cannot express: a repeated key and a list
  // whose length differs from the colour count of the value.
  const repeated = structuredClone(withPalette);
  repeated.palette.follow.push(structuredClone(repeated.palette.follow[0]));
  assert.throws(() => validateThemeContract(repeated));
  const short = structuredClone(withPalette);
  short.palette.follow[0].light = [];
  assert.throws(() => validateThemeContract(short));
});

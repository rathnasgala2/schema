import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { format, resolveConfig } from 'prettier';

import {
  PALETTE_PROFILE,
  checkPalette,
  checkPickedColours,
  derivePalette,
  suggestDarkSeed,
} from '../src/palette.js';
import { runIfMain } from './run-if-main.mjs';

const PALETTE_DIRECTORY = path.resolve(
  import.meta.dirname,
  '../parity/palette',
);

/** The six presets of the publication palette design (D1). */
const PRESETS = Object.freeze({
  midnight: ['#2457e6', '#79a6ff', '#f6f8fb', '#0d1117', '#111827', '#e6edf3'],
  oxblood: ['#74202d', '#d99aa1', '#f6f2ea', '#141210', '#1b1815', '#ece5d9'],
  forest: ['#1f7a4d', '#6fd3a0', '#f4f7f2', '#0e1410', '#14211a', '#e3ece5'],
  plum: ['#7b3fa0', '#c9a0ec', '#f8f5fa', '#130f17', '#221a2b', '#eee6f4'],
  ember: ['#c2410c', '#fb923c', '#fbf7f3', '#15110e', '#241a12', '#f2e9e1'],
  graphite: ['#27272a', '#d4d4d8', '#f7f7f8', '#111113', '#18181b', '#ececef'],
});

const STRESS_ACCENTS = Object.freeze([
  '#ff0000',
  '#00ff00',
  '#0000ff',
  '#ffff00',
  '#00ffff',
  '#ff00ff',
  '#000000',
  '#ffffff',
  '#808080',
  '#ffd60a',
  '#ff7a00',
  '#8a2be2',
  '#006400',
  '#b22222',
  '#1e90ff',
  '#e0e0e0',
  '#202020',
]);

const STRESS_GROUNDS = Object.freeze([
  ['#ffffff', '#000000', '#000000', '#ffffff'],
  ['#f6f8fb', '#0d1117', '#111827', '#e6edf3'],
  ['#e6e0d0', '#2b2b2b', '#3a3a3a', '#d0d0d0'],
]);

/**
 * @param {string[]} six accent, canvas and text, light then dark
 * @returns {Record<string, {light: string, dark: string}>} picks
 */
function presetTokens(six) {
  const [al, ad, cl, cd, tl, td] =
    /** @type {[string,string,string,string,string,string]} */ (six);
  return {
    accent: { light: al, dark: ad },
    canvas: { light: cl, dark: cd },
    text: { light: tl, dark: td },
  };
}

/**
 * @param {any} theme fixture theme
 * @param {Record<string, {light: string, dark: string}>} tokens picks
 * @returns {any} the expected-output record for one case
 */
function expectation(theme, tokens) {
  const derived = derivePalette(theme, tokens);
  /** @type {Record<string, {light: string, dark: string}>} */
  const bound = {};
  for (const key of derived.bound)
    bound[key] = /** @type {any} */ (derived.tokens[key]);
  return {
    bound,
    adjusted: derived.adjusted,
    failures: {
      light: checkPalette(derived, 'light').failures.map((f) => f.pair),
      dark: checkPalette(derived, 'dark').failures.map((f) => f.pair),
    },
  };
}

/**
 * Build the golden vectors and the stress corpus from the committed default
 * theme fixture.
 *
 * @returns {Promise<{ vectors: unknown, corpus: unknown }>} both documents
 */
export async function buildPaletteVectors() {
  const theme = JSON.parse(
    await readFile(
      path.join(PALETTE_DIRECTORY, 'theme-default.fixture.json'),
      'utf8',
    ),
  );
  const named = [
    ['theme-colours', {}],
    ...Object.entries(PRESETS).map(([id, six]) => [id, presetTokens(six)]),
    ['accent-only', { accent: { light: '#1f7a4d', dark: '#6fd3a0' } }],
    ['canvas-only', { canvas: { light: '#f4f7f2', dark: '#0e1410' } }],
    ['text-only', { text: { light: '#14211a', dark: '#e3ece5' } }],
    [
      'accent-yellow-clamped',
      { accent: { light: '#ffd60a', dark: '#ffd60a' } },
    ],
  ];
  const vectors = {
    profile: PALETTE_PROFILE,
    fixture: 'theme-default.fixture.json',
    cases: named.map(([id, tokens]) => ({
      id,
      tokens,
      expected: expectation(theme, /** @type {any} */ (tokens)),
    })),
  };

  const palettes = [];
  for (const accent of STRESS_ACCENTS) {
    for (const [index, ground] of STRESS_GROUNDS.entries()) {
      const [canvasLight, canvasDark, textLight, textDark] =
        /** @type {[string,string,string,string]} */ (ground);
      const tokens = {
        accent: {
          light: accent,
          dark: suggestDarkSeed(theme, 'accent', accent),
        },
        canvas: { light: canvasLight, dark: canvasDark },
        text: { light: textLight, dark: textDark },
      };
      if (!checkPickedColours(tokens).ok) continue;
      palettes.push({
        id: `accent${accent.slice(1)}-ground${index}`,
        tokens,
        expectedFailures: expectation(theme, tokens).failures,
      });
    }
  }
  const rejectedPicks = [
    [
      'canvas-too-dark-for-light',
      { canvas: { light: '#808080', dark: '#101010' } },
    ],
    [
      'canvas-too-light-for-dark',
      { canvas: { light: '#ffffff', dark: '#808080' } },
    ],
    [
      'text-below-4.5',
      {
        canvas: { light: '#ffffff', dark: '#000000' },
        text: { light: '#8a8a8a', dark: '#777777' },
      },
    ],
  ].map(([id, tokens]) => ({
    id,
    tokens,
    codes: checkPickedColours(/** @type {any} */ (tokens)).failures.map(
      (failure) => `${failure.code}:${failure.mode}`,
    ),
  }));
  return {
    vectors,
    corpus: {
      profile: PALETTE_PROFILE,
      fixture: 'theme-default.fixture.json',
      palettes,
      rejectedPicks,
    },
  };
}

/**
 * Serialize one data file in the shape the repository formatter keeps, so a
 * regeneration never fails `prettier --check`.
 *
 * @param {string} file absolute output path
 * @param {unknown} value JSON value
 * @returns {Promise<void>} write completion
 */
async function writeFormatted(file, value) {
  const config = (await resolveConfig(file)) ?? {};
  await writeFile(
    file,
    await format(JSON.stringify(value), { ...config, filepath: file }),
  );
}

await runIfMain(import.meta.url, async () => {
  const { vectors, corpus } = await buildPaletteVectors();
  const fixtureFile = path.join(
    PALETTE_DIRECTORY,
    'theme-default.fixture.json',
  );
  await writeFormatted(
    fixtureFile,
    JSON.parse(await readFile(fixtureFile, 'utf8')),
  );
  await writeFormatted(
    path.join(PALETTE_DIRECTORY, 'golden-vectors.json'),
    vectors,
  );
  await writeFormatted(
    path.join(PALETTE_DIRECTORY, 'stress-corpus.json'),
    corpus,
  );
});

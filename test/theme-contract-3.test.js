import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { validateGalaDocument } from '../src/index.js';
import { SemanticValidationError } from '../src/internal/semver.js';
import { validateThemeContract } from '../scripts/internal-semantics/theme-composition-semantics.js';
import {
  KEYWORD_ENUMS,
  THEME_TOKEN_CATALOG,
} from '../scripts/internal-semantics/theme-token-grammar.js';

const THEME_ID = 'urn:gala:schema:theme-contract:2.0.0';
const PUBLICATION_ID = 'urn:gala:schema:publication:2.0.0';

/**
 * Read the shared contract-3 Default theme example.
 *
 * @returns {Promise<any>} complete theme-contract document
 */
async function defaultTheme() {
  return JSON.parse(
    await readFile('examples/valid/theme-contract/default-3.0.json', 'utf8'),
  );
}

/**
 * Return a copy of the theme with one token's values replaced.
 *
 * @param {any} theme base theme
 * @param {string} key token key
 * @param {Record<string, string>} values replacement light/dark values
 * @returns {any} modified copy
 */
function withToken(theme, key, values) {
  const copy = structuredClone(theme);
  const token = copy.tokens.find((/** @type {any} */ row) => row.key === key);
  assert.ok(token, key);
  Object.assign(token, values);
  return copy;
}

/**
 * Assert both validators reject a token value.
 *
 * @param {any} theme base theme
 * @param {string} key token key
 * @param {string} value rejected value, set in both modes
 * @returns {void}
 */
function assertRejected(theme, key, value) {
  const candidate = withToken(theme, key, { light: value, dark: value });
  assert.equal(
    validateGalaDocument(THEME_ID, candidate).valid,
    false,
    `${key}: ${value}`,
  );
  assert.throws(
    () => validateThemeContract(candidate),
    (error) =>
      error instanceof SemanticValidationError &&
      error.code === 'THEME_TOKEN_CATALOG_INVALID',
    `${key}: ${value}`,
  );
}

test('the Default example carries every contract-3 token in byte order and validates in both validators', async () => {
  const theme = await defaultTheme();
  assert.equal(theme.tokens.length, THEME_TOKEN_CATALOG.length);
  assert.equal(theme.tokens.length, 116);
  assert.deepEqual(
    theme.tokens.map((/** @type {any} */ row) => [row.key, row.type]),
    THEME_TOKEN_CATALOG.map(([key, type]) => [key, type]),
  );
  const keys = theme.tokens.map((/** @type {any} */ row) => row.key);
  assert.deepEqual(
    keys,
    [...keys].sort((left, right) =>
      Buffer.compare(Buffer.from(left), Buffer.from(right)),
    ),
  );
  assert.equal(new Set(keys).size, keys.length);
  assert.deepEqual(validateGalaDocument(THEME_ID, theme), {
    valid: true,
    diagnostics: [],
  });
  assert.doesNotThrow(() => validateThemeContract(theme));
});

test('the old 35-token catalog and unknown or missing tokens are rejected', async () => {
  const theme = await defaultTheme();
  const oldKey = withToken(theme, 'color-accent', {});
  oldKey.tokens.find(
    (/** @type {any} */ row) => row.key === 'color-accent',
  ).key = 'font-heading';
  assert.equal(validateGalaDocument(THEME_ID, oldKey).valid, false);
  const missing = structuredClone(theme);
  missing.tokens.pop();
  assert.equal(validateGalaDocument(THEME_ID, missing).valid, false);
  assert.throws(() => validateThemeContract(missing), SemanticValidationError);
  const extra = structuredClone(theme);
  extra.tokens.push({ ...extra.tokens[0] });
  assert.equal(validateGalaDocument(THEME_ID, extra).valid, false);
});

test('slotHooks admit 256 labels and reject 257', async () => {
  const theme = await defaultTheme();
  const hooks = (/** @type {number} */ count) =>
    Array.from(
      { length: count },
      (_, index) => `hook-${String(index).padStart(3, '0')}`,
    );
  const at = { ...theme, slotHooks: hooks(256) };
  assert.equal(validateGalaDocument(THEME_ID, at).valid, true);
  assert.doesNotThrow(() => validateThemeContract(at));
  const over = { ...theme, slotHooks: hooks(257) };
  assert.equal(validateGalaDocument(THEME_ID, over).valid, false);
  assert.throws(() => validateThemeContract(over), SemanticValidationError);
});

/** @type {Array<[string, string[], string[]]>} key, accepted, rejected */
const GRAMMAR_CASES = [
  [
    'color-accent',
    ['#2b59ff', '#2b59ff80'],
    [
      '#2B59FF',
      '#fff',
      '#2b59f',
      'url(x)',
      'var(--x)',
      'red',
      '#2b59ff;',
      'expression(1)',
      '#2b59ff}',
    ],
  ],
  [
    'space-1',
    ['0', '1px', '-0.25rem', '2em', '50%', '1.2345rem'],
    [
      '1',
      '1.23456rem',
      '1pt',
      'calc(1px)',
      'url(x)',
      'var(--x)',
      '1px;',
      '1px}',
      '1px 2px',
      'attr(x)',
      '1PX',
    ],
  ],
  [
    'card-pad',
    ['0', '1px', '1px 2px', '1px 2px 3px', '0.75rem 0.9rem 1.1rem 0'],
    [
      '1px 2px 3px 4px 5px',
      '1px  2px',
      '1px,2px',
      'var(--x)',
      'url(x)',
      '1px;',
      '1px} a{',
      '',
    ],
  ],
  [
    'prose-leading',
    ['0', '1.75', '10', '10.000', '0.001'],
    ['10.5', '11', '-1', '1.2345', '1e2', '.5', 'var(--x)', '1;'],
  ],
  [
    'duration-base',
    ['0ms', '320ms', '2000ms', '1999ms'],
    ['2001ms', '2500ms', '1s', '320', '-1ms', '320ms;', 'var(--x)', '3.5ms'],
  ],
  [
    'ease-standard',
    [
      'linear',
      'cubic-bezier(0.2, 0.8, 0.2, 1)',
      'cubic-bezier(-0.5, 1.4, 0, 1)',
    ],
    [
      'ease',
      'cubic-bezier(0.2,0.8,0.2,1)',
      'cubic-bezier(0.2, 0.8, 0.2)',
      'cubic-bezier(0.2, 0.8, 0.2, 1);',
      'cubic-bezier(var(--x), 0.8, 0.2, 1)',
      'steps(4)',
      'cubic-bezier(0.2, 0.8, 0.2, 1) }',
    ],
  ],
  [
    'border-card',
    ['none', '1px solid #e2e6ec', '0 dashed #00000000', '2px solid #aabbccdd'],
    [
      '1px dotted #e2e6ec',
      '1px solid transparent',
      '1px solid #E2E6EC',
      '1px solid var(--x)',
      '1px solid url(x)',
      '1px solid #e2e6ec;',
      '1px solid #e2e6ec}',
      'none;',
      '1px solid',
    ],
  ],
  [
    'shadow-card',
    [
      'none',
      '0 1px 2px #1018281f',
      'inset 0 1px 0 #ffffff08',
      '0 1px 2px 3px #000000',
      '0 1px 2px #000000, 0 2px 4px #000000, 0 3px 6px #000000',
    ],
    [
      '0 1px 2px #000000, 0 2px 4px #000000, 0 3px 6px #000000, 0 4px 8px #000000',
      '0 1px #000000',
      '0 1px 2px 3px 4px #000000',
      '0 1px 2px #000',
      '0 1px 2px red',
      '0 1px 2px #1018281F',
      'inset 0 1px 2px',
      '0 1px 2px url(x)',
      '0 1px 2px var(--x)',
      '0 1px 2px #000000;',
      '0 1px 2px #000000}',
    ],
  ],
  [
    'paint-panel',
    [
      'none',
      '#2b59ff',
      '#2b59ff80',
      'linear-gradient(135deg, #1d3fc4, #2b59ff 55%, #00a3a3)',
      'repeating-linear-gradient(-45deg, transparent 0 16px, #0000000b 16px 32px)',
      'radial-gradient(60rem 28rem at 88% -8%, #dfe7ff 0%, transparent 62%)',
      'linear-gradient(0deg, #000000, #ffffff), linear-gradient(0deg, #000000, #ffffff), linear-gradient(0deg, #000000, #ffffff)',
      'linear-gradient(0deg, #000000, #111111, #222222, #333333, #444444)',
    ],
    [
      'linear-gradient(0deg, #000000, #111111, #222222, #333333, #444444, #555555)',
      'linear-gradient(0deg, #000000)',
      'linear-gradient(0deg, #000000, #ffffff), linear-gradient(0deg, #000000, #ffffff), linear-gradient(0deg, #000000, #ffffff), linear-gradient(0deg, #000000, #ffffff)',
      'url(x)',
      'url(https://example.com/a.png)',
      'linear-gradient(0deg, url(x), #ffffff)',
      'linear-gradient(0deg, var(--x), #ffffff)',
      'linear-gradient(0deg, #000000, #FFFFFF)',
      'linear-gradient(0deg, #000000, #ffffff);',
      'linear-gradient(0deg, #000000, #ffffff)}',
      'linear-gradient(to right, #000000, #ffffff)',
      'conic-gradient(#000000, #ffffff)',
      'linear-gradient(0deg, expression(1), #ffffff)',
      'linear-gradient(0.5deg, #000000, #ffffff)',
      'red',
    ],
  ],
  [
    'weight-ui',
    ['1', '100', '560', '680', '760', '900', '1000'],
    ['0', '1001', '01', '0560', '1e3', '-1', '5.5', 'bold', '400;', 'var(--x)'],
  ],
  [
    'font-ui',
    ['ui-sans-serif, system-ui, Roboto'],
    ['"Segoe UI"', 'Arial; color: red', 'url(x)', 'a, b}', '-apple-system'],
  ],
  [
    'quote-mark',
    KEYWORD_ENUMS['quote-mark'] ?? [],
    ['close-quote', 'open-quote;', '"x"', 'url(x)', 'NONE', ''],
  ],
  [
    'decor-size',
    KEYWORD_ENUMS['decor-size'] ?? [],
    ['top', 'tile', '100%', '100% 46rem;', 'auto auto', 'var(--x)'],
  ],
  [
    'media-filter',
    ['none', 'grayscale(1)'],
    ['grayscale', 'grayscale(2)', 'blur(2px)', 'url(x)'],
  ],
];

test('every value type admits its grammar and rejects injection and malformed values', async () => {
  const theme = await defaultTheme();
  for (const [key, accepted, rejected] of GRAMMAR_CASES) {
    for (const value of accepted) {
      const candidate = withToken(theme, key, { light: value, dark: value });
      assert.equal(
        validateGalaDocument(THEME_ID, candidate).valid,
        true,
        `${key}: ${value}`,
      );
      assert.doesNotThrow(() => validateThemeContract(candidate));
    }
    for (const value of rejected) assertRejected(theme, key, value);
  }
});

test('every token key and type pair rejects a value of another type', async () => {
  const theme = await defaultTheme();
  assertRejected(theme, 'color-accent', '1px');
  assertRejected(theme, 'space-1', '#2b59ff');
  assertRejected(theme, 'border-card', '#2b59ff');
  assertRejected(theme, 'shadow-card', '1px solid #2b59ff');
  assertRejected(theme, 'duration-base', 'linear');
  assertRejected(theme, 'weight-ui', 'uppercase');
  assertRejected(theme, 'label-transform', 'italic');
  const retyped = structuredClone(theme);
  retyped.tokens.find((/** @type {any} */ row) => row.key === 'space-1').type =
    'box';
  assert.equal(validateGalaDocument(THEME_ID, retyped).valid, false);
  assert.throws(() => validateThemeContract(retyped), SemanticValidationError);
});

test('light and dark must be byte-equal for every mode-invariant type and may differ for the four mode-variant types', async () => {
  const theme = await defaultTheme();
  const variants = {
    'color-accent': ['#000000', '#ffffff'],
    'paint-chip': ['#000000', '#ffffff'],
    'border-card': ['none', '1px solid #ffffff'],
    'shadow-card': ['none', '0 1px 2px #000000'],
  };
  for (const [key, [light, dark]] of Object.entries(variants)) {
    assert.doesNotThrow(() =>
      validateThemeContract(
        withToken(theme, key, { light: String(light), dark: String(dark) }),
      ),
    );
  }
  const invariants = {
    'space-1': ['1px', '2px'],
    'card-pad': ['1px', '2px'],
    'prose-leading': ['1', '2'],
    'duration-base': ['1ms', '2ms'],
    'ease-standard': ['linear', 'cubic-bezier(0.2, 0.8, 0.2, 1)'],
    'font-ui': ['Roboto', 'Arial'],
    'weight-ui': ['400', '500'],
    'quote-mark': ['none', 'open-quote'],
  };
  for (const [key, [light, dark]] of Object.entries(invariants)) {
    const candidate = withToken(theme, key, {
      light: String(light),
      dark: String(dark),
    });
    assert.throws(
      () => validateThemeContract(candidate),
      (error) =>
        error instanceof SemanticValidationError &&
        error.code === 'THEME_TOKEN_CATALOG_INVALID',
      key,
    );
  }
});

test('publication newsletter is an optional closed object with three required members', async () => {
  const base = JSON.parse(
    await readFile('examples/valid/publication/canonical.json', 'utf8'),
  );
  assert.equal(validateGalaDocument(PUBLICATION_ID, base).valid, true);
  const newsletter = {
    url: 'https://news.example.com/subscribe',
    title: 'The weekly letter',
    text: 'One email a week, no spam.',
  };
  assert.deepEqual(
    validateGalaDocument(PUBLICATION_ID, { ...base, newsletter }),
    { valid: true, diagnostics: [] },
  );
  const invalid = [
    { ...newsletter, url: undefined },
    { ...newsletter, title: undefined },
    { ...newsletter, text: undefined },
    { ...newsletter, url: 'http://news.example.com/subscribe' },
    { ...newsletter, url: 'https://user:pw@news.example.com/' },
    { ...newsletter, url: 'javascript:alert(1)' },
    { ...newsletter, title: '' },
    { ...newsletter, title: 'a'.repeat(81) },
    { ...newsletter, text: '' },
    { ...newsletter, text: 'a'.repeat(301) },
    { ...newsletter, extra: 'x' },
    { ...newsletter, title: 7 },
  ];
  for (const candidate of invalid) {
    assert.equal(
      validateGalaDocument(PUBLICATION_ID, {
        ...base,
        newsletter: JSON.parse(JSON.stringify(candidate)),
      }).valid,
      false,
      JSON.stringify(candidate),
    );
  }
  assert.equal(
    validateGalaDocument(PUBLICATION_ID, { ...base, newsletter: 'x' }).valid,
    false,
  );
  assert.equal(
    validateGalaDocument(PUBLICATION_ID, { ...base, newsletter: [] }).valid,
    false,
  );
});

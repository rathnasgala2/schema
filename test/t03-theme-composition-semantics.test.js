import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canonicalizeJcsBytes,
  sha256Tagged,
} from '../src/internal/canonical-jcs.js';
import spdxData from '../src/internal/generated/spdx-3.28.0.json' with { type: 'json' };
import { SemanticValidationError } from '../src/internal/semver.js';
import {
  computeTemplateStylingContractDigest,
  computeThemeConformanceEvidenceDigest,
  computeThemeConformanceInputDigest,
  computeThemeFixtureReleaseDigest,
  computeThemePackageIntegrity,
  validateTemplateComposition,
  validateTemplateStylingContract,
  validateThemeComposition,
  validateThemeConformanceResult,
  validateThemeContract,
  validateThemeFixtureRelease,
  validateThemePackage,
} from '../src/internal/theme-composition-semantics.js';

/** @typedef {Record<string, unknown>} UnknownRecord */

const SPDX_DIGEST =
  'sha256:293418a03e6692c44332a12eb17889af99e20a4d571adfaca4408b203f75686b';
const FIXTURE_RELEASE_ID = '018f0000-0000-7000-8000-000000000001';
const GOLDEN_DIGESTS = Object.freeze({
  styling:
    'sha256:c3b93ede30e29ff65983116804f09067b544c0b17b86edb91f6e06ac1943e774',
  fixture:
    'sha256:61df55155fd42b82f931b75ba30f9a112657aab8f2f314f820e1c11fb4e84256',
  input:
    'sha256:e6f35640273fcef03127dae563c489353f371d756632befae658cd3a25b483f7',
  evidence:
    'sha256:22133c7d98725683a60472add6daef7ac97340eac2f2a49f30f509d59c10e1af',
  integrity:
    'sha256:e35392c51d3a9c24fd0cb3ad5baf7fbc79dd3b587c4cb7e8da43ba2fcff2b642',
});

const TOKEN_CATALOG = [
  ['border-width', 'length'],
  ['color-accent', 'color'],
  ['color-border', 'color'],
  ['color-canvas', 'color'],
  ['color-code-canvas', 'color'],
  ['color-code-text', 'color'],
  ['color-danger', 'color'],
  ['color-focus', 'color'],
  ['color-link', 'color'],
  ['color-link-visited', 'color'],
  ['color-on-accent', 'color'],
  ['color-selection', 'color'],
  ['color-success', 'color'],
  ['color-surface', 'color'],
  ['color-surface-raised', 'color'],
  ['color-text', 'color'],
  ['color-text-muted', 'color'],
  ['color-warning', 'color'],
  ['content-measure', 'length'],
  ['focus-width', 'length'],
  ['font-body', 'font-family'],
  ['font-heading', 'font-family'],
  ['font-mono', 'font-family'],
  ['radius-medium', 'length'],
  ['radius-small', 'length'],
  ['space-1', 'length'],
  ['space-2', 'length'],
  ['space-3', 'length'],
  ['space-4', 'length'],
  ['space-6', 'length'],
  ['space-8', 'length'],
  ['weight-heading', 'font-weight'],
  ['weight-medium', 'font-weight'],
  ['weight-normal', 'font-weight'],
  ['weight-strong', 'font-weight'],
];

const THEME_IDENTITIES = [
  ['default', '@rathnasgala2/theme-default'],
  ['amaze', '@rathnasgala2/theme-amaze'],
  ['flashy', '@rathnasgala2/theme-flashy'],
  ['minimal', '@rathnasgala2/theme-minimal'],
  ['zebra', '@rathnasgala2/theme-zebra'],
];

const spdxTable = /** @type {{ licenses: [string, string][] }} */ (
  /** @type {unknown} */ (spdxData)
);
const apacheLicense = (() => {
  const selected = spdxTable.licenses.find(([id]) => id === 'Apache-2.0');
  if (!selected) throw new Error('SPDX test catalog is incomplete');
  return selected;
})();
const mitLicense = (() => {
  const selected = spdxTable.licenses.find(([id]) => id === 'MIT');
  if (!selected) throw new Error('SPDX test catalog is incomplete');
  return selected;
})();

/**
 * Return a distinct valid tagged digest.
 *
 * @param {string} nibble one lowercase hexadecimal nibble
 * @returns {string} tagged digest
 */
function digest(nibble) {
  return `sha256:${nibble.repeat(64)}`;
}

/**
 * Require a mutable plain object from a fixture.
 *
 * @param {unknown} value candidate object
 * @returns {UnknownRecord} required record
 */
function record(value) {
  assert.ok(
    value !== null && typeof value === 'object' && !Array.isArray(value),
  );
  return /** @type {UnknownRecord} */ (value);
}

/**
 * Require a mutable fixture array.
 *
 * @param {unknown} value candidate array
 * @returns {unknown[]} required array
 */
function array(value) {
  assert.ok(Array.isArray(value));
  return value;
}

/**
 * Require one array member.
 *
 * @template T
 * @param {T[]} values fixture values
 * @param {number} index required index
 * @returns {T} required member
 */
function required(values, index) {
  const value = values[index];
  if (value === undefined) throw new Error('invalid test fixture');
  return value;
}

/**
 * Assert one normalized semantic diagnostic.
 *
 * @param {() => unknown} action operation expected to reject
 * @param {string} code expected diagnostic code
 * @returns {void}
 */
function assertDiagnostic(action, code) {
  assert.throws(
    action,
    (error) => error instanceof SemanticValidationError && error.code === code,
  );
}

/**
 * Return byte-sorted strings.
 *
 * @param {string[]} values unsorted strings
 * @returns {string[]} sorted copy
 */
function utf8Sort(values) {
  return [...values].sort((left, right) =>
    Buffer.compare(Buffer.from(left), Buffer.from(right)),
  );
}

/**
 * Construct the exact 35 theme token rows.
 *
 * @returns {UnknownRecord[]} token rows
 */
function themeTokens() {
  return TOKEN_CATALOG.map(([key, type], index) => {
    if (!key || !type) throw new Error('invalid token fixture');
    let light = '1rem';
    let dark = '1rem';
    if (type === 'color') {
      light = `#${(index + 1).toString(16).padStart(6, '0')}`;
      dark = `#${(index + 101).toString(16).padStart(6, '0')}`;
    } else if (type === 'font-family') {
      light = 'Open Sans, Arial';
      dark = light;
    } else if (type === 'font-weight') {
      light = '400';
      dark = light;
    }
    return { key, type, light, dark };
  });
}

/**
 * Construct an empty CSS metric projection with selected counters.
 *
 * @param {UnknownRecord} [overrides] counter replacements
 * @returns {UnknownRecord} metric record
 */
function cssMetrics(overrides = {}) {
  return {
    tokens: 0,
    qualifiedRules: 0,
    declarations: 0,
    localUrls: 0,
    fontFaces: 0,
    pageRules: 0,
    mediaRules: 0,
    maximumBlockFunctionDepth: 1,
    commentBytes: 0,
    ...overrides,
  };
}

/**
 * Construct the selected template lock row.
 *
 * @returns {UnknownRecord} lock row
 */
function lockedTemplate() {
  return {
    package: '@rathnasgala2/template',
    version: '2.1.0',
    integrity: digest('1'),
    registry: 'https://registry.npmjs.org/',
    contractVersion: '2.0.0',
    compatibleWith: '^2.0.0',
    templateModules: [],
  };
}

/**
 * Construct the exact minimal template styling contract and retained bytes.
 *
 * @param {UnknownRecord} templateLock selected template lock row
 * @returns {{ contract: UnknownRecord, bytes: Uint8Array }} contract fixture
 */
function stylingFixture(templateLock) {
  const contract = {
    profile: 'gala-template-styling-contract-v2',
    contractVersion: '2.0.0',
    templatePackage: '@rathnasgala2/template',
    templateVersion: templateLock.version,
    orderedLayers: [
      'gala-tokens',
      'gala-components',
      'gala-utilities',
      'gala-print',
    ],
    stylesheetLayers: {
      tokens: 'gala-tokens',
      components: 'gala-components',
      utilities: 'gala-utilities',
      print: 'gala-print',
    },
    publicationRootSelector: '[data-gala-publication-root]',
    resolvedPaletteSelectors: {
      light:
        '[data-gala-publication-root][data-gala-resolved-color-mode="light"]',
      dark: '[data-gala-publication-root][data-gala-resolved-color-mode="dark"]',
    },
    typeSelectors: [],
    classSelectors: ['card'],
    idSelectors: [],
    attributes: [
      {
        name: 'data-gala-resolved-color-mode',
        match: 'exact-value',
        values: ['dark', 'light'],
        role: 'state',
      },
      {
        name: 'data-gala-publication-root',
        match: 'presence',
        values: [],
        role: 'root',
      },
    ],
    pseudoClasses: [],
    pseudoElements: ['after', 'before', 'marker', 'selection'],
    functionalPseudos: ['is', 'where', 'not', 'nth-child', 'nth-last-child'],
    combinators: [' ', ' > ', ' + ', ' ~ '],
    publicThemeSlotHooks: [{ hookId: 'card', selectorAtom: '.card' }],
    composition: {
      rootScope: 'first-compound-required',
      compoundOrder: [
        'type',
        'id',
        'class',
        'attribute',
        'pseudo-class',
        'pseudo-element',
      ],
      functionalSelectorArguments: 'compound-only',
      maximumFunctionalDepth: 1,
      nthExpressionProfile: 'gala-positive-an-plus-b-v2',
    },
    catalogDigest: digest('0'),
  };
  contract.catalogDigest = computeTemplateStylingContractDigest(contract);
  return { contract, bytes: canonicalizeJcsBytes(contract) };
}

/**
 * Construct the immutable fixture release and retained bytes.
 *
 * @param {string} stylingContractDigest styling catalog digest
 * @returns {{ release: UnknownRecord, bytes: Uint8Array }} release fixture
 */
function fixtureReleaseFixture(stylingContractDigest) {
  const release = {
    profile: 'gala-theme-fixture-release-v2',
    fixtureReleaseId: FIXTURE_RELEASE_ID,
    contractVersion: '2.0.0',
    browserPolicyRef: 'gala-theme-css-v2-20211224',
    binaryAssetProfile: 'gala-theme-binary-assets-v2',
    stylingContractDigest,
    runners: [
      { runnerId: 'binary', version: '2.0.0', executableDigest: digest('2') },
      { runnerId: 'css', version: '2.0.0', executableDigest: digest('3') },
    ],
    fixtures: [
      {
        fixtureId: 'binary-valid',
        runnerId: 'binary',
        inputDigest: digest('4'),
        expectedDisposition: 'accepted',
        expectedEvidenceDigest: digest('5'),
      },
      {
        fixtureId: 'css-valid',
        runnerId: 'css',
        inputDigest: digest('6'),
        expectedDisposition: 'accepted',
        expectedEvidenceDigest: digest('7'),
      },
    ],
    fixtureDigest: digest('0'),
  };
  release.fixtureDigest = computeThemeFixtureReleaseDigest(release);
  return { release, bytes: canonicalizeJcsBytes(release) };
}

/**
 * Construct a complete accepted theme composition fixture.
 *
 * @returns {{ theme: UnknownRecord, context: UnknownRecord }} theme fixture
 */
function completeFixture() {
  const templateLock = lockedTemplate();
  const styling = stylingFixture(templateLock);
  const releaseFixture = fixtureReleaseFixture(
    String(styling.contract.catalogDigest),
  );
  const tokens = themeTokens();
  const tokenValues = {
    light: Object.fromEntries(
      tokens.map((token) => [`--gala-${String(token.key)}`, token.light]),
    ),
    dark: Object.fromEntries(
      tokens.map((token) => [`--gala-${String(token.key)}`, token.dark]),
    ),
  };
  const tokenLines = tokens
    .map((token) => `  --gala-${String(token.key)}: ${String(token.light)};`)
    .join('\n');
  const darkTokenLines = tokens
    .map((token) => `  --gala-${String(token.key)}: ${String(token.dark)};`)
    .join('\n');
  /** @type {Record<string, Buffer>} */
  const rawFiles = {
    'tokens.css': Buffer.from(
      `@layer gala-tokens {\n[data-gala-publication-root][data-gala-resolved-color-mode="light"] {\n${tokenLines}\n}\n[data-gala-publication-root][data-gala-resolved-color-mode="dark"] {\n${darkTokenLines}\n}\n}\n`,
    ),
    'components.css': Buffer.from(
      '@layer gala-components {\n[data-gala-publication-root] .card { background-image: url("assets/icon.svg"); }\n}\n',
    ),
    'print.css': Buffer.from(
      '@layer gala-print {\n@page { margin: 1rem; }\n}\n',
    ),
    'assets/icon.svg': Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><path d="M 0 0 L 1 1"/></svg>',
    ),
  };
  /**
   * @param {string} path asset path
   * @param {string} mediaType asset media type
   * @returns {UnknownRecord} manifest asset
   */
  const asset = (path, mediaType) => {
    const bytes = rawFiles[path];
    if (!bytes) throw new Error('raw asset fixture missing');
    return {
      path,
      mediaType,
      byteLength: String(bytes.byteLength),
      sha256: sha256Tagged(bytes),
      license: 'Apache-2.0',
    };
  };
  const theme = {
    schemaId: 'urn:gala:schema:theme-contract:2.0.0',
    schemaVersion: '2.0.0',
    themeId: 'default',
    package: '@rathnasgala2/theme-default@2.0.0',
    contractVersion: '2.0.0',
    templateRange: '^2.0.0',
    stylesheets: ['tokens.css', 'components.css', 'print.css'],
    cssLayers: ['gala-tokens', 'gala-components', 'gala-print'],
    slotHooks: ['card'],
    tokens,
    modes: ['dark', 'light', 'system'],
    assets: [
      asset('tokens.css', 'text/css'),
      asset('components.css', 'text/css'),
      asset('print.css', 'text/css'),
      asset('assets/icon.svg', 'image/svg+xml'),
    ],
    fixtures: ['binary-valid', 'css-valid'],
    browserPolicyRef: 'gala-theme-css-v2-20211224',
    integrity: digest('0'),
    budgets: {
      maximumFileBytes: '1000000',
      maximumTotalBytes: '5000000',
      maximumFiles: 8,
    },
    fixtureDigest: releaseFixture.release.fixtureDigest,
    evidenceDigest: digest('0'),
    stylingContractDigest: styling.contract.catalogDigest,
  };
  const packageJson = {
    name: '@rathnasgala2/theme-default',
    version: '2.0.0',
    license: 'Apache-2.0',
    files: utf8Sort([
      'theme.json',
      'tokens.css',
      'components.css',
      'print.css',
      'assets/icon.svg',
    ]),
  };
  const licenseEvidence = {
    profile: 'gala-theme-license-evidence-v2',
    licenseListVersion: '3.28.0',
    licenseListDigest: SPDX_DIGEST,
    packageExpression: 'Apache-2.0',
    assetOverrides: [],
    catalogEntries: [
      { kind: 'license', id: apacheLicense[0], text: apacheLicense[1] },
    ],
  };
  const packageFiles = [
    {
      path: 'package.json',
      kind: 'file',
      mode: 0o644,
      bytes: canonicalizeJcsBytes(packageJson),
    },
    {
      path: 'theme.json',
      kind: 'file',
      mode: 0o644,
      bytes: canonicalizeJcsBytes(theme),
    },
    ...Object.entries(rawFiles).map(([path, bytes]) => ({
      path,
      kind: 'file',
      mode: 0o644,
      bytes,
    })),
    {
      path: 'LICENSE',
      kind: 'file',
      mode: 0o644,
      bytes: canonicalizeJcsBytes(licenseEvidence),
    },
    {
      path: 'README.md',
      kind: 'file',
      mode: 0o644,
      bytes: Buffer.from('# Default theme\n'),
    },
  ];
  const tokensCss = rawFiles['tokens.css'];
  const componentsCss = rawFiles['components.css'];
  const printCss = rawFiles['print.css'];
  const iconSvg = rawFiles['assets/icon.svg'];
  if (!tokensCss || !componentsCss || !printCss || !iconSvg) {
    throw new Error('raw package fixture is incomplete');
  }
  const cssEvidence = [
    {
      path: 'tokens.css',
      profile: 'gala-theme-css-v2-20211224',
      disposition: 'accepted',
      byteLength: String(tokensCss.byteLength),
      sha256: sha256Tagged(tokensCss),
      outerLayer: 'gala-tokens',
      usedSlotHookIds: [],
      referencedAssetPaths: [],
      fontFaceAssetPaths: [],
      metrics: cssMetrics({ tokens: 300, qualifiedRules: 2, declarations: 70 }),
      tokenDeclarations: {
        lightSelector:
          '[data-gala-publication-root][data-gala-resolved-color-mode="light"]',
        darkSelector:
          '[data-gala-publication-root][data-gala-resolved-color-mode="dark"]',
        ...tokenValues,
      },
    },
    {
      path: 'components.css',
      profile: 'gala-theme-css-v2-20211224',
      disposition: 'accepted',
      byteLength: String(componentsCss.byteLength),
      sha256: sha256Tagged(componentsCss),
      outerLayer: 'gala-components',
      usedSlotHookIds: ['card'],
      referencedAssetPaths: ['assets/icon.svg'],
      fontFaceAssetPaths: [],
      metrics: cssMetrics({
        tokens: 20,
        qualifiedRules: 1,
        declarations: 1,
        localUrls: 1,
      }),
    },
    {
      path: 'print.css',
      profile: 'gala-theme-css-v2-20211224',
      disposition: 'accepted',
      byteLength: String(printCss.byteLength),
      sha256: sha256Tagged(printCss),
      outerLayer: 'gala-print',
      usedSlotHookIds: [],
      referencedAssetPaths: [],
      fontFaceAssetPaths: [],
      metrics: cssMetrics({ tokens: 12, declarations: 1, pageRules: 1 }),
    },
  ];
  const passiveAssetEvidence = [
    {
      path: 'assets/icon.svg',
      mediaType: 'image/svg+xml',
      profile: 'gala-passive-svg-v2',
      disposition: 'accepted',
      byteLength: String(iconSvg.byteLength),
      sha256: sha256Tagged(iconSvg),
    },
  ];

  const inputDigest = computeThemeConformanceInputDigest(theme, packageFiles);
  const conformanceResult = {
    profile: 'gala-theme-conformance-result-v2',
    fixtureReleaseId: FIXTURE_RELEASE_ID,
    fixtureDigest: releaseFixture.release.fixtureDigest,
    themeConformanceInputDigest: inputDigest,
    results: [
      {
        fixtureId: 'binary-valid',
        runnerId: 'binary',
        observedDisposition: 'accepted',
        observedEvidenceDigest: digest('5'),
        state: 'pass',
      },
      {
        fixtureId: 'css-valid',
        runnerId: 'css',
        observedDisposition: 'accepted',
        observedEvidenceDigest: digest('7'),
        state: 'pass',
      },
    ],
    overallState: 'pass',
    evidenceDigest: digest('0'),
  };
  conformanceResult.evidenceDigest =
    computeThemeConformanceEvidenceDigest(conformanceResult);
  theme.evidenceDigest = conformanceResult.evidenceDigest;
  theme.integrity = computeThemePackageIntegrity(theme, packageFiles);
  const themeFile = packageFiles.find((file) => file.path === 'theme.json');
  if (!themeFile) throw new Error('theme fixture file missing');
  themeFile.bytes = canonicalizeJcsBytes(theme);

  return {
    theme,
    context: {
      lockedTheme: {
        package: '@rathnasgala2/theme-default',
        version: '2.0.0',
        integrity: digest('a'),
        registry: 'https://registry.npmjs.org/',
        contractVersion: '2.0.0',
        compatibleWith: '^2.0.0',
      },
      lockedTemplate: templateLock,
      templateStylingContract: styling.contract,
      templateStylingContractBytes: styling.bytes,
      fixtureRelease: releaseFixture.release,
      fixtureReleaseBytes: releaseFixture.bytes,
      conformanceResult,
      conformanceResultBytes: canonicalizeJcsBytes(conformanceResult),
      packageFiles,
      cssEvidence: {
        runner: structuredClone(
          required(array(releaseFixture.release.runners), 1),
        ),
        records: cssEvidence,
      },
      passiveAssetEvidence: {
        runner: structuredClone(
          required(array(releaseFixture.release.runners), 0),
        ),
        records: passiveAssetEvidence,
      },
      acceptedBudgetCeilings: {
        maximumFileBytes: '1000000',
        maximumTotalBytes: '5000000',
        maximumFiles: 8,
      },
    },
  };
}

/**
 * Return one package file from a complete fixture.
 *
 * @param {UnknownRecord} context complete validation context
 * @param {string} path required package path
 * @returns {UnknownRecord} package file row
 */
function packageFile(context, path) {
  const match = array(context.packageFiles)
    .map(record)
    .find((candidate) => candidate.path === path);
  if (!match) throw new Error('package file fixture missing');
  return match;
}

/**
 * Return mutable records from one retained trusted-runner evidence envelope.
 *
 * @param {UnknownRecord} context complete validation context
 * @param {'cssEvidence' | 'passiveAssetEvidence'} member evidence member
 * @returns {unknown[]} retained evidence records
 */
function runnerEvidenceRecords(context, member) {
  return array(record(context[member]).records);
}

test('template-composition admits only its two exact discriminator fields', () => {
  assert.doesNotThrow(() =>
    validateTemplateComposition({
      schemaId: 'urn:gala:schema:template-composition:2.0.0',
      schemaVersion: '2.0.0',
    }),
  );
  for (const property of [
    'interactions',
    'whitelabel',
    'newsletter',
    'prism',
    'extensions',
    'unknown',
  ]) {
    assertDiagnostic(
      () =>
        validateTemplateComposition({
          schemaId: 'urn:gala:schema:template-composition:2.0.0',
          schemaVersion: '2.0.0',
          [property]: {},
        }),
      'TEMPLATE_COMPOSITION_INVALID',
    );
  }
});

test('the five identities and exact 35-token order, types, grammars, and palettes are closed', () => {
  const base = completeFixture();
  for (const [themeId, packageName] of THEME_IDENTITIES) {
    const candidate = structuredClone(base.theme);
    candidate.themeId = themeId;
    candidate.package = `${packageName}@2.0.0`;
    assert.doesNotThrow(() => validateThemeContract(candidate));
  }

  const utilitiesVariant = structuredClone(base.theme);
  utilitiesVariant.stylesheets = [
    'tokens.css',
    'components.css',
    'utilities.css',
    'print.css',
  ];
  utilitiesVariant.cssLayers = [
    'gala-tokens',
    'gala-components',
    'gala-utilities',
    'gala-print',
  ];
  assert.doesNotThrow(() => validateThemeContract(utilitiesVariant));
  for (const [themeId, packageName] of THEME_IDENTITIES) {
    for (const [otherId] of THEME_IDENTITIES) {
      if (themeId === otherId) continue;
      const candidate = structuredClone(base.theme);
      candidate.themeId = otherId;
      candidate.package = `${packageName}@2.0.0`;
      assertDiagnostic(
        () => validateThemeContract(candidate),
        'THEME_CONTRACT_INVALID',
      );
    }
  }

  const reordered = structuredClone(base.theme);
  array(reordered.tokens).reverse();
  assertDiagnostic(
    () => validateThemeContract(reordered),
    'THEME_TOKEN_CATALOG_INVALID',
  );

  const wrongType = structuredClone(base.theme);
  record(required(array(wrongType.tokens), 0)).type = 'color';
  assertDiagnostic(
    () => validateThemeContract(wrongType),
    'THEME_TOKEN_CATALOG_INVALID',
  );

  const executableValue = structuredClone(base.theme);
  record(required(array(executableValue.tokens), 1)).light = 'var(--attack)';
  assertDiagnostic(
    () => validateThemeContract(executableValue),
    'THEME_TOKEN_CATALOG_INVALID',
  );

  const paletteDrift = structuredClone(base.theme);
  record(required(array(paletteDrift.tokens), 0)).dark = '2rem';
  assertDiagnostic(
    () => validateThemeContract(paletteDrift),
    'THEME_TOKEN_CATALOG_INVALID',
  );
});

test('the template styling contract closes every catalog, hook atom, constant, digest, and byte copy', () => {
  const built = completeFixture();
  const context = built.context;
  assert.doesNotThrow(() =>
    validateTemplateStylingContract(context.templateStylingContract, {
      bytes: context.templateStylingContractBytes,
      lockedTemplate: context.lockedTemplate,
    }),
  );

  const badHook = record(structuredClone(context.templateStylingContract));
  record(required(array(badHook.publicThemeSlotHooks), 0)).selectorAtom =
    '.private';
  badHook.catalogDigest = computeTemplateStylingContractDigest(badHook);
  assertDiagnostic(
    () =>
      validateTemplateStylingContract(badHook, {
        bytes: canonicalizeJcsBytes(badHook),
        lockedTemplate: context.lockedTemplate,
      }),
    'TEMPLATE_STYLING_CONTRACT_INVALID',
  );

  const wrongRoot = record(structuredClone(context.templateStylingContract));
  wrongRoot.publicationRootSelector = '[data-root]';
  wrongRoot.catalogDigest = computeTemplateStylingContractDigest(wrongRoot);
  assertDiagnostic(
    () =>
      validateTemplateStylingContract(wrongRoot, {
        bytes: canonicalizeJcsBytes(wrongRoot),
        lockedTemplate: context.lockedTemplate,
      }),
    'TEMPLATE_STYLING_CONTRACT_INVALID',
  );

  const nameSortedAttributes = record(
    structuredClone(context.templateStylingContract),
  );
  array(nameSortedAttributes.attributes).reverse();
  nameSortedAttributes.catalogDigest =
    computeTemplateStylingContractDigest(nameSortedAttributes);
  assertDiagnostic(
    () =>
      validateTemplateStylingContract(nameSortedAttributes, {
        bytes: canonicalizeJcsBytes(nameSortedAttributes),
        lockedTemplate: context.lockedTemplate,
      }),
    'TEMPLATE_STYLING_CONTRACT_INVALID',
  );

  assertDiagnostic(
    () =>
      validateTemplateStylingContract(context.templateStylingContract, {
        bytes: Buffer.from('{}'),
        lockedTemplate: context.lockedTemplate,
      }),
    'TEMPLATE_STYLING_CONTRACT_INVALID',
  );
});

test('fixture release and conformance rows enforce sort, set equality, derived state, and self-excluding digests', () => {
  const built = completeFixture();
  const context = built.context;
  assert.doesNotThrow(() =>
    validateThemeFixtureRelease(context.fixtureRelease, {
      bytes: context.fixtureReleaseBytes,
      stylingContractDigest: built.theme.stylingContractDigest,
    }),
  );
  assert.doesNotThrow(() =>
    validateThemeConformanceResult(context.conformanceResult, {
      bytes: context.conformanceResultBytes,
      fixtureRelease: context.fixtureRelease,
      themeConformanceInputDigest: record(context.conformanceResult)
        .themeConformanceInputDigest,
    }),
  );

  const reorderedRelease = record(structuredClone(context.fixtureRelease));
  array(reorderedRelease.runners).reverse();
  reorderedRelease.fixtureDigest =
    computeThemeFixtureReleaseDigest(reorderedRelease);
  assertDiagnostic(
    () =>
      validateThemeFixtureRelease(reorderedRelease, {
        bytes: canonicalizeJcsBytes(reorderedRelease),
        stylingContractDigest: built.theme.stylingContractDigest,
      }),
    'THEME_FIXTURE_RELEASE_INVALID',
  );

  const falsePass = record(structuredClone(context.conformanceResult));
  record(required(array(falsePass.results), 0)).observedDisposition =
    'rejected';
  falsePass.evidenceDigest = computeThemeConformanceEvidenceDigest(falsePass);
  assertDiagnostic(
    () =>
      validateThemeConformanceResult(falsePass, {
        bytes: canonicalizeJcsBytes(falsePass),
        fixtureRelease: context.fixtureRelease,
        themeConformanceInputDigest: falsePass.themeConformanceInputDigest,
      }),
    'THEME_CONFORMANCE_RESULT_INVALID',
  );
});

test('the complete package and composition validate with acyclic distinct digest projections', () => {
  const built = completeFixture();
  const context = built.context;
  assert.doesNotThrow(() =>
    validateThemePackage(built.theme, {
      packageFiles: context.packageFiles,
      cssEvidence: context.cssEvidence,
      passiveAssetEvidence: context.passiveAssetEvidence,
      stylingContract: context.templateStylingContract,
      fixtureRelease: context.fixtureRelease,
      acceptedBudgetCeilings: context.acceptedBudgetCeilings,
    }),
  );
  assert.doesNotThrow(() => validateThemeComposition(built.theme, context));
  assert.equal(
    built.theme.integrity,
    computeThemePackageIntegrity(built.theme, context.packageFiles),
  );
  assert.equal(
    record(context.conformanceResult).themeConformanceInputDigest,
    computeThemeConformanceInputDigest(built.theme, context.packageFiles),
  );
  assert.notEqual(built.theme.integrity, record(context.lockedTheme).integrity);
  assert.notEqual(
    built.theme.integrity,
    record(context.conformanceResult).themeConformanceInputDigest,
  );
  assert.deepEqual(
    {
      styling: built.theme.stylingContractDigest,
      fixture: built.theme.fixtureDigest,
      input: record(context.conformanceResult).themeConformanceInputDigest,
      evidence: built.theme.evidenceDigest,
      integrity: built.theme.integrity,
    },
    GOLDEN_DIGESTS,
  );

  const stylingSelfMutation = structuredClone(context.templateStylingContract);
  record(stylingSelfMutation).catalogDigest = digest('f');
  assert.equal(
    computeTemplateStylingContractDigest(stylingSelfMutation),
    GOLDEN_DIGESTS.styling,
  );
  const fixtureSelfMutation = structuredClone(context.fixtureRelease);
  record(fixtureSelfMutation).fixtureDigest = digest('f');
  assert.equal(
    computeThemeFixtureReleaseDigest(fixtureSelfMutation),
    GOLDEN_DIGESTS.fixture,
  );
  const resultSelfMutation = structuredClone(context.conformanceResult);
  record(resultSelfMutation).evidenceDigest = digest('f');
  assert.equal(
    computeThemeConformanceEvidenceDigest(resultSelfMutation),
    GOLDEN_DIGESTS.evidence,
  );
  const inputSelfMutation = structuredClone(built.theme);
  inputSelfMutation.integrity = digest('f');
  inputSelfMutation.evidenceDigest = digest('e');
  assert.equal(
    computeThemeConformanceInputDigest(inputSelfMutation, context.packageFiles),
    GOLDEN_DIGESTS.input,
  );
  const integritySelfMutation = structuredClone(built.theme);
  integritySelfMutation.integrity = digest('f');
  assert.equal(
    computeThemePackageIntegrity(integritySelfMutation, context.packageFiles),
    GOLDEN_DIGESTS.integrity,
  );
});

test('package inventory, modes, paths, byte bindings, manifests, licenses, and policy ceilings fail closed', () => {
  const extraMember = completeFixture();
  array(extraMember.context.packageFiles).push({
    path: 'script.js',
    kind: 'file',
    mode: 0o644,
    bytes: Buffer.from('alert(1)'),
  });
  assertDiagnostic(
    () =>
      validateThemePackage(extraMember.theme, {
        packageFiles: extraMember.context.packageFiles,
        cssEvidence: extraMember.context.cssEvidence,
        passiveAssetEvidence: extraMember.context.passiveAssetEvidence,
        stylingContract: extraMember.context.templateStylingContract,
        fixtureRelease: extraMember.context.fixtureRelease,
        acceptedBudgetCeilings: extraMember.context.acceptedBudgetCeilings,
      }),
    'THEME_PACKAGE_INVALID',
  );

  const reservedPath = completeFixture();
  packageFile(reservedPath.context, 'README.md').path = 'CON';
  assertDiagnostic(
    () => validateThemeComposition(reservedPath.theme, reservedPath.context),
    'THEME_PACKAGE_INVALID',
  );

  const unicodeCollision = completeFixture();
  array(unicodeCollision.context.packageFiles).push({
    path: 'assets/\ua7ce.svg',
    kind: 'file',
    mode: 0o644,
    bytes: Buffer.from('collision'),
  });
  array(unicodeCollision.context.packageFiles).push({
    path: 'assets/\ua7cf.svg',
    kind: 'file',
    mode: 0o644,
    bytes: Buffer.from('collision'),
  });
  assertDiagnostic(
    () =>
      validateThemeComposition(
        unicodeCollision.theme,
        unicodeCollision.context,
      ),
    'THEME_PACKAGE_INVALID',
  );

  const executableMode = completeFixture();
  packageFile(executableMode.context, 'README.md').mode = 0o755;
  assertDiagnostic(
    () =>
      validateThemeComposition(executableMode.theme, executableMode.context),
    'THEME_PACKAGE_INVALID',
  );

  const wrongAssetDigest = completeFixture();
  record(required(array(wrongAssetDigest.theme.assets), 3)).sha256 =
    digest('f');
  packageFile(wrongAssetDigest.context, 'theme.json').bytes =
    canonicalizeJcsBytes(wrongAssetDigest.theme);
  assertDiagnostic(
    () =>
      validateThemePackage(wrongAssetDigest.theme, {
        packageFiles: wrongAssetDigest.context.packageFiles,
        cssEvidence: wrongAssetDigest.context.cssEvidence,
        passiveAssetEvidence: wrongAssetDigest.context.passiveAssetEvidence,
        stylingContract: wrongAssetDigest.context.templateStylingContract,
        fixtureRelease: wrongAssetDigest.context.fixtureRelease,
        acceptedBudgetCeilings: wrongAssetDigest.context.acceptedBudgetCeilings,
      }),
    'THEME_PACKAGE_INVALID',
  );

  const lifecycleField = completeFixture();
  const packageJsonFile = packageFile(lifecycleField.context, 'package.json');
  packageJsonFile.bytes = canonicalizeJcsBytes({
    ...record(
      JSON.parse(
        Buffer.from(/** @type {Uint8Array} */ (packageJsonFile.bytes)).toString(
          'utf8',
        ),
      ),
    ),
    scripts: { postinstall: 'attack' },
  });
  assertDiagnostic(
    () =>
      validateThemeComposition(lifecycleField.theme, lifecycleField.context),
    'THEME_PACKAGE_INVALID',
  );

  const clippedBudget = completeFixture();
  record(clippedBudget.context.acceptedBudgetCeilings).maximumFileBytes = '100';
  assertDiagnostic(
    () => validateThemeComposition(clippedBudget.theme, clippedBudget.context),
    'THEME_PACKAGE_INVALID',
  );

  const staleIntegrity = completeFixture();
  staleIntegrity.theme.integrity = digest('f');
  packageFile(staleIntegrity.context, 'theme.json').bytes =
    canonicalizeJcsBytes(staleIntegrity.theme);
  assertDiagnostic(
    () =>
      validateThemePackage(staleIntegrity.theme, {
        packageFiles: staleIntegrity.context.packageFiles,
        cssEvidence: staleIntegrity.context.cssEvidence,
        passiveAssetEvidence: staleIntegrity.context.passiveAssetEvidence,
        stylingContract: staleIntegrity.context.templateStylingContract,
        fixtureRelease: staleIntegrity.context.fixtureRelease,
        acceptedBudgetCeilings: staleIntegrity.context.acceptedBudgetCeilings,
      }),
    'THEME_PACKAGE_INVALID',
  );
});

test('package SPDX inheritance, exact overrides, and full-JCS set ordering admit', () => {
  const built = completeFixture();
  const secondSvg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1"/></svg>',
  );
  record(required(array(built.theme.assets), 3)).license = 'MIT';
  array(built.theme.assets).push({
    path: 'assets/z.svg',
    mediaType: 'image/svg+xml',
    byteLength: String(secondSvg.byteLength),
    sha256: sha256Tagged(secondSvg),
    license: '(Apache-2.0 AND MIT)',
  });
  array(built.context.packageFiles).push({
    path: 'assets/z.svg',
    kind: 'file',
    mode: 0o644,
    bytes: secondSvg,
  });
  built.theme.budgets = {
    maximumFileBytes: '1000000',
    maximumTotalBytes: '5000000',
    maximumFiles: 9,
  };
  record(built.context.acceptedBudgetCeilings).maximumFiles = 9;

  const packageJsonFile = packageFile(built.context, 'package.json');
  const packageJson = record(
    JSON.parse(
      Buffer.from(/** @type {Uint8Array} */ (packageJsonFile.bytes)).toString(
        'utf8',
      ),
    ),
  );
  packageJson.files = utf8Sort([
    ...array(packageJson.files).map(String),
    'assets/z.svg',
  ]);
  packageJsonFile.bytes = canonicalizeJcsBytes(packageJson);

  const componentsBytes = Buffer.from(
    '@layer gala-components {\n[data-gala-publication-root] .card { background-image: url("assets/icon.svg"); }\n[data-gala-publication-root] .card::before { background-image: url("assets/z.svg"); }\n}\n',
  );
  packageFile(built.context, 'components.css').bytes = componentsBytes;
  const componentsAsset = record(required(array(built.theme.assets), 1));
  componentsAsset.byteLength = String(componentsBytes.byteLength);
  componentsAsset.sha256 = sha256Tagged(componentsBytes);
  const componentsEvidence = record(
    required(runnerEvidenceRecords(built.context, 'cssEvidence'), 1),
  );
  componentsEvidence.byteLength = String(componentsBytes.byteLength);
  componentsEvidence.sha256 = sha256Tagged(componentsBytes);
  componentsEvidence.referencedAssetPaths = ['assets/icon.svg', 'assets/z.svg'];
  componentsEvidence.metrics = cssMetrics({
    tokens: 40,
    qualifiedRules: 2,
    declarations: 2,
    localUrls: 2,
  });
  runnerEvidenceRecords(built.context, 'passiveAssetEvidence').push({
    path: 'assets/z.svg',
    mediaType: 'image/svg+xml',
    profile: 'gala-passive-svg-v2',
    disposition: 'accepted',
    byteLength: String(secondSvg.byteLength),
    sha256: sha256Tagged(secondSvg),
  });

  const evidence = {
    profile: 'gala-theme-license-evidence-v2',
    licenseListVersion: '3.28.0',
    licenseListDigest: SPDX_DIGEST,
    packageExpression: 'Apache-2.0',
    assetOverrides: [
      { path: 'assets/icon.svg', expression: 'MIT' },
      { path: 'assets/z.svg', expression: '(Apache-2.0 AND MIT)' },
    ].sort((left, right) =>
      Buffer.compare(canonicalizeJcsBytes(left), canonicalizeJcsBytes(right)),
    ),
    catalogEntries: [
      { kind: 'license', id: apacheLicense[0], text: apacheLicense[1] },
      { kind: 'license', id: mitLicense[0], text: mitLicense[1] },
    ].sort((left, right) =>
      Buffer.compare(canonicalizeJcsBytes(left), canonicalizeJcsBytes(right)),
    ),
  };
  assert.deepEqual(
    evidence.assetOverrides.map(({ path }) => path),
    ['assets/z.svg', 'assets/icon.svg'],
  );
  packageFile(built.context, 'LICENSE').bytes = canonicalizeJcsBytes(evidence);
  built.theme.integrity = computeThemePackageIntegrity(
    built.theme,
    built.context.packageFiles,
  );
  packageFile(built.context, 'theme.json').bytes = canonicalizeJcsBytes(
    built.theme,
  );
  assert.doesNotThrow(() =>
    validateThemePackage(built.theme, {
      packageFiles: built.context.packageFiles,
      cssEvidence: built.context.cssEvidence,
      passiveAssetEvidence: built.context.passiveAssetEvidence,
      stylingContract: built.context.templateStylingContract,
      fixtureRelease: built.context.fixtureRelease,
      acceptedBudgetCeilings: built.context.acceptedBudgetCeilings,
    }),
  );

  evidence.assetOverrides.reverse();
  packageFile(built.context, 'LICENSE').bytes = canonicalizeJcsBytes(evidence);
  built.theme.integrity = computeThemePackageIntegrity(
    built.theme,
    built.context.packageFiles,
  );
  packageFile(built.context, 'theme.json').bytes = canonicalizeJcsBytes(
    built.theme,
  );
  assertDiagnostic(
    () =>
      validateThemePackage(built.theme, {
        packageFiles: built.context.packageFiles,
        cssEvidence: built.context.cssEvidence,
        passiveAssetEvidence: built.context.passiveAssetEvidence,
        stylingContract: built.context.templateStylingContract,
        fixtureRelease: built.context.fixtureRelease,
        acceptedBudgetCeilings: built.context.acceptedBudgetCeilings,
      }),
    'THEME_PACKAGE_INVALID',
  );
});

test('pinned CSS, SVG, and binary evidence binds runners, source bytes, projections, and limits', () => {
  /** @type {readonly (readonly ['runnerId' | 'version' | 'executableDigest', string])[]} */
  const cssRunnerSubstitutions = [
    ['runnerId', 'binary'],
    ['version', '2.0.1'],
    ['executableDigest', digest('f')],
  ];
  for (const [member, replacement] of cssRunnerSubstitutions) {
    const substitutedCssRunner = completeFixture();
    record(record(substitutedCssRunner.context.cssEvidence).runner)[member] =
      replacement;
    assertDiagnostic(
      () =>
        validateThemeComposition(
          substitutedCssRunner.theme,
          substitutedCssRunner.context,
        ),
      'THEME_CSS_EVIDENCE_INVALID',
    );
  }

  const substitutedBinaryRunner = completeFixture();
  record(
    record(substitutedBinaryRunner.context.passiveAssetEvidence).runner,
  ).executableDigest = digest('f');
  assertDiagnostic(
    () =>
      validateThemeComposition(
        substitutedBinaryRunner.theme,
        substitutedBinaryRunner.context,
      ),
    'THEME_PASSIVE_ASSET_EVIDENCE_INVALID',
  );

  const binaryAsset = completeFixture();
  const pngBytes = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  );
  const pngFile = packageFile(binaryAsset.context, 'assets/icon.svg');
  pngFile.path = 'assets/icon.png';
  pngFile.bytes = pngBytes;
  const pngAsset = record(required(array(binaryAsset.theme.assets), 3));
  pngAsset.path = 'assets/icon.png';
  pngAsset.mediaType = 'image/png';
  pngAsset.byteLength = String(pngBytes.byteLength);
  pngAsset.sha256 = sha256Tagged(pngBytes);
  const binaryPackageJsonFile = packageFile(
    binaryAsset.context,
    'package.json',
  );
  const binaryPackageJson = record(
    JSON.parse(
      Buffer.from(
        /** @type {Uint8Array} */ (binaryPackageJsonFile.bytes),
      ).toString('utf8'),
    ),
  );
  binaryPackageJson.files = utf8Sort(
    array(binaryPackageJson.files).map((path) =>
      path === 'assets/icon.svg' ? 'assets/icon.png' : String(path),
    ),
  );
  binaryPackageJsonFile.bytes = canonicalizeJcsBytes(binaryPackageJson);
  const binaryComponentsBytes = Buffer.from(
    '@layer gala-components {\n[data-gala-publication-root] .card { background-image: url("assets/icon.png"); }\n}\n',
  );
  packageFile(binaryAsset.context, 'components.css').bytes =
    binaryComponentsBytes;
  const binaryComponentsAsset = record(
    required(array(binaryAsset.theme.assets), 1),
  );
  binaryComponentsAsset.byteLength = String(binaryComponentsBytes.byteLength);
  binaryComponentsAsset.sha256 = sha256Tagged(binaryComponentsBytes);
  const binaryCssEvidence = record(
    required(runnerEvidenceRecords(binaryAsset.context, 'cssEvidence'), 1),
  );
  binaryCssEvidence.byteLength = String(binaryComponentsBytes.byteLength);
  binaryCssEvidence.sha256 = sha256Tagged(binaryComponentsBytes);
  binaryCssEvidence.referencedAssetPaths = ['assets/icon.png'];
  const binaryEvidence = record(
    required(
      runnerEvidenceRecords(binaryAsset.context, 'passiveAssetEvidence'),
      0,
    ),
  );
  binaryEvidence.path = 'assets/icon.png';
  binaryEvidence.mediaType = 'image/png';
  binaryEvidence.profile = 'gala-theme-binary-assets-v2';
  binaryEvidence.byteLength = String(pngBytes.byteLength);
  binaryEvidence.sha256 = sha256Tagged(pngBytes);
  binaryAsset.theme.integrity = computeThemePackageIntegrity(
    binaryAsset.theme,
    binaryAsset.context.packageFiles,
  );
  packageFile(binaryAsset.context, 'theme.json').bytes = canonicalizeJcsBytes(
    binaryAsset.theme,
  );
  assert.doesNotThrow(() =>
    validateThemePackage(binaryAsset.theme, {
      packageFiles: binaryAsset.context.packageFiles,
      cssEvidence: binaryAsset.context.cssEvidence,
      passiveAssetEvidence: binaryAsset.context.passiveAssetEvidence,
      stylingContract: binaryAsset.context.templateStylingContract,
      fixtureRelease: binaryAsset.context.fixtureRelease,
      acceptedBudgetCeilings: binaryAsset.context.acceptedBudgetCeilings,
    }),
  );

  const wrongLayer = completeFixture();
  record(
    required(runnerEvidenceRecords(wrongLayer.context, 'cssEvidence'), 1),
  ).outerLayer = 'gala-utilities';
  assertDiagnostic(
    () => validateThemeComposition(wrongLayer.theme, wrongLayer.context),
    'THEME_CSS_EVIDENCE_INVALID',
  );

  const undeclaredHook = completeFixture();
  record(
    required(runnerEvidenceRecords(undeclaredHook.context, 'cssEvidence'), 1),
  ).usedSlotHookIds = ['private'];
  assertDiagnostic(
    () =>
      validateThemeComposition(undeclaredHook.theme, undeclaredHook.context),
    'THEME_CSS_EVIDENCE_INVALID',
  );

  const unreferencedAsset = completeFixture();
  record(
    required(
      runnerEvidenceRecords(unreferencedAsset.context, 'cssEvidence'),
      1,
    ),
  ).referencedAssetPaths = [];
  assertDiagnostic(
    () =>
      validateThemeComposition(
        unreferencedAsset.theme,
        unreferencedAsset.context,
      ),
    'THEME_CSS_EVIDENCE_INVALID',
  );

  const tokenDrift = completeFixture();
  const tokenDeclarations = record(
    record(
      required(runnerEvidenceRecords(tokenDrift.context, 'cssEvidence'), 0),
    ).tokenDeclarations,
  );
  record(tokenDeclarations.light)['--gala-color-accent'] = '#ffffff';
  assertDiagnostic(
    () => validateThemeComposition(tokenDrift.theme, tokenDrift.context),
    'THEME_CSS_EVIDENCE_INVALID',
  );

  const parserReject = completeFixture();
  record(
    required(
      runnerEvidenceRecords(parserReject.context, 'passiveAssetEvidence'),
      0,
    ),
  ).disposition = 'rejected';
  assertDiagnostic(
    () => validateThemeComposition(parserReject.theme, parserReject.context),
    'THEME_PASSIVE_ASSET_EVIDENCE_INVALID',
  );

  const escapedCss = completeFixture();
  const escapedBytes = Buffer.from(
    '@layer gala-components {\n[data-gala-publication-root] .c\\61rd {}\n}\n',
  );
  packageFile(escapedCss.context, 'components.css').bytes = escapedBytes;
  const manifestAsset = record(required(array(escapedCss.theme.assets), 1));
  manifestAsset.byteLength = String(escapedBytes.byteLength);
  manifestAsset.sha256 = sha256Tagged(escapedBytes);
  const parserEvidence = record(
    required(runnerEvidenceRecords(escapedCss.context, 'cssEvidence'), 1),
  );
  parserEvidence.byteLength = String(escapedBytes.byteLength);
  parserEvidence.sha256 = sha256Tagged(escapedBytes);
  packageFile(escapedCss.context, 'theme.json').bytes = canonicalizeJcsBytes(
    escapedCss.theme,
  );
  assertDiagnostic(
    () =>
      validateThemePackage(escapedCss.theme, {
        packageFiles: escapedCss.context.packageFiles,
        cssEvidence: escapedCss.context.cssEvidence,
        passiveAssetEvidence: escapedCss.context.passiveAssetEvidence,
        stylingContract: escapedCss.context.templateStylingContract,
        fixtureRelease: escapedCss.context.fixtureRelease,
        acceptedBudgetCeilings: escapedCss.context.acceptedBudgetCeilings,
      }),
    'THEME_CSS_EVIDENCE_INVALID',
  );
});

test('fixture, conformance-input, evidence, and final integrity copies cannot substitute for one another', () => {
  const fixtureCopy = completeFixture();
  fixtureCopy.theme.fixtureDigest = digest('f');
  packageFile(fixtureCopy.context, 'theme.json').bytes = canonicalizeJcsBytes(
    fixtureCopy.theme,
  );
  assertDiagnostic(
    () => validateThemeComposition(fixtureCopy.theme, fixtureCopy.context),
    'THEME_COMPOSITION_INVALID',
  );

  const evidenceCopy = completeFixture();
  evidenceCopy.theme.evidenceDigest = digest('e');
  evidenceCopy.theme.integrity = computeThemePackageIntegrity(
    evidenceCopy.theme,
    evidenceCopy.context.packageFiles,
  );
  packageFile(evidenceCopy.context, 'theme.json').bytes = canonicalizeJcsBytes(
    evidenceCopy.theme,
  );
  assertDiagnostic(
    () => validateThemeComposition(evidenceCopy.theme, evidenceCopy.context),
    'THEME_COMPOSITION_INVALID',
  );

  const integrityCopy = completeFixture();
  integrityCopy.theme.integrity = record(
    integrityCopy.context.conformanceResult,
  ).themeConformanceInputDigest;
  packageFile(integrityCopy.context, 'theme.json').bytes = canonicalizeJcsBytes(
    integrityCopy.theme,
  );
  assertDiagnostic(
    () => validateThemeComposition(integrityCopy.theme, integrityCopy.context),
    'THEME_PACKAGE_INVALID',
  );

  const otherInput = completeFixture();
  record(otherInput.context.conformanceResult).themeConformanceInputDigest =
    digest('d');
  record(otherInput.context.conformanceResult).evidenceDigest =
    computeThemeConformanceEvidenceDigest(otherInput.context.conformanceResult);
  otherInput.context.conformanceResultBytes = canonicalizeJcsBytes(
    otherInput.context.conformanceResult,
  );
  assertDiagnostic(
    () => validateThemeComposition(otherInput.theme, otherInput.context),
    'THEME_CONFORMANCE_RESULT_INVALID',
  );
});

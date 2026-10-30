import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import { Ajv2020 } from 'ajv/dist/2020.js';
import formatsPlugin from 'ajv-formats';

import rawDiagnosticMap from '../diagnostics/diagnostic-map.json' with { type: 'json' };
import { GALA_SCHEMA_IDS, validateGalaDocument } from '../src/index.js';

/**
 * The real, committed diagnostic map -- the same one
 * `src/internal/schema-validator.js` and
 * `src/internal/browser-schema-validator.js` bind into production --
 * imported here so `createValidatorSuite` is exercised against its actual
 * shape instead of an empty stand-in.
 *
 * @type {import('../src/internal/validator-core.js').DiagnosticMap}
 */
const diagnosticMap =
  /** @type {import('../src/internal/validator-core.js').DiagnosticMap} */ (
    rawDiagnosticMap
  );

/**
 * Parse one committed JSON file.
 *
 * @param {string} file repository-relative file
 * @returns {Promise<any>} parsed JSON
 */
async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

test('the public registry exposes exactly the twenty-two accepted roots', async () => {
  const manifest = await readJson('fixtures/manifest.json');
  assert.deepEqual(
    GALA_SCHEMA_IDS,
    manifest.schemas
      .map((/** @type {{schemaId: string}} */ { schemaId }) => schemaId)
      .sort(),
  );
  assert.equal(new Set(GALA_SCHEMA_IDS).size, 22);
});

test('the public validator accepts a canonical document', async () => {
  const value = await readJson('examples/valid/repository/canonical.json');
  assert.deepEqual(validateGalaDocument(value.schemaId, value), {
    valid: true,
    diagnostics: [],
  });
});

test('content frontmatter admits the closed optional seo block', async () => {
  const base = await readJson(
    'examples/valid/content-frontmatter/canonical.json',
  );
  const withSeo = (/** @type {unknown} */ seo) => ({ ...base, seo });
  const valid = (/** @type {unknown} */ seo) =>
    validateGalaDocument(base.schemaId, withSeo(seo)).valid;
  assert.equal(validateGalaDocument(base.schemaId, base).valid, true);
  assert.equal(valid({}), true);
  assert.equal(
    valid({
      title: 'A search title',
      description: 'A search description.',
      canonicalUrl: 'https://example.com/original/',
      noindex: true,
    }),
    true,
  );
  assert.equal(valid({ title: 'x'.repeat(70) }), true);
  assert.equal(valid({ title: 'x'.repeat(71) }), false);
  assert.equal(valid({ title: '' }), false);
  assert.equal(valid({ description: '' }), false);
  assert.equal(valid({ description: 'x'.repeat(300) }), true);
  assert.equal(valid({ description: 'x'.repeat(301) }), false);
  assert.equal(valid({ canonicalUrl: 'http://example.com/' }), false);
  assert.equal(valid({ canonicalUrl: 'https://u:p@example.com/' }), false);
  assert.equal(valid({ noindex: 'yes' }), false);
  assert.equal(valid({ robots: 'noindex' }), false);
});

test('content frontmatter admits publishAfter as a day-precision date and nothing else', async () => {
  const base = await readJson(
    'examples/valid/content-frontmatter/canonical.json',
  );
  const draft = { ...base, status: 'draft' };
  const valid = (/** @type {unknown} */ publishAfter) =>
    validateGalaDocument(base.schemaId, { ...draft, publishAfter }).valid;
  assert.equal(validateGalaDocument(base.schemaId, draft).valid, true);
  assert.equal(valid('2026-11-03'), true);
  assert.equal(valid('2026-12-31'), true);
  assert.equal(valid('2026-11-3'), false);
  assert.equal(valid('26-11-03'), false);
  assert.equal(valid('2026/11/03'), false);
  assert.equal(valid('2026-11-03T00:00:00Z'), false);
  assert.equal(valid('2026-11-03 '), false);
  assert.equal(valid(''), false);
  assert.equal(valid(20261103), false);
  assert.equal(valid(null), false);
  // The schema fixes the shape only; draft-only is the API's rule, so a
  // published document that carries the member still validates here.
  assert.equal(
    validateGalaDocument(base.schemaId, {
      ...base,
      status: 'published',
      publishedAt: '2026-09-13T12:00:00.000Z',
      publishAfter: '2026-11-03',
    }).valid,
    true,
  );
  assert.equal(
    validateGalaDocument(base.schemaId, { ...draft, publishAfterDate: 'x' })
      .valid,
    false,
  );
});

test('content frontmatter admits translationOf only on an article and never with edition', async () => {
  // One bilingual pair: an en-US primary and a `ta` document naming it.
  const pair = {
    primary: {
      schemaId: 'urn:gala:schema:content-frontmatter:2.0.0',
      schemaVersion: '2.0.0',
      kind: 'article',
      authors: ['019c0000-0000-7000-8000-000000000001'],
      status: 'draft',
      createdAt: '2026-09-13T12:00:00.000Z',
      redirects: [],
      extensions: {},
      id: '019c0000-0000-7000-8000-000000000011',
      title: 'Index funds explained',
      language: 'en-US',
      tags: ['index-funds'],
      slug: 'index-funds-explained',
    },
    translation: {
      schemaId: 'urn:gala:schema:content-frontmatter:2.0.0',
      schemaVersion: '2.0.0',
      kind: 'article',
      authors: ['019c0000-0000-7000-8000-000000000001'],
      status: 'draft',
      createdAt: '2026-09-13T12:00:00.000Z',
      redirects: [],
      extensions: {},
      id: '019c0000-0000-7000-8000-000000000012',
      title: 'இன்டெக்ஸ் ஃபண்டுகள் விளக்கம்',
      language: 'ta',
      tags: ['index-funds'],
      slug: 'index-funds-explained-ta',
      translationOf: 'index-funds-explained',
    },
  };
  const primary = pair.primary;
  const ta = pair.translation;
  const id = primary.schemaId;
  assert.equal(validateGalaDocument(id, primary).valid, true);
  assert.equal(validateGalaDocument(id, ta).valid, true);
  assert.equal(ta.translationOf, primary.slug);
  const withKey = (/** @type {unknown} */ translationOf) =>
    validateGalaDocument(id, { ...ta, translationOf }).valid;
  assert.equal(withKey('Not A Slug'), false);
  assert.equal(withKey(''), false);
  assert.equal(withKey(7), false);
  assert.equal(validateGalaDocument(id, { ...ta, kind: 'page' }).valid, false);
  assert.equal(
    validateGalaDocument(id, {
      ...ta,
      kind: 'edition',
      edition: {
        of: primary.slug,
        kind: 'prism-edition',
        sourceDigest: `sha256:${'A'.repeat(43)}`,
        generation: 1,
        approvedAt: '2026-09-13T12:00:00.000Z',
      },
    }).valid,
    false,
  );
});

test('publication admits the closed optional sharing member', async () => {
  const base = await readJson('examples/valid/publication/canonical.json');
  const valid = (/** @type {unknown} */ sharing) =>
    validateGalaDocument(base.schemaId, { ...base, sharing }).valid;
  const all = [
    'copy-link',
    'native',
    'x',
    'bluesky',
    'linkedin',
    'facebook',
    'hacker-news',
    'whatsapp',
    'telegram',
    'reddit',
    'email',
  ];
  assert.equal(validateGalaDocument(base.schemaId, base).valid, true);
  assert.equal(valid({ targets: ['copy-link'] }), true);
  assert.equal(valid({ targets: ['x', 'copy-link', 'email'] }), true);
  // An empty list means no share buttons; the full set is the 11-item maximum.
  assert.equal(valid({ targets: [] }), true);
  assert.equal(valid({ targets: all }), true);
  assert.equal(valid({ targets: [...all, 'x'] }), false);
  assert.equal(valid({ targets: ['x', 'x'] }), false);
  assert.equal(valid({ targets: ['mastodon'] }), false);
  assert.equal(valid({ targets: ['Copy-Link'] }), false);
  assert.equal(valid({ targets: [7] }), false);
  assert.equal(valid({ targets: 'x' }), false);
  assert.equal(valid({}), false);
  assert.equal(valid({ targets: ['x'], extra: true }), false);
  assert.equal(valid(['x']), false);
  assert.equal(valid(null), false);
});

test('publication newsletter is a link-or-Galascribe union that keeps 3.21 files valid', async () => {
  const base = await readJson('examples/valid/publication/canonical.json');
  const valid = (/** @type {unknown} */ newsletter) =>
    validateGalaDocument(base.schemaId, { ...base, newsletter }).valid;
  const link = {
    url: 'https://news.example.com/',
    title: 'Subscribe',
    text: 'New posts by email.',
  };
  const galascribe = {
    mode: 'galascribe',
    title: 'Subscribe',
    text: 'New posts by email.',
    emailContent: 'card',
    replyToOwner: false,
  };
  // Link mode: exactly the 3.21 shape, with or without the new `mode` key.
  assert.equal(valid(link), true);
  assert.equal(valid({ ...link, mode: 'link' }), true);
  assert.equal(valid({ ...link, mode: 'galascribe' }), false);
  assert.equal(valid({ ...link, mode: 'other' }), false);
  assert.equal(valid({ ...link, url: 'http://news.example.com/' }), false);
  assert.equal(valid({ ...link, text: 'x'.repeat(301) }), false);
  assert.equal(valid({ title: link.title, text: link.text }), false);
  assert.equal(valid({ ...link, emailContent: 'card' }), false);
  // Galascribe mode: every member required, closed, and no `url`.
  assert.equal(valid(galascribe), true);
  assert.equal(valid({ ...galascribe, emailContent: 'full' }), true);
  assert.equal(valid({ ...galascribe, replyToOwner: true }), true);
  assert.equal(valid({ ...galascribe, url: link.url }), false);
  assert.equal(valid({ ...galascribe, emailContent: 'html' }), false);
  assert.equal(valid({ ...galascribe, replyToOwner: 'yes' }), false);
  assert.equal(valid({ ...galascribe, text: '' }), false);
  assert.equal(valid({ ...galascribe, extra: 1 }), false);
  for (const member of Object.keys(galascribe)) {
    const missing = { ...galascribe };
    delete (/** @type {Record<string, unknown>} */ (missing)[member]);
    assert.equal(valid(missing), false, `${member} is required`);
  }
  assert.equal(valid({}), false);
  assert.equal(valid(null), false);
});

test('publication admits the closed optional contactForm member', async () => {
  const base = await readJson('examples/valid/publication/canonical.json');
  const valid = (/** @type {unknown} */ contactForm) =>
    validateGalaDocument(base.schemaId, { ...base, contactForm }).valid;
  const form = { enabled: true, fields: { website: false, phone: true } };
  assert.equal(valid(form), true);
  assert.equal(valid({ ...form, enabled: false }), true);
  assert.equal(valid({ enabled: true }), false);
  assert.equal(valid({ fields: form.fields }), false);
  assert.equal(valid({ ...form, enabled: 'yes' }), false);
  assert.equal(valid({ ...form, intro: 'Write to us.' }), false);
  assert.equal(valid({ ...form, extra: 1 }), false);
  assert.equal(valid({ ...form, fields: { website: true } }), false);
  assert.equal(valid({ ...form, fields: { phone: true } }), false);
  assert.equal(
    valid({ ...form, fields: { website: true, phone: true, message: true } }),
    false,
  );
  assert.equal(valid({ ...form, fields: { website: 1, phone: true } }), false);
  assert.equal(valid({ ...form, fields: [] }), false);
  assert.equal(valid(null), false);
});

test('interactions config admits the closed optional follows member', async () => {
  const base = await readJson(
    'examples/valid/interactions-config/canonical.json',
  );
  const valid = (/** @type {unknown} */ follows) =>
    validateGalaDocument(base.schemaId, { ...base, follows }).valid;
  assert.equal(validateGalaDocument(base.schemaId, base).valid, true);
  assert.equal(valid({ enabled: true }), true);
  assert.equal(valid({ enabled: false }), true);
  assert.equal(valid({}), false);
  assert.equal(valid({ enabled: 1 }), false);
  assert.equal(valid({ enabled: true, extra: true }), false);
  assert.equal(valid(true), false);
  assert.equal(valid(null), false);
});

test('build input carries sharing, the newsletter union, the contact form and follows', async () => {
  const base = await readJson('examples/valid/build-input/canonical.json');
  const body = {
    sourcePath: 'gala/theme-pages/contact.md',
    sourceDigest: base.content[0].sourceDigest,
    bodyMediaType: base.content[0].bodyMediaType,
    body: base.content[0].body,
    bodyDigest: base.content[0].bodyDigest,
    renderPolicy: base.content[0].renderPolicy,
  };
  const withPublication = (/** @type {Record<string, unknown>} */ change) => ({
    ...base,
    publication: { ...base.publication, ...change },
  });
  const valid = (/** @type {Record<string, unknown>} */ change) =>
    validateGalaDocument(base.schemaId, withPublication(change)).valid;
  assert.equal(validateGalaDocument(base.schemaId, base).valid, true);
  assert.equal(valid({ sharing: { targets: ['x', 'bluesky'] } }), true);
  assert.equal(valid({ sharing: { targets: ['mastodon'] } }), false);
  assert.equal(
    valid({
      newsletter: { url: 'https://news.example.com/', title: 'Hi', text: 'Hi' },
    }),
    true,
  );
  assert.equal(
    valid({
      newsletter: {
        mode: 'galascribe',
        title: 'Hi',
        text: 'Hi',
        emailContent: 'full',
        replyToOwner: true,
      },
    }),
    true,
  );
  assert.equal(
    valid({ newsletter: { mode: 'galascribe', title: 'Hi' } }),
    false,
  );
  const contactForm = {
    enabled: true,
    fields: { website: true, phone: false },
  };
  assert.equal(valid({ contactForm }), true);
  assert.equal(valid({ contactForm: { ...contactForm, intro: body } }), true);
  assert.equal(
    valid({ contactForm: { ...contactForm, intro: 'Write to us.' } }),
    false,
  );
  assert.equal(
    valid({ contactForm: { ...contactForm, intro: { ...body, body: 7 } } }),
    false,
  );
  const withFollows = (/** @type {unknown} */ follows) => ({
    ...base,
    modules: {
      interactions: {
        config: {
          schemaId: 'urn:gala:schema:interactions-config:2.0.0',
          schemaVersion: '2.0.0',
          reactions: { enabled: false, definitions: [] },
          comments: { enabled: false, allowReplies: false, maxDepth: 1 },
          publicCounts: { reactions: false, comments: false },
          follows,
        },
        apiOrigin: 'https://api.galascribe.com',
        appOrigin: 'http://localhost:5173',
      },
    },
  });
  assert.equal(
    validateGalaDocument(base.schemaId, withFollows({ enabled: true })).valid,
    true,
  );
  assert.equal(
    validateGalaDocument(base.schemaId, withFollows({})).valid,
    false,
  );
});

test('build input admits Editorial and rejects an unknown theme package', async () => {
  const editorial = await readJson('examples/valid/build-input/canonical.json');
  editorial.packages.theme.package = '@rathnasgala2/theme-editorial';
  editorial.packages.theme.version = '4.0.0';
  editorial.appearance.theme = '@rathnasgala2/theme-editorial@4.0.0';
  assert.equal(validateGalaDocument(editorial.schemaId, editorial).valid, true);

  const unknown = structuredClone(editorial);
  unknown.packages.theme.package = '@rathnasgala2/theme-unknown';
  unknown.appearance.theme = '@rathnasgala2/theme-unknown@4.0.0';
  assert.equal(validateGalaDocument(unknown.schemaId, unknown).valid, false);
});

test('the immutable roots admit complete generation-4 Editorial contracts', async () => {
  const composition = {
    schemaId: 'urn:gala:schema:template-composition:2.0.0',
    schemaVersion: '2.0.0',
    profile: 'editorial',
    homeLayout: 'magazine',
    articleLayout: 'editorial',
    authorLayout: 'portrait',
    listingLayout: 'rows',
    headerLayout: 'masthead',
    footerLayout: 'expanded',
    mediaRatio: 'landscape',
    density: 'comfortable',
  };
  assert.deepEqual(validateGalaDocument(composition.schemaId, composition), {
    valid: true,
    diagnostics: [],
  });

  const incomplete = /** @type {Record<string, unknown>} */ (
    structuredClone(composition)
  );
  delete incomplete.authorLayout;
  assert.equal(
    validateGalaDocument(composition.schemaId, incomplete).valid,
    false,
  );

  const theme = await readJson('examples/valid/theme-contract/canonical.json');
  theme.themeId = 'editorial';
  theme.package = '@rathnasgala2/theme-editorial@4.0.0';
  theme.contractVersion = '4.0.0';
  theme.templateRange = '^4.0.0';
  theme.composition = composition;
  assert.deepEqual(validateGalaDocument(theme.schemaId, theme), {
    valid: true,
    diagnostics: [],
  });

  delete theme.composition.authorLayout;
  assert.equal(validateGalaDocument(theme.schemaId, theme).valid, false);
});

test('publication admits the optional closed policies member', async () => {
  const base = await readJson('examples/valid/publication/canonical.json');
  const page = { title: 'Terms', body: 'gala/theme-pages/terms.md' };
  const withPolicies = (/** @type {unknown} */ policies) => ({
    ...base,
    policies,
  });
  const valid = (/** @type {unknown} */ policies) =>
    validateGalaDocument(base.schemaId, withPolicies(policies)).valid;
  assert.equal(validateGalaDocument(base.schemaId, base).valid, true);
  assert.equal(
    valid({
      terms: page,
      privacy: { title: 'Privacy', body: 'gala/theme-pages/privacy.md' },
    }),
    true,
  );
  assert.equal(valid({ terms: page }), false);
  assert.equal(valid({ terms: page, privacy: page, cookies: page }), false);
  assert.equal(valid({ terms: page, privacy: { ...page, extra: 1 } }), false);
  assert.equal(valid({ terms: page, privacy: { title: 'Privacy' } }), false);
  assert.equal(valid({ terms: page, privacy: { body: page.body } }), false);
  assert.equal(valid({ terms: page, privacy: { ...page, title: '' } }), false);
  assert.equal(
    valid({ terms: page, privacy: { ...page, title: 'x'.repeat(80) } }),
    true,
  );
  assert.equal(
    valid({ terms: page, privacy: { ...page, title: 'x'.repeat(81) } }),
    false,
  );
  assert.equal(
    valid({ terms: page, privacy: { ...page, body: '../terms.md' } }),
    false,
  );
  assert.equal(
    valid({ terms: page, privacy: { ...page, body: '/gala/terms.md' } }),
    false,
  );
  // The body is a Markdown file.
  assert.equal(
    valid({ terms: page, privacy: { ...page, body: 'privacy.md' } }),
    true,
  );
  for (const body of [
    'gala/theme-pages/privacy.txt',
    'gala/theme-pages/privacy',
    'gala/theme-pages/privacy.MD',
    'gala/theme-pages/privacy.md/',
    'gala/theme-pages/privacy.md.txt',
    '.md',
  ]) {
    assert.equal(
      valid({ terms: page, privacy: { ...page, body } }),
      false,
      body,
    );
  }
});

test('build input admits the optional normalized policies member', async () => {
  const base = await readJson('examples/valid/build-input/canonical.json');
  const source = base.content[0];
  const body = {
    sourcePath: source.sourcePath,
    sourceDigest: source.sourceDigest,
    bodyMediaType: source.bodyMediaType,
    body: source.body,
    bodyDigest: source.bodyDigest,
    renderPolicy: source.renderPolicy,
  };
  const withPolicies = (/** @type {unknown} */ policies) => ({
    ...base,
    policies,
  });
  const valid = (/** @type {unknown} */ policies) =>
    validateGalaDocument(base.schemaId, withPolicies(policies)).valid;
  assert.equal(validateGalaDocument(base.schemaId, base).valid, true);
  assert.equal(
    valid({
      terms: { title: 'Terms', body },
      privacy: { title: 'Privacy', body },
    }),
    true,
  );
  assert.equal(valid({ terms: { title: 'Terms', body } }), false);
  assert.equal(
    valid({
      terms: { title: 'Terms', body },
      privacy: { title: 'Privacy', body: 'gala/theme-pages/privacy.md' },
    }),
    false,
  );
  assert.equal(
    valid({
      terms: { title: 'Terms', body },
      privacy: { title: 'x'.repeat(81), body },
    }),
    false,
  );
  assert.equal(
    valid({
      terms: { title: 'Terms', body },
      privacy: { title: 'Privacy', body, extra: 1 },
    }),
    false,
  );
  assert.equal(
    valid({
      terms: { title: 'Terms', body },
      privacy: { title: 'Privacy', body },
      cookies: { title: 'Cookies', body },
    }),
    false,
  );
});

test('theme contract 4.1.0 keeps the generation-4 requirements and pins templateRange ^4.4.0', async () => {
  const composition = {
    schemaId: 'urn:gala:schema:template-composition:2.0.0',
    schemaVersion: '2.0.0',
    profile: 'editorial',
    homeLayout: 'magazine',
    articleLayout: 'editorial',
    authorLayout: 'portrait',
    listingLayout: 'rows',
    headerLayout: 'masthead',
    footerLayout: 'expanded',
    mediaRatio: 'landscape',
    density: 'comfortable',
  };
  const canonical = await readJson(
    'examples/valid/theme-contract/canonical.json',
  );
  const editorial = (
    /** @type {string} */ contractVersion,
    /** @type {string} */ templateRange,
  ) => ({
    ...canonical,
    themeId: 'editorial',
    package: '@rathnasgala2/theme-editorial@4.2.0',
    contractVersion,
    templateRange,
    composition: structuredClone(composition),
  });
  const valid = (/** @type {Record<string, unknown>} */ theme) =>
    validateGalaDocument(canonical.schemaId, theme).valid;

  assert.equal(valid(editorial('4.1.0', '^4.4.0')), true);
  // 4.0.0 keeps exactly the ranges it always had.
  assert.equal(valid(editorial('4.0.0', '^4.0.0')), true);
  assert.equal(valid(editorial('4.0.0', '^4.1.0')), true);
  assert.equal(valid(editorial('4.0.0', '^4.4.0')), false);
  // 4.1.0 declares ^4.4.0 and nothing else.
  assert.equal(valid(editorial('4.1.0', '^4.0.0')), false);
  assert.equal(valid(editorial('4.1.0', '^4.1.0')), false);
  assert.equal(valid(editorial('4.1.0', '^4.5.0')), false);
  assert.equal(valid(editorial('4.2.0', '^4.4.0')), false);

  const withoutComposition = editorial('4.1.0', '^4.4.0');
  delete (
    /** @type {Record<string, unknown>} */ (withoutComposition).composition
  );
  assert.equal(valid(withoutComposition), false);
  const mixed = editorial('4.1.0', '^4.4.0');
  mixed.composition.profile = 'visual';
  assert.equal(valid(mixed), false);
  const incomplete = editorial('4.1.0', '^4.4.0');
  delete (
    /** @type {Record<string, unknown>} */ (incomplete.composition).authorLayout
  );
  assert.equal(valid(incomplete), false);

  // Editorial is never admitted as a legacy contract.
  const legacyEditorial = { ...canonical, themeId: 'editorial' };
  assert.equal(valid(legacyEditorial), false);
});

test('the public validator returns complete stable diagnostics', async () => {
  const value = await readJson('examples/valid/repository/canonical.json');
  value.unexpected = true;
  const result = validateGalaDocument(value.schemaId, value);
  assert.equal(result.valid, false);
  assert.deepEqual(
    result.diagnostics.map(({ code }) => code),
    ['REQUEST_FIELD_UNKNOWN'],
  );
  const [diagnostic] = result.diagnostics;
  assert.ok(diagnostic);
  assert.deepEqual(Object.keys(diagnostic), [
    'code',
    'severity',
    'instancePointer',
    'actualValueClass',
    'rule',
    'remediation',
    'documentationUrl',
  ]);
  assert.equal(diagnostic.severity, 'ERROR');
  assert.equal(diagnostic.instancePointer, '/unexpected');
  assert.equal(diagnostic.actualValueClass, 'boolean');
  assert.match(diagnostic.rule, /:additionalProperties$/u);
  assert.match(diagnostic.documentationUrl, /^https:\/\//u);
});

test('unknown contract identities and majors fail closed', () => {
  const value = {
    schemaId: 'urn:gala:schema:repository:3.0.0',
    schemaVersion: '3.0.0',
  };
  assert.deepEqual(
    validateGalaDocument(value.schemaId, value).diagnostics.map(
      ({ code }) => code,
    ),
    ['SCHEMA_VERSION_UNSUPPORTED'],
  );
});

test('custom formats are assertions on the public path', async () => {
  const value = await readJson('examples/valid/repository/canonical.json');
  value.publication = 'content/../outside.json';
  const result = validateGalaDocument(value.schemaId, value);
  assert.equal(result.valid, false);
  assert.ok(
    result.diagnostics.some(({ code }) => code === 'REPOSITORY_PATH_INVALID'),
  );
});

test('applicator cascades retain leaf diagnostics without throwing', async () => {
  const extensions = await readJson('examples/valid/author/canonical.json');
  extensions.extensions = { 'gala.bad': 1 };
  assert.deepEqual(
    validateGalaDocument(extensions.schemaId, extensions).diagnostics.map(
      ({ code }) => code,
    ),
    ['EXTENSION_KEY_INVALID'],
  );

  const conditional = await readJson('examples/valid/author/canonical.json');
  conditional.links[0] = { type: 'email', uri: 'https://example.com/' };
  assert.deepEqual(
    validateGalaDocument(conditional.schemaId, conditional).diagnostics.map(
      ({ code }) => code,
    ),
    ['SCHEMA_PATTERN_INVALID'],
  );
});

test('non-scalar extension JSON fails closed without escaping the public API', async () => {
  for (const invalid of ['\ud800', '\udfff']) {
    const value = await readJson('examples/valid/repository/canonical.json');
    value.extensions = { 'vendor.test': { invalid } };
    const result = validateGalaDocument(value.schemaId, value);
    assert.equal(result.valid, false);
    assert.ok(
      result.diagnostics.some(({ code }) => code === 'UNICODE_SCALAR_INVALID'),
    );
  }

  const valid = await readJson('examples/valid/repository/canonical.json');
  valid.extensions = { 'vendor.test': { emoji: '\ud83d\ude00' } };
  assert.equal(validateGalaDocument(valid.schemaId, valid).valid, true);
});

test('canonical-byte validation is stack-safe and fails closed for non-JSON values', async () => {
  /**
   * @param {number} depth nesting depth
   * @returns {unknown} nested JSON value
   */
  const deepValue = (depth) => {
    let value = null;
    for (let index = 0; index < depth; index += 1) value = { a: value };
    return value;
  };
  const document = await readJson('examples/valid/repository/canonical.json');
  document.extensions = { 'vendor.test': deepValue(2000) };
  assert.equal(validateGalaDocument(document.schemaId, document).valid, true);

  document.extensions = { 'vendor.test': deepValue(3000) };
  assert.ok(
    validateGalaDocument(document.schemaId, document).diagnostics.some(
      ({ code }) => code === 'CANONICAL_BYTE_LENGTH_INVALID',
    ),
  );

  /** @type {unknown[]} */
  const invalidValues = [
    1n,
    { missing: undefined },
    { callable() {} },
    new Date(0),
  ];
  const cyclic = /** @type {any} */ ({});
  cyclic.self = cyclic;
  invalidValues.push(cyclic);
  for (const invalid of invalidValues) {
    document.extensions = { 'vendor.test': invalid };
    const result = validateGalaDocument(document.schemaId, document);
    assert.equal(result.valid, false);
    assert.ok(
      result.diagnostics.some(
        ({ code }) => code === 'CANONICAL_BYTE_LENGTH_INVALID',
      ),
    );
  }
});

test('the public validator accepts a long canonical single grapheme without stack overflow', async () => {
  const document = await readJson('examples/valid/author/canonical.json');
  document.biography = `a${'\u0316'.repeat(130_000)}`;
  assert.deepEqual(validateGalaDocument(document.schemaId, document), {
    valid: true,
    diagnostics: [],
  });
});

test('the public validator rejects lone surrogates before schema evaluation', async () => {
  /** @type {[string, (document: any) => void][]} */
  const fixtures = [
    [
      'examples/valid/build-input/canonical.json',
      (document) => {
        document.content[0].body = '\ud800';
      },
    ],
    [
      'examples/valid/artifact-manifest/canonical.json',
      (document) => {
        document.findings[0].pointer = '\ud800';
      },
    ],
    [
      'examples/valid/problem/canonical.json',
      (document) => {
        document.errors[0].pointer = '\ud800';
      },
    ],
  ];
  for (const [file, mutate] of fixtures) {
    const document = await readJson(file);
    mutate(document);
    assert.deepEqual(
      validateGalaDocument(document.schemaId, document).diagnostics.map(
        ({ code }) => code,
      ),
      ['UNICODE_SCALAR_INVALID'],
    );
  }

  const document = await readJson('examples/valid/repository/canonical.json');
  document.extensions = { ['\ud800']: null };
  assert.deepEqual(
    validateGalaDocument(document.schemaId, document).diagnostics.map(
      ({ code }) => code,
    ),
    ['UNICODE_SCALAR_INVALID'],
  );
});

test('one diagnostic map owns every executable fixture code', async () => {
  const [manifest, map] = await Promise.all([
    readJson('fixtures/manifest.json'),
    readJson('diagnostics/diagnostic-map.json'),
  ]);
  assert.equal(map.schemaVersion, '1.0.0');
  assert.equal(map.contractVersion, '2.0.0');
  for (const rule of manifest.rules) {
    if (rule.invalid.expectedCode !== undefined) {
      assert.equal(map.rules[rule.ruleId].code, rule.invalid.expectedCode);
    } else {
      assert.equal(map.nonApplicable[rule.ruleId], rule.invalid.notApplicable);
    }
  }
  for (const entry of manifest.adversarial) {
    assert.equal(map.validators[entry.category].code, entry.expectedCode);
  }
  assert.equal(map.validators['sha256-digest'].code, 'DIGEST_VECTOR_MISMATCH');
  assert.deepEqual(map.cascadeKeywords, ['if', 'propertyNames']);
  assert.equal(map.keywords.if, 'SCHEMA_UNION_INVALID');
  assert.equal(map.keywords.propertyNames, 'EXTENSION_KEY_INVALID');
  for (const [code, diagnostic] of Object.entries(map.codes)) {
    assert.match(code, /^[A-Z][A-Z0-9_]+$/u);
    assert.equal(diagnostic.severity, 'ERROR');
    assert.equal(typeof diagnostic.remediation, 'string');
    assert.match(diagnostic.documentationUrl, /^https:\/\//u);
  }
});

/**
 * A frozen record of `LEGACY_STRICT_TYPES_ALLOWLIST` at the moment the
 * split-registry allowlist was introduced (SCH-H1). `validator-core.js`'s
 * allowlist may only shrink from here -- a PR that adds a root not in this
 * set fails the assertion below, so a new schema root must compile clean
 * under full `strictTypes`/`strictRequired` from day one, and reconciling
 * an existing root's composition out of the allowlist is a one-line delete
 * in both places.
 */
const STRICT_ALLOWLIST_BASELINE = new Set([
  'adapter-capability',
  'artifact-manifest',
  'author',
  'build-input',
  'build-provenance',
  'content-frontmatter',
  'deployment-intent',
  'deployment-observation',
  'deployment-receipt',
  'lock',
  'navigation',
  'problem',
  'publication',
  'theme-contract',
]);

test('the strict-composition allowlist only shrinks (SCH-H1)', async () => {
  const { LEGACY_STRICT_TYPES_ALLOWLIST } =
    await import('../src/internal/validator-core.js');
  for (const contract of LEGACY_STRICT_TYPES_ALLOWLIST) {
    assert.ok(
      STRICT_ALLOWLIST_BASELINE.has(contract),
      `"${contract}" is not in the recorded SCH-H1 baseline; a root may be ` +
        'removed from LEGACY_STRICT_TYPES_ALLOWLIST but never added',
    );
  }
});

test('every root compiles under strict schema/format/number/tuple checking (SCH-H1)', async () => {
  // src/internal/validator-core.js's real registry runs with `strict: true`
  // for every root. Roots outside LEGACY_STRICT_TYPES_ALLOWLIST additionally
  // compile with strictTypes/strictRequired enabled; roots on the allowlist
  // relax those two checks only (their allOf/if/then composition declares
  // required/properties across sibling branches, which strict mode cannot
  // see across). This test pins that every other strict-mode check --
  // unknown keywords (a misspelled keyword like `requred`/`maxItmes`),
  // unknown formats, strict numbers and strict tuples -- reports zero
  // diagnostics across every root, and that the allowlisted roots report
  // zero *additional* strictTypes/strictRequired diagnostics beyond what is
  // already known, so a schema-authoring typo is caught here rather than
  // silently validating nothing.
  const { LEGACY_STRICT_TYPES_ALLOWLIST } =
    await import('../src/internal/validator-core.js');
  const files = (await readdir('schemas')).filter((file) =>
    file.endsWith('.schema.json'),
  );
  const galaKeywords = new Set();
  const collectGalaKeywords = (/** @type {unknown} */ value) => {
    if (value === null || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      for (const entry of value) collectGalaKeywords(entry);
      return;
    }
    for (const key of Object.keys(value)) {
      if (key.startsWith('x-gala-')) galaKeywords.add(key);
    }
    for (const child of Object.values(value)) collectGalaKeywords(child);
  };
  const schemas = await Promise.all(
    files.map((file) =>
      readFile(path.join('schemas', file), 'utf8').then((source) =>
        JSON.parse(source),
      ),
    ),
  );
  for (const schema of schemas) collectGalaKeywords(schema);

  const collectFormats = (
    /** @type {unknown} */ value,
    /** @type {Set<string>} */ target,
  ) => {
    if (value === null || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      for (const entry of value) collectFormats(entry, target);
      return;
    }
    if (
      typeof (/** @type {{format?: unknown}} */ (value).format) === 'string'
    ) {
      target.add(/** @type {{format: string}} */ (value).format);
    }
    for (const child of Object.values(value)) collectFormats(child, target);
  };
  const formats = new Set();
  for (const schema of schemas) collectFormats(schema, formats);

  /**
   * @param {boolean} strictComposition strictTypes/strictRequired setting
   * @returns {{ajv: import('ajv').default, diagnostics: string[]}} a fresh
   *   Ajv instance with Gala's keywords/formats registered, plus its
   *   diagnostic sink
   */
  function buildAjv(strictComposition) {
    const diagnostics = /** @type {string[]} */ ([]);
    const ajv = new Ajv2020({
      allErrors: true,
      strict: 'log',
      strictTypes: strictComposition,
      strictRequired: strictComposition,
      logger: {
        log() {},
        warn: (/** @type {string} */ message) => diagnostics.push(message),
        error: (/** @type {string} */ message) => diagnostics.push(message),
      },
    });
    /** @type {(ajv: unknown) => void} */ (
      /** @type {unknown} */ (formatsPlugin)
    )(ajv);
    for (const keyword of galaKeywords) {
      ajv.addKeyword({ keyword, validate: () => true });
    }
    for (const format of formats) {
      if (ajv.formats[format] === undefined) {
        ajv.addFormat(format, { type: 'string', validate: () => true });
      }
    }
    return { ajv, diagnostics };
  }

  const strict = buildAjv(true);
  const legacy = buildAjv(false);
  for (const schema of schemas) {
    const contract = String(schema.$id).replace(
      /^urn:gala:(?:schema|metadata):([a-z0-9-]+):.*$/u,
      '$1',
    );
    const { ajv } = LEGACY_STRICT_TYPES_ALLOWLIST.has(contract)
      ? legacy
      : strict;
    ajv.compile(schema);
  }

  assert.deepEqual(strict.diagnostics, []);
  assert.deepEqual(legacy.diagnostics, []);
});

test('each of the six non-allowlisted roots rejects a fabricated schema an allowlisted root tolerates (SCH-H1)', async () => {
  // The prior two tests prove every *real, committed* root is clean under
  // its assigned strictness. This test proves the split is load-bearing in
  // the other direction: a schema-authoring mistake strictTypes/
  // strictRequired exists to catch -- a `required` (or `properties`) keyword
  // nested under `oneOf`/`allOf` with no `type` declared on its own branch,
  // so Ajv cannot see what type it is asserting requirements against -- must
  // actually fail to compile on a root outside LEGACY_STRICT_TYPES_ALLOWLIST,
  // and must be tolerated (legacy, relaxed) on a root inside it. This is
  // exactly the shape SCH-H1's rollout hit on real allOf/if composition
  // (colorMode's `if` branches on `appearance`), reproduced here as a
  // minimal fabricated fixture instead of relying on today's committed
  // schemas happening to stay clean.
  const { createValidatorSuite, LEGACY_STRICT_TYPES_ALLOWLIST } =
    await import('../src/internal/validator-core.js');

  const NON_ALLOWLISTED_ROOTS = [
    'appearance',
    'event-envelope',
    'public-generation-marker',
    'public-runtime-origins',
    'repository',
    'template-composition',
  ];
  assert.equal(NON_ALLOWLISTED_ROOTS.length, 6);
  for (const contract of NON_ALLOWLISTED_ROOTS) {
    assert.ok(
      !LEGACY_STRICT_TYPES_ALLOWLIST.has(contract),
      `"${contract}" is expected to be outside LEGACY_STRICT_TYPES_ALLOWLIST`,
    );
  }

  /**
   * @param {string} contract contract name
   * @returns {Record<string, unknown>} a schema whose `allOf` branch
   *   declares `required` with no local `type`
   */
  function fabricateUntypedRequiredSchema(contract) {
    return {
      $id: `urn:gala:schema:${contract}:2.0.0`,
      oneOf: [
        {
          type: 'object',
          properties: { kind: { type: 'string' } },
          allOf: [{ required: ['kind'] }],
        },
      ],
    };
  }

  for (const contract of NON_ALLOWLISTED_ROOTS) {
    assert.throws(
      () =>
        createValidatorSuite({
          schemas: [fabricateUntypedRequiredSchema(contract)],
          diagnosticMap,
          validateFormat: () => true,
        }),
      /strict mode/u,
      `"${contract}" (strict, non-allowlisted) should reject the fabricated schema`,
    );
  }

  const [allowlistedContract] = LEGACY_STRICT_TYPES_ALLOWLIST;
  assert.ok(allowlistedContract);
  assert.doesNotThrow(
    () =>
      createValidatorSuite({
        schemas: [fabricateUntypedRequiredSchema(allowlistedContract)],
        diagnosticMap,
        validateFormat: () => true,
      }),
    `"${allowlistedContract}" (legacy, allowlisted) should tolerate the fabricated schema`,
  );
});

test('createValidatorSuite never exposes the internal registry or fragmentAjv (SCH-H1)', async () => {
  // src/internal/schema-validator.js -- the only caller of createValidatorSuite
  // outside this test file -- is itself reachable only from Node-only tooling
  // (scripts/validator-parity.mjs) per .dependency-cruiser.cjs's
  // src-internal-module-is-reachable-from-a-declared-export exception. That
  // structural guarantee is about which *module* can reach fragmentAjv; this
  // test pins the complementary guarantee that the *value* createValidatorSuite
  // returns never leaks the registry (and therefore fragmentAjv) itself, so a
  // future caller cannot reach it through the returned suite even if it did
  // gain a reachable import path.
  const { createValidatorSuite } =
    await import('../src/internal/validator-core.js');
  const schema = { $id: 'urn:gala:schema:problem:2.0.0', type: 'object' };
  const suite = createValidatorSuite({
    schemas: [schema],
    diagnosticMap,
    validateFormat: () => true,
  });
  const keys = Object.keys(suite).sort();
  assert.deepEqual(keys, [
    'schemaIds',
    'validateArrayCardinality',
    'validateDocument',
    'validateFragment',
  ]);
  assert.ok(
    !keys.includes('registry') && !keys.includes('fragmentAjv'),
    'createValidatorSuite must not expose the internal registry or fragmentAjv by name',
  );
  assert.ok(Array.isArray(suite.schemaIds));
  /** @type {readonly (keyof typeof suite)[]} */
  const suiteFunctionKeys = [
    'validateArrayCardinality',
    'validateDocument',
    'validateFragment',
  ];
  for (const key of suiteFunctionKeys) {
    assert.equal(
      typeof suite[key],
      'function',
      `${key} must be a bound function, not the registry object`,
    );
  }
});

test('SCHEMA-3.25.0 admits deleteDate, listing, aiRights and performance and rejects malformed values', async () => {
  const front = await readJson(
    'examples/valid/content-frontmatter/canonical.json',
  );
  const fm = (/** @type {unknown} */ deleteDate) =>
    validateGalaDocument(front.schemaId, { ...front, deleteDate }).valid;
  assert.equal(fm('2027-01-31'), true);
  assert.equal(fm('2027-1-31'), false);
  const pub = await readJson('examples/valid/publication/canonical.json');
  const has = (/** @type {Record<string, unknown>} */ extra) =>
    validateGalaDocument(pub.schemaId, { ...pub, ...extra }).valid;
  assert.equal(has({ listing: { pageSize: 50 } }), true);
  assert.equal(has({ listing: { pageSize: 0 } }), false);
  assert.equal(has({ listing: { pageSize: 51 } }), false);
  assert.equal(has({ aiRights: { search: 'allow', training: 'block' } }), true);
  assert.equal(
    has({
      aiRights: {
        search: 'allow',
        training: 'block',
        licenseUrl: 'https://example.com/license',
      },
    }),
    true,
  );
  assert.equal(has({ aiRights: { search: 'allow' } }), false);
  assert.equal(
    has({ aiRights: { search: 'allow', training: 'maybe' } }),
    false,
  );
  assert.equal(has({ performance: { budgets: { htmlBytes: 1024 } } }), true);
  assert.equal(has({ performance: { budgets: { htmlBytes: 1023 } } }), false);
  assert.equal(has({ performance: { budgets: { cssBytes: 5, x: 1 } } }), false);
});

test('SCHEMA-3.26.0 admits the publication Listen switch and rejects malformed values', async () => {
  const pub = await readJson('examples/valid/publication/canonical.json');
  assert.equal(validateGalaDocument(pub.schemaId, pub).valid, true);
  const has = (/** @type {unknown} */ listen) =>
    validateGalaDocument(pub.schemaId, { ...pub, listen }).valid;
  assert.equal(has({ enabled: true }), true);
  assert.equal(has({ enabled: false }), true);
  assert.equal(has({}), false);
  assert.equal(has({ enabled: 'yes' }), false);
  assert.equal(has({ enabled: 1 }), false);
  assert.equal(has({ enabled: true, autoplay: true }), false);
  assert.equal(has(true), false);
  assert.equal(has(null), false);
});

test('SCHEMA-3.26.0 admits article front matter listen and rejects malformed values', async () => {
  const front = await readJson(
    'examples/valid/content-frontmatter/canonical.json',
  );
  assert.equal(front.kind, 'article');
  const episode = {
    audio: 'assets/listen/episode.mp3',
    durationSeconds: 424,
    format: 'conversation',
  };
  const valid = (
    /** @type {unknown} */ listen,
    /** @type {Record<string, unknown>} */ extra = {},
  ) =>
    validateGalaDocument(front.schemaId, { ...front, ...extra, listen }).valid;
  assert.equal(validateGalaDocument(front.schemaId, front).valid, true);
  assert.equal(valid(episode), true);
  assert.equal(valid({ ...episode, audio: 'assets/listen/episode.m4a' }), true);
  for (const format of ['conversation', 'narration', 'debate', 'skit']) {
    assert.equal(valid({ ...episode, format }), true, format);
  }
  for (const format of ['podcast', 'Conversation', '', null]) {
    assert.equal(valid({ ...episode, format }), false, String(format));
  }
  // The duration is a whole number of seconds from 1 to 10800.
  for (const durationSeconds of [1, 424, 10_800]) {
    assert.equal(valid({ ...episode, durationSeconds }), true);
  }
  for (const durationSeconds of [0, -1, 10_801, 424.5, '424', null]) {
    assert.equal(valid({ ...episode, durationSeconds }), false);
  }
  // The audio is a repository-relative path ending in .mp3 or .m4a.
  for (const audio of [
    'assets/listen/episode.wav',
    'assets/listen/episode.MP3',
    'assets/listen/episode.mp3.txt',
    'assets/listen/episode',
    '.mp3',
    '/assets/listen/episode.mp3',
    'assets\\listen\\episode.mp3',
    '',
    7,
    null,
  ]) {
    assert.equal(valid({ ...episode, audio }), false, String(audio));
  }
  // All three members are required, and the object is closed.
  for (const member of ['audio', 'durationSeconds', 'format']) {
    const missing = { ...episode };
    delete (/** @type {Record<string, unknown>} */ (missing)[member]);
    assert.equal(valid(missing), false, `${member} is required`);
  }
  assert.equal(valid({ ...episode, volume: 1 }), false);
  assert.equal(valid({}), false);
  assert.equal(valid(null), false);
  // Only an article may carry it: a page and an edition that are valid
  // without it are refused with it.
  const edition = {
    of: front.slug,
    kind: 'STANDARD',
    sourceDigest: `sha256:${'0'.repeat(64)}`,
    generation: {
      provider: 'anthropic',
      model: 'fixture',
      generationId: front.id,
    },
    approvedAt: '2026-09-13T12:00:00.000Z',
  };
  assert.equal(
    validateGalaDocument(front.schemaId, { ...front, kind: 'page' }).valid,
    true,
  );
  assert.equal(
    validateGalaDocument(front.schemaId, { ...front, kind: 'edition', edition })
      .valid,
    true,
  );
  assert.equal(valid(episode, { kind: 'page' }), false);
  assert.equal(valid(episode, { kind: 'edition', edition }), false);
});

test('SCHEMA-3.26.0 carries Listen into the build input as its own resolved audio shape', async () => {
  const build = await readJson('examples/valid/build-input/canonical.json');
  assert.equal(validateGalaDocument(build.schemaId, build).valid, true);
  // The publication switch: optional, closed, and the same definition as the
  // authored publication's.
  const publicationValid = (/** @type {unknown} */ listen) =>
    validateGalaDocument(build.schemaId, {
      ...build,
      publication: { ...build.publication, listen },
    }).valid;
  assert.equal(publicationValid({ enabled: false }), true);
  assert.equal(publicationValid({ enabled: true }), true);
  assert.equal(publicationValid({}), false);
  assert.equal(publicationValid({ enabled: 'no' }), false);
  assert.equal(publicationValid({ enabled: true, extra: 1 }), false);
  const buildSchema = await readJson('schemas/build-input.schema.json');
  const publicationSchema = await readJson('schemas/publication.schema.json');
  assert.deepEqual(buildSchema.$defs.listen, publicationSchema.$defs.listen);
  // The resolved audio of an article.
  const audio = {
    sourcePath: 'assets/listen/episode.mp3',
    mediaType: 'audio/mpeg',
    bytes: 4_243_000,
    sha256: `sha256:${'a'.repeat(64)}`,
  };
  const episode = { audio, durationSeconds: 424, format: 'conversation' };
  const valid = (
    /** @type {unknown} */ listen,
    /** @type {Record<string, unknown>} */ extra = {},
  ) =>
    validateGalaDocument(build.schemaId, {
      ...build,
      content: build.content.map(
        (/** @type {Record<string, any>} */ record, /** @type {number} */ i) =>
          i === 0
            ? {
                ...record,
                frontmatter: { ...record.frontmatter, ...extra, listen },
              }
            : record,
      ),
    }).valid;
  assert.equal(valid(episode), true);
  assert.equal(
    valid({
      ...episode,
      audio: {
        ...audio,
        sourcePath: 'assets/listen/episode.m4a',
        mediaType: 'audio/mp4',
      },
    }),
    true,
  );
  // The image-only media shapes are not widened: only the two audio types.
  for (const mediaType of [
    'audio/ogg',
    'audio/wav',
    'image/png',
    'video/mp4',
  ]) {
    assert.equal(valid({ ...episode, audio: { ...audio, mediaType } }), false);
  }
  // 1 byte to 25 MiB.
  assert.equal(valid({ ...episode, audio: { ...audio, bytes: 1 } }), true);
  assert.equal(
    valid({ ...episode, audio: { ...audio, bytes: 26_214_400 } }),
    true,
  );
  for (const bytes of [0, -1, 26_214_401, 1.5, '4243000']) {
    assert.equal(valid({ ...episode, audio: { ...audio, bytes } }), false);
  }
  for (const sha256 of [
    'a'.repeat(64),
    `sha256:${'a'.repeat(63)}`,
    'sha256:',
  ]) {
    assert.equal(valid({ ...episode, audio: { ...audio, sha256 } }), false);
  }
  for (const sourcePath of [
    'assets/listen/episode.wav',
    'assets/listen/episode',
    '/assets/listen/episode.mp3',
  ]) {
    assert.equal(valid({ ...episode, audio: { ...audio, sourcePath } }), false);
  }
  for (const member of ['sourcePath', 'mediaType', 'bytes', 'sha256']) {
    const missing = { ...audio };
    delete (/** @type {Record<string, unknown>} */ (missing)[member]);
    assert.equal(valid({ ...episode, audio: missing }), false, member);
  }
  assert.equal(valid({ ...episode, audio: { ...audio, path: 'x' } }), false);
  assert.equal(valid({ ...episode, durationSeconds: 10_801 }), false);
  assert.equal(valid({ ...episode, format: 'podcast' }), false);
  assert.equal(valid({ durationSeconds: 424, format: 'skit' }), false);
  // Only an article record may carry it.
  assert.equal(valid(episode, { kind: 'page' }), false);
});

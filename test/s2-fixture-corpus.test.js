import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import { validateGalaDocument } from '../src/index.js';

const S2_FAMILIES = [
  {
    family: 'discriminator-only-composition',
    caseIds: [
      'composition-valid-discriminator-only',
      'composition-rejects-unknown-field',
    ],
  },
  {
    family: 'empty-modules-placements',
    caseIds: [
      'build-input-valid-empty-modules-placements',
      'build-input-rejects-nonempty-modules',
      'build-input-valid-interactions-module',
      'build-input-valid-analytics-module',
      'build-input-valid-policies',
      'build-input-valid-follows-module',
      'build-input-rejects-follows-unknown-member',
      'build-input-valid-follows-public-count',
      'build-input-rejects-follows-public-count-not-boolean',
      'build-input-rejects-follows-without-enabled',
      'build-input-rejects-follows-enabled-not-boolean',
      'build-input-rejects-nonempty-placements',
    ],
  },
  {
    family: 'normalized-inputs',
    caseIds: [
      'normalized-build-input-valid',
      'normalized-publication-missing-source-digest-invalid',
      'normalized-publication-audience-valid',
      'normalized-publication-newsletter-link-without-mode-valid',
      'normalized-publication-sharing-empty-valid',
      'normalized-publication-newsletter-both-modes-invalid',
      'normalized-publication-newsletter-mode-missing-invalid',
      'normalized-publication-sharing-unknown-target-invalid',
      'normalized-publication-sharing-duplicate-target-invalid',
      'normalized-publication-contact-form-fields-missing-invalid',
      'normalized-publication-listen-valid',
      'normalized-publication-listen-without-enabled-invalid',
      'normalized-publication-listen-enabled-not-boolean-invalid',
      'normalized-publication-listen-unknown-member-invalid',
      'normalized-publication-listen-podcast-valid',
      'normalized-publication-listen-podcast-cover-missing-invalid',
      'normalized-publication-listen-podcast-cover-bare-path-invalid',
      'normalized-publication-listen-podcast-category-empty-invalid',
      'normalized-publication-listen-podcast-unknown-member-invalid',
      'normalized-content-listen-valid',
      'normalized-content-listen-m4a-valid',
      'normalized-content-listen-on-page-invalid',
      'normalized-content-listen-audio-missing-invalid',
      'normalized-content-listen-media-type-invalid',
      'normalized-content-listen-path-extension-invalid',
      'normalized-content-listen-file-over-25-mib-invalid',
      'normalized-content-listen-empty-file-invalid',
      'normalized-content-listen-duration-over-three-hours-invalid',
      'normalized-content-listen-duration-zero-invalid',
      'normalized-content-listen-format-unknown-invalid',
      'normalized-content-summary-valid',
      'normalized-content-faq-two-items-valid',
      'normalized-content-summary-and-faq-valid',
      'normalized-content-summary-empty-invalid',
      'normalized-content-summary-over-500-invalid',
      'normalized-content-faq-empty-invalid',
      'normalized-content-faq-21-items-invalid',
      'normalized-content-faq-item-answer-missing-invalid',
      'normalized-content-faq-item-unknown-member-invalid',
      'normalized-content-faq-answer-over-1000-invalid',
      'normalized-content-summary-on-page-invalid',
      'normalized-content-faq-on-page-invalid',
      'frontmatter-summary-valid',
      'frontmatter-faq-two-items-valid',
      'frontmatter-summary-and-faq-valid',
      'frontmatter-summary-empty-invalid',
      'frontmatter-summary-over-500-invalid',
      'frontmatter-faq-empty-invalid',
      'frontmatter-faq-21-items-invalid',
      'frontmatter-faq-item-answer-missing-invalid',
      'frontmatter-faq-item-unknown-member-invalid',
      'frontmatter-faq-answer-over-1000-invalid',
      'frontmatter-summary-on-page-invalid',
      'frontmatter-faq-on-page-invalid',
      'normalized-publication-post-action-follow-valid',
      'normalized-publication-post-action-follow-with-text-valid',
      'normalized-publication-post-action-newsletter-valid',
      'normalized-publication-post-action-link-valid',
      'normalized-publication-post-action-link-site-path-valid',
      'normalized-publication-post-action-link-url-at-limit-valid',
      'normalized-publication-post-action-kind-unknown-invalid',
      'normalized-publication-post-action-link-label-missing-invalid',
      'normalized-publication-post-action-link-url-missing-invalid',
      'normalized-publication-post-action-link-url-too-long-invalid',
      'normalized-publication-post-action-link-url-double-slash-invalid',
      'normalized-publication-post-action-link-url-space-invalid',
      'normalized-publication-post-action-link-url-tab-invalid',
      'normalized-publication-post-action-link-label-line-break-invalid',
      'normalized-publication-post-action-link-url-http-invalid',
      'normalized-publication-post-action-follow-unknown-member-invalid',
      'normalized-publication-post-action-none-invalid',
      'publication-post-action-follow-valid',
      'publication-post-action-follow-with-text-valid',
      'publication-post-action-newsletter-valid',
      'publication-post-action-link-valid',
      'publication-post-action-link-site-path-valid',
      'publication-post-action-link-url-at-limit-valid',
      'publication-post-action-kind-unknown-invalid',
      'publication-post-action-link-label-missing-invalid',
      'publication-post-action-link-url-missing-invalid',
      'publication-post-action-link-url-too-long-invalid',
      'publication-post-action-link-url-double-slash-invalid',
      'publication-post-action-link-url-space-invalid',
      'publication-post-action-link-url-tab-invalid',
      'publication-post-action-link-label-line-break-invalid',
      'publication-post-action-link-url-http-invalid',
      'publication-post-action-follow-unknown-member-invalid',
      'publication-post-action-none-invalid',
      'normalized-content-action-follow-valid',
      'normalized-content-action-follow-with-text-valid',
      'normalized-content-action-newsletter-valid',
      'normalized-content-action-link-valid',
      'normalized-content-action-link-site-path-valid',
      'normalized-content-action-link-url-at-limit-valid',
      'normalized-content-action-kind-unknown-invalid',
      'normalized-content-action-link-label-missing-invalid',
      'normalized-content-action-link-url-missing-invalid',
      'normalized-content-action-link-url-too-long-invalid',
      'normalized-content-action-link-url-double-slash-invalid',
      'normalized-content-action-link-url-space-invalid',
      'normalized-content-action-link-url-tab-invalid',
      'normalized-content-action-link-label-line-break-invalid',
      'normalized-content-action-link-url-http-invalid',
      'normalized-content-action-follow-unknown-member-invalid',
      'normalized-content-action-none-valid',
      'normalized-content-action-none-with-text-invalid',
      'normalized-content-action-on-page-invalid',
      'frontmatter-action-follow-valid',
      'frontmatter-action-follow-with-text-valid',
      'frontmatter-action-newsletter-valid',
      'frontmatter-action-link-valid',
      'frontmatter-action-link-site-path-valid',
      'frontmatter-action-link-url-at-limit-valid',
      'frontmatter-action-kind-unknown-invalid',
      'frontmatter-action-link-label-missing-invalid',
      'frontmatter-action-link-url-missing-invalid',
      'frontmatter-action-link-url-too-long-invalid',
      'frontmatter-action-link-url-double-slash-invalid',
      'frontmatter-action-link-url-space-invalid',
      'frontmatter-action-link-url-tab-invalid',
      'frontmatter-action-link-label-line-break-invalid',
      'frontmatter-action-link-url-http-invalid',
      'frontmatter-action-follow-unknown-member-invalid',
      'frontmatter-action-none-valid',
      'frontmatter-action-none-with-text-invalid',
      'frontmatter-action-on-page-invalid',
    ],
  },
  {
    family: 'unicode17-paths-routes',
    caseIds: [
      'unicode17-nfc-repository-path-valid',
      'unicode17-uppercase-percent-route-valid',
      'unicode17-non-nfc-repository-path-invalid',
      'unicode17-unencoded-route-invalid',
    ],
  },
  {
    family: 'artifact-static-redirects',
    caseIds: [
      'artifact-static-root-redirect-valid',
      'artifact-static-non-root-redirect-valid',
      'artifact-static-redirect-status-invalid',
      'artifact-static-redirect-backing-path-invalid',
    ],
  },
  {
    family: 'theme-contracts-digest-cycle',
    caseIds: [
      'theme-contract-valid-structural',
      'theme-contract-unknown-field-invalid',
    ],
  },
  {
    family: 'lowercase-capabilities',
    caseIds: [
      'capability-local-directory-valid-lowercase',
      'capability-github-pages-valid-lowercase',
      'capability-do-spaces-valid-lowercase',
      'capability-uppercase-invalid',
    ],
  },
  {
    family: 'provider-identities',
    caseIds: [
      'provider-identity-valid-github',
      'provider-identity-uppercase-invalid',
      'provider-identity-unknown-field-invalid',
    ],
  },
  {
    family: 'deployment-records',
    caseIds: [
      'deployment-intent-valid',
      'deployment-intent-operation-id-invalid',
      'deployment-observation-valid',
      'deployment-observation-operation-id-invalid',
      'deployment-receipt-valid',
      'deployment-receipt-operation-id-invalid',
    ],
  },
];

/**
 * Recursively enumerate repository-relative files.
 *
 * @param {string} directory directory to walk
 * @returns {Promise<string[]>} file paths
 */
async function listFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(target)));
    else files.push(target.split(path.sep).join('/'));
  }
  return files;
}

/**
 * Parse JSON.
 *
 * @param {string} file file path
 * @returns {Promise<any>} parsed value
 */
async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

/**
 * Load all S2 family cases by stable ID.
 *
 * @returns {Promise<Map<string, any>>} cases
 */
async function loadCases() {
  const cases = new Map();
  for (const { family } of S2_FAMILIES) {
    const fixture = await readJson(`fixtures/s2/${family}.json`);
    for (const fixtureCase of fixture.cases) {
      assert.equal(cases.has(fixtureCase.caseId), false);
      cases.set(fixtureCase.caseId, fixtureCase);
    }
  }
  return cases;
}

test('legacy generated fixtures remain byte-exact outside the S2 subtree', async () => {
  const files = [
    ...(await listFiles('examples/valid')),
    ...(await listFiles('fixtures')),
  ]
    .filter(
      (file) =>
        !file.startsWith('fixtures/s2/') && !file.startsWith('fixtures/s4/'),
    )
    .sort((left, right) =>
      Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8')),
    );
  const aggregate = createHash('sha256');
  for (const file of files) {
    aggregate.update(file, 'utf8');
    aggregate.update(Buffer.from([0]));
    aggregate.update(await readFile(file));
    aggregate.update(Buffer.from([0]));
  }
  assert.equal(files.length, 912);
  assert.equal(
    // 2026-09-25 code-discipline review, SCH-C3: thirteen $defs shared by
    // name across roots had diverged under the same name with nothing
    // checking (fixed by a new schemas:shared-defs:check gate). Reconciling
    // them regenerated fixtures/manifest.json and the affected boundary/
    // invalid fixture files for every touched root (adapter-capability,
    // appearance, artifact-manifest, build-input, build-provenance,
    // deployment-intent, deployment-observation, deployment-receipt,
    // navigation, theme-contract), and added 9 new fixture files.
    //
    // SCHEMA-2.17.0: media in articles widened artifact-manifest/
    // build-provenance's manifestAsset/manifestRoute mediaType enum and
    // added build-input's optional contentBuildRecord.media (new $defs
    // entry contentBuildMediaFile), regenerating the affected valid/
    // boundary/invalid build-input fixture files. File count unchanged
    // (826): only content changed, no fixture file added or removed.
    //
    // 3.0.0: theme contract 3 regenerated the theme-contract fixtures and
    // publication gained `newsletter`; one file was added
    // (examples/valid/theme-contract/default-3.0.json), making 827.
    //
    // 3.1.0: reader interactions added the interactions-config root and its
    // generated fixtures, moduleBuildSelection admitted `interactions`, and
    // interactionBearing became a boolean, making 865.
    //
    // 3.16.0: the analytics-config root and the build-input analytics module
    // added their generated fixtures, making 903. The publication and
    // build-input policies members (the publication body a path ending in
    // .md) and theme-contract 4.1.0 then regenerated
    // those roots' valid, boundary, invalid and unknown-field fixtures; no
    // file added or removed (903).
    //
    // 3.3.0: appearance/build-input attribution and the content-frontmatter/
    // build-input edition block regenerated those roots' valid, boundary,
    // invalid and unknown-field fixtures. File count unchanged (865).
    //
    // 3.8.0 (reviewed 2026-10-12): the closed generation-4 branches of the
    // template-composition and theme-contract roots and the Editorial package
    // admission regenerated those roots' fixtures and added five adversarial
    // case files (SCHEMA_CONSTANT_INVALID, SCHEMA_ENUM_INVALID,
    // SCHEMA_NEGATED_RULE_MATCHED twice, SCHEMA_UNION_INVALID), making 870.
    // The template-composition root oneOf case is a genuine union failure
    // (two profiles' declared members together), so parity reports it as one.
    //
    // 3.9.0 (reviewed 2026-10-12): the problem root's fieldError gained the
    // optional `reason` enum and `paths` array, regenerating the problem
    // root's valid, boundary, invalid and unknown-field fixtures and adding
    // one case file (problem/SCHEMA_ENUM_INVALID), making 871.
    //
    // 3.10.0 (reviewed 2026-10-12): $defs/semanticTokens became the closed
    // publication palette (optional accent, canvas and text, each {light,
    // dark} of lowercase #rrggbb) and theme-contract gained the optional
    // closed `palette` block with a $defs/paletteFollow entry, regenerating
    // the appearance, build-input and theme-contract fixtures. One new case
    // file (appearance/SCHEMA_PATTERN_INVALID) replaced one that no longer
    // applies (build-input/SCHEMA_OBJECT_TOO_LARGE, once the empty-object
    // cap was gone), so the count stays 871.
    //
    // 3.12.0 (reviewed 2026-10-13): the optional closed `seo` block on
    // content-frontmatter and build-input regenerated those roots' valid,
    // boundary, unknown-field and invalid fixtures; no file added or removed.
    //
    // 3.17.0: the optional `verificationBaseUrl` member of destinationIdentity
    // (adapter-capability, deployment-intent, deployment-observation and
    // deployment-receipt) and the problem root's four optional
    // CANONICAL_BASE_MISMATCH members (expectedBase, profileBase, domainState,
    // remedy) regenerated those roots' valid, boundary, invalid and
    // unknown-field fixtures and the fixture manifest; no file added or
    // removed (903).
    //
    // 3.19.0 (reviewed 2026-10-24): content-frontmatter's optional
    // `publishAfter` member (new $defs/publishAfterDate) regenerated that
    // root's valid, boundary, unknown-field and invalid fixtures and the
    // fixture manifest, and added one case file
    // (content-frontmatter/SCHEMA_PATTERN_INVALID), making 904.
    //
    // 3.21.0 (reviewed 2026-10-27): the optional `translationOf` member and its
    // kind rule regenerated the content-frontmatter and build-input valid,
    // boundary, unknown-field and invalid fixtures and the fixture manifest; no
    // file added or removed (904).
    //
    // 3.22.0 (reviewed 2026-10-27): publication gained the optional `sharing`
    // and `contactForm` members and its `newsletter` became a link-or-Galascribe
    // union (the shared $defs/sharing and $defs/newsletter, plus build-input's
    // $defs/contactFormNormalized), and the interactions config gained the
    // optional `follows` member. That regenerated the publication, build-input
    // and interactions-config valid, boundary, unknown-field and invalid
    // fixtures and the fixture manifest, and added two case files
    // (publication/SCHEMA_ARRAY_DUPLICATE and publication/SCHEMA_UNION_INVALID),
    // making 906.
    aggregate.digest('hex'),
    //
    // 3.25.0 (reviewed 2026-10-29): deleteDate, listing, aiRights and
    // performance regenerated the content-frontmatter, publication and
    // build-input fixtures and the manifest, and added two case files
    // (publication/SCHEMA_NUMBER_TOO_LARGE and SCHEMA_NUMBER_TOO_SMALL),
    // making 908.
    //
    // 3.25.1 (reviewed 2026-10-29): the optional Problem.details member
    // (PAGE_LOSS_GUARD counts) regenerated the problem fixtures and the
    // manifest. No file added; still 908.
    //
    // 3.26.0 (reviewed 2026-10-30): the optional `listen` members (publication,
    // article front matter, and build-input's $defs/listen,
    // $defs/contentListenNormalized and $defs/listenAudio) regenerated the
    // publication, content-frontmatter and build-input valid, boundary,
    // unknown-field and invalid fixtures and the manifest. No file added or
    // removed; still 908.
    //
    // 3.32.0 (reviewed 2026-11-03): newsletter.welcome and afterSignupUrl,
    // recommendations, application/pdf and comments.likes regenerated the
    // publication, build-input, artifact-manifest, build-provenance and
    // interactions-config fixtures and the manifest. No file added or removed.
    //
    // 3.35.0 (reviewed 2026-11-04): the problem root's optional
    // CANONICAL_BASE_MISMATCH member `changeIds` (1 to 20 unique change ids)
    // regenerated the problem valid, boundary, unknown-field and invalid
    // fixtures and the manifest, and added two case files
    // (problem/SCHEMA_ARRAY_DUPLICATE, problem/SCHEMA_ARRAY_TOO_SHORT),
    // making 910.
    //
    // 3.37.0 (reviewed 2026-11-05): the problem root's optional
    // SYNDICATION_CREDENTIAL_REJECTED member `platformMessage` (1 to 500
    // characters) regenerated the problem valid, boundary, unknown-field and
    // invalid fixtures and the manifest. No file added or removed (910).
    //
    // 3.44.0 (reviewed 2026-11-07): `threads` joins the share targets (12
    // maximum) and the normalized sharing member becomes $defs/resolvedSharing,
    // which regenerated the build-input and publication fixtures and the
    // manifest. No file added or removed.
    //
    // 3.53.0 (reviewed 2026-11-22): the audience program's front-matter members
    // (`newsletterTag`, `newsletterSubjectB`) and `listen.podcast` regenerated
    // the content-frontmatter, publication and build-input fixtures and the
    // manifest, and added one case file
    // (content-frontmatter/SCHEMA_STRING_TOO_LONG), making 911. The build-input
    // podcast cover is the resolved file {path, sourceDigest}, so its fixtures
    // changed again and gained the bare-path invalid case (no file added).
    //
    // 3.55.0 (reviewed 2026-11-23): the optional article-only `summary` and
    // `faq` members regenerated the content-frontmatter and build-input valid,
    // boundary, unknown-field and invalid fixtures and the manifest. No file
    // added or removed (911).
    //
    // 3.56.0 (reviewed 2026-11-26): the optional `postAction` and article-only
    // `action` members and `follows.publicCount` regenerated the
    // content-frontmatter, build-input, publication and interactions-config
    // valid, boundary, unknown-field and invalid fixtures and the manifest,
    // and added content-frontmatter/SCHEMA_UNION_INVALID (912 files).
    //
    // 3.56.1 (reviewed 2026-11-26): the flattened post action union regenerated the schema-rule fixtures and the manifest; no file added or removed (912).
    '8ed2f672a7bd9b00dd42b7992e9b79d64c5524b3f35849dbae8d3b8f5d9e26ea',
  );
});

test('S2 manifest binds the exact inventory, family names, files, and case IDs', async () => {
  const expectedFiles = [
    ...S2_FAMILIES.map(({ family }) => `fixtures/s2/${family}.json`),
    'fixtures/s2/manifest.json',
  ].sort();
  assert.deepEqual((await listFiles('fixtures/s2')).sort(), expectedFiles);

  const manifest = await readJson('fixtures/s2/manifest.json');
  assert.deepEqual(Object.keys(manifest), [
    'schemaVersion',
    'contractVersion',
    'fixtureScope',
    'coverageModel',
    'families',
  ]);
  assert.equal(manifest.schemaVersion, '1.0.0');
  assert.equal(manifest.contractVersion, '2.0.0');
  assert.match(manifest.coverageModel, /only public registered-schema/u);
  assert.match(manifest.coverageModel, /not a public serialized format/u);
  assert.deepEqual(
    manifest.families.map((/** @type {any} */ family) => ({
      family: family.family,
      caseIds: family.caseIds,
    })),
    S2_FAMILIES,
  );
  assert.deepEqual(
    manifest.families.map((/** @type {any} */ family) => family.file),
    S2_FAMILIES.map(({ family }) => `fixtures/s2/${family}.json`),
  );
  assert.equal(
    new Set(manifest.families.map((/** @type {any} */ entry) => entry.file))
      .size,
    9,
  );

  const referencedFiles = new Set(
    manifest.families.map((/** @type {any} */ { file }) => file),
  );
  assert.deepEqual(
    expectedFiles.filter((file) => file !== 'fixtures/s2/manifest.json'),
    [...referencedFiles].sort(),
  );
  const allCaseIds = manifest.families.flatMap(
    (/** @type {any} */ { caseIds }) => caseIds,
  );
  assert.equal(new Set(allCaseIds).size, allCaseIds.length);

  for (const family of manifest.families) {
    assert.deepEqual(Object.keys(family), [
      'family',
      'file',
      'caseIds',
      'publicCoverage',
      'internalSemanticCoverage',
    ]);
    assert.equal(family.publicCoverage, 'registered-schema-structural-vectors');
    const fixture = await readJson(family.file);
    assert.deepEqual(Object.keys(fixture), ['family', 'cases']);
    assert.equal(fixture.family, family.family);
    assert.deepEqual(
      fixture.cases.map((/** @type {any} */ { caseId }) => caseId),
      family.caseIds,
    );
    for (const reference of family.internalSemanticCoverage) {
      assert.deepEqual(Object.keys(reference), ['file', 'testName']);
      const source = await readFile(reference.file, 'utf8');
      assert.equal(source.includes(`test('${reference.testName}'`), true);
    }
  }
});

test('every S2 schema-bearing instance has its exact public diagnostics', async () => {
  const cases = await loadCases();
  for (const fixtureCase of cases.values()) {
    assert.deepEqual(Object.keys(fixtureCase), [
      'caseId',
      'schemaId',
      'instance',
      'expectedDiagnostics',
    ]);
    assert.equal(fixtureCase.instance.schemaId, fixtureCase.schemaId);
    const result = validateGalaDocument(
      fixtureCase.schemaId,
      fixtureCase.instance,
    );
    assert.deepEqual(
      result.diagnostics.map(({ code, instancePointer }) => ({
        code,
        instancePointer,
      })),
      fixtureCase.expectedDiagnostics,
      fixtureCase.caseId,
    );
    assert.equal(result.valid, fixtureCase.expectedDiagnostics.length === 0);
  }
});

test('the nine S2 families preserve their consumer-facing invariants', async () => {
  const cases = await loadCases();
  /**
   * @param {string} caseId fixture case identity
   * @returns {any} fixture instance
   */
  const value = (caseId) => cases.get(caseId).instance;

  assert.deepEqual(Object.keys(value('composition-valid-discriminator-only')), [
    'schemaId',
    'schemaVersion',
  ]);

  const emptyBuildInput = value('build-input-valid-empty-modules-placements');
  assert.deepEqual(emptyBuildInput.modules, {});
  assert.deepEqual(emptyBuildInput.placements, []);
  assert.notDeepEqual(
    value('build-input-rejects-nonempty-modules').modules,
    {},
  );
  assert.deepEqual(
    Object.keys(value('build-input-valid-interactions-module').modules),
    ['interactions'],
  );
  assert.deepEqual(
    Object.keys(value('build-input-valid-analytics-module').modules),
    ['analytics'],
  );
  assert.deepEqual(Object.keys(value('build-input-valid-policies').policies), [
    'terms',
    'privacy',
  ]);
  assert.notDeepEqual(
    value('build-input-rejects-nonempty-placements').placements,
    [],
  );

  const normalized = value('normalized-build-input-valid');
  assert.equal(normalized.sourceRevision, normalized.repository.sourceRevision);
  assert.equal(normalized.baseUrl.endsWith('/'), true);
  assert.equal(normalized.basePath.startsWith('/'), true);
  assert.equal(
    value('normalized-publication-missing-source-digest-invalid').publication
      .sourceDigest,
    undefined,
  );

  const unicodePath = value('unicode17-nfc-repository-path-valid').assetRoots[0]
    .path;
  assert.equal(unicodePath, unicodePath.normalize('NFC'));
  assert.equal(
    Buffer.byteLength(unicodePath, 'utf8') > unicodePath.length,
    true,
  );
  assert.equal(
    value('unicode17-uppercase-percent-route-valid').content[0].frontmatter
      .redirects[0],
    '/caf%C3%A9',
  );
  const nonNfcPath = value('unicode17-non-nfc-repository-path-invalid')
    .assetRoots[0].path;
  assert.notEqual(nonNfcPath, nonNfcPath.normalize('NFC'));
  assert.equal(
    value('unicode17-unencoded-route-invalid').content[0].frontmatter
      .redirects[0],
    '/café',
  );

  const rootRedirect = value('artifact-static-root-redirect-valid')
    .redirects[0];
  assert.deepEqual(
    [rootRedirect.targetRoute, rootRedirect.status, rootRedirect.backingPath],
    ['/', 200, 'old-home/index.html'],
  );
  const nonRootRedirect = value('artifact-static-non-root-redirect-valid')
    .redirects[0];
  assert.deepEqual(
    [
      nonRootRedirect.sourceRoute,
      nonRootRedirect.targetRoute,
      nonRootRedirect.status,
      nonRootRedirect.backingPath,
    ],
    ['/blog/old', '/blog/new', 200, 'blog/old/index.html'],
  );
  assert.notEqual(
    value('artifact-static-redirect-status-invalid').redirects[0].status,
    200,
  );
  assert.equal(
    value('artifact-static-redirect-backing-path-invalid').redirects[0]
      .backingPath,
    '../index.html',
  );

  const theme = value('theme-contract-valid-structural');
  assert.equal(
    new Set([
      theme.integrity,
      theme.fixtureDigest,
      theme.evidenceDigest,
      theme.stylingContractDigest,
    ]).size,
    4,
  );

  const capabilityCaseIds = [
    'capability-local-directory-valid-lowercase',
    'capability-github-pages-valid-lowercase',
    'capability-do-spaces-valid-lowercase',
  ];
  assert.deepEqual(
    capabilityCaseIds.map((caseId) => value(caseId).destinationKinds),
    [['local-directory'], ['github-pages'], ['do-spaces']],
  );
  for (const caseId of capabilityCaseIds) {
    const operations = value(caseId).operations;
    assert.equal(
      operations.every(
        (/** @type {string} */ operation) =>
          operation === operation.toLowerCase(),
      ),
      true,
    );
  }
  assert.equal(
    value('capability-uppercase-invalid').operations.includes('Activate'),
    true,
  );

  assert.equal(
    value('provider-identity-valid-github').sourceIdentity.provider,
    'github',
  );
  assert.equal(
    value('provider-identity-uppercase-invalid').sourceIdentity.provider,
    'GitHub',
  );
  assert.equal(
    value('provider-identity-unknown-field-invalid').sourceIdentity.unexpected,
    true,
  );

  for (const record of ['intent', 'observation', 'receipt']) {
    assert.equal(value(`deployment-${record}-valid`).unexpected, undefined);
    assert.equal(
      value(`deployment-${record}-operation-id-invalid`).operationId.includes(
        'C',
      ),
      true,
    );
  }
});

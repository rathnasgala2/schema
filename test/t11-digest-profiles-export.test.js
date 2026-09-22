import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import * as publicSurface from '../src/digest-profiles.js';
import * as internalModule from '../src/internal/digest-profiles.js';
import { measureEntryClosure } from '../scripts/check-browser-safety.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');

/**
 * The pinned public export-name set. Adding, renaming or removing a public
 * name is a contract change and must be reviewed here, in the README and in
 * the CHANGELOG together.
 */
const PINNED_EXPORT_NAMES = Object.freeze([
  'ACTIVE_DIGEST_DOMAINS',
  'ACTIVE_DIGEST_DOMAIN_COUNT',
  'ACTIVE_DIGEST_PROFILES',
  'digestDomainSeparatedJcs',
  'domainSeparatedJcsPreimage',
]);

/**
 * The pinned active profile inventory (the 80 DEC-097/098 domains whose golden
 * preimage and SHA-256 vectors `test/t03-digest-profiles.test.js` reproduces).
 * Every name here must be reachable through the public export.
 */
const PINNED_PROFILE_NAMES = Object.freeze([
  'adapterCapability',
  'appearanceDefault',
  'artifact',
  'artifactManifest',
  'artifactValidationEvidence',
  'buildInput',
  'buildPolicyDecision',
  'buildProvenance',
  'buildWorkflowIdentity',
  'cancellationFinalizationEvidence',
  'capabilityDecision',
  'deadlineFinalizationEvidence',
  'deploymentIntent',
  'deploymentPolicyDecision',
  'deploymentReceipt',
  'deploymentStageEvidence',
  'deploymentStageInput',
  'deploymentStageResult',
  'destinationMutationKey',
  'destinationProviderBinding',
  'githubActionsOidcOriginCatalog',
  'githubHostedRunnerCompatibility',
  'githubWorkloadOidcKeySet',
  'githubWorkloadOidcVerificationProfile',
  'localFilesystemAllowlist',
  'localFilesystemCapabilityEvidence',
  'localFilesystemControlRow',
  'localFilesystemFailureEvidence',
  'localFilesystemObservationEvidence',
  'localFilesystemProbeTranscript',
  'localMutationSurface',
  'localRootIdentity',
  'localRootPath',
  'localStageToken',
  'localSurfaceIdentity',
  'lock',
  'managedEvidenceAppend',
  'managedEvidenceEntry',
  'managedEvidenceGenesis',
  'managedReceiptSubmission',
  'navigationDefault',
  'networkBoundaryProfile',
  'npmRegistryFetchProfile',
  'packageReleaseCatalog',
  'pagesBuildVersion',
  'pagesDeployment',
  'pagesNoAuthorityRunAttempt',
  'pagesReconciliationCommand',
  'pagesReconciliationRecovery',
  'pagesRunAttemptGapProof',
  'providerCallClassBinding',
  'providerCredentialEgress',
  'providerRequestTemplates',
  'providerResponseCatalog',
  'providerTlsProfile',
  'publicActivationDetectionObservation',
  'publicActivationDetectionPlan',
  'publicActivationDetectionProbe',
  'publicProbeJitter',
  'publicProbeObservation',
  'publicTlsProfile',
  'renderPolicy',
  'repositoryRoot',
  'sourceInventory',
  'spacesControlPlaneBinding',
  'spacesControlPlaneEvidence',
  'spacesControlPlaneRequestCatalog',
  'spacesControlPlaneResponseCatalog',
  'spacesCredentialProfile',
  'spacesRegionCatalog',
  'spacesWebsiteConfiguration',
  'supersessionFinalizationEvidence',
  'templateStylingContract',
  'themeConformanceEvidence',
  'themeConformanceInput',
  'themeFixtureRelease',
  'themePackageIntegrity',
  'tlsRevocationSet',
  'verificationPlan',
  'verifiedWorkloadBinding',
]);

/** Profiles whose projection is not encoded as JCS bytes. */
const NON_JCS_PROFILES = new Set([
  'localRootPath',
  'managedEvidenceAppend',
  'renderPolicy',
]);

/** Profiles whose projector rejects a plain `[COMMON]`/`COMMON` vector. */
const SHAPE_BOUND_PROFILES = new Set([
  'artifactValidationEvidence',
  'buildWorkflowIdentity',
  'githubWorkloadOidcKeySet',
  'localMutationSurface',
  'localRootIdentity',
  'localStageToken',
  'managedEvidenceGenesis',
  'networkBoundaryProfile',
  'pagesBuildVersion',
  'pagesDeployment',
  'pagesNoAuthorityRunAttempt',
  'publicProbeJitter',
  'sourceInventory',
]);

const ARRAY_PROFILES = new Set([
  'artifact',
  'providerCallClassBinding',
  'providerRequestTemplates',
  'repositoryRoot',
  'themeConformanceInput',
  'themePackageIntegrity',
  'verificationPlan',
]);

const COMMON = Object.freeze({ z: 1, a: 'é' });

test('the public export surface is exactly the pinned name set', async () => {
  assert.deepEqual(Object.keys(publicSurface).sort(), [...PINNED_EXPORT_NAMES]);
  const packageJson = JSON.parse(
    await readFile(path.resolve(ROOT, 'package.json'), 'utf8'),
  );
  assert.deepEqual(packageJson.exports['./digest-profiles'], {
    types: './types/digest-profiles.d.ts',
    import: './src/digest-profiles.js',
  });
  const declaration = await readFile(
    path.resolve(ROOT, 'types/digest-profiles.d.ts'),
    'utf8',
  );
  for (const name of PINNED_EXPORT_NAMES) {
    assert.match(declaration, new RegExp(`\\b${name}\\b`, 'u'), name);
  }
});

test('every active profile is reachable through the public export', () => {
  assert.equal(publicSurface.ACTIVE_DIGEST_DOMAIN_COUNT, 80);
  assert.equal(PINNED_PROFILE_NAMES.length, 80);
  assert.deepEqual(Object.keys(publicSurface.ACTIVE_DIGEST_PROFILES).sort(), [
    ...PINNED_PROFILE_NAMES,
  ]);
  assert.deepEqual(Object.keys(publicSurface.ACTIVE_DIGEST_DOMAINS).sort(), [
    ...PINNED_PROFILE_NAMES,
  ]);
  // The public surface is the validator's own inventory, not a copy: the same
  // frozen objects the internal semantics modules digest with.
  assert.equal(
    publicSurface.ACTIVE_DIGEST_PROFILES,
    internalModule.ACTIVE_DIGEST_PROFILES,
  );
  assert.equal(
    publicSurface.ACTIVE_DIGEST_DOMAINS,
    internalModule.ACTIVE_DIGEST_DOMAINS,
  );
  assert.equal(
    publicSurface.digestDomainSeparatedJcs,
    internalModule.digestDomainSeparatedJcs,
  );
  assert.equal(
    publicSurface.domainSeparatedJcsPreimage,
    internalModule.domainSeparatedJcsPreimage,
  );
  for (const name of PINNED_PROFILE_NAMES) {
    const profile = publicSurface.ACTIVE_DIGEST_PROFILES[name];
    assert.ok(profile, name);
    assert.equal(profile.domain, publicSurface.ACTIVE_DIGEST_DOMAINS[name]);
    assert.match(profile.domain, /^GALA-[A-Z0-9-]+-V2\0$/u, name);
    for (const member of ['project', 'preimage', 'digest', 'digestBytes']) {
      assert.equal(
        typeof (/** @type {Record<string, unknown>} */ (profile)[member]),
        'function',
        `${name}.${member}`,
      );
    }
  }
});

test('the public surface is read-only for consumers', () => {
  assert.ok(Object.isFrozen(publicSurface.ACTIVE_DIGEST_PROFILES));
  assert.ok(Object.isFrozen(publicSurface.ACTIVE_DIGEST_DOMAINS));
  for (const name of PINNED_PROFILE_NAMES) {
    assert.ok(
      Object.isFrozen(publicSurface.ACTIVE_DIGEST_PROFILES[name]),
      name,
    );
  }
  assert.throws(() => {
    /** @type {Record<string, unknown>} */ (
      publicSurface.ACTIVE_DIGEST_DOMAINS
    ).providerCallClassBinding = 'GALA-FORGED-V2\0';
  }, TypeError);
  assert.throws(() => {
    /** @type {Record<string, unknown>} */ (
      publicSurface.ACTIVE_DIGEST_PROFILES
    ).forged = {};
  }, TypeError);
  assert.throws(() => {
    /** @type {Record<string, unknown>} */ (
      publicSurface.ACTIVE_DIGEST_PROFILES.providerCallClassBinding
    ).digest = () => 'sha256:forged';
  }, TypeError);
  assert.equal(
    publicSurface.ACTIVE_DIGEST_DOMAINS.providerCallClassBinding,
    'GALA-PROVIDER-CALL-CLASS-BINDING-V2\0',
  );
});

test('a JCS profile digest equals the domain-separated JCS of its projection', () => {
  const { ACTIVE_DIGEST_PROFILES, digestDomainSeparatedJcs } = publicSurface;
  let checked = 0;
  for (const name of PINNED_PROFILE_NAMES) {
    if (NON_JCS_PROFILES.has(name) || SHAPE_BOUND_PROFILES.has(name)) continue;
    const profile = ACTIVE_DIGEST_PROFILES[name];
    assert.ok(profile, name);
    const input = ARRAY_PROFILES.has(name) ? [COMMON] : { ...COMMON };
    assert.equal(
      profile.digest(input),
      digestDomainSeparatedJcs(profile.domain, profile.project(input)),
      name,
    );
    checked += 1;
  }
  assert.equal(checked, 80 - NON_JCS_PROFILES.size - SHAPE_BOUND_PROFILES.size);
});

test('the adapter-capability digests publish needs are computed through the profile', () => {
  // PUBLISH-S4-4b: `callClassBindingDigest` and `requestTemplateCatalogDigest`
  // are array projections under their own domains; the profile and the bare
  // domain helper agree, and the domain strings are the normative ones.
  const { ACTIVE_DIGEST_DOMAINS, ACTIVE_DIGEST_PROFILES } = publicSurface;
  const callClassRows = [
    { callClass: 'pages-deployment-create', source: 'pagesDeploymentId' },
  ];
  const templateRows = [{ templateId: 'create-deployment', method: 'POST' }];
  const callClassProfile = ACTIVE_DIGEST_PROFILES.providerCallClassBinding;
  const templateProfile = ACTIVE_DIGEST_PROFILES.providerRequestTemplates;
  assert.ok(callClassProfile);
  assert.ok(templateProfile);
  assert.equal(
    ACTIVE_DIGEST_DOMAINS.providerRequestTemplates,
    'GALA-PROVIDER-REQUEST-TEMPLATES-V2\0',
  );
  assert.equal(
    callClassProfile.digest(callClassRows),
    publicSurface.digestDomainSeparatedJcs(
      callClassProfile.domain,
      callClassRows,
    ),
  );
  assert.equal(
    templateProfile.digest(templateRows),
    publicSurface.digestDomainSeparatedJcs(
      templateProfile.domain,
      templateRows,
    ),
  );
  assert.throws(
    () => callClassProfile.digest({}),
    /DIGEST_PROFILE_ARRAY_REQUIRED/u,
  );
});

test('the digest-profiles entry point stays a narrow, browser-safe closure', async () => {
  const closure = await measureEntryClosure(ROOT, 'src/digest-profiles.js');
  assert.deepEqual(closure.files, [
    'src/digest-profiles.js',
    'src/internal/bytes.js',
    'src/internal/canonical-jcs.js',
    'src/internal/digest-profiles.js',
    'src/internal/sha256.js',
  ]);
});

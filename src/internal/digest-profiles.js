import {
  asciiBytes,
  compareBytes,
  concatBytes,
  hexFromBytes,
  readUint64BigEndian,
  utf8Bytes,
} from './bytes.js';
import {
  canonicalizeJcsBytes,
  decodeTaggedSha256,
  domainSeparatedSha256,
  sha256Tagged,
} from './canonical-jcs.js';

/** @typedef {(value: unknown) => unknown} Projector */
/** @typedef {(projected: unknown) => Uint8Array} ProjectionEncoder */

/**
 * @typedef {Readonly<{
 *   domain: string,
 *   project: Projector,
 *   preimage: (value: unknown) => Uint8Array,
 *   digest: (value: unknown) => string,
 *   digestBytes: (value: unknown) => Uint8Array,
 * }>} DigestProfile
 */

const DOMAIN = Object.freeze({
  adapterCapability: 'GALA-ADAPTER-CAPABILITY-V2\0',
  appearanceDefault: 'GALA-APPEARANCE-DEFAULT-V2\0',
  artifactManifest: 'GALA-ARTIFACT-MANIFEST-V2\0',
  artifact: 'GALA-ARTIFACT-V2\0',
  artifactValidationEvidence: 'GALA-ARTIFACT-VALIDATION-EVIDENCE-V2\0',
  buildInput: 'GALA-BUILD-INPUT-V2\0',
  buildPolicyDecision: 'GALA-BUILD-POLICY-DECISION-V2\0',
  buildProvenance: 'GALA-BUILD-PROVENANCE-V2\0',
  buildWorkflowIdentity: 'GALA-BUILD-WORKFLOW-IDENTITY-V2\0',
  cancellationFinalizationEvidence:
    'GALA-CANCELLATION-FINALIZATION-EVIDENCE-V2\0',
  capabilityDecision: 'GALA-CAPABILITY-DECISION-V2\0',
  deadlineFinalizationEvidence: 'GALA-DEADLINE-FINALIZATION-EVIDENCE-V2\0',
  deploymentIntent: 'GALA-DEPLOYMENT-INTENT-V2\0',
  deploymentPolicyDecision: 'GALA-DEPLOYMENT-POLICY-DECISION-V2\0',
  deploymentReceipt: 'GALA-DEPLOYMENT-RECEIPT-V2\0',
  deploymentStageEvidence: 'GALA-DEPLOYMENT-STAGE-EVIDENCE-V2\0',
  deploymentStageInput: 'GALA-DEPLOYMENT-STAGE-INPUT-V2\0',
  deploymentStageResult: 'GALA-DEPLOYMENT-STAGE-RESULT-V2\0',
  destinationMutationKey: 'GALA-DESTINATION-MUTATION-KEY-V2\0',
  destinationProviderBinding: 'GALA-DESTINATION-PROVIDER-BINDING-V2\0',
  spacesControlPlaneBinding: 'GALA-DO-SPACES-CONTROL-PLANE-BINDING-V2\0',
  spacesControlPlaneEvidence: 'GALA-DO-SPACES-CONTROL-PLANE-EVIDENCE-V2\0',
  spacesControlPlaneRequestCatalog:
    'GALA-DO-SPACES-CONTROL-PLANE-REQUESTS-V2\0',
  spacesControlPlaneResponseCatalog:
    'GALA-DO-SPACES-CONTROL-PLANE-RESPONSES-V2\0',
  spacesCredentialProfile: 'GALA-DO-SPACES-CREDENTIAL-PROFILE-V2\0',
  spacesRegionCatalog: 'GALA-DO-SPACES-REGIONS-V2\0',
  spacesWebsiteConfiguration: 'GALA-DO-SPACES-WEBSITE-CONFIGURATION-V2\0',
  githubActionsOidcOriginCatalog:
    'GALA-GITHUB-ACTIONS-OIDC-ORIGIN-CATALOG-V2\0',
  githubHostedRunnerCompatibility:
    'GALA-GITHUB-HOSTED-RUNNER-COMPATIBILITY-V2\0',
  githubWorkloadOidcKeySet: 'GALA-GITHUB-WORKLOAD-OIDC-KEY-SET-V2\0',
  githubWorkloadOidcVerificationProfile:
    'GALA-GITHUB-WORKLOAD-OIDC-VERIFICATION-V2\0',
  localFilesystemAllowlist: 'GALA-LOCAL-FILESYSTEM-ALLOWLIST-V2\0',
  localFilesystemCapabilityEvidence:
    'GALA-LOCAL-FILESYSTEM-CAPABILITY-EVIDENCE-V2\0',
  localFilesystemControlRow: 'GALA-LOCAL-FILESYSTEM-CONTROL-ROW-V2\0',
  localFilesystemFailureEvidence: 'GALA-LOCAL-FILESYSTEM-FAILURE-V2\0',
  localFilesystemObservationEvidence: 'GALA-LOCAL-FILESYSTEM-OBSERVATION-V2\0',
  localFilesystemProbeTranscript: 'GALA-LOCAL-FILESYSTEM-PROBE-TRANSCRIPT-V2\0',
  localMutationSurface: 'GALA-LOCAL-MUTATION-SURFACE-V2\0',
  localRootIdentity: 'GALA-LOCAL-ROOT-IDENTITY-V2\0',
  localRootPath: 'GALA-LOCAL-ROOT-PATH-V2\0',
  localStageToken: 'GALA-LOCAL-STAGE-TOKEN-V2\0',
  localSurfaceIdentity: 'GALA-LOCAL-SURFACE-IDENTITY-V2\0',
  lock: 'GALA-LOCK-V2\0',
  managedEvidenceAppend: 'GALA-MANAGED-EVIDENCE-APPEND-V2\0',
  managedEvidenceEntry: 'GALA-MANAGED-EVIDENCE-ENTRY-V2\0',
  managedEvidenceGenesis: 'GALA-MANAGED-EVIDENCE-GENESIS-V2\0',
  managedReceiptSubmission: 'GALA-MANAGED-RECEIPT-SUBMISSION-V2\0',
  navigationDefault: 'GALA-NAVIGATION-DEFAULT-V2\0',
  networkBoundaryProfile: 'GALA-NETWORK-BOUNDARY-PROFILE-V2\0',
  npmRegistryFetchProfile: 'GALA-NPM-REGISTRY-FETCH-PROFILE-V2\0',
  packageReleaseCatalog: 'GALA-PACKAGE-RELEASE-CATALOG-V2\0',
  pagesBuildVersion: 'GALA-PAGES-BUILD-VERSION-V2\0',
  pagesDeployment: 'GALA-PAGES-DEPLOYMENT-V2\0',
  pagesNoAuthorityRunAttempt: 'GALA-PAGES-NO-AUTHORITY-RUN-ATTEMPT-V2\0',
  pagesReconciliationCommand: 'GALA-PAGES-RECONCILIATION-COMMAND-V2\0',
  pagesReconciliationRecovery: 'GALA-PAGES-RECONCILIATION-RECOVERY-V2\0',
  pagesRunAttemptGapProof: 'GALA-PAGES-RUN-ATTEMPT-GAP-PROOF-V2\0',
  providerCallClassBinding: 'GALA-PROVIDER-CALL-CLASS-BINDING-V2\0',
  providerCredentialEgress: 'GALA-PROVIDER-CREDENTIAL-EGRESS-V2\0',
  providerRequestTemplates: 'GALA-PROVIDER-REQUEST-TEMPLATES-V2\0',
  providerResponseCatalog: 'GALA-PROVIDER-RESPONSE-CATALOG-V2\0',
  providerTlsProfile: 'GALA-PROVIDER-TLS-PROFILE-V2\0',
  publicActivationDetectionObservation:
    'GALA-PUBLIC-ACTIVATION-DETECTION-OBSERVATION-V2\0',
  publicActivationDetectionPlan: 'GALA-PUBLIC-ACTIVATION-DETECTION-PLAN-V2\0',
  publicActivationDetectionProbe: 'GALA-PUBLIC-ACTIVATION-DETECTION-PROBE-V2\0',
  publicProbeJitter: 'GALA-PUBLIC-PROBE-JITTER-V2\0',
  publicProbeObservation: 'GALA-PUBLIC-PROBE-OBSERVATION-V2\0',
  publicTlsProfile: 'GALA-PUBLIC-TLS-PROFILE-V2\0',
  renderPolicy: 'GALA-RENDER-POLICY-V2\0',
  repositoryRoot: 'GALA-REPOSITORY-ROOT-V2\0',
  sourceInventory: 'GALA-SOURCE-INVENTORY-V2\0',
  supersessionFinalizationEvidence:
    'GALA-SUPERSESSION-FINALIZATION-EVIDENCE-V2\0',
  templateStylingContract: 'GALA-TEMPLATE-STYLING-CONTRACT-V2\0',
  themeConformanceEvidence: 'GALA-THEME-CONFORMANCE-EVIDENCE-V2\0',
  themeConformanceInput: 'GALA-THEME-CONFORMANCE-INPUT-V2\0',
  themeFixtureRelease: 'GALA-THEME-FIXTURE-RELEASE-V2\0',
  themePackageIntegrity: 'GALA-THEME-PACKAGE-INTEGRITY-V2\0',
  tlsRevocationSet: 'GALA-TLS-REVOCATION-SET-V2\0',
  verificationPlan: 'GALA-VERIFICATION-PLAN-V2\0',
  verifiedWorkloadBinding: 'GALA-VERIFIED-WORKLOAD-BINDING-V2\0',
});

/**
 * Require a plain JSON object.
 *
 * @param {unknown} value candidate object
 * @returns {Record<string, unknown>} checked object
 */
function asRecord(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('DIGEST_PROFILE_OBJECT_REQUIRED');
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError('DIGEST_PROFILE_OBJECT_REQUIRED');
  }
  return /** @type {Record<string, unknown>} */ (value);
}

/**
 * Require an array projection.
 *
 * @param {unknown} value candidate array
 * @returns {unknown[]} checked array
 */
function asArray(value) {
  if (!Array.isArray(value))
    throw new TypeError('DIGEST_PROFILE_ARRAY_REQUIRED');
  return value;
}

/**
 * Require raw bytes.
 *
 * @param {unknown} value candidate byte sequence
 * @returns {Uint8Array} byte view
 */
function asBytes(value) {
  if (!(value instanceof Uint8Array)) {
    throw new TypeError('DIGEST_PROFILE_BYTES_REQUIRED');
  }
  return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
}

/**
 * Copy a record while omitting authority-fixed members.
 *
 * @param {unknown} value source record
 * @param {readonly string[]} excluded exact excluded members
 * @returns {Record<string, unknown>} copied projection
 */
function omitFixedMembers(value, excluded) {
  const source = asRecord(value);
  const excludedSet = new Set(excluded);
  return Object.fromEntries(
    Object.entries(source).filter(([key]) => !excludedSet.has(key)),
  );
}

/**
 * Select an authority-fixed required member list.
 *
 * @param {unknown} value source record
 * @param {readonly string[]} members exact selected members
 * @returns {Record<string, unknown>} selected projection
 */
function selectRequiredMembers(value, members) {
  const source = asRecord(value);
  return Object.fromEntries(
    members.map((member) => {
      if (!Object.hasOwn(source, member)) {
        throw new TypeError(`DIGEST_PROFILE_MEMBER_MISSING:${member}`);
      }
      return [member, source[member]];
    }),
  );
}

/**
 * Encode a projection as RFC 8785 JCS bytes.
 *
 * @param {unknown} projected projected value
 * @returns {Uint8Array} canonical bytes
 */
function encodeJcs(projected) {
  return canonicalizeJcsBytes(projected);
}

/**
 * Encode one validated canonical root path as raw UTF-8.
 *
 * @param {unknown} projected path spelling
 * @returns {Uint8Array} raw UTF-8 bytes
 */
function encodeRootPath(projected) {
  if (typeof projected !== 'string') {
    throw new TypeError('DIGEST_PROFILE_STRING_REQUIRED');
  }
  canonicalizeJcsBytes(projected);
  return asciiBytes(projected);
}

/**
 * Encode an evidence append projection as two decoded 32-byte digests.
 *
 * @param {unknown} projected append coordinates
 * @returns {Uint8Array} fixed 64-byte projection
 */
function encodeManagedEvidenceAppend(projected) {
  const row = asRecord(projected);
  if (
    typeof row.previousHeadDigest !== 'string' ||
    typeof row.entryDigest !== 'string'
  ) {
    throw new TypeError('DIGEST_PROFILE_TAGGED_DIGEST_REQUIRED');
  }
  return concatBytes([
    decodeTaggedSha256(row.previousHeadDigest),
    decodeTaggedSha256(row.entryDigest),
  ]);
}

/**
 * Build one immutable digest profile.
 *
 * @param {string} domain terminal-NUL domain
 * @param {Projector} project named projector
 * @param {ProjectionEncoder} [encode] projection encoder
 * @returns {DigestProfile} digest profile
 */
function defineProfile(domain, project, encode = encodeJcs) {
  /** @type {(value: unknown) => string} */
  const digest = (value) =>
    domainSeparatedSha256(domain, encode(project(value)));
  /** @type {(value: unknown) => Uint8Array} */
  const preimage = (value) =>
    concatBytes([asciiBytes(domain), encode(project(value))]);
  /** @type {(value: unknown) => Uint8Array} */
  const digestBytes = (value) => decodeTaggedSha256(digest(value));
  // SCHEMA-2.9.0: the profile object was already frozen; its four function
  // members are frozen too, so a consumer cannot hang a property off
  // `profile.digest` (or `project`, which several profiles share) and
  // observe it from another profile or another consumer.
  return Object.freeze({
    domain,
    project: Object.freeze(project),
    preimage: Object.freeze(preimage),
    digest: Object.freeze(digest),
    digestBytes: Object.freeze(digestBytes),
  });
}

/** @type {Record<string, Projector>} */
const PROJECTORS = {
  adapterCapability: (value) => omitFixedMembers(value, ['capabilityDigest']),
  appearanceDefault: (value) => omitFixedMembers(value, ['source']),
  artifactManifest: (value) =>
    omitFixedMembers(value, ['artifactId', 'manifestDigest']),
  artifact: asArray,
  artifactValidationEvidence(value) {
    const projection = omitFixedMembers(value, [
      'artifactId',
      'manifestDigest',
    ]);
    if (!Object.hasOwn(projection, 'validation')) {
      throw new TypeError('DIGEST_PROFILE_MEMBER_MISSING:validation');
    }
    return {
      ...projection,
      validation: omitFixedMembers(projection.validation, ['evidenceDigest']),
    };
  },
  buildInput: (value) => omitFixedMembers(value, ['inputDigest']),
  buildPolicyDecision: (value) => omitFixedMembers(value, ['decisionDigest']),
  buildProvenance: asRecord,
  buildWorkflowIdentity(value) {
    const source = asRecord(value);
    if (!Object.hasOwn(source, 'workflowFiles')) {
      throw new TypeError('DIGEST_PROFILE_MEMBER_MISSING:workflowFiles');
    }
    return asArray(source.workflowFiles);
  },
  cancellationFinalizationEvidence: asRecord,
  capabilityDecision: (value) => omitFixedMembers(value, ['decisionDigest']),
  deadlineFinalizationEvidence: asRecord,
  deploymentIntent: (value) => omitFixedMembers(value, ['intentDigest']),
  deploymentPolicyDecision: (value) =>
    omitFixedMembers(value, ['decisionDigest']),
  deploymentReceipt: (value) => omitFixedMembers(value, ['receiptDigest']),
  deploymentStageEvidence: (value) =>
    omitFixedMembers(value, ['evidenceDigest']),
  deploymentStageInput: asRecord,
  deploymentStageResult: asRecord,
  destinationMutationKey: asRecord,
  destinationProviderBinding: asRecord,
  spacesControlPlaneBinding: (value) =>
    omitFixedMembers(value, ['bindingDigest']),
  spacesControlPlaneEvidence: (value) =>
    omitFixedMembers(value, ['evidenceDigest']),
  spacesControlPlaneRequestCatalog: (value) =>
    omitFixedMembers(value, ['catalogDigest']),
  spacesControlPlaneResponseCatalog: (value) =>
    omitFixedMembers(value, ['catalogDigest']),
  spacesCredentialProfile: (value) =>
    omitFixedMembers(value, ['profileDigest']),
  spacesRegionCatalog: (value) => omitFixedMembers(value, ['digest']),
  spacesWebsiteConfiguration: (value) =>
    omitFixedMembers(value, ['configurationDigest']),
  githubActionsOidcOriginCatalog: (value) =>
    omitFixedMembers(value, ['catalogDigest']),
  githubHostedRunnerCompatibility: (value) =>
    omitFixedMembers(value, ['rowDigest']),
  githubWorkloadOidcKeySet(value) {
    const projected = asArray(value).map((candidate) => {
      const key = selectRequiredMembers(candidate, [
        'kty',
        'alg',
        'use',
        'kid',
        'n',
        'e',
      ]);
      const source = asRecord(candidate);
      if (Object.hasOwn(source, 'x5t')) key.x5t = source.x5t;
      return key;
    });
    projected.sort((left, right) => {
      if (typeof left.kid !== 'string' || typeof right.kid !== 'string') {
        throw new TypeError('DIGEST_PROFILE_STRING_REQUIRED:kid');
      }
      return compareBytes(utf8Bytes(left.kid), utf8Bytes(right.kid));
    });
    for (let index = 1; index < projected.length; index += 1) {
      if (projected[index - 1]?.kid === projected[index]?.kid) {
        throw new TypeError('DIGEST_PROFILE_DUPLICATE_KID');
      }
    }
    return projected;
  },
  githubWorkloadOidcVerificationProfile: (value) =>
    omitFixedMembers(value, ['profileDigest']),
  localFilesystemAllowlist: (value) =>
    omitFixedMembers(value, ['catalogDigest']),
  localFilesystemCapabilityEvidence: (value) =>
    omitFixedMembers(value, ['evidenceDigest']),
  localFilesystemControlRow: (value) => omitFixedMembers(value, ['rowDigest']),
  localFilesystemFailureEvidence: (value) =>
    omitFixedMembers(value, ['evidenceDigest']),
  localFilesystemObservationEvidence: (value) =>
    omitFixedMembers(value, ['evidenceDigest']),
  localFilesystemProbeTranscript: asRecord,
  localMutationSurface: (value) =>
    selectRequiredMembers(value, [
      'surfaceIdentityDigest',
      'deviceId',
      'rootFileId',
    ]),
  localRootIdentity: (value) =>
    selectRequiredMembers(value, [
      'rootPathDigest',
      'surfaceIdentityDigest',
      'deviceId',
      'rootFileId',
    ]),
  localRootPath(value) {
    if (typeof value !== 'string') {
      throw new TypeError('DIGEST_PROFILE_STRING_REQUIRED');
    }
    return value;
  },
  localStageToken: (value) =>
    selectRequiredMembers(value, [
      'operationId',
      'attemptId',
      'stagingStageAttemptId',
      'generationId',
    ]),
  localSurfaceIdentity: (value) => omitFixedMembers(value, ['recordDigest']),
  lock: (value) => omitFixedMembers(value, ['lockDigest']),
  managedEvidenceAppend: (value) =>
    selectRequiredMembers(value, ['previousHeadDigest', 'entryDigest']),
  managedEvidenceEntry: asRecord,
  managedEvidenceGenesis: (value) =>
    selectRequiredMembers(value, ['operationId', 'runAttempt']),
  managedReceiptSubmission: asRecord,
  navigationDefault: (value) => omitFixedMembers(value, ['source']),
  networkBoundaryProfile: (value) =>
    selectRequiredMembers(value, [
      'profile',
      'ipv4SourceDigest',
      'ipv6SourceDigest',
      'additionalDeniedCidrs',
    ]),
  npmRegistryFetchProfile: (value) =>
    omitFixedMembers(value, ['profileDigest']),
  packageReleaseCatalog: (value) => omitFixedMembers(value, ['catalogDigest']),
  pagesBuildVersion: (value) =>
    selectRequiredMembers(value, [
      'repositoryId',
      'operationId',
      'attemptId',
      'runId',
      'runAttempt',
      'artifactId',
      'artifactDigest',
      'proposedGenerationId',
    ]),
  pagesDeployment(value) {
    const source = asRecord(value);
    const common = [
      'pagesActionsArtifactId',
      'pagesActionsArtifactName',
      'pagesActionsArtifactDigest',
      'pagesActionsArtifactByteCount',
      'pagesBuildVersion',
      'pagesDeploymentId',
      'pollingStatusUrl',
      'pageUrl',
      'createResponseObserved',
      'status',
      'pagesOidcOrigin',
    ];
    if (source.createResponseObserved === false) {
      if (Object.hasOwn(source, 'createResponseStatusUrl')) {
        throw new TypeError(
          'DIGEST_PROFILE_MEMBER_FORBIDDEN:createResponseStatusUrl',
        );
      }
      return selectRequiredMembers(source, common);
    }
    if (source.createResponseObserved === true) {
      return selectRequiredMembers(source, [
        ...common.slice(0, 7),
        'createResponseStatusUrl',
        ...common.slice(7),
      ]);
    }
    throw new TypeError(
      'DIGEST_PROFILE_BOOLEAN_REQUIRED:createResponseObserved',
    );
  },
  pagesNoAuthorityRunAttempt: (value) =>
    selectRequiredMembers(value, [
      'repositoryId',
      'runId',
      'runAttempt',
      'authorityState',
    ]),
  pagesReconciliationCommand: (value) =>
    omitFixedMembers(value, ['commandDigest']),
  pagesReconciliationRecovery: (value) =>
    omitFixedMembers(value, ['recoveryDigest']),
  pagesRunAttemptGapProof: (value) => omitFixedMembers(value, ['proofDigest']),
  providerCallClassBinding: asArray,
  providerCredentialEgress: (value) =>
    omitFixedMembers(value, ['profileDigest']),
  providerRequestTemplates: asArray,
  providerResponseCatalog: (value) =>
    omitFixedMembers(value, ['catalogDigest']),
  providerTlsProfile: asRecord,
  publicActivationDetectionObservation: (value) =>
    omitFixedMembers(value, ['evidenceDigest']),
  publicActivationDetectionPlan: (value) =>
    omitFixedMembers(value, ['planDigest']),
  publicActivationDetectionProbe: (value) =>
    omitFixedMembers(value, ['evidenceDigest']),
  publicProbeJitter: (value) =>
    selectRequiredMembers(value, [
      'operationId',
      'attemptId',
      'proposedGenerationId',
      'targetId',
      'probeRegion',
      'nextAttemptNumber',
    ]),
  publicProbeObservation: (value) =>
    omitFixedMembers(value, ['evidenceDigest']),
  publicTlsProfile: asRecord,
  renderPolicy: asBytes,
  repositoryRoot: asArray,
  sourceInventory: (value) =>
    selectRequiredMembers(value, ['includedSources', 'excludedInputs']),
  supersessionFinalizationEvidence: asRecord,
  templateStylingContract: (value) =>
    omitFixedMembers(value, ['catalogDigest']),
  themeConformanceEvidence: (value) =>
    omitFixedMembers(value, ['evidenceDigest']),
  themeConformanceInput: asArray,
  themeFixtureRelease: (value) => omitFixedMembers(value, ['fixtureDigest']),
  themePackageIntegrity: asArray,
  tlsRevocationSet: asRecord,
  verificationPlan: asArray,
  verifiedWorkloadBinding: (value) =>
    omitFixedMembers(value, ['workloadBindingDigest']),
};

/** @type {Record<string, ProjectionEncoder>} */
const SPECIAL_ENCODERS = {
  localRootPath: encodeRootPath,
  managedEvidenceAppend: encodeManagedEvidenceAppend,
  renderPolicy: asBytes,
};

const profileEntries = Object.entries(DOMAIN).map(([name, domain]) => {
  const project = PROJECTORS[name];
  if (!project) throw new Error(`DIGEST_PROJECTOR_MISSING:${name}`);
  return [name, defineProfile(domain, project, SPECIAL_ENCODERS[name])];
});

/** The exact number of active DEC-097/098 terminal-NUL digest domains. */
export const ACTIVE_DIGEST_DOMAIN_COUNT = 80;

/** All active named digest profiles. */
export const ACTIVE_DIGEST_PROFILES = Object.freeze(
  /** @type {Record<string, DigestProfile>} */ (
    Object.fromEntries(profileEntries)
  ),
);

/** All active profile names mapped to their literal terminal-NUL domains. */
export const ACTIVE_DIGEST_DOMAINS = Object.freeze(
  Object.fromEntries(
    Object.entries(ACTIVE_DIGEST_PROFILES).map(([name, { domain }]) => [
      name,
      domain,
    ]),
  ),
);

const activeDomains = Object.values(ACTIVE_DIGEST_DOMAINS);
if (
  activeDomains.length !== ACTIVE_DIGEST_DOMAIN_COUNT ||
  new Set(activeDomains).size !== ACTIVE_DIGEST_DOMAIN_COUNT
) {
  throw new Error('ACTIVE_DIGEST_DOMAIN_INVENTORY_INVALID');
}

/**
 * Resolve one internal named profile.
 *
 * @param {string} name exact profile name
 * @returns {DigestProfile} selected profile
 */
function requireProfile(name) {
  const selected = ACTIVE_DIGEST_PROFILES[name];
  if (!selected) throw new TypeError(`DIGEST_PROFILE_UNKNOWN:${name}`);
  return selected;
}

/**
 * Construct a domain-separated JCS preimage.
 *
 * @param {string} domain terminal-NUL domain
 * @param {unknown} value I-JSON projection
 * @returns {Uint8Array} exact preimage bytes
 */
export function domainSeparatedJcsPreimage(domain, value) {
  const jcs = canonicalizeJcsBytes(value);
  domainSeparatedSha256(domain, jcs);
  return concatBytes([asciiBytes(domain), jcs]);
}

/**
 * Hash a JCS projection under a terminal-NUL domain.
 *
 * @param {string} domain terminal-NUL domain
 * @param {unknown} value I-JSON projection
 * @returns {string} tagged SHA-256 digest
 */
export function digestDomainSeparatedJcs(domain, value) {
  return domainSeparatedSha256(domain, canonicalizeJcsBytes(value));
}

/**
 * Hash the exact action-definition Git blob content bytes with no domain.
 *
 * @param {Uint8Array} blobBytes exact Git blob content bytes
 * @returns {string} tagged SHA-256 digest
 */
export function digestActionDefinitionBlob(blobBytes) {
  return sha256Tagged(asBytes(blobBytes));
}

/**
 * Hash the canonical publication root spelling as raw UTF-8 after its domain.
 *
 * @param {string} publicationRoot validated canonical root path
 * @returns {string} tagged SHA-256 digest
 */
export function digestLocalRootPath(publicationRoot) {
  return requireProfile('localRootPath').digest(publicationRoot);
}

/**
 * Hash the exact render-policy file bytes after its domain.
 *
 * @param {Uint8Array} policyBytes exact retained file bytes
 * @returns {string} tagged SHA-256 digest
 */
export function digestRenderPolicyBytes(policyBytes) {
  return requireProfile('renderPolicy').digest(policyBytes);
}

/**
 * Compute the evidence-journal genesis digest.
 *
 * @param {unknown} coordinates operationId/runAttempt coordinates
 * @returns {string} tagged SHA-256 digest
 */
export function digestManagedEvidenceGenesis(coordinates) {
  return requireProfile('managedEvidenceGenesis').digest(coordinates);
}

/**
 * Compute an evidence-journal wrapper digest.
 *
 * @param {unknown} wrapper exact observation/attempt wrapper
 * @returns {string} tagged SHA-256 digest
 */
export function digestManagedEvidenceEntry(wrapper) {
  return requireProfile('managedEvidenceEntry').digest(wrapper);
}

/**
 * Append one evidence entry using two decoded RAW32 operands.
 *
 * @param {string} previousHeadDigest tagged previous head digest
 * @param {string} entryDigest tagged entry digest
 * @returns {string} tagged SHA-256 head digest
 */
export function appendManagedEvidenceHead(previousHeadDigest, entryDigest) {
  return requireProfile('managedEvidenceAppend').digest({
    previousHeadDigest,
    entryDigest,
  });
}

/**
 * Derive the first 40 lowercase SHA-256 hexadecimal characters for Pages.
 *
 * @param {unknown} coordinates exact Pages build-version coordinates
 * @returns {string} 40 lowercase hexadecimal characters
 */
export function derivePagesBuildVersion(coordinates) {
  return hexFromBytes(
    requireProfile('pagesBuildVersion').digestBytes(coordinates),
  ).slice(0, 40);
}

/**
 * Derive the first 32 lowercase SHA-256 hexadecimal characters for local stage.
 *
 * @param {unknown} coordinates exact local stage-token coordinates
 * @returns {string} 32 lowercase hexadecimal characters
 */
export function deriveLocalStageToken(coordinates) {
  return hexFromBytes(
    requireProfile('localStageToken').digestBytes(coordinates),
  ).slice(0, 32);
}

/**
 * Derive the deterministic public-probe retry delay for attempt 2..10.
 *
 * @param {unknown} coordinates exact jitter coordinates
 * @returns {number} delay in milliseconds
 */
export function derivePublicProbeRetryDelay(coordinates) {
  const row = asRecord(coordinates);
  const attempt = row.nextAttemptNumber;
  if (
    !Number.isInteger(attempt) ||
    Number(attempt) < 2 ||
    Number(attempt) > 10
  ) {
    throw new TypeError('PUBLIC_PROBE_NEXT_ATTEMPT_INVALID');
  }
  const attemptNumber = Number(attempt);
  const base = Math.min(24_000, 1_000 * 2 ** (attemptNumber - 2));
  const digest = requireProfile('publicProbeJitter').digestBytes(coordinates);
  const jitterUnits = 7_500n + (readUint64BigEndian(digest, 0) % 5_001n);
  return Number((BigInt(base) * jitterUnits) / 10_000n);
}

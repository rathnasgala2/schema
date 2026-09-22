import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canonicalizeJcsBytes,
  sha256Tagged,
} from '../src/internal/canonical-jcs.js';
import {
  ACTIVE_DIGEST_PROFILES,
  appendManagedEvidenceHead,
  digestManagedEvidenceEntry,
  digestManagedEvidenceGenesis,
} from '../src/internal/digest-profiles.js';
import {
  computeDeploymentStageEvidenceDigest,
  computeDeploymentStageInputDigest,
  computeDeploymentStageResultDigest,
  computeLocalFilesystemObservationEvidenceDigest,
} from '../src/internal/deployment-stage-semantics.js';
import {
  computeActivationDetectionPlanDigest,
  computeCancellationFinalizationEvidenceDigest,
  computeDeadlineFinalizationEvidenceDigest,
  computeDeploymentIntentDigest,
  computeDeploymentPolicyDecisionDigest,
  computeDeploymentReceiptDigest,
  computeDestinationMutationKeyDigest,
  computeDestinationProviderBindingDigest,
  computeManagedReceiptSubmissionDigest,
  computePublicProbeObservationDigest,
  computeSupersessionFinalizationEvidenceDigest,
  computeVerificationPlanDigest,
  validateDeploymentIntentSemantics,
  validateDeploymentObservationSemantics,
  validateDeploymentReceiptSemantics,
} from '../src/internal/deployment-record-semantics.js';

const OPERATION_ID = '018f0000-0000-7000-8000-000000000001';
const ATTEMPT_ID = '018f0000-0000-7000-8000-000000000002';
const ACTIVATION_STAGE_ID = '018f0000-0000-7000-8000-000000000003';
const PROVIDER_OBSERVATION_ID = '018f0000-0000-7000-8000-000000000004';
const RECEIPT_ID = '018f0000-0000-7000-8000-000000000005';
const IDEMPOTENCY_KEY = '018f0000-0000-7000-8000-000000000006';
const ARTIFACT_ID = '018f0000-0000-7000-8000-000000000007';
const GENERATION_ID = '018f0000-0000-7000-8000-000000000008';
const ORGANIZATION_ID = '018f0000-0000-7000-8000-000000000009';
const PUBLICATION_ID = '018f0000-0000-7000-8000-000000000010';
const PUBLIC_STAGE_ID = '018f0000-0000-7000-8000-000000000011';
const PUBLIC_OBSERVATION_ID = '018f0000-0000-7000-8000-000000000012';
const SECOND_RECEIPT_ID = '018f0000-0000-7000-8000-000000000013';
const CANCELLATION_STAGE_ID = '018f0000-0000-7000-8000-000000000014';
const CANCELLATION_OBSERVATION_ID = '018f0000-0000-7000-8000-000000000015';
const CANCELLATION_COMMAND_ID = '018f0000-0000-7000-8000-000000000016';
const CANCELLATION_ACTOR_ID = '018f0000-0000-7000-8000-000000000017';
const DEADLINE_STAGE_ID = '018f0000-0000-7000-8000-000000000018';
const DEADLINE_OBSERVATION_ID = '018f0000-0000-7000-8000-000000000019';
const SUPERSESSION_STAGE_ID = '018f0000-0000-7000-8000-000000000020';
const SUPERSESSION_OBSERVATION_ID = '018f0000-0000-7000-8000-000000000021';
const SUCCESSOR_OPERATION_ID = '018f0000-0000-7000-8000-000000000022';
const SUCCESSOR_GENERATION_ID = '018f0000-0000-7000-8000-000000000023';
const FAILURE_STAGE_ID = '018f0000-0000-7000-8000-000000000024';
const FAILURE_OBSERVATION_ID = '018f0000-0000-7000-8000-000000000025';
const COMMIT = `sha1:${'1'.repeat(40)}`;

/** @typedef {Record<string, unknown>} JsonRecord */
/** @typedef {Parameters<typeof validateDeploymentIntentSemantics>[1]} IntentContext */
/** @typedef {Parameters<typeof validateDeploymentReceiptSemantics>[1]} ReceiptContext */

/**
 * @param {string} nibble digest nibble
 * @returns {string} tagged digest
 */
function tagged(nibble) {
  return `sha256:${nibble.repeat(64)}`;
}

/**
 * @template T
 * @param {T} value value to clone
 * @returns {T} clone
 */
function clone(value) {
  return structuredClone(value);
}

/**
 * @param {keyof typeof ACTIVE_DIGEST_PROFILES} name
 * @param {unknown} value
 * @returns {string}
 */
function profileDigest(name, value) {
  const profile = ACTIVE_DIGEST_PROFILES[name];
  assert.ok(profile);
  return profile.digest(value);
}

/**
 * @param {() => unknown} callback failing callback
 * @param {string} code expected semantic code
 * @returns {void}
 */
function assertCode(callback, code) {
  assert.throws(callback, (error) => {
    assert.equal(error instanceof Error, true);
    assert.equal(/** @type {{code?: unknown}} */ (error).code, code);
    return true;
  });
}

/**
 * @param {string[]} [requiredProbeRegions]
 * @returns {{intent: JsonRecord, context: IntentContext}}
 */
function intentFixture(requiredProbeRegions = ['us-east']) {
  const publisher = {
    package: '@rathnasgala2/publish-action',
    version: '2.0.0',
    integrity: tagged('1'),
    registry: 'https://registry.npmjs.org',
  };
  const adapter = {
    adapterId: 'local-directory',
    adapterVersion: '2.0.0',
    adapterDigest: tagged('2'),
  };
  const destinationProviderBinding = {
    kind: 'local-directory',
    rootIdentityDigest: tagged('3'),
    mutationSurfaceDigest: tagged('4'),
  };
  const destination = {
    environment: 'local',
    adapterId: adapter.adapterId,
    adapterVersion: adapter.adapterVersion,
    targetDigest: computeDestinationProviderBindingDigest(
      destinationProviderBinding,
    ),
    baseUrl: 'https://example.com/',
  };
  /** @type {JsonRecord} */
  const buildInput = {
    baseUrl: 'https://example.com',
    basePath: '/',
    inputDigest: '',
  };
  buildInput.inputDigest = profileDigest('buildInput', buildInput);
  const artifactManifest = {
    artifactId: ARTIFACT_ID,
    artifactDigest: tagged('5'),
    manifestDigest: tagged('6'),
    artifactByteCount: '1024',
    artifactFileCount: '2',
    buildInputDigest: buildInput.inputDigest,
  };
  const buildProvenance = {
    sourceCommit: COMMIT,
    workflowTriggerCommit: COMMIT,
    provenanceDigest: tagged('7'),
    sbomDigest: tagged('8'),
    rebuildRecord: {
      reproducible: true,
      firstArtifactDigest: artifactManifest.artifactDigest,
      secondArtifactDigest: artifactManifest.artifactDigest,
    },
  };
  const frozenHandoff = {
    frozenHandoffArtifactId: '123456789',
    frozenHandoffName: 'gala-r789-a1-frozen-envelope-v2.bin',
    frozenEnvelopeDigest: tagged('9'),
    frozenEnvelopeByteCount: '4096',
    requestedArtifactRetentionDays: 7,
    effectiveArtifactExpiresAt: '2026-09-19T00:00:00.000Z',
    maximumReportRequestByteCount: '1048576',
  };
  const lock = {
    lockDigest: tagged('a'),
    publisher: [
      publisher,
      {
        package: '@rathnasgala2/adapter-local-directory',
        version: '2.0.0',
        integrity: tagged('b'),
        registry: 'https://registry.npmjs.org',
      },
    ],
  };
  /** @type {JsonRecord} */
  const capabilityDecision = {
    profile: 'gala-capability-decision-v2',
    decisionDigest: tagged('c'),
    adapter,
    destination,
  };
  capabilityDecision.decisionDigest = profileDigest(
    'capabilityDecision',
    capabilityDecision,
  );
  const marker = {
    schemaId: 'urn:gala:schema:public-generation-marker:2.0.0',
    schemaVersion: '2.0.0',
    artifactId: ARTIFACT_ID,
    artifactDigest: artifactManifest.artifactDigest,
    generationId: GENERATION_ID,
  };
  const markerBytes = canonicalizeJcsBytes(marker);
  const targetAuthority = {
    origin: 'https://example.com',
    route: '/.well-known/gala-generation.json',
    requiredProbeRegions,
    redirectChain: [],
    terminalRequestUrl: 'https://example.com/.well-known/gala-generation.json',
    expectedTerminalStatus: 200,
    expectedByteLength: String(markerBytes.length),
    expectedHeaders: [
      { name: 'content-type', value: 'application/json; charset=utf-8' },
    ],
    expectedCandidateDigest: sha256Tagged(markerBytes),
    recognizedPriorContracts: [],
  };
  const verificationPlan = [
    {
      targetId: 1,
      ...targetAuthority,
      maximumResponseBytes: String(markerBytes.length),
      maximumResponseWireBytes: String(6 * markerBytes.length + 5),
      requestTimeoutSeconds: 30,
      requestProfile: 'gala-public-verifier-v2',
      retryProfile: 'gala-public-probe-retry-v2',
      maximumAttempts: 4,
      maximumConcurrentStreams: 2,
    },
  ];
  const verificationPlanDigest =
    computeVerificationPlanDigest(verificationPlan);
  const lifetimeConsumedAttemptsByStream = requiredProbeRegions.map(
    (probeRegion) => ({
      targetId: 1,
      probeRegion,
      lifetimeConsumedAttempts: 0,
    }),
  );
  const acceptedPolicy = {
    policyReleaseId: ORGANIZATION_ID,
    policyProfile: 'gala-default-deployment',
    policyVersion: '2.0.0',
    approvedOverrides: [],
    verificationTier: 'critical-only',
    verificationOrigins: ['https://example.com'],
    verificationPlanDigest,
    retryProfile: 'gala-public-probe-retry-v2',
    maximumAttemptsPerTarget: 4,
    maximumRedirectHops: 0,
    maximumConcurrentStreams: 2,
    maximumPublicResponseBytes: String(markerBytes.length),
    requestTimeoutSeconds: 30,
    activationDetectionProfile: 'gala-public-activation-detection-v2',
    maximumActivationDetectionAttempts: 91,
    activationDetectionIntervalSeconds: 60,
    maximumPublicVerificationSeconds: 600,
    maximumFinalizationDelaySeconds: 300,
    networkBoundaryProfileDigest: tagged('d'),
    publicTlsProfileDigest: tagged('e'),
    publicTlsTrustStoreDigest: tagged('f'),
    publicTlsRevocationSetDigest: tagged('0'),
  };
  /** @type {JsonRecord} */
  const operation = {
    kind: 'publish',
    operationId: OPERATION_ID,
    attemptId: ATTEMPT_ID,
    idempotencyKey: IDEMPOTENCY_KEY,
    organizationId: ORGANIZATION_ID,
    publicationId: PUBLICATION_ID,
    sourceCommit: COMMIT,
    workflowTriggerCommit: COMMIT,
    operationDeadline: '2026-09-12T00:45:00.000Z',
  };
  /** @type {JsonRecord} */
  const intent = {
    schemaId: 'urn:gala:schema:deployment-intent:2.0.0',
    schemaVersion: '2.0.0',
    operationId: OPERATION_ID,
    attemptId: ATTEMPT_ID,
    idempotencyKey: IDEMPOTENCY_KEY,
    sourceCommit: COMMIT,
    workflowTriggerCommit: COMMIT,
    ...artifactManifest,
    provenanceDigest: buildProvenance.provenanceDigest,
    sbomDigest: buildProvenance.sbomDigest,
    ...frozenHandoff,
    lockDigest: lock.lockDigest,
    rebuildRecord: buildProvenance.rebuildRecord,
    publisher,
    adapter,
    destination,
    proposedGenerationId: GENERATION_ID,
    capabilityDecisionDigest: capabilityDecision.decisionDigest,
    policyReleaseId: acceptedPolicy.policyReleaseId,
    policyProfile: acceptedPolicy.policyProfile,
    policyVersion: acceptedPolicy.policyVersion,
    approvedOverrides: [],
    networkBoundaryProfileDigest: acceptedPolicy.networkBoundaryProfileDigest,
    publicTlsProfileDigest: acceptedPolicy.publicTlsProfileDigest,
    publicTlsTrustStoreDigest: acceptedPolicy.publicTlsTrustStoreDigest,
    publicTlsRevocationSetDigest: acceptedPolicy.publicTlsRevocationSetDigest,
    workloadBindingDigest: tagged('1'),
    activationDetectionProfile: acceptedPolicy.activationDetectionProfile,
    maximumActivationDetectionAttempts: 91,
    activationDetectionIntervalSeconds: 60,
    verificationTier: acceptedPolicy.verificationTier,
    verificationOrigins: acceptedPolicy.verificationOrigins,
    verificationPlanDigest,
    maximumPublicVerificationSeconds: 600,
    verificationDeadlineLimit: '2026-09-12T00:40:00.000Z',
    maximumFinalizationDelaySeconds: 300,
    finalizationDeadlineLimit: '2026-09-12T00:45:00.000Z',
    marker,
    issuer: 'https://api.galascribe.example',
    subject: 'urn:gala:workload:github:123:789:1',
    audience: 'urn:gala:deployment-kernel:v2',
    capability: 'deploy',
    authorizedAt: '2026-09-12T00:00:00.000Z',
    expiresAt: '2026-09-12T00:30:00.000Z',
    operationDeadline: operation.operationDeadline,
  };
  const destinationMutationAuthority = {
    profile: 'gala-destination-mutation-authority-v2',
    mode: 'normal',
    destination,
    destinationMutationKeyDigest: computeDestinationMutationKeyDigest({
      kind: 'local-directory',
      mutationSurfaceDigest: destinationProviderBinding.mutationSurfaceDigest,
    }),
    epoch: '1',
    authorityId: RECEIPT_ID,
    operationId: OPERATION_ID,
    attemptId: ATTEMPT_ID,
    proposedGenerationId: GENERATION_ID,
    expiresAt: intent.expiresAt,
  };
  intent.destinationMutationAuthority = destinationMutationAuthority;
  /** @type {JsonRecord} */
  const destinationFence = {
    profile: 'gala-destination-mutation-fence-v2',
    mode: 'normal',
    destinationKeyDigest:
      destinationMutationAuthority.destinationMutationKeyDigest,
    destination,
    epoch: '1',
    authorityId: RECEIPT_ID,
    operationId: OPERATION_ID,
    attemptId: ATTEMPT_ID,
    proposedGenerationId: GENERATION_ID,
    authorityExpiresAt: intent.expiresAt,
    state: 'active',
    rowVersion: '1',
  };
  /** @type {JsonRecord} */
  const deploymentPolicyDecision = {
    profile: 'gala-deployment-policy-decision-v2',
    ...acceptedPolicy,
    artifactId: ARTIFACT_ID,
    artifactDigest: artifactManifest.artifactDigest,
    manifestDigest: artifactManifest.manifestDigest,
    buildPolicyDecisionDigest: tagged('2'),
    destination,
    capabilityDecisionDigest: capabilityDecision.decisionDigest,
  };
  deploymentPolicyDecision.decisionDigest =
    computeDeploymentPolicyDecisionDigest(deploymentPolicyDecision);
  intent.policyDecisionDigest = deploymentPolicyDecision.decisionDigest;
  /** @type {JsonRecord} */
  const activationDetectionPlan = {
    profile: 'gala-public-activation-detection-v2',
    operationId: OPERATION_ID,
    attemptId: ATTEMPT_ID,
    artifactId: ARTIFACT_ID,
    proposedGenerationId: GENERATION_ID,
    target: verificationPlan[0],
    probeRegion: 'us-east',
    firstEligibleAt: intent.authorizedAt,
    lastEligibleAt: intent.verificationDeadlineLimit,
    maximumAttempts: 91,
    intervalSeconds: 60,
    requestTimeoutSeconds: 30,
    maximumRedirectHops: 0,
    reservedProbeSlots: '91',
    planDigest: tagged('3'),
  };
  activationDetectionPlan.planDigest = computeActivationDetectionPlanDigest(
    activationDetectionPlan,
  );
  intent.activationDetectionPlanDigest = activationDetectionPlan.planDigest;
  /** @type {JsonRecord} */
  const workloadBinding = {
    issuer: 'https://token.actions.githubusercontent.com',
    audience: 'urn:gala:workload:deployment-intent:v2',
    repository: 'owner/repository',
    repositoryId: '123',
    repositoryOwner: 'owner',
    repositoryOwnerId: '456',
    ref: `refs/heads/gala/publish/${OPERATION_ID}`,
    sourceCommit: COMMIT,
    workflowTriggerCommit: COMMIT,
    runId: '789',
    runNumber: '10',
    runAttempt: 1,
    eventName: 'workflow_dispatch',
    actor: 'operator',
    actorId: '99',
    callerWorkflow: { role: 'caller', sha: COMMIT },
    publishWorkflow: { role: 'publish', sha: COMMIT },
    authorizeWorkflow: { role: 'authorize', sha: COMMIT },
    oidcVerificationProfileDigest: tagged('4'),
    issuerKeySetDigest: tagged('5'),
    issuerKeySetObservedAt: '2026-09-11T23:59:59.000Z',
    verifiedAt: intent.authorizedAt,
    workloadBindingDigest: tagged('6'),
  };
  workloadBinding.workloadBindingDigest = profileDigest(
    'verifiedWorkloadBinding',
    workloadBinding,
  );
  intent.workloadBindingDigest = workloadBinding.workloadBindingDigest;
  intent.intentDigest = computeDeploymentIntentDigest(intent);
  const verificationPlanContext = {
    verificationOrigins: acceptedPolicy.verificationOrigins,
    verificationPlanDigest,
    maximumRedirectHops: 0,
    maximumAttemptsPerTarget: 4,
    maximumConcurrentStreams: 2,
    maximumPublicResponseBytes: String(markerBytes.length),
    requestTimeoutSeconds: 30,
    retainedPriorGenerationIdsByTargetId: { 1: [] },
    authoritativeTargets: [targetAuthority],
    marker: { origin: 'https://example.com', basePath: '/', value: marker },
  };
  /** @type {IntentContext} */
  const context = {
    artifactManifest,
    buildProvenance,
    buildInput,
    frozenHandoff,
    lock,
    capabilityDecision,
    buildPolicyDecisionDigest: tagged('2'),
    deploymentPolicyDecision,
    acceptedPolicy,
    activationDetectionPlan,
    verificationPlan,
    verificationPlanContext,
    publicProbeReservation: {
      operationId: OPERATION_ID,
      attemptId: ATTEMPT_ID,
      runAttempt: 1,
      baseProbeStreamCount: requiredProbeRegions.length,
      lifetimeConsumedAttemptsByStream: clone(lifetimeConsumedAttemptsByStream),
      requiredProbeSlots: requiredProbeRegions.length * 4,
      operationProbeSlotsConsumed: 0,
      operationProbeSlotsRemainingBeforeReservation: 900,
      reservationCommitted: true,
    },
    destinationProviderBinding,
    destinationFence,
    workloadBinding,
    operation,
    providerLimits: {
      requestTimeoutMillis: 30_000,
      maximumProviderCallSeconds: 30,
      providerExecutionSeconds: 900,
    },
    issuer: String(intent.issuer),
  };
  operation.publicProbeReservationTransitionsByRunAttempt = {
    1: {
      profile: 'gala-public-probe-reservation-transition-v2',
      priorOperationObservations: [],
      before: {
        operationId: OPERATION_ID,
        state: 'available',
        operationProbeSlotsConsumed: 0,
        lifetimeConsumedAttemptsByStream: clone(
          lifetimeConsumedAttemptsByStream,
        ),
      },
      after: {
        operationId: OPERATION_ID,
        state: 'reserved',
        attemptId: ATTEMPT_ID,
        runAttempt: 1,
        operationProbeSlotsConsumed: 0,
        lifetimeConsumedAttemptsByStream: clone(
          lifetimeConsumedAttemptsByStream,
        ),
        reservedProbeSlots: requiredProbeRegions.length * 4,
      },
    },
  };
  return { intent, context };
}

/**
 * @param {JsonRecord} intent retained intent
 * @param {JsonRecord} fields class-specific observation fields
 * @returns {JsonRecord} complete observation
 */
function observationRecord(intent, fields) {
  return {
    schemaId: 'urn:gala:schema:deployment-observation:2.0.0',
    schemaVersion: '2.0.0',
    operationId: intent.operationId,
    attemptId: intent.attemptId,
    intentDigest: intent.intentDigest,
    artifactId: intent.artifactId,
    artifactDigest: intent.artifactDigest,
    adapter: intent.adapter,
    destination: intent.destination,
    probes: [],
    ...fields,
  };
}

/**
 * @param {JsonRecord} intent
 * @param {{stageAttemptId: string, causationId: string, stage: string, sequence: number, outcome: string, destinationChanged: string, observations: JsonRecord[], failureCode?: string, startedAt?: string, completedAt?: string}} options
 * @returns {{attempt: JsonRecord, evidence: JsonRecord}}
 */
function terminalStage(intent, options) {
  const input = {
    profile: 'gala-deployment-stage-input-v2',
    intentDigest: intent.intentDigest,
    destinationMutationAuthority: clone(intent.destinationMutationAuthority),
    stageAttemptId: options.stageAttemptId,
    causationId: options.causationId,
    stage: options.stage,
  };
  const inputDigest = computeDeploymentStageInputDigest(input);
  const references = options.observations
    .map((observation) => ({
      observationId: observation.observationId,
      evidenceDigest: observation.evidenceDigest,
    }))
    .sort((left, right) =>
      Buffer.compare(canonicalizeJcsBytes(left), canonicalizeJcsBytes(right)),
    );
  const finalObservation = options.observations.at(-1);
  assert.ok(finalObservation);
  const timing =
    options.outcome === 'skipped'
      ? {}
      : { startedAt: options.startedAt, completedAt: options.completedAt };
  const failure =
    options.failureCode === undefined
      ? {}
      : { failureCode: options.failureCode };
  /** @type {JsonRecord} */
  const stageResult = {
    profile: 'gala-deployment-stage-result-v2',
    stageInput: clone(input),
    inputDigest,
    outcome: options.outcome,
    destinationChanged: options.destinationChanged,
    retryable: false,
    ...failure,
    finalizationObservation: references.find(
      (reference) => reference.observationId === finalObservation.observationId,
    ),
    ...timing,
  };
  const resultDigest = computeDeploymentStageResultDigest(stageResult);
  /** @type {JsonRecord} */
  const evidence = {
    profile: 'gala-deployment-stage-evidence-v2',
    stageInput: clone(input),
    inputDigest,
    outcome: options.outcome,
    destinationChanged: options.destinationChanged,
    retryable: false,
    ...failure,
    observationEvidence: references,
    stageResult,
    resultDigest,
    ...timing,
    evidenceDigest: tagged('7'),
  };
  evidence.evidenceDigest = computeDeploymentStageEvidenceDigest(evidence);
  const attempt = {
    attemptId: intent.attemptId,
    stageAttemptId: options.stageAttemptId,
    causationId: options.causationId,
    stage: options.stage,
    sequence: options.sequence,
    outcome: options.outcome,
    destinationChanged: options.destinationChanged,
    inputDigest,
    resultDigest,
    retryable: false,
    ...failure,
    evidenceDigest: evidence.evidenceDigest,
    ...timing,
  };
  return { attempt, evidence };
}

/**
 * @param {ReturnType<typeof intentFixture>} authorized
 * @returns {{providerObservation: JsonRecord, providerStage: ReturnType<typeof terminalStage>, providerContext: JsonRecord, publicObservation: JsonRecord, publicStage: ReturnType<typeof terminalStage>, publicContext: JsonRecord}}
 */
function successfulHistory(authorized) {
  const { intent, context } = authorized;
  const destinationProviderBinding = /** @type {JsonRecord} */ (
    context.destinationProviderBinding
  );
  /** @type {JsonRecord} */
  const localEvidence = {
    profile: 'gala-local-directory-observation-v2',
    filesystemEvidenceDigest: tagged('8'),
    rootIdentityDigest: destinationProviderBinding.rootIdentityDigest,
    operationId: OPERATION_ID,
    attemptId: ATTEMPT_ID,
    stageAttemptId: ACTIVATION_STAGE_ID,
    expectedGenerationId: GENERATION_ID,
    observedCurrentState: 'valid',
    observedGenerationId: GENERATION_ID,
    observedArtifactDigest: intent.artifactDigest,
    observedMarkerDigest: sha256Tagged(canonicalizeJcsBytes(intent.marker)),
    observedFileCount: intent.artifactFileCount,
    observedByteCount: intent.artifactByteCount,
    controlHeadDigest: tagged('9'),
    observedAt: '2026-09-12T00:00:02.000Z',
    evidenceDigest: tagged('a'),
  };
  localEvidence.evidenceDigest =
    computeLocalFilesystemObservationEvidenceDigest(localEvidence);
  const providerObservation = observationRecord(intent, {
    observationId: PROVIDER_OBSERVATION_ID,
    stageAttemptId: ACTIVATION_STAGE_ID,
    sequence: 1,
    generationId: GENERATION_ID,
    observedArtifactDigest: intent.artifactDigest,
    observationClass: 'provider-state',
    outcome: 'succeeded',
    destinationChanged: 'yes',
    observedAt: localEvidence.observedAt,
    receivedAt: '2026-09-12T00:00:04.000Z',
    evidenceDigest: localEvidence.evidenceDigest,
  });
  const providerStage = terminalStage(intent, {
    stageAttemptId: ACTIVATION_STAGE_ID,
    causationId: IDEMPOTENCY_KEY,
    stage: 'activation',
    sequence: 1,
    outcome: 'succeeded',
    destinationChanged: 'yes',
    observations: [providerObservation],
    startedAt: '2026-09-12T00:00:01.000Z',
    completedAt: '2026-09-12T00:00:03.000Z',
  });
  const target = /** @type {JsonRecord} */ (context.verificationPlan[0]);
  /** @type {JsonRecord} */
  const probe = {
    targetId: 1,
    attemptNumber: 1,
    hopNumber: 0,
    origin: target.origin,
    route: target.route,
    requestUrl: target.terminalRequestUrl,
    probeRegion: 'us-east',
    contractGenerationId: GENERATION_ID,
    requestStartedAt: '2026-09-12T00:00:05.000Z',
    observedAt: '2026-09-12T00:00:06.000Z',
    expectedCandidateDigest: target.expectedCandidateDigest,
    responseHeadState: 'complete',
    observedStatus: 200,
    observedLocationState: 'absent',
    observedHeaders: [
      {
        name: 'content-type',
        state: 'present',
        value: 'application/json; charset=utf-8',
      },
    ],
    bodyState: 'complete',
    observedByteLength: target.expectedByteLength,
    observedDigest: target.expectedCandidateDigest,
    observedGenerationId: GENERATION_ID,
    classification: 'candidate',
    evidenceDigest: tagged('b'),
  };
  probe.evidenceDigest = computePublicProbeObservationDigest(probe);
  const publicObservation = observationRecord(intent, {
    observationId: PUBLIC_OBSERVATION_ID,
    stageAttemptId: PUBLIC_STAGE_ID,
    sequence: 2,
    observationClass: 'public-state',
    outcome: 'succeeded',
    destinationChanged: 'yes',
    observedAt: probe.observedAt,
    receivedAt: '2026-09-12T00:00:07.000Z',
    evidenceDigest: tagged('c'),
    probes: [probe],
  });
  const publicStage = terminalStage(intent, {
    stageAttemptId: PUBLIC_STAGE_ID,
    causationId: PROVIDER_OBSERVATION_ID,
    stage: 'public-verification',
    sequence: 2,
    outcome: 'succeeded',
    destinationChanged: 'yes',
    observations: [publicObservation],
    startedAt: '2026-09-12T00:00:05.000Z',
    completedAt: '2026-09-12T00:00:07.000Z',
  });
  const activationBasis = {
    source: 'kernel-provider-observation',
    observedAt: providerObservation.observedAt,
    evidenceDigest: providerObservation.evidenceDigest,
  };
  const verificationDeadlineAt = '2026-09-12T00:10:02.000Z';
  const finalizationDeadlineAt = '2026-09-12T00:15:02.000Z';
  const verificationControllerBefore = {
    operationId: OPERATION_ID,
    attemptId: ATTEMPT_ID,
    verificationPlanDigest: intent.verificationPlanDigest,
    verificationDeadlineAt,
    finalizationDeadlineAt,
    state: 'open',
  };
  const verificationController = {
    operationId: OPERATION_ID,
    attemptId: ATTEMPT_ID,
    verificationPlanDigest: intent.verificationPlanDigest,
    verificationDeadlineAt,
    finalizationDeadlineAt,
    state: 'sealed',
    closeReason: 'candidate-complete',
  };
  const operation = /** @type {JsonRecord} */ (context.operation);
  Object.assign(operation, {
    activationDetectionPlanDigest: intent.activationDetectionPlanDigest,
    activationDetectionObservationCount: 0,
    activationBasis,
    verificationDeadlineAt,
    finalizationDeadlineAt,
    verificationController,
    verificationControllerTransitionsByStageAttemptId: {
      [PUBLIC_STAGE_ID]: {
        controllerBeforeFinalization: verificationControllerBefore,
        controllerAfterFinalization: verificationController,
      },
    },
  });
  const providerContext = {
    destinationFence: context.destinationFence,
    adapterObservationEvidence: localEvidence,
  };
  const publicContext = {
    destinationFence: context.destinationFence,
    operation,
    verificationController,
    activationBasis,
    activationBasisEvidence: providerObservation,
    activationDetectionContext: {
      detectionPlan: context.activationDetectionPlan,
      verificationPlan: context.verificationPlan,
      verificationPlanContext: context.verificationPlanContext,
      observations: [],
    },
    verificationPlan: context.verificationPlan,
    verificationPlanContext: context.verificationPlanContext,
    verificationDeadlineAt,
    finalizationDeadlineAt,
    publicProbeAttemptContexts: [
      {
        targetId: 1,
        probeRegion: 'us-east',
        attemptNumber: 1,
        leaseAuthority: {
          operationId: OPERATION_ID,
          attemptId: ATTEMPT_ID,
          verificationPlanDigest: intent.verificationPlanDigest,
          targetId: 1,
          probeRegion: 'us-east',
          attemptNumber: 1,
          leaseCurrent: true,
          cancelled: false,
          superseded: false,
          terminalIntegrityMismatch: false,
        },
      },
    ],
  };
  return {
    providerObservation,
    providerStage,
    providerContext,
    publicObservation,
    publicStage,
    publicContext,
  };
}

/**
 * @param {JsonRecord[]} records attempt and observation records
 * @param {number} [runAttempt] workflow run attempt
 * @returns {{entries: JsonRecord[], headDigest: string}} authenticated journal
 */
function journal(records, runAttempt = 1) {
  let head = digestManagedEvidenceGenesis({
    operationId: OPERATION_ID,
    runAttempt,
  });
  const entries = records.map((record, index) => {
    const entryType = Object.hasOwn(record, 'observationId')
      ? 'observation'
      : 'attempt';
    const wrapper = { entryType, [entryType]: record };
    const entryDigest = digestManagedEvidenceEntry(wrapper);
    const previousHeadDigest = head;
    head = appendManagedEvidenceHead(head, entryDigest);
    return {
      entryNumber: index + 1,
      previousHeadDigest,
      ...wrapper,
      entryDigest,
      headDigest: head,
    };
  });
  return { entries, headDigest: head };
}

/**
 * @returns {{intent: JsonRecord, observation: JsonRecord, stage: ReturnType<typeof terminalStage>, source: JsonRecord, context: Parameters<typeof validateDeploymentObservationSemantics>[1]}}
 */
function deadlineFinalizationFixture() {
  const authorized = intentFixture();
  const { intent, context: intentContext } = authorized;
  const history = successfulHistory(authorized);
  const retainedPrefix = journal([
    history.providerObservation,
    history.providerStage.attempt,
  ]);
  const verificationDeadlineAt = '2026-09-12T00:10:02.000Z';
  const finalizationDeadlineAt = '2026-09-12T00:15:02.000Z';
  const controllerPrefix = {
    cutoffEvidenceJournalEntryCount: retainedPrefix.entries.length,
    cutoffEvidenceJournalHeadDigest: retainedPrefix.headDigest,
  };
  const controllerBeforeFinalization = {
    operationId: OPERATION_ID,
    attemptId: ATTEMPT_ID,
    verificationPlanDigest: intent.verificationPlanDigest,
    verificationDeadlineAt,
    finalizationDeadlineAt,
    state: 'cutoff-pending',
    ...controllerPrefix,
  };
  const controllerAfterFinalization = {
    operationId: OPERATION_ID,
    attemptId: ATTEMPT_ID,
    verificationPlanDigest: intent.verificationPlanDigest,
    verificationDeadlineAt,
    finalizationDeadlineAt,
    state: 'sealed',
    closeReason: 'deadline',
    ...controllerPrefix,
  };
  const operation = /** @type {JsonRecord} */ (intentContext.operation);
  operation.verificationController = controllerAfterFinalization;
  operation.verificationControllerTransitionsByStageAttemptId = {
    [DEADLINE_STAGE_ID]: {
      controllerBeforeFinalization,
      controllerAfterFinalization,
      leases: [
        {
          operationId: OPERATION_ID,
          attemptId: ATTEMPT_ID,
          verificationPlanDigest: intent.verificationPlanDigest,
          targetId: 1,
          probeRegion: 'us-east',
          state: 'terminal',
        },
      ],
    },
  };
  /** @type {JsonRecord} */
  const source = {
    profile: 'gala-deadline-finalization-evidence-v2',
    operationId: OPERATION_ID,
    attemptId: ATTEMPT_ID,
    intentDigest: intent.intentDigest,
    verificationPlanDigest: intent.verificationPlanDigest,
    verificationDeadlineAt,
    finalizationDeadlineAt,
    ...controllerPrefix,
    finalizationKind: 'verification-inconclusive',
    selectedStreams: [
      { targetId: 1, probeRegion: 'us-east', state: 'missing' },
    ],
    finalizedAt: '2026-09-12T00:10:03.000Z',
  };
  const observation = observationRecord(intent, {
    observationId: DEADLINE_OBSERVATION_ID,
    stageAttemptId: DEADLINE_STAGE_ID,
    sequence: 2,
    observationClass: 'deadline-finalization',
    outcome: 'outcome-unknown-reconciling',
    destinationChanged: 'yes',
    observedAt: source.finalizedAt,
    receivedAt: '2026-09-12T00:10:04.000Z',
    evidenceDigest: computeDeadlineFinalizationEvidenceDigest(source),
  });
  const stage = terminalStage(intent, {
    stageAttemptId: DEADLINE_STAGE_ID,
    causationId: DEADLINE_OBSERVATION_ID,
    stage: 'public-verification',
    sequence: 2,
    outcome: 'unknown',
    destinationChanged: 'yes',
    failureCode: 'PUBLIC_VERIFICATION_INCONCLUSIVE',
    observations: [observation],
    startedAt: verificationDeadlineAt,
    completedAt: String(observation.receivedAt),
  });
  const publicContext = /** @type {JsonRecord} */ (history.publicContext);
  const context =
    /** @type {Parameters<typeof validateDeploymentObservationSemantics>[1]} */ ({
      intent,
      expectedSequence: 2,
      stageAttempt: stage.attempt,
      stageEvidence: stage.evidence,
      stageRetainedObservations: [observation],
      precedingObservations: [history.providerObservation],
      operationPrecedingObservations: [history.providerObservation],
      destinationFence: intentContext.destinationFence,
      operation,
      verificationController: controllerAfterFinalization,
      activationBasis: publicContext.activationBasis,
      activationBasisEvidence: history.providerObservation,
      activationDetectionContext: publicContext.activationDetectionContext,
      verificationPlan: intentContext.verificationPlan,
      verificationPlanContext: intentContext.verificationPlanContext,
      verificationDeadlineAt,
      finalizationDeadlineAt,
      finalizationSource: source,
      finalizationContext: {
        controllerBeforeFinalization,
        controllerAfterFinalization,
        leases: [
          {
            operationId: OPERATION_ID,
            attemptId: ATTEMPT_ID,
            verificationPlanDigest: intent.verificationPlanDigest,
            targetId: 1,
            probeRegion: 'us-east',
            state: 'terminal',
          },
        ],
        precedingJournalEntries: retainedPrefix.entries,
        publicProbeAttemptContextsByObservationId: {},
        runAttempt: 1,
      },
    });
  return { intent, observation, stage, source, context };
}

/**
 * @param {JsonRecord} attempt expanded attempt
 * @param {number} kernelSequence kernel sequence
 * @returns {JsonRecord} report projection
 */
function kernelAttempt(attempt, kernelSequence) {
  /** @type {JsonRecord} */
  const projection = { ...clone(attempt), kernelSequence };
  delete projection.attemptId;
  delete projection.sequence;
  return projection;
}

/**
 * @param {JsonRecord} observation expanded observation
 * @param {number} kernelSequence kernel sequence
 * @returns {JsonRecord} report projection
 */
function kernelObservation(observation, kernelSequence) {
  /** @type {JsonRecord} */
  const projection = { ...clone(observation), kernelSequence };
  for (const field of [
    'operationId',
    'attemptId',
    'sequence',
    'intentDigest',
    'artifactId',
    'artifactDigest',
    'adapter',
    'destination',
    'receivedAt',
    'probes',
  ]) {
    delete projection[field];
  }
  return projection;
}

/**
 * @param {ReturnType<typeof intentFixture>} [authorized]
 * @returns {{receipt: JsonRecord, context: ReceiptContext, journal: ReturnType<typeof journal>, history: ReturnType<typeof successfulHistory>}}
 */
function receiptFixture(authorized = intentFixture()) {
  const { intent, context: intentContext } = authorized;
  const workloadBinding = /** @type {JsonRecord} */ (
    intentContext.workloadBinding
  );
  const history = successfulHistory(authorized);
  const runAttempt = Number(workloadBinding.runAttempt);
  const retainedJournal = journal(
    [
      history.providerObservation,
      history.providerStage.attempt,
      history.publicObservation,
      history.publicStage.attempt,
    ],
    runAttempt,
  );
  const submission = {
    operationId: OPERATION_ID,
    repositoryId: workloadBinding.repositoryId,
    sourceCommit: COMMIT.slice('sha1:'.length),
    runId: workloadBinding.runId,
    runAttempt,
    artifactManifestDigest: String(intent.manifestDigest).slice(
      'sha256:'.length,
    ),
    artifactByteCount: intent.artifactByteCount,
    artifactFileCount: intent.artifactFileCount,
    provenanceDigest: String(intent.provenanceDigest).slice('sha256:'.length),
    sbomDigest: String(intent.sbomDigest).slice('sha256:'.length),
    publisherPackage: /** @type {JsonRecord} */ (intent.publisher).package,
    publisherVersion: /** @type {JsonRecord} */ (intent.publisher).version,
    adapterId: /** @type {JsonRecord} */ (intent.adapter).adapterId,
    adapterVersion: /** @type {JsonRecord} */ (intent.adapter).adapterVersion,
    publicBaseUrl: /** @type {JsonRecord} */ (intent.destination).baseUrl,
    observedRoutes: [],
    workflowStartedAt: '2026-09-12T00:00:00.000Z',
    workflowCompletedAt: '2026-09-12T00:00:03.000Z',
    kernelJournal: {
      attempts: [kernelAttempt(history.providerStage.attempt, 1)],
      observations: [kernelObservation(history.providerObservation, 1)],
    },
    destinationGenerationId: GENERATION_ID,
  };
  const submissionRecord = {
    state: 'submission-recorded',
    intentDigest: intent.intentDigest,
    workloadBindingDigest: workloadBinding.workloadBindingDigest,
    requestReceivedAt: history.providerObservation.receivedAt,
    submissionJournalEntryCount: 2,
    submissionJournalHeadDigest: retainedJournal.entries[1]?.headDigest,
    submission,
  };
  /** @type {JsonRecord} */
  const receipt = {
    schemaId: 'urn:gala:schema:deployment-receipt:2.0.0',
    schemaVersion: '2.0.0',
    receiptId: RECEIPT_ID,
    snapshotSequence: 1,
    attemptSnapshotSequence: 1,
    operationId: OPERATION_ID,
    organizationId: ORGANIZATION_ID,
    issuer: intent.issuer,
    repositoryId: workloadBinding.repositoryId,
    repositoryOwnerId: workloadBinding.repositoryOwnerId,
    sourceCommit: COMMIT,
    workflowRef: `owner/repository/.github/workflows/gala-publish-v2.yml@refs/heads/gala/publish/${OPERATION_ID}`,
    workflowSha: COMMIT,
    runId: workloadBinding.runId,
    runAttempt,
    artifactId: intent.artifactId,
    artifactDigest: intent.artifactDigest,
    artifactManifestDigest: intent.manifestDigest,
    artifactByteCount: intent.artifactByteCount,
    artifactFileCount: intent.artifactFileCount,
    requestedArtifactRetentionDays: intent.requestedArtifactRetentionDays,
    effectiveArtifactExpiresAt: intent.effectiveArtifactExpiresAt,
    publisher: intent.publisher,
    intentDigest: intent.intentDigest,
    submissionEvidenceDigest: computeManagedReceiptSubmissionDigest(submission),
    evidenceJournalEntryCount: retainedJournal.entries.length,
    evidenceJournalHeadDigest: retainedJournal.headDigest,
    adapter: intent.adapter,
    destination: intent.destination,
    destinationGenerationId: GENERATION_ID,
    attempts: [history.publicStage.attempt],
    observations: [history.publicObservation],
    verificationTier: intent.verificationTier,
    outcome: 'succeeded',
    warnings: [],
    provenanceDigest: intent.provenanceDigest,
    sbomDigest: intent.sbomDigest,
    startedAt: submission.workflowStartedAt,
    completedAt: '2026-09-12T00:00:08.000Z',
    receiptDigest: tagged('d'),
  };
  receipt.receiptDigest = computeDeploymentReceiptDigest(receipt);
  /** @type {ReceiptContext} */
  const context = {
    operation: intentContext.operation,
    operationJournals: [
      {
        runAttempt,
        intent,
        intentContext,
        entries: retainedJournal.entries,
        stageEvidenceByStageAttemptId: {
          [ACTIVATION_STAGE_ID]: history.providerStage.evidence,
          [PUBLIC_STAGE_ID]: history.publicStage.evidence,
        },
        observationContextsByObservationId: {
          [PROVIDER_OBSERVATION_ID]: history.providerContext,
          [PUBLIC_OBSERVATION_ID]: history.publicContext,
        },
      },
    ],
    submissionRecord,
    priorReceipts: [],
  };
  return { receipt, context, journal: retainedJournal, history };
}

/**
 * @param {string} publicObservedAt trusted public terminal time
 * @param {string} publicReceivedAt Gala receipt time
 * @param {string} attemptCompletedAt claimed terminal attempt time
 * @returns {ReturnType<typeof receiptFixture>}
 */
function directCandidateAtFixture(
  publicObservedAt,
  publicReceivedAt,
  attemptCompletedAt,
) {
  const fixture = receiptFixture();
  const descriptor = /** @type {JsonRecord} */ (
    /** @type {JsonRecord[]} */ (fixture.context.operationJournals)[0]
  );
  const intent = /** @type {JsonRecord} */ (descriptor.intent);
  const probe = clone(
    /** @type {JsonRecord[]} */ (fixture.history.publicObservation.probes)[0],
  );
  assert.ok(probe);
  probe.requestStartedAt = '2026-09-12T00:09:32.000Z';
  probe.observedAt = publicObservedAt;
  probe.evidenceDigest = computePublicProbeObservationDigest(probe);
  const publicObservation = {
    ...clone(fixture.history.publicObservation),
    observedAt: publicObservedAt,
    receivedAt: publicReceivedAt,
    probes: [probe],
  };
  const publicStage = terminalStage(intent, {
    stageAttemptId: PUBLIC_STAGE_ID,
    causationId: PROVIDER_OBSERVATION_ID,
    stage: 'public-verification',
    sequence: 2,
    outcome: 'succeeded',
    destinationChanged: 'yes',
    observations: [publicObservation],
    startedAt: String(probe.requestStartedAt),
    completedAt: attemptCompletedAt,
  });
  const retainedJournal = journal([
    fixture.history.providerObservation,
    fixture.history.providerStage.attempt,
    publicObservation,
    publicStage.attempt,
  ]);
  descriptor.entries = retainedJournal.entries;
  const stageEvidenceById = /** @type {JsonRecord} */ (
    descriptor.stageEvidenceByStageAttemptId
  );
  stageEvidenceById[PUBLIC_STAGE_ID] = publicStage.evidence;
  fixture.receipt.attempts = [publicStage.attempt];
  fixture.receipt.observations = [publicObservation];
  fixture.receipt.evidenceJournalEntryCount = retainedJournal.entries.length;
  fixture.receipt.evidenceJournalHeadDigest = retainedJournal.headDigest;
  fixture.receipt.completedAt = publicReceivedAt;
  fixture.receipt.receiptDigest = computeDeploymentReceiptDigest(
    fixture.receipt,
  );
  fixture.history.publicObservation = publicObservation;
  fixture.history.publicStage = publicStage;
  fixture.journal = retainedJournal;
  return fixture;
}

/**
 * @returns {ReturnType<typeof receiptFixture> & {cutoffContext: JsonRecord}}
 */
function cutoffCandidateReceiptFixture() {
  const fixture = receiptFixture();
  const journals = /** @type {JsonRecord[]} */ (
    fixture.context.operationJournals
  );
  const descriptor = journals[0];
  assert.ok(descriptor);
  const intent = /** @type {JsonRecord} */ (descriptor.intent);
  const publicStage = terminalStage(intent, {
    stageAttemptId: PUBLIC_STAGE_ID,
    causationId: PUBLIC_OBSERVATION_ID,
    stage: 'public-verification',
    sequence: 2,
    outcome: 'succeeded',
    destinationChanged: 'yes',
    observations: [fixture.history.publicObservation],
    startedAt: '2026-09-12T00:10:02.000Z',
    completedAt: '2026-09-12T00:10:03.000Z',
  });
  const retainedJournal = journal([
    fixture.history.providerObservation,
    fixture.history.providerStage.attempt,
    fixture.history.publicObservation,
    publicStage.attempt,
  ]);
  descriptor.entries = retainedJournal.entries;
  const stageEvidenceById = /** @type {JsonRecord} */ (
    descriptor.stageEvidenceByStageAttemptId
  );
  stageEvidenceById[PUBLIC_STAGE_ID] = publicStage.evidence;
  const prefix = {
    cutoffEvidenceJournalEntryCount: 3,
    cutoffEvidenceJournalHeadDigest: retainedJournal.entries[2]?.headDigest,
  };
  const controllerBeforeFinalization = {
    operationId: OPERATION_ID,
    attemptId: ATTEMPT_ID,
    verificationPlanDigest: intent.verificationPlanDigest,
    verificationDeadlineAt: '2026-09-12T00:10:02.000Z',
    finalizationDeadlineAt: '2026-09-12T00:15:02.000Z',
    state: 'cutoff-pending',
    ...prefix,
  };
  const controllerAfterFinalization = {
    operationId: OPERATION_ID,
    attemptId: ATTEMPT_ID,
    verificationPlanDigest: intent.verificationPlanDigest,
    verificationDeadlineAt: '2026-09-12T00:10:02.000Z',
    finalizationDeadlineAt: '2026-09-12T00:15:02.000Z',
    state: 'sealed',
    closeReason: 'candidate-complete',
    ...prefix,
  };
  const cutoffContext = {
    controllerBeforeFinalization,
    controllerAfterFinalization,
    leases: [
      {
        operationId: OPERATION_ID,
        attemptId: ATTEMPT_ID,
        verificationPlanDigest: intent.verificationPlanDigest,
        targetId: 1,
        probeRegion: 'us-east',
        state: 'terminal',
      },
    ],
  };
  const intentContext = /** @type {JsonRecord} */ (descriptor.intentContext);
  const operation = /** @type {JsonRecord} */ (intentContext.operation);
  operation.verificationController = controllerAfterFinalization;
  const transitions = /** @type {JsonRecord} */ (
    operation.verificationControllerTransitionsByStageAttemptId
  );
  transitions[PUBLIC_STAGE_ID] = cutoffContext;
  fixture.receipt.attempts = [publicStage.attempt];
  fixture.receipt.evidenceJournalEntryCount = retainedJournal.entries.length;
  fixture.receipt.evidenceJournalHeadDigest = retainedJournal.headDigest;
  fixture.receipt.completedAt = '2026-09-12T00:10:04.000Z';
  fixture.receipt.receiptDigest = computeDeploymentReceiptDigest(
    fixture.receipt,
  );
  return { ...fixture, journal: retainedJournal, cutoffContext };
}

/**
 * @returns {ReturnType<typeof receiptFixture>}
 */
function missingStreamDeadlineReceiptFixture() {
  const fixture = receiptFixture();
  const descriptor = /** @type {JsonRecord} */ (
    /** @type {JsonRecord[]} */ (fixture.context.operationJournals)[0]
  );
  const intent = /** @type {JsonRecord} */ (descriptor.intent);
  const intentContext = /** @type {JsonRecord} */ (descriptor.intentContext);
  const retainedPrefix = journal([
    fixture.history.providerObservation,
    fixture.history.providerStage.attempt,
  ]);
  const verificationDeadlineAt = '2026-09-12T00:10:02.000Z';
  const finalizationDeadlineAt = '2026-09-12T00:15:02.000Z';
  const controllerPrefix = {
    cutoffEvidenceJournalEntryCount: retainedPrefix.entries.length,
    cutoffEvidenceJournalHeadDigest: retainedPrefix.headDigest,
  };
  const controllerBeforeFinalization = {
    operationId: OPERATION_ID,
    attemptId: ATTEMPT_ID,
    verificationPlanDigest: intent.verificationPlanDigest,
    verificationDeadlineAt,
    finalizationDeadlineAt,
    state: 'cutoff-pending',
    ...controllerPrefix,
  };
  const controllerAfterFinalization = {
    operationId: OPERATION_ID,
    attemptId: ATTEMPT_ID,
    verificationPlanDigest: intent.verificationPlanDigest,
    verificationDeadlineAt,
    finalizationDeadlineAt,
    state: 'sealed',
    closeReason: 'deadline',
    ...controllerPrefix,
  };
  const leases = [
    {
      operationId: OPERATION_ID,
      attemptId: ATTEMPT_ID,
      verificationPlanDigest: intent.verificationPlanDigest,
      targetId: 1,
      probeRegion: 'us-east',
      state: 'terminal',
    },
  ];
  /** @type {JsonRecord} */
  const source = {
    profile: 'gala-deadline-finalization-evidence-v2',
    operationId: OPERATION_ID,
    attemptId: ATTEMPT_ID,
    intentDigest: intent.intentDigest,
    verificationPlanDigest: intent.verificationPlanDigest,
    verificationDeadlineAt,
    finalizationDeadlineAt,
    ...controllerPrefix,
    finalizationKind: 'verification-inconclusive',
    selectedStreams: [
      { targetId: 1, probeRegion: 'us-east', state: 'missing' },
    ],
    finalizedAt: '2026-09-12T00:10:03.000Z',
  };
  const observation = observationRecord(intent, {
    observationId: DEADLINE_OBSERVATION_ID,
    stageAttemptId: DEADLINE_STAGE_ID,
    sequence: 2,
    observationClass: 'deadline-finalization',
    outcome: 'outcome-unknown-reconciling',
    destinationChanged: 'yes',
    observedAt: source.finalizedAt,
    receivedAt: '2026-09-12T00:10:04.000Z',
    evidenceDigest: computeDeadlineFinalizationEvidenceDigest(source),
  });
  const stage = terminalStage(intent, {
    stageAttemptId: DEADLINE_STAGE_ID,
    causationId: DEADLINE_OBSERVATION_ID,
    stage: 'public-verification',
    sequence: 2,
    outcome: 'unknown',
    destinationChanged: 'yes',
    failureCode: 'PUBLIC_VERIFICATION_INCONCLUSIVE',
    observations: [observation],
    startedAt: verificationDeadlineAt,
    completedAt: String(observation.receivedAt),
  });
  const retainedJournal = journal([
    fixture.history.providerObservation,
    fixture.history.providerStage.attempt,
    observation,
    stage.attempt,
  ]);
  descriptor.entries = retainedJournal.entries;
  descriptor.stageEvidenceByStageAttemptId = {
    [ACTIVATION_STAGE_ID]: fixture.history.providerStage.evidence,
    [DEADLINE_STAGE_ID]: stage.evidence,
  };
  const publicContext = /** @type {JsonRecord} */ (
    fixture.history.publicContext
  );
  descriptor.observationContextsByObservationId = {
    [PROVIDER_OBSERVATION_ID]: fixture.history.providerContext,
    [DEADLINE_OBSERVATION_ID]: {
      ...publicContext,
      finalizationSource: source,
      finalizationContext: {
        controllerBeforeFinalization,
        controllerAfterFinalization,
        leases,
        precedingJournalEntries: retainedPrefix.entries,
        publicProbeAttemptContextsByObservationId: {},
        runAttempt: 1,
      },
    },
  };
  const operation = /** @type {JsonRecord} */ (intentContext.operation);
  operation.verificationController = controllerAfterFinalization;
  operation.verificationControllerTransitionsByStageAttemptId = {
    [DEADLINE_STAGE_ID]: {
      controllerBeforeFinalization,
      controllerAfterFinalization,
      leases,
    },
  };
  fixture.receipt.evidenceJournalEntryCount = retainedJournal.entries.length;
  fixture.receipt.evidenceJournalHeadDigest = retainedJournal.headDigest;
  fixture.receipt.attempts = [stage.attempt];
  fixture.receipt.observations = [observation];
  fixture.receipt.outcome = 'unknown-reconciling';
  fixture.receipt.failure = {
    stage: 'public-verification',
    code: 'PUBLIC_VERIFICATION_INCONCLUSIVE',
    retryable: false,
    destinationChanged: 'yes',
    recovery: 'observe',
  };
  fixture.receipt.completedAt = '2026-09-12T00:10:05.000Z';
  fixture.receipt.receiptDigest = computeDeploymentReceiptDigest(
    fixture.receipt,
  );
  return { ...fixture, journal: retainedJournal };
}

/**
 * @param {ReturnType<typeof receiptFixture>} fixture candidate-complete fixture
 * @returns {{observation: JsonRecord, stage: ReturnType<typeof terminalStage>, source: JsonRecord, context: Parameters<typeof validateDeploymentObservationSemantics>[1], controllerBeforeFinalization: JsonRecord, controllerAfterFinalization: JsonRecord}}
 */
function activatedSupersessionFixture(fixture) {
  const descriptor = /** @type {JsonRecord} */ (
    /** @type {JsonRecord[]} */ (fixture.context.operationJournals)[0]
  );
  const intent = /** @type {JsonRecord} */ (descriptor.intent);
  const intentContext = /** @type {JsonRecord} */ (descriptor.intentContext);
  const operation = /** @type {JsonRecord} */ (intentContext.operation);
  const transitions = /** @type {JsonRecord} */ (
    operation.verificationControllerTransitionsByStageAttemptId
  );
  const publicTransition = /** @type {JsonRecord} */ (
    transitions[PUBLIC_STAGE_ID]
  );
  const controllerBeforeFinalization = clone(
    /** @type {JsonRecord} */ (publicTransition.controllerAfterFinalization),
  );
  const controllerAfterFinalization = {
    ...controllerBeforeFinalization,
    state: 'superseded-sealed',
    closeReason: 'superseded',
    supersededByOperationId: SUCCESSOR_OPERATION_ID,
    supersededByGenerationId: SUCCESSOR_GENERATION_ID,
  };
  /** @type {JsonRecord} */
  const destinationFence = {
    ...clone(/** @type {JsonRecord} */ (intentContext.destinationFence)),
    state: 'terminal-candidate',
    evidenceDigest: tagged('e'),
  };
  const successor = {
    operationId: SUCCESSOR_OPERATION_ID,
    generationId: SUCCESSOR_GENERATION_ID,
    destinationKeyDigest: destinationFence.destinationKeyDigest,
    authorityEpoch: '2',
  };
  const precedingJournalEntries = fixture.journal.entries;
  /** @type {JsonRecord} */
  const source = {
    profile: 'gala-supersession-finalization-evidence-v2',
    supersededOperationId: OPERATION_ID,
    supersededAttemptId: ATTEMPT_ID,
    supersededIntentDigest: intent.intentDigest,
    destinationKeyDigest: destinationFence.destinationKeyDigest,
    authorityEpoch: destinationFence.epoch,
    fenceTerminalState: destinationFence.state,
    fenceEvidenceDigest: destinationFence.evidenceDigest,
    supersededByOperationId: SUCCESSOR_OPERATION_ID,
    supersededByGenerationId: SUCCESSOR_GENERATION_ID,
    finalizationOutcome: 'activated',
    activationDetectionObservationCount: 0,
    precedingEvidenceJournalEntryCount: precedingJournalEntries.length,
    precedingEvidenceJournalHeadDigest: fixture.journal.headDigest,
    finalizedAt: '2026-09-12T00:01:00.000Z',
  };
  const observation = observationRecord(intent, {
    observationId: SUPERSESSION_OBSERVATION_ID,
    stageAttemptId: SUPERSESSION_STAGE_ID,
    sequence: 3,
    observationClass: 'supersession-finalization',
    outcome: 'succeeded',
    destinationChanged: 'yes',
    observedAt: source.finalizedAt,
    receivedAt: '2026-09-12T00:01:01.000Z',
    evidenceDigest: computeSupersessionFinalizationEvidenceDigest(source),
  });
  const stage = terminalStage(intent, {
    stageAttemptId: SUPERSESSION_STAGE_ID,
    causationId: PUBLIC_STAGE_ID,
    stage: 'managed-reconciliation',
    sequence: 3,
    outcome: 'succeeded',
    destinationChanged: 'yes',
    observations: [observation],
    startedAt: '2026-09-12T00:00:59.000Z',
    completedAt: String(observation.receivedAt),
  });
  const finalizationContext = {
    controllerBeforeFinalization,
    controllerAfterFinalization,
    destinationFence,
    activationDetector: {
      state: 'closed',
      observationCount: 0,
      lease: {
        operationId: OPERATION_ID,
        attemptId: ATTEMPT_ID,
        activationDetectionPlanDigest: intent.activationDetectionPlanDigest,
        state: 'terminal',
      },
    },
    verificationPlan: intentContext.verificationPlan,
    verificationPlanContext: intentContext.verificationPlanContext,
    leases: [
      {
        operationId: OPERATION_ID,
        attemptId: ATTEMPT_ID,
        verificationPlanDigest: intent.verificationPlanDigest,
        targetId: 1,
        probeRegion: 'us-east',
        state: 'terminal',
      },
    ],
    precedingJournalEntries,
    runAttempt: 1,
    successor,
  };
  return {
    observation,
    stage,
    source,
    controllerBeforeFinalization,
    controllerAfterFinalization,
    context:
      /** @type {Parameters<typeof validateDeploymentObservationSemantics>[1]} */ ({
        intent,
        expectedSequence: 3,
        stageAttempt: stage.attempt,
        stageEvidence: stage.evidence,
        stageRetainedObservations: [observation],
        precedingObservations: [
          fixture.history.providerObservation,
          fixture.history.publicObservation,
        ],
        operationPrecedingObservations: [
          fixture.history.providerObservation,
          fixture.history.publicObservation,
        ],
        destinationFence,
        finalizationSource: source,
        finalizationContext,
      }),
  };
}

/**
 * @returns {{intent: JsonRecord, observation: JsonRecord, stage: ReturnType<typeof terminalStage>, source: JsonRecord, context: Parameters<typeof validateDeploymentObservationSemantics>[1]}}
 */
function preMutationSupersessionFixture() {
  const { intent, context: intentContext } = intentFixture();
  /** @type {JsonRecord} */
  const destinationFence = {
    ...clone(/** @type {JsonRecord} */ (intentContext.destinationFence)),
    state: 'terminal-no-change',
    evidenceDigest: tagged('e'),
  };
  const successor = {
    operationId: SUCCESSOR_OPERATION_ID,
    generationId: SUCCESSOR_GENERATION_ID,
    destinationKeyDigest: destinationFence.destinationKeyDigest,
    authorityEpoch: '2',
  };
  const controllerBeforeFinalization = {
    operationId: OPERATION_ID,
    attemptId: ATTEMPT_ID,
    verificationPlanDigest: intent.verificationPlanDigest,
    verificationDeadlineAt: intent.verificationDeadlineLimit,
    finalizationDeadlineAt: intent.finalizationDeadlineLimit,
    state: 'superseded-closing',
    closeReason: 'superseded',
    supersededByOperationId: SUCCESSOR_OPERATION_ID,
    supersededByGenerationId: SUCCESSOR_GENERATION_ID,
  };
  const controllerAfterFinalization = {
    ...controllerBeforeFinalization,
    state: 'superseded-sealed',
  };
  /** @type {JsonRecord} */
  const source = {
    profile: 'gala-supersession-finalization-evidence-v2',
    supersededOperationId: OPERATION_ID,
    supersededAttemptId: ATTEMPT_ID,
    supersededIntentDigest: intent.intentDigest,
    destinationKeyDigest: destinationFence.destinationKeyDigest,
    authorityEpoch: destinationFence.epoch,
    fenceTerminalState: destinationFence.state,
    fenceEvidenceDigest: destinationFence.evidenceDigest,
    supersededByOperationId: SUCCESSOR_OPERATION_ID,
    supersededByGenerationId: SUCCESSOR_GENERATION_ID,
    finalizationOutcome: 'before-mutation',
    activationDetectionObservationCount: 0,
    precedingEvidenceJournalEntryCount: 0,
    precedingEvidenceJournalHeadDigest: digestManagedEvidenceGenesis({
      operationId: OPERATION_ID,
      runAttempt: 1,
    }),
    finalizedAt: '2026-09-12T00:00:10.000Z',
  };
  const observation = observationRecord(intent, {
    observationId: SUPERSESSION_OBSERVATION_ID,
    stageAttemptId: SUPERSESSION_STAGE_ID,
    sequence: 1,
    observationClass: 'supersession-finalization',
    outcome: 'rejected',
    destinationChanged: 'no',
    observedAt: source.finalizedAt,
    receivedAt: '2026-09-12T00:00:11.000Z',
    evidenceDigest: computeSupersessionFinalizationEvidenceDigest(source),
  });
  const stage = terminalStage(intent, {
    stageAttemptId: SUPERSESSION_STAGE_ID,
    causationId: IDEMPOTENCY_KEY,
    stage: 'managed-reconciliation',
    sequence: 1,
    outcome: 'skipped',
    destinationChanged: 'no',
    observations: [observation],
  });
  return {
    intent,
    observation,
    stage,
    source,
    context: {
      intent,
      expectedSequence: 1,
      stageAttempt: stage.attempt,
      stageEvidence: stage.evidence,
      stageRetainedObservations: [observation],
      precedingObservations: [],
      destinationFence,
      finalizationSource: source,
      finalizationContext: {
        controllerBeforeFinalization,
        controllerAfterFinalization,
        destinationFence,
        activationDetector: {
          state: 'closed',
          observationCount: 0,
          lease: {
            operationId: OPERATION_ID,
            attemptId: ATTEMPT_ID,
            activationDetectionPlanDigest: intent.activationDetectionPlanDigest,
            state: 'terminal',
          },
        },
        verificationPlan: intentContext.verificationPlan,
        verificationPlanContext: intentContext.verificationPlanContext,
        leases: [
          {
            operationId: OPERATION_ID,
            attemptId: ATTEMPT_ID,
            verificationPlanDigest: intent.verificationPlanDigest,
            targetId: 1,
            probeRegion: 'us-east',
            state: 'terminal',
          },
        ],
        precedingJournalEntries: [],
        runAttempt: 1,
        successor,
      },
    },
  };
}

/**
 * @param {string[]} [requiredProbeRegions]
 * @returns {{intent: JsonRecord, observation: JsonRecord, stage: ReturnType<typeof terminalStage>, context: Parameters<typeof validateDeploymentObservationSemantics>[1], source: JsonRecord}}
 */
function cancellationFixture(requiredProbeRegions = ['us-east']) {
  const { intent, context: intentContext } =
    intentFixture(requiredProbeRegions);
  const destinationFence = /** @type {JsonRecord} */ ({
    ...clone(/** @type {JsonRecord} */ (intentContext.destinationFence)),
    state: 'terminal-no-change',
    evidenceDigest: tagged('e'),
  });
  /** @type {JsonRecord} */
  const source = {
    profile: 'gala-cancellation-finalization-evidence-v2',
    operationId: OPERATION_ID,
    attemptId: ATTEMPT_ID,
    intentDigest: intent.intentDigest,
    destinationKeyDigest: destinationFence.destinationKeyDigest,
    authorityEpoch: destinationFence.epoch,
    fenceEvidenceDigest: destinationFence.evidenceDigest,
    cancellationCommandId: CANCELLATION_COMMAND_ID,
    cancellationActorId: CANCELLATION_ACTOR_ID,
    activationDetectionObservationCount: 0,
    precedingEvidenceJournalEntryCount: 0,
    precedingEvidenceJournalHeadDigest: digestManagedEvidenceGenesis({
      operationId: OPERATION_ID,
      runAttempt: 1,
    }),
    finalizedAt: '2026-09-12T00:00:10.000Z',
  };
  const observation = observationRecord(intent, {
    observationId: CANCELLATION_OBSERVATION_ID,
    stageAttemptId: CANCELLATION_STAGE_ID,
    sequence: 1,
    observationClass: 'request-not-started',
    outcome: 'rejected',
    destinationChanged: 'no',
    observedAt: source.finalizedAt,
    receivedAt: '2026-09-12T00:00:11.000Z',
    evidenceDigest: computeCancellationFinalizationEvidenceDigest(source),
  });
  const stage = terminalStage(intent, {
    stageAttemptId: CANCELLATION_STAGE_ID,
    causationId: IDEMPOTENCY_KEY,
    stage: 'managed-reconciliation',
    sequence: 1,
    outcome: 'skipped',
    destinationChanged: 'no',
    observations: [observation],
  });
  const finalizationContext = {
    controllerBeforeFinalization: {
      operationId: OPERATION_ID,
      attemptId: ATTEMPT_ID,
      verificationPlanDigest: intent.verificationPlanDigest,
      verificationDeadlineAt: intent.verificationDeadlineLimit,
      finalizationDeadlineAt: intent.finalizationDeadlineLimit,
      state: 'cancellation-closing',
      closeReason: 'terminal-no-change',
      cancellationCommandId: CANCELLATION_COMMAND_ID,
      cancellationActorId: CANCELLATION_ACTOR_ID,
    },
    controllerAfterFinalization: {
      operationId: OPERATION_ID,
      attemptId: ATTEMPT_ID,
      verificationPlanDigest: intent.verificationPlanDigest,
      verificationDeadlineAt: intent.verificationDeadlineLimit,
      finalizationDeadlineAt: intent.finalizationDeadlineLimit,
      state: 'sealed',
      closeReason: 'terminal-no-change',
      cancellationCommandId: CANCELLATION_COMMAND_ID,
      cancellationActorId: CANCELLATION_ACTOR_ID,
    },
    destinationFence,
    activationDetector: {
      state: 'closed',
      observationCount: 0,
      lease: {
        operationId: OPERATION_ID,
        attemptId: ATTEMPT_ID,
        activationDetectionPlanDigest: intent.activationDetectionPlanDigest,
        state: 'terminal',
      },
    },
    verificationPlan: intentContext.verificationPlan,
    verificationPlanContext: intentContext.verificationPlanContext,
    leases: requiredProbeRegions.map((probeRegion) => ({
      operationId: OPERATION_ID,
      attemptId: ATTEMPT_ID,
      verificationPlanDigest: intent.verificationPlanDigest,
      targetId: 1,
      probeRegion,
      state: 'terminal',
    })),
    precedingJournalEntries: [],
    runAttempt: 1,
    cancellationCommand: {
      commandId: CANCELLATION_COMMAND_ID,
      actorId: CANCELLATION_ACTOR_ID,
      operationId: OPERATION_ID,
    },
  };
  return {
    intent,
    observation,
    stage,
    source,
    context: {
      intent,
      expectedSequence: 1,
      stageAttempt: stage.attempt,
      stageEvidence: stage.evidence,
      stageRetainedObservations: [observation],
      precedingObservations: [],
      destinationFence,
      finalizationSource: source,
      finalizationContext,
    },
  };
}

/**
 * @param {number} runAttempt requested workflow run attempt
 * @param {{runAttempt: number, intentDigest: unknown, attempt: JsonRecord, observation: JsonRecord}} priorRunClosure authenticated preceding close
 * @returns {ReturnType<typeof intentFixture>} configured rerun intent
 */
function rerunIntentFixture(runAttempt, priorRunClosure) {
  const fixture = intentFixture();
  const workload = /** @type {JsonRecord} */ (fixture.context.workloadBinding);
  workload.runAttempt = runAttempt;
  workload.workloadBindingDigest = profileDigest(
    'verifiedWorkloadBinding',
    workload,
  );
  fixture.intent.workloadBindingDigest = workload.workloadBindingDigest;
  fixture.intent.subject = `urn:gala:workload:github:${String(workload.repositoryId)}:${String(workload.runId)}:${String(runAttempt)}`;
  const frozenHandoff = /** @type {JsonRecord} */ (
    fixture.context.frozenHandoff
  );
  frozenHandoff.frozenHandoffName = `gala-r${String(workload.runId)}-a${String(runAttempt)}-frozen-envelope-v2.bin`;
  fixture.intent.frozenHandoffName = frozenHandoff.frozenHandoffName;
  const reservation = /** @type {JsonRecord} */ (
    fixture.context.publicProbeReservation
  );
  reservation.runAttempt = runAttempt;
  const operation = /** @type {JsonRecord} */ (fixture.context.operation);
  const transitions = /** @type {JsonRecord} */ (
    operation.publicProbeReservationTransitionsByRunAttempt
  );
  for (let index = 2; index <= runAttempt; index += 1) {
    transitions[String(index)] = {
      profile: 'gala-public-probe-reservation-transition-v2',
      priorOperationObservations: [priorRunClosure.observation],
      before: {
        operationId: OPERATION_ID,
        state: 'available',
        operationProbeSlotsConsumed: 0,
        lifetimeConsumedAttemptsByStream: [
          {
            targetId: 1,
            probeRegion: 'us-east',
            lifetimeConsumedAttempts: 0,
          },
        ],
        priorRunClosure,
      },
      after: {
        operationId: OPERATION_ID,
        state: 'reserved',
        attemptId: ATTEMPT_ID,
        runAttempt: index,
        operationProbeSlotsConsumed: 0,
        lifetimeConsumedAttemptsByStream: [
          {
            targetId: 1,
            probeRegion: 'us-east',
            lifetimeConsumedAttempts: 0,
          },
        ],
        reservedProbeSlots: 4,
      },
    };
  }
  fixture.intent.intentDigest = computeDeploymentIntentDigest(fixture.intent);
  return fixture;
}

/** @returns {ReturnType<typeof receiptFixture>} */
function ordinaryFailureRerunReceiptFixture() {
  const first = intentFixture();
  const failureObservation = observationRecord(first.intent, {
    observationId: FAILURE_OBSERVATION_ID,
    stageAttemptId: FAILURE_STAGE_ID,
    sequence: 1,
    observationClass: 'request-not-started',
    outcome: 'rejected',
    destinationChanged: 'no',
    observedAt: '2026-09-12T00:00:01.000Z',
    receivedAt: '2026-09-12T00:00:02.000Z',
    evidenceDigest: tagged('d'),
  });
  const failureStage = terminalStage(first.intent, {
    stageAttemptId: FAILURE_STAGE_ID,
    causationId: IDEMPOTENCY_KEY,
    stage: 'staging',
    sequence: 1,
    outcome: 'failed',
    destinationChanged: 'no',
    failureCode: 'REJECTED',
    observations: [failureObservation],
    startedAt: '2026-09-12T00:00:00.000Z',
    completedAt: '2026-09-12T00:00:02.000Z',
  });
  const firstJournal = journal([failureObservation, failureStage.attempt], 1);
  const priorRunClosure = {
    runAttempt: 1,
    intentDigest: first.intent.intentDigest,
    attempt: failureStage.attempt,
    observation: failureObservation,
  };
  const current = receiptFixture(rerunIntentFixture(2, priorRunClosure));
  const currentJournals = /** @type {JsonRecord[]} */ (
    current.context.operationJournals
  );
  current.context.operationJournals = [
    {
      runAttempt: 1,
      intent: first.intent,
      intentContext: first.context,
      entries: firstJournal.entries,
      stageEvidenceByStageAttemptId: {
        [FAILURE_STAGE_ID]: failureStage.evidence,
      },
      observationContextsByObservationId: {
        [FAILURE_OBSERVATION_ID]: {
          destinationFence: first.context.destinationFence,
        },
      },
    },
    ...currentJournals,
  ];
  return current;
}

test('intent validates the full verified workload, source owners, plan, and digest', () => {
  const fixture = intentFixture();
  assert.equal(
    validateDeploymentIntentSemantics(fixture.intent, fixture.context),
    fixture.intent,
  );
});

test('intent rejects removal of the caller workflow witness after coordinated recomputation', () => {
  const fixture = intentFixture();
  const workloadBinding = /** @type {JsonRecord} */ (
    fixture.context.workloadBinding
  );
  delete workloadBinding.callerWorkflow;
  workloadBinding.workloadBindingDigest = profileDigest(
    'verifiedWorkloadBinding',
    workloadBinding,
  );
  fixture.intent.workloadBindingDigest = workloadBinding.workloadBindingDigest;
  fixture.intent.intentDigest = computeDeploymentIntentDigest(fixture.intent);
  assertCode(
    () => validateDeploymentIntentSemantics(fixture.intent, fixture.context),
    'DEPLOYMENT_INTENT_WORKLOAD_MISMATCH',
  );
});

test('intent reservation derives consumed attempts, slots, and stream count from retained owners', () => {
  const selfAsserted = intentFixture();
  const reservation = /** @type {JsonRecord} */ (
    selfAsserted.context.publicProbeReservation
  );
  const rows = /** @type {JsonRecord[]} */ (
    reservation.lifetimeConsumedAttemptsByStream
  );
  const firstRow = rows[0];
  assert.ok(firstRow);
  firstRow.lifetimeConsumedAttempts = 1;
  reservation.requiredProbeSlots = 3;
  reservation.operationProbeSlotsConsumed = 1;
  reservation.operationProbeSlotsRemainingBeforeReservation = 899;
  assertCode(
    () =>
      validateDeploymentIntentSemantics(
        selfAsserted.intent,
        selfAsserted.context,
      ),
    'DEPLOYMENT_INTENT_VERIFICATION_RESERVATION_INVALID',
  );

  const wrongStreamCount = intentFixture();
  const wrongStreamReservation = /** @type {JsonRecord} */ (
    wrongStreamCount.context.publicProbeReservation
  );
  wrongStreamReservation.baseProbeStreamCount = 2;
  assertCode(
    () =>
      validateDeploymentIntentSemantics(
        wrongStreamCount.intent,
        wrongStreamCount.context,
      ),
    'DEPLOYMENT_INTENT_VERIFICATION_RESERVATION_INVALID',
  );

  const overlappingReservation = intentFixture();
  const operation = /** @type {JsonRecord} */ (
    overlappingReservation.context.operation
  );
  const transitions = /** @type {JsonRecord} */ (
    operation.publicProbeReservationTransitionsByRunAttempt
  );
  const transition = /** @type {JsonRecord} */ (transitions['1']);
  const before = /** @type {JsonRecord} */ (transition.before);
  before.state = 'reserved';
  assertCode(
    () =>
      validateDeploymentIntentSemantics(
        overlappingReservation.intent,
        overlappingReservation.context,
      ),
    'DEPLOYMENT_INTENT_VERIFICATION_RESERVATION_INVALID',
  );
});

test('operation journals take reservation transitions only from the durable operation ledger', () => {
  const fixture = receiptFixture();
  const journals = /** @type {JsonRecord[]} */ (
    fixture.context.operationJournals
  );
  const firstJournal = journals[0];
  assert.ok(firstJournal);
  const intentContext = /** @type {JsonRecord} */ (firstJournal.intentContext);
  const operation = /** @type {JsonRecord} */ (intentContext.operation);
  const transitions = /** @type {JsonRecord} */ (
    operation.publicProbeReservationTransitionsByRunAttempt
  );
  const transition = /** @type {JsonRecord} */ (transitions['1']);
  const after = /** @type {JsonRecord} */ (transition.after);
  after.reservedProbeSlots = 3;
  assertCode(
    () => validateDeploymentReceiptSemantics(fixture.receipt, fixture.context),
    'DEPLOYMENT_RECEIPT_JOURNAL_INVALID',
  );
});

test('intent issuance ignores caller-supplied reservation history', () => {
  const fixture = intentFixture();
  const injectedContext = /** @type {IntentContext & JsonRecord} */ (
    fixture.context
  );
  injectedContext.priorOperationObservations = [
    { operationId: OPERATION_ID, observationClass: 'public-state' },
  ];
  injectedContext.publicProbeReservationTransition = {
    profile: 'gala-public-probe-reservation-transition-v2',
    priorOperationObservations: injectedContext.priorOperationObservations,
    before: { operationId: OPERATION_ID, state: 'available' },
    after: { operationId: OPERATION_ID, state: 'reserved' },
  };
  assert.equal(
    validateDeploymentIntentSemantics(fixture.intent, injectedContext),
    fixture.intent,
  );
});

test('rerun reservation requires the immediately prior proved no-change close', () => {
  const cancellation = cancellationFixture();
  const priorRunClosure = {
    runAttempt: 1,
    intentDigest: cancellation.intent.intentDigest,
    attempt: cancellation.stage.attempt,
    observation: cancellation.observation,
  };
  const validRerun = rerunIntentFixture(2, priorRunClosure);
  assert.equal(
    validateDeploymentIntentSemantics(validRerun.intent, validRerun.context),
    validRerun.intent,
  );

  const skippedRun = rerunIntentFixture(3, priorRunClosure);
  assertCode(
    () =>
      validateDeploymentIntentSemantics(skippedRun.intent, skippedRun.context),
    'DEPLOYMENT_INTENT_VERIFICATION_RESERVATION_INVALID',
  );

  const substitutedHistory = rerunIntentFixture(2, priorRunClosure);
  const operation = /** @type {JsonRecord} */ (
    substitutedHistory.context.operation
  );
  const transitions = /** @type {JsonRecord} */ (
    operation.publicProbeReservationTransitionsByRunAttempt
  );
  const transition = /** @type {JsonRecord} */ (transitions['2']);
  transition.priorOperationObservations = [];
  assertCode(
    () =>
      validateDeploymentIntentSemantics(
        substitutedHistory.intent,
        substitutedHistory.context,
      ),
    'DEPLOYMENT_INTENT_VERIFICATION_RESERVATION_INVALID',
  );
});

test('an ordinary failed no-change journal authorizes the next run attempt', () => {
  const fixture = ordinaryFailureRerunReceiptFixture();
  assert.equal(
    validateDeploymentReceiptSemantics(fixture.receipt, fixture.context),
    fixture.receipt,
  );
});

test('operation journals reject a cross-run verification-plan change', () => {
  const fixture = receiptFixture();
  const operationJournals = /** @type {JsonRecord[]} */ (
    fixture.context.operationJournals
  );
  const firstJournal = operationJournals[0];
  assert.ok(firstJournal);
  const secondJournal = clone(firstJournal);
  const secondIntent = /** @type {JsonRecord} */ (secondJournal.intent);
  const secondContext = /** @type {JsonRecord} */ (secondJournal.intentContext);
  const workload = /** @type {JsonRecord} */ (secondContext.workloadBinding);
  workload.runAttempt = 2;
  workload.workloadBindingDigest = profileDigest(
    'verifiedWorkloadBinding',
    workload,
  );
  secondIntent.workloadBindingDigest = workload.workloadBindingDigest;
  secondIntent.subject = `urn:gala:workload:github:${String(workload.repositoryId)}:${String(workload.runId)}:2`;

  const verificationPlan = /** @type {JsonRecord[]} */ (
    secondContext.verificationPlan
  );
  const target = verificationPlan[0];
  assert.ok(target);
  target.maximumAttempts = 5;
  const verificationPlanDigest =
    computeVerificationPlanDigest(verificationPlan);
  secondIntent.verificationPlanDigest = verificationPlanDigest;
  const verificationPlanContext = /** @type {JsonRecord} */ (
    secondContext.verificationPlanContext
  );
  verificationPlanContext.verificationPlanDigest = verificationPlanDigest;
  verificationPlanContext.maximumAttemptsPerTarget = 5;
  const acceptedPolicy = /** @type {JsonRecord} */ (
    secondContext.acceptedPolicy
  );
  acceptedPolicy.verificationPlanDigest = verificationPlanDigest;
  acceptedPolicy.maximumAttemptsPerTarget = 5;
  const policyDecision = /** @type {JsonRecord} */ (
    secondContext.deploymentPolicyDecision
  );
  policyDecision.verificationPlanDigest = verificationPlanDigest;
  policyDecision.maximumAttemptsPerTarget = 5;
  policyDecision.decisionDigest =
    computeDeploymentPolicyDecisionDigest(policyDecision);
  secondIntent.policyDecisionDigest = policyDecision.decisionDigest;
  const detectionPlan = /** @type {JsonRecord} */ (
    secondContext.activationDetectionPlan
  );
  detectionPlan.target = clone(target);
  detectionPlan.planDigest =
    computeActivationDetectionPlanDigest(detectionPlan);
  secondIntent.activationDetectionPlanDigest = detectionPlan.planDigest;
  const reservation = /** @type {JsonRecord} */ (
    secondContext.publicProbeReservation
  );
  reservation.runAttempt = 2;
  reservation.lifetimeConsumedAttemptsByStream = [
    {
      targetId: 1,
      probeRegion: 'us-east',
      lifetimeConsumedAttempts: 1,
    },
  ];
  reservation.requiredProbeSlots = 4;
  reservation.operationProbeSlotsConsumed = 1;
  reservation.operationProbeSlotsRemainingBeforeReservation = 899;
  secondIntent.intentDigest = computeDeploymentIntentDigest(secondIntent);
  secondJournal.runAttempt = 2;
  const operation = /** @type {JsonRecord} */ (fixture.context.operation);
  const reservationTransitions = /** @type {JsonRecord} */ (
    operation.publicProbeReservationTransitionsByRunAttempt
  );
  reservationTransitions['2'] = clone(reservationTransitions['1']);
  const secondTransition = /** @type {JsonRecord} */ (
    reservationTransitions['2']
  );
  const firstEntries = /** @type {JsonRecord[]} */ (firstJournal.entries);
  secondTransition.priorOperationObservations = firstEntries
    .filter((entry) => entry.entryType === 'observation')
    .map((entry) => entry.observation);
  operationJournals.push(secondJournal);
  assertCode(
    () => validateDeploymentReceiptSemantics(fixture.receipt, fixture.context),
    'DEPLOYMENT_RECEIPT_VERIFICATION_AUTHORITY_INVALID',
  );
});

test('provider activation and public verification validate against real stage evidence', () => {
  const authorized = intentFixture();
  const history = successfulHistory(authorized);
  const providerValidationContext =
    /** @type {Parameters<typeof validateDeploymentObservationSemantics>[1]} */ ({
      ...history.providerContext,
      intent: authorized.intent,
      destinationFence: authorized.context.destinationFence,
      expectedSequence: 1,
      stageAttempt: history.providerStage.attempt,
      stageEvidence: history.providerStage.evidence,
      stageRetainedObservations: [history.providerObservation],
      precedingObservations: [],
    });
  assert.equal(
    validateDeploymentObservationSemantics(history.providerObservation, {
      ...providerValidationContext,
    }),
    history.providerObservation,
  );
  const publicValidationContext =
    /** @type {Parameters<typeof validateDeploymentObservationSemantics>[1]} */ ({
      ...history.publicContext,
      intent: authorized.intent,
      expectedSequence: 2,
      stageAttempt: history.publicStage.attempt,
      stageEvidence: history.publicStage.evidence,
      stageRetainedObservations: [history.publicObservation],
      precedingObservations: [history.providerObservation],
      operationProbeCoordinates: new Set(),
    });
  assert.equal(
    validateDeploymentObservationSemantics(
      history.publicObservation,
      publicValidationContext,
    ),
    history.publicObservation,
  );
});

test('public probe coordinates are unique across operation-wide validation calls', () => {
  const authorized = intentFixture();
  const history = successfulHistory(authorized);
  const operationProbeCoordinates = new Set();
  const context =
    /** @type {Parameters<typeof validateDeploymentObservationSemantics>[1]} */ ({
      ...history.publicContext,
      intent: authorized.intent,
      expectedSequence: 2,
      stageAttempt: history.publicStage.attempt,
      stageEvidence: history.publicStage.evidence,
      stageRetainedObservations: [history.publicObservation],
      precedingObservations: [history.providerObservation],
      operationProbeCoordinates,
    });
  validateDeploymentObservationSemantics(history.publicObservation, context);
  assertCode(
    () =>
      validateDeploymentObservationSemantics(
        history.publicObservation,
        context,
      ),
    'DEPLOYMENT_OBSERVATION_PROBE_DUPLICATE',
  );
});

test('a candidate-complete receipt validates through operation journals and retained submission', () => {
  const fixture = receiptFixture();
  assert.equal(
    validateDeploymentReceiptSemantics(fixture.receipt, fixture.context),
    fixture.receipt,
  );
});

test('an attempt-only cutoff replays its exact controller transition', () => {
  const fixture = cutoffCandidateReceiptFixture();
  assert.equal(
    validateDeploymentReceiptSemantics(fixture.receipt, fixture.context),
    fixture.receipt,
  );
});

test('a direct public close accepts the inclusive trusted cutoff instant', () => {
  const cutoff = '2026-09-12T00:10:02.000Z';
  const fixture = directCandidateAtFixture(cutoff, cutoff, cutoff);
  assert.equal(
    validateDeploymentReceiptSemantics(fixture.receipt, fixture.context),
    fixture.receipt,
  );
});

test('a one-millisecond-late public fact cannot use a backdated direct close outside the receipt prefix', () => {
  const fixture = directCandidateAtFixture(
    '2026-09-12T00:10:02.001Z',
    '2026-09-12T00:10:02.001Z',
    '2026-09-12T00:10:02.000Z',
  );
  fixture.receipt.evidenceJournalEntryCount = 2;
  fixture.receipt.evidenceJournalHeadDigest =
    fixture.journal.entries[1]?.headDigest;
  fixture.receipt.receiptDigest = computeDeploymentReceiptDigest(
    fixture.receipt,
  );
  assertCode(
    () => validateDeploymentReceiptSemantics(fixture.receipt, fixture.context),
    'DEPLOYMENT_RECEIPT_VERIFICATION_CONTROLLER_INVALID',
  );
});

test('a cutoff public attempt must name its exact selected observation as causation', () => {
  const fixture = cutoffCandidateReceiptFixture();
  const descriptor = /** @type {JsonRecord} */ (
    /** @type {JsonRecord[]} */ (fixture.context.operationJournals)[0]
  );
  const intent = /** @type {JsonRecord} */ (descriptor.intent);
  const substitutedStage = terminalStage(intent, {
    stageAttemptId: PUBLIC_STAGE_ID,
    causationId: PROVIDER_OBSERVATION_ID,
    stage: 'public-verification',
    sequence: 2,
    outcome: 'succeeded',
    destinationChanged: 'yes',
    observations: [fixture.history.publicObservation],
    startedAt: '2026-09-12T00:10:02.000Z',
    completedAt: '2026-09-12T00:10:03.000Z',
  });
  const retainedJournal = journal([
    fixture.history.providerObservation,
    fixture.history.providerStage.attempt,
    fixture.history.publicObservation,
    substitutedStage.attempt,
  ]);
  descriptor.entries = retainedJournal.entries;
  const evidenceById = /** @type {JsonRecord} */ (
    descriptor.stageEvidenceByStageAttemptId
  );
  evidenceById[PUBLIC_STAGE_ID] = substitutedStage.evidence;
  fixture.receipt.attempts = [substitutedStage.attempt];
  fixture.receipt.evidenceJournalHeadDigest = retainedJournal.headDigest;
  fixture.receipt.receiptDigest = computeDeploymentReceiptDigest(
    fixture.receipt,
  );
  assertCode(
    () => validateDeploymentReceiptSemantics(fixture.receipt, fixture.context),
    'DEPLOYMENT_RECEIPT_VERIFICATION_CONTROLLER_INVALID',
  );
});

test('a direct public attempt must name its authenticated activation predecessor as causation', () => {
  const fixture = receiptFixture();
  const descriptor = /** @type {JsonRecord} */ (
    /** @type {JsonRecord[]} */ (fixture.context.operationJournals)[0]
  );
  const intent = /** @type {JsonRecord} */ (descriptor.intent);
  const substitutedStage = terminalStage(intent, {
    stageAttemptId: PUBLIC_STAGE_ID,
    causationId: PUBLIC_OBSERVATION_ID,
    stage: 'public-verification',
    sequence: 2,
    outcome: 'succeeded',
    destinationChanged: 'yes',
    observations: [fixture.history.publicObservation],
    startedAt: '2026-09-12T00:00:05.000Z',
    completedAt: '2026-09-12T00:00:07.000Z',
  });
  const retainedJournal = journal([
    fixture.history.providerObservation,
    fixture.history.providerStage.attempt,
    fixture.history.publicObservation,
    substitutedStage.attempt,
  ]);
  descriptor.entries = retainedJournal.entries;
  const evidenceById = /** @type {JsonRecord} */ (
    descriptor.stageEvidenceByStageAttemptId
  );
  evidenceById[PUBLIC_STAGE_ID] = substitutedStage.evidence;
  fixture.receipt.attempts = [substitutedStage.attempt];
  fixture.receipt.evidenceJournalHeadDigest = retainedJournal.headDigest;
  fixture.receipt.receiptDigest = computeDeploymentReceiptDigest(
    fixture.receipt,
  );
  assertCode(
    () => validateDeploymentReceiptSemantics(fixture.receipt, fixture.context),
    'DEPLOYMENT_RECEIPT_VERIFICATION_CONTROLLER_INVALID',
  );
});

test('a missing-stream deadline pair replays its exact cutoff transition', () => {
  const fixture = missingStreamDeadlineReceiptFixture();
  assert.equal(
    validateDeploymentReceiptSemantics(fixture.receipt, fixture.context),
    fixture.receipt,
  );
});

test('a public terminal attempt cannot precede its stage-result observation', () => {
  const fixture = receiptFixture();
  const descriptor = /** @type {JsonRecord} */ (
    /** @type {JsonRecord[]} */ (fixture.context.operationJournals)[0]
  );
  const reordered = journal([
    fixture.history.providerObservation,
    fixture.history.providerStage.attempt,
    fixture.history.publicStage.attempt,
    fixture.history.publicObservation,
  ]);
  descriptor.entries = reordered.entries;
  fixture.receipt.evidenceJournalEntryCount = reordered.entries.length;
  fixture.receipt.evidenceJournalHeadDigest = reordered.headDigest;
  fixture.receipt.receiptDigest = computeDeploymentReceiptDigest(
    fixture.receipt,
  );
  assertCode(
    () => validateDeploymentReceiptSemantics(fixture.receipt, fixture.context),
    'DEPLOYMENT_RECEIPT_VERIFICATION_CONTROLLER_INVALID',
  );
});

test('a direct public close requires an immediate observation-attempt pair', () => {
  const fixture = receiptFixture();
  const descriptor = /** @type {JsonRecord} */ (
    /** @type {JsonRecord[]} */ (fixture.context.operationJournals)[0]
  );
  const reordered = journal([
    fixture.history.providerObservation,
    fixture.history.publicObservation,
    fixture.history.providerStage.attempt,
    fixture.history.publicStage.attempt,
  ]);
  descriptor.entries = reordered.entries;
  fixture.receipt.evidenceJournalEntryCount = reordered.entries.length;
  fixture.receipt.evidenceJournalHeadDigest = reordered.headDigest;
  fixture.receipt.receiptDigest = computeDeploymentReceiptDigest(
    fixture.receipt,
  );
  assertCode(
    () => validateDeploymentReceiptSemantics(fixture.receipt, fixture.context),
    'DEPLOYMENT_RECEIPT_VERIFICATION_CONTROLLER_INVALID',
  );
});

test('historical public-controller state remains valid after supersession', () => {
  const fixture = receiptFixture();
  const supersession = activatedSupersessionFixture(fixture);
  const descriptor = /** @type {JsonRecord} */ (
    /** @type {JsonRecord[]} */ (fixture.context.operationJournals)[0]
  );
  const retainedJournal = journal([
    fixture.history.providerObservation,
    fixture.history.providerStage.attempt,
    fixture.history.publicObservation,
    fixture.history.publicStage.attempt,
    supersession.observation,
    supersession.stage.attempt,
  ]);
  descriptor.entries = retainedJournal.entries;
  const stageEvidenceById = /** @type {JsonRecord} */ (
    descriptor.stageEvidenceByStageAttemptId
  );
  stageEvidenceById[SUPERSESSION_STAGE_ID] = supersession.stage.evidence;
  const observationContextsById = /** @type {JsonRecord} */ (
    descriptor.observationContextsByObservationId
  );
  observationContextsById[SUPERSESSION_OBSERVATION_ID] =
    /** @type {JsonRecord} */ (supersession.context);
  const operation = /** @type {JsonRecord} */ (fixture.context.operation);
  operation.verificationController = supersession.controllerAfterFinalization;
  fixture.receipt.evidenceJournalEntryCount = retainedJournal.entries.length;
  fixture.receipt.evidenceJournalHeadDigest = retainedJournal.headDigest;
  fixture.receipt.attempts = [supersession.stage.attempt];
  fixture.receipt.observations = [supersession.observation];
  fixture.receipt.outcome = 'superseded';
  fixture.receipt.supersededByOperationId = SUCCESSOR_OPERATION_ID;
  fixture.receipt.supersededByGenerationId = SUCCESSOR_GENERATION_ID;
  fixture.receipt.completedAt = '2026-09-12T00:01:02.000Z';
  fixture.receipt.receiptDigest = computeDeploymentReceiptDigest(
    fixture.receipt,
  );
  assert.equal(
    validateDeploymentReceiptSemantics(fixture.receipt, fixture.context),
    fixture.receipt,
  );

  const transitions = /** @type {JsonRecord} */ (
    operation.verificationControllerTransitionsByStageAttemptId
  );
  const publicTransition = /** @type {JsonRecord} */ (
    transitions[PUBLIC_STAGE_ID]
  );
  publicTransition.controllerAfterFinalization =
    supersession.controllerAfterFinalization;
  assertCode(
    () => validateDeploymentReceiptSemantics(fixture.receipt, fixture.context),
    'DEPLOYMENT_RECEIPT_VERIFICATION_CONTROLLER_INVALID',
  );
});

test('every terminal public attempt is replayed even when the receipt selects an earlier prefix', () => {
  const fixture = cutoffCandidateReceiptFixture();
  fixture.receipt.evidenceJournalEntryCount = 2;
  fixture.receipt.evidenceJournalHeadDigest =
    fixture.journal.entries[1]?.headDigest;
  fixture.receipt.receiptDigest = computeDeploymentReceiptDigest(
    fixture.receipt,
  );
  const controllerAfter = /** @type {JsonRecord} */ (
    fixture.cutoffContext.controllerAfterFinalization
  );
  controllerAfter.closeReason = 'deadline';
  assertCode(
    () => validateDeploymentReceiptSemantics(fixture.receipt, fixture.context),
    'DEPLOYMENT_RECEIPT_VERIFICATION_CONTROLLER_INVALID',
  );
});

test('full-journal replay rejects a duplicate terminal attempt sequence outside the receipt prefix', () => {
  const fixture = cutoffCandidateReceiptFixture();
  const descriptor = /** @type {JsonRecord} */ (
    /** @type {JsonRecord[]} */ (fixture.context.operationJournals)[0]
  );
  const receiptAttempts = /** @type {JsonRecord[]} */ (
    fixture.receipt.attempts
  );
  const duplicateSequenceAttempt = {
    ...receiptAttempts[0],
    sequence: 1,
  };
  const retainedJournal = journal([
    fixture.history.providerObservation,
    fixture.history.providerStage.attempt,
    fixture.history.publicObservation,
    duplicateSequenceAttempt,
  ]);
  descriptor.entries = retainedJournal.entries;
  fixture.receipt.evidenceJournalEntryCount = 2;
  fixture.receipt.evidenceJournalHeadDigest =
    retainedJournal.entries[1]?.headDigest;
  fixture.receipt.receiptDigest = computeDeploymentReceiptDigest(
    fixture.receipt,
  );
  assertCode(
    () => validateDeploymentReceiptSemantics(fixture.receipt, fixture.context),
    'DEPLOYMENT_RECEIPT_JOURNAL_INVALID',
  );
});

test('receipt cannot select observation evidence committed after its journal head', () => {
  const fixture = receiptFixture();
  fixture.receipt.evidenceJournalEntryCount = 3;
  fixture.receipt.evidenceJournalHeadDigest =
    fixture.journal.entries[2]?.headDigest;
  fixture.receipt.receiptDigest = computeDeploymentReceiptDigest(
    fixture.receipt,
  );
  assertCode(
    () => validateDeploymentReceiptSemantics(fixture.receipt, fixture.context),
    'DEPLOYMENT_RECEIPT_JOURNAL_INVALID',
  );
});

test('submission projections cannot disagree with authenticated journal rows', () => {
  const fixture = receiptFixture();
  const submissionRecord = /** @type {JsonRecord} */ (
    fixture.context.submissionRecord
  );
  const submission = /** @type {JsonRecord} */ (submissionRecord.submission);
  const kernel = /** @type {JsonRecord} */ (submission.kernelJournal);
  const attempts = /** @type {JsonRecord[]} */ (kernel.attempts);
  const firstAttempt = attempts[0];
  assert.ok(firstAttempt);
  firstAttempt.outcome = 'failed';
  fixture.receipt.submissionEvidenceDigest =
    computeManagedReceiptSubmissionDigest(submission);
  fixture.receipt.receiptDigest = computeDeploymentReceiptDigest(
    fixture.receipt,
  );
  assertCode(
    () => validateDeploymentReceiptSemantics(fixture.receipt, fixture.context),
    'DEPLOYMENT_RECEIPT_SUBMISSION_INVALID',
  );
});

test('receipt ancestry binds the exact same-attempt predecessor', () => {
  const fixture = receiptFixture();
  const predecessor = clone(fixture.receipt);
  fixture.receipt.receiptId = SECOND_RECEIPT_ID;
  fixture.receipt.snapshotSequence = 2;
  fixture.receipt.attemptSnapshotSequence = 2;
  fixture.receipt.supersedesReceiptId = predecessor.receiptId;
  fixture.receipt.receiptDigest = computeDeploymentReceiptDigest(
    fixture.receipt,
  );
  fixture.context.priorReceipts = [predecessor];
  assert.equal(
    validateDeploymentReceiptSemantics(fixture.receipt, fixture.context),
    fixture.receipt,
  );

  fixture.receipt.supersedesReceiptId = CANCELLATION_COMMAND_ID;
  fixture.receipt.receiptDigest = computeDeploymentReceiptDigest(
    fixture.receipt,
  );
  assertCode(
    () => validateDeploymentReceiptSemantics(fixture.receipt, fixture.context),
    'DEPLOYMENT_RECEIPT_ANCESTRY_INVALID',
  );
});

test('provider receipt claims require a matching Pages evidence preimage', () => {
  const fixture = receiptFixture();
  const submissionRecord = /** @type {JsonRecord} */ (
    fixture.context.submissionRecord
  );
  const submission = /** @type {JsonRecord} */ (submissionRecord.submission);
  submission.destinationReceiptDigest = 'f'.repeat(64);
  fixture.receipt.destinationReceiptDigest = tagged('f');
  fixture.receipt.submissionEvidenceDigest =
    computeManagedReceiptSubmissionDigest(submission);
  fixture.receipt.receiptDigest = computeDeploymentReceiptDigest(
    fixture.receipt,
  );
  assertCode(
    () => validateDeploymentReceiptSemantics(fixture.receipt, fixture.context),
    'DEPLOYMENT_RECEIPT_PROVIDER_RECEIPT_INVALID',
  );
});

test('deadline finalization validates its cutoff controller transition', () => {
  const fixture = deadlineFinalizationFixture();
  assert.equal(
    validateDeploymentObservationSemantics(
      fixture.observation,
      fixture.context,
    ),
    fixture.observation,
  );

  const finalizationContext = /** @type {JsonRecord} */ (
    fixture.context.finalizationContext
  );
  const controllerAfter = /** @type {JsonRecord} */ (
    finalizationContext.controllerAfterFinalization
  );
  controllerAfter.closeReason = 'candidate-complete';
  assertCode(
    () =>
      validateDeploymentObservationSemantics(
        fixture.observation,
        fixture.context,
      ),
    'DEPLOYMENT_OBSERVATION_SOURCE_MISMATCH',
  );
});

test('cancellation finalization validates exact source owners and rejects substitution', () => {
  const fixture = cancellationFixture();
  assert.equal(
    validateDeploymentObservationSemantics(
      fixture.observation,
      fixture.context,
    ),
    fixture.observation,
  );

  fixture.source.cancellationActorId = SECOND_RECEIPT_ID;
  fixture.observation.evidenceDigest =
    computeCancellationFinalizationEvidenceDigest(fixture.source);
  fixture.stage = terminalStage(fixture.intent, {
    stageAttemptId: CANCELLATION_STAGE_ID,
    causationId: IDEMPOTENCY_KEY,
    stage: 'managed-reconciliation',
    sequence: 1,
    outcome: 'skipped',
    destinationChanged: 'no',
    observations: [fixture.observation],
  });
  fixture.context.stageAttempt = fixture.stage.attempt;
  fixture.context.stageEvidence = fixture.stage.evidence;
  assertCode(
    () =>
      validateDeploymentObservationSemantics(
        fixture.observation,
        fixture.context,
      ),
    'DEPLOYMENT_OBSERVATION_SOURCE_MISMATCH',
  );
});

test('both supersession finalization branches require drained owned leases', () => {
  const activated = activatedSupersessionFixture(receiptFixture());
  assert.equal(
    validateDeploymentObservationSemantics(
      activated.observation,
      activated.context,
    ),
    activated.observation,
  );
  const cutoffActivated = activatedSupersessionFixture(
    cutoffCandidateReceiptFixture(),
  );
  assert.equal(
    validateDeploymentObservationSemantics(
      cutoffActivated.observation,
      cutoffActivated.context,
    ),
    cutoffActivated.observation,
  );
  const beforeMutation = preMutationSupersessionFixture();
  assert.equal(
    validateDeploymentObservationSemantics(
      beforeMutation.observation,
      beforeMutation.context,
    ),
    beforeMutation.observation,
  );

  const invalidContext = /** @type {JsonRecord} */ (
    beforeMutation.context.finalizationContext
  );
  const leases = /** @type {JsonRecord[]} */ (invalidContext.leases);
  const firstLease = leases[0];
  assert.ok(firstLease);
  firstLease.operationId = SECOND_RECEIPT_ID;
  assertCode(
    () =>
      validateDeploymentObservationSemantics(
        beforeMutation.observation,
        beforeMutation.context,
      ),
    'DEPLOYMENT_OBSERVATION_SOURCE_INVALID',
  );

  const relabeledNoChange = activatedSupersessionFixture(receiptFixture());
  relabeledNoChange.controllerBeforeFinalization.closeReason =
    'terminal-no-change';
  assertCode(
    () =>
      validateDeploymentObservationSemantics(
        relabeledNoChange.observation,
        relabeledNoChange.context,
      ),
    'DEPLOYMENT_OBSERVATION_SOURCE_INVALID',
  );
});

test('cancellation rejects incomplete controller and detector lease drains', () => {
  const wrongController = cancellationFixture();
  const wrongControllerContext = /** @type {JsonRecord} */ (
    wrongController.context.finalizationContext
  );
  const controllerBefore = /** @type {JsonRecord} */ (
    wrongControllerContext.controllerBeforeFinalization
  );
  controllerBefore.state = 'sealed';
  controllerBefore.closeReason = 'candidate-complete';
  delete controllerBefore.cancellationCommandId;
  delete controllerBefore.cancellationActorId;
  assertCode(
    () =>
      validateDeploymentObservationSemantics(
        wrongController.observation,
        wrongController.context,
      ),
    'DEPLOYMENT_OBSERVATION_SOURCE_INVALID',
  );

  const missingVerifierLease = cancellationFixture(['us-east', 'us-west']);
  const missingLeaseContext = /** @type {JsonRecord} */ (
    missingVerifierLease.context.finalizationContext
  );
  const completeLeases = /** @type {JsonRecord[]} */ (
    missingLeaseContext.leases
  );
  missingLeaseContext.leases = completeLeases.slice(0, 1);
  assertCode(
    () =>
      validateDeploymentObservationSemantics(
        missingVerifierLease.observation,
        missingVerifierLease.context,
      ),
    'DEPLOYMENT_OBSERVATION_SOURCE_INVALID',
  );

  const substitutedPlan = cancellationFixture(['us-east', 'us-west']);
  const substitutedPlanContext = /** @type {JsonRecord} */ (
    substitutedPlan.context.finalizationContext
  );
  const verificationPlan = /** @type {JsonRecord[]} */ (
    substitutedPlanContext.verificationPlan
  );
  const target = verificationPlan[0];
  assert.ok(target);
  target.requiredProbeRegions = ['us-east'];
  assertCode(
    () =>
      validateDeploymentObservationSemantics(
        substitutedPlan.observation,
        substitutedPlan.context,
      ),
    'DEPLOYMENT_OBSERVATION_SOURCE_INVALID',
  );

  const runningDetectorLease = cancellationFixture();
  const detectorContext = /** @type {JsonRecord} */ (
    runningDetectorLease.context.finalizationContext
  );
  const detector = /** @type {JsonRecord} */ (
    detectorContext.activationDetector
  );
  const detectorLease = /** @type {JsonRecord} */ (detector.lease);
  detectorLease.state = 'running';
  assertCode(
    () =>
      validateDeploymentObservationSemantics(
        runningDetectorLease.observation,
        runningDetectorLease.context,
      ),
    'DEPLOYMENT_OBSERVATION_SOURCE_INVALID',
  );
});

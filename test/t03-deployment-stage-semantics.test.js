import assert from 'node:assert/strict';
import test from 'node:test';

import {
  computeDeploymentStageEvidenceDigest,
  computeDeploymentStageInputDigest,
  computeDeploymentStageResultDigest,
  computeLocalFilesystemObservationEvidenceDigest,
  computeLocalFilesystemProbeTranscriptDigest,
  createLocalFilesystemProbePayload,
  validateDeploymentStageEvidence,
  validateDeploymentStageInput,
  validateDeploymentStageRecords,
  validateDeploymentStageResult,
  validateLocalFilesystemObservationEvidence,
  validateLocalFilesystemProbePayload,
  validateLocalFilesystemProbeTranscript,
} from '../scripts/internal-semantics/deployment-stage-semantics.js';

const OPERATION_ID = '018f0000-0000-7000-8000-000000000001';
const ATTEMPT_ID = '018f0000-0000-7000-8000-000000000002';
const STAGE_ATTEMPT_ID = '018f0000-0000-7000-8000-000000000003';
const CAUSATION_ID = '018f0000-0000-7000-8000-000000000004';
const OBSERVATION_ID_1 = '018f0000-0000-7000-8000-000000000005';
const OBSERVATION_ID_2 = '018f0000-0000-7000-8000-000000000006';
const OBSERVATION_ID_3 = '018f0000-0000-7000-8000-000000000007';
const FOREIGN_STAGE_ATTEMPT_ID = '018f0000-0000-7000-8000-000000000008';

/** @type {readonly (readonly [string, string, string, readonly string[], boolean])[]} */
const MANAGED_FAILURE_ROWS = [
  ['staging', 'TARGET_CAPABILITY_UNAVAILABLE', 'failed', ['no'], false],
  ['staging', 'ATOMIC_ACTIVATION_UNSUPPORTED', 'failed', ['no'], false],
  ['staging', 'REJECTED', 'failed', ['no'], false],
  ['staging', 'NOT_ATTEMPTED_RETRYABLE', 'failed', ['no'], true],
  ['staging', 'AUTHORIZATION_LOST', 'failed', ['no'], false],
  ['staging', 'RATE_LIMITED', 'failed', ['no'], true],
  ['staging', 'PROVIDER_CONTRACT_VIOLATION', 'failed', ['no'], false],
  [
    'staging',
    'OUTCOME_UNKNOWN_RECONCILING',
    'unknown',
    ['unknown', 'yes'],
    false,
  ],
  ['activation', 'REJECTED', 'failed', ['no'], false],
  ['activation', 'NOT_ATTEMPTED_RETRYABLE', 'failed', ['no'], true],
  ['activation', 'AUTHORIZATION_LOST', 'failed', ['no'], false],
  ['activation', 'RATE_LIMITED', 'failed', ['no'], true],
  ['activation', 'PROVIDER_CONTRACT_VIOLATION', 'failed', ['no'], false],
  [
    'activation',
    'OUTCOME_UNKNOWN_RECONCILING',
    'unknown',
    ['unknown', 'yes'],
    false,
  ],
  [
    'public-verification',
    'PUBLIC_VERIFICATION_INCONCLUSIVE',
    'unknown',
    ['unknown', 'yes'],
    false,
  ],
  [
    'public-verification',
    'PUBLIC_INTEGRITY_MISMATCH',
    'failed',
    ['unknown', 'yes'],
    false,
  ],
  ['managed-reconciliation', 'REJECTED', 'failed', ['no'], false],
  [
    'managed-reconciliation',
    'NOT_ATTEMPTED_RETRYABLE',
    'unknown',
    ['unknown', 'yes'],
    true,
  ],
  [
    'managed-reconciliation',
    'AUTHORIZATION_LOST',
    'unknown',
    ['unknown', 'yes'],
    false,
  ],
  [
    'managed-reconciliation',
    'RATE_LIMITED',
    'unknown',
    ['unknown', 'yes'],
    true,
  ],
  [
    'managed-reconciliation',
    'OUTCOME_UNKNOWN_RECONCILING',
    'unknown',
    ['unknown', 'yes'],
    false,
  ],
  [
    'managed-reconciliation',
    'PROVIDER_CONTRACT_VIOLATION',
    'failed',
    ['unknown', 'yes'],
    false,
  ],
  ['cleanup', 'REJECTED', 'failed', ['no', 'yes'], false],
  ['cleanup', 'NOT_ATTEMPTED_RETRYABLE', 'failed', ['no', 'yes'], true],
  ['cleanup', 'AUTHORIZATION_LOST', 'failed', ['no', 'yes'], false],
  ['cleanup', 'RATE_LIMITED', 'failed', ['no', 'yes'], true],
  [
    'cleanup',
    'OUTCOME_UNKNOWN_RECONCILING',
    'unknown',
    ['unknown', 'yes'],
    false,
  ],
  ['cleanup', 'PROVIDER_CONTRACT_VIOLATION', 'failed', ['no', 'yes'], false],
];

/**
 * @typedef {Record<string, unknown> & { operationNumber: number, preparedTarget: string, renameResult: string, readerResult: string }} ProbeReplacement
 */

/**
 * @typedef {Record<string, unknown> & { source: string, linkResult: string }} ProbeContender
 */

/**
 * @typedef {Record<string, unknown> & { replacements: ProbeReplacement[], controlPublication: Record<string, unknown>, racePublication: Record<string, unknown> & { contenders: ProbeContender[], winner: string } }} ProbeTranscript
 */

/**
 * @typedef {Record<string, unknown> & { observationId: string, stageAttemptId: string, evidenceDigest: string }} RetainedObservation
 */

/**
 * @typedef {Record<string, unknown> & { stageInput: Record<string, unknown>, inputDigest: string, retryable: boolean, finalizationObservation: Record<string, unknown> }} StageResultFixture
 */

/**
 * @typedef {Record<string, unknown> & { stageInput: Record<string, unknown>, inputDigest: string, outcome: string, destinationChanged: string, retryable: boolean, observationEvidence: Record<string, unknown>[], stageResult: StageResultFixture, resultDigest: string, evidenceDigest: string }} StageEvidenceFixture
 */

/**
 * @typedef {{ evidence: StageEvidenceFixture, attempt: Record<string, unknown>, observations: RetainedObservation[] }} TerminalFixture
 */

/**
 * Return a distinct tagged SHA-256 fixture value.
 *
 * @param {string} nibble one lowercase hexadecimal character
 * @returns {string} tagged digest
 */
function digest(nibble) {
  return `sha256:${nibble.repeat(64)}`;
}

/**
 * Construct the exact replacement transcript.
 *
 * @returns {ProbeTranscript} transcript
 */
function probeTranscript() {
  return {
    profile: 'gala-local-filesystem-probe-transcript-v2',
    initialTarget: 'target-a',
    replacements: Array.from({ length: 10_000 }, (_, index) => ({
      operationNumber: index + 1,
      preparedTarget: index % 2 === 0 ? 'target-b' : 'target-a',
      renameResult: 'success',
      readerResult: index % 3 === 0 ? 'target-b' : 'target-a',
    })),
    controlPublication: {
      publisherSource: 'control',
      publicationResult: 'success',
      conflictingSource: 'race-a',
      conflictingResult: 'EEXIST',
      publishedInodeSource: 'control',
      publishedByteSource: 'control',
    },
    racePublication: {
      contenders: [
        { source: 'race-a', linkResult: 'EEXIST' },
        { source: 'race-b', linkResult: 'success' },
      ],
      winner: 'race-b',
      publishedInodeSource: 'race-b',
      publishedByteSource: 'race-b',
    },
  };
}

/**
 * Construct one credential-free stage input.
 *
 * @param {string} [stage] stage name
 * @returns {Record<string, unknown>} stage input
 */
function stageInput(stage = 'activation') {
  return {
    profile: 'gala-deployment-stage-input-v2',
    intentDigest: digest('1'),
    destinationMutationAuthority: {
      profile: 'gala-destination-mutation-authority-v2',
      operationId: OPERATION_ID,
      attemptId: ATTEMPT_ID,
    },
    stageAttemptId: STAGE_ATTEMPT_ID,
    causationId: CAUSATION_ID,
    stage,
  };
}

/**
 * Construct a retained observation row with fields used by stage validation.
 *
 * @param {string} observationId observation identifier
 * @param {string} evidenceDigest evidence digest
 * @param {string} [stageAttemptId] stage-attempt identifier
 * @returns {RetainedObservation} retained observation
 */
function observation(
  observationId,
  evidenceDigest,
  stageAttemptId = STAGE_ATTEMPT_ID,
) {
  return { observationId, stageAttemptId, evidenceDigest };
}

/**
 * Construct terminal evidence and its enclosing attempt.
 *
 * @param {object} [options] fixture options
 * @param {string} [options.stage] stage
 * @param {string} [options.outcome] outcome
 * @param {string} [options.destinationChanged] cumulative mutation value
 * @param {string} [options.failureCode] failure code
 * @param {boolean} [options.retryable] retryability
 * @returns {TerminalFixture} fixture
 */
function terminalFixture({
  stage = 'activation',
  outcome = 'succeeded',
  destinationChanged = 'yes',
  failureCode,
  retryable = false,
} = {}) {
  const input = stageInput(stage);
  const inputDigest = computeDeploymentStageInputDigest(input);
  const observations = [
    observation(OBSERVATION_ID_1, digest('2')),
    observation(OBSERVATION_ID_3, digest('4'), FOREIGN_STAGE_ATTEMPT_ID),
    observation(OBSERVATION_ID_2, digest('3')),
  ];
  const finalizationObservation = {
    observationId: OBSERVATION_ID_2,
    evidenceDigest: digest('3'),
  };
  const stageResult = {
    profile: 'gala-deployment-stage-result-v2',
    stageInput: structuredClone(input),
    inputDigest,
    outcome,
    destinationChanged,
    retryable,
    finalizationObservation,
    ...(failureCode === undefined ? {} : { failureCode }),
    ...(outcome === 'skipped'
      ? {}
      : {
          startedAt: '2026-09-13T08:00:00.000Z',
          completedAt: '2026-09-13T08:01:00.000Z',
        }),
  };
  const resultDigest = computeDeploymentStageResultDigest(stageResult);
  const evidence = {
    profile: 'gala-deployment-stage-evidence-v2',
    stageInput: structuredClone(input),
    inputDigest,
    outcome,
    destinationChanged,
    retryable,
    observationEvidence: [
      {
        observationId: OBSERVATION_ID_1,
        evidenceDigest: digest('2'),
      },
      finalizationObservation,
    ],
    stageResult,
    resultDigest,
    ...(failureCode === undefined ? {} : { failureCode }),
    ...(outcome === 'skipped'
      ? {}
      : {
          startedAt: '2026-09-13T08:00:00.000Z',
          completedAt: '2026-09-13T08:01:00.000Z',
        }),
    evidenceDigest: digest('0'),
  };
  evidence.evidenceDigest = computeDeploymentStageEvidenceDigest(evidence);
  return {
    evidence,
    attempt: {
      attemptId: ATTEMPT_ID,
      stageAttemptId: STAGE_ATTEMPT_ID,
      causationId: CAUSATION_ID,
      stage,
      sequence: 1,
      outcome,
      destinationChanged,
      inputDigest,
      resultDigest,
      ...(failureCode === undefined ? {} : { failureCode }),
      retryable,
      evidenceDigest: evidence.evidenceDigest,
      ...(outcome === 'skipped'
        ? {}
        : {
            startedAt: '2026-09-13T08:00:00.000Z',
            completedAt: '2026-09-13T08:01:00.000Z',
          }),
    },
    observations,
  };
}

/**
 * Construct the retained deployment-intent facts needed by stage validation.
 *
 * @param {Record<string, unknown>} input stage input
 * @returns {Record<string, unknown>} intent facts
 */
function deploymentIntent(input) {
  return {
    operationId: OPERATION_ID,
    attemptId: ATTEMPT_ID,
    intentDigest: input.intentDigest,
    destinationMutationAuthority: structuredClone(
      input.destinationMutationAuthority,
    ),
  };
}

test('the local probe owns exact payload bytes and a 10,000-operation transcript', () => {
  const transcript = probeTranscript();
  assert.doesNotThrow(() => validateLocalFilesystemProbeTranscript(transcript));
  assert.equal(
    computeLocalFilesystemProbeTranscriptDigest(transcript),
    'sha256:da1d97d37de72ee6e74c78dc38864487957ad801d5f14f610359496f3307d498',
  );

  for (const source of ['control', 'race-a', 'race-b']) {
    const exact = Buffer.from(
      `{"profile":"gala-local-filesystem-probe-payload-v2","source":"${source}"}`,
    );
    assert.deepEqual(createLocalFilesystemProbePayload(source), exact);
    assert.doesNotThrow(() =>
      validateLocalFilesystemProbePayload(exact, source),
    );
  }
  const exact = createLocalFilesystemProbePayload('race-a');
  assert.throws(
    () =>
      validateLocalFilesystemProbePayload(
        Buffer.concat([exact, Buffer.from('\n')]),
        'race-a',
      ),
    /LOCAL_FILESYSTEM_PROBE_PAYLOAD_INVALID/u,
  );
  assert.throws(
    () => createLocalFilesystemProbePayload('candidate'),
    /LOCAL_FILESYSTEM_PROBE_PAYLOAD_INVALID/u,
  );

  const raceA = structuredClone(transcript);
  const firstContender = raceA.racePublication.contenders[0];
  const secondContender = raceA.racePublication.contenders[1];
  assert.ok(firstContender);
  assert.ok(secondContender);
  firstContender.linkResult = 'success';
  secondContender.linkResult = 'EEXIST';
  raceA.racePublication.winner = 'race-a';
  raceA.racePublication.publishedInodeSource = 'race-a';
  raceA.racePublication.publishedByteSource = 'race-a';
  assert.doesNotThrow(() => validateLocalFilesystemProbeTranscript(raceA));
});

test('the local probe rejects gaps, parity errors, partial reads, unknown fields, and false race winners', () => {
  const cases = [];
  const short = probeTranscript();
  short.replacements.pop();
  cases.push(short);
  const gap = probeTranscript();
  const middleReplacement = gap.replacements[5000];
  assert.ok(middleReplacement);
  middleReplacement.operationNumber = 5002;
  cases.push(gap);
  const wrongParity = probeTranscript();
  const firstReplacement = wrongParity.replacements[0];
  assert.ok(firstReplacement);
  firstReplacement.preparedTarget = 'target-a';
  cases.push(wrongParity);
  const partialRead = probeTranscript();
  const firstRead = partialRead.replacements[0];
  assert.ok(firstRead);
  firstRead.readerResult = 'partial';
  cases.push(partialRead);
  const extra = probeTranscript();
  extra.controlPublication.replaced = true;
  cases.push(extra);
  const twoWinners = probeTranscript();
  const contender = twoWinners.racePublication.contenders[0];
  assert.ok(contender);
  contender.linkResult = 'success';
  cases.push(twoWinners);
  const falseWinner = probeTranscript();
  falseWinner.racePublication.winner = 'race-a';
  cases.push(falseWinner);

  for (const candidate of cases) {
    assert.throws(
      () => validateLocalFilesystemProbeTranscript(candidate),
      /LOCAL_FILESYSTEM_PROBE_TRANSCRIPT_INVALID/u,
    );
  }
});

test('local observation state owns the exact five-field all-or-none ledger', () => {
  const valid = {
    profile: 'gala-local-directory-observation-v2',
    filesystemEvidenceDigest: digest('1'),
    rootIdentityDigest: digest('2'),
    operationId: OPERATION_ID,
    attemptId: ATTEMPT_ID,
    stageAttemptId: STAGE_ATTEMPT_ID,
    expectedGenerationId: '018f0000-0000-7000-8000-000000000009',
    observedCurrentState: 'valid',
    observedGenerationId: '018f0000-0000-7000-8000-000000000010',
    observedArtifactDigest: digest('3'),
    observedMarkerDigest: digest('4'),
    observedFileCount: '12',
    observedByteCount: '2048',
    controlHeadDigest: digest('5'),
    observedAt: '2026-09-13T08:00:00.000Z',
    evidenceDigest: digest('0'),
  };
  valid.evidenceDigest = computeLocalFilesystemObservationEvidenceDigest(valid);
  assert.doesNotThrow(() => validateLocalFilesystemObservationEvidence(valid));

  for (const field of [
    'observedGenerationId',
    'observedArtifactDigest',
    'observedMarkerDigest',
    'observedFileCount',
    'observedByteCount',
  ]) {
    const incomplete = /** @type {Record<string, unknown>} */ (
      structuredClone(valid)
    );
    delete incomplete[field];
    assert.throws(
      () => validateLocalFilesystemObservationEvidence(incomplete),
      /LOCAL_FILESYSTEM_OBSERVATION_EVIDENCE_INVALID/u,
      field,
    );
  }

  for (const state of ['absent', 'malformed', 'unsafe']) {
    const leaked = structuredClone(valid);
    leaked.observedCurrentState = state;
    leaked.evidenceDigest =
      computeLocalFilesystemObservationEvidenceDigest(leaked);
    assert.throws(
      () => validateLocalFilesystemObservationEvidence(leaked),
      /LOCAL_FILESYSTEM_OBSERVATION_EVIDENCE_INVALID/u,
      state,
    );

    const nonValid = /** @type {Record<string, unknown>} */ (
      structuredClone(leaked)
    );
    for (const field of [
      'observedGenerationId',
      'observedArtifactDigest',
      'observedMarkerDigest',
      'observedFileCount',
      'observedByteCount',
    ]) {
      delete nonValid[field];
    }
    nonValid.evidenceDigest =
      computeLocalFilesystemObservationEvidenceDigest(nonValid);
    assert.doesNotThrow(
      () => validateLocalFilesystemObservationEvidence(nonValid),
      state,
    );
  }

  const overflow = structuredClone(valid);
  overflow.observedByteCount = '9223372036854775808';
  overflow.evidenceDigest =
    computeLocalFilesystemObservationEvidenceDigest(overflow);
  assert.throws(
    () => validateLocalFilesystemObservationEvidence(overflow),
    /LOCAL_FILESYSTEM_OBSERVATION_EVIDENCE_INVALID/u,
  );
});

test('not-started and running evidence enforce their complete state ledgers', () => {
  const input = stageInput('staging');
  const inputDigest = computeDeploymentStageInputDigest(input);
  const notStarted = {
    profile: 'gala-deployment-stage-evidence-v2',
    stageInput: input,
    inputDigest,
    outcome: 'not-started',
    destinationChanged: 'no',
    retryable: false,
    observationEvidence: [],
    evidenceDigest: digest('0'),
  };
  notStarted.evidenceDigest = computeDeploymentStageEvidenceDigest(notStarted);
  assert.doesNotThrow(() => validateDeploymentStageEvidence(notStarted));

  const running = {
    ...structuredClone(notStarted),
    outcome: 'running',
    destinationChanged: 'unknown',
    startedAt: '2026-09-13T08:00:00.000Z',
  };
  running.evidenceDigest = computeDeploymentStageEvidenceDigest(running);
  assert.doesNotThrow(() => validateDeploymentStageEvidence(running));

  for (const candidate of [
    { ...notStarted, startedAt: '2026-09-13T08:00:00.000Z' },
    { ...running, completedAt: '2026-09-13T08:01:00.000Z' },
    { ...running, retryable: true },
  ]) {
    candidate.evidenceDigest = computeDeploymentStageEvidenceDigest(candidate);
    assert.throws(
      () => validateDeploymentStageEvidence(candidate),
      /DEPLOYMENT_STAGE_EVIDENCE_INVALID/u,
    );
  }
});

test('terminal stage evidence closes digest ownership, copies, and retained observation membership', () => {
  const fixture = terminalFixture();
  assert.equal(
    fixture.evidence.inputDigest,
    'sha256:16d42baa60b6832f3cbef12c5d5f88fbf3bca71ec5646b36d759960293b94511',
  );
  assert.doesNotThrow(() =>
    validateDeploymentStageInput(fixture.evidence.stageInput),
  );
  assert.doesNotThrow(() =>
    validateDeploymentStageResult(fixture.evidence.stageResult),
  );
  assert.doesNotThrow(() =>
    validateDeploymentStageRecords({
      deploymentIntent: deploymentIntent(fixture.evidence.stageInput),
      deploymentAttempt: fixture.attempt,
      deploymentStageEvidence: fixture.evidence,
      retainedObservations: fixture.observations,
    }),
  );

  const badInputCopy = structuredClone(fixture);
  badInputCopy.evidence.stageResult.stageInput.causationId = OPERATION_ID;
  badInputCopy.evidence.stageResult.inputDigest =
    computeDeploymentStageInputDigest(
      badInputCopy.evidence.stageResult.stageInput,
    );
  badInputCopy.evidence.resultDigest = computeDeploymentStageResultDigest(
    badInputCopy.evidence.stageResult,
  );
  badInputCopy.evidence.evidenceDigest = computeDeploymentStageEvidenceDigest(
    badInputCopy.evidence,
  );
  assert.throws(
    () => validateDeploymentStageEvidence(badInputCopy.evidence),
    /DEPLOYMENT_STAGE_EVIDENCE_INVALID/u,
  );

  const inputWithSequence = {
    ...fixture.evidence.stageInput,
    sequence: 1,
  };
  assert.throws(
    () => validateDeploymentStageInput(inputWithSequence),
    /DEPLOYMENT_STAGE_INPUT_INVALID/u,
  );

  const omitted = structuredClone(fixture);
  omitted.evidence.observationEvidence.shift();
  omitted.evidence.evidenceDigest = computeDeploymentStageEvidenceDigest(
    omitted.evidence,
  );
  assert.throws(
    () =>
      validateDeploymentStageRecords({
        deploymentIntent: deploymentIntent(omitted.evidence.stageInput),
        deploymentAttempt: {
          ...omitted.attempt,
          evidenceDigest: omitted.evidence.evidenceDigest,
        },
        deploymentStageEvidence: omitted.evidence,
        retainedObservations: omitted.observations,
      }),
    /DEPLOYMENT_STAGE_RECORDS_INVALID/u,
  );

  const foreign = structuredClone(fixture);
  foreign.evidence.observationEvidence.push({
    observationId: OBSERVATION_ID_3,
    evidenceDigest: digest('4'),
  });
  foreign.evidence.observationEvidence.sort((left, right) =>
    JSON.stringify(left).localeCompare(JSON.stringify(right)),
  );
  foreign.evidence.evidenceDigest = computeDeploymentStageEvidenceDigest(
    foreign.evidence,
  );
  assert.throws(
    () =>
      validateDeploymentStageRecords({
        deploymentIntent: deploymentIntent(foreign.evidence.stageInput),
        deploymentAttempt: {
          ...foreign.attempt,
          evidenceDigest: foreign.evidence.evidenceDigest,
        },
        deploymentStageEvidence: foreign.evidence,
        retainedObservations: foreign.observations,
      }),
    /DEPLOYMENT_STAGE_RECORDS_INVALID/u,
  );
});

test('observation references are a canonical sorted set with unique IDs', () => {
  const fixture = terminalFixture();
  const reversed = structuredClone(fixture.evidence);
  reversed.observationEvidence.reverse();
  reversed.evidenceDigest = computeDeploymentStageEvidenceDigest(reversed);
  assert.throws(
    () => validateDeploymentStageEvidence(reversed),
    /DEPLOYMENT_STAGE_EVIDENCE_INVALID/u,
  );

  const duplicate = structuredClone(fixture.evidence);
  duplicate.observationEvidence[1] = {
    observationId: OBSERVATION_ID_1,
    evidenceDigest: digest('3'),
  };
  duplicate.evidenceDigest = computeDeploymentStageEvidenceDigest(duplicate);
  assert.throws(
    () => validateDeploymentStageEvidence(duplicate),
    /DEPLOYMENT_STAGE_EVIDENCE_INVALID/u,
  );
});

test('the retained managed failure catalog owns outcome, change, and retryability', () => {
  for (const [
    stage,
    failureCode,
    outcome,
    changes,
    retryable,
  ] of MANAGED_FAILURE_ROWS) {
    for (const destinationChanged of changes) {
      const row = terminalFixture({
        stage,
        outcome,
        destinationChanged,
        failureCode,
        retryable,
      });
      assert.doesNotThrow(
        () => validateDeploymentStageEvidence(row.evidence),
        `${stage}/${failureCode}/${outcome}/${destinationChanged}/${retryable}`,
      );
    }
  }

  const valid = terminalFixture({
    stage: 'managed-reconciliation',
    outcome: 'unknown',
    destinationChanged: 'unknown',
    failureCode: 'RATE_LIMITED',
    retryable: true,
  });
  assert.doesNotThrow(() => validateDeploymentStageEvidence(valid.evidence));

  /** @type {((candidate: StageEvidenceFixture) => void)[]} */
  const mutations = [
    (candidate) => {
      candidate.retryable = false;
      candidate.stageResult.retryable = false;
    },
    (candidate) => {
      candidate.failureCode = 'TARGET_CAPABILITY_UNAVAILABLE';
      candidate.stageResult.failureCode = 'TARGET_CAPABILITY_UNAVAILABLE';
    },
    (candidate) => {
      candidate.destinationChanged = 'no';
      candidate.stageResult.destinationChanged = 'no';
    },
  ];
  for (const mutate of mutations) {
    const candidate = structuredClone(valid.evidence);
    mutate(candidate);
    candidate.resultDigest = computeDeploymentStageResultDigest(
      candidate.stageResult,
    );
    candidate.evidenceDigest = computeDeploymentStageEvidenceDigest(candidate);
    assert.throws(
      () => validateDeploymentStageEvidence(candidate),
      /DEPLOYMENT_STAGE_EVIDENCE_INVALID/u,
    );
  }
});

test('record-set validation binds intent authority, attempt copies, times, and committed observations', () => {
  const fixture = terminalFixture();
  const cases = [
    {
      intent: {
        ...deploymentIntent(fixture.evidence.stageInput),
        operationId: OBSERVATION_ID_1,
      },
      attempt: fixture.attempt,
      observations: fixture.observations,
    },
    {
      intent: deploymentIntent(fixture.evidence.stageInput),
      attempt: { ...fixture.attempt, causationId: OBSERVATION_ID_1 },
      observations: fixture.observations,
    },
    {
      intent: deploymentIntent(fixture.evidence.stageInput),
      attempt: {
        ...fixture.attempt,
        completedAt: '2026-09-13T07:59:59.999Z',
      },
      observations: fixture.observations,
    },
    {
      intent: deploymentIntent(fixture.evidence.stageInput),
      attempt: fixture.attempt,
      observations: fixture.observations.slice(0, 2),
    },
  ];

  for (const candidate of cases) {
    assert.throws(
      () =>
        validateDeploymentStageRecords({
          deploymentIntent: candidate.intent,
          deploymentAttempt: candidate.attempt,
          deploymentStageEvidence: fixture.evidence,
          retainedObservations: candidate.observations,
        }),
      /DEPLOYMENT_STAGE_RECORDS_INVALID/u,
    );
  }
});

test('closed records reject sequence leakage and stage-owned digest cycles', () => {
  const fixture = terminalFixture();
  const sequenceLeak = structuredClone(fixture.evidence);
  sequenceLeak.kernelSequence = 1;
  sequenceLeak.evidenceDigest =
    computeDeploymentStageEvidenceDigest(sequenceLeak);
  assert.throws(
    () => validateDeploymentStageEvidence(sequenceLeak),
    /DEPLOYMENT_STAGE_EVIDENCE_INVALID/u,
  );

  const digestCycle = structuredClone(fixture.evidence);
  const firstObservation = digestCycle.observationEvidence[0];
  assert.ok(firstObservation);
  firstObservation.evidenceDigest = digestCycle.resultDigest;
  digestCycle.evidenceDigest =
    computeDeploymentStageEvidenceDigest(digestCycle);
  assert.throws(
    () => validateDeploymentStageEvidence(digestCycle),
    /DEPLOYMENT_STAGE_EVIDENCE_INVALID/u,
  );
});

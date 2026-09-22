// Generated from urn:gala:schema:deployment-observation:2.0.0; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
// Do not edit.

export type DeploymentObservationActivationDetectionObservation = Readonly<{
  readonly attemptId: DeploymentObservationStableId;
  readonly detectionAttemptNumber: number;
  readonly eligibleAt: DeploymentObservationRfc3339;
  readonly evidenceDigest: DeploymentObservationDigest;
  readonly operationId: DeploymentObservationStableId;
  readonly planDigest: DeploymentObservationDigest;
  readonly probes: ReadonlyArray<DeploymentObservationActivationDetectionProbe>;
  readonly profile: 'gala-public-activation-detection-observation-v2';
  readonly receivedAt: DeploymentObservationRfc3339;
}>;

export type DeploymentObservationActivationDetectionProbe = Readonly<{
  readonly bodyState:
    | 'not-read'
    | 'incomplete'
    | 'complete'
    | 'limit-exceeded'
    | 'encoding-rejected'
    | 'framing-rejected';
  readonly classification:
    | 'redirect-match'
    | 'candidate'
    | 'recognized-prior'
    | 'integrity-mismatch'
    | 'inconclusive';
  readonly contractGenerationId?: DeploymentObservationStableId;
  readonly evidenceDigest: DeploymentObservationDigest;
  readonly expectedCandidateDigest: DeploymentObservationDigest;
  readonly hopNumber: number;
  readonly observedAt: DeploymentObservationRfc3339;
  readonly observedByteLength?: DeploymentObservationNonNegativeInt64;
  readonly observedDigest?: DeploymentObservationDigest;
  readonly observedGenerationId?: DeploymentObservationStableId;
  readonly observedHeaders: ReadonlyArray<DeploymentObservationObservedVerificationHeader>;
  readonly observedLocation?: DeploymentObservationObservedRedirectLocation;
  readonly observedLocationState:
    'absent' | 'retained' | 'unsafe-omitted' | 'head-unavailable';
  readonly observedStatus?: number;
  readonly origin: DeploymentObservationVerificationOrigin;
  readonly precedingDetectionProbeEvidenceDigest?: DeploymentObservationDigest;
  readonly probeRegion: DeploymentObservationProbeRegion;
  readonly requestStartedAt: DeploymentObservationRfc3339;
  readonly requestUrl: DeploymentObservationVerificationUrl;
  readonly responseHeadState:
    'not-received' | 'complete' | 'limit-exceeded' | 'malformed';
  readonly route: DeploymentObservationCanonicalRoute;
  readonly targetId: number;
}> &
  unknown;

export type DeploymentObservationAdapterIdentity = Readonly<{
  readonly adapterDigest: DeploymentObservationDigest;
  readonly adapterId: DeploymentObservationPlainLabel;
  readonly adapterVersion: DeploymentObservationSemver;
}>;

export type DeploymentObservationBcp47 = string;

export type DeploymentObservationCancellationFinalizationEvidence = Readonly<{
  readonly activationDetectionLastEvidenceDigest?: DeploymentObservationDigest;
  readonly activationDetectionObservationCount: number;
  readonly attemptId: DeploymentObservationStableId;
  readonly authorityEpoch: DeploymentObservationPositiveInt64;
  readonly cancellationActorId: DeploymentObservationStableId;
  readonly cancellationCommandId: DeploymentObservationStableId;
  readonly destinationKeyDigest: DeploymentObservationDigest;
  readonly fenceEvidenceDigest: DeploymentObservationDigest;
  readonly finalizedAt: DeploymentObservationRfc3339;
  readonly intentDigest: DeploymentObservationDigest;
  readonly operationId: DeploymentObservationStableId;
  readonly precedingEvidenceJournalEntryCount: number;
  readonly precedingEvidenceJournalHeadDigest: DeploymentObservationDigest;
  readonly profile: 'gala-cancellation-finalization-evidence-v2';
}> &
  unknown;

export type DeploymentObservationCanonicalRoute = string;

export type DeploymentObservationDeadlineFinalizationEvidence = Readonly<{
  readonly attemptId: DeploymentObservationStableId;
  readonly cutoffEvidenceJournalEntryCount: number;
  readonly cutoffEvidenceJournalHeadDigest: DeploymentObservationDigest;
  readonly finalizationDeadlineAt: DeploymentObservationRfc3339;
  readonly finalizationKind:
    'propagation-degraded' | 'verification-inconclusive';
  readonly finalizedAt: DeploymentObservationRfc3339;
  readonly intentDigest: DeploymentObservationDigest;
  readonly operationId: DeploymentObservationStableId;
  readonly profile: 'gala-deadline-finalization-evidence-v2';
  readonly selectedStreams: ReadonlyArray<DeploymentObservationDeadlineFinalizationStream>;
  readonly verificationDeadlineAt: DeploymentObservationRfc3339;
  readonly verificationPlanDigest: DeploymentObservationDigest;
}> &
  unknown;

export type DeploymentObservationDeadlineFinalizationStream = Readonly<{
  readonly evidenceDigest?: DeploymentObservationDigest;
  readonly observationId?: DeploymentObservationStableId;
  readonly probeRegion: DeploymentObservationProbeRegion;
  readonly state: 'terminal' | 'missing';
  readonly targetId: number;
}> &
  unknown;

export type DeploymentObservationDestinationIdentity = Readonly<{
  readonly adapterId: DeploymentObservationPlainLabel;
  readonly adapterVersion: DeploymentObservationSemver;
  readonly baseUrl: DeploymentObservationUrlHttps;
  readonly environment: 'github-pages' | 'do-spaces' | 'local-directory';
  readonly providerBinding?: DeploymentObservationDestinationProviderCoordinates;
  readonly targetDigest: DeploymentObservationDigest;
}> &
  unknown;

export type DeploymentObservationDestinationProviderCoordinates = Readonly<{
  readonly owner?: string;
  readonly region?: DeploymentObservationSpacesRegion;
  readonly repository?: string;
  readonly servedBucket?: DeploymentObservationSpacesBucket;
  readonly stagingBucket?: DeploymentObservationSpacesBucket;
}>;

export type DeploymentObservationDigest = string;

export type DeploymentObservationExpectedRedirectHop = Readonly<{
  readonly expectedLocation: DeploymentObservationVerificationUrl;
  readonly expectedStatus: 301 | 302 | 303 | 307 | 308;
  readonly hopNumber: number;
  readonly requestUrl: DeploymentObservationVerificationUrl;
}>;

export type DeploymentObservationExtensionKey = string;

export type DeploymentObservationGitObjectId = string;

export type DeploymentObservationGithubActionsArtifactId =
  DeploymentObservationGithubPositiveDecimal;

export type DeploymentObservationGithubPositiveDecimal = string;

export type DeploymentObservationGlob = string;

export type DeploymentObservationInt64 = string;

export type DeploymentObservationIsoCountry = string;

export type DeploymentObservationLowerHex40 = string;

export type DeploymentObservationNonNegativeInt64 = string;

export type DeploymentObservationNpmPackageName = string;

export type DeploymentObservationObservedRedirectLocation = string;

export type DeploymentObservationObservedVerificationHeader = Readonly<{
  readonly name: DeploymentObservationVerificationHeaderName;
  readonly state: 'present' | 'absent' | 'unsafe-omitted';
  readonly value?: DeploymentObservationVerificationHeaderValue;
}> &
  unknown;

export type DeploymentObservationPackageExact = string;

export type DeploymentObservationPackageIdentity = Readonly<{
  readonly integrity: DeploymentObservationDigest;
  readonly package: DeploymentObservationNpmPackageName;
  readonly registry: DeploymentObservationUrlHttps;
  readonly version: DeploymentObservationSemver;
}>;

export type DeploymentObservationPackageRange = string;

export type DeploymentObservationPassiveVisualToken = never;

export type DeploymentObservationPlainLabel = string;

export type DeploymentObservationPlainText = string;

export type DeploymentObservationPositiveInt64 = string;

export type DeploymentObservationProbeRegion = string;

export type DeploymentObservationPublicProbeObservation = Readonly<{
  readonly attemptNumber: number;
  readonly bodyState:
    | 'not-read'
    | 'incomplete'
    | 'complete'
    | 'limit-exceeded'
    | 'encoding-rejected'
    | 'framing-rejected';
  readonly classification:
    | 'redirect-match'
    | 'candidate'
    | 'recognized-prior'
    | 'integrity-mismatch'
    | 'inconclusive';
  readonly contractGenerationId?: DeploymentObservationStableId;
  readonly evidenceDigest: DeploymentObservationDigest;
  readonly expectedCandidateDigest: DeploymentObservationDigest;
  readonly hopNumber: number;
  readonly observedAt: DeploymentObservationRfc3339;
  readonly observedByteLength?: DeploymentObservationNonNegativeInt64;
  readonly observedDigest?: DeploymentObservationDigest;
  readonly observedGenerationId?: DeploymentObservationStableId;
  readonly observedHeaders: ReadonlyArray<DeploymentObservationObservedVerificationHeader>;
  readonly observedLocation?: DeploymentObservationObservedRedirectLocation;
  readonly observedLocationState:
    'absent' | 'retained' | 'unsafe-omitted' | 'head-unavailable';
  readonly observedStatus?: number;
  readonly origin: DeploymentObservationVerificationOrigin;
  readonly precedingProbeEvidenceDigest?: DeploymentObservationDigest;
  readonly probeRegion: DeploymentObservationProbeRegion;
  readonly requestStartedAt: DeploymentObservationRfc3339;
  readonly requestUrl: DeploymentObservationVerificationUrl;
  readonly responseHeadState:
    'not-received' | 'complete' | 'limit-exceeded' | 'malformed';
  readonly route: DeploymentObservationCanonicalRoute;
  readonly targetId: number;
}> &
  unknown;

export type DeploymentObservationRecognizedPriorRouteContract = Readonly<{
  readonly expectedByteLength: DeploymentObservationNonNegativeInt64;
  readonly expectedDigest: DeploymentObservationDigest;
  readonly expectedHeaders: ReadonlyArray<DeploymentObservationVerificationHeaderExpectation>;
  readonly expectedTerminalStatus: 200 | 404;
  readonly generationId: DeploymentObservationStableId;
  readonly redirectChain: ReadonlyArray<DeploymentObservationExpectedRedirectHop>;
  readonly terminalRequestUrl: DeploymentObservationVerificationUrl;
}>;

export type DeploymentObservationRenderPolicyIdentity = Readonly<{
  readonly digest: DeploymentObservationDigest;
  readonly name: DeploymentObservationPlainLabel;
  readonly version: DeploymentObservationSemver;
}>;

export type DeploymentObservationRepoRelativePath = string;

export type DeploymentObservationRfc3339 = string;

export type DeploymentObservationSemver = string;

export type DeploymentObservationSemverRange = string;

export type DeploymentObservationSlug = string;

export type DeploymentObservationSpacesBucket = string;

export type DeploymentObservationSpacesRegion = string;

export type DeploymentObservationStableId = string;

export type DeploymentObservationSupersessionFinalizationEvidence = (
  | Readonly<{
      readonly fenceTerminalState: 'terminal-candidate';
      readonly finalizationOutcome: 'activated';
    }>
  | Readonly<{
      readonly fenceTerminalState: 'terminal-no-change';
      readonly finalizationOutcome: 'before-mutation';
    }>
) &
  Readonly<{
    readonly activationDetectionLastEvidenceDigest?: DeploymentObservationDigest;
    readonly activationDetectionObservationCount: number;
    readonly authorityEpoch: DeploymentObservationPositiveInt64;
    readonly destinationKeyDigest: DeploymentObservationDigest;
    readonly fenceEvidenceDigest: DeploymentObservationDigest;
    readonly fenceTerminalState: 'terminal-no-change' | 'terminal-candidate';
    readonly finalizationOutcome: 'before-mutation' | 'activated';
    readonly finalizedAt: DeploymentObservationRfc3339;
    readonly precedingEvidenceJournalEntryCount: number;
    readonly precedingEvidenceJournalHeadDigest: DeploymentObservationDigest;
    readonly profile: 'gala-supersession-finalization-evidence-v2';
    readonly supersededAttemptId: DeploymentObservationStableId;
    readonly supersededByGenerationId: DeploymentObservationStableId;
    readonly supersededByOperationId: DeploymentObservationStableId;
    readonly supersededIntentDigest: DeploymentObservationDigest;
    readonly supersededOperationId: DeploymentObservationStableId;
  }> &
  unknown;

export type DeploymentObservationUrlHttps = string;

export type DeploymentObservationUrn = string;

export type DeploymentObservationVerificationHeaderExpectation = Readonly<{
  readonly name: DeploymentObservationVerificationHeaderName;
  readonly value: DeploymentObservationVerificationHeaderValue;
}>;

export type DeploymentObservationVerificationHeaderName = string;

export type DeploymentObservationVerificationHeaderValue = string;

export type DeploymentObservationVerificationOrigin = string;

export type DeploymentObservationVerificationPlanTarget = Readonly<{
  readonly expectedByteLength: DeploymentObservationNonNegativeInt64;
  readonly expectedCandidateDigest: DeploymentObservationDigest;
  readonly expectedHeaders: ReadonlyArray<DeploymentObservationVerificationHeaderExpectation>;
  readonly expectedTerminalStatus: 200 | 404;
  readonly maximumAttempts: number;
  readonly maximumConcurrentStreams: number;
  readonly maximumResponseBytes: DeploymentObservationNonNegativeInt64;
  readonly maximumResponseWireBytes: DeploymentObservationPositiveInt64;
  readonly origin: DeploymentObservationVerificationOrigin;
  readonly recognizedPriorContracts: ReadonlyArray<DeploymentObservationRecognizedPriorRouteContract>;
  readonly redirectChain: ReadonlyArray<DeploymentObservationExpectedRedirectHop>;
  readonly requestProfile: 'gala-public-verifier-v2';
  readonly requestTimeoutSeconds: number;
  readonly requiredProbeRegions: ReadonlyArray<DeploymentObservationProbeRegion>;
  readonly retryProfile: 'gala-public-probe-retry-v2';
  readonly route: DeploymentObservationCanonicalRoute;
  readonly targetId: number;
  readonly terminalRequestUrl: DeploymentObservationVerificationUrl;
}>;

export type DeploymentObservationVerificationUrl = string;

export type DeploymentObservationDocument = (
  | Readonly<{
      readonly destinationChanged?: 'no' | 'yes';
      readonly observationClass?: 'provider-error';
      readonly outcome?:
        | 'rejected'
        | 'not-attempted-retryable'
        | 'authorization-lost'
        | 'rate-limited'
        | 'provider-contract-violation';
    }>
  | Readonly<{
      readonly destinationChanged?: 'no' | 'yes';
      readonly observationClass?: 'provider-state';
      readonly outcome?: 'succeeded';
    }>
  | Readonly<{
      readonly destinationChanged?: 'no' | 'yes';
      readonly observationClass?: 'request-not-started';
      readonly outcome?:
        | 'rejected'
        | 'not-attempted-retryable'
        | 'authorization-lost'
        | 'rate-limited'
        | 'provider-contract-violation';
    }>
  | Readonly<{
      readonly destinationChanged?: 'no';
      readonly observationClass?: 'provider-state';
      readonly outcome?: 'rejected';
    }>
  | Readonly<{
      readonly destinationChanged?: 'no';
      readonly observationClass?: 'supersession-finalization';
      readonly outcome?: 'rejected';
    }>
  | Readonly<{
      readonly destinationChanged?: 'unknown' | 'yes';
      readonly observationClass?: 'provider-error';
      readonly outcome?: 'outcome-unknown-reconciling';
    }>
  | Readonly<{
      readonly destinationChanged?: 'unknown' | 'yes';
      readonly observationClass?: 'provider-state';
      readonly outcome?: 'outcome-unknown-reconciling';
    }>
  | Readonly<{
      readonly destinationChanged?: 'unknown' | 'yes';
      readonly observationClass?: 'public-state';
      readonly outcome?:
        'outcome-unknown-reconciling' | 'provider-contract-violation';
    }>
  | Readonly<{
      readonly destinationChanged?: 'unknown' | 'yes';
      readonly observationClass?: 'request-accepted';
      readonly outcome?: 'outcome-unknown-reconciling';
    }>
  | Readonly<{
      readonly destinationChanged?: 'unknown' | 'yes';
      readonly observationClass?: 'timeout';
      readonly outcome?: 'outcome-unknown-reconciling';
    }>
  | Readonly<{
      readonly destinationChanged?: 'yes' | 'no' | 'unknown';
      readonly observationClass?: 'provider-state';
      readonly outcome?: 'provider-contract-violation';
    }>
  | Readonly<{
      readonly destinationChanged?: 'yes';
      readonly observationClass?: 'deadline-finalization';
      readonly outcome?: 'succeeded' | 'outcome-unknown-reconciling';
    }>
  | Readonly<{
      readonly destinationChanged?: 'yes';
      readonly observationClass?: 'public-state';
      readonly outcome?: 'succeeded';
    }>
  | Readonly<{
      readonly destinationChanged?: 'yes';
      readonly observationClass?: 'supersession-finalization';
      readonly outcome?: 'succeeded';
    }>
) &
  Readonly<{
    readonly adapter: DeploymentObservationAdapterIdentity;
    readonly artifactDigest: DeploymentObservationDigest;
    readonly artifactId: DeploymentObservationStableId;
    readonly attemptId: DeploymentObservationStableId;
    readonly destination: DeploymentObservationDestinationIdentity;
    readonly destinationChanged: 'yes' | 'no' | 'unknown';
    readonly evidenceDigest: DeploymentObservationDigest;
    readonly generationId?: DeploymentObservationStableId;
    readonly intentDigest: DeploymentObservationDigest;
    readonly observationClass:
      | 'request-not-started'
      | 'request-accepted'
      | 'provider-state'
      | 'public-state'
      | 'deadline-finalization'
      | 'supersession-finalization'
      | 'timeout'
      | 'provider-error';
    readonly observationId: DeploymentObservationStableId;
    readonly observedArtifactDigest?: DeploymentObservationDigest;
    readonly observedAt: DeploymentObservationRfc3339;
    readonly operationId: DeploymentObservationStableId;
    readonly outcome:
      | 'succeeded'
      | 'rejected'
      | 'not-attempted-retryable'
      | 'outcome-unknown-reconciling'
      | 'authorization-lost'
      | 'rate-limited'
      | 'provider-contract-violation';
    readonly probes: ReadonlyArray<DeploymentObservationPublicProbeObservation>;
    readonly providerObjectIdDigest?: DeploymentObservationDigest;
    readonly providerVersion?: DeploymentObservationPlainLabel;
    readonly receivedAt: DeploymentObservationRfc3339;
    readonly schemaId: 'urn:gala:schema:deployment-observation:2.0.0';
    readonly schemaVersion: '2.0.0';
    readonly sequence: number;
    readonly stageAttemptId: DeploymentObservationStableId;
  }> &
  unknown;

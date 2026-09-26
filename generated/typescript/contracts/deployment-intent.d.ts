// Generated from urn:gala:schema:deployment-intent:2.0.0; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
// Do not edit.

export type DeploymentIntentActivationBasis = Readonly<{
  readonly evidenceDigest: DeploymentIntentDigest;
  readonly observedAt: DeploymentIntentRfc3339;
  readonly source:
    'kernel-provider-observation' | 'gala-public-marker-detection';
}>;

export type DeploymentIntentActivationDetectionObservation = Readonly<{
  readonly attemptId: DeploymentIntentStableId;
  readonly detectionAttemptNumber: number;
  readonly eligibleAt: DeploymentIntentRfc3339;
  readonly evidenceDigest: DeploymentIntentDigest;
  readonly operationId: DeploymentIntentStableId;
  readonly planDigest: DeploymentIntentDigest;
  readonly probes: ReadonlyArray<DeploymentIntentActivationDetectionProbe>;
  readonly profile: 'gala-public-activation-detection-observation-v2';
  readonly receivedAt: DeploymentIntentRfc3339;
}>;

export type DeploymentIntentActivationDetectionPlan = Readonly<{
  readonly artifactId: DeploymentIntentStableId;
  readonly attemptId: DeploymentIntentStableId;
  readonly firstEligibleAt: DeploymentIntentRfc3339;
  readonly intervalSeconds: 60;
  readonly lastEligibleAt: DeploymentIntentRfc3339;
  readonly maximumAttempts: 91;
  readonly maximumRedirectHops: number;
  readonly operationId: DeploymentIntentStableId;
  readonly planDigest: DeploymentIntentDigest;
  readonly probeRegion: DeploymentIntentProbeRegion;
  readonly profile: 'gala-public-activation-detection-v2';
  readonly proposedGenerationId: DeploymentIntentStableId;
  readonly requestTimeoutSeconds: number;
  readonly reservedProbeSlots: DeploymentIntentPositiveInt64 & string;
  readonly target: DeploymentIntentVerificationPlanTarget;
}>;

export type DeploymentIntentActivationDetectionProbe = Readonly<{
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
  readonly contractGenerationId?: DeploymentIntentStableId;
  readonly evidenceDigest: DeploymentIntentDigest;
  readonly expectedCandidateDigest: DeploymentIntentDigest;
  readonly hopNumber: number;
  readonly observedAt: DeploymentIntentRfc3339;
  readonly observedByteLength?: DeploymentIntentNonNegativeInt64;
  readonly observedDigest?: DeploymentIntentDigest;
  readonly observedGenerationId?: DeploymentIntentStableId;
  readonly observedHeaders: ReadonlyArray<DeploymentIntentObservedVerificationHeader>;
  readonly observedLocation?: DeploymentIntentObservedRedirectLocation;
  readonly observedLocationState:
    'absent' | 'retained' | 'unsafe-omitted' | 'head-unavailable';
  readonly observedStatus?: number;
  readonly origin: DeploymentIntentVerificationOrigin;
  readonly precedingDetectionProbeEvidenceDigest?: DeploymentIntentDigest;
  readonly probeRegion: DeploymentIntentProbeRegion;
  readonly requestStartedAt: DeploymentIntentRfc3339;
  readonly requestUrl: DeploymentIntentVerificationUrl;
  readonly responseHeadState:
    'not-received' | 'complete' | 'limit-exceeded' | 'malformed';
  readonly route: DeploymentIntentCanonicalRoute;
  readonly targetId: number;
}> &
  unknown;

export type DeploymentIntentAdapterIdentity = Readonly<{
  readonly adapterDigest: DeploymentIntentDigest;
  readonly adapterId: DeploymentIntentPlainLabel;
  readonly adapterVersion: DeploymentIntentSemver;
}>;

export type DeploymentIntentBcp47 = string;

export type DeploymentIntentCancellationFinalizationEvidence = Readonly<{
  readonly activationDetectionLastEvidenceDigest?: DeploymentIntentDigest;
  readonly activationDetectionObservationCount: number;
  readonly attemptId: DeploymentIntentStableId;
  readonly authorityEpoch: DeploymentIntentPositiveInt64;
  readonly cancellationActorId: DeploymentIntentStableId;
  readonly cancellationCommandId: DeploymentIntentStableId;
  readonly destinationKeyDigest: DeploymentIntentDigest;
  readonly fenceEvidenceDigest: DeploymentIntentDigest;
  readonly finalizedAt: DeploymentIntentRfc3339;
  readonly intentDigest: DeploymentIntentDigest;
  readonly operationId: DeploymentIntentStableId;
  readonly precedingEvidenceJournalEntryCount: number;
  readonly precedingEvidenceJournalHeadDigest: DeploymentIntentDigest;
  readonly profile: 'gala-cancellation-finalization-evidence-v2';
}> &
  unknown;

export type DeploymentIntentCanonicalRoute = string;

export type DeploymentIntentDeadlineFinalizationEvidence = Readonly<{
  readonly attemptId: DeploymentIntentStableId;
  readonly cutoffEvidenceJournalEntryCount: number;
  readonly cutoffEvidenceJournalHeadDigest: DeploymentIntentDigest;
  readonly finalizationDeadlineAt: DeploymentIntentRfc3339;
  readonly finalizationKind:
    'propagation-degraded' | 'verification-inconclusive';
  readonly finalizedAt: DeploymentIntentRfc3339;
  readonly intentDigest: DeploymentIntentDigest;
  readonly operationId: DeploymentIntentStableId;
  readonly profile: 'gala-deadline-finalization-evidence-v2';
  readonly selectedStreams: ReadonlyArray<DeploymentIntentDeadlineFinalizationStream>;
  readonly verificationDeadlineAt: DeploymentIntentRfc3339;
  readonly verificationPlanDigest: DeploymentIntentDigest;
}> &
  unknown;

export type DeploymentIntentDeadlineFinalizationStream = Readonly<{
  readonly evidenceDigest?: DeploymentIntentDigest;
  readonly observationId?: DeploymentIntentStableId;
  readonly probeRegion: DeploymentIntentProbeRegion;
  readonly state: 'terminal' | 'missing';
  readonly targetId: number;
}> &
  unknown;

export type DeploymentIntentDeploymentPolicyDecision = Readonly<{
  readonly activationDetectionIntervalSeconds: 60;
  readonly activationDetectionProfile: 'gala-public-activation-detection-v2';
  readonly approvedOverrides: [];
  readonly artifactDigest: DeploymentIntentDigest;
  readonly artifactId: DeploymentIntentStableId;
  readonly buildPolicyDecisionDigest: DeploymentIntentDigest;
  readonly capabilityDecisionDigest: DeploymentIntentDigest;
  readonly decisionDigest: DeploymentIntentDigest;
  readonly destination: DeploymentIntentDestinationIdentity;
  readonly manifestDigest: DeploymentIntentDigest;
  readonly maximumActivationDetectionAttempts: 91;
  readonly maximumAttemptsPerTarget: number;
  readonly maximumConcurrentStreams: number;
  readonly maximumFinalizationDelaySeconds: 300;
  readonly maximumPublicResponseBytes: DeploymentIntentPositiveInt64;
  readonly maximumPublicVerificationSeconds: number;
  readonly maximumRedirectHops: number;
  readonly networkBoundaryProfileDigest: DeploymentIntentDigest;
  readonly policyProfile: DeploymentIntentPlainLabel;
  readonly policyReleaseId: DeploymentIntentStableId;
  readonly policyVersion: DeploymentIntentSemver;
  readonly profile: 'gala-deployment-policy-decision-v2';
  readonly publicTlsProfileDigest: DeploymentIntentDigest;
  readonly publicTlsRevocationSetDigest: DeploymentIntentDigest;
  readonly publicTlsTrustStoreDigest: DeploymentIntentDigest;
  readonly requestTimeoutSeconds: number;
  readonly retryProfile: 'gala-public-probe-retry-v2';
  readonly verificationOrigins: ReadonlyArray<DeploymentIntentVerificationOrigin>;
  readonly verificationPlanDigest: DeploymentIntentDigest;
  readonly verificationTier:
    | 'provider-complete-digest'
    | 'full-public-fetch'
    | 'deterministic-sample'
    | 'critical-only';
}>;

export type DeploymentIntentDestinationIdentity = Readonly<{
  readonly adapterId: DeploymentIntentPlainLabel;
  readonly adapterVersion: DeploymentIntentSemver;
  readonly baseUrl: DeploymentIntentUrlHttps;
  readonly environment: 'github-pages' | 'do-spaces' | 'local-directory';
  readonly providerBinding?: DeploymentIntentDestinationProviderCoordinates;
  readonly targetDigest: DeploymentIntentDigest;
}> &
  unknown;

export type DeploymentIntentDestinationMutationAuthority = Readonly<{
  readonly attemptId: DeploymentIntentStableId;
  readonly authorityId: DeploymentIntentStableId;
  readonly destination: DeploymentIntentDestinationIdentity;
  readonly destinationMutationKeyDigest: DeploymentIntentDigest;
  readonly epoch: DeploymentIntentPositiveInt64;
  readonly expectedGenerationId?: DeploymentIntentGenerationFence;
  readonly expiresAt: DeploymentIntentRfc3339;
  readonly mode: 'normal' | 'pages-reconciliation-recovery';
  readonly operationId: DeploymentIntentStableId;
  readonly pagesRecovery?: DeploymentIntentPagesReconciliationRecovery;
  readonly profile: 'gala-destination-mutation-authority-v2';
  readonly proposedGenerationId: DeploymentIntentStableId;
}> &
  unknown;

export type DeploymentIntentDestinationProviderCoordinates = Readonly<{
  readonly owner?: string;
  readonly region?: DeploymentIntentSpacesRegion;
  readonly repository?: string;
  readonly servedBucket?: DeploymentIntentSpacesBucket;
  readonly stagingBucket?: DeploymentIntentSpacesBucket;
}>;

export type DeploymentIntentDigest = string;

export type DeploymentIntentExpectedRedirectHop = Readonly<{
  readonly expectedLocation: DeploymentIntentVerificationUrl;
  readonly expectedStatus: 301 | 302 | 303 | 307 | 308;
  readonly hopNumber: number;
  readonly requestUrl: DeploymentIntentVerificationUrl;
}>;

export type DeploymentIntentExtensionKey = string;

export type DeploymentIntentGenerationFence = string;

export type DeploymentIntentGitObjectId = string;

export type DeploymentIntentGithubActionsArtifactId =
  DeploymentIntentGithubPositiveDecimal;

export type DeploymentIntentGithubPositiveDecimal = string;

export type DeploymentIntentGlob = string;

export type DeploymentIntentInt64 = string;

export type DeploymentIntentIsoCountry = string;

export type DeploymentIntentLowerHex40 = string;

export type DeploymentIntentNonNegativeInt64 = string;

export type DeploymentIntentNpmPackageName = string;

export type DeploymentIntentObservedRedirectLocation = string;

export type DeploymentIntentObservedVerificationHeader = Readonly<{
  readonly name: DeploymentIntentVerificationHeaderName;
  readonly state: 'present' | 'absent' | 'unsafe-omitted';
  readonly value?: DeploymentIntentVerificationHeaderValue;
}> &
  unknown;

export type DeploymentIntentPackageExact = string;

export type DeploymentIntentPackageIdentity = Readonly<{
  readonly integrity: DeploymentIntentDigest;
  readonly package: DeploymentIntentNpmPackageName;
  readonly registry: DeploymentIntentUrlHttps;
  readonly version: DeploymentIntentSemver;
}>;

export type DeploymentIntentPackageRange = string;

export type DeploymentIntentPagesInterveningRunAttempt = Readonly<{
  readonly authorityState: 'closed-no-destination-authority';
  readonly decisionDigest: DeploymentIntentDigest;
  readonly runAttempt: number;
}>;

export type DeploymentIntentPagesReconciliationCommand = Readonly<{
  readonly acceptedAt: DeploymentIntentRfc3339;
  readonly actorPrincipalId: DeploymentIntentStableId;
  readonly commandDigest: DeploymentIntentDigest;
  readonly consequentialConfirmationId: DeploymentIntentStableId;
  readonly expiresAt: DeploymentIntentRfc3339;
  readonly generationId: DeploymentIntentStableId;
  readonly operationId: DeploymentIntentStableId;
  readonly priorAttemptId: DeploymentIntentStableId;
  readonly priorAuthorityEpoch: DeploymentIntentPositiveInt64;
  readonly priorAuthorityId: DeploymentIntentStableId;
  readonly priorFenceEvidenceDigest: DeploymentIntentDigest;
  readonly priorIntentDigest: DeploymentIntentDigest;
  readonly priorRunAttempt: number;
  readonly profile: 'gala-pages-reconciliation-command-v2';
  readonly publicationId: DeploymentIntentStableId;
  readonly reconcileCommandId: DeploymentIntentStableId;
  readonly runId: DeploymentIntentGithubPositiveDecimal;
}>;

export type DeploymentIntentPagesReconciliationRecovery = Readonly<{
  readonly priorAttemptId: DeploymentIntentStableId;
  readonly priorAuthorityEpoch: DeploymentIntentPositiveInt64;
  readonly priorAuthorityId: DeploymentIntentStableId;
  readonly priorExpectedGenerationId?: DeploymentIntentStableId;
  readonly priorFenceEvidenceDigest: DeploymentIntentDigest;
  readonly priorIntentDigest: DeploymentIntentDigest;
  readonly priorPagesBuildVersion: DeploymentIntentLowerHex40;
  readonly priorProposedGenerationId: DeploymentIntentStableId;
  readonly profile: 'gala-pages-reconciliation-recovery-v2';
  readonly reconcileCommandDigest: DeploymentIntentDigest;
  readonly reconcileCommandExpiresAt: DeploymentIntentRfc3339;
  readonly reconcileCommandId: DeploymentIntentStableId;
  readonly recoveryDigest: DeploymentIntentDigest;
  readonly runAttemptGapProof: DeploymentIntentPagesRunAttemptGapProof;
}>;

export type DeploymentIntentPagesRunAttemptGapProof = Readonly<{
  readonly claimingRunAttempt: number;
  readonly interveningAttempts: ReadonlyArray<DeploymentIntentPagesInterveningRunAttempt>;
  readonly priorRunAttempt: number;
  readonly profile: 'gala-pages-run-attempt-gap-proof-v2';
  readonly proofDigest: DeploymentIntentDigest;
  readonly runId: DeploymentIntentGithubPositiveDecimal;
}>;

export type DeploymentIntentPassiveVisualToken = never;

export type DeploymentIntentPlainLabel = string;

export type DeploymentIntentPlainText = string;

export type DeploymentIntentPositiveInt64 = string;

export type DeploymentIntentProbeRegion = string;

export type DeploymentIntentPublicGenerationMarkerPayload = Readonly<{
  readonly artifactDigest: DeploymentIntentDigest;
  readonly artifactId: DeploymentIntentStableId;
  readonly generationId: DeploymentIntentStableId;
  readonly schemaId: 'urn:gala:schema:public-generation-marker:2.0.0';
  readonly schemaVersion: '2.0.0';
}>;

export type DeploymentIntentPublicProbeObservation = Readonly<{
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
  readonly contractGenerationId?: DeploymentIntentStableId;
  readonly evidenceDigest: DeploymentIntentDigest;
  readonly expectedCandidateDigest: DeploymentIntentDigest;
  readonly hopNumber: number;
  readonly observedAt: DeploymentIntentRfc3339;
  readonly observedByteLength?: DeploymentIntentNonNegativeInt64;
  readonly observedDigest?: DeploymentIntentDigest;
  readonly observedGenerationId?: DeploymentIntentStableId;
  readonly observedHeaders: ReadonlyArray<DeploymentIntentObservedVerificationHeader>;
  readonly observedLocation?: DeploymentIntentObservedRedirectLocation;
  readonly observedLocationState:
    'absent' | 'retained' | 'unsafe-omitted' | 'head-unavailable';
  readonly observedStatus?: number;
  readonly origin: DeploymentIntentVerificationOrigin;
  readonly precedingProbeEvidenceDigest?: DeploymentIntentDigest;
  readonly probeRegion: DeploymentIntentProbeRegion;
  readonly requestStartedAt: DeploymentIntentRfc3339;
  readonly requestUrl: DeploymentIntentVerificationUrl;
  readonly responseHeadState:
    'not-received' | 'complete' | 'limit-exceeded' | 'malformed';
  readonly route: DeploymentIntentCanonicalRoute;
  readonly targetId: number;
}> &
  unknown;

export type DeploymentIntentRecognizedPriorRouteContract = Readonly<{
  readonly expectedByteLength: DeploymentIntentNonNegativeInt64;
  readonly expectedDigest: DeploymentIntentDigest;
  readonly expectedHeaders: ReadonlyArray<DeploymentIntentVerificationHeaderExpectation>;
  readonly expectedTerminalStatus: 200 | 404;
  readonly generationId: DeploymentIntentStableId;
  readonly redirectChain: ReadonlyArray<DeploymentIntentExpectedRedirectHop>;
  readonly terminalRequestUrl: DeploymentIntentVerificationUrl;
}>;

export type DeploymentIntentRecordRenderPolicyIdentity = Readonly<{
  readonly digest: DeploymentIntentDigest;
  readonly name: DeploymentIntentPlainLabel;
  readonly version: DeploymentIntentSemver;
}>;

export type DeploymentIntentRecordReproducibleBuildRecord = Readonly<{
  readonly basePath: DeploymentIntentCanonicalRoute;
  readonly baseUrl: DeploymentIntentUrlHttps;
  readonly buildEpoch: DeploymentIntentRfc3339;
  readonly buildInputDigest: DeploymentIntentDigest;
  readonly buildPolicyDecisionDigest: DeploymentIntentDigest;
  readonly builder: DeploymentIntentPackageIdentity &
    Readonly<{
      readonly package?: '@rathnasgala2/publish-action';
    }>;
  readonly contractVersion: '2.0.0';
  readonly dependencyLockDigest: DeploymentIntentDigest;
  readonly destinationCapabilityDigest: DeploymentIntentDigest;
  readonly packageReleaseCatalogDigest: DeploymentIntentDigest;
  readonly policyReleaseId: DeploymentIntentStableId;
  readonly renderPolicy: DeploymentIntentRecordRenderPolicyIdentity;
  readonly repositoryId: DeploymentIntentGithubPositiveDecimal;
  readonly repositoryRootDigest: DeploymentIntentDigest;
  readonly schemas: DeploymentIntentPackageIdentity &
    Readonly<{
      readonly package?: '@rathnasgala2/schemas';
    }>;
  readonly sourceCommit: DeploymentIntentGitObjectId;
  readonly sourceTree: DeploymentIntentGitObjectId;
  readonly stylingContractDigest: DeploymentIntentDigest;
  readonly template: DeploymentIntentPackageIdentity &
    Readonly<{
      readonly package?: '@rathnasgala2/template';
    }>;
  readonly theme: DeploymentIntentPackageIdentity &
    Readonly<{
      readonly package?:
        | '@rathnasgala2/theme-default'
        | '@rathnasgala2/theme-amaze'
        | '@rathnasgala2/theme-flashy'
        | '@rathnasgala2/theme-minimal'
        | '@rathnasgala2/theme-zebra';
    }>;
  readonly workflowIdentity: DeploymentIntentDigest;
}>;

export type DeploymentIntentRepoRelativePath = string;

export type DeploymentIntentRfc3339 = string;

export type DeploymentIntentSemver = string;

export type DeploymentIntentSemverRange = string;

export type DeploymentIntentSlug = string;

export type DeploymentIntentSpacesBucket = string;

export type DeploymentIntentSpacesRegion = string;

export type DeploymentIntentStableId = string;

export type DeploymentIntentSupersessionFinalizationEvidence = (
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
    readonly activationDetectionLastEvidenceDigest?: DeploymentIntentDigest;
    readonly activationDetectionObservationCount: number;
    readonly authorityEpoch: DeploymentIntentPositiveInt64;
    readonly destinationKeyDigest: DeploymentIntentDigest;
    readonly fenceEvidenceDigest: DeploymentIntentDigest;
    readonly fenceTerminalState: 'terminal-no-change' | 'terminal-candidate';
    readonly finalizationOutcome: 'before-mutation' | 'activated';
    readonly finalizedAt: DeploymentIntentRfc3339;
    readonly precedingEvidenceJournalEntryCount: number;
    readonly precedingEvidenceJournalHeadDigest: DeploymentIntentDigest;
    readonly profile: 'gala-supersession-finalization-evidence-v2';
    readonly supersededAttemptId: DeploymentIntentStableId;
    readonly supersededByGenerationId: DeploymentIntentStableId;
    readonly supersededByOperationId: DeploymentIntentStableId;
    readonly supersededIntentDigest: DeploymentIntentDigest;
    readonly supersededOperationId: DeploymentIntentStableId;
  }> &
  unknown;

export type DeploymentIntentUrlHttps = string;

export type DeploymentIntentUrn = string;

export type DeploymentIntentVerificationHeaderExpectation = Readonly<{
  readonly name: DeploymentIntentVerificationHeaderName;
  readonly value: DeploymentIntentVerificationHeaderValue;
}>;

export type DeploymentIntentVerificationHeaderName = string;

export type DeploymentIntentVerificationHeaderValue = string;

export type DeploymentIntentVerificationOrigin = string;

export type DeploymentIntentVerificationPlanTarget = Readonly<{
  readonly expectedByteLength: DeploymentIntentNonNegativeInt64;
  readonly expectedCandidateDigest: DeploymentIntentDigest;
  readonly expectedHeaders: ReadonlyArray<DeploymentIntentVerificationHeaderExpectation>;
  readonly expectedTerminalStatus: 200 | 404;
  readonly maximumAttempts: number;
  readonly maximumConcurrentStreams: number;
  readonly maximumResponseBytes: DeploymentIntentNonNegativeInt64;
  readonly maximumResponseWireBytes: DeploymentIntentPositiveInt64;
  readonly origin: DeploymentIntentVerificationOrigin;
  readonly recognizedPriorContracts: ReadonlyArray<DeploymentIntentRecognizedPriorRouteContract>;
  readonly redirectChain: ReadonlyArray<DeploymentIntentExpectedRedirectHop>;
  readonly requestProfile: 'gala-public-verifier-v2';
  readonly requestTimeoutSeconds: number;
  readonly requiredProbeRegions: ReadonlyArray<DeploymentIntentProbeRegion>;
  readonly retryProfile: 'gala-public-probe-retry-v2';
  readonly route: DeploymentIntentCanonicalRoute;
  readonly targetId: number;
  readonly terminalRequestUrl: DeploymentIntentVerificationUrl;
}>;

export type DeploymentIntentVerificationUrl = string;

export type DeploymentIntentDocument = Readonly<{
  readonly activationDetectionIntervalSeconds: 60;
  readonly activationDetectionPlanDigest: DeploymentIntentDigest;
  readonly activationDetectionProfile: 'gala-public-activation-detection-v2';
  readonly adapter: DeploymentIntentAdapterIdentity;
  readonly approvedOverrides: [];
  readonly artifactByteCount: DeploymentIntentPositiveInt64;
  readonly artifactDigest: DeploymentIntentDigest;
  readonly artifactFileCount: DeploymentIntentPositiveInt64;
  readonly artifactId: DeploymentIntentStableId;
  readonly attemptId: DeploymentIntentStableId;
  readonly audience: 'urn:gala:deployment-kernel:v2';
  readonly authorizedAt: DeploymentIntentRfc3339;
  readonly capability: 'deploy';
  readonly capabilityDecisionDigest: DeploymentIntentDigest;
  readonly destination: DeploymentIntentDestinationIdentity;
  readonly destinationMutationAuthority: DeploymentIntentDestinationMutationAuthority;
  readonly effectiveArtifactExpiresAt: DeploymentIntentRfc3339;
  readonly expectedGenerationId?: DeploymentIntentGenerationFence;
  readonly expiresAt: DeploymentIntentRfc3339;
  readonly finalizationDeadlineLimit: DeploymentIntentRfc3339;
  readonly frozenEnvelopeByteCount: DeploymentIntentPositiveInt64;
  readonly frozenEnvelopeDigest: DeploymentIntentDigest;
  readonly frozenHandoffArtifactId: DeploymentIntentGithubActionsArtifactId;
  readonly frozenHandoffName: DeploymentIntentPlainLabel;
  readonly idempotencyKey: DeploymentIntentStableId;
  readonly intentDigest: DeploymentIntentDigest;
  readonly issuer: DeploymentIntentUrlHttps;
  readonly lockDigest: DeploymentIntentDigest;
  readonly manifestDigest: DeploymentIntentDigest;
  readonly marker: DeploymentIntentPublicGenerationMarkerPayload;
  readonly maximumActivationDetectionAttempts: 91;
  readonly maximumFinalizationDelaySeconds: 300;
  readonly maximumPublicVerificationSeconds: number;
  readonly maximumReportRequestByteCount: DeploymentIntentPositiveInt64;
  readonly networkBoundaryProfileDigest: DeploymentIntentDigest;
  readonly operationDeadline: DeploymentIntentRfc3339;
  readonly operationId: DeploymentIntentStableId;
  readonly pagesBuildVersion?: DeploymentIntentLowerHex40;
  readonly policyDecisionDigest: DeploymentIntentDigest;
  readonly policyProfile: DeploymentIntentPlainLabel;
  readonly policyReleaseId: DeploymentIntentStableId;
  readonly policyVersion: DeploymentIntentSemver;
  readonly proposedGenerationId: DeploymentIntentStableId;
  readonly provenanceDigest: DeploymentIntentDigest;
  readonly publicTlsProfileDigest: DeploymentIntentDigest;
  readonly publicTlsRevocationSetDigest: DeploymentIntentDigest;
  readonly publicTlsTrustStoreDigest: DeploymentIntentDigest;
  readonly publisher: DeploymentIntentPackageIdentity &
    Readonly<{
      readonly package: '@rathnasgala2/publish-action';
    }>;
  readonly rebuildRecord: DeploymentIntentRecordReproducibleBuildRecord;
  readonly requestedArtifactRetentionDays: number;
  readonly sbomDigest: DeploymentIntentDigest;
  readonly schemaId: 'urn:gala:schema:deployment-intent:2.0.0';
  readonly schemaVersion: '2.0.0';
  readonly sourceCommit: DeploymentIntentGitObjectId;
  readonly spacesStagePrefix?: string;
  readonly subject: DeploymentIntentUrn;
  readonly verificationDeadlineLimit: DeploymentIntentRfc3339;
  readonly verificationOrigins: ReadonlyArray<DeploymentIntentVerificationOrigin>;
  readonly verificationPlanDigest: DeploymentIntentDigest;
  readonly verificationTier:
    | 'provider-complete-digest'
    | 'full-public-fetch'
    | 'deterministic-sample'
    | 'critical-only';
  readonly workflowTriggerCommit: DeploymentIntentGitObjectId;
  readonly workloadBindingDigest: DeploymentIntentDigest;
}> &
  unknown;

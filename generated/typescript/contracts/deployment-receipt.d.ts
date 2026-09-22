// Generated from urn:gala:schema:deployment-receipt:2.0.0; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
// Do not edit.

export type DeploymentReceiptActivationBasis = Readonly<{
  readonly evidenceDigest: DeploymentReceiptDigest;
  readonly observedAt: DeploymentReceiptRfc3339;
  readonly source:
    'kernel-provider-observation' | 'gala-public-marker-detection';
}>;

export type DeploymentReceiptActivationDetectionObservation = Readonly<{
  readonly attemptId: DeploymentReceiptStableId;
  readonly detectionAttemptNumber: number;
  readonly eligibleAt: DeploymentReceiptRfc3339;
  readonly evidenceDigest: DeploymentReceiptDigest;
  readonly operationId: DeploymentReceiptStableId;
  readonly planDigest: DeploymentReceiptDigest;
  readonly probes: ReadonlyArray<DeploymentReceiptActivationDetectionProbe>;
  readonly profile: 'gala-public-activation-detection-observation-v2';
  readonly receivedAt: DeploymentReceiptRfc3339;
}>;

export type DeploymentReceiptActivationDetectionPlan = Readonly<{
  readonly artifactId: DeploymentReceiptStableId;
  readonly attemptId: DeploymentReceiptStableId;
  readonly firstEligibleAt: DeploymentReceiptRfc3339;
  readonly intervalSeconds: 60;
  readonly lastEligibleAt: DeploymentReceiptRfc3339;
  readonly maximumAttempts: 91;
  readonly maximumRedirectHops: number;
  readonly operationId: DeploymentReceiptStableId;
  readonly planDigest: DeploymentReceiptDigest;
  readonly probeRegion: DeploymentReceiptProbeRegion;
  readonly profile: 'gala-public-activation-detection-v2';
  readonly proposedGenerationId: DeploymentReceiptStableId;
  readonly requestTimeoutSeconds: number;
  readonly reservedProbeSlots: DeploymentReceiptPositiveInt64 & string;
  readonly target: DeploymentReceiptVerificationPlanTarget;
}>;

export type DeploymentReceiptActivationDetectionProbe = Readonly<{
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
  readonly contractGenerationId?: DeploymentReceiptStableId;
  readonly evidenceDigest: DeploymentReceiptDigest;
  readonly expectedCandidateDigest: DeploymentReceiptDigest;
  readonly hopNumber: number;
  readonly observedAt: DeploymentReceiptRfc3339;
  readonly observedByteLength?: DeploymentReceiptNonNegativeInt64;
  readonly observedDigest?: DeploymentReceiptDigest;
  readonly observedGenerationId?: DeploymentReceiptStableId;
  readonly observedHeaders: ReadonlyArray<DeploymentReceiptObservedVerificationHeader>;
  readonly observedLocation?: DeploymentReceiptObservedRedirectLocation;
  readonly observedLocationState:
    'absent' | 'retained' | 'unsafe-omitted' | 'head-unavailable';
  readonly observedStatus?: number;
  readonly origin: DeploymentReceiptVerificationOrigin;
  readonly precedingDetectionProbeEvidenceDigest?: DeploymentReceiptDigest;
  readonly probeRegion: DeploymentReceiptProbeRegion;
  readonly requestStartedAt: DeploymentReceiptRfc3339;
  readonly requestUrl: DeploymentReceiptVerificationUrl;
  readonly responseHeadState:
    'not-received' | 'complete' | 'limit-exceeded' | 'malformed';
  readonly route: DeploymentReceiptCanonicalRoute;
  readonly targetId: number;
}> &
  unknown;

export type DeploymentReceiptAdapterIdentity = Readonly<{
  readonly adapterDigest: DeploymentReceiptDigest;
  readonly adapterId: DeploymentReceiptPlainLabel;
  readonly adapterVersion: DeploymentReceiptSemver;
}>;

export type DeploymentReceiptBcp47 = string;

export type DeploymentReceiptCancellationFinalizationEvidence = Readonly<{
  readonly activationDetectionLastEvidenceDigest?: DeploymentReceiptDigest;
  readonly activationDetectionObservationCount: number;
  readonly attemptId: DeploymentReceiptStableId;
  readonly authorityEpoch: DeploymentReceiptPositiveInt64;
  readonly cancellationActorId: DeploymentReceiptStableId;
  readonly cancellationCommandId: DeploymentReceiptStableId;
  readonly destinationKeyDigest: DeploymentReceiptDigest;
  readonly fenceEvidenceDigest: DeploymentReceiptDigest;
  readonly finalizedAt: DeploymentReceiptRfc3339;
  readonly intentDigest: DeploymentReceiptDigest;
  readonly operationId: DeploymentReceiptStableId;
  readonly precedingEvidenceJournalEntryCount: number;
  readonly precedingEvidenceJournalHeadDigest: DeploymentReceiptDigest;
  readonly profile: 'gala-cancellation-finalization-evidence-v2';
}> &
  unknown;

export type DeploymentReceiptCanonicalRoute = string;

export type DeploymentReceiptDeadlineFinalizationEvidence = Readonly<{
  readonly attemptId: DeploymentReceiptStableId;
  readonly cutoffEvidenceJournalEntryCount: number;
  readonly cutoffEvidenceJournalHeadDigest: DeploymentReceiptDigest;
  readonly finalizationDeadlineAt: DeploymentReceiptRfc3339;
  readonly finalizationKind:
    'propagation-degraded' | 'verification-inconclusive';
  readonly finalizedAt: DeploymentReceiptRfc3339;
  readonly intentDigest: DeploymentReceiptDigest;
  readonly operationId: DeploymentReceiptStableId;
  readonly profile: 'gala-deadline-finalization-evidence-v2';
  readonly selectedStreams: ReadonlyArray<DeploymentReceiptDeadlineFinalizationStream>;
  readonly verificationDeadlineAt: DeploymentReceiptRfc3339;
  readonly verificationPlanDigest: DeploymentReceiptDigest;
}> &
  unknown;

export type DeploymentReceiptDeadlineFinalizationStream = Readonly<{
  readonly evidenceDigest?: DeploymentReceiptDigest;
  readonly observationId?: DeploymentReceiptStableId;
  readonly probeRegion: DeploymentReceiptProbeRegion;
  readonly state: 'terminal' | 'missing';
  readonly targetId: number;
}> &
  unknown;

export type DeploymentReceiptDeploymentAttempt = (
  | (Readonly<{
      readonly destinationChanged: 'no' | 'yes';
      readonly failureCode: 'AUTHORIZATION_LOST';
      readonly outcome: 'failed';
      readonly retryable: false;
      readonly stage: 'cleanup';
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged: 'no' | 'yes';
      readonly failureCode: 'NOT_ATTEMPTED_RETRYABLE';
      readonly outcome: 'failed';
      readonly retryable: true;
      readonly stage: 'cleanup';
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged: 'no' | 'yes';
      readonly failureCode: 'PROVIDER_CONTRACT_VIOLATION';
      readonly outcome: 'failed';
      readonly retryable: false;
      readonly stage: 'cleanup';
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged: 'no' | 'yes';
      readonly failureCode: 'RATE_LIMITED';
      readonly outcome: 'failed';
      readonly retryable: true;
      readonly stage: 'cleanup';
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged: 'no' | 'yes';
      readonly failureCode: 'REJECTED';
      readonly outcome: 'failed';
      readonly retryable: false;
      readonly stage: 'cleanup';
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged: 'no';
      readonly failureCode: 'ATOMIC_ACTIVATION_UNSUPPORTED';
      readonly outcome: 'failed';
      readonly retryable: false;
      readonly stage: 'staging';
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged: 'no';
      readonly failureCode: 'AUTHORIZATION_LOST';
      readonly outcome: 'failed';
      readonly retryable: false;
      readonly stage: 'activation';
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged: 'no';
      readonly failureCode: 'AUTHORIZATION_LOST';
      readonly outcome: 'failed';
      readonly retryable: false;
      readonly stage: 'staging';
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged: 'no';
      readonly failureCode: 'NOT_ATTEMPTED_RETRYABLE';
      readonly outcome: 'failed';
      readonly retryable: true;
      readonly stage: 'activation';
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged: 'no';
      readonly failureCode: 'NOT_ATTEMPTED_RETRYABLE';
      readonly outcome: 'failed';
      readonly retryable: true;
      readonly stage: 'staging';
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged: 'no';
      readonly failureCode: 'PROVIDER_CONTRACT_VIOLATION';
      readonly outcome: 'failed';
      readonly retryable: false;
      readonly stage: 'activation';
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged: 'no';
      readonly failureCode: 'PROVIDER_CONTRACT_VIOLATION';
      readonly outcome: 'failed';
      readonly retryable: false;
      readonly stage: 'staging';
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged: 'no';
      readonly failureCode: 'RATE_LIMITED';
      readonly outcome: 'failed';
      readonly retryable: true;
      readonly stage: 'activation';
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged: 'no';
      readonly failureCode: 'RATE_LIMITED';
      readonly outcome: 'failed';
      readonly retryable: true;
      readonly stage: 'staging';
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged: 'no';
      readonly failureCode: 'REJECTED';
      readonly outcome: 'failed';
      readonly retryable: false;
      readonly stage: 'activation';
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged: 'no';
      readonly failureCode: 'REJECTED';
      readonly outcome: 'failed';
      readonly retryable: false;
      readonly stage: 'managed-reconciliation';
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged: 'no';
      readonly failureCode: 'REJECTED';
      readonly outcome: 'failed';
      readonly retryable: false;
      readonly stage: 'staging';
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged: 'no';
      readonly failureCode: 'TARGET_CAPABILITY_UNAVAILABLE';
      readonly outcome: 'failed';
      readonly retryable: false;
      readonly stage: 'staging';
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged: 'unknown' | 'yes';
      readonly failureCode: 'AUTHORIZATION_LOST';
      readonly outcome: 'unknown';
      readonly retryable: false;
      readonly stage: 'managed-reconciliation';
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged: 'unknown' | 'yes';
      readonly failureCode: 'NOT_ATTEMPTED_RETRYABLE';
      readonly outcome: 'unknown';
      readonly retryable: true;
      readonly stage: 'managed-reconciliation';
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged: 'unknown' | 'yes';
      readonly failureCode: 'OUTCOME_UNKNOWN_RECONCILING';
      readonly outcome: 'unknown';
      readonly retryable: false;
      readonly stage: 'activation';
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged: 'unknown' | 'yes';
      readonly failureCode: 'OUTCOME_UNKNOWN_RECONCILING';
      readonly outcome: 'unknown';
      readonly retryable: false;
      readonly stage: 'cleanup';
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged: 'unknown' | 'yes';
      readonly failureCode: 'OUTCOME_UNKNOWN_RECONCILING';
      readonly outcome: 'unknown';
      readonly retryable: false;
      readonly stage: 'managed-reconciliation';
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged: 'unknown' | 'yes';
      readonly failureCode: 'OUTCOME_UNKNOWN_RECONCILING';
      readonly outcome: 'unknown';
      readonly retryable: false;
      readonly stage: 'staging';
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged: 'unknown' | 'yes';
      readonly failureCode: 'PROVIDER_CONTRACT_VIOLATION';
      readonly outcome: 'failed';
      readonly retryable: false;
      readonly stage: 'managed-reconciliation';
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged: 'unknown' | 'yes';
      readonly failureCode: 'PUBLIC_INTEGRITY_MISMATCH';
      readonly outcome: 'failed';
      readonly retryable: false;
      readonly stage: 'public-verification';
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged: 'unknown' | 'yes';
      readonly failureCode: 'PUBLIC_VERIFICATION_INCONCLUSIVE';
      readonly outcome: 'unknown';
      readonly retryable: false;
      readonly stage: 'public-verification';
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged: 'unknown' | 'yes';
      readonly failureCode: 'RATE_LIMITED';
      readonly outcome: 'unknown';
      readonly retryable: true;
      readonly stage: 'managed-reconciliation';
    }> &
      unknown)
  | Readonly<{
      readonly destinationChanged?: 'no' | 'yes';
      readonly outcome?: 'succeeded';
      readonly retryable?: false;
    }>
  | Readonly<{
      readonly destinationChanged?: 'no';
      readonly outcome?: 'not-started';
      readonly retryable?: false;
    }>
  | Readonly<{
      readonly destinationChanged?: 'no';
      readonly outcome?: 'skipped';
      readonly retryable?: false;
    }>
  | Readonly<{
      readonly destinationChanged?: 'yes' | 'no' | 'unknown';
      readonly outcome?: 'running';
      readonly retryable?: false;
    }>
) &
  Readonly<{
    readonly attemptId: DeploymentReceiptStableId;
    readonly causationId: DeploymentReceiptStableId;
    readonly completedAt?: DeploymentReceiptRfc3339;
    readonly destinationChanged: 'yes' | 'no' | 'unknown';
    readonly evidenceDigest: DeploymentReceiptDigest;
    readonly failureCode?: DeploymentReceiptManagedFailureCode;
    readonly inputDigest: DeploymentReceiptDigest;
    readonly outcome:
      | 'not-started'
      | 'running'
      | 'succeeded'
      | 'failed'
      | 'skipped'
      | 'unknown';
    readonly resultDigest?: DeploymentReceiptDigest;
    readonly retryable: boolean;
    readonly sequence: number;
    readonly stage:
      | 'staging'
      | 'activation'
      | 'public-verification'
      | 'managed-reconciliation'
      | 'cleanup';
    readonly stageAttemptId: DeploymentReceiptStableId;
    readonly startedAt?: DeploymentReceiptRfc3339;
  }>;

export type DeploymentReceiptDeploymentFailure = (
  | Readonly<{
      readonly code: 'ATOMIC_ACTIVATION_UNSUPPORTED';
      readonly destinationChanged: 'no';
      readonly recovery: 'manual-intervention';
      readonly retryable: false;
      readonly stage: 'staging';
    }>
  | Readonly<{
      readonly code: 'AUTHORIZATION_LOST';
      readonly destinationChanged: 'no' | 'yes';
      readonly recovery: 'reauthorize';
      readonly retryable: false;
      readonly stage: 'cleanup';
    }>
  | Readonly<{
      readonly code: 'AUTHORIZATION_LOST';
      readonly destinationChanged: 'no';
      readonly recovery: 'reauthorize';
      readonly retryable: false;
      readonly stage: 'activation';
    }>
  | Readonly<{
      readonly code: 'AUTHORIZATION_LOST';
      readonly destinationChanged: 'no';
      readonly recovery: 'reauthorize';
      readonly retryable: false;
      readonly stage: 'staging';
    }>
  | Readonly<{
      readonly code: 'AUTHORIZATION_LOST';
      readonly destinationChanged: 'unknown' | 'yes';
      readonly recovery: 'reauthorize';
      readonly retryable: false;
      readonly stage: 'managed-reconciliation';
    }>
  | Readonly<{
      readonly code: 'NOT_ATTEMPTED_RETRYABLE';
      readonly destinationChanged: 'no' | 'yes';
      readonly recovery: 'retry';
      readonly retryable: true;
      readonly stage: 'cleanup';
    }>
  | Readonly<{
      readonly code: 'NOT_ATTEMPTED_RETRYABLE';
      readonly destinationChanged: 'no';
      readonly recovery: 'retry';
      readonly retryable: true;
      readonly stage: 'activation';
    }>
  | Readonly<{
      readonly code: 'NOT_ATTEMPTED_RETRYABLE';
      readonly destinationChanged: 'no';
      readonly recovery: 'retry';
      readonly retryable: true;
      readonly stage: 'staging';
    }>
  | Readonly<{
      readonly code: 'NOT_ATTEMPTED_RETRYABLE';
      readonly destinationChanged: 'unknown' | 'yes';
      readonly recovery: 'retry';
      readonly retryable: true;
      readonly stage: 'managed-reconciliation';
    }>
  | Readonly<{
      readonly code: 'OUTCOME_UNKNOWN_RECONCILING';
      readonly destinationChanged: 'unknown' | 'yes';
      readonly recovery: 'observe';
      readonly retryable: false;
      readonly stage: 'activation';
    }>
  | Readonly<{
      readonly code: 'OUTCOME_UNKNOWN_RECONCILING';
      readonly destinationChanged: 'unknown' | 'yes';
      readonly recovery: 'observe';
      readonly retryable: false;
      readonly stage: 'cleanup';
    }>
  | Readonly<{
      readonly code: 'OUTCOME_UNKNOWN_RECONCILING';
      readonly destinationChanged: 'unknown' | 'yes';
      readonly recovery: 'observe';
      readonly retryable: false;
      readonly stage: 'managed-reconciliation';
    }>
  | Readonly<{
      readonly code: 'OUTCOME_UNKNOWN_RECONCILING';
      readonly destinationChanged: 'unknown' | 'yes';
      readonly recovery: 'observe';
      readonly retryable: false;
      readonly stage: 'staging';
    }>
  | Readonly<{
      readonly code: 'PROVIDER_CONTRACT_VIOLATION';
      readonly destinationChanged: 'no' | 'yes';
      readonly recovery: 'manual-intervention';
      readonly retryable: false;
      readonly stage: 'cleanup';
    }>
  | Readonly<{
      readonly code: 'PROVIDER_CONTRACT_VIOLATION';
      readonly destinationChanged: 'no';
      readonly recovery: 'manual-intervention';
      readonly retryable: false;
      readonly stage: 'activation';
    }>
  | Readonly<{
      readonly code: 'PROVIDER_CONTRACT_VIOLATION';
      readonly destinationChanged: 'no';
      readonly recovery: 'manual-intervention';
      readonly retryable: false;
      readonly stage: 'staging';
    }>
  | Readonly<{
      readonly code: 'PROVIDER_CONTRACT_VIOLATION';
      readonly destinationChanged: 'unknown' | 'yes';
      readonly recovery: 'reconcile';
      readonly retryable: false;
      readonly stage: 'managed-reconciliation';
    }>
  | Readonly<{
      readonly code: 'PUBLIC_INTEGRITY_MISMATCH';
      readonly destinationChanged: 'unknown' | 'yes';
      readonly recovery: 'reconcile';
      readonly retryable: false;
      readonly stage: 'public-verification';
    }>
  | Readonly<{
      readonly code: 'PUBLIC_VERIFICATION_INCONCLUSIVE';
      readonly destinationChanged: 'unknown' | 'yes';
      readonly recovery: 'observe';
      readonly retryable: false;
      readonly stage: 'public-verification';
    }>
  | Readonly<{
      readonly code: 'RATE_LIMITED';
      readonly destinationChanged: 'no' | 'yes';
      readonly recovery: 'retry';
      readonly retryable: true;
      readonly stage: 'cleanup';
    }>
  | Readonly<{
      readonly code: 'RATE_LIMITED';
      readonly destinationChanged: 'no';
      readonly recovery: 'retry';
      readonly retryable: true;
      readonly stage: 'activation';
    }>
  | Readonly<{
      readonly code: 'RATE_LIMITED';
      readonly destinationChanged: 'no';
      readonly recovery: 'retry';
      readonly retryable: true;
      readonly stage: 'staging';
    }>
  | Readonly<{
      readonly code: 'RATE_LIMITED';
      readonly destinationChanged: 'unknown' | 'yes';
      readonly recovery: 'retry';
      readonly retryable: true;
      readonly stage: 'managed-reconciliation';
    }>
  | Readonly<{
      readonly code: 'REJECTED';
      readonly destinationChanged: 'no' | 'yes';
      readonly recovery: 'none';
      readonly retryable: false;
      readonly stage: 'cleanup';
    }>
  | Readonly<{
      readonly code: 'REJECTED';
      readonly destinationChanged: 'no';
      readonly recovery: 'none';
      readonly retryable: false;
      readonly stage: 'activation';
    }>
  | Readonly<{
      readonly code: 'REJECTED';
      readonly destinationChanged: 'no';
      readonly recovery: 'none';
      readonly retryable: false;
      readonly stage: 'managed-reconciliation';
    }>
  | Readonly<{
      readonly code: 'REJECTED';
      readonly destinationChanged: 'no';
      readonly recovery: 'none';
      readonly retryable: false;
      readonly stage: 'staging';
    }>
  | Readonly<{
      readonly code: 'TARGET_CAPABILITY_UNAVAILABLE';
      readonly destinationChanged: 'no';
      readonly recovery: 'none';
      readonly retryable: false;
      readonly stage: 'staging';
    }>
) &
  Readonly<{
    readonly code: DeploymentReceiptManagedFailureCode;
    readonly destinationChanged: 'yes' | 'no' | 'unknown';
    readonly recovery:
      | 'retry'
      | 'observe'
      | 'reconcile'
      | 'reauthorize'
      | 'manual-intervention'
      | 'none';
    readonly retryable: boolean;
    readonly stage:
      | 'staging'
      | 'activation'
      | 'public-verification'
      | 'managed-reconciliation'
      | 'cleanup';
  }>;

export type DeploymentReceiptDeploymentObservation = (
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
    readonly adapter: DeploymentReceiptAdapterIdentity;
    readonly artifactDigest: DeploymentReceiptDigest;
    readonly artifactId: DeploymentReceiptStableId;
    readonly attemptId: DeploymentReceiptStableId;
    readonly destination: DeploymentReceiptDestinationIdentity;
    readonly destinationChanged: 'yes' | 'no' | 'unknown';
    readonly evidenceDigest: DeploymentReceiptDigest;
    readonly generationId?: DeploymentReceiptStableId;
    readonly intentDigest: DeploymentReceiptDigest;
    readonly observationClass:
      | 'request-not-started'
      | 'request-accepted'
      | 'provider-state'
      | 'public-state'
      | 'deadline-finalization'
      | 'supersession-finalization'
      | 'timeout'
      | 'provider-error';
    readonly observationId: DeploymentReceiptStableId;
    readonly observedArtifactDigest?: DeploymentReceiptDigest;
    readonly observedAt: DeploymentReceiptRfc3339;
    readonly operationId: DeploymentReceiptStableId;
    readonly outcome:
      | 'succeeded'
      | 'rejected'
      | 'not-attempted-retryable'
      | 'outcome-unknown-reconciling'
      | 'authorization-lost'
      | 'rate-limited'
      | 'provider-contract-violation';
    readonly probes: ReadonlyArray<DeploymentReceiptPublicProbeObservation>;
    readonly providerObjectIdDigest?: DeploymentReceiptDigest;
    readonly providerVersion?: DeploymentReceiptPlainLabel;
    readonly receivedAt: DeploymentReceiptRfc3339;
    readonly sequence: number;
    readonly stageAttemptId: DeploymentReceiptStableId;
  }> &
  unknown;

export type DeploymentReceiptDeploymentPolicyDecision = Readonly<{
  readonly activationDetectionIntervalSeconds: 60;
  readonly activationDetectionProfile: 'gala-public-activation-detection-v2';
  readonly approvedOverrides: [];
  readonly artifactDigest: DeploymentReceiptDigest;
  readonly artifactId: DeploymentReceiptStableId;
  readonly buildPolicyDecisionDigest: DeploymentReceiptDigest;
  readonly capabilityDecisionDigest: DeploymentReceiptDigest;
  readonly decisionDigest: DeploymentReceiptDigest;
  readonly destination: DeploymentReceiptDestinationIdentity;
  readonly manifestDigest: DeploymentReceiptDigest;
  readonly maximumActivationDetectionAttempts: 91;
  readonly maximumAttemptsPerTarget: number;
  readonly maximumConcurrentStreams: number;
  readonly maximumFinalizationDelaySeconds: 300;
  readonly maximumPublicResponseBytes: DeploymentReceiptPositiveInt64;
  readonly maximumPublicVerificationSeconds: number;
  readonly maximumRedirectHops: number;
  readonly networkBoundaryProfileDigest: DeploymentReceiptDigest;
  readonly policyProfile: DeploymentReceiptPlainLabel;
  readonly policyReleaseId: DeploymentReceiptStableId;
  readonly policyVersion: DeploymentReceiptSemver;
  readonly profile: 'gala-deployment-policy-decision-v2';
  readonly publicTlsProfileDigest: DeploymentReceiptDigest;
  readonly publicTlsRevocationSetDigest: DeploymentReceiptDigest;
  readonly publicTlsTrustStoreDigest: DeploymentReceiptDigest;
  readonly requestTimeoutSeconds: number;
  readonly retryProfile: 'gala-public-probe-retry-v2';
  readonly verificationOrigins: ReadonlyArray<DeploymentReceiptVerificationOrigin>;
  readonly verificationPlanDigest: DeploymentReceiptDigest;
  readonly verificationTier:
    | 'provider-complete-digest'
    | 'full-public-fetch'
    | 'deterministic-sample'
    | 'critical-only';
}>;

export type DeploymentReceiptDeploymentStageEvidence = Readonly<{
  readonly completedAt?: DeploymentReceiptRfc3339;
  readonly destinationChanged: 'yes' | 'no' | 'unknown';
  readonly evidenceDigest: DeploymentReceiptDigest;
  readonly failureCode?: DeploymentReceiptManagedFailureCode;
  readonly inputDigest: DeploymentReceiptDigest;
  readonly observationEvidence: ReadonlyArray<DeploymentReceiptDeploymentStageObservationEvidenceReference>;
  readonly outcome:
    'not-started' | 'running' | 'succeeded' | 'failed' | 'skipped' | 'unknown';
  readonly profile: 'gala-deployment-stage-evidence-v2';
  readonly resultDigest?: DeploymentReceiptDigest;
  readonly retryable: boolean;
  readonly stageInput: DeploymentReceiptDeploymentStageInput;
  readonly stageResult?: DeploymentReceiptDeploymentStageResult;
  readonly startedAt?: DeploymentReceiptRfc3339;
}> &
  unknown;

export type DeploymentReceiptDeploymentStageInput = Readonly<{
  readonly causationId: DeploymentReceiptStableId;
  readonly destinationMutationAuthority: DeploymentReceiptDestinationMutationAuthority;
  readonly intentDigest: DeploymentReceiptDigest;
  readonly profile: 'gala-deployment-stage-input-v2';
  readonly stage:
    | 'staging'
    | 'activation'
    | 'public-verification'
    | 'managed-reconciliation'
    | 'cleanup';
  readonly stageAttemptId: DeploymentReceiptStableId;
}>;

export type DeploymentReceiptDeploymentStageObservationEvidenceReference =
  Readonly<{
    readonly evidenceDigest: DeploymentReceiptDigest;
    readonly observationId: DeploymentReceiptStableId;
  }>;

export type DeploymentReceiptDeploymentStageResult = (
  | (Readonly<{
      readonly destinationChanged?: 'no' | 'yes';
      readonly failureCode?: 'AUTHORIZATION_LOST';
      readonly outcome?: 'failed';
      readonly retryable?: false;
      readonly stageInput?: Readonly<{
        readonly stage: 'cleanup';
      }>;
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged?: 'no' | 'yes';
      readonly failureCode?: 'NOT_ATTEMPTED_RETRYABLE';
      readonly outcome?: 'failed';
      readonly retryable?: true;
      readonly stageInput?: Readonly<{
        readonly stage: 'cleanup';
      }>;
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged?: 'no' | 'yes';
      readonly failureCode?: 'PROVIDER_CONTRACT_VIOLATION';
      readonly outcome?: 'failed';
      readonly retryable?: false;
      readonly stageInput?: Readonly<{
        readonly stage: 'cleanup';
      }>;
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged?: 'no' | 'yes';
      readonly failureCode?: 'RATE_LIMITED';
      readonly outcome?: 'failed';
      readonly retryable?: true;
      readonly stageInput?: Readonly<{
        readonly stage: 'cleanup';
      }>;
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged?: 'no' | 'yes';
      readonly failureCode?: 'REJECTED';
      readonly outcome?: 'failed';
      readonly retryable?: false;
      readonly stageInput?: Readonly<{
        readonly stage: 'cleanup';
      }>;
    }> &
      unknown)
  | Readonly<{
      readonly destinationChanged?: 'no' | 'yes';
      readonly outcome?: 'succeeded';
      readonly retryable?: false;
    }>
  | (Readonly<{
      readonly destinationChanged?: 'no';
      readonly failureCode?: 'ATOMIC_ACTIVATION_UNSUPPORTED';
      readonly outcome?: 'failed';
      readonly retryable?: false;
      readonly stageInput?: Readonly<{
        readonly stage: 'staging';
      }>;
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged?: 'no';
      readonly failureCode?: 'AUTHORIZATION_LOST';
      readonly outcome?: 'failed';
      readonly retryable?: false;
      readonly stageInput?: Readonly<{
        readonly stage: 'activation';
      }>;
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged?: 'no';
      readonly failureCode?: 'AUTHORIZATION_LOST';
      readonly outcome?: 'failed';
      readonly retryable?: false;
      readonly stageInput?: Readonly<{
        readonly stage: 'staging';
      }>;
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged?: 'no';
      readonly failureCode?: 'NOT_ATTEMPTED_RETRYABLE';
      readonly outcome?: 'failed';
      readonly retryable?: true;
      readonly stageInput?: Readonly<{
        readonly stage: 'activation';
      }>;
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged?: 'no';
      readonly failureCode?: 'NOT_ATTEMPTED_RETRYABLE';
      readonly outcome?: 'failed';
      readonly retryable?: true;
      readonly stageInput?: Readonly<{
        readonly stage: 'staging';
      }>;
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged?: 'no';
      readonly failureCode?: 'PROVIDER_CONTRACT_VIOLATION';
      readonly outcome?: 'failed';
      readonly retryable?: false;
      readonly stageInput?: Readonly<{
        readonly stage: 'activation';
      }>;
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged?: 'no';
      readonly failureCode?: 'PROVIDER_CONTRACT_VIOLATION';
      readonly outcome?: 'failed';
      readonly retryable?: false;
      readonly stageInput?: Readonly<{
        readonly stage: 'staging';
      }>;
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged?: 'no';
      readonly failureCode?: 'RATE_LIMITED';
      readonly outcome?: 'failed';
      readonly retryable?: true;
      readonly stageInput?: Readonly<{
        readonly stage: 'activation';
      }>;
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged?: 'no';
      readonly failureCode?: 'RATE_LIMITED';
      readonly outcome?: 'failed';
      readonly retryable?: true;
      readonly stageInput?: Readonly<{
        readonly stage: 'staging';
      }>;
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged?: 'no';
      readonly failureCode?: 'REJECTED';
      readonly outcome?: 'failed';
      readonly retryable?: false;
      readonly stageInput?: Readonly<{
        readonly stage: 'activation';
      }>;
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged?: 'no';
      readonly failureCode?: 'REJECTED';
      readonly outcome?: 'failed';
      readonly retryable?: false;
      readonly stageInput?: Readonly<{
        readonly stage: 'managed-reconciliation';
      }>;
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged?: 'no';
      readonly failureCode?: 'REJECTED';
      readonly outcome?: 'failed';
      readonly retryable?: false;
      readonly stageInput?: Readonly<{
        readonly stage: 'staging';
      }>;
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged?: 'no';
      readonly failureCode?: 'TARGET_CAPABILITY_UNAVAILABLE';
      readonly outcome?: 'failed';
      readonly retryable?: false;
      readonly stageInput?: Readonly<{
        readonly stage: 'staging';
      }>;
    }> &
      unknown)
  | Readonly<{
      readonly destinationChanged?: 'no';
      readonly outcome?: 'skipped';
      readonly retryable?: false;
    }>
  | (Readonly<{
      readonly destinationChanged?: 'unknown' | 'yes';
      readonly failureCode?: 'AUTHORIZATION_LOST';
      readonly outcome?: 'unknown';
      readonly retryable?: false;
      readonly stageInput?: Readonly<{
        readonly stage: 'managed-reconciliation';
      }>;
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged?: 'unknown' | 'yes';
      readonly failureCode?: 'NOT_ATTEMPTED_RETRYABLE';
      readonly outcome?: 'unknown';
      readonly retryable?: true;
      readonly stageInput?: Readonly<{
        readonly stage: 'managed-reconciliation';
      }>;
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged?: 'unknown' | 'yes';
      readonly failureCode?: 'OUTCOME_UNKNOWN_RECONCILING';
      readonly outcome?: 'unknown';
      readonly retryable?: false;
      readonly stageInput?: Readonly<{
        readonly stage: 'activation';
      }>;
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged?: 'unknown' | 'yes';
      readonly failureCode?: 'OUTCOME_UNKNOWN_RECONCILING';
      readonly outcome?: 'unknown';
      readonly retryable?: false;
      readonly stageInput?: Readonly<{
        readonly stage: 'cleanup';
      }>;
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged?: 'unknown' | 'yes';
      readonly failureCode?: 'OUTCOME_UNKNOWN_RECONCILING';
      readonly outcome?: 'unknown';
      readonly retryable?: false;
      readonly stageInput?: Readonly<{
        readonly stage: 'managed-reconciliation';
      }>;
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged?: 'unknown' | 'yes';
      readonly failureCode?: 'OUTCOME_UNKNOWN_RECONCILING';
      readonly outcome?: 'unknown';
      readonly retryable?: false;
      readonly stageInput?: Readonly<{
        readonly stage: 'staging';
      }>;
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged?: 'unknown' | 'yes';
      readonly failureCode?: 'PROVIDER_CONTRACT_VIOLATION';
      readonly outcome?: 'failed';
      readonly retryable?: false;
      readonly stageInput?: Readonly<{
        readonly stage: 'managed-reconciliation';
      }>;
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged?: 'unknown' | 'yes';
      readonly failureCode?: 'PUBLIC_INTEGRITY_MISMATCH';
      readonly outcome?: 'failed';
      readonly retryable?: false;
      readonly stageInput?: Readonly<{
        readonly stage: 'public-verification';
      }>;
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged?: 'unknown' | 'yes';
      readonly failureCode?: 'PUBLIC_VERIFICATION_INCONCLUSIVE';
      readonly outcome?: 'unknown';
      readonly retryable?: false;
      readonly stageInput?: Readonly<{
        readonly stage: 'public-verification';
      }>;
    }> &
      unknown)
  | (Readonly<{
      readonly destinationChanged?: 'unknown' | 'yes';
      readonly failureCode?: 'RATE_LIMITED';
      readonly outcome?: 'unknown';
      readonly retryable?: true;
      readonly stageInput?: Readonly<{
        readonly stage: 'managed-reconciliation';
      }>;
    }> &
      unknown)
) &
  Readonly<{
    readonly completedAt?: DeploymentReceiptRfc3339;
    readonly destinationChanged: 'yes' | 'no' | 'unknown';
    readonly failureCode?: DeploymentReceiptManagedFailureCode;
    readonly finalizationObservation: DeploymentReceiptDeploymentStageObservationEvidenceReference;
    readonly inputDigest: DeploymentReceiptDigest;
    readonly outcome: 'succeeded' | 'failed' | 'skipped' | 'unknown';
    readonly profile: 'gala-deployment-stage-result-v2';
    readonly retryable: boolean;
    readonly stageInput: DeploymentReceiptDeploymentStageInput;
    readonly startedAt?: DeploymentReceiptRfc3339;
  }>;

export type DeploymentReceiptDeploymentWarning =
  | (DeploymentReceiptFinding &
      Readonly<{
        readonly code?: 'CLEANUP_FAILED';
        readonly messageKey?: 'deployment.cleanup-failed';
        readonly pointer?: '/attempts';
        readonly severity?: 'warning';
      }>)
  | (DeploymentReceiptFinding &
      Readonly<{
        readonly code?: 'PUBLIC_PROPAGATION_DEADLINE';
        readonly messageKey?: 'deployment.public-propagation-deadline';
        readonly pointer?: '/observations';
        readonly severity?: 'warning';
      }>);

export type DeploymentReceiptDestinationIdentity = Readonly<{
  readonly adapterId: DeploymentReceiptPlainLabel;
  readonly adapterVersion: DeploymentReceiptSemver;
  readonly baseUrl: DeploymentReceiptUrlHttps;
  readonly environment: 'github-pages' | 'do-spaces' | 'local-directory';
  readonly providerBinding?: DeploymentReceiptDestinationProviderCoordinates;
  readonly targetDigest: DeploymentReceiptDigest;
}> &
  unknown;

export type DeploymentReceiptDestinationMutationAuthority = Readonly<{
  readonly attemptId: DeploymentReceiptStableId;
  readonly authorityId: DeploymentReceiptStableId;
  readonly destination: DeploymentReceiptDestinationIdentity;
  readonly destinationMutationKeyDigest: DeploymentReceiptDigest;
  readonly epoch: DeploymentReceiptPositiveInt64;
  readonly expectedGenerationId?: DeploymentReceiptGenerationFence;
  readonly expiresAt: DeploymentReceiptRfc3339;
  readonly mode: 'normal' | 'pages-reconciliation-recovery';
  readonly operationId: DeploymentReceiptStableId;
  readonly pagesRecovery?: DeploymentReceiptPagesReconciliationRecovery;
  readonly profile: 'gala-destination-mutation-authority-v2';
  readonly proposedGenerationId: DeploymentReceiptStableId;
}> &
  unknown;

export type DeploymentReceiptDestinationProviderCoordinates = Readonly<{
  readonly owner?: string;
  readonly region?: DeploymentReceiptSpacesRegion;
  readonly repository?: string;
  readonly servedBucket?: DeploymentReceiptSpacesBucket;
  readonly stagingBucket?: DeploymentReceiptSpacesBucket;
}>;

export type DeploymentReceiptDigest = string;

export type DeploymentReceiptExpectedRedirectHop = Readonly<{
  readonly expectedLocation: DeploymentReceiptVerificationUrl;
  readonly expectedStatus: 301 | 302 | 303 | 307 | 308;
  readonly hopNumber: number;
  readonly requestUrl: DeploymentReceiptVerificationUrl;
}>;

export type DeploymentReceiptExtensionKey = string;

export type DeploymentReceiptFinding = Readonly<{
  readonly code: DeploymentReceiptPlainLabel;
  readonly messageKey: DeploymentReceiptPlainLabel;
  readonly pointer: string;
  readonly severity: 'error' | 'warning' | 'info';
}>;

export type DeploymentReceiptGenerationFence = string;

export type DeploymentReceiptGitObjectId = string;

export type DeploymentReceiptGithubActionsArtifactId =
  DeploymentReceiptGithubPositiveDecimal;

export type DeploymentReceiptGithubPositiveDecimal = string;

export type DeploymentReceiptGithubWorkflowRef = string;

export type DeploymentReceiptGlob = string;

export type DeploymentReceiptInt64 = string;

export type DeploymentReceiptIsoCountry = string;

export type DeploymentReceiptLowerHex40 = string;

export type DeploymentReceiptManagedFailureCode =
  | 'TARGET_CAPABILITY_UNAVAILABLE'
  | 'ATOMIC_ACTIVATION_UNSUPPORTED'
  | 'REJECTED'
  | 'NOT_ATTEMPTED_RETRYABLE'
  | 'AUTHORIZATION_LOST'
  | 'RATE_LIMITED'
  | 'PROVIDER_CONTRACT_VIOLATION'
  | 'OUTCOME_UNKNOWN_RECONCILING'
  | 'PUBLIC_VERIFICATION_INCONCLUSIVE'
  | 'PUBLIC_INTEGRITY_MISMATCH';

export type DeploymentReceiptNonNegativeInt64 = string;

export type DeploymentReceiptNpmPackageName = string;

export type DeploymentReceiptObservedRedirectLocation = string;

export type DeploymentReceiptObservedVerificationHeader = Readonly<{
  readonly name: DeploymentReceiptVerificationHeaderName;
  readonly state: 'present' | 'absent' | 'unsafe-omitted';
  readonly value?: DeploymentReceiptVerificationHeaderValue;
}> &
  unknown;

export type DeploymentReceiptPackageExact = string;

export type DeploymentReceiptPackageIdentity = Readonly<{
  readonly integrity: DeploymentReceiptDigest;
  readonly package: DeploymentReceiptNpmPackageName;
  readonly registry: DeploymentReceiptUrlHttps;
  readonly version: DeploymentReceiptSemver;
}>;

export type DeploymentReceiptPackageRange = string;

export type DeploymentReceiptPagesInterveningRunAttempt = Readonly<{
  readonly authorityState: 'closed-no-destination-authority';
  readonly decisionDigest: DeploymentReceiptDigest;
  readonly runAttempt: number;
}>;

export type DeploymentReceiptPagesReconciliationCommand = Readonly<{
  readonly acceptedAt: DeploymentReceiptRfc3339;
  readonly actorPrincipalId: DeploymentReceiptStableId;
  readonly commandDigest: DeploymentReceiptDigest;
  readonly consequentialConfirmationId: DeploymentReceiptStableId;
  readonly expiresAt: DeploymentReceiptRfc3339;
  readonly generationId: DeploymentReceiptStableId;
  readonly operationId: DeploymentReceiptStableId;
  readonly priorAttemptId: DeploymentReceiptStableId;
  readonly priorAuthorityEpoch: DeploymentReceiptPositiveInt64;
  readonly priorAuthorityId: DeploymentReceiptStableId;
  readonly priorFenceEvidenceDigest: DeploymentReceiptDigest;
  readonly priorIntentDigest: DeploymentReceiptDigest;
  readonly priorRunAttempt: number;
  readonly profile: 'gala-pages-reconciliation-command-v2';
  readonly publicationId: DeploymentReceiptStableId;
  readonly reconcileCommandId: DeploymentReceiptStableId;
  readonly runId: DeploymentReceiptGithubPositiveDecimal;
}>;

export type DeploymentReceiptPagesReconciliationRecovery = Readonly<{
  readonly priorAttemptId: DeploymentReceiptStableId;
  readonly priorAuthorityEpoch: DeploymentReceiptPositiveInt64;
  readonly priorAuthorityId: DeploymentReceiptStableId;
  readonly priorExpectedGenerationId?: DeploymentReceiptStableId;
  readonly priorFenceEvidenceDigest: DeploymentReceiptDigest;
  readonly priorIntentDigest: DeploymentReceiptDigest;
  readonly priorPagesBuildVersion: DeploymentReceiptLowerHex40;
  readonly priorProposedGenerationId: DeploymentReceiptStableId;
  readonly profile: 'gala-pages-reconciliation-recovery-v2';
  readonly reconcileCommandDigest: DeploymentReceiptDigest;
  readonly reconcileCommandExpiresAt: DeploymentReceiptRfc3339;
  readonly reconcileCommandId: DeploymentReceiptStableId;
  readonly recoveryDigest: DeploymentReceiptDigest;
  readonly runAttemptGapProof: DeploymentReceiptPagesRunAttemptGapProof;
}>;

export type DeploymentReceiptPagesRunAttemptGapProof = Readonly<{
  readonly claimingRunAttempt: number;
  readonly interveningAttempts: ReadonlyArray<DeploymentReceiptPagesInterveningRunAttempt>;
  readonly priorRunAttempt: number;
  readonly profile: 'gala-pages-run-attempt-gap-proof-v2';
  readonly proofDigest: DeploymentReceiptDigest;
  readonly runId: DeploymentReceiptGithubPositiveDecimal;
}>;

export type DeploymentReceiptPassiveVisualToken = never;

export type DeploymentReceiptPlainLabel = string;

export type DeploymentReceiptPlainText = string;

export type DeploymentReceiptPositiveInt64 = string;

export type DeploymentReceiptProbeRegion = string;

export type DeploymentReceiptPublicGenerationMarkerPayload = Readonly<{
  readonly artifactDigest: DeploymentReceiptDigest;
  readonly artifactId: DeploymentReceiptStableId;
  readonly generationId: DeploymentReceiptStableId;
  readonly schemaId: 'urn:gala:schema:public-generation-marker:2.0.0';
  readonly schemaVersion: '2.0.0';
}>;

export type DeploymentReceiptPublicProbeObservation = Readonly<{
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
  readonly contractGenerationId?: DeploymentReceiptStableId;
  readonly evidenceDigest: DeploymentReceiptDigest;
  readonly expectedCandidateDigest: DeploymentReceiptDigest;
  readonly hopNumber: number;
  readonly observedAt: DeploymentReceiptRfc3339;
  readonly observedByteLength?: DeploymentReceiptNonNegativeInt64;
  readonly observedDigest?: DeploymentReceiptDigest;
  readonly observedGenerationId?: DeploymentReceiptStableId;
  readonly observedHeaders: ReadonlyArray<DeploymentReceiptObservedVerificationHeader>;
  readonly observedLocation?: DeploymentReceiptObservedRedirectLocation;
  readonly observedLocationState:
    'absent' | 'retained' | 'unsafe-omitted' | 'head-unavailable';
  readonly observedStatus?: number;
  readonly origin: DeploymentReceiptVerificationOrigin;
  readonly precedingProbeEvidenceDigest?: DeploymentReceiptDigest;
  readonly probeRegion: DeploymentReceiptProbeRegion;
  readonly requestStartedAt: DeploymentReceiptRfc3339;
  readonly requestUrl: DeploymentReceiptVerificationUrl;
  readonly responseHeadState:
    'not-received' | 'complete' | 'limit-exceeded' | 'malformed';
  readonly route: DeploymentReceiptCanonicalRoute;
  readonly targetId: number;
}> &
  unknown;

export type DeploymentReceiptRecognizedPriorRouteContract = Readonly<{
  readonly expectedByteLength: DeploymentReceiptNonNegativeInt64;
  readonly expectedDigest: DeploymentReceiptDigest;
  readonly expectedHeaders: ReadonlyArray<DeploymentReceiptVerificationHeaderExpectation>;
  readonly expectedTerminalStatus: 200 | 404;
  readonly generationId: DeploymentReceiptStableId;
  readonly redirectChain: ReadonlyArray<DeploymentReceiptExpectedRedirectHop>;
  readonly terminalRequestUrl: DeploymentReceiptVerificationUrl;
}>;

export type DeploymentReceiptRenderPolicyIdentity = Readonly<{
  readonly digest: DeploymentReceiptDigest;
  readonly name: DeploymentReceiptPlainLabel;
  readonly version: DeploymentReceiptSemver;
}>;

export type DeploymentReceiptRepoRelativePath = string;

export type DeploymentReceiptReproducibleBuildRecord = Readonly<{
  readonly basePath: DeploymentReceiptCanonicalRoute;
  readonly baseUrl: DeploymentReceiptUrlHttps;
  readonly buildEpoch: DeploymentReceiptRfc3339;
  readonly buildInputDigest: DeploymentReceiptDigest;
  readonly buildPolicyDecisionDigest: DeploymentReceiptDigest;
  readonly builder: DeploymentReceiptPackageIdentity &
    Readonly<{
      readonly package?: '@rathnasgala2/publish-action';
    }>;
  readonly contractVersion: '2.0.0';
  readonly dependencyLockDigest: DeploymentReceiptDigest;
  readonly destinationCapabilityDigest: DeploymentReceiptDigest;
  readonly packageReleaseCatalogDigest: DeploymentReceiptDigest;
  readonly policyReleaseId: DeploymentReceiptStableId;
  readonly renderPolicy: DeploymentReceiptRenderPolicyIdentity;
  readonly repositoryId: DeploymentReceiptGithubPositiveDecimal;
  readonly repositoryRootDigest: DeploymentReceiptDigest;
  readonly schemas: DeploymentReceiptPackageIdentity &
    Readonly<{
      readonly package?: '@rathnasgala2/schemas';
    }>;
  readonly sourceCommit: DeploymentReceiptGitObjectId;
  readonly sourceTree: DeploymentReceiptGitObjectId;
  readonly stylingContractDigest: DeploymentReceiptDigest;
  readonly template: DeploymentReceiptPackageIdentity &
    Readonly<{
      readonly package?: '@rathnasgala2/template';
    }>;
  readonly theme: DeploymentReceiptPackageIdentity &
    Readonly<{
      readonly package?:
        | '@rathnasgala2/theme-default'
        | '@rathnasgala2/theme-amaze'
        | '@rathnasgala2/theme-flashy'
        | '@rathnasgala2/theme-minimal'
        | '@rathnasgala2/theme-zebra';
    }>;
  readonly workflowIdentity: DeploymentReceiptDigest;
}>;

export type DeploymentReceiptRfc3339 = string;

export type DeploymentReceiptSemver = string;

export type DeploymentReceiptSemverRange = string;

export type DeploymentReceiptSlug = string;

export type DeploymentReceiptSpacesBucket = string;

export type DeploymentReceiptSpacesRegion = string;

export type DeploymentReceiptStableId = string;

export type DeploymentReceiptSupersessionFinalizationEvidence = (
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
    readonly activationDetectionLastEvidenceDigest?: DeploymentReceiptDigest;
    readonly activationDetectionObservationCount: number;
    readonly authorityEpoch: DeploymentReceiptPositiveInt64;
    readonly destinationKeyDigest: DeploymentReceiptDigest;
    readonly fenceEvidenceDigest: DeploymentReceiptDigest;
    readonly fenceTerminalState: 'terminal-no-change' | 'terminal-candidate';
    readonly finalizationOutcome: 'before-mutation' | 'activated';
    readonly finalizedAt: DeploymentReceiptRfc3339;
    readonly precedingEvidenceJournalEntryCount: number;
    readonly precedingEvidenceJournalHeadDigest: DeploymentReceiptDigest;
    readonly profile: 'gala-supersession-finalization-evidence-v2';
    readonly supersededAttemptId: DeploymentReceiptStableId;
    readonly supersededByGenerationId: DeploymentReceiptStableId;
    readonly supersededByOperationId: DeploymentReceiptStableId;
    readonly supersededIntentDigest: DeploymentReceiptDigest;
    readonly supersededOperationId: DeploymentReceiptStableId;
  }> &
  unknown;

export type DeploymentReceiptUrlHttps = string;

export type DeploymentReceiptUrn = string;

export type DeploymentReceiptVerificationHeaderExpectation = Readonly<{
  readonly name: DeploymentReceiptVerificationHeaderName;
  readonly value: DeploymentReceiptVerificationHeaderValue;
}>;

export type DeploymentReceiptVerificationHeaderName = string;

export type DeploymentReceiptVerificationHeaderValue = string;

export type DeploymentReceiptVerificationOrigin = string;

export type DeploymentReceiptVerificationPlanTarget = Readonly<{
  readonly expectedByteLength: DeploymentReceiptNonNegativeInt64;
  readonly expectedCandidateDigest: DeploymentReceiptDigest;
  readonly expectedHeaders: ReadonlyArray<DeploymentReceiptVerificationHeaderExpectation>;
  readonly expectedTerminalStatus: 200 | 404;
  readonly maximumAttempts: number;
  readonly maximumConcurrentStreams: number;
  readonly maximumResponseBytes: DeploymentReceiptNonNegativeInt64;
  readonly maximumResponseWireBytes: DeploymentReceiptPositiveInt64;
  readonly origin: DeploymentReceiptVerificationOrigin;
  readonly recognizedPriorContracts: ReadonlyArray<DeploymentReceiptRecognizedPriorRouteContract>;
  readonly redirectChain: ReadonlyArray<DeploymentReceiptExpectedRedirectHop>;
  readonly requestProfile: 'gala-public-verifier-v2';
  readonly requestTimeoutSeconds: number;
  readonly requiredProbeRegions: ReadonlyArray<DeploymentReceiptProbeRegion>;
  readonly retryProfile: 'gala-public-probe-retry-v2';
  readonly route: DeploymentReceiptCanonicalRoute;
  readonly targetId: number;
  readonly terminalRequestUrl: DeploymentReceiptVerificationUrl;
}>;

export type DeploymentReceiptVerificationUrl = string;

export type DeploymentReceiptDocument = (
  | (Readonly<{
      readonly attempts?: unknown;
    }> &
      Readonly<{
        readonly observations?: unknown;
      }> &
      Readonly<{
        readonly outcome?: 'activated-degraded';
        readonly warnings?: unknown;
      }>)
  | (Readonly<{
      readonly attempts?: unknown;
    }> &
      Readonly<{
        readonly observations?: unknown;
      }> &
      Readonly<{
        readonly outcome?: 'cancelled-no-destination-change';
      }> &
      Readonly<{
        readonly warnings?: unknown;
      }>)
  | (Readonly<{
      readonly attempts?: unknown;
    }> &
      Readonly<{
        readonly observations?: unknown;
      }> &
      Readonly<{
        readonly outcome?: 'failed-no-destination-change';
      }> &
      Readonly<{
        readonly warnings?: unknown;
      }>)
  | (Readonly<{
      readonly attempts?: unknown;
    }> &
      Readonly<{
        readonly observations?: unknown;
      }> &
      Readonly<{
        readonly outcome?: 'rolled-back';
      }> &
      Readonly<{
        readonly warnings?: unknown;
      }>)
  | (Readonly<{
      readonly attempts?: unknown;
    }> &
      Readonly<{
        readonly observations?: unknown;
      }> &
      Readonly<{
        readonly outcome?: 'succeeded';
      }> &
      Readonly<{
        readonly warnings?: unknown;
      }>)
  | (Readonly<{
      readonly attempts?: unknown;
    }> &
      Readonly<{
        readonly observations?: unknown;
      }> &
      Readonly<{
        readonly outcome?: 'succeeded-with-warnings';
        readonly warnings?: unknown;
      }>)
  | (Readonly<{
      readonly outcome?: 'superseded';
    }> &
      Readonly<{
        readonly warnings?: unknown;
      }> &
      unknown)
  | (Readonly<{
      readonly outcome?: 'unknown-reconciling';
    }> &
      unknown)
) &
  Readonly<{
    readonly adapter: DeploymentReceiptAdapterIdentity;
    readonly artifactByteCount: DeploymentReceiptPositiveInt64;
    readonly artifactDigest: DeploymentReceiptDigest;
    readonly artifactFileCount: DeploymentReceiptPositiveInt64;
    readonly artifactId: DeploymentReceiptStableId;
    readonly artifactManifestDigest: DeploymentReceiptDigest;
    readonly attemptSnapshotSequence: number;
    readonly attempts: ReadonlyArray<DeploymentReceiptDeploymentAttempt>;
    readonly completedAt: DeploymentReceiptRfc3339;
    readonly destination: DeploymentReceiptDestinationIdentity;
    readonly destinationGenerationId?: DeploymentReceiptStableId;
    readonly destinationReceiptDigest?: DeploymentReceiptDigest;
    readonly effectiveArtifactExpiresAt: DeploymentReceiptRfc3339;
    readonly evidenceJournalEntryCount: number;
    readonly evidenceJournalHeadDigest: DeploymentReceiptDigest;
    readonly failure?: DeploymentReceiptDeploymentFailure;
    readonly intentDigest: DeploymentReceiptDigest;
    readonly issuer: DeploymentReceiptUrlHttps;
    readonly observations: ReadonlyArray<DeploymentReceiptDeploymentObservation>;
    readonly operationId: DeploymentReceiptStableId;
    readonly organizationId: DeploymentReceiptStableId;
    readonly outcome:
      | 'succeeded'
      | 'succeeded-with-warnings'
      | 'activated-degraded'
      | 'failed-no-destination-change'
      | 'cancelled-no-destination-change'
      | 'superseded'
      | 'unknown-reconciling'
      | 'rolled-back';
    readonly provenanceDigest: DeploymentReceiptDigest;
    readonly publisher: DeploymentReceiptPackageIdentity &
      Readonly<{
        readonly package: '@rathnasgala2/publish-action';
      }>;
    readonly receiptDigest: DeploymentReceiptDigest;
    readonly receiptId: DeploymentReceiptStableId;
    readonly repositoryId: DeploymentReceiptPlainLabel;
    readonly repositoryOwnerId: DeploymentReceiptPlainLabel;
    readonly requestedArtifactRetentionDays: number;
    readonly rollbackActorId?: DeploymentReceiptStableId;
    readonly rollbackOfGenerationId?: DeploymentReceiptStableId;
    readonly rollbackOfOperationId?: DeploymentReceiptStableId;
    readonly rollbackOfReceiptDigest?: DeploymentReceiptDigest;
    readonly rollbackReason?: DeploymentReceiptPlainText;
    readonly runAttempt: number;
    readonly runId: DeploymentReceiptPlainLabel;
    readonly sbomDigest: DeploymentReceiptDigest;
    readonly schemaId: 'urn:gala:schema:deployment-receipt:2.0.0';
    readonly schemaVersion: '2.0.0';
    readonly snapshotSequence: number;
    readonly sourceCommit: DeploymentReceiptGitObjectId;
    readonly startedAt: DeploymentReceiptRfc3339;
    readonly submissionEvidenceDigest: DeploymentReceiptDigest;
    readonly supersededByGenerationId?: DeploymentReceiptStableId;
    readonly supersededByOperationId?: DeploymentReceiptStableId;
    readonly supersedesReceiptId?: DeploymentReceiptStableId;
    readonly verificationDeadlineAt?: DeploymentReceiptRfc3339;
    readonly verificationTier:
      | 'provider-complete-digest'
      | 'full-public-fetch'
      | 'deterministic-sample'
      | 'critical-only';
    readonly warnings: ReadonlyArray<DeploymentReceiptDeploymentWarning>;
    readonly workflowRef: DeploymentReceiptGithubWorkflowRef;
    readonly workflowSha: DeploymentReceiptGitObjectId;
  }> &
  Readonly<{
    readonly attempts?: unknown;
  }> &
  unknown;

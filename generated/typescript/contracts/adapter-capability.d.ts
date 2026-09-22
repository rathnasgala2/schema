// Generated from urn:gala:schema:adapter-capability:2.0.0; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
// Do not edit.

export type AdapterCapabilityAdapterConfigurationCapabilities = Readonly<{
  readonly customDomains: boolean;
  readonly headers: boolean;
  readonly immutableCaching: boolean;
  readonly notFoundBehavior: boolean;
  readonly redirects: boolean;
}>;

export type AdapterCapabilityAdapterIdentity = Readonly<{
  readonly adapterDigest: AdapterCapabilityDigest;
  readonly adapterId: AdapterCapabilityPlainLabel;
  readonly adapterVersion: AdapterCapabilitySemver;
}>;

export type AdapterCapabilityAdapterProviderLimits =
  | AdapterCapabilityFilesystemProviderLimits
  | AdapterCapabilityHttpProviderLimits;

export type AdapterCapabilityBcp47 = string;

export type AdapterCapabilityCanonicalRoute = string;

export type AdapterCapabilityCapabilityDecision = (
  | Readonly<{
      readonly adapter: Readonly<{
        readonly adapterId: 'do-spaces';
      }>;
      readonly pagesActionsArtifactByteCount?: never;
      readonly pagesActionsArtifactDigest?: never;
      readonly pagesActionsArtifactName?: never;
      readonly pagesBuildVersion?: never;
      readonly pagesOidcOriginCatalogDigest?: never;
    }>
  | Readonly<{
      readonly adapter: Readonly<{
        readonly adapterId: 'github-pages';
      }>;
      readonly spacesControlPlaneBindingDigest?: never;
      readonly spacesControlPlaneRequestCatalogDigest?: never;
      readonly spacesControlPlaneResponseCatalogDigest?: never;
      readonly spacesControlPlaneTlsProfileDigest?: never;
      readonly spacesStagePrefix?: never;
      readonly spacesWebsiteConfigurationDigest?: never;
    }>
  | Readonly<{
      readonly adapter: Readonly<{
        readonly adapterId: 'local-directory';
      }>;
      readonly credentialEgressProfileDigest?: never;
      readonly pagesActionsArtifactByteCount?: never;
      readonly pagesActionsArtifactDigest?: never;
      readonly pagesActionsArtifactName?: never;
      readonly pagesBuildVersion?: never;
      readonly pagesOidcOriginCatalogDigest?: never;
      readonly spacesControlPlaneBindingDigest?: never;
      readonly spacesControlPlaneRequestCatalogDigest?: never;
      readonly spacesControlPlaneResponseCatalogDigest?: never;
      readonly spacesControlPlaneTlsProfileDigest?: never;
      readonly spacesStagePrefix?: never;
      readonly spacesWebsiteConfigurationDigest?: never;
    }>
) &
  Readonly<{
    readonly adapter: AdapterCapabilityAdapterIdentity;
    readonly artifactByteCount: AdapterCapabilityPositiveInt64;
    readonly artifactDigest: AdapterCapabilityDigest;
    readonly artifactFileCount: AdapterCapabilityPositiveInt64;
    readonly artifactId: AdapterCapabilityStableId;
    readonly capabilityDigest: AdapterCapabilityDigest;
    readonly credentialEgressProfileDigest?: AdapterCapabilityDigest;
    readonly decisionDigest: AdapterCapabilityDigest;
    readonly deploymentByteCount: AdapterCapabilityPositiveInt64;
    readonly deploymentObjectCount: AdapterCapabilityPositiveInt64;
    readonly destination: AdapterCapabilityDestinationIdentity;
    readonly manifestDigest: AdapterCapabilityDigest;
    readonly markerByteLength: AdapterCapabilityPositiveInt64;
    readonly maximumFinalPathByteLength: AdapterCapabilityPositiveInt64;
    readonly maximumStageRequestBytes: AdapterCapabilityPositiveInt64;
    readonly maximumStageRequestCount: AdapterCapabilityPositiveInt64;
    readonly maximumStageResponseBytes: AdapterCapabilityPositiveInt64;
    readonly maximumStageResponseWireBytes: AdapterCapabilityPositiveInt64;
    readonly pagesActionsArtifactByteCount?: AdapterCapabilityPositiveInt64;
    readonly pagesActionsArtifactDigest?: AdapterCapabilityDigest;
    readonly pagesActionsArtifactName?: AdapterCapabilityPlainLabel;
    readonly pagesBuildVersion?: string;
    readonly pagesOidcOriginCatalogDigest?: AdapterCapabilityDigest;
    readonly profile: 'gala-capability-decision-v2';
    readonly spacesControlPlaneBindingDigest?: AdapterCapabilityDigest;
    readonly spacesControlPlaneRequestCatalogDigest?: AdapterCapabilityDigest;
    readonly spacesControlPlaneResponseCatalogDigest?: AdapterCapabilityDigest;
    readonly spacesControlPlaneTlsProfileDigest?: AdapterCapabilityDigest;
    readonly spacesStagePrefix?: string;
    readonly spacesWebsiteConfigurationDigest?: AdapterCapabilityDigest;
  }>;

export type AdapterCapabilityCredentialEgress =
  | AdapterCapabilityPagesOidcCredentialEgress
  | AdapterCapabilityProviderCredentialEgress;

export type AdapterCapabilityCredentialEgressProfile = (
  | Readonly<{
      readonly egress: readonly [
        AdapterCapabilityProviderCredentialEgress &
          Readonly<{
            readonly credentialFormatProfileDigest?: never;
            readonly credentialSources?: ['github-token'];
          }>,
        AdapterCapabilityPagesOidcCredentialEgress,
      ];
    }>
  | Readonly<{
      readonly egress: readonly [
        AdapterCapabilityProviderCredentialEgress &
          Readonly<{
            readonly credentialSources?: [
              'spaces-authorization-value',
              'spaces-session-token',
            ];
          }>,
        AdapterCapabilityProviderCredentialEgress &
          Readonly<{
            readonly credentialSources?: [
              'spaces-authorization-value',
              'spaces-session-token',
            ];
          }>,
      ];
    }>
) &
  Readonly<{
    readonly ambientProxy: 'disabled';
    readonly cookies: 'disabled';
    readonly credentialForwarding: 'same-origin-only';
    readonly egress: ReadonlyArray<AdapterCapabilityCredentialEgress>;
    readonly netrc: 'disabled';
    readonly networkBoundaryProfileDigest: AdapterCapabilityDigest;
    readonly profile: 'gala-provider-credential-egress-v2';
    readonly profileDigest: AdapterCapabilityDigest;
    readonly redirects: 'reject';
    readonly tlsProfileDigest: AdapterCapabilityDigest;
  }>;

export type AdapterCapabilityDestinationIdentity = Readonly<{
  readonly adapterId: AdapterCapabilityPlainLabel;
  readonly adapterVersion: AdapterCapabilitySemver;
  readonly baseUrl: AdapterCapabilityUrlHttps;
  readonly environment: 'github-pages' | 'do-spaces' | 'local-directory';
  readonly providerBinding?: AdapterCapabilityDestinationProviderCoordinates;
  readonly targetDigest: AdapterCapabilityDigest;
}> &
  unknown;

export type AdapterCapabilityDestinationProviderBinding =
  | Readonly<{
      readonly apiOrigin: 'https://api.github.com';
      readonly environment: 'github-pages';
      readonly kind: 'github-pages';
      readonly repository: AdapterCapabilityGithubRepositoryCoordinate;
      readonly repositoryId: AdapterCapabilityGithubPositiveDecimal;
    }>
  | Readonly<{
      readonly controlPlaneBindingDigest: AdapterCapabilityDigest;
      readonly kind: 'do-spaces';
      readonly region: AdapterCapabilitySpacesRegion;
      readonly regionCatalogDigest: AdapterCapabilityDigest;
      readonly servedApiOrigin: AdapterCapabilityUrlHttps;
      readonly servedBucket: AdapterCapabilitySpacesBucket;
      readonly stagingApiOrigin: AdapterCapabilityUrlHttps;
      readonly stagingBucket: AdapterCapabilitySpacesBucket;
      readonly websiteConfigurationDigest: AdapterCapabilityDigest;
      readonly websiteOrigin: AdapterCapabilityUrlHttps;
    }>
  | Readonly<{
      readonly kind: 'local-directory';
      readonly mutationSurfaceDigest: AdapterCapabilityDigest;
      readonly rootIdentityDigest: AdapterCapabilityDigest;
    }>;

export type AdapterCapabilityDestinationProviderCoordinates = Readonly<{
  readonly owner?: string;
  readonly region?: AdapterCapabilitySpacesRegion;
  readonly repository?: string;
  readonly servedBucket?: AdapterCapabilitySpacesBucket;
  readonly stagingBucket?: AdapterCapabilitySpacesBucket;
}>;

export type AdapterCapabilityDigest = string;

export type AdapterCapabilityExtensionKey = string;

export type AdapterCapabilityFilesystemProviderLimits = Readonly<{
  readonly filesystemAllowlistDigest: AdapterCapabilityDigest;
  readonly filesystemProfile: 'gala-local-directory-filesystem-v2';
  readonly maximumArtifactBytes: AdapterCapabilityPositiveInt64;
  readonly maximumFileBytes: AdapterCapabilityPositiveInt64;
  readonly maximumFiles: AdapterCapabilityPositiveInt64;
  readonly maximumPathBytes: number;
  readonly maximumProviderCallSeconds: number;
  readonly pathRuleProfile: 'gala-portable-v2';
  readonly transport: 'filesystem';
}>;

export type AdapterCapabilityGenerationFence = string;

export type AdapterCapabilityGitObjectId = string;

export type AdapterCapabilityGithubActionsOidcOrigin = string;

export type AdapterCapabilityGithubActionsOidcOriginCatalog = Readonly<{
  readonly catalogDigest: AdapterCapabilityDigest;
  readonly evidenceDigest: AdapterCapabilityDigest;
  readonly fixtureDigest: AdapterCapabilityDigest;
  readonly origins: ReadonlyArray<AdapterCapabilityGithubActionsOidcOrigin>;
  readonly profile: 'gala-github-actions-oidc-origin-catalog-v2';
}>;

export type AdapterCapabilityGithubPositiveDecimal = string;

export type AdapterCapabilityGithubRepositoryCoordinate = string;

export type AdapterCapabilityGlob = string;

export type AdapterCapabilityHttpProviderLimits = Readonly<{
  readonly callClassBinding?: ReadonlyArray<AdapterCapabilityProviderCallClassBinding>;
  readonly callClassBindingDigest?: AdapterCapabilityDigest;
  readonly credentialEgressProfileDigest: AdapterCapabilityDigest;
  readonly managedExecutionBudget: AdapterCapabilityManagedExecutionBudget;
  readonly maximumArtifactBytes: AdapterCapabilityPositiveInt64;
  readonly maximumFileBytes: AdapterCapabilityPositiveInt64;
  readonly maximumFiles: AdapterCapabilityPositiveInt64;
  readonly maximumPagesArtifactBytes?: string;
  readonly maximumPathBytes: number;
  readonly maximumProviderCallSeconds: number;
  readonly maximumProviderRequestBodyBytes: string;
  readonly maximumProviderRequestHeadBytes: number;
  readonly maximumProviderRequestsPerStage: number;
  readonly maximumProviderResponseBodyBytes: string;
  readonly maximumProviderResponseHeadBytes: number;
  readonly maximumProviderResponseWireBodyBytes: string;
  readonly maximumProviderStageRequestBytes: string;
  readonly maximumProviderStageResponseBytes: string;
  readonly maximumProviderStageResponseWireBytes: string;
  readonly pagesArtifactProfile?: 'gala-pages-artifact-v2';
  readonly pathRuleProfile: 'gala-portable-v2';
  readonly providerCompatibilityEvidenceDigest: AdapterCapabilityDigest;
  readonly requestTemplateCatalogDigest: AdapterCapabilityDigest;
  readonly requestTemplateProfile:
    'gala-github-pages-http-v2' | 'gala-do-spaces-sigv4-v2';
  readonly requestTemplates: ReadonlyArray<AdapterCapabilityProviderRequestTemplate>;
  readonly responseProfileCatalogDigest: AdapterCapabilityDigest;
  readonly spacesControlPlaneBindingDigest?: AdapterCapabilityDigest;
  readonly spacesControlPlaneRequestCatalogDigest?: AdapterCapabilityDigest;
  readonly spacesControlPlaneResponseCatalogDigest?: AdapterCapabilityDigest;
  readonly spacesControlPlaneTlsProfileDigest?: AdapterCapabilityDigest;
  readonly spacesWebsiteConfigurationDigest?: AdapterCapabilityDigest;
  readonly tlsProfileDigest: AdapterCapabilityDigest;
  readonly transport: 'http';
}>;

export type AdapterCapabilityIsoCountry = string;

export type AdapterCapabilityLocalFilesystemAllowlist = Readonly<{
  readonly catalogDigest: AdapterCapabilityDigest;
  readonly entries: ReadonlyArray<AdapterCapabilityLocalFilesystemAllowlistEntry>;
  readonly profile: 'gala-local-filesystem-allowlist-v2';
}>;

export type AdapterCapabilityLocalFilesystemAllowlistEntry = Readonly<{
  readonly allowlistEntryId: AdapterCapabilityStableId;
  readonly atomicReplacementMatrixDigest: AdapterCapabilityDigest;
  readonly maliciousFilesystemMatrixDigest: AdapterCapabilityDigest;
  readonly platform: AdapterCapabilityLocalFilesystemPlatform;
  readonly powerLossMatrixDigest: AdapterCapabilityDigest;
  readonly primitiveProfile: 'gala-local-directory-filesystem-v2';
  readonly processCrashMatrixDigest: AdapterCapabilityDigest;
}>;

export type AdapterCapabilityLocalFilesystemCapabilityEvidence = Readonly<{
  readonly adapter: AdapterCapabilityAdapterIdentity &
    Readonly<{
      readonly adapterId: 'local-directory';
    }>;
  readonly allowlistDigest: AdapterCapabilityDigest;
  readonly allowlistEntryId: AdapterCapabilityStableId;
  readonly deviceId: AdapterCapabilityUnsignedDecimal;
  readonly effectiveUserId: AdapterCapabilityUnsignedDecimal;
  readonly evidenceDigest: AdapterCapabilityDigest;
  readonly mutationSurfaceDigest: AdapterCapabilityDigest;
  readonly observedAt: AdapterCapabilityRfc3339;
  readonly platform: AdapterCapabilityLocalFilesystemPlatform;
  readonly probe: AdapterCapabilityLocalFilesystemProbeSummary;
  readonly profile: 'gala-local-directory-capability-evidence-v2';
  readonly rootFileId: AdapterCapabilityUnsignedDecimal;
  readonly rootIdentityDigest: AdapterCapabilityDigest;
  readonly surfaceIdentityDigest: AdapterCapabilityDigest;
}>;

export type AdapterCapabilityLocalFilesystemControlPublication = Readonly<{
  readonly conflictingResult: 'EEXIST';
  readonly conflictingSource: 'race-a';
  readonly publicationResult: 'success';
  readonly publishedByteSource: 'control';
  readonly publishedInodeSource: 'control';
  readonly publisherSource: 'control';
}>;

export type AdapterCapabilityLocalFilesystemControlRow = Readonly<{
  readonly artifactDigest: AdapterCapabilityDigest;
  readonly attemptId: AdapterCapabilityStableId;
  readonly destinationChanged: 'yes' | 'no' | 'unknown';
  readonly eventStageAttemptId: AdapterCapabilityStableId;
  readonly expectedGenerationId?: AdapterCapabilityGenerationFence;
  readonly failureCode?: AdapterCapabilityManagedFailureCode;
  readonly failureEvidenceDigest?: AdapterCapabilityDigest;
  readonly generationId: AdapterCapabilityStableId;
  readonly markerDigest: AdapterCapabilityDigest;
  readonly operationId: AdapterCapabilityStableId;
  readonly previousRowDigest?: AdapterCapabilityDigest;
  readonly profile: 'gala-local-directory-control-v2';
  readonly rowDigest: AdapterCapabilityDigest;
  readonly sequence: number;
  readonly stageToken: string;
  readonly stagingStageAttemptId: AdapterCapabilityStableId;
  readonly state:
    | 'preflight-passed'
    | 'preflight-failed'
    | 'staging-started'
    | 'stage-durable'
    | 'staging-failed'
    | 'activation-prepared'
    | 'activation-renamed'
    | 'activation-durable'
    | 'activation-failed'
    | 'activation-ambiguous'
    | 'observed'
    | 'cleanup-started'
    | 'cleanup-finished'
    | 'cleanup-failed'
    | 'cleanup-ambiguous';
}> &
  unknown;

export type AdapterCapabilityLocalFilesystemFailureEvidence = Readonly<{
  readonly attemptId: AdapterCapabilityStableId;
  readonly boundary:
    | 'preflight'
    | 'capacity'
    | 'stage-create'
    | 'stage-write'
    | 'file-fsync'
    | 'directory-fsync'
    | 'stage-rename'
    | 'inspect'
    | 'pointer-prepare'
    | 'pointer-rename'
    | 'post-rename-observe'
    | 'cleanup-unlink'
    | 'cleanup-rmdir';
  readonly destinationChanged: 'yes' | 'no' | 'unknown';
  readonly errorClass:
    | 'unsupported'
    | 'unsafe-node'
    | 'ownership'
    | 'permission'
    | 'cross-device'
    | 'collision'
    | 'capacity'
    | 'short-write'
    | 'exists'
    | 'not-found'
    | 'busy'
    | 'io'
    | 'timeout'
    | 'ambiguous'
    | 'tamper';
  readonly eventStageAttemptId: AdapterCapabilityStableId;
  readonly evidenceDigest: AdapterCapabilityDigest;
  readonly failureCode: AdapterCapabilityManagedFailureCode;
  readonly filesystemEvidenceDigest: AdapterCapabilityDigest;
  readonly observedCurrentState:
    | 'not-observed'
    | 'absent'
    | 'predecessor'
    | 'candidate'
    | 'other'
    | 'unsafe';
  readonly operationId: AdapterCapabilityStableId;
  readonly profile: 'gala-local-directory-failure-v2';
  readonly rootIdentityDigest: AdapterCapabilityDigest;
  readonly stageToken: string;
}>;

export type AdapterCapabilityLocalFilesystemObservationEvidence = Readonly<{
  readonly attemptId: AdapterCapabilityStableId;
  readonly controlHeadDigest: AdapterCapabilityDigest;
  readonly evidenceDigest: AdapterCapabilityDigest;
  readonly expectedGenerationId?: AdapterCapabilityGenerationFence;
  readonly filesystemEvidenceDigest: AdapterCapabilityDigest;
  readonly observedArtifactDigest?: AdapterCapabilityDigest;
  readonly observedAt: AdapterCapabilityRfc3339;
  readonly observedByteCount?: AdapterCapabilityNonnegativeInt64;
  readonly observedCurrentState: 'absent' | 'valid' | 'malformed' | 'unsafe';
  readonly observedFileCount?: AdapterCapabilityNonnegativeInt64;
  readonly observedGenerationId?: AdapterCapabilityStableId;
  readonly observedMarkerDigest?: AdapterCapabilityDigest;
  readonly operationId: AdapterCapabilityStableId;
  readonly profile: 'gala-local-directory-observation-v2';
  readonly rootIdentityDigest: AdapterCapabilityDigest;
  readonly stageAttemptId: AdapterCapabilityStableId;
}>;

export type AdapterCapabilityLocalFilesystemPlatform = Readonly<{
  readonly architecture: 'x86_64' | 'aarch64';
  readonly filesystemType: AdapterCapabilityPlainLabel;
  readonly kernelRelease: AdapterCapabilityPlainLabel;
  readonly mountFlags: ReadonlyArray<AdapterCapabilityPlainLabel>;
  readonly os: 'linux' | 'darwin';
}>;

export type AdapterCapabilityLocalFilesystemProbeSummary = Readonly<{
  readonly atomicSymlinkReplacement: true;
  readonly directoryFsync: true;
  readonly exclusiveControlPublication: true;
  readonly readerIterations: 10000;
  readonly replacementIterations: 10000;
  readonly rootAndAncestorsNoFollow: true;
  readonly sameRootAndReleaseDevice: true;
  readonly transcriptDigest: AdapterCapabilityDigest;
  readonly unexpectedReaderOutcomes: 0;
}>;

export type AdapterCapabilityLocalFilesystemProbeTranscript = Readonly<{
  readonly controlPublication: AdapterCapabilityLocalFilesystemControlPublication;
  readonly initialTarget: 'target-a';
  readonly profile: 'gala-local-filesystem-probe-transcript-v2';
  readonly racePublication: AdapterCapabilityLocalFilesystemRacePublication;
  readonly replacements: ReadonlyArray<AdapterCapabilityLocalFilesystemReplacement>;
}>;

export type AdapterCapabilityLocalFilesystemRacePublication =
  | Readonly<{
      readonly contenders: [
        { source: 'race-a'; linkResult: 'EEXIST' },
        { source: 'race-b'; linkResult: 'success' },
      ];
      readonly publishedByteSource: 'race-b';
      readonly publishedInodeSource: 'race-b';
      readonly winner: 'race-b';
    }>
  | Readonly<{
      readonly contenders: [
        { source: 'race-a'; linkResult: 'success' },
        { source: 'race-b'; linkResult: 'EEXIST' },
      ];
      readonly publishedByteSource: 'race-a';
      readonly publishedInodeSource: 'race-a';
      readonly winner: 'race-a';
    }>;

export type AdapterCapabilityLocalFilesystemReplacement = Readonly<{
  readonly operationNumber: number;
  readonly preparedTarget: 'target-a' | 'target-b';
  readonly readerResult: 'target-a' | 'target-b';
  readonly renameResult: 'success';
}>;

export type AdapterCapabilityLocalFilesystemSurfaceIdentity = Readonly<{
  readonly profile: 'gala-local-surface-identity-v2';
  readonly recordDigest: AdapterCapabilityDigest;
  readonly surfaceId: string;
}>;

export type AdapterCapabilityManagedExecutionBudget = Readonly<{
  readonly journalHandoffSeconds: number;
  readonly pagesArtifactUploadSeconds?: number;
  readonly pagesArtifactVerificationSeconds?: number;
  readonly pagesCarrierConstructionSeconds?: number;
  readonly providerExecutionSeconds: number;
  readonly spacesControlPlaneVerificationSeconds?: number;
  readonly totalSeconds: number;
  readonly verifiedHandoffSeconds: number;
}>;

export type AdapterCapabilityManagedFailureCode =
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

export type AdapterCapabilityNonnegativeInt64 = string;

export type AdapterCapabilityPackageExact = string;

export type AdapterCapabilityPackageRange = string;

export type AdapterCapabilityPagesOidcCredentialEgress = Readonly<{
  readonly audienceQuery: 'preserve-runner-default-no-addition';
  readonly credentialHeader: {
    name: 'authorization';
    source: 'actions-id-token-request-token';
    prefix: 'Bearer ';
  };
  readonly method: 'GET';
  readonly originCatalogDigest: AdapterCapabilityDigest;
  readonly originProfile: 'gala-github-actions-oidc-origin-catalog-v2';
  readonly purpose: 'pages-oidc';
  readonly requestTargetProfile: 'gala-github-actions-oidc-request-target-v2';
  readonly responseProfile: 'gala-pages-oidc-token-json-v2';
}>;

export type AdapterCapabilityPassiveVisualToken = never;

export type AdapterCapabilityPlainLabel = string;

export type AdapterCapabilityPlainText = string;

export type AdapterCapabilityPositiveInt64 = string;

export type AdapterCapabilityProviderCallClassBinding = Readonly<{
  readonly callClass: AdapterCapabilityPlainLabel;
  readonly pagesDeploymentIdSource:
    | 'none'
    | 'intent-pages-build-version'
    | 'recovery-prior-pages-build-version';
  readonly recoveryOnly: boolean;
  readonly stage:
    | 'inspect'
    | 'stage'
    | 'activate'
    | 'observe'
    | 'cleanup-staged'
    | 'rollback';
}>;

export type AdapterCapabilityProviderCredentialEgress = Readonly<{
  readonly credentialFormatProfileDigest?: AdapterCapabilityDigest;
  readonly credentialSources: ReadonlyArray<
    'github-token' | 'spaces-authorization-value' | 'spaces-session-token'
  >;
  readonly origin: AdapterCapabilityUrlHttps;
  readonly purpose: 'provider-api';
  readonly requestProfile: 'provider-request-template-catalog';
  readonly requestTemplateCatalogDigest: AdapterCapabilityDigest;
}>;

export type AdapterCapabilityProviderCredentialHeader = (
  | Readonly<{
      readonly maximumRenderedValueBytes: 2048;
      readonly maximumSourceBytes: 2048;
      readonly name: 'authorization';
      readonly prefix: '';
      readonly source: 'spaces-authorization-value';
    }>
  | Readonly<{
      readonly maximumRenderedValueBytes: 4096;
      readonly maximumSourceBytes: 4096;
      readonly name: 'x-amz-security-token';
      readonly prefix: '';
      readonly source: 'spaces-session-token';
    }>
  | Readonly<{
      readonly maximumRenderedValueBytes: 4103;
      readonly maximumSourceBytes: 4096;
      readonly name: 'authorization';
      readonly prefix: 'Bearer ';
      readonly source: 'github-token';
    }>
) &
  Readonly<{
    readonly maximumRenderedValueBytes: number;
    readonly maximumSourceBytes: number;
    readonly name: 'authorization' | 'x-amz-security-token';
    readonly prefix: AdapterCapabilityProviderHeaderPrefix;
    readonly source:
      'github-token' | 'spaces-authorization-value' | 'spaces-session-token';
  }>;

export type AdapterCapabilityProviderDerivedHeader = (
  | Readonly<{
      readonly name: 'cache-control';
      readonly source: 'deployment-object-cache-control';
    }>
  | Readonly<{
      readonly name: 'content-length';
      readonly source: 'request-body-byte-count';
    }>
  | Readonly<{
      readonly name: 'content-type';
      readonly source: 'deployment-object-media-type';
    }>
  | Readonly<{
      readonly name: 'host';
      readonly source: 'origin-authority';
    }>
  | Readonly<{
      readonly name: 'x-amz-content-sha256';
      readonly source: 'request-body-sha256';
    }>
  | Readonly<{
      readonly name: 'x-amz-date';
      readonly source: 'sigv4-basic-timestamp';
    }>
  | Readonly<{
      readonly name: 'x-amz-meta-gala-sha256';
      readonly source: 'deployment-object-untagged-sha256';
    }>
) &
  Readonly<{
    readonly name:
      | 'host'
      | 'content-length'
      | 'content-type'
      | 'cache-control'
      | 'x-amz-date'
      | 'x-amz-content-sha256'
      | 'x-amz-meta-gala-sha256';
    readonly source:
      | 'origin-authority'
      | 'request-body-byte-count'
      | 'deployment-object-media-type'
      | 'deployment-object-cache-control'
      | 'sigv4-basic-timestamp'
      | 'request-body-sha256'
      | 'deployment-object-untagged-sha256';
  }>;

export type AdapterCapabilityProviderFixedHeader = Readonly<{
  readonly name: AdapterCapabilityProviderHeaderName;
  readonly value: AdapterCapabilityProviderHeaderValue;
}>;

export type AdapterCapabilityProviderHeaderName = string;

export type AdapterCapabilityProviderHeaderPrefix = string;

export type AdapterCapabilityProviderHeaderValue = string;

export type AdapterCapabilityProviderRequestTemplate = Readonly<{
  readonly callClass: AdapterCapabilityPlainLabel;
  readonly canonicalQueryProfile:
    | 'none'
    | 'spaces-list-v2'
    | 'spaces-multipart-create-v2'
    | 'spaces-multipart-part-v2'
    | 'spaces-upload-id-v2';
  readonly credentialHeaders: ReadonlyArray<AdapterCapabilityProviderCredentialHeader>;
  readonly derivedHeaders: ReadonlyArray<AdapterCapabilityProviderDerivedHeader>;
  readonly fixedHeaders: ReadonlyArray<AdapterCapabilityProviderFixedHeader>;
  readonly maximumRequestTargetBytes: number;
  readonly method: 'GET' | 'HEAD' | 'PUT' | 'POST' | 'DELETE';
  readonly origin: AdapterCapabilityUrlHttps;
  readonly requestBodyProfile:
    | 'empty'
    | 'gala-pages-create-deployment-jcs-v2'
    | 'spaces-object-slice-v2'
    | 'spaces-generation-marker-jcs-v2'
    | 'spaces-multipart-completion-xml-v2';
  readonly requestTargetTemplate: string;
  readonly responseProfile: AdapterCapabilityProviderResponseProfileId;
  readonly stage:
    | 'inspect'
    | 'stage'
    | 'activate'
    | 'observe'
    | 'cleanup-staged'
    | 'rollback';
}>;

export type AdapterCapabilityProviderResponseCatalog =
  | Readonly<{
      readonly adapter: AdapterCapabilityAdapterIdentity &
        Readonly<{
          readonly adapterId: 'do-spaces';
        }>;
      readonly catalogDigest: AdapterCapabilityDigest;
      readonly profile: 'gala-provider-response-catalog-v2';
      readonly responseProfiles: [
        'spaces-abort-multipart-v2',
        'spaces-complete-multipart-v2',
        'spaces-create-multipart-v2',
        'spaces-delete-object-v2',
        'spaces-head-object-v2',
        'spaces-list-objects-v2',
        'spaces-put-object-v2',
        'spaces-upload-part-v2',
      ];
    }>
  | Readonly<{
      readonly adapter: AdapterCapabilityAdapterIdentity &
        Readonly<{
          readonly adapterId: 'github-pages';
        }>;
      readonly catalogDigest: AdapterCapabilityDigest;
      readonly profile: 'gala-provider-response-catalog-v2';
      readonly responseProfiles: [
        'pages-cancel-empty-v2',
        'pages-create-deployment-json-v2',
        'pages-deployment-status-json-v2',
        'pages-site-json-v2',
      ];
    }>;

export type AdapterCapabilityProviderResponseProfileId =
  | 'pages-cancel-empty-v2'
  | 'pages-create-deployment-json-v2'
  | 'pages-deployment-status-json-v2'
  | 'pages-site-json-v2'
  | 'spaces-abort-multipart-v2'
  | 'spaces-complete-multipart-v2'
  | 'spaces-create-multipart-v2'
  | 'spaces-delete-object-v2'
  | 'spaces-head-object-v2'
  | 'spaces-list-objects-v2'
  | 'spaces-put-object-v2'
  | 'spaces-upload-part-v2';

export type AdapterCapabilityRepoRelativePath = string;

export type AdapterCapabilityRfc3339 = string;

export type AdapterCapabilitySemver = string;

export type AdapterCapabilitySemverRange = string;

export type AdapterCapabilitySlug = string;

export type AdapterCapabilitySpacesBucket = string;

export type AdapterCapabilitySpacesControlPlaneBinding = Readonly<{
  readonly bindingDigest: AdapterCapabilityDigest;
  readonly deploymentCredentialWebsiteAccess: 'denied';
  readonly profile: 'gala-do-spaces-control-plane-binding-v2';
  readonly region: AdapterCapabilitySpacesRegion;
  readonly servedBucket: AdapterCapabilitySpacesBucket;
  readonly stagingBucket: AdapterCapabilitySpacesBucket;
  readonly stagingWebsiteConfiguration: 'absent';
  readonly websiteConfigurationDigest: AdapterCapabilityDigest;
  readonly websiteOrigin: AdapterCapabilityUrlHttps;
}>;

export type AdapterCapabilitySpacesControlPlaneRequest = Readonly<{
  readonly credentialRole: 'full-control' | 'limited-deployment';
  readonly method: 'GET';
  readonly origin: AdapterCapabilityUrlHttps;
  readonly requestTarget: '/?website=';
  readonly responseProfile:
    | 'spaces-website-configuration-v2'
    | 'spaces-website-absent-v2'
    | 'spaces-website-access-denied-v2';
  readonly target: 'served' | 'staging';
}>;

export type AdapterCapabilitySpacesControlPlaneRequestCatalog = Readonly<{
  readonly bindingDigest: AdapterCapabilityDigest;
  readonly catalogDigest: AdapterCapabilityDigest;
  readonly credentialFormatProfileDigest: AdapterCapabilityDigest;
  readonly networkBoundaryProfileDigest: AdapterCapabilityDigest;
  readonly profile: 'gala-do-spaces-control-plane-http-v2';
  readonly requests: readonly [
    AdapterCapabilitySpacesControlPlaneRequest &
      Readonly<{
        readonly credentialRole: 'full-control';
        readonly responseProfile: 'spaces-website-configuration-v2';
        readonly target: 'served';
      }>,
    AdapterCapabilitySpacesControlPlaneRequest &
      Readonly<{
        readonly credentialRole: 'full-control';
        readonly responseProfile: 'spaces-website-absent-v2';
        readonly target: 'staging';
      }>,
    AdapterCapabilitySpacesControlPlaneRequest &
      Readonly<{
        readonly credentialRole: 'limited-deployment';
        readonly responseProfile: 'spaces-website-access-denied-v2';
        readonly target: 'served';
      }>,
    AdapterCapabilitySpacesControlPlaneRequest &
      Readonly<{
        readonly credentialRole: 'limited-deployment';
        readonly responseProfile: 'spaces-website-access-denied-v2';
        readonly target: 'staging';
      }>,
  ];
  readonly responseCatalogDigest: AdapterCapabilityDigest;
  readonly tlsProfileDigest: AdapterCapabilityDigest;
}>;

export type AdapterCapabilitySpacesControlPlaneResponseCatalog = Readonly<{
  readonly catalogDigest: AdapterCapabilityDigest;
  readonly profile: 'gala-do-spaces-control-plane-responses-v2';
  readonly responseProfiles: [
    'spaces-website-configuration-v2',
    'spaces-website-absent-v2',
    'spaces-website-access-denied-v2',
  ];
}>;

export type AdapterCapabilitySpacesRegion = string;

export type AdapterCapabilitySpacesWebsiteConfiguration = Readonly<{
  readonly configurationDigest: AdapterCapabilityDigest;
  readonly errorDocumentKey: AdapterCapabilityRepoRelativePath;
  readonly indexDocumentSuffix: 'index.html';
  readonly profile: 'gala-do-spaces-website-configuration-v2';
  readonly routingRules: [];
}>;

export type AdapterCapabilityStableId = string;

export type AdapterCapabilityUnsignedDecimal = string;

export type AdapterCapabilityUrlHttps = string;

export type AdapterCapabilityUrn = string;

export type AdapterCapabilityDocument = (
  | Readonly<{
      readonly activation?: 'pointer-swap';
      readonly adapter?: AdapterCapabilityAdapterIdentity &
        Readonly<{
          readonly adapterId: 'local-directory';
        }>;
      readonly cacheInvalidation?: 'none';
      readonly concurrency?: 'expected-generation';
      readonly configuration?: {
        redirects: false;
        headers: false;
        customDomains: false;
        notFoundBehavior: false;
        immutableCaching: false;
      };
      readonly destinationKinds?: ['local-directory'];
      readonly filesystemEvidenceDigest: AdapterCapabilityDigest;
      readonly idempotencyClass?: 'observable-identity';
      readonly limits?: AdapterCapabilityFilesystemProviderLimits;
      readonly operations?: [
        'activate',
        'cleanup-staged',
        'inspect',
        'observe',
        'rollback',
        'stage',
      ];
      readonly providerInventoryAssurance?: 'complete-artifact-digest';
      readonly rollback?: 'reupload';
      readonly staging?: 'unreachable-generation';
      readonly verification?: [
        'artifact-digest',
        'generation-marker',
        'provider-state',
      ];
    }>
  | Readonly<{
      readonly activation?: 'provider-promotion';
      readonly adapter?: AdapterCapabilityAdapterIdentity &
        Readonly<{
          readonly adapterId: 'github-pages';
        }>;
      readonly cacheInvalidation?: 'none';
      readonly concurrency?: 'none';
      readonly configuration?: {
        redirects: false;
        headers: false;
        customDomains: false;
        notFoundBehavior: false;
        immutableCaching: false;
      };
      readonly destinationKinds?: ['github-pages'];
      readonly filesystemEvidenceDigest?: never;
      readonly idempotencyClass?: 'observable-identity';
      readonly limits?: AdapterCapabilityHttpProviderLimits &
        Readonly<{
          readonly managedExecutionBudget?: AdapterCapabilityManagedExecutionBudget &
            Readonly<{
              readonly spacesControlPlaneVerificationSeconds?: never;
            }>;
          readonly requestTemplateProfile?: 'gala-github-pages-http-v2';
          readonly requestTemplates?: ReadonlyArray<
            AdapterCapabilityProviderRequestTemplate &
              Readonly<{
                readonly responseProfile:
                  | 'pages-cancel-empty-v2'
                  | 'pages-create-deployment-json-v2'
                  | 'pages-deployment-status-json-v2'
                  | 'pages-site-json-v2';
              }>
          > &
            unknown;
          readonly spacesControlPlaneBindingDigest?: never;
          readonly spacesControlPlaneRequestCatalogDigest?: never;
          readonly spacesControlPlaneResponseCatalogDigest?: never;
          readonly spacesControlPlaneTlsProfileDigest?: never;
          readonly spacesWebsiteConfigurationDigest?: never;
        }>;
      readonly operations?: [
        'activate',
        'cleanup-staged',
        'inspect',
        'observe',
        'rollback',
        'stage',
      ];
      readonly providerInventoryAssurance?: 'none';
      readonly rollback?: 'reupload';
      readonly staging?: 'private';
      readonly verification?: [
        'generation-marker',
        'provider-state',
        'public-http',
      ];
    }>
  | Readonly<{
      readonly activation?: 'replace-in-place';
      readonly adapter?: AdapterCapabilityAdapterIdentity &
        Readonly<{
          readonly adapterId: 'do-spaces';
        }>;
      readonly cacheInvalidation?: 'none';
      readonly concurrency?: 'best-effort';
      readonly configuration?: {
        redirects: false;
        headers: false;
        customDomains: false;
        notFoundBehavior: true;
        immutableCaching: false;
      };
      readonly destinationKinds?: ['do-spaces'];
      readonly filesystemEvidenceDigest?: never;
      readonly idempotencyClass?: 'observable-identity';
      readonly limits?: AdapterCapabilityHttpProviderLimits &
        Readonly<{
          readonly managedExecutionBudget?: AdapterCapabilityManagedExecutionBudget &
            Readonly<{
              readonly pagesArtifactUploadSeconds?: never;
              readonly pagesArtifactVerificationSeconds?: never;
              readonly pagesCarrierConstructionSeconds?: never;
            }>;
          readonly maximumPagesArtifactBytes?: never;
          readonly maximumProviderRequestBodyBytes?: '5242880';
          readonly pagesArtifactProfile?: never;
          readonly requestTemplateProfile?: 'gala-do-spaces-sigv4-v2';
          readonly requestTemplates?: ReadonlyArray<
            AdapterCapabilityProviderRequestTemplate &
              Readonly<{
                readonly responseProfile:
                  | 'spaces-abort-multipart-v2'
                  | 'spaces-complete-multipart-v2'
                  | 'spaces-create-multipart-v2'
                  | 'spaces-delete-object-v2'
                  | 'spaces-head-object-v2'
                  | 'spaces-list-objects-v2'
                  | 'spaces-put-object-v2'
                  | 'spaces-upload-part-v2';
              }>
          > &
            unknown;
        }>;
      readonly operations?: [
        'activate',
        'cleanup-staged',
        'inspect',
        'observe',
        'rollback',
        'stage',
      ];
      readonly providerInventoryAssurance?: 'none';
      readonly rollback?: 'reupload';
      readonly staging?: 'private';
      readonly verification?: [
        'generation-marker',
        'provider-state',
        'public-http',
      ];
    }>
) &
  Readonly<{
    readonly activation:
      | 'replace-in-place'
      | 'pointer-swap'
      | 'provider-promotion'
      | 'branch-update';
    readonly adapter: AdapterCapabilityAdapterIdentity;
    readonly cacheInvalidation: 'none';
    readonly capabilityDigest: AdapterCapabilityDigest;
    readonly concurrency:
      'none' | 'best-effort' | 'expected-generation' | 'provider-etag';
    readonly configuration: AdapterCapabilityAdapterConfigurationCapabilities;
    readonly contractVersion: AdapterCapabilitySemver;
    readonly destinationKinds: ReadonlyArray<
      'local-directory' | 'github-pages' | 'do-spaces'
    >;
    readonly filesystemEvidenceDigest?: AdapterCapabilityDigest;
    readonly idempotencyClass: 'provider-key' | 'observable-identity' | 'none';
    readonly limits: AdapterCapabilityAdapterProviderLimits;
    readonly operations: ReadonlyArray<
      | 'inspect'
      | 'stage'
      | 'activate'
      | 'observe'
      | 'cleanup-staged'
      | 'rollback'
    >;
    readonly protocolRange: AdapterCapabilitySemverRange;
    readonly providerInventoryAssurance: 'none' | 'complete-artifact-digest';
    readonly rollback: 'reupload';
    readonly schemaId: 'urn:gala:schema:adapter-capability:2.0.0';
    readonly schemaVersion: '2.0.0';
    readonly staging: 'none' | 'private' | 'preview' | 'unreachable-generation';
    readonly verification: ReadonlyArray<
      | 'provider-state'
      | 'origin-http'
      | 'public-http'
      | 'artifact-digest'
      | 'generation-marker'
    >;
  }>;

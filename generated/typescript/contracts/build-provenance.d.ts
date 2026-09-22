// Generated from urn:gala:metadata:build-provenance:2.0.0; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
// Do not edit.

export type BuildProvenanceActionPinEvidence = Readonly<{
  readonly actionDefinitionDigest: BuildProvenanceDigest;
  readonly commit: BuildProvenanceGitObjectId;
  readonly use: BuildProvenanceGithubActionCoordinate;
}>;

export type BuildProvenanceArtifactLicenseConclusion = Readonly<{
  readonly artifactPath: BuildProvenanceRepoRelativePath;
  readonly licenseConcluded: string;
  readonly sourceKind: 'generated' | 'theme-passive-asset';
  readonly themeAssetPath?: BuildProvenanceRepoRelativePath;
}> &
  unknown;

export type BuildProvenanceAssertedWorkload = Readonly<{
  readonly actor: BuildProvenanceGithubActorLogin;
  readonly actorId: BuildProvenanceGithubPositiveDecimal;
  readonly callerPath: '.github/workflows/gala-publish-v2.yml';
  readonly eventName: 'create' | 'workflow_dispatch';
  readonly ref: BuildProvenanceProvenanceRef;
  readonly repository: BuildProvenanceGithubRepositoryCoordinate;
  readonly repositoryId: BuildProvenanceGithubPositiveDecimal;
  readonly repositoryOwner: BuildProvenancePlainLabel;
  readonly repositoryOwnerId: BuildProvenanceGithubPositiveDecimal;
  readonly runAttempt: number;
  readonly runId: BuildProvenanceGithubPositiveDecimal;
  readonly runNumber: BuildProvenanceGithubPositiveDecimal;
  readonly sourceCommit: BuildProvenanceGitObjectId;
  readonly verificationState: 'pending-authorize-oidc';
  readonly workflowTriggerCommit: BuildProvenanceGitObjectId;
}>;

export type BuildProvenanceBcp47 = string;

export type BuildProvenanceBuildSandboxEvidence = Readonly<{
  readonly filesystemPolicyDigest: BuildProvenanceDigest;
  readonly locale: 'C.UTF-8';
  readonly networkPolicyDigest: BuildProvenanceDigest;
  readonly nodeExecutableDigest: BuildProvenanceDigest;
  readonly nodeVersion: '24.18.0';
  readonly npmExecutableDigest: BuildProvenanceDigest;
  readonly npmVersion: '11.16.0';
  readonly runnerEnvironment: 'github-hosted';
  readonly runnerImageRelease: BuildProvenancePlainLabel;
  readonly runnerImageReleaseDigest: BuildProvenanceDigest;
  readonly sourceDateEpoch: BuildProvenanceRfc3339;
  readonly timezone: 'UTC';
}>;

export type BuildProvenanceBuildToolIdentity =
  | Readonly<{
      readonly digest: BuildProvenanceDigest;
      readonly kind: 'package';
      readonly package: BuildProvenanceNpmPackageName;
      readonly version: BuildProvenanceSemver;
    }>
  | Readonly<{
      readonly digest: BuildProvenanceDigest;
      readonly kind: 'runtime';
      readonly name: 'node' | 'npm';
      readonly version: BuildProvenanceSemver;
    }>;

export type BuildProvenanceCanonicalRoute = string;

export type BuildProvenanceDigest = string;

export type BuildProvenanceExtensionKey = string;

export type BuildProvenanceFinding = Readonly<{
  readonly code: BuildProvenancePlainLabel;
  readonly messageKey: BuildProvenancePlainLabel;
  readonly pointer: string;
  readonly severity: 'error' | 'warning' | 'info';
}>;

export type BuildProvenanceGitObjectId = string;

export type BuildProvenanceGithubActionCoordinate = string;

export type BuildProvenanceGithubActionsArtifactId = string;

export type BuildProvenanceGithubActorLogin = string;

export type BuildProvenanceGithubPositiveDecimal = string;

export type BuildProvenanceGithubRepositoryCoordinate = string;

export type BuildProvenanceGlob = string;

export type BuildProvenanceInt64 = string;

export type BuildProvenanceIsoCountry = string;

export type BuildProvenanceManifestAsset = Readonly<{
  readonly byteLength: BuildProvenanceNonNegativeInt64;
  readonly immutable: boolean;
  readonly mediaType:
    | 'text/html; charset=utf-8'
    | 'text/css; charset=utf-8'
    | 'text/plain; charset=utf-8'
    | 'application/javascript; charset=utf-8'
    | 'application/json; charset=utf-8'
    | 'application/manifest+json; charset=utf-8'
    | 'application/atom+xml; charset=utf-8'
    | 'application/rss+xml; charset=utf-8'
    | 'application/xml; charset=utf-8'
    | 'image/png'
    | 'image/jpeg'
    | 'image/webp'
    | 'image/avif'
    | 'image/svg+xml'
    | 'font/woff2'
    | 'application/octet-stream';
  readonly path: BuildProvenanceRepoRelativePath;
  readonly sha256: BuildProvenanceDigest;
}>;

export type BuildProvenanceManifestCompositionIdentity = Readonly<{
  readonly enabledModuleConfigurationDigests: [];
  readonly publisher: readonly [
    BuildProvenancePackageIdentity &
      Readonly<{
        readonly package?: '@rathnasgala2/publish-action';
      }>,
    BuildProvenancePackageIdentity &
      Readonly<{
        readonly package?: '@rathnasgala2/publish-kernel';
      }>,
    BuildProvenancePackageIdentity &
      Readonly<{
        readonly package?: '@rathnasgala2/adapter-protocol';
      }>,
    BuildProvenancePackageIdentity &
      Readonly<{
        readonly package?:
          | '@rathnasgala2/adapter-local-directory'
          | '@rathnasgala2/adapter-github-pages'
          | '@rathnasgala2/adapter-do-spaces';
      }>,
  ];
  readonly schemas: BuildProvenancePackageIdentity &
    Readonly<{
      readonly package?: '@rathnasgala2/schemas';
    }>;
  readonly template: BuildProvenancePackageIdentity &
    Readonly<{
      readonly package?: '@rathnasgala2/template';
    }>;
  readonly theme: BuildProvenancePackageIdentity &
    Readonly<{
      readonly package?:
        | '@rathnasgala2/theme-default'
        | '@rathnasgala2/theme-amaze'
        | '@rathnasgala2/theme-flashy'
        | '@rathnasgala2/theme-minimal'
        | '@rathnasgala2/theme-zebra';
    }>;
}>;

export type BuildProvenanceManifestExcludedInput = Readonly<{
  readonly path: BuildProvenanceRepoRelativePath;
  readonly reason:
    | 'not-referenced-by-build-input'
    | 'deferred-capability-absent'
    | 'non-artifact-source'
    | 'policy-excluded';
  readonly ruleId: BuildProvenancePlainLabel;
  readonly sha256: BuildProvenanceDigest;
}>;

export type BuildProvenanceManifestIncludedSource = Readonly<{
  readonly path: BuildProvenanceRepoRelativePath;
  readonly role:
    | 'publication'
    | 'author'
    | 'content'
    | 'navigation'
    | 'appearance'
    | 'asset';
  readonly sha256: BuildProvenanceDigest;
  readonly sourceRevision: BuildProvenanceGitObjectId;
}>;

export type BuildProvenanceManifestRedirect = Readonly<{
  readonly backingPath: BuildProvenanceRepoRelativePath;
  readonly sha256: BuildProvenanceDigest;
  readonly sourceRoute: BuildProvenanceCanonicalRoute;
  readonly status: 200;
  readonly targetRoute: BuildProvenanceCanonicalRoute;
}>;

export type BuildProvenanceManifestRoute = Readonly<{
  readonly byteLength: BuildProvenanceNonNegativeInt64;
  readonly interactionBearing: false;
  readonly mediaType:
    | 'text/html; charset=utf-8'
    | 'text/css; charset=utf-8'
    | 'text/plain; charset=utf-8'
    | 'application/javascript; charset=utf-8'
    | 'application/json; charset=utf-8'
    | 'application/manifest+json; charset=utf-8'
    | 'application/atom+xml; charset=utf-8'
    | 'application/rss+xml; charset=utf-8'
    | 'application/xml; charset=utf-8'
    | 'image/png'
    | 'image/jpeg'
    | 'image/webp'
    | 'image/avif'
    | 'image/svg+xml'
    | 'font/woff2'
    | 'application/octet-stream';
  readonly path: BuildProvenanceRepoRelativePath;
  readonly routeClass: 'html' | 'feed' | 'sitemap' | 'asset' | 'error';
  readonly sha256: BuildProvenanceDigest;
  readonly sourceRevision?: BuildProvenanceGitObjectId;
  readonly stableContentId?: BuildProvenanceStableId;
}>;

export type BuildProvenanceManifestSourceIdentity = Readonly<{
  readonly commit: BuildProvenanceGitObjectId;
  readonly provider: 'github';
  readonly repository: BuildProvenanceGithubRepositoryCoordinate;
  readonly repositoryId: BuildProvenanceGithubPositiveDecimal;
  readonly repositoryOwnerId: BuildProvenanceGithubPositiveDecimal;
  readonly treeDigest: BuildProvenanceDigest;
}>;

export type BuildProvenanceManifestValidationEvidence = Readonly<{
  readonly evidenceDigest: BuildProvenanceDigest;
  readonly findingCount: number;
  readonly profile: 'gala-artifact-validation-v2';
  readonly version: '2.0.0';
}>;

export type BuildProvenanceMeasurement = Readonly<{
  readonly name: BuildProvenancePlainLabel;
  readonly unit: BuildProvenancePlainLabel;
  readonly value: BuildProvenanceInt64;
}>;

export type BuildProvenanceNonNegativeInt64 = string;

export type BuildProvenanceNpmPackageName = string;

export type BuildProvenancePackageExact = string;

export type BuildProvenancePackageIdentity = Readonly<{
  readonly integrity: BuildProvenanceDigest;
  readonly package: BuildProvenanceNpmPackageName;
  readonly registry: BuildProvenanceUrlHttps;
  readonly version: BuildProvenanceSemver;
}>;

export type BuildProvenancePackageRange = string;

export type BuildProvenancePassiveVisualToken = never;

export type BuildProvenancePlainLabel = string;

export type BuildProvenancePlainText = string;

export type BuildProvenancePositiveInt64 = string;

export type BuildProvenanceProvenanceRef = string;

export type BuildProvenanceRenderPolicyIdentity = Readonly<{
  readonly digest: BuildProvenanceDigest;
  readonly name: 'gala-render-policy';
  readonly version: BuildProvenanceSemver;
}>;

export type BuildProvenanceRepoRelativePath = string;

export type BuildProvenanceReproducibleBuildRecord = Readonly<{
  readonly basePath: BuildProvenanceCanonicalRoute;
  readonly baseUrl: BuildProvenanceUrlHttps;
  readonly buildEpoch: BuildProvenanceRfc3339;
  readonly buildInputDigest: BuildProvenanceDigest;
  readonly buildPolicyDecisionDigest: BuildProvenanceDigest;
  readonly builder: BuildProvenancePackageIdentity &
    Readonly<{
      readonly package?: '@rathnasgala2/publish-action';
    }>;
  readonly contractVersion: '2.0.0';
  readonly dependencyLockDigest: BuildProvenanceDigest;
  readonly destinationCapabilityDigest: BuildProvenanceDigest;
  readonly packageReleaseCatalogDigest: BuildProvenanceDigest;
  readonly policyReleaseId: BuildProvenanceStableId;
  readonly renderPolicy: BuildProvenanceRenderPolicyIdentity;
  readonly repositoryId: BuildProvenanceGithubPositiveDecimal;
  readonly repositoryRootDigest: BuildProvenanceDigest;
  readonly schemas: BuildProvenancePackageIdentity &
    Readonly<{
      readonly package?: '@rathnasgala2/schemas';
    }>;
  readonly sourceCommit: BuildProvenanceGitObjectId;
  readonly sourceTree: BuildProvenanceGitObjectId;
  readonly stylingContractDigest: BuildProvenanceDigest;
  readonly template: BuildProvenancePackageIdentity &
    Readonly<{
      readonly package?: '@rathnasgala2/template';
    }>;
  readonly theme: BuildProvenancePackageIdentity &
    Readonly<{
      readonly package?:
        | '@rathnasgala2/theme-default'
        | '@rathnasgala2/theme-amaze'
        | '@rathnasgala2/theme-flashy'
        | '@rathnasgala2/theme-minimal'
        | '@rathnasgala2/theme-zebra';
    }>;
  readonly workflowIdentity: BuildProvenanceDigest;
}>;

export type BuildProvenanceRfc3339 = string;

export type BuildProvenanceSemver = string;

export type BuildProvenanceSemverRange = string;

export type BuildProvenanceSlug = string;

export type BuildProvenanceSpdxExpression = string;

export type BuildProvenanceStableId = string;

export type BuildProvenanceUrlHttps = string;

export type BuildProvenanceUrn = string;

export type BuildProvenanceWorkflowCarrierEvidence = Readonly<{
  readonly artifactId: BuildProvenanceGithubActionsArtifactId;
  readonly byteCount: BuildProvenanceNonNegativeInt64;
  readonly digest: BuildProvenanceDigest;
  readonly expiresAt: BuildProvenanceRfc3339;
  readonly name: BuildProvenancePlainLabel;
  readonly purpose: 'verified-inputs' | 'unfrozen-output';
}>;

export type BuildProvenanceWorkflowFileEvidence = Readonly<{
  readonly commit: BuildProvenanceGitObjectId;
  readonly fileDigest: BuildProvenanceDigest;
  readonly identitySource: 'declared-graph' | 'locked-release';
  readonly path: BuildProvenanceRepoRelativePath;
  readonly repositoryId: BuildProvenanceGithubPositiveDecimal;
  readonly role: 'author-caller' | 'publish' | 'authorize' | 'report';
}>;

export type BuildProvenanceDocument = Readonly<{
  readonly actionPins: ReadonlyArray<BuildProvenanceActionPinEvidence>;
  readonly artifactDigest: BuildProvenanceDigest;
  readonly artifactId: BuildProvenanceStableId;
  readonly artifactLicenseConclusions: ReadonlyArray<BuildProvenanceArtifactLicenseConclusion>;
  readonly assertedWorkload: BuildProvenanceAssertedWorkload;
  readonly buildInputDigest: BuildProvenanceDigest;
  readonly buildPolicyDecisionDigest: BuildProvenanceDigest;
  readonly capabilityDecisionDigest: BuildProvenanceDigest;
  readonly lockDigest: BuildProvenanceDigest;
  readonly manifestDigest: BuildProvenanceDigest;
  readonly packageReleaseCatalogDigest: BuildProvenanceDigest;
  readonly policyReleaseId: BuildProvenanceStableId;
  readonly rebuildRecord: BuildProvenanceReproducibleBuildRecord;
  readonly renderPolicy: BuildProvenanceRenderPolicyIdentity;
  readonly requiredOidcClaims: [
    'actor',
    'actor_id',
    'aud',
    'event_name',
    'iss',
    'job_workflow_ref',
    'job_workflow_sha',
    'jti',
    'ref',
    'repository',
    'repository_id',
    'repository_owner',
    'repository_owner_id',
    'run_attempt',
    'run_id',
    'run_number',
    'runner_environment',
    'sha',
    'sub',
    'workflow_ref',
    'workflow_sha',
  ];
  readonly sandbox: BuildProvenanceBuildSandboxEvidence;
  readonly sbomDigest: BuildProvenanceDigest;
  readonly schemaId: 'urn:gala:metadata:build-provenance:2.0.0';
  readonly schemaVersion: '2.0.0';
  readonly secretInputs: [];
  readonly spdx23JsonSchemaDigest: BuildProvenanceDigest;
  readonly spdxLicenseListDigest: BuildProvenanceDigest;
  readonly spdxLicenseListVersion: BuildProvenanceSemver;
  readonly stylingContractDigest: BuildProvenanceDigest;
  readonly unfrozenOutputHandoff: BuildProvenanceWorkflowCarrierEvidence &
    Readonly<{
      readonly purpose?: 'unfrozen-output';
    }>;
  readonly verifiedInputHandoff: BuildProvenanceWorkflowCarrierEvidence &
    Readonly<{
      readonly purpose?: 'verified-inputs';
    }>;
  readonly workflowFiles: readonly [
    BuildProvenanceWorkflowFileEvidence &
      Readonly<{
        readonly identitySource?: 'declared-graph';
        readonly path?: '.github/workflows/gala-publish-v2.yml';
        readonly role?: 'author-caller';
      }>,
    BuildProvenanceWorkflowFileEvidence &
      Readonly<{
        readonly identitySource?: 'locked-release';
        readonly path?: '.github/workflows/publish-v2.yml';
        readonly role?: 'publish';
      }>,
    BuildProvenanceWorkflowFileEvidence &
      Readonly<{
        readonly identitySource?: 'locked-release';
        readonly path?: '.github/workflows/authorize-v2.yml';
        readonly role?: 'authorize';
      }>,
    BuildProvenanceWorkflowFileEvidence &
      Readonly<{
        readonly identitySource?: 'locked-release';
        readonly path?: '.github/workflows/report-v2.yml';
        readonly role?: 'report';
      }>,
  ];
}>;

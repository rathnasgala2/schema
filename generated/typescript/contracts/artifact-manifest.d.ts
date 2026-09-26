// Generated from urn:gala:schema:artifact-manifest:2.0.0; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
// Do not edit.

export type ArtifactManifestActionPinEvidence = Readonly<{
  readonly actionDefinitionDigest: ArtifactManifestDigest;
  readonly commit: ArtifactManifestGitObjectId;
  readonly use: ArtifactManifestGithubActionCoordinate;
}>;

export type ArtifactManifestArtifactLicenseConclusion = Readonly<{
  readonly artifactPath: ArtifactManifestRepoRelativePath;
  readonly licenseConcluded: string;
  readonly sourceKind: 'generated' | 'theme-passive-asset';
  readonly themeAssetPath?: ArtifactManifestRepoRelativePath;
}> &
  unknown;

export type ArtifactManifestAssertedWorkload = Readonly<{
  readonly actor: ArtifactManifestGithubActorLogin;
  readonly actorId: ArtifactManifestGithubPositiveDecimal;
  readonly callerPath: '.github/workflows/gala-publish-v2.yml';
  readonly eventName: 'create' | 'workflow_dispatch';
  readonly ref: ArtifactManifestProvenanceRef;
  readonly repository: ArtifactManifestGithubRepositoryCoordinate;
  readonly repositoryId: ArtifactManifestGithubPositiveDecimal;
  readonly repositoryOwner: ArtifactManifestPlainLabel;
  readonly repositoryOwnerId: ArtifactManifestGithubPositiveDecimal;
  readonly runAttempt: number;
  readonly runId: ArtifactManifestGithubPositiveDecimal;
  readonly runNumber: ArtifactManifestGithubPositiveDecimal;
  readonly sourceCommit: ArtifactManifestGitObjectId;
  readonly verificationState: 'pending-authorize-oidc';
  readonly workflowTriggerCommit: ArtifactManifestGitObjectId;
}>;

export type ArtifactManifestBcp47 = string;

export type ArtifactManifestBuildSandboxEvidence = Readonly<{
  readonly filesystemPolicyDigest: ArtifactManifestDigest;
  readonly locale: 'C.UTF-8';
  readonly networkPolicyDigest: ArtifactManifestDigest;
  readonly nodeExecutableDigest: ArtifactManifestDigest;
  readonly nodeVersion: '24.18.0';
  readonly npmExecutableDigest: ArtifactManifestDigest;
  readonly npmVersion: '11.16.0';
  readonly runnerEnvironment: 'github-hosted';
  readonly runnerImageRelease: ArtifactManifestPlainLabel;
  readonly runnerImageReleaseDigest: ArtifactManifestDigest;
  readonly sourceDateEpoch: ArtifactManifestRfc3339;
  readonly timezone: 'UTC';
}>;

export type ArtifactManifestBuildToolIdentity =
  | Readonly<{
      readonly digest: ArtifactManifestDigest;
      readonly kind: 'package';
      readonly package: ArtifactManifestNpmPackageName;
      readonly version: ArtifactManifestSemver;
    }>
  | Readonly<{
      readonly digest: ArtifactManifestDigest;
      readonly kind: 'runtime';
      readonly name: 'node' | 'npm';
      readonly version: ArtifactManifestSemver;
    }>;

export type ArtifactManifestCanonicalRoute = string;

export type ArtifactManifestDigest = string;

export type ArtifactManifestExtensionKey = string;

export type ArtifactManifestFinding = Readonly<{
  readonly code: ArtifactManifestPlainLabel;
  readonly messageKey: ArtifactManifestPlainLabel;
  readonly pointer: string;
  readonly severity: 'error' | 'warning' | 'info';
}>;

export type ArtifactManifestGitObjectId = string;

export type ArtifactManifestGithubActionCoordinate = string;

export type ArtifactManifestGithubActionsArtifactId =
  ArtifactManifestGithubPositiveDecimal;

export type ArtifactManifestGithubActorLogin = string;

export type ArtifactManifestGithubPositiveDecimal = string;

export type ArtifactManifestGithubRepositoryCoordinate = string;

export type ArtifactManifestGlob = string;

export type ArtifactManifestInt64 = string;

export type ArtifactManifestIsoCountry = string;

export type ArtifactManifestManifestAsset = Readonly<{
  readonly byteLength: ArtifactManifestNonNegativeInt64;
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
  readonly path: ArtifactManifestRepoRelativePath;
  readonly sha256: ArtifactManifestDigest;
}>;

export type ArtifactManifestManifestCompositionIdentity = Readonly<{
  readonly enabledModuleConfigurationDigests: [];
  readonly publisher: readonly [
    ArtifactManifestPackageIdentity &
      Readonly<{
        readonly package?: '@rathnasgala2/publish-action';
      }>,
    ArtifactManifestPackageIdentity &
      Readonly<{
        readonly package?: '@rathnasgala2/publish-kernel';
      }>,
    ArtifactManifestPackageIdentity &
      Readonly<{
        readonly package?: '@rathnasgala2/adapter-protocol';
      }>,
    ArtifactManifestPackageIdentity &
      Readonly<{
        readonly package?:
          | '@rathnasgala2/adapter-local-directory'
          | '@rathnasgala2/adapter-github-pages'
          | '@rathnasgala2/adapter-do-spaces';
      }>,
  ];
  readonly schemas: ArtifactManifestPackageIdentity &
    Readonly<{
      readonly package?: '@rathnasgala2/schemas';
    }>;
  readonly template: ArtifactManifestPackageIdentity &
    Readonly<{
      readonly package?: '@rathnasgala2/template';
    }>;
  readonly theme: ArtifactManifestPackageIdentity &
    Readonly<{
      readonly package?:
        | '@rathnasgala2/theme-default'
        | '@rathnasgala2/theme-amaze'
        | '@rathnasgala2/theme-flashy'
        | '@rathnasgala2/theme-minimal'
        | '@rathnasgala2/theme-zebra';
    }>;
}>;

export type ArtifactManifestManifestExcludedInput = Readonly<{
  readonly path: ArtifactManifestRepoRelativePath;
  readonly reason:
    | 'not-referenced-by-build-input'
    | 'deferred-capability-absent'
    | 'non-artifact-source'
    | 'policy-excluded';
  readonly ruleId: ArtifactManifestPlainLabel;
  readonly sha256: ArtifactManifestDigest;
}>;

export type ArtifactManifestManifestIncludedSource = Readonly<{
  readonly path: ArtifactManifestRepoRelativePath;
  readonly role:
    | 'publication'
    | 'author'
    | 'content'
    | 'navigation'
    | 'appearance'
    | 'asset';
  readonly sha256: ArtifactManifestDigest;
  readonly sourceRevision: ArtifactManifestGitObjectId;
}>;

export type ArtifactManifestManifestRedirect = Readonly<{
  readonly backingPath: ArtifactManifestRepoRelativePath;
  readonly sha256: ArtifactManifestDigest;
  readonly sourceRoute: ArtifactManifestCanonicalRoute;
  readonly status: 200;
  readonly targetRoute: ArtifactManifestCanonicalRoute;
}>;

export type ArtifactManifestManifestRenderPolicyIdentity = Readonly<{
  readonly digest: ArtifactManifestDigest;
  readonly name: 'gala-render-policy';
  readonly version: ArtifactManifestSemver;
}>;

export type ArtifactManifestManifestReproducibleBuildRecord = Readonly<{
  readonly basePath: ArtifactManifestCanonicalRoute;
  readonly baseUrl: ArtifactManifestUrlHttps;
  readonly buildEpoch: ArtifactManifestRfc3339;
  readonly buildInputDigest: ArtifactManifestDigest;
  readonly buildPolicyDecisionDigest: ArtifactManifestDigest;
  readonly builder: ArtifactManifestPackageIdentity &
    Readonly<{
      readonly package?: '@rathnasgala2/publish-action';
    }>;
  readonly contractVersion: '2.0.0';
  readonly dependencyLockDigest: ArtifactManifestDigest;
  readonly destinationCapabilityDigest: ArtifactManifestDigest;
  readonly packageReleaseCatalogDigest: ArtifactManifestDigest;
  readonly policyReleaseId: ArtifactManifestStableId;
  readonly renderPolicy: ArtifactManifestManifestRenderPolicyIdentity;
  readonly repositoryId: ArtifactManifestGithubPositiveDecimal;
  readonly repositoryRootDigest: ArtifactManifestDigest;
  readonly schemas: ArtifactManifestPackageIdentity &
    Readonly<{
      readonly package?: '@rathnasgala2/schemas';
    }>;
  readonly sourceCommit: ArtifactManifestGitObjectId;
  readonly sourceTree: ArtifactManifestGitObjectId;
  readonly stylingContractDigest: ArtifactManifestDigest;
  readonly template: ArtifactManifestPackageIdentity &
    Readonly<{
      readonly package?: '@rathnasgala2/template';
    }>;
  readonly theme: ArtifactManifestPackageIdentity &
    Readonly<{
      readonly package?:
        | '@rathnasgala2/theme-default'
        | '@rathnasgala2/theme-amaze'
        | '@rathnasgala2/theme-flashy'
        | '@rathnasgala2/theme-minimal'
        | '@rathnasgala2/theme-zebra';
    }>;
  readonly workflowIdentity: ArtifactManifestDigest;
}>;

export type ArtifactManifestManifestRoute = Readonly<{
  readonly byteLength: ArtifactManifestNonNegativeInt64;
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
  readonly path: ArtifactManifestRepoRelativePath;
  readonly routeClass: 'html' | 'feed' | 'sitemap' | 'asset' | 'error';
  readonly sha256: ArtifactManifestDigest;
  readonly sourceRevision?: ArtifactManifestGitObjectId;
  readonly stableContentId?: ArtifactManifestStableId;
}>;

export type ArtifactManifestManifestSourceIdentity = Readonly<{
  readonly commit: ArtifactManifestGitObjectId;
  readonly provider: 'github';
  readonly repository: ArtifactManifestGithubRepositoryCoordinate;
  readonly repositoryId: ArtifactManifestGithubPositiveDecimal;
  readonly repositoryOwnerId: ArtifactManifestGithubPositiveDecimal;
  readonly treeDigest: ArtifactManifestDigest;
}>;

export type ArtifactManifestManifestValidationEvidence = Readonly<{
  readonly evidenceDigest: ArtifactManifestDigest;
  readonly findingCount: number;
  readonly profile: 'gala-artifact-validation-v2';
  readonly version: '2.0.0';
}>;

export type ArtifactManifestMeasurement = Readonly<{
  readonly name: ArtifactManifestPlainLabel;
  readonly unit: ArtifactManifestPlainLabel;
  readonly value: ArtifactManifestInt64;
}>;

export type ArtifactManifestNonNegativeInt64 = string;

export type ArtifactManifestNpmPackageName = string;

export type ArtifactManifestPackageExact = string;

export type ArtifactManifestPackageIdentity = Readonly<{
  readonly integrity: ArtifactManifestDigest;
  readonly package: ArtifactManifestNpmPackageName;
  readonly registry: ArtifactManifestUrlHttps;
  readonly version: ArtifactManifestSemver;
}>;

export type ArtifactManifestPackageRange = string;

export type ArtifactManifestPassiveVisualToken = never;

export type ArtifactManifestPlainLabel = string;

export type ArtifactManifestPlainText = string;

export type ArtifactManifestPositiveInt64 = string;

export type ArtifactManifestProvenanceRef = string;

export type ArtifactManifestRepoRelativePath = string;

export type ArtifactManifestRfc3339 = string;

export type ArtifactManifestSemver = string;

export type ArtifactManifestSemverRange = string;

export type ArtifactManifestSlug = string;

export type ArtifactManifestSpdxExpression = string;

export type ArtifactManifestStableId = string;

export type ArtifactManifestUrlHttps = string;

export type ArtifactManifestUrn = string;

export type ArtifactManifestWorkflowCarrierEvidence = Readonly<{
  readonly artifactId: ArtifactManifestGithubActionsArtifactId;
  readonly byteCount: ArtifactManifestNonNegativeInt64;
  readonly digest: ArtifactManifestDigest;
  readonly expiresAt: ArtifactManifestRfc3339;
  readonly name: ArtifactManifestPlainLabel;
  readonly purpose: 'verified-inputs' | 'unfrozen-output';
}>;

export type ArtifactManifestWorkflowFileEvidence = Readonly<{
  readonly commit: ArtifactManifestGitObjectId;
  readonly fileDigest: ArtifactManifestDigest;
  readonly identitySource: 'declared-graph' | 'locked-release';
  readonly path: ArtifactManifestRepoRelativePath;
  readonly repositoryId: ArtifactManifestGithubPositiveDecimal;
  readonly role: 'author-caller' | 'publish' | 'authorize' | 'report';
}>;

export type ArtifactManifestDocument = Readonly<{
  readonly artifactByteCount: ArtifactManifestPositiveInt64;
  readonly artifactDigest: ArtifactManifestDigest;
  readonly artifactFileCount: ArtifactManifestPositiveInt64;
  readonly artifactId: ArtifactManifestStableId;
  readonly assets: ReadonlyArray<ArtifactManifestManifestAsset>;
  readonly buildInputContractVersion: '2.0.0';
  readonly buildInputDigest: ArtifactManifestDigest;
  readonly buildToolVersions: ReadonlyArray<ArtifactManifestBuildToolIdentity>;
  readonly builder: ArtifactManifestPackageIdentity &
    Readonly<{
      readonly package?: '@rathnasgala2/publish-action';
    }>;
  readonly composition: ArtifactManifestManifestCompositionIdentity;
  readonly declarativeHeaders: [];
  readonly excludedInputs: ReadonlyArray<ArtifactManifestManifestExcludedInput>;
  readonly findings: ReadonlyArray<ArtifactManifestFinding>;
  readonly generatedAt: ArtifactManifestRfc3339;
  readonly includedSources: ReadonlyArray<ArtifactManifestManifestIncludedSource>;
  readonly manifestDigest: ArtifactManifestDigest;
  readonly measurements: ReadonlyArray<ArtifactManifestMeasurement>;
  readonly policyResult: 'pass' | 'pass-with-warnings' | 'fail';
  readonly redirects: ReadonlyArray<ArtifactManifestManifestRedirect>;
  readonly repositoryNodeId: ArtifactManifestGithubPositiveDecimal;
  readonly reproducibilityClass: 'byte-identical' | 'normalized-equivalent';
  readonly routes: ReadonlyArray<ArtifactManifestManifestRoute>;
  readonly schemaId: 'urn:gala:schema:artifact-manifest:2.0.0';
  readonly schemaVersion: '2.0.0';
  readonly sourceCommit: ArtifactManifestGitObjectId;
  readonly sourceIdentity: ArtifactManifestManifestSourceIdentity;
  readonly sourceInventoryDigest: ArtifactManifestDigest;
  readonly validation: ArtifactManifestManifestValidationEvidence;
  readonly workflowIdentity: ArtifactManifestDigest;
}>;

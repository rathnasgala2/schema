// Generated from urn:gala:schema:lock:2.0.0; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
// Do not edit.

export type LockBcp47 = string;

export type LockCanonicalRoute = string;

export type LockDependencyEdge = Readonly<{
  readonly from: LockPackageExact;
  readonly to: LockPackageExact;
}>;

export type LockDigest = string;

export type LockExtensionKey = string;

export type LockGitObjectId = string;

export type LockGlob = string;

export type LockIsoCountry = string;

export type LockLockedPackage = Readonly<{
  readonly compatibleWith: LockSemverRange;
  readonly contractVersion: LockSemver;
  readonly integrity: LockDigest;
  readonly package: LockNpmPackageName;
  readonly registry: LockUrlHttps;
  readonly version: LockSemver;
}>;

export type LockLockedTemplate = Readonly<{
  readonly compatibleWith: LockSemverRange;
  readonly contractVersion: LockSemver;
  readonly integrity: LockDigest;
  readonly package: LockNpmPackageName;
  readonly registry: LockUrlHttps;
  readonly templateModules: [];
  readonly version: LockSemver;
}>;

export type LockNpmPackageName = string;

export type LockPackageExact = string;

export type LockPackageIdentity = Readonly<{
  readonly integrity: LockDigest;
  readonly package: LockNpmPackageName;
  readonly registry: LockUrlHttps;
  readonly version: LockSemver;
}>;

export type LockPackageRange = string;

export type LockPassiveVisualToken = never;

export type LockPlainLabel = string;

export type LockPlainText = string;

export type LockRepoRelativePath = string;

export type LockRfc3339 = string;

export type LockSemver = string;

export type LockSemverRange = string;

export type LockSlug = string;

export type LockStableId = string;

export type LockUrlHttps = string;

export type LockUrn = string;

export type LockDocument = Readonly<{
  readonly dependencies: ReadonlyArray<LockPackageIdentity>;
  readonly dependencyDag: ReadonlyArray<LockDependencyEdge>;
  readonly lockDigest: LockDigest;
  readonly publisher: readonly [
    LockLockedPackage &
      Readonly<{
        readonly package?: '@rathnasgala2/publish-action';
      }>,
    LockLockedPackage &
      Readonly<{
        readonly package?: '@rathnasgala2/publish-kernel';
      }>,
    LockLockedPackage &
      Readonly<{
        readonly package?: '@rathnasgala2/adapter-protocol';
      }>,
    LockLockedPackage &
      Readonly<{
        readonly package?:
          | '@rathnasgala2/adapter-local-directory'
          | '@rathnasgala2/adapter-github-pages'
          | '@rathnasgala2/adapter-do-spaces';
      }>,
  ];
  readonly repositorySchemaVersion: LockSemver;
  readonly resolvedAt: LockRfc3339;
  readonly resolver: LockPackageIdentity &
    Readonly<{
      readonly package?: '@rathnasgala2/publish-action';
    }>;
  readonly schemaId: 'urn:gala:schema:lock:2.0.0';
  readonly schemaVersion: '2.0.0';
  readonly schemas: LockLockedPackage &
    Readonly<{
      readonly package?: '@rathnasgala2/schemas';
    }>;
  readonly template: LockLockedTemplate &
    Readonly<{
      readonly package?: '@rathnasgala2/template';
    }>;
  readonly theme: LockLockedPackage &
    Readonly<{
      readonly package?:
        | '@rathnasgala2/theme-default'
        | '@rathnasgala2/theme-amaze'
        | '@rathnasgala2/theme-flashy'
        | '@rathnasgala2/theme-minimal'
        | '@rathnasgala2/theme-zebra';
    }>;
}>;

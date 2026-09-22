// Generated from urn:gala:schema:problem:2.0.0; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
// Do not edit.

export type ProblemBcp47 = string;

export type ProblemCanonicalRoute = string;

export type ProblemDigest = string;

export type ProblemExtensionKey = string;

export type ProblemFieldError = Readonly<{
  readonly code: ProblemProblemCode;
  readonly pointer: string;
}>;

export type ProblemGitObjectId = string;

export type ProblemGlob = string;

export type ProblemIsoCountry = string;

export type ProblemPackageExact = string;

export type ProblemPackageRange = string;

export type ProblemPassiveVisualToken = never;

export type ProblemPlainLabel = string;

export type ProblemPlainText = string;

export type ProblemProblemCode = ProblemPlainLabel & string;

export type ProblemProblemHttpsType = ProblemUrlHttps & string;

export type ProblemProblemType = ProblemProblemHttpsType | ProblemProblemUrn;

export type ProblemProblemUrn = string;

export type ProblemRepoRelativePath = string;

export type ProblemRfc3339 = string;

export type ProblemSemver = string;

export type ProblemSemverRange = string;

export type ProblemSlug = string;

export type ProblemStableId = string;

export type ProblemUrlHttps = string;

export type ProblemUrn = string;

export type ProblemDocument = Readonly<{
  readonly code: ProblemProblemCode;
  readonly correlationId: ProblemStableId;
  readonly detail: ProblemPlainText;
  readonly errors: ReadonlyArray<ProblemFieldError>;
  readonly instance?: ProblemCanonicalRoute;
  readonly operationId?: ProblemStableId;
  readonly retryable: boolean;
  readonly schemaId: 'urn:gala:schema:problem:2.0.0';
  readonly schemaVersion: '2.0.0';
  readonly status: number;
  readonly title: ProblemPlainText;
  readonly type: ProblemProblemType;
}>;

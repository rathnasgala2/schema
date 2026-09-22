// Generated contract API; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
// Do not edit.

import type { GalaValidationResult } from '../../types/internal/schema-validator.js';

export type GeneratedValidationResult = GalaValidationResult &
  Readonly<{
    structuralValid: boolean;
  }>;

export declare const GENERATED_SCHEMA_IDS: readonly string[];
export declare function validateGeneratedDocument(
  schemaId: string,
  value: unknown,
): GeneratedValidationResult;

export type { AdapterCapabilityDocument } from './contracts/adapter-capability.js';
export declare function isAdapterCapabilityDocument(
  value: unknown,
): value is import('./contracts/adapter-capability.js').AdapterCapabilityDocument;
export type { AppearanceDocument } from './contracts/appearance.js';
export declare function isAppearanceDocument(
  value: unknown,
): value is import('./contracts/appearance.js').AppearanceDocument;
export type { ArtifactManifestDocument } from './contracts/artifact-manifest.js';
export declare function isArtifactManifestDocument(
  value: unknown,
): value is import('./contracts/artifact-manifest.js').ArtifactManifestDocument;
export type { AuthorDocument } from './contracts/author.js';
export declare function isAuthorDocument(
  value: unknown,
): value is import('./contracts/author.js').AuthorDocument;
export type { BuildInputDocument } from './contracts/build-input.js';
export declare function isBuildInputDocument(
  value: unknown,
): value is import('./contracts/build-input.js').BuildInputDocument;
export type { BuildProvenanceDocument } from './contracts/build-provenance.js';
export declare function isBuildProvenanceDocument(
  value: unknown,
): value is import('./contracts/build-provenance.js').BuildProvenanceDocument;
export type { ContentFrontmatterDocument } from './contracts/content-frontmatter.js';
export declare function isContentFrontmatterDocument(
  value: unknown,
): value is import('./contracts/content-frontmatter.js').ContentFrontmatterDocument;
export type { DeploymentIntentDocument } from './contracts/deployment-intent.js';
export declare function isDeploymentIntentDocument(
  value: unknown,
): value is import('./contracts/deployment-intent.js').DeploymentIntentDocument;
export type { DeploymentObservationDocument } from './contracts/deployment-observation.js';
export declare function isDeploymentObservationDocument(
  value: unknown,
): value is import('./contracts/deployment-observation.js').DeploymentObservationDocument;
export type { DeploymentReceiptDocument } from './contracts/deployment-receipt.js';
export declare function isDeploymentReceiptDocument(
  value: unknown,
): value is import('./contracts/deployment-receipt.js').DeploymentReceiptDocument;
export type { EventEnvelopeDocument } from './contracts/event-envelope.js';
export declare function isEventEnvelopeDocument(
  value: unknown,
): value is import('./contracts/event-envelope.js').EventEnvelopeDocument;
export type { LockDocument } from './contracts/lock.js';
export declare function isLockDocument(
  value: unknown,
): value is import('./contracts/lock.js').LockDocument;
export type { NavigationDocument } from './contracts/navigation.js';
export declare function isNavigationDocument(
  value: unknown,
): value is import('./contracts/navigation.js').NavigationDocument;
export type { ProblemDocument } from './contracts/problem.js';
export declare function isProblemDocument(
  value: unknown,
): value is import('./contracts/problem.js').ProblemDocument;
export type { PublicGenerationMarkerDocument } from './contracts/public-generation-marker.js';
export declare function isPublicGenerationMarkerDocument(
  value: unknown,
): value is import('./contracts/public-generation-marker.js').PublicGenerationMarkerDocument;
export type { PublicRuntimeOriginsDocument } from './contracts/public-runtime-origins.js';
export declare function isPublicRuntimeOriginsDocument(
  value: unknown,
): value is import('./contracts/public-runtime-origins.js').PublicRuntimeOriginsDocument;
export type { PublicationDocument } from './contracts/publication.js';
export declare function isPublicationDocument(
  value: unknown,
): value is import('./contracts/publication.js').PublicationDocument;
export type { RepositoryDocument } from './contracts/repository.js';
export declare function isRepositoryDocument(
  value: unknown,
): value is import('./contracts/repository.js').RepositoryDocument;
export type { TemplateCompositionDocument } from './contracts/template-composition.js';
export declare function isTemplateCompositionDocument(
  value: unknown,
): value is import('./contracts/template-composition.js').TemplateCompositionDocument;
export type { ThemeContractDocument } from './contracts/theme-contract.js';
export declare function isThemeContractDocument(
  value: unknown,
): value is import('./contracts/theme-contract.js').ThemeContractDocument;

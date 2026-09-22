// Generated contract API; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
// Do not edit.

import { createRequire } from 'node:module';
import { validateGalaDocument } from '../../src/index.js';

const require = createRequire(import.meta.url);
const CORE_PATH = './validator-core.cjs';
/** @type {Record<string, (value: unknown) => boolean>} */
const core = require(CORE_PATH);
const SCHEMA_IDS = [
  'urn:gala:schema:adapter-capability:2.0.0',
  'urn:gala:schema:appearance:2.0.0',
  'urn:gala:schema:artifact-manifest:2.0.0',
  'urn:gala:schema:author:2.0.0',
  'urn:gala:schema:build-input:2.0.0',
  'urn:gala:metadata:build-provenance:2.0.0',
  'urn:gala:schema:content-frontmatter:2.0.0',
  'urn:gala:schema:deployment-intent:2.0.0',
  'urn:gala:schema:deployment-observation:2.0.0',
  'urn:gala:schema:deployment-receipt:2.0.0',
  'urn:gala:schema:event-envelope:2.0.0',
  'urn:gala:schema:lock:2.0.0',
  'urn:gala:schema:navigation:2.0.0',
  'urn:gala:schema:problem:2.0.0',
  'urn:gala:schema:public-generation-marker:2.0.0',
  'urn:gala:schema:public-runtime-origins:2.0.0',
  'urn:gala:schema:publication:2.0.0',
  'urn:gala:schema:repository:2.0.0',
  'urn:gala:schema:template-composition:2.0.0',
  'urn:gala:schema:theme-contract:2.0.0',
];
const STRUCTURAL_VALIDATORS = Object.freeze({
  'urn:gala:schema:adapter-capability:2.0.0': core.validateAdapterCapability,
  'urn:gala:schema:appearance:2.0.0': core.validateAppearance,
  'urn:gala:schema:artifact-manifest:2.0.0': core.validateArtifactManifest,
  'urn:gala:schema:author:2.0.0': core.validateAuthor,
  'urn:gala:schema:build-input:2.0.0': core.validateBuildInput,
  'urn:gala:metadata:build-provenance:2.0.0': core.validateBuildProvenance,
  'urn:gala:schema:content-frontmatter:2.0.0': core.validateContentFrontmatter,
  'urn:gala:schema:deployment-intent:2.0.0': core.validateDeploymentIntent,
  'urn:gala:schema:deployment-observation:2.0.0':
    core.validateDeploymentObservation,
  'urn:gala:schema:deployment-receipt:2.0.0': core.validateDeploymentReceipt,
  'urn:gala:schema:event-envelope:2.0.0': core.validateEventEnvelope,
  'urn:gala:schema:lock:2.0.0': core.validateLock,
  'urn:gala:schema:navigation:2.0.0': core.validateNavigation,
  'urn:gala:schema:problem:2.0.0': core.validateProblem,
  'urn:gala:schema:public-generation-marker:2.0.0':
    core.validatePublicGenerationMarker,
  'urn:gala:schema:public-runtime-origins:2.0.0':
    core.validatePublicRuntimeOrigins,
  'urn:gala:schema:publication:2.0.0': core.validatePublication,
  'urn:gala:schema:repository:2.0.0': core.validateRepository,
  'urn:gala:schema:template-composition:2.0.0':
    core.validateTemplateComposition,
  'urn:gala:schema:theme-contract:2.0.0': core.validateThemeContract,
});

/** Exact immutable schema identities represented by generated root types. */
export const GENERATED_SCHEMA_IDS = Object.freeze(SCHEMA_IDS);

/**
 * Validate one generated root through the standalone structural core and
 * Galascribe's exact semantic validator.
 *
 * @param {string} schemaId exact immutable schema identity
 * @param {unknown} value candidate document
 * @returns {Readonly<import('../../src/internal/schema-validator.js').GalaValidationResult & {structuralValid: boolean}>} stable result
 */
export function validateGeneratedDocument(schemaId, value) {
  const structural = STRUCTURAL_VALIDATORS[schemaId];
  const structuralValid = structural?.(value) ?? false;
  const exactResult = validateGalaDocument(schemaId, value);
  return Object.freeze({
    ...exactResult,
    structuralValid,
    valid: structuralValid && exactResult.valid,
  });
}

/**
 * Test whether a value is a valid AdapterCapabilityDocument.
 *
 * @param {unknown} value candidate document
 * @returns {boolean} validation result
 */
export function isAdapterCapabilityDocument(value) {
  return validateGeneratedDocument(
    'urn:gala:schema:adapter-capability:2.0.0',
    value,
  ).valid;
}

/**
 * Test whether a value is a valid AppearanceDocument.
 *
 * @param {unknown} value candidate document
 * @returns {boolean} validation result
 */
export function isAppearanceDocument(value) {
  return validateGeneratedDocument('urn:gala:schema:appearance:2.0.0', value)
    .valid;
}

/**
 * Test whether a value is a valid ArtifactManifestDocument.
 *
 * @param {unknown} value candidate document
 * @returns {boolean} validation result
 */
export function isArtifactManifestDocument(value) {
  return validateGeneratedDocument(
    'urn:gala:schema:artifact-manifest:2.0.0',
    value,
  ).valid;
}

/**
 * Test whether a value is a valid AuthorDocument.
 *
 * @param {unknown} value candidate document
 * @returns {boolean} validation result
 */
export function isAuthorDocument(value) {
  return validateGeneratedDocument('urn:gala:schema:author:2.0.0', value).valid;
}

/**
 * Test whether a value is a valid BuildInputDocument.
 *
 * @param {unknown} value candidate document
 * @returns {boolean} validation result
 */
export function isBuildInputDocument(value) {
  return validateGeneratedDocument('urn:gala:schema:build-input:2.0.0', value)
    .valid;
}

/**
 * Test whether a value is a valid BuildProvenanceDocument.
 *
 * @param {unknown} value candidate document
 * @returns {boolean} validation result
 */
export function isBuildProvenanceDocument(value) {
  return validateGeneratedDocument(
    'urn:gala:metadata:build-provenance:2.0.0',
    value,
  ).valid;
}

/**
 * Test whether a value is a valid ContentFrontmatterDocument.
 *
 * @param {unknown} value candidate document
 * @returns {boolean} validation result
 */
export function isContentFrontmatterDocument(value) {
  return validateGeneratedDocument(
    'urn:gala:schema:content-frontmatter:2.0.0',
    value,
  ).valid;
}

/**
 * Test whether a value is a valid DeploymentIntentDocument.
 *
 * @param {unknown} value candidate document
 * @returns {boolean} validation result
 */
export function isDeploymentIntentDocument(value) {
  return validateGeneratedDocument(
    'urn:gala:schema:deployment-intent:2.0.0',
    value,
  ).valid;
}

/**
 * Test whether a value is a valid DeploymentObservationDocument.
 *
 * @param {unknown} value candidate document
 * @returns {boolean} validation result
 */
export function isDeploymentObservationDocument(value) {
  return validateGeneratedDocument(
    'urn:gala:schema:deployment-observation:2.0.0',
    value,
  ).valid;
}

/**
 * Test whether a value is a valid DeploymentReceiptDocument.
 *
 * @param {unknown} value candidate document
 * @returns {boolean} validation result
 */
export function isDeploymentReceiptDocument(value) {
  return validateGeneratedDocument(
    'urn:gala:schema:deployment-receipt:2.0.0',
    value,
  ).valid;
}

/**
 * Test whether a value is a valid EventEnvelopeDocument.
 *
 * @param {unknown} value candidate document
 * @returns {boolean} validation result
 */
export function isEventEnvelopeDocument(value) {
  return validateGeneratedDocument(
    'urn:gala:schema:event-envelope:2.0.0',
    value,
  ).valid;
}

/**
 * Test whether a value is a valid LockDocument.
 *
 * @param {unknown} value candidate document
 * @returns {boolean} validation result
 */
export function isLockDocument(value) {
  return validateGeneratedDocument('urn:gala:schema:lock:2.0.0', value).valid;
}

/**
 * Test whether a value is a valid NavigationDocument.
 *
 * @param {unknown} value candidate document
 * @returns {boolean} validation result
 */
export function isNavigationDocument(value) {
  return validateGeneratedDocument('urn:gala:schema:navigation:2.0.0', value)
    .valid;
}

/**
 * Test whether a value is a valid ProblemDocument.
 *
 * @param {unknown} value candidate document
 * @returns {boolean} validation result
 */
export function isProblemDocument(value) {
  return validateGeneratedDocument('urn:gala:schema:problem:2.0.0', value)
    .valid;
}

/**
 * Test whether a value is a valid PublicGenerationMarkerDocument.
 *
 * @param {unknown} value candidate document
 * @returns {boolean} validation result
 */
export function isPublicGenerationMarkerDocument(value) {
  return validateGeneratedDocument(
    'urn:gala:schema:public-generation-marker:2.0.0',
    value,
  ).valid;
}

/**
 * Test whether a value is a valid PublicRuntimeOriginsDocument.
 *
 * @param {unknown} value candidate document
 * @returns {boolean} validation result
 */
export function isPublicRuntimeOriginsDocument(value) {
  return validateGeneratedDocument(
    'urn:gala:schema:public-runtime-origins:2.0.0',
    value,
  ).valid;
}

/**
 * Test whether a value is a valid PublicationDocument.
 *
 * @param {unknown} value candidate document
 * @returns {boolean} validation result
 */
export function isPublicationDocument(value) {
  return validateGeneratedDocument('urn:gala:schema:publication:2.0.0', value)
    .valid;
}

/**
 * Test whether a value is a valid RepositoryDocument.
 *
 * @param {unknown} value candidate document
 * @returns {boolean} validation result
 */
export function isRepositoryDocument(value) {
  return validateGeneratedDocument('urn:gala:schema:repository:2.0.0', value)
    .valid;
}

/**
 * Test whether a value is a valid TemplateCompositionDocument.
 *
 * @param {unknown} value candidate document
 * @returns {boolean} validation result
 */
export function isTemplateCompositionDocument(value) {
  return validateGeneratedDocument(
    'urn:gala:schema:template-composition:2.0.0',
    value,
  ).valid;
}

/**
 * Test whether a value is a valid ThemeContractDocument.
 *
 * @param {unknown} value candidate document
 * @returns {boolean} validation result
 */
export function isThemeContractDocument(value) {
  return validateGeneratedDocument(
    'urn:gala:schema:theme-contract:2.0.0',
    value,
  ).valid;
}

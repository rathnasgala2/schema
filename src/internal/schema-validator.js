import diagnosticMap from '../../diagnostics/diagnostic-map.json' with { type: 'json' };
import adapterCapabilitySchema from '../../schemas/adapter-capability.schema.json' with { type: 'json' };
import appearanceSchema from '../../schemas/appearance.schema.json' with { type: 'json' };
import artifactManifestSchema from '../../schemas/artifact-manifest.schema.json' with { type: 'json' };
import authorSchema from '../../schemas/author.schema.json' with { type: 'json' };
import buildInputSchema from '../../schemas/build-input.schema.json' with { type: 'json' };
import buildProvenanceSchema from '../../schemas/build-provenance.schema.json' with { type: 'json' };
import contentFrontmatterSchema from '../../schemas/content-frontmatter.schema.json' with { type: 'json' };
import deploymentIntentSchema from '../../schemas/deployment-intent.schema.json' with { type: 'json' };
import deploymentObservationSchema from '../../schemas/deployment-observation.schema.json' with { type: 'json' };
import deploymentReceiptSchema from '../../schemas/deployment-receipt.schema.json' with { type: 'json' };
import eventEnvelopeSchema from '../../schemas/event-envelope.schema.json' with { type: 'json' };
import lockSchema from '../../schemas/lock.schema.json' with { type: 'json' };
import navigationSchema from '../../schemas/navigation.schema.json' with { type: 'json' };
import problemSchema from '../../schemas/problem.schema.json' with { type: 'json' };
import publicGenerationMarkerSchema from '../../schemas/public-generation-marker.schema.json' with { type: 'json' };
import publicRuntimeOriginsSchema from '../../schemas/public-runtime-origins.schema.json' with { type: 'json' };
import publicationSchema from '../../schemas/publication.schema.json' with { type: 'json' };
import repositorySchema from '../../schemas/repository.schema.json' with { type: 'json' };
import templateCompositionSchema from '../../schemas/template-composition.schema.json' with { type: 'json' };
import themeContractSchema from '../../schemas/theme-contract.schema.json' with { type: 'json' };
import { validateGalaFormat } from './format-validators.js';
import { createValidatorSuite } from './validator-core.js';

/** Statically imported schema documents, in CONTRACTS order. */
const SCHEMAS_BY_CONTRACT = Object.freeze({
  'adapter-capability': adapterCapabilitySchema,
  appearance: appearanceSchema,
  'artifact-manifest': artifactManifestSchema,
  author: authorSchema,
  'build-input': buildInputSchema,
  'build-provenance': buildProvenanceSchema,
  'content-frontmatter': contentFrontmatterSchema,
  'deployment-intent': deploymentIntentSchema,
  'deployment-observation': deploymentObservationSchema,
  'deployment-receipt': deploymentReceiptSchema,
  'event-envelope': eventEnvelopeSchema,
  lock: lockSchema,
  navigation: navigationSchema,
  problem: problemSchema,
  'public-generation-marker': publicGenerationMarkerSchema,
  'public-runtime-origins': publicRuntimeOriginsSchema,
  publication: publicationSchema,
  repository: repositorySchema,
  'template-composition': templateCompositionSchema,
  'theme-contract': themeContractSchema,
});

const CONTRACTS = Object.freeze([
  'adapter-capability',
  'appearance',
  'artifact-manifest',
  'author',
  'build-input',
  'build-provenance',
  'content-frontmatter',
  'deployment-intent',
  'deployment-observation',
  'deployment-receipt',
  'event-envelope',
  'lock',
  'navigation',
  'problem',
  'public-generation-marker',
  'public-runtime-origins',
  'publication',
  'repository',
  'template-composition',
  'theme-contract',
]);

/**
 * @typedef {import('./validator-core.js').GalaDiagnostic} GalaDiagnostic
 * @typedef {import('./validator-core.js').GalaValidationResult} GalaValidationResult
 */

const SUITE = createValidatorSuite({
  schemas: CONTRACTS.map(
    (contract) =>
      /** @type {Record<string, unknown>} */ (
        /** @type {Record<string, Record<string, unknown>>} */ (
          SCHEMAS_BY_CONTRACT
        )[contract]
      ),
  ),
  diagnosticMap: /** @type {import('./validator-core.js').DiagnosticMap} */ (
    diagnosticMap
  ),
  validateFormat: validateGalaFormat,
});

/**
 * Validate one complete Gala document against an exact registered schema identity.
 *
 * @param {string} schemaId exact immutable schema identity
 * @param {unknown} value document value
 * @returns {GalaValidationResult} frozen validation result
 */
export function validateRegisteredDocument(schemaId, value) {
  return SUITE.validateDocument(schemaId, value);
}

/**
 * Validate a fixture value against one registered schema fragment.
 *
 * This is the private cross-language parity seam; package consumers validate
 * complete documents through validateGalaDocument.
 *
 * @param {string} schemaId exact immutable schema identity
 * @param {string} schemaPointer local JSON Pointer
 * @param {unknown} value fixture value
 * @returns {{valid: boolean, codes: string[], keywords: string[]}} normalized result
 */
export function validateRegisteredFragment(schemaId, schemaPointer, value) {
  return SUITE.validateFragment(schemaId, schemaPointer, value);
}

/**
 * Validate only the cardinality and uniqueness assertions of a large array.
 *
 * Item schemas are validated separately by the parity harness so compact
 * recipes never allocate hundreds of thousands of complex object witnesses.
 *
 * @param {{minItems?: number, maxItems?: number, uniqueItems?: boolean}} schema array schema
 * @param {number} length logical fixture length
 * @returns {{valid: boolean, codes: string[], keywords: string[]}} normalized result
 */
export function validateArrayCardinality(schema, length) {
  return SUITE.validateArrayCardinality(schema, length);
}

/** Exact immutable identities accepted by the public validator. */
export const REGISTERED_SCHEMA_IDS = SUITE.schemaIds;

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import Ajv2020Module from 'ajv/dist/2020.js';
import formatsPlugin from 'ajv-formats';

import { canonicalizeJcsBytes } from '../src/internal/canonical-jcs.js';
import {
  parseSemver,
  parseSemverRange,
  satisfiesSemverRange,
} from '../src/internal/semver.js';
import { runIfMain } from './run-if-main.mjs';

const Ajv2020 = /** @type {typeof import('ajv/dist/2020.js').default} */ (
  /** @type {unknown} */ (Ajv2020Module)
);

/**
 * @typedef {{
 *   artifact: string,
 *   version: string,
 *   supportedProducerRange: string
 * }} CompatibilityConsumer
 */

/**
 * @typedef {{
 *   contractId: string,
 *   producer: {
 *     version: string,
 *     oldestAcceptedVersion: string,
 *     previousSupportedVersion: string | null,
 *     status: 'current' | 'supported' | 'deprecated' | 'retired'
 *   },
 *   consumers: CompatibilityConsumer[]
 * }} CompatibilityContract
 */

/**
 * @typedef {{
 *   schemaVersion: string,
 *   sourceDesignRevision: string,
 *   contracts: CompatibilityContract[],
 *   digest: string
 * }} CompatibilityCatalog
 */

/**
 * Evaluate an exact documented producer/consumer pairing.
 *
 * @param {CompatibilityCatalog} catalog compatibility authority
 * @param {string} contractId immutable contract identity
 * @param {string} producerVersion exact producer version
 * @param {string} consumerArtifact consumer repository/build unit
 * @param {string} consumerVersion exact consumer version
 * @returns {{compatible: true} | {compatible: false, code: string}} decision
 */
export function evaluateCompatibility(
  catalog,
  contractId,
  producerVersion,
  consumerArtifact,
  consumerVersion,
) {
  const contract = catalog.contracts.find(
    (candidate) => candidate.contractId === contractId,
  );
  if (contract === undefined) {
    return { compatible: false, code: 'COMPATIBILITY_CONTRACT_UNKNOWN' };
  }
  if (contract.producer.version !== producerVersion) {
    return {
      compatible: false,
      code: 'COMPATIBILITY_PRODUCER_VERSION_UNDOCUMENTED',
    };
  }
  if (contract.producer.status === 'retired') {
    return { compatible: false, code: 'COMPATIBILITY_PRODUCER_RETIRED' };
  }
  const consumer = contract.consumers.find(
    (candidate) => candidate.artifact === consumerArtifact,
  );
  if (consumer === undefined) {
    return { compatible: false, code: 'COMPATIBILITY_CONSUMER_UNDOCUMENTED' };
  }
  if (consumer.version !== consumerVersion) {
    return {
      compatible: false,
      code: 'COMPATIBILITY_CONSUMER_VERSION_UNDOCUMENTED',
    };
  }
  if (!satisfiesSemverRange(producerVersion, consumer.supportedProducerRange)) {
    return { compatible: false, code: 'COMPATIBILITY_RANGE_UNSUPPORTED' };
  }
  return { compatible: true };
}

/**
 * Validate the closed catalog, its digest, ordering, ranges, and exact inventory.
 *
 * @param {unknown} value parsed compatibility document
 * @param {unknown} schema parsed closed JSON Schema
 * @param {readonly string[]} expectedContractIds exact inventory identities
 * @returns {CompatibilityCatalog} validated catalog
 */
export function checkCompatibilityCatalog(value, schema, expectedContractIds) {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  /** @type {import('ajv-formats').default} */ (
    /** @type {unknown} */ (formatsPlugin)
  )(ajv);
  const validate = ajv.compile(/** @type {import('ajv').AnySchema} */ (schema));
  if (!validate(value)) {
    throw new TypeError(
      `Compatibility schema validation failed: ${JSON.stringify(validate.errors)}`,
    );
  }
  const catalog = /** @type {CompatibilityCatalog} */ (value);
  const projection = { ...catalog };
  delete (/** @type {{digest?: string}} */ (projection).digest);
  const actualDigest = `sha256:${createHash('sha256')
    .update(canonicalizeJcsBytes(projection))
    .digest('hex')}`;
  if (catalog.digest !== actualDigest) {
    throw new TypeError('Compatibility catalog digest mismatch');
  }
  const actualIds = catalog.contracts.map(({ contractId }) => contractId);
  if (
    new Set(actualIds).size !== actualIds.length ||
    JSON.stringify(actualIds) !== JSON.stringify([...actualIds].sort()) ||
    JSON.stringify(actualIds) !== JSON.stringify(expectedContractIds)
  ) {
    throw new TypeError(
      'Compatibility contract inventory is not the exact sorted set',
    );
  }
  for (const contract of catalog.contracts) {
    parseSemver(contract.producer.version);
    parseSemver(contract.producer.oldestAcceptedVersion);
    if (contract.producer.previousSupportedVersion !== null) {
      parseSemver(contract.producer.previousSupportedVersion);
    }
    const artifacts = contract.consumers.map(({ artifact }) => artifact);
    if (
      new Set(artifacts).size !== artifacts.length ||
      JSON.stringify(artifacts) !== JSON.stringify([...artifacts].sort())
    ) {
      throw new TypeError(
        `${contract.contractId} consumer set is not sorted and unique`,
      );
    }
    for (const consumer of contract.consumers) {
      parseSemver(consumer.version);
      parseSemverRange(consumer.supportedProducerRange);
      const decision = evaluateCompatibility(
        catalog,
        contract.contractId,
        contract.producer.version,
        consumer.artifact,
        consumer.version,
      );
      if (!decision.compatible) {
        throw new TypeError(
          `${contract.contractId} current pairing fails with ${decision.code}`,
        );
      }
    }
  }
  return catalog;
}

async function main() {
  const [catalogSource, schemaSource, inventorySource] = await Promise.all([
    readFile('compatibility/compatibility.json', 'utf8'),
    readFile('compatibility/compatibility.schema.json', 'utf8'),
    readFile('docs/catalogs/schema-inventory.json', 'utf8'),
  ]);
  const inventory = /** @type {{contracts: {id: string}[]}} */ (
    JSON.parse(inventorySource)
  );
  const ids = inventory.contracts.map(({ id }) => id).sort();
  const catalog = checkCompatibilityCatalog(
    JSON.parse(catalogSource),
    JSON.parse(schemaSource),
    ids,
  );
  const pairings = catalog.contracts.reduce(
    (count, contract) => count + contract.consumers.length,
    0,
  );
  process.stdout.write(
    `Verified ${catalog.contracts.length} contracts and ${pairings} exact compatibility pairings.\n`,
  );
}

await runIfMain(import.meta.url, main);

import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  createRetainedSourceDataInventory,
  readSemverOracle,
} from './generate-license-inventory.mjs';
import { runIfMain } from './run-if-main.mjs';

const OUTPUT_PATH = path.resolve('sbom.cdx.json');
const PACKAGE_LOCK_PATH = path.resolve('package-lock.json');

/**
 * Decode a pinned SHA-512 base64 value to CycloneDX lowercase hexadecimal.
 *
 * @param {string} value base64 digest
 * @returns {string} 128 lowercase hexadecimal digits
 */
function sha512Hex(value) {
  const bytes = Buffer.from(value, 'base64');
  if (bytes.length !== 64 || bytes.toString('base64') !== value) {
    throw new Error('Pinned SHA-512 is not canonical base64');
  }
  return bytes.toString('hex');
}

/**
 * Return one required ordinary JSON object.
 *
 * @param {unknown} value candidate value
 * @param {string} message failure message
 * @returns {Record<string, unknown>} object
 */
function requireObject(value, message) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(message);
  }
  return /** @type {Record<string, unknown>} */ (value);
}

/**
 * Materialize retained inputs and the development oracle in a reproducible BOM.
 *
 * @param {string} sbomSource reproducible CycloneDX CLI output
 * @param {string} lockSource package-lock source
 * @returns {string} augmented canonical presentation JSON
 */
export function createSupplyChainSbom(sbomSource, lockSource) {
  const bom = requireObject(
    JSON.parse(sbomSource),
    'CycloneDX root is invalid',
  );
  const lock = requireObject(
    JSON.parse(lockSource),
    'package-lock root is invalid',
  );
  if (bom.bomFormat !== 'CycloneDX' || bom.specVersion !== '1.6') {
    throw new Error('CycloneDX 1.6 base document is required');
  }
  const oracle = readSemverOracle(lock);
  const retainedSourceData = createRetainedSourceDataInventory();

  const retainedComponents = retainedSourceData.map((artifact) => ({
    type: 'data',
    name: artifact.id,
    'bom-ref': `urn:gala:source-data:${artifact.id}`,
    scope: 'excluded',
    hashes: [
      { alg: 'SHA-256', content: artifact.sha256 },
      ...(artifact.sha512
        ? [{ alg: 'SHA-512', content: sha512Hex(artifact.sha512) }]
        : []),
    ],
    licenses: [{ license: { id: artifact.license } }],
    externalReferences: [{ type: 'distribution', url: artifact.url }],
    properties: [
      { name: 'gala:retained-source-data:path', value: artifact.path },
      {
        name: 'gala:retained-source-data:byte-count',
        value: String(artifact.bytes),
      },
      {
        name: 'gala:supply-chain:role',
        value: artifact.developmentOracle
          ? 'development-oracle-source'
          : 'retained-source-data',
      },
    ],
  }));
  const oracleRef = `pkg:npm/${oracle.name}@${oracle.version}`;
  const oracleComponent = {
    type: 'library',
    name: oracle.name,
    version: oracle.version,
    'bom-ref': oracleRef,
    scope: 'excluded',
    hashes: [
      { alg: 'SHA-256', content: oracle.sha256 },
      { alg: 'SHA-512', content: sha512Hex(oracle.sha512) },
    ],
    licenses: [{ license: { id: oracle.license } }],
    purl: oracleRef,
    externalReferences: [{ type: 'distribution', url: oracle.resolved }],
    properties: [
      { name: 'gala:supply-chain:role', value: 'development-oracle' },
      { name: 'gala:npm:integrity', value: oracle.integrity },
    ],
  };

  const existingComponents = Array.isArray(bom.components)
    ? bom.components.map((component) =>
        requireObject(component, 'CycloneDX component is invalid'),
      )
    : [];
  const addedComponents = [...retainedComponents, oracleComponent];
  const existingReferences = new Set(
    existingComponents.map((component) => component['bom-ref']),
  );
  for (const component of addedComponents) {
    if (existingReferences.has(component['bom-ref'])) {
      throw new Error(`Duplicate CycloneDX bom-ref ${component['bom-ref']}`);
    }
  }
  bom.components = [...existingComponents, ...addedComponents].sort(
    (left, right) =>
      compareCodeUnits(String(left['bom-ref']), String(right['bom-ref'])),
  );

  const metadata = requireObject(bom.metadata, 'CycloneDX metadata is invalid');
  const rootComponent = requireObject(
    metadata.component,
    'CycloneDX root component is invalid',
  );
  const rootReference = rootComponent['bom-ref'];
  if (typeof rootReference !== 'string') {
    throw new Error('CycloneDX root component has no bom-ref');
  }
  const dependencies = Array.isArray(bom.dependencies)
    ? bom.dependencies.map((dependency) =>
        requireObject(dependency, 'CycloneDX dependency is invalid'),
      )
    : [];
  const rootDependency = dependencies.find(
    (dependency) => dependency.ref === rootReference,
  );
  if (!rootDependency) {
    throw new Error('CycloneDX root dependency is missing');
  }
  const addedReferences = addedComponents.map(
    (component) => /** @type {string} */ (component['bom-ref']),
  );
  const existingDependsOn = Array.isArray(rootDependency.dependsOn)
    ? rootDependency.dependsOn
    : [];
  rootDependency.dependsOn = [
    ...new Set([...existingDependsOn, ...addedReferences]),
  ].sort();
  const dependencyReferences = new Set(dependencies.map(({ ref }) => ref));
  for (const reference of addedReferences) {
    if (!dependencyReferences.has(reference))
      dependencies.push({ ref: reference });
  }
  bom.dependencies = dependencies.sort((left, right) =>
    compareCodeUnits(String(left.ref), String(right.ref)),
  );

  return `${JSON.stringify(bom, null, 2)}\n`;
}

/**
 * Compare strings without host-locale collation.
 *
 * @param {string} left left value
 * @param {string} right right value
 * @returns {-1 | 0 | 1} UTF-16 code-unit order
 */
function compareCodeUnits(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

/**
 * @param {string} outputPath absolute output path
 */
async function generateSbom(outputPath) {
  const executableName =
    process.platform === 'win32' ? 'cyclonedx-npm.cmd' : 'cyclonedx-npm';
  const executable = path.resolve('node_modules/.bin', executableName);

  const result = spawnSync(
    executable,
    [
      '--package-lock-only',
      '--omit',
      'dev',
      '--mc-type',
      'library',
      '--spec-version',
      '1.6',
      '--output-format',
      'JSON',
      '--output-reproducible',
      '--validate',
      '--output-file',
      outputPath,
    ],
    { encoding: 'utf8', shell: false },
  );

  if (result.status !== 0) {
    process.stderr.write(result.stdout);
    process.stderr.write(result.stderr);
    throw new Error(
      `CycloneDX generation failed with exit code ${result.status}`,
    );
  }

  const [sbomSource, lockSource] = await Promise.all([
    readFile(outputPath, 'utf8'),
    readFile(PACKAGE_LOCK_PATH, 'utf8'),
  ]);
  await writeFile(
    outputPath,
    createSupplyChainSbom(sbomSource, lockSource),
    'utf8',
  );
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== '--check') || args.length > 1) {
    throw new Error('Usage: node scripts/generate-sbom.mjs [--check]');
  }

  if (!args.includes('--check')) {
    await generateSbom(OUTPUT_PATH);
    process.stdout.write('Wrote reproducible sbom.cdx.json.\n');
    return;
  }

  const temporaryDirectory = await mkdtemp(
    path.join(tmpdir(), 'gala-schema-sbom-'),
  );
  try {
    const candidatePath = path.join(temporaryDirectory, 'sbom.cdx.json');
    await generateSbom(candidatePath);
    const [actual, expected] = await Promise.all([
      readFile(OUTPUT_PATH, 'utf8'),
      readFile(candidatePath, 'utf8'),
    ]);
    if (actual !== expected) {
      throw new Error('sbom.cdx.json is stale; run npm run sbom:generate');
    }
    process.stdout.write(
      'SBOM matches the reproducible package-lock projection.\n',
    );
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

await runIfMain(import.meta.url, main);

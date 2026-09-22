import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { runIfMain } from './run-if-main.mjs';
import { PINNED_SOURCE_DATA } from './verify-pinned-source-data.mjs';

const OUTPUT_PATH = path.resolve('THIRD_PARTY_LICENSES.json');
const SEMVER_ORACLE_ID = 'semver-7.8.5-tarball';
const SEMVER_ORACLE_NAME = 'semver';
const SEMVER_ORACLE_VERSION = '7.8.5';

/**
 * Resolve the accepted license identifier for one retained source artifact.
 *
 * @param {(typeof PINNED_SOURCE_DATA)[number]} artifact pinned artifact
 * @returns {string} SPDX license identifier
 */
function retainedSourceLicense(artifact) {
  if (artifact.id === 'unicode-uax29-revision-47') {
    return 'Unicode-TOU';
  }
  if (artifact.id.startsWith('unicode-17-')) return 'Unicode-3.0';
  if (artifact.id.startsWith('iana-')) return 'CC0-1.0';
  if (artifact.id === 'spdx-license-list-3.28.0') return 'CC0-1.0';
  if (artifact.id === SEMVER_ORACLE_ID) return 'ISC';
  throw new Error(`${artifact.id}: retained source license is not classified`);
}

/**
 * Project the immutable retained source-data manifest into the license inventory.
 *
 * @returns {{
 *   id: string,
 *   path: string,
 *   url: string,
 *   bytes: number,
 *   sha256: string,
 *   sha512?: string,
 *   license: string,
 *   developmentOracle: boolean
 * }[]} retained source-data inventory
 */
export function createRetainedSourceDataInventory() {
  return PINNED_SOURCE_DATA.map((artifact) => ({
    id: artifact.id,
    path: artifact.path,
    url: artifact.url,
    bytes: artifact.bytes,
    sha256: artifact.sha256,
    ...('sha512' in artifact ? { sha512: artifact.sha512 } : {}),
    license: retainedSourceLicense(artifact),
    developmentOracle: artifact.id === SEMVER_ORACLE_ID,
  }));
}

/**
 * Validate and project the exact SemVer development oracle from package-lock.
 *
 * @param {Record<string, unknown>} lock parsed package-lock
 * @returns {{
 *   name: string,
 *   version: string,
 *   license: string,
 *   development: true,
 *   resolved: string,
 *   integrity: string,
 *   sha256: string,
 *   sha512: string
 * }} exact oracle identity
 */
export function readSemverOracle(lock) {
  const packages = lock.packages;
  if (packages === null || typeof packages !== 'object') {
    throw new Error('package-lock.json has no packages object');
  }
  const packageRecords =
    /** @type {Record<string, Record<string, unknown>>} */ (packages);
  const root = packageRecords[''];
  const metadata = packageRecords['node_modules/semver'];
  const retained = PINNED_SOURCE_DATA.find(
    (artifact) => artifact.id === SEMVER_ORACLE_ID,
  );
  if (!root || !metadata || !retained || !('sha512' in retained)) {
    throw new Error('SemVer development oracle inputs are incomplete');
  }
  const devDependencies = root.devDependencies;
  if (
    devDependencies === null ||
    typeof devDependencies !== 'object' ||
    /** @type {Record<string, unknown>} */ (devDependencies)[
      SEMVER_ORACLE_NAME
    ] !== SEMVER_ORACLE_VERSION ||
    metadata.version !== SEMVER_ORACLE_VERSION ||
    metadata.resolved !== retained.url ||
    metadata.integrity !== `sha512-${retained.sha512}` ||
    metadata.license !== 'ISC' ||
    metadata.dev !== true
  ) {
    throw new Error('SemVer development oracle does not match DEC-099');
  }
  return {
    name: SEMVER_ORACLE_NAME,
    version: SEMVER_ORACLE_VERSION,
    license: 'ISC',
    development: true,
    resolved: retained.url,
    integrity: `sha512-${retained.sha512}`,
    sha256: retained.sha256,
    sha512: retained.sha512,
  };
}

/**
 * @param {string} packagePath package-lock `packages` key
 * @returns {string} package name
 */
function packageNameFromPath(packagePath) {
  const installPath = packagePath.split('node_modules/').at(-1);
  if (installPath === undefined || installPath.length === 0) {
    throw new Error(`Cannot derive a package name from ${packagePath}`);
  }

  const segments = installPath.split('/');
  const [firstSegment, secondSegment] = segments;
  if (firstSegment === undefined) {
    throw new Error(`Cannot derive a package name from ${packagePath}`);
  }
  if (installPath.startsWith('@')) {
    if (secondSegment === undefined || secondSegment.length === 0) {
      throw new Error(
        `Cannot derive a scoped package name from ${packagePath}`,
      );
    }
    return `${firstSegment}/${secondSegment}`;
  }
  return firstSegment;
}

/**
 * @param {string} lockSource package-lock JSON source
 * @returns {string} canonical inventory JSON
 */
export function createLicenseInventory(lockSource) {
  const lock = JSON.parse(lockSource);
  if (lock.lockfileVersion !== 3 || typeof lock.packages !== 'object') {
    throw new Error('License inventory requires npm package-lock v3');
  }

  const root = lock.packages[''];
  if (root === undefined) {
    throw new Error('package-lock.json has no root package');
  }

  const dependencies = Object.entries(lock.packages)
    .filter(([packagePath]) => packagePath !== '')
    .map(([packagePath, metadata]) => {
      const name = packageNameFromPath(packagePath);
      if (
        typeof metadata.version !== 'string' ||
        typeof metadata.license !== 'string' ||
        typeof metadata.integrity !== 'string'
      ) {
        throw new Error(
          `${name} lacks locked version, license, or integrity metadata`,
        );
      }

      return {
        name,
        version: metadata.version,
        license: metadata.license,
        development: metadata.dev === true,
        optional: metadata.optional === true,
        peer: metadata.peer === true,
        integrity: metadata.integrity,
      };
    })
    .sort((left, right) => {
      const leftKey = `${left.name}@${left.version}`;
      const rightKey = `${right.name}@${right.version}`;
      return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
    });

  readSemverOracle(lock);

  return `${JSON.stringify(
    {
      schemaVersion: 1,
      package: `${root.name}@${root.version}`,
      source: 'package-lock.json',
      dependencies,
      retainedSourceData: createRetainedSourceDataInventory(),
    },
    null,
    2,
  )}\n`;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== '--check') || args.length > 1) {
    throw new Error(
      'Usage: node scripts/generate-license-inventory.mjs [--check]',
    );
  }

  const expected = createLicenseInventory(
    await readFile(path.resolve('package-lock.json'), 'utf8'),
  );

  if (args.includes('--check')) {
    const actual = await readFile(OUTPUT_PATH, 'utf8');
    if (actual !== expected) {
      throw new Error(
        'THIRD_PARTY_LICENSES.json is stale; run npm run licenses:generate',
      );
    }
    process.stdout.write('License inventory matches package-lock.json.\n');
    return;
  }

  await writeFile(OUTPUT_PATH, expected, 'utf8');
  process.stdout.write('Wrote THIRD_PARTY_LICENSES.json.\n');
}

await runIfMain(import.meta.url, main);

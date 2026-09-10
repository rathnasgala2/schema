import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { runIfMain } from './run-if-main.mjs';

const OUTPUT_PATH = path.resolve('THIRD_PARTY_LICENSES.json');

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
    .sort((left, right) =>
      `${left.name}@${left.version}`.localeCompare(
        `${right.name}@${right.version}`,
      ),
    );

  return `${JSON.stringify(
    {
      schemaVersion: 1,
      package: `${root.name}@${root.version}`,
      source: 'package-lock.json',
      dependencies,
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

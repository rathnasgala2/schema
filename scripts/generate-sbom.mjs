import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { runIfMain } from './run-if-main.mjs';

const OUTPUT_PATH = path.resolve('sbom.cdx.json');

/**
 * @param {string} outputPath absolute output path
 */
function generateSbom(outputPath) {
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
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== '--check') || args.length > 1) {
    throw new Error('Usage: node scripts/generate-sbom.mjs [--check]');
  }

  if (!args.includes('--check')) {
    generateSbom(OUTPUT_PATH);
    process.stdout.write('Wrote reproducible sbom.cdx.json.\n');
    return;
  }

  const temporaryDirectory = await mkdtemp(
    path.join(tmpdir(), 'gala-schema-sbom-'),
  );
  try {
    const candidatePath = path.join(temporaryDirectory, 'sbom.cdx.json');
    generateSbom(candidatePath);
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

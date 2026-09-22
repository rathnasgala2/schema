import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  adversarialCaseId,
  createDigestParityCases,
  createCanonicalByteParityCases,
  createStructuralParityCases,
  createScalarParityCases,
  validateAdversarialFixture,
  validateDigestParityCase,
  validateCanonicalByteParityCase,
  validateStructuralCaseWithAjv,
  validateScalarParityCase,
} from './validator-parity.mjs';
import { runIfMain } from './run-if-main.mjs';

const OUTPUT_PATH = path.resolve('diagnostics/parity-expectations.json');

/**
 * Generate the exact reviewed result snapshot for every parity case.
 *
 * The fixture corpus continues to state the diagnostic each rule must target.
 * This separate snapshot closes the complete normalized result, including
 * every simultaneously applicable diagnostic.
 *
 * @returns {Promise<string>} deterministic presentation JSON
 */
export async function createParityExpectations() {
  const corpus = await createStructuralParityCases();
  const digestCases = await createDigestParityCases();
  const canonicalByteCases = await createCanonicalByteParityCases();
  const scalarCases = await createScalarParityCases();
  const structural = Object.fromEntries(
    corpus.cases.map((fixture) => [
      fixture.caseId,
      validateStructuralCaseWithAjv(fixture),
    ]),
  );
  const adversarial = Object.fromEntries(
    corpus.adversarial
      .map((fixture) => [
        adversarialCaseId(fixture),
        validateAdversarialFixture(fixture),
      ])
      .sort((left, right) =>
        String(left[0]) < String(right[0])
          ? -1
          : String(left[0]) > String(right[0])
            ? 1
            : 0,
      ),
  );
  const digest = Object.fromEntries(
    digestCases.map((fixture) => [
      fixture.caseId,
      validateDigestParityCase(fixture),
    ]),
  );
  const canonicalBytes = Object.fromEntries(
    canonicalByteCases.map((fixture) => [
      fixture.caseId,
      validateCanonicalByteParityCase(fixture),
    ]),
  );
  const scalars = Object.fromEntries(
    scalarCases.map((fixture) => [
      fixture.caseId,
      validateScalarParityCase(fixture),
    ]),
  );
  return `${JSON.stringify(
    {
      schemaVersion: '1.0.0',
      contractVersion: '2.0.0',
      structural,
      adversarial,
      digest,
      canonicalBytes,
      scalars,
    },
    null,
    2,
  )}\n`;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some((argument) => argument !== '--check') || args.length > 1) {
    throw new Error(
      'Usage: node scripts/generate-parity-expectations.mjs [--check]',
    );
  }
  const expected = await createParityExpectations();
  if (args.includes('--check')) {
    const actual = await readFile(OUTPUT_PATH, 'utf8');
    if (actual !== expected) {
      throw new Error(
        'diagnostics/parity-expectations.json is stale; run npm run parity-expectations:generate',
      );
    }
    process.stdout.write('Exact parity expectations are current.\n');
    return;
  }
  await writeFile(OUTPUT_PATH, expected, 'utf8');
  process.stdout.write('Wrote diagnostics/parity-expectations.json.\n');
}

await runIfMain(import.meta.url, main);

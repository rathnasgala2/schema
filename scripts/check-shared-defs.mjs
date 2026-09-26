import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import { runIfMain } from './run-if-main.mjs';

/**
 * Canonicalize one $defs body for byte-for-byte comparison across roots:
 * stable key order, no whitespace sensitivity. This is a build-time
 * consistency check, not a security boundary, so plain sorted-key
 * JSON.stringify is sufficient -- it does not need RFC 8785 JCS.
 *
 * @param {unknown} value schema fragment
 * @returns {string} canonical JSON text
 */
function canonicalize(value) {
  return JSON.stringify(sortKeysDeep(value));
}

/**
 * @param {unknown} value arbitrary JSON value
 * @returns {unknown} value with every object's keys sorted, recursively
 */
function sortKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value !== null && typeof value === 'object') {
    /** @type {Record<string, unknown>} */
    const sorted = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortKeysDeep(
        /** @type {Record<string, unknown>} */ (value)[key],
      );
    }
    return sorted;
  }
  return value;
}

/**
 * Group every root's `$defs` entries by name and report any name whose
 * body diverges across roots (SCH-C3): twenty schema roots share a `$defs`
 * library by copy-paste, not by reference, so nothing else catches a name
 * that quietly drifted to mean two different things in two roots.
 *
 * @param {string} schemasDirectory absolute path to the `schemas/` directory
 * @returns {Promise<string[]>} one diagnostic per name with more than one
 *   distinct body, empty when every shared name is byte-identical
 */
export async function findDivergentSharedDefs(schemasDirectory) {
  const files = (await readdir(schemasDirectory))
    .filter((file) => file.endsWith('.schema.json'))
    .sort();
  /** @type {Map<string, Map<string, string[]>>} */
  const bodiesByName = new Map();
  for (const file of files) {
    const schema = JSON.parse(
      await readFile(path.join(schemasDirectory, file), 'utf8'),
    );
    const defs = /** @type {Record<string, unknown> | undefined} */ (
      schema.$defs
    );
    if (defs === undefined) continue;
    for (const [name, body] of Object.entries(defs)) {
      const canonical = canonicalize(body);
      let byBody = bodiesByName.get(name);
      if (byBody === undefined) {
        byBody = new Map();
        bodiesByName.set(name, byBody);
      }
      const roots = byBody.get(canonical) ?? [];
      roots.push(file);
      byBody.set(canonical, roots);
    }
  }
  const diagnostics = [];
  for (const [name, byBody] of [...bodiesByName].sort(([left], [right]) =>
    left < right ? -1 : left > right ? 1 : 0,
  )) {
    if (byBody.size <= 1) continue;
    const variants = [...byBody.values()]
      .map((roots) => `[${roots.join(', ')}]`)
      .join(' vs ');
    diagnostics.push(
      `$defs.${name} has ${byBody.size} distinct bodies: ${variants}`,
    );
  }
  return diagnostics;
}

async function main() {
  const schemasDirectory = path.resolve(import.meta.dirname, '..', 'schemas');
  const diagnostics = await findDivergentSharedDefs(schemasDirectory);
  if (diagnostics.length > 0) {
    throw new Error(
      `Shared $defs have diverged across roots (SCH-C3):\n${diagnostics.join('\n')}\n\n` +
        'Every $defs name shared by more than one root must be byte-identical ' +
        'everywhere it appears. A deliberate divergence gets a distinct name ' +
        'instead; an accidental one gets reconciled to one canonical body.',
    );
  }
  process.stdout.write(
    'Every $defs name shared by more than one root is byte-identical.\n',
  );
}

await runIfMain(import.meta.url, main);

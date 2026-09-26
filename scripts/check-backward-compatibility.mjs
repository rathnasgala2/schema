import { cp, readFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';

import { runIfMain } from './run-if-main.mjs';

const BASELINE_DIRECTORY = path.resolve(
  import.meta.dirname,
  '..',
  'compatibility',
  'baseline-schemas',
);
const SCHEMAS_DIRECTORY = path.resolve(import.meta.dirname, '..', 'schemas');

/** Numeric-bound keywords, and whether raising the bound is additive. */
const RELAXES_WHEN_RAISED = new Set([
  'maxLength',
  'maxItems',
  'maxProperties',
  'maxContains',
]);
const RELAXES_WHEN_LOWERED = new Set([
  'minLength',
  'minItems',
  'minProperties',
  'minContains',
]);
const X_GALA_BOUND_KEYWORDS = new Set([
  'x-gala-asciiByteLength',
  'x-gala-utf8ByteLength',
  'x-gala-graphemeLength',
]);

/**
 * @typedef {{path: string, kind: 'additive' | 'breaking', detail: string}} CompatibilityFinding
 */

/**
 * Compare two decimal-string or numeric bounds.
 *
 * @param {unknown} value candidate bound
 * @returns {bigint | undefined} parsed value, or undefined if not a plain
 *   decimal integer
 */
function toBigIntBound(value) {
  if (typeof value === 'number' && Number.isInteger(value))
    return BigInt(value);
  if (typeof value === 'string' && /^-?(?:0|[1-9][0-9]*)$/u.test(value)) {
    return BigInt(value);
  }
  return undefined;
}

/**
 * Diff one pair of `x-gala-*ByteLength`/`x-gala-maxCanonicalBytes`-shaped
 * bound objects (`{minimum?, maximum?}` or a bare maximum).
 *
 * @param {string} pointer JSON Pointer to the keyword
 * @param {unknown} keyword keyword name, for the finding detail
 * @param {unknown} baselineValue baseline keyword value
 * @param {unknown} currentValue current keyword value
 * @param {CompatibilityFinding[]} findings accumulator
 * @returns {void}
 */
function diffBoundKeyword(
  pointer,
  keyword,
  baselineValue,
  currentValue,
  findings,
) {
  const baselineBounds =
    typeof baselineValue === 'object' && baselineValue !== null
      ? /** @type {Record<string, unknown>} */ (baselineValue)
      : { maximum: baselineValue };
  const currentBounds =
    typeof currentValue === 'object' && currentValue !== null
      ? /** @type {Record<string, unknown>} */ (currentValue)
      : { maximum: currentValue };
  for (const side of /** @type {const} */ (['minimum', 'maximum'])) {
    const before = toBigIntBound(baselineBounds[side]);
    const after = toBigIntBound(currentBounds[side]);
    if (before === undefined && after === undefined) continue;
    if (before === undefined) {
      findings.push({
        path: pointer,
        kind: 'breaking',
        detail: `${keyword}.${side} added (${after})`,
      });
    } else if (after === undefined) {
      findings.push({
        path: pointer,
        kind: 'additive',
        detail: `${keyword}.${side} removed (was ${before})`,
      });
    } else if (before !== after) {
      const tightened = side === 'maximum' ? after < before : after > before;
      findings.push({
        path: pointer,
        kind: tightened ? 'breaking' : 'additive',
        detail: `${keyword}.${side} ${before} -> ${after}`,
      });
    }
  }
}

/**
 * Recursively diff one schema fragment pair for compatibility-relevant
 * keyword changes. This is a targeted diff over the keyword classes
 * docs/COMPATIBILITY.md defines, not a general JSON Schema differ.
 *
 * @param {string} pointer JSON Pointer to this fragment
 * @param {unknown} baseline baseline fragment
 * @param {unknown} current current fragment
 * @param {CompatibilityFinding[]} findings accumulator
 * @returns {void}
 */
function diffSchema(pointer, baseline, current, findings) {
  if (
    baseline === null ||
    current === null ||
    typeof baseline !== 'object' ||
    typeof current !== 'object'
  ) {
    return;
  }
  if (Array.isArray(baseline) || Array.isArray(current)) return;
  const before = /** @type {Record<string, unknown>} */ (baseline);
  const after = /** @type {Record<string, unknown>} */ (current);

  if (pointer === '#' && before.$id !== after.$id) {
    findings.push({
      path: pointer,
      kind: 'breaking',
      detail: `$id changed: ${JSON.stringify(before.$id)} -> ${JSON.stringify(after.$id)}`,
    });
  }

  const beforeRequired = new Set(
    Array.isArray(before.required) ? before.required : [],
  );
  const afterRequired = new Set(
    Array.isArray(after.required) ? after.required : [],
  );
  for (const member of afterRequired) {
    if (!beforeRequired.has(member)) {
      findings.push({
        path: pointer,
        kind: 'breaking',
        detail: `required gained "${member}"`,
      });
    }
  }
  for (const member of beforeRequired) {
    if (!afterRequired.has(member)) {
      findings.push({
        path: pointer,
        kind: 'additive',
        detail: `required dropped "${member}"`,
      });
    }
  }

  if (Array.isArray(before.enum) || Array.isArray(after.enum)) {
    const beforeEnum = new Set(Array.isArray(before.enum) ? before.enum : []);
    const afterEnum = new Set(Array.isArray(after.enum) ? after.enum : []);
    for (const member of beforeEnum) {
      if (!afterEnum.has(member)) {
        findings.push({
          path: pointer,
          kind: 'breaking',
          detail: `enum member removed: ${JSON.stringify(member)}`,
        });
      }
    }
    for (const member of afterEnum) {
      if (!beforeEnum.has(member)) {
        findings.push({
          path: pointer,
          kind: 'additive',
          detail: `enum member added: ${JSON.stringify(member)}`,
        });
      }
    }
  }

  if ('const' in before || 'const' in after) {
    if (JSON.stringify(before.const) !== JSON.stringify(after.const)) {
      findings.push({
        path: pointer,
        kind: 'breaking',
        detail: `const changed: ${JSON.stringify(before.const)} -> ${JSON.stringify(after.const)}`,
      });
    }
  }

  if ('pattern' in before || 'pattern' in after) {
    if (before.pattern !== after.pattern) {
      findings.push({
        path: pointer,
        kind:
          before.pattern === undefined
            ? 'breaking'
            : after.pattern === undefined
              ? 'additive'
              : 'breaking',
        detail: `pattern ${JSON.stringify(before.pattern)} -> ${JSON.stringify(after.pattern)}`,
      });
    }
  }

  for (const keyword of RELAXES_WHEN_RAISED) {
    if (!(keyword in before) && !(keyword in after)) continue;
    const b = toBigIntBound(before[keyword]);
    const a = toBigIntBound(after[keyword]);
    if (b === a) continue;
    if (a === undefined) {
      findings.push({
        path: pointer,
        kind: 'additive',
        detail: `${keyword} removed (was ${b})`,
      });
    } else if (b === undefined) {
      findings.push({
        path: pointer,
        kind: 'breaking',
        detail: `${keyword} added (${a})`,
      });
    } else {
      findings.push({
        path: pointer,
        kind: a > b ? 'additive' : 'breaking',
        detail: `${keyword} ${b} -> ${a}`,
      });
    }
  }
  for (const keyword of RELAXES_WHEN_LOWERED) {
    if (!(keyword in before) && !(keyword in after)) continue;
    const b = toBigIntBound(before[keyword]);
    const a = toBigIntBound(after[keyword]);
    if (b === a) continue;
    if (a === undefined) {
      findings.push({
        path: pointer,
        kind: 'additive',
        detail: `${keyword} removed (was ${b})`,
      });
    } else if (b === undefined) {
      findings.push({
        path: pointer,
        kind: 'breaking',
        detail: `${keyword} added (${a})`,
      });
    } else {
      findings.push({
        path: pointer,
        kind: a < b ? 'additive' : 'breaking',
        detail: `${keyword} ${b} -> ${a}`,
      });
    }
  }
  if ('x-gala-maximum' in before || 'x-gala-maximum' in after) {
    diffBoundKeyword(
      pointer,
      'x-gala-maximum',
      before['x-gala-maximum'],
      after['x-gala-maximum'],
      findings,
    );
  }
  if (
    'x-gala-maxCanonicalBytes' in before ||
    'x-gala-maxCanonicalBytes' in after
  ) {
    diffBoundKeyword(
      pointer,
      'x-gala-maxCanonicalBytes',
      before['x-gala-maxCanonicalBytes'],
      after['x-gala-maxCanonicalBytes'],
      findings,
    );
  }
  for (const keyword of X_GALA_BOUND_KEYWORDS) {
    if (keyword in before || keyword in after) {
      diffBoundKeyword(
        pointer,
        keyword,
        before[keyword],
        after[keyword],
        findings,
      );
    }
  }

  const beforeAdditional = before.additionalProperties;
  const afterAdditional = after.additionalProperties;
  if (beforeAdditional !== undefined || afterAdditional !== undefined) {
    const beforeClosed = beforeAdditional === false;
    const afterClosed = afterAdditional === false;
    if (beforeClosed && !afterClosed) {
      findings.push({
        path: pointer,
        kind: 'additive',
        detail: 'additionalProperties opened',
      });
    } else if (!beforeClosed && afterClosed) {
      findings.push({
        path: pointer,
        kind: 'breaking',
        detail: 'additionalProperties closed',
      });
    }
  }

  if (pointer === '#') {
    const beforeDefs = before.$defs;
    const afterDefs = after.$defs;
    const beforeNames = new Set(
      typeof beforeDefs === 'object' && beforeDefs !== null
        ? Object.keys(beforeDefs)
        : [],
    );
    const afterNames = new Set(
      typeof afterDefs === 'object' && afterDefs !== null
        ? Object.keys(afterDefs)
        : [],
    );
    for (const name of beforeNames) {
      if (!afterNames.has(name)) {
        findings.push({
          path: '#/$defs',
          kind: 'breaking',
          detail: `$defs.${name} removed`,
        });
      }
    }
    for (const name of afterNames) {
      if (!beforeNames.has(name)) {
        findings.push({
          path: '#/$defs',
          kind: 'additive',
          detail: `$defs.${name} added`,
        });
      }
    }
  }

  const childKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of childKeys) {
    if (key === 'required' || key === 'enum' || key === 'const') continue;
    const childPointer = `${pointer}/${key}`;
    const beforeChild = before[key];
    const afterChild = after[key];
    if (Array.isArray(beforeChild) && Array.isArray(afterChild)) {
      const length = Math.max(beforeChild.length, afterChild.length);
      for (let index = 0; index < length; index += 1) {
        diffSchema(
          `${childPointer}/${index}`,
          beforeChild[index],
          afterChild[index],
          findings,
        );
      }
    } else {
      diffSchema(childPointer, beforeChild, afterChild, findings);
    }
  }
}

/**
 * Diff every baseline root against its current committed schema.
 *
 * @returns {Promise<CompatibilityFinding[]>} every finding, across all roots
 */
export async function findCompatibilityChanges() {
  const files = (await readdir(BASELINE_DIRECTORY)).filter((file) =>
    file.endsWith('.schema.json'),
  );
  /** @type {CompatibilityFinding[]} */
  const findings = [];
  for (const file of files) {
    const [baseline, current] = await Promise.all([
      readFile(path.join(BASELINE_DIRECTORY, file), 'utf8').then(JSON.parse),
      readFile(path.join(SCHEMAS_DIRECTORY, file), 'utf8').then(JSON.parse),
    ]);
    /** @type {CompatibilityFinding[]} */
    const rootFindings = [];
    diffSchema('#', baseline, current, rootFindings);
    for (const finding of rootFindings) {
      findings.push({ ...finding, path: `${file}${finding.path.slice(1)}` });
    }
  }
  return findings;
}

async function updateBaseline() {
  await rm(BASELINE_DIRECTORY, { force: true, recursive: true });
  await cp(SCHEMAS_DIRECTORY, BASELINE_DIRECTORY, { recursive: true });
  process.stdout.write(
    `Updated compatibility baseline from the current schemas/ (${(await readdir(BASELINE_DIRECTORY)).length} files).\n`,
  );
}

async function main() {
  const arguments_ = process.argv.slice(2);
  if (arguments_.length === 1 && arguments_[0] === '--update-baseline') {
    await updateBaseline();
    return;
  }
  if (arguments_.length > 0) {
    throw new TypeError(
      'Usage: check-backward-compatibility [--update-baseline]',
    );
  }
  const findings = await findCompatibilityChanges();
  const breaking = findings.filter((finding) => finding.kind === 'breaking');
  if (breaking.length > 0) {
    throw new Error(
      `${breaking.length} breaking change(s) against the committed compatibility baseline ` +
        '(compatibility/baseline-schemas/; see docs/COMPATIBILITY.md):\n' +
        breaking
          .map((finding) => `  ${finding.path}: ${finding.detail}`)
          .join('\n') +
        '\n\nA breaking change is not forbidden, but it must be a deliberate, reviewed ' +
        'decision documented in CHANGELOG.md -- see docs/COMPATIBILITY.md. Once reviewed, ' +
        'run `npm run compatibility:baseline:update` to accept it as the new baseline.',
    );
  }
  const additive = findings.filter((finding) => finding.kind === 'additive');
  process.stdout.write(
    `No breaking changes against the committed compatibility baseline` +
      (additive.length > 0
        ? ` (${additive.length} additive change(s)).\n`
        : '.\n'),
  );
}

await runIfMain(import.meta.url, main);

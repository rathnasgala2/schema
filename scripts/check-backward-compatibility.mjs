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
const SCHEMA_INVENTORY_PATH = path.resolve(
  import.meta.dirname,
  '..',
  'docs',
  'catalogs',
  'schema-inventory.json',
);

/** Numeric-bound keywords, and whether raising the bound is additive. */
const RELAXES_WHEN_RAISED = new Set([
  'maxLength',
  'maxItems',
  'maxProperties',
  'maxContains',
  'maximum',
  'exclusiveMaximum',
]);
const RELAXES_WHEN_LOWERED = new Set([
  'minLength',
  'minItems',
  'minProperties',
  'minContains',
  'minimum',
  'exclusiveMinimum',
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
 * Normalize a JSON Schema `type` keyword value (a single type name or an
 * array of them) into a set, for widening/narrowing comparison.
 *
 * @param {unknown} value the `type` keyword's value
 * @returns {Set<string> | undefined} the type set, or undefined if `type`
 *   was not present
 */
function toTypeSet(value) {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return new Set(value);
  if (typeof value === 'string') return new Set([value]);
  return undefined;
}

/**
 * Deterministically stringify a value for set-membership comparison
 * (object keys sorted; arrays kept in order). Used to compare `oneOf`/
 * `anyOf` branches as a set rather than positionally, so a branch removed
 * from the middle of the list is still detected.
 *
 * @param {unknown} value value to canonicalize
 * @returns {string} a canonical string form
 */
function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const record = /** @type {Record<string, unknown>} */ (value);
    const keys = Object.keys(record).sort();
    return `{${keys
      .map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

/**
 * Diff a schema fragment's `type` keyword. Widening (the after-set is a
 * strict superset of the before-set, e.g. `"string"` ->
 * `["string","null"]`) is additive; anything else that changes the set --
 * narrowing (`["string","null"]` -> `"string"`) or an unrelated change
 * (`"string"` -> `"number"`) -- is breaking.
 *
 * @param {string} pointer JSON Pointer to this fragment
 * @param {Record<string, unknown>} before baseline fragment
 * @param {Record<string, unknown>} after current fragment
 * @param {CompatibilityFinding[]} findings accumulator
 * @returns {void}
 */
function diffType(pointer, before, after, findings) {
  if (!('type' in before) && !('type' in after)) return;
  const beforeTypes = toTypeSet(before.type);
  const afterTypes = toTypeSet(after.type);
  if (beforeTypes === undefined && afterTypes !== undefined) {
    findings.push({
      path: pointer,
      kind: 'breaking',
      detail: `type constraint added: ${[...afterTypes].join('|')}`,
    });
    return;
  }
  if (beforeTypes !== undefined && afterTypes === undefined) {
    findings.push({
      path: pointer,
      kind: 'additive',
      detail: `type constraint removed (was ${[...beforeTypes].join('|')})`,
    });
    return;
  }
  if (beforeTypes === undefined || afterTypes === undefined) return;
  const isSuperset = [...beforeTypes].every((type) => afterTypes.has(type));
  const isSubset = [...afterTypes].every((type) => beforeTypes.has(type));
  if (isSuperset && isSubset) return;
  const detail = `type ${[...beforeTypes].join('|')} -> ${[...afterTypes].join('|')}`;
  findings.push({
    path: pointer,
    kind: isSuperset && !isSubset ? 'additive' : 'breaking',
    detail,
  });
}

/**
 * Diff a schema fragment's `format` keyword. `format` narrows the
 * accepted value space the same way a `pattern` does, so adding one to a
 * property that had none, or changing it to a different format, is
 * breaking; removing it is additive.
 *
 * @param {string} pointer JSON Pointer to this fragment
 * @param {Record<string, unknown>} before baseline fragment
 * @param {Record<string, unknown>} after current fragment
 * @param {CompatibilityFinding[]} findings accumulator
 * @returns {void}
 */
function diffFormat(pointer, before, after, findings) {
  if (!('format' in before) && !('format' in after)) return;
  if (before.format === after.format) return;
  findings.push({
    path: pointer,
    kind: after.format === undefined ? 'additive' : 'breaking',
    detail: `format ${JSON.stringify(before.format)} -> ${JSON.stringify(after.format)}`,
  });
}

/**
 * Diff a schema fragment's `oneOf`/`anyOf` branch lists as sets rather
 * than positionally, so a branch removed from the middle of the list (not
 * just appended/truncated) is still detected. A removed branch is
 * breaking (a document that only matched that branch is now rejected); an
 * added branch is additive.
 *
 * @param {string} pointer JSON Pointer to this fragment
 * @param {Record<string, unknown>} before baseline fragment
 * @param {Record<string, unknown>} after current fragment
 * @param {CompatibilityFinding[]} findings accumulator
 * @returns {void}
 */
function diffComposition(pointer, before, after, findings) {
  for (const keyword of /** @type {const} */ (['oneOf', 'anyOf'])) {
    const beforeBranches = Array.isArray(before[keyword])
      ? before[keyword]
      : undefined;
    const afterBranches = Array.isArray(after[keyword])
      ? after[keyword]
      : undefined;
    if (beforeBranches === undefined && afterBranches === undefined) continue;
    const beforeSet = new Set((beforeBranches ?? []).map(canonicalize));
    const afterSet = new Set((afterBranches ?? []).map(canonicalize));
    for (const branch of beforeSet) {
      if (!afterSet.has(branch)) {
        findings.push({
          path: `${pointer}/${keyword}`,
          kind: 'breaking',
          detail: `${keyword} branch removed`,
        });
      }
    }
    for (const branch of afterSet) {
      if (!beforeSet.has(branch)) {
        findings.push({
          path: `${pointer}/${keyword}`,
          kind: 'additive',
          detail: `${keyword} branch added`,
        });
      }
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
export function diffSchema(pointer, baseline, current, findings) {
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

  diffType(pointer, before, after, findings);
  diffFormat(pointer, before, after, findings);
  diffComposition(pointer, before, after, findings);

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
    if (
      key === 'required' ||
      key === 'enum' ||
      key === 'const' ||
      key === 'oneOf' ||
      key === 'anyOf'
    ) {
      continue;
    }
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
 * The set of root schema files this gate must diff, derived from
 * `docs/catalogs/schema-inventory.json` (SCH-M12) rather than a directory
 * listing: the inventory is the one generated, gated ledger of "which
 * roots exist" (`npm run codegen:check` fails if it drifts from
 * `schemas/`), so deriving the baseline listing from it gives that ledger
 * an actual consumer instead of being read by nobody.
 *
 * @returns {Promise<string[]>} `<contract>.schema.json` basenames, sorted
 */
export async function inventorySchemaFiles() {
  const inventory = JSON.parse(await readFile(SCHEMA_INVENTORY_PATH, 'utf8'));
  const files = /** @type {{contracts?: unknown}} */ (inventory).contracts;
  if (!Array.isArray(files)) {
    throw new TypeError(
      `${SCHEMA_INVENTORY_PATH} has no "contracts" array; cannot derive the compatibility baseline listing from it`,
    );
  }
  return files
    .filter(
      (entry) =>
        typeof entry === 'object' &&
        entry !== null &&
        /** @type {{artifactKind?: unknown}} */ (entry).artifactKind ===
          'JSON_SCHEMA',
    )
    .map((entry) => path.basename(/** @type {{path: string}} */ (entry).path))
    .sort();
}

/**
 * Diff every baseline root against its current committed schema. The set of
 * roots diffed is derived from the schema inventory (see
 * `inventorySchemaFiles`), and is cross-checked against both
 * `compatibility/baseline-schemas/` and `schemas/` so an out-of-step
 * inventory, a stale baseline snapshot, or a schema root added without
 * refreshing either is reported as a finding of its own rather than
 * silently skipped.
 *
 * @returns {Promise<CompatibilityFinding[]>} every finding, across all roots
 */
export async function findCompatibilityChanges() {
  const files = await inventorySchemaFiles();
  const baselineFiles = (await readdir(BASELINE_DIRECTORY))
    .filter((file) => file.endsWith('.schema.json'))
    .sort();
  const currentFiles = (await readdir(SCHEMAS_DIRECTORY))
    .filter((file) => file.endsWith('.schema.json'))
    .sort();
  /** @type {CompatibilityFinding[]} */
  const findings = [];
  for (const file of new Set([...files, ...baselineFiles, ...currentFiles])) {
    if (!files.includes(file)) {
      findings.push({
        path: file,
        kind: 'breaking',
        detail:
          'present in compatibility/baseline-schemas/ or schemas/ but not in ' +
          'docs/catalogs/schema-inventory.json -- regenerate the inventory ' +
          '(npm run codegen:generate) before checking compatibility',
      });
      continue;
    }
    if (!baselineFiles.includes(file)) {
      findings.push({
        path: file,
        kind: 'breaking',
        detail:
          'listed in the schema inventory but missing from ' +
          'compatibility/baseline-schemas/ -- run ' +
          '`npm run compatibility:baseline:update`',
      });
      continue;
    }
    if (!currentFiles.includes(file)) {
      findings.push({
        path: file,
        kind: 'breaking',
        detail: 'listed in the schema inventory but missing from schemas/',
      });
      continue;
    }
  }
  for (const file of files.filter(
    (file) => baselineFiles.includes(file) && currentFiles.includes(file),
  )) {
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

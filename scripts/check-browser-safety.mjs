import { readFile, stat } from 'node:fs/promises';
import module from 'node:module';
import path from 'node:path';

import packageJson from '../package.json' with { type: 'json' };
import { runIfMain } from './run-if-main.mjs';

/**
 * Exported package subpaths that are browser-consumed JavaScript entry
 * points and must therefore stay free of Node builtins, `Buffer`, and
 * `process`.
 *
 * `./generated/typescript` is deliberately excluded: it is generated output
 * (`npm run codegen:generate`), never hand-edited here. As of SCH-M5 it no
 * longer loads a standalone CommonJS structural-validator core through
 * `node:module`'s `createRequire` -- `validateGeneratedDocument` now
 * delegates directly to the `.` export's exact precompiled validator, so its
 * runtime is plain ESM with no reachable Node builtin. It stays off this list
 * because every consumer today (including this repository's App) reaches it
 * only through `import type`, which is erased at compile time and never
 * enters a runtime browser bundle, so there is no live consumer exercising it
 * as a real browser entry point yet; adding it here (with its own closure
 * byte cap) is a follow-up once one exists.
 */
const BROWSER_ENTRY_SUBPATHS = Object.freeze([
  '.',
  './runtime-origins',
  './digest-profiles',
]);

/**
 * Declared upper bound, in bytes, on the package-owned module closure of one
 * browser entry point: every `.js`, `.mjs` and `.json` file in this
 * repository that the entry point statically reaches, which is what a
 * bundler inlines into the chunk. Third-party runtime dependencies (Ajv and
 * ajv-formats) are excluded because they are identical for both entry points
 * and are shared with everything else in a consumer's bundle.
 *
 * `.` is measured, not capped tightly: it binds all twenty contracts'
 * precompiled standalone validators (SCH-C2) and every pinned source-data
 * table by design, and its number is recorded here only so a regression in
 * the narrow export is legible next to it.
 *
 * `./runtime-origins` is capped. The cap is not the 200 kB the App's report
 * suggested: `urn:gala:schema:public-runtime-origins:2.0.0` genuinely uses
 * `gala-bcp47`, `gala-plain-label` and `gala-plain-text`, whose committed
 * invalid fixtures (BCP47_INVALID, PLAIN_LABEL_INVALID, PLAIN_TEXT_INVALID)
 * are only rejected by consulting the Unicode 17 tables (504 kB) and the IANA
 * language subtag registry (344 kB). Dropping those would make the narrow
 * export accept documents the full validator rejects, which the fixture
 * parity test in `test/t10-runtime-origins-export.test.js` forbids. What the
 * narrow export does drop is the 4.5 MB pinned SPDX licence list, the
 * precompiled validators for the other nineteen contracts, and 7,712 of the
 * 7,804 diagnostic rules.
 *
 * @type {Readonly<Record<string, number>>}
 */
const CLOSURE_BYTE_CAPS = Object.freeze({ './runtime-origins': 1_250_000 });

// module.builtinModules never carries the "node:"-prefixed spelling, so a
// bare specifier must have that prefix stripped before the membership test.
const BUILTIN_MODULES = new Set(module.builtinModules);

/**
 * Test whether one bare (non-relative) import specifier names a Node
 * builtin module, in either its bare ("fs") or "node:"-prefixed ("node:fs")
 * spelling.
 *
 * @param {string} specifier bare import specifier
 * @returns {boolean} true if the specifier resolves to a Node builtin
 */
function isBuiltinSpecifier(specifier) {
  const name = specifier.startsWith('node:')
    ? specifier.slice('node:'.length)
    : specifier;
  return BUILTIN_MODULES.has(name);
}

const IMPORT_SPECIFIER_PATTERN =
  /(?:import|export)(?:[^'"();]*?from\s*)?\s*['"]([^'"]+)['"]/gu;
const BARE_IDENTIFIER_PATTERN = /\b(?:Buffer|process)\b/gu;
// `new Function(...)`, a bare `Function(...)` call (not a declaration or a
// property/method access like `myFunction(`), and `eval(...)` are the three
// ways a module can compile code from a string at runtime -- exactly what
// forces `'unsafe-eval'` into a consumer's CSP (SCH-C2). A dynamic
// `import(...)` with a specifier that is not a string/template literal is
// included for the same reason: an unresolvable specifier defeats static
// bundling and can load arbitrary code at runtime.
const EVAL_LIKE_PATTERN =
  /(?:\bnew\s+Function|(?<![\w$.])Function|\beval)\s*\(/gu;
const DYNAMIC_IMPORT_PATTERN = /\bimport\s*\(/gu;

/**
 * Strip line and block comments only, preserving string literal contents
 * (unlike `blankCommentsAndStrings`) so a real import/export specifier
 * survives while a specifier-shaped string inside a comment does not
 * (SCH-L3). This is a deliberately simple lexical pass, not a full parser,
 * matching this repository's existing minimal-dependency script style.
 *
 * @param {string} source module source text
 * @returns {string} source with comments blanked
 */
function blankComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/gu, (match) =>
    match.replace(/[^\n]/gu, ' '),
  );
}

/**
 * Strip line and block comments and string literal contents that would
 * otherwise produce false-positive identifier matches. This is a
 * deliberately simple lexical pass, not a full parser, matching this
 * repository's existing minimal-dependency script style.
 *
 * @param {string} source module source text
 * @returns {string} source with comments and string bodies blanked
 */
function blankCommentsAndStrings(source) {
  return source.replace(
    /\/\*[\s\S]*?\*\/|\/\/[^\n]*|`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/gu,
    (match) => match.replace(/[^\n]/gu, ' '),
  );
}

/**
 * Resolve one package subpath from `package.json` exports to its entry file.
 *
 * @param {string} subpath declared exports key, e.g. "." or "./foo"
 * @returns {string | undefined} relative entry file path, if it is a JS entry
 */
function resolveExportEntry(subpath) {
  const target = /** @type {Record<string, unknown>} */ (packageJson.exports)[
    subpath
  ];
  if (typeof target === 'string') {
    return target.endsWith('.js') ? target : undefined;
  }
  if (target !== null && typeof target === 'object') {
    const conditional = /** @type {Record<string, unknown>} */ (target);
    const imported = conditional.import;
    if (typeof imported === 'string' && imported.endsWith('.js')) {
      return imported;
    }
  }
  return undefined;
}

/**
 * Extract every static import/export specifier from one module's source
 * text, relative and bare alike -- a bare specifier must still be tested
 * against the Node builtin list (SCH-H3: only relative specifiers survived
 * the previous filter, so that test could never fire).
 *
 * @param {string} commentFreeSource module source text with comments blanked
 *   (`blankComments`), so a specifier-shaped string inside a comment is
 *   never walked as a real edge (SCH-L3)
 * @returns {string[]} import/export specifiers, in source order
 */
function extractSpecifiers(commentFreeSource) {
  const specifiers = [];
  IMPORT_SPECIFIER_PATTERN.lastIndex = 0;
  let match;
  while ((match = IMPORT_SPECIFIER_PATTERN.exec(commentFreeSource)) !== null) {
    if (match[1] !== undefined) specifiers.push(match[1]);
  }
  return specifiers;
}

/**
 * Walk the static ESM import graph reachable from one entry file and report
 * every browser-unsafe finding: a Node builtin import, or a `Buffer`/
 * `process` identifier reference in a reachable module's own source.
 *
 * The same walk records the entry point's package-owned module closure — the
 * reachable `.js` sources plus the `.json` documents they import — so the
 * closure can be weighed without a second, near-identical traversal.
 *
 * @param {string} root repository root
 * @param {string} entryRelativePath entry file, relative to root
 * @returns {Promise<{diagnostics: string[], closure: string[]}>} findings and reachable files
 */
async function walkImportGraph(root, entryRelativePath) {
  const diagnostics = [];
  const closure = new Set();
  const visited = new Set();
  const queue = [entryRelativePath];

  while (queue.length > 0) {
    const relativePath = /** @type {string} */ (queue.shift());
    if (visited.has(relativePath)) continue;
    visited.add(relativePath);
    closure.add(relativePath);

    const absolutePath = path.resolve(root, relativePath);
    const source = await readFile(absolutePath, 'utf8');
    const commentFree = blankComments(source);
    const cleaned = blankCommentsAndStrings(source);

    for (const specifier of extractSpecifiers(commentFree)) {
      if (!specifier.startsWith('.')) {
        // Bare specifier: only a Node builtin is this gate's concern (an
        // external package like `ajv` is shared with the rest of a
        // consumer's bundle and is not walked further).
        if (isBuiltinSpecifier(specifier)) {
          diagnostics.push(
            `${relativePath}: imports Node builtin "${specifier}"`,
          );
        }
        continue;
      }
      const resolved = path.relative(
        root,
        path.resolve(path.dirname(absolutePath), specifier),
      );
      if (resolved.endsWith('.js') || resolved.endsWith('.mjs')) {
        queue.push(resolved);
      } else if (resolved.endsWith('.json')) {
        closure.add(resolved);
      }
    }

    BARE_IDENTIFIER_PATTERN.lastIndex = 0;
    const identifiers = new Set();
    let identifierMatch;
    while ((identifierMatch = BARE_IDENTIFIER_PATTERN.exec(cleaned)) !== null) {
      identifiers.add(identifierMatch[0]);
    }
    for (const identifier of [...identifiers].sort()) {
      diagnostics.push(
        `${relativePath}: references browser-unsafe global "${identifier}"`,
      );
    }

    EVAL_LIKE_PATTERN.lastIndex = 0;
    if (EVAL_LIKE_PATTERN.test(cleaned)) {
      diagnostics.push(
        `${relativePath}: calls eval(), Function(), or new Function(), which requires 'unsafe-eval' in a browser CSP`,
      );
    }

    DYNAMIC_IMPORT_PATTERN.lastIndex = 0;
    let dynamicImportMatch;
    while (
      (dynamicImportMatch = DYNAMIC_IMPORT_PATTERN.exec(cleaned)) !== null
    ) {
      const afterParen = source
        .slice(dynamicImportMatch.index + dynamicImportMatch[0].length)
        .match(/^\s*(\S)/u);
      const nextCharacter = afterParen?.[1];
      if (
        nextCharacter !== '"' &&
        nextCharacter !== "'" &&
        nextCharacter !== '`'
      ) {
        diagnostics.push(
          `${relativePath}: dynamic import() with a non-literal specifier`,
        );
      }
    }
  }

  return { diagnostics, closure: [...closure].sort() };
}

/**
 * Measure one entry point's package-owned module closure: the total byte
 * size, on disk, of every `.js`/`.json` file the entry point statically
 * reaches, which is what a bundler would inline into the chunk.
 *
 * @param {string} root repository root
 * @param {string} entryRelativePath entry file, relative to root
 * @returns {Promise<{bytes: number, files: string[]}>} closure weight
 */
export async function measureEntryClosure(root, entryRelativePath) {
  const { closure } = await walkImportGraph(root, entryRelativePath);
  let bytes = 0;
  for (const file of closure) {
    bytes += (await stat(path.resolve(root, file))).size;
  }
  return { bytes, files: closure };
}

/**
 * Walk one declared entry point and report its browser-safety findings.
 *
 * @param {string} root repository root
 * @param {string} entrySubpath declared exports key
 * @returns {Promise<string[]>} stable diagnostics for this entry point
 */
async function checkEntry(root, entrySubpath) {
  const entryRelativePath = resolveExportEntry(entrySubpath);
  if (entryRelativePath === undefined) return [];
  const { diagnostics } = await walkImportGraph(root, entryRelativePath);
  const cap = CLOSURE_BYTE_CAPS[entrySubpath];
  if (cap !== undefined) {
    const { bytes } = await measureEntryClosure(root, entryRelativePath);
    if (bytes > cap) {
      diagnostics.push(
        `${entrySubpath}: package-owned module closure is ${bytes} bytes, over the declared ${cap}-byte cap`,
      );
    }
  }
  return diagnostics;
}

async function main() {
  const root = path.resolve(import.meta.dirname, '..');
  const diagnostics = [];
  for (const entrySubpath of BROWSER_ENTRY_SUBPATHS) {
    diagnostics.push(...(await checkEntry(root, entrySubpath)));
  }

  if (diagnostics.length > 0) {
    throw new Error(
      `Browser-safety gate failed for exported subpath(s) ${BROWSER_ENTRY_SUBPATHS.join(', ')}:\n${diagnostics.join('\n')}`,
    );
  }

  process.stdout.write(
    `Verified browser-consumed subpath(s) ${BROWSER_ENTRY_SUBPATHS.join(', ')}: no reachable Node builtin import, Buffer/process reference, eval()/Function() call, or non-literal dynamic import().\n`,
  );
}

await runIfMain(import.meta.url, main);

export { walkImportGraph, resolveExportEntry };

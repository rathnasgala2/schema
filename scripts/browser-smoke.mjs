// Runs only under `node --experimental-vm-modules` (see test/browser-smoke.test.js,
// which spawns this file as a child process with that flag). It genuinely
// executes the package's browser-consumed "." export inside a jsdom window
// realm that has no Buffer, no process, and no CommonJS `require` — the
// same shape of environment the Vite-served App runs in. This is the test
// that would have caught the original `TextDecoder`-from-`node:util` crash:
// see the repository README/CHANGELOG for how to prove that (temporarily
// revert one fix and rerun; it fails, then re-apply and it passes again).
import { readFile } from 'node:fs/promises';
import nodeModule from 'node:module';
import path from 'node:path';
import vm from 'node:vm';

const BUILTIN_MODULES = new Set(nodeModule.builtinModules);

import { JSDOM } from 'jsdom';

const root = path.resolve(import.meta.dirname, '..');
const entry = path.resolve(root, 'src/index.js');
const fixturePath = path.resolve(
  root,
  'examples/valid/repository/canonical.json',
);

/** @type {Map<string, Promise<vm.Module>>} */
const moduleCache = new Map();

/** @type {Map<string, Promise<vm.Module>>} */
const bareModuleCache = new Map();

/**
 * Load a bare (non-relative, non-builtin) package specifier in the outer
 * Node realm and re-expose it as a synthetic module in the vm context.
 *
 * @param {string} specifier bare package specifier
 * @param {vm.Context} context the jsdom-backed vm context
 * @returns {Promise<vm.Module>} synthetic module wrapping the real exports
 */
function loadBareModule(specifier, context) {
  const cached = bareModuleCache.get(specifier);
  if (cached) return cached;
  const pending = (async () => {
    const namespace = await import(specifier);
    const names = Object.keys(namespace);
    const synthetic = new vm.SyntheticModule(
      names,
      function evaluate() {
        for (const name of names) this.setExport(name, namespace[name]);
      },
      { identifier: `bare:${specifier}`, context },
    );
    await synthetic.link(async () => {
      throw new Error('unreachable: synthetic bare module has no imports');
    });
    await synthetic.evaluate();
    return synthetic;
  })();
  bareModuleCache.set(specifier, pending);
  return pending;
}

/**
 * Load and link one module (JavaScript or JSON) at an absolute file path
 * inside the shared jsdom-backed vm context.
 *
 * @param {string} absolutePath absolute module file path
 * @param {vm.Context} context the jsdom-backed vm context
 * @returns {Promise<vm.Module>} the linked, unevaluated module
 */
function loadModule(absolutePath, context) {
  const cached = moduleCache.get(absolutePath);
  if (cached) return cached;

  const pending = (async () => {
    if (absolutePath.endsWith('.json')) {
      // Evaluate the JSON text as a script *inside* the vm context (rather
      // than JSON.parse-ing it in the outer Node realm and wrapping the
      // result), so the parsed object's prototype chain belongs to the
      // context's own Object, matching what a real browser's native JSON
      // module import would produce. Mixing outer-realm objects into
      // context-realm code silently breaks `instanceof`/prototype checks.
      const text = await readFile(absolutePath, 'utf8');
      JSON.parse(text); // fail fast with a clear error on malformed JSON
      const jsonModule = new vm.SourceTextModule(`export default ${text};`, {
        identifier: absolutePath,
        context,
      });
      await jsonModule.link(async () => {
        throw new Error('unreachable: JSON module has no imports');
      });
      await jsonModule.evaluate();
      return jsonModule;
    }

    const source = await readFile(absolutePath, 'utf8');
    const sourceModule = new vm.SourceTextModule(source, {
      identifier: absolutePath,
      context,
      importModuleDynamically: /** @type {never} */ (undefined),
    });

    await sourceModule.link(async (specifier) => {
      if (specifier.startsWith('.')) {
        const resolved = path.resolve(path.dirname(absolutePath), specifier);
        return loadModule(resolved, context);
      }
      const bareName = specifier.startsWith('node:')
        ? specifier.slice('node:'.length)
        : specifier;
      if (
        specifier.startsWith('node:') ||
        BUILTIN_MODULES.has(bareName) ||
        BUILTIN_MODULES.has(specifier)
      ) {
        // This is the check that makes the test meaningful: a real browser
        // has no Node builtins at all, so this smoke test must refuse to
        // silently satisfy one the way `loadBareModule` below satisfies an
        // ordinary browser-published npm dependency. Without this, this
        // helper would transparently load e.g. "node:util" from the outer
        // Node realm and the original TextDecoder-from-node:util bug would
        // pass undetected.
        throw new Error(
          `browser smoke: ${absolutePath} imports Node builtin "${specifier}", which does not exist in a real browser`,
        );
      }
      // Bare package specifiers (ajv, ajv-formats): these are ordinary,
      // browser-published npm dependencies, not Node builtins. Load the
      // real module in the outer (Node) realm — the only way to run a
      // published npm package's own build at all — and re-expose its
      // already-evaluated exports into the jsdom-backed vm context as a
      // synthetic module. This does not smoke-test ajv's own browser
      // safety (out of this package's control); it only keeps this
      // package's own source executing inside the browser-shaped realm,
      // which is what this gate exists to prove.
      return loadBareModule(specifier, context);
    });

    return sourceModule;
  })();

  moduleCache.set(absolutePath, pending);
  return pending;
}

async function main() {
  // `runScripts: "outside-only"` makes jsdom contextify its own window with
  // vm itself (no inline <script> execution), and expose that same context
  // via getInternalVMContext() below. Running our modules in a *separate*
  // vm.createContext(window) would create a second, distinct realm whose
  // Object/Array/etc. differ by identity from jsdom's own window globals,
  // breaking every `instanceof`/prototype-identity check in this package's
  // own validated-object code — so this package's code must run inside
  // jsdom's actual realm, not a second one layered on top of it.
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'https://localhost:5173/',
    runScripts: 'outside-only',
  });
  const window = /** @type {Record<string, unknown>} */ (
    /** @type {unknown} */ (dom.window)
  );

  // A real jsdom global scope: TextEncoder/TextDecoder exist (they are
  // standard browser globals), but Buffer, process, require and module do
  // not. Assert that up front so a future jsdom version quietly adding one
  // of them cannot silently defeat this test.
  for (const forbidden of ['Buffer', 'process', 'require', 'module']) {
    if (forbidden in window) {
      throw new Error(
        `browser smoke: jsdom window unexpectedly defines "${forbidden}"; this test can no longer prove browser safety`,
      );
    }
  }
  if (typeof window.TextEncoder !== 'function') {
    throw new Error('browser smoke: jsdom window has no TextEncoder global');
  }

  const context = dom.getInternalVMContext();
  window.console = console;
  const entryModule = await loadModule(entry, context);
  await entryModule.evaluate();

  const namespace = /** @type {{
    validateGalaDocument: (schemaId: string, value: unknown) => {
      valid: boolean,
      diagnostics: readonly unknown[],
    },
  }} */ (entryModule.namespace);

  // Load the fixture the same way as every other JSON dependency (evaluated
  // as a module *inside* the vm context) so the document handed to the
  // validator has the context's own realm identity, not the outer Node
  // realm's — matching how a browser-loaded fixture would actually arrive.
  const fixtureModule = /** @type {{ namespace: { default: unknown } }} */ (
    /** @type {unknown} */ (await loadModule(fixturePath, context))
  );
  const fixture = fixtureModule.namespace.default;
  const result = namespace.validateGalaDocument(
    /** @type {{ schemaId: string }} */ (fixture).schemaId,
    fixture,
  );

  if (result.valid !== true || result.diagnostics.length !== 0) {
    throw new Error(
      `browser smoke: expected the canonical fixture to validate cleanly, got ${JSON.stringify(result)}`,
    );
  }

  process.stdout.write('BROWSER_SMOKE_OK\n');
}

main().catch((error) => {
  process.stderr.write(`${error?.stack ?? error}\n`);
  process.exitCode = 1;
});

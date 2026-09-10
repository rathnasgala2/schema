import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { runIfMain } from './run-if-main.mjs';

/**
 * Read a declaration tree into a stable relative-path-to-content map.
 *
 * @param {string} root absolute tree root
 * @param {string} [directory] current relative directory
 * @returns {Promise<Map<string, string>>} declaration files
 */
async function readDeclarationTree(root, directory = '') {
  const absoluteDirectory = path.join(root, directory);
  const entries = (
    await readdir(absoluteDirectory, { withFileTypes: true })
  ).sort((left, right) => left.name.localeCompare(right.name));
  const files = new Map();

  for (const entry of entries) {
    const relativePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const nestedFiles = await readDeclarationTree(root, relativePath);
      for (const [nestedPath, content] of nestedFiles) {
        files.set(nestedPath, content);
      }
      continue;
    }
    if (!entry.isFile()) {
      throw new Error(
        `Declaration output contains a special file: ${relativePath}`,
      );
    }
    files.set(
      relativePath,
      await readFile(path.join(root, relativePath), 'utf8'),
    );
  }

  return files;
}

/**
 * Compare committed and freshly emitted declaration trees.
 *
 * @param {string} committedRoot absolute committed tree root
 * @param {string} emittedRoot absolute fresh-emission tree root
 * @returns {Promise<string[]>} stable drift diagnostics
 */
export async function findDeclarationDrift(committedRoot, emittedRoot) {
  const [committed, emitted] = await Promise.all([
    readDeclarationTree(committedRoot),
    readDeclarationTree(emittedRoot),
  ]);
  const paths = [...new Set([...committed.keys(), ...emitted.keys()])].sort();

  return paths.flatMap((relativePath) => {
    if (!committed.has(relativePath)) {
      return [`missing committed declaration: ${relativePath}`];
    }
    if (!emitted.has(relativePath)) {
      return [`unexpected committed declaration: ${relativePath}`];
    }
    if (committed.get(relativePath) !== emitted.get(relativePath)) {
      return [`stale committed declaration: ${relativePath}`];
    }
    return [];
  });
}

/**
 * Emit declarations through the lockfile-installed TypeScript compiler.
 *
 * @param {string} outputDirectory absolute isolated output directory
 */
function emitDeclarations(outputDirectory) {
  const executableName = process.platform === 'win32' ? 'tsc.cmd' : 'tsc';
  const executable = path.resolve('node_modules/.bin', executableName);
  const result = spawnSync(
    executable,
    ['--project', 'tsconfig.declarations.json', '--outDir', outputDirectory],
    { encoding: 'utf8', shell: false },
  );

  if (result.status !== 0) {
    process.stderr.write(result.stdout);
    process.stderr.write(result.stderr);
    throw new Error(
      `Declaration emission failed with exit code ${result.status}`,
    );
  }
}

async function main() {
  const temporaryDirectory = await mkdtemp(
    path.join(tmpdir(), 'gala-schema-declarations-'),
  );
  try {
    emitDeclarations(temporaryDirectory);
    const drift = await findDeclarationDrift(
      path.resolve('types'),
      temporaryDirectory,
    );
    if (drift.length > 0) {
      throw new Error(
        `Declaration output is stale; run npm run declarations:generate\n${drift.join('\n')}`,
      );
    }
    process.stdout.write(
      'Committed declarations match a fresh isolated emit.\n',
    );
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

await runIfMain(import.meta.url, main);

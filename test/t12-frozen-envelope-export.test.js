import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import {
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

import * as publicSurface from '../src/frozen-envelope.js';
import {
  canonicalizeJcsBytes,
  domainSeparatedSha256,
  sha256Tagged,
} from '../src/internal/canonical-jcs.js';
import * as internalModule from '../src/internal/frozen-envelope.js';
import { measureEntryClosure } from '../scripts/check-browser-safety.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const SUBPATH = '@rathnasgala2/schemas/frozen-envelope';

/**
 * The pinned public export-name set. Adding, renaming or removing a public
 * name is a contract change and must be reviewed here, in the README and in
 * the CHANGELOG together.
 */
const PINNED_EXPORT_NAMES = Object.freeze(['validateFrozenEnvelope']);

/**
 * The pinned package-owned module closure of the entry point. The validator
 * is Node-only (it compares byte strings through `Buffer`), so it is not
 * walked by the browser-safety gate; this pin is what keeps a future import
 * from silently widening what a consumer bundles.
 */
const PINNED_CLOSURE = Object.freeze([
  'src/frozen-envelope.js',
  'src/internal/bytes.js',
  'src/internal/canonical-jcs.js',
  'src/internal/frozen-envelope.js',
  'src/internal/generated/unicode17.json',
  'src/internal/sha256.js',
  'src/internal/unicode17.js',
]);

const ENCODER = new TextEncoder();

/**
 * Concatenate byte chunks into one Uint8Array.
 *
 * @param {Uint8Array[]} chunks chunks in order
 * @returns {Uint8Array} concatenation
 */
function concatBytes(chunks) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

/**
 * Encode one envelope record: kind (u8), path length (u32 BE), content length
 * (u64 BE), path bytes, content bytes.
 *
 * @param {number} kind record kind
 * @param {string} recordPath record path
 * @param {Uint8Array} content record content
 * @returns {Uint8Array} encoded record
 */
function encodeRecord(kind, recordPath, content) {
  const pathBytes = ENCODER.encode(recordPath);
  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint8(0, kind);
  view.setUint32(1, pathBytes.length);
  view.setBigUint64(5, BigInt(content.length));
  return concatBytes([header, pathBytes, content]);
}

/**
 * Build one minimal, internally coherent frozen envelope: a single HTML route
 * plus the three metadata records with agreeing digests.
 *
 * @returns {Uint8Array} envelope bytes
 */
function buildMinimalEnvelope() {
  const routePath = 'index.html';
  const routeContent = ENCODER.encode('<!doctype html><h1>Frozen</h1>');
  const entry = {
    path: routePath,
    byteLength: String(routeContent.length),
    sha256: sha256Tagged(routeContent),
  };
  const artifactDigest = domainSeparatedSha256(
    'GALA-ARTIFACT-V2\0',
    canonicalizeJcsBytes([entry]),
  );
  const projection = {
    schemaId: 'urn:gala:schema:artifact-manifest:2.0.0',
    schemaVersion: '2.0.0',
    artifactFileCount: '1',
    artifactByteCount: entry.byteLength,
    routes: [
      {
        ...entry,
        mediaType: 'text/html; charset=utf-8',
        routeClass: 'html',
        interactionBearing: false,
      },
    ],
    assets: [],
    artifactDigest,
  };
  const manifest = {
    ...projection,
    artifactId: '018f47ca-4df5-7a74-b91f-0123456789ab',
    manifestDigest: domainSeparatedSha256(
      'GALA-ARTIFACT-MANIFEST-V2\0',
      canonicalizeJcsBytes(projection),
    ),
  };
  const sbomBytes = canonicalizeJcsBytes({
    SPDXID: 'SPDXRef-DOCUMENT',
    spdxVersion: 'SPDX-2.3',
  });
  const provenance = {
    schemaId: 'urn:gala:metadata:build-provenance:2.0.0',
    schemaVersion: '2.0.0',
    artifactDigest,
    manifestDigest: manifest.manifestDigest,
    sbomDigest: sha256Tagged(sbomBytes),
  };
  const count = new Uint8Array(4);
  new DataView(count.buffer).setUint32(0, 4);
  return concatBytes([
    ENCODER.encode('GALA-FROZEN-ENVELOPE-V2\n'),
    count,
    encodeRecord(0x01, routePath, routeContent),
    encodeRecord(
      0x02,
      'metadata/artifact-manifest.jcs',
      canonicalizeJcsBytes(manifest),
    ),
    encodeRecord(
      0x03,
      'metadata/provenance.jcs',
      canonicalizeJcsBytes(provenance),
    ),
    encodeRecord(0x04, 'metadata/sbom.spdx.json', sbomBytes),
  ]);
}

/**
 * Read the stable code of a rejecting validator call.
 *
 * @param {(bytes: Uint8Array) => unknown} validate validator under test
 * @param {Uint8Array} bytes candidate bytes
 * @returns {string} rejection code
 */
function rejectionCode(validate, bytes) {
  try {
    validate(bytes);
  } catch (error) {
    assert.ok(error instanceof TypeError);
    assert.ok('code' in error && typeof error.code === 'string');
    assert.equal(error.message, error.code);
    return error.code;
  }
  assert.fail('expected the validator to reject');
}

/**
 * Pack this repository into a tarball, extract it, and mount it under a
 * throw-away consumer directory's `node_modules` so the package resolves
 * exactly as a published consumer resolves it.
 *
 * @param {string} workDirectory empty scratch directory
 * @returns {Promise<{packedFiles: string[], consumerDirectory: string}>} pack listing and consumer root
 */
async function packAndMount(workDirectory) {
  const bundledNpm = path.join(path.dirname(process.execPath), 'npm');
  const npmCli = existsSync(bundledNpm) ? bundledNpm : 'npm';
  const output = execFileSync(
    npmCli,
    ['pack', '--json', '--ignore-scripts', '--pack-destination', workDirectory],
    { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
  );
  const [packed] =
    /** @type {{filename: string, files: {path: string}[]}[]} */ (
      JSON.parse(output)
    );
  assert.ok(packed);
  execFileSync('tar', ['-xzf', packed.filename], {
    cwd: workDirectory,
    stdio: 'ignore',
  });
  const scopeDirectory = path.join(
    workDirectory,
    'consumer',
    'node_modules',
    '@rathnasgala2',
  );
  await mkdir(scopeDirectory, { recursive: true });
  await rename(
    path.join(workDirectory, 'package'),
    path.join(scopeDirectory, 'schemas'),
  );
  return {
    packedFiles: packed.files.map((file) => file.path),
    consumerDirectory: path.join(workDirectory, 'consumer'),
  };
}

test('the public export surface is exactly the pinned name set', async () => {
  assert.deepEqual(Object.keys(publicSurface).sort(), [...PINNED_EXPORT_NAMES]);
  const packageJson = JSON.parse(
    await readFile(path.resolve(ROOT, 'package.json'), 'utf8'),
  );
  assert.deepEqual(packageJson.exports['./frozen-envelope'], {
    types: './types/frozen-envelope.d.ts',
    import: './src/frozen-envelope.js',
  });
  const declaration = await readFile(
    path.resolve(ROOT, 'types/frozen-envelope.d.ts'),
    'utf8',
  );
  for (const name of PINNED_EXPORT_NAMES) {
    assert.match(declaration, new RegExp(`\\b${name}\\b`, 'u'), name);
  }
});

test('the public function is the internal validator, not a copy, and the surface is read-only', () => {
  assert.equal(
    publicSurface.validateFrozenEnvelope,
    internalModule.validateFrozenEnvelope,
  );
  assert.equal(typeof publicSurface.validateFrozenEnvelope, 'function');
  // An ESM namespace object is sealed and its bindings are immutable: a new
  // member cannot be defined and an existing one cannot be reassigned.
  // The namespace is reached through a local alias so the assertion exercises
  // the runtime object, not the static import binding.
  const namespace = /** @type {Record<string, unknown>} */ (
    Object(publicSurface)
  );
  assert.ok(Object.isSealed(namespace));
  assert.throws(
    () => Object.defineProperty(namespace, 'forged', { value: () => {} }),
    TypeError,
  );
  assert.equal(
    Reflect.set(namespace, 'validateFrozenEnvelope', () => {}),
    false,
  );
  assert.equal(
    publicSurface.validateFrozenEnvelope,
    internalModule.validateFrozenEnvelope,
  );
});

test('the export validates a coherent envelope and rejects with stable codes', () => {
  const envelope = buildMinimalEnvelope();
  const result = publicSurface.validateFrozenEnvelope(envelope);
  assert.equal(result.recordCount, 4);
  assert.equal(result.records.length, 4);
  assert.deepEqual(
    result.records.map((record) => record.kind),
    [0x01, 0x02, 0x03, 0x04],
  );
  assert.equal(result.artifactManifest.artifactDigest, result.artifactDigest);
  assert.equal(result.buildProvenance.manifestDigest, result.manifestDigest);
  assert.equal(result.buildProvenance.sbomDigest, result.sbomDigest);
  assert.equal(result.frozenEnvelopeByteCount, String(envelope.length));
  assert.equal(result.frozenEnvelopeDigest, sha256Tagged(envelope));
  assert.match(result.provenanceDigest, /^sha256:[0-9a-f]{64}$/u);
  assert.equal(
    rejectionCode(publicSurface.validateFrozenEnvelope, ENCODER.encode('nope')),
    'FROZEN_ENVELOPE_MAGIC_INVALID',
  );
  assert.equal(
    rejectionCode(
      publicSurface.validateFrozenEnvelope,
      envelope.subarray(0, envelope.length - 1),
    ),
    'FROZEN_ENVELOPE_TRUNCATED',
  );
  assert.equal(
    rejectionCode(
      publicSurface.validateFrozenEnvelope,
      /** @type {Uint8Array} */ (/** @type {unknown} */ ('not bytes')),
    ),
    'FROZEN_ENVELOPE_INPUT_INVALID',
  );
});

test('the frozen-envelope entry point keeps its pinned Node-only closure', async () => {
  const closure = await measureEntryClosure(ROOT, 'src/frozen-envelope.js');
  assert.deepEqual(closure.files, [...PINNED_CLOSURE]);
});

test('a consumer resolves the subpath from the packed tarball and gets the same verdicts', async () => {
  const workDirectory = await mkdtemp(
    path.join(os.tmpdir(), 'gala-schemas-frozen-envelope-'),
  );
  try {
    const { packedFiles, consumerDirectory } =
      await packAndMount(workDirectory);
    assert.ok(packedFiles.includes('src/frozen-envelope.js'));
    assert.ok(packedFiles.includes('src/internal/frozen-envelope.js'));
    assert.ok(packedFiles.includes('types/frozen-envelope.d.ts'));

    const entryPath = path.join(consumerDirectory, 'consumer.mjs');
    await writeFile(entryPath, `export * from '${SUBPATH}';\n`);
    const packed = /** @type {typeof publicSurface} */ (
      await import(pathToFileURL(entryPath).href)
    );
    assert.deepEqual(Object.keys(packed).sort(), [...PINNED_EXPORT_NAMES]);
    assert.equal(typeof packed.validateFrozenEnvelope, 'function');

    const envelope = buildMinimalEnvelope();
    assert.deepEqual(
      packed.validateFrozenEnvelope(envelope),
      internalModule.validateFrozenEnvelope(envelope),
    );
    for (const candidate of [
      ENCODER.encode('nope'),
      envelope.subarray(0, envelope.length - 1),
      new Uint8Array(0),
    ]) {
      assert.equal(
        rejectionCode(packed.validateFrozenEnvelope, candidate),
        rejectionCode(internalModule.validateFrozenEnvelope, candidate),
      );
    }
  } finally {
    await rm(workDirectory, { recursive: true, force: true });
  }
});

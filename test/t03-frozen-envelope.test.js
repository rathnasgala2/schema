import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canonicalizeJcsBytes,
  domainSeparatedSha256,
  sha256Tagged,
} from '../src/internal/canonical-jcs.js';
import { validateFrozenEnvelope } from '../src/internal/frozen-envelope.js';

const MAGIC = Buffer.from('GALA-FROZEN-ENVELOPE-V2\n', 'ascii');
const MANIFEST_PATH = 'metadata/artifact-manifest.jcs';
const PROVENANCE_PATH = 'metadata/provenance.jcs';
const SBOM_PATH = 'metadata/sbom.spdx.json';

/**
 * @typedef {object} PayloadFixture
 * @property {string | Uint8Array} path payload path or deliberately raw bytes
 * @property {Uint8Array} content payload bytes
 * @property {'route' | 'asset'} [type] inventory family
 */

/**
 * Encode one envelope record.
 *
 * @param {{kind: number, path: string | Uint8Array, content: Uint8Array}} record record
 * @returns {Buffer} encoded record
 */
function encodeRecord(record) {
  const path =
    typeof record.path === 'string'
      ? Buffer.from(record.path, 'utf8')
      : Buffer.from(record.path);
  const header = Buffer.alloc(13);
  header.writeUInt8(record.kind, 0);
  header.writeUInt32BE(path.length, 1);
  header.writeBigUInt64BE(BigInt(record.content.length), 5);
  return Buffer.concat([header, path, record.content]);
}

/**
 * Encode a complete envelope, optionally lying about its record count.
 *
 * @param {{kind: number, path: string | Uint8Array, content: Uint8Array}[]} records records
 * @param {number} [declaredCount] header count
 * @returns {Buffer} envelope bytes
 */
function encodeEnvelope(records, declaredCount = records.length) {
  const count = Buffer.alloc(4);
  count.writeUInt32BE(declaredCount);
  return Buffer.concat([MAGIC, count, ...records.map(encodeRecord)]);
}

/**
 * Compute and store both manifest-level digests.
 *
 * @param {Record<string, unknown>} manifest manifest object
 * @returns {void}
 */
function refreshManifestDigests(manifest) {
  const routes = /** @type {Record<string, unknown>[]} */ (manifest.routes);
  const assets = /** @type {Record<string, unknown>[]} */ (manifest.assets);
  const entries = [...routes, ...assets]
    .map(({ path, byteLength, sha256 }) => ({ path, byteLength, sha256 }))
    .sort((left, right) =>
      Buffer.compare(
        Buffer.from(String(left.path)),
        Buffer.from(String(right.path)),
      ),
    );
  manifest.artifactDigest = domainSeparatedSha256(
    'GALA-ARTIFACT-V2\0',
    canonicalizeJcsBytes(entries),
  );
  const projection = { ...manifest };
  delete projection.artifactId;
  delete projection.manifestDigest;
  manifest.manifestDigest = domainSeparatedSha256(
    'GALA-ARTIFACT-MANIFEST-V2\0',
    canonicalizeJcsBytes(projection),
  );
}

/**
 * Create internally coherent focused fixture parts.
 *
 * @param {PayloadFixture[]} payloads payloads in encoded order
 * @returns {{
 *   payloads: PayloadFixture[],
 *   manifest: Record<string, unknown>,
 *   provenance: Record<string, unknown>,
 *   sbom: Record<string, unknown>
 * }} fixture parts
 */
function makeParts(payloads) {
  const inventory = payloads.map((payload) => {
    if (typeof payload.path !== 'string') {
      throw new TypeError('fixture inventory paths must be strings');
    }
    return {
      path: payload.path,
      mediaType:
        payload.type === 'asset'
          ? 'application/octet-stream'
          : 'text/html; charset=utf-8',
      byteLength: String(payload.content.length),
      sha256: sha256Tagged(payload.content),
      ...(payload.type === 'asset'
        ? { immutable: true }
        : { routeClass: 'html', interactionBearing: false }),
    };
  });
  const routes = inventory
    .filter((_, index) => payloads[index]?.type !== 'asset')
    .sort((left, right) =>
      Buffer.compare(Buffer.from(left.path), Buffer.from(right.path)),
    );
  const assets = inventory
    .filter((_, index) => payloads[index]?.type === 'asset')
    .sort((left, right) =>
      Buffer.compare(Buffer.from(left.path), Buffer.from(right.path)),
    );
  const manifest = {
    schemaId: 'urn:gala:schema:artifact-manifest:2.0.0',
    schemaVersion: '2.0.0',
    artifactId: '018f47ca-4df5-7a74-b91f-0123456789ab',
    artifactFileCount: String(payloads.length),
    artifactByteCount: payloads
      .reduce((total, payload) => total + BigInt(payload.content.length), 0n)
      .toString(),
    routes,
    assets,
    artifactDigest: '',
    manifestDigest: '',
  };
  refreshManifestDigests(manifest);
  const sbom = {
    SPDXID: 'SPDXRef-DOCUMENT',
    spdxVersion: 'SPDX-2.3',
  };
  const provenance = {
    schemaId: 'urn:gala:metadata:build-provenance:2.0.0',
    schemaVersion: '2.0.0',
    artifactDigest: manifest.artifactDigest,
    manifestDigest: manifest.manifestDigest,
    sbomDigest: sha256Tagged(canonicalizeJcsBytes(sbom)),
  };
  return { payloads, manifest, provenance, sbom };
}

/**
 * Encode fixture parts, with optional exact metadata byte overrides.
 *
 * @param {ReturnType<typeof makeParts>} parts fixture parts
 * @param {{manifest?: Uint8Array, provenance?: Uint8Array, sbom?: Uint8Array}} [overrides] byte overrides
 * @returns {Buffer} envelope
 */
function encodeParts(parts, overrides = {}) {
  return encodeEnvelope([
    ...parts.payloads.map((payload) => ({ kind: 0x01, ...payload })),
    {
      kind: 0x02,
      path: MANIFEST_PATH,
      content: overrides.manifest ?? canonicalizeJcsBytes(parts.manifest),
    },
    {
      kind: 0x03,
      path: PROVENANCE_PATH,
      content: overrides.provenance ?? canonicalizeJcsBytes(parts.provenance),
    },
    {
      kind: 0x04,
      path: SBOM_PATH,
      content: overrides.sbom ?? canonicalizeJcsBytes(parts.sbom),
    },
  ]);
}

/**
 * Assert one exact stable diagnostic.
 *
 * @param {() => unknown} action failing action
 * @param {string} code expected code
 * @returns {void}
 */
function assertCode(action, code) {
  assert.throws(
    action,
    (error) =>
      error instanceof TypeError &&
      'code' in error &&
      error.code === code &&
      error.message === code,
  );
}

test('validates a mixed route/asset envelope and returns every retained digest', () => {
  const parts = makeParts([
    { path: 'a/index.html', content: Buffer.from('<h1>A</h1>') },
    { path: 'z.bin', content: Buffer.from([0, 1, 2]), type: 'asset' },
  ]);
  const bytes = encodeParts(parts);
  const result = validateFrozenEnvelope(bytes);

  assert.equal(result.recordCount, 5);
  assert.deepEqual(
    result.records.map(({ kind, path }) => ({ kind, path })),
    [
      { kind: 0x01, path: 'a/index.html' },
      { kind: 0x01, path: 'z.bin' },
      { kind: 0x02, path: MANIFEST_PATH },
      { kind: 0x03, path: PROVENANCE_PATH },
      { kind: 0x04, path: SBOM_PATH },
    ],
  );
  assert.equal(result.artifactDigest, parts.manifest.artifactDigest);
  assert.equal(result.manifestDigest, parts.manifest.manifestDigest);
  assert.equal(result.sbomDigest, parts.provenance.sbomDigest);
  assert.equal(
    result.provenanceDigest,
    domainSeparatedSha256(
      'GALA-BUILD-PROVENANCE-V2\0',
      canonicalizeJcsBytes(parts.provenance),
    ),
  );
  assert.equal(result.frozenEnvelopeByteCount, String(bytes.length));
  assert.equal(result.frozenEnvelopeDigest, sha256Tagged(bytes));
});

test('accepts the exact structural empty-payload codec boundary', () => {
  const bytes = encodeParts(makeParts([]));
  const result = validateFrozenEnvelope(bytes);

  assert.equal(result.recordCount, 3);
  assert.equal(result.artifactManifest.artifactFileCount, '0');
  assert.equal(result.artifactManifest.artifactByteCount, '0');
  assert.equal(result.frozenEnvelopeByteCount, '929');
  assert.equal(
    result.frozenEnvelopeDigest,
    'sha256:730fa29514fc00d0c85aa76f6c572180527ea3765bd21f0b788f0ecf26c66c66',
  );
});

test('enforces 128-byte segments and the 512-byte path boundary', () => {
  const maximumPath = [
    'a'.repeat(128),
    'b'.repeat(128),
    'c'.repeat(128),
    'd'.repeat(125),
  ].join('/');
  assert.equal(Buffer.byteLength(maximumPath), 512);
  assert.doesNotThrow(() =>
    validateFrozenEnvelope(
      encodeParts(makeParts([{ path: maximumPath, content: Buffer.alloc(0) }])),
    ),
  );

  const oversizedSegment = `${'a'.repeat(129)}/file`;
  assertCode(
    () =>
      validateFrozenEnvelope(
        encodeParts(
          makeParts([{ path: oversizedSegment, content: Buffer.alloc(0) }]),
        ),
      ),
    'FROZEN_ENVELOPE_PATH_INVALID',
  );
  const oversizedPath = `${maximumPath}x`;
  assertCode(
    () =>
      validateFrozenEnvelope(
        encodeParts(
          makeParts([{ path: oversizedPath, content: Buffer.alloc(0) }]),
        ),
      ),
    'FROZEN_ENVELOPE_PATH_INVALID',
  );
});

test('rejects every portable-path forbidden class and reserved stem', () => {
  const invalidPaths = [
    '/absolute',
    'trailing/',
    'two//segments',
    './file',
    '../file',
    'dir/../file',
    'decomposed-e\u0301.txt',
    ' leading.txt',
    'trailing .txt ',
    'trailing-dot.',
    'percent%20file',
    'back\\slash',
    'question?',
    'control\u007f',
    'ignored\u200b',
    'noncharacter\uFDD0',
    'CoN.txt',
    'LPT².log',
  ];
  for (const path of invalidPaths) {
    assertCode(
      () =>
        validateFrozenEnvelope(
          encodeParts(makeParts([{ path, content: Buffer.alloc(0) }])),
        ),
      'FROZEN_ENVELOPE_PATH_INVALID',
    );
  }
});

test('rejects invalid magic, count, lengths, truncation, and trailing bytes', () => {
  const valid = encodeParts(
    makeParts([{ path: 'index.html', content: Buffer.from('ok') }]),
  );
  const badMagic = Buffer.from(valid);
  badMagic[0] = 0;
  assertCode(
    () => validateFrozenEnvelope(badMagic),
    'FROZEN_ENVELOPE_MAGIC_INVALID',
  );

  const badCount = Buffer.from(valid);
  badCount.writeUInt32BE(200_004, MAGIC.length);
  assertCode(
    () => validateFrozenEnvelope(badCount),
    'FROZEN_ENVELOPE_COUNT_INVALID',
  );
  assertCode(
    () => validateFrozenEnvelope(valid.subarray(0, valid.length - 1)),
    'FROZEN_ENVELOPE_TRUNCATED',
  );
  assertCode(
    () => validateFrozenEnvelope(Buffer.concat([valid, Buffer.from([0])])),
    'FROZEN_ENVELOPE_TRAILING_BYTES',
  );

  const overflowingLength = Buffer.from(valid);
  overflowingLength.writeBigUInt64BE(
    0x8000_0000_0000_0000n,
    MAGIC.length + 4 + 5,
  );
  assertCode(
    () => validateFrozenEnvelope(overflowingLength),
    'FROZEN_ENVELOPE_LENGTH_INVALID',
  );
});

test('rejects unknown kinds, wrong record order, and wrong metadata coordinates', () => {
  const parts = makeParts([{ path: 'index.html', content: Buffer.from('ok') }]);
  const payload = parts.payloads[0];
  assert.ok(payload);
  const payloadRecord = {
    kind: 0x01,
    path: payload.path,
    content: payload.content,
  };
  const manifestRecord = {
    kind: 0x02,
    path: MANIFEST_PATH,
    content: canonicalizeJcsBytes(parts.manifest),
  };
  const provenanceRecord = {
    kind: 0x03,
    path: PROVENANCE_PATH,
    content: canonicalizeJcsBytes(parts.provenance),
  };
  const sbomRecord = {
    kind: 0x04,
    path: SBOM_PATH,
    content: canonicalizeJcsBytes(parts.sbom),
  };
  assertCode(
    () =>
      validateFrozenEnvelope(
        encodeEnvelope([
          { ...payloadRecord, kind: 0x05 },
          manifestRecord,
          provenanceRecord,
          sbomRecord,
        ]),
      ),
    'FROZEN_ENVELOPE_KIND_INVALID',
  );
  assertCode(
    () =>
      validateFrozenEnvelope(
        encodeEnvelope([
          payloadRecord,
          provenanceRecord,
          manifestRecord,
          sbomRecord,
        ]),
      ),
    'FROZEN_ENVELOPE_RECORD_ORDER_INVALID',
  );
  assertCode(
    () =>
      validateFrozenEnvelope(
        encodeEnvelope([
          payloadRecord,
          { ...manifestRecord, path: 'metadata/manifest.jcs' },
          provenanceRecord,
          sbomRecord,
        ]),
      ),
    'FROZEN_ENVELOPE_RECORD_ORDER_INVALID',
  );
});

test('rejects non-UTF-8, reserved, unsorted, duplicate, and folded-collision paths', () => {
  const one = makeParts([{ path: 'index.html', content: Buffer.alloc(0) }]);
  const invalidUtf8 = encodeEnvelope([
    { kind: 0x01, path: Buffer.from([0xc3, 0x28]), content: Buffer.alloc(0) },
    {
      kind: 0x02,
      path: MANIFEST_PATH,
      content: canonicalizeJcsBytes(one.manifest),
    },
    {
      kind: 0x03,
      path: PROVENANCE_PATH,
      content: canonicalizeJcsBytes(one.provenance),
    },
    { kind: 0x04, path: SBOM_PATH, content: canonicalizeJcsBytes(one.sbom) },
  ]);
  assertCode(
    () => validateFrozenEnvelope(invalidUtf8),
    'FROZEN_ENVELOPE_PATH_UTF8_INVALID',
  );

  for (const reserved of [MANIFEST_PATH, 'METADATA/PROVENANCE.JCS']) {
    assertCode(
      () =>
        validateFrozenEnvelope(
          encodeParts(
            makeParts([{ path: reserved, content: Buffer.alloc(0) }]),
          ),
        ),
      'FROZEN_ENVELOPE_RESERVED_PATH',
    );
  }
  assertCode(
    () =>
      validateFrozenEnvelope(
        encodeParts(
          makeParts([
            { path: 'z', content: Buffer.alloc(0) },
            { path: 'a', content: Buffer.alloc(0) },
          ]),
        ),
      ),
    'FROZEN_ENVELOPE_PATH_ORDER_INVALID',
  );
  assertCode(
    () =>
      validateFrozenEnvelope(
        encodeParts(
          makeParts([
            { path: 'a', content: Buffer.alloc(0) },
            { path: 'a', content: Buffer.alloc(0) },
          ]),
        ),
      ),
    'FROZEN_ENVELOPE_PATH_COLLISION',
  );
  assertCode(
    () =>
      validateFrozenEnvelope(
        encodeParts(
          makeParts([
            { path: '\uA7CE', content: Buffer.alloc(0) },
            { path: '\uA7CF', content: Buffer.alloc(0) },
          ]),
        ),
      ),
    'FROZEN_ENVELOPE_PATH_COLLISION',
  );
});

test('requires duplicate-key-free compact JCS in all metadata records', () => {
  const parts = makeParts([]);
  assertCode(
    () =>
      validateFrozenEnvelope(
        encodeParts(parts, { manifest: Buffer.from('{"a":1,"a":2}') }),
      ),
    'FROZEN_ENVELOPE_JSON_INVALID',
  );
  assertCode(
    () =>
      validateFrozenEnvelope(
        encodeParts(parts, { manifest: Buffer.from('{ "a": 1 }') }),
      ),
    'FROZEN_ENVELOPE_JCS_INVALID',
  );
  assertCode(
    () =>
      validateFrozenEnvelope(
        encodeParts(parts, { provenance: Buffer.from('{ "a": 1 }') }),
      ),
    'FROZEN_ENVELOPE_JCS_INVALID',
  );
  assertCode(
    () =>
      validateFrozenEnvelope(
        encodeParts(parts, { sbom: Buffer.from([0xc3, 0x28]) }),
      ),
    'FROZEN_ENVELOPE_JSON_INVALID',
  );
});

test('rejects inventory, artifact, manifest, provenance, and SBOM digest substitutions', () => {
  const payload = { path: 'index.html', content: Buffer.from('ok') };

  const changedPayload = makeParts([payload]);
  changedPayload.payloads[0] = { ...payload, content: Buffer.from('no') };
  assertCode(
    () => validateFrozenEnvelope(encodeParts(changedPayload)),
    'FROZEN_ENVELOPE_INVENTORY_MISMATCH',
  );

  const wrongCount = makeParts([payload]);
  wrongCount.manifest.artifactFileCount = '2';
  refreshManifestDigests(wrongCount.manifest);
  wrongCount.provenance.artifactDigest = wrongCount.manifest.artifactDigest;
  wrongCount.provenance.manifestDigest = wrongCount.manifest.manifestDigest;
  assertCode(
    () => validateFrozenEnvelope(encodeParts(wrongCount)),
    'FROZEN_ENVELOPE_INVENTORY_MISMATCH',
  );

  const wrongArtifactDigest = makeParts([payload]);
  wrongArtifactDigest.manifest.artifactDigest = `sha256:${'0'.repeat(64)}`;
  const projection = { ...wrongArtifactDigest.manifest };
  delete projection.artifactId;
  delete projection.manifestDigest;
  wrongArtifactDigest.manifest.manifestDigest = domainSeparatedSha256(
    'GALA-ARTIFACT-MANIFEST-V2\0',
    canonicalizeJcsBytes(projection),
  );
  wrongArtifactDigest.provenance.artifactDigest =
    wrongArtifactDigest.manifest.artifactDigest;
  wrongArtifactDigest.provenance.manifestDigest =
    wrongArtifactDigest.manifest.manifestDigest;
  assertCode(
    () => validateFrozenEnvelope(encodeParts(wrongArtifactDigest)),
    'FROZEN_ENVELOPE_DIGEST_MISMATCH',
  );

  const wrongManifestDigest = makeParts([payload]);
  wrongManifestDigest.manifest.manifestDigest = `sha256:${'0'.repeat(64)}`;
  wrongManifestDigest.provenance.manifestDigest =
    wrongManifestDigest.manifest.manifestDigest;
  assertCode(
    () => validateFrozenEnvelope(encodeParts(wrongManifestDigest)),
    'FROZEN_ENVELOPE_DIGEST_MISMATCH',
  );

  const wrongProvenance = makeParts([payload]);
  wrongProvenance.provenance.artifactDigest = `sha256:${'0'.repeat(64)}`;
  assertCode(
    () => validateFrozenEnvelope(encodeParts(wrongProvenance)),
    'FROZEN_ENVELOPE_PROVENANCE_INVALID',
  );

  const changedSbom = makeParts([payload]);
  changedSbom.sbom.name = 'substituted';
  assertCode(
    () => validateFrozenEnvelope(encodeParts(changedSbom)),
    'FROZEN_ENVELOPE_DIGEST_MISMATCH',
  );
});

test('rejects metadata cap declarations before body slicing or allocation', () => {
  const firstHeader = Buffer.alloc(13);
  firstHeader.writeUInt8(0x02);
  firstHeader.writeUInt32BE(Buffer.byteLength(MANIFEST_PATH), 1);
  firstHeader.writeBigUInt64BE(268_435_457n, 5);
  const count = Buffer.alloc(4);
  count.writeUInt32BE(3);
  const bytes = Buffer.concat([MAGIC, count, firstHeader, Buffer.alloc(26)]);
  assertCode(
    () => validateFrozenEnvelope(bytes),
    'FROZEN_ENVELOPE_METADATA_LIMIT_EXCEEDED',
  );
});

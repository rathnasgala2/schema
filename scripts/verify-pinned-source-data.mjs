import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runIfMain } from './run-if-main.mjs';

const SOURCE_DATA_ROOT = fileURLToPath(
  new URL('../codegen/source-data/', import.meta.url),
);

export const PINNED_SOURCE_DATA = Object.freeze([
  {
    id: 'unicode-17-unicode-data',
    path: 'unicode/17.0.0/ucd/UnicodeData.txt',
    url: 'https://www.unicode.org/Public/17.0.0/ucd/UnicodeData.txt',
    bytes: 2_198_209,
    sha256: '2e1efc1dcb59c575eedf5ccae60f95229f706ee6d031835247d843c11d96470c',
    text: true,
  },
  {
    id: 'unicode-17-derived-normalization-properties',
    path: 'unicode/17.0.0/ucd/DerivedNormalizationProps.txt',
    url: 'https://www.unicode.org/Public/17.0.0/ucd/DerivedNormalizationProps.txt',
    bytes: 1_377_582,
    sha256: '71fd6a206a2c0cdd41feb6b7f656aa31091db45e9cedc926985d718397f9e488',
    text: true,
  },
  {
    id: 'unicode-17-prop-list',
    path: 'unicode/17.0.0/ucd/PropList.txt',
    url: 'https://www.unicode.org/Public/17.0.0/ucd/PropList.txt',
    bytes: 145_465,
    sha256: '130dcddcaadaf071008bdfce1e7743e04fdfbc910886f017d9f9ac931d8c64dd',
    text: true,
  },
  {
    id: 'unicode-17-derived-core-properties',
    path: 'unicode/17.0.0/ucd/DerivedCoreProperties.txt',
    url: 'https://www.unicode.org/Public/17.0.0/ucd/DerivedCoreProperties.txt',
    bytes: 1_134_783,
    sha256: '24c7fed1195c482faaefd5c1e7eb821c5ee1fb6de07ecdbaa64b56a99da22c08',
    text: true,
  },
  {
    id: 'unicode-17-case-folding',
    path: 'unicode/17.0.0/ucd/CaseFolding.txt',
    url: 'https://www.unicode.org/Public/17.0.0/ucd/CaseFolding.txt',
    bytes: 87_539,
    sha256: 'ff8d8fefbf123574205085d6714c36149eb946d717a0c585c27f0f4ef58c4183',
    text: true,
  },
  {
    id: 'unicode-17-idna-mapping-table',
    path: 'unicode/17.0.0/idna/IdnaMappingTable.txt',
    url: 'https://www.unicode.org/Public/17.0.0/idna/IdnaMappingTable.txt',
    bytes: 787_378,
    sha256: '87f05505dc026fdb2bff16132bdc68a8014675836882a9a2b1844540ad3be382',
    text: true,
  },
  {
    id: 'unicode-17-derived-joining-type',
    path: 'unicode/17.0.0/ucd/extracted/DerivedJoiningType.txt',
    url: 'https://www.unicode.org/Public/17.0.0/ucd/extracted/DerivedJoiningType.txt',
    bytes: 40_635,
    sha256: 'f39ebe974825d6736aee15582250307aa532b2cfab3caf3f86bd23fddc9c5c4d',
    text: true,
  },
  {
    id: 'unicode-17-grapheme-break-property',
    path: 'unicode/17.0.0/ucd/auxiliary/GraphemeBreakProperty.txt',
    url: 'https://www.unicode.org/Public/17.0.0/ucd/auxiliary/GraphemeBreakProperty.txt',
    bytes: 99_377,
    sha256: 'd6b51d1d2ae5c33b451b7ed994b48f1f4dc62b2272a5831e7fd418514a6bae89',
    text: true,
  },
  {
    id: 'unicode-17-grapheme-break-test',
    path: 'unicode/17.0.0/ucd/auxiliary/GraphemeBreakTest.txt',
    url: 'https://www.unicode.org/Public/17.0.0/ucd/auxiliary/GraphemeBreakTest.txt',
    bytes: 126_570,
    sha256: 'e2d134d2c52919bace503ebb6a551c1855fe1a1faec18478c78fff254a1793ec',
    text: true,
  },
  {
    id: 'unicode-17-emoji-data',
    path: 'unicode/17.0.0/ucd/emoji/emoji-data.txt',
    url: 'https://www.unicode.org/Public/17.0.0/ucd/emoji/emoji-data.txt',
    bytes: 107_324,
    sha256: '2cb2bb9455cda83e8481541ecf5b6dfda66a3bb89efa3fa7c5297eccf607b72b',
    text: true,
  },
  {
    id: 'unicode-uax29-revision-47',
    path: 'unicode/reports/tr29/tr29-47.html',
    url: 'https://www.unicode.org/reports/tr29/tr29-47.html',
    bytes: 138_801,
    sha256: '130d4e0d3f9da41bf9ad84bf580b3b92edc83886457cbc5a53b432761fd2c6ed',
    text: true,
  },
  {
    id: 'iana-language-subtag-registry',
    path: 'iana/language-subtag-registry/language-subtag-registry',
    url: 'https://www.iana.org/assignments/language-subtag-registry/language-subtag-registry',
    bytes: 731_799,
    sha256: 'be21e91b6851f750a7b1a687f11209d46ad5a8471d6b10a1efc8d1dac4c8a926',
    text: true,
    fileDate: '2026-08-08',
  },
  {
    id: 'iana-language-tag-extensions-registry',
    path: 'iana/language-tag-extensions-registry/language-tag-extensions-registry',
    url: 'https://www.iana.org/assignments/language-tag-extensions-registry/language-tag-extensions-registry',
    bytes: 1_069,
    sha256: 'fdf7764455c493c245a9b3b5b9cd3938391f0637302c3e943fde86aee652e376',
    text: true,
    fileDate: '2014-04-02',
  },
  {
    id: 'iana-ipv4-special-registry',
    path: 'iana/iana-ipv4-special-registry/iana-ipv4-special-registry-1.csv',
    url: 'https://www.iana.org/assignments/iana-ipv4-special-registry/iana-ipv4-special-registry-1.csv',
    bytes: 2_423,
    sha256: 'e3e39e76d00b1677335db8e9a805c7b9480ea2f4dc9e33f0b93cd3a905128d73',
    text: true,
  },
  {
    id: 'iana-ipv6-special-registry',
    path: 'iana/iana-ipv6-special-registry/iana-ipv6-special-registry-1.csv',
    url: 'https://www.iana.org/assignments/iana-ipv6-special-registry/iana-ipv6-special-registry-1.csv',
    bytes: 2_289,
    sha256: '775feea0621dec8735a44fbf30f762e721e8f0a1b3ab7eb341961a88cfce2139',
    text: true,
  },
  {
    id: 'spdx-license-list-3.28.0',
    path: 'spdx/3.28.0/licenses.jsonld',
    url: 'https://raw.githubusercontent.com/spdx/license-list-data/c4a7237ec8f4654e867546f9f409749300f1bf4c/jsonld/licenses.jsonld',
    bytes: 20_892_289,
    sha256: '293418a03e6692c44332a12eb17889af99e20a4d571adfaca4408b203f75686b',
    text: true,
    graphCounts: { licenses: 727, exceptions: 84, crossReferences: 972 },
  },
  {
    id: 'semver-7.8.5-tarball',
    path: 'npm/semver/7.8.5/semver-7.8.5.tgz',
    url: 'https://registry.npmjs.org/semver/-/semver-7.8.5.tgz',
    bytes: 29_399,
    sha256: 'd85045d4300d7d57c891336b95df532e73f34c22ffcd222452b6d08b9d127d5d',
    sha512:
      'Y7/KDsb8LjooZpwaqGyulO6DQlksgCncchHGk+sZIY4SBvUocMBEFH5Ur1fI4dV+Jvl0w6cjvucaIi40puRioA==',
    text: false,
  },
]);

/**
 * Verify one retained artifact before any parser consumes it.
 *
 * @param {Uint8Array} bytes exact artifact bytes
 * @param {(typeof PINNED_SOURCE_DATA)[number]} artifact artifact descriptor
 * @returns {void}
 */
export function verifyPinnedArtifact(bytes, artifact) {
  if (bytes.byteLength !== artifact.bytes) {
    throw new Error(`${artifact.id}: byte count mismatch`);
  }
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (sha256 !== artifact.sha256) {
    throw new Error(`${artifact.id}: SHA-256 mismatch`);
  }
  if ('sha512' in artifact) {
    const sha512 = createHash('sha512').update(bytes).digest('base64');
    if (sha512 !== artifact.sha512) {
      throw new Error(`${artifact.id}: SHA-512 mismatch`);
    }
  }
}

/**
 * Verify every retained pinned input before generation or test use.
 *
 * @param {string} [sourceRoot] retained source-data root
 * @returns {Promise<void>} completion
 */
export async function verifyPinnedSourceData(sourceRoot = SOURCE_DATA_ROOT) {
  for (const artifact of PINNED_SOURCE_DATA) {
    const bytes = await readFile(path.join(sourceRoot, artifact.path));
    verifyPinnedArtifact(bytes, artifact);
  }
}

await runIfMain(import.meta.url, async () => {
  await verifyPinnedSourceData();
  process.stdout.write(
    `Verified ${PINNED_SOURCE_DATA.length} pinned source-data artifacts.\n`,
  );
});

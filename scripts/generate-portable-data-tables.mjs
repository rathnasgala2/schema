import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseDuplicateFreeIJson } from '../src/internal/canonical-jcs.js';
import { parseCanonicalCidr } from '../src/internal/ip-address.js';
import { runIfMain } from './run-if-main.mjs';
import {
  PINNED_SOURCE_DATA,
  verifyPinnedSourceData,
} from './verify-pinned-source-data.mjs';

const SOURCE_ROOT = fileURLToPath(
  new URL('../codegen/source-data/', import.meta.url),
);
const OUTPUT_ROOT = fileURLToPath(
  new URL('../src/internal/generated/', import.meta.url),
);

/**
 * Parse a hexadecimal scalar or inclusive range.
 *
 * @param {string} source range spelling
 * @returns {[number, number]} inclusive range
 */
function parseRange(source) {
  const [first, last = first] = source.trim().split('..');
  if (!first || !last) throw new Error(`invalid Unicode range: ${source}`);
  return [Number.parseInt(first, 16), Number.parseInt(last, 16)];
}

/**
 * Strip comments and blank lines from one Unicode data file.
 *
 * @param {string} source source file
 * @returns {string[]} significant rows
 */
function dataLines(source) {
  return source
    .split('\n')
    .map((line) => line.split('#', 1)[0]?.trim() ?? '')
    .filter(Boolean);
}

/**
 * Merge adjacent ranges that carry the same scalar property.
 *
 * @param {[number, number, string][]} ranges property ranges
 * @returns {[number, number, string][]} merged ranges
 */
function mergePropertyRanges(ranges) {
  /** @type {[number, number, string][]} */
  const merged = [];
  for (const range of ranges.sort((left, right) => left[0] - right[0])) {
    const prior = merged.at(-1);
    if (prior && prior[1] + 1 === range[0] && prior[2] === range[2]) {
      prior[1] = range[1];
    } else {
      merged.push([...range]);
    }
  }
  return merged;
}

/**
 * Parse one conventional Unicode range/property file.
 *
 * @param {string} source source file
 * @param {string} [selectedProperty] optional property-name filter
 * @returns {[number, number, string][]} ranges
 */
function parsePropertyRanges(source, selectedProperty) {
  /** @type {[number, number, string][]} */
  const ranges = [];
  for (const line of dataLines(source)) {
    const fields = line.split(';').map((field) => field.trim());
    const codeRange = fields[0];
    const property = fields[1];
    if (!codeRange || !property)
      throw new Error(`invalid property row: ${line}`);
    if (selectedProperty && property !== selectedProperty) continue;
    const value = selectedProperty ? fields[2] : property;
    if (!value) throw new Error(`missing property value: ${line}`);
    const [first, last] = parseRange(codeRange);
    ranges.push([first, last, value]);
  }
  return mergePropertyRanges(ranges);
}

/**
 * Parse UnicodeData canonical-composition inputs.
 *
 * @param {string} source UnicodeData source
 * @returns {{ combiningClasses: [number, number][], decompositions: [number, number[]][], generalCategories: [number, number, string][], bidiClasses: [number, number, string][] }} parsed tables
 */
function parseUnicodeData(source) {
  /** @type {[number, number][]} */
  const combiningClasses = [];
  /** @type {[number, number[]][]} */
  const decompositions = [];
  /** @type {[number, number, string][]} */
  const generalCategories = [];
  /** @type {[number, number, string][]} */
  const bidiClasses = [];
  /** @type {{ first: number, combiningClass: number, generalCategory: string, bidiClass: string } | undefined} */
  let pendingRange;
  for (const line of source.split('\n')) {
    if (!line) continue;
    const fields = line.split(';');
    const codeSource = fields[0];
    const name = fields[1];
    const generalCategory = fields[2];
    const combiningClassSource = fields[3];
    const bidiClass = fields[4];
    const decompositionSource = fields[5];
    if (
      codeSource === undefined ||
      name === undefined ||
      generalCategory === undefined ||
      combiningClassSource === undefined ||
      bidiClass === undefined ||
      decompositionSource === undefined
    ) {
      throw new Error(`invalid UnicodeData row: ${line}`);
    }
    const codePoint = Number.parseInt(codeSource, 16);
    const combiningClass = Number.parseInt(combiningClassSource, 10);
    if (name.endsWith(', First>')) {
      pendingRange = {
        first: codePoint,
        combiningClass,
        generalCategory,
        bidiClass,
      };
      continue;
    }
    if (name.endsWith(', Last>')) {
      if (
        !pendingRange ||
        pendingRange.combiningClass !== combiningClass ||
        pendingRange.generalCategory !== generalCategory ||
        pendingRange.bidiClass !== bidiClass
      ) {
        throw new Error(`invalid UnicodeData range: ${line}`);
      }
      if (combiningClass !== 0) {
        for (let value = pendingRange.first; value <= codePoint; value += 1) {
          combiningClasses.push([value, combiningClass]);
        }
      }
      generalCategories.push([pendingRange.first, codePoint, generalCategory]);
      bidiClasses.push([pendingRange.first, codePoint, bidiClass]);
      pendingRange = undefined;
      continue;
    }
    generalCategories.push([codePoint, codePoint, generalCategory]);
    bidiClasses.push([codePoint, codePoint, bidiClass]);
    if (combiningClass !== 0)
      combiningClasses.push([codePoint, combiningClass]);
    if (decompositionSource && !decompositionSource.startsWith('<')) {
      decompositions.push([
        codePoint,
        decompositionSource
          .split(' ')
          .map((value) => Number.parseInt(value, 16)),
      ]);
    }
  }
  if (pendingRange) throw new Error('unterminated UnicodeData range');
  return {
    combiningClasses,
    decompositions,
    generalCategories: mergePropertyRanges(generalCategories),
    bidiClasses: mergePropertyRanges(bidiClasses),
  };
}

/**
 * Parse Unicode default case-fold mappings.
 *
 * @param {string} source CaseFolding source
 * @returns {[number, number[]][]} fold mappings
 */
function parseCaseFolding(source) {
  /** @type {[number, number[]][]} */
  const mappings = [];
  for (const line of dataLines(source)) {
    const fields = line.split(';').map((field) => field.trim());
    if (fields[1] !== 'C' && fields[1] !== 'F') continue;
    const codePoint = fields[0];
    const mapping = fields[2];
    if (!codePoint || !mapping)
      throw new Error(`invalid case-fold row: ${line}`);
    mappings.push([
      Number.parseInt(codePoint, 16),
      mapping.split(' ').map((value) => Number.parseInt(value, 16)),
    ]);
  }
  return mappings;
}

/**
 * Parse the Unicode IDNA mapping table.
 *
 * @param {string} source IDNA table source
 * @returns {[number, number, string, number[]][]} IDNA ranges
 */
function parseIdna(source) {
  /** @type {[number, number, string, number[]][]} */
  const ranges = [];
  for (const line of dataLines(source)) {
    const fields = line.split(';').map((field) => field.trim());
    const rangeSource = fields[0];
    const status = fields[1];
    if (!rangeSource || !status) throw new Error(`invalid IDNA row: ${line}`);
    const [first, last] = parseRange(rangeSource);
    const mapping = fields[2]
      ? fields[2].split(' ').map((value) => Number.parseInt(value, 16))
      : [];
    ranges.push([first, last, status, mapping]);
  }
  return ranges;
}

/**
 * Parse the IANA percent-delimited registry format.
 *
 * @param {string} source registry source
 * @returns {Record<string, string[]>[]} registry records
 */
function parseIanaRegistry(source) {
  const records = [];
  for (const block of source.split('\n%%\n')) {
    /** @type {Record<string, string[]>} */
    const record = {};
    let priorName;
    for (const line of block.split('\n')) {
      if (line.startsWith(' ') && priorName) {
        const values = record[priorName];
        if (!values) throw new Error('invalid IANA continuation');
        values[values.length - 1] += line.slice(1);
        continue;
      }
      const separator = line.indexOf(':');
      if (separator < 0) continue;
      priorName = line.slice(0, separator);
      const value = line.slice(separator + 1).trimStart();
      (record[priorName] ??= []).push(value);
    }
    if (Object.keys(record).length > 0) records.push(record);
  }
  return records;
}

const IANA_SPECIAL_REGISTRY_HEADER = Object.freeze([
  'Address Block',
  'Name',
  'RFC',
  'Allocation Date',
  'Termination Date',
  'Source',
  'Destination',
  'Forwardable',
  'Globally Reachable',
  'Reserved-by-Protocol',
]);

/**
 * Parse RFC 4180 CSV from exact UTF-8 bytes without replacement decoding.
 *
 * @param {Uint8Array} bytes exact source bytes
 * @returns {string[][]} parsed records
 */
function parseRfc4180(bytes) {
  const source = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  /** @type {string[][]} */
  const rows = [];
  /** @type {string[]} */
  let row = [];
  let field = '';
  /** @type {'unquoted' | 'quoted' | 'after-quote'} */
  let state = 'unquoted';
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === undefined) throw new Error('invalid CSV cursor');
    if (state === 'quoted') {
      if (character !== '"') {
        field += character;
      } else if (source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        state = 'after-quote';
      }
      continue;
    }
    if (character === '"') {
      if (state !== 'unquoted' || field !== '')
        throw new Error('invalid CSV quote');
      state = 'quoted';
      continue;
    }
    if (character === ',') {
      row.push(field);
      field = '';
      state = 'unquoted';
      continue;
    }
    if (character === '\r') {
      if (source[index + 1] !== '\n') throw new Error('invalid CSV newline');
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      state = 'unquoted';
      index += 1;
      continue;
    }
    if (character === '\n' || state === 'after-quote') {
      throw new Error('invalid CSV structure');
    }
    field += character;
  }
  if (state === 'quoted') throw new Error('unterminated CSV field');
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/**
 * Remove only the terminal IANA footnote spelling admitted by DEC-097.
 *
 * @param {string} value source cell
 * @returns {string} value without a terminal footnote
 */
function stripIanaFootnote(value) {
  return value.replace(/ \[[0-9]+\]$/u, '');
}

/**
 * Parse one frozen IANA special-address registry.
 *
 * @param {Uint8Array} bytes exact CSV bytes
 * @param {4 | 6} expectedFamily required address family
 * @returns {[4 | 6, string, number, boolean][]} compact ranges
 */
function parseSpecialRegistry(bytes, expectedFamily) {
  const rows = parseRfc4180(bytes);
  const header = rows.shift();
  if (
    !header ||
    JSON.stringify(header) !== JSON.stringify(IANA_SPECIAL_REGISTRY_HEADER)
  ) {
    throw new Error('IANA special-address registry header mismatch');
  }
  /** @type {[4 | 6, string, number, boolean][]} */
  const ranges = [];
  const seen = new Map();
  for (const row of rows) {
    if (row.length !== IANA_SPECIAL_REGISTRY_HEADER.length) {
      throw new Error('IANA special-address registry column mismatch');
    }
    const addressCell = row[0];
    const globalCell = row[8];
    if (addressCell === undefined || globalCell === undefined) {
      throw new Error('IANA special-address registry row incomplete');
    }
    const addressBlocks = addressCell.split(',').map((block, index) => {
      if (index === 0) return stripIanaFootnote(block);
      if (!block.startsWith(' '))
        throw new Error('invalid IANA address-list separator');
      return stripIanaFootnote(block.slice(1));
    });
    const globallyReachable = stripIanaFootnote(globalCell) === 'True';
    for (const addressBlock of addressBlocks) {
      const parsed = parseCanonicalCidr(addressBlock);
      if (parsed.family !== expectedFamily) {
        throw new Error('IANA special-address registry family mismatch');
      }
      const network = parsed.network
        .toString(16)
        .padStart(expectedFamily === 4 ? 8 : 32, '0');
      const key = `${expectedFamily}:${network}:${parsed.prefix}`;
      const prior = seen.get(key);
      if (prior !== undefined && prior !== globallyReachable) {
        throw new Error('conflicting IANA special-address registry rows');
      }
      if (prior === undefined) {
        seen.set(key, globallyReachable);
        ranges.push([
          expectedFamily,
          network,
          parsed.prefix,
          globallyReachable,
        ]);
      }
    }
  }
  ranges.sort((left, right) => {
    if (left[0] !== right[0]) return left[0] - right[0];
    const addressOrder = left[1] < right[1] ? -1 : left[1] > right[1] ? 1 : 0;
    return addressOrder || left[2] - right[2];
  });
  return ranges;
}

/**
 * Build the frozen network-boundary lookup table.
 *
 * @param {Map<string, Buffer>} inputs verified source bytes
 * @returns {Record<string, unknown>} generated table
 */
function buildNetworkBoundaryTable(inputs) {
  const ipv4 = inputs.get('iana-ipv4-special-registry');
  const ipv6 = inputs.get('iana-ipv6-special-registry');
  if (!ipv4 || !ipv6) throw new Error('missing IANA special-address registry');
  return {
    profile: 'gala-network-boundary-v2',
    sources: [
      'sha256:e3e39e76d00b1677335db8e9a805c7b9480ea2f4dc9e33f0b93cd3a905128d73',
      'sha256:775feea0621dec8735a44fbf30f762e721e8f0a1b3ab7eb341961a88cfce2139',
    ],
    ranges: [
      ...parseSpecialRegistry(ipv4, 4),
      ...parseSpecialRegistry(ipv6, 6),
    ],
  };
}

/**
 * Convert one IANA record to its portable lookup projection.
 *
 * @param {Record<string, string[]>} record parsed record
 * @returns {Record<string, unknown> | undefined} retained record
 */
function projectIanaRecord(record) {
  const type = record.Type?.[0];
  const subtag = record.Subtag?.[0];
  const tag = record.Tag?.[0];
  if (!type || (!subtag && !tag)) return undefined;
  return {
    type,
    ...(subtag ? { subtag } : { tag }),
    ...(record['Preferred-Value']?.[0]
      ? { preferredValue: record['Preferred-Value'][0] }
      : {}),
    ...(record.Prefix ? { prefixes: record.Prefix } : {}),
    ...(record.Deprecated?.[0] ? { deprecated: record.Deprecated[0] } : {}),
  };
}

/**
 * Build the compact Unicode 17 generated table.
 *
 * @param {Map<string, Buffer>} inputs verified source bytes
 * @returns {Record<string, unknown>} generated table
 */
function buildUnicodeTable(inputs) {
  const unicodeData = parseUnicodeData(
    inputs.get('unicode-17-unicode-data')?.toString('utf8') ?? '',
  );
  const normalization =
    inputs
      .get('unicode-17-derived-normalization-properties')
      ?.toString('utf8') ?? '';
  const exclusions = new Set(
    parsePropertyRanges(normalization)
      .filter((range) => range[2] === 'Full_Composition_Exclusion')
      .flatMap(([first, last]) => {
        const values = [];
        for (let value = first; value <= last; value += 1) values.push(value);
        return values;
      }),
  );
  const compositions = unicodeData.decompositions
    .filter(
      ([codePoint, decomposition]) =>
        decomposition.length === 2 && !exclusions.has(codePoint),
    )
    .map(([codePoint, decomposition]) => [
      decomposition[0],
      decomposition[1],
      codePoint,
    ]);
  const propList = inputs.get('unicode-17-prop-list')?.toString('utf8') ?? '';
  const derivedCore =
    inputs.get('unicode-17-derived-core-properties')?.toString('utf8') ?? '';
  const emojiData = inputs.get('unicode-17-emoji-data')?.toString('utf8') ?? '';
  const joiningTypeSource =
    inputs.get('unicode-17-derived-joining-type')?.toString('utf8') ?? '';
  if (
    !joiningTypeSource
      .split('\n')
      .includes('# @missing: 0000..10FFFF; Non_Joining')
  ) {
    throw new Error('Unicode Joining_Type @missing rule mismatch');
  }
  return {
    version: '17.0.0',
    combiningClasses: unicodeData.combiningClasses,
    decompositions: unicodeData.decompositions,
    compositions,
    generalCategories: unicodeData.generalCategories,
    bidiClasses: unicodeData.bidiClasses,
    caseFolding: parseCaseFolding(
      inputs.get('unicode-17-case-folding')?.toString('utf8') ?? '',
    ),
    idna: parseIdna(
      inputs.get('unicode-17-idna-mapping-table')?.toString('utf8') ?? '',
    ),
    joiningType: parsePropertyRanges(joiningTypeSource),
    graphemeBreak: parsePropertyRanges(
      inputs.get('unicode-17-grapheme-break-property')?.toString('utf8') ?? '',
    ),
    indicConjunctBreak: parsePropertyRanges(derivedCore, 'InCB'),
    extendedPictographic: parsePropertyRanges(emojiData).filter(
      (range) => range[2] === 'Extended_Pictographic',
    ),
    whiteSpace: parsePropertyRanges(propList).filter(
      (range) => range[2] === 'White_Space',
    ),
    noncharacter: parsePropertyRanges(propList).filter(
      (range) => range[2] === 'Noncharacter_Code_Point',
    ),
    defaultIgnorable: parsePropertyRanges(derivedCore).filter(
      (range) => range[2] === 'Default_Ignorable_Code_Point',
    ),
  };
}

/**
 * Build the compact BCP-47 registry projection.
 *
 * @param {Map<string, Buffer>} inputs verified source bytes
 * @returns {Record<string, unknown>} generated table
 */
function buildLanguageTable(inputs) {
  const languageSource =
    inputs.get('iana-language-subtag-registry')?.toString('utf8') ?? '';
  const extensionSource =
    inputs.get('iana-language-tag-extensions-registry')?.toString('utf8') ?? '';
  const records = parseIanaRegistry(languageSource)
    .map(projectIanaRecord)
    .filter((record) => record !== undefined);
  const extensionRecords = parseIanaRegistry(extensionSource);
  return {
    fileDate: '2026-08-08',
    records,
    extensionFileDate: '2014-04-02',
    extensionSingletons: extensionRecords
      .flatMap((record) => record.Identifier ?? [])
      .map((singleton) => singleton.toLowerCase())
      .sort(),
  };
}

/**
 * Build the exact SPDX identifier/text catalog projection.
 *
 * @param {Map<string, Buffer>} inputs verified source bytes
 * @returns {Record<string, unknown>} generated catalog
 */
function buildSpdxTable(inputs) {
  const bytes = inputs.get('spdx-license-list-3.28.0');
  if (!bytes) throw new Error('missing SPDX source');
  const document = parseDuplicateFreeIJson(bytes);
  if (!document || typeof document !== 'object')
    throw new Error('invalid SPDX graph');
  const graph = /** @type {{ '@graph'?: Record<string, unknown>[] }} */ (
    document
  )['@graph'];
  if (!Array.isArray(graph)) throw new Error('invalid SPDX graph');
  /** @type {[string, string][]} */
  const licenses = [];
  /** @type {[string, string][]} */
  const exceptions = [];
  /** @type {string[]} */
  const deprecatedLicenses = [];
  /** @type {string[]} */
  const deprecatedExceptions = [];
  const identifiers = new Set();
  let crossReferenceCount = 0;
  for (const row of graph) {
    const type = row['@type'];
    if (type === 'spdx:CrossRef') {
      crossReferenceCount += 1;
      continue;
    }
    if (
      type !== 'spdx:ListedLicense' &&
      type !== 'spdx:ListedLicenseException'
    ) {
      throw new Error('unexpected SPDX graph node');
    }
    const identifier = row['@id'];
    if (
      typeof identifier !== 'string' ||
      !identifier.startsWith('http://spdx.org/licenses/')
    ) {
      throw new Error('invalid SPDX identifier');
    }
    const id = identifier.slice('http://spdx.org/licenses/'.length);
    if (!id || id.includes('/') || identifiers.has(id)) {
      throw new Error(`invalid or duplicate SPDX identifier: ${id}`);
    }
    identifiers.add(id);
    const isLicense = type === 'spdx:ListedLicense';
    const textField = isLicense
      ? 'spdx:licenseText'
      : 'spdx:licenseExceptionText';
    const deprecatedRecord = row['spdx:isDeprecatedLicenseId'];
    const deprecatedValue =
      deprecatedRecord && typeof deprecatedRecord === 'object'
        ? /** @type {Record<string, unknown>} */ (deprecatedRecord)
        : undefined;
    const text = row[textField];
    if (
      !deprecatedValue ||
      deprecatedValue['@type'] !== 'http://www.w3.org/2001/XMLSchema#boolean' ||
      (deprecatedValue['@value'] !== 'true' &&
        deprecatedValue['@value'] !== 'false') ||
      typeof text !== 'string'
    ) {
      throw new Error(`invalid SPDX catalog row: ${id}`);
    }
    const deprecated = deprecatedValue['@value'] === 'true';
    if (deprecated) {
      (isLicense ? deprecatedLicenses : deprecatedExceptions).push(id);
    } else {
      (isLicense ? licenses : exceptions).push([id, text]);
    }
  }
  /**
   * Compare SPDX identifier/text tuples by identifier bytes.
   *
   * @param {[string, string]} left left tuple
   * @param {[string, string]} right right tuple
   * @returns {number} comparison result
   */
  const byIdentifier = (left, right) =>
    Buffer.compare(Buffer.from(left[0]), Buffer.from(right[0]));
  licenses.sort(byIdentifier);
  exceptions.sort(byIdentifier);
  deprecatedLicenses.sort();
  deprecatedExceptions.sort();
  if (
    licenses.length + deprecatedLicenses.length !== 727 ||
    exceptions.length + deprecatedExceptions.length !== 84 ||
    crossReferenceCount !== 972
  ) {
    throw new Error('SPDX graph count mismatch');
  }
  return {
    version: '3.28.0',
    digest:
      'sha256:293418a03e6692c44332a12eb17889af99e20a4d571adfaca4408b203f75686b',
    licenses,
    exceptions,
    deprecatedLicenses,
    deprecatedExceptions,
  };
}

/**
 * Generate or check every portable data table.
 *
 * @param {boolean} check verify instead of writing
 * @returns {Promise<void>} completion
 */
export async function generatePortableDataTables(check) {
  await verifyPinnedSourceData(SOURCE_ROOT);
  const inputs = new Map();
  for (const artifact of PINNED_SOURCE_DATA) {
    inputs.set(
      artifact.id,
      await readFile(path.join(SOURCE_ROOT, artifact.path)),
    );
  }
  const outputs = {
    'unicode17.json': buildUnicodeTable(inputs),
    'iana-language.json': buildLanguageTable(inputs),
    'spdx-3.28.0.json': buildSpdxTable(inputs),
    'network-boundary-v2.json': buildNetworkBoundaryTable(inputs),
  };
  await mkdir(OUTPUT_ROOT, { recursive: true });
  for (const [fileName, value] of Object.entries(outputs)) {
    const target = path.join(OUTPUT_ROOT, fileName);
    const expected = `${JSON.stringify(value)}\n`;
    if (check) {
      const actual = await readFile(target, 'utf8');
      if (actual !== expected)
        throw new Error(`${fileName}: generated table is stale`);
    } else {
      await writeFile(target, expected, 'utf8');
    }
  }
  process.stdout.write(
    check
      ? 'Generated portable data tables are current.\n'
      : 'Generated four portable data tables.\n',
  );
}

await runIfMain(import.meta.url, async () => {
  await generatePortableDataTables(process.argv.includes('--check'));
});

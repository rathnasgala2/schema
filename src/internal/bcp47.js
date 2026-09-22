import languageRegistry from './generated/iana-language.json' with { type: 'json' };

const LANGUAGE_PATTERN = /^[A-Za-z]{2,8}$/u;
const EXTLANG_PATTERN = /^[A-Za-z]{3}$/u;
const SCRIPT_PATTERN = /^[A-Za-z]{4}$/u;
const REGION_PATTERN = /^(?:[A-Za-z]{2}|[0-9]{3})$/u;
const VARIANT_PATTERN = /^(?:[A-Za-z0-9]{5,8}|[0-9][A-Za-z0-9]{3})$/u;
const SINGLETON_PATTERN = /^[A-Za-z0-9]$/u;
const EXTENSION_SUBTAG_PATTERN = /^[A-Za-z0-9]{2,8}$/u;
const PRIVATE_USE_SUBTAG_PATTERN = /^[A-Za-z0-9]{1,8}$/u;

/**
 * @typedef {object} IanaLanguageRecord
 * @property {string} type record type
 * @property {string} [subtag] registered subtag or range
 * @property {string} [tag] registered whole tag
 * @property {string} [preferredValue] replacement spelling
 * @property {string[]} [prefixes] registered extlang or advisory variant prefixes
 * @property {string} [deprecated] deprecation date
 */

/**
 * @typedef {object} ParsedLanguageTag
 * @property {string} language primary language subtag
 * @property {string | undefined} extlang optional extlang subtag
 * @property {string | undefined} script optional script subtag
 * @property {string | undefined} region optional region subtag
 * @property {string[]} variants variant subtags in authored order
 * @property {{ singleton: string, subtags: string[] }[]} extensions extension sequences
 * @property {string[]} privateUse optional private-use suffix payload
 */

class Bcp47ValidationError extends TypeError {
  /**
   * Create a stable BCP-47 diagnostic.
   *
   * @param {'BCP47_INVALID' | 'BCP47_NOT_CANONICAL'} code diagnostic code
   */
  constructor(code) {
    super(code);
    this.name = 'Bcp47ValidationError';
    this.code = code;
  }
}

/** @type {IanaLanguageRecord[]} */
const records = languageRegistry.records;
/** @type {Map<string, Map<string, IanaLanguageRecord>>} */
const exactSubtags = new Map();
/** @type {Map<string, { first: string, last: string }[]>} */
const subtagRanges = new Map();
/** @type {Map<string, IanaLanguageRecord>} */
const grandfatheredTags = new Map();
/** @type {Map<string, IanaLanguageRecord>} */
const redundantTags = new Map();

/**
 * Convert ASCII letters to lowercase without locale or Unicode-table input.
 *
 * @param {string} value ASCII source
 * @returns {string} lowercase ASCII
 */
function asciiLower(value) {
  let output = '';
  for (const character of value) {
    const code = character.charCodeAt(0);
    output +=
      code >= 0x41 && code <= 0x5a
        ? String.fromCharCode(code + 0x20)
        : character;
  }
  return output;
}

/**
 * Convert ASCII letters to uppercase without locale or Unicode-table input.
 *
 * @param {string} value ASCII source
 * @returns {string} uppercase ASCII
 */
function asciiUpper(value) {
  let output = '';
  for (const character of value) {
    const code = character.charCodeAt(0);
    output +=
      code >= 0x61 && code <= 0x7a
        ? String.fromCharCode(code - 0x20)
        : character;
  }
  return output;
}

/**
 * Apply RFC 5646 script casing with ASCII-only operations.
 *
 * @param {string} value script subtag
 * @returns {string} title-cased script subtag
 */
function asciiTitle(value) {
  return `${asciiUpper(value.slice(0, 1))}${asciiLower(value.slice(1))}`;
}

/**
 * Test whether every code unit is one ASCII byte.
 *
 * @param {string} value candidate source
 * @returns {boolean} whether the source is ASCII-only
 */
function isAscii(value) {
  for (let index = 0; index < value.length; index += 1) {
    if (value.charCodeAt(index) > 0x7f) return false;
  }
  return true;
}

for (const record of records) {
  if (record.tag !== undefined) {
    const tags =
      record.type === 'grandfathered'
        ? grandfatheredTags
        : record.type === 'redundant'
          ? redundantTags
          : undefined;
    if (tags === undefined) {
      throw new Error('BCP47_PINNED_DATA_INVALID');
    }
    const key = asciiLower(record.tag);
    if (tags.has(key)) throw new Error('BCP47_PINNED_DATA_INVALID');
    tags.set(key, record);
    continue;
  }
  if (record.subtag === undefined) {
    throw new Error('BCP47_PINNED_DATA_INVALID');
  }
  const key = asciiLower(record.subtag);
  if (key.includes('..')) {
    const [first, last] = key.split('..');
    if (!first || !last || first.length !== last.length || first > last) {
      throw new Error('BCP47_PINNED_DATA_INVALID');
    }
    const ranges = subtagRanges.get(record.type) ?? [];
    ranges.push({ first, last });
    subtagRanges.set(record.type, ranges);
    continue;
  }
  const bySubtag = exactSubtags.get(record.type) ?? new Map();
  if (bySubtag.has(key)) throw new Error('BCP47_PINNED_DATA_INVALID');
  bySubtag.set(key, record);
  exactSubtags.set(record.type, bySubtag);
}

const extensionSingletons = new Set(
  languageRegistry.extensionSingletons.map(asciiLower),
);

/**
 * Throw the stable invalid-tag diagnostic.
 *
 * @returns {never} never returns
 */
function invalidTag() {
  throw new Bcp47ValidationError('BCP47_INVALID');
}

/**
 * Find an exact role-specific registry row.
 *
 * @param {string} type IANA record type
 * @param {string} subtag candidate subtag
 * @returns {IanaLanguageRecord | undefined} exact row
 */
function exactRecord(type, subtag) {
  return exactSubtags.get(type)?.get(asciiLower(subtag));
}

/**
 * Test exact or registered-private-range membership for one subtag role.
 *
 * @param {string} type IANA record type
 * @param {string} subtag candidate subtag
 * @returns {boolean} whether the role admits the subtag
 */
function registeredSubtag(type, subtag) {
  const key = asciiLower(subtag);
  if (exactSubtags.get(type)?.has(key)) return true;
  return (subtagRanges.get(type) ?? []).some(
    ({ first, last }) =>
      key.length === first.length && key >= first && key <= last,
  );
}

/**
 * Return a subtag's Preferred-Value or its authored spelling.
 *
 * @param {string} type IANA record type
 * @param {string} subtag candidate subtag
 * @returns {string} replacement or original value
 */
function preferredSubtag(type, subtag) {
  return exactRecord(type, subtag)?.preferredValue ?? subtag;
}

/**
 * Parse and validate one ordinary RFC 5646 langtag.
 *
 * @param {string} source ASCII source
 * @returns {ParsedLanguageTag} parsed role projection
 */
function parseLangtag(source) {
  const subtags = source.split('-');
  if (subtags.some((subtag) => subtag.length === 0)) invalidTag();
  const language = subtags[0];
  if (
    language === undefined ||
    !LANGUAGE_PATTERN.test(language) ||
    !registeredSubtag('language', language)
  ) {
    invalidTag();
  }

  let index = 1;
  let extlang;
  const extlangCandidate = subtags[index];
  if (
    language.length <= 3 &&
    extlangCandidate !== undefined &&
    EXTLANG_PATTERN.test(extlangCandidate)
  ) {
    const record = exactRecord('extlang', extlangCandidate);
    if (
      record === undefined ||
      !record.prefixes?.some(
        (prefix) => asciiLower(prefix) === asciiLower(language),
      )
    ) {
      invalidTag();
    }
    extlang = extlangCandidate;
    index += 1;
  }

  let script;
  const scriptCandidate = subtags[index];
  if (scriptCandidate !== undefined && SCRIPT_PATTERN.test(scriptCandidate)) {
    if (!registeredSubtag('script', scriptCandidate)) invalidTag();
    script = scriptCandidate;
    index += 1;
  }

  let region;
  const regionCandidate = subtags[index];
  if (regionCandidate !== undefined && REGION_PATTERN.test(regionCandidate)) {
    if (!registeredSubtag('region', regionCandidate)) invalidTag();
    region = regionCandidate;
    index += 1;
  }

  const variants = [];
  const variantKeys = new Set();
  while (true) {
    const candidate = subtags[index];
    if (candidate === undefined || !VARIANT_PATTERN.test(candidate)) break;
    if (!registeredSubtag('variant', candidate)) invalidTag();
    const key = asciiLower(candidate);
    if (variantKeys.has(key)) invalidTag();
    variantKeys.add(key);
    variants.push(candidate);
    index += 1;
  }

  const extensions = [];
  const singletonKeys = new Set();
  while (true) {
    const singleton = subtags[index];
    if (
      singleton === undefined ||
      !SINGLETON_PATTERN.test(singleton) ||
      asciiLower(singleton) === 'x'
    ) {
      break;
    }
    const singletonKey = asciiLower(singleton);
    if (
      !extensionSingletons.has(singletonKey) ||
      singletonKeys.has(singletonKey)
    ) {
      invalidTag();
    }
    singletonKeys.add(singletonKey);
    index += 1;
    const extensionSubtags = [];
    while (true) {
      const candidate = subtags[index];
      if (
        candidate === undefined ||
        !EXTENSION_SUBTAG_PATTERN.test(candidate)
      ) {
        break;
      }
      extensionSubtags.push(candidate);
      index += 1;
    }
    if (extensionSubtags.length === 0) invalidTag();
    extensions.push({ singleton, subtags: extensionSubtags });
  }

  const privateUse = [];
  const privateUseMarker = subtags[index];
  if (privateUseMarker !== undefined && asciiLower(privateUseMarker) === 'x') {
    index += 1;
    while (index < subtags.length) {
      const candidate = subtags[index];
      if (
        candidate === undefined ||
        !PRIVATE_USE_SUBTAG_PATTERN.test(candidate)
      ) {
        invalidTag();
      }
      privateUse.push(candidate);
      index += 1;
    }
    if (privateUse.length === 0) invalidTag();
  }

  if (index !== subtags.length) invalidTag();
  return {
    language,
    extlang,
    script,
    region,
    variants,
    extensions,
    privateUse,
  };
}

/**
 * Serialize an ordinary valid tag in Gala canonical form.
 *
 * @param {ParsedLanguageTag} parsed parsed role projection
 * @returns {string} canonical tag
 */
function canonicalizeLangtag(parsed) {
  let language = preferredSubtag('language', parsed.language);
  let extlang = parsed.extlang;
  if (extlang !== undefined) {
    const preferred = exactRecord('extlang', extlang)?.preferredValue;
    if (preferred !== undefined) {
      language = preferred;
      extlang = undefined;
    }
  }

  const canonical = [asciiLower(language)];
  if (extlang !== undefined) canonical.push(asciiLower(extlang));
  if (parsed.script !== undefined) {
    canonical.push(asciiTitle(preferredSubtag('script', parsed.script)));
  }
  if (parsed.region !== undefined) {
    const region = preferredSubtag('region', parsed.region);
    canonical.push(/^[0-9]{3}$/u.test(region) ? region : asciiUpper(region));
  }
  canonical.push(
    ...parsed.variants.map((variant) =>
      asciiLower(preferredSubtag('variant', variant)),
    ),
  );

  const extensions = parsed.extensions
    .map(({ singleton, subtags }) => ({
      singleton: asciiLower(singleton),
      subtags: subtags.map(asciiLower),
    }))
    .sort(({ singleton: left }, { singleton: right }) =>
      left < right ? -1 : left > right ? 1 : 0,
    );
  for (const { singleton, subtags } of extensions) {
    canonical.push(singleton, ...subtags);
  }
  if (parsed.privateUse.length > 0) {
    canonical.push('x', ...parsed.privateUse.map(asciiLower));
  }
  return canonical.join('-');
}

/**
 * Canonicalize a valid DEC-099 BCP-47 tag using only the pinned IANA tables.
 *
 * @param {string} source authored language tag
 * @returns {string} Gala canonical language tag
 * @throws {TypeError} with code `BCP47_INVALID` for invalid syntax or registry use
 */
export function canonicalizeBcp47(source) {
  if (
    typeof source !== 'string' ||
    source.length < 1 ||
    source.length > 255 ||
    !isAscii(source)
  ) {
    invalidTag();
  }

  const key = asciiLower(source);
  const grandfathered = grandfatheredTags.get(key);
  if (grandfathered !== undefined) {
    return grandfathered.preferredValue === undefined
      ? (grandfathered.tag ?? invalidTag())
      : canonicalizeBcp47(grandfathered.preferredValue);
  }
  const redundant = redundantTags.get(key);
  if (redundant?.preferredValue !== undefined) {
    return canonicalizeBcp47(redundant.preferredValue);
  }

  const subtags = source.split('-');
  if (asciiLower(subtags[0] ?? '') === 'x') {
    if (
      subtags.length < 2 ||
      subtags
        .slice(1)
        .some((subtag) => !PRIVATE_USE_SUBTAG_PATTERN.test(subtag))
    ) {
      invalidTag();
    }
    return ['x', ...subtags.slice(1).map(asciiLower)].join('-');
  }
  return canonicalizeLangtag(parseLangtag(source));
}

/**
 * Validate that a DEC-099 BCP-47 tag is already in Gala canonical form.
 *
 * @param {string} source authored language tag
 * @returns {boolean} true for a valid canonical tag
 * @throws {TypeError} with `BCP47_INVALID` or `BCP47_NOT_CANONICAL`
 */
export function validateCanonicalBcp47(source) {
  const canonical = canonicalizeBcp47(source);
  if (canonical !== source) {
    throw new Bcp47ValidationError('BCP47_NOT_CANONICAL');
  }
  return true;
}

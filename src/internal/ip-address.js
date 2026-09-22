/**
 * Raise the single internal address-parser diagnostic.
 *
 * @returns {never}
 */
function invalidAddress() {
  throw new TypeError('IP_ADDRESS_INVALID');
}

/**
 * Parse an exact canonical dotted-decimal IPv4 address.
 *
 * @param {string} input source spelling
 * @returns {{ bytes: number[], value: bigint }} parsed address
 */
export function parseCanonicalIpv4(input) {
  if (!/^(?:0|[1-9][0-9]{0,2})(?:\.(?:0|[1-9][0-9]{0,2})){3}$/u.test(input)) {
    return invalidAddress();
  }
  const bytes = input.split('.').map((part) => Number.parseInt(part, 10));
  if (bytes.length !== 4 || bytes.some((value) => value > 255)) {
    return invalidAddress();
  }
  let value = 0n;
  for (const byte of bytes) value = (value << 8n) | BigInt(byte);
  return { bytes, value };
}

/**
 * Convert an unsigned 32-bit value to canonical dotted decimal.
 *
 * @param {bigint} value address value
 * @returns {string} canonical spelling
 */
export function formatIpv4(value) {
  if (value < 0n || value > 0xffff_ffffn) return invalidAddress();
  return [24n, 16n, 8n, 0n]
    .map((shift) => Number((value >> shift) & 0xffn).toString(10))
    .join('.');
}

/**
 * Parse an IPv6 spelling into eight 16-bit words.
 *
 * The parser accepts alternate spellings so callers can compare the formatted
 * result with the source when canonical bytes are required.
 *
 * @param {string} input source spelling without brackets
 * @returns {{ words: number[], value: bigint }} parsed address
 */
export function parseIpv6(input) {
  if (
    !input ||
    input.includes('%') ||
    input.includes('[') ||
    input.includes(']')
  ) {
    return invalidAddress();
  }
  const doubleColon = input.indexOf('::');
  if (doubleColon !== input.lastIndexOf('::')) return invalidAddress();

  /**
   * Parse one colon-delimited side of the address.
   *
   * @param {string} source side spelling
   * @returns {number[]} parsed words
   */
  const parseSide = (source) => {
    if (!source) return [];
    const tokens = source.split(':');
    if (tokens.some((token) => token.length === 0)) return invalidAddress();
    /** @type {number[]} */
    const words = [];
    for (let index = 0; index < tokens.length; index += 1) {
      const token = tokens[index];
      if (token === undefined) return invalidAddress();
      if (token.includes('.')) {
        if (index !== tokens.length - 1) return invalidAddress();
        const ipv4 = parseCanonicalIpv4(token).bytes;
        const first = ipv4[0];
        const second = ipv4[1];
        const third = ipv4[2];
        const fourth = ipv4[3];
        if (
          first === undefined ||
          second === undefined ||
          third === undefined ||
          fourth === undefined
        ) {
          return invalidAddress();
        }
        words.push((first << 8) | second, (third << 8) | fourth);
      } else {
        if (!/^[0-9A-Fa-f]{1,4}$/u.test(token)) return invalidAddress();
        words.push(Number.parseInt(token, 16));
      }
    }
    return words;
  };

  /** @type {number[]} */
  let words;
  if (doubleColon >= 0) {
    const left = parseSide(input.slice(0, doubleColon));
    const right = parseSide(input.slice(doubleColon + 2));
    const omitted = 8 - left.length - right.length;
    if (omitted < 1) return invalidAddress();
    words = [...left, ...Array.from({ length: omitted }, () => 0), ...right];
  } else {
    words = parseSide(input);
    if (words.length !== 8) return invalidAddress();
  }
  if (words.length !== 8) return invalidAddress();
  let value = 0n;
  for (const word of words) value = (value << 16n) | BigInt(word);
  return { words, value };
}

/**
 * Format an IPv6 value with RFC 5952 lowercase longest-leftmost compression.
 *
 * @param {bigint} value unsigned 128-bit address
 * @param {boolean} [mixedMapped] use RFC 5952 section 5 mapped-address form
 * @returns {string} canonical spelling
 */
export function formatIpv6(value, mixedMapped = false) {
  if (value < 0n || value >= 1n << 128n) return invalidAddress();
  const words = Array.from({ length: 8 }, (_, index) =>
    Number((value >> BigInt((7 - index) * 16)) & 0xffffn),
  );
  if (
    mixedMapped &&
    words.slice(0, 5).every((word) => word === 0) &&
    words[5] === 0xffff
  ) {
    return `::ffff:${formatIpv4(value & 0xffff_ffffn)}`;
  }

  let bestStart = -1;
  let bestLength = 0;
  for (let index = 0; index < words.length;) {
    if (words[index] !== 0) {
      index += 1;
      continue;
    }
    let end = index;
    while (end < words.length && words[end] === 0) end += 1;
    if (end - index > bestLength && end - index >= 2) {
      bestStart = index;
      bestLength = end - index;
    }
    index = end;
  }
  const encoded = words.map((word) => word.toString(16));
  if (bestStart < 0) return encoded.join(':');
  const left = encoded.slice(0, bestStart).join(':');
  const right = encoded.slice(bestStart + bestLength).join(':');
  return `${left}::${right}`;
}

/**
 * Parse and require one canonical CIDR used by the pinned IANA registries.
 *
 * @param {string} input CIDR spelling
 * @returns {{ family: 4 | 6, network: bigint, prefix: number }} parsed CIDR
 */
export function parseCanonicalCidr(input) {
  const separator = input.lastIndexOf('/');
  if (separator <= 0 || separator === input.length - 1) return invalidAddress();
  const addressSource = input.slice(0, separator);
  const prefixSource = input.slice(separator + 1);
  if (!/^(?:0|[1-9][0-9]{0,2})$/u.test(prefixSource)) {
    return invalidAddress();
  }
  const prefix = Number.parseInt(prefixSource, 10);
  const family = addressSource.includes(':') ? 6 : 4;
  const width = family === 4 ? 32 : 128;
  if (prefix > width) return invalidAddress();
  const parsed =
    family === 4 ? parseCanonicalIpv4(addressSource) : parseIpv6(addressSource);
  const canonical =
    family === 4 ? formatIpv4(parsed.value) : formatIpv6(parsed.value);
  if (canonical !== addressSource) return invalidAddress();
  const hostBits = BigInt(width - prefix);
  const network = (parsed.value >> hostBits) << hostBits;
  if (network !== parsed.value) return invalidAddress();
  return {
    family,
    network,
    prefix,
  };
}

/**
 * Require an IPv6 source spelling to be its canonical origin form.
 *
 * @param {string} input spelling without brackets
 * @returns {{ words: number[], value: bigint }} parsed address
 */
export function parseCanonicalOriginIpv6(input) {
  const parsed = parseIpv6(input);
  if (formatIpv6(parsed.value, true) !== input) return invalidAddress();
  return parsed;
}

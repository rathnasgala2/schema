import networkTable from './generated/network-boundary-v2.json' with { type: 'json' };

import { ACTIVE_DIGEST_PROFILES } from './digest-profiles.js';
import { parseCanonicalIpv4, parseCanonicalOriginIpv6 } from './ip-address.js';

/** @typedef {{ family: 4 | 6, network: bigint, prefix: number, globallyReachable: boolean }} NetworkRange */

const WIDTH = Object.freeze({ 4: 32, 6: 128 });

export const NETWORK_BOUNDARY_PROFILE = Object.freeze({
  profile: 'gala-network-boundary-v2',
  ipv4SourceDigest:
    'sha256:e3e39e76d00b1677335db8e9a805c7b9480ea2f4dc9e33f0b93cd3a905128d73',
  ipv6SourceDigest:
    'sha256:775feea0621dec8735a44fbf30f762e721e8f0a1b3ab7eb341961a88cfce2139',
  additionalDeniedCidrs: Object.freeze([
    '224.0.0.0/4',
    '::/96',
    '64:ff9b::/96',
    '64:ff9b:1::/48',
    'ff00::/8',
  ]),
});

const networkBoundaryDigestProfile =
  ACTIVE_DIGEST_PROFILES.networkBoundaryProfile;
if (!networkBoundaryDigestProfile) {
  throw new TypeError('NETWORK_BOUNDARY_DIGEST_PROFILE_MISSING');
}
export const NETWORK_BOUNDARY_PROFILE_DIGEST =
  networkBoundaryDigestProfile.digest(NETWORK_BOUNDARY_PROFILE);

/**
 * Raise an internal generated-table integrity failure.
 *
 * @returns {never}
 */
function invalidTable() {
  throw new TypeError('NETWORK_BOUNDARY_DATA_INVALID');
}

/**
 * Parse one generated compact range.
 *
 * @param {unknown} value generated row
 * @returns {NetworkRange} validated range
 */
function parseGeneratedRange(value) {
  if (
    !Array.isArray(value) ||
    value.length !== 4 ||
    (value[0] !== 4 && value[0] !== 6) ||
    typeof value[1] !== 'string' ||
    !/^[0-9a-f]+$/u.test(value[1]) ||
    typeof value[2] !== 'number' ||
    !Number.isInteger(value[2]) ||
    value[2] < 0 ||
    value[2] > (value[0] === 4 ? 32 : 128) ||
    typeof value[3] !== 'boolean'
  ) {
    return invalidTable();
  }
  const row = /** @type {[4 | 6, string, number, boolean]} */ (value);
  const expectedLength = row[0] === 4 ? 8 : 32;
  if (row[1].length !== expectedLength) return invalidTable();
  const network = BigInt(`0x${row[1]}`);
  const hostBits = BigInt(WIDTH[row[0]] - row[2]);
  if ((network >> hostBits) << hostBits !== network) return invalidTable();
  return {
    family: row[0],
    network,
    prefix: row[2],
    globallyReachable: row[3],
  };
}

if (
  networkTable.profile !== 'gala-network-boundary-v2' ||
  !Array.isArray(networkTable.sources) ||
  networkTable.sources.length !== 2 ||
  networkTable.sources[0] !==
    'sha256:e3e39e76d00b1677335db8e9a805c7b9480ea2f4dc9e33f0b93cd3a905128d73' ||
  networkTable.sources[1] !==
    'sha256:775feea0621dec8735a44fbf30f762e721e8f0a1b3ab7eb341961a88cfce2139' ||
  !Array.isArray(networkTable.ranges)
) {
  invalidTable();
}

const ranges = Object.freeze(networkTable.ranges.map(parseGeneratedRange));
/** @type {NetworkRange[]} */
const additionalDenyRows = [
  { family: 4, network: 0xe000_0000n, prefix: 4, globallyReachable: false },
  { family: 6, network: 0n, prefix: 96, globallyReachable: false },
  {
    family: 6,
    network: 0x0064_ff9b_0000_0000_0000_0000_0000_0000n,
    prefix: 96,
    globallyReachable: false,
  },
  {
    family: 6,
    network: 0x0064_ff9b_0001_0000_0000_0000_0000_0000n,
    prefix: 48,
    globallyReachable: false,
  },
  {
    family: 6,
    network: 0xff00_0000_0000_0000_0000_0000_0000_0000n,
    prefix: 8,
    globallyReachable: false,
  },
];
const additionalDenies = Object.freeze(additionalDenyRows);

/**
 * Test whether an address is inside a canonical prefix.
 *
 * @param {bigint} address address value
 * @param {number} width address width
 * @param {bigint} network network value
 * @param {number} prefix prefix length
 * @returns {boolean} containment
 */
function contains(address, width, network, prefix) {
  const hostBits = BigInt(width - prefix);
  return (address >> hostBits) << hostBits === network;
}

/**
 * Apply the exact DEC-097 frozen global-address classification.
 *
 * @param {4 | 6} family address family
 * @param {bigint} address parsed address value
 * @returns {boolean} whether the address is admitted
 */
export function isGloballyReachableAddress(family, address) {
  const width = WIDTH[family];
  if (address < 0n || address >= 1n << BigInt(width)) {
    throw new TypeError('IP_ADDRESS_INVALID');
  }
  if (
    additionalDenies.some(
      (range) =>
        range.family === family &&
        contains(address, width, range.network, range.prefix),
    )
  ) {
    return false;
  }
  /** @type {NetworkRange | undefined} */
  let selected;
  for (const range of ranges) {
    if (
      range.family !== family ||
      !contains(address, width, range.network, range.prefix)
    ) {
      continue;
    }
    if (!selected || range.prefix > selected.prefix) {
      selected = range;
    } else if (
      range.prefix === selected.prefix &&
      range.globallyReachable !== selected.globallyReachable
    ) {
      return invalidTable();
    }
  }
  return selected?.globallyReachable ?? true;
}

/**
 * Require a canonical IPv4 spelling to pass the frozen boundary profile.
 *
 * @param {string} input canonical dotted decimal
 * @returns {bigint} parsed address value
 */
export function requirePublicIpv4(input) {
  const { value } = parseCanonicalIpv4(input);
  if (!isGloballyReachableAddress(4, value)) {
    throw new TypeError('NETWORK_BOUNDARY_REJECTED');
  }
  return value;
}

/**
 * Require a canonical IPv6 origin spelling to pass the frozen boundary profile.
 *
 * @param {string} input canonical address without brackets
 * @returns {bigint} parsed address value
 */
export function requirePublicIpv6(input) {
  const { value } = parseCanonicalOriginIpv6(input);
  if (!isGloballyReachableAddress(6, value)) {
    throw new TypeError('NETWORK_BOUNDARY_REJECTED');
  }
  return value;
}

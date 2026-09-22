/**
 * Apply the exact DEC-097 frozen global-address classification.
 *
 * @param {4 | 6} family address family
 * @param {bigint} address parsed address value
 * @returns {boolean} whether the address is admitted
 */
export function isGloballyReachableAddress(family: 4 | 6, address: bigint): boolean;
/**
 * Require a canonical IPv4 spelling to pass the frozen boundary profile.
 *
 * @param {string} input canonical dotted decimal
 * @returns {bigint} parsed address value
 */
export function requirePublicIpv4(input: string): bigint;
/**
 * Require a canonical IPv6 origin spelling to pass the frozen boundary profile.
 *
 * @param {string} input canonical address without brackets
 * @returns {bigint} parsed address value
 */
export function requirePublicIpv6(input: string): bigint;
export const NETWORK_BOUNDARY_PROFILE: Readonly<{
    profile: "gala-network-boundary-v2";
    ipv4SourceDigest: "sha256:e3e39e76d00b1677335db8e9a805c7b9480ea2f4dc9e33f0b93cd3a905128d73";
    ipv6SourceDigest: "sha256:775feea0621dec8735a44fbf30f762e721e8f0a1b3ab7eb341961a88cfce2139";
    additionalDeniedCidrs: readonly string[];
}>;
export const NETWORK_BOUNDARY_PROFILE_DIGEST: string;
export type NetworkRange = {
    family: 4 | 6;
    network: bigint;
    prefix: number;
    globallyReachable: boolean;
};

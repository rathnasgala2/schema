/**
 * Validate and parse one exact DEC-097 verification origin.
 *
 * @param {string} input stored origin
 * @returns {{ origin: string, host: string, hostKind: 'dns' | 'ipv4' | 'ipv6', port: number }} parsed origin
 */
export function parseVerificationOrigin(input: string): {
    origin: string;
    host: string;
    hostKind: "dns" | "ipv4" | "ipv6";
    port: number;
};
/**
 * Require a value to be an exact canonical verification origin.
 *
 * @param {string} input stored origin
 * @returns {void}
 */
export function validateVerificationOrigin(input: string): void;

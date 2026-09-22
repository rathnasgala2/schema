/**
 * Canonicalize a valid DEC-099 BCP-47 tag using only the pinned IANA tables.
 *
 * @param {string} source authored language tag
 * @returns {string} Gala canonical language tag
 * @throws {TypeError} with code `BCP47_INVALID` for invalid syntax or registry use
 */
export function canonicalizeBcp47(source: string): string;
/**
 * Validate that a DEC-099 BCP-47 tag is already in Gala canonical form.
 *
 * @param {string} source authored language tag
 * @returns {boolean} true for a valid canonical tag
 * @throws {TypeError} with `BCP47_INVALID` or `BCP47_NOT_CANONICAL`
 */
export function validateCanonicalBcp47(source: string): boolean;
export type IanaLanguageRecord = {
    /**
     * record type
     */
    type: string;
    /**
     * registered subtag or range
     */
    subtag?: string;
    /**
     * registered whole tag
     */
    tag?: string;
    /**
     * replacement spelling
     */
    preferredValue?: string;
    /**
     * registered extlang or advisory variant prefixes
     */
    prefixes?: string[];
    /**
     * deprecation date
     */
    deprecated?: string;
};
export type ParsedLanguageTag = {
    /**
     * primary language subtag
     */
    language: string;
    /**
     * optional extlang subtag
     */
    extlang: string | undefined;
    /**
     * optional script subtag
     */
    script: string | undefined;
    /**
     * optional region subtag
     */
    region: string | undefined;
    /**
     * variant subtags in authored order
     */
    variants: string[];
    /**
     * extension sequences
     */
    extensions: {
        singleton: string;
        subtags: string[];
    }[];
    /**
     * optional private-use suffix payload
     */
    privateUse: string[];
};

/**
 * Parse the exact DEC-099 SPDX expression grammar and active 3.28.0 IDs.
 *
 * This step intentionally does not enforce serializer equality so callers can
 * distinguish invalid syntax from a valid but noncanonical expression.
 *
 * @param {string} source authored SPDX expression
 * @returns {SpdxExpressionNode} parsed expression tree
 */
export function parseSpdxExpression(source: string): SpdxExpressionNode;
/**
 * Serialize one SPDX tree to DEC-099's fully parenthesized canonical form.
 *
 * @param {SpdxExpressionNode} expression parsed expression tree
 * @returns {string} exact canonical expression
 */
export function serializeSpdxExpression(expression: SpdxExpressionNode): string;
/**
 * Validate one canonical 1..128-byte ASCII SPDX expression.
 *
 * @param {string} source authored SPDX expression
 * @returns {SpdxExpressionNode} validated expression tree
 */
export function validateSpdxExpression(source: string): SpdxExpressionNode;
/**
 * Validate exact SPDX 3.28.0 catalog evidence for one expression closure.
 *
 * Enclosing schemas own unrelated evidence members. This validator owns the
 * exact catalog version/digest and the ordered `{kind,id,text}` closure only.
 *
 * @param {string | readonly string[]} expressions canonical expression or expressions
 * @param {unknown} evidence catalog evidence record
 * @returns {void}
 */
export function validateSpdxCatalogEvidence(expressions: string | readonly string[], evidence: unknown): void;
export type SpdxLicenseNode = {
    type: "License";
    id: string;
};
export type SpdxWithNode = {
    type: "With";
    id: string;
    exceptionId: string;
};
export type SpdxBinaryNode = {
    type: "And" | "Or";
    left: SpdxExpressionNode;
    right: SpdxExpressionNode;
};
export type SpdxExpressionNode = SpdxLicenseNode | SpdxWithNode | SpdxBinaryNode;
export type ParserState = {
    source: string;
    cursor: number;
};
export type SpdxCatalogEntry = {
    kind: "license" | "exception";
    id: string;
    text: string;
};

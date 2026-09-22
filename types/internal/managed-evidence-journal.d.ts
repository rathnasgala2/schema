/**
 * Validate a complete managed evidence journal against receipt coordinates.
 *
 * This is an internal validator context, not a portable wire shape. Each entry
 * is the stored response projection without receipt/page fields; the owning
 * API schema supplies structural validation for each attempt and observation.
 *
 * @param {{
 *   operationId: string,
 *   runAttempt: number,
 *   entries: unknown[],
 *   receiptEntryCount: number,
 *   receiptHeadDigest: string
 * }} context complete retained journal context
 * @returns {{entryCount: number, headDigest: string}} validated terminal state
 */
export function validateManagedEvidenceJournal(context: {
    operationId: string;
    runAttempt: number;
    entries: unknown[];
    receiptEntryCount: number;
    receiptHeadDigest: string;
}): {
    entryCount: number;
    headDigest: string;
};

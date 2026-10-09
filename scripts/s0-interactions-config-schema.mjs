/** Emoji tokens an author may pick for a reaction, in display order. */
export const APPROVED_REACTION_EMOJI = Object.freeze([
  '\u{1F44D}',
  '❤️',
  '\u{1F4A1}',
  '\u{1F389}',
  '\u{1F602}',
  '\u{1F92F}',
  '\u{1F64F}',
  '\u{1F525}',
  '\u{1F44F}',
  '\u{1F62E}',
  '\u{1F622}',
  '\u{1F914}',
  '✨',
  '\u{1F680}',
  '\u{1F4AF}',
  '\u{1F440}',
]);

export const INTERACTIONS_CONFIG_ID =
  'urn:gala:schema:interactions-config:2.0.0';

/**
 * Build the parts of the interactions configuration shared by the root schema
 * and the copy the build-input schema embeds (a copy, because the corpus,
 * diagnostic and parity tooling resolve only local references).
 *
 * @param {object} language schema construction language
 * @param {Function} language.ref local-definition reference constructor
 * @param {Function} language.arrayOf bounded-array constructor
 * @param {Function} language.closedObject closed-object constructor
 * @param {Function} language.graphemeBound grapheme-bound constructor
 * @returns {{ properties: Record<string, unknown>, required: string[], definitions: Record<string, unknown>, keywords: Record<string, unknown> }} shared parts
 */
export function interactionsConfigParts(language) {
  const { ref, arrayOf, closedObject, graphemeBound } = language;

  const reactionKey = {
    type: 'string',
    pattern: '^[a-z][a-z0-9-]{1,31}$',
    not: { const: 'like' },
    description:
      'Stable reaction key. "like" is reserved: Like is implicit whenever reactions are enabled.',
  };

  const reactionVisual = closedObject(
    {
      kind: { const: 'emoji' },
      token: { enum: [...APPROVED_REACTION_EMOJI] },
    },
    ['kind', 'token'],
  );

  const reactionDefinition = closedObject(
    {
      key: ref('reactionKey'),
      label: graphemeBound(
        { allOf: [ref('plainLabel')], type: 'string' },
        1,
        32,
      ),
      visual: ref('reactionVisual'),
      order: { type: 'integer', minimum: 1, maximum: 16 },
      enabled: { type: 'boolean' },
    },
    ['key', 'label', 'visual', 'order', 'enabled'],
  );

  return {
    properties: {
      reactions: closedObject(
        {
          enabled: { type: 'boolean' },
          definitions: arrayOf(ref('reactionDefinition'), 0, 16),
        },
        ['enabled', 'definitions'],
      ),
      comments: closedObject(
        {
          enabled: { type: 'boolean' },
          allowReplies: { type: 'boolean' },
          maxDepth: { type: 'integer', minimum: 1, maximum: 4 },
        },
        ['enabled', 'allowReplies', 'maxDepth'],
      ),
      publicCounts: closedObject(
        { reactions: { type: 'boolean' }, comments: { type: 'boolean' } },
        ['reactions', 'comments'],
      ),
    },
    required: ['reactions', 'comments', 'publicCounts'],
    definitions: { reactionKey, reactionVisual, reactionDefinition },
    keywords: {
      $comment:
        'JSON Schema cannot express two rules; consumers enforce them: reaction keys are unique within definitions, and reaction orders are unique within definitions.',
    },
  };
}

/**
 * Create the reader-interactions repository configuration schema.
 *
 * @param {object} language schema construction language
 * @param {Function} language.rootSchema root-schema constructor
 * @param {Function} language.ref local-definition reference constructor
 * @param {Function} language.arrayOf bounded-array constructor
 * @param {Function} language.closedObject closed-object constructor
 * @param {Function} language.graphemeBound grapheme-bound constructor
 * @returns {Record<string, unknown>} the complete schema
 */
export function createInteractionsConfigSchema(language) {
  const parts = interactionsConfigParts(language);
  return language.rootSchema(
    'interactions-config',
    parts.properties,
    parts.required,
    parts.definitions,
    parts.keywords,
  );
}

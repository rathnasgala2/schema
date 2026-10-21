export const ANALYTICS_CONFIG_ID = 'urn:gala:schema:analytics-config:2.0.0';

/**
 * Build the parts of the analytics configuration shared by the root schema and
 * the copy the build-input schema embeds (a copy, because the corpus,
 * diagnostic and parity tooling resolve only local references).
 *
 * `provider` is a plain closed object whose `kind` is a closed enum with one
 * value. To admit a second provider later, replace it with a `oneOf` of closed
 * objects, each keyed by a `const` `kind`; the existing branch stays as it is.
 *
 * @param {object} language schema construction language
 * @param {Function} language.closedObject closed-object constructor
 * @returns {{ properties: Record<string, unknown>, required: string[], definitions: Record<string, unknown>, keywords: Record<string, unknown> }} shared parts
 */
export function analyticsConfigParts(language) {
  const { closedObject } = language;

  return {
    properties: {
      provider: closedObject(
        {
          kind: {
            enum: ['google-analytics-4'],
            description:
              'Which analytics provider the site uses. Closed list; a new provider is added as a new kind.',
          },
          measurementId: {
            type: 'string',
            pattern: '^G-[A-Z0-9]{4,12}$',
            description:
              'The Google Analytics 4 measurement ID, for example G-ABC123XYZ.',
          },
        },
        ['kind', 'measurementId'],
        {
          description:
            "The analytics provider. The site's template loads this provider's script only after the reader consents, and extends the page Content-Security-Policy for that provider's origins.",
        },
      ),
      consent: closedObject(
        {
          policy: {
            enum: ['opt-in'],
            description:
              'opt-in: readers are asked before any analytics loads, and nothing loads until they accept.',
          },
        },
        ['policy'],
        {
          description:
            'How readers are asked. The choice is stored in the reader’s browser and can be changed from the site footer.',
        },
      ),
    },
    required: ['provider', 'consent'],
    definitions: {},
    keywords: {},
  };
}

/**
 * Create the site analytics repository configuration schema.
 *
 * @param {object} language schema construction language
 * @param {Function} language.rootSchema root-schema constructor
 * @param {Function} language.closedObject closed-object constructor
 * @returns {Record<string, unknown>} the complete schema
 */
export function createAnalyticsConfigSchema(language) {
  const parts = analyticsConfigParts(language);
  return language.rootSchema(
    'analytics-config',
    parts.properties,
    parts.required,
    parts.definitions,
    parts.keywords,
  );
}

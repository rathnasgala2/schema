export const HTTP_PROBLEM_EXAMPLE_RULES =
  /** @type {Readonly<
   *   Record<string, {statuses: readonly number[], retryable: boolean}>
   * >} */ (
    Object.freeze({
      AUTHENTICATION_REQUIRED: { statuses: [401], retryable: false },
      AUTHORIZATION_DENIED: { statuses: [403], retryable: false },
      CAPABILITY_EXPIRED: { statuses: [410], retryable: false },
      CAPABILITY_UNAVAILABLE: { statuses: [503], retryable: false },
      COMMAND_REPLAY_CONFLICT: { statuses: [409], retryable: false },
      DEPENDENCY_UNAVAILABLE: { statuses: [503], retryable: true },
      DESTINATION_MUTATION_IN_PROGRESS: { statuses: [409], retryable: false },
      INVALID_SOURCE_STATE: { statuses: [409], retryable: false },
      RATE_LIMITED: { statuses: [429], retryable: true },
      REAUTH_REQUIRED: { statuses: [401], retryable: false },
      REPORTING_CAPABILITY_INVALID: { statuses: [401], retryable: false },
      REQUEST_FIELD_UNKNOWN: { statuses: [400], retryable: false },
      RESOURCE_NOT_FOUND: { statuses: [404], retryable: false },
      RESPONSE_REPRESENTATION_LIMIT_EXCEEDED: {
        statuses: [500],
        retryable: false,
      },
      STALE_AGGREGATE_VERSION: { statuses: [412], retryable: false },
      VALIDATION_FAILED: {
        statuses: [400, 413, 415, 422],
        retryable: false,
      },
      VERIFICATION_EVIDENCE_LIMIT_EXCEEDED: {
        statuses: [422],
        retryable: false,
      },
      WORKLOAD_BINDING_INVALID: { statuses: [403], retryable: false },
      WORKLOAD_REPLAYED: { statuses: [409], retryable: false },
    })
  );

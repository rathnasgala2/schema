const CORE_IDENTIFIER = '(?:0|[1-9]\\d*)';
const PRERELEASE_IDENTIFIER = '(?:0|[1-9]\\d*|\\d*[A-Za-z-][0-9A-Za-z-]*)';
const VERSION_SOURCE = `${CORE_IDENTIFIER}\\.${CORE_IDENTIFIER}\\.${CORE_IDENTIFIER}(?:-${PRERELEASE_IDENTIFIER}(?:\\.${PRERELEASE_IDENTIFIER})*)?`;
const VERSION_PATTERN = new RegExp(`^${VERSION_SOURCE}$`, 'u');
const BOUNDED_PATTERN = new RegExp(
  `^(>=|>)(${VERSION_SOURCE}) (<=|<)(${VERSION_SOURCE})$`,
  'u',
);

/**
 * Error carrying one stable semantic diagnostic code.
 */
export class SemanticValidationError extends Error {
  /**
   * Create a semantic validation error.
   *
   * @param {string} code normalized diagnostic code
   */
  constructor(code) {
    super(code);
    this.name = 'SemanticValidationError';
    this.code = code;
  }
}

/**
 * Parse one canonical SemVer 2.0.0 value without a numeric-size bound.
 *
 * @param {string} source authored version
 * @returns {{ source: string, major: bigint, minor: bigint, patch: bigint, prerelease: string[] }} parsed version
 */
export function parseSemver(source) {
  if (typeof source !== 'string' || !VERSION_PATTERN.test(source)) {
    throw new SemanticValidationError('SEMVER_INVALID');
  }
  const [core, prereleaseSource] = source.split('-', 2);
  if (!core) throw new SemanticValidationError('SEMVER_INVALID');
  const coreParts = core.split('.');
  const major = coreParts[0];
  const minor = coreParts[1];
  const patch = coreParts[2];
  if (major === undefined || minor === undefined || patch === undefined) {
    throw new SemanticValidationError('SEMVER_INVALID');
  }
  return {
    source,
    major: BigInt(major),
    minor: BigInt(minor),
    patch: BigInt(patch),
    prerelease: prereleaseSource?.split('.') ?? [],
  };
}

/**
 * Compare two parsed canonical SemVer values by SemVer precedence.
 *
 * @param {ReturnType<typeof parseSemver>} left left value
 * @param {ReturnType<typeof parseSemver>} right right value
 * @returns {-1 | 0 | 1} precedence comparison
 */
export function compareParsedSemver(left, right) {
  if (left.major < right.major) return -1;
  if (left.major > right.major) return 1;
  if (left.minor < right.minor) return -1;
  if (left.minor > right.minor) return 1;
  if (left.patch < right.patch) return -1;
  if (left.patch > right.patch) return 1;
  if (left.prerelease.length === 0 && right.prerelease.length === 0) return 0;
  if (left.prerelease.length === 0) return 1;
  if (right.prerelease.length === 0) return -1;

  const length = Math.max(left.prerelease.length, right.prerelease.length);
  for (let index = 0; index < length; index += 1) {
    const leftIdentifier = left.prerelease[index];
    const rightIdentifier = right.prerelease[index];
    if (leftIdentifier === undefined) return -1;
    if (rightIdentifier === undefined) return 1;
    if (leftIdentifier === rightIdentifier) continue;
    const leftNumeric = /^\d+$/u.test(leftIdentifier);
    const rightNumeric = /^\d+$/u.test(rightIdentifier);
    if (leftNumeric && rightNumeric) {
      return BigInt(leftIdentifier) < BigInt(rightIdentifier) ? -1 : 1;
    }
    if (leftNumeric) return -1;
    if (rightNumeric) return 1;
    return leftIdentifier < rightIdentifier ? -1 : 1;
  }
  return 0;
}

/**
 * Compare two canonical SemVer strings.
 *
 * @param {string} left left value
 * @param {string} right right value
 * @returns {-1 | 0 | 1} precedence comparison
 */
export function compareSemver(left, right) {
  return compareParsedSemver(parseSemver(left), parseSemver(right));
}

/**
 * Construct a parsed stable version from arbitrary-precision components.
 *
 * @param {bigint} major major component
 * @param {bigint} minor minor component
 * @param {bigint} patch patch component
 * @param {string[]} [prerelease] prerelease identifiers
 * @returns {ReturnType<typeof parseSemver>} parsed version
 */
function makeVersion(major, minor, patch, prerelease = []) {
  const source = `${major}.${minor}.${patch}${
    prerelease.length === 0 ? '' : `-${prerelease.join('.')}`
  }`;
  return { source, major, minor, patch, prerelease };
}

/**
 * Evaluate one comparator without prerelease admission.
 *
 * @param {ReturnType<typeof parseSemver>} candidate candidate version
 * @param {string} operator comparator operator
 * @param {ReturnType<typeof parseSemver>} limit comparator version
 * @returns {boolean} whether precedence passes
 */
function comparatorPasses(candidate, operator, limit) {
  const comparison = compareParsedSemver(candidate, limit);
  if (operator === '>=') return comparison >= 0;
  if (operator === '>') return comparison > 0;
  if (operator === '<=') return comparison <= 0;
  if (operator === '<') return comparison < 0;
  return comparison === 0;
}

/**
 * Apply npm's default prerelease admission to one comparator set.
 *
 * @param {ReturnType<typeof parseSemver>} candidate candidate version
 * @param {{ operator: string, version: ReturnType<typeof parseSemver> }[]} comparators comparator set
 * @returns {boolean} whether the candidate passes
 */
function comparatorSetPasses(candidate, comparators) {
  if (
    !comparators.every((comparator) =>
      comparatorPasses(candidate, comparator.operator, comparator.version),
    )
  ) {
    return false;
  }
  if (candidate.prerelease.length === 0) return true;
  return comparators.some(
    ({ version }) =>
      version.prerelease.length > 0 &&
      version.major === candidate.major &&
      version.minor === candidate.minor &&
      version.patch === candidate.patch,
  );
}

/**
 * Return the finite DEC-099 non-emptiness candidates for a bounded range.
 *
 * @param {{ operator: string, version: ReturnType<typeof parseSemver> }} lower lower comparator
 * @param {{ operator: string, version: ReturnType<typeof parseSemver> }} upper upper comparator
 * @returns {ReturnType<typeof parseSemver>[]} candidate versions
 */
function boundedCandidates(lower, upper) {
  const candidates = [];
  if (lower.operator === '>=') {
    candidates.push(lower.version);
  } else if (lower.version.prerelease.length > 0) {
    candidates.push(
      makeVersion(
        lower.version.major,
        lower.version.minor,
        lower.version.patch,
        [...lower.version.prerelease, '0'],
      ),
    );
  } else {
    candidates.push(
      makeVersion(
        lower.version.major,
        lower.version.minor,
        lower.version.patch + 1n,
      ),
    );
  }
  if (upper.version.prerelease.length > 0) {
    candidates.push(
      makeVersion(
        upper.version.major,
        upper.version.minor,
        upper.version.patch,
        ['0'],
      ),
    );
  }
  return [
    ...new Map(
      candidates.map((candidate) => [candidate.source, candidate]),
    ).values(),
  ];
}

/**
 * Parse the exact DEC-099 semantic-version range grammar.
 *
 * @param {string} source authored range
 * @returns {{ source: string, kind: 'exact' | 'caret' | 'bounded', comparators: { operator: string, version: ReturnType<typeof parseSemver> }[] }} parsed range
 */
export function parseSemverRange(source) {
  if (typeof source !== 'string' || source.length === 0) {
    throw new SemanticValidationError('SEMVER_RANGE_INVALID');
  }
  if (source.startsWith('^')) {
    const version = parseSemver(source.slice(1));
    let upper;
    if (version.major > 0n) {
      upper = makeVersion(version.major + 1n, 0n, 0n, ['0']);
    } else if (version.minor > 0n) {
      upper = makeVersion(0n, version.minor + 1n, 0n, ['0']);
    } else {
      upper = makeVersion(0n, 0n, version.patch + 1n, ['0']);
    }
    return {
      source,
      kind: 'caret',
      comparators: [
        { operator: '>=', version },
        { operator: '<', version: upper },
      ],
    };
  }
  if (VERSION_PATTERN.test(source)) {
    return {
      source,
      kind: 'exact',
      comparators: [{ operator: '=', version: parseSemver(source) }],
    };
  }
  const bounded = BOUNDED_PATTERN.exec(source);
  if (!bounded) throw new SemanticValidationError('SEMVER_RANGE_INVALID');
  const lowerOperator = bounded[1];
  const lowerSource = bounded[2];
  const upperOperator = bounded[3];
  const upperSource = bounded[4];
  if (!lowerOperator || !lowerSource || !upperOperator || !upperSource) {
    throw new SemanticValidationError('SEMVER_RANGE_INVALID');
  }
  const lower = {
    operator: lowerOperator,
    version: parseSemver(lowerSource),
  };
  const upper = {
    operator: upperOperator,
    version: parseSemver(upperSource),
  };
  const comparators = [lower, upper];
  if (
    !boundedCandidates(lower, upper).some((candidate) =>
      comparatorSetPasses(candidate, comparators),
    )
  ) {
    throw new SemanticValidationError('SEMVER_RANGE_EMPTY');
  }
  return { source, kind: 'bounded', comparators };
}

/**
 * Evaluate a canonical candidate against an admitted DEC-099 range.
 *
 * @param {string} candidateSource canonical SemVer candidate
 * @param {string} rangeSource admitted range
 * @returns {boolean} whether the candidate satisfies the range
 */
export function satisfiesSemverRange(candidateSource, rangeSource) {
  const candidate = parseSemver(candidateSource);
  const range = parseSemverRange(rangeSource);
  return comparatorSetPasses(candidate, range.comparators);
}

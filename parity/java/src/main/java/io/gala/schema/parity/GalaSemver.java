package io.gala.schema.parity;

import java.math.BigInteger;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Exact arbitrary-precision DEC-099 SemVer and range profile. */
final class GalaSemver {
    private static final String CORE = "(?:0|[1-9][0-9]*)";
    private static final String PRERELEASE = "(?:0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*)";
    private static final String VERSION_SOURCE = CORE + "\\." + CORE + "\\." + CORE
            + "(?:-" + PRERELEASE + "(?:\\." + PRERELEASE + ")*)?";
    private static final Pattern VERSION = Pattern.compile("^(" + CORE + ")\\.(" + CORE + ")\\.(" + CORE
            + ")(?:-(" + PRERELEASE + "(?:\\." + PRERELEASE + ")*))?$");
    private static final Pattern BOUNDED = Pattern.compile(
            "^(>=|>)(" + VERSION_SOURCE + ") (<=|<)(" + VERSION_SOURCE + ")$");

    private GalaSemver() {}

    static Version parseVersion(String source) {
        Matcher match = VERSION.matcher(source);
        if (!match.matches()) throw new IllegalArgumentException("SEMVER_INVALID");
        return new Version(
                source,
                new BigInteger(match.group(1)),
                new BigInteger(match.group(2)),
                new BigInteger(match.group(3)),
                match.group(4) == null ? List.of() : List.of(match.group(4).split("\\.", -1)));
    }

    static Range parseRange(String source) {
        if (source.startsWith("^")) {
            Version version = parseVersion(source.substring(1));
            Version upper;
            if (version.major().signum() > 0) {
                upper = makeVersion(version.major().add(BigInteger.ONE), BigInteger.ZERO, BigInteger.ZERO, List.of("0"));
            } else if (version.minor().signum() > 0) {
                upper = makeVersion(BigInteger.ZERO, version.minor().add(BigInteger.ONE), BigInteger.ZERO, List.of("0"));
            } else {
                upper = makeVersion(BigInteger.ZERO, BigInteger.ZERO, version.patch().add(BigInteger.ONE), List.of("0"));
            }
            return new Range(source, List.of(new Comparator(">=", version), new Comparator("<", upper)));
        }
        if (VERSION.matcher(source).matches()) {
            return new Range(source, List.of(new Comparator("=", parseVersion(source))));
        }
        Matcher match = BOUNDED.matcher(source);
        if (!match.matches()) throw new IllegalArgumentException("SEMVER_RANGE_INVALID");
        Comparator lower = new Comparator(match.group(1), parseVersion(match.group(2)));
        Comparator upper = new Comparator(match.group(3), parseVersion(match.group(4)));
        List<Comparator> comparators = List.of(lower, upper);
        if (boundedCandidates(lower, upper).stream().noneMatch(candidate -> passes(candidate, comparators))) {
            throw new IllegalArgumentException("SEMVER_RANGE_EMPTY");
        }
        return new Range(source, comparators);
    }

    static boolean satisfies(String candidate, String range) {
        return passes(parseVersion(candidate), parseRange(range).comparators());
    }

    private static List<Version> boundedCandidates(Comparator lower, Comparator upper) {
        List<Version> candidates = new ArrayList<>();
        Version lowerVersion = lower.version();
        if (lower.operator().equals(">=")) {
            candidates.add(lowerVersion);
        } else if (!lowerVersion.prerelease().isEmpty()) {
            List<String> prerelease = new ArrayList<>(lowerVersion.prerelease());
            prerelease.add("0");
            candidates.add(makeVersion(
                    lowerVersion.major(), lowerVersion.minor(), lowerVersion.patch(), prerelease));
        } else {
            candidates.add(makeVersion(
                    lowerVersion.major(), lowerVersion.minor(), lowerVersion.patch().add(BigInteger.ONE), List.of()));
        }
        if (!upper.version().prerelease().isEmpty()) {
            Version version = upper.version();
            candidates.add(makeVersion(version.major(), version.minor(), version.patch(), List.of("0")));
        }
        Map<String, Version> distinct = new LinkedHashMap<>();
        candidates.forEach(candidate -> distinct.put(candidate.source(), candidate));
        return List.copyOf(distinct.values());
    }

    private static Version makeVersion(
            BigInteger major, BigInteger minor, BigInteger patch, List<String> prerelease) {
        String source = major + "." + minor + "." + patch
                + (prerelease.isEmpty() ? "" : "-" + String.join(".", prerelease));
        return new Version(source, major, minor, patch, List.copyOf(prerelease));
    }

    private static boolean passes(Version candidate, List<Comparator> comparators) {
        if (comparators.stream().anyMatch(comparator -> !comparatorPasses(candidate, comparator))) return false;
        if (candidate.prerelease().isEmpty()) return true;
        return comparators.stream().anyMatch(comparator -> {
            Version version = comparator.version();
            return !version.prerelease().isEmpty()
                    && version.major().equals(candidate.major())
                    && version.minor().equals(candidate.minor())
                    && version.patch().equals(candidate.patch());
        });
    }

    private static boolean comparatorPasses(Version candidate, Comparator comparator) {
        int comparison = compare(candidate, comparator.version());
        return switch (comparator.operator()) {
            case ">=" -> comparison >= 0;
            case ">" -> comparison > 0;
            case "<=" -> comparison <= 0;
            case "<" -> comparison < 0;
            case "=" -> comparison == 0;
            default -> throw new IllegalArgumentException("SEMVER_RANGE_INVALID");
        };
    }

    private static int compare(Version left, Version right) {
        int core = left.major().compareTo(right.major());
        if (core == 0) core = left.minor().compareTo(right.minor());
        if (core == 0) core = left.patch().compareTo(right.patch());
        if (core != 0) return Integer.signum(core);
        if (left.prerelease().isEmpty() && right.prerelease().isEmpty()) return 0;
        if (left.prerelease().isEmpty()) return 1;
        if (right.prerelease().isEmpty()) return -1;
        int length = Math.max(left.prerelease().size(), right.prerelease().size());
        for (int index = 0; index < length; index++) {
            if (index >= left.prerelease().size()) return -1;
            if (index >= right.prerelease().size()) return 1;
            String leftPart = left.prerelease().get(index);
            String rightPart = right.prerelease().get(index);
            if (leftPart.equals(rightPart)) continue;
            boolean leftNumeric = leftPart.matches("[0-9]+");
            boolean rightNumeric = rightPart.matches("[0-9]+");
            if (leftNumeric && rightNumeric) {
                return Integer.signum(new BigInteger(leftPart).compareTo(new BigInteger(rightPart)));
            }
            if (leftNumeric) return -1;
            if (rightNumeric) return 1;
            return Integer.signum(leftPart.compareTo(rightPart));
        }
        return 0;
    }

    record Version(
            String source, BigInteger major, BigInteger minor, BigInteger patch, List<String> prerelease) {}

    record Comparator(String operator, Version version) {}

    record Range(String source, List<Comparator> comparators) {}
}

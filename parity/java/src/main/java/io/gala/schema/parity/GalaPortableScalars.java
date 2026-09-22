package io.gala.schema.parity;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** DEC-099 RFC-3339 and repository-glob profiles without host parsers. */
final class GalaPortableScalars {
    private static final Pattern RFC3339 = Pattern.compile(
            "^([0-9]{4})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]\\.[0-9]{3}Z$");

    private GalaPortableScalars() {}

    static boolean validRfc3339(String value) {
        Matcher match = RFC3339.matcher(value);
        if (!match.matches()) return false;
        int year = Integer.parseInt(match.group(1));
        int month = Integer.parseInt(match.group(2));
        int day = Integer.parseInt(match.group(3));
        boolean leap = year % 4 == 0 && (year % 100 != 0 || year % 400 == 0);
        int[] lengths = {31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
        return day <= lengths[month - 1];
    }

    static List<String> parseRepositoryGlob(String pattern, GalaUnicode unicode) {
        if (pattern.isEmpty()
                || pattern.getBytes(StandardCharsets.UTF_8).length > 256
                || !unicode.isNfc(pattern)
                || pattern.startsWith("/")
                || pattern.endsWith("/")
                || pattern.contains("//")
                || pattern.startsWith("~")
                || pattern.startsWith("!")
                || pattern.matches("^[A-Za-z]:.*")
                || pattern.matches(".*[{}].*")
                || pattern.matches(".*(?:@|\\+|\\?|\\*|!)\\(.*")) {
            throw new IllegalArgumentException("REPOSITORY_GLOB_INVALID");
        }
        List<String> segments = List.of(pattern.split("/", -1));
        for (String segment : segments) {
            if (segment.isEmpty()
                    || segment.equals(".")
                    || segment.equals("..")
                    || segment.getBytes(StandardCharsets.UTF_8).length > 128
                    || (!segment.equals("**") && segment.contains("**"))) {
                throw new IllegalArgumentException("REPOSITORY_GLOB_INVALID");
            }
            segment.codePoints().forEach(codePoint -> {
                if (codePoint != '*' && codePoint != '?' && forbiddenPathScalar(codePoint)) {
                    throw new IllegalArgumentException("REPOSITORY_GLOB_INVALID");
                }
            });
        }
        return segments;
    }

    static boolean matchRepositoryGlob(String pattern, String candidate, GalaUnicode unicode) {
        List<String> patternSegments = parseRepositoryGlob(pattern, unicode);
        List<String> candidateSegments = parseCandidate(candidate, unicode);
        return matchPath(patternSegments, candidateSegments, 0, 0, new HashMap<>());
    }

    static List<String> selectRepositoryPaths(
            List<String> includes, List<String> excludes, List<String> candidates, GalaUnicode unicode) {
        includes.forEach(pattern -> parseRepositoryGlob(pattern, unicode));
        excludes.forEach(pattern -> parseRepositoryGlob(pattern, unicode));
        Set<String> distinct = new LinkedHashSet<>(candidates);
        return distinct.stream()
                .filter(candidate -> includes.stream().anyMatch(pattern -> matchRepositoryGlob(pattern, candidate, unicode)))
                .filter(candidate -> excludes.stream().noneMatch(pattern -> matchRepositoryGlob(pattern, candidate, unicode)))
                .sorted(GalaPortableScalars::compareUtf8)
                .toList();
    }

    private static List<String> parseCandidate(String candidate, GalaUnicode unicode) {
        if (candidate.isEmpty()
                || !unicode.isNfc(candidate)
                || candidate.startsWith("/")
                || candidate.endsWith("/")
                || candidate.contains("//")
                || candidate.matches("^[A-Za-z]:.*")) {
            throw new IllegalArgumentException("REPOSITORY_GLOB_INVALID");
        }
        List<String> segments = List.of(candidate.split("/", -1));
        for (String segment : segments) {
            if (segment.equals(".") || segment.equals("..") || segment.codePoints().anyMatch(GalaPortableScalars::forbiddenPathScalar)) {
                throw new IllegalArgumentException("REPOSITORY_GLOB_INVALID");
            }
        }
        return segments;
    }

    private static boolean matchPath(
            List<String> patterns,
            List<String> candidates,
            int patternIndex,
            int candidateIndex,
            Map<Long, Boolean> memo) {
        long key = ((long) patternIndex << 32) | candidateIndex;
        Boolean cached = memo.get(key);
        if (cached != null) return cached;
        boolean result;
        if (patternIndex == patterns.size()) {
            result = candidateIndex == candidates.size();
        } else if (patterns.get(patternIndex).equals("**")) {
            result = matchPath(patterns, candidates, patternIndex + 1, candidateIndex, memo);
            if (!result && candidateIndex < candidates.size() && !candidates.get(candidateIndex).startsWith(".")) {
                result = matchPath(patterns, candidates, patternIndex, candidateIndex + 1, memo);
            }
        } else {
            result = candidateIndex < candidates.size()
                    && matchSegment(patterns.get(patternIndex), candidates.get(candidateIndex))
                    && matchPath(patterns, candidates, patternIndex + 1, candidateIndex + 1, memo);
        }
        memo.put(key, result);
        return result;
    }

    private static boolean matchSegment(String pattern, String candidate) {
        int[] patterns = pattern.codePoints().toArray();
        int[] candidates = candidate.codePoints().toArray();
        if (candidates.length > 0 && candidates[0] == '.' && (patterns.length == 0 || patterns[0] != '.')) return false;
        return matchSegment(patterns, candidates, 0, 0, new HashMap<>());
    }

    private static boolean matchSegment(
            int[] patterns, int[] candidates, int patternIndex, int candidateIndex, Map<Long, Boolean> memo) {
        long key = ((long) patternIndex << 32) | candidateIndex;
        Boolean cached = memo.get(key);
        if (cached != null) return cached;
        boolean result;
        if (patternIndex == patterns.length) {
            result = candidateIndex == candidates.length;
        } else if (patterns[patternIndex] == '*') {
            result = matchSegment(patterns, candidates, patternIndex + 1, candidateIndex, memo)
                    || (candidateIndex < candidates.length
                            && matchSegment(patterns, candidates, patternIndex, candidateIndex + 1, memo));
        } else if (patterns[patternIndex] == '?') {
            result = candidateIndex < candidates.length
                    && matchSegment(patterns, candidates, patternIndex + 1, candidateIndex + 1, memo);
        } else {
            result = candidateIndex < candidates.length
                    && patterns[patternIndex] == candidates[candidateIndex]
                    && matchSegment(patterns, candidates, patternIndex + 1, candidateIndex + 1, memo);
        }
        memo.put(key, result);
        return result;
    }

    private static boolean forbiddenPathScalar(int codePoint) {
        return codePoint == 0
                || codePoint < 0x20
                || (codePoint >= 0x7f && codePoint <= 0x9f)
                || codePoint == '\\'
                || codePoint == '%';
    }

    private static int compareUtf8(String left, String right) {
        byte[] leftBytes = left.getBytes(StandardCharsets.UTF_8);
        byte[] rightBytes = right.getBytes(StandardCharsets.UTF_8);
        int length = Math.min(leftBytes.length, rightBytes.length);
        for (int index = 0; index < length; index++) {
            int comparison = Integer.compare(Byte.toUnsignedInt(leftBytes[index]), Byte.toUnsignedInt(rightBytes[index]));
            if (comparison != 0) return comparison;
        }
        return Integer.compare(leftBytes.length, rightBytes.length);
    }
}

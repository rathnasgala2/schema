package io.gala.schema.parity;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Unicode 17 data needed by the cross-language validation assertions. */
final class GalaUnicode {
    private static final int COMBINING_CLASS_COUNT = 256;
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private final List<PropertyRange> graphemeBreak;
    private final List<PropertyRange> indicConjunctBreak;
    private final List<PropertyRange> extendedPictographic;
    private final List<PropertyRange> joiningType;
    private final List<PropertyRange> generalCategories;
    private final List<PropertyRange> bidiClasses;
    private final List<IdnaRange> idna;
    private final Map<Integer, Integer> combiningClasses;
    private final Map<Integer, int[]> decompositions;
    private final Map<Long, Integer> compositions;
    private final Map<Integer, int[]> caseFolding;

    GalaUnicode(Path repositoryRoot) throws IOException {
        JsonNode table = MAPPER.readTree(Files.readString(
                repositoryRoot.resolve("src/internal/generated/unicode17.json")));
        graphemeBreak = ranges(table.get("graphemeBreak"));
        indicConjunctBreak = ranges(table.get("indicConjunctBreak"));
        extendedPictographic = ranges(table.get("extendedPictographic"));
        joiningType = ranges(table.get("joiningType"));
        generalCategories = ranges(table.get("generalCategories"));
        bidiClasses = ranges(table.get("bidiClasses"));
        idna = idnaRanges(table.get("idna"));
        combiningClasses = integerMap(table.get("combiningClasses"));
        decompositions = sequenceMap(table.get("decompositions"));
        compositions = compositionMap(table.get("compositions"));
        caseFolding = sequenceMap(table.get("caseFolding"));
    }

    boolean isNfc(String value) {
        return normalizeNfc(value).equals(value);
    }

    static boolean isScalarString(String value) {
        try {
            scalarValues(value);
            return true;
        } catch (IllegalArgumentException error) {
            if ("UNICODE_SCALAR_INVALID".equals(error.getMessage())) return false;
            throw error;
        }
    }

    int graphemeLength(String value) {
        List<Integer> boundaries = graphemeBoundaries(value);
        return boundaries.size() == 1 ? 0 : boundaries.size() - 1;
    }

    List<Integer> graphemeBoundaries(String value) {
        int[] codePoints = scalarValues(value);
        String[] breaks = new String[codePoints.length];
        for (int index = 0; index < codePoints.length; index++) {
            breaks[index] = property(codePoints[index], graphemeBreak, "Other");
        }
        List<Integer> boundaries = new ArrayList<>();
        boundaries.add(0);
        int regionalRun = breaks.length > 0 && breaks[0].equals("Regional_Indicator") ? 1 : 0;
        for (int index = 1; index < codePoints.length; index++) {
            if (hasBoundary(codePoints, breaks, index, regionalRun)) boundaries.add(index);
            regionalRun = breaks[index].equals("Regional_Indicator") ? regionalRun + 1 : 0;
        }
        if (codePoints.length > 0) boundaries.add(codePoints.length);
        return List.copyOf(boundaries);
    }

    String normalizeNfc(String value) {
        int[] source = scalarValues(value);
        List<Integer> ordered = new ArrayList<>();
        List<List<Integer>> combiningBuckets = new ArrayList<>(COMBINING_CLASS_COUNT);
        for (int index = 0; index < COMBINING_CLASS_COUNT; index++) combiningBuckets.add(new ArrayList<>());
        List<Integer> activeCombiningClasses = new ArrayList<>();
        for (int codePoint : source) {
            List<Integer> decomposition = new ArrayList<>();
            decompose(codePoint, decomposition);
            for (int component : decomposition) {
                int combiningClass = combiningClass(component);
                if (combiningClass == 0) {
                    flushCombiningBuckets(ordered, combiningBuckets, activeCombiningClasses);
                    ordered.add(component);
                } else {
                    if (combiningClass >= COMBINING_CLASS_COUNT) {
                        throw new IllegalArgumentException("UNICODE_DATA_INVALID");
                    }
                    List<Integer> bucket = combiningBuckets.get(combiningClass);
                    if (bucket.isEmpty()) activeCombiningClasses.add(combiningClass);
                    bucket.add(component);
                }
            }
        }
        flushCombiningBuckets(ordered, combiningBuckets, activeCombiningClasses);
        if (ordered.isEmpty()) return "";
        List<Integer> composed = new ArrayList<>();
        composed.add(ordered.get(0));
        int starterPosition = 0;
        int starter = ordered.get(0);
        int priorClass = 0;
        for (int index = 1; index < ordered.size(); index++) {
            int codePoint = ordered.get(index);
            int combiningClass = combiningClass(codePoint);
            Integer composite = composePair(starter, codePoint);
            if (composite != null && (priorClass < combiningClass || priorClass == 0)) {
                composed.set(starterPosition, composite);
                starter = composite;
                continue;
            }
            composed.add(codePoint);
            if (combiningClass == 0) {
                starterPosition = composed.size() - 1;
                starter = codePoint;
            }
            priorClass = combiningClass;
        }
        StringBuilder result = new StringBuilder();
        composed.forEach(result::appendCodePoint);
        return result.toString();
    }

    String collisionKey(String value) {
        String normalized = normalizeNfc(value);
        StringBuilder folded = new StringBuilder();
        normalized.codePoints().forEach(codePoint -> {
            int[] mapping = caseFolding.get(codePoint);
            if (mapping == null) folded.appendCodePoint(codePoint);
            else for (int component : mapping) folded.appendCodePoint(component);
        });
        return normalizeNfc(folded.toString());
    }

    String generalCategory(int codePoint) {
        return property(codePoint, generalCategories, "Cn");
    }

    String bidiClass(int codePoint) {
        return property(codePoint, bidiClasses, "L");
    }

    IdnaMapping idnaMapping(int codePoint) {
        int low = 0;
        int high = idna.size() - 1;
        while (low <= high) {
            int middle = (low + high) >>> 1;
            IdnaRange range = idna.get(middle);
            if (codePoint < range.first()) high = middle - 1;
            else if (codePoint > range.last()) low = middle + 1;
            else return new IdnaMapping(range.status(), range.mapping());
        }
        throw new IllegalArgumentException("IDNA_INVALID");
    }

    String joiningType(int codePoint) {
        return property(codePoint, joiningType, "U");
    }

    void checkJoiners(String value) {
        int[] codePoints = scalarValues(value);
        for (int index = 0; index < codePoints.length; index++) {
            int codePoint = codePoints[index];
            if (codePoint != 0x200c && codePoint != 0x200d) continue;
            if (index > 0 && combiningClass(codePoints[index - 1]) == 9) continue;
            if (codePoint == 0x200d) throw new IllegalArgumentException("IDNA_CONTEXTJ_INVALID");
            int left = index - 1;
            while (left >= 0 && joiningType(codePoints[left]).equals("T")) left--;
            int right = index + 1;
            while (right < codePoints.length && joiningType(codePoints[right]).equals("T")) right++;
            String leftType = left >= 0 ? joiningType(codePoints[left]) : "U";
            String rightType = right < codePoints.length ? joiningType(codePoints[right]) : "U";
            if ((!leftType.equals("L") && !leftType.equals("D"))
                    || (!rightType.equals("R") && !rightType.equals("D"))) {
                throw new IllegalArgumentException("IDNA_CONTEXTJ_INVALID");
            }
        }
    }

    private static void flushCombiningBuckets(
            List<Integer> ordered, List<List<Integer>> buckets, List<Integer> activeClasses) {
        activeClasses.sort(Integer::compareTo);
        for (int combiningClass : activeClasses) {
            List<Integer> bucket = buckets.get(combiningClass);
            ordered.addAll(bucket);
            bucket.clear();
        }
        activeClasses.clear();
    }

    private boolean hasBoundary(int[] codePoints, String[] breaks, int index, int regionalRun) {
        int left = codePoints[index - 1];
        int right = codePoints[index];
        String leftBreak = breaks[index - 1];
        String rightBreak = breaks[index];
        if (leftBreak.equals("CR") && rightBreak.equals("LF")) return false;
        if (isControl(leftBreak)) return true;
        if (isControl(rightBreak)) return true;
        if (leftBreak.equals("L") && List.of("L", "V", "LV", "LVT").contains(rightBreak)) return false;
        if (List.of("LV", "V").contains(leftBreak) && List.of("V", "T").contains(rightBreak)) return false;
        if (List.of("LVT", "T").contains(leftBreak) && rightBreak.equals("T")) return false;
        if (rightBreak.equals("Extend") || rightBreak.equals("ZWJ") || rightBreak.equals("SpacingMark")) return false;
        if (leftBreak.equals("Prepend")) return false;

        if (property(right, indicConjunctBreak, "None").equals("Consonant")) {
            int cursor = index - 1;
            boolean sawLinker = false;
            while (cursor >= 0) {
                String current = property(codePoints[cursor], indicConjunctBreak, "None");
                if (current.equals("Linker")) sawLinker = true;
                if (!current.equals("Linker") && !current.equals("Extend")) break;
                cursor--;
            }
            if (sawLinker && cursor >= 0
                    && property(codePoints[cursor], indicConjunctBreak, "None").equals("Consonant")) return false;
        }

        if (contains(right, extendedPictographic) && leftBreak.equals("ZWJ")) {
            int cursor = index - 2;
            while (cursor >= 0 && breaks[cursor].equals("Extend")) cursor--;
            if (cursor >= 0 && contains(codePoints[cursor], extendedPictographic)) return false;
        }

        if (leftBreak.equals("Regional_Indicator") && rightBreak.equals("Regional_Indicator")
                && regionalRun % 2 == 1) {
            return false;
        }
        return true;
    }

    private static boolean isControl(String value) {
        return value.equals("Control") || value.equals("CR") || value.equals("LF");
    }

    private int combiningClass(int codePoint) {
        return combiningClasses.getOrDefault(codePoint, 0);
    }

    private void decompose(int codePoint, List<Integer> output) {
        int syllableIndex = codePoint - 0xac00;
        if (syllableIndex >= 0 && syllableIndex < 11172) {
            int leading = 0x1100 + syllableIndex / (21 * 28);
            int vowel = 0x1161 + (syllableIndex % (21 * 28)) / 28;
            int trailing = 0x11a7 + syllableIndex % 28;
            output.add(leading);
            output.add(vowel);
            if (trailing != 0x11a7) output.add(trailing);
            return;
        }
        int[] decomposition = decompositions.get(codePoint);
        if (decomposition == null) {
            output.add(codePoint);
            return;
        }
        for (int component : decomposition) decompose(component, output);
    }

    private Integer composePair(int first, int second) {
        int leadingIndex = first - 0x1100;
        int vowelIndex = second - 0x1161;
        if (leadingIndex >= 0 && leadingIndex < 19 && vowelIndex >= 0 && vowelIndex < 21) {
            return 0xac00 + (leadingIndex * 21 + vowelIndex) * 28;
        }
        int syllableIndex = first - 0xac00;
        int trailingIndex = second - 0x11a7;
        if (syllableIndex >= 0 && syllableIndex < 11172 && syllableIndex % 28 == 0
                && trailingIndex > 0 && trailingIndex < 28) {
            return first + trailingIndex;
        }
        return compositions.get(pairKey(first, second));
    }

    private static int[] scalarValues(String value) {
        for (int index = 0; index < value.length(); index++) {
            char current = value.charAt(index);
            if (Character.isHighSurrogate(current)) {
                if (index + 1 >= value.length() || !Character.isLowSurrogate(value.charAt(index + 1))) {
                    throw new IllegalArgumentException("UNICODE_SCALAR_INVALID");
                }
                index++;
            } else if (Character.isLowSurrogate(current)) {
                throw new IllegalArgumentException("UNICODE_SCALAR_INVALID");
            }
        }
        return value.codePoints().toArray();
    }

    private static List<PropertyRange> ranges(JsonNode source) {
        List<PropertyRange> result = new ArrayList<>();
        for (JsonNode row : source) {
            result.add(new PropertyRange(row.get(0).intValue(), row.get(1).intValue(), row.get(2).asText()));
        }
        return List.copyOf(result);
    }

    private static Map<Integer, Integer> integerMap(JsonNode source) {
        Map<Integer, Integer> result = new HashMap<>();
        for (JsonNode row : source) result.put(row.get(0).intValue(), row.get(1).intValue());
        return Map.copyOf(result);
    }

    private static Map<Integer, int[]> sequenceMap(JsonNode source) {
        Map<Integer, int[]> result = new HashMap<>();
        for (JsonNode row : source) {
            int[] sequence = new int[row.get(1).size()];
            for (int index = 0; index < sequence.length; index++) sequence[index] = row.get(1).get(index).intValue();
            result.put(row.get(0).intValue(), sequence);
        }
        return Map.copyOf(result);
    }

    private static Map<Long, Integer> compositionMap(JsonNode source) {
        Map<Long, Integer> result = new HashMap<>();
        for (JsonNode row : source) {
            result.put(pairKey(row.get(0).intValue(), row.get(1).intValue()), row.get(2).intValue());
        }
        return Map.copyOf(result);
    }

    private static List<IdnaRange> idnaRanges(JsonNode source) {
        List<IdnaRange> result = new ArrayList<>();
        for (JsonNode row : source) {
            int[] mapping = new int[row.get(3).size()];
            for (int index = 0; index < mapping.length; index++) {
                mapping[index] = row.get(3).get(index).intValue();
            }
            result.add(new IdnaRange(
                    row.get(0).intValue(), row.get(1).intValue(), row.get(2).asText(), mapping));
        }
        return List.copyOf(result);
    }

    private static long pairKey(int first, int second) {
        return ((long) first << 21) | second;
    }

    private static boolean contains(int codePoint, List<PropertyRange> ranges) {
        return !property(codePoint, ranges, "").isEmpty();
    }

    private static String property(int codePoint, List<PropertyRange> ranges, String fallback) {
        int low = 0;
        int high = ranges.size() - 1;
        while (low <= high) {
            int middle = (low + high) >>> 1;
            PropertyRange range = ranges.get(middle);
            if (codePoint < range.first()) high = middle - 1;
            else if (codePoint > range.last()) low = middle + 1;
            else return range.value();
        }
        return fallback;
    }

    private record PropertyRange(int first, int last, String value) {}

    record IdnaMapping(String status, int[] mapping) {}

    private record IdnaRange(int first, int last, String status, int[] mapping) {}
}

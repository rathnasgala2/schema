package io.gala.schema.parity;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/** Pinned Unicode-17 UTS #46, RFC 5893, and RFC 3492 profile. */
final class GalaIdna {
    private static final int BASE = 36;
    private static final int TMIN = 1;
    private static final int TMAX = 26;
    private static final int SKEW = 38;
    private static final int DAMP = 700;
    private static final int INITIAL_BIAS = 72;
    private static final int INITIAL_CODE_POINT = 128;
    private static final long MAXIMUM_SAFE_INTEGER = 9_007_199_254_740_991L;
    private final GalaUnicode unicode;

    GalaIdna(GalaUnicode unicode) {
        this.unicode = unicode;
    }

    String toAsciiDomain(String input) {
        String mappedDomain = mapUts46(input);
        if (mappedDomain.startsWith(".") || mappedDomain.endsWith(".")) invalid();
        String[] sourceLabels = mappedDomain.split("\\.", -1);
        List<String> unicodeLabels = new ArrayList<>();
        List<String> asciiLabels = new ArrayList<>();
        for (String sourceLabel : sourceLabels) {
            String label = sourceLabel;
            boolean wasAce = label.startsWith("xn--");
            if (wasAce) {
                label = decodePunycode(label.substring(4));
                if (!mapUts46(label).equals(label)) invalid();
            }
            validateUnicodeLabel(label);
            boolean asciiOnly = label.codePoints().allMatch(codePoint -> codePoint < 0x80);
            String ascii = asciiOnly ? label : "xn--" + encodePunycode(label);
            if (ascii.isEmpty() || ascii.length() > 63 || (wasAce && !ascii.equals(sourceLabel))) invalid();
            unicodeLabels.add(label);
            asciiLabels.add(ascii);
        }
        boolean bidiDomain = unicodeLabels.stream().anyMatch(label -> label.codePoints().anyMatch(codePoint ->
                Set.of("R", "AL", "AN").contains(unicode.bidiClass(codePoint))));
        if (bidiDomain) unicodeLabels.forEach(this::validateBidiLabel);
        String result = String.join(".", asciiLabels);
        if (result.getBytes(StandardCharsets.US_ASCII).length > 253) invalid();
        return result;
    }

    void validateCanonicalAsciiDomain(String input) {
        if (!toAsciiDomain(input).equals(input)) invalid();
    }

    String decodePunycode(String input) {
        if (!input.matches("[a-z0-9-]+")) invalid();
        List<Integer> output = new ArrayList<>();
        int delimiter = input.lastIndexOf('-');
        int cursor;
        if (delimiter < 0) {
            cursor = 0;
        } else {
            input.substring(0, delimiter).codePoints().forEach(codePoint -> {
                if (codePoint >= 0x80) invalid();
                output.add(codePoint);
            });
            cursor = delimiter + 1;
        }
        long codePoint = INITIAL_CODE_POINT;
        long index = 0;
        int bias = INITIAL_BIAS;
        while (cursor < input.length()) {
            long priorIndex = index;
            long weight = 1;
            for (int power = BASE; ; power += BASE) {
                if (cursor >= input.length()) invalid();
                int digit = decodeDigit(input.charAt(cursor++));
                if (digit >= BASE) invalid();
                index = checkedAdd(index, checkedMultiply(digit, weight));
                int threshold = power <= bias + TMIN ? TMIN : power >= bias + TMAX ? TMAX : power - bias;
                if (digit < threshold) break;
                weight = checkedMultiply(weight, BASE - threshold);
            }
            int outputLength = output.size() + 1;
            bias = adaptBias(index - priorIndex, outputLength, priorIndex == 0);
            codePoint = checkedAdd(codePoint, index / outputLength);
            index %= outputLength;
            if (codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)) invalid();
            output.add((int) index, (int) codePoint);
            index++;
        }
        StringBuilder result = new StringBuilder();
        output.forEach(result::appendCodePoint);
        return result.toString();
    }

    String encodePunycode(String input) {
        int[] codePoints = scalarValues(input);
        StringBuilder output = new StringBuilder();
        int handled = 0;
        for (int codePoint : codePoints) {
            if (codePoint < 0x80) {
                output.appendCodePoint(codePoint);
                handled++;
            }
        }
        int basicCount = handled;
        if (basicCount > 0 && handled < codePoints.length) output.append('-');
        long codePoint = INITIAL_CODE_POINT;
        long delta = 0;
        int bias = INITIAL_BIAS;
        while (handled < codePoints.length) {
            int next = Integer.MAX_VALUE;
            for (int value : codePoints) if (value >= codePoint && value < next) next = value;
            delta = checkedAdd(delta, checkedMultiply(next - codePoint, handled + 1L));
            codePoint = next;
            for (int value : codePoints) {
                if (value < codePoint) delta = checkedAdd(delta, 1);
                if (value != codePoint) continue;
                long quotient = delta;
                for (int power = BASE; ; power += BASE) {
                    int threshold = power <= bias + TMIN ? TMIN : power >= bias + TMAX ? TMAX : power - bias;
                    if (quotient < threshold) break;
                    int digit = threshold + (int) ((quotient - threshold) % (BASE - threshold));
                    output.append(encodeDigit(digit));
                    quotient = (quotient - threshold) / (BASE - threshold);
                }
                output.append(encodeDigit((int) quotient));
                bias = adaptBias(delta, handled + 1, handled == basicCount);
                delta = 0;
                handled++;
            }
            delta = checkedAdd(delta, 1);
            codePoint++;
        }
        return output.toString();
    }

    private String mapUts46(String value) {
        int[] codePoints = scalarValues(value);
        StringBuilder mapped = new StringBuilder();
        for (int codePoint : codePoints) {
            GalaUnicode.IdnaMapping row = unicode.idnaMapping(codePoint);
            if (row.status().equals("valid") || row.status().equals("deviation")) {
                mapped.appendCodePoint(codePoint);
            } else if (row.status().equals("mapped")) {
                for (int component : row.mapping()) mapped.appendCodePoint(component);
            } else if (!row.status().equals("ignored")) {
                invalid();
            }
        }
        return unicode.normalizeNfc(mapped.toString());
    }

    private void validateUnicodeLabel(String label) {
        int[] codePoints = scalarValues(label);
        if (codePoints.length == 0 || label.startsWith("-") || label.endsWith("-")
                || (codePoints.length > 3 && codePoints[2] == '-' && codePoints[3] == '-')
                || unicode.generalCategory(codePoints.length == 0 ? 0 : codePoints[0]).startsWith("M")) invalid();
        for (int codePoint : codePoints) {
            String status = unicode.idnaMapping(codePoint).status();
            if (!status.equals("valid") && !status.equals("deviation")) invalid();
            if (codePoint < 0x80 && !((codePoint >= 'a' && codePoint <= 'z')
                    || (codePoint >= '0' && codePoint <= '9') || codePoint == '-')) invalid();
        }
        unicode.checkJoiners(label);
    }

    private void validateBidiLabel(String label) {
        List<String> classes = label.codePoints().mapToObj(unicode::bidiClass).toList();
        String first = classes.get(0);
        int lastIndex = classes.size() - 1;
        while (classes.get(lastIndex).equals("NSM")) lastIndex--;
        String last = classes.get(lastIndex);
        if (first.equals("L")) {
            Set<String> allowed = Set.of("L", "EN", "ES", "CS", "ET", "ON", "BN", "NSM");
            if (!allowed.containsAll(classes) || (!last.equals("L") && !last.equals("EN"))) invalid();
            return;
        }
        if (!first.equals("R") && !first.equals("AL")) invalid();
        Set<String> allowed = Set.of("R", "AL", "AN", "EN", "ES", "CS", "ET", "ON", "BN", "NSM");
        if (!allowed.containsAll(classes)
                || (!last.equals("R") && !last.equals("AL") && !last.equals("EN") && !last.equals("AN"))
                || (classes.contains("EN") && classes.contains("AN"))) invalid();
    }

    private static int[] scalarValues(String value) {
        for (int index = 0; index < value.length(); index++) {
            char current = value.charAt(index);
            if (Character.isHighSurrogate(current)) {
                if (index + 1 >= value.length() || !Character.isLowSurrogate(value.charAt(index + 1))) {
                    invalidUnicodeScalar();
                }
                index++;
            } else if (Character.isLowSurrogate(current)) {
                invalidUnicodeScalar();
            }
        }
        return value.codePoints().toArray();
    }

    private static int decodeDigit(char value) {
        if (value >= '0' && value <= '9') return value - 0x16;
        if (value >= 'A' && value <= 'Z') return value - 'A';
        if (value >= 'a' && value <= 'z') return value - 'a';
        return BASE;
    }

    private static char encodeDigit(int digit) {
        return (char) (digit + 22 + 75 * (digit < 26 ? 1 : 0));
    }

    private static int adaptBias(long delta, int points, boolean first) {
        long value = first ? delta / DAMP : delta >> 1;
        value += value / points;
        int power = 0;
        int threshold = (BASE - TMIN) * TMAX / 2;
        while (value > threshold) {
            value /= BASE - TMIN;
            power += BASE;
        }
        return power + (int) ((BASE - TMIN + 1L) * value / (value + SKEW));
    }

    private static long checkedAdd(long left, long right) {
        try {
            return checked(Math.addExact(left, right));
        } catch (ArithmeticException error) {
            return invalid();
        }
    }

    private static long checkedMultiply(long left, long right) {
        try {
            return checked(Math.multiplyExact(left, right));
        } catch (ArithmeticException error) {
            return invalid();
        }
    }

    private static long checked(long value) {
        if (value < 0 || value > MAXIMUM_SAFE_INTEGER) invalid();
        return value;
    }

    private static <T> T invalid() {
        throw new IllegalArgumentException("IDNA_INVALID");
    }

    private static void invalidUnicodeScalar() {
        throw new IllegalArgumentException("UNICODE_SCALAR_INVALID");
    }
}

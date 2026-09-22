package io.gala.schema.parity;

import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Deque;
import java.util.IdentityHashMap;
import java.util.List;
import java.util.Set;

/** Minimal RFC 8785 serializer used by the canonical-byte assertion keyword. */
final class CanonicalJson {
    private CanonicalJson() {}

    static long byteLength(JsonNode value) {
        return canonicalize(value).getBytes(StandardCharsets.UTF_8).length;
    }

    static String canonicalize(JsonNode value) {
        StringBuilder result = new StringBuilder();
        Set<JsonNode> ancestors = Collections.newSetFromMap(new IdentityHashMap<>());
        Deque<Task> tasks = new ArrayDeque<>();
        tasks.push(Task.value(value));
        while (!tasks.isEmpty()) {
            Task task = tasks.pop();
            if (task.kind() == TaskKind.TEXT) {
                result.append(task.text());
                continue;
            }
            JsonNode node = task.node();
            if (task.kind() == TaskKind.LEAVE) {
                ancestors.remove(node);
                continue;
            }
            if (node.isObject()) {
                if (!ancestors.add(node)) throw new IllegalArgumentException("JCS_CYCLIC_VALUE");
                List<String> names = new ArrayList<>();
                node.fieldNames().forEachRemaining(names::add);
                names.sort(Comparator.naturalOrder());
                result.append('{');
                tasks.push(Task.leave(node));
                tasks.push(Task.text("}"));
                for (int index = names.size() - 1; index >= 0; index--) {
                    String name = names.get(index);
                    tasks.push(Task.value(node.get(name)));
                    tasks.push(Task.text(":"));
                    tasks.push(Task.text(quote(name)));
                    if (index > 0) tasks.push(Task.text(","));
                }
            } else if (node.isArray()) {
                if (!ancestors.add(node)) throw new IllegalArgumentException("JCS_CYCLIC_VALUE");
                result.append('[');
                tasks.push(Task.leave(node));
                tasks.push(Task.text("]"));
                for (int index = node.size() - 1; index >= 0; index--) {
                    tasks.push(Task.value(node.get(index)));
                    if (index > 0) tasks.push(Task.text(","));
                }
            } else if (node.isTextual()) {
                result.append(quote(node.textValue()));
            } else if (node.isNumber()) {
                result.append(serializeNumber(node.doubleValue()));
            } else if (node.isBoolean()) {
                result.append(node.booleanValue() ? "true" : "false");
            } else if (node.isNull()) {
                result.append("null");
            } else {
                throw new IllegalArgumentException("Unsupported JSON value");
            }
        }
        return result.toString();
    }

    /** Serialize one IEEE-754 binary64 value using ECMAScript Number::toString rules. */
    private static String serializeNumber(double value) {
        if (!Double.isFinite(value)) throw new IllegalArgumentException("JCS_NON_FINITE_NUMBER");
        if (value == 0.0d) return "0";

        boolean negative = value < 0.0d;
        double magnitude = Math.abs(value);
        BigDecimal exact = new BigDecimal(magnitude);
        int exponent = exact.precision() - exact.scale() - 1;
        BigDecimal shortest = null;

        for (int precision = 1; precision <= 17 && shortest == null; precision++) {
            BigDecimal unit = BigDecimal.ONE.scaleByPowerOfTen(exponent - precision + 1);
            BigInteger floor = exact.divide(unit).setScale(0, RoundingMode.FLOOR).toBigIntegerExact();
            List<BigDecimal> candidates = List.of(
                    new BigDecimal(floor).multiply(unit).stripTrailingZeros(),
                    new BigDecimal(floor.add(BigInteger.ONE)).multiply(unit).stripTrailingZeros());
            for (BigDecimal candidate : candidates) {
                if (candidate.signum() == 0
                        || Double.doubleToRawLongBits(Double.parseDouble(candidate.toString()))
                                != Double.doubleToRawLongBits(magnitude)) {
                    continue;
                }
                if (shortest == null || preferred(candidate, shortest, exact)) shortest = candidate;
            }
        }
        if (shortest == null) throw new IllegalStateException("Cannot serialize finite binary64 value");
        return (negative ? "-" : "") + formatEcmascript(shortest);
    }

    private static boolean preferred(BigDecimal candidate, BigDecimal current, BigDecimal exact) {
        BigDecimal candidateDistance = candidate.subtract(exact).abs();
        BigDecimal currentDistance = current.subtract(exact).abs();
        int distance = candidateDistance.compareTo(currentDistance);
        if (distance != 0) return distance < 0;
        boolean candidateEven = !candidate.unscaledValue().abs().testBit(0);
        boolean currentEven = !current.unscaledValue().abs().testBit(0);
        if (candidateEven != currentEven) return candidateEven;
        return candidate.compareTo(current) < 0;
    }

    private static String formatEcmascript(BigDecimal value) {
        BigDecimal normalized = value.stripTrailingZeros();
        String digits = normalized.unscaledValue().abs().toString();
        int decimalPoint = digits.length() - normalized.scale();
        String result;
        if (digits.length() <= decimalPoint && decimalPoint <= 21) {
            result = digits + "0".repeat(decimalPoint - digits.length());
        } else if (decimalPoint > 0 && decimalPoint <= 21) {
            result = digits.substring(0, decimalPoint) + "." + digits.substring(decimalPoint);
        } else if (decimalPoint > -6 && decimalPoint <= 0) {
            result = "0." + "0".repeat(-decimalPoint) + digits;
        } else {
            int scientificExponent = decimalPoint - 1;
            result = digits.substring(0, 1)
                    + (digits.length() == 1 ? "" : "." + digits.substring(1))
                    + "e"
                    + (scientificExponent >= 0 ? "+" : "")
                    + scientificExponent;
        }
        return result;
    }

    private static String quote(String value) {
        StringBuilder result = new StringBuilder(value.length() + 2).append('"');
        for (int index = 0; index < value.length(); index++) {
            char current = value.charAt(index);
            if (Character.isHighSurrogate(current)) {
                if (index + 1 >= value.length() || !Character.isLowSurrogate(value.charAt(index + 1))) {
                    throw new IllegalArgumentException("UNICODE_SCALAR_INVALID");
                }
                result.append(current).append(value.charAt(++index));
            } else if (Character.isLowSurrogate(current)) {
                throw new IllegalArgumentException("UNICODE_SCALAR_INVALID");
            } else if (current == '"' || current == '\\') {
                result.append('\\').append(current);
            } else if (current == '\b') {
                result.append("\\b");
            } else if (current == '\t') {
                result.append("\\t");
            } else if (current == '\n') {
                result.append("\\n");
            } else if (current == '\f') {
                result.append("\\f");
            } else if (current == '\r') {
                result.append("\\r");
            } else if (current <= 0x1f) {
                result.append(String.format("\\u%04x", (int) current));
            } else {
                result.append(current);
            }
        }
        return result.append('"').toString();
    }

    private enum TaskKind {
        VALUE,
        TEXT,
        LEAVE
    }

    private record Task(TaskKind kind, JsonNode node, String text) {
        private static Task value(JsonNode node) {
            return new Task(TaskKind.VALUE, node, null);
        }

        private static Task text(String text) {
            return new Task(TaskKind.TEXT, null, text);
        }

        private static Task leave(JsonNode node) {
            return new Task(TaskKind.LEAVE, node, null);
        }
    }
}

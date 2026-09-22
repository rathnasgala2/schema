package io.gala.schema.parity;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.math.BigInteger;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/** Portable IP parsing and frozen DEC-097 global-address classification. */
final class GalaNetworkBoundary {
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final Pattern IPV4 = Pattern.compile("(?:0|[1-9][0-9]{0,2})(?:\\.(?:0|[1-9][0-9]{0,2})){3}");
    private static final BigInteger IPV4_MAXIMUM = new BigInteger("ffffffff", 16);
    private static final BigInteger IPV6_LIMIT = BigInteger.ONE.shiftLeft(128);
    private static final String IPV4_SOURCE =
            "sha256:e3e39e76d00b1677335db8e9a805c7b9480ea2f4dc9e33f0b93cd3a905128d73";
    private static final String IPV6_SOURCE =
            "sha256:775feea0621dec8735a44fbf30f762e721e8f0a1b3ab7eb341961a88cfce2139";
    private final List<NetworkRange> ranges;

    GalaNetworkBoundary(Path repositoryRoot) throws IOException {
        JsonNode table = MAPPER.readTree(Files.readString(
                repositoryRoot.resolve("src/internal/generated/network-boundary-v2.json")));
        JsonNode sources = table.get("sources");
        JsonNode rows = table.get("ranges");
        if (!"gala-network-boundary-v2".equals(table.path("profile").asText())
                || sources == null || !sources.isArray() || sources.size() != 2
                || !IPV4_SOURCE.equals(sources.get(0).asText())
                || !IPV6_SOURCE.equals(sources.get(1).asText())
                || rows == null || !rows.isArray()) {
            throw new IllegalStateException("NETWORK_BOUNDARY_DATA_INVALID");
        }
        List<NetworkRange> parsed = new ArrayList<>();
        for (JsonNode row : rows) parsed.add(parseRange(row));
        ranges = List.copyOf(parsed);
    }

    void requirePublicIpv4(String input) {
        if (!isGloballyReachable(4, parseCanonicalIpv4(input))) invalid();
    }

    void requirePublicIpv6(String input) {
        if (!isGloballyReachable(6, parseCanonicalOriginIpv6(input))) invalid();
    }

    void requireCanonicalIpv4(String input) {
        parseCanonicalIpv4(input);
    }

    void requireCanonicalIpv6(String input) {
        parseCanonicalOriginIpv6(input);
    }

    private boolean isGloballyReachable(int family, BigInteger address) {
        int width = family == 4 ? 32 : 128;
        for (NetworkRange deny : additionalDenies()) {
            if (deny.family() == family && contains(address, width, deny.network(), deny.prefix())) return false;
        }
        NetworkRange selected = null;
        for (NetworkRange range : ranges) {
            if (range.family() != family || !contains(address, width, range.network(), range.prefix())) continue;
            if (selected == null || range.prefix() > selected.prefix()) {
                selected = range;
            } else if (range.prefix() == selected.prefix()
                    && range.globallyReachable() != selected.globallyReachable()) {
                throw new IllegalStateException("NETWORK_BOUNDARY_DATA_INVALID");
            }
        }
        return selected == null || selected.globallyReachable();
    }

    private static NetworkRange parseRange(JsonNode row) {
        if (!row.isArray() || row.size() != 4 || !row.get(0).canConvertToInt()
                || !row.get(1).isTextual() || !row.get(2).canConvertToInt() || !row.get(3).isBoolean()) {
            throw new IllegalStateException("NETWORK_BOUNDARY_DATA_INVALID");
        }
        int family = row.get(0).asInt();
        int width = family == 4 ? 32 : family == 6 ? 128 : 0;
        int prefix = row.get(2).asInt();
        String hexadecimal = row.get(1).asText();
        if (width == 0 || prefix < 0 || prefix > width
                || hexadecimal.length() != width / 4 || !hexadecimal.matches("[0-9a-f]+")) {
            throw new IllegalStateException("NETWORK_BOUNDARY_DATA_INVALID");
        }
        BigInteger network = new BigInteger(hexadecimal, 16);
        if (!network.shiftRight(width - prefix).shiftLeft(width - prefix).equals(network)) {
            throw new IllegalStateException("NETWORK_BOUNDARY_DATA_INVALID");
        }
        return new NetworkRange(family, network, prefix, row.get(3).asBoolean());
    }

    private static BigInteger parseCanonicalIpv4(String input) {
        if (!IPV4.matcher(input).matches()) invalid();
        BigInteger result = BigInteger.ZERO;
        for (String part : input.split("\\.")) {
            int value = Integer.parseInt(part);
            if (value > 255) invalid();
            result = result.shiftLeft(8).or(BigInteger.valueOf(value));
        }
        return result;
    }

    private static BigInteger parseCanonicalOriginIpv6(String input) {
        BigInteger value = parseIpv6(input);
        if (!formatIpv6(value, true).equals(input)) invalid();
        return value;
    }

    private static BigInteger parseIpv6(String input) {
        if (input.isEmpty() || input.contains("%") || input.contains("[") || input.contains("]")) invalid();
        int doubleColon = input.indexOf("::");
        if (doubleColon != input.lastIndexOf("::")) invalid();
        List<Integer> words;
        if (doubleColon >= 0) {
            List<Integer> left = parseIpv6Side(input.substring(0, doubleColon));
            List<Integer> right = parseIpv6Side(input.substring(doubleColon + 2));
            int omitted = 8 - left.size() - right.size();
            if (omitted < 1) invalid();
            words = new ArrayList<>(left);
            for (int index = 0; index < omitted; index++) words.add(0);
            words.addAll(right);
        } else {
            words = parseIpv6Side(input);
        }
        if (words.size() != 8) invalid();
        BigInteger value = BigInteger.ZERO;
        for (int word : words) value = value.shiftLeft(16).or(BigInteger.valueOf(word));
        return value;
    }

    private static List<Integer> parseIpv6Side(String input) {
        if (input.isEmpty()) return List.of();
        String[] tokens = input.split(":", -1);
        List<Integer> words = new ArrayList<>();
        for (int index = 0; index < tokens.length; index++) {
            String token = tokens[index];
            if (token.isEmpty()) invalid();
            if (token.contains(".")) {
                if (index != tokens.length - 1) invalid();
                BigInteger ipv4 = parseCanonicalIpv4(token);
                words.add(ipv4.shiftRight(16).intValue());
                words.add(ipv4.and(BigInteger.valueOf(0xffff)).intValue());
            } else {
                if (!token.matches("[0-9A-Fa-f]{1,4}")) invalid();
                words.add(Integer.parseInt(token, 16));
            }
        }
        return words;
    }

    private static String formatIpv6(BigInteger value, boolean mixedMapped) {
        if (value.signum() < 0 || value.compareTo(IPV6_LIMIT) >= 0) invalid();
        int[] words = new int[8];
        for (int index = 0; index < words.length; index++) {
            words[index] = value.shiftRight((7 - index) * 16).and(BigInteger.valueOf(0xffff)).intValue();
        }
        if (mixedMapped && words[0] == 0 && words[1] == 0 && words[2] == 0
                && words[3] == 0 && words[4] == 0 && words[5] == 0xffff) {
            return "::ffff:" + formatIpv4(value.and(IPV4_MAXIMUM));
        }
        int bestStart = -1;
        int bestLength = 0;
        for (int index = 0; index < words.length;) {
            if (words[index] != 0) {
                index++;
                continue;
            }
            int end = index;
            while (end < words.length && words[end] == 0) end++;
            if (end - index > bestLength && end - index >= 2) {
                bestStart = index;
                bestLength = end - index;
            }
            index = end;
        }
        List<String> encoded = new ArrayList<>();
        for (int word : words) encoded.add(Integer.toHexString(word));
        if (bestStart < 0) return String.join(":", encoded);
        String left = String.join(":", encoded.subList(0, bestStart));
        String right = String.join(":", encoded.subList(bestStart + bestLength, encoded.size()));
        return left + "::" + right;
    }

    private static String formatIpv4(BigInteger value) {
        if (value.signum() < 0 || value.compareTo(IPV4_MAXIMUM) > 0) invalid();
        List<String> parts = new ArrayList<>();
        for (int shift : List.of(24, 16, 8, 0)) {
            parts.add(value.shiftRight(shift).and(BigInteger.valueOf(0xff)).toString());
        }
        return String.join(".", parts);
    }

    private static boolean contains(BigInteger address, int width, BigInteger network, int prefix) {
        int hostBits = width - prefix;
        return address.shiftRight(hostBits).shiftLeft(hostBits).equals(network);
    }

    private static List<NetworkRange> additionalDenies() {
        return List.of(
                new NetworkRange(4, new BigInteger("e0000000", 16), 4, false),
                new NetworkRange(6, BigInteger.ZERO, 96, false),
                new NetworkRange(6, new BigInteger("0064ff9b000000000000000000000000", 16), 96, false),
                new NetworkRange(6, new BigInteger("0064ff9b000100000000000000000000", 16), 48, false),
                new NetworkRange(6, new BigInteger("ff000000000000000000000000000000", 16), 8, false));
    }

    private static void invalid() {
        throw new IllegalArgumentException("IP_ADDRESS_INVALID");
    }

    private record NetworkRange(int family, BigInteger network, int prefix, boolean globallyReachable) {}
}

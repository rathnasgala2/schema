package io.gala.schema.parity;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/** RFC 5646 validity and DEC-099 canonicalization over the pinned IANA tables. */
final class GalaBcp47 {
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final Pattern LANGUAGE = Pattern.compile("[A-Za-z]{2,8}");
    private static final Pattern EXTLANG = Pattern.compile("[A-Za-z]{3}");
    private static final Pattern SCRIPT = Pattern.compile("[A-Za-z]{4}");
    private static final Pattern REGION = Pattern.compile("(?:[A-Za-z]{2}|[0-9]{3})");
    private static final Pattern VARIANT = Pattern.compile("(?:[A-Za-z0-9]{5,8}|[0-9][A-Za-z0-9]{3})");
    private static final Pattern SINGLETON = Pattern.compile("[A-Za-z0-9]");
    private static final Pattern EXTENSION = Pattern.compile("[A-Za-z0-9]{2,8}");
    private static final Pattern PRIVATE_USE = Pattern.compile("[A-Za-z0-9]{1,8}");
    private final Map<String, Map<String, JsonNode>> subtags = new HashMap<>();
    private final Map<String, List<SubtagRange>> ranges = new HashMap<>();
    private final Map<String, JsonNode> grandfathered = new HashMap<>();
    private final Map<String, JsonNode> redundant = new HashMap<>();
    private final Set<String> extensionSingletons = new HashSet<>();

    GalaBcp47(Path repositoryRoot) throws IOException {
        JsonNode table = MAPPER.readTree(Files.readString(
                repositoryRoot.resolve("src/internal/generated/iana-language.json")));
        for (JsonNode value : table.withArray("extensionSingletons")) {
            extensionSingletons.add(lower(value.asText()));
        }
        for (JsonNode record : table.withArray("records")) {
            String type = requiredText(record, "type");
            if (record.has("tag")) {
                Map<String, JsonNode> target = switch (type) {
                    case "grandfathered" -> grandfathered;
                    case "redundant" -> redundant;
                    default -> throw invalid();
                };
                if (target.put(lower(requiredText(record, "tag")), record) != null) throw invalid();
                continue;
            }
            String subtag = requiredText(record, "subtag");
            String key = lower(subtag);
            if (key.contains("..")) {
                String[] endpoints = key.split("\\.\\.", -1);
                if (endpoints.length != 2 || endpoints[0].length() != endpoints[1].length()) throw invalid();
                ranges.computeIfAbsent(type, ignored -> new ArrayList<>())
                        .add(new SubtagRange(endpoints[0], endpoints[1]));
            } else if (subtags.computeIfAbsent(type, ignored -> new HashMap<>()).put(key, record) != null) {
                throw invalid();
            }
        }
    }

    String canonicalize(String source) {
        if (source.isEmpty() || source.length() > 255 || !source.chars().allMatch(value -> value <= 0x7f)) {
            throw invalid();
        }
        String key = lower(source);
        JsonNode whole = grandfathered.get(key);
        if (whole != null) {
            return whole.has("preferredValue")
                    ? canonicalize(requiredText(whole, "preferredValue"))
                    : requiredText(whole, "tag");
        }
        whole = redundant.get(key);
        if (whole != null && whole.has("preferredValue")) {
            return canonicalize(requiredText(whole, "preferredValue"));
        }
        String[] sourceParts = source.split("-", -1);
        if (sourceParts.length > 0 && lower(sourceParts[0]).equals("x")) {
            if (sourceParts.length < 2) throw invalid();
            List<String> canonical = new ArrayList<>();
            canonical.add("x");
            for (int index = 1; index < sourceParts.length; index++) {
                if (!PRIVATE_USE.matcher(sourceParts[index]).matches()) throw invalid();
                canonical.add(lower(sourceParts[index]));
            }
            return String.join("-", canonical);
        }
        return canonicalize(parse(sourceParts));
    }

    boolean validateCanonical(String source) {
        if (!canonicalize(source).equals(source)) {
            throw new IllegalArgumentException("BCP47_NOT_CANONICAL");
        }
        return true;
    }

    private ParsedTag parse(String[] parts) {
        if (parts.length == 0 || !LANGUAGE.matcher(parts[0]).matches() || !registered("language", parts[0])) {
            throw invalid();
        }
        String language = parts[0];
        int index = 1;
        String extlang = null;
        if (language.length() <= 3 && index < parts.length && EXTLANG.matcher(parts[index]).matches()) {
            JsonNode record = exact("extlang", parts[index]);
            if (record == null || !prefixMatches(record, language)) throw invalid();
            extlang = parts[index++];
        }
        String script = null;
        if (index < parts.length && SCRIPT.matcher(parts[index]).matches()) {
            if (!registered("script", parts[index])) throw invalid();
            script = parts[index++];
        }
        String region = null;
        if (index < parts.length && REGION.matcher(parts[index]).matches()) {
            if (!registered("region", parts[index])) throw invalid();
            region = parts[index++];
        }
        List<String> variants = new ArrayList<>();
        Set<String> variantKeys = new HashSet<>();
        while (index < parts.length && VARIANT.matcher(parts[index]).matches()) {
            if (!registered("variant", parts[index]) || !variantKeys.add(lower(parts[index]))) throw invalid();
            variants.add(parts[index++]);
        }
        List<ExtensionSequence> extensions = new ArrayList<>();
        Set<String> singletonKeys = new HashSet<>();
        while (index < parts.length && SINGLETON.matcher(parts[index]).matches() && !lower(parts[index]).equals("x")) {
            String singleton = lower(parts[index++]);
            if (!extensionSingletons.contains(singleton) || !singletonKeys.add(singleton)) throw invalid();
            List<String> values = new ArrayList<>();
            while (index < parts.length && EXTENSION.matcher(parts[index]).matches()) values.add(parts[index++]);
            if (values.isEmpty()) throw invalid();
            extensions.add(new ExtensionSequence(singleton, List.copyOf(values)));
        }
        List<String> privateUse = new ArrayList<>();
        if (index < parts.length && lower(parts[index]).equals("x")) {
            index++;
            while (index < parts.length) {
                if (!PRIVATE_USE.matcher(parts[index]).matches()) throw invalid();
                privateUse.add(parts[index++]);
            }
            if (privateUse.isEmpty()) throw invalid();
        }
        if (index != parts.length) throw invalid();
        return new ParsedTag(language, extlang, script, region, List.copyOf(variants), List.copyOf(extensions), List.copyOf(privateUse));
    }

    private String canonicalize(ParsedTag parsed) {
        String language = preferred("language", parsed.language());
        String extlang = parsed.extlang();
        if (extlang != null) {
            JsonNode record = exact("extlang", extlang);
            if (record != null && record.has("preferredValue")) {
                language = requiredText(record, "preferredValue");
                extlang = null;
            }
        }
        List<String> result = new ArrayList<>();
        result.add(lower(language));
        if (extlang != null) result.add(lower(extlang));
        if (parsed.script() != null) {
            String value = lower(preferred("script", parsed.script()));
            result.add(value.substring(0, 1).toUpperCase(Locale.ROOT) + value.substring(1));
        }
        if (parsed.region() != null) {
            String value = preferred("region", parsed.region());
            result.add(value.matches("[0-9]{3}") ? value : value.toUpperCase(Locale.ROOT));
        }
        parsed.variants().forEach(value -> result.add(lower(preferred("variant", value))));
        parsed.extensions().stream()
                .sorted(Comparator.comparing(ExtensionSequence::singleton))
                .forEach(sequence -> {
                    result.add(lower(sequence.singleton()));
                    sequence.values().forEach(value -> result.add(lower(value)));
                });
        if (!parsed.privateUse().isEmpty()) {
            result.add("x");
            parsed.privateUse().forEach(value -> result.add(lower(value)));
        }
        return String.join("-", result);
    }

    private boolean registered(String type, String value) {
        String key = lower(value);
        if (subtags.getOrDefault(type, Map.of()).containsKey(key)) return true;
        return ranges.getOrDefault(type, List.of()).stream()
                .anyMatch(range -> key.length() == range.first().length()
                        && key.compareTo(range.first()) >= 0 && key.compareTo(range.last()) <= 0);
    }

    private JsonNode exact(String type, String value) {
        return subtags.getOrDefault(type, Map.of()).get(lower(value));
    }

    private String preferred(String type, String value) {
        JsonNode record = exact(type, value);
        return record != null && record.has("preferredValue") ? requiredText(record, "preferredValue") : value;
    }

    private static boolean prefixMatches(JsonNode record, String language) {
        for (JsonNode prefix : record.withArray("prefixes")) {
            if (lower(prefix.asText()).equals(lower(language))) return true;
        }
        return false;
    }

    private static String lower(String value) {
        return value.toLowerCase(Locale.ROOT);
    }

    private static String requiredText(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || !value.isTextual()) throw invalid();
        return value.asText();
    }

    private static IllegalArgumentException invalid() {
        return new IllegalArgumentException("BCP47_INVALID");
    }

    private record SubtagRange(String first, String last) {}

    private record ExtensionSequence(String singleton, List<String> values) {}

    private record ParsedTag(
            String language,
            String extlang,
            String script,
            String region,
            List<String> variants,
            List<ExtensionSequence> extensions,
            List<String> privateUse) {}
}

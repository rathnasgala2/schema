package io.gala.schema.parity;

import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.core.StreamReadConstraints;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.networknt.schema.Error;
import com.networknt.schema.Schema;
import com.networknt.schema.SchemaLocation;
import com.networknt.schema.SchemaRegistry;
import com.networknt.schema.SchemaRegistryConfig;
import com.networknt.schema.dialect.Dialect;
import com.networknt.schema.dialect.Draft202012;
import com.networknt.schema.regex.ECMAScriptRegularExpressionFactory;
import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Streaming Networknt half of the S0-T05 validator parity harness. */
public final class ParityMain {
    private static final ObjectMapper MAPPER = new ObjectMapper(JsonFactory.builder()
            .streamReadConstraints(StreamReadConstraints.builder().maxNestingDepth(131_072).build())
            .build());
    private static final Pattern YAML_KEY = Pattern.compile("^([A-Za-z0-9_-]+):");
    private static final Pattern ACTIVE_CONTENT = Pattern.compile(
            "<(?:script|svg)(?=$|[^A-Za-z0-9_])|(?:^|[^A-Za-z0-9_])on[a-z]+"
                    + "[\\u0009-\\u000d\\u0020\\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029"
                    + "\\u202f\\u205f\\u3000\\ufeff]*=|javascript:");
    private static final Pattern YAML_REFERENCE = Pattern.compile("\\*[A-Za-z0-9_-]+");
    private static final Pattern YAML_ALIAS = Pattern.compile("(?:^|[\\u0009\\u000a\\u000d\\u0020])[&*][A-Za-z0-9_-]+");
    private final SchemaRegistry registry;
    private final Map<String, String> ruleCodes;
    private final Map<String, String> keywordCodes;
    private final Set<String> cascadeKeywords;
    private final Map<String, String> validatorCodes;
    private final GalaUnicode unicode;
    private final GalaIdna idna;
    private final GalaNetworkBoundary networkBoundary;
    private final GalaBcp47 bcp47;
    private final GalaSpdx spdx;

    private ParityMain(Path repositoryRoot) throws IOException {
        unicode = new GalaUnicode(repositoryRoot);
        idna = new GalaIdna(unicode);
        networkBoundary = new GalaNetworkBoundary(repositoryRoot);
        bcp47 = new GalaBcp47(repositoryRoot);
        spdx = new GalaSpdx(repositoryRoot);
        Dialect.Builder dialect = Dialect.builder(Draft202012.getInstance())
                .format(GalaFormat.canonicalDateTime())
                .keyword(GalaKeyword.asciiByteLength())
                .keyword(GalaKeyword.utf8ByteLength())
                .keyword(GalaKeyword.graphemeLength(unicode))
                .keyword(GalaKeyword.maxCanonicalBytes())
                .keyword(GalaKeyword.maximum());
        for (GalaFormat format : GalaFormat.all(repositoryRoot, unicode, networkBoundary)) dialect.format(format);
        Map<String, String> schemas = loadSchemas(repositoryRoot);
        SchemaRegistryConfig config = SchemaRegistryConfig.builder()
                .formatAssertionsEnabled(true)
                .regularExpressionFactory(ECMAScriptRegularExpressionFactory.getInstance())
                .build();
        // The parity corpus drives ~19,000 requests, most pointing at a
        // distinct schemaId+fragment pointer (one nested location per
        // structural fixture). SchemaRegistry's default schemaCache is an
        // unbounded ConcurrentMap keyed by that exact SchemaLocation, so
        // across a run this size it retains one compiled Schema per
        // essentially-unique location and never evicts, growing heap
        // monotonically until the process OOMs on a memory-constrained
        // runner. Reuse across cases is negligible here, so disable the
        // cache: each check still compiles correctly, just without
        // unbounded retention.
        registry = SchemaRegistry.withDialect(dialect.build(), builder ->
                builder.schemas(schemas).schemaRegistryConfig(config).schemaCacheEnabled(false));
        DiagnosticMap diagnosticMap = loadDiagnosticMap(repositoryRoot);
        ruleCodes = diagnosticMap.ruleCodes();
        keywordCodes = diagnosticMap.keywordCodes();
        cascadeKeywords = diagnosticMap.cascadeKeywords();
        validatorCodes = diagnosticMap.validatorCodes();
    }

    public static void main(String[] arguments) throws IOException {
        if (arguments.length != 1) {
            throw new IllegalArgumentException("Expected repository root argument");
        }
        Path root = Path.of(arguments[0]).toAbsolutePath().normalize();
        if (Runtime.version().feature() != 21) {
            throw new IllegalStateException("Java 21 is required, found " + Runtime.version());
        }
        new ParityMain(root).run();
    }

    private void run() throws IOException {
        try (BufferedReader input = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8));
                BufferedWriter output = new BufferedWriter(new OutputStreamWriter(System.out, StandardCharsets.UTF_8))) {
            String line;
            while ((line = input.readLine()) != null) {
                if (line.isBlank()) continue;
                JsonNode request = MAPPER.readTree(line);
                ObjectNode result;
                try {
                    result = validate(request);
                } catch (RuntimeException error) {
                    result = MAPPER.createObjectNode();
                    result.put("caseId", request.path("caseId").asText());
                    result.put("harnessError", error.getClass().getSimpleName() + ": " + error.getMessage());
                }
                output.write(MAPPER.writeValueAsString(result));
                output.newLine();
                output.flush();
            }
        }
    }

    private ObjectNode validate(JsonNode request) {
        String kind = requiredText(request, "kind");
        if ("canonicalBytes".equals(kind)) return validateCanonicalBytes(request);
        if ("scalar".equals(kind)) return validateScalar(request);
        ValidationResult result = switch (kind) {
            case "structural" -> validateStructural(request);
            case "adversarial" -> validateAdversarial(request.get("fixture"));
            case "digest" -> validateDigest(request);
            default -> throw new IllegalArgumentException("Unknown parity case kind " + kind);
        };
        ObjectNode output = MAPPER.createObjectNode();
        output.put("caseId", requiredText(request, "caseId"));
        output.put("valid", result.valid());
        ArrayNode codes = output.putArray("codes");
        result.codes().forEach(codes::add);
        if ("structural".equals(kind)) {
            ArrayNode keywords = output.putArray("keywords");
            result.keywords().forEach(keywords::add);
        }
        return output;
    }

    private ObjectNode validateCanonicalBytes(JsonNode request) {
        try {
            JsonNode instance = MAPPER.readTree(requiredText(request, "rawJson"));
            String canonical = CanonicalJson.canonicalize(instance);
            boolean valid = canonical.getBytes(StandardCharsets.UTF_8).length <= request.path("maximum").asLong();
            ObjectNode output = MAPPER.createObjectNode();
            output.put("caseId", requiredText(request, "caseId"));
            output.put("valid", valid);
            ArrayNode codes = output.putArray("codes");
            if (!valid) codes.add("CANONICAL_BYTE_LENGTH_INVALID");
            output.put("canonical", canonical);
            return output;
        } catch (IllegalArgumentException error) {
            String code = error.getMessage();
            if (code == null || !code.matches("[A-Z][A-Z0-9_]+")) throw error;
            ObjectNode output = MAPPER.createObjectNode();
            output.put("caseId", requiredText(request, "caseId"));
            output.put("valid", false);
            output.putArray("codes").add(code);
            return output;
        } catch (IOException error) {
            throw new IllegalArgumentException("Invalid canonical-byte JSON", error);
        }
    }

    private ObjectNode validateScalar(JsonNode request) {
        String operation = requiredText(request, "operation");
        try {
            JsonNode result = switch (operation) {
                case "bcp47-canonicalize" -> MAPPER.getNodeFactory().textNode(
                        bcp47.canonicalize(requiredText(request, "value")));
                case "bcp47-validate" -> MAPPER.getNodeFactory().booleanNode(
                        bcp47.validateCanonical(requiredText(request, "value")));
                case "grapheme" -> graphemeResult(requiredText(request, "value"));
                case "grapheme-stress" -> {
                    int count = stressCount(request);
                    int codePoint = request.path("codePoint").asInt(-1);
                    if (!Character.isValidCodePoint(codePoint)) {
                        throw new IllegalArgumentException("SCALAR_STRESS_VECTOR_INVALID");
                    }
                    String value = new String(Character.toChars(codePoint)).repeat(count);
                    yield MAPPER.getNodeFactory().numberNode(unicode.graphemeLength(value));
                }
                case "joiners" -> {
                    unicode.checkJoiners(requiredText(request, "value"));
                    yield MAPPER.getNodeFactory().booleanNode(true);
                }
                case "nfc" -> MAPPER.getNodeFactory().textNode(unicode.normalizeNfc(requiredText(request, "value")));
                case "nfc-stress" -> {
                    int count = stressCount(request);
                    String normalized = unicode.normalizeNfc("x" + "\u0315\u0316".repeat(count));
                    String expected = "x" + "\u0316".repeat(count) + "\u0315".repeat(count);
                    yield MAPPER.getNodeFactory().booleanNode(normalized.equals(expected));
                }
                case "unicode-collision-key" -> MAPPER.getNodeFactory().textNode(
                        unicode.collisionKey(requiredText(request, "value")));
                case "idna-to-ascii" -> MAPPER.getNodeFactory().textNode(
                        idna.toAsciiDomain(requiredText(request, "value")));
                case "idna-validate" -> {
                    idna.validateCanonicalAsciiDomain(requiredText(request, "value"));
                    yield MAPPER.getNodeFactory().booleanNode(true);
                }
                case "idna-to-ascii-stress" -> {
                    int count = stressCount(request);
                    yield MAPPER.getNodeFactory().textNode(idna.toAsciiDomain("a".repeat(count)));
                }
                case "punycode-decode-stress" -> {
                    int count = stressCount(request);
                    yield MAPPER.getNodeFactory().numberNode(idna.decodePunycode("a-" + "a".repeat(count)).length());
                }
                case "punycode-encode-stress" -> {
                    int count = stressCount(request);
                    yield MAPPER.getNodeFactory().numberNode(idna.encodePunycode("é".repeat(count)).length());
                }
                case "canonical-route" -> MAPPER.getNodeFactory().booleanNode(
                        GalaFormat.validCanonicalRoute(requiredText(request, "value"), unicode));
                case "rfc3339" -> booleanOrThrow(
                        GalaPortableScalars.validRfc3339(requiredText(request, "value")), "RFC3339_INVALID");
                case "semver-range" -> {
                    GalaSemver.parseRange(requiredText(request, "value"));
                    yield MAPPER.getNodeFactory().booleanNode(true);
                }
                case "semver-satisfies" -> MAPPER.getNodeFactory().booleanNode(GalaSemver.satisfies(
                        requiredText(request, "candidate"), requiredText(request, "range")));
                case "spdx-canonicalize" -> MAPPER.getNodeFactory().textNode(
                        spdx.canonicalize(requiredText(request, "value")));
                case "spdx-validate" -> MAPPER.getNodeFactory().booleanNode(
                        spdx.validateCanonical(requiredText(request, "value")));
                case "glob-validate" -> {
                    GalaPortableScalars.parseRepositoryGlob(requiredText(request, "pattern"), unicode);
                    yield MAPPER.getNodeFactory().booleanNode(true);
                }
                case "glob-match" -> MAPPER.getNodeFactory().booleanNode(GalaPortableScalars.matchRepositoryGlob(
                        requiredText(request, "pattern"), requiredText(request, "candidate"), unicode));
                case "glob-select" -> stringArray(GalaPortableScalars.selectRepositoryPaths(
                        textValues(request.withArray("includes")),
                        textValues(request.withArray("excludes")),
                        textValues(request.withArray("candidates")),
                        unicode));
                case "timestamp-order" -> {
                    List<String> values = textValues(request.withArray("values"));
                    for (String value : values) {
                        booleanOrThrow(GalaPortableScalars.validRfc3339(value), "RFC3339_INVALID");
                    }
                    yield stringArray(values.stream().sorted().toList());
                }
                default -> throw new IllegalArgumentException("Unknown scalar operation " + operation);
            };
            return scalarOutput(request, true, List.of(), result);
        } catch (IllegalArgumentException error) {
            String code = error.getMessage();
            if (code == null || !code.matches("[A-Z][A-Z0-9_]+")) throw error;
            return scalarOutput(request, false, List.of(code), null);
        }
    }

    private ObjectNode graphemeResult(String value) {
        ObjectNode output = MAPPER.createObjectNode();
        ArrayNode boundaries = output.putArray("boundaries");
        unicode.graphemeBoundaries(value).forEach(boundaries::add);
        output.put("count", unicode.graphemeLength(value));
        return output;
    }

    private static int stressCount(JsonNode request) {
        int count = request.path("count").asInt(-1);
        if (count < 0 || count > 200_000) {
            throw new IllegalArgumentException("SCALAR_STRESS_VECTOR_INVALID");
        }
        return count;
    }

    private static JsonNode booleanOrThrow(boolean value, String code) {
        if (!value) throw new IllegalArgumentException(code);
        return MAPPER.getNodeFactory().booleanNode(true);
    }

    private static ObjectNode scalarOutput(JsonNode request, boolean valid, List<String> codes, JsonNode result) {
        ObjectNode output = MAPPER.createObjectNode();
        output.put("caseId", requiredText(request, "caseId"));
        output.put("valid", valid);
        ArrayNode codeArray = output.putArray("codes");
        codes.forEach(codeArray::add);
        if (result != null) output.set("output", result);
        return output;
    }

    private static ArrayNode stringArray(List<String> values) {
        ArrayNode output = MAPPER.createArrayNode();
        values.forEach(output::add);
        return output;
    }

    private static List<String> textValues(ArrayNode values) {
        List<String> result = new ArrayList<>();
        values.forEach(value -> result.add(value.asText()));
        return List.copyOf(result);
    }

    private ValidationResult validateStructural(JsonNode request) {
        Set<String> codes = new TreeSet<>();
        Set<String> keywords = new TreeSet<>();
        for (JsonNode check : request.withArray("checks")) {
            if (containsInvalidUnicodeScalar(check.get("instance"))) {
                String code = validatorCodes.get("unicode-scalar");
                if (code == null) throw new IllegalStateException("Unicode scalar diagnostic is unmapped");
                codes.add(code);
                keywords.add("i-json-scalar");
                continue;
            }
            Schema schema;
            if (check.has("inlineSchema")) {
                schema = registry.getSchema(check.get("inlineSchema"));
            } else {
                schema = registry.getSchema(SchemaLocation.of(
                        requiredText(check, "schemaId") + requiredText(check, "schemaPointer")));
            }
            List<Error> errors = schema.validate(check.get("instance"));
            if (errors.isEmpty()) continue;
            List<Error> canonical = canonicalErrors(errors);
            List<CollapsingFailure> inferred = inferredCollapsingFailures(check, canonical);
            for (CollapsingFailure failure : inferred) {
                keywords.add(failure.keyword());
                codes.add(failure.code());
            }
            for (Error error : canonical) {
                if (inferred.stream().anyMatch(failure ->
                        error.getEvaluationPath().toString().startsWith(failure.evaluationPath() + "/"))) {
                    continue;
                }
                String keyword = normalizeKeyword(error.getKeyword());
                keywords.add(keyword);
                codes.add(codeFor(error, check, keyword));
            }
        }
        return new ValidationResult(keywords.isEmpty(), List.copyOf(codes), List.copyOf(keywords));
    }

    private static boolean containsInvalidUnicodeScalar(JsonNode root) {
        Deque<JsonNode> stack = new ArrayDeque<>();
        stack.push(root);
        while (!stack.isEmpty()) {
            JsonNode node = stack.pop();
            if (node.isTextual() && !GalaUnicode.isScalarString(node.textValue())) return true;
            if (node.isObject()) {
                for (String field : iterable(node.fieldNames())) {
                    if (!GalaUnicode.isScalarString(field)) return true;
                    stack.push(node.get(field));
                }
            } else if (node.isArray()) {
                node.forEach(stack::push);
            }
        }
        return false;
    }

    private List<Error> canonicalErrors(List<Error> errors) {
        List<Error> withoutCascades = errors.stream()
                .filter(error -> !cascadeKeywords.contains(error.getKeyword()))
                .toList();
        List<Error> initial = withoutCascades.isEmpty() ? errors : withoutCascades;
        Set<String> wrongTypeInstances = new HashSet<>();
        initial.stream()
                .filter(error -> "type".equals(error.getKeyword()))
                .forEach(error -> wrongTypeInstances.add(error.getInstanceLocation().toString()));
        List<Error> actionable = initial.stream()
                .filter(error -> !"not".equals(error.getKeyword())
                        || (!error.getSchemaLocation().toString().contains("/then/not")
                                && !error.getSchemaLocation().toString().contains("/else/not"))
                        || !wrongTypeInstances.contains(error.getInstanceLocation().toString()))
                .toList();
        Set<String> collapsingLocations = new HashSet<>();
        for (Error error : actionable) {
            if (Set.of("anyOf", "contains", "oneOf").contains(normalizeKeyword(error.getKeyword()))) {
                collapsingLocations.add(error.getSchemaLocation().toString());
            }
        }
        return actionable.stream()
                .filter(error -> collapsingLocations.stream().noneMatch(parent ->
                        !error.getSchemaLocation().toString().equals(parent)
                                && error.getSchemaLocation().toString().startsWith(parent + "/")))
                .toList();
    }

    private List<CollapsingFailure> inferredCollapsingFailures(JsonNode check, List<Error> errors) {
        if (!check.has("schemaId")) return List.of();
        String schemaId = requiredText(check, "schemaId");
        String contract = contractFromSchemaId(schemaId);
        String base = requiredText(check, "schemaPointer");
        Map<String, String> candidates = new HashMap<>();
        for (Error error : errors) {
            String evaluationPath = error.getEvaluationPath().toString();
            String[] tokens = evaluationPath.split("/", -1);
            for (int index = 1; index < tokens.length - 1; index++) {
                String token = tokens[index];
                boolean indexedApplicator = ("anyOf".equals(token) || "oneOf".equals(token))
                        && tokens[index + 1].matches("[0-9]+");
                boolean containsApplicator = "contains".equals(token);
                if (!indexedApplicator && !containsApplicator) continue;
                String candidatePath = String.join("/", java.util.Arrays.copyOfRange(tokens, 0, index + 1));
                candidates.put(candidatePath, token);
            }
        }
        List<String> paths = candidates.keySet().stream().sorted((left, right) -> {
            int length = Integer.compare(left.length(), right.length());
            return length != 0 ? length : left.compareTo(right);
        }).toList();
        List<CollapsingFailure> result = new ArrayList<>();
        for (String candidatePath : paths) {
            if (result.stream().anyMatch(existing -> candidatePath.startsWith(existing.evaluationPath() + "/"))) {
                continue;
            }
            String keyword = candidates.get(candidatePath);
            String relativeParent = candidatePath.substring(0, candidatePath.length() - keyword.length() - 1)
                    .replace("/$ref", "");
            String schemaPointer = relativeParent.isEmpty() ? base : base + relativeParent;
            String ruleId = contract + ":" + schemaPointer + ":" + keyword;
            String code = ruleCodes.getOrDefault(ruleId, keywordCodes.get(keyword));
            if (code == null) throw new IllegalStateException("Unmapped inferred diagnostic rule " + ruleId);
            result.add(new CollapsingFailure(candidatePath, keyword, code));
        }
        return List.copyOf(result);
    }

    private String codeFor(Error error, JsonNode check, String keyword) {
        String fallback = keywordCodes.get(keyword);
        if (!check.has("schemaId")) {
            if (fallback == null) throw new IllegalStateException("Unmapped inline keyword " + keyword);
            return fallback;
        }
        String schemaId = requiredText(check, "schemaId");
        String location = error.getSchemaLocation().toString();
        int hash = location.indexOf('#');
        String fragment = hash >= 0 ? location.substring(hash) : location;
        if (location.startsWith("#")) {
            String base = requiredText(check, "schemaPointer");
            if (!"#".equals(base)) fragment = "#".equals(fragment) ? base : base + fragment.substring(1);
        }
        String suffix = "/" + error.getKeyword();
        String schemaPointer = fragment.endsWith(suffix)
                ? fragment.substring(0, fragment.length() - suffix.length())
                : fragment;
        String contract = contractFromSchemaId(schemaId);
        String property = "required".equals(keyword) && error.getProperty() != null
                ? ":" + error.getProperty()
                : "";
        String rawEvaluationPath = error.getEvaluationPath().toString();
        String evaluationPath = rawEvaluationPath.replace("/$ref", "");
        String base = requiredText(check, "schemaPointer");
        String evaluationPointer = evaluationPath.isEmpty() ? base : base + evaluationPath;
        String evaluationSuffix = "/" + error.getKeyword();
        if (evaluationPointer.endsWith(evaluationSuffix)) {
            evaluationPointer = evaluationPointer.substring(0, evaluationPointer.length() - evaluationSuffix.length());
        }
        String evaluationRuleId = contract + ":" + evaluationPointer + ":" + keyword + property;
        String exact = ruleCodes.get(evaluationRuleId);
        if (exact != null) return exact;
        // The general $ref short-circuit below (skip straight to the generic
        // keyword code whenever the evaluation path crosses a $ref) is
        // otherwise load-bearing: removing it broadly changes which of
        // several anyOf/oneOf branch codes wins for existing contracts
        // (public-runtime-origins observed) and is out of SCHEMA-2.10.0's
        // scope to retune. build-provenance is the one new exception,
        // scoped narrowly: as a document validated at its own top level
        // (rather than only ever reached through another root's nested
        // $defs fragment, the only context every pre-existing contract's
        // format/type fixtures exercise this path through), its
        // evaluation-path-based lookup misses for packageExact/
        // canonicalRoute, and the schema-location-based lookup right below
        // -- which resolves through the $ref to the defining $defs location
        // -- is strictly correct here with no other contract's behavior at
        // stake.
        if (rawEvaluationPath.contains("/$ref") && fallback != null
                && !"build-provenance".equals(contract)) {
            return fallback;
        }
        String locationRuleId = contract + ":" + schemaPointer + ":" + keyword + property;
        exact = ruleCodes.get(locationRuleId);
        if (exact != null) return exact;
        if (fallback == null) throw new IllegalStateException("Unmapped diagnostic rule " + evaluationRuleId);
        return fallback;
    }

    private static String normalizeKeyword(String keyword) {
        if ("false schema".equals(keyword)) return "false";
        if ("minContains".equals(keyword) || "maxContains".equals(keyword)) return "contains";
        return keyword;
    }

    private ValidationResult validateAdversarial(JsonNode fixture) {
        String category = requiredText(fixture, "category");
        JsonNode instance = fixture.get("instance");
        JsonNode recipe = fixture.get("recipe");
        boolean rejects = switch (category) {
            case "active-content" ->
                ACTIVE_CONTENT.matcher(asciiLowercase(instance.path("content").asText())).find();
            case "cyclic-references" -> hasReferenceCycle(instance.withArray("documents"));
            case "duplicate-keys" -> hasDuplicateYamlKey(instance.asText());
            case "oversized-fields" -> recipe.path("count").asLong() > 2_000_000L;
            case "oversized-files" -> recipe.path("count").asLong() > 10_485_760L;
            case "path-traversal" -> !GalaFormat.validRepositoryPath(instance.asText(), unicode);
            case "reserved-extension-keys" -> {
                boolean found = false;
                for (String key : iterable(instance.fieldNames())) found |= key.startsWith("gala.");
                yield found;
            }
            case "symlink-escape" -> {
                Path root = Path.of(requiredText(instance, "root")).normalize();
                Path realpath = Path.of(requiredText(instance, "realpath")).normalize();
                yield !realpath.equals(root) && !realpath.startsWith(root);
            }
            case "unicode-case-fold-collision" -> hasUnicodeCollision(instance);
            case "unknown-module" -> instance.has("module");
            case "unknown-schema-major" -> !"2.0.0".equals(instance.path("schemaVersion").asText())
                    || !instance.path("schemaId").asText().endsWith(":2.0.0");
            case "unsafe-urls" ->
                !GalaFormat.validVerificationUrl(instance.asText(), unicode, idna, networkBoundary);
            case "yaml-aliases" -> YAML_ALIAS.matcher(instance.asText()).find();
            case "yaml-exponential-expansion" -> YAML_REFERENCE.matcher(instance.asText()).results().count() > 16;
            default -> throw new IllegalArgumentException("Unknown adversarial category " + category);
        };
        String code = validatorCodes.get(category);
        if (code == null) throw new IllegalStateException("Unmapped adversarial validator " + category);
        return rejects
                ? new ValidationResult(false, List.of(code), List.of(category))
                : new ValidationResult(true, List.of(), List.of());
    }

    private ValidationResult validateDigest(JsonNode request) {
        String preimageHex = requiredText(request, "preimageHex");
        String presented = requiredText(request, "presentedDigest");
        String actual = "sha256:" + hex(sha256(hexBytes(preimageHex)));
        String code = validatorCodes.get("sha256-digest");
        if (code == null) throw new IllegalStateException("Digest diagnostic is unmapped");
        return actual.equals(presented)
                ? new ValidationResult(true, List.of(), List.of())
                : new ValidationResult(false, List.of(code), List.of("sha256"));
    }

    private static String contractFromSchemaId(String schemaId) {
        // SCHEMA-2.10.0: build-provenance uses the DEC-097 metadata namespace
        // (urn:gala:metadata:<contract>:2.0.0) rather than every other root's
        // urn:gala:schema:<contract>:2.0.0, because it is a metadata record
        // embedded in a build envelope, not an author-portable content
        // contract. Both namespaces resolve to the same bare contract name
        // used as the diagnostic-map rule-id prefix.
        String prefix = schemaId.startsWith("urn:gala:schema:") ? "urn:gala:schema:"
                : schemaId.startsWith("urn:gala:metadata:") ? "urn:gala:metadata:"
                : null;
        if (prefix == null) throw new IllegalStateException("Unrecognized schema identity namespace: " + schemaId);
        return schemaId.substring(prefix.length(), schemaId.length() - ":2.0.0".length());
    }

    private static Map<String, String> loadSchemas(Path repositoryRoot) throws IOException {
        Map<String, String> schemas = new HashMap<>();
        try (var files = Files.list(repositoryRoot.resolve("schemas"))) {
            for (Path file : files.filter(path -> path.getFileName().toString().endsWith(".schema.json")).toList()) {
                String source = Files.readString(file);
                String schemaId = requiredText(MAPPER.readTree(source), "$id");
                schemas.put(schemaId, source);
            }
        }
        if (schemas.size() != 20) throw new IllegalStateException("Expected 20 schemas, found " + schemas.size());
        return Map.copyOf(schemas);
    }

    private static DiagnosticMap loadDiagnosticMap(Path repositoryRoot) throws IOException {
        JsonNode diagnosticMap = MAPPER.readTree(Files.readString(
                repositoryRoot.resolve("diagnostics/diagnostic-map.json")));
        Map<String, String> rules = new HashMap<>();
        JsonNode ruleNodes = diagnosticMap.get("rules");
        for (String ruleId : iterable(ruleNodes.fieldNames())) {
            rules.put(ruleId, requiredText(ruleNodes.get(ruleId), "code"));
        }
        Map<String, String> keywords = new HashMap<>();
        JsonNode keywordNodes = diagnosticMap.get("keywords");
        for (String keyword : iterable(keywordNodes.fieldNames())) {
            keywords.put(keyword, keywordNodes.get(keyword).asText());
        }
        Set<String> cascades = new HashSet<>();
        diagnosticMap.withArray("cascadeKeywords").forEach(value -> cascades.add(value.asText()));
        Map<String, String> validators = new HashMap<>();
        JsonNode validatorNodes = diagnosticMap.get("validators");
        for (String validator : iterable(validatorNodes.fieldNames())) {
            validators.put(validator, requiredText(validatorNodes.get(validator), "code"));
        }
        return new DiagnosticMap(
                Map.copyOf(rules), Map.copyOf(keywords), Set.copyOf(cascades), Map.copyOf(validators));
    }

    private static boolean hasReferenceCycle(ArrayNode documents) {
        Map<String, List<String>> graph = new HashMap<>();
        for (JsonNode document : documents) {
            List<String> references = new ArrayList<>();
            document.withArray("references").forEach(value -> references.add(value.asText()));
            graph.put(requiredText(document, "path"), List.copyOf(references));
        }
        Set<String> visiting = new HashSet<>();
        Set<String> visited = new HashSet<>();
        for (String node : new TreeSet<>(graph.keySet())) {
            if (visit(node, graph, visiting, visited)) return true;
        }
        return false;
    }

    private static boolean visit(
            String node, Map<String, List<String>> graph, Set<String> visiting, Set<String> visited) {
        if (visiting.contains(node)) return true;
        if (visited.contains(node)) return false;
        visiting.add(node);
        for (String next : graph.getOrDefault(node, List.of())) {
            if (visit(next, graph, visiting, visited)) return true;
        }
        visiting.remove(node);
        visited.add(node);
        return false;
    }

    private static boolean hasDuplicateYamlKey(String source) {
        Set<String> keys = new HashSet<>();
        for (String line : source.split("\\r\\n|[\\n\\r\\u2028\\u2029]", -1)) {
            Matcher matcher = YAML_KEY.matcher(line);
            if (matcher.find() && !keys.add(matcher.group(1))) return true;
        }
        return false;
    }

    private static String asciiLowercase(String value) {
        StringBuilder result = new StringBuilder(value.length());
        for (int index = 0; index < value.length(); index++) {
            char character = value.charAt(index);
            result.append(character >= 'A' && character <= 'Z' ? (char) (character + 0x20) : character);
        }
        return result.toString();
    }

    private boolean hasUnicodeCollision(JsonNode values) {
        Set<String> keys = new HashSet<>();
        for (JsonNode value : values) {
            String key = unicode.collisionKey(value.asText());
            if (!keys.add(key)) return true;
        }
        return false;
    }

    private static byte[] hexBytes(String value) {
        if (!value.matches("(?:[0-9a-f]{2})*")) throw new IllegalArgumentException("Invalid lowercase hex");
        byte[] result = new byte[value.length() / 2];
        for (int index = 0; index < result.length; index++) {
            result[index] = (byte) Integer.parseInt(value.substring(index * 2, index * 2 + 2), 16);
        }
        return result;
    }

    private static byte[] sha256(byte[] value) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(value);
        } catch (NoSuchAlgorithmException error) {
            throw new IllegalStateException("SHA-256 is unavailable", error);
        }
    }

    private static String hex(byte[] value) {
        StringBuilder result = new StringBuilder(value.length * 2);
        for (byte item : value) result.append(String.format("%02x", Byte.toUnsignedInt(item)));
        return result.toString();
    }

    private static String requiredText(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || !value.isTextual()) throw new IllegalArgumentException("Missing text field " + field);
        return value.textValue();
    }

    private static <T> Iterable<T> iterable(java.util.Iterator<T> iterator) {
        return () -> iterator;
    }

    private record DiagnosticMap(
            Map<String, String> ruleCodes,
            Map<String, String> keywordCodes,
            Set<String> cascadeKeywords,
            Map<String, String> validatorCodes) {}

    private record CollapsingFailure(String evaluationPath, String keyword, String code) {}

    private record ValidationResult(boolean valid, List<String> codes, List<String> keywords) {}
}

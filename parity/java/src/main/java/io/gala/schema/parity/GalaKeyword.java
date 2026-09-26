package io.gala.schema.parity;

import com.fasterxml.jackson.databind.JsonNode;
import com.networknt.schema.ExecutionContext;
import com.networknt.schema.Schema;
import com.networknt.schema.SchemaContext;
import com.networknt.schema.SchemaLocation;
import com.networknt.schema.keyword.AbstractKeyword;
import com.networknt.schema.keyword.BaseKeywordValidator;
import com.networknt.schema.keyword.KeywordValidator;
import com.networknt.schema.path.NodePath;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.util.function.BiPredicate;

/** Gala-specific JSON Schema assertion keyword. */
final class GalaKeyword extends AbstractKeyword {
    private final BiPredicate<JsonNode, JsonNode> predicate;

    private GalaKeyword(String name, BiPredicate<JsonNode, JsonNode> predicate) {
        super(name);
        this.predicate = predicate;
    }

    static GalaKeyword asciiByteLength() {
        return new GalaKeyword("x-gala-asciiByteLength", (schema, value) ->
                !value.isTextual() || (value.textValue().chars().allMatch(codeUnit -> codeUnit <= 0x7f)
                        && withinBounds(value.textValue().length(), schema)));
    }

    static GalaKeyword utf8ByteLength() {
        return new GalaKeyword("x-gala-utf8ByteLength", (schema, value) ->
                !value.isTextual() || (GalaUnicode.isScalarString(value.textValue()) && withinBounds(
                        value.textValue().getBytes(StandardCharsets.UTF_8).length, schema)));
    }

    static GalaKeyword graphemeLength(GalaUnicode unicode) {
        return new GalaKeyword("x-gala-graphemeLength", (schema, value) -> {
            try {
                return !value.isTextual() || withinBounds(unicode.graphemeLength(value.textValue()), schema);
            } catch (IllegalArgumentException error) {
                if ("UNICODE_SCALAR_INVALID".equals(error.getMessage())) return false;
                throw error;
            }
        });
    }

    static GalaKeyword maxCanonicalBytes() {
        return new GalaKeyword("x-gala-maxCanonicalBytes", (schema, value) -> {
            try {
                return CanonicalJson.byteLength(value) <= schema.longValue();
            } catch (IllegalArgumentException error) {
                if ("UNICODE_SCALAR_INVALID".equals(error.getMessage())) return false;
                throw error;
            }
        });
    }

    static GalaKeyword maximum() {
        // A range assertion, not a shape assertion: it must fail closed on
        // anything it cannot evaluate as a decimal integer, matching the
        // Node reference implementation (src/internal/gala-keywords.js's
        // galaMaximum, SCH-H13) rather than deferring to a pattern/format
        // keyword that may not be present on every $def using this keyword.
        return new GalaKeyword("x-gala-maximum", (schema, value) -> {
            if (!value.isTextual() && !value.isIntegralNumber()) return false;
            try {
                return new BigInteger(value.asText()).compareTo(new BigInteger(schema.asText())) <= 0;
            } catch (NumberFormatException error) {
                return false;
            }
        });
    }

    private static boolean withinBounds(long length, JsonNode schema) {
        JsonNode minimum = schema.get("minimum");
        JsonNode maximum = schema.get("maximum");
        return (minimum == null || length >= minimum.longValue())
                && (maximum == null || length <= maximum.longValue());
    }

    @Override
    public KeywordValidator newValidator(
            SchemaLocation schemaLocation,
            JsonNode schemaNode,
            Schema parentSchema,
            SchemaContext schemaContext) {
        return new Validator(this, schemaNode, schemaLocation, parentSchema, schemaContext, predicate);
    }

    private static final class Validator extends BaseKeywordValidator {
        private final BiPredicate<JsonNode, JsonNode> predicate;

        private Validator(
                GalaKeyword keyword,
                JsonNode schemaNode,
                SchemaLocation schemaLocation,
                Schema parentSchema,
                SchemaContext schemaContext,
                BiPredicate<JsonNode, JsonNode> predicate) {
            super(keyword, schemaNode, schemaLocation, parentSchema, schemaContext);
            this.predicate = predicate;
        }

        @Override
        public void validate(
                ExecutionContext executionContext,
                JsonNode node,
                JsonNode rootNode,
                NodePath instanceLocation) {
            if (!predicate.test(schemaNode, node)) {
                executionContext.addError(error()
                        .instanceNode(node)
                        .instanceLocation(instanceLocation)
                        .evaluationPath(executionContext.getEvaluationPath())
                        .locale(executionContext.getExecutionConfig().getLocale())
                        .build());
            }
        }
    }
}

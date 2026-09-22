package io.gala.schema.parity;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashSet;
import java.util.Set;

/** Exact DEC-099 SPDX 3.28.0 expression parser and canonical serializer. */
final class GalaSpdx {
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private final Set<String> licenses;
    private final Set<String> exceptions;

    GalaSpdx(Path repositoryRoot) throws IOException {
        JsonNode table = MAPPER.readTree(Files.readString(
                repositoryRoot.resolve("src/internal/generated/spdx-3.28.0.json")));
        licenses = ids(table.get("licenses"));
        exceptions = ids(table.get("exceptions"));
    }

    String canonicalize(String source) {
        if (source.isEmpty() || source.length() > 128 || !source.chars().allMatch(value -> value <= 0x7f)) {
            throw invalid();
        }
        Parser parser = new Parser(source);
        Expression expression = parser.parseOr();
        if (parser.cursor != source.length()) throw invalid();
        return expression.serialize();
    }

    boolean validateCanonical(String source) {
        if (!canonicalize(source).equals(source)) {
            throw new IllegalArgumentException("SPDX_EXPRESSION_NOT_CANONICAL");
        }
        return true;
    }

    private static Set<String> ids(JsonNode rows) {
        Set<String> result = new HashSet<>();
        for (JsonNode row : rows) {
            if (!result.add(row.get(0).asText())) throw invalid();
        }
        return Set.copyOf(result);
    }

    private final class Parser {
        private final String source;
        private int cursor;

        private Parser(String source) {
            this.source = source;
        }

        private Expression parseOr() {
            Expression expression = parseAnd();
            while (take(" OR ")) expression = new Binary("OR", expression, parseAnd());
            return expression;
        }

        private Expression parseAnd() {
            Expression expression = parseAtom();
            while (take(" AND ")) expression = new Binary("AND", expression, parseAtom());
            return expression;
        }

        private Expression parseAtom() {
            if (take("(")) {
                Expression expression = parseOr();
                if (!take(")")) throw invalid();
                return expression;
            }
            String license = identifier();
            if (!licenses.contains(license)) throw invalid();
            if (!take(" WITH ")) return new License(license);
            String exception = identifier();
            if (!exceptions.contains(exception)) throw invalid();
            return new With(license, exception);
        }

        private String identifier() {
            int start = cursor;
            while (cursor < source.length()) {
                char value = source.charAt(cursor);
                if (value == ' ' || value == '(' || value == ')') break;
                cursor++;
            }
            if (cursor == start) throw invalid();
            return source.substring(start, cursor);
        }

        private boolean take(String token) {
            if (!source.startsWith(token, cursor)) return false;
            cursor += token.length();
            return true;
        }
    }

    private sealed interface Expression permits License, With, Binary {
        String serialize();
    }

    private record License(String id) implements Expression {
        @Override
        public String serialize() {
            return id;
        }
    }

    private record With(String id, String exception) implements Expression {
        @Override
        public String serialize() {
            return "(" + id + " WITH " + exception + ")";
        }
    }

    private record Binary(String operator, Expression left, Expression right) implements Expression {
        @Override
        public String serialize() {
            return "(" + left.serialize() + " " + operator + " " + right.serialize() + ")";
        }
    }

    private static IllegalArgumentException invalid() {
        return new IllegalArgumentException("SPDX_EXPRESSION_INVALID");
    }
}

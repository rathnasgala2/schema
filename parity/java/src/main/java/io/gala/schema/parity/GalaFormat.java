package io.gala.schema.parity;

import com.networknt.schema.ExecutionContext;
import com.networknt.schema.format.Format;
import com.networknt.schema.format.UriFormat;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigInteger;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.List;
import java.util.function.Predicate;
import java.util.regex.Pattern;

/** Predicate-backed implementation of every Gala-specific string format. */
final class GalaFormat implements Format {
    private static final BigInteger INT64_MAXIMUM = new BigInteger("9223372036854775807");
    private static final BigInteger INT64_MINIMUM = new BigInteger("-9223372036854775808");
    private static final BigInteger UINT64_MAXIMUM = new BigInteger("18446744073709551615");
    private static final Pattern REPOSITORY = Pattern.compile(
            "[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?/(?!\\.{1,2}$)[A-Za-z0-9._-]{1,100}");
    private static final Pattern PACKAGE = Pattern.compile(
            "(?:[a-z0-9][a-z0-9._-]*|@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*)");
    private static final Pattern EXTENSION = Pattern.compile(
            "(?!gala(?:\\.|$))[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+");
    private static final Pattern DISALLOWED_AUTHORITY = Pattern.compile("[/?#@%\\s]");
    private static final String URI_PERCENT = "%[0-9A-Fa-f]{2}";
    private static final String URI_PCHAR = "(?:[A-Za-z0-9._~!$&'()*+,;=:@-]|" + URI_PERCENT + ")";
    private static final String URI_USERINFO = "(?:[A-Za-z0-9._~!$&'()*+,;=:-]|" + URI_PERCENT + ")*";
    private static final Pattern IP_FUTURE_URI = Pattern.compile(
            "[A-Za-z][A-Za-z0-9+.-]*://(?:" + URI_USERINFO + "@)?"
                    + "\\[[Vv][0-9A-Fa-f]+\\.[A-Za-z0-9._~!$&'()*+,;=:-]+]"
                    + "(?::[0-9]*)?(?:/" + URI_PCHAR + "*)*"
                    + "(?:\\?(?:" + URI_PCHAR + "|[/?])*)?"
                    + "(?:#(?:" + URI_PCHAR + "|[/?])*)?");
    private static final UriFormat NETWORKNT_URI = new UriFormat();
    private final String name;
    private final Predicate<String> predicate;

    private GalaFormat(String name, Predicate<String> predicate) {
        this.name = name;
        this.predicate = predicate;
    }

    static List<GalaFormat> all(
            Path repositoryRoot, GalaUnicode unicode, GalaNetworkBoundary networkBoundary) throws IOException {
        GalaBcp47 bcp47 = new GalaBcp47(repositoryRoot);
        GalaIdna idna = new GalaIdna(unicode);
        GalaSpdx spdx = new GalaSpdx(repositoryRoot);
        return List.of(
                new GalaFormat("uri", GalaFormat::validUri),
                new GalaFormat("gala-base64url-32-byte", value -> value.matches("[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]")),
                new GalaFormat("gala-bcp47", value -> accepts(() -> bcp47.validateCanonical(value))),
                new GalaFormat("gala-canonical-route", value -> validCanonicalRoute(value, unicode)),
                new GalaFormat("gala-extension-key", value -> EXTENSION.matcher(value).matches()),
                new GalaFormat("gala-github-action-coordinate", GalaFormat::validGithubAction),
                new GalaFormat("gala-github-positive-uint64", value -> validUnsigned(value, true, UINT64_MAXIMUM)),
                new GalaFormat("gala-github-repository-coordinate", value -> ascii(value) && value.length() >= 3
                        && value.length() <= 140 && REPOSITORY.matcher(value).matches()),
                new GalaFormat("gala-int64", GalaFormat::validInt64),
                new GalaFormat("gala-iso-country", value -> value.matches("[A-Z]{2}")),
                new GalaFormat("gala-nonnegative-int64", value -> validUnsigned(value, false, INT64_MAXIMUM)),
                new GalaFormat(
                        "gala-observed-redirect-location",
                        value -> validObservedRedirect(value, unicode, idna, networkBoundary)),
                new GalaFormat("gala-package-exact", value -> validPackage(value, false)),
                new GalaFormat("gala-package-range", value -> validPackage(value, true)),
                new GalaFormat("gala-plain-label", value -> validPlainLabel(value, unicode)),
                new GalaFormat("gala-plain-text", value -> unicode.isNfc(value) && !hasForbiddenText(value, true)),
                new GalaFormat("gala-positive-int64", value -> validUnsigned(value, true, INT64_MAXIMUM)),
                new GalaFormat("gala-repository-glob", value -> validRepositoryGlob(value, unicode)),
                new GalaFormat("gala-repository-relative-path", value -> validRepositoryPath(value, unicode)),
                new GalaFormat("gala-semver-range", value -> accepts(() -> GalaSemver.parseRange(value))),
                new GalaFormat("gala-spdx-expression", value -> accepts(() -> spdx.validateCanonical(value))),
                new GalaFormat("gala-unsigned-64-bit-decimal", value -> validUnsigned(value, false, UINT64_MAXIMUM)),
                new GalaFormat(
                        "gala-verification-origin",
                        value -> validVerificationOrigin(value, idna, networkBoundary)),
                new GalaFormat(
                        "gala-verification-url",
                        value -> validVerificationUrl(value, unicode, idna, networkBoundary)));
    }

    static GalaFormat canonicalDateTime() {
        return new GalaFormat("date-time", GalaPortableScalars::validRfc3339);
    }

    private static boolean validUri(String value) {
        return NETWORKNT_URI.matches(null, value) || IP_FUTURE_URI.matcher(value).matches();
    }

    @Override
    public String getName() {
        return name;
    }

    @Override
    public boolean matches(ExecutionContext executionContext, String value) {
        try {
            return predicate.test(value);
        } catch (IllegalArgumentException error) {
            if ("UNICODE_SCALAR_INVALID".equals(error.getMessage())) return false;
            throw error;
        }
    }

    static boolean validCanonicalRoute(String value, GalaUnicode unicode) {
        if (!ascii(value) || !value.startsWith("/") || value.contains("//")
                || value.contains("?") || value.contains("#")) return false;
        String[] segments = value.split("/", -1);
        for (int index = 1; index < segments.length; index++) {
            String segment = segments[index];
            if (segment.isEmpty() && index == segments.length - 1) continue;
            if (segment.isEmpty() || segment.equals(".") || segment.equals("..")
                    || !canonicalRouteSegment(segment, unicode)) return false;
        }
        return true;
    }

    private static boolean canonicalRouteSegment(String source, GalaUnicode unicode) {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        for (int index = 0; index < source.length();) {
            char character = source.charAt(index);
            if (isUnreserved(character)) {
                bytes.write(character);
                index++;
            } else {
                if (character != '%' || index + 2 >= source.length()
                        || !source.substring(index + 1, index + 3).matches("[0-9A-F]{2}")) return false;
                bytes.write(Integer.parseInt(source.substring(index + 1, index + 3), 16));
                index += 3;
            }
        }
        try {
            String decoded = StandardCharsets.UTF_8.newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT)
                    .decode(ByteBuffer.wrap(bytes.toByteArray())).toString();
            if (!unicode.isNfc(decoded)) return false;
            return encodeRouteSegment(decoded).equals(source);
        } catch (CharacterCodingException error) {
            return false;
        }
    }

    private static String encodeRouteSegment(String decoded) {
        StringBuilder result = new StringBuilder();
        for (byte item : decoded.getBytes(StandardCharsets.UTF_8)) {
            int value = Byte.toUnsignedInt(item);
            if (value < 128 && isUnreserved((char) value)) result.append((char) value);
            else result.append('%').append(String.format("%02X", value));
        }
        return result.toString();
    }

    private static boolean isUnreserved(char value) {
        return Character.isLetterOrDigit(value) || value == '.' || value == '_' || value == '~' || value == '-';
    }

    private static boolean validGithubAction(String value) {
        int revisionOffset = value.lastIndexOf('@');
        if (revisionOffset <= 0 || !ascii(value) || value.length() < 44 || value.length() > 512) return false;
        String revision = value.substring(revisionOffset + 1);
        String[] segments = value.substring(0, revisionOffset).split("/", -1);
        if (!revision.matches("[0-9a-f]{40}") || segments.length < 2
                || !REPOSITORY.matcher(segments[0] + "/" + segments[1]).matches()) return false;
        if (segments.length == 2) return true;
        return validRepositoryPath(String.join("/", List.of(segments).subList(2, segments.length)), null);
    }

    private static boolean validUnsigned(String value, boolean positive, BigInteger maximum) {
        if (!value.matches(positive ? "[1-9][0-9]*" : "(?:0|[1-9][0-9]*)")) return false;
        return new BigInteger(value).compareTo(maximum) <= 0;
    }

    private static boolean validInt64(String value) {
        if (!value.matches("(?:0|-?[1-9][0-9]*)")) return false;
        BigInteger integer = new BigInteger(value);
        return integer.compareTo(INT64_MINIMUM) >= 0 && integer.compareTo(INT64_MAXIMUM) <= 0;
    }

    private static boolean validPackage(String value, boolean range) {
        int separator = value.lastIndexOf('@');
        if (separator <= 0) return false;
        String packageName = value.substring(0, separator);
        String version = value.substring(separator + 1);
        return packageName.getBytes(StandardCharsets.UTF_8).length <= 214
                && PACKAGE.matcher(packageName).matches()
                && accepts(() -> {
                    if (range) GalaSemver.parseRange(version);
                    else GalaSemver.parseVersion(version);
                });
    }

    private static boolean validPlainLabel(String value, GalaUnicode unicode) {
        return unicode.isNfc(value) && unicode.graphemeLength(value) >= 1 && unicode.graphemeLength(value) <= 80
                && !value.contains("<") && !value.contains(">") && !hasForbiddenText(value, false);
    }

    private static boolean hasForbiddenText(String value, boolean allowLineFeed) {
        return value.codePoints().anyMatch(codePoint ->
                (codePoint <= 0x1f && !(allowLineFeed && codePoint == 0x0a))
                        || (codePoint >= 0x7f && codePoint <= 0x9f)
                        || (codePoint >= 0x202a && codePoint <= 0x202e)
                        || (codePoint >= 0x2066 && codePoint <= 0x2069));
    }

    private static boolean validRepositoryGlob(String value, GalaUnicode unicode) {
        return accepts(() -> GalaPortableScalars.parseRepositoryGlob(value, unicode));
    }

    static boolean validRepositoryPath(String value, GalaUnicode unicode) {
        if (value.isEmpty() || value.getBytes(StandardCharsets.UTF_8).length > 512
                || (unicode != null && !unicode.isNfc(value)) || value.startsWith("/")
                || value.contains("\\") || value.indexOf('\0') >= 0) return false;
        String decoded = percentDecode(value);
        if (decoded == null || decoded.startsWith("/") || decoded.contains("\\") || decoded.indexOf('\0') >= 0) return false;
        for (String segment : decoded.split("/", -1)) {
            if (segment.equals(".") || segment.equals("..")) return false;
        }
        return true;
    }

    private static String percentDecode(String value) {
        StringBuilder result = new StringBuilder();
        for (int index = 0; index < value.length();) {
            if (value.charAt(index) == '%' && index + 2 < value.length()
                    && value.substring(index + 1, index + 3).matches("[0-9A-Fa-f]{2}")) {
                result.append((char) Integer.parseInt(value.substring(index + 1, index + 3), 16));
                index += 3;
            } else {
                result.append(value.charAt(index++));
            }
        }
        return result.toString();
    }

    private static boolean validObservedRedirect(
            String value, GalaUnicode unicode, GalaIdna idna, GalaNetworkBoundary networkBoundary) {
        if (!ascii(value) || value.length() > 2048) return false;
        String scheme = value.startsWith("https://") ? "https" : value.startsWith("http://") ? "http" : null;
        if (scheme == null) return false;
        int authorityStart = scheme.length() + 3;
        int routeOffset = value.indexOf('/', authorityStart);
        if (routeOffset < 0) return false;
        String authority = value.substring(authorityStart, routeOffset);
        return validAuthority(authority, scheme.equals("https") ? 443 : 80, false, idna, networkBoundary)
                && validCanonicalRoute(value.substring(routeOffset), unicode);
    }

    private static boolean validVerificationOrigin(
            String value, GalaIdna idna, GalaNetworkBoundary networkBoundary) {
        if (!ascii(value) || !value.startsWith("https://")) return false;
        return validAuthority(value.substring("https://".length()), 443, true, idna, networkBoundary);
    }

    static boolean validVerificationUrl(
            String value, GalaUnicode unicode, GalaIdna idna, GalaNetworkBoundary networkBoundary) {
        int routeOffset = value.indexOf('/', "https://".length());
        return routeOffset > 0 && value.length() <= 2048
                && validVerificationOrigin(value.substring(0, routeOffset), idna, networkBoundary)
                && validCanonicalRoute(value.substring(routeOffset), unicode);
    }

    private static boolean validAuthority(
            String authority,
            int defaultPort,
            boolean requirePublicAddress,
            GalaIdna idna,
            GalaNetworkBoundary networkBoundary) {
        if (authority.isEmpty() || DISALLOWED_AUTHORITY.matcher(authority).find() || authority.endsWith(":")) {
            return false;
        }
        try {
            if (authority.startsWith("[")) {
                int closing = authority.indexOf(']');
                if (closing <= 1 || authority.indexOf(']', closing + 1) >= 0) return false;
                String host = authority.substring(1, closing);
                validPort(authority.substring(closing + 1), defaultPort);
                if (requirePublicAddress) networkBoundary.requirePublicIpv6(host);
                else networkBoundary.requireCanonicalIpv6(host);
                return true;
            }
            int separator = authority.indexOf(':');
            if (separator != authority.lastIndexOf(':')) return false;
            String host = separator < 0 ? authority : authority.substring(0, separator);
            if (host.isEmpty()) return false;
            validPort(separator < 0 ? "" : authority.substring(separator), defaultPort);
            if (host.matches("[0-9.]+")) {
                if (requirePublicAddress) networkBoundary.requirePublicIpv4(host);
                else networkBoundary.requireCanonicalIpv4(host);
            } else {
                idna.validateCanonicalAsciiDomain(host);
            }
            return true;
        } catch (IllegalArgumentException error) {
            return false;
        }
    }

    private static void validPort(String source, int defaultPort) {
        if (source.isEmpty()) return;
        if (!source.matches(":[1-9][0-9]{0,4}")) throw new IllegalArgumentException("PORT_INVALID");
        int port = Integer.parseInt(source.substring(1));
        if (port > 65535 || port == defaultPort) throw new IllegalArgumentException("PORT_INVALID");
    }

    private static boolean ascii(String value) {
        return value.codePoints().allMatch(codePoint -> codePoint <= 0x7f);
    }

    private static boolean accepts(Runnable operation) {
        try {
            operation.run();
            return true;
        } catch (IllegalArgumentException error) {
            return false;
        }
    }
}

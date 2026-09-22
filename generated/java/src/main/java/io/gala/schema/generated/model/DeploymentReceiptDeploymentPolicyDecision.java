// Generated from urn:gala:schema:deployment-receipt:2.0.0#/$defs/deploymentPolicyDecision; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:deployment-receipt:2.0.0#/$defs/deploymentPolicyDecision. */
public record DeploymentReceiptDeploymentPolicyDecision(
        @JsonProperty("activationDetectionIntervalSeconds") Long activationDetectionIntervalSeconds,
        @JsonProperty("activationDetectionProfile") String activationDetectionProfile,
        @JsonProperty("approvedOverrides") JsonNode approvedOverrides,
        @JsonProperty("artifactDigest") String artifactDigest,
        @JsonProperty("artifactId") String artifactId,
        @JsonProperty("buildPolicyDecisionDigest") String buildPolicyDecisionDigest,
        @JsonProperty("capabilityDecisionDigest") String capabilityDecisionDigest,
        @JsonProperty("decisionDigest") String decisionDigest,
        @JsonProperty("destination") DeploymentReceiptDestinationIdentity destination,
        @JsonProperty("manifestDigest") String manifestDigest,
        @JsonProperty("maximumActivationDetectionAttempts") Long maximumActivationDetectionAttempts,
        @JsonProperty("maximumAttemptsPerTarget") Long maximumAttemptsPerTarget,
        @JsonProperty("maximumConcurrentStreams") Long maximumConcurrentStreams,
        @JsonProperty("maximumFinalizationDelaySeconds") Long maximumFinalizationDelaySeconds,
        @JsonProperty("maximumPublicResponseBytes") String maximumPublicResponseBytes,
        @JsonProperty("maximumPublicVerificationSeconds") Long maximumPublicVerificationSeconds,
        @JsonProperty("maximumRedirectHops") Long maximumRedirectHops,
        @JsonProperty("networkBoundaryProfileDigest") String networkBoundaryProfileDigest,
        @JsonProperty("policyProfile") String policyProfile,
        @JsonProperty("policyReleaseId") String policyReleaseId,
        @JsonProperty("policyVersion") String policyVersion,
        @JsonProperty("profile") String profile,
        @JsonProperty("publicTlsProfileDigest") String publicTlsProfileDigest,
        @JsonProperty("publicTlsRevocationSetDigest") String publicTlsRevocationSetDigest,
        @JsonProperty("publicTlsTrustStoreDigest") String publicTlsTrustStoreDigest,
        @JsonProperty("requestTimeoutSeconds") Long requestTimeoutSeconds,
        @JsonProperty("retryProfile") String retryProfile,
        @JsonProperty("verificationOrigins") List<String> verificationOrigins,
        @JsonProperty("verificationPlanDigest") String verificationPlanDigest,
        @JsonProperty("verificationTier") String verificationTier
) {
    /** Reject a missing required root member before domain use. */
    public DeploymentReceiptDeploymentPolicyDecision {
        Objects.requireNonNull(activationDetectionIntervalSeconds, "activationDetectionIntervalSeconds");
        Objects.requireNonNull(activationDetectionProfile, "activationDetectionProfile");
        Objects.requireNonNull(approvedOverrides, "approvedOverrides");
        Objects.requireNonNull(artifactDigest, "artifactDigest");
        Objects.requireNonNull(artifactId, "artifactId");
        Objects.requireNonNull(buildPolicyDecisionDigest, "buildPolicyDecisionDigest");
        Objects.requireNonNull(capabilityDecisionDigest, "capabilityDecisionDigest");
        Objects.requireNonNull(decisionDigest, "decisionDigest");
        Objects.requireNonNull(destination, "destination");
        Objects.requireNonNull(manifestDigest, "manifestDigest");
        Objects.requireNonNull(maximumActivationDetectionAttempts, "maximumActivationDetectionAttempts");
        Objects.requireNonNull(maximumAttemptsPerTarget, "maximumAttemptsPerTarget");
        Objects.requireNonNull(maximumConcurrentStreams, "maximumConcurrentStreams");
        Objects.requireNonNull(maximumFinalizationDelaySeconds, "maximumFinalizationDelaySeconds");
        Objects.requireNonNull(maximumPublicResponseBytes, "maximumPublicResponseBytes");
        Objects.requireNonNull(maximumPublicVerificationSeconds, "maximumPublicVerificationSeconds");
        Objects.requireNonNull(maximumRedirectHops, "maximumRedirectHops");
        Objects.requireNonNull(networkBoundaryProfileDigest, "networkBoundaryProfileDigest");
        Objects.requireNonNull(policyProfile, "policyProfile");
        Objects.requireNonNull(policyReleaseId, "policyReleaseId");
        Objects.requireNonNull(policyVersion, "policyVersion");
        Objects.requireNonNull(profile, "profile");
        Objects.requireNonNull(publicTlsProfileDigest, "publicTlsProfileDigest");
        Objects.requireNonNull(publicTlsRevocationSetDigest, "publicTlsRevocationSetDigest");
        Objects.requireNonNull(publicTlsTrustStoreDigest, "publicTlsTrustStoreDigest");
        Objects.requireNonNull(requestTimeoutSeconds, "requestTimeoutSeconds");
        Objects.requireNonNull(retryProfile, "retryProfile");
        Objects.requireNonNull(verificationOrigins, "verificationOrigins");
        Objects.requireNonNull(verificationPlanDigest, "verificationPlanDigest");
        Objects.requireNonNull(verificationTier, "verificationTier");
    }
}

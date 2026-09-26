// Generated from urn:gala:schema:deployment-intent:2.0.0; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:deployment-intent:2.0.0. */
public record DeploymentIntentDocument(
        @JsonProperty("activationDetectionIntervalSeconds") Long activationDetectionIntervalSeconds,
        @JsonProperty("activationDetectionPlanDigest") String activationDetectionPlanDigest,
        @JsonProperty("activationDetectionProfile") String activationDetectionProfile,
        @JsonProperty("adapter") DeploymentIntentAdapterIdentity adapter,
        @JsonProperty("approvedOverrides") JsonNode approvedOverrides,
        @JsonProperty("artifactByteCount") String artifactByteCount,
        @JsonProperty("artifactDigest") String artifactDigest,
        @JsonProperty("artifactFileCount") String artifactFileCount,
        @JsonProperty("artifactId") String artifactId,
        @JsonProperty("attemptId") String attemptId,
        @JsonProperty("audience") String audience,
        @JsonProperty("authorizedAt") String authorizedAt,
        @JsonProperty("capability") String capability,
        @JsonProperty("capabilityDecisionDigest") String capabilityDecisionDigest,
        @JsonProperty("destination") DeploymentIntentDestinationIdentity destination,
        @JsonProperty("destinationMutationAuthority") DeploymentIntentDestinationMutationAuthority destinationMutationAuthority,
        @JsonProperty("effectiveArtifactExpiresAt") String effectiveArtifactExpiresAt,
        @JsonProperty("expectedGenerationId") String expectedGenerationId,
        @JsonProperty("expiresAt") String expiresAt,
        @JsonProperty("finalizationDeadlineLimit") String finalizationDeadlineLimit,
        @JsonProperty("frozenEnvelopeByteCount") String frozenEnvelopeByteCount,
        @JsonProperty("frozenEnvelopeDigest") String frozenEnvelopeDigest,
        @JsonProperty("frozenHandoffArtifactId") String frozenHandoffArtifactId,
        @JsonProperty("frozenHandoffName") String frozenHandoffName,
        @JsonProperty("idempotencyKey") String idempotencyKey,
        @JsonProperty("intentDigest") String intentDigest,
        @JsonProperty("issuer") String issuer,
        @JsonProperty("lockDigest") String lockDigest,
        @JsonProperty("manifestDigest") String manifestDigest,
        @JsonProperty("marker") DeploymentIntentPublicGenerationMarkerPayload marker,
        @JsonProperty("maximumActivationDetectionAttempts") Long maximumActivationDetectionAttempts,
        @JsonProperty("maximumFinalizationDelaySeconds") Long maximumFinalizationDelaySeconds,
        @JsonProperty("maximumPublicVerificationSeconds") Long maximumPublicVerificationSeconds,
        @JsonProperty("maximumReportRequestByteCount") String maximumReportRequestByteCount,
        @JsonProperty("networkBoundaryProfileDigest") String networkBoundaryProfileDigest,
        @JsonProperty("operationDeadline") String operationDeadline,
        @JsonProperty("operationId") String operationId,
        @JsonProperty("pagesBuildVersion") String pagesBuildVersion,
        @JsonProperty("policyDecisionDigest") String policyDecisionDigest,
        @JsonProperty("policyProfile") String policyProfile,
        @JsonProperty("policyReleaseId") String policyReleaseId,
        @JsonProperty("policyVersion") String policyVersion,
        @JsonProperty("proposedGenerationId") String proposedGenerationId,
        @JsonProperty("provenanceDigest") String provenanceDigest,
        @JsonProperty("publicTlsProfileDigest") String publicTlsProfileDigest,
        @JsonProperty("publicTlsRevocationSetDigest") String publicTlsRevocationSetDigest,
        @JsonProperty("publicTlsTrustStoreDigest") String publicTlsTrustStoreDigest,
        @JsonProperty("publisher") DeploymentIntentPackageIdentity publisher,
        @JsonProperty("rebuildRecord") DeploymentIntentRecordReproducibleBuildRecord rebuildRecord,
        @JsonProperty("requestedArtifactRetentionDays") Long requestedArtifactRetentionDays,
        @JsonProperty("sbomDigest") String sbomDigest,
        @JsonProperty("schemaId") String schemaId,
        @JsonProperty("schemaVersion") String schemaVersion,
        @JsonProperty("sourceCommit") String sourceCommit,
        @JsonProperty("spacesStagePrefix") String spacesStagePrefix,
        @JsonProperty("subject") String subject,
        @JsonProperty("verificationDeadlineLimit") String verificationDeadlineLimit,
        @JsonProperty("verificationOrigins") List<String> verificationOrigins,
        @JsonProperty("verificationPlanDigest") String verificationPlanDigest,
        @JsonProperty("verificationTier") String verificationTier,
        @JsonProperty("workflowTriggerCommit") String workflowTriggerCommit,
        @JsonProperty("workloadBindingDigest") String workloadBindingDigest
) {
    /** Reject a missing required root member before domain use. */
    public DeploymentIntentDocument {
        Objects.requireNonNull(activationDetectionIntervalSeconds, "activationDetectionIntervalSeconds");
        Objects.requireNonNull(activationDetectionPlanDigest, "activationDetectionPlanDigest");
        Objects.requireNonNull(activationDetectionProfile, "activationDetectionProfile");
        Objects.requireNonNull(adapter, "adapter");
        Objects.requireNonNull(approvedOverrides, "approvedOverrides");
        Objects.requireNonNull(artifactByteCount, "artifactByteCount");
        Objects.requireNonNull(artifactDigest, "artifactDigest");
        Objects.requireNonNull(artifactFileCount, "artifactFileCount");
        Objects.requireNonNull(artifactId, "artifactId");
        Objects.requireNonNull(attemptId, "attemptId");
        Objects.requireNonNull(audience, "audience");
        Objects.requireNonNull(authorizedAt, "authorizedAt");
        Objects.requireNonNull(capability, "capability");
        Objects.requireNonNull(capabilityDecisionDigest, "capabilityDecisionDigest");
        Objects.requireNonNull(destination, "destination");
        Objects.requireNonNull(destinationMutationAuthority, "destinationMutationAuthority");
        Objects.requireNonNull(effectiveArtifactExpiresAt, "effectiveArtifactExpiresAt");
        Objects.requireNonNull(expiresAt, "expiresAt");
        Objects.requireNonNull(finalizationDeadlineLimit, "finalizationDeadlineLimit");
        Objects.requireNonNull(frozenEnvelopeByteCount, "frozenEnvelopeByteCount");
        Objects.requireNonNull(frozenEnvelopeDigest, "frozenEnvelopeDigest");
        Objects.requireNonNull(frozenHandoffArtifactId, "frozenHandoffArtifactId");
        Objects.requireNonNull(frozenHandoffName, "frozenHandoffName");
        Objects.requireNonNull(idempotencyKey, "idempotencyKey");
        Objects.requireNonNull(intentDigest, "intentDigest");
        Objects.requireNonNull(issuer, "issuer");
        Objects.requireNonNull(lockDigest, "lockDigest");
        Objects.requireNonNull(manifestDigest, "manifestDigest");
        Objects.requireNonNull(marker, "marker");
        Objects.requireNonNull(maximumActivationDetectionAttempts, "maximumActivationDetectionAttempts");
        Objects.requireNonNull(maximumFinalizationDelaySeconds, "maximumFinalizationDelaySeconds");
        Objects.requireNonNull(maximumPublicVerificationSeconds, "maximumPublicVerificationSeconds");
        Objects.requireNonNull(maximumReportRequestByteCount, "maximumReportRequestByteCount");
        Objects.requireNonNull(networkBoundaryProfileDigest, "networkBoundaryProfileDigest");
        Objects.requireNonNull(operationDeadline, "operationDeadline");
        Objects.requireNonNull(operationId, "operationId");
        Objects.requireNonNull(policyDecisionDigest, "policyDecisionDigest");
        Objects.requireNonNull(policyProfile, "policyProfile");
        Objects.requireNonNull(policyReleaseId, "policyReleaseId");
        Objects.requireNonNull(policyVersion, "policyVersion");
        Objects.requireNonNull(proposedGenerationId, "proposedGenerationId");
        Objects.requireNonNull(provenanceDigest, "provenanceDigest");
        Objects.requireNonNull(publicTlsProfileDigest, "publicTlsProfileDigest");
        Objects.requireNonNull(publicTlsRevocationSetDigest, "publicTlsRevocationSetDigest");
        Objects.requireNonNull(publicTlsTrustStoreDigest, "publicTlsTrustStoreDigest");
        Objects.requireNonNull(publisher, "publisher");
        Objects.requireNonNull(rebuildRecord, "rebuildRecord");
        Objects.requireNonNull(requestedArtifactRetentionDays, "requestedArtifactRetentionDays");
        Objects.requireNonNull(sbomDigest, "sbomDigest");
        Objects.requireNonNull(schemaId, "schemaId");
        Objects.requireNonNull(schemaVersion, "schemaVersion");
        Objects.requireNonNull(sourceCommit, "sourceCommit");
        Objects.requireNonNull(subject, "subject");
        Objects.requireNonNull(verificationDeadlineLimit, "verificationDeadlineLimit");
        Objects.requireNonNull(verificationOrigins, "verificationOrigins");
        Objects.requireNonNull(verificationPlanDigest, "verificationPlanDigest");
        Objects.requireNonNull(verificationTier, "verificationTier");
        Objects.requireNonNull(workflowTriggerCommit, "workflowTriggerCommit");
        Objects.requireNonNull(workloadBindingDigest, "workloadBindingDigest");
    }
}

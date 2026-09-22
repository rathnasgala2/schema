import assert from 'node:assert/strict';
import test from 'node:test';

import { hexFromBytes } from '../src/internal/bytes.js';
import {
  ACTIVE_DIGEST_DOMAIN_COUNT,
  ACTIVE_DIGEST_DOMAINS,
  ACTIVE_DIGEST_PROFILES,
  appendManagedEvidenceHead,
  deriveLocalStageToken,
  derivePagesBuildVersion,
  derivePublicProbeRetryDelay,
  digestActionDefinitionBlob,
  digestDomainSeparatedJcs,
  digestLocalRootPath,
  digestManagedEvidenceEntry,
  digestManagedEvidenceGenesis,
  digestRenderPolicyBytes,
  domainSeparatedJcsPreimage,
} from '../src/internal/digest-profiles.js';

const DIGEST_ONE = `sha256:${'11'.repeat(32)}`;
const DIGEST_TWO = `sha256:${'22'.repeat(32)}`;
const COMMON = Object.freeze({ z: 1, a: 'é' });

const SELF_FIELDS = Object.freeze({
  adapterCapability: 'capabilityDigest',
  appearanceDefault: 'source',
  artifactManifest: 'manifestDigest',
  buildInput: 'inputDigest',
  buildPolicyDecision: 'decisionDigest',
  capabilityDecision: 'decisionDigest',
  deploymentIntent: 'intentDigest',
  deploymentPolicyDecision: 'decisionDigest',
  deploymentReceipt: 'receiptDigest',
  deploymentStageEvidence: 'evidenceDigest',
  spacesControlPlaneBinding: 'bindingDigest',
  spacesControlPlaneEvidence: 'evidenceDigest',
  spacesControlPlaneRequestCatalog: 'catalogDigest',
  spacesControlPlaneResponseCatalog: 'catalogDigest',
  spacesCredentialProfile: 'profileDigest',
  spacesRegionCatalog: 'digest',
  spacesWebsiteConfiguration: 'configurationDigest',
  githubActionsOidcOriginCatalog: 'catalogDigest',
  githubHostedRunnerCompatibility: 'rowDigest',
  githubWorkloadOidcVerificationProfile: 'profileDigest',
  localFilesystemAllowlist: 'catalogDigest',
  localFilesystemCapabilityEvidence: 'evidenceDigest',
  localFilesystemControlRow: 'rowDigest',
  localFilesystemFailureEvidence: 'evidenceDigest',
  localFilesystemObservationEvidence: 'evidenceDigest',
  localSurfaceIdentity: 'recordDigest',
  lock: 'lockDigest',
  navigationDefault: 'source',
  npmRegistryFetchProfile: 'profileDigest',
  packageReleaseCatalog: 'catalogDigest',
  pagesReconciliationCommand: 'commandDigest',
  pagesReconciliationRecovery: 'recoveryDigest',
  pagesRunAttemptGapProof: 'proofDigest',
  providerCredentialEgress: 'profileDigest',
  providerResponseCatalog: 'catalogDigest',
  publicActivationDetectionObservation: 'evidenceDigest',
  publicActivationDetectionPlan: 'planDigest',
  publicActivationDetectionProbe: 'evidenceDigest',
  publicProbeObservation: 'evidenceDigest',
  templateStylingContract: 'catalogDigest',
  themeConformanceEvidence: 'evidenceDigest',
  themeFixtureRelease: 'fixtureDigest',
  verifiedWorkloadBinding: 'workloadBindingDigest',
});

const ARRAY_PROFILES = new Set([
  'artifact',
  'providerCallClassBinding',
  'providerRequestTemplates',
  'repositoryRoot',
  'themeConformanceInput',
  'themePackageIntegrity',
  'verificationPlan',
]);

const PAGE_DEPLOYMENT = Object.freeze({
  pagesActionsArtifactId: '17',
  pagesActionsArtifactName: 'gala-pages-17',
  pagesActionsArtifactDigest: DIGEST_ONE,
  pagesActionsArtifactByteCount: '23',
  pagesBuildVersion: 'a'.repeat(40),
  pagesDeploymentId: 'a'.repeat(40),
  pollingStatusUrl: 'https://api.github.com/repos/o/r/pages/deployments/a',
  pageUrl: 'https://o.github.io/r/',
  createResponseObserved: false,
  status: 'succeed',
  pagesOidcOrigin: 'https://api.github.com',
  ignored: true,
});

const SPECIAL_INPUTS = Object.freeze({
  artifactManifest: {
    ...COMMON,
    artifactId: 'ignored-artifact',
    manifestDigest: DIGEST_ONE,
  },
  artifactValidationEvidence: {
    ...COMMON,
    artifactId: 'ignored-artifact',
    manifestDigest: DIGEST_ONE,
    validation: { state: 'ok', evidenceDigest: DIGEST_TWO },
  },
  buildWorkflowIdentity: {
    ignored: true,
    workflowFiles: [
      { path: '.github/workflows/publish.yml', digest: DIGEST_ONE },
    ],
  },
  githubWorkloadOidcKeySet: [
    {
      kty: 'RSA',
      alg: 'RS256',
      use: 'sig',
      kid: 'b',
      n: 'Aw',
      e: 'AQAB',
      x5c: ['excluded'],
    },
    {
      kty: 'RSA',
      alg: 'RS256',
      use: 'sig',
      kid: 'a',
      n: 'AQ',
      e: 'AQAB',
      x5t: 'ERERERERERERERERERERERERERE',
      ignored: true,
    },
  ],
  localMutationSurface: {
    ignored: true,
    surfaceIdentityDigest: DIGEST_ONE,
    deviceId: '2',
    rootFileId: '3',
  },
  localRootIdentity: {
    ignored: true,
    rootPathDigest: DIGEST_TWO,
    surfaceIdentityDigest: DIGEST_ONE,
    deviceId: '2',
    rootFileId: '3',
  },
  localRootPath: '/srv/é',
  localStageToken: {
    ignored: true,
    operationId: 'op',
    attemptId: 'attempt',
    stagingStageAttemptId: 'stage',
    generationId: 'generation',
  },
  managedEvidenceAppend: {
    ignored: true,
    previousHeadDigest: `sha256:${'00'.repeat(32)}`,
    entryDigest: `sha256:${'ff'.repeat(32)}`,
  },
  managedEvidenceGenesis: {
    ignored: true,
    operationId: 'op',
    runAttempt: 2,
  },
  networkBoundaryProfile: {
    ignored: true,
    profile: 'gala-network-boundary-v2',
    ipv4SourceDigest: DIGEST_ONE,
    ipv6SourceDigest: DIGEST_TWO,
    additionalDeniedCidrs: ['224.0.0.0/4', '::/96'],
  },
  pagesBuildVersion: {
    ignored: true,
    repositoryId: '1',
    operationId: 'op',
    attemptId: 'attempt',
    runId: '2',
    runAttempt: 3,
    artifactId: 'artifact',
    artifactDigest: DIGEST_ONE,
    proposedGenerationId: 'generation',
  },
  pagesDeployment: PAGE_DEPLOYMENT,
  pagesNoAuthorityRunAttempt: {
    ignored: true,
    repositoryId: '1',
    runId: '3',
    runAttempt: 2,
    authorityState: 'closed-no-destination-authority',
  },
  publicProbeJitter: {
    ignored: true,
    operationId: 'op',
    attemptId: 'attempt',
    proposedGenerationId: 'generation',
    targetId: 7,
    probeRegion: 'us-east',
    nextAttemptNumber: 4,
  },
  renderPolicy: Buffer.from([0x00, 0xff, 0x0a]),
  sourceInventory: {
    ignored: true,
    includedSources: [],
    excludedInputs: [],
  },
});

/**
 * Produce the input paired with one committed independent golden vector.
 *
 * @param {string} name profile name
 * @returns {unknown} vector input
 */
function inputForProfile(name) {
  if (Object.hasOwn(SPECIAL_INPUTS, name)) {
    return /** @type {Record<string, unknown>} */ (SPECIAL_INPUTS)[name];
  }
  if (ARRAY_PROFILES.has(name)) return [COMMON];
  const selfField = /** @type {Record<string, string>} */ (SELF_FIELDS)[name];
  if (selfField) return { ...COMMON, [selfField]: 'excluded-self-value' };
  return COMMON;
}

// Generated once with an independent byte-level SHA-256 oracle and committed as
// literals. Tests never derive expected preimages or digests from production code.
const GOLDEN_VECTORS = [
  {
    name: 'adapterCapability',
    preimageHex:
      '47414c412d414441505445522d4341504142494c4954592d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      '7e2dd9e100d04faf1a9029869a2e6d85fccdb1d33b5b769942047cbea8563d26',
  },
  {
    name: 'appearanceDefault',
    preimageHex:
      '47414c412d415050454152414e43452d44454641554c542d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      '9be28075ab30bfb103d7c8e90f2dcd22337bce1fafdf9173e02bf34edd1eadd5',
  },
  {
    name: 'artifactManifest',
    preimageHex:
      '47414c412d41525449464143542d4d414e49464553542d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      'feafe03406ebca15478ebd018828d0f7a4009a1cc2c4474a28b3326d94c2927f',
  },
  {
    name: 'artifact',
    preimageHex:
      '47414c412d41525449464143542d5632005b7b2261223a22c3a9222c227a223a317d5d',
    digestHex:
      'ab92d4bef187d7cb8772896fed7c88f77764deac57ad4eaf86404304d6e44a09',
  },
  {
    name: 'artifactValidationEvidence',
    preimageHex:
      '47414c412d41525449464143542d56414c49444154494f4e2d45564944454e43452d5632007b2261223a22c3a9222c2276616c69646174696f6e223a7b227374617465223a226f6b227d2c227a223a317d',
    digestHex:
      '9e260657bd9841be046d07332aa0d9c33124652cef460c32ed22ee51ae3015f8',
  },
  {
    name: 'buildInput',
    preimageHex:
      '47414c412d4255494c442d494e5055542d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      'a31b075fc72e7db80d31ecf410e56ad7f94bb5747bc3e61c0f921c7ca7737610',
  },
  {
    name: 'buildPolicyDecision',
    preimageHex:
      '47414c412d4255494c442d504f4c4943592d4445434953494f4e2d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      '6ff295f1e9007a63853d6e34c0f208a599909db1f491127cffe75379463c38a3',
  },
  {
    name: 'buildProvenance',
    preimageHex:
      '47414c412d4255494c442d50524f56454e414e43452d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      '6c3f92ae4fbcecf24738d728064dae129ad44a5efd8cb77a23bbde9c9ccc77ec',
  },
  {
    name: 'buildWorkflowIdentity',
    preimageHex:
      '47414c412d4255494c442d574f524b464c4f572d4944454e544954592d5632005b7b22646967657374223a227368613235363a31313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131222c2270617468223a222e6769746875622f776f726b666c6f77732f7075626c6973682e796d6c227d5d',
    digestHex:
      '00534ca65ed5e96560079bc32a219aec91b5250ef0a2f121ff854ac995ac7e46',
  },
  {
    name: 'cancellationFinalizationEvidence',
    preimageHex:
      '47414c412d43414e43454c4c4154494f4e2d46494e414c495a4154494f4e2d45564944454e43452d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      '7101cf1d5542fb16aa55eec16cf8760346c6457db6ee74b75712067fee43f6a2',
  },
  {
    name: 'capabilityDecision',
    preimageHex:
      '47414c412d4341504142494c4954592d4445434953494f4e2d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      '452a8c62770862c9c299dc37d5e74fe9f53629a3a6429d29c0bf368a3a7f0738',
  },
  {
    name: 'deadlineFinalizationEvidence',
    preimageHex:
      '47414c412d444541444c494e452d46494e414c495a4154494f4e2d45564944454e43452d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      'b9fd963b5ff486935f11d182181e3ffafdeb16e88055f9dee80005ea2a3586b2',
  },
  {
    name: 'deploymentIntent',
    preimageHex:
      '47414c412d4445504c4f594d454e542d494e54454e542d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      '8def462b2ad7ad68ddb2c74911696c46dbd35ce81f2080f5811836414202d759',
  },
  {
    name: 'deploymentPolicyDecision',
    preimageHex:
      '47414c412d4445504c4f594d454e542d504f4c4943592d4445434953494f4e2d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      '01ca1ea1dbbb40c29b64062240c807714c9f44d3c864315ad9150a07298cc5a1',
  },
  {
    name: 'deploymentReceipt',
    preimageHex:
      '47414c412d4445504c4f594d454e542d524543454950542d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      '0157fc6d7ec58c3bbb17e044b6c480eb5bcd8a1f3fd80efc30080785358450bf',
  },
  {
    name: 'deploymentStageEvidence',
    preimageHex:
      '47414c412d4445504c4f594d454e542d53544147452d45564944454e43452d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      'cb4907d66a689e964de292e981a3e40f7c109d48a99c8f5c080a83858bbe0ecf',
  },
  {
    name: 'deploymentStageInput',
    preimageHex:
      '47414c412d4445504c4f594d454e542d53544147452d494e5055542d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      'd7f2bcdad1f0c3f433ca0c50e746f80cfabad14a9643090237a5132636aa74e5',
  },
  {
    name: 'deploymentStageResult',
    preimageHex:
      '47414c412d4445504c4f594d454e542d53544147452d524553554c542d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      'f8b23cca45536cfe5f36a385fd07eaee3a54a824441c4dfbab590c4b4c5858be',
  },
  {
    name: 'destinationMutationKey',
    preimageHex:
      '47414c412d44455354494e4154494f4e2d4d55544154494f4e2d4b45592d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      '80f1f1576ece149cb9946c687bca4c233393d0197b3bd51d4da9048ad027bfa6',
  },
  {
    name: 'destinationProviderBinding',
    preimageHex:
      '47414c412d44455354494e4154494f4e2d50524f56494445522d42494e44494e472d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      'c271aca6598e12bd89895b86cd8c51d61222253bc9322b5bea786b6e68804142',
  },
  {
    name: 'spacesControlPlaneBinding',
    preimageHex:
      '47414c412d444f2d5350414345532d434f4e54524f4c2d504c414e452d42494e44494e472d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      'ed605a5d374611bedfe2d1099ab5bfaf93202581f528b292a047107bad5e1c78',
  },
  {
    name: 'spacesControlPlaneEvidence',
    preimageHex:
      '47414c412d444f2d5350414345532d434f4e54524f4c2d504c414e452d45564944454e43452d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      '83097ccc748d45c5aa5b6e1747a30199ca633a9d81584a7236eaa35ed88273a5',
  },
  {
    name: 'spacesControlPlaneRequestCatalog',
    preimageHex:
      '47414c412d444f2d5350414345532d434f4e54524f4c2d504c414e452d52455155455354532d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      'bd2947dbbd28962d78287dbe83ee89376687f919c111b323e2f0437c8b42e1ae',
  },
  {
    name: 'spacesControlPlaneResponseCatalog',
    preimageHex:
      '47414c412d444f2d5350414345532d434f4e54524f4c2d504c414e452d524553504f4e5345532d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      '0c5a04098b4adb1dbf605efcdb5d780288b4efffee9b8592bb9d3082ae7b5d6b',
  },
  {
    name: 'spacesCredentialProfile',
    preimageHex:
      '47414c412d444f2d5350414345532d43524544454e5449414c2d50524f46494c452d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      '1288fa5a43ee0ef8912e67ac54a5fc14f48ba3393e2b6a91f8ea83c1b0b53bd5',
  },
  {
    name: 'spacesRegionCatalog',
    preimageHex:
      '47414c412d444f2d5350414345532d524547494f4e532d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      'bc113db2f4999050a23189058d14150a28627cfa23a95899b4a281152d2c67c0',
  },
  {
    name: 'spacesWebsiteConfiguration',
    preimageHex:
      '47414c412d444f2d5350414345532d574542534954452d434f4e46494755524154494f4e2d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      'cc67f10b83b362764c3a358e5f538b754a0ff3d3e5bcc506b29a62f48e8fa553',
  },
  {
    name: 'githubActionsOidcOriginCatalog',
    preimageHex:
      '47414c412d4749544855422d414354494f4e532d4f4944432d4f524947494e2d434154414c4f472d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      'c3e99cfa09a1963a33314d52155bb49302d97b1f5fbc51cf4972e7d753502720',
  },
  {
    name: 'githubHostedRunnerCompatibility',
    preimageHex:
      '47414c412d4749544855422d484f535445442d52554e4e45522d434f4d5041544942494c4954592d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      '864a6341e81e8475dce9e2e388ce3ad8881d3e3f138a866f7c47c03f0fcc22dc',
  },
  {
    name: 'githubWorkloadOidcKeySet',
    preimageHex:
      '47414c412d4749544855422d574f524b4c4f41442d4f4944432d4b45592d5345542d5632005b7b22616c67223a225253323536222c2265223a2241514142222c226b6964223a2261222c226b7479223a22525341222c226e223a224151222c22757365223a22736967222c22783574223a22455245524552455245524552455245524552455245524552455245227d2c7b22616c67223a225253323536222c2265223a2241514142222c226b6964223a2262222c226b7479223a22525341222c226e223a224177222c22757365223a22736967227d5d',
    digestHex:
      'e3b46ae3a5b7a0b12850f2402066a2e132809359b512898400f17437194c609e',
  },
  {
    name: 'githubWorkloadOidcVerificationProfile',
    preimageHex:
      '47414c412d4749544855422d574f524b4c4f41442d4f4944432d564552494649434154494f4e2d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      'c93fb08175791abe1882149ba3376e0f7fcbf7e2769ca0f85f049fdcc8268d5d',
  },
  {
    name: 'localFilesystemAllowlist',
    preimageHex:
      '47414c412d4c4f43414c2d46494c4553595354454d2d414c4c4f574c4953542d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      '2a081406b3aa2a9539ea08d385784fbc7f9f15f2627179d2ce1ef0c788b5dc53',
  },
  {
    name: 'localFilesystemCapabilityEvidence',
    preimageHex:
      '47414c412d4c4f43414c2d46494c4553595354454d2d4341504142494c4954592d45564944454e43452d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      '9dc2d1bb9917b76cd9384ac172000853fc5e397d02c9d71316b5869f78df24d7',
  },
  {
    name: 'localFilesystemControlRow',
    preimageHex:
      '47414c412d4c4f43414c2d46494c4553595354454d2d434f4e54524f4c2d524f572d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      '5695f7c03eaa3054717c426802a23450e827fda914405355004ee572d0d9a0e8',
  },
  {
    name: 'localFilesystemFailureEvidence',
    preimageHex:
      '47414c412d4c4f43414c2d46494c4553595354454d2d4641494c5552452d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      '8120a523f757f95d4b57f197a0a791ec0cbd9f60d0a7646faae6c44c8093dbcf',
  },
  {
    name: 'localFilesystemObservationEvidence',
    preimageHex:
      '47414c412d4c4f43414c2d46494c4553595354454d2d4f42534552564154494f4e2d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      '0a8e53b03eeef522e4ab6abf59d4a8f1703009bf909c32369c8e83cd05b632fd',
  },
  {
    name: 'localFilesystemProbeTranscript',
    preimageHex:
      '47414c412d4c4f43414c2d46494c4553595354454d2d50524f42452d5452414e5343524950542d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      'd6b64e8d961bce18c097bfe529fd9fdf8d4c46c4f1b9b360e7932f8f4913a347',
  },
  {
    name: 'localMutationSurface',
    preimageHex:
      '47414c412d4c4f43414c2d4d55544154494f4e2d535552464143452d5632007b226465766963654964223a2232222c22726f6f7446696c654964223a2233222c22737572666163654964656e74697479446967657374223a227368613235363a31313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131227d',
    digestHex:
      'ec9f90b82e8b56c42420ceb2271fed2a39520d07c5c780a1b161d7b3497b4e5b',
  },
  {
    name: 'localRootIdentity',
    preimageHex:
      '47414c412d4c4f43414c2d524f4f542d4944454e544954592d5632007b226465766963654964223a2232222c22726f6f7446696c654964223a2233222c22726f6f7450617468446967657374223a227368613235363a32323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232222c22737572666163654964656e74697479446967657374223a227368613235363a31313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131227d',
    digestHex:
      '0dfac006d9c851cb443bd4ca6b62abdd9b396cce3969ca111f9eea54bb549c06',
  },
  {
    name: 'localRootPath',
    preimageHex:
      '47414c412d4c4f43414c2d524f4f542d504154482d5632002f7372762fc3a9',
    digestHex:
      '8c807179319ded51859fa152972b055115920344a398e105440e09be17cabfbc',
  },
  {
    name: 'localStageToken',
    preimageHex:
      '47414c412d4c4f43414c2d53544147452d544f4b454e2d5632007b22617474656d70744964223a22617474656d7074222c2267656e65726174696f6e4964223a2267656e65726174696f6e222c226f7065726174696f6e4964223a226f70222c2273746167696e675374616765417474656d70744964223a227374616765227d',
    digestHex:
      '820f845b31b1daa0a42cce9f871cffb3ddf14ec2d9ccb4b5705263de458bbf84',
  },
  {
    name: 'localSurfaceIdentity',
    preimageHex:
      '47414c412d4c4f43414c2d535552464143452d4944454e544954592d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      'f53a2248c5fd84afab3c87e0ef479e93320c4f733496fcf455b2aaf6875ca13c',
  },
  {
    name: 'lock',
    preimageHex: '47414c412d4c4f434b2d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      'aacb9798d68c65e69009718e7bf779cf07b2ce8203e32039d400ae17f0ae7cc5',
  },
  {
    name: 'managedEvidenceAppend',
    preimageHex:
      '47414c412d4d414e414745442d45564944454e43452d415050454e442d5632000000000000000000000000000000000000000000000000000000000000000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    digestHex:
      '67262bbd5a3428f545a5b43a45b2ff9afa4ae8d92b828910533bbf91ef0e020a',
  },
  {
    name: 'managedEvidenceEntry',
    preimageHex:
      '47414c412d4d414e414745442d45564944454e43452d454e5452592d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      '4e84da003babe511468f0ae4997184300080a5fee3bf397fdf7dbfe5a35763c5',
  },
  {
    name: 'managedEvidenceGenesis',
    preimageHex:
      '47414c412d4d414e414745442d45564944454e43452d47454e455349532d5632007b226f7065726174696f6e4964223a226f70222c2272756e417474656d7074223a327d',
    digestHex:
      '8f53e602618829172f8c2632acccd562b2ef8a6680e1c22173a65651069ce6af',
  },
  {
    name: 'managedReceiptSubmission',
    preimageHex:
      '47414c412d4d414e414745442d524543454950542d5355424d495353494f4e2d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      'f13d7ab207b04b29378328ffc9f34a84ba5041d127018a73c5e15bc88929d7db',
  },
  {
    name: 'navigationDefault',
    preimageHex:
      '47414c412d4e415649474154494f4e2d44454641554c542d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      '84705d10c99208e8d559d8060ea28c07aa156d5e147a931e12932c6fdbb92fd6',
  },
  {
    name: 'networkBoundaryProfile',
    preimageHex:
      '47414c412d4e4554574f524b2d424f554e444152592d50524f46494c452d5632007b226164646974696f6e616c44656e6965644369647273223a5b223232342e302e302e302f34222c223a3a2f3936225d2c2269707634536f75726365446967657374223a227368613235363a31313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131222c2269707636536f75726365446967657374223a227368613235363a32323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232222c2270726f66696c65223a2267616c612d6e6574776f726b2d626f756e646172792d7632227d',
    digestHex:
      'b4ff7d57c040d2116f0d5e50ba2b10c3e5dd0c2792e9d0bd94a519f0d4b00452',
  },
  {
    name: 'npmRegistryFetchProfile',
    preimageHex:
      '47414c412d4e504d2d52454749535452592d46455443482d50524f46494c452d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      '553b1def080137e3e1a3295b6b8acb3a73b93b7215a38c922a08c67db5a7168d',
  },
  {
    name: 'packageReleaseCatalog',
    preimageHex:
      '47414c412d5041434b4147452d52454c454153452d434154414c4f472d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      '296b2868d448dc7d3965eccb20ba55b47a5ac5fb7bc7d2bd6f9a34cb8ddb43ed',
  },
  {
    name: 'pagesBuildVersion',
    preimageHex:
      '47414c412d50414745532d4255494c442d56455253494f4e2d5632007b226172746966616374446967657374223a227368613235363a31313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131222c2261727469666163744964223a226172746966616374222c22617474656d70744964223a22617474656d7074222c226f7065726174696f6e4964223a226f70222c2270726f706f73656447656e65726174696f6e4964223a2267656e65726174696f6e222c227265706f7369746f72794964223a2231222c2272756e417474656d7074223a332c2272756e4964223a2232227d',
    digestHex:
      'c22a33e7d2979d80cd346a31780d833266bd73cc301095a15d41f34e35b55fe2',
  },
  {
    name: 'pagesDeployment',
    preimageHex:
      '47414c412d50414745532d4445504c4f594d454e542d5632007b22637265617465526573706f6e73654f62736572766564223a66616c73652c227061676555726c223a2268747470733a2f2f6f2e6769746875622e696f2f722f222c227061676573416374696f6e73417274696661637442797465436f756e74223a223233222c227061676573416374696f6e734172746966616374446967657374223a227368613235363a31313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131222c227061676573416374696f6e7341727469666163744964223a223137222c227061676573416374696f6e7341727469666163744e616d65223a2267616c612d70616765732d3137222c2270616765734275696c6456657273696f6e223a2261616161616161616161616161616161616161616161616161616161616161616161616161616161222c2270616765734465706c6f796d656e744964223a2261616161616161616161616161616161616161616161616161616161616161616161616161616161222c2270616765734f6964634f726967696e223a2268747470733a2f2f6170692e6769746875622e636f6d222c22706f6c6c696e6753746174757355726c223a2268747470733a2f2f6170692e6769746875622e636f6d2f7265706f732f6f2f722f70616765732f6465706c6f796d656e74732f61222c22737461747573223a2273756363656564227d',
    digestHex:
      '882d51095e3dccc4ed9576f55ac3a503f0a7f693c202537961e504f661e53e3f',
  },
  {
    name: 'pagesNoAuthorityRunAttempt',
    preimageHex:
      '47414c412d50414745532d4e4f2d415554484f524954592d52554e2d415454454d50542d5632007b22617574686f726974795374617465223a22636c6f7365642d6e6f2d64657374696e6174696f6e2d617574686f72697479222c227265706f7369746f72794964223a2231222c2272756e417474656d7074223a322c2272756e4964223a2233227d',
    digestHex:
      'ff27dccafe7e5585e6efadeeb02f05ba9688df8a8e5aa65296805286f1b53a0c',
  },
  {
    name: 'pagesReconciliationCommand',
    preimageHex:
      '47414c412d50414745532d5245434f4e43494c494154494f4e2d434f4d4d414e442d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      'd4bb569d9ac62e4de917a844766805a1b08b30c3a8b9a75cc4d396f935f27b43',
  },
  {
    name: 'pagesReconciliationRecovery',
    preimageHex:
      '47414c412d50414745532d5245434f4e43494c494154494f4e2d5245434f564552592d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      '884b992c8da0a3473b81485d99cae1fea9621d759e2e88ddd693de357732f549',
  },
  {
    name: 'pagesRunAttemptGapProof',
    preimageHex:
      '47414c412d50414745532d52554e2d415454454d50542d4741502d50524f4f462d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      'fd846777c8f07ef46cd8dd4e54bb9b7c745d0ea263fb9befac217468ad334e2a',
  },
  {
    name: 'providerCredentialEgress',
    preimageHex:
      '47414c412d50524f56494445522d43524544454e5449414c2d4547524553532d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      '770f45ef00e965e6bdf5c1ec3f82e641c2017072fad3b1d803ad70e2cb800f48',
  },
  {
    name: 'providerCallClassBinding',
    preimageHex:
      '47414c412d50524f56494445522d43414c4c2d434c4153532d42494e44494e472d5632005b7b2261223a22c3a9222c227a223a317d5d',
    digestHex:
      '9053ebc490104c0b938ecb7d1c3fc13907c2db2c99f0bbbfaa41310baa7a138c',
  },
  {
    name: 'providerRequestTemplates',
    preimageHex:
      '47414c412d50524f56494445522d524551554553542d54454d504c415445532d5632005b7b2261223a22c3a9222c227a223a317d5d',
    digestHex:
      '437406561d8a985ad17f179f00b64712c5f7f8d1aeacfebd2467f63de0cd6f89',
  },
  {
    name: 'providerResponseCatalog',
    preimageHex:
      '47414c412d50524f56494445522d524553504f4e53452d434154414c4f472d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      'f771f6682ba1052c6f10741201610fef2f00f11be2190b30ef0319e95f097180',
  },
  {
    name: 'providerTlsProfile',
    preimageHex:
      '47414c412d50524f56494445522d544c532d50524f46494c452d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      '6a1bdbd21262431e03d29b871e4318297c86805b5d4d5d38b6e00d88a2d8378b',
  },
  {
    name: 'publicActivationDetectionObservation',
    preimageHex:
      '47414c412d5055424c49432d41435449564154494f4e2d444554454354494f4e2d4f42534552564154494f4e2d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      '8ca19eb74f41253c17fd1aa1fb76d222eb342112cd92e3ea5826b9d6cc6a0b4c',
  },
  {
    name: 'publicActivationDetectionPlan',
    preimageHex:
      '47414c412d5055424c49432d41435449564154494f4e2d444554454354494f4e2d504c414e2d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      'd98bb24e932c209af7ed6be23ae1b26afc2072f5342139df5e80aa0f147a376a',
  },
  {
    name: 'publicActivationDetectionProbe',
    preimageHex:
      '47414c412d5055424c49432d41435449564154494f4e2d444554454354494f4e2d50524f42452d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      '9cc5e3c9dc8c1cc561791116e180d71d65a2d8aa5444475cde5ee885e8aac583',
  },
  {
    name: 'publicProbeJitter',
    preimageHex:
      '47414c412d5055424c49432d50524f42452d4a49545445522d5632007b22617474656d70744964223a22617474656d7074222c226e657874417474656d70744e756d626572223a342c226f7065726174696f6e4964223a226f70222c2270726f6265526567696f6e223a2275732d65617374222c2270726f706f73656447656e65726174696f6e4964223a2267656e65726174696f6e222c227461726765744964223a377d',
    digestHex:
      '3a367a426270767b51116185a0d0ec92e3d8358674937d2f22e4dfa3ded6930f',
  },
  {
    name: 'publicProbeObservation',
    preimageHex:
      '47414c412d5055424c49432d50524f42452d4f42534552564154494f4e2d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      'eba4cf719babbc87c894532a2eeafb0bdb337c4e29d38a905449a78588852251',
  },
  {
    name: 'publicTlsProfile',
    preimageHex:
      '47414c412d5055424c49432d544c532d50524f46494c452d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      '9f7da1698f06a83b719da22be67b20a37e0f79fc4dbf5cdee52cd4bfacedf20c',
  },
  {
    name: 'renderPolicy',
    preimageHex: '47414c412d52454e4445522d504f4c4943592d56320000ff0a',
    digestHex:
      '9ae18c389603d0ecf2cc51f1d468795f3a491b064c4fc620ba08244d42b21baa',
  },
  {
    name: 'repositoryRoot',
    preimageHex:
      '47414c412d5245504f5349544f52592d524f4f542d5632005b7b2261223a22c3a9222c227a223a317d5d',
    digestHex:
      '93e1be6e5759f992e15698162ef2d21fc29e0cbef6c1f280c70db681e146abdd',
  },
  {
    name: 'sourceInventory',
    preimageHex:
      '47414c412d534f555243452d494e56454e544f52592d5632007b226578636c75646564496e70757473223a5b5d2c22696e636c75646564536f7572636573223a5b5d7d',
    digestHex:
      'd18906246c46fd2fb4fd0afd941b1654a8457db821843379a8cda56da664f12d',
  },
  {
    name: 'supersessionFinalizationEvidence',
    preimageHex:
      '47414c412d535550455253455353494f4e2d46494e414c495a4154494f4e2d45564944454e43452d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      '86f9f2fa14abd163f873111da7b0b89634c023d158fbd4afaadd5ed8aa3e0f7f',
  },
  {
    name: 'templateStylingContract',
    preimageHex:
      '47414c412d54454d504c4154452d5354594c494e472d434f4e54524143542d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      '325524aea64196e9531a7e76bef4c07226f2b7bc8c2c689717649ca189067773',
  },
  {
    name: 'themeConformanceEvidence',
    preimageHex:
      '47414c412d5448454d452d434f4e464f524d414e43452d45564944454e43452d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      '199347eabad47c8609c3ba11feaa73d767010b6962e50ad1146ac484e63cd035',
  },
  {
    name: 'themeConformanceInput',
    preimageHex:
      '47414c412d5448454d452d434f4e464f524d414e43452d494e5055542d5632005b7b2261223a22c3a9222c227a223a317d5d',
    digestHex:
      '4ab086254a175e7d3cafbd03e91154f8503ba3fe15c81f21ac2a9d2010e3c1e0',
  },
  {
    name: 'themeFixtureRelease',
    preimageHex:
      '47414c412d5448454d452d464958545552452d52454c454153452d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      '9b5933d2bcc25b9792523d4d7a4a7b411cf5b7555009a0dfeaed12b6942b725e',
  },
  {
    name: 'themePackageIntegrity',
    preimageHex:
      '47414c412d5448454d452d5041434b4147452d494e544547524954592d5632005b7b2261223a22c3a9222c227a223a317d5d',
    digestHex:
      'aa9602343a844d5743021b0b4ef7fe712d907cd3dfec71132c8f578e59837095',
  },
  {
    name: 'tlsRevocationSet',
    preimageHex:
      '47414c412d544c532d5245564f434154494f4e2d5345542d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      '15435df30e9eb02ecd1ba6d563babef680c80be2f04a62644d7f122152f62992',
  },
  {
    name: 'verificationPlan',
    preimageHex:
      '47414c412d564552494649434154494f4e2d504c414e2d5632005b7b2261223a22c3a9222c227a223a317d5d',
    digestHex:
      '00cc3b75d0e2f0346b3e394e7f4aa2b4ebd74a9edca0f272b189b832bf70e277',
  },
  {
    name: 'verifiedWorkloadBinding',
    preimageHex:
      '47414c412d56455249464945442d574f524b4c4f41442d42494e44494e472d5632007b2261223a22c3a9222c227a223a317d',
    digestHex:
      '46a19407671ac12332b1209efbe4a9ca96d98d10cbd1b8a0b9255c00006a206d',
  },
];

test('the active DEC-097/098 inventory is exact and uniquely terminal-NUL separated', () => {
  assert.equal(ACTIVE_DIGEST_DOMAIN_COUNT, 80);
  assert.equal(Object.keys(ACTIVE_DIGEST_PROFILES).length, 80);
  assert.equal(Object.keys(ACTIVE_DIGEST_DOMAINS).length, 80);
  assert.equal(new Set(Object.values(ACTIVE_DIGEST_DOMAINS)).size, 80);
  assert.equal(GOLDEN_VECTORS.length, 80);
  for (const domain of Object.values(ACTIVE_DIGEST_DOMAINS)) {
    assert.match(domain, /^GALA-[A-Z0-9-]+-V2\0$/u);
    assert.notEqual(domain, 'GALA-RECEIPT-V2\0');
    assert.equal(domain.includes('STANDALONE'), false);
  }
});

test('every active domain reproduces its hardcoded preimage and SHA-256 golden', () => {
  for (const { name, preimageHex, digestHex } of GOLDEN_VECTORS) {
    const profile = ACTIVE_DIGEST_PROFILES[name];
    assert.ok(profile, name);
    const input = inputForProfile(name);
    assert.equal(hexFromBytes(profile.preimage(input)), preimageHex, name);
    assert.equal(hexFromBytes(profile.digestBytes(input)), digestHex, name);
    assert.equal(profile.digest(input), `sha256:${digestHex}`, name);
  }
});

test('named self-exclusions omit only the authority-owned digest member', () => {
  for (const [name, selfField] of Object.entries(SELF_FIELDS)) {
    if (name === 'artifactManifest') continue;
    const profile = ACTIVE_DIGEST_PROFILES[name];
    assert.ok(profile, name);
    const first = { ...COMMON, [selfField]: 'first' };
    const second = { ...COMMON, [selfField]: 'second' };
    assert.equal(profile.digest(first), profile.digest(second), name);
    assert.notEqual(
      profile.digest(first),
      profile.digest({ ...first, retained: true }),
      name,
    );
  }

  const manifest = SPECIAL_INPUTS.artifactManifest;
  assert.equal(
    ACTIVE_DIGEST_PROFILES.artifactManifest?.digest(manifest),
    ACTIVE_DIGEST_PROFILES.artifactManifest?.digest({
      ...manifest,
      artifactId: 'another-freeze',
      manifestDigest: DIGEST_TWO,
    }),
  );
  assert.notEqual(
    ACTIVE_DIGEST_PROFILES.artifactManifest?.digest(manifest),
    ACTIVE_DIGEST_PROFILES.artifactManifest?.digest({
      ...manifest,
      retained: true,
    }),
  );
});

test('artifact validation excludes exactly both root owners and nested evidenceDigest', () => {
  const profile = ACTIVE_DIGEST_PROFILES.artifactValidationEvidence;
  assert.ok(profile);
  const input = SPECIAL_INPUTS.artifactValidationEvidence;
  assert.equal(
    profile.digest(input),
    profile.digest({
      ...input,
      artifactId: 'another-freeze',
      manifestDigest: DIGEST_TWO,
      validation: { state: 'ok', evidenceDigest: DIGEST_ONE },
    }),
  );
  assert.notEqual(
    profile.digest(input),
    profile.digest({
      ...input,
      validation: { state: 'changed', evidenceDigest: DIGEST_TWO },
    }),
  );
});

test('key-set projection sorts by kid and excludes non-authoritative JWK members', () => {
  const profile = ACTIVE_DIGEST_PROFILES.githubWorkloadOidcKeySet;
  assert.ok(profile);
  const reversed = [...SPECIAL_INPUTS.githubWorkloadOidcKeySet].reverse();
  assert.equal(
    profile.digest(SPECIAL_INPUTS.githubWorkloadOidcKeySet),
    profile.digest(reversed),
  );
  assert.deepEqual(profile.project(SPECIAL_INPUTS.githubWorkloadOidcKeySet), [
    {
      kty: 'RSA',
      alg: 'RS256',
      use: 'sig',
      kid: 'a',
      n: 'AQ',
      e: 'AQAB',
      x5t: 'ERERERERERERERERERERERERERE',
    },
    { kty: 'RSA', alg: 'RS256', use: 'sig', kid: 'b', n: 'Aw', e: 'AQAB' },
  ]);
});

test('raw-byte and derived profiles retain their exact encodings', () => {
  assert.equal(
    digestActionDefinitionBlob(Buffer.from([0x00, 0xff, 0x0a])),
    'sha256:712450d3c4a79eea9509e75dc1dacdeff58034df538536cfae2da882bd8a0c50',
  );
  assert.equal(
    digestLocalRootPath('/srv/é'),
    ACTIVE_DIGEST_PROFILES.localRootPath?.digest('/srv/é'),
  );
  assert.throws(
    () => digestLocalRootPath('/srv/\ud800'),
    /UNICODE_SCALAR_INVALID/u,
  );
  assert.equal(
    digestRenderPolicyBytes(Buffer.from([0x00, 0xff, 0x0a])),
    ACTIVE_DIGEST_PROFILES.renderPolicy?.digest(
      Buffer.from([0x00, 0xff, 0x0a]),
    ),
  );
  assert.equal(
    derivePagesBuildVersion(SPECIAL_INPUTS.pagesBuildVersion),
    'c22a33e7d2979d80cd346a31780d833266bd73cc',
  );
  assert.equal(
    deriveLocalStageToken(SPECIAL_INPUTS.localStageToken),
    '820f845b31b1daa0a42cce9f871cffb3',
  );
  assert.equal(
    derivePublicProbeRetryDelay(SPECIAL_INPUTS.publicProbeJitter),
    4148,
  );
});

test('RAW32 journal chaining rejects every noncanonical tagged digest', () => {
  const genesis = digestManagedEvidenceGenesis(
    SPECIAL_INPUTS.managedEvidenceGenesis,
  );
  const entry = digestManagedEvidenceEntry({
    entryType: 'attempt',
    attempt: { attemptId: 'attempt' },
  });
  assert.match(
    appendManagedEvidenceHead(genesis, entry),
    /^sha256:[0-9a-f]{64}$/u,
  );
  for (const invalid of [
    '0'.repeat(64),
    `sha256:${'AA'.repeat(32)}`,
    `sha256:${'0'.repeat(63)}`,
    `sha512:${'0'.repeat(64)}`,
  ]) {
    assert.throws(
      () => appendManagedEvidenceHead(invalid, entry),
      /DIGEST_INVALID/u,
    );
  }
});

test('the shared JCS helper includes one validated terminal NUL and exact JCS bytes', () => {
  const domain = 'GALA-TEST-V2\0';
  assert.equal(
    hexFromBytes(domainSeparatedJcsPreimage(domain, { z: 1, a: 'é' })),
    '47414c412d544553542d5632007b2261223a22c3a9222c227a223a317d',
  );
  assert.equal(
    digestDomainSeparatedJcs(domain, { z: 1, a: 'é' }),
    'sha256:57fe334e4bbee18d037c5fc5460811bf4ebe4cc451056b8a2e6eb3d2b389ff25',
  );
  assert.throws(
    () => digestDomainSeparatedJcs('GALA-TEST-V2', {}),
    /DIGEST_DOMAIN_INVALID/u,
  );
});

test('exact subset projectors reject missing members and the Pages union rejects ambiguity', () => {
  assert.throws(
    () => ACTIVE_DIGEST_PROFILES.pagesBuildVersion?.digest({}),
    /DIGEST_PROFILE_MEMBER_MISSING:repositoryId/u,
  );
  assert.throws(
    () =>
      ACTIVE_DIGEST_PROFILES.pagesDeployment?.digest({
        ...PAGE_DEPLOYMENT,
        createResponseStatusUrl: 'https://example.invalid/status',
      }),
    /DIGEST_PROFILE_MEMBER_FORBIDDEN:createResponseStatusUrl/u,
  );
  assert.throws(
    () =>
      ACTIVE_DIGEST_PROFILES.pagesDeployment?.digest({
        ...PAGE_DEPLOYMENT,
        createResponseObserved: true,
      }),
    /DIGEST_PROFILE_MEMBER_MISSING:createResponseStatusUrl/u,
  );
});

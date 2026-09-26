import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { runIfMain } from './run-if-main.mjs';

const WRAPPER_JAR_SHA256 =
  '7d3a4ac4de1c32b59bc6a4eb8ecb8e612ccd0cf1ae1e99f66902da64df296172';
const DISTRIBUTION_SHA256 =
  '6f74b601422d6d6fc4e1f9a1ab6522f642c2fdcbc15ae33ebd30ba3d7198e854';

/** Check the locked and checksum-pinned test-only Java dependency graph. */
export async function checkJavaParitySupplyChain() {
  const [lock, metadata, licenses, wrapperProperties, wrapperJar] =
    await Promise.all([
      readFile('parity/java/gradle.lockfile', 'utf8'),
      readFile('parity/java/gradle/verification-metadata.xml', 'utf8'),
      readFile('parity/java/THIRD_PARTY_LICENSES.json', 'utf8'),
      readFile('parity/java/gradle/wrapper/gradle-wrapper.properties', 'utf8'),
      readFile('parity/java/gradle/wrapper/gradle-wrapper.jar'),
    ]);
  const coordinates = lock
    .split('\n')
    .filter((line) => line.includes('=') && !line.startsWith('empty='))
    .map((line) => line.slice(0, line.indexOf('=')))
    .sort();
  const inventory =
    /** @type {{components: {coordinate: string, license: string}[]}} */ (
      JSON.parse(licenses)
    );
  const licensed = inventory.components
    .map(({ coordinate }) => coordinate)
    .sort();
  if (JSON.stringify(licensed) !== JSON.stringify(coordinates)) {
    throw new Error(
      'Java parity license inventory differs from gradle.lockfile',
    );
  }
  for (const coordinate of coordinates) {
    const [group, name, version] = coordinate.split(':');
    const identity = `<component group="${group}" name="${name}" version="${version}">`;
    if (!metadata.includes(identity)) {
      throw new Error(`${coordinate} has no Gradle SHA-256 verification entry`);
    }
  }
  if (
    !wrapperProperties.includes(
      'distributionUrl=https\\://services.gradle.org/distributions/gradle-8.14.5-bin.zip',
    ) ||
    !wrapperProperties.includes(`distributionSha256Sum=${DISTRIBUTION_SHA256}`)
  ) {
    throw new Error('Gradle 8.14.5 distribution identity is not pinned');
  }
  const wrapperDigest = createHash('sha256').update(wrapperJar).digest('hex');
  if (wrapperDigest !== WRAPPER_JAR_SHA256) {
    throw new Error(
      'Gradle wrapper JAR digest differs from its accepted identity',
    );
  }
  process.stdout.write(
    `Verified ${coordinates.length} locked Java parity components and Gradle 8.14.5 wrapper checksums.\n`,
  );
}

await runIfMain(import.meta.url, checkJavaParitySupplyChain);

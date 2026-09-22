import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { runIfMain } from './run-if-main.mjs';

const WRAPPER_JAR_SHA256 =
  'cb0da6751c2b753a16ac168bb354870ebb1e162e9083f116729cec9c781156b8';
const DISTRIBUTION_SHA256 =
  'a4b4158601f8636cdeeab09bd76afb640030bb5b144aafe261a5e8af027dc612';

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
      'distributionUrl=https\\://services.gradle.org/distributions/gradle-8.8-bin.zip',
    ) ||
    !wrapperProperties.includes(`distributionSha256Sum=${DISTRIBUTION_SHA256}`)
  ) {
    throw new Error('Gradle 8.8 distribution identity is not pinned');
  }
  const wrapperDigest = createHash('sha256').update(wrapperJar).digest('hex');
  if (wrapperDigest !== WRAPPER_JAR_SHA256) {
    throw new Error(
      'Gradle wrapper JAR digest differs from its accepted identity',
    );
  }
  process.stdout.write(
    `Verified ${coordinates.length} locked Java parity components and Gradle 8.8 wrapper checksums.\n`,
  );
}

await runIfMain(import.meta.url, checkJavaParitySupplyChain);

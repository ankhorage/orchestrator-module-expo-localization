import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function assertSdk57LocalizationConsumerAsync({
  candidate,
  consumerRoot,
  expectedPackages,
  localization,
}: AssertionOptions): Promise<void> {
  const candidatePackage = await readPackageManifestAsync(
    path.join(consumerRoot, 'node_modules', candidate.name, 'package.json'),
  );
  assertCandidatePackage(candidatePackage, candidate, expectedPackages);
  const consumerPackage = await readPackageManifestAsync(path.join(consumerRoot, 'package.json'));
  assertGeneratedDependency(consumerPackage, localization);
  await assertConsumerDependencyProtocolsAsync(consumerRoot, consumerPackage, candidate);
  await assertReleasedGraphAsync(consumerRoot, expectedPackages);
  await assertGeneratedSourcesAsync(consumerRoot, consumerPackage);
}

interface AssertionOptions {
  readonly candidate: PackedCandidate;
  readonly consumerRoot: string;
  readonly expectedPackages: ExpectedPackageGraph;
  readonly localization: PackageIdentity;
}

interface ExpectedPackageGraph {
  readonly runtime: PackageIdentity;
  readonly runtimeRequirement: string;
  readonly surface: PackageIdentity;
  readonly surfaceRequirement: string;
  readonly zora: PackageIdentity;
  readonly zoraRequirement: string;
}

interface PackedCandidate extends PackageIdentity {
  readonly filename: string;
}

interface PackageIdentity {
  readonly name: string;
  readonly version: string;
}

interface PackageManifest {
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly name?: string;
  readonly peerDependencies?: Readonly<Record<string, string>>;
  readonly version?: string;
}

function assertCandidatePackage(
  candidatePackage: PackageManifest,
  candidate: PackedCandidate,
  expectedPackages: ExpectedPackageGraph,
): void {
  if (candidatePackage.name !== candidate.name || candidatePackage.version !== candidate.version) {
    throw new Error('Installed candidate identity does not match the packed artifact.');
  }
  if (
    Reflect.get(candidatePackage.dependencies ?? {}, expectedPackages.runtime.name) !==
    expectedPackages.runtimeRequirement
  ) {
    throw new Error('Packed candidate does not own its released Expo Runtime requirement.');
  }
  if (
    Reflect.get(candidatePackage.peerDependencies ?? {}, expectedPackages.zora.name) !==
    expectedPackages.zoraRequirement
  ) {
    throw new Error('Packed admin-view peer does not match the released ZORA 3 requirement.');
  }
}

async function assertConsumerDependencyProtocolsAsync(
  consumerRoot: string,
  consumerPackage: PackageManifest,
  candidate: PackedCandidate,
): Promise<void> {
  const fileDependencies = Object.entries(consumerPackage.dependencies ?? {}).filter(
    ([, version]) => version.startsWith('file:'),
  );
  if (fileDependencies.length !== 1 || fileDependencies[0]?.[0] !== candidate.name) {
    throw new Error('Only the packed Localization candidate may use the file protocol.');
  }
  const lockfile = await readFile(path.join(consumerRoot, 'bun.lock'), 'utf8');
  if (!lockfile.includes(candidate.filename)) {
    throw new Error('Consumer lockfile does not resolve the actual packed candidate tarball.');
  }
  if (/\b(?:link|workspace):/u.test(lockfile)) {
    throw new Error('Packed consumer retained an unpublished source dependency protocol.');
  }
}

function assertGeneratedDependency(
  consumerPackage: PackageManifest,
  localization: PackageIdentity,
): void {
  if (Reflect.get(consumerPackage.dependencies ?? {}, localization.name) !== localization.version) {
    throw new Error('Generated expo-localization requirement does not match EXPO_PLATFORM.');
  }
}

async function assertGeneratedSourcesAsync(
  consumerRoot: string,
  consumerPackage: PackageManifest,
): Promise<void> {
  const provider = await readFile(
    path.join(consumerRoot, 'src/modules/localization/LocalizationProvider.tsx'),
    'utf8',
  );
  const appConfig = await readFile(path.join(consumerRoot, 'app.config.ts'), 'utf8');
  const germanDictionary = await readFile(
    path.join(consumerRoot, 'src/modules/localization/locales/de.json'),
    'utf8',
  );
  const activeFiles = `${JSON.stringify(consumerPackage)}\n${provider}\n${appConfig}`;
  if (!provider.includes('ExpoLocalization.getLocales()[0].languageTag')) {
    throw new Error('Generated provider does not use the current getLocales() API.');
  }
  if (provider.includes('ExpoLocalization as')) {
    throw new Error('Generated provider retained the obsolete locale property fallback.');
  }
  if (!appConfig.includes('supportedLocales: ["en","de"]')) {
    throw new Error('Generated config plugin does not project configured locales.');
  }
  if (!germanDictionary.includes('Hallo')) {
    throw new Error('Generated German translation resource is missing.');
  }
  if (activeFiles.includes('~17.0.8')) {
    throw new Error('Packed consumer retained historical SDK 54 package truth.');
  }
}

async function assertInstalledPackageAsync(
  consumerRoot: string,
  expectedPackage: PackageIdentity,
  requiredRange: string,
): Promise<void> {
  const installedPackage = await readPackageManifestAsync(
    path.join(consumerRoot, 'node_modules', expectedPackage.name, 'package.json'),
  );
  if (
    installedPackage.name !== expectedPackage.name ||
    typeof installedPackage.version !== 'string' ||
    !Bun.semver.satisfies(installedPackage.version, requiredRange)
  ) {
    throw new Error(
      `Packed consumer did not resolve ${expectedPackage.name} within ${requiredRange}.`,
    );
  }
}

async function assertReleasedGraphAsync(
  consumerRoot: string,
  expectedPackages: ExpectedPackageGraph,
): Promise<void> {
  const requirements: readonly (readonly [PackageIdentity, string])[] = [
    [expectedPackages.runtime, expectedPackages.runtimeRequirement],
    [expectedPackages.surface, expectedPackages.surfaceRequirement],
    [expectedPackages.zora, expectedPackages.zoraRequirement],
  ];
  await Promise.all(
    requirements.map(async ([expectedPackage, requiredRange]) =>
      assertInstalledPackageAsync(consumerRoot, expectedPackage, requiredRange),
    ),
  );
  const graph = await listInstalledGraphAsync(consumerRoot);
  if (/@ankhorage\/(?:zora|surface)@2(?:\.|\s|$)/u.test(graph)) {
    throw new Error('Packed consumer retained a ZORA 2 or Surface 2 dependency.');
  }
  console.log(`Packed Localization graph:\n${graph}`);
}

async function listInstalledGraphAsync(consumerRoot: string): Promise<string> {
  const process = Bun.spawn(['bun', 'pm', 'ls', '--all'], {
    cwd: consumerRoot,
    env: { ...Bun.env, CI: '1' },
    stdout: 'pipe',
    stderr: 'inherit',
  });
  const output = await new Response(process.stdout).text();
  const exitCode = await process.exited;
  if (exitCode !== 0) {
    throw new Error(`bun pm ls --all failed with exit code ${exitCode}.`);
  }
  return output.trim();
}

async function readPackageManifestAsync(packagePath: string): Promise<PackageManifest> {
  return JSON.parse(await readFile(packagePath, 'utf8')) as PackageManifest;
}

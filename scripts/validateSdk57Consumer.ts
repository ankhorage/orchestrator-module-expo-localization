import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { EXPO_PLATFORM } from '@ankhorage/expo-runtime/platform';

import { assertSdk57LocalizationConsumerAsync } from './assertSdk57LocalizationConsumerAsync';
import { writeSdk57LocalizationConsumerFixtureAsync } from './writeSdk57LocalizationConsumerFixtureAsync';

interface CommandOptions {
  readonly capture?: boolean;
  readonly env?: Readonly<Record<string, string>>;
}

interface PackedCandidate {
  readonly filename: string;
  readonly name: string;
  readonly version: string;
}

interface PackageManifest {
  readonly dependencies?: Readonly<Record<string, string>>;
  readonly name?: string;
  readonly peerDependencies?: Readonly<Record<string, string>>;
  readonly version?: string;
}

interface ExpectedPackageGraph {
  readonly runtime: PackageIdentity;
  readonly runtimeRequirement: string;
  readonly surface: PackageIdentity;
  readonly surfaceRequirement: string;
  readonly zora: PackageIdentity;
  readonly zoraRequirement: string;
}

interface PackageIdentity {
  readonly name: string;
  readonly version: string;
}

interface PlatformProjection {
  readonly localization: { readonly name: string; readonly version: string };
  readonly runtime: Readonly<Record<string, { readonly name: string; readonly version: string }>>;
  readonly expoRouter: { readonly name: string; readonly version: string };
  readonly metroRuntime: { readonly name: string; readonly version: string };
  readonly requiredPeers: readonly { readonly name: string; readonly version: string }[];
  readonly tooling: {
    readonly typescript: { readonly name: string; readonly version: string };
  };
}

const repositoryRoot = path.resolve(import.meta.dir, '..');
const scratchRoot = await mkdtemp(path.join(tmpdir(), 'expo-localization-sdk57-'));
const candidatePackageName = '@ankhorage/orchestrator-module-expo-localization';

try {
  const candidateDirectory = path.join(scratchRoot, 'candidate');
  const consumerRoot = path.join(scratchRoot, 'consumer');
  await mkdir(candidateDirectory, { recursive: true });
  await mkdir(path.join(consumerRoot, 'src/app'), { recursive: true });

  await runAsync('bun', ['run', 'build'], repositoryRoot);
  const packOutput = await runAsync(
    'npm',
    ['pack', '--json', '--pack-destination', candidateDirectory],
    repositoryRoot,
    {
      capture: true,
      env: { npm_config_cache: path.join(scratchRoot, 'npm-cache') },
    },
  );
  const [candidate] = JSON.parse(packOutput) as PackedCandidate[];
  if (!candidate) throw new Error('npm pack did not report a candidate artifact.');
  if (candidate.name !== candidatePackageName) {
    throw new Error(`npm pack reported unexpected candidate name: ${candidate.name}.`);
  }
  const candidatePath = path.join(candidateDirectory, candidate.filename);

  const repositoryPackage = await readPackageManifestAsync(
    path.join(repositoryRoot, 'package.json'),
  );
  const runtimePackage = await readPackageManifestAsync(
    path.join(repositoryRoot, 'node_modules/@ankhorage/expo-runtime/package.json'),
  );
  const surfacePackage = await readPackageManifestAsync(
    path.join(repositoryRoot, 'node_modules/@ankhorage/surface/package.json'),
  );
  const zoraPackage = await readPackageManifestAsync(
    path.join(repositoryRoot, 'node_modules/@ankhorage/zora/package.json'),
  );
  const expectedPackages: ExpectedPackageGraph = {
    runtime: requirePackageIdentity(runtimePackage, '@ankhorage/expo-runtime'),
    runtimeRequirement: requireVersion(repositoryPackage.dependencies, '@ankhorage/expo-runtime'),
    surface: requirePackageIdentity(surfacePackage, '@ankhorage/surface'),
    surfaceRequirement: requireVersion(zoraPackage.dependencies, '@ankhorage/surface'),
    zora: requirePackageIdentity(zoraPackage, '@ankhorage/zora'),
    zoraRequirement: requireVersion(repositoryPackage.peerDependencies, '@ankhorage/zora'),
  };
  const adminViewDependencies = {
    ...zoraPackage.peerDependencies,
    [expectedPackages.zora.name]: expectedPackages.zoraRequirement,
  };

  const expectedPlatform: PlatformProjection = {
    localization: EXPO_PLATFORM.packages.localization,
    runtime: EXPO_PLATFORM.runtime,
    expoRouter: EXPO_PLATFORM.navigation.expoRouter,
    metroRuntime: EXPO_PLATFORM.packages.metroRuntime,
    requiredPeers: [
      EXPO_PLATFORM.packages.camera,
      EXPO_PLATFORM.packages.constants,
      EXPO_PLATFORM.packages.linking,
      EXPO_PLATFORM.navigation.safeArea,
    ],
    tooling: { typescript: EXPO_PLATFORM.tooling.typescript },
  };

  await writeSdk57LocalizationConsumerFixtureAsync(
    consumerRoot,
    candidatePath,
    expectedPlatform,
    adminViewDependencies,
  );
  await runAsync('bun', ['install'], consumerRoot);

  const platform = JSON.parse(
    await runAsync(
      'bun',
      [
        '-e',
        "import { EXPO_PLATFORM } from '@ankhorage/expo-runtime/platform'; console.log(JSON.stringify({ localization: EXPO_PLATFORM.packages.localization, runtime: EXPO_PLATFORM.runtime, expoRouter: EXPO_PLATFORM.navigation.expoRouter, metroRuntime: EXPO_PLATFORM.packages.metroRuntime, requiredPeers: [EXPO_PLATFORM.packages.camera, EXPO_PLATFORM.packages.constants, EXPO_PLATFORM.packages.linking, EXPO_PLATFORM.navigation.safeArea], tooling: { typescript: EXPO_PLATFORM.tooling.typescript } }));",
      ],
      consumerRoot,
      { capture: true },
    ),
  ) as PlatformProjection;
  if (
    JSON.stringify(toVersionPolicyShape(platform)) !==
    JSON.stringify(toVersionPolicyShape(expectedPlatform))
  ) {
    throw new Error('Consumer resolved a different released platform contract.');
  }
  await writeApplyScriptAsync(consumerRoot);
  await runAsync('bun', ['apply-module.ts'], consumerRoot);
  await assertSdk57LocalizationConsumerAsync({
    candidate,
    consumerRoot,
    expectedPackages,
    localization: platform.localization,
  });

  await runAsync('bunx', ['expo', 'install', '--check'], consumerRoot);
  await runAsync('bunx', ['expo-doctor'], consumerRoot);
  await runAsync('bunx', ['tsc', '--noEmit', '-p', 'tsconfig.json'], consumerRoot);
  await runAsync('bunx', ['react-compiler-healthcheck@latest'], consumerRoot);
  await runAsync('bunx', ['expo', 'export', '--platform', 'web', '--clear'], consumerRoot);
  await runAsync('bunx', ['expo', 'export', '--platform', 'android', '--clear'], consumerRoot);
  await runAsync('bunx', ['expo', 'export', '--platform', 'ios', '--clear'], consumerRoot);
  await runAsync(
    'bunx',
    ['expo', 'prebuild', '--clean', '--no-install', '--platform', 'android'],
    consumerRoot,
  );
  await runAsync(
    'bunx',
    ['expo', 'prebuild', '--clean', '--no-install', '--platform', 'ios'],
    consumerRoot,
  );
  await assertNativeLocalesAsync(consumerRoot);

  console.log('SDK 57 packed Localization consumer acceptance passed for Web, Android, and iOS.');
} finally {
  await rm(scratchRoot, { recursive: true, force: true });
}

function toVersionPolicyShape(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toVersionPolicyShape);
  if (typeof value !== 'object' || value === null) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      key === 'version' && typeof entry === 'string'
        ? entry.replace(/^\D*(\d+\.\d+)(?:\.\d+)?(?:\D.*)?$/u, '$1.x')
        : toVersionPolicyShape(entry),
    ]),
  );
}

async function assertNativeLocalesAsync(consumerRoot: string): Promise<void> {
  const androidLocales = await readFile(
    path.join(consumerRoot, 'android/app/src/main/res/xml/locales_config.xml'),
    'utf8',
  );
  const iosInfoPlist = await readFile(
    path.join(consumerRoot, 'ios/ExpoLocalizationAcceptance/Info.plist'),
    'utf8',
  );

  for (const locale of ['en', 'de']) {
    if (!androidLocales.includes(`android:name="${locale}"`)) {
      throw new Error(`Android prebuild is missing supported locale ${locale}.`);
    }
    if (!iosInfoPlist.includes(`<string>${locale}</string>`)) {
      throw new Error(`iOS prebuild is missing supported locale ${locale}.`);
    }
  }
}

async function readPackageManifestAsync(packagePath: string): Promise<PackageManifest> {
  return JSON.parse(await readFile(packagePath, 'utf8')) as PackageManifest;
}

function requirePackageIdentity(manifest: PackageManifest, expectedName: string): PackageIdentity {
  if (manifest.name !== expectedName || typeof manifest.version !== 'string') {
    throw new Error(`Expected installed released package ${expectedName}.`);
  }
  return { name: manifest.name, version: manifest.version };
}

function requireVersion(
  versions: Readonly<Record<string, string>> | undefined,
  packageName: string,
): string {
  const version = Reflect.get(versions ?? {}, packageName) as unknown;
  if (typeof version !== 'string') {
    throw new Error(`Missing released requirement for ${packageName}.`);
  }
  return version;
}

async function runAsync(
  command: string,
  args: readonly string[],
  cwd: string,
  options: CommandOptions = {},
): Promise<string> {
  const process = Bun.spawn([command, ...args], {
    cwd,
    env: { ...Bun.env, CI: '1', ...options.env },
    stdout: options.capture ? 'pipe' : 'inherit',
    stderr: 'inherit',
  });
  const output = options.capture ? await new Response(process.stdout).text() : '';
  const exitCode = await process.exited;
  if (exitCode !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${exitCode}.`);
  }
  return output.trim();
}

async function writeApplyScriptAsync(consumerRoot: string): Promise<void> {
  await writeFile(
    path.join(consumerRoot, 'apply-module.ts'),
    `import { createOrchestrator } from '@ankhorage/orchestrator';
import { expoLocalizationModule } from '@ankhorage/orchestrator-module-expo-localization';
import { EXPO_PLATFORM } from '@ankhorage/expo-runtime/platform';

const actions = await expoLocalizationModule.plan({
  projectRoot: process.cwd(),
  moduleId: expoLocalizationModule.id,
  config: { defaultLocale: 'en', locales: ['en', 'de'] },
});
const packageAction = actions.find((action) => action.type === 'ensure-packages');
if (!packageAction?.add.some((dependency) =>
  dependency.name === EXPO_PLATFORM.packages.localization.name &&
  dependency.version === EXPO_PLATFORM.packages.localization.version
)) {
  throw new Error('Module plan does not consume the installed public platform contract.');
}

const orchestrator = createOrchestrator({
  modules: [expoLocalizationModule],
  projectRoot: process.cwd(),
});
await orchestrator.installModule(expoLocalizationModule.id, {
  config: { defaultLocale: 'en', locales: ['en', 'de'] },
});
`,
    'utf8',
  );
}

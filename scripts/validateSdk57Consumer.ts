import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { EXPO_PLATFORM } from '@ankhorage/expo-runtime/platform';

import { writeSdk57LocalizationConsumerFixtureAsync } from './writeSdk57LocalizationConsumerFixtureAsync';

interface CommandOptions {
  readonly capture?: boolean;
  readonly env?: Readonly<Record<string, string>>;
}

interface PackedCandidate {
  readonly filename: string;
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
  const candidatePath = path.join(candidateDirectory, candidate.filename);

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

  await writeSdk57LocalizationConsumerFixtureAsync(consumerRoot, candidatePath, expectedPlatform);
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
  if (JSON.stringify(platform) !== JSON.stringify(expectedPlatform)) {
    throw new Error('Consumer resolved a different released platform contract.');
  }
  await writeApplyScriptAsync(consumerRoot);
  await runAsync('bun', ['apply-module.ts'], consumerRoot);
  await assertGeneratedConsumerAsync(consumerRoot, platform);

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

async function assertGeneratedConsumerAsync(
  consumerRoot: string,
  platform: PlatformProjection,
): Promise<void> {
  const candidatePackage = JSON.parse(
    await readFile(
      path.join(
        consumerRoot,
        'node_modules/@ankhorage/orchestrator-module-expo-localization/package.json',
      ),
      'utf8',
    ),
  ) as { version?: string };
  if (candidatePackage.version !== '0.5.2') {
    throw new Error(`Unexpected packed candidate version: ${String(candidatePackage.version)}.`);
  }

  const packageJson = JSON.parse(
    await readFile(path.join(consumerRoot, 'package.json'), 'utf8'),
  ) as { dependencies?: Record<string, string> };
  if (packageJson.dependencies?.[platform.localization.name] !== platform.localization.version) {
    throw new Error('Generated expo-localization requirement does not match EXPO_PLATFORM.');
  }

  const provider = await readFile(
    path.join(consumerRoot, 'src/modules/localization/LocalizationProvider.tsx'),
    'utf8',
  );
  const appConfig = await readFile(path.join(consumerRoot, 'app.config.ts'), 'utf8');
  const germanDictionary = await readFile(
    path.join(consumerRoot, 'src/modules/localization/locales/de.json'),
    'utf8',
  );
  const activeFiles = `${JSON.stringify(packageJson)}\n${provider}\n${appConfig}`;

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

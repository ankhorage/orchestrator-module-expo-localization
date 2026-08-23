import { createConfig } from '@ankhorage/devtools/eslint';

export default [
  ...createConfig({
    files: ['scripts/**/*.ts'],
    project: ['./tsconfig.scripts.json'],
    tsconfigRootDir: import.meta.dirname,
  }),
  ...createConfig({
    files: ['test/**/*.ts'],
    project: ['./tsconfig.eslint.json'],
    tsconfigRootDir: import.meta.dirname,
  }),
  {
    name: 'localization/legacy-object-indexing',
    files: [
      'src/admin-view/readSnapshot.ts',
      'src/admin/runtime.ts',
      'src/authoring.ts',
      'src/resources.ts',
      'src/templateFiles.ts',
    ],
    rules: {
      'security/detect-object-injection': 'off',
    },
  },
  {
    name: 'localization/legacy-test-function-size',
    files: [
      'test/adminRuntimeLink.test.ts',
      'test/authoring.test.ts',
      'test/config.test.ts',
      'test/host.test.ts',
      'test/resources.test.ts',
    ],
    rules: {
      'max-lines-per-function': 'off',
    },
  },
];

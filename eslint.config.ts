import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: [
      'local/**',
      'outputs/**',
      'dist/**',
      'coverage/**',
      '.cache/**',
      '.pnpm-store/**',
      'bin/stellar.mjs',
      'assets/viewer/app.js',
      'types/generated/**',
    ],
  },
  { ...js.configs.recommended, files: ['**/*.js', '**/*.mjs'] },
  { languageOptions: { globals: globals.node } },
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: [
      'bin/**/*.ts',
      'lib/**/*.ts',
      'scripts/**/*.ts',
      'test/**/*.ts',
      'viewer/**/*.ts',
      'eslint.config.ts',
    ],
  })),
  {
    files: [
      'bin/**/*.ts',
      'lib/**/*.ts',
      'scripts/**/*.ts',
      'test/**/*.ts',
      'viewer/**/*.ts',
      'eslint.config.ts',
    ],
    linterOptions: { noInlineConfig: true },
    languageOptions: {
      parserOptions: {
        project: [
          './tsconfig.json',
          './tsconfig.viewer.json',
          './tsconfig.browser-tests.json',
        ],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        { assertionStyle: 'as' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': true,
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-check': false,
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSAsExpression[expression.type="TSAsExpression"]',
          message: 'Double assertions do not establish type safety.',
        },
      ],
    },
  },
  {
    files: ['test/types/**/*.ts'],
    rules: {
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-check': false,
        },
      ],
    },
  },
  {
    files: ['viewer/**/*.ts'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['test/browser/*.ts'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    rules: {
      'no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
    },
  },
];

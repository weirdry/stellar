import js from '@eslint/js';
import globals from 'globals';

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
    ],
  },
  js.configs.recommended,
  { languageOptions: { globals: globals.node } },
  {
    files: ['assets/viewer/*.js'],
    languageOptions: { sourceType: 'script', globals: globals.browser },
  },
  {
    files: ['test/browser/*.js'],
    languageOptions: { globals: globals.browser },
  },
  {
    rules: {
      'no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
    },
  },
];

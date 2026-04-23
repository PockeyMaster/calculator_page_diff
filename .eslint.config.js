/** @type {import('eslint').Linter.FlatConfig[]} */
const tsParser = require('@typescript-eslint/parser');
module.exports = [
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': 'off',
      'curly': ['error', 'all'],
    },
  },
];


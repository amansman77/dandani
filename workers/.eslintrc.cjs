module.exports = {
  root: true,
  env: {
    es2022: true,
    worker: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  globals: {
    AbortController: 'readonly',
    Intl: 'readonly',
  },
  extends: ['eslint:recommended'],
  ignorePatterns: ['src/legacy/**'],
};

module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  rules: {
    'no-unused-vars': 'warn',
    'no-undef': 'off', // Turn off for test files
  },
  env: {
    node: true,
    es6: true,
    jest: true,
  },
};

module.exports = {
  env: {
    es2021: true,
    node: true,
  },
  extends: ['prettier', 'plugin:prettier/recommended'],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'script',
  },
  plugins: ['prettier'],
  rules: {
    'no-use-before-define': 0,
    'prettier/prettier': 'error',
  },
};

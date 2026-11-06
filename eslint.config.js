const js = require('@eslint/js');
const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const importPlugin = require('eslint-plugin-import');
const reactPlugin = require('eslint-plugin-react');
const hooksPlugin = require('eslint-plugin-react-hooks');
const promisePlugin = require('eslint-plugin-promise');

module.exports = [
  {
    ignores: [
      '**/node_modules/**',
      'release/app/dist/**',
      'release/build/**',
      '.erb/dll/**',
      '**/coverage/**',
      '**/*.css.d.ts',
      '**/*.sass.d.ts',
      '**/*.scss.d.ts',
    ],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      import: importPlugin,
      react: reactPlugin,
      'react-hooks': hooksPlugin,
      promise: promisePlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...{
        'import/no-extraneous-dependencies': 'off',
        'react/react-in-jsx-scope': 'off',
        'react/jsx-filename-extension': 'off',
        'import/extensions': 'off',
        'import/no-unresolved': 'off',
        'import/no-import-module-exports': 'off',
        'no-shadow': 'off',
        '@typescript-eslint/no-shadow': 'error',
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': [
          'error',
          {
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
          },
        ],
        'lines-between-class-members': 'off',
        'no-restricted-globals': 'off',
        'react/jsx-no-useless-fragment': 'off',
        'import/prefer-default-export': 'off',
        'no-undef': 'off',
        'react/jsx-props-no-spreading': 'off',
        'no-underscore-dangle': 'off',
        'react/require-default-props': 'off',
        'react/function-component-definition': 'off',
        'no-plusplus': 'off',
      },
    },
    settings: {
      'import/resolver': {
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
          moduleDirectory: ['node_modules', 'src/'],
        },
        webpack: {
          config: require.resolve('./.erb/configs/webpack.config.eslint.ts'),
        },
        typescript: {},
      },
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx'],
      },
    },
  },
  {
    files: ['src/ipc/Utility.ts'],
    rules: { '@typescript-eslint/no-unused-vars': 'off' },
  },
];

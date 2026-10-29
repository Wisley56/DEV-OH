import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

/** Regras extras para código React (navegador). */
export default [
  {
    files: ['**/*.tsx', '**/*.ts'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];

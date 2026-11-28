import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'dev-dist/**', 'backend/functions/lib/**'],
  },
  firebaseRulesPlugin.configs['flat/recommended'],
];

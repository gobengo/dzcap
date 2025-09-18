import {jsdoc} from 'eslint-plugin-jsdoc';
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from 'typescript-eslint';
import eslint from '@eslint/js';

export default defineConfig([
  jsdoc({
    config: 'flat/recommended',
    rules: {
      'jsdoc/require-param-type': 'off',
      'jsdoc/require-returns-type': 'off',
    }
  }),
  globalIgnores(['lib']),
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    }
  }
]);

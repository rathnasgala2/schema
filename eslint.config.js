import eslint from '@eslint/js';
import jsdoc from 'eslint-plugin-jsdoc';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '.build/**',
      'coverage/**',
      'generated/**',
      'node_modules/**',
      'types/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      jsdoc,
    },
    languageOptions: {
      ecmaVersion: 2024,
      globals: globals.node,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      sourceType: 'module',
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
    rules: {
      'jsdoc/check-types': 'error',
      'jsdoc/require-jsdoc': [
        'error',
        {
          publicOnly: { cjs: false, esm: true, window: false },
          require: {
            ArrowFunctionExpression: true,
            ClassDeclaration: true,
            ClassExpression: true,
            FunctionDeclaration: true,
            FunctionExpression: true,
            MethodDefinition: true,
          },
        },
      ],
      'jsdoc/require-param': 'error',
      'jsdoc/require-param-type': 'error',
      'jsdoc/require-returns': 'error',
      'jsdoc/require-returns-type': 'error',
    },
  },
  {
    // src/ is the browser-consumed package surface (SCH-M14): most of it
    // must stay free of Node globals (Buffer, process, __dirname, ...), the
    // same invariant scripts/check-browser-safety.mjs enforces mechanically
    // for the actual reachable-from-exports graph. Giving it browser globals
    // here means a bare, unimported Buffer/process is a lint error
    // (no-undef, from eslint's recommended config) at authoring time, not
    // only a build-time gate failure.
    // src/internal/frozen-envelope.js is the one deliberate exception: it is
    // Node-only by design (SCH-H6/H7 -- compares byte strings through
    // Buffer, not reachable from any browser-consumed export), so it keeps
    // Node globals via the override below instead.
    files: ['src/**/*.js'],
    ignores: ['src/internal/frozen-envelope.js'],
    languageOptions: {
      // Flat config merges languageOptions.globals across matching configs
      // instead of replacing it, so spreading globals.browser over the base
      // config's globals.node would leave every Node-only global (Buffer,
      // process, require, ...) still declared. Explicitly turning each of
      // them off is what actually makes a bare reference a no-undef error.
      globals: {
        ...globals.browser,
        __dirname: 'off',
        __filename: 'off',
        Buffer: 'off',
        clearImmediate: 'off',
        exports: 'off',
        global: 'off',
        module: 'off',
        process: 'off',
        require: 'off',
        setImmediate: 'off',
      },
    },
  },
  {
    files: ['src/internal/frozen-envelope.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
);

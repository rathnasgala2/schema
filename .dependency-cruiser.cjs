/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular-dependencies',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'runtime-does-not-import-repository-tooling',
      severity: 'error',
      from: { path: '^src/' },
      to: { path: '^(codegen|scripts|test)/' },
    },
    {
      // SCH-M15: the actual architectural invariant this package cares
      // about for its browser-consumed surface -- not just "src/ does not
      // import repo tooling" (above), but "the browser-reachable subtree
      // does not import a Node builtin at all". src/internal/frozen-envelope.js
      // is the one deliberate exception (Node-only by design, SCH-H6/H7 --
      // compares byte strings through Buffer, not reachable from any
      // browser-consumed export; eslint.config.js's SCH-M14 override
      // documents the same carve-out for lint).
      name: 'browser-safe-subtree-does-not-import-a-node-core-module',
      severity: 'error',
      from: { path: '^src/', pathNot: '^src/internal/frozen-envelope\\.js$' },
      to: { dependencyTypes: ['core'] },
    },
    {
      // Every module under src/internal/ must be reachable from at least
      // one of the four declared JS export entry points, or it is shipped
      // as product code while being unreachable repository tooling (the
      // exact shape SCH-H6 found and fixed by moving the truly-unreachable
      // modules to scripts/internal-semantics/). src/internal/schema-validator.js
      // is the one documented exception: the runtime-compiled (ajv.compile())
      // registry used only by scripts/validator-parity.mjs's Node-only
      // fixture and parity tooling, not by any browser-consumed export
      // (README.md's "Package layout" section states this explicitly).
      name: 'src-internal-module-is-reachable-from-a-declared-export',
      severity: 'error',
      from: {
        path: '^src/(index|runtime-origins|digest-profiles|frozen-envelope)\\.js$',
      },
      to: {
        path: '^src/internal/',
        pathNot: '^src/internal/schema-validator\\.js$',
        reachable: false,
      },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    enhancedResolveOptions: { exportsFields: ['exports'] },
  },
};

import relay from 'eslint-plugin-relay';

/** @type {import('eslint').Linter.Config[]} */
export default [
  // Relay — GraphQL syntax, naming, unused fields, colocated fragments, hooks
  {
    plugins: { relay },
    rules: {
      ...relay.configs['ts-recommended'].rules,
      'relay/unused-fields': 'error',
      'relay/must-colocate-fragment-spreads': 'error',
      'relay/hook-required-argument': 'error',
    },
  },

  // Ignore generated Relay artifacts
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '.next/**',
      '.yalc/**',
      '**/.tsbuildinfo',
      'next-env.d.ts',
      '**/__generated__/**',
      'schema.graphql',
    ],
  },
];

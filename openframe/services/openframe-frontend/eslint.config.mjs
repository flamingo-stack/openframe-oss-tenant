import nextConfig from 'eslint-config-next';
import relay from 'eslint-plugin-relay';

/** @type {import('eslint').Linter.Config[]} */
export default [
  // Next.js defaults (React, JSX-a11y, import, etc.)
  ...nextConfig,

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
    ignores: ['src/__generated__/**'],
  },
];

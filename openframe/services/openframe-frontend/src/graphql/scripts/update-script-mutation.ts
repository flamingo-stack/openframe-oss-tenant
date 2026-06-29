import { graphql } from 'react-relay';

/**
 * Selects every editable field (mirrors `scriptDetailRelayQuery`) so Relay merges
 * the full updated node into the store by `id`. Without this, only the returned
 * fields refresh and the detail page would have to wait on its `store-and-network`
 * refetch to reconcile the rest. Keep this selection in sync with the detail query.
 */
export const updateScriptMutation = graphql`
  mutation updateScriptMutation($input: UpdateScriptInput!) {
    updateScript(input: $input) {
      id
      name
      description
      shell
      privilegeLevel
      scriptBody
      tags {
        id
        key
      }
      supportedPlatforms
      defaultTimeoutSeconds
      defaultArgs
      envVars {
        name
        value
        secret
      }
      status
    }
  }
`;

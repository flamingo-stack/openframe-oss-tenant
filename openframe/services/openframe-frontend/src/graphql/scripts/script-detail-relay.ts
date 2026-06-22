import { graphql } from 'react-relay';

/**
 * Single script query (v2). Resolves every field the detail / edit / run
 * views need from the native OpenFrame GraphQL API.
 */
export const scriptDetailRelayQuery = graphql`
  query scriptDetailRelayQuery($id: ID!) {
    script(id: $id) {
      id
      name
      description
      shell
      scriptBody
      tag
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

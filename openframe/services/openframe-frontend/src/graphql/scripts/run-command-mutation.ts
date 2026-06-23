import { graphql } from 'react-relay';

/**
 * Ad-hoc command dispatch (v2). Used by "Test Script" to run the current,
 * possibly-unsaved script body on a device without persisting a script.
 * Returns only an executionId — the result is delivered asynchronously
 * (Logs / Notifications), the schema has no synchronous output channel.
 */
export const runCommandMutation = graphql`
  mutation runCommandMutation($input: RunCommandInput!) {
    runCommand(input: $input) {
      executionId
    }
  }
`;

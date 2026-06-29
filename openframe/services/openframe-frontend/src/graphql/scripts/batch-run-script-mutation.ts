import { graphql } from 'react-relay';

/**
 * Dispatch one saved script to several machines at once over NATS, under a single
 * shared executionId (vs `runScript`, which targets a single machine). Nothing is
 * persisted — the script body / shell / env-vars are resolved server-side.
 */
export const batchRunScriptMutation = graphql`
  mutation batchRunScriptMutation($input: BatchRunScriptInput!) {
    batchRunScript(input: $input) {
      executionId
    }
  }
`;

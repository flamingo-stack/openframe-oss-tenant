import { graphql } from 'react-relay';

export const runScriptMutation = graphql`
  mutation runScriptMutation($input: RunScriptInput!) {
    runScript(input: $input) {
      executionId
    }
  }
`;

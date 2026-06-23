import { graphql } from 'react-relay';

export const createScriptMutation = graphql`
  mutation createScriptMutation($input: CreateScriptInput!) {
    createScript(input: $input) {
      id
      name
    }
  }
`;

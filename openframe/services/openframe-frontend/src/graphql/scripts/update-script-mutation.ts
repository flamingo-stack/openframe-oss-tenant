import { graphql } from 'react-relay';

export const updateScriptMutation = graphql`
  mutation updateScriptMutation($input: UpdateScriptInput!) {
    updateScript(input: $input) {
      id
      name
    }
  }
`;

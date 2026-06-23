import { graphql } from 'react-relay';

export const deleteTimeEntryMutation = graphql`
  mutation deleteTimeEntryMutation($id: ID!) {
    deleteTimeEntry(id: $id)
  }
`;

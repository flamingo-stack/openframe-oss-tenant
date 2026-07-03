import { graphql } from 'react-relay';

/**
 * Restores an archived script back to ACTIVE. `@deleteEdge(connections:)` removes
 * its edge from the Archived list's connection WITHOUT deleting the Script record,
 * so the row disappears immediately while the record stays fetchable by id; the
 * active Scripts page refetches (`store-and-network`) on navigation and shows it
 * there. See `archive-script-mutation.ts` for why this is `@deleteEdge`, not
 * `@deleteRecord`.
 */
export const unarchiveScriptMutation = graphql`
  mutation unarchiveScriptMutation($id: ID!, $connections: [ID!]!) {
    unarchiveScript(id: $id) {
      id @deleteEdge(connections: $connections)
    }
  }
`;

import { graphql } from 'react-relay';

/**
 * Archives a script (status → ARCHIVED). `@deleteEdge(connections:)` removes the
 * script's edge from the active list's connection WITHOUT deleting the Script
 * record — so the row disappears immediately, yet the record stays in the store
 * (the sidebar chat / detail page can still fetch it by id) and a later
 * `script(id:)` fetch never resurrects the removed row. The Archived page
 * refetches (`store-and-network`) on navigation and shows it there.
 *
 * NOT `@deleteRecord`: deleting the record left a dangling null-node edge AND let
 * any later `script(id:)` fetch re-create the record → the archived row reappeared
 * in the list.
 */
export const archiveScriptMutation = graphql`
  mutation archiveScriptMutation($id: ID!, $connections: [ID!]!) {
    archiveScript(id: $id) {
      id @deleteEdge(connections: $connections)
    }
  }
`;

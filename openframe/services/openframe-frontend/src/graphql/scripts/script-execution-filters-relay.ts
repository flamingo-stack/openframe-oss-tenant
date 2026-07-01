import { graphql } from 'react-relay';

/**
 * Server-driven "Executed by" facet for a script's execution history. The
 * initiator set can't be enumerated from a paginated list, so the backend
 * returns the complete set of distinct initiators (value = user id, matching the
 * `ScriptExecutionFilterInput.initiatorIds` server filter).
 *
 * Scoped to the script only (no status/initiator/search narrowing) so the list
 * stays complete and stable as the user filters.
 */
export const scriptExecutionFiltersRelayQuery = graphql`
  query scriptExecutionFiltersRelayQuery($scriptId: ID!) {
    scriptExecutionFilters(scriptId: $scriptId) {
      initiators {
        value
        label
        count
      }
    }
  }
`;

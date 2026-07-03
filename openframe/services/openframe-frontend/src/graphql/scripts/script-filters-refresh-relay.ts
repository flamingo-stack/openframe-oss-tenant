import { graphql } from 'react-relay';

/**
 * Imperative refresh of the scripts-list filter facets after a list-membership
 * mutation (archive/unarchive): the facets normally ride the list operation
 * (see `scriptsTableRelayQuery`), but a mutation that removes a row via
 * `@deleteEdge` leaves the previously-fetched facets stale — a shell/platform/
 * author whose last script just left the scope would still be offered.
 *
 * Selects the SAME `scriptFilters(filter)` field with the same fields as the
 * list operation, so `fetchQuery(...).subscribe({})` writes into the same store
 * records and every mounted subscriber (the list's facet dropdowns) re-renders
 * with the fresh sets — without refetching the list itself (which `@deleteEdge`
 * already updated locally).
 */
export const scriptFiltersRefreshRelayQuery = graphql`
  query scriptFiltersRefreshRelayQuery($filter: ScriptFilterInput) {
    scriptFilters(filter: $filter) {
      shells {
        value
        label
        count
      }
      platforms {
        value
        label
        count
      }
      authors {
        value
        label
        count
      }
    }
  }
`;

import { graphql } from 'react-relay';

/**
 * Server-driven filter facets for the scripts table — shells, platforms and the
 * "Added by" authors. Sourcing the full set from the backend (rather than a
 * hardcoded client list) keeps the options in sync with the data and surfaces
 * values a paginated list couldn't enumerate (e.g. an author whose scripts
 * haven't loaded yet). Each option carries `value` (the enum / user id used by
 * the server filter inputs) and a display `label`.
 *
 * Scoped by status only (ACTIVE vs ARCHIVED) — not by the active shell/platform/
 * author filters — so each facet stays complete and stable instead of narrowing
 * (and vanishing) as the user filters.
 */
export const scriptFiltersRelayQuery = graphql`
  query scriptFiltersRelayQuery($filter: ScriptFilterInput) {
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

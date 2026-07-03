import { graphql } from 'react-relay';

export const employeeWorkTimeRelayQuery = graphql`
  query employeeWorkTimeRelayQuery($filter: TimeEntryFilterInput, $search: String, $first: Int!, $after: String) {
    employeeTimeStats(filter: $filter) {
      todayTotalSeconds
      todayEntryCount
      periodTotalSeconds
      periodEntryCount
      averagePerDaySeconds
    }
    ...employeeWorkTimeRelay_query @arguments(filter: $filter, search: $search, first: $first, after: $after)
  }
`;

export const employeeWorkTimeRelayFragment = graphql`
  fragment employeeWorkTimeRelay_query on Query
    @refetchable(queryName: "employeeWorkTimeRelayPaginationQuery")
    @argumentDefinitions(
      filter: { type: "TimeEntryFilterInput" }
      search: { type: "String" }
      first: { type: "Int", defaultValue: 20 }
      after: { type: "String" }
    ) {
    employeeTimeEntries(
      filter: $filter
      search: $search
      sort: { field: "startedAt", direction: DESC }
      first: $first
      after: $after
    ) @connection(key: "EmployeeWorkTime_employeeTimeEntries", filters: ["filter", "search"]) {
      filteredCount
      edges {
        cursor
        node {
          ...timeEntryFields_timeEntry @relay(mask: false)
          user {
            id
            firstName
            lastName
            email
            image {
              imageUrl
              hash
            }
          }
          organization {
            id
            organizationId
            name
            image {
              imageUrl
              hash
            }
            contactInformation {
              contacts {
                email
              }
            }
          }
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`;

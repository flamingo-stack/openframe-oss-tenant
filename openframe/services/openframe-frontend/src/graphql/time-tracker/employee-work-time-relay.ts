import { graphql } from 'react-relay';

export const employeeWorkTimeRelayQuery = graphql`
  query employeeWorkTimeRelayQuery(
    $employeeId: ID!
    $period: DateRangeInput
    $search: String
    $first: Int!
    $after: String
  ) {
    employeeTimeStats(employeeId: $employeeId, period: $period) {
      todayTotalSeconds
      todayEntryCount
      periodTotalSeconds
      periodEntryCount
      averagePerDaySeconds
    }
    ...employeeWorkTimeRelay_query
      @arguments(employeeId: $employeeId, period: $period, search: $search, first: $first, after: $after)
  }
`;

export const employeeWorkTimeRelayFragment = graphql`
  fragment employeeWorkTimeRelay_query on Query
    @refetchable(queryName: "employeeWorkTimeRelayPaginationQuery")
    @argumentDefinitions(
      employeeId: { type: "ID!" }
      period: { type: "DateRangeInput" }
      search: { type: "String" }
      first: { type: "Int", defaultValue: 20 }
      after: { type: "String" }
    ) {
    employeeTimeEntries(employeeId: $employeeId, period: $period, search: $search, first: $first, after: $after)
      @connection(key: "EmployeeWorkTime_employeeTimeEntries", filters: ["employeeId", "period", "search"]) {
      filteredCount
      edges {
        cursor
        node {
          ...timeEntryFields_timeEntry @relay(mask: false)
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`;

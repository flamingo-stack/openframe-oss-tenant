package com.openframe.api.graphql;

public class LogQueries {

    public static final String LOG_FILTERS = """
            query($filter: LogFilterInput) {
                logFilters(filter: $filter) {
                    toolTypes
                    eventTypes
                    severities
                    organizations {
                        id
                        name
                    }
                }
            }
            """;

    public static final String LOGS = """
            query($filter: LogFilterInput, $search: String) {
                logs(filter: $filter, search: $search) {
                    edges {
                        node {
                            toolEventId
                            eventType
                            ingestDay
                            toolType
                            severity
                            userId
                            deviceId
                            hostname
                            organizationId
                            organizationName
                            summary
                            timestamp
                        }
                        cursor
                    }
                    pageInfo {
                        hasNextPage
                        hasPreviousPage
                        startCursor
                        endCursor
                    }
                }
            }
            """;

    public static final String LOG_DETAILS = """
            query($ingestDay: String!, $toolType: String!, $eventType: String!, $timestamp: Instant!, $toolEventId: ID!) {
                logDetails(
                    ingestDay: $ingestDay
                    toolType: $toolType
                    eventType: $eventType
                    timestamp: $timestamp
                    toolEventId: $toolEventId
                ) {
                    toolEventId
                    eventType
                    ingestDay
                    toolType
                    severity
                    userId
                    deviceId
                    hostname
                    organizationId
                    organizationName
                    message
                    timestamp
                    details
                }
            }
            """;
}

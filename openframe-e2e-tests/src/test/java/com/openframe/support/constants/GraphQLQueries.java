package com.openframe.support.constants;

/**
 * GraphQL query constants for integration tests
 * Centralized location for all GraphQL queries to improve maintainability
 */
public final class GraphQLQueries {
    
    private GraphQLQueries() {
    }
    
    // ========== LOG QUERIES ==========
    
    /**
     * Query to get available log filters
     */
    public static final String LOG_FILTERS_QUERY = """
        {
            logFilters {
                toolTypes
                eventTypes
                severities
            }
        }
        """;
    
    /**
     * Query to get recent logs with pagination
     */
    public static final String RECENT_LOGS_QUERY = """
        {
            logs(pagination: { limit: 10 }) {
                edges {
                    node {
                        toolEventId
                        eventType
                        toolType
                        severity
                        timestamp
                        ingestDay
                    }
                    cursor
                }
                pageInfo {
                    hasNextPage
                    endCursor
                }
            }
        }
        """;
    
    /**
     * Query to get log details by specific parameters
     */
    public static final String LOG_DETAILS_QUERY_TEMPLATE = """
        {
            logDetails(
                ingestDay: "%s"
                toolType: "%s"
                eventType: "%s"
                timestamp: "%s"
                toolEventId: "%s"
            ) {
                message
                details
                userId
                deviceId
            }
        }
        """;
    
    /**
     * Query to get logs filtered by tool type
     */
    public static final String FILTERED_LOGS_QUERY_TEMPLATE = """
        {
            logs(
                filter: { toolTypes: ["%s"] }
                pagination: { limit: 5 }
            ) {
                edges {
                    node {
                        toolType
                        eventType
                        severity
                    }
                }
            }
        }
        """;
    
    /**
     * Query for pagination testing - first page
     */
    public static final String PAGINATION_FIRST_PAGE_QUERY = """
        {
            logs(pagination: { limit: 2 }) {
                edges {
                    node { toolEventId }
                    cursor
                }
                pageInfo {
                    hasNextPage
                    endCursor
                }
            }
        }
        """;
    
    /**
     * Query for pagination testing - next page
     */
    public static final String PAGINATION_NEXT_PAGE_QUERY_TEMPLATE = """
        {
            logs(pagination: { limit: 2, cursor: "%s" }) {
                edges {
                    node { toolEventId }
                }
            }
        }
        """;
    
    /**
     * Query for log search functionality
     */
    public static final String LOG_SEARCH_QUERY_TEMPLATE = """
        {
            logs(
                search: "%s"
                pagination: { first: 5 }
            ) {
                edges {
                    node {
                        toolEventId
                        message
                    }
                }
            }
        }
        """;
    
    // ========== DEVICE QUERIES ==========
    
    /**
     * Query to get device filters aggregation
     */
    public static final String DEVICE_FILTERS_QUERY = """
        {
            deviceFilters {
                filteredCount
                statuses {
                    value
                    count
                }
                deviceTypes {
                    value
                    count
                }
                osTypes {
                    value
                    count
                }
                organizationIds {
                    value
                    count
                }
                tags {
                    value
                    label
                    count
                }
            }
        }
        """;

    public static final String ORGANIZATION_NAMES = """
                query {
                    organizations {
                        edges {
                            node { name }
                        }
                    }
                }
                """;

    public static final String ORGANIZATION_IDS = """
                query {
                    organizations {
                        edges {
                            node { id }
                        }
                    }
                }
                """;

    public static final String FULL_ORGANIZATION = """
                query($id: String!) {
                    organization(id: $id) {
                        id
                        name
                        organizationId
                        category
                        numberOfEmployees
                        websiteUrl
                        notes
                        contactInformation {
                            contacts {
                                contactName
                                title
                                phone
                                email
                            }
                            physicalAddress {
                                street1
                                street2
                                city
                                state
                                postalCode
                                country
                            }
                            mailingAddress {
                                street1
                                street2
                                city
                                state
                                postalCode
                                country
                            }
                            mailingAddressSameAsPhysical
                        }
                        monthlyRevenue
                        contractStartDate
                        contractEndDate
                        createdAt
                        updatedAt
                        isDefault
                        deleted
                        deletedAt
                    }
                }
                """;
    
    // ========== UTILITY METHODS ==========
    
    /**
     * Format log details query with parameters
     */
    public static String formatLogDetailsQuery(String ingestDay, String toolType, 
                                             String eventType, String timestamp, String toolEventId) {
        return String.format(LOG_DETAILS_QUERY_TEMPLATE, ingestDay, toolType, eventType, timestamp, toolEventId);
    }
    
    /**
     * Format filtered logs query with tool type
     */
    public static String formatFilteredLogsQuery(String toolType) {
        return String.format(FILTERED_LOGS_QUERY_TEMPLATE, toolType);
    }
    
    /**
     * Format pagination next page query with cursor
     */
    public static String formatPaginationNextPageQuery(String cursor) {
        return String.format(PAGINATION_NEXT_PAGE_QUERY_TEMPLATE, cursor);
    }
    
    /**
     * Format log search query with search term
     */
    public static String formatLogSearchQuery(String searchTerm) {
        return String.format(LOG_SEARCH_QUERY_TEMPLATE, searchTerm);
    }
}

package com.openframe.api.graphql;

public class DeviceQueries {

    public static final String DEVICE_IDS = """
            query($filter: DeviceFilterInput) {
                devices(filter: $filter) {
                    edges {
                        node {
                            machineId
                        }
                    }
                }
            }
            """;

    public static final String DEVICE_HOSTNAMES = """
            query($filter: DeviceFilterInput) {
                devices(filter: $filter) {
                    edges {
                        node { hostname }
                    }
                }
            }
            """;

    public static final String FULL_DEVICE = """
            query($machineId: String!) {
                device(machineId: $machineId) {
                    id
                    machineId
                    ip
                    macAddress
                    osUuid
                    agentVersion
                    status
                    lastSeen
                    organizationId
                    hostname
                    displayName
                    serialNumber
                    manufacturer
                    model
                    type
                    osType
                    osVersion
                    osBuild
                    timezone
                    registeredAt
                    updatedAt
                    tags {
                        id
                        name
                        description
                        color
                        organizationId
                        createdAt
                        createdBy
                    }
                    toolConnections {
                        id
                        machineId
                        toolType
                        agentToolId
                        status
                        metadata
                        connectedAt
                        lastSyncAt
                        disconnectedAt
                    }
                    installedAgents {
                        id
                        machineId
                        agentType
                        version
                        createdAt
                        updatedAt
                    }
                }
            }
            """;

    public static final String DEVICES_WITH_FILTER = """
            query($filter: DeviceFilterInput) {
                devices(filter: $filter) {
                    edges {
                        node {
                            id
                            machineId
                            hostname
                            displayName
                            ip
                            macAddress
                            status
                            type
                            osType
                            osVersion
                            agentVersion
                            organizationId
                            lastSeen
                            registeredAt
                            updatedAt
                        }
                    }
                    filteredCount
                }
            }
            """;

    public static final String SEARCH_DEVICE = """
            query($filter: DeviceFilterInput, $search: String) {
                devices(filter: $filter, search: $search) {
                    edges {
                        node {
                            id
                            machineId
                            hostname
                            displayName
                            ip
                            macAddress
                            status
                            type
                            osType
                            osVersion
                            agentVersion
                            organizationId
                            lastSeen
                            registeredAt
                            updatedAt
                        }
                    }
                }
            }
            """;

    public static final String DEVICE_FILTERS = """
            query {
                deviceFilters {
                    statuses { value label count }
                    deviceTypes { value label count }
                    osTypes { value label count }
                    organizationIds { value label count }
                    tags { value label count }
                    filteredCount
                }
            }
            """;
}

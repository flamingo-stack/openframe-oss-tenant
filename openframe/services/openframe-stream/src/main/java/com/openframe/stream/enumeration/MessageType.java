package com.openframe.stream.enumeration;

import lombok.Getter;

import java.util.List;

@Getter
public enum MessageType {

    MESHCENTRAL_EVENT(DataEnrichmentServiceType.INTEGRATED_TOOLS_EVENTS,
            List.of(Destination.CASSANDRA, Destination.KAFKA), DeserializerType.INTEGRATED_TOOLS_EVENTS_DESERIALIZER),
    TACTICAL_EVENT(DataEnrichmentServiceType.INTEGRATED_TOOLS_EVENTS,
            List.of(Destination.CASSANDRA, Destination.KAFKA), DeserializerType.INTEGRATED_TOOLS_EVENTS_DESERIALIZER);

    private final DataEnrichmentServiceType dataEnrichmentServiceType;

    private final List<Destination> destinationList;

    private final DeserializerType deserializerType;

    MessageType(DataEnrichmentServiceType dataEnrichmentServiceType, List<Destination> destinationList, DeserializerType deserializerType) {
        this.dataEnrichmentServiceType = dataEnrichmentServiceType;
        this.destinationList = destinationList;
        this.deserializerType = deserializerType;
    }

    //    MESH_MONGO_EVENT_TO_CASSANDRA(DebeziumMessage.DatabaseType.MONGODB, IntegratedTool.MESHCENTRAL),
//    MESH_MONGO_EVENT_TO_KAFKA(DebeziumMessage.DatabaseType.MONGODB, IntegratedTool.MESHCENTRAL),
//    TRMM_PSQL_AUDIT_LOG_TO_CASSANDRA(DebeziumMessage.DatabaseType.POSTGRESQL, IntegratedTool.TACTICAL),
//    TRMM_PSQL_AUDIT_LOG_TO_KAFKA(DebeziumMessage.DatabaseType.POSTGRESQL, IntegratedTool.TACTICAL);

//    private DebeziumMessage.DatabaseType sourceDb;
//    private IntegratedTool integratedTool;

//    MessageType(DebeziumMessage.DatabaseType sourceDb, IntegratedTool integratedTool) {
//        this.sourceDb = sourceDb;
//        this.integratedTool = integratedTool;
//    }
//
//    public DebeziumMessage.DatabaseType getSourceDb() {
//        return sourceDb;
//    }
//
//    public IntegratedTool getIntegratedTool() {
//        return integratedTool;
//    }
}

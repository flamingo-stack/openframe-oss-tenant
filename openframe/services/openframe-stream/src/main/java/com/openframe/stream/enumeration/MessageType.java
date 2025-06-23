package com.openframe.stream.enumeration;

import com.openframe.data.model.debezium.DebeziumMessage;

import java.util.List;

public enum MessageType {

    MESHCENTRAL_EVENT(List.of(Destination.CASSANDRA, Destination.KAFKA)),
    TACTICAL_EVENT(List.of(Destination.CASSANDRA, Destination.KAFKA));

    private final List<Destination> destinationList;

    MessageType(List<Destination> destinationList) {
        this.destinationList = destinationList;
    }

    public List<Destination> getDestinationList() {
        return destinationList;
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

package com.openframe.stream.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.openframe.data.model.cassandra.CassandraITEventEntity;
import com.openframe.data.model.pinot.PinotEventEntity;
import com.openframe.stream.enumeration.IntegratedTool;

public interface IntegratedToolEventTransformationService {

    IntegratedTool getIntegratedTool();
    CassandraITEventEntity transformForCassandra(JsonNode message);
    PinotEventEntity transformForKafka(JsonNode message);

}

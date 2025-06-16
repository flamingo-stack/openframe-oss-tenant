package com.openframe.stream.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.openframe.data.model.cassandra.CassandraITEventEntity;
import com.openframe.data.model.pinot.PinotEventEntity;

public interface IntegratedToolEventTransformationService {

    CassandraITEventEntity transformForCassandra(JsonNode message);
    PinotEventEntity transformForPinot(JsonNode message);

}

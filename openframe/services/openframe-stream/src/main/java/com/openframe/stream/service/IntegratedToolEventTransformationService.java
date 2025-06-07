package com.openframe.stream.service;

import com.openframe.data.model.cassandra.CassandraITEventEntity;
import com.openframe.data.model.pinot.PinotEventEntity;

public interface IntegratedToolEventTransformationService {

    CassandraITEventEntity transformForCassandra(String message);
    PinotEventEntity transformForPinot(String message);

}

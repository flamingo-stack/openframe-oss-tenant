package com.openframe.stream.service.impl;

import com.openframe.data.model.cassandra.CassandraITEventEntity;
import com.openframe.data.model.pinot.PinotEventEntity;
import com.openframe.stream.service.IntegratedToolEventTransformationService;
import org.springframework.stereotype.Service;

@Service
public class MeshcentralEventTransformationService implements IntegratedToolEventTransformationService {
    @Override
    public CassandraITEventEntity transformForCassandra(String message) {
        return null;
    }

    @Override
    public PinotEventEntity transformForPinot(String message) {
        return null;
    }
}

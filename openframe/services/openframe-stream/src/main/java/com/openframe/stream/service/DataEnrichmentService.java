package com.openframe.stream.service;

import com.openframe.data.model.debezium.DebeziumIntegratedToolMessage;
import com.openframe.data.model.debezium.ExtraParams;
import com.openframe.stream.enumeration.DataEnrichmentServiceType;

public interface DataEnrichmentService <T> {

    ExtraParams getExtraParams(T message);

    DataEnrichmentServiceType getType();

}

package com.openframe.stream.service;

import com.openframe.stream.model.fleet.debezium.IntegratedToolEnrichedData;
import com.openframe.data.model.enums.DataEnrichmentServiceType;

public interface DataEnrichmentService <T> {

    IntegratedToolEnrichedData getExtraParams(T message);

    DataEnrichmentServiceType getType();

}

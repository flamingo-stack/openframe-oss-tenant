package com.openframe.stream.service;

import com.openframe.data.model.debezium.ExtraParams;
import com.openframe.data.model.enums.DataEnrichmentServiceType;

public interface DataEnrichmentService <T> {

    ExtraParams getExtraParams(T message);

    DataEnrichmentServiceType getType();

}

package com.openframe.stream.service;

import com.openframe.data.model.debezium.ExtraParams;

public interface DataEnrichmentService <T> {

    ExtraParams getExtraParams();

}

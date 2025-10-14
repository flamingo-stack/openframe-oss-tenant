package com.openframe.stream.model.fleet.debezium;

import lombok.Data;

@Data
public class IntegratedToolEnrichedData {

    private String machineId;
    private String hostname;
    private String organizationId;
    private String organizationName;
    private String userId;

}

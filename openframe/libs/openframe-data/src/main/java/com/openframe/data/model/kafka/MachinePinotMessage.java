package com.openframe.data.model.kafka;

import lombok.Data;

import java.util.List;

@Data
public class MachinePinotMessage {

    private String machineId;
    private String organizationId;
    private String deviceType;
    private String status;
    private String osType;
    private List<String> tags ;

}

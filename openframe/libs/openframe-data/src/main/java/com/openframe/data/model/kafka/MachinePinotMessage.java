package com.openframe.data.model.kafka;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MachinePinotMessage {

    private String machineId;
    private String organizationId;
    private String deviceType;
    private String status;
    private String osType;
    private List<String> tags ;

}

package com.openframe.data.model.nats;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ToolConnectionMessage {

    private String toolType;
    private String agentToolId;

}

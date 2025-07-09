package com.openframe.data.model.debezium;

import com.openframe.data.model.enums.IntegratedToolType;
import lombok.Data;

@Data
public class MeshCentralEventMessage extends MongoDbDebeziumMessage {

    @Override
    public IntegratedToolType getToolType() {
        return IntegratedToolType.MESHCENTRAL;
    }
}

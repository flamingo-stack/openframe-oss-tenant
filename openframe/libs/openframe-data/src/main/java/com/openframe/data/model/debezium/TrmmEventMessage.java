package com.openframe.data.model.debezium;

import com.openframe.data.model.enums.IntegratedToolType;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class TrmmEventMessage extends PostgreSqlDebeziumMessage {

    @Override
    public IntegratedToolType getToolType() {
        return IntegratedToolType.TACTICAL;
    }
}

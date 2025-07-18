package com.openframe.data.model.debezium;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@SuperBuilder
@Data
@NoArgsConstructor
public class CommonDebeziumMessage extends DebeziumMessage<JsonNode> {
}

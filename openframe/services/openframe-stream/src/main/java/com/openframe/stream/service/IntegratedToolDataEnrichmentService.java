package com.openframe.stream.service;

import com.openframe.core.model.ToolConnection;
import com.openframe.data.model.debezium.DebeziumMessage;
import com.openframe.data.model.debezium.ExtraParams;
import com.openframe.data.model.debezium.IntegratedToolEnrichedData;
import com.openframe.data.repository.mongo.ToolConnectionRepository;
import com.openframe.stream.enumeration.DataEnrichmentServiceType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@Slf4j
public class IntegratedToolDataEnrichmentService implements DataEnrichmentService<DebeziumMessage> {

    private final ToolConnectionRepository toolConnectionRepository;

    public IntegratedToolDataEnrichmentService(ToolConnectionRepository toolConnectionRepository) {
        this.toolConnectionRepository = toolConnectionRepository;
    }

    @Override
    public ExtraParams getExtraParams(DebeziumMessage message) {
        IntegratedToolEnrichedData integratedToolEnrichedData = new IntegratedToolEnrichedData();
        if (message == null || message.getAgentId() == null) {
            return integratedToolEnrichedData;
        }
        Optional<ToolConnection> toolConnectionOptional = toolConnectionRepository.findByAgentToolId(message.getAgentId());
        toolConnectionOptional.ifPresent(toolConnection ->
            integratedToolEnrichedData.setMachineId(toolConnection.getMachineId()));
        return integratedToolEnrichedData;
    }

    @Override
    public DataEnrichmentServiceType getType() {
        return DataEnrichmentServiceType.INTEGRATED_TOOLS_EVENTS;
    }
}

package com.openframe.stream.service;

import com.openframe.core.model.ToolConnection;
import com.openframe.data.model.debezium.DebeziumMessage;
import com.openframe.data.model.debezium.ExtraParams;
import com.openframe.data.model.debezium.IntegratedToolEnrichedData;
import com.openframe.data.repository.mongo.ToolConnectionRepository;
import com.openframe.data.service.MachineIdCacheService;
import com.openframe.stream.enumeration.DataEnrichmentServiceType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@Slf4j
public class IntegratedToolDataEnrichmentService implements DataEnrichmentService<DebeziumMessage> {

    private final ToolConnectionRepository toolConnectionRepository;
    private final MachineIdCacheService machineIdCacheService;

    public IntegratedToolDataEnrichmentService(ToolConnectionRepository toolConnectionRepository,
                                             MachineIdCacheService machineIdCacheService) {
        this.toolConnectionRepository = toolConnectionRepository;
        this.machineIdCacheService = machineIdCacheService;
    }

    @Override
    public ExtraParams getExtraParams(DebeziumMessage message) {
        IntegratedToolEnrichedData integratedToolEnrichedData = new IntegratedToolEnrichedData();
        if (message == null || message.getAgentId() == null) {
            return integratedToolEnrichedData;
        }
        
        String agentId = message.getAgentId();
        Optional<String> machineIdOptional = machineIdCacheService.getMachineId(agentId);
        
        if (machineIdOptional.isPresent()) {
            log.debug("Machine ID found in cache for agent: {}", agentId);
            integratedToolEnrichedData.setMachineId(machineIdOptional.get());
        } else {
            log.debug("Machine ID not found in cache, querying database for agent: {}", agentId);
            Optional<ToolConnection> toolConnectionOptional = toolConnectionRepository.findByAgentToolId(agentId);
            toolConnectionOptional.ifPresent(toolConnection -> {
                String dbMachineId = toolConnection.getMachineId();
                integratedToolEnrichedData.setMachineId(dbMachineId);
                if (dbMachineId != null) {
                    machineIdCacheService.putMachineId(agentId, dbMachineId);
                }
            });
        }
        
        return integratedToolEnrichedData;
    }

    @Override
    public DataEnrichmentServiceType getType() {
        return DataEnrichmentServiceType.INTEGRATED_TOOLS_EVENTS;
    }
}

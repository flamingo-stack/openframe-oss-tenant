package com.openframe.client.service.agentregistration.transformer;

import com.openframe.data.document.tool.ToolType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ToolAgentIdTransformerService {

    private final List<ToolAgentIdTransformer> transformers;

    public String transform(ToolType toolType, String agentToolId) {
        return transformers.stream()
                .filter(transformer -> toolType.equals(transformer.getToolType()))
                .findFirst()
                .map(transformer -> transformer.transform(agentToolId))
                .orElse(agentToolId);
    }

}

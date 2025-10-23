package com.openframe.client.service.agentregistration.transformer;

import com.openframe.data.document.tool.ToolType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import static org.apache.commons.lang3.StringUtils.isBlank;

@Component
@RequiredArgsConstructor
@Slf4j
public class MeshCentralAgentIdTransformer implements ToolAgentIdTransformer {

    private static final String NODE_PREFIX = "node//";

    @Override
    public ToolType getToolType() {
        return ToolType.MESHCENTRAL;
    }

    @Override
    public String transform(String agentToolId, boolean __) {
        if (isBlank(agentToolId)) {
            log.warn("Agent tool ID is blank for MeshCentral");
            return agentToolId;
        }

        String transformedId = NODE_PREFIX + agentToolId;
        log.info("Transformed MeshCentral agent tool ID: {} -> {}", agentToolId, transformedId);
        
        return transformedId;
    }
}

package com.openframe.client.service.agentregistration;

import com.openframe.client.service.agentregistration.secretretriver.ToolAgentRegistrationSecretRetriever;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class ToolCommandParamsProcessor {

    private static final String REGISTRATION_SECRET_PLACEHOLDER = "${registrationSecret}";

    private final List<ToolAgentRegistrationSecretRetriever> toolAgentRegistrationSecretRetrievers;

    public String process(String toolId, String command) {
        if (command == null) {
            return null;
        }

        // Retrieve and inject the registration secret only when the placeholder is present.
        if (StringUtils.contains(command, REGISTRATION_SECRET_PLACEHOLDER)) {
            return command.replace(REGISTRATION_SECRET_PLACEHOLDER, getRegistrationSecret(toolId));
        }

        // If no placeholder is found, return the command unchanged.
        return command;
    }

    private String getRegistrationSecret(String toolId) {
        return toolAgentRegistrationSecretRetrievers.stream()
                .filter(retriever -> isSuitable(toolId, retriever))
                .findFirst()
                .map(ToolAgentRegistrationSecretRetriever::getSecret)
                .orElseThrow(() -> new IllegalStateException("No tool agent registration secret retriver found for " + toolId));
    }

    private boolean isSuitable(String toolId, ToolAgentRegistrationSecretRetriever retriever) {
        String retrieverToolId = retriever.getToolId();
        return StringUtils.equals(retrieverToolId, toolId);
    }

}

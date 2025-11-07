package com.openframe.management.initializer;

import com.openframe.data.document.tool.IntegratedTool;
import com.openframe.data.document.tool.ToolUrl;
import com.openframe.data.document.tool.ToolUrlType;
import com.openframe.data.service.IntegratedToolService;
import com.openframe.data.service.ToolUrlService;
import com.openframe.sdk.tacticalrmm.TacticalRmmClient;
import com.openframe.sdk.tacticalrmm.model.CreateScriptRequest;
import com.openframe.sdk.tacticalrmm.model.ScriptListItem;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;
import org.springframework.util.StreamUtils;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;

/**
 * Initializer for Tactical RMM scripts.
 * 
 * This component runs at startup and ensures that required scripts
 * are present in Tactical RMM. It loads scripts from the resources
 * directory and creates or updates them in Tactical RMM based on
 * script name matching.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RmmScriptsInitializer implements ApplicationRunner {

    private static final String TOOL_ID = "tactical-rmm";

    private final IntegratedToolService integratedToolService;
    private final ToolUrlService toolUrlService;
    private final TacticalRmmClient tacticalRmmClient;
    private final ResourceLoader resourceLoader;

    private static final String SCRIPT_NAME = "OpenFrame Test Script";
    private static final String SCRIPT_RESOURCE_PATH = "classpath:scripts/test-script.ps1";

    @Override
    public void run(ApplicationArguments args) {
        try {
            log.info("Initializing Tactical RMM scripts");
            
            // Get Tactical RMM connection details
            IntegratedTool integratedTool = integratedToolService.getToolById(TOOL_ID)
                    .orElseThrow(() -> new IllegalStateException("Found no tool with id " + TOOL_ID));

            ToolUrl toolUrl = toolUrlService.getUrlByToolType(integratedTool, ToolUrlType.API)
                    .orElseThrow(() -> new IllegalStateException("Found no api url for tool with id " + TOOL_ID));

            String apiUrl = toolUrl.getUrl() + ":" + toolUrl.getPort();
            String apiToken = integratedTool.getCredentials().getApiKey().getKey();

            // Load script content from resources
            String scriptContent = loadScriptFromResources();
            
            // Get all existing scripts from Tactical RMM
            List<ScriptListItem> existingScripts = tacticalRmmClient.getAllScripts(apiUrl, apiToken);

            // Check if script exists by name
            ScriptListItem existingScript = findScriptByName(existingScripts, SCRIPT_NAME);

            if (existingScript == null) {
                // Script doesn't exist, create it
                createScript(apiUrl, apiToken, scriptContent);
            } else {
                // Script exists, update it
                updateScript(apiUrl, apiToken, existingScript.getId().toString(), scriptContent);
            }

            log.info("Tactical RMM scripts initialization completed successfully");
        } catch (Exception e) {
            log.error("Error initializing Tactical RMM scripts", e);
        }
    }

    /**
     * Load script content from resources directory
     */
    private String loadScriptFromResources() throws Exception {
        Resource resource = resourceLoader.getResource(SCRIPT_RESOURCE_PATH);
        if (!resource.exists()) {
            throw new IllegalStateException("Script resource not found: " + SCRIPT_RESOURCE_PATH);
        }
        
        byte[] bytes = StreamUtils.copyToByteArray(resource.getInputStream());
        String content = new String(bytes, StandardCharsets.UTF_8);
        
        log.debug("Loaded script content from resources: {} ({} bytes)", 
            SCRIPT_RESOURCE_PATH, bytes.length);
        
        return content;
    }

    /**
     * Find script by name in the list of existing scripts
     */
    private ScriptListItem findScriptByName(List<ScriptListItem> scripts, String name) {
        return scripts.stream()
            .filter(script -> name.equals(script.getName()))
            .findFirst()
            .orElse(null);
    }

    /**
     * Create a new script in Tactical RMM
     */
    private void createScript(String tacticalServerUrl, String apiKey, String scriptContent) {
        try {
            log.info("Creating new script in Tactical RMM: {}", SCRIPT_NAME);
            
            CreateScriptRequest request = new CreateScriptRequest();
            request.setName(SCRIPT_NAME);
            request.setDescription("OpenFrame test script for system information gathering");
            request.setShell("powershell");
            request.setCategory("OpenFrame");
            request.setDefaultTimeout(30);
            request.setScriptBody(scriptContent);

            ScriptListItem createdScript = tacticalRmmClient.addScript(
                tacticalServerUrl, 
                apiKey, 
                request
            );
            
            log.info("Successfully created script: {} (ID: {})", SCRIPT_NAME, createdScript.getId());
        } catch (Exception e) {
            log.error("Failed to create script: {}", SCRIPT_NAME, e);
            throw new RuntimeException("Failed to create script", e);
        }
    }

    /**
     * Update an existing script in Tactical RMM
     */
    private void updateScript(String tacticalServerUrl, String apiKey, String scriptId, String scriptContent) {
        try {
            log.info("Updating existing script in Tactical RMM: {} (ID: {})", SCRIPT_NAME, scriptId);
            
            CreateScriptRequest request = new CreateScriptRequest();
            request.setName(SCRIPT_NAME);
            request.setDescription("OpenFrame test script for system information gathering");
            request.setShell("powershell");
            request.setCategory("OpenFrame");
            request.setDefaultTimeout(30);
            request.setScriptBody(scriptContent);

            ScriptListItem updatedScript = tacticalRmmClient.updateScript(
                tacticalServerUrl, 
                apiKey, 
                scriptId, 
                request
            );
            
            log.info("Successfully updated script: {} (ID: {})", SCRIPT_NAME, updatedScript.getId());
        } catch (Exception e) {
            log.error("Failed to update script: {} (ID: {})", SCRIPT_NAME, scriptId, e);
            throw new RuntimeException("Failed to update script", e);
        }
    }
}


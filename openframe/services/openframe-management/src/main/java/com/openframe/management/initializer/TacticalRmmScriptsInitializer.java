package com.openframe.management.initializer;

import com.openframe.data.document.tool.IntegratedTool;
import com.openframe.data.document.tool.ToolUrl;
import com.openframe.data.document.tool.ToolUrlType;
import com.openframe.data.service.IntegratedToolService;
import com.openframe.data.service.ToolUrlService;
import com.openframe.management.model.ScriptConfig;
import com.openframe.sdk.tacticalrmm.TacticalRmmClient;
import com.openframe.sdk.tacticalrmm.model.CreateScriptRequest;
import com.openframe.sdk.tacticalrmm.model.ScriptListItem;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;
import org.springframework.util.StreamUtils;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class TacticalRmmScriptsInitializer implements ApplicationRunner {

    private static final String TOOL_ID = "tactical-rmm";

    private static final List<ScriptConfig> SCRIPT_CONFIGS = List.of(
            ScriptConfig.builder()
                    .name("OpenFrame Client Latest Update")
                    .resourcePath("classpath:scripts/openframe-client-update.ps1")
                    .description("OpenFrame Client update to latest version")
                    .shell("powershell")
                    .category("OpenFrame")
                    .defaultTimeout(30)
                    .build()
    );

    private final IntegratedToolService integratedToolService;
    private final ToolUrlService toolUrlService;
    private final TacticalRmmClient tacticalRmmClient;
    private final ResourceLoader resourceLoader;

    @Override
    public void run(ApplicationArguments args) {
        try {
            log.info("Initializing Tactical RMM scripts ({} configured)", SCRIPT_CONFIGS.size());
            
            // Get Tactical RMM connection details
            IntegratedTool integratedTool = integratedToolService.getToolById(TOOL_ID)
                    .orElseThrow(() -> new IllegalStateException("Found no tool with id " + TOOL_ID));

            ToolUrl toolUrl = toolUrlService.getUrlByToolType(integratedTool, ToolUrlType.API)
                    .orElseThrow(() -> new IllegalStateException("Found no api url for tool with id " + TOOL_ID));

            String apiUrl = toolUrl.getUrl() + ":" + toolUrl.getPort();
            String apiToken = integratedTool.getCredentials().getApiKey().getKey();

            // Get all existing scripts from Tactical RMM once
            List<ScriptListItem> existingScripts = tacticalRmmClient.getAllScripts(apiUrl, apiToken);

            // Process each configured script
            int successCount = 0;
            int failureCount = 0;
            
            for (ScriptConfig config : SCRIPT_CONFIGS) {
                try {
                    processScript(apiUrl, apiToken, existingScripts, config);
                    successCount++;
                } catch (Exception e) {
                    log.error("Failed to process script: {}", config.getName(), e);
                    failureCount++;
                }
            }

            log.info("Tactical RMM scripts initialization completed: {} successful, {} failed", 
                successCount, failureCount);
        } catch (Exception e) {
            log.error("Error initializing Tactical RMM scripts", e);
        }
    }

    private void processScript(String apiUrl, String apiToken,
                              List<ScriptListItem> existingScripts, 
                              ScriptConfig config) throws Exception {
        log.debug("Processing script: {}", config.getName());
        
        // Load script content from resources
        String scriptContent = loadScriptFromResources(config.getResourcePath());
        
        // Check if script exists by name
        ScriptListItem existingScript = findScriptByName(existingScripts, config.getName());

        if (existingScript == null) {
            // Script doesn't exist, create it
            createScript(apiUrl, apiToken, config, scriptContent);
        } else {
            // Script exists, update it
            updateScript(apiUrl, apiToken, existingScript.getId().toString(), config, scriptContent);
        }
    }

    private String loadScriptFromResources(String resourcePath) throws Exception {
        Resource resource = resourceLoader.getResource(resourcePath);
        if (!resource.exists()) {
            throw new IllegalStateException("Script resource not found: " + resourcePath);
        }
        
        byte[] bytes = StreamUtils.copyToByteArray(resource.getInputStream());
        String content = new String(bytes, StandardCharsets.UTF_8);
        
        log.debug("Loaded script content from resources: {} ({} bytes)", 
            resourcePath, bytes.length);
        
        return content;
    }

    private ScriptListItem findScriptByName(List<ScriptListItem> scripts, String name) {
        return scripts.stream()
            .filter(script -> name.equals(script.getName()))
            .findFirst()
            .orElse(null);
    }

    private void createScript(String tacticalServerUrl, String apiKey,
                            ScriptConfig config, String scriptContent) {
        try {
            log.info("Creating new script in Tactical RMM: {}", config.getName());
            
            CreateScriptRequest request = new CreateScriptRequest();
            request.setName(config.getName());
            request.setDescription(config.getDescription());
            request.setShell(config.getShell());
            request.setCategory(config.getCategory());
            request.setDefaultTimeout(config.getDefaultTimeout());
            request.setScriptBody(scriptContent);
            request.setRunAsUser(false);

           tacticalRmmClient.addScript(tacticalServerUrl, apiKey, request);
            
            log.info("Successfully created script: {}", config.getName());
        } catch (Exception e) {
            log.error("Failed to create script: {}", config.getName(), e);
            throw new IllegalStateException("Failed to create script: " + config.getName(), e);
        }
    }

    private void updateScript(String tacticalServerUrl, String apiKey, String scriptId,
                            ScriptConfig config, String scriptContent) {
        try {
            log.info("Updating existing script in Tactical RMM: {}", config.getName());
            
            CreateScriptRequest request = new CreateScriptRequest();
            request.setName(config.getName());
            request.setDescription(config.getDescription());
            request.setShell(config.getShell());
            request.setCategory(config.getCategory());
            request.setDefaultTimeout(config.getDefaultTimeout());
            request.setScriptBody(scriptContent);
            request.setRunAsUser(false);

            tacticalRmmClient.updateScript(tacticalServerUrl, apiKey, scriptId, request);
            
            log.info("Successfully updated script: {})", config.getName());
        } catch (Exception e) {
            log.error("Failed to update script: {}", config.getName(), e);
            throw new IllegalStateException("Failed to update script: " + config.getName(), e);
        }
    }
}


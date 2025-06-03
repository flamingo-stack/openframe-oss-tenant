package com.openframe.data.service;

import java.util.List;
import java.util.Optional;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import com.openframe.core.model.IntegratedTool;
import com.openframe.data.repository.mongo.IntegratedToolRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.web.client.RestTemplate;

@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "spring.data.mongodb.enabled", havingValue = "true", matchIfMissing = true)
public class IntegratedToolService {
    private final IntegratedToolRepository toolRepository;
    RestTemplate restTemplate = new RestTemplate();

    public List<IntegratedTool> getAllTools() {
        return toolRepository.findAll();
    }

    public Optional<IntegratedTool> getTool(String toolType) {
        return toolRepository.findByType(toolType);
    }

    public IntegratedTool saveTool(IntegratedTool tool) {
        if (tool.getDebeziumConnector() != null) {
            createDebeziumConnector(tool.getDebeziumConnector());
        }
        return toolRepository.save(tool);
    }

    public String getActiveToken(String toolType) {
        Optional<IntegratedTool> tool = getTool(toolType);
        if (!tool.isPresent() || !tool.get().isEnabled() || tool.get().getCredentials() == null) {
            return null;
        }
        return tool.get().getCredentials().getApiKey().getKey();
    }

    private void createDebeziumConnector(Object debeziumConnector) {
        log.info("Add debezium connector");
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        // Create HTTP entity with headers and body
        HttpEntity<Object> requestEntity = new HttpEntity<>(debeziumConnector, headers);

        // URL for the request
        String url = "http://debezium-connect.datasources:8083/connectors";

        // Send POST request and get response
        try {
            // Send POST request and get response
            ResponseEntity<String> response = restTemplate.postForEntity(url, requestEntity, String.class);
            log.info("Added debezium connector. Response: {}", response.getStatusCode());
        } catch (Exception e) {
            log.error("Failed to add debezium connector", e);
            throw e;
        }

    }
}
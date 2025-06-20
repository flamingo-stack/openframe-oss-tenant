package com.openframe.stream.config;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.Collections;
import java.util.concurrent.TimeUnit;

import javax.annotation.PostConstruct;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Configuration
public class PinotConfigInitializer {

    private static final Logger logger = LoggerFactory.getLogger(PinotConfigInitializer.class);
    private final ResourceLoader resourceLoader;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${pinot.controller.host:pinot-controller.datasources.svc.cluster.local}")
    private String pinotControllerHost;

    @Value("${pinot.controller.port:9000}")
    private int pinotControllerPort;

    private static final int MAX_RETRIES = 5;
    private static final long RETRY_DELAY_MS = 5000;

    public PinotConfigInitializer(ResourceLoader resourceLoader) {
        this.resourceLoader = resourceLoader;
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    @PostConstruct
    public void init() {
        try {
            Resource schemaResource = resourceLoader.getResource("classpath:pinot/config/schema-devices.json");
            Resource tableConfigResource = resourceLoader.getResource("classpath:pinot/config/table-config-devices.json");

            String schemaConfig = new String(Files.readAllBytes(schemaResource.getFile().toPath()), StandardCharsets.UTF_8);
            String tableConfig = new String(Files.readAllBytes(tableConfigResource.getFile().toPath()), StandardCharsets.UTF_8);
            deployWithRetry(() -> deploySchema(schemaConfig), "schema");
            deployWithRetry(() -> deployTableConfig(tableConfig), "table");

            logger.info("Successfully deployed Pinot configurations");
        } catch (IOException e) {
            logger.error("Failed to load Pinot configurations", e);
            throw new RuntimeException("Failed to load Pinot configurations", e);
        }
    }

    private void deployWithRetry(Runnable deployment, String configType) {
        int retryCount = 0;
        while (retryCount < MAX_RETRIES) {
            try {
                deployment.run();
                return;
            } catch (ResourceAccessException e) {
                retryCount++;
                if (retryCount == MAX_RETRIES) {
                    logger.error("Failed to deploy {} configuration after {} retries", configType, MAX_RETRIES, e);
                    throw new RuntimeException("Failed to deploy " + configType + " configuration", e);
                }
                logger.warn("Failed to deploy {} configuration, retrying in {} ms (attempt {}/{})",
                        configType, RETRY_DELAY_MS, retryCount, MAX_RETRIES);
                try {
                    TimeUnit.MILLISECONDS.sleep(RETRY_DELAY_MS);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException("Interrupted while waiting to retry deployment", ie);
                }
            }
        }
    }

    private void deploySchema(String schemaConfig) {
        String url = String.format("http://%s:%d/schemas", pinotControllerHost, pinotControllerPort);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));

        HttpEntity<String> request = new HttpEntity<>(schemaConfig, headers);
        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    request,
                    String.class
            );

            if (response.getStatusCode() == HttpStatus.OK) {
                logger.info("Successfully deployed schema configuration");
            } else {
                logger.error("Failed to deploy schema configuration. Status: {}", response.getStatusCode());
                throw new RuntimeException("Failed to deploy schema configuration. Status: " + response.getStatusCode());
            }
        } catch (Exception e) {
            logger.error("Error deploying schema configuration", e);
            throw new RuntimeException("Failed to deploy schema configuration", e);
        }
    }

    private void deployTableConfig(String tableConfig) {
        try {
            JsonNode tableConfigJson = objectMapper.readTree(tableConfig);
            String tableName = tableConfigJson.get("tableName").asText() + "_REALTIME";
            
            String updateUrl = String.format("http://%s:%d/tables/%s", pinotControllerHost, pinotControllerPort, tableName);
            String createUrl = String.format("http://%s:%d/tables", pinotControllerHost, pinotControllerPort, tableName);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));

            HttpEntity<String> request = new HttpEntity<>(tableConfig, headers);

            try {
                ResponseEntity<String> response = restTemplate.exchange(
                    updateUrl,
                    HttpMethod.PUT,
                    request,
                    String.class
                );
                
                if (response.getStatusCode() == HttpStatus.OK) {
                    logger.info("Successfully updated table configuration for {}", tableName);
                } else {
                    logger.error("Failed to update table configuration. Status: {}", response.getStatusCode());
                    throw new RuntimeException("Failed to update table configuration. Status: " + response.getStatusCode());
                }
            } catch (HttpClientErrorException.NotFound e) {
                ResponseEntity<String> response = restTemplate.exchange(
                    createUrl,
                    HttpMethod.POST,
                    request,
                    String.class
                );
                
                if (response.getStatusCode() == HttpStatus.OK) {
                    logger.info("Successfully created table configuration for {}", tableName);
                } else {
                    logger.error("Failed to create table configuration. Status: {}", response.getStatusCode());
                    throw new RuntimeException("Failed to create table configuration. Status: " + response.getStatusCode());
                }
            }
        } catch (Exception e) {
            logger.error("Error deploying table configuration", e);
            throw new RuntimeException("Failed to deploy table configuration", e);
        }
    }
}

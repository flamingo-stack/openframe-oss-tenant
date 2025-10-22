package com.openframe.management.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Slf4j
@Service
public class DebeziumService {

    private final RestTemplate restTemplate = new RestTemplate();
    @Value("${openframe.debezium.base-url}")
    private String debeziumUrl;
    private String debeziumConnectorCreateUrl;

    public void createOrUpdateDebeziumConnector(Object[] debeziumConnectors) {
        if (debeziumConnectors == null) return;

        for (Object debeziumConnector : debeziumConnectors) {
            Map<String, Object> connectorMap = (Map<String, Object>) debeziumConnector;
            String name = (String) connectorMap.get("name");

            log.info("Processing Debezium connector: {}", name);

            String connectorUrl = getDebeziumConnectorUrl(name);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            try {
                ResponseEntity<String> getResponse = restTemplate.getForEntity(connectorUrl, String.class);
                if (getResponse.getStatusCode().is2xxSuccessful()) {
                    log.info("Connector '{}' already exists — updating config...", name);
                    HttpEntity<Object> requestEntity = new HttpEntity<>(connectorMap.get("config"), headers);
                    restTemplate.put(connectorUrl + "/config", requestEntity);
                    log.info("Connector '{}' updated successfully", name);
                    continue;
                }
            } catch (HttpClientErrorException.NotFound e) {
                log.info("Connector '{}' not found — creating new one", name);
            } catch (Exception e) {
                log.error("Error checking connector '{}'", name, e);
                continue;
            }
            try {
                HttpEntity<Object> requestEntity = new HttpEntity<>(debeziumConnector, headers);
                ResponseEntity<String> response =
                        restTemplate.postForEntity(getDebeziumConnectorCreateUrl(), requestEntity, String.class);
                log.info("Connector '{}' created. Response: {}", name, response.getStatusCode());
            } catch (Exception e) {
                log.error("Failed to create connector '{}'", name, e);
            }
        }
    }

    private String getDebeziumConnectorCreateUrl() {
        if (debeziumConnectorCreateUrl == null) {
            debeziumConnectorCreateUrl = this.debeziumUrl + "/connectors";
        }
        return debeziumConnectorCreateUrl;
    }

    private String getDebeziumConnectorUrl(String name) {
        return "%s/%s".formatted(getDebeziumConnectorCreateUrl(), name);
    }

}

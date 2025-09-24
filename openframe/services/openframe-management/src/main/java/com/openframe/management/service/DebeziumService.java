package com.openframe.management.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Slf4j
@Service
public class DebeziumService {

    private final RestTemplate restTemplate = new RestTemplate();
    @Value("${openframe.debezium.base-url}")
    private String debeziumUrl;
    private String debeziumConnectorCreateUrl;

    public void createDebeziumConnector(Object debeziumConnector) {
        if (debeziumConnector != null) {
            log.info("Add debezium connector");
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Object> requestEntity = new HttpEntity(debeziumConnector, headers);

            try {
                ResponseEntity<String> response = this.restTemplate.postForEntity(getDebeziumConnectorCreateUrl(), requestEntity, String.class);
                log.info("Added debezium connector. Response: {}", response.getStatusCode());
            } catch (Exception e) {
                log.error("Failed to add debezium connector", e);
            }
        }

    }

    private String getDebeziumConnectorCreateUrl() {
        if (debeziumConnectorCreateUrl == null) {
            debeziumConnectorCreateUrl = this.debeziumUrl + "/connectors";
        }
        return debeziumConnectorCreateUrl;
    }

}

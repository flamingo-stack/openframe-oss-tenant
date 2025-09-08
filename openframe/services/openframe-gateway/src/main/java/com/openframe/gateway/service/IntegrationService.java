package com.openframe.gateway.service;

import com.openframe.data.document.tool.ToolUrl;
import com.openframe.data.document.tool.ToolUrlType;
import com.openframe.data.reactive.repository.tool.ReactiveIntegratedToolRepository;
import com.openframe.data.service.ToolUrlService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;
import reactor.core.publisher.Mono;

import java.net.URI;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class IntegrationService {
    
    private final ToolUrlService toolUrlService;
    private final ReactiveIntegratedToolRepository integratedToolRepository;
    private final WebClient.Builder webClientBuilder;
    private final Environment environment;

    private String adjustUrl(String originalUrl) {
        if (isLocalProfile()) {
            try {
                URI uri = new URI(originalUrl);
                return UriComponentsBuilder.newInstance()
                    .scheme(uri.getScheme())
                    .host("localhost")
                    .port(uri.getPort())
                    .path(uri.getPath())
                    .query(uri.getQuery())
                    .fragment(uri.getFragment())
                    .build()
                    .toUriString();
            } catch (Exception e) {
                log.error("Failed to parse URL: {}", originalUrl, e);
                return originalUrl;
            }
        }
        return originalUrl;
    }

    private boolean isLocalProfile() {
        for (String profile : environment.getActiveProfiles()) {
            if (profile.equals("local")) {
                return true;
            }
        }
        return environment.getActiveProfiles().length == 0; // Default to local if no profile set
    }

    public Mono<String> testIntegrationConnection(String toolId) {
        return integratedToolRepository.findById(toolId)
            .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "Tool not found: " + toolId)))
            .flatMap(tool -> {
                if (!tool.isEnabled()) {
                    return Mono.error(new ResponseStatusException(HttpStatus.FORBIDDEN, "Integration " + tool.getName() + " is not enabled"));
                }

                Optional<ToolUrl> toolUrl = toolUrlService.getUrlByToolType(tool, ToolUrlType.API);

                if (toolUrl.isEmpty()) {
                    return Mono.error(new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Tool URL not found for tool: " + toolId));
                }

                String targetUrl = adjustUrl(toolUrl.get().getUrl());
                log.debug("Testing connection to: {} (original URL: {})", targetUrl, toolUrl.get().getUrl());

                return webClientBuilder.build()
                    .get()
                    .uri(targetUrl + "/health")
                    .retrieve()
                    .bodyToMono(String.class)
                    .doOnSuccess(response -> log.info("Successfully connected to {} integration at {}", tool.getName(), targetUrl))
                    .doOnError(error -> log.error("Failed to connect to {} integration at {}: {}", tool.getName(), targetUrl, error.getMessage()));
            });
    }
} 
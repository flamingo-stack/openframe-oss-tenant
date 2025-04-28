package com.openframe.gateway.service;

import com.openframe.core.model.ToolUrl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProxyUrlResolver {

    private final Environment environment;

    public URI resolve(String toolId, ToolUrl toolUrl, String originalUrl, String prefix) {
        try {
            URI integratedToolUri = new URI(toolUrl.getUrl());
            URI originalUrlUri = new URI(originalUrl);

            // Extract the path after prefix
            String fullPath = originalUrlUri.getPath();
            String toolPath = prefix + "/" + toolId;
            String pathToProxy = fullPath.substring(fullPath.indexOf(toolPath) + toolPath.length());
            if (pathToProxy.isEmpty()) {
                pathToProxy = "/";
            }

            return UriComponentsBuilder.newInstance()
                    .scheme(integratedToolUri.getScheme())
                    .host(isLocalProfile() ? "localhost" : integratedToolUri.getHost())
                    .port(toolUrl.getPort())
                    .path(pathToProxy)
                    .query(originalUrlUri.getQuery())
                    .fragment(originalUrlUri.getFragment())
                    .build(true)
                    .toUri();
        } catch (Exception e) {
            log.error("Failed to resolve tool url: {}", originalUrl, e);
            throw new RuntimeException("Failed to resolve tool url", e);
        }
    }

    private boolean isLocalProfile() {
        for (String profile : environment.getActiveProfiles()) {
            if (profile.equals("local")) {
                return true;
            }
        }
        return environment.getActiveProfiles().length == 0; // Default to local if no profile set
    }

}

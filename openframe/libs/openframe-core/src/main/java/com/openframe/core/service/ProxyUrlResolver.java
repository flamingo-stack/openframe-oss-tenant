package com.openframe.core.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;

/**
 * Service for resolving proxy URLs for integrated tools.
 * Used by both gateway and openframe-external-api services.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ProxyUrlResolver {

    private final Environment environment;

    /**
     * Resolves the target URI for proxying requests to integrated tools
     *
     * @param toolId      The tool identifier
     * @param toolUrl     The tool URL configuration from database
     * @param originalUri The original request URI
     * @param prefix      The prefix to strip from the path (e.g. "/tools" or "/tools/agent")
     * @return The resolved target URI for the tool
     */
    public URI resolve(String toolId, String toolUrl, String toolPort, URI originalUri, String prefix) {
        log.debug("Resolving URL for tool: {}, original URI: {}, prefix: {}", toolId, originalUri, prefix);

        try {
            URI integratedToolUri = new URI(toolUrl);
            log.debug("Tool base URL: {}, port from config: {}", toolUrl, toolPort);

            // Extract the path after prefix
            String fullPath = originalUri.getPath();
            String toolPath = prefix + "/" + toolId;
            String pathToProxy = fullPath.substring(fullPath.indexOf(toolPath) + toolPath.length());

            if (pathToProxy.isEmpty()) {
                pathToProxy = "/";
            }
            log.debug("Path to proxy: {}", pathToProxy);

            URI targetUri = UriComponentsBuilder.newInstance()
                    .scheme(integratedToolUri.getScheme())
                    .host(isLocalProfile() ? "localhost" : integratedToolUri.getHost())
                    .port(toolPort)
                    .path(pathToProxy)
                    .query(originalUri.getQuery())
                    .build()
                    .toUri();

            log.debug("Resolved target URI: {}", targetUri);
            return targetUri;

        } catch (Exception e) {
            log.error("Failed to resolve tool url: {}", originalUri, e);
            throw new RuntimeException("Failed to resolve tool url", e);
        }
    }

    /**
     * Checks if the application is running in local profile
     *
     * @return true if local profile is active or no profiles are set
     */
    private boolean isLocalProfile() {
        String[] activeProfiles = environment.getActiveProfiles();
        log.trace("Active profiles: {}", (Object) activeProfiles);

        for (String profile : activeProfiles) {
            if (profile.equals("local")) {
                log.trace("Using local profile - will map to localhost");
                return true;
            }
        }

        boolean isDefaultProfile = activeProfiles.length == 0;
        if (isDefaultProfile) {
            log.trace("No active profiles, defaulting to local behavior");
        }

        return isDefaultProfile;
    }
} 
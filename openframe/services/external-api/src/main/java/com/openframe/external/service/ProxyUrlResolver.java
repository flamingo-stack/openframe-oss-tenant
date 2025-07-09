package com.openframe.external.service;

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

    public URI resolve(String toolId, ToolUrl toolUrl, URI originalUri, String stripPrefix) {
        log.info("Resolving URL for tool: {}, original URI: {}, strip prefix: {}", toolId, originalUri, stripPrefix);
        
        String originalPath = originalUri.getPath();
        log.debug("Original path: {}", originalPath);

        String targetPath = originalPath;
        if (originalPath.startsWith(stripPrefix + "/" + toolId)) {
            targetPath = originalPath.substring((stripPrefix + "/" + toolId).length());
            log.debug("Stripped path to: {}", targetPath);
        }

        if (targetPath.isEmpty()) {
            targetPath = "/";
            log.debug("Target path is empty, using root path: /");
        }
        
        try {
            URI toolUri = new URI(adjustUrl(toolUrl.getUrl()));
            log.info("Base URL (after adjustment): {}", toolUri);
            log.info("Using port from toolUrl: {}", toolUrl.getPort());

            URI targetUri = UriComponentsBuilder.newInstance()
                .scheme(toolUri.getScheme())
                .host(toolUri.getHost())
                .port(toolUrl.getPort())
                .path(targetPath)
                .query(originalUri.getQuery())
                .build()
                .toUri();
            
            log.info("Resolved target URI: {}", targetUri);
            return targetUri;
            
        } catch (Exception e) {
            log.error("Failed to resolve tool url: {} with toolUrl: {}", originalUri, toolUrl, e);
            throw new RuntimeException("Failed to resolve tool url: " + e.getMessage(), e);
        }
    }

    private String adjustUrl(String originalUrl) {
        log.debug("Adjusting URL: {}, isLocalProfile: {}", originalUrl, isLocalProfile());
        
        if (isLocalProfile()) {
            try {
                URI uri = new URI(originalUrl);
                String adjustedUrl = UriComponentsBuilder.newInstance()
                    .scheme(uri.getScheme())
                    .host("localhost")
                    .port(uri.getPort())
                    .path(uri.getPath())
                    .query(uri.getQuery())
                    .fragment(uri.getFragment())
                    .build()
                    .toUriString();
                log.info("Adjusted URL for local profile: {} -> {}", originalUrl, adjustedUrl);
                return adjustedUrl;
            } catch (Exception e) {
                log.error("Failed to parse URL: {}", originalUrl, e);
                return originalUrl;
            }
        }
        log.debug("No URL adjustment needed, returning original: {}", originalUrl);
        return originalUrl;
    }

    private boolean isLocalProfile() {
        String[] activeProfiles = environment.getActiveProfiles();
        log.debug("Active profiles: {}", (Object) activeProfiles);
        
        for (String profile : activeProfiles) {
            if (profile.equals("local")) {
                log.debug("Found 'local' profile, using localhost adjustment");
                return true;
            }
        }
        
        boolean isDefaultProfile = activeProfiles.length == 0;
        if (isDefaultProfile) {
            log.debug("No active profiles, defaulting to local profile behavior");
        }
        
        return isDefaultProfile;
    }
} 
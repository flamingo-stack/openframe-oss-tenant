package com.openframe.config.controller;

import java.nio.charset.StandardCharsets;

import org.apache.commons.lang3.StringUtils;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StreamUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/logging")
public class LoggingConfigController {

    @GetMapping(value = "/{filename:.+}", produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> getLoggingConfig(@PathVariable String filename, HttpServletRequest request) throws Exception {
        ClassPathResource resource = new ClassPathResource("logging/" + filename);
        String content = StreamUtils.copyToString(resource.getInputStream(), StandardCharsets.UTF_8);

        // Build the base URL from the request
        String serverUrl = request.getScheme() + "://" + request.getServerName();
        if (request.getServerPort() != 80 && request.getServerPort() != 443) {
            serverUrl += ":" + request.getServerPort();
        }

        // Replace both the direct reference and the resource reference patterns
        content = StringUtils.replace(content, "\"logging/", "\"" + serverUrl + "/logging/");
        content = StringUtils.replace(content, "resource=\"logging/", "resource=\"" + serverUrl + "/logging/");
        
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_XML)
                .body(content);
    }
}

package com.openframe.config.controller;

import java.nio.charset.StandardCharsets;

import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StreamUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/logging")
public class LoggingConfigController {

    @Value("${log.config-server-url}")
    private String configServerUrl;

    @GetMapping(value = "/{filename:.+}", produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> getLoggingConfig(@PathVariable String filename) throws Exception {
        ClassPathResource resource = new ClassPathResource("logging/" + filename);
        String content = StreamUtils.copyToString(resource.getInputStream(), StandardCharsets.UTF_8);
        content = StringUtils.replace(content, "logging/", configServerUrl + "/logging/");
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_XML)
                .body(content);
    }
}

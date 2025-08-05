package com.openframe.gateway.config.ws.nats.messagevalidator;

import lombok.Data;

import java.util.regex.Pattern;

@Data
public class SubjectPattern {

    private final String patternTemplate;
    private final Pattern compiledPattern;

    public SubjectPattern(String patternTemplate, String description) {
        this.patternTemplate = patternTemplate;
        String regexPattern = patternTemplate
            .replace("{machineId}", "([a-zA-Z0-9_-]+)")
            .replace(".", "\\.")
            .replace("*", ".*");
        this.compiledPattern = Pattern.compile("^" + regexPattern + "$");
    }

    public boolean matches(String subject, String machineId) {
        return compiledPattern.matcher(subject).matches();
    }
}
package com.openframe.api.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.openframe.api.service.OpenIDService;
import com.openframe.security.UserSecurity;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/.well-known")
@RequiredArgsConstructor
public class OpenIDController {
    
    private static final Logger log = LoggerFactory.getLogger(OpenIDController.class);
    private final OpenIDService openIDService;

    @GetMapping(value = "/openid-configuration", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> getConfiguration() {
        return openIDService.getOpenIDConfiguration();
    }

    @GetMapping(value = "/userinfo", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> getUserInfo(@AuthenticationPrincipal UserSecurity userSecurity) {
        log.debug("Getting user info for principal: {}", userSecurity);
        return openIDService.getUserInfo(userSecurity);
    }
} 
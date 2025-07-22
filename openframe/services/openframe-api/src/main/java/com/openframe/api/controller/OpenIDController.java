package com.openframe.api.controller;

import com.openframe.api.dto.oidc.UserInfoRequest;
import com.openframe.api.service.OpenIDService;
import com.openframe.security.authentication.AuthPrincipal;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
    public ResponseEntity<?> getUserInfo(@AuthenticationPrincipal AuthPrincipal principal) {
        log.debug("Getting user info for user: {}", principal.getId());

        UserInfoRequest userInfoRequest = UserInfoRequest.builder()
                .userId(principal.getId())
                .email(principal.getEmail())
                .firstName(principal.getFirstName())
                .lastName(principal.getLastName())
                .build();

        return openIDService.getUserInfo(userInfoRequest);
    }
} 
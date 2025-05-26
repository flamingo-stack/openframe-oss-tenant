package com.openframe.api.controller;

import com.openframe.api.dto.oidc.UserInfoRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.openframe.api.service.OpenIDService;

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
public ResponseEntity<?> getUserInfo(@RequestHeader("X-User-Id") String userId,
                                     @RequestHeader("X-User-Email") String email,
                                     @RequestHeader(value = "X-User-FirstName",required = false) String firstName,
                                     @RequestHeader(value = "X-User-LastName",required = false) String lastName) {
    UserInfoRequest userInfoRequest = UserInfoRequest.builder()
            .userId(userId)
            .email(email)
            .firstName(firstName)
            .lastName(lastName)
            .build();

    return openIDService.getUserInfo(userInfoRequest);
}
} 
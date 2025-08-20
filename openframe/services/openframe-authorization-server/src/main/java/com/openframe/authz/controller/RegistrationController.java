package com.openframe.authz.controller;

import com.openframe.authz.document.Tenant;
import com.openframe.authz.dto.UserRegistrationRequest;
import com.openframe.authz.service.RegistrationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(path = "/oauth", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
public class RegistrationController {

    private final RegistrationService registrationService;

    @PostMapping(path = "/register", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Tenant> register(
            @Valid @RequestBody UserRegistrationRequest request) {
        var tenant = registrationService.registerTenant(request);
        return ResponseEntity.ok(tenant);
    }
}



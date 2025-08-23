package com.openframe.authz.controller;

import com.openframe.authz.dto.ClientRegistrationRequest;
import com.openframe.authz.dto.ClientRegistrationResponse;
import com.openframe.authz.service.DynamicClientRegistrationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/connect/register")
@RequiredArgsConstructor
@Slf4j
public class DynamicClientRegistrationController {

    private final DynamicClientRegistrationService registrationService;

    @PostMapping(
        consumes = MediaType.APPLICATION_JSON_VALUE,
        produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<ClientRegistrationResponse> registerClient(
            @Valid @RequestBody ClientRegistrationRequest request) {
        
        try {
            log.info("Processing dynamic client registration request for client: {}", request.getClientName());
            
            ClientRegistrationResponse response = registrationService.registerClient(request);
            
            log.info("Successfully registered client: {}", response.getClientId());
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
            
        } catch (IllegalArgumentException e) {
            log.warn("Invalid client registration request: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
            
        } catch (Exception e) {
            log.error("Failed to register OAuth client", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
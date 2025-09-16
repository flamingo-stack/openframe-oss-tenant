package com.openframe.authz.controller;

import com.openframe.authz.dto.InvitationRegistrationRequest;
import com.openframe.authz.service.InvitationRegistrationService;
import com.openframe.data.document.auth.AuthUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import static org.springframework.http.HttpStatus.OK;

@RestController
@RequestMapping(path = "/invitations", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
public class InvitationRegistrationController {

    private final InvitationRegistrationService invitationRegistrationService;

    @PostMapping(path = "/accept", consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(OK)
    public AuthUser register(@Valid @RequestBody InvitationRegistrationRequest request) {
        return invitationRegistrationService.registerByInvitation(request);
    }
}



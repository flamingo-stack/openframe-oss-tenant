package com.openframe.api.controller;

import com.openframe.api.dto.invitation.CreateInvitationRequest;
import com.openframe.api.dto.invitation.InvitationPageResponse;
import com.openframe.api.dto.invitation.InvitationResponse;
import com.openframe.api.service.InvitationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/invitations")
@RequiredArgsConstructor
public class InvitationController {

    private final InvitationService invitationService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public InvitationResponse createInvitation(@Valid @RequestBody CreateInvitationRequest request) {
        return invitationService.createInvitation(request);
    }

    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public InvitationPageResponse listInvitations(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return invitationService.listInvitations(page, size);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revokeInvitation(@PathVariable String id) {
        invitationService.revokeInvitation(id);
    }
}

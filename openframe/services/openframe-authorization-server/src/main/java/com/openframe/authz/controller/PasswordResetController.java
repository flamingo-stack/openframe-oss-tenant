package com.openframe.authz.controller;

import com.openframe.authz.dto.PasswordResetDtos.ResetConfirm;
import com.openframe.authz.dto.PasswordResetDtos.ResetRequest;
import com.openframe.authz.service.PasswordResetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import static org.springframework.http.HttpStatus.ACCEPTED;
import static org.springframework.http.HttpStatus.NO_CONTENT;
import static org.springframework.http.MediaType.APPLICATION_JSON_VALUE;

@RestController
@RequestMapping(path = "/password-reset", produces = APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
public class PasswordResetController {

    private final PasswordResetService passwordResetService;

    @PostMapping(path = "/request", consumes = APPLICATION_JSON_VALUE)
    @ResponseStatus(ACCEPTED)
    public void requestReset(@Valid @RequestBody ResetRequest request) {
        passwordResetService.createResetToken(request.getEmail());
    }

    @PostMapping(path = "/confirm", consumes = APPLICATION_JSON_VALUE)
    @ResponseStatus(NO_CONTENT)
    public void confirmReset(@Valid @RequestBody ResetConfirm request) {
        passwordResetService.resetPassword(request.getToken(), request.getNewPassword());
    }
}



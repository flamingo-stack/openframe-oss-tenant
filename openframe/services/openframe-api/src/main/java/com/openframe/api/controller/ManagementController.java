package com.openframe.api.controller;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.openframe.api.service.IntegratedToolTokenService;
import com.openframe.data.model.IntegratedToolType;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/management")
@RequiredArgsConstructor
public class ManagementController {
    private final IntegratedToolTokenService tokenService;

    @PostMapping("/token")
    public void updateToken(@RequestParam IntegratedToolType toolType, @RequestParam String token) {
        tokenService.saveToken(toolType, token);
    }
} 
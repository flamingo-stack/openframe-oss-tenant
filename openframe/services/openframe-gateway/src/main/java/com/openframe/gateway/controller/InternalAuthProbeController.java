package com.openframe.gateway.controller;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/internal/authz")
@ConditionalOnProperty(prefix = "openframe.gateway.internal", name = "enable", havingValue = "true")
public class InternalAuthProbeController {

    @GetMapping("/probe")
    @ResponseStatus(HttpStatus.OK)
    public Mono<Void> probe() {
        return Mono.empty();
    }
}



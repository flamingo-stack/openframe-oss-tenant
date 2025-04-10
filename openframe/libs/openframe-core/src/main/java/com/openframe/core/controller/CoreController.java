package com.openframe.core.controller;

import com.openframe.core.model.CoreEvent;
import com.openframe.core.service.CoreService;
import org.springframework.web.bind.annotation.*;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/core")
@RequiredArgsConstructor
public class CoreController {

    private final CoreService coreService;

    @PostMapping("/process")
    public void processEvent(@RequestBody CoreEvent event) {
        coreService.processEvent(event);
    }

    @GetMapping("/health")
    public String health() {
        return "OK";
    }
}

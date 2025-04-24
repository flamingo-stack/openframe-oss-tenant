package com.openframe.api.controller;

import com.openframe.api.dto.agent.*;
import com.openframe.api.service.AgentService;
import com.openframe.api.service.ToolConnectionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/agents")
@RequiredArgsConstructor
public class AgentController {

    private final AgentService agentService;
    private final ToolConnectionService toolConnectionService;

    @PostMapping("/register")
    public ResponseEntity<AgentRegistrationResponse> register(
            @RequestHeader("X-Initial-Key") String initialKey,
            @Valid @RequestBody AgentRegistrationRequest request) {

        AgentRegistrationResponse response = agentService.registerAgent(initialKey, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/tool-connections")
    public ResponseEntity<List<ToolConnectionResponse>> getAllToolConnections() {
        return ResponseEntity.ok(toolConnectionService.getAllToolConnections());
    }

    @GetMapping("/tool-connections/{openframeAgentId}")
    public ResponseEntity<List<ToolConnectionResponse>> getToolConnectionsByMachineId(
            @PathVariable String openframeAgentId) {
        return ResponseEntity.ok(toolConnectionService.getToolConnectionsByMachineId(openframeAgentId));
    }

    @GetMapping("/tool-connections/{openframeAgentId}/{toolType}")
    public ResponseEntity<ToolConnectionResponse> getToolConnectionByMachineIdAndToolType(
            @PathVariable String openframeAgentId,
            @PathVariable String toolType) {
        return toolConnectionService.getToolConnectionByMachineIdAndToolType(openframeAgentId, toolType)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/tool-connection")
    public ResponseEntity<ToolConnectionResponse> addToolConnection(@Valid @RequestBody ToolConnectionRequest request) {
        return new ResponseEntity<>(
                toolConnectionService.addToolConnection(
                        request.getOpenframeAgentId(),
                        request.getToolType(),
                        request.getAgentToolId()),
                HttpStatus.CREATED);
    }

    @PutMapping("/tool-connections/{openframeAgentId}/{toolType}")
    public ResponseEntity<ToolConnectionResponse> updateToolConnection(
            @PathVariable String openframeAgentId,
            @PathVariable String toolType,
            @Valid @RequestBody ToolConnectionUpdateRequest request) {

        return toolConnectionService.updateToolConnection(openframeAgentId, toolType, request.getAgentToolId())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/tool-connections/{openframeAgentId}/{toolType}")
    public ResponseEntity<Void> deleteToolConnection(
            @PathVariable String openframeAgentId,
            @PathVariable String toolType) {
        toolConnectionService.deleteToolConnection(openframeAgentId, toolType);
        return ResponseEntity.noContent().build();
    }
}
package com.openframe.api.controller;

import com.openframe.api.dto.agent.AgentRegistrationRequest;
import com.openframe.api.dto.agent.AgentRegistrationResponse;
import com.openframe.api.dto.agent.ToolConnectionResponse;
import com.openframe.api.dto.agent.ToolConnectionRequest;
import com.openframe.api.dto.agent.AgentToolCollectionResponse;
import com.openframe.api.service.AgentService;
import com.openframe.api.service.ToolConnectionService;
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
            @RequestBody AgentRegistrationRequest request) {

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

    @GetMapping("/agent-tools/{openframeAgentId}")
    public ResponseEntity<AgentToolCollectionResponse> getAgentToolCollection(
            @PathVariable String openframeAgentId) {
        return ResponseEntity.ok(toolConnectionService.getAgentToolCollection(openframeAgentId));
    }

    @GetMapping("/tool-connections/{openframeAgentId}/{toolId}")
    public ResponseEntity<ToolConnectionResponse> getToolConnectionByMachineIdAndToolId(
            @PathVariable String openframeAgentId,
            @PathVariable String toolId) {
        return toolConnectionService.getToolConnectionByMachineIdAndToolId(openframeAgentId, toolId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/tool-connection")
    public ResponseEntity<ToolConnectionResponse> addToolConnection(@RequestBody ToolConnectionRequest request) {
        return new ResponseEntity<>(
                toolConnectionService.addToolConnection(
                        request.getOpenframeAgentId(),
                        request.getToolId(),
                        request.getAgentId()),
                HttpStatus.CREATED);
    }

    @PutMapping("/tool-connections/{openframeAgentId}/{toolId}")
    public ResponseEntity<ToolConnectionResponse> updateToolConnection(
            @PathVariable String openframeAgentId,
            @PathVariable String toolId,
            @RequestBody ToolConnectionRequest request) {
        return toolConnectionService.updateToolConnection(openframeAgentId, toolId, request.getAgentId())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/tool-connections/{openframeAgentId}/{toolId}")
    public ResponseEntity<Void> deleteToolConnection(
            @PathVariable String openframeAgentId,
            @PathVariable String toolId) {
        toolConnectionService.deleteToolConnection(openframeAgentId, toolId);
        return ResponseEntity.noContent().build();
    }
}
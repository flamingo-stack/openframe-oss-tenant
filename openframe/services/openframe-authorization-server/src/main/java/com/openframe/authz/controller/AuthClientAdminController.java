package com.openframe.authz.controller;

import com.openframe.authz.dto.CreateRegisteredClientRequest;
import com.openframe.authz.service.AuthClientAdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/admin/oauth/clients")
@RequiredArgsConstructor
public class AuthClientAdminController {

    private final AuthClientAdminService service;

    @PostMapping
    public ResponseEntity<?> create(@RequestBody CreateRegisteredClientRequest req) {
        try {
            Map<String, Object> res = service.createClient(req);
            return ResponseEntity.ok(res);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{clientId}")
    public ResponseEntity<?> update(@PathVariable String clientId, @RequestBody CreateRegisteredClientRequest req) {
        try {
            service.updateClient(clientId, req);
            return ResponseEntity.ok().build();
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{clientId}")
    public ResponseEntity<?> delete(@PathVariable String clientId) {
        try {
            service.deleteByClientId(clientId);
            return ResponseEntity.noContent().build();
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/{clientId}")
    public ResponseEntity<?> get(@PathVariable String clientId) {
        try {
            return ResponseEntity.ok(service.getClientByClientId(clientId));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping
    public ResponseEntity<?> list(@RequestParam(defaultValue = "0") int page,
                                  @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(service.listClients(page, size));
    }
}

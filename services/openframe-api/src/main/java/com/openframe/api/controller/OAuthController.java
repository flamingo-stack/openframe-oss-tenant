package com.openframe.api.controller;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.openframe.api.dto.UserDTO;
import com.openframe.api.dto.oauth.TokenResponse;
import com.openframe.api.service.OAuthService;
import com.openframe.core.model.User;
import com.openframe.data.repository.mongo.OAuthClientRepository;
import com.openframe.data.repository.mongo.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/oauth")
@RequiredArgsConstructor
public class OAuthController {

    private final OAuthService oauthService;
    private final UserRepository userRepository;
    private final OAuthClientRepository clientRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtEncoder jwtEncoder;

    private String generateAccessToken(User user) {
        JwtClaimsSet claims = JwtClaimsSet.builder()
            .subject(user.getId())
            .claim("email", user.getEmail())
            .issuedAt(Instant.now())
            .expiresAt(Instant.now().plusSeconds(3600))
            .build();
        return jwtEncoder.encode(JwtEncoderParameters.from(claims)).getTokenValue();
    }

    private String generateRefreshToken(User user) {
        JwtClaimsSet claims = JwtClaimsSet.builder()
            .subject(user.getId())
            .claim("token_type", "refresh")
            .issuedAt(Instant.now())
            .expiresAt(Instant.now().plusSeconds(7 * 24 * 60 * 60))
            .build();
        return jwtEncoder.encode(JwtEncoderParameters.from(claims)).getTokenValue();
    }

    @PostMapping("/authorize")
    public ResponseEntity<?> authorize(
            @RequestParam("response_type") String responseType,
            @RequestParam("client_id") String clientId,
            @RequestParam("redirect_uri") String redirectUri,
            @RequestParam(value = "scope", required = false) String scope,
            @RequestParam(value = "state", required = false) String state) {
        
        try {
            return ResponseEntity.ok(oauthService.authorize(responseType, clientId, redirectUri, scope, state));
        } catch (Exception e) {
            log.error("Authorization error", e);
            return ResponseEntity.badRequest()
                .body(Map.of(
                    "error", "invalid_request",
                    "error_description", e.getMessage(),
                    "state", state
                ));
        }
    }

    @PostMapping(value = "/token", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> token(
            @RequestParam String grant_type,
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String refresh_token,
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String password,
            @RequestParam String client_id,
            @RequestParam(required = false) String client_secret) {
        
        log.debug("Token request - grant_type: {}, client_id: {}", grant_type, client_id);

        try {
            if ("password".equals(grant_type)) {
                return clientRepository.findByClientId(client_id)
                    .filter(client -> client.getClientSecret() == null || 
                            (client_secret != null && client.getClientSecret().equals(client_secret)))
                    .flatMap(client -> userRepository.findByEmail(username)
                        .filter(user -> passwordEncoder.matches(password, user.getPassword()))
                        .map(user -> {
                            String accessToken = generateAccessToken(user);
                            String refreshToken = generateRefreshToken(user);

                            Map<String, Object> response = new HashMap<>();
                            response.put("access_token", accessToken);
                            response.put("refresh_token", refreshToken);
                            response.put("token_type", "Bearer");
                            response.put("expires_in", 3600);
                            response.put("scope", "openid profile email");

                            return ResponseEntity.ok(response);
                        }))
                    .orElse(ResponseEntity.status(401)
                        .body(Map.of(
                            "error", "invalid_grant",
                            "error_description", "Invalid credentials",
                            "error_uri", "/docs/errors/auth"
                        )));
            } else {
                TokenResponse response = oauthService.token(grant_type, code, refresh_token, 
                    username, password, client_id, client_secret);
                return ResponseEntity.ok(response);
            }
        } catch (Exception e) {
            log.error("Token error", e);
            return ResponseEntity.status(400)
                .body(Map.of(
                    "error", "invalid_request",
                    "error_description", e.getMessage()
                ));
        }
    }

    @PostMapping(value = "/register", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> register(@RequestBody UserDTO userDTO, @RequestParam String client_id) {
        return clientRepository.findByClientId(client_id)
            .map(client -> {
                if (userRepository.existsByEmail(userDTO.getEmail())) {
                    return ResponseEntity.status(409)
                        .body(Map.of(
                            "error", "invalid_request",
                            "error_description", "Email already registered"
                        ));
                }

                User user = new User();
                user.setEmail(userDTO.getEmail());
                user.setFirstName(userDTO.getFirstName());
                user.setLastName(userDTO.getLastName());
                user.setPassword(passwordEncoder.encode(userDTO.getPassword()));
                userRepository.save(user);

                String accessToken = generateAccessToken(user);
                String refreshToken = generateRefreshToken(user);

                Map<String, Object> response = new HashMap<>();
                response.put("access_token", accessToken);
                response.put("refresh_token", refreshToken);
                response.put("token_type", "Bearer");
                response.put("expires_in", 3600);
                response.put("scope", "openid profile email");

                return ResponseEntity.ok(response);
            })
            .orElse(ResponseEntity.status(401)
                .body(Map.of(
                    "error", "invalid_client",
                    "error_description", "Client not found"
                )));
    }
} 
package com.openframe.api.controller;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

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
import com.openframe.core.model.User;
import com.openframe.data.repository.mongo.OAuthClientRepository;
import com.openframe.data.repository.mongo.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtEncoder jwtEncoder;
    private final OAuthClientRepository clientRepository;

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

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody UserDTO userDTO) {
        return userRepository.findByEmail(userDTO.getEmail())
            .map(user -> ResponseEntity.badRequest().body("Email already registered"))
            .orElseGet(() -> {
                User user = new User();
                user.setEmail(userDTO.getEmail());
                user.setFirstName(userDTO.getFirstName());
                user.setLastName(userDTO.getLastName());
                user.setPassword(passwordEncoder.encode(userDTO.getPassword()));
                
                userRepository.save(user);
                return ResponseEntity.ok().build();
            });
    }

    @PostMapping("/oauth/token")
    public ResponseEntity<?> token(
            @RequestParam String grant_type,
            @RequestParam String username,
            @RequestParam String password,
            @RequestParam String client_id,
            @RequestParam String client_secret) {
        
        log.debug("Token request - username: {}, grant_type: {}, client_id: {}", 
                 username, grant_type, client_id);

        try {
            return clientRepository.findByClientId(client_id)
                .filter(client -> client.getClientSecret().equals(client_secret))
                .flatMap(client -> userRepository.findByEmail(username)
                    .filter(user -> passwordEncoder.matches(password, user.getPassword()))
                    .map(user -> {
                        String accessToken = generateAccessToken(user);
                        String refreshToken = generateRefreshToken(user);

                        Map<String, Object> response = new HashMap<>();
                        response.put("access_token", accessToken);
                        response.put("refresh_token", refreshToken);
                        response.put("token_type", "bearer");
                        response.put("expires_in", 3600);

                        return ResponseEntity.ok(response);
                    }))
                .orElse(ResponseEntity.status(401).body(Map.of("error", "Invalid credentials")));
        } catch (Exception e) {
            log.error("Token error", e);
            return ResponseEntity.status(400).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/oauth/register")
    public ResponseEntity<?> register(
            @RequestParam String email,
            @RequestParam String password,
            @RequestParam String client_id) {
        
        return clientRepository.findByClientId(client_id)
            .map(client -> {
                if (userRepository.existsByEmail(email)) {
                    return ResponseEntity.badRequest().body("Email already registered");
                }

                User user = new User();
                user.setEmail(email);
                user.setPassword(passwordEncoder.encode(password));
                userRepository.save(user);

                return ResponseEntity.ok().build();
            })
            .orElse(ResponseEntity.badRequest().body("Client not found"));
    }
} 
package com.openframe.api.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.stereotype.Service;

import com.openframe.api.dto.oauth.AuthorizationResponse;
import com.openframe.api.dto.oauth.TokenResponse;
import com.openframe.core.model.OAuthClient;
import com.openframe.core.model.User;
import com.openframe.data.repository.mongo.OAuthClientRepository;
import com.openframe.data.repository.mongo.OAuthTokenRepository;
import com.openframe.data.repository.mongo.UserRepository;
import com.openframe.security.UserSecurity;
import com.openframe.security.jwt.JwtService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class OAuthService {
    private final OAuthClientRepository clientRepository;
    private final OAuthTokenRepository tokenRepository;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${security.oauth2.token.access.expiration-seconds}")
    private int accessTokenExpirationSeconds;

    @Value("${security.oauth2.token.refresh.expiration-seconds}")
    private int refreshTokenExpirationSeconds;

    @Value("${security.oauth2.token.refresh.max-refresh-count}")
    private int maxRefreshCount;

    public TokenResponse token(String grantType, String code, String refreshToken,
            String username, String password, String clientId, String clientSecret) {
        switch (grantType) {
            case "authorization_code":
                return handleAuthorizationCode(code, clientId, clientSecret);
            case "password":
                return handlePasswordGrant(username, password, clientId, clientSecret);
            case "client_credentials":
                return handleClientCredentials(clientId, clientSecret);
            case "refresh_token":
                return handleRefreshToken(refreshToken, clientId, clientSecret);
            default:
                throw new IllegalArgumentException("Unsupported grant type: " + grantType);
        }
    }

    private TokenResponse handleAuthorizationCode(String code, String clientId, String clientSecret) {
        var client = validateClient(clientId, clientSecret);
        var token = tokenRepository.findByAccessToken(code)
            .orElseThrow(() -> new IllegalArgumentException("Invalid authorization code"));
        
        User user = userRepository.findById(token.getUserId())
            .orElseThrow(() -> new IllegalStateException("User not found"));
        UserDetails userDetails = new UserSecurity(user);
        
        // Generate tokens with consistent expiration
        String accessToken = generateAccessToken(userDetails);
        String refreshToken = generateRefreshToken(user);
        
        return TokenResponse.builder()
            .accessToken(accessToken)
            .refreshToken(refreshToken)
            .tokenType("Bearer")
            .expiresIn(accessTokenExpirationSeconds)
            .build();
    }

    private TokenResponse handlePasswordGrant(String username, String password, 
            String clientId, String clientSecret) {
        // Validate client
        validateClient(clientId, clientSecret);
        
        // Find and validate user
        User user = userRepository.findByEmail(username)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        // Verify password
        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new IllegalArgumentException("Invalid credentials");
        }
        
        UserDetails userDetails = new UserSecurity(user);
        
        // Generate tokens with consistent expiration
        String accessToken = generateAccessToken(userDetails);
        String refreshToken = generateRefreshToken(user);
        
        return TokenResponse.builder()
            .accessToken(accessToken)
            .refreshToken(refreshToken)
            .tokenType("Bearer")
            .expiresIn(accessTokenExpirationSeconds)
            .build();
    }

    private TokenResponse handleClientCredentials(String clientId, String clientSecret) {
        // Validate client
        OAuthClient client = validateClient(clientId, clientSecret);
        if (client == null) {
            throw new IllegalArgumentException("Invalid client credentials");
        }
        
        // Generate token with client-specific claims and consistent expiration
        JwtClaimsSet claims = JwtClaimsSet.builder()
            .issuer("https://auth.openframe.com")
            .issuedAt(Instant.now())
            .expiresAt(Instant.now().plusSeconds(accessTokenExpirationSeconds))
            .subject(client.getClientId())
            .claim("grant_type", "client_credentials")
            .claim("scopes", client.getScopes())
            .build();
        
        return TokenResponse.builder()
            .accessToken(jwtService.generateToken(claims))
            .tokenType("Bearer")
            .expiresIn(accessTokenExpirationSeconds)
            .build();
    }

    private TokenResponse handleRefreshToken(String refreshToken, String clientId, String clientSecret) {
        validateClient(clientId, clientSecret);
        
        try {
            var claims = jwtService.decodeToken(refreshToken);
            
            // Check if token has expired
            Instant expiresAt = claims.getExpiresAt();
            if (expiresAt != null && expiresAt.isBefore(Instant.now())) {
                throw new IllegalArgumentException("Refresh token has expired. Please log in again");
            }

            // Get refresh count
            Long refreshCount = claims.getClaim("refresh_count");
            if (refreshCount == null) refreshCount = 0L;
            
            if (refreshCount >= maxRefreshCount) {
                throw new IllegalArgumentException("Maximum refresh count reached. Please log in again");
            }
            
            // Get user from claims
            String userId = claims.getSubject();
            User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalStateException("User not found"));
            
            // Generate new access token and increment refresh count
            UserDetails userDetails = new UserSecurity(user);
            
            // Create new refresh token with incremented count
            JwtClaimsSet newRefreshClaims = JwtClaimsSet.builder()
                .subject(userId)
                .claim("refresh_count", refreshCount + 1)
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(refreshTokenExpirationSeconds))
                .build();
            
            return TokenResponse.builder()
                .accessToken(generateAccessToken(userDetails))
                .refreshToken(jwtService.generateToken(newRefreshClaims))
                .tokenType("Bearer")
                .expiresIn(accessTokenExpirationSeconds)
                .build();
        } catch (Exception e) {
            log.error("Failed to validate refresh token: {}", e.getMessage());
            throw new IllegalArgumentException("Invalid refresh token");
        }
    }

    private String generateAccessToken(UserDetails userDetails) {
        JwtClaimsSet claims = JwtClaimsSet.builder()
            .subject(userDetails.getUsername())
            .claim("email", ((UserSecurity) userDetails).getUser().getEmail())
            .issuedAt(Instant.now())
            .expiresAt(Instant.now().plusSeconds(accessTokenExpirationSeconds))
            .build();
        return jwtService.generateToken(claims);
    }

    public String generateRefreshToken(User user) {
        JwtClaimsSet claims = JwtClaimsSet.builder()
            .subject(user.getId())
            .claim("refresh_count", 0L)
            .issuedAt(Instant.now())
            .expiresAt(Instant.now().plusSeconds(refreshTokenExpirationSeconds))
            .build();
        return jwtService.generateToken(claims);
    }

    private OAuthClient validateClient(String clientId, String clientSecret) {
        log.debug("Validating client - ID: {}", clientId);
        
        return clientRepository.findByClientId(clientId)
            .map(client -> {
                // Only validate secret if one is provided (e.g. not for authorize endpoint)
                if (clientSecret != null) {
                    // Log the lengths to help debug without exposing secrets
                    log.debug("Stored secret length: {}, Provided secret length: {}", 
                        client.getClientSecret() != null ? client.getClientSecret().length() : 0, 
                        clientSecret.length());
                    
                    if (client.getClientSecret() == null || !client.getClientSecret().equals(clientSecret)) {
                        log.error("Invalid client secret for client: {}", clientId);
                        throw new IllegalArgumentException("Invalid client secret");
                    }
                }
                
                log.debug("Client validation successful for: {}", clientId);
                return client;
            })
            .orElseThrow(() -> {
                log.error("Client not found: {}", clientId);
                return new IllegalArgumentException("Client not found");
            });
    }

    public AuthorizationResponse authorize(String responseType, String clientId, 
            String redirectUri, String scope, String state) {
        var client = validateClient(clientId, null);
        
        return AuthorizationResponse.builder()
            .code(UUID.randomUUID().toString())
            .state(state)
            .redirectUri(redirectUri)
            .build();
    }

    public User register(String email, String password, String clientId) {
        // Validate client
        validateClient(clientId, null);
        
        // Check if user exists
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email already registered");
        }
        
        // Create new user
        User user = new User();
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        
        User savedUser = userRepository.save(user);
        
        // Don't return password in response
        savedUser.setPassword(null);
        return savedUser;
    }

    public void initiatePasswordReset(String email) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        // Generate reset token
        String resetToken = UUID.randomUUID().toString();
        
        // Save reset token to user
        user.setResetToken(resetToken);
        user.setResetTokenExpiry(Instant.now().plus(1, ChronoUnit.HOURS));
        userRepository.save(user);
        
        // TODO: Send email with reset token
        // For now, we'll just print it
        System.out.println("Reset token for " + email + ": " + resetToken);
    }

    public void resetPassword(String token, String newPassword) {
        User user = userRepository.findByResetToken(token)
            .orElseThrow(() -> new IllegalArgumentException("Invalid reset token"));
        
        // Verify token hasn't expired
        if (user.getResetTokenExpiry().isBefore(Instant.now())) {
            throw new IllegalArgumentException("Reset token has expired");
        }
        
        // Update password
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        userRepository.save(user);
    }
} 
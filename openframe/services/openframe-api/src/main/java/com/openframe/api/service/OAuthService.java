package com.openframe.api.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.stereotype.Service;

import com.openframe.api.dto.oauth.AuthorizationResponse;
import com.openframe.api.dto.oauth.TokenResponse;
import com.openframe.api.security.UserSecurity;
import com.openframe.core.model.OAuthClient;
import com.openframe.core.model.User;
import com.openframe.data.repository.OAuthClientRepository;
import com.openframe.data.repository.OAuthTokenRepository;
import com.openframe.data.repository.UserRepository;

import lombok.RequiredArgsConstructor;


@Service
@RequiredArgsConstructor
public class OAuthService {
    private final OAuthClientRepository clientRepository;
    private final OAuthTokenRepository tokenRepository;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

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
        
        return TokenResponse.builder()
            .accessToken(jwtService.generateToken(userDetails))
            .refreshToken(generateRefreshToken())
            .expiresIn(3600)
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
        
        // Generate tokens
        return TokenResponse.builder()
            .accessToken(jwtService.generateToken(userDetails))
            .refreshToken(generateRefreshToken())
            .tokenType("Bearer")
            .expiresIn(3600)
            .build();
    }

    private TokenResponse handleClientCredentials(String clientId, String clientSecret) {
        // Validate client credentials
        OAuthClient client = validateClient(clientId, clientSecret);
        
        // Generate token with client-specific claims
        JwtClaimsSet claims = JwtClaimsSet.builder()
            .issuer("https://auth.openframe.com")
            .issuedAt(Instant.now())
            .expiresAt(Instant.now().plus(1, ChronoUnit.HOURS))
            .subject(client.getClientId())
            .claim("grant_type", "client_credentials")
            .build();
        
        return TokenResponse.builder()
            .accessToken(jwtService.generateToken(claims))
            .tokenType("Bearer")
            .expiresIn(3600)
            .build();
    }

    private TokenResponse handleRefreshToken(String refreshToken, String clientId, String clientSecret) {
        // Validate client
        validateClient(clientId, clientSecret);
        
        // Find token in database
        var token = tokenRepository.findByRefreshToken(refreshToken)
            .orElseThrow(() -> new IllegalArgumentException("Invalid refresh token"));
        
        // Check if refresh token is expired
        if (token.getRefreshTokenExpiry().isBefore(Instant.now())) {
            throw new IllegalArgumentException("Refresh token expired");
        }
        
        // Get user
        User user = userRepository.findById(token.getUserId())
            .orElseThrow(() -> new IllegalStateException("User not found"));
        
        UserDetails userDetails = new UserSecurity(user);
        
        // Generate new tokens
        return TokenResponse.builder()
            .accessToken(jwtService.generateToken(userDetails))
            .refreshToken(generateRefreshToken()) // Generate new refresh token
            .tokenType("Bearer")
            .expiresIn(3600)
            .build();
    }

    private OAuthClient validateClient(String clientId, String clientSecret) {
        return clientRepository.findByClientId(clientId);
    }

    private String generateRefreshToken() {
        return UUID.randomUUID().toString();
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
package com.openframe.api.service;

import com.openframe.api.dto.UserDTO;
import com.openframe.api.dto.oauth.AuthorizationResponse;
import com.openframe.api.dto.oauth.TokenResponse;
import com.openframe.core.model.OAuthClient;
import com.openframe.core.model.OAuthToken;
import com.openframe.core.model.User;
import com.openframe.data.repository.mongo.OAuthClientRepository;
import com.openframe.data.repository.mongo.OAuthTokenRepository;
import com.openframe.data.repository.mongo.UserRepository;
import com.openframe.security.jwt.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class OAuthService {

    private final OAuthClientRepository clientRepository;
    private final OAuthTokenRepository tokenRepository;
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    @Value("${security.oauth2.token.access.expiration-seconds}")
    private int accessTokenExpirationSeconds;

    @Value("${security.oauth2.token.refresh.expiration-seconds}")
    private int refreshTokenExpirationSeconds;

    @Value("${security.oauth2.token.refresh.max-refresh-count}")
    private int maxRefreshCount;

    public String generateAccessToken(User user, String grantType) {
        JwtClaimsSet.Builder claimsBuilder = JwtClaimsSet.builder()
                .subject(user.getId())
                .claim("email", user.getEmail())
                .claim("grant_type", grantType)
                .claim("roles", user.getRoles());

        if (user.getFirstName() != null) {
            claimsBuilder.claim("given_name", user.getFirstName());
        }
        if (user.getLastName() != null) {
            claimsBuilder.claim("family_name", user.getLastName());
        }

        claimsBuilder = claimsBuilder
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(accessTokenExpirationSeconds));

        return jwtService.generateToken(claimsBuilder.build());
    }

    public String generateRefreshToken(String userId, String grantType) {
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .subject(userId)
                .claim("refresh_count", 0L)
                .claim("grant_type", grantType)
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(refreshTokenExpirationSeconds))
                .build();
        return jwtService.generateToken(claims);
    }

    public TokenResponse handleRegistration(UserDTO userDTO, String authHeader) {
        if (!authHeader.startsWith("Basic ")) {
            throw new IllegalArgumentException("Client authentication required");
        }

        String base64Credentials = authHeader.substring("Basic ".length()).trim();
        String credentials = new String(Base64.getDecoder().decode(base64Credentials));
        final String[] values = credentials.split(":", 2);

        if (values.length != 2) {
            throw new IllegalArgumentException("Invalid client credentials format");
        }

        final String clientId = values[0];
        final String clientSecret = values[1];

        return register(userDTO, clientId, clientSecret);
    }

    public TokenResponse token(String grantType, String code,
                               String username, String password, String clientId, String clientSecret) {
        return switch (grantType) {
            case "authorization_code" -> handleAuthorizationCode(code, clientId, clientSecret);
            case "password" -> handlePasswordGrant(username, password, clientId, clientSecret);
            case "client_credentials" -> handleClientCredentials(clientId, clientSecret);
            default -> throw new IllegalArgumentException("Unsupported grant type: " + grantType);
        };
    }

    private TokenResponse handleAuthorizationCode(String code, String clientId, String clientSecret) {
        validateClient(clientId, clientSecret);

        var token = tokenRepository.findByAccessToken(code)
                .orElseThrow(() -> new IllegalArgumentException("Invalid authorization code"));

        if (token.getAccessTokenExpiry().isBefore(Instant.now())) {
            throw new IllegalArgumentException("Authorization code has expired");
        }

        if (!token.getClientId().equals(clientId)) {
            throw new IllegalArgumentException("Invalid client for this authorization code");
        }

        // Delete the used code
        tokenRepository.delete(token);

        // Get user and generate new tokens
        User user = userRepository.findById(token.getUserId())
                .orElseThrow(() -> new IllegalStateException("User not found"));

        String accessToken = generateAccessToken(user, "authorization_code");
        String refreshToken = generateRefreshToken(user.getId(), "authorization_code");

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

        // Generate tokens with consistent expiration
        String accessToken = generateAccessToken(user, "password");
        String refreshToken = generateRefreshToken(user.getId(), "password");

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
                .claim("roles", client.getRoles())
                .build();

        return TokenResponse.builder()
                .accessToken(jwtService.generateToken(claims))
                .refreshToken(generateRefreshToken(clientId, "client_credentials"))
                .tokenType("Bearer")
                .expiresIn(accessTokenExpirationSeconds)
                .build();
    }

    private TokenResponse handleRefreshToken(String refreshToken, String clientId, String clientSecret) {
        validateClient(clientId, clientSecret);

        try {
            var jwt = jwtService.decodeToken(refreshToken);

            // Check if token has expired
            Instant expiresAt = jwt.getExpiresAt();
            if (expiresAt != null && expiresAt.isBefore(Instant.now())) {
                throw new IllegalArgumentException("Refresh token has expired. Please log in again");
            }

            // Get refresh count
            Long refreshCount = jwt.getClaim("refresh_count");
            if (refreshCount == null) {
                refreshCount = 0L;
            }

            if (refreshCount >= maxRefreshCount) {
                throw new IllegalArgumentException("Maximum refresh count reached. Please log in again");
            }

            // Get user from jwt
            String userId = jwt.getSubject();
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new IllegalStateException("User not found"));

            String grantType = jwt.getClaimAsString("grant_type");
            // Generate new access token and increment refresh count
            String accessToken = generateAccessToken(user, grantType);

            // Create new refresh token with incremented count
            JwtClaimsSet newRefreshClaims = JwtClaimsSet.builder()
                    .subject(userId)
                    .claim("refresh_count", refreshCount + 1)
                    .claim("grant_type", grantType)
                    .issuedAt(Instant.now())
                    .expiresAt(Instant.now().plusSeconds(refreshTokenExpirationSeconds))
                    .build();

            return TokenResponse.builder()
                    .accessToken(accessToken)
                    .refreshToken(jwtService.generateToken(newRefreshClaims))
                    .tokenType("Bearer")
                    .expiresIn(accessTokenExpirationSeconds)
                    .build();
        } catch (Exception e) {
            log.error("Failed to validate refresh token: {}", e.getMessage());
            throw new IllegalArgumentException("Invalid refresh token");
        }
    }

    public TokenResponse handleRefreshToken(String clientId, String clientSecret, jakarta.servlet.http.HttpServletRequest request) {
        String refreshToken = jwtService.getRefreshTokenFromCookies(request);
        if (refreshToken == null) {
            throw new IllegalArgumentException("Refresh token not found in secure cookies");
        }

        return handleRefreshToken(refreshToken, clientId, clientSecret);
    }

    public AuthorizationResponse authorize(String responseType, String clientId,
            String redirectUri, String scope, String state, String userId) {
        validateClient(clientId, null);

        if (userId == null || userId.isEmpty()) {
            throw new IllegalArgumentException("User authentication required");
        }

        String code = UUID.randomUUID().toString();
        OAuthToken token = new OAuthToken();
        token.setAccessToken(code);
        token.setClientId(clientId);
        token.setUserId(userId);
        token.setScopes(new String[]{scope});
        token.setAccessTokenExpiry(Instant.now().plus(10, ChronoUnit.MINUTES));
        tokenRepository.save(token);

        return AuthorizationResponse.builder()
                .code(code)
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

    public TokenResponse register(UserDTO userDTO, String clientId, String clientSecret) {
        // Validate client
        validateClient(clientId, clientSecret);

        // Check if user exists
        if (userRepository.existsByEmail(userDTO.getEmail())) {
            throw new IllegalArgumentException("Email already registered");
        }

        // Create new user
        User user = new User();
        user.setEmail(userDTO.getEmail());
        user.setFirstName(userDTO.getFirstName());
        user.setLastName(userDTO.getLastName());
        user.setPassword(passwordEncoder.encode(userDTO.getPassword()));
        user.setRoles(new String[]{"USER"});
        userRepository.save(user);

        // Generate tokens
        String accessToken = generateAccessToken(user, "password");
        String refreshToken = generateRefreshToken(user.getId(), "password");

        return TokenResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(accessTokenExpirationSeconds)
                .build();
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
}

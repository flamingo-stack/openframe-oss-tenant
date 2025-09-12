package com.openframe.authz.service;

import com.openframe.data.document.user.User;
import com.openframe.notification.mail.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;

import static com.openframe.authz.util.ResetTokenUtil.generateResetToken;

@Service
@RequiredArgsConstructor
@Slf4j
public class PasswordResetService {

    private static final String RESET_KEY_PREFIX = "pwdreset:";

    private final RedisTemplate<String, String> redisTemplate;
    private final UserService userService;
    private final EmailService emailService;

    @Value("${openframe.password-reset.ttlMinutes:30}")
    private int ttlMinutes;

    public void createResetToken(String email) {
        Optional<?> userOpt = userService.findActiveByEmail(email);
        if (userOpt.isEmpty()) {
            log.warn("Password reset requested for non-existing email: {}", email);
            return;
        }

        String token = generateResetToken();
        String key = RESET_KEY_PREFIX + token;
        redisTemplate.opsForValue().set(key, email, Duration.ofMinutes(ttlMinutes));

        emailService.sendPasswordResetEmail(email, token);
    }

    public void resetPassword(String token, String newPassword) {
        String key = RESET_KEY_PREFIX + token;
        String email = redisTemplate.opsForValue().get(key);
        if (email == null) {
            throw new IllegalArgumentException("Invalid or expired reset token");
        }

        String userId = userService.findActiveByEmail(email)
                .map(User::getId)
                .orElseThrow(() -> new IllegalArgumentException("User not found for reset token"));

        userService.updatePassword(userId, newPassword);

        redisTemplate.delete(key);
    }
}



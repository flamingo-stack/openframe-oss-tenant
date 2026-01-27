package com.openframe.tests;

import com.openframe.data.dto.user.MeResponse;
import com.openframe.data.dto.user.ResetConfirmRequest;
import com.openframe.data.dto.user.User;
import com.openframe.tests.base.UnauthorizedTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static com.openframe.api.UserApi.*;
import static com.openframe.data.generator.AuthGenerator.resetConfirmRequest;
import static com.openframe.helpers.AuthHelper.getUser;
import static com.openframe.helpers.AuthHelper.saveUser;
import static com.openframe.redis.Redis.getResetToken;
import static org.assertj.core.api.AssertionsForClassTypes.assertThat;

@Tag("unauthorized")
@DisplayName("Reset Password")
public class ResetPasswordTest extends UnauthorizedTest {

    @Test
    @DisplayName("Verify that user can reset password")
    public void testResetPassword() {
        User user = getUser();
        resetPassword(user);
        String token = getResetToken(user.getEmail());
        assertThat(token).isNotNull();
        ResetConfirmRequest confirmRequest = resetConfirmRequest(token);
        confirmReset(confirmRequest);
        user.setPassword(confirmRequest.getNewPassword());
        saveUser(user);
        MeResponse me = me();
        assertThat(me.isAuthenticated()).isTrue();
    }
}

package com.openframe.tests;

import com.openframe.data.dto.error.ErrorResponse;
import com.openframe.data.dto.user.AuthUser;
import com.openframe.data.dto.user.UserRegistrationRequest;
import com.openframe.tests.base.UnauthorizedTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static com.openframe.api.RegistrationApi.attemptRegistration;
import static com.openframe.data.generator.RegistrationGenerator.*;
import static com.openframe.db.collections.UsersCollection.findUser;
import static org.assertj.core.api.Assertions.assertThat;

@Tag("unauthorized")
@DisplayName("Owner User registration - negative")
public class OwnerRegistrationNegativeTest extends UnauthorizedTest {

    @Test
    @DisplayName("Check that user cannot register when Registration is Closed")
    public void testRegistrationClosed() {
        AuthUser existingUser = findUser();
        assertThat(existingUser).as("No Existing user found in DB").isNotNull();
        UserRegistrationRequest user = existingUserRequst(existingUser);
        ErrorResponse expectedResponse = registrationClosedResponse();
        ErrorResponse response = attemptRegistration(user);
        assertThat(response).isEqualTo(expectedResponse);
    }

    @Test
    @DisplayName("Check that user cannot register with Already Registered email")
    public void testRegisterExistingUser() {
        AuthUser existingUser = findUser();
        assertThat(existingUser).as("No Existing user found in DB").isNotNull();
        UserRegistrationRequest user = existingUserRequst(existingUser);
        ErrorResponse expectedResponse = existingUserResponse();
        ErrorResponse response = attemptRegistration(user);
        assertThat(response).isEqualTo(expectedResponse);
    }
}

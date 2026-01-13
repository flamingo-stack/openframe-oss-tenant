package com.openframe.tests.ordered;

import com.openframe.data.dto.request.UserRegistrationRequest;
import com.openframe.data.dto.response.ErrorResponse;
import com.openframe.tests.ordered.base.UnauthorizedTest;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

import static com.openframe.api.RegistrationApi.attemptRegistration;
import static org.assertj.core.api.Assertions.assertThat;

@Tag("unauthorized")
public class NegativeRegistrationTest extends UnauthorizedTest {

    @ParameterizedTest
    @MethodSource("com.openframe.data.dataProviders.UserRegistrationTestDataProvider#registrationClosed")
    public void registrationClosed(UserRegistrationRequest user, ErrorResponse expectedResponse) {
        ErrorResponse response = attemptRegistration(user);
        assertThat(response).isEqualTo(expectedResponse);
    }

    @ParameterizedTest
    @MethodSource("com.openframe.data.dataProviders.UserRegistrationTestDataProvider#registerExistingUser")
    public void registerExistingUser(UserRegistrationRequest user, ErrorResponse expectedResponse) {
        ErrorResponse response = attemptRegistration(user);
        assertThat(response).isEqualTo(expectedResponse);
    }
}

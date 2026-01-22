package com.openframe.data.generator;

import com.openframe.data.dto.error.ErrorResponse;
import com.openframe.data.dto.user.*;
import net.datafaker.Faker;

import java.time.LocalTime;

import static com.openframe.data.generator.DataDefaults.CORRECT_PASSWORD;
import static com.openframe.data.generator.DataDefaults.TENANT_DOMAIN_NAME;

public class RegistrationGenerator {

    private static final Faker faker = new Faker();
    private static final String regexTemplate = "[^a-zA-Z0-9]";

    public static UserRegistrationRequest newUserRegistrationRequest() {
        return UserRegistrationRequest.builder()
                .email(faker.internet().emailAddress())
                .firstName(faker.name().firstName())
                .lastName(faker.name().lastName())
                .password(CORRECT_PASSWORD)
                .tenantName(faker.company().name().replaceAll(regexTemplate, ""))
                .tenantDomain(TENANT_DOMAIN_NAME)
                .build();
    }

    public static UserRegistrationRequest existingUserRequst(AuthUser existingUser) {
        return UserRegistrationRequest.builder()
                .email(existingUser.getEmail())
                .firstName(existingUser.getFirstName())
                .lastName(existingUser.getLastName())
                .password(CORRECT_PASSWORD)
                .tenantName(faker.company().name().replaceAll(regexTemplate, ""))
                .tenantDomain(TENANT_DOMAIN_NAME)
                .build();
    }

    public static UserRegistrationResponse newUserRegistrationResponse(UserRegistrationRequest user) {
        return UserRegistrationResponse.builder()
                .name(user.getTenantName())
                .domain(user.getTenantDomain())
                .status("ACTIVE")
                .plan("FREE")
                .createdAt(LocalTime.now().toString())
                .updatedAt(LocalTime.now().toString())
                .active(true)
                .build();
    }

    public static MeResponse meResponse(User user) {
        return MeResponse.builder().user(user).authenticated(true).build();
    }

    public static ErrorResponse registrationClosedResponse() {
        return ErrorResponse.builder().code("BAD_REQUEST").message("Registration is closed for this organization").build();
    }

    public static ErrorResponse existingUserResponse() {
        return ErrorResponse.builder().code("BAD_REQUEST").message("Registration is closed for this organization").build();
    }
}

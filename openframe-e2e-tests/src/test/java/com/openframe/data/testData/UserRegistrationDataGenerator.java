package com.openframe.data.testData;

import com.openframe.data.dto.db.AuthUser;
import com.openframe.data.dto.request.UserRegistrationRequest;
import com.openframe.data.dto.response.ErrorResponse;
import com.openframe.data.dto.response.MeResponse;
import com.openframe.data.dto.response.RegistrationResponse;
import com.openframe.data.dto.test.User;
import com.openframe.db.UserDB;
import net.datafaker.Faker;

import java.time.LocalTime;

import static com.openframe.support.constants.TestConstants.CORRECT_PASSWORD;
import static com.openframe.support.constants.TestConstants.TENANT_DOMAIN_NAME;

public class UserRegistrationDataGenerator {
    
    private static final Faker faker = new Faker();
    private static final String regexTemplate = "[^a-zA-Z0-9]";

    public static UserRegistrationRequest createOrganization() {
        return UserRegistrationRequest.builder()
                .email(faker.internet().emailAddress())
                .firstName(faker.name().firstName())
                .lastName(faker.name().lastName())
                .password(CORRECT_PASSWORD)
                .tenantName(faker.company().name().replaceAll(regexTemplate, ""))
                .tenantDomain(TENANT_DOMAIN_NAME)
                .build();
    }

    public static UserRegistrationRequest newUser() {
        return UserRegistrationRequest.builder()
                .email(faker.internet().emailAddress())
                .firstName(faker.name().firstName())
                .lastName(faker.name().lastName())
                .password(CORRECT_PASSWORD)
                .tenantName(faker.company().name().replaceAll(regexTemplate, ""))
                .tenantDomain(TENANT_DOMAIN_NAME)
                .build();
    }

    public static UserRegistrationRequest getExistingUser() {
        AuthUser existingUser = UserDB.getFirstUser();
        if (existingUser != null) {
            return UserRegistrationRequest.builder()
                    .email(existingUser.getEmail())
                    .firstName(existingUser.getFirstName())
                    .lastName(existingUser.getLastName())
                    .password(CORRECT_PASSWORD)
                    .tenantName(faker.company().name().replaceAll(regexTemplate, ""))
                    .tenantDomain(TENANT_DOMAIN_NAME)
                    .build();
        }
        throw new RuntimeException("No existing user in DB");
    }

    public static UserRegistrationRequest forTenant(String tenantName) {
        return UserRegistrationRequest.builder()
                .email(faker.internet().emailAddress())
                .firstName(faker.name().firstName())
                .lastName(faker.name().lastName())
                .password(CORRECT_PASSWORD)
                .tenantName(tenantName)
                .tenantDomain(TENANT_DOMAIN_NAME)
                .build();
    }

    public static RegistrationResponse newUserRegistrationResponse(UserRegistrationRequest user) {
        return RegistrationResponse.builder()
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

package com.openframe.data.testData;

import com.openframe.data.dto.request.UserRegistrationRequest;
import net.datafaker.Faker;

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
}

package com.openframe.data;

import lombok.Builder;
import lombok.Data;
import net.datafaker.Faker;

/**
 * Builder pattern for user registration data
 */
@Data
@Builder
public class UserRegistrationBuilder {
    
    private String email;
    private String firstName;
    private String lastName;
    private String password;
    private String tenantName;
    private String tenantDomain;

    private static String tenantDomainName = "localhost";
    private static String correctPassword = "Password123!";
    private static String regexTemplate = "[^a-zA-Z0-9]";

    public static UserRegistrationBuilder random() {
        Faker faker = new Faker();
        return UserRegistrationBuilder.builder()
                .email(faker.internet().emailAddress())
                .firstName(faker.name().firstName())
                .lastName(faker.name().lastName())
                .password(correctPassword)
                .tenantName(faker.company().name().replaceAll(regexTemplate, ""))
                .tenantDomain(tenantDomainName)
                .build();
    }

    public static UserRegistrationBuilder forTenant(String tenantName) {
        Faker faker = new Faker();
        return UserRegistrationBuilder.builder()
                .email(faker.internet().emailAddress())
                .firstName(faker.name().firstName())
                .lastName(faker.name().lastName())
                .password(correctPassword)
                .tenantName(tenantName)
                .tenantDomain(tenantDomainName)
                .build();
    }
}
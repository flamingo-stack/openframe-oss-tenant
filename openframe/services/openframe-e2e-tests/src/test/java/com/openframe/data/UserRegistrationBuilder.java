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
    
    /**
     * Create random test data using Faker
     */
    public static UserRegistrationBuilder random() {
        Faker faker = new Faker();
        return UserRegistrationBuilder.builder()
                .email(faker.internet().emailAddress())
                .firstName(faker.name().firstName())
                .lastName(faker.name().lastName())
                .password("Password123!")
                .tenantName(faker.company().name().replaceAll("[^a-zA-Z0-9]", ""))
                .tenantDomain("localhost")
                .build();
    }
    
    /**
     * Create data with custom email
     */
    public static UserRegistrationBuilder withEmail(String email) {
        Faker faker = new Faker();
        return UserRegistrationBuilder.builder()
                .email(email)
                .firstName(faker.name().firstName())
                .lastName(faker.name().lastName())
                .password("Password123!")
                .tenantName(faker.company().name().replaceAll("[^a-zA-Z0-9]", ""))
                .tenantDomain("localhost")
                .build();
    }
    
    /**
     * Create data for specific tenant
     */
    public static UserRegistrationBuilder forTenant(String tenantName) {
        Faker faker = new Faker();
        return UserRegistrationBuilder.builder()
                .email(faker.internet().emailAddress())
                .firstName(faker.name().firstName())
                .lastName(faker.name().lastName())
                .password("Password123!")
                .tenantName(tenantName)
                .tenantDomain("localhost")
                .build();
    }
    
    /**
     * Create invalid data for negative testing
     */
    public static UserRegistrationBuilder invalid() {
        return UserRegistrationBuilder.builder()
                .email("invalid-email")
                .firstName("")
                .lastName("")
                .password("123")
                .tenantName("")
                .tenantDomain("")
                .build();
    }
}
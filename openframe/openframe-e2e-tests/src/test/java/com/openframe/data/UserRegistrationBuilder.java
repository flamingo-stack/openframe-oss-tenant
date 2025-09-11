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

    public static UserRegistrationBuilder withStrongPassword() {
        Faker faker = new Faker();
        return UserRegistrationBuilder.builder()
                .email(faker.internet().emailAddress())
                .firstName(faker.name().firstName())
                .lastName(faker.name().lastName())
                .password("StrongPass123!@#")
                .tenantName(faker.company().name().replaceAll("[^a-zA-Z0-9]", ""))
                .tenantDomain("localhost")
                .build();
    }

    public static UserRegistrationBuilder withWeakPassword() {
        Faker faker = new Faker();
        return UserRegistrationBuilder.builder()
                .email(faker.internet().emailAddress())
                .firstName(faker.name().firstName())
                .lastName(faker.name().lastName())
                .password("123")
                .tenantName(faker.company().name().replaceAll("[^a-zA-Z0-9]", ""))
                .tenantDomain("localhost")
                .build();
    }

    public static UserRegistrationBuilder withSpecialCharactersInName() {
        Faker faker = new Faker();
        return UserRegistrationBuilder.builder()
                .email(faker.internet().emailAddress())
                .firstName("José María")
                .lastName("O'Connor-Smith")
                .password("Password123!")
                .tenantName(faker.company().name().replaceAll("[^a-zA-Z0-9]", ""))
                .tenantDomain("localhost")
                .build();
    }

    public static UserRegistrationBuilder withUnicodeCharacters() {
        Faker faker = new Faker();
        return UserRegistrationBuilder.builder()
                .email(faker.internet().emailAddress())
                .firstName("Александр")
                .lastName("Петров")
                .password("Password123!")
                .tenantName(faker.company().name().replaceAll("[^a-zA-Z0-9]", ""))
                .tenantDomain("localhost")
                .build();
    }
}
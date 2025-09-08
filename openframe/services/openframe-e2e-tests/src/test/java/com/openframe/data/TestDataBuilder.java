package com.openframe.data;

import net.datafaker.Faker;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

/**
 * Advanced test data builder for various scenarios
 */
public class TestDataBuilder {
    
    private static final Faker faker = new Faker();
    
    /**
     * Create multiple user registration data
     */
    public static List<UserRegistrationBuilder> createUsers(int count) {
        return IntStream.range(0, count)
                .mapToObj(i -> UserRegistrationBuilder.random())
                .collect(Collectors.toList());
    }
    
    /**
     * Create users for specific tenant
     */
    public static List<UserRegistrationBuilder> createUsersForTenant(String tenantName, int count) {
        return IntStream.range(0, count)
                .mapToObj(i -> UserRegistrationBuilder.forTenant(tenantName))
                .collect(Collectors.toList());
    }
    
    /**
     * Create test data with specific patterns
     */
    public static class UserRegistrationDataBuilder {
        private String email;
        private String firstName;
        private String lastName;
        private String password;
        private String tenantName;
        private String tenantDomain;
        
        public UserRegistrationDataBuilder email(String email) {
            this.email = email;
            return this;
        }
        
        public UserRegistrationDataBuilder firstName(String firstName) {
            this.firstName = firstName;
            return this;
        }
        
        public UserRegistrationDataBuilder lastName(String lastName) {
            this.lastName = lastName;
            return this;
        }
        
        public UserRegistrationDataBuilder password(String password) {
            this.password = password;
            return this;
        }
        
        public UserRegistrationDataBuilder tenantName(String tenantName) {
            this.tenantName = tenantName;
            return this;
        }
        
        public UserRegistrationDataBuilder tenantDomain(String tenantDomain) {
            this.tenantDomain = tenantDomain;
            return this;
        }
        
        public UserRegistrationDataBuilder withRandomEmail() {
            this.email = faker.internet().emailAddress();
            return this;
        }
        
        public UserRegistrationDataBuilder withRandomName() {
            this.firstName = faker.name().firstName();
            this.lastName = faker.name().lastName();
            return this;
        }
        
        public UserRegistrationDataBuilder withStrongPassword() {
            this.password = "StrongPass123!@#";
            return this;
        }
        
        public UserRegistrationDataBuilder withWeakPassword() {
            this.password = "123";
            return this;
        }
        
        public UserRegistrationDataBuilder withValidPassword() {
            // Мінімум 8 символів, одна велика літера, одна цифра, один спеціальний символ
            this.password = "ValidPass123!";
            return this;
        }
        
        public UserRegistrationDataBuilder withInvalidPassword() {
            // Невалідний пароль - занадто короткий і не відповідає вимогам
            this.password = "Passr!";
            return this;
        }
        
        public UserRegistrationDataBuilder withRandomTenant() {
            this.tenantName = faker.company().name().replaceAll("[^a-zA-Z0-9]", "");
            return this;
        }
        
        public UserRegistrationBuilder build() {
            return UserRegistrationBuilder.builder()
                    .email(email)
                    .firstName(firstName)
                    .lastName(lastName)
                    .password(password)
                    .tenantName(tenantName)
                    .tenantDomain(tenantDomain)
                    .build();
        }
    }
    
    /**
     * Create builder instance
     */
    public static UserRegistrationDataBuilder builder() {
        return new UserRegistrationDataBuilder();
    }
    
    /**
     * Create data for edge cases
     */
    public static class EdgeCaseBuilder {
        
        public static UserRegistrationBuilder veryLongEmail() {
            String longEmail = faker.lorem().characters(100) + "@" + faker.lorem().characters(50) + ".com";
            return builder()
                    .email(longEmail)
                    .withRandomName()
                    .withStrongPassword()
                    .withRandomTenant()
                    .tenantDomain("localhost")
                    .build();
        }
        
        public static UserRegistrationBuilder specialCharactersInName() {
            return builder()
                    .withRandomEmail()
                    .firstName("José María")
                    .lastName("O'Connor-Smith")
                    .withStrongPassword()
                    .withRandomTenant()
                    .tenantDomain("localhost")
                    .build();
        }
        
        public static UserRegistrationBuilder unicodeCharacters() {
            return builder()
                    .withRandomEmail()
                    .firstName("Александр")
                    .lastName("Петров")
                    .withStrongPassword()
                    .withRandomTenant()
                    .tenantDomain("localhost")
                    .build();
        }
        
        public static UserRegistrationBuilder emptyFields() {
            return builder()
                    .email("")
                    .firstName("")
                    .lastName("")
                    .password("")
                    .tenantName("")
                    .tenantDomain("")
                    .build();
        }
        
        public static UserRegistrationBuilder nullFields() {
            return builder()
                    .email(null)
                    .firstName(null)
                    .lastName(null)
                    .password(null)
                    .tenantName(null)
                    .tenantDomain(null)
                    .build();
        }
    }
    
    /**
     * Create API request data
     */
    public static Map<String, Object> createApiRequest(String endpoint, Object data) {
        return Map.of(
            "endpoint", endpoint,
            "data", data,
            "timestamp", System.currentTimeMillis(),
            "testId", faker.internet().uuid()
        );
    }
}


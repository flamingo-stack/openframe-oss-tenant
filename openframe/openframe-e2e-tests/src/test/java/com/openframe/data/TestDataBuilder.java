package com.openframe.data;

import net.datafaker.Faker;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

public class TestDataBuilder {
    
    private static final Faker faker = new Faker();

    public static List<UserRegistrationBuilder> createUsers(int count) {
        return IntStream.range(0, count)
                .mapToObj(i -> UserRegistrationBuilder.random())
                .collect(Collectors.toList());
    }

    public static List<UserRegistrationBuilder> createUsersForTenant(String tenantName, int count) {
        return IntStream.range(0, count)
                .mapToObj(i -> UserRegistrationBuilder.forTenant(tenantName))
                .collect(Collectors.toList());
    }

    @Deprecated
    public static UserRegistrationBuilder.UserRegistrationBuilderBuilder builder() {
        return UserRegistrationBuilder.builder();
    }

    public static class EdgeCaseBuilder {
        
        public static UserRegistrationBuilder veryLongEmail() {
            String longEmail = faker.lorem().characters(100) + "@" + faker.lorem().characters(50) + ".com";
            return UserRegistrationBuilder.builder()
                    .email(longEmail)
                    .firstName(faker.name().firstName())
                    .lastName(faker.name().lastName())
                    .password("StrongPass123!@#")
                    .tenantName(faker.company().name().replaceAll("[^a-zA-Z0-9]", ""))
                    .tenantDomain("localhost")
                    .build();
        }
        
        public static UserRegistrationBuilder specialCharactersInName() {
            return UserRegistrationBuilder.withSpecialCharactersInName();
        }
        
        public static UserRegistrationBuilder unicodeCharacters() {
            return UserRegistrationBuilder.withUnicodeCharacters();
        }
        
        public static UserRegistrationBuilder emptyFields() {
            return UserRegistrationBuilder.builder()
                    .email("")
                    .firstName("")
                    .lastName("")
                    .password("")
                    .tenantName("")
                    .tenantDomain("")
                    .build();
        }
        
        public static UserRegistrationBuilder nullFields() {
            return UserRegistrationBuilder.builder()
                    .email(null)
                    .firstName(null)
                    .lastName(null)
                    .password(null)
                    .tenantName(null)
                    .tenantDomain(null)
                    .build();
        }
    }

    public static Map<String, Object> createApiRequest(String endpoint, Object data) {
        return Map.of(
            "endpoint", endpoint,
            "data", data,
            "timestamp", System.currentTimeMillis(),
            "testId", faker.internet().uuid()
        );
    }
}


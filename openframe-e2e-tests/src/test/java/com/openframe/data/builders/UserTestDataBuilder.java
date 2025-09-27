package com.openframe.data.builders;

import com.openframe.data.dto.request.UserRegistrationRequest;
import net.datafaker.Faker;

import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

/**
 * Test data builder for user-related entities
 * Following best practices for test data generation
 */
public class UserTestDataBuilder {
    
    private static final Faker faker = new Faker();
    
    /**
     * Creates multiple users for bulk testing
     * Returns UserRegistrationRequest (DTO) instead of Builder for better separation of concerns
     * 
     * @param count number of users to create
     * @return list of UserRegistrationRequest DTOs ready for API calls
     */
    public static List<UserRegistrationRequest> createUsers(int count) {
        return IntStream.range(0, count)
                .mapToObj(i -> createRandomUserRequest())
                .collect(Collectors.toList());
    }
    
    /**
     * Creates a single random user request
     * @return UserRegistrationRequest DTO
     */
    public static UserRegistrationRequest createRandomUserRequest() {
        return UserRegistrationRequest.builder()
                .email(faker.internet().emailAddress())
                .firstName(faker.name().firstName())
                .lastName(faker.name().lastName())
                .password("Password123!")
                .tenantName(faker.company().name().replaceAll("[^a-zA-Z0-9]", ""))
                .tenantDomain("localhost")
                .build();
    }
    
    /**
     * Creates users with specific tenant
     * @param count number of users
     * @param tenantName tenant name for all users
     * @return list of UserRegistrationRequest DTOs
     */
    public static List<UserRegistrationRequest> createUsersForTenant(int count, String tenantName) {
        return IntStream.range(0, count)
                .mapToObj(i -> UserRegistrationRequest.builder()
                        .email(faker.internet().emailAddress())
                        .firstName(faker.name().firstName())
                        .lastName(faker.name().lastName())
                        .password("Password123!")
                        .tenantName(tenantName)
                        .tenantDomain("localhost")
                        .build())
                .collect(Collectors.toList());
    }
    
    /**
     * Creates users with different validation scenarios
     * @param count number of users
     * @return list with mix of valid and edge-case users
     */
    public static List<UserRegistrationRequest> createUsersWithEdgeCases(int count) {
        return IntStream.range(0, count)
                .mapToObj(i -> {
                    if (i % 3 == 0) {
                        // Every 3rd user has special characters
                        return createUserWithSpecialCharacters();
                    } else if (i % 5 == 0) {
                        // Every 5th user has unicode characters
                        return createUserWithUnicode();
                    } else {
                        // Regular users
                        return createRandomUserRequest();
                    }
                })
                .collect(Collectors.toList());
    }
    
    private static UserRegistrationRequest createUserWithSpecialCharacters() {
        return UserRegistrationRequest.builder()
                .email(faker.internet().emailAddress())
                .firstName("José María")
                .lastName("O'Connor-Smith")
                .password("Password123!")
                .tenantName(faker.company().name().replaceAll("[^a-zA-Z0-9]", ""))
                .tenantDomain("localhost")
                .build();
    }
    
    private static UserRegistrationRequest createUserWithUnicode() {
        return UserRegistrationRequest.builder()
                .email(faker.internet().emailAddress())
                .firstName("Александр")
                .lastName("Петров")
                .password("Password123!")
                .tenantName(faker.company().name().replaceAll("[^a-zA-Z0-9]", ""))
                .tenantDomain("localhost")
                .build();
    }
}

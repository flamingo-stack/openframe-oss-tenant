package com.openframe.data.dataProviders;

import org.junit.jupiter.params.provider.Arguments;

import java.util.stream.Stream;

/**
 * Centralized test data provider for User Registration negative tests
 * Contains all test parameters with method aliases for different test scenarios
 */
public class UserRegistrationTestDataProvider {

    /**
     * Invalid password test cases based on exact validation rules:
     * - Minimum 8 characters
     * - At least 1 uppercase letter
     * - At least 1 lowercase letter  
     * - At least 1 digit
     * - At least 1 special character
     */
    public static Stream<Arguments> invalidPasswords() {
        return Stream.of(
            // Too short (< 8 characters)
            Arguments.of(""),                     // Empty
            Arguments.of("P1!"),                  // 3 chars
            Arguments.of("Pass1!"),               // 6 chars
            Arguments.of("Passw1!"),              // 7 chars
            
            // Missing uppercase letter
            Arguments.of("password123!"),         // No uppercase
            Arguments.of("pass123!@#"),           // No uppercase
            Arguments.of("12345678!"),            // No uppercase
            
            // Missing lowercase letter
            Arguments.of("PASSWORD123!"),         // No lowercase
            Arguments.of("PASS123!@#"),           // No lowercase
            Arguments.of("12345678!"),            // No lowercase (duplicate but different reason)
            
            // Missing digit
            Arguments.of("Password!@#"),          // No digit
            Arguments.of("PassWord!@#"),          // No digit
            Arguments.of("PASS!@#word"),          // No digit
            
            // Missing special character
            Arguments.of("Password123"),          // No special char
            Arguments.of("PASSWORD123"),          // No special char
            Arguments.of("password123"),          // No special char
            
            // Multiple missing requirements
            Arguments.of("password"),             // No uppercase, no digit, no special
            Arguments.of("PASSWORD"),             // No lowercase, no digit, no special
            Arguments.of("12345678"),             // No uppercase, no lowercase, no special
            Arguments.of("!@#$%^&*"),             // No uppercase, no lowercase, no digit
            
            // Edge cases
            Arguments.of("   "),                  // Only spaces
            Arguments.of("        "),             // 8 spaces (meets length but invalid)
            Arguments.of("Pass 123!"),            // Contains space (if not allowed)
            Arguments.of("Pass\t123!"),           // Contains tab
            Arguments.of("Pass\n123!")            // Contains newline
        );
    }

    /**
     * Invalid email test cases based on standard email validation
     * Standard RFC 5322 email format violations
     */
    public static Stream<Arguments> invalidEmails() {
        return Stream.of(
            // Empty and basic format errors
            Arguments.of(""),                       // Empty email
            Arguments.of("   "),                    // Only spaces
            Arguments.of("invalid-email"),          // No @ symbol
            Arguments.of("@domain.com"),           // Missing local part
            Arguments.of("user@"),                 // Missing domain
            Arguments.of("user@domain"),           // Missing TLD
            
            // Multiple @ symbols
            Arguments.of("user@domain@domain.com"), // Multiple @
            Arguments.of("user@@domain.com"),       // Double @
            Arguments.of("@user@domain.com"),       // @ at start
            
            // Invalid characters and spacing
            Arguments.of("user name@domain.com"),   // Space in local part
            Arguments.of("user@domain .com"),       // Space in domain
            Arguments.of("user@domain. com"),       // Space after dot
            Arguments.of("user @domain.com"),       // Space before @
            Arguments.of("user@ domain.com"),       // Space after @
            
            // Dot placement issues
            Arguments.of(".user@domain.com"),       // Starting with dot
            Arguments.of("user.@domain.com"),       // Ending with dot before @
            Arguments.of("user@.domain.com"),       // Domain starting with dot
            Arguments.of("user@domain."),           // Domain ending with dot
            Arguments.of("user..name@domain.com"),  // Consecutive dots in local
            Arguments.of("user@domain..com"),       // Consecutive dots in domain
            
            // Invalid domain formats
            Arguments.of("user@domain,com"),        // Comma instead of dot
            Arguments.of("user@domain;com"),        // Semicolon
            Arguments.of("user@domain:com"),        // Colon
            Arguments.of("user@domain/com"),        // Slash
            Arguments.of("user@domain\\com"),       // Backslash
            
            // Special characters in wrong places
            Arguments.of("user@"),                  // Just @
            Arguments.of("@"),                      // Only @
            Arguments.of("user@domain@")          // @ at end
        );
    }

    /**
     * Invalid first name test cases
     */
    public static Stream<Arguments> invalidFirstNames() {
        return Stream.of(
            Arguments.of("1111111"),                // numbers
            Arguments.of("John123"),                // Contains numbers
            Arguments.of("John@Smith"),             // Contains special characters
            Arguments.of("John#Smith"),             // Contains hash
            Arguments.of("John$mith"),              // Contains dollar sign
            Arguments.of("John%Smith"),             // Contains percent
            Arguments.of("John&Smith"),             // Contains ampersand
            Arguments.of("John*Smith"),             // Contains asterisk
            Arguments.of("John+Smith"),             // Contains plus
            Arguments.of("John=Smith"),             // Contains equals
            Arguments.of("John<Smith"),             // Contains less than
            Arguments.of("John>Smith"),             // Contains greater than
            Arguments.of("John?Smith"),             // Contains question mark
            Arguments.of("John|Smith"),             // Contains pipe
            Arguments.of("John\\Smith"),            // Contains backslash
            Arguments.of("John/Smith"),             // Contains forward slash
            Arguments.of("VeryLongFirstNameThatExceedsReasonableLimitsForPersonNames"), // Too long
            Arguments.of("123John"),                // Starts with number
            Arguments.of("@John"),                  // Starts with special char
            Arguments.of("John "),                  // Trailing space
            Arguments.of(" John"),                  // Leading space
            Arguments.of("Jo hn")                   // Space in middle
        );
    }

    /**
     * Invalid last name test cases
     */
    public static Stream<Arguments> invalidLastNames() {
        return Stream.of(
            Arguments.of("222222222"),                      // numbers
            Arguments.of("Smith123"),               // Contains numbers
            Arguments.of("Smith@Johnson"),          // Contains special characters
            Arguments.of("Smith#Johnson"),          // Contains hash
            Arguments.of("Smith$Johnson"),          // Contains dollar sign
            Arguments.of("Smith%Johnson"),          // Contains percent
            Arguments.of("Smith&Johnson"),          // Contains ampersand
            Arguments.of("Smith*Johnson"),          // Contains asterisk
            Arguments.of("Smith+Johnson"),          // Contains plus
            Arguments.of("Smith=Johnson"),          // Contains equals
            Arguments.of("Smith<Johnson"),          // Contains less than
            Arguments.of("Smith>Johnson"),          // Contains greater than
            Arguments.of("Smith?Johnson"),          // Contains question mark
            Arguments.of("Smith|Johnson"),          // Contains pipe
            Arguments.of("Smith\\Johnson"),         // Contains backslash
            Arguments.of("Smith/Johnson"),          // Contains forward slash
            Arguments.of("VeryLongLastNameThatExceedsReasonableLimitsForPersonSurnames"), // Too long
            Arguments.of("123Smith"),               // Starts with number
            Arguments.of("@Smith"),                 // Starts with special char
            Arguments.of("Smith "),                 // Trailing space
            Arguments.of(" Smith"),                 // Leading space
            Arguments.of("Sm ith")                  // Space in middle
        );
    }

    /**
     * Invalid tenant name test cases
     */
    public static Stream<Arguments> invalidTenantNames() {
        return Stream.of(
            Arguments.of("a"),                      // Too short (1 character)
            Arguments.of("2222222222"),                     // Too short (2 characters)
            Arguments.of("tenant name"),            // Contains space
            Arguments.of("tenant@name"),            // Contains @
            Arguments.of("tenant#name"),            // Contains hash
            Arguments.of("tenant$name"),            // Contains dollar
            Arguments.of("tenant%name"),            // Contains percent
            Arguments.of("tenant&name"),            // Contains ampersand
            Arguments.of("tenant*name"),            // Contains asterisk
            Arguments.of("tenant+name"),            // Contains plus
            Arguments.of("tenant=name"),            // Contains equals
            Arguments.of("tenant<name"),            // Contains less than
            Arguments.of("tenant>name"),            // Contains greater than
            Arguments.of("tenant?name"),            // Contains question mark
            Arguments.of("tenant|name"),            // Contains pipe
            Arguments.of("tenant\\name"),           // Contains backslash
            Arguments.of("tenant/name"),            // Contains forward slash
            Arguments.of("tenant.name"),            // Contains dot
            Arguments.of("tenant,name"),            // Contains comma
            Arguments.of("tenant;name"),            // Contains semicolon
            Arguments.of("tenant:name"),            // Contains colon
            Arguments.of("tenant'name"),            // Contains apostrophe
            Arguments.of("tenant\"name"),           // Contains quote
            Arguments.of("VeryLongTenantNameThatExceedsMaximumAllowedLengthForTenantNames") // Too long

        );
    }
}

package com.openframe.data.dataProviders;

import com.openframe.data.dto.request.UserRegistrationRequest;
import com.openframe.data.dto.response.RegistrationResponse;
import org.junit.jupiter.params.provider.Arguments;

import java.util.stream.Stream;

import static com.openframe.data.testData.UserRegistrationDataGenerator.*;

/**
 * Centralized test data provider for User Registration negative tests
 * Contains all test parameters with method aliases for different test scenarios
 */
public class UserRegistrationTestDataProvider {

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
            
            // Missing lowercase letter
            Arguments.of("PASSWORD123!"),         // No lowercase
            Arguments.of("PASS123!@#"),           // No lowercase
            Arguments.of("12345678!"),            // No lowercase (duplicate but different reason)
            
            // Missing digit
            Arguments.of("Password!@#"),          // No digit
            Arguments.of("PASS!@#word"),          // No digit
            
            // Missing special character
            Arguments.of("Password123"),          // No special char
            
            // Multiple missing requirements
            Arguments.of("password"),             // No uppercase, no digit, no special
            Arguments.of("PASSWORD"),             // No lowercase, no digit, no special
            Arguments.of("12345678"),             // No uppercase, no lowercase, no special
            Arguments.of("!@#$%^&*"),             // No uppercase, no lowercase, no digit
            
            // Edge cases
            Arguments.of(" "),                    // Only spaces
            Arguments.of("        ")              // 8 spaces (meets length but invalid)
        );
    }

    /**
     * Invalid email test cases based on standard email validation
     * Standard RFC 5322 email format violations
     */
    public static Stream<Arguments> invalidEmails() {
        return Stream.of(
            // Empty and basic format errors
            Arguments.of(""),                      // Empty email
            Arguments.of("   "),                   // Only spaces
            Arguments.of("invalid-email"),         // No @ symbol
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
            Arguments.of("user@domain."),           // Domain ending with dot
            Arguments.of("user@domain..com"),       // Consecutive dots in domain
            
            // Invalid domain formats
            Arguments.of("user@domain,com"),        // Comma instead of dot
            Arguments.of("user@domain\\com"),       // Backslash
            
            // Special characters in wrong places
            Arguments.of("user@"),                  // Just @
            Arguments.of("@"),                      // Only @
            Arguments.of("user@domain@")            // @ at end
        );
    }

    /**
     * Invalid first name test cases
     * Rule: letters only (plus - ' space), 1–50 chars
     */
    public static Stream<Arguments> invalidFirstNames() {
        return Stream.of(
            // Empty string (below minimum length)
            Arguments.of(""),                       // Empty string (0 chars)
            
            // Too long (exceeds 50 characters)
            Arguments.of("VeryLongFirstNameThatExceedsTheMaximumFiftyCharacterLimit"), // 51+ chars
            
            // Contains digits (not allowed)
            Arguments.of("John1"),                  // Contains digit
            Arguments.of("123"),                    // Only digits
            
            // Contains invalid special characters (only - ' space are allowed)
            Arguments.of("John@Smith"),             // Contains @
            Arguments.of("John\\Smith"),            // Contains \
            Arguments.of("John[Smith]"),            // Contains [] (not allowed)
            Arguments.of("John{Smith}"),            // Contains {} (not allowed)
            
            // Control characters and whitespace issues
            Arguments.of("John\tSmith"),            // Contains tab
            Arguments.of("John\nSmith      ")       // Contains newline
        );
    }

    /**
     * Invalid last name test cases
     * Rule: letters only (plus - ' space), 1–50 chars
     */
    public static Stream<Arguments> invalidLastNames() {
        return Stream.of(
            Arguments.of(""),                       // Empty string (0 chars)
            Arguments.of("VeryLongLastNameThatExceedsTheMaximumFiftyCharacterLimit"), // 51+ chars
            
            // Contains digits (not allowed)
            Arguments.of("Smith1"),                 // Contains digit
            Arguments.of("999"),                    // Only digits
            
            // Contains invalid special characters (only - ' space are allowed)
            Arguments.of("Smith@Johnson"),          // Contains @
            Arguments.of("Smith\\Johnson"),         // Contains \
            Arguments.of("Smith:Johnson"),          // Contains : (not allowed)
            Arguments.of("Smith\"Johnson"),         // Contains " (not allowed)
            Arguments.of("Smith[Johnson]"),         // Contains [] (not allowed)
            Arguments.of("Smith{Johnson}"),         // Contains {} (not allowed)
            
            // Control characters and whitespace issues
            Arguments.of("Smith\tJohnson"),         // Contains tab
            Arguments.of("Smith\nJohnson"),         // Contains newline
            Arguments.of("Smith\rJohnson")          // Contains carriage return
        );
    }

    /**
     * Invalid tenant name test cases
     * Rule: letters, digits, &.-,() allowed, 2–100 chars
     */
    public static Stream<Arguments> invalidTenantNames() {
        return Stream.of(
            // Too short (below minimum 2 characters)
            Arguments.of(""),                       // Empty string (0 chars)
            Arguments.of("a"),                      // Too short (1 character)
            
            // Too long (exceeds 100 characters)
            Arguments.of("VeryLongTenantNameThatExceedsTheMaximumOneHundredCharacterLimitForOrganizationNamesInThisSystem"), // 101+ chars
            
            // Contains invalid special characters (only &.-,() are allowed)

            Arguments.of("tenant\\name"),           // Contains \ (not allowed)
            Arguments.of("tenant;name"),            // Contains ; (not allowed)
            Arguments.of("tenant\"name"),           // Contains " (not allowed)
            Arguments.of("tenant[name]"),           // Contains [] (not allowed)
            Arguments.of("tenant{name}"),           // Contains {} (not allowed)
            
            // Control characters and whitespace issues
            Arguments.of("tenant\tname"),           // Contains tab
            Arguments.of("tenant\nname"),           // Contains newline
            Arguments.of("tenant\rname")            // Contains carriage return
        );
    }

    public static Stream<Arguments> registerNewUser() {
        UserRegistrationRequest user = newUser();
        RegistrationResponse expectedResponse = newUserRegistrationResponse(user);
        return Stream.of(Arguments.of(user, expectedResponse));
    }

    public static Stream<Arguments> registerExistingUser() {
        return Stream.of(Arguments.of(getExistingUser(), existingUserResponse()));
    }

    public static Stream<Arguments> registrationClosed() {
        return Stream.of(Arguments.of(getExistingUser(), registrationClosedResponse()));
    }
}

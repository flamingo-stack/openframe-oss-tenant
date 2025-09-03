package pageObjects.utils;

import net.datafaker.Faker;
import pageObjects.dto.OrganizationRegistrationData;
import pageObjects.dto.LoginData;

import java.util.Locale;

/**
 * Utility class for generating test data using Faker
 * Following SRP: Single responsibility for test data generation
 */
public class TestDataGenerator {
    
    private static final Faker faker = new Faker(new Locale("en"));
    
    /**
     * Generate random organization registration data
     * @return OrganizationRegistrationData with fake data
     */
    public static OrganizationRegistrationData generateOrganizationRegistrationData() {
        return new OrganizationRegistrationData(
            faker.company().name(),           // Organization name
            faker.name().firstName(),        // First name
            faker.name().lastName(),         // Last name
            faker.internet().emailAddress(), // Email
            generateStrongPassword()         // Password
        );
    }
    
    /**
     * Generate random login data
     * @return LoginData with fake email
     */
    public static LoginData generateLoginData() {
        return new LoginData(faker.internet().emailAddress());
    }
    
    /**
     * Generate a strong password for testing
     * @return Strong password string
     */
    public static String generateStrongPassword() {
        return faker.internet().password(12, 20, true, true, true);
    }
    
    /**
     * Generate random company name
     * @return Company name
     */
    public static String generateCompanyName() {
        return faker.company().name();
    }
    
    /**
     * Generate random first name
     * @return First name
     */
    public static String generateFirstName() {
        return faker.name().firstName();
    }
    
    /**
     * Generate random last name
     * @return Last name
     */
    public static String generateLastName() {
        return faker.name().lastName();
    }
    
    /**
     * Generate random email address
     * @return Email address
     */
    public static String generateEmail() {
        return faker.internet().emailAddress();
    }
    
    /**
     * Generate random domain name
     * @return Domain name
     */
    public static String generateDomain() {
        return faker.internet().domainName();
    }
    
    /**
     * Generate random phone number
     * @return Phone number
     */
    public static String generatePhoneNumber() {
        return faker.phoneNumber().phoneNumber();
    }
    
    /**
     * Generate random address
     * @return Full address
     */
    public static String generateAddress() {
        return faker.address().fullAddress();
    }
}


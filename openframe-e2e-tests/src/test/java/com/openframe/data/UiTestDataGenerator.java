package com.openframe.data;

import net.datafaker.Faker;
import com.openframe.data.dto.OrganizationRegistrationData;
import com.openframe.data.dto.LoginData;

import java.util.Locale;

public class UiTestDataGenerator {
    
    private static final Faker faker;

    static {
        faker = new Faker(new Locale("en"));
    }

    public static OrganizationRegistrationData generateOrganizationRegistrationData() {
        return new OrganizationRegistrationData(
            faker.company().name(),
            faker.name().firstName(),
            faker.name().lastName(),
            faker.internet().emailAddress(),
            generateStrongPassword()
        );
    }

    public static LoginData generateLoginData() {
        return new LoginData(faker.internet().emailAddress());
    }

    public static String generateStrongPassword() {
        return faker.internet().password(12, 20, true, true, true);
    }

    public static String generateCompanyName() {
        return faker.company().name();
    }

    public static String generateFirstName() {
        return faker.name().firstName();
    }

    public static String generateLastName() {
        return faker.name().lastName();
    }

    public static String generateEmail() {
        return faker.internet().emailAddress();
    }

    public static String generateDomain() {
        return faker.internet().domainName();
    }

    public static String generatePhoneNumber() {
        return faker.phoneNumber().phoneNumber();
    }

    public static String generateAddress() {
        return faker.address().fullAddress();
    }
}


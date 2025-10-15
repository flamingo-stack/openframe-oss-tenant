package com.openframe.data.testData;

import net.datafaker.Faker;

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

    public static String generateStrongPassword() {
        return faker.internet().password(12, 20, true, true, true);
    }
}


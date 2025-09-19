package com.openframe.tests.ui;

import lombok.Setter;
import org.junit.jupiter.api.*;
import pageObjects.OpenFrameMainPage;
import com.openframe.data.dto.OrganizationRegistrationData;
import com.openframe.data.UiTestDataGenerator;
import static org.junit.jupiter.api.Assertions.*;


@Disabled("Temporarily disabled - UI tests require specific environment setup")
public class OpenFrameMainPageTest extends UiBaseTest {
    private OpenFrameMainPage mainPage;
    
    @Test
    @DisplayName("Should fill organization registration form with Faker data")
    void testOrganizationRegistrationForm() {
        // Generate fake data using Faker
        OrganizationRegistrationData fakeData = UiTestDataGenerator.generateOrganizationRegistrationData();

        // Fill organization form using sendKeys
        mainPage.setOrganizationName(fakeData.getOrganizationName());
        mainPage.setFirstName(fakeData.getFirstName());
        mainPage.setLastName(fakeData.getLastName());
        mainPage.setRegistrationEmail(fakeData.getEmail());
        mainPage.setPassword(fakeData.getPassword());
        mainPage.setConfirmPassword(fakeData.getPassword());
        
        // Verify form completion
        assertTrue(mainPage.isOrganizationFormComplete(), "Organization form should be complete");
        
        // Verify create button is enabled
        assertTrue(mainPage.isCreateOrganizationButtonEnabled(), "Create organization button should be enabled");
    }
    
    @Test
    @DisplayName("Should validate form interactions interface")
    void testFormInteractions() {
        // Generate fake data
        OrganizationRegistrationData fakeData = UiTestDataGenerator.generateOrganizationRegistrationData();

        //  mainPage.fillForm(fakeData);

        // Verify form completion
        assertTrue(mainPage.isOrganizationFormComplete(), "Organization form should be complete");

        // Verify create button is enabled
        assertTrue(mainPage.isCreateOrganizationButtonEnabled(), "Create organization button should be enabled");

    }

}


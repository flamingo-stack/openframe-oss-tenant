package com.openframe.tests.ui;

import org.junit.jupiter.api.*;
import pageObjects.OpenFrameMainPage;
import pageObjects.dto.OrganizationRegistrationData;
import pageObjects.dto.LoginData;
import pageObjects.utils.TestDataGenerator;
import static org.junit.jupiter.api.Assertions.*;

public class OpenFrameMainPageTest extends UiBaseTest {
    private OpenFrameMainPage mainPage;
    
    @BeforeEach
    void setUpTest() {
        mainPage = new OpenFrameMainPage();
        // Navigate to page before each test
        mainPage.navigateToLocalFile("C:/Users/User/Downloads/Archive/OpenFrame.html");
    }
    
    @Test
    @DisplayName("Should load OpenFrame main page from local HTML file")
    void testPageLoad() {
        // Page is already navigated in @BeforeEach
        // Verify page is loaded
        assertTrue(mainPage.isPageLoaded(), "Page should load successfully");
    }
    
    @Test
    @DisplayName("Should fill organization registration form with Faker data")
    void testOrganizationRegistrationForm() {
        // Generate fake data using Faker
        OrganizationRegistrationData fakeData = TestDataGenerator.generateOrganizationRegistrationData();

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
        OrganizationRegistrationData fakeData = TestDataGenerator.generateOrganizationRegistrationData();

        mainPage.fillForm(fakeData);

        // Verify form completion
        assertTrue(mainPage.isOrganizationFormComplete(), "Organization form should be complete");

        // Verify create button is enabled
        assertTrue(mainPage.isCreateOrganizationButtonEnabled(), "Create organization button should be enabled");

    }
}


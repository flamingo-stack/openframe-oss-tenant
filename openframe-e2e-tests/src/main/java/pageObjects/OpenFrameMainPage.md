<!-- source-hash: ef8878ec42ee92c8d1047a315b235c50 -->
A Page Object Model class that provides methods for interacting with the OpenFrame application's main page, including organization creation and user login functionality.

## Key Components

**Form Interaction Methods:**
- `setOrganizationName()`, `setFirstName()`, `setLastName()` - Input field setters
- `setRegistrationEmail()`, `setLoginEmail()` - Email field handlers for different forms
- `setPassword()`, `setConfirmPassword()` - Password field management
- `clickCreateOrganization()`, `clickContinue()` - Button interaction methods

**Form Validation:**
- `isOrganizationFormComplete()`, `isLoginFormComplete()` - Form completion checks
- `isCreateOrganizationButtonEnabled()`, `isContinueButtonEnabled()` - Button state validation

**Page State Verification:**
- `isPageLoaded()` - Verifies page elements are visible and contain expected content
- `getPageTitle()` - Retrieves the brand title text

**High-Level Actions:**
- `completeOrganizationRegistration()` - Fills entire registration form in one method

## Usage Example

```java
// Initialize page object
OpenFrameMainPage mainPage = new OpenFrameMainPage("https://app.openframe.com");

// Complete organization registration
mainPage.completeOrganizationRegistration(
    "Acme Corp", 
    "John", 
    "Doe", 
    "john.doe@acme.com", 
    "SecurePass123"
);

// Verify form completion and submit
if (mainPage.isOrganizationFormComplete()) {
    mainPage.clickCreateOrganization();
}

// Handle login flow
mainPage.setLoginEmail("existing@user.com");
if (mainPage.isLoginFormComplete()) {
    mainPage.clickContinue();
}
```
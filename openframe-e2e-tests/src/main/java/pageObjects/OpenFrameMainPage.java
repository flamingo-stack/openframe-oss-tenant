package pageObjects;

public class OpenFrameMainPage extends BasePageObject{
    
    // XPath locators for organization creation form
    private static final String ORGANIZATION_NAME_XPATH = "//input[@placeholder='Your company name']";
    private static final String DOMAIN_XPATH = "//input[@placeholder='localhost']";
    
    // XPath locators for manual registration form
    private static final String FIRST_NAME_XPATH = "//input[@placeholder='John']";
    private static final String LAST_NAME_XPATH = "//input[@placeholder='Doe']";
    private static final String REGISTRATION_EMAIL_INPUT = "//div[contains(@class, 'manual-registration')]//input[@type='email']";
    private static final String PASSWORD_XPATH = "//input[@type='password' and @placeholder='Choose a strong password']";
    private static final String CONFIRM_PASSWORD_XPATH = "//input[@type='password' and @placeholder='Confirm your password']";
    private static final String CREATE_ORGANIZATION_BUTTON = "//button[contains(., 'Create Organization')]";
    
    // XPath locators for login form
    private static final String LOGIN_EMAIL_INPUT = "//div[contains(@class, 'auth-section')][2]//input[@type='email']";
    private static final String CONTINUE_BUTTON = "//button[contains(., 'Continue')]";
    
    // XPath locators for page elements
    private static final String BRAND_TITLE = "//h1[contains(@class, 'brand-logo')]";
    private static final String AUTH_SUBTITLE = "//p[contains(@class, 'auth-subtitle')]";
    
    // Constructors
    public OpenFrameMainPage() {
        super();
    }
    
    public OpenFrameMainPage(String baseUrl) {
        super(baseUrl);
    }
    
    // ========== Organization Form Methods ==========
    
    public void setOrganizationName(String organizationName) {
        sendKeysByXPath(ORGANIZATION_NAME_XPATH, organizationName);
    }
    
    public String getOrganizationName() {
        return getAttributeByXPath(ORGANIZATION_NAME_XPATH, "value");
    }
    
    public String getDomain() {
        return getAttributeByXPath(DOMAIN_XPATH, "value");
    }
    
    public boolean isDomainFieldDisabled() {
        return getAttributeByXPath(DOMAIN_XPATH, "disabled") != null;
    }
    
    // ========== Registration Form Methods ==========
    
    public void setFirstName(String firstName) {
        sendKeysByXPath(FIRST_NAME_XPATH, firstName);
    }
    
    public void setLastName(String lastName) {
        sendKeysByXPath(LAST_NAME_XPATH, lastName);
    }
    
    public void setRegistrationEmail(String email) {
        sendKeysByXPath(REGISTRATION_EMAIL_INPUT, email);
    }
    
    public void setPassword(String password) {
        sendKeysByXPath(PASSWORD_XPATH, password);
    }
    
    public void setConfirmPassword(String confirmPassword) {
        sendKeysByXPath(CONFIRM_PASSWORD_XPATH, confirmPassword);
    }
    
    public void clickCreateOrganization() {
        clickByXPath(CREATE_ORGANIZATION_BUTTON);
    }
    
    public boolean isCreateOrganizationButtonEnabled() {
        return findElementByXPath(CREATE_ORGANIZATION_BUTTON).isEnabled();
    }
    
    // ========== Login Form Methods ==========
    
    public void setLoginEmail(String email) {
        sendKeysByXPath(LOGIN_EMAIL_INPUT, email);
    }
    
    public String getLoginEmail() {
        return getAttributeByXPath(LOGIN_EMAIL_INPUT, "value");
    }
    
    public void clickContinue() {
        clickByXPath(CONTINUE_BUTTON);
    }
    
    public boolean isContinueButtonEnabled() {
        return findElementByXPath(CONTINUE_BUTTON).isEnabled();
    }
    
    // ========== Form Validation Methods ==========
    
    public boolean isOrganizationFormComplete() {
        return !getOrganizationName().isEmpty() && 
               !getRegistrationEmail().isEmpty() &&
               !getPassword().isEmpty() && 
               !getConfirmPassword().isEmpty() &&
               !getFirstName().isEmpty() && 
               !getLastName().isEmpty();
    }
    
    public boolean isLoginFormComplete() {
        return !getLoginEmail().isEmpty();
    }
    
    // ========== Getter Methods for Form Fields ==========
    
    public String getFirstName() {
        return getAttributeByXPath(FIRST_NAME_XPATH, "value");
    }
    
    public String getLastName() {
        return getAttributeByXPath(LAST_NAME_XPATH, "value");
    }
    
    public String getRegistrationEmail() {
        return getAttributeByXPath(REGISTRATION_EMAIL_INPUT, "value");
    }
    
    public String getPassword() {
        return getAttributeByXPath(PASSWORD_XPATH, "value");
    }
    
    public String getConfirmPassword() {
        return getAttributeByXPath(CONFIRM_PASSWORD_XPATH, "value");
    }
    
    // ========== Page State Verification ==========
    
    @Override
    public boolean isPageLoaded() {
        return super.isPageLoaded() && 
               isElementVisibleByXPath(BRAND_TITLE) &&
               isElementVisibleByXPath(AUTH_SUBTITLE) &&
               getTextByXPath(BRAND_TITLE).contains("OpenFrame");
    }
    
    public String getPageTitle() {
        return getTextByXPath(BRAND_TITLE);
    }
    
    // ========== High-Level Action Methods ==========
    
    public void completeOrganizationRegistration(String organizationName, String firstName,
                                                  String lastName, String email, String password) {
        setOrganizationName(organizationName);
        setFirstName(firstName);
        setLastName(lastName);
        setRegistrationEmail(email);
        setPassword(password);
        setConfirmPassword(password);
    }

    public boolean isFormComplete() {
        return isOrganizationFormComplete() && isLoginFormComplete();
    }
}
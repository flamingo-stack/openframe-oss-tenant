package pageObjects;

public interface PageObject {
    
    /**
     * Initialize the page object (Selenide handles WebDriver automatically)
     * @param driver not used with Selenide, kept for interface compatibility
     */
    void initialize(Object driver);
    
    /**
     * Check if the page is loaded and ready
     * @return true if page is loaded
     */
    boolean isPageLoaded();
    
    /**
     * Wait for page to be fully loaded
     */
    void waitForPageLoad();
    
    /**
     * Get the current page URL
     * @return current URL
     */
    String getCurrentUrl();
    
    /**
     * Navigate to this page
     */
    void navigateTo();
}
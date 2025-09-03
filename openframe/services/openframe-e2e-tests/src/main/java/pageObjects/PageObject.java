package pageObjects;

/**
 * Base interface for all Page Objects following SOLID principles using Selenide
 * SRP: Each page object is responsible for one specific page
 * OCP: Open for extension, closed for modification
 * LSP: Liskov Substitution Principle - all page objects can be used interchangeably
 * ISP: Interface Segregation - focused interface for page interactions
 * DIP: Dependency Inversion - depends on abstractions (Selenide handles WebDriver)
 */
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


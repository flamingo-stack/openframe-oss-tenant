package com.openframe.tests.ui;

import com.codeborne.selenide.Configuration;
import com.codeborne.selenide.WebDriverRunner;
import io.github.bonigarcia.wdm.WebDriverManager;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.TestInstance;

/**
 * Base class for all UI tests using Selenide
 * Provides common setup and teardown for WebDriver management
 */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public abstract class UiBaseTest {
    

    protected static final String LOCAL_HTML_URL = "https://localhost/ous";
    
    @BeforeAll
    static void setUp() {
        System.out.println("🚀 Setting up UI test environment...");
        
        try {
            System.out.println("📥 Setting up ChromeDriver...");
            WebDriverManager.chromedriver().setup();
            
            System.out.println("⚙️ Configuring Selenide...");
            Configuration.browser = "chrome";
            Configuration.timeout = 10000; // 15 seconds timeout
            Configuration.pageLoadTimeout = 20000; // 30 seconds for page load
            Configuration.browserSize = "1920x1080";
            Configuration.headless = false; // Set to true for headless mode
            Configuration.reportsFolder = "target/selenide-reports";
            Configuration.screenshots = true;
            Configuration.savePageSource = true;
            
            System.out.println("UI test environment setup completed successfully!");
            
        } catch (Exception e) {
            System.err.println(" Failed to setup UI test environment: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("UI test environment setup failed", e);
        }
    }
    
    @AfterAll
    static void tearDown() {
        System.out.println("🧹 Cleaning up UI test environment...");
        
        try {
            if (WebDriverRunner.hasWebDriverStarted()) {
                WebDriverRunner.closeWebDriver();
                System.out.println(" WebDriver closed successfully");
            }
            
            System.out.println("UI test environment cleanup completed!");
            
        } catch (Exception e) {
            System.err.println("Warning during cleanup: " + e.getMessage());
        }
    }
    
    /**
     * Wait for page to be fully loaded
     */
    protected void waitForPageLoad() {
        com.codeborne.selenide.Selenide.sleep(2000); // Wait for 2 seconds
        System.out.println("⏳ Page load wait completed");
    }
    
    /**
     * Get current page title
     */
    protected String getPageTitle() {
        return com.codeborne.selenide.Selenide.title();
    }
    
    /**
     * Get current page URL
     */
    protected String getCurrentUrl() {
        return com.codeborne.selenide.WebDriverRunner.getWebDriver().getCurrentUrl();
    }
}

package pageObjects;

import com.codeborne.selenide.*;
import com.codeborne.selenide.conditions.*;
import static com.codeborne.selenide.Selenide.*;
import static com.codeborne.selenide.Condition.*;

import java.time.Duration;

public abstract class BasePageObject implements PageObject {
    
    protected String baseUrl;
    protected static final Duration DEFAULT_TIMEOUT = Duration.ofSeconds(10);
    
    public BasePageObject() {
        this.baseUrl = null;
    }
    
    public BasePageObject(String baseUrl) {
        this.baseUrl = baseUrl;
    }
    
    @Override
    public void initialize(Object driver) {
        if (baseUrl != null) {
            Configuration.baseUrl = baseUrl;
        }
    }
    
    @Override
    public void navigateTo() {
        if (baseUrl != null) {
            open(baseUrl);
        } else {

            throw new IllegalStateException("Use navigateToLocalFile() for local HTML files");
        }
    }
    
    @Override
    public boolean isPageLoaded() {
        return $x("//body").exists();
    }
    
    @Override
    public void waitForPageLoad() {
        $x("//body").shouldBe(visible, DEFAULT_TIMEOUT);
    }
    
    @Override
    public String getCurrentUrl() {
        return webdriver().driver().url();
    }
    
    /**
     * Find element by XPath with explicit wait
     * @param xpath XPath locator
     * @return SelenideElement
     */
    protected SelenideElement findElementByXPath(String xpath) {
        return $x(xpath).shouldBe(visible, DEFAULT_TIMEOUT);
    }
    
    /**
     * Find elements by XPath
     * @param xpath XPath locator
     * @return ElementsCollection
     */
    protected ElementsCollection findElementsByXPath(String xpath) {
        return $$x(xpath);
    }
    
    /**
     * Check if element is visible by XPath
     * @param xpath XPath locator
     * @return true if element is visible
     */
    protected boolean isElementVisibleByXPath(String xpath) {
        return $x(xpath).isDisplayed();
    }
    
    /**
     * Check if element exists by XPath
     * @param xpath XPath locator
     * @return true if element exists
     */
    protected boolean isElementPresentByXPath(String xpath) {
        return $x(xpath).exists();
    }
    
    /**
     * Click element by XPath with explicit wait
     * @param xpath XPath locator
     */
    protected void clickByXPath(String xpath) {
        $x(xpath).shouldBe(visible, DEFAULT_TIMEOUT).click();
    }
    
    /**
     * Send keys to element by XPath
     * @param xpath XPath locator
     * @param text text to send
     */
    protected void sendKeysByXPath(String xpath, String text) {
        $x(xpath).shouldBe(clickable, DEFAULT_TIMEOUT).setValue(text);
    }
    
    /**
     * Get text from element by XPath
     * @param xpath XPath locator
     * @return element text
     */
    protected String getTextByXPath(String xpath) {
        return $x(xpath).shouldBe(visible, DEFAULT_TIMEOUT).getText();
    }
    
    /**
     * Get attribute value from element by XPath
     * @param xpath XPath locator
     * @param attributeName attribute name
     * @return attribute value
     */
    protected String getAttributeByXPath(String xpath, String attributeName) {
        return $x(xpath).shouldBe(visible, DEFAULT_TIMEOUT).getAttribute(attributeName);
    }
    
    /**
     * Wait for element to be visible by XPath
     * @param xpath XPath locator
     */
    protected void waitForElementByXPath(String xpath) {
        $x(xpath).shouldBe(visible, DEFAULT_TIMEOUT);
    }
}


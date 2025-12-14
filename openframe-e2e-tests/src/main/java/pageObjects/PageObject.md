<!-- source-hash: 115150e422dd32e39b478d694f498eef -->
This interface defines a common contract for page object classes in a Selenium-based test automation framework, providing essential page interaction and validation methods.

## Key Components

- **initialize()** - Sets up the page object (maintained for compatibility though Selenide handles WebDriver automatically)
- **isPageLoaded()** - Verifies if the page has finished loading
- **waitForPageLoad()** - Blocks execution until the page is fully loaded
- **getCurrentUrl()** - Retrieves the current page URL
- **navigateTo()** - Directs the browser to this page

## Usage Example

```java
public class LoginPage implements PageObject {
    private final String PAGE_URL = "https://example.com/login";
    
    @Override
    public void initialize(Object driver) {
        // Selenide handles driver initialization
    }
    
    @Override
    public boolean isPageLoaded() {
        return $("#loginForm").isDisplayed();
    }
    
    @Override
    public void waitForPageLoad() {
        $("#loginForm").shouldBe(visible);
    }
    
    @Override
    public String getCurrentUrl() {
        return WebDriverRunner.getWebDriver().getCurrentUrl();
    }
    
    @Override
    public void navigateTo() {
        Selenide.open(PAGE_URL);
    }
}
```

This pattern ensures consistent page object behavior across test suites while leveraging Selenide's simplified WebDriver management.
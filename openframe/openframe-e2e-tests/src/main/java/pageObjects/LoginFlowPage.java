package pageObjects;

import static com.codeborne.selenide.Selenide.*;
import static com.codeborne.selenide.Condition.*;

/**
 * Page Object для повного логін флоу
 * Включає всі кроки: email input → SSO button → login form → dashboard
 */
public class LoginFlowPage extends BasePageObject {
    
    // ========== Email Input Step (крок 1) ==========
    private static final String EMAIL_INPUT = "input[type='email']";
    private static final String CONTINUE_BUTTON = "button[type='submit']";
    
    // ========== SSO Selection Step (крок 2) ==========
    private static final String SSO_BUTTON = "button:contains('Use OpenFrame SSO')";
    
    // ========== Authorization Server Login Form (крок 3) ==========
    private static final String USERNAME_INPUT = "input[name='username']";
    private static final String PASSWORD_INPUT = "input[name='password']";
    private static final String SIGNIN_BUTTON = "button[type='submit']";
    
    // ========== Page Elements ==========
    private static final String BRAND_TITLE = "h1:contains('OpenFrame')";
    private static final String ERROR_MESSAGE = ".alert-error";
    
    public LoginFlowPage() {
        super();
    }
    
    public LoginFlowPage(String baseUrl) {
        super(baseUrl);
    }
    
    // ========== Крок 1: Email Input ==========
    
    /**
     * Вводить email в поле та натискає Continue
     */
    public void enterEmailAndContinue(String email) {
        $(EMAIL_INPUT).shouldBe(visible).clear();
        $(EMAIL_INPUT).setValue(email);
        $(CONTINUE_BUTTON).shouldBe(enabled).click();
    }
    
    /**
     * Перевіряє чи поле email видиме
     */
    public boolean isEmailInputVisible() {
        return $(EMAIL_INPUT).isDisplayed();
    }
    
    /**
     * Перевіряє чи кнопка Continue активна
     */
    public boolean isContinueButtonEnabled() {
        return $(CONTINUE_BUTTON).is(enabled);
    }
    
    // ========== Крок 2: SSO Selection ==========
    
    /**
     * Натискає кнопку "Use OpenFrame SSO"
     */
    public void clickSsoButton() {
        $(SSO_BUTTON).shouldBe(visible).shouldBe(enabled).click();
    }
    
    /**
     * Перевіряє чи SSO кнопка видима
     */
    public boolean isSsoButtonVisible() {
        return $(SSO_BUTTON).isDisplayed();
    }
    
    /**
     * Чекає поки з'явиться SSO опція
     */
    public void waitForSsoOption() {
        $(SSO_BUTTON).shouldBe(visible, DEFAULT_TIMEOUT);
    }
    
    // ========== Крок 3: Authorization Server Login ==========
    
    /**
     * Заповнює форму логіну в Authorization Server
     */
    public void fillLoginForm(String username, String password) {
        $(USERNAME_INPUT).shouldBe(visible).clear();
        $(USERNAME_INPUT).setValue(username);
        
        $(PASSWORD_INPUT).shouldBe(visible).clear();
        $(PASSWORD_INPUT).setValue(password);
    }
    
    /**
     * Натискає кнопку Sign In
     */
    public void clickSignInButton() {
        $(SIGNIN_BUTTON).shouldBe(visible).shouldBe(enabled).click();
    }
    
    /**
     * Виконує повний логін в Authorization Server
     */
    public void performLogin(String username, String password) {
        fillLoginForm(username, password);
        clickSignInButton();
    }
    
    /**
     * Перевіряє чи форма логіну видима
     */
    public boolean isLoginFormVisible() {
        return $(USERNAME_INPUT).isDisplayed() && $(PASSWORD_INPUT).isDisplayed();
    }
    
    // ========== Page State Verification ==========
    
    @Override
    public boolean isPageLoaded() {
        return super.isPageLoaded() && $(BRAND_TITLE).exists();
    }
    
    /**
     * Перевіряє чи є повідомлення про помилку
     */
    public boolean hasErrorMessage() {
        return $(ERROR_MESSAGE).exists();
    }
    
    /**
     * Отримує текст повідомлення про помилку
     */
    public String getErrorMessage() {
        return $(ERROR_MESSAGE).shouldBe(visible).getText();
    }
    
    /**
     * Чекає redirect на dashboard або іншу сторінку
     */
    public void waitForRedirectAfterLogin() {
        // Чекаємо поки URL зміниться (означає успішний логін)
        sleep(3000); // 3 секунди для redirect
    }
    
    // ========== High-Level Actions ==========
    
    /**
     * Виконує повний логін флоу
     */
    public void performCompleteLoginFlow(String email, String password) {
        // Крок 1: Вводимо email
        enterEmailAndContinue(email);
        
        // Крок 2: Чекаємо SSO опцію та натискаємо
        waitForSsoOption();
        clickSsoButton();
        
        // Крок 3: Заповнюємо форму логіну
        performLogin(email, password);
        
        // Крок 4: Чекаємо redirect
        waitForRedirectAfterLogin();
    }
}

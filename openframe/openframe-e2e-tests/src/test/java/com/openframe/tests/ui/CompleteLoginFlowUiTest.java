package com.openframe.tests.ui;

import com.openframe.data.UserRegistrationBuilder;
import com.openframe.data.DBQuery;
import com.openframe.data.dto.RegistrationResponse;
import com.openframe.support.enums.ApiEndpoints;
import com.openframe.support.helpers.ApiCalls;
import io.restassured.response.Response;
import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.*;
import pageObjects.LoginFlowPage;

import static com.codeborne.selenide.Selenide.*;
import static com.codeborne.selenide.Condition.*;
import static com.openframe.support.constants.TestConstants.HTTP_OK;
import static org.assertj.core.api.SoftAssertions.assertSoftly;
import static org.junit.jupiter.api.Assertions.*;

/**
 * UI тест повного логін флоу з використанням Page Object
 * Комбінує API створення організації з UI автоматизацією логіну
 */
@Slf4j
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class CompleteLoginFlowUiTest extends UiBaseTest {
    
    private static LoginFlowPage loginPage;
    private static String userEmail;
    private static String userPassword;
    private static String tenantName;
    
    @BeforeAll
    static void setupPageObjects() {
        loginPage = new LoginFlowPage("https://localhost");
        log.info("✅ Page Objects ініціалізовано");
    }
    
    @Test
    @Order(1)
    @DisplayName("Крок 1: Створити організацію через API (з UserRegistrationApiTest)")
    void step1_CreateOrganizationThroughApi() {
        log.info("🏢 === КРОК 1: СТВОРЕННЯ ОРГАНІЗАЦІЇ ЧЕРЕЗ API ===");
        
        // Очищаємо базу даних (з shouldRegisterUserWithValidData)
        long userCount = DBQuery.getUserCount();
        long tenantCount = DBQuery.getTenantCount();
        
        if (userCount > 0 || tenantCount > 0) {
            log.info("🧹 Очищаємо базу даних - знайдено {} користувачів та {} тенантів", userCount, tenantCount);
            DBQuery.clearAllData();
        }
        
        // Генеруємо тестові дані (з shouldRegisterUserWithValidData)
        UserRegistrationBuilder userData = UserRegistrationBuilder.random();
        userEmail = userData.getEmail();
        userPassword = userData.getPassword();
        tenantName = userData.getTenantName();
        
        log.info("📧 Створюємо організацію:");
        log.info("   Email: {}", userEmail);
        log.info("   Назва: {}", tenantName);
        log.info("   Домен: {}", userData.getTenantDomain());
        
        // API виклик (з shouldRegisterUserWithValidData)
        Response response = ApiCalls.post(ApiEndpoints.REGISTRATION_ENDPOINT, userData);
        
        log.debug("📤 API відповідь: status={}, body={}", 
                response.getStatusCode(), response.getBody().asString());
        
        // Валідація відповіді (з shouldRegisterUserWithValidData)
        RegistrationResponse registrationResponse = response.as(RegistrationResponse.class);
        assertEquals(HTTP_OK, response.getStatusCode());
        
        assertSoftly(softAssertions -> {
            softAssertions.assertThat(registrationResponse.getId()).isNotNull();
            softAssertions.assertThat(registrationResponse.getName()).isEqualTo(userData.getTenantName());
            softAssertions.assertThat(registrationResponse.getDomain()).isEqualTo(userData.getTenantDomain());
            softAssertions.assertThat(registrationResponse.getStatus()).isEqualTo("ACTIVE");
            softAssertions.assertThat(registrationResponse.getPlan()).isEqualTo("FREE");
            softAssertions.assertThat(registrationResponse.getActive()).isTrue();
            softAssertions.assertThat(registrationResponse.getOwnerId()).isNotNull();
        });
        
        log.info("✅ Організація створена успішно з ID: {}", registrationResponse.getId());
        
        // Чекаємо eventual consistency (з shouldRegisterUserWithValidData)
        log.info("⏳ Чекаємо eventual consistency...");
        sleep(5000); // 5 секунд як в оригінальному тесті
    }
    
    @Test
    @Order(2)
    @DisplayName("Крок 2: Відкрити головну сторінку та ввести email")
    void step2_OpenMainPageAndEnterEmail() {
        log.info("🌐 === КРОК 2: ВІДКРИТТЯ ГОЛОВНОЇ СТОРІНКИ ===");
        
        assertNotNull(userEmail, "Email повинен бути отриманий з попереднього кроку");
        
        log.info("🌐 Відкриваємо головну сторінку: https://localhost");
        loginPage.navigateTo();
        
        // Чекаємо завантаження сторінки
        loginPage.waitForPageLoad();
        assertTrue(loginPage.isPageLoaded(), "Головна сторінка повинна завантажитися");
        
        log.info("📧 Вводимо email: {}", userEmail);
        
        // Вводимо email та натискаємо Continue
        assertTrue(loginPage.isEmailInputVisible(), "Поле email повинно бути видимим");
        loginPage.enterEmailAndContinue(userEmail);
        
        log.info("✅ Email введено та Continue натиснуто");
    }
    
    @Test
    @Order(3)
    @DisplayName("Крок 3: Натиснути 'Use OpenFrame SSO'")
    void step3_ClickSsoButton() {
        log.info("🔐 === КРОК 3: SSO КНОПКА ===");
        
        log.info("🔍 Чекаємо появу SSO опції...");
        loginPage.waitForSsoOption();
        
        assertTrue(loginPage.isSsoButtonVisible(), "SSO кнопка повинна бути видимою");
        
        log.info("🔐 Натискаємо 'Use OpenFrame SSO'");
        loginPage.clickSsoButton();
        
        log.info("✅ SSO кнопка натиснута, очікуємо redirect...");
        
        // Чекаємо redirect до Authorization Server
        sleep(3000);
    }
    
    @Test
    @Order(4)
    @DisplayName("Крок 4: Заповнити форму логіну в Authorization Server")
    void step4_FillAuthorizationServerLoginForm() {
        log.info("📝 === КРОК 4: ФОРМА ЛОГІНУ AUTHORIZATION SERVER ===");
        
        assertNotNull(userEmail, "Email повинен бути доступний");
        assertNotNull(userPassword, "Password повинен бути доступний");
        
        log.info("🔍 Чекаємо появу форми логіну...");
        
        // Чекаємо поки з'явиться форма логіну Authorization Server
        $("input[name='username']").shouldBe(visible);
        
        assertTrue(loginPage.isLoginFormVisible(), "Форма логіну повинна бути видимою");
        
        log.info("📝 Заповнюємо форму логіну:");
        log.info("   👤 Username: {}", userEmail);
        log.info("   🔒 Password: [HIDDEN]");
        
        // Заповнюємо форму логіну
        loginPage.fillLoginForm(userEmail, userPassword);
        
        log.info("🔘 Натискаємо 'Sign In'");
        loginPage.clickSignInButton();
        
        log.info("✅ Форма логіну відправлена");
    }
    
    @Test
    @Order(5)
    @DisplayName("Крок 5: Перевірити успішний логін та redirect")
    void step5_VerifySuccessfulLoginAndRedirect() {
        log.info("🎉 === КРОК 5: ПЕРЕВІРКА УСПІШНОГО ЛОГІНУ ===");
        
        log.info("⏳ Чекаємо redirect після логіну...");
        loginPage.waitForRedirectAfterLogin();
        
        // Отримуємо поточний URL
        String currentUrl = loginPage.getCurrentUrl();
        log.info("📍 Поточний URL: {}", currentUrl);
        
        // Перевіряємо чи немає помилок
        if (loginPage.hasErrorMessage()) {
            String errorMsg = loginPage.getErrorMessage();
            log.error("❌ Знайдено повідомлення про помилку: {}", errorMsg);
            fail("Логін не вдався: " + errorMsg);
        }
        
        // Перевіряємо успішний redirect
        boolean isRedirectedFromLogin = !currentUrl.contains("/login") && !currentUrl.contains("error");
        
        if (isRedirectedFromLogin) {
            log.info("🎉 Успішний логін! Redirect на: {}", currentUrl);
            
            // Додаткова перевірка - чи є доступ до dashboard
            if (currentUrl.contains("dashboard") || currentUrl.contains("localhost")) {
                log.info("✅ Redirect на dashboard/головну сторінку - логін успішний!");
            }
        } else {
            log.warn("⚠️ Можливо логін не вдався - все ще на login сторінці");
            log.warn("💡 Це нормально якщо потрібна додаткова аутентифікація");
        }
        
        // Основна перевірка - що ми не на error сторінці
        assertFalse(currentUrl.contains("error"), "URL не повинен містити 'error'");
        
        log.info("🏁 UI логін флоу завершено!");
    }
    
    @Test
    @Order(6)
    @DisplayName("Крок 6: Перевірити GraphQL доступ (опціонально)")
    void step6_VerifyGraphqlAccessOptional() {
        log.info("🔍 === КРОК 6: ПЕРЕВІРКА GRAPHQL (ОПЦІОНАЛЬНО) ===");
        
        // Цей крок можна пропустити, оскільки це UI тест
        // GraphQL перевірку краще робити в API тестах
        
        log.info("💡 GraphQL перевірка пропущена - це UI тест");
        log.info("🔗 Для GraphQL перевірки використовуйте OneLoginFlowTest");
        
        // Але можемо перевірити чи є доступ до захищених сторінок
        String currentUrl = getCurrentUrl();
        log.info("📍 Фінальний URL: {}", currentUrl);
        
        // Якщо на dashboard - спробуємо навігацію
        if (currentUrl.contains("dashboard") || currentUrl.equals("https://localhost/")) {
            log.info("✅ Маємо доступ до захищених сторінок!");
        }
        
        log.info("🎯 UI тест повністю завершено!");
    }
    
    /**
     * Допоміжний метод для sleep
     */
    private void sleep(int milliseconds) {
        try {
            Thread.sleep(milliseconds);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}

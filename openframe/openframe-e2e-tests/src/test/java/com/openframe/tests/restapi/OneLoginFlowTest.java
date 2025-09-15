package com.openframe.tests.restapi;

import com.openframe.data.DBQuery;
import io.restassured.response.Response;
import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Один тест з повним логін флоу
 */
@Slf4j
public class OneLoginFlowTest extends ApiBaseTest {

    @Test
    @DisplayName("Повний логін флоу в одному тесті")
    void completeLoginFlow() {
        // === ПІДГОТОВКА ===
        log.info("🧹 Очищення бази даних перед тестом");
        DBQuery.clearAllData();

        // Унікальні тестові дані для кожного запуску
        long timestamp = System.currentTimeMillis();
        String testEmail = "test" + timestamp + "@example.com";
        String testPassword = "Test123!";
        String testTenantName = "test13" + timestamp;
        
        // === КРОК 1: Реєстрація організації ===
        log.info("🏢 КРОК 1: Реєстрація організації");
        
        String registerBody = "{" +
            "\"email\":\"" + testEmail + "\"," +
            "\"firstName\":\"One\"," +
            "\"lastName\":\"Test\"," +
            "\"password\":\"" + testPassword + "\"," +
            "\"tenantName\":\"" + testTenantName + "\"," +
            "\"tenantDomain\":\"localhost\"" +
            "}";
        
        Response registerResponse = given()
            .header("accept", "*/*")
            .header("accept-language", "en-US,en;q=0.9")
            .header("cache-control", "no-cache")
            .header("content-type", "application/json")
            .header("origin", "https://localhost")
            .header("pragma", "no-cache")
            .header("priority", "u=1, i")
            .header("sec-ch-ua", "\"Not;A=Brand\";v=\"99\", \"Google Chrome\";v=\"139\", \"Chromium\";v=\"139\"")
            .header("sec-ch-ua-mobile", "?0")
            .header("sec-ch-ua-platform", "\"macOS\"")
            .header("sec-fetch-dest", "empty")
            .header("sec-fetch-mode", "cors")
            .header("sec-fetch-site", "same-origin")
            .header("user-agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36")
            .body(registerBody)
            .when()
            .post("/sas/oauth/register");
        
        log.info("Реєстрація: status={}, body={}", 
                registerResponse.getStatusCode(), registerResponse.getBody().asString());
        
        if (registerResponse.getStatusCode() != 200) {
            fail("Реєстрація організації не вдалася: " + registerResponse.getBody().asString());
        }
        log.info("✅ Організація успішно зареєстрована");

        log.info("⏳ Чекаємо eventual consistency...");
        try {
            log.info("Чекаємо 5 секунд для повної синхронізації даних...");
            Thread.sleep(5000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        
        // Перевіримо, чи користувач дійсно створений
        log.info("Перевіряємо наявність користувача в базі...");
        long userCount = DBQuery.getUserCount();
        log.info("Кількість користувачів в базі: {}", userCount);

        // === КРОК 2: Пошук tenant ===
        log.info("🔍 КРОК 2: Пошук tenant");
        
        Response discoverResponse = given()
            .header("accept", "*/*")
            .header("accept-language", "en-US,en;q=0.9")
            .header("cache-control", "no-cache")
            .header("pragma", "no-cache")
            .header("priority", "u=1, i")
            .header("sec-ch-ua", "\"Not;A=Brand\";v=\"99\", \"Google Chrome\";v=\"139\", \"Chromium\";v=\"139\"")
            .header("sec-ch-ua-mobile", "?0")
            .header("sec-ch-ua-platform", "\"macOS\"")
            .header("sec-fetch-dest", "empty")
            .header("sec-fetch-mode", "cors")
            .header("sec-fetch-site", "same-origin")
            .header("user-agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36")
            .queryParam("email", testEmail)
            .when()
            .get("/sas/tenant/discover");
        
        log.info("Discovery відповідь: status={}, body={}", 
                discoverResponse.getStatusCode(), discoverResponse.getBody().asString());
        
        if (discoverResponse.getStatusCode() != 200) {
            fail("Discovery запит не вдався: " + discoverResponse.getBody().asString());
        }
        
        String tenantId = discoverResponse.jsonPath().getString("tenant_id");
        if (tenantId == null || tenantId.isEmpty()) {
            fail("Не вдалося отримати tenant_id");
        }
        log.info("✅ Tenant знайдено: {}", tenantId);

        // === КРОК 3: OAuth login ===
        log.info("🔐 КРОК 3: OAuth login");
        
        Response oauthResponse = given()
            .header("accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7")
            .header("accept-language", "en-US,en;q=0.9")
            .header("cache-control", "no-cache")
            .header("pragma", "no-cache")
            .header("priority", "u=0, i")
            .header("sec-ch-ua", "\"Not;A=Brand\";v=\"99\", \"Google Chrome\";v=\"139\", \"Chromium\";v=\"139\"")
            .header("sec-ch-ua-mobile", "?0")
            .header("sec-ch-ua-platform", "\"macOS\"")
            .header("sec-fetch-dest", "document")
            .header("sec-fetch-mode", "navigate")
            .header("sec-fetch-site", "same-origin")
            .header("sec-fetch-user", "?1")
            .header("upgrade-insecure-requests", "1")
            .header("user-agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36")
            .redirects().follow(false)
            .queryParam("tenantId", tenantId)
            .when()
            .get("/oauth/login");
        
        log.info("OAuth login: status={}", oauthResponse.getStatusCode());
        
        if (oauthResponse.getStatusCode() != 302) {
            fail("OAuth login не повернув redirect: " + oauthResponse.getStatusCode());
        }
        
        // Витягуємо SESSION cookie
        String sessionCookie = null;
        String setCookie = oauthResponse.getHeader("Set-Cookie");
        if (setCookie != null && setCookie.contains("SESSION=")) {
            sessionCookie = setCookie.split("SESSION=")[1].split(";")[0];
            log.info("SESSION cookie: {}", sessionCookie);
        }
        
        // Витягуємо redirect URL з Location header
        String redirectUrl = oauthResponse.getHeader("Location");
        log.info("OAuth redirect URL: {}", redirectUrl);
        log.info("✅ OAuth ініціація успішна!");
        
        // === КРОК 4: OAuth2 Authorize ===
        log.info("🔐 КРОК 4: OAuth2 Authorize");
        
        if (redirectUrl != null && redirectUrl.contains("/oauth2/authorize")) {
            // Виправляємо URL encoding проблему - декодуємо URL
            String decodedUrl = java.net.URLDecoder.decode(redirectUrl, java.nio.charset.StandardCharsets.UTF_8);
            log.info("Декодований URL: {}", decodedUrl);
            
            Response authorizeResponse = given()
                .header("accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7")
                .header("accept-language", "en-US,en;q=0.9")
                .header("cache-control", "no-cache")
                .header("pragma", "no-cache")
                .header("priority", "u=0, i")
                .header("sec-ch-ua", "\"Not;A=Brand\";v=\"99\", \"Google Chrome\";v=\"139\", \"Chromium\";v=\"139\"")
                .header("sec-ch-ua-mobile", "?0")
                .header("sec-ch-ua-platform", "\"macOS\"")
                .header("sec-fetch-dest", "document")
                .header("sec-fetch-mode", "navigate")
                .header("sec-fetch-site", "same-origin")
                .header("sec-fetch-user", "?1")
                .header("upgrade-insecure-requests", "1")
                .header("user-agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36")
                .cookie("SESSION", sessionCookie)
                .redirects().follow(false)
                .when()
                .get(decodedUrl);
            
            log.info("Authorize response: status={}", authorizeResponse.getStatusCode());
            
            // Витягуємо додаткові cookies якщо є
            String authSetCookie = authorizeResponse.getHeader("Set-Cookie");
            if (authSetCookie != null) {
                if (authSetCookie.contains("SESSION=")) {
                    sessionCookie = authSetCookie.split("SESSION=")[1].split(";")[0];
                    log.info("Оновлено SESSION: {}", sessionCookie);
                }
            }
            log.info("✅ OAuth2 Authorize виконано");
        }

        // === КРОК 5: Form login ===
        log.info("📝 КРОК 5: Form login");
        
        // Спочатку отримаємо форму логіну, щоб витягнути CSRF токен
        Response loginFormResponse = given()
            .header("accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7")
            .header("accept-language", "en-US,en;q=0.9")
            .header("cache-control", "no-cache")
            .header("pragma", "no-cache")
            .header("priority", "u=0, i")
            .header("sec-ch-ua", "\"Not;A=Brand\";v=\"99\", \"Google Chrome\";v=\"139\", \"Chromium\";v=\"139\"")
            .header("sec-ch-ua-mobile", "?0")
            .header("sec-ch-ua-platform", "\"macOS\"")
            .header("sec-fetch-dest", "document")
            .header("sec-fetch-mode", "navigate")
            .header("sec-fetch-site", "same-origin")
            .header("sec-fetch-user", "?1")
            .header("upgrade-insecure-requests", "1")
            .header("user-agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36")
            .cookie("SESSION", sessionCookie)
            .when()
            .get("/sas/login");
        
        log.info("Отримання форми логіну: status={}", loginFormResponse.getStatusCode());
        
        // Спробуємо знайти CSRF токен в HTML відповіді
        String loginFormHtml = loginFormResponse.getBody().asString();
        String csrfToken = null;
        
        // Шукаємо CSRF токен в HTML (приклад: <input type="hidden" name="_csrf" value="token-value"/>)
        if (loginFormHtml.contains("name=\"_csrf\"")) {
            try {
                csrfToken = loginFormHtml.split("name=\"_csrf\"")[1].split("value=\"")[1].split("\"")[0];
                log.info("Знайдено CSRF токен: {}", csrfToken);
            } catch (Exception e) {
                log.warn("Не вдалося витягнути CSRF токен: {}", e.getMessage());
            }
        } else {
            log.info("CSRF токен не знайдено в формі логіну");
        }
        
        // Виконуємо POST запит на форму логіну
        Response formResponse;
        
        if (csrfToken != null) {
            // Якщо знайшли CSRF токен, додаємо його до запиту
            formResponse = given()
                .header("accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7")
                .header("accept-language", "en-US,en;q=0.9")
                .header("cache-control", "no-cache")
                .header("content-type", "application/x-www-form-urlencoded")
                .header("origin", "null")
                .header("pragma", "no-cache")
                .header("priority", "u=0, i")
                .header("sec-ch-ua", "\"Not;A=Brand\";v=\"99\", \"Google Chrome\";v=\"139\", \"Chromium\";v=\"139\"")
                .header("sec-ch-ua-mobile", "?0")
                .header("sec-ch-ua-platform", "\"macOS\"")
                .header("sec-fetch-dest", "document")
                .header("sec-fetch-mode", "navigate")
                .header("sec-fetch-site", "same-origin")
                .header("sec-fetch-user", "?1")
                .header("upgrade-insecure-requests", "1")
                .header("user-agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36")
                .cookie("SESSION", sessionCookie)
                .cookie("JSESSIONID", loginFormResponse.getCookie("JSESSIONID"))
                .redirects().follow(false)
                .formParam("username", testEmail)
                .formParam("password", testPassword)
                .formParam("_csrf", csrfToken)
                .when()
                .post("/sas/login");
        } else {
            // Якщо не знайшли CSRF токен, спробуємо без нього
            formResponse = given()
                .header("accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7")
                .header("accept-language", "en-US,en;q=0.9")
                .header("cache-control", "no-cache")
                .header("content-type", "application/x-www-form-urlencoded")
                .header("origin", "null")
                .header("pragma", "no-cache")
                .header("priority", "u=0, i")
                .header("sec-ch-ua", "\"Not;A=Brand\";v=\"99\", \"Google Chrome\";v=\"139\", \"Chromium\";v=\"139\"")
                .header("sec-ch-ua-mobile", "?0")
                .header("sec-ch-ua-platform", "\"macOS\"")
                .header("sec-fetch-dest", "document")
                .header("sec-fetch-mode", "navigate")
                .header("sec-fetch-site", "same-origin")
                .header("sec-fetch-user", "?1")
                .header("upgrade-insecure-requests", "1")
                .header("user-agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36")
                .cookie("SESSION", sessionCookie)
                .cookie("JSESSIONID", loginFormResponse.getCookie("JSESSIONID"))
                .redirects().follow(false)
                .formParam("username", testEmail)
                .formParam("password", testPassword)
                .when()
                .post("/sas/login");
        }
        
        log.info("Form login: status={}, location={}", 
                formResponse.getStatusCode(), formResponse.getHeader("Location"));
        
        if (formResponse.getStatusCode() != 302) {
            fail("Form login не повернув redirect: " + formResponse.getStatusCode());
        }
        
        // Перевіряємо, чи немає помилки в редіректі
        String location = formResponse.getHeader("Location");
        if (location != null && location.contains("error")) {
            log.error("❌ Form login повернув помилку: {}", location);
            log.info("Перевіряємо деталі користувача: email={}", testEmail);
            // Спробуємо знайти користувача в базі
            log.info("Перевіряємо наявність користувача з email: {}", testEmail);
            // Тут можна додати код для перевірки користувача в базі
        }
        
        // Витягуємо JSESSIONID cookie
        String jsessionidCookie = null;
        String formSetCookie = formResponse.getHeader("Set-Cookie");
        if (formSetCookie != null && formSetCookie.contains("JSESSIONID=")) {
            jsessionidCookie = formSetCookie.split("JSESSIONID=")[1].split(";")[0];
            log.info("JSESSIONID cookie: {}", jsessionidCookie);
        }
        
        // Витягуємо access_token cookie
        String accessTokenCookie = null;
        if (formSetCookie != null && formSetCookie.contains("access_token=")) {
            accessTokenCookie = formSetCookie.split("access_token=")[1].split(";")[0];
            log.info("Access token cookie отримано (довжина: {})", accessTokenCookie != null ? accessTokenCookie.length() : 0);
        }
        log.info("✅ Form login завершено!");
        
        // === КРОК 6: Перевірка /api/me ===
        log.info("👤 КРОК 6: Перевірка /api/me");
        
        // Додаємо всі можливі хедери та куки для авторизації
        Response meResponse = given()
            .header("accept", "*/*")
            .header("accept-language", "en-US,en;q=0.9")
            .header("cache-control", "no-cache")
            .header("pragma", "no-cache")
            .header("priority", "u=1, i")
            .header("sec-ch-ua", "\"Not;A=Brand\";v=\"99\", \"Google Chrome\";v=\"139\", \"Chromium\";v=\"139\"")
            .header("sec-ch-ua-mobile", "?0")
            .header("sec-ch-ua-platform", "\"macOS\"")
            .header("sec-fetch-dest", "empty")
            .header("sec-fetch-mode", "cors")
            .header("sec-fetch-site", "same-origin")
            .header("user-agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36")
            .cookie("SESSION", sessionCookie)
            .cookie("JSESSIONID", jsessionidCookie != null ? jsessionidCookie : "")
            .cookie("access_token", accessTokenCookie != null ? accessTokenCookie : "")
            .header("access-token", accessTokenCookie != null ? accessTokenCookie : "")
            .header("Authorization", "Bearer " + (accessTokenCookie != null ? accessTokenCookie : ""))
            .when()
            .get("/api/me");
        
        log.info("/api/me відповідь: status={}, body={}", 
                meResponse.getStatusCode(), meResponse.getBody().asString());
        
        // === КРОК 7: GraphQL запит для перевірки deviceFilters ===
        log.info("🔍 КРОК 7: GraphQL запит deviceFilters");
        
        // GraphQL запит з GraphQLQueries.DEVICE_FILTERS_QUERY
        String graphqlQuery = """
            {
                "query": "%s"
            }""".formatted(com.openframe.support.constants.GraphQLQueries.DEVICE_FILTERS_QUERY
                .replace("\n", "\\n")
                .replace("\"", "\\\""));
        
        // Додаємо всі можливі хедери та куки для авторизації
        Response graphqlResponse = given()
            .header("accept", "*/*")
            .header("accept-language", "en-US,en;q=0.9")
            .header("access-token", accessTokenCookie != null ? accessTokenCookie : "")
            .header("Authorization", "Bearer " + (accessTokenCookie != null ? accessTokenCookie : ""))
            .header("cache-control", "no-cache")
            .header("content-type", "application/json")
            .header("origin", "https://localhost")
            .header("pragma", "no-cache")
            .header("priority", "u=1, i")
            .header("sec-ch-ua", "\"Not;A=Brand\";v=\"99\", \"Google Chrome\";v=\"139\", \"Chromium\";v=\"139\"")
            .header("sec-ch-ua-mobile", "?0")
            .header("sec-ch-ua-platform", "\"macOS\"")
            .header("sec-fetch-dest", "empty")
            .header("sec-fetch-mode", "cors")
            .header("sec-fetch-site", "same-origin")
            .header("user-agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36")
            .cookie("SESSION", sessionCookie)
            .cookie("JSESSIONID", jsessionidCookie != null ? jsessionidCookie : "")
            .cookie("access_token", accessTokenCookie != null ? accessTokenCookie : "")
            .body(graphqlQuery)
            .when()
            .post("/api/graphql");
        
        log.info("GraphQL відповідь: status={}, body={}", 
                graphqlResponse.getStatusCode(), graphqlResponse.getBody().asString());
        
        // === ПІДСУМОК ТА ПЕРЕВІРКИ ===
        log.info("📊 === ПІДСУМОК ФЛОУ ===");
        log.info("✅ Реєстрація: {}", registerResponse.getStatusCode());
        log.info("✅ Discovery: {}", discoverResponse.getStatusCode());
        log.info("✅ OAuth init: {}", oauthResponse.getStatusCode());
        log.info("✅ Form login: {}", formResponse.getStatusCode());
        log.info("  📝 Form login redirect: {}", location);
        log.info("🔍 Auth check: {}", meResponse.getStatusCode());
        log.info("🔍 GraphQL check: {}", graphqlResponse.getStatusCode());
        
        // Перевірка всіх кроків
        assertEquals(200, registerResponse.getStatusCode(), "Реєстрація організації повинна бути успішною");
        assertEquals(200, discoverResponse.getStatusCode(), "Discovery повинен повернути успішний статус");
        assertEquals(302, oauthResponse.getStatusCode(), "OAuth login повинен повернути redirect");
        assertEquals(302, formResponse.getStatusCode(), "Form login повинен повернути redirect");
        
        // Перевіряємо, що форма логіну не повертає помилку
        if (location != null) {
            assertFalse(location.contains("error"), "Form login не повинен повертати помилку: " + location);
        }
        
        // Перевірка GraphQL відповіді
        assertEquals(200, graphqlResponse.getStatusCode(), "GraphQL запит повинен бути успішним");
        assertNotNull(graphqlResponse.jsonPath().get("data.deviceFilters"), "GraphQL відповідь повинна містити deviceFilters");
        
        // Виведення деталей GraphQL відповіді
        if (graphqlResponse.getStatusCode() == 200) {
            Integer filteredCount = graphqlResponse.jsonPath().getInt("data.deviceFilters.filteredCount");
            log.info("📊 GraphQL filteredCount: {}", filteredCount);
            
            try {
                Integer statusesCount = graphqlResponse.jsonPath().getList("data.deviceFilters.statuses").size();
                Integer deviceTypesCount = graphqlResponse.jsonPath().getList("data.deviceFilters.deviceTypes").size();
                Integer osTypesCount = graphqlResponse.jsonPath().getList("data.deviceFilters.osTypes").size();
                
                log.info("📊 Кількість статусів: {}", statusesCount);
                log.info("📊 Кількість типів пристроїв: {}", deviceTypesCount);
                log.info("📊 Кількість типів ОС: {}", osTypesCount);
            } catch (Exception e) {
                log.warn("Не вдалося отримати розмір масивів: {}", e.getMessage());
            }
        }
        
        log.info("🎉 ПОВНИЙ ФЛОУ УСПІШНИЙ! GraphQL працює!");
    }
}

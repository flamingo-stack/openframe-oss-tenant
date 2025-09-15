package com.openframe.tests.restapi;

import com.openframe.data.UserRegistrationBuilder;
import com.openframe.support.enums.ApiEndpoints;
import com.openframe.support.helpers.ApiCalls;
import com.openframe.support.validation.ResponseValidator;
import io.restassured.response.Response;
import lombok.extern.slf4j.Slf4j;
import net.datafaker.Faker;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static com.openframe.support.constants.TestConstants.*;
import static com.openframe.support.helpers.ApiCalls.get;
import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Check login organisation API tests
 */
@Slf4j
public class CheckLoginOrganisationTest extends ApiBaseTest {

    private static final Faker faker = new Faker();

    @Test
    @DisplayName("Should return tenant discover response when organization does not exist")
    void shouldReturnTenantDiscoverResponseWhenOrganizationDoesNotExist() {
        String email = faker.internet().emailAddress();

        Response response = get(ApiEndpoints.TENANT_DISCOVER_ENDPOINT, email);

        log.debug("Response status: {}, body: {}", response.getStatusCode(), response.getBody().asString());

        assertEquals(HTTP_INTERNAL_SERVER_ERROR, response.getStatusCode());

        log.info("Tenant discover correctly returned response for non-existing organization");
    }

    @Test
    @DisplayName("Should return 401 when access token is invalid or expired")
    void shouldReturn401WhenAccessTokenIsInvalidOrExpired() {
        String fakeEmail = faker.internet().emailAddress();
        String invalidToken = "eyJraWQiOiJraWQtNzQ3NWQ5MjQtMDIzYy00YWFhLThkY2ItN2IxNzJmZDU5OWE2IiwiYWxnIjoiUlMyNTYifQ.invalid_token_payload";
        
        log.info("Testing tenant discover with invalid token and email: {}", fakeEmail);

        Response response = given()
            .header("access-token", invalidToken)
            .queryParam("email", fakeEmail)
            .when()
            .get(ApiEndpoints.TENANT_DISCOVER_ENDPOINT.getPath());

        log.debug("Response status: {}, body: {}", response.getStatusCode(), response.getBody().asString());

        ResponseValidator.validate(response)
                .statusCode(HTTP_UNAUTHORIZED)
                .assertAll();

        log.info("Tenant discover correctly returned 401 for invalid access token");
    }
}

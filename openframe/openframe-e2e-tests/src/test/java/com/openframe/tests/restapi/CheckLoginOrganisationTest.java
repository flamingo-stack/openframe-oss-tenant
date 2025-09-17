package com.openframe.tests.restapi;

import com.openframe.support.enums.ApiEndpoints;
import com.openframe.support.helpers.ApiCalls;
import io.restassured.response.Response;
import lombok.extern.slf4j.Slf4j;
import net.datafaker.Faker;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static com.openframe.support.constants.TestConstants.HTTP_OK;
import static org.junit.jupiter.api.Assertions.assertEquals;

@Slf4j
public class CheckLoginOrganisationTest extends ApiBaseTest {

    private static final Faker faker = new Faker();

    @Test
    @DisplayName("Should return tenant discover response when organization does not exist")
    void shouldReturnTenantDiscoverResponseWhenOrganizationDoesNotExist() {
        String fakeEmail = faker.internet().emailAddress();
        log.info("Testing tenant discover with non-existing email: {}", fakeEmail);

        Response response = ApiCalls.get(ApiEndpoints.TENANT_DISCOVER_ENDPOINT, Map.of("email", fakeEmail));

        log.debug("Response status: {}, body: {}", response.getStatusCode(), response.getBody().asString());

        assertEquals(HTTP_OK, response.getStatusCode());
        log.info("Tenant discover correctly returned response for non-existing organization");
    }
}

package com.openframe.tests.ordered.base;

import com.openframe.db.MongoDB;
import com.openframe.config.RestAssuredConfig;
import com.openframe.support.helpers.AuthHelper;
import com.openframe.support.helpers.RequestSpecHelper;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;

import static com.openframe.data.testData.OAuthLoginTestData.performCompleteLogin;

public abstract class AuthorizedTest {

    @BeforeAll
    public void config() {
        RestAssuredConfig.configure();
        RequestSpecHelper.setTokens(AuthHelper.authorize());
    }

    @AfterAll
    public void close() {
        MongoDB.close();
    }
}

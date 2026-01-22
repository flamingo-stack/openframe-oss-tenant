package com.openframe.tests.base;

import com.openframe.config.RestAssuredConfig;
import com.openframe.db.MongoDB;
import com.openframe.helpers.AuthHelper;
import com.openframe.helpers.RequestSpecHelper;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;

public abstract class AuthorizedTest {

    @BeforeAll
    public static void config() {
        RestAssuredConfig.configure();
        RequestSpecHelper.setTokens(AuthHelper.authorize());
        MongoDB.openConnection();
    }

    @AfterAll
    public static void close() {
        MongoDB.closeConnection();
    }
}

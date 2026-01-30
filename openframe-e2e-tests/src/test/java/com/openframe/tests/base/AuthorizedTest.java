package com.openframe.tests.base;

import com.openframe.config.RestAssuredConfig;
import com.openframe.db.MongoDB;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;

public abstract class AuthorizedTest {

    @BeforeAll
    public static void config() {
        RestAssuredConfig.configure();
        MongoDB.openConnection();
    }

    @AfterAll
    public static void close() {
        MongoDB.closeConnection();
    }
}

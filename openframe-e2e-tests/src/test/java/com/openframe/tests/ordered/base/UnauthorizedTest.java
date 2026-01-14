package com.openframe.tests.ordered.base;

import com.openframe.config.RestAssuredConfig;
import org.junit.jupiter.api.BeforeAll;

public abstract class UnauthorizedTest {

    @BeforeAll
    public void config() {
        RestAssuredConfig.configure();
    }

}

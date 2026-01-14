package com.openframe.tests.ordered.base;

import com.openframe.config.MongoDB;
import com.openframe.config.RestAssuredConfig;
import com.openframe.data.dto.response.OAuthTokenResponse;
import com.openframe.data.dto.test.User;
import com.openframe.support.helpers.RequestSpecHelper;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;

import static com.openframe.data.testData.OAuthLoginTestData.performCompleteLogin;
import static com.openframe.support.constants.TestConstants.USER_FILE;
import static com.openframe.support.utils.FileManager.read;

public abstract class AuthorizedTest {

    @BeforeAll
    public void config() {
        RestAssuredConfig.configure();
        User user = read(USER_FILE, User.class);
        OAuthTokenResponse tokens = performCompleteLogin(user);
        RequestSpecHelper.setTokens(tokens);
    }

    @AfterAll
    public void close() {
        MongoDB.close();
    }
}

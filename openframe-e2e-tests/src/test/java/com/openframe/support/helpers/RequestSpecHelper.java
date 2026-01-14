package com.openframe.support.helpers;

import com.openframe.data.dto.response.OAuthTokenResponse;
import io.restassured.builder.RequestSpecBuilder;
import io.restassured.http.ContentType;
import io.restassured.specification.RequestSpecification;
import lombok.Setter;

public class RequestSpecHelper {
    @Setter
    private static OAuthTokenResponse tokens;

    public static RequestSpecification getAuthorizedSpec() {
        return new RequestSpecBuilder()
                .addHeader("Cookie", tokens.cookies())
                .setContentType(ContentType.JSON)
                .build();
    }
}

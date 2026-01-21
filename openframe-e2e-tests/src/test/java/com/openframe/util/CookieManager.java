package com.openframe.util;

import io.restassured.response.Response;

import java.util.Map;

public class CookieManager {

    public static String extractCookiesAsString(Response response) {
        Map<String, String> cookies = response.getCookies();
        if (cookies == null || cookies.isEmpty()) {
            return "";
        }

        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, String> entry : cookies.entrySet()) {
            if (!sb.isEmpty()) {
                sb.append("; ");
            }
            sb.append(entry.getKey()).append("=").append(entry.getValue());
        }
        return sb.toString();
    }

    public static String mergeCookieStrings(String existing, String newCookies) {
        if (existing == null || existing.isEmpty()) {
            return newCookies;
        }
        if (newCookies == null || newCookies.isEmpty()) {
            return existing;
        }
        return existing + "; " + newCookies;
    }

    public static String extractCookieValue(String cookieString, String cookieName) {
        if (cookieString == null || cookieString.isEmpty()) {
            return null;
        }

        for (String cookie : cookieString.split(";\\s*")) {
            String[] parts = cookie.split("=", 2);
            if (parts.length == 2 && parts[0].equals(cookieName)) {
                return parts[1];
            }
        }
        return null;
    }
}


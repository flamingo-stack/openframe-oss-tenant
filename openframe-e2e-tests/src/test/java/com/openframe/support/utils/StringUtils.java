package com.openframe.support.utils;

public class StringUtils {

    public static String extractQueryParam(String url, String paramName) {
        if (url == null || !url.contains("?")) {
            return null;
        }
        String query = url.substring(url.indexOf("?") + 1);
        for (String param : query.split("&")) {
            String[] pair = param.split("=", 2);
            if (pair.length == 2 && pair[0].equals(paramName)) {
                return pair[1];
            }
        }
        return null;
    }
}


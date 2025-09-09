package com.openframe.core.util;

import com.github.slugify.Slugify;

public final class SlugUtil {

    private static final Slugify SLUGIFY = Slugify.builder()
            .lowerCase(true)
            .underscoreSeparator(false)
            .build();

    private SlugUtil() {}

    public static String toSlug(String input) {
        String base = (input == null ? "org" : input);
        return SLUGIFY.slugify(base);
    }
}

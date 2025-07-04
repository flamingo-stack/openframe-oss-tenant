package com.openframe.data.model.enums;

import lombok.Getter;

import java.time.Duration;

@Getter
public enum RateLimitWindow {
    MINUTE(Duration.ofMinutes(1), "yyyy-MM-dd-HH-mm"),
    HOUR(Duration.ofHours(1), "yyyy-MM-dd-HH"),
    DAY(Duration.ofDays(1), "yyyy-MM-dd");

    private final Duration duration;
    private final String timestampFormat;

    RateLimitWindow(Duration duration, String timestampFormat) {
        this.duration = duration;
        this.timestampFormat = timestampFormat;
    }

    public long getSeconds() {
        return duration.getSeconds();
    }
} 
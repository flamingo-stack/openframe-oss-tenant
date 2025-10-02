package com.openframe.support.helpers;

import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.extension.ExtensionContext;
import org.junit.jupiter.api.extension.TestWatcher;

import java.util.Optional;

@Slf4j
public class AllureTestListener implements TestWatcher {

    @Override
    public void testSuccessful(ExtensionContext context) {
        log.info("✅ Test passed: {}", context.getDisplayName());
    }

    @Override
    public void testFailed(ExtensionContext context, Throwable cause) {
        log.error("Test failed: {} - {}: {}",
            context.getDisplayName(),
            cause.getClass().getSimpleName(), 
            cause.getMessage(), 
            cause);
    }

    @Override
    public void testAborted(ExtensionContext context, Throwable cause) {
        log.warn("Test aborted: {}", context.getDisplayName());
    }

    @Override
    public void testDisabled(ExtensionContext context, Optional<String> reason) {
        log.info("Test disabled: {}", context.getDisplayName());
    }
}

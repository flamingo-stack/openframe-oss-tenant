package com.openframe.support.utils;

import org.junit.jupiter.api.extension.ExtensionContext;
import org.junit.jupiter.api.extension.TestExecutionExceptionHandler;

import java.lang.reflect.Method;

public class RetryExtension implements TestExecutionExceptionHandler {
    private static final int MAX_RETRY_COUNT = 3;
    private static final int THREAD_SLEEP_3_SEC = 3000;

    @Override
    public void handleTestExecutionException(ExtensionContext context, Throwable throwable) throws Throwable {
        ExtensionContext.Store store = context.getStore(ExtensionContext.Namespace.create(getClass(),
                context.getRequiredTestMethod()));

        int retryCount = store.getOrDefault("RETRY_COUNT", Integer.class, 0);

        if(retryCount<MAX_RETRY_COUNT) {
            store.put("RETRY_COUNT", retryCount + 1);
            System.out.printf("Retrying test '%s (attempt %d of %d)%n",
                    context.getDisplayName(), retryCount + 1, MAX_RETRY_COUNT);

            Thread.sleep(THREAD_SLEEP_3_SEC);
            Method testMetod = context.getRequiredTestMethod();
            Object testInstance = context.getRequiredTestInstance();

            try {
                testMetod.invoke(testInstance);
            } catch (Exception e) {
                throw e.getCause();
            }
        } else {
            System.out.printf("Test '%s' failed after %d attempts%n",
                    context.getDisplayName(), MAX_RETRY_COUNT);
            throw throwable;
        }
    }
}


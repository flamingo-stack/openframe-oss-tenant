package com.openframe.external.exception;

public class LogNotFoundException extends RuntimeException {
    
    public LogNotFoundException(String message) {
        super(message);
    }
}
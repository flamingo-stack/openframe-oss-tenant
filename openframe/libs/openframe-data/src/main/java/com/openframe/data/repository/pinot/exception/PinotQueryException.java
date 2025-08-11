package com.openframe.data.repository.pinot.exception;

public class PinotQueryException extends RuntimeException {
    public PinotQueryException(String message) {
        super(message);
    }
    
    public PinotQueryException(String message, Throwable cause) {
        super(message, cause);
    }
}

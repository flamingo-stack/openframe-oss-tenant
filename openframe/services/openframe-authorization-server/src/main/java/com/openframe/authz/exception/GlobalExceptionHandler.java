package com.openframe.authz.exception;

import com.openframe.core.dto.ErrorResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleIllegalArgument(IllegalArgumentException ex) {
        log.warn("Bad request: {}", ex.getMessage());
        return new ErrorResponse("BAD_REQUEST", "Invalid request");
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleMissingParam(MissingServletRequestParameterException ex) {
        log.warn("Bad request: missing parameter '{}'", ex.getParameterName());
        return new ErrorResponse("BAD_REQUEST", "Missing required parameter");
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleValidation(MethodArgumentNotValidException ex) {
        log.warn("Validation error: {}", ex.getMessage());
        return new ErrorResponse("VALIDATION_ERROR", "Validation error");
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ErrorResponse handleException(Exception ex) {
        log.error("Internal server error: {}", ex.getMessage(), ex);
        return new ErrorResponse("INTERNAL_SERVER_ERROR", "Internal server error");
    }
}



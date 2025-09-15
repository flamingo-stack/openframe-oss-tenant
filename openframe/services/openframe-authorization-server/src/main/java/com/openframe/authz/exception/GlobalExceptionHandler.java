package com.openframe.authz.exception;

import com.openframe.core.dto.ErrorResponse;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.stream.Collectors;
import java.util.stream.Stream;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(ConstraintViolationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleConstraintViolation(ConstraintViolationException ex) {
        String msg = ex.getConstraintViolations().stream()
                .map(ConstraintViolation::getMessage)
                .findFirst()
                .orElse("Validation error");
        log.warn("Constraint violation: {}", msg);
        return new ErrorResponse("VALIDATION_ERROR", msg);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleIllegalArgument(IllegalArgumentException ex) {
        log.warn("Bad request: {}", ex.getMessage());
        return new ErrorResponse("BAD_REQUEST", ex.getMessage());
    }

    @ExceptionHandler(IllegalStateException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ErrorResponse handleIllegalState(IllegalStateException ex) {
        log.warn("Conflict: {}", ex.getMessage());
        return new ErrorResponse("CONFLICT", ex.getMessage());
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleMissingParam(MissingServletRequestParameterException ex) {
        log.warn("Bad request: missing parameter '{}'", ex.getParameterName());
        return new ErrorResponse("BAD_REQUEST", "Missing required parameter: " + ex.getParameterName());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleValidation(MethodArgumentNotValidException ex) {
        String errors = Stream.concat(
                        ex.getBindingResult().getFieldErrors().stream()
                                .map(err -> err.getField() + ": " + err.getDefaultMessage()),
                        ex.getBindingResult().getGlobalErrors().stream()
                                .map(err -> err.getObjectName() + ": " + err.getDefaultMessage())
                )
                .collect(Collectors.joining("; "));
        log.warn("Validation error: {}", ex.getMessage());
        return new ErrorResponse("VALIDATION_ERROR", errors);
    }

    @ExceptionHandler(UserActiveInAnotherTenantException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ErrorResponse handleUserActiveInAnotherTenant(UserActiveInAnotherTenantException ex) {
        log.warn("Conflict: {}", ex.getMessage());
        return new ErrorResponse("USER_IS_ACTIVE_IN_ANOTHER_TENANT", ex.getMessage());
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ErrorResponse handleException(Exception ex) {
        log.error("Internal server error: {}", ex.getMessage(), ex);
        return new ErrorResponse("INTERNAL_SERVER_ERROR", "Internal server error");
    }
}



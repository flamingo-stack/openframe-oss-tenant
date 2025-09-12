package com.openframe.api.exception;

import com.openframe.core.dto.ErrorResponse;
import com.openframe.core.exception.ApiKeyNotFoundException;
import com.openframe.core.exception.EncryptionException;
import com.openframe.data.exception.UserNotFoundException;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.support.DefaultMessageSourceResolvable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.*;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(AccessDeniedException.class)
    @ResponseStatus(UNAUTHORIZED)
    public ErrorResponse handleAccessDeniedException(AccessDeniedException ex) {
        log.error("Access denied error: ", ex);
        return new ErrorResponse("unauthorized", ex.getMessage());
    }

    @ExceptionHandler(MissingRequestHeaderException.class)
    @ResponseStatus(BAD_REQUEST)
    public ErrorResponse handleMissingRequestHeaderException(MissingRequestHeaderException ex) {
        log.error("Missing required header: ", ex);
        return new ErrorResponse("bad_request", "Required header '" + ex.getHeaderName() + "' is missing");
    }

    @ExceptionHandler(EncryptionException.class)
    @ResponseStatus(INTERNAL_SERVER_ERROR)
    public ErrorResponse handleEncryptionException(EncryptionException ex) {
        log.error("Encryption/decryption error: ", ex);
        return new ErrorResponse(ex.getErrorCode(), "Configuration security error");
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(BAD_REQUEST)
    public ErrorResponse handleIllegalArgumentException(IllegalArgumentException ex) {
        log.error("Invalid request: ", ex);
        return new ErrorResponse("bad_request", ex.getMessage());
    }

    @ExceptionHandler(UserNotFoundException.class)
    @ResponseStatus(NOT_FOUND)
    public ErrorResponse handleUserNotFound(UserNotFoundException ex) {
        log.warn("User not found: {}", ex.getMessage());
        return new ErrorResponse("USER_NOT_FOUND", ex.getMessage());
    }


    @ExceptionHandler(IllegalStateException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ErrorResponse handleIllegalState(IllegalStateException ex) {
        log.warn("Conflict: {}", ex.getMessage());
        return new ErrorResponse("CONFLICT", ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(BAD_REQUEST)
    public ErrorResponse handleValidationException(MethodArgumentNotValidException ex) {
        String errorMessage = ex.getBindingResult().getFieldErrors().stream()
                .map(DefaultMessageSourceResolvable::getDefaultMessage)
                .collect(Collectors.joining(", "));

        log.error("Validation error: {}", errorMessage);
        return new ErrorResponse("bad_request", errorMessage);
    }

    @ExceptionHandler(BadCredentialsException.class)
    @ResponseStatus(UNAUTHORIZED)
    public ErrorResponse handleBadCredentialsException(BadCredentialsException ex) {
        log.error("Authentication failed: ", ex);
        return new ErrorResponse("unauthorized", ex.getMessage());
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    @ResponseStatus(METHOD_NOT_ALLOWED)
    public ErrorResponse handleHttpRequestMethodNotSupported(HttpRequestMethodNotSupportedException ex) {
        log.error("Method not supported: ", ex);
        return new ErrorResponse("method_not_allowed", ex.getMessage());
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    @ResponseStatus(UNSUPPORTED_MEDIA_TYPE)
    public ErrorResponse handleHttpMediaTypeNotSupported(HttpMediaTypeNotSupportedException ex) {
        log.error("Media type not supported: ", ex);
        return new ErrorResponse("unsupported_media_type", ex.getMessage());
    }

    @ExceptionHandler(ConstraintViolationException.class)
    @ResponseStatus(BAD_REQUEST)
    public ErrorResponse handleConstraintViolationException(ConstraintViolationException ex) {
        String errorMessage = ex.getConstraintViolations().stream()
                .map(violation -> violation.getPropertyPath() + ": " + violation.getMessage())
                .collect(Collectors.joining(", "));

        log.error("Validation error: {}", errorMessage);
        return new ErrorResponse("bad_request", errorMessage);
    }

    @ExceptionHandler(ApiKeyNotFoundException.class)
    @ResponseStatus(NOT_FOUND)
    public ErrorResponse handleApiKeyNotFoundException(ApiKeyNotFoundException ex) {
        log.warn("API key not found: {}", ex.getMessage());
        return new ErrorResponse("API_KEY_NOT_FOUND", ex.getMessage());
    }

    @ExceptionHandler({AgentRegistrationSecretNotFoundException.class})
    @ResponseStatus(NOT_FOUND)
    public ErrorResponse handleAgentRegistrationSecretNotFoundException(AgentRegistrationSecretNotFoundException ex) {
        log.error("Agent registration secret entity not found: ", ex);
        return new ErrorResponse(ex.getErrorCode(), ex.getMessage());
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(INTERNAL_SERVER_ERROR)
    public ErrorResponse handleException(Exception ex) {
        log.error("Unexpected error: ", ex);
        return new ErrorResponse("error", ex.getMessage());
    }
} 
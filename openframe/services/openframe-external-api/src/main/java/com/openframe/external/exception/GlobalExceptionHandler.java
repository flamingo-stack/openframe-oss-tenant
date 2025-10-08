package com.openframe.external.exception;

import com.openframe.core.dto.ErrorResponse;
import com.openframe.data.repository.pinot.exception.PinotQueryException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(DeviceNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleDeviceNotFound(DeviceNotFoundException ex) {
        log.warn("Device not found: {}", ex.getMessage());
        return new ErrorResponse("DEVICE_NOT_FOUND", ex.getMessage());
    }

    @ExceptionHandler(EventNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleEventNotFound(EventNotFoundException ex) {
        log.warn("Event not found: {}", ex.getMessage());
        return new ErrorResponse("EVENT_NOT_FOUND", ex.getMessage());
    }

    @ExceptionHandler(LogNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleLogNotFound(LogNotFoundException ex) {
        log.warn("Log not found: {}", ex.getMessage());
        return new ErrorResponse("LOG_NOT_FOUND", ex.getMessage());
    }

    @ExceptionHandler(OrganizationNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleOrganizationNotFound(OrganizationNotFoundException ex) {
        log.warn("Organization not found: {}", ex.getMessage());
        return new ErrorResponse("ORGANIZATION_NOT_FOUND", ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleValidationErrors(MethodArgumentNotValidException ex) {
        log.warn("Validation error: {}", ex.getMessage());
        return new ErrorResponse("VALIDATION_ERROR", "Invalid request parameters");
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        log.warn("Type mismatch error: {}", ex.getMessage());
        String message = String.format("Invalid value '%s' for parameter '%s'", ex.getValue(), ex.getName());
        return new ErrorResponse("TYPE_MISMATCH", message);
    }

    @ExceptionHandler(PinotQueryException.class)
    @ResponseStatus(HttpStatus.SERVICE_UNAVAILABLE)
    public ErrorResponse handlePinotQueryException(PinotQueryException ex) {
        log.error("Pinot query error: ", ex);
        return new ErrorResponse("PINOT_QUERY_ERROR", "Query service temporarily unavailable. Please try again later.");
    }

    @ExceptionHandler(DataAccessException.class)
    @ResponseStatus(HttpStatus.SERVICE_UNAVAILABLE)
    public ErrorResponse handleDataAccessException(DataAccessException ex) {
        log.error("Database access error: ", ex);
        return new ErrorResponse("DATABASE_ERROR", "Database operation failed. Please try again later.");
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ErrorResponse handleGenericException(Exception ex) {
        log.error("Unexpected error occurred", ex);
        return new ErrorResponse("INTERNAL_ERROR", "Internal server error");
    }
} 
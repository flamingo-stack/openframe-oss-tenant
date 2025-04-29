package com.openframe.api.exception;

public class DuplicateConnectionException extends RuntimeException {
  public DuplicateConnectionException(String message) {
    super(message);
  }
}

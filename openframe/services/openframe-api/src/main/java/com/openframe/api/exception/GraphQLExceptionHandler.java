package com.openframe.api.exception;

import com.openframe.data.repository.pinot.exception.PinotQueryException;
import lombok.extern.slf4j.Slf4j;
import graphql.GraphQLError;
import graphql.execution.DataFetcherExceptionHandlerParameters;
import graphql.execution.DataFetcherExceptionHandlerResult;
import graphql.execution.SimpleDataFetcherExceptionHandler;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Component;

import java.util.concurrent.CompletableFuture;

@Component
@Slf4j
public class GraphQLExceptionHandler extends SimpleDataFetcherExceptionHandler {

    @Override
    public CompletableFuture<DataFetcherExceptionHandlerResult> handleException(
            DataFetcherExceptionHandlerParameters handlerParameters) {
        
        Throwable exception = handlerParameters.getException();
        log.error("GraphQL error occurred", exception);

        GraphQLError error;

        if (exception instanceof PinotQueryException) {
            error = GraphQLError.newError()
                .message("Query failed. Please try again later.")
                .extensions(java.util.Map.of(
                    "code", "PINOT_QUERY_ERROR",
                    "timestamp", System.currentTimeMillis()
                ))
                .build();
        } else if (exception instanceof DataAccessException) {
            error = GraphQLError.newError()
                .message("Database operation failed. Please try again later.")
                .extensions(java.util.Map.of(
                    "code", "DATABASE_ERROR",
                    "timestamp", System.currentTimeMillis()
                ))
                .build();
        } else if (exception instanceof IllegalArgumentException) {
            error = GraphQLError.newError()
                .message(exception.getMessage())
                .extensions(java.util.Map.of(
                    "code", "VALIDATION_ERROR",
                    "timestamp", System.currentTimeMillis()
                ))
                .build();
        } else if (exception instanceof RuntimeException) {
            error = GraphQLError.newError()
                .message("An unexpected error occurred. Please try again later.")
                .extensions(java.util.Map.of(
                    "code", "INTERNAL_ERROR",
                    "timestamp", System.currentTimeMillis()
                ))
                .build();
        } else {
            error = GraphQLError.newError()
                .message("An unexpected error occurred. Please try again later.")
                .extensions(java.util.Map.of(
                    "code", "UNKNOWN_ERROR",
                    "timestamp", System.currentTimeMillis()
                ))
                .build();
        }

        return CompletableFuture.completedFuture(
            DataFetcherExceptionHandlerResult.newResult()
                .error(error)
                .build()
        );
    }
} 
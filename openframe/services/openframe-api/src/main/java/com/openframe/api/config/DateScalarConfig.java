package com.openframe.api.config;

import com.netflix.graphql.dgs.DgsScalar;
import graphql.GraphQLContext;
import graphql.execution.CoercedVariables;
import graphql.language.Value;
import graphql.schema.Coercing;
import graphql.schema.CoercingParseLiteralException;
import graphql.schema.CoercingParseValueException;
import graphql.schema.CoercingSerializeException;
import org.springframework.stereotype.Component;

import org.jetbrains.annotations.NotNull;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Locale;

/**
 * GraphQL Date scalar configuration for handling date values in yyyy-MM-dd format.
 * Provides automatic parsing and validation of date inputs.
 */
@DgsScalar(name = "Date")
@Component
public class DateScalarConfig implements Coercing<LocalDate, String> {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    @Override
    public String serialize(@NotNull Object dataFetcherResult,
                            @NotNull GraphQLContext graphQLContext,
                            @NotNull Locale locale) throws CoercingSerializeException {
        if (dataFetcherResult instanceof LocalDate) {
            return ((LocalDate) dataFetcherResult).format(DATE_FORMATTER);
        }
        throw new CoercingSerializeException("Expected a LocalDate object.");
    }

    @Override
    public LocalDate parseValue(@NotNull Object input,
                                @NotNull GraphQLContext graphQLContext,
                                @NotNull Locale locale) throws CoercingParseValueException {
        try {
            if (input instanceof String) {
                return LocalDate.parse((String) input, DATE_FORMATTER);
            }
            throw new CoercingParseValueException("Expected a String");
        } catch (DateTimeParseException e) {
            throw new CoercingParseValueException("Invalid Date format. Expected yyyy-MM-dd");
        }
    }

    @Override
    public LocalDate parseLiteral(@NotNull Value<?> input,
                                  @NotNull CoercedVariables variables,
                                  @NotNull GraphQLContext graphQLContext,
                                  @NotNull Locale locale) throws CoercingParseLiteralException {
        if (input instanceof graphql.language.StringValue) {
            try {
                String value = ((graphql.language.StringValue) input).getValue();
                return LocalDate.parse(value, DATE_FORMATTER);
            } catch (DateTimeParseException e) {
                throw new CoercingParseLiteralException("Invalid Date format. Expected yyyy-MM-dd");
            }
        }
        throw new CoercingParseLiteralException("Expected a StringValue");
    }
}
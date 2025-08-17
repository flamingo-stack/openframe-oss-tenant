package com.openframe.api.config;

import com.netflix.graphql.dgs.DgsScalar;
import graphql.GraphQLContext;
import graphql.execution.CoercedVariables;
import graphql.language.Value;
import graphql.schema.Coercing;
import graphql.schema.CoercingParseLiteralException;
import graphql.schema.CoercingParseValueException;
import graphql.schema.CoercingSerializeException;
import org.jetbrains.annotations.NotNull;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.Locale;

@DgsScalar(name = "Instant")
@Component
public class InstantScalarConfig implements Coercing<Instant, String> {

    @Override
    public String serialize(@NotNull Object dataFetcherResult,
                            @NotNull GraphQLContext graphQLContext,
                            @NotNull Locale locale) throws CoercingSerializeException {
        if (dataFetcherResult instanceof Instant) {
            return ((Instant) dataFetcherResult).toString();
        }
        throw new CoercingSerializeException("Expected an Instant object.");
    }

    @Override
    public Instant parseValue(@NotNull Object input,
                              @NotNull GraphQLContext graphQLContext,
                              @NotNull Locale locale) throws CoercingParseValueException {
        try {
            if (input instanceof String) {
                return Instant.parse((String) input);
            }
            throw new CoercingParseValueException("Expected a String");
        } catch (DateTimeParseException e) {
            throw new CoercingParseValueException("Invalid Instant format");
        }
    }

    @Override
    public Instant parseLiteral(@NotNull Value<?> input,
                                @NotNull CoercedVariables variables,
                                @NotNull GraphQLContext graphQLContext,
                                @NotNull Locale locale) throws CoercingParseLiteralException {
        if (input instanceof graphql.language.StringValue) {
            try {
                String value = ((graphql.language.StringValue) input).getValue();
                return Instant.parse(value);
            } catch (DateTimeParseException e) {
                throw new CoercingParseLiteralException("Invalid Instant format");
            }
        }
        throw new CoercingParseLiteralException("Expected a StringValue");
    }
}
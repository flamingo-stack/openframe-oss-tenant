package com.openframe.api.config;

import com.netflix.graphql.dgs.DgsScalar;
import graphql.schema.Coercing;
import graphql.schema.CoercingParseLiteralException;
import graphql.schema.CoercingParseValueException;
import graphql.schema.CoercingSerializeException;

import java.time.Instant;
import java.time.format.DateTimeParseException;

@DgsScalar(name = "DateTime")
public class DateTimeScalarConfig implements Coercing<Instant, String> {

    @Override
    public String serialize(Object dataFetcherResult) throws CoercingSerializeException {
        if (dataFetcherResult instanceof Instant) {
            return ((Instant) dataFetcherResult).toString();
        }
        throw new CoercingSerializeException("Expected an Instant object.");
    }

    @Override
    public Instant parseValue(Object input) throws CoercingParseValueException {
        try {
            if (input instanceof String) {
                return Instant.parse((String) input);
            }
            throw new CoercingParseValueException("Expected a String");
        } catch (DateTimeParseException e) {
            throw new CoercingParseValueException("Invalid DateTime format");
        }
    }

    @Override
    public Instant parseLiteral(Object input) throws CoercingParseLiteralException {
        if (input instanceof String) {
            try {
                return Instant.parse((String) input);
            } catch (DateTimeParseException e) {
                throw new CoercingParseLiteralException("Invalid DateTime format");
            }
        }
        throw new CoercingParseLiteralException("Expected a String");
    }
} 
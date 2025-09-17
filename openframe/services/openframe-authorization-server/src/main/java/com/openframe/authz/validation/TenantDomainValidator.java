package com.openframe.authz.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class TenantDomainValidator implements ConstraintValidator<TenantDomain, String> {

    @Value("${openframe.domain.validation.regex}")
    private String domainValidationRegex;

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null) {
            return false;
        }
        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            return false;
        }
        return trimmed.matches(domainValidationRegex);
    }
}

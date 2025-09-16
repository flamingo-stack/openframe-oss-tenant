package com.openframe.authz.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;

import static java.lang.annotation.ElementType.FIELD;
import static java.lang.annotation.ElementType.PARAMETER;
import static java.lang.annotation.RetentionPolicy.RUNTIME;

@Target({FIELD, PARAMETER})
@Retention(RUNTIME)
@Constraint(validatedBy = TenantDomainValidator.class)
@Documented
public @interface TenantDomain {
    String message() default "Invalid domain format";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}

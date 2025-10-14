package com.openframe.tests.restapi;

import com.openframe.data.DBQuery;
import io.qameta.allure.Description;
import io.qameta.allure.Feature;
import io.qameta.allure.Story;
import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Demonstrates that DBQuery works independently without requiring ApiBaseTest
 * This test intentionally does NOT extend ApiBaseTest to prove architectural independence
 */
@Slf4j
@Feature("Database Query Independence")
@Story("DBQuery can be used in any test context")
@Tag("smoke")
@DisplayName("DBQuery Independence Verification")
class DBQueryIndependenceTest {
    
    @Test
    @DisplayName("DBQuery should work without ApiBaseTest inheritance")
    @Description("Verifies that DBQuery auto-initializes MongoDB and works in any test context")
    void dbQueryShouldWorkIndependently() {
        log.info("Testing DBQuery independence - NOT extending ApiBaseTest");
        
        // ✅ This call should work without any explicit MongoDB initialization
        // Auto-initialization happens on first use
        long userCount = DBQuery.getUserCount();
        
        log.info("Successfully queried database: {} users found", userCount);
        assertThat(userCount).isGreaterThanOrEqualTo(0);
        
        // ✅ Additional queries should work seamlessly
        long tenantCount = DBQuery.getTenantCount();
        
        log.info("Successfully queried tenants: {} tenants found", tenantCount);
        assertThat(tenantCount).isGreaterThanOrEqualTo(0);
        
        log.info("✅ DBQuery works independently in any test context!");
    }
}


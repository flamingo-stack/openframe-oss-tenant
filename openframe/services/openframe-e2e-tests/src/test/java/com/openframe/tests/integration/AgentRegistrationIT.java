package com.openframe.tests.integration;

import com.openframe.tests.BasePipelineE2ETest;
import com.openframe.support.helpers.ApiHelpers;
import io.qameta.allure.*;
import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.parallel.Execution;
import org.junit.jupiter.api.parallel.ExecutionMode;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.stream.IntStream;
import static org.assertj.core.api.Assertions.assertThat;

@Slf4j
@Epic("Integration Tests")
@Feature("Agent Registration")
@Story("Agent registration workflow")
@Tag("e2e")
@Tag("api")
@DisplayName("Agent Registration Flow E2E Test")
@TestInstance(TestInstance.Lifecycle.PER_METHOD)
@Execution(ExecutionMode.CONCURRENT)
public class AgentRegistrationIT extends BasePipelineE2ETest {
    
    private String testRunId;
    private String machineId;
    
    @BeforeEach
    @Override
    protected void setupPipelineTest(TestInfo testInfo) {
        super.setupPipelineTest(testInfo);
        testRunId = "test-" + UUID.randomUUID().toString().substring(0, 8);
    }
    
    @AfterEach
    void cleanup() {
        if (machineId != null) {
            executePhase(TestPhase.CLEANUP, "Delete test device", () -> {
                ApiHelpers.deleteDevice(machineId);
                log.info("[{}] Cleaned up agent: {}", testRunId, machineId);
            });
        }
    }
    
    @Test
    @Severity(SeverityLevel.NORMAL)
    @Description("Agent registration fails with invalid management key")
    @DisplayName("Agent registration fails with invalid management key")
    void agentRegistrationFailsWithInvalidKey() {
        long startTime = System.currentTimeMillis();
        
        log.info("[{}] Starting invalid key rejection test", testRunId);
        
        try {
            executePhase(TestPhase.ACT, "Attempt registration with invalid key", () -> {
                Map<String, Object> agentData = ApiHelpers.createAgentData("test-host-" + testRunId);
                String invalidKey = "invalid-key-" + testRunId;
                
                try {
                    ApiHelpers.registerAgent(invalidKey, agentData);
                    assertThat(false)
                        .as("Registration should have failed with invalid key")
                        .isTrue();
                } catch (AssertionError e) {
                    log.info("Registration correctly rejected invalid key");
                }
            });
            
            logPipelineMetrics("Invalid Key Rejection", startTime);
            
        } catch (Exception e) {
            log.error("[{}] Invalid key rejection test failed: {}", testRunId, e.getMessage());
            Allure.addAttachment("Error Details", e.toString());
            throw e;
        }
    }
    
    @Test
    @Severity(SeverityLevel.NORMAL)
    @Description("Registered agent can obtain OAuth token")
    @DisplayName("Registered agent can obtain OAuth token")
    void registeredAgentCanObtainOAuthToken() {
        long startTime = System.currentTimeMillis();
        
        log.info("[{}] Starting OAuth token test", testRunId);
        
        try {
            Map<String, String> agentCredentials = executePhase(TestPhase.ARRANGE, "Register agent and get credentials", () -> {
                String managementKey = ApiHelpers.getActiveManagementKey();
                Map<String, Object> agentData = ApiHelpers.createAgentData("test-host-" + testRunId);
                Map<String, String> credentials = ApiHelpers.registerAgentWithCredentials(managementKey, agentData);
                machineId = credentials.get("machineId");
                return credentials;
            });
            
            executePhase(TestPhase.ACT, "Obtain OAuth token", () -> {
                String clientId = agentCredentials.get("clientId");
                String clientSecret = agentCredentials.get("clientSecret");
                
                log.info("[{}] Using clientId: {} to get OAuth token", testRunId, clientId);
                
                String accessToken = ApiHelpers.getAgentOAuthToken(clientId, clientSecret);
                
                assertThat(accessToken)
                    .as("OAuth access token")
                    .isNotNull()
                    .isNotEmpty();
                
                assertThat(accessToken.split("\\."))
                    .as("Token should be in JWT format")
                    .hasSize(3);
                
                log.info("[{}] OAuth token obtained for agent: {}", testRunId, machineId);
            });
            
            logPipelineMetrics("OAuth Token Acquisition", startTime);
            
        } catch (Exception e) {
            log.error("[{}] OAuth token test failed: {}", testRunId, e.getMessage());
            Allure.addAttachment("Error Details", e.toString());
            throw e;
        }
    }
    
    @Test
    @Severity(SeverityLevel.CRITICAL)
    @Description("Multiple agents can register concurrently")
    @DisplayName("Multiple agents can register concurrently")
    void multipleAgentsCanRegisterConcurrently() {
        long startTime = System.currentTimeMillis();
        
        log.info("[{}] Starting concurrent registrations test", testRunId);
        
        try {
            executePhase(TestPhase.ACT, "Register multiple agents concurrently", () -> {
                String managementKey = ApiHelpers.getActiveManagementKey();
                
                List<CompletableFuture<String>> futures = IntStream.range(0, 5)
                    .mapToObj(i -> CompletableFuture.supplyAsync(() -> {
                        String host = "concurrent-host-" + i + "-" + testRunId;
                        Map<String, Object> data = ApiHelpers.createAgentData(host);
                        return ApiHelpers.registerAgent(managementKey, data);
                    }))
                    .toList();
                
                List<String> machineIds = futures.stream()
                    .map(CompletableFuture::join)
                    .toList();
                
                assertThat(machineIds)
                    .as("All agents should be registered")
                    .hasSize(5)
                    .doesNotContainNull()
                    .doesNotHaveDuplicates();
                
                machineIds.forEach(ApiHelpers::deleteDevice);
                
                Allure.addAttachment("Registered Machine IDs", machineIds.toString());
            });
            
            logPipelineMetrics("Concurrent Registrations", startTime);
            
        } catch (Exception e) {
            log.error("[{}] Concurrent registrations test failed: {}", testRunId, e.getMessage());
            Allure.addAttachment("Error Details", e.toString());
            throw e;
        }
    }
    
}
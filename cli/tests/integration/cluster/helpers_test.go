package cluster_integration

import (
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/flamingo-stack/openframe/openframe/tests/integration/common"
	"github.com/stretchr/testify/require"
)

// Test categories for better organization
const (
	CategoryValidation = "validation"
	CategoryBasic      = "basic"
	CategoryAdvanced   = "advanced"
	CategoryPerf       = "performance"
)

// TestConfig holds configuration for test execution
type TestConfig struct {
	SkipOnShort bool
	Category    string
	Timeout     time.Duration
}

// ClusterTestCase represents a test case for cluster operations
type ClusterTestCase struct {
	Name        string
	Args        []string
	ExpectError bool
	ErrorMsg    string
	Validate    func(t *testing.T, result *common.CLIResult)
}

// ValidationTestCase represents a validation test case
type ValidationTestCase struct {
	Name        string
	Args        []string
	ExpectError bool
	ErrorMsg    string
}

// ClusterTestSuite provides common test utilities for cluster operations
type ClusterTestSuite struct {
	t           *testing.T
	clusterName string
}

// NewClusterTestSuite creates a new cluster test suite
func NewClusterTestSuite(t *testing.T) *ClusterTestSuite {
	return &ClusterTestSuite{
		t:           t,
		clusterName: generateUniqueClusterName(t.Name()),
	}
}

// generateUniqueClusterName creates a unique cluster name for testing
func generateUniqueClusterName(testName string) string {
	// Clean test name and add timestamp
	cleanName := strings.ToLower(testName)
	cleanName = strings.ReplaceAll(cleanName, "/", "-")
	cleanName = strings.ReplaceAll(cleanName, "_", "-")
	cleanName = strings.ReplaceAll(cleanName, " ", "-")
	if len(cleanName) > 20 {
		cleanName = cleanName[:20]
	}
	return fmt.Sprintf("%s-%d", cleanName, time.Now().Unix())
}

// RequireDependencies checks for required dependencies
func (suite *ClusterTestSuite) RequireDependencies() {
	if !common.Docker.IsAvailable() {
		suite.t.Skip("Docker required for integration tests")
	}
	if !common.K3d.IsAvailable() {
		suite.t.Skip("k3d required for integration tests")
	}
}

// CreateTestCluster creates a test cluster with automatic cleanup
func (suite *ClusterTestSuite) CreateTestCluster(nodeCount int) string {
	suite.RequireDependencies()

	// Clean up any existing test clusters first
	common.CleanupAllTestClusters()

	clusterName := suite.clusterName
	suite.t.Cleanup(func() {
		common.CleanupTestCluster(clusterName)
	})

	result := common.RunCLI("cluster", "create", clusterName, "--skip-wizard", "--nodes", fmt.Sprintf("%d", nodeCount))
	require.True(suite.t, result.Success(), "Cluster creation failed: %s", result.Stderr)

	return clusterName
}

// RunValidationTests runs a set of validation test cases
func (suite *ClusterTestSuite) RunValidationTests(testCases []ValidationTestCase) {
	for _, tc := range testCases {
		suite.t.Run(tc.Name, func(t *testing.T) {
			result := common.RunCLI(tc.Args...)

			if tc.ExpectError {
				require.True(t, result.Failed(), "Expected error but command succeeded")
				if tc.ErrorMsg != "" {
					require.Contains(t, strings.ToLower(result.Output()), strings.ToLower(tc.ErrorMsg))
				}
			} else {
				require.True(t, result.Success(), "Expected success but got: %s", result.Stderr)
			}
		})
	}
}

// RequireFullTestMode skips test if running in short mode
func RequireFullTestMode(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping resource-intensive test in short mode")
	}
}

// SkipSlowTests skips tests that are too slow for regular execution
func SkipSlowTests(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping slow test in short mode")
	}
}

// AssertCommandSuccess validates that a CLI operation succeeded
func AssertCommandSuccess(t *testing.T, result *common.CLIResult, operationName string) {
	require.True(t, result.Success(), "%s operation failed: %s", operationName, result.Stderr)
}

// AssertCommandFailure validates that a CLI operation failed as expected
func AssertCommandFailure(t *testing.T, result *common.CLIResult, operationName string) {
	require.True(t, result.Failed(), "%s operation should have failed", operationName)
}

// AssertOutputContains validates that command output contains expected text
func AssertOutputContains(t *testing.T, result *common.CLIResult, expectedText string) {
	require.Contains(t, result.Output(), expectedText)
}

// AssertClusterState validates the existence state of a cluster
func AssertClusterState(t *testing.T, clusterName string, shouldExist bool) {
	exists, err := common.ClusterExists(clusterName)
	require.NoError(t, err)
	if shouldExist {
		require.True(t, exists, "Cluster %s should exist", clusterName)
	} else {
		require.False(t, exists, "Cluster %s should not exist", clusterName)
	}
}

// CreateStandardValidationTests returns common validation test cases for any command
func CreateStandardValidationTests(commandName string) []ValidationTestCase {
	return []ValidationTestCase{
		{
			Name:        fmt.Sprintf("%s_without_args", commandName),
			Args:        []string{"cluster", commandName},
			ExpectError: false, // Most commands show help instead of error
		},
		{
			Name:        fmt.Sprintf("%s_with_help", commandName),
			Args:        []string{"cluster", commandName, "--help"},
			ExpectError: false,
		},
		{
			Name:        fmt.Sprintf("%s_empty_name", commandName),
			Args:        []string{"cluster", commandName, ""},
			ExpectError: true, // Empty name causes validation error
			ErrorMsg:    "cluster name cannot be empty",
		},
		{
			Name:        fmt.Sprintf("%s_nonexistent", commandName),
			Args:        []string{"cluster", commandName, "nonexistent-cluster-99999"},
			ExpectError: true,
			ErrorMsg:    "not found",
		},
	}
}

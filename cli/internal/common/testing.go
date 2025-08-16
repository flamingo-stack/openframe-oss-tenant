package common

import (
	"bytes"
	"testing"

	"github.com/flamingo/openframe-cli/internal/cluster"
	"github.com/flamingo/openframe-cli/internal/factory"
	"github.com/spf13/cobra"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestCase represents a standardized test case for cluster commands
type TestCase struct {
	Name           string
	Args           []string
	Flags          map[string]string
	ExpectedError  bool
	ExpectedOutput string
	Setup          func(t *testing.T)
	Cleanup        func(t *testing.T)
}

// CommandTester provides utilities for testing cluster commands
type CommandTester struct {
	t       *testing.T
	manager *cluster.Manager
	cmd     *cobra.Command
	output  *bytes.Buffer
}

// NewCommandTester creates a new command tester
func NewCommandTester(t *testing.T, cmd *cobra.Command) *CommandTester {
	output := &bytes.Buffer{}
	cmd.SetOut(output)
	cmd.SetErr(output)
	
	return &CommandTester{
		t:       t,
		manager: factory.CreateDefaultClusterManager(),
		cmd:     cmd,
		output:  output,
	}
}

// Execute runs the command with given args and flags
func (ct *CommandTester) Execute(args []string, flags map[string]string) error {
	ct.cmd.SetArgs(args)
	
	// Set flags
	for flag, value := range flags {
		err := ct.cmd.Flags().Set(flag, value)
		require.NoError(ct.t, err, "Failed to set flag %s=%s", flag, value)
	}
	
	return ct.cmd.Execute()
}

// GetOutput returns the command output
func (ct *CommandTester) GetOutput() string {
	return ct.output.String()
}

// Reset clears the output buffer
func (ct *CommandTester) Reset() {
	ct.output.Reset()
}

// AssertError checks if the command returned an error as expected
func (ct *CommandTester) AssertError(expectedError bool, err error) {
	if expectedError {
		assert.Error(ct.t, err, "Expected an error but none occurred")
	} else {
		assert.NoError(ct.t, err, "Unexpected error: %v", err)
	}
}

// AssertOutput checks if the output contains expected content
func (ct *CommandTester) AssertOutput(expectedContent string) {
	output := ct.GetOutput()
	if expectedContent != "" {
		assert.Contains(ct.t, output, expectedContent, "Output should contain expected content")
	}
}

// RunTestCase executes a single test case
func (ct *CommandTester) RunTestCase(tc TestCase) {
	ct.t.Run(tc.Name, func(t *testing.T) {
		// Setup
		if tc.Setup != nil {
			tc.Setup(t)
		}
		
		// Cleanup
		defer func() {
			if tc.Cleanup != nil {
				tc.Cleanup(t)
			}
		}()
		
		// Reset output
		ct.Reset()
		
		// Execute command
		err := ct.Execute(tc.Args, tc.Flags)
		
		// Assertions
		ct.AssertError(tc.ExpectedError, err)
		ct.AssertOutput(tc.ExpectedOutput)
	})
}

// RunTestCases executes multiple test cases
func (ct *CommandTester) RunTestCases(testCases []TestCase) {
	for _, tc := range testCases {
		ct.RunTestCase(tc)
	}
}

// MockClusterManager creates a mock cluster manager for testing
func MockClusterManager() *cluster.Manager {
	return factory.CreateDefaultClusterManager()
}

// TestClusterConfig creates a test cluster configuration
func TestClusterConfig(name string) *cluster.ClusterConfig {
	return &cluster.ClusterConfig{
		Name:       name,
		Type:       cluster.ClusterTypeK3d,
		NodeCount:  3,
		K8sVersion: "v1.28.0",
	}
}

// StandardCommandTests returns common test cases for cluster commands
func StandardCommandTests() []TestCase {
	return []TestCase{
		{
			Name:          "help_flag",
			Args:          []string{"--help"},
			ExpectedError: false,
		},
		{
			Name:          "invalid_flag",
			Args:          []string{"--invalid-flag"},
			ExpectedError: true,
		},
	}
}

// FlagTests returns common flag test cases
func FlagTests(validFlags map[string]string) []TestCase {
	var tests []TestCase
	
	for flag, value := range validFlags {
		tests = append(tests, TestCase{
			Name:  flag + "_flag",
			Flags: map[string]string{flag: value},
		})
	}
	
	return tests
}

// ArgumentValidationTests returns common argument validation tests
func ArgumentValidationTests(maxArgs int) []TestCase {
	tests := []TestCase{
		{
			Name: "no_args",
			Args: []string{},
		},
	}
	
	if maxArgs > 0 {
		tests = append(tests, TestCase{
			Name: "one_arg",
			Args: []string{"test-cluster"},
		})
		
		// Test too many args
		tooManyArgs := make([]string, maxArgs+2)
		for i := range tooManyArgs {
			tooManyArgs[i] = "arg" + string(rune('0'+i))
		}
		
		tests = append(tests, TestCase{
			Name:          "too_many_args", 
			Args:          tooManyArgs,
			ExpectedError: true,
		})
	}
	
	return tests
}

// UtilityFunctionTester provides utilities for testing utility functions
type UtilityFunctionTester struct {
	t *testing.T
}

// NewUtilityFunctionTester creates a new utility function tester
func NewUtilityFunctionTester(t *testing.T) *UtilityFunctionTester {
	return &UtilityFunctionTester{t: t}
}

// TestFunction runs a function test with input/output pairs
func (uft *UtilityFunctionTester) TestFunction(name string, fn interface{}, testCases []struct {
	Name     string
	Input    interface{}
	Expected interface{}
}) {
	uft.t.Run(name, func(t *testing.T) {
		for _, tc := range testCases {
			t.Run(tc.Name, func(t *testing.T) {
				// This would need reflection to work generically
				// For now, it's a placeholder for the pattern
				// Each utility function would implement its own test logic
			})
		}
	})
}

// BenchmarkTester provides utilities for benchmarking
type BenchmarkTester struct {
	b *testing.B
}

// NewBenchmarkTester creates a new benchmark tester
func NewBenchmarkTester(b *testing.B) *BenchmarkTester {
	return &BenchmarkTester{b: b}
}

// BenchmarkCommand benchmarks command execution
func (bt *BenchmarkTester) BenchmarkCommand(cmd *cobra.Command, args []string) {
	for i := 0; i < bt.b.N; i++ {
		cmd.SetArgs(args)
		_ = cmd.Execute()
	}
}
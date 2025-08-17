package testutil

import (
	"bytes"
	"testing"

	"github.com/flamingo/openframe-cli/internal/cluster"
	"github.com/flamingo/openframe-cli/internal/common/utils"
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
	manager *cluster.K3dManager
	cmd     *cobra.Command
	output  *bytes.Buffer
}

// NewCommandTester creates a new command tester
func NewCommandTester(t *testing.T, cmd *cobra.Command) *CommandTester {
	output := &bytes.Buffer{}
	cmd.SetOut(output)
	cmd.SetErr(output)
	
	// Create mock executor with proper responses
	mockExecutor := NewTestMockExecutor()
	mockExecutor.SetResponse("k3d cluster list", &utils.CommandResult{
		ExitCode: 0,
		Stdout:   "[]", // Empty JSON array for no clusters
	})
	
	return &CommandTester{
		t:       t,
		manager: cluster.NewK3dManager(mockExecutor, false),
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
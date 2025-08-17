package testutil

import (
	"testing"

	"github.com/flamingo/openframe-cli/internal/cluster"
	"github.com/spf13/cobra"
)

// TestClusterConfig creates a test cluster configuration
func TestClusterConfig(name string) *cluster.ClusterConfig {
	return &cluster.ClusterConfig{
		Name:       name,
		Type:       cluster.ClusterTypeK3d,
		NodeCount:  3,
		K8sVersion: "v1.28.0",
	}
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
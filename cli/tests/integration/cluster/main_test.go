package cluster_integration

import (
	"os"
	"testing"

	"github.com/flamingo-stack/openframe/openframe/tests/integration/common"
)

// TestMain sets up and tears down the test environment
func TestMain(m *testing.M) {
	// Initialize CLI binary for testing
	if err := common.InitializeCLI(); err != nil {
		panic("Failed to build CLI binary: " + err.Error())
	}

	// Run tests
	code := m.Run()

	// Cleanup
	common.CleanupCLI()
	os.Exit(code)
}

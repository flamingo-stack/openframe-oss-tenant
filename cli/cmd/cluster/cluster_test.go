package cluster

import (
	"testing"

	"github.com/flamingo-stack/openframe/openframe/tests/testutil"
)

func init() {
	testutil.InitializeTestMode()
}

func TestClusterRootCommand(t *testing.T) {
	// Test the root cluster command (no setup needed for root command)
	testutil.TestClusterCommand(t, "cluster", GetClusterCmd, nil, nil)
}

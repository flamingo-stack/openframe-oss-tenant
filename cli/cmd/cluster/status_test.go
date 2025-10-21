package cluster

import (
	"testing"

	"github.com/flamingo-stack/openframe/openframe/internal/cluster/utils"
	"github.com/flamingo-stack/openframe/openframe/tests/testutil"
)

func init() {
	testutil.InitializeTestMode()
}

func TestStatusCommand(t *testing.T) {
	setupFunc := func() {
		utils.SetTestExecutor(testutil.NewTestMockExecutor())
	}
	teardownFunc := func() {
		utils.ResetGlobalFlags()
	}

	testutil.TestClusterCommand(t, "status", getStatusCmd, setupFunc, teardownFunc)
}

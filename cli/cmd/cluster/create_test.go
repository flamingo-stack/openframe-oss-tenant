package cluster

import (
	"testing"

	"github.com/flamingo-stack/openframe/openframe/internal/cluster/utils"
	"github.com/flamingo-stack/openframe/openframe/tests/testutil"
)

func init() {
	testutil.InitializeTestMode()
}

func TestCreateCommand(t *testing.T) {
	setupFunc := func() {
		utils.SetTestExecutor(testutil.NewTestMockExecutor())
	}
	teardownFunc := func() {
		utils.ResetGlobalFlags()
	}

	testutil.TestClusterCommand(t, "create", getCreateCmd, setupFunc, teardownFunc)
}

package cluster_integration

import (
	"testing"

	"github.com/flamingo/openframe/tests/integration/common"
	"github.com/flamingo/openframe/tests/testutil"
)

func TestClusterCreate_Help(t *testing.T) {
	result := common.RunCLI("cluster", "create", "--help")
	
	testutil.AssertCommandSuccess(t, result.Stdout, result.Stderr, result.Error).
		StdoutContains("Create a new Kubernetes cluster").
		StdoutContains("--type").
		StdoutContains("--nodes").
		StdoutContains("--skip-wizard").
		StdoutContains("--dry-run")
}

func TestClusterCreate_InvalidFlags(t *testing.T) {
	result := common.RunCLI("cluster", "create", "--invalid-flag")
	
	testutil.AssertCommandFailure(t, result.Stdout, result.Stderr, result.Error).
		StderrContains("unknown flag")
}

func TestClusterCreate_TooManyArgs(t *testing.T) {
	result := common.RunCLI("cluster", "create", "cluster1", "cluster2", "--skip-wizard", "--dry-run")
	
	testutil.AssertCommandFailure(t, result.Stdout, result.Stderr, result.Error).
		OutputContains("accepts at most 1 arg")
}

func TestClusterCreate_EmptyName(t *testing.T) {
	result := common.RunCLI("cluster", "create", "", "--skip-wizard", "--dry-run")
	
	testutil.AssertCommandFailure(t, result.Stdout, result.Stderr, result.Error).
		OutputContains("cluster name cannot be empty")
}
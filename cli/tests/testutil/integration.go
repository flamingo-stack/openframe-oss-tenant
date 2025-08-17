package testutil

import (
	"os/exec"
	"testing"
)

// IntegrationTestDependency represents a dependency required for integration tests
type IntegrationTestDependency struct {
	Name        string
	CheckCmd    []string
	InstallMsg  string
}

// CheckDependency checks if a dependency is available
func (d *IntegrationTestDependency) CheckDependency() bool {
	if len(d.CheckCmd) == 0 {
		return false
	}
	cmd := exec.Command(d.CheckCmd[0], d.CheckCmd[1:]...)
	return cmd.Run() == nil
}

// SkipWithWarning skips a test with a warning message about missing dependencies
func (d *IntegrationTestDependency) SkipWithWarning(t *testing.T, skipMsg string) {
	t.Logf("WARNING: %s - integration test passed due to missing dependency. %s", d.Name, d.InstallMsg)
	t.Skip(skipMsg)
}

// RequireOrSkip checks dependency and skips test with warning if not available
func (d *IntegrationTestDependency) RequireOrSkip(t *testing.T, skipMsg string) {
	if !d.CheckDependency() {
		d.SkipWithWarning(t, skipMsg)
	}
}

// Common dependencies
var (
	DockerDependency = &IntegrationTestDependency{
		Name:       "Docker not running",
		CheckCmd:   []string{"docker", "info"},
		InstallMsg: "Start Docker daemon to run actual cluster tests.",
	}
	
	K3dDependency = &IntegrationTestDependency{
		Name:       "k3d not available",
		CheckCmd:   []string{"k3d", "version"},
		InstallMsg: "Install k3d to run actual cluster tests.",
	}
	
	KubectlDependency = &IntegrationTestDependency{
		Name:       "kubectl not available",
		CheckCmd:   []string{"kubectl", "version", "--client"},
		InstallMsg: "Install kubectl to run actual cluster tests.",
	}
	
	HelmDependency = &IntegrationTestDependency{
		Name:       "helm not available",
		CheckCmd:   []string{"helm", "version"},
		InstallMsg: "Install helm to run actual cluster tests.",
	}
)

// RequireClusterDependencies checks all cluster-related dependencies
func RequireClusterDependencies(t *testing.T) {
	DockerDependency.RequireOrSkip(t, "Docker not running, skipping integration test")
	K3dDependency.RequireOrSkip(t, "k3d not available, skipping integration test")
}

// RequireK8sDependencies checks all k8s tool dependencies
func RequireK8sDependencies(t *testing.T) {
	KubectlDependency.RequireOrSkip(t, "kubectl not available, skipping integration test")
	HelmDependency.RequireOrSkip(t, "helm not available, skipping integration test")
}
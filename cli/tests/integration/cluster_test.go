package integration_test

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var (
	cliBinary string
)

// TestMain builds the CLI binary before running integration tests
func TestMain(m *testing.M) {
	// Build the CLI binary
	projectRoot := getProjectRoot()
	cliBinary = filepath.Join(projectRoot, "build", "openframe-test")
	
	buildCmd := exec.Command("go", "build", "-o", cliBinary, "./cmd/openframe")
	buildCmd.Dir = projectRoot
	if err := buildCmd.Run(); err != nil {
		fmt.Printf("Failed to build CLI binary: %v\n", err)
		os.Exit(1)
	}

	// Run tests
	code := m.Run()

	// Cleanup
	os.Remove(cliBinary)
	os.Exit(code)
}

func getProjectRoot() string {
	// Get the current working directory and find project root
	wd, _ := os.Getwd()
	// Navigate up to find the directory containing go.mod
	for {
		if _, err := os.Stat(filepath.Join(wd, "go.mod")); err == nil {
			return wd
		}
		parent := filepath.Dir(wd)
		if parent == wd {
			break
		}
		wd = parent
	}
	return wd
}

// runCLI executes the CLI binary with given arguments
func runCLI(args ...string) (string, string, error) {
	cmd := exec.Command(cliBinary, args...)
	
	// Set a reasonable timeout
	timeout := 2 * time.Minute
	cmd.Env = os.Environ() // Inherit environment
	
	var stdout, stderr strings.Builder
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	
	// Start the command
	if err := cmd.Start(); err != nil {
		return "", "", fmt.Errorf("failed to start command: %w", err)
	}
	
	// Wait with timeout
	done := make(chan error, 1)
	go func() {
		done <- cmd.Wait()
	}()
	
	select {
	case err := <-done:
		return stdout.String(), stderr.String(), err
	case <-time.After(timeout):
		cmd.Process.Kill()
		return stdout.String(), stderr.String(), fmt.Errorf("command timed out after %v", timeout)
	}
}

// TestClusterCreate_Help tests the help output
func TestClusterCreate_Help(t *testing.T) {
	stdout, stderr, err := runCLI("cluster", "create", "--help")
	
	assert.NoError(t, err)
	assert.Empty(t, stderr)
	assert.Contains(t, stdout, "Create a new Kubernetes cluster")
	assert.Contains(t, stdout, "--type")
	assert.Contains(t, stdout, "--nodes")
	assert.Contains(t, stdout, "--skip-wizard")
	assert.Contains(t, stdout, "--dry-run")
}

// TestClusterCreate_DryRun tests dry run mode
func TestClusterCreate_DryRun(t *testing.T) {
	stdout, stderr, err := runCLI("cluster", "create", "integration-test", 
		"--skip-wizard", "--dry-run", "--type", "k3d", "--nodes", "1")
	
	assert.NoError(t, err)
	assert.Empty(t, stderr)
	assert.Contains(t, stdout, "Configuration Summary:")
	assert.Contains(t, stdout, "integration-test")
	assert.Contains(t, stdout, "k3d")
	assert.Contains(t, stdout, "Node Count: 1")
	assert.Contains(t, stdout, "DRY RUN MODE")
}

// TestClusterCreate_InvalidFlags tests error handling
func TestClusterCreate_InvalidFlags(t *testing.T) {
	stdout, stderr, err := runCLI("cluster", "create", "--invalid-flag")
	
	assert.Error(t, err)
	assert.Contains(t, stderr, "unknown flag")
	_ = stdout // May contain usage information
}

// TestClusterCreate_TooManyArgs tests argument validation
func TestClusterCreate_TooManyArgs(t *testing.T) {
	stdout, stderr, err := runCLI("cluster", "create", "cluster1", "cluster2", "--skip-wizard", "--dry-run")
	
	assert.Error(t, err)
	output := stdout + stderr
	assert.Contains(t, output, "accepts at most 1 arg")
}

// TestClusterCreate_EmptyName tests empty cluster name validation
func TestClusterCreate_EmptyName(t *testing.T) {
	stdout, stderr, err := runCLI("cluster", "create", "", "--skip-wizard", "--dry-run")
	
	assert.Error(t, err)
	output := stdout + stderr
	assert.Contains(t, output, "cluster name cannot be empty")
}

// TestClusterCreate_DefaultValues tests default behavior
func TestClusterCreate_DefaultValues(t *testing.T) {
	stdout, stderr, err := runCLI("cluster", "create", "--skip-wizard", "--dry-run")
	
	assert.NoError(t, err)
	assert.Empty(t, stderr)
	assert.Contains(t, stdout, "openframe-dev") // default name
	assert.Contains(t, stdout, "k3d")           // default type
	assert.Contains(t, stdout, "Node Count: 3") // default node count
}

// TestClusterCreate_AllFlags tests all flags together
func TestClusterCreate_AllFlags(t *testing.T) {
	stdout, stderr, err := runCLI("cluster", "create", "test-all-flags",
		"--type", "k3d",
		"--nodes", "2", 
		"--version", "v1.31.0-k3s1",
		"--skip-wizard",
		"--dry-run")
	
	assert.NoError(t, err)
	assert.Empty(t, stderr)
	assert.Contains(t, stdout, "test-all-flags")
	assert.Contains(t, stdout, "k3d")
	assert.Contains(t, stdout, "Node Count: 2")
	assert.Contains(t, stdout, "v1.31.0-k3s1")
}

// TestClusterCreate_ShortFlags tests flag aliases
func TestClusterCreate_ShortFlags(t *testing.T) {
	stdout, stderr, err := runCLI("cluster", "create", "test-short",
		"-t", "k3d",
		"-n", "1",
		"-v", "v1.32.0-k3s1",
		"--skip-wizard",
		"--dry-run")
	
	assert.NoError(t, err)
	assert.Empty(t, stderr)
	assert.Contains(t, stdout, "test-short")
	assert.Contains(t, stdout, "k3d")
	assert.Contains(t, stdout, "Node Count: 1")
	assert.Contains(t, stdout, "v1.32.0-k3s1")
}

// TestClusterCreate_GlobalVerboseFlag tests global verbose flag
func TestClusterCreate_GlobalVerbose(t *testing.T) {
	stdout, stderr, err := runCLI("cluster", "create", "test-verbose",
		"--verbose", "--skip-wizard", "--dry-run")
	
	assert.NoError(t, err)
	assert.Empty(t, stderr)
	assert.Contains(t, stdout, "test-verbose")
}

// TestClusterCreate_GlobalSilentFlag tests global silent flag
func TestClusterCreate_GlobalSilent(t *testing.T) {
	stdout, stderr, err := runCLI("cluster", "create", "test-silent",
		"--silent", "--skip-wizard", "--dry-run")
	
	// Silent mode should suppress most output except errors
	assert.NoError(t, err)
	assert.Empty(t, stderr)
	// Should have minimal or no output in silent mode
	_ = stdout // Silent mode may or may not produce output
}

// Integration test that actually creates and deletes a cluster
// This test requires k3d to be installed and available
func TestClusterCreate_RealCluster(t *testing.T) {
	// Check if k3d is available
	if _, err := exec.LookPath("k3d"); err != nil {
		t.Skip("k3d not available, skipping real cluster test")
	}

	clusterName := fmt.Sprintf("integration-test-%d", time.Now().Unix())
	
	// Cleanup function
	cleanup := func() {
		// Try to delete the cluster in case test fails
		runCLI("cluster", "delete", clusterName, "--force")
	}
	defer cleanup()

	t.Run("create cluster", func(t *testing.T) {
		stdout, stderr, err := runCLI("cluster", "create", clusterName,
			"--type", "k3d",
			"--nodes", "1",
			"--skip-wizard")
		
		require.NoError(t, err, "Failed to create cluster. stdout: %s, stderr: %s", stdout, stderr)
		assert.Contains(t, stdout, "created successfully")
	})

	t.Run("verify cluster exists", func(t *testing.T) {
		// Use k3d directly to verify cluster exists
		cmd := exec.Command("k3d", "cluster", "list")
		output, err := cmd.Output()
		require.NoError(t, err)
		assert.Contains(t, string(output), clusterName)
	})

	t.Run("delete cluster", func(t *testing.T) {
		stdout, stderr, err := runCLI("cluster", "delete", clusterName, "--force")
		require.NoError(t, err, "Failed to delete cluster. stdout: %s, stderr: %s", stdout, stderr)
		assert.Contains(t, stdout, "deleted successfully")
	})
}
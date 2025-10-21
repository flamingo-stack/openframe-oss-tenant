package cmd

import (
	"os"
	"testing"

	"github.com/flamingo-stack/openframe/openframe/internal/shared/config"
	"github.com/flamingo-stack/openframe/openframe/internal/shared/ui"
	"github.com/flamingo-stack/openframe/openframe/tests/testutil"
)

func init() {
	// Suppress logo output during tests
	ui.TestMode = true
	testutil.InitializeTestMode()
}

func TestRootCommand(t *testing.T) {
	// Test basic command structure using testutil
	cmd := GetRootCmd(DefaultVersionInfo)

	// Note: Root command doesn't have RunE function, so we use custom validation
	if cmd.Use != "openframe" {
		t.Errorf("expected Use to be 'openframe', got %q", cmd.Use)
	}

	expectedShort := "OpenFrame CLI - Kubernetes cluster bootstrapping and development tools"
	if cmd.Short != expectedShort {
		t.Errorf("expected Short to be %q, got %q", expectedShort, cmd.Short)
	}

	if cmd.Long == "" {
		t.Error("Command should have long description")
	}
}

func TestRootCommandHelp(t *testing.T) {
	// Test help command using testutil
	cmd := GetRootCmd(DefaultVersionInfo)
	testutil.TestCLICommand(t, cmd, []string{"--help"}, false, "OpenFrame CLI", "Available Commands")
}

func TestRootCommandVersion(t *testing.T) {
	// Test version flag using testutil
	cmd := GetRootCmd(DefaultVersionInfo)
	testutil.TestCLICommand(t, cmd, []string{"--version"}, false, "dev", "none", "unknown")
}

func TestGetRootCmd(t *testing.T) {
	versionInfo := VersionInfo{
		Version: "test-version",
		Commit:  "test-commit",
		Date:    "test-date",
	}

	cmd := GetRootCmd(versionInfo)

	if cmd.Use != "openframe" {
		t.Errorf("expected Use to be 'openframe', got %q", cmd.Use)
	}

	if cmd.Short == "" {
		t.Error("Short description should not be empty")
	}

	expectedVersion := "test-version (test-commit) built on test-date"
	if cmd.Version != expectedVersion {
		t.Errorf("expected version %q, got %q", expectedVersion, cmd.Version)
	}
}

func TestSystemService(t *testing.T) {
	// Test system service
	service := config.NewSystemService()

	err := service.Initialize()
	if err != nil {
		t.Errorf("Initialize() should not error: %v", err)
	}

	// Check that log directory exists
	logDir := service.GetLogDirectory()
	if _, err := os.Stat(logDir); os.IsNotExist(err) {
		t.Error("Service should create log directory")
	}
}

func TestVersionInfo(t *testing.T) {
	// Test default version info
	if DefaultVersionInfo.Version == "" {
		t.Error("DefaultVersionInfo.Version should be initialized")
	}
	if DefaultVersionInfo.Commit == "" {
		t.Error("DefaultVersionInfo.Commit should be initialized")
	}
	if DefaultVersionInfo.Date == "" {
		t.Error("DefaultVersionInfo.Date should be initialized")
	}
}

func TestExecuteWithVersion(t *testing.T) {
	// Test that ExecuteWithVersion function exists and can be called
	defer func() {
		if r := recover(); r != nil {
			t.Errorf("ExecuteWithVersion should not panic: %v", r)
		}
	}()

	// We can't actually execute it in tests, but we can verify the function exists
	_ = ExecuteWithVersion
}

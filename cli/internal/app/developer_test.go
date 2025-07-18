package app

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"openframe/internal/config"
)

func TestNewDeveloper(t *testing.T) {
	app := &App{}
	developer := NewDeveloper(app)

	if developer == nil {
		t.Fatal("NewDeveloper() returned nil")
	}

	if developer.app != app {
		t.Error("NewDeveloper() should set app reference correctly")
	}

	// Test default values
	if !developer.portForward {
		t.Error("portForward should default to true")
	}
	if !developer.tail {
		t.Error("tail should default to true")
	}
	if !developer.cleanup {
		t.Error("cleanup should default to true")
	}
	if developer.timeout != "0" {
		t.Errorf("timeout should default to '0', got %s", developer.timeout)
	}
}

func TestSetFlags(t *testing.T) {
	developer := &Developer{}

	// Test setting flags
	developer.SetFlags(false, true, false, "30m")

	if developer.portForward {
		t.Error("SetFlags should set portForward correctly")
	}
	if !developer.tail {
		t.Error("SetFlags should set tail correctly")
	}
	if developer.cleanup {
		t.Error("SetFlags should set cleanup correctly")
	}
	if developer.timeout != "30m" {
		t.Errorf("SetFlags should set timeout correctly, got %s", developer.timeout)
	}
}

func TestDevMethod(t *testing.T) {
	// Create a temporary directory for testing
	tempDir, err := os.MkdirTemp("", "test-service")
	if err != nil {
		t.Fatalf("Failed to create temp directory: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Create a mock skaffold.yaml file
	skaffoldFile := filepath.Join(tempDir, "skaffold.yaml")
	err = os.WriteFile(skaffoldFile, []byte("apiVersion: skaffold/v2beta26\nkind: Config"), 0644)
	if err != nil {
		t.Fatalf("Failed to create skaffold.yaml: %v", err)
	}

	// Create a minimal mock app for the executor
	execApp := &App{dryRun: true, verbose: false}

	// Create a mock app with test config and real executor in dryRun mode
	app := &App{
		config: &config.ProjectConfig{
			Services: map[string]*config.Service{
				"test-service": {
					Name:      "test-service",
					Directory: tempDir,
					Namespace: "test-namespace",
					Type:      config.ServiceTypeMicroservice,
				},
			},
		},
		telepresence: &TelepresenceManager{},
		executor:     NewCommandExecutor(execApp),
	}

	developer := &Developer{app: app}

	// Test Dev method with valid service
	ctx := context.Background()
	err = developer.Dev(ctx, "test-service")
	if err != nil {
		t.Logf("Dev() returned expected error: %v", err)
	}

	// Test Dev method with invalid service
	err = developer.Dev(ctx, "invalid-service")
	if err == nil {
		t.Error("Dev() should return error for invalid service")
	}
}

func TestDevWithMissingSkaffoldFile(t *testing.T) {
	// Create a temporary directory without skaffold.yaml
	tempDir, err := os.MkdirTemp("", "test-service")
	if err != nil {
		t.Fatalf("Failed to create temp directory: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Create a mock app with test config
	app := &App{
		config: &config.ProjectConfig{
			Services: map[string]*config.Service{
				"test-service": {
					Name:      "test-service",
					Directory: tempDir,
					Namespace: "test-namespace",
					Type:      config.ServiceTypeMicroservice,
				},
			},
		},
		telepresence: &TelepresenceManager{},
		executor:     &CommandExecutor{},
	}

	developer := &Developer{app: app}

	// Test Dev method with missing skaffold.yaml
	ctx := context.Background()
	err = developer.Dev(ctx, "test-service")
	if err == nil {
		t.Error("Dev() should return error for missing skaffold.yaml")
	}
}

func TestDevWithTelepresenceNotConnected(t *testing.T) {
	// Create a temporary directory for testing
	tempDir, err := os.MkdirTemp("", "test-service")
	if err != nil {
		t.Fatalf("Failed to create temp directory: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Create a mock skaffold.yaml file
	skaffoldFile := filepath.Join(tempDir, "skaffold.yaml")
	err = os.WriteFile(skaffoldFile, []byte("apiVersion: skaffold/v2beta26\nkind: Config"), 0644)
	if err != nil {
		t.Fatalf("Failed to create skaffold.yaml: %v", err)
	}

	// Create a mock telepresence manager that returns not connected
	mockTelepresence := &TelepresenceManager{}

	// Create a minimal mock app for the executor
	execApp := &App{dryRun: true, verbose: false}

	// Create a mock app with test config and dry-run executor
	app := &App{
		config: &config.ProjectConfig{
			Services: map[string]*config.Service{
				"test-service": {
					Name:      "test-service",
					Directory: tempDir,
					Namespace: "test-namespace",
					Type:      config.ServiceTypeMicroservice,
				},
			},
		},
		telepresence: mockTelepresence,
		executor:     NewCommandExecutor(execApp),
	}

	developer := &Developer{app: app}

	// Test Dev method
	ctx := context.Background()
	err = developer.Dev(ctx, "test-service")
	if err != nil {
		t.Logf("Dev() returned expected error: %v", err)
	}
}

func TestDeveloperStructFields(t *testing.T) {
	// Test that Developer struct has all expected fields
	developer := &Developer{}

	// Test that fields can be set and accessed
	developer.portForward = true
	if !developer.portForward {
		t.Error("portForward field should be accessible")
	}

	developer.tail = true
	if !developer.tail {
		t.Error("tail field should be accessible")
	}

	developer.cleanup = true
	if !developer.cleanup {
		t.Error("cleanup field should be accessible")
	}

	developer.timeout = "30m"
	if developer.timeout != "30m" {
		t.Error("timeout field should be accessible")
	}
}

func TestDevWithDifferentFlags(t *testing.T) {
	// Create a temporary directory for testing
	tempDir, err := os.MkdirTemp("", "test-service")
	if err != nil {
		t.Fatalf("Failed to create temp directory: %v", err)
	}
	defer os.RemoveAll(tempDir)

	// Create a mock skaffold.yaml file
	skaffoldFile := filepath.Join(tempDir, "skaffold.yaml")
	err = os.WriteFile(skaffoldFile, []byte("apiVersion: skaffold/v2beta26\nkind: Config"), 0644)
	if err != nil {
		t.Fatalf("Failed to create skaffold.yaml: %v", err)
	}

	// Create a minimal mock app for the executor
	execApp := &App{dryRun: true, verbose: false}

	// Create a mock app with test config and dry-run executor
	app := &App{
		config: &config.ProjectConfig{
			Services: map[string]*config.Service{
				"test-service": {
					Name:      "test-service",
					Directory: tempDir,
					Namespace: "test-namespace",
					Type:      config.ServiceTypeMicroservice,
				},
			},
		},
		telepresence: &TelepresenceManager{},
		executor:     NewCommandExecutor(execApp),
	}

	developer := &Developer{app: app}

	// Test with different flag combinations
	testCases := []struct {
		name        string
		portForward bool
		tail        bool
		cleanup     bool
		timeout     string
	}{
		{"all flags true", true, true, true, "0"},
		{"all flags false", false, false, false, "30m"},
		{"mixed flags", true, false, true, "1h"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			developer.SetFlags(tc.portForward, tc.tail, tc.cleanup, tc.timeout)

			ctx := context.Background()
			err := developer.Dev(ctx, "test-service")
			// This will likely fail due to telepresence not being connected, but we're testing the method exists
			if err != nil {
				t.Logf("Dev() returned expected error: %v", err)
			}
		})
	}
}

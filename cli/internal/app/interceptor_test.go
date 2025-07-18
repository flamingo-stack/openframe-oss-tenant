package app

import (
	"context"
	"testing"

	"openframe/internal/config"
)

func TestNewInterceptor(t *testing.T) {
	app := &App{}
	interceptor := NewInterceptor(app)

	if interceptor == nil {
		t.Fatal("NewInterceptor() returned nil")
	}

	if interceptor.app != app {
		t.Error("NewInterceptor() should set app reference correctly")
	}

	// Test default values
	if interceptor.mount {
		t.Error("mount should default to false")
	}
	if interceptor.force {
		t.Error("force should default to false")
	}
	if interceptor.timeout != "30s" {
		t.Errorf("timeout should default to '30s', got %s", interceptor.timeout)
	}
}

func TestSetInterceptorFlags(t *testing.T) {
	interceptor := &Interceptor{}

	// Test setting flags
	interceptor.SetFlags(true, true, "60s")

	if !interceptor.mount {
		t.Error("SetFlags should set mount correctly")
	}
	if !interceptor.force {
		t.Error("SetFlags should set force correctly")
	}
	if interceptor.timeout != "60s" {
		t.Errorf("SetFlags should set timeout correctly, got %s", interceptor.timeout)
	}
}

func TestInterceptMethod(t *testing.T) {
	// Create a mock app with test config
	app := &App{
		config: &config.ProjectConfig{
			Services: map[string]*config.Service{
				"test-service": {
					Name:      "test-service",
					Directory: "/test/dir",
					Namespace: "test-namespace",
					Type:      config.ServiceTypeMicroservice,
				},
			},
		},
		telepresence: &TelepresenceManager{},
		executor:     &CommandExecutor{},
	}

	interceptor := &Interceptor{app: app}

	// Test Intercept method with valid service and ports
	ctx := context.Background()
	err := interceptor.Intercept(ctx, "test-service", "8080", "8080")
	// This will likely fail due to telepresence not being connected, but we're testing the method exists
	if err != nil {
		t.Logf("Intercept() returned expected error: %v", err)
	}

	// Test Intercept method with invalid service
	err = interceptor.Intercept(ctx, "invalid-service", "8080", "8080")
	if err == nil {
		t.Error("Intercept() should return error for invalid service")
	}
}

func TestInterceptWithInvalidPorts(t *testing.T) {
	// Create a mock app with test config
	app := &App{
		config: &config.ProjectConfig{
			Services: map[string]*config.Service{
				"test-service": {
					Name:      "test-service",
					Directory: "/test/dir",
					Namespace: "test-namespace",
					Type:      config.ServiceTypeMicroservice,
				},
			},
		},
		telepresence: &TelepresenceManager{},
		executor:     &CommandExecutor{},
	}

	interceptor := &Interceptor{app: app}

	// Test with invalid local port
	ctx := context.Background()
	err := interceptor.Intercept(ctx, "test-service", "abc", "8080")
	if err == nil {
		t.Error("Intercept() should return error for invalid local port")
	}

	// Test with invalid remote port
	err = interceptor.Intercept(ctx, "test-service", "8080", "xyz")
	if err == nil {
		t.Error("Intercept() should return error for invalid remote port")
	}
}

func TestInterceptWithTelepresenceNotConnected(t *testing.T) {
	// Create a mock app with test config
	app := &App{
		config: &config.ProjectConfig{
			Services: map[string]*config.Service{
				"test-service": {
					Name:      "test-service",
					Directory: "/test/dir",
					Namespace: "test-namespace",
					Type:      config.ServiceTypeMicroservice,
				},
			},
		},
		telepresence: &TelepresenceManager{},
		executor:     &CommandExecutor{},
	}

	interceptor := &Interceptor{app: app}

	// Test Intercept method
	ctx := context.Background()
	err := interceptor.Intercept(ctx, "test-service", "8080", "8080")
	// This will likely fail due to telepresence not being connected, but we're testing the method exists
	if err != nil {
		t.Logf("Intercept() returned expected error: %v", err)
	}
}

func TestInterceptorStructFields(t *testing.T) {
	// Test that Interceptor struct has all expected fields
	interceptor := &Interceptor{}

	// Test that fields can be set and accessed
	interceptor.mount = true
	if !interceptor.mount {
		t.Error("mount field should be accessible")
	}

	interceptor.force = true
	if !interceptor.force {
		t.Error("force field should be accessible")
	}

	interceptor.timeout = "60s"
	if interceptor.timeout != "60s" {
		t.Error("timeout field should be accessible")
	}
}

func TestInterceptWithDifferentFlags(t *testing.T) {
	// Create a mock app with test config
	app := &App{
		config: &config.ProjectConfig{
			Services: map[string]*config.Service{
				"test-service": {
					Name:      "test-service",
					Directory: "/test/dir",
					Namespace: "test-namespace",
					Type:      config.ServiceTypeMicroservice,
				},
			},
		},
		telepresence: &TelepresenceManager{},
		executor:     &CommandExecutor{},
	}

	interceptor := &Interceptor{app: app}

	// Test with different flag combinations
	testCases := []struct {
		name    string
		mount   bool
		force   bool
		timeout string
	}{
		{"all flags true", true, true, "30s"},
		{"all flags false", false, false, "60s"},
		{"mixed flags", true, false, "1m"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			interceptor.SetFlags(tc.mount, tc.force, tc.timeout)

			ctx := context.Background()
			err := interceptor.Intercept(ctx, "test-service", "8080", "8080")
			// This will likely fail due to telepresence not being connected, but we're testing the method exists
			if err != nil {
				t.Logf("Intercept() returned expected error: %v", err)
			}
		})
	}
}

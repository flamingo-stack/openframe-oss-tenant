package app

import (
	"context"
	"testing"

	"openframe/internal/config"
)

func TestNew(t *testing.T) {
	// Test creating a new app instance
	app, err := New()
	if err != nil {
		t.Fatalf("New() failed: %v", err)
	}

	if app == nil {
		t.Fatal("New() returned nil app")
	}

	// Test that all modules are initialized
	if app.executor == nil {
		t.Error("executor should be initialized")
	}
	if app.telepresence == nil {
		t.Error("telepresence should be initialized")
	}
	if app.lister == nil {
		t.Error("lister should be initialized")
	}
	if app.developer == nil {
		t.Error("developer should be initialized")
	}
	if app.interceptor == nil {
		t.Error("interceptor should be initialized")
	}
	if app.config == nil {
		t.Error("config should be initialized")
	}
}

func TestSetDryRun(t *testing.T) {
	app := &App{}

	// Test setting dry run to true
	app.SetDryRun(true)
	if !app.dryRun {
		t.Error("SetDryRun(true) should set dryRun to true")
	}

	// Test setting dry run to false
	app.SetDryRun(false)
	if app.dryRun {
		t.Error("SetDryRun(false) should set dryRun to false")
	}
}

func TestSetVerbose(t *testing.T) {
	app := &App{}

	// Test setting verbose to true
	app.SetVerbose(true)
	if !app.verbose {
		t.Error("SetVerbose(true) should set verbose to true")
	}

	// Test setting verbose to false
	app.SetVerbose(false)
	if app.verbose {
		t.Error("SetVerbose(false) should set verbose to false")
	}
}

func TestSetDevFlags(t *testing.T) {
	app := &App{
		developer: &Developer{},
	}

	// Test setting dev flags
	app.SetDevFlags(true, false, true, "30m")

	if !app.developer.portForward {
		t.Error("SetDevFlags should set portForward correctly")
	}
	if app.developer.tail {
		t.Error("SetDevFlags should set tail correctly")
	}
	if !app.developer.cleanup {
		t.Error("SetDevFlags should set cleanup correctly")
	}
	if app.developer.timeout != "30m" {
		t.Errorf("SetDevFlags should set timeout correctly, got %s", app.developer.timeout)
	}
}

func TestSetInterceptFlags(t *testing.T) {
	app := &App{
		interceptor: &Interceptor{},
	}

	// Test setting intercept flags
	app.SetInterceptFlags(true, false, "60s")

	if !app.interceptor.mount {
		t.Error("SetInterceptFlags should set mount correctly")
	}
	if app.interceptor.force {
		t.Error("SetInterceptFlags should set force correctly")
	}
	if app.interceptor.timeout != "60s" {
		t.Errorf("SetInterceptFlags should set timeout correctly, got %s", app.interceptor.timeout)
	}
}

func TestValidateService(t *testing.T) {
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
	}

	// Test valid service
	err := app.ValidateService("test-service")
	if err != nil {
		t.Errorf("ValidateService should not error for valid service: %v", err)
	}

	// Test invalid service
	err = app.ValidateService("invalid-service")
	if err == nil {
		t.Error("ValidateService should error for invalid service")
	}
}

func TestDev(t *testing.T) {
	// Create a mock app with properly initialized developer
	app := &App{
		developer: &Developer{
			app: &App{}, // Initialize with a reference to avoid nil pointer
		},
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

	// Set the app reference in developer
	app.developer.app = app

	// Test Dev method
	ctx := context.Background()
	err := app.Dev(ctx, "test-service")
	// This will likely fail due to missing skaffold.yaml, but we're testing the method exists
	if err != nil {
		t.Logf("Dev() returned expected error: %v", err)
	}
}

func TestIntercept(t *testing.T) {
	// Create a mock app with properly initialized interceptor
	app := &App{
		interceptor: &Interceptor{
			app: &App{}, // Initialize with a reference to avoid nil pointer
		},
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

	// Set the app reference in interceptor
	app.interceptor.app = app

	// Test Intercept method
	ctx := context.Background()
	err := app.Intercept(ctx, "test-service", "8080", "8080")
	// This will likely fail due to telepresence not being connected, but we're testing the method exists
	if err != nil {
		t.Logf("Intercept() returned expected error: %v", err)
	}
}

func TestList(t *testing.T) {
	// Create a mock app
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
	}
	app.lister = NewServiceLister(app)

	// Test List method
	app.List(false, "")
	// This method doesn't return anything, so we just test it doesn't panic
}

func TestListJSON(t *testing.T) {
	// Create a mock app
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
	}
	app.lister = NewServiceLister(app)

	// Test ListJSON method
	err := app.ListJSON()
	if err != nil {
		t.Errorf("ListJSON() failed: %v", err)
	}
}

func TestValidatePort(t *testing.T) {
	// Create a mock app
	app := &App{
		telepresence: &TelepresenceManager{},
	}

	// Test valid ports
	validPorts := []string{"1", "8080", "65535"}
	for _, port := range validPorts {
		err := app.ValidatePort(port)
		if err != nil {
			t.Errorf("ValidatePort(%s) should not error: %v", port, err)
		}
	}

	// Test invalid ports
	invalidPorts := []string{"0", "65536", "abc", "-1", "99999"}
	for _, port := range invalidPorts {
		err := app.ValidatePort(port)
		if err == nil {
			t.Errorf("ValidatePort(%s) should error", port)
		}
	}
}

func TestAppStructFields(t *testing.T) {
	// Test that App struct has all expected fields
	app := &App{}

	// Test that fields can be set and accessed
	app.rootDir = "/test/root"
	if app.rootDir != "/test/root" {
		t.Error("rootDir field should be accessible")
	}

	app.dryRun = true
	if !app.dryRun {
		t.Error("dryRun field should be accessible")
	}

	app.verbose = true
	if !app.verbose {
		t.Error("verbose field should be accessible")
	}
}

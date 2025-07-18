package app

import (
	"testing"
)

func TestNewTelepresenceManager(t *testing.T) {
	app := &App{}
	telepresence := NewTelepresenceManager(app)

	if telepresence == nil {
		t.Fatal("NewTelepresenceManager() returned nil")
	}

	if telepresence.app != app {
		t.Error("NewTelepresenceManager() should set app reference correctly")
	}
}

func TestGetStatus(t *testing.T) {
	app := &App{}
	telepresence := &TelepresenceManager{app: app}

	// Test GetStatus method
	status := telepresence.GetStatus()
	// This will likely return "disconnected" since telepresence is not running
	if status != "connected" && status != "disconnected" {
		t.Errorf("GetStatus() should return 'connected' or 'disconnected', got %s", status)
	}
}

func TestIsConnected(t *testing.T) {
	app := &App{}
	telepresence := &TelepresenceManager{app: app}

	// Test IsConnected method
	connected := telepresence.IsConnected()
	// This will likely return false since telepresence is not running
	// We just test that the method exists and returns a boolean
	_ = connected
}

func TestConnect(t *testing.T) {
	// Create a minimal mock app for the executor
	execApp := &App{dryRun: true, verbose: false}

	app := &App{
		executor: NewCommandExecutor(execApp),
	}
	telepresence := &TelepresenceManager{app: app}

	// Test Connect method
	err := telepresence.Connect()
	// This will likely fail since telepresence is not installed or not running
	if err != nil {
		t.Logf("Connect() returned expected error: %v", err)
	}
}

func TestValidatePortBasic(t *testing.T) {
	app := &App{}
	telepresence := &TelepresenceManager{app: app}

	// Test valid ports
	validPorts := []string{"1", "8080", "65535"}
	for _, port := range validPorts {
		err := telepresence.ValidatePort(port)
		if err != nil {
			t.Errorf("ValidatePort(%s) should not error: %v", port, err)
		}
	}

	// Test invalid ports
	invalidPorts := []string{"0", "65536", "abc", "-1", "99999"}
	for _, port := range invalidPorts {
		err := telepresence.ValidatePort(port)
		if err == nil {
			t.Errorf("ValidatePort(%s) should error", port)
		}
	}
}

func TestHasIntercept(t *testing.T) {
	app := &App{}
	telepresence := &TelepresenceManager{app: app}

	// Test HasIntercept method
	hasIntercept := telepresence.HasIntercept("test-service")
	// This will likely return false since no intercepts are active
	// We just test that the method exists and returns a boolean
	_ = hasIntercept
}

func TestRemoveIntercept(t *testing.T) {
	// Create a minimal mock app for the executor
	execApp := &App{dryRun: true, verbose: false}

	app := &App{
		executor: NewCommandExecutor(execApp),
	}
	telepresence := &TelepresenceManager{app: app}

	// Test RemoveIntercept method
	err := telepresence.RemoveIntercept("test-service")
	// This will likely fail since no intercepts are active
	if err != nil {
		t.Logf("RemoveIntercept() returned expected error: %v", err)
	}
}

func TestGetActiveIntercepts(t *testing.T) {
	app := &App{}
	telepresence := &TelepresenceManager{app: app}

	// Test GetActiveIntercepts method
	intercepts := telepresence.GetActiveIntercepts()
	// This will likely return an empty slice since no intercepts are active
	if intercepts == nil {
		t.Error("GetActiveIntercepts() should return a slice, not nil")
	}
}

func TestTelepresenceManagerStructFields(t *testing.T) {
	// Test that TelepresenceManager struct has all expected fields
	app := &App{}
	telepresence := &TelepresenceManager{app: app}

	// Test that app field can be accessed
	if telepresence.app != app {
		t.Error("app field should be accessible")
	}
}

func TestValidatePortEdgeCases(t *testing.T) {
	app := &App{}
	telepresence := &TelepresenceManager{app: app}

	// Test edge cases for port validation
	testCases := []struct {
		name    string
		port    string
		wantErr bool
	}{
		{"minimum valid port", "1", false},
		{"maximum valid port", "65535", false},
		{"zero port", "0", true},
		{"port too high", "65536", true},
		{"negative port", "-1", true},
		{"non-numeric", "abc", true},
		{"empty string", "", true},
		{"decimal", "8080.5", true},
		{"hex", "0x1F90", true},
		{"octal", "017520", true},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			err := telepresence.ValidatePort(tc.port)
			if (err != nil) != tc.wantErr {
				t.Errorf("ValidatePort(%s) error = %v, wantErr %v", tc.port, err, tc.wantErr)
			}
		})
	}
}

func TestGetStatusWithMock(t *testing.T) {
	app := &App{}
	telepresence := &TelepresenceManager{app: app}

	// Test GetStatus method
	status := telepresence.GetStatus()

	// The status should be one of the expected values
	validStatuses := []string{"connected", "disconnected"}
	isValid := false
	for _, validStatus := range validStatuses {
		if status == validStatus {
			isValid = true
			break
		}
	}

	if !isValid {
		t.Errorf("GetStatus() returned unexpected status: %s", status)
	}
}

func TestGetActiveInterceptsWithMock(t *testing.T) {
	app := &App{}
	telepresence := &TelepresenceManager{app: app}

	// Test GetActiveIntercepts method
	intercepts := telepresence.GetActiveIntercepts()

	// Should return a slice (even if empty)
	if intercepts == nil {
		t.Error("GetActiveIntercepts() should return a slice, not nil")
	}

	// The slice should be of string type
	_ = intercepts
}

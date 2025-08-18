package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestNewSystemService(t *testing.T) {
	service := NewSystemService()
	
	if service == nil {
		t.Fatal("NewSystemService should not return nil")
	}
	
	// Should have default log directory set
	logDir := service.GetLogDirectory()
	expectedLogDir := filepath.Join(os.TempDir(), "openframe-deployment-logs")
	if logDir != expectedLogDir {
		t.Errorf("expected log directory %q, got %q", expectedLogDir, logDir)
	}
}

func TestNewSystemServiceWithOptions(t *testing.T) {
	customLogDir := "/tmp/custom-test-logs"
	service := NewSystemServiceWithOptions(customLogDir)
	
	if service == nil {
		t.Fatal("NewSystemServiceWithOptions should not return nil")
	}
	
	// Should have custom log directory set
	logDir := service.GetLogDirectory()
	if logDir != customLogDir {
		t.Errorf("expected log directory %q, got %q", customLogDir, logDir)
	}
}

func TestSystemService_Initialize(t *testing.T) {
	tests := []struct {
		name    string
		logDir  string
		wantErr bool
	}{
		{
			name:    "default temp directory",
			logDir:  "", // Use default
			wantErr: false,
		},
		{
			name:    "custom valid directory",
			logDir:  filepath.Join(os.TempDir(), "test-openframe-logs"),
			wantErr: false,
		},
		{
			name:    "nested directory creation",
			logDir:  filepath.Join(os.TempDir(), "test", "nested", "openframe-logs"),
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var service *SystemService
			if tt.logDir == "" {
				service = NewSystemService()
			} else {
				service = NewSystemServiceWithOptions(tt.logDir)
			}

			err := service.Initialize()
			if (err != nil) != tt.wantErr {
				t.Errorf("SystemService.Initialize() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr {
				// Verify directory was created
				logDir := service.GetLogDirectory()
				if _, err := os.Stat(logDir); os.IsNotExist(err) {
					t.Errorf("expected log directory %q to be created", logDir)
				}

				// Clean up test directory
				if tt.logDir != "" {
					os.RemoveAll(logDir)
				}
			}
		})
	}
}

func TestSystemService_GetLogDirectory(t *testing.T) {
	service := NewSystemService()
	
	logDir := service.GetLogDirectory()
	if logDir == "" {
		t.Error("GetLogDirectory should not return empty string")
	}
	
	expectedLogDir := filepath.Join(os.TempDir(), "openframe-deployment-logs")
	if logDir != expectedLogDir {
		t.Errorf("expected log directory %q, got %q", expectedLogDir, logDir)
	}
}

func TestSystemService_InitializeErrorHandling(t *testing.T) {
	// Test with invalid directory path (should fail gracefully)
	invalidPath := "/invalid/readonly/path/that/cannot/be/created"
	if os.Getuid() == 0 {
		// Skip this test when running as root since root can create directories anywhere
		t.Skip("Skipping permission test when running as root")
	}
	
	service := NewSystemServiceWithOptions(invalidPath)
	err := service.Initialize()
	
	if err == nil {
		t.Error("expected error when creating directory in invalid path")
	}
	
	// Error should contain meaningful message
	if err != nil && err.Error() == "" {
		t.Error("error message should not be empty")
	}
}

func TestSystemService_MultipleInitialize(t *testing.T) {
	// Test that multiple Initialize calls are safe
	logDir := filepath.Join(os.TempDir(), "test-multiple-init")
	service := NewSystemServiceWithOptions(logDir)
	
	// First initialize
	err1 := service.Initialize()
	if err1 != nil {
		t.Errorf("first Initialize() failed: %v", err1)
	}
	
	// Second initialize should also succeed (directory already exists)
	err2 := service.Initialize()
	if err2 != nil {
		t.Errorf("second Initialize() failed: %v", err2)
	}
	
	// Verify directory exists
	if _, err := os.Stat(logDir); os.IsNotExist(err) {
		t.Errorf("expected log directory %q to exist", logDir)
	}
	
	// Clean up
	os.RemoveAll(logDir)
}
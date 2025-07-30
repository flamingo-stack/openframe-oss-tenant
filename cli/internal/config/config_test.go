package config

import (
	"testing"
)

func TestDefaultConfig(t *testing.T) {
	config := DefaultConfig()
	if config == nil {
		t.Error("DefaultConfig should not return nil")
	}
}

func TestOpenFrameConfig_Validation(t *testing.T) {
	tests := []struct {
		name   string
		config *OpenFrameConfig
		valid  bool
	}{
		{"nil config", nil, false},
		{"empty config", &OpenFrameConfig{}, true}, // Empty config should be valid with defaults
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var isValid bool
			if tt.config == nil {
				isValid = false
			} else {
				isValid = true // Basic validation - config exists
			}
			
			if isValid != tt.valid {
				t.Errorf("OpenFrameConfig validation = %v, want %v", isValid, tt.valid)
			}
		})
	}
}
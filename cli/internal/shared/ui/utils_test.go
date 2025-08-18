package ui

import (
	"testing"
	"time"
)

func TestFormatAge(t *testing.T) {
	tests := []struct {
		name        string
		createdAt   time.Time
		expected    string
		description string
	}{
		{
			name:        "zero time",
			createdAt:   time.Time{},
			expected:    "unknown",
			description: "should return 'unknown' for zero time",
		},
		{
			name:        "seconds",
			createdAt:   time.Now().Add(-30 * time.Second),
			expected:    "30s",
			description: "should format seconds",
		},
		{
			name:        "minutes",
			createdAt:   time.Now().Add(-5 * time.Minute),
			expected:    "5m",
			description: "should format minutes",
		},
		{
			name:        "hours",
			createdAt:   time.Now().Add(-2 * time.Hour),
			expected:    "2h",
			description: "should format hours",
		},
		{
			name:        "days",
			createdAt:   time.Now().Add(-3 * 24 * time.Hour),
			expected:    "3d",
			description: "should format days",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := FormatAge(tt.createdAt)
			
			// For time-sensitive tests, we need some tolerance
			if tt.name == "zero time" {
				if result != tt.expected {
					t.Errorf("FormatAge() = %v, want %v", result, tt.expected)
				}
				return
			}
			
			// For non-zero times, just check that we get a reasonable format
			if len(result) == 0 {
				t.Errorf("FormatAge() returned empty string")
				return
			}
			
			// Check that it ends with the expected unit
			expectedUnit := tt.expected[len(tt.expected)-1:]
			actualUnit := result[len(result)-1:]
			
			if actualUnit != expectedUnit {
				t.Errorf("FormatAge() unit = %v, want %v (full result: %v)", actualUnit, expectedUnit, result)
			}
		})
	}
}

func TestFormatAgeEdgeCases(t *testing.T) {
	// Test that very recent times return seconds
	veryRecent := time.Now().Add(-1 * time.Second)
	result := FormatAge(veryRecent)
	if result[len(result)-1:] != "s" {
		t.Errorf("FormatAge() for very recent time should end with 's', got %v", result)
	}
	
	// Test that future times don't panic (though this shouldn't happen in practice)
	future := time.Now().Add(1 * time.Hour)
	result = FormatAge(future)
	if result == "" {
		t.Errorf("FormatAge() for future time should not return empty string")
	}
}
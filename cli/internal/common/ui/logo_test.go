package ui

import (
	"bytes"
	"io"
	"os"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestShowLogo_TestMode(t *testing.T) {
	// Save original state
	originalTestMode := TestMode
	defer func() { TestMode = originalTestMode }()
	
	// Enable test mode
	TestMode = true
	
	// Capture output
	output := captureOutput(func() {
		ShowLogo()
	})
	
	// In test mode, nothing should be printed
	assert.Empty(t, output)
}

func TestShowLogo_PlainMode(t *testing.T) {
	// Save original state
	originalTestMode := TestMode
	defer func() { TestMode = originalTestMode }()
	
	// Disable test mode and force plain logo
	TestMode = false
	os.Setenv("OPENFRAME_FANCY_LOGO", "false")
	defer os.Unsetenv("OPENFRAME_FANCY_LOGO")
	
	// Capture output
	output := captureOutput(func() {
		ShowLogo()
	})
	
	// Should contain logo elements
	assert.Contains(t, output, "OpenFrame Platform Bootstrapper")
	assert.Contains(t, output, "██████╗")
	assert.Contains(t, output, "================")
}

func TestShowLogo_FancyMode(t *testing.T) {
	// Save original state
	originalTestMode := TestMode
	defer func() { TestMode = originalTestMode }()
	
	// Disable test mode and force fancy logo
	TestMode = false
	os.Setenv("OPENFRAME_FANCY_LOGO", "true")
	defer os.Unsetenv("OPENFRAME_FANCY_LOGO")
	
	// Capture output - fancy mode uses pterm which might not work in tests
	// So we just verify the function doesn't panic
	assert.NotPanics(t, func() {
		ShowLogo()
	})
}

func TestIsTerminalEnvironment(t *testing.T) {
	result := isTerminalEnvironment()
	// The result depends on the environment, but function should not panic
	assert.IsType(t, false, result)
}

func TestCenterText(t *testing.T) {
	tests := []struct {
		name     string
		text     string
		width    int
		expected string
	}{
		{
			name:     "text shorter than width",
			text:     "hello",
			width:    10,
			expected: "  hello   ",
		},
		{
			name:     "text equal to width",
			text:     "hello",
			width:    5,
			expected: "hello",
		},
		{
			name:     "text longer than width",
			text:     "hello world",
			width:    5,
			expected: "hello world",
		},
		{
			name:     "empty text",
			text:     "",
			width:    5,
			expected: "     ",
		},
		{
			name:     "odd width with odd text length",
			text:     "abc",
			width:    7,
			expected: "  abc  ",
		},
		{
			name:     "even width with odd text length",
			text:     "abc",
			width:    8,
			expected: "  abc   ",
		},
		{
			name:     "width of 1",
			text:     "a",
			width:    1,
			expected: "a",
		},
		{
			name:     "zero width",
			text:     "hello",
			width:    0,
			expected: "hello",
		},
		{
			name:     "negative width",
			text:     "test",
			width:    -1,
			expected: "test",
		},
		{
			name:     "large width with short text",
			text:     "hi",
			width:    20,
			expected: "         hi         ",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := centerText(tt.text, tt.width)
			assert.Equal(t, tt.expected, result)
			
			// Verify the result length matches expected width (unless text is longer or width <= 0)
			if len(tt.text) <= tt.width && tt.width > 0 {
				assert.Equal(t, tt.width, len(result))
			}
			
			// Verify that non-empty text always produces non-empty result
			if tt.text != "" {
				assert.Contains(t, result, tt.text)
			}
		})
	}
}

func TestShowPlainLogo(t *testing.T) {
	// Capture output
	output := captureOutput(func() {
		showPlainLogo()
	})
	
	// Verify logo components are present
	assert.Contains(t, output, "OpenFrame Platform Bootstrapper")
	assert.Contains(t, output, "████")
	assert.Contains(t, output, "════")
	
	// Verify it contains multiple lines of the logo art
	lines := strings.Split(output, "\n")
	logoLines := 0
	for _, line := range lines {
		if strings.Contains(line, "██") {
			logoLines++
		}
	}
	assert.Greater(t, logoLines, 3, "Should contain multiple lines of logo art")
}

func TestShowFancyLogo(t *testing.T) {
	// Fancy logo uses pterm which might not work properly in test environment
	// Just verify it doesn't panic
	assert.NotPanics(t, func() {
		showFancyLogo()
	})
}

func TestLogoConstants(t *testing.T) {
	// Verify constants are defined correctly
	assert.Equal(t, "OpenFrame Platform Bootstrapper", logoTitle)
	assert.Equal(t, "=", borderChar)
	assert.Equal(t, 80, borderLength)
	assert.Equal(t, 3, logoLeftPadding)
	
	// Verify logo art is not empty
	assert.NotEmpty(t, logoArt)
	assert.Greater(t, len(logoArt), 5, "Logo should have multiple lines")
	
	// Verify each line contains Unicode characters and is not empty
	for i, line := range logoArt {
		assert.NotEmpty(t, line, "Logo line %d should not be empty", i)
		// Lines should contain Unicode characters (block or box drawing)
		hasUnicode := strings.ContainsAny(line, "█╔╗╚╝═║╬╣╠╦╩")
		assert.True(t, hasUnicode, "Logo line %d should contain Unicode box/block characters", i)
	}
}

func TestTestModeVariable(t *testing.T) {
	// Save original state
	originalTestMode := TestMode
	defer func() { TestMode = originalTestMode }()
	
	// Test setting and getting TestMode
	TestMode = true
	assert.True(t, TestMode)
	
	TestMode = false
	assert.False(t, TestMode)
}

// Helper function to capture stdout
func captureOutput(f func()) string {
	old := os.Stdout
	r, w, err := os.Pipe()
	if err != nil {
		return "" // Return empty string if pipe creation fails
	}
	os.Stdout = w

	f()

	w.Close()
	os.Stdout = old

	var buf bytes.Buffer
	_, err = io.Copy(&buf, r)
	if err != nil {
		return "" // Return empty string if copy fails
	}
	return buf.String()
}

// Benchmark tests for performance validation
func BenchmarkShowPlainLogo(b *testing.B) {
	originalTestMode := TestMode
	TestMode = false
	os.Setenv("OPENFRAME_FANCY_LOGO", "false")
	defer func() {
		TestMode = originalTestMode
		os.Unsetenv("OPENFRAME_FANCY_LOGO")
	}()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		showPlainLogo()
	}
}

func BenchmarkCenterText(b *testing.B) {
	tests := []struct{
		text string
		width int
	}{
		{"short", 10},
		{"medium length text", 30},
		{"very long text that exceeds the width significantly", 20},
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		test := tests[i%len(tests)]
		centerText(test.text, test.width)
	}
}

func TestShowLogo_EnvironmentVariables(t *testing.T) {
	// Save original state
	originalTestMode := TestMode
	defer func() { TestMode = originalTestMode }()
	
	TestMode = false
	
	tests := []struct {
		name    string
		envVar  string
		envVal  string
		cleanup func()
	}{
		{
			name:   "explicit fancy true",
			envVar: "OPENFRAME_FANCY_LOGO",
			envVal: "true",
			cleanup: func() { os.Unsetenv("OPENFRAME_FANCY_LOGO") },
		},
		{
			name:   "explicit fancy false",
			envVar: "OPENFRAME_FANCY_LOGO", 
			envVal: "false",
			cleanup: func() { os.Unsetenv("OPENFRAME_FANCY_LOGO") },
		},
		{
			name:   "no environment variable",
			envVar: "",
			envVal: "",
			cleanup: func() {},
		},
		{
			name:   "invalid environment value",
			envVar: "OPENFRAME_FANCY_LOGO",
			envVal: "invalid",
			cleanup: func() { os.Unsetenv("OPENFRAME_FANCY_LOGO") },
		},
		{
			name:   "empty environment value",
			envVar: "OPENFRAME_FANCY_LOGO",
			envVal: "",
			cleanup: func() { os.Unsetenv("OPENFRAME_FANCY_LOGO") },
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.envVar != "" {
				os.Setenv(tt.envVar, tt.envVal)
			}
			defer tt.cleanup()
			
			// Should not panic regardless of environment
			assert.NotPanics(t, func() {
				ShowLogo()
			})
		})
	}
}
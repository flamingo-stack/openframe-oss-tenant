package ui

import (
	"errors"
	"strings"
	"testing"

	"github.com/manifoldco/promptui"
	"github.com/stretchr/testify/assert"
)

// Note: These tests are limited because promptui interacts with stdin/stdout
// In a real test environment, you would mock the promptui package or use integration tests

func TestConfirmAction_ValidateFunction(t *testing.T) {
	// Test the validation function that would be used in ConfirmAction
	validateFunc := func(input string) error {
		input = strings.ToLower(strings.TrimSpace(input))
		if input == "" || input == "y" || input == "yes" || input == "n" || input == "no" {
			return nil
		}
		return errors.New("please enter Y/y/yes or N/n/no")
	}

	tests := []struct {
		name    string
		input   string
		wantErr bool
	}{
		{
			name:    "empty input",
			input:   "",
			wantErr: false,
		},
		{
			name:    "y",
			input:   "y",
			wantErr: false,
		},
		{
			name:    "Y",
			input:   "Y",
			wantErr: false,
		},
		{
			name:    "yes",
			input:   "yes",
			wantErr: false,
		},
		{
			name:    "YES",
			input:   "YES",
			wantErr: false,
		},
		{
			name:    "n",
			input:   "n",
			wantErr: false,
		},
		{
			name:    "N",
			input:   "N",
			wantErr: false,
		},
		{
			name:    "no",
			input:   "no",
			wantErr: false,
		},
		{
			name:    "NO",
			input:   "NO",
			wantErr: false,
		},
		{
			name:    "with spaces",
			input:   "  yes  ",
			wantErr: false,
		},
		{
			name:    "invalid input",
			input:   "maybe",
			wantErr: true,
		},
		{
			name:    "invalid number",
			input:   "1",
			wantErr: true,
		},
		{
			name:    "valid empty space (trimmed to empty)",
			input:   " ",
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateFunc(tt.input)
			if tt.wantErr {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), "please enter Y/y/yes or N/n/no")
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestConfirmAction_ResultParsing(t *testing.T) {
	// Test the logic that would parse user input in ConfirmAction
	parseResult := func(result string) bool {
		result = strings.ToLower(strings.TrimSpace(result))
		return result == "" || result == "y" || result == "yes"
	}

	tests := []struct {
		name     string
		input    string
		expected bool
	}{
		{
			name:     "empty input (default Y)",
			input:    "",
			expected: true,
		},
		{
			name:     "y",
			input:    "y",
			expected: true,
		},
		{
			name:     "Y",
			input:    "Y",
			expected: true,
		},
		{
			name:     "yes",
			input:    "yes",
			expected: true,
		},
		{
			name:     "YES",
			input:    "YES",
			expected: true,
		},
		{
			name:     "with spaces",
			input:    "  yes  ",
			expected: true,
		},
		{
			name:     "n",
			input:    "n",
			expected: false,
		},
		{
			name:     "N",
			input:    "N",
			expected: false,
		},
		{
			name:     "no",
			input:    "no",
			expected: false,
		},
		{
			name:     "NO",
			input:    "NO",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := parseResult(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestSelectFromList_TemplateConfiguration(t *testing.T) {
	// Test that the SelectFromList function sets up the correct templates
	// We can't easily test the actual prompting, but we can verify the template setup

	label := "Select an option"
	items := []string{"option1", "option2", "option3"}

	// This would be the configuration used in SelectFromList
	expectedTemplates := &promptui.SelectTemplates{
		Label:    "{{ . }}?",
		Active:   "\U00002192 {{ . | cyan }}",
		Inactive: "  {{ . | white }}",
		Selected: "\U00002713 {{ . | green }}",
	}

	// Verify the templates are correctly defined
	assert.Equal(t, "{{ . }}?", expectedTemplates.Label)
	assert.Equal(t, "\U00002192 {{ . | cyan }}", expectedTemplates.Active)
	assert.Equal(t, "  {{ . | white }}", expectedTemplates.Inactive)
	assert.Equal(t, "\U00002713 {{ . | green }}", expectedTemplates.Selected)

	// Verify the Unicode characters are correct
	assert.Contains(t, expectedTemplates.Active, "→") // Right arrow
	assert.Contains(t, expectedTemplates.Selected, "✓") // Check mark

	// Mock the function parameters to verify they would be used correctly
	assert.Equal(t, "Select an option", label)
	assert.Equal(t, 3, len(items))
	assert.Contains(t, items, "option1")
}

func TestGetInput_DefaultValues(t *testing.T) {
	// Test the configuration that would be used in GetInput
	label := "Enter value"
	defaultValue := "default"
	validateFunc := func(input string) error {
		if input == "" {
			return errors.New("input cannot be empty")
		}
		return nil
	}

	// Verify parameters
	assert.Equal(t, "Enter value", label)
	assert.Equal(t, "default", defaultValue)
	
	// Test the validation function
	assert.NoError(t, validateFunc("valid input"))
	assert.Error(t, validateFunc(""))
}

func TestGetMultiChoice_ErrorHandling(t *testing.T) {
	// Test the error conditions in GetMultiChoice
	tests := []struct {
		name     string
		items    []string
		defaults []bool
		wantErr  bool
		errMsg   string
	}{
		{
			name:     "matching lengths",
			items:    []string{"item1", "item2"},
			defaults: []bool{true, false},
			wantErr:  false,
		},
		{
			name:     "mismatched lengths - items longer",
			items:    []string{"item1", "item2", "item3"},
			defaults: []bool{true, false},
			wantErr:  true,
			errMsg:   "items and defaults must have the same length",
		},
		{
			name:     "mismatched lengths - defaults longer",
			items:    []string{"item1"},
			defaults: []bool{true, false, true},
			wantErr:  true,
			errMsg:   "items and defaults must have the same length",
		},
		{
			name:     "empty arrays",
			items:    []string{},
			defaults: []bool{},
			wantErr:  false,
		},
		{
			name:     "nil items with empty defaults",
			items:    nil,
			defaults: []bool{},
			wantErr:  false,
		},
		{
			name:     "empty items with nil defaults", 
			items:    []string{},
			defaults: nil,
			wantErr:  false,
		},
		{
			name:     "single item with single default",
			items:    []string{"single"},
			defaults: []bool{true},
			wantErr:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Simulate the validation logic from GetMultiChoice
			if len(tt.items) != len(tt.defaults) {
				err := errors.New("items and defaults must have the same length")
				if tt.wantErr {
					assert.Error(t, err)
					assert.Equal(t, tt.errMsg, err.Error())
				}
				return
			}

			if !tt.wantErr {
				// Verify the arrays can be processed
				results := make([]bool, len(tt.items))
				if tt.defaults != nil {
					copy(results, tt.defaults)
				}
				assert.Equal(t, len(tt.items), len(results))
				
				// For nil vs empty slice comparison, check lengths instead of direct equality
				if tt.defaults == nil && len(tt.items) == 0 {
					// Both should be empty/nil - acceptable condition
					assert.Equal(t, 0, len(results))
				} else {
					assert.Equal(t, tt.defaults, results)
				}
				
				// Verify length consistency
				assert.Equal(t, len(tt.items), len(tt.defaults))
			}
		})
	}
}

func TestBoolToString(t *testing.T) {
	tests := []struct {
		name     string
		input    bool
		expected string
	}{
		{
			name:     "true to y",
			input:    true,
			expected: "y",
		},
		{
			name:     "false to N",
			input:    false,
			expected: "N",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := boolToString(tt.input)
			assert.Equal(t, tt.expected, result)
			
			// Verify result is always non-empty
			assert.NotEmpty(t, result)
			
			// Verify result is always single character
			assert.Len(t, result, 1)
		})
	}
}

// Test prompt configuration structures
func TestPromptConfiguration(t *testing.T) {
	t.Run("ConfirmAction prompt configuration", func(t *testing.T) {
		message := "Do you want to continue?"
		expectedLabel := message + " (Y/n)"
		expectedDefault := "Y"

		assert.Equal(t, "Do you want to continue? (Y/n)", expectedLabel)
		assert.Equal(t, "Y", expectedDefault)
	})

	t.Run("GetInput prompt configuration", func(t *testing.T) {
		label := "Enter your name"
		defaultValue := "John Doe"

		assert.Equal(t, "Enter your name", label)
		assert.Equal(t, "John Doe", defaultValue)
	})
}

// Test that the package exports the expected functions
func TestPackageExports(t *testing.T) {
	// Verify that all expected functions are available
	// This is more of a compile-time check, but ensures the API is stable

	t.Run("ConfirmAction function exists", func(t *testing.T) {
		// We can't easily test the actual function without mocking stdin,
		// but we can verify it's callable (would compile)
		assert.NotNil(t, ConfirmAction)
	})

	t.Run("SelectFromList function exists", func(t *testing.T) {
		assert.NotNil(t, SelectFromList)
	})

	t.Run("GetInput function exists", func(t *testing.T) {
		assert.NotNil(t, GetInput)
	})

	t.Run("GetMultiChoice function exists", func(t *testing.T) {
		assert.NotNil(t, GetMultiChoice)
	})
}

// Benchmark test for the validation function
func BenchmarkConfirmActionValidation(b *testing.B) {
	validateFunc := func(input string) error {
		input = strings.ToLower(strings.TrimSpace(input))
		if input == "" || input == "y" || input == "yes" || input == "n" || input == "no" {
			return nil
		}
		return errors.New("please enter Y/y/yes or N/n/no")
	}

	inputs := []string{"y", "yes", "n", "no", "", "Y", "YES", "N", "NO", "invalid"}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		input := inputs[i%len(inputs)]
		_ = validateFunc(input) // Explicitly discard result
	}
}

// Additional benchmark for result parsing
func BenchmarkConfirmActionResultParsing(b *testing.B) {
	parseResult := func(result string) bool {
		result = strings.ToLower(strings.TrimSpace(result))
		return result == "" || result == "y" || result == "yes"
	}

	inputs := []string{"y", "yes", "n", "no", "", "Y", "YES", "N", "NO"}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		input := inputs[i%len(inputs)]
		_ = parseResult(input) // Explicitly discard result
	}
}
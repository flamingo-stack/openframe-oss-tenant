package selectors

import (
	"context"
	"testing"

	devMocks "github.com/flamingo/openframe/tests/mocks/dev"
	"github.com/flamingo/openframe/tests/testutil"
	"github.com/stretchr/testify/assert"
)

func TestNewNamespaceSelector(t *testing.T) {
	testutil.InitializeTestMode()
	mockClient := devMocks.NewMockKubernetesClient()
	selector := NewNamespaceSelector(mockClient)
	
	assert.NotNil(t, selector)
	assert.Equal(t, mockClient, selector.kubernetesClient)
}

func TestNamespaceSelector_ValidateNamespace(t *testing.T) {
	testutil.InitializeTestMode()
	mockClient := devMocks.NewMockKubernetesClient()
	selector := NewNamespaceSelector(mockClient)
	ctx := context.Background()

	tests := []struct {
		name        string
		namespace   string
		expectError bool
	}{
		{
			name:        "valid namespace",
			namespace:   "default",
			expectError: false,
		},
		{
			name:        "invalid namespace",
			namespace:   "non-existent",
			expectError: true,
		},
		{
			name:        "empty namespace",
			namespace:   "",
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := selector.ValidateNamespace(ctx, tt.namespace)
			
			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestNamespaceSelector_GetAvailableNamespaces(t *testing.T) {
	testutil.InitializeTestMode()
	mockClient := devMocks.NewMockKubernetesClient()
	selector := NewNamespaceSelector(mockClient)
	ctx := context.Background()

	tests := []struct {
		name           string
		setupMock      func(*devMocks.MockKubernetesClient)
		expectedCount  int
		expectError    bool
	}{
		{
			name: "normal case with filtering",
			setupMock: func(mock *devMocks.MockKubernetesClient) {
				// Default mock has kube-system which should be filtered
			},
			expectedCount: 4, // default, production, staging, development (kube-system filtered)
			expectError:   false,
		},
		{
			name: "client fails",
			setupMock: func(mock *devMocks.MockKubernetesClient) {
				mock.SetShouldFailNamespaces(true)
			},
			expectedCount: 0,
			expectError:   true,
		},
		{
			name: "empty namespaces",
			setupMock: func(mock *devMocks.MockKubernetesClient) {
				mock.ClearNamespaces()
			},
			expectedCount: 0,
			expectError:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Reset mock
			mockClient.Reset()
			
			// Setup mock
			if tt.setupMock != nil {
				tt.setupMock(mockClient)
			}

			namespaces, err := selector.GetAvailableNamespaces(ctx)

			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Len(t, namespaces, tt.expectedCount)
			}
		})
	}
}

func TestNamespaceSelector_filterNamespaces(t *testing.T) {
	testutil.InitializeTestMode()
	mockClient := devMocks.NewMockKubernetesClient()
	selector := NewNamespaceSelector(mockClient)

	tests := []struct {
		name       string
		input      []string
		expected   []string
	}{
		{
			name: "filters system namespaces",
			input: []string{
				"default", 
				"kube-system", 
				"production", 
				"kube-public", 
				"development",
				"istio-system",
			},
			expected: []string{"default", "development", "production"}, // sorted
		},
		{
			name:     "empty input",
			input:    []string{},
			expected: []string{},
		},
		{
			name: "all system namespaces",
			input: []string{
				"kube-system", 
				"kube-public", 
				"istio-system",
			},
			expected: []string{},
		},
		{
			name: "no system namespaces",
			input: []string{
				"production", 
				"staging", 
				"development",
			},
			expected: []string{"development", "production", "staging"}, // sorted
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := selector.filterNamespaces(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestNamespaceSelector_ShowNamespaceInfo(t *testing.T) {
	testutil.InitializeTestMode()
	mockClient := devMocks.NewMockKubernetesClient()
	selector := NewNamespaceSelector(mockClient)

	// This test mainly ensures the function doesn't panic
	// Since it outputs to stdout, we can't easily test the content
	assert.NotPanics(t, func() {
		selector.ShowNamespaceInfo("test-namespace")
	})
}
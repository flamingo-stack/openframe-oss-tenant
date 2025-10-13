package ui

import (
	"context"
	"testing"

	"github.com/flamingo-stack/openframe/openframe/internal/dev/services/intercept"
	devMocks "github.com/flamingo-stack/openframe/openframe/tests/mocks/dev"
	"github.com/flamingo-stack/openframe/openframe/tests/testutil"
	"github.com/stretchr/testify/assert"
)

func TestNewInterceptUI(t *testing.T) {
	testutil.InitializeTestMode()
	client := devMocks.NewMockKubernetesClient()

	ui := NewInterceptUI(client, client)

	assert.NotNil(t, ui)
	assert.Equal(t, client, ui.kubernetesClient)
	assert.Equal(t, client, ui.serviceClient)
}

func TestInterceptUI_findServiceInCluster(t *testing.T) {
	testutil.InitializeTestMode()
	ctx := context.Background()
	client := devMocks.NewMockKubernetesClient()
	ui := NewInterceptUI(client, client)

	tests := []struct {
		name        string
		serviceName string
		expected    ServiceInfo
	}{
		{
			name:        "existing service in default namespace",
			serviceName: "my-api",
			expected: ServiceInfo{
				Name:      "my-api",
				Namespace: "default",
				Ports:     []intercept.ServicePort{{Port: 8080, Name: "http", TargetPort: "8080", Protocol: "TCP"}},
				Found:     true,
			},
		},
		{
			name:        "existing service in production namespace",
			serviceName: "api-service",
			expected: ServiceInfo{
				Name:      "api-service",
				Namespace: "production",
				Ports: []intercept.ServicePort{
					{Port: 8080, Name: "http", TargetPort: "8080", Protocol: "TCP"},
					{Port: 9090, Name: "metrics", TargetPort: "9090", Protocol: "TCP"},
				},
				Found: true,
			},
		},
		{
			name:        "non-existent service",
			serviceName: "non-existent",
			expected: ServiceInfo{
				Name:  "non-existent",
				Found: false,
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := ui.findServiceInCluster(ctx, tt.serviceName)

			assert.NoError(t, err)
			assert.Equal(t, tt.expected.Name, result.Name)
			assert.Equal(t, tt.expected.Found, result.Found)

			if tt.expected.Found {
				assert.Equal(t, tt.expected.Namespace, result.Namespace)
				assert.Equal(t, tt.expected.Ports, result.Ports)
			}
		})
	}
}

func TestInterceptUI_validatePort(t *testing.T) {
	testutil.InitializeTestMode()
	client := devMocks.NewMockKubernetesClient()
	ui := NewInterceptUI(client, client)

	tests := []struct {
		name    string
		input   string
		wantErr bool
	}{
		{"valid port", "8080", false},
		{"valid port minimum", "1", false},
		{"valid port maximum", "65535", false},
		{"empty input", "", true},
		{"non-numeric", "abc", true},
		{"port too low", "0", true},
		{"port too high", "65536", true},
		{"negative port", "-1", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ui.validatePort(tt.input)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

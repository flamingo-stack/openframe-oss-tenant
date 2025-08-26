package ui

import (
	"testing"

	devMocks "github.com/flamingo/openframe/tests/mocks/dev"
	"github.com/flamingo/openframe/tests/testutil"
	"github.com/stretchr/testify/assert"
)

func TestNewService(t *testing.T) {
	testutil.InitializeTestMode()
	mockClient := devMocks.NewMockKubernetesClient()
	
	service := NewService(mockClient, mockClient)
	
	assert.NotNil(t, service)
	assert.NotNil(t, service.namespaceSelector)
	assert.NotNil(t, service.serviceSelector)
	assert.NotNil(t, service.interceptWizard)
	assert.NotNil(t, service.interceptDisplay)
}

func TestService_GetNamespaceSelector(t *testing.T) {
	testutil.InitializeTestMode()
	mockClient := devMocks.NewMockKubernetesClient()
	service := NewService(mockClient, mockClient)
	
	selector := service.GetNamespaceSelector()
	assert.NotNil(t, selector)
	assert.Equal(t, service.namespaceSelector, selector)
}

func TestService_GetServiceSelector(t *testing.T) {
	testutil.InitializeTestMode()
	mockClient := devMocks.NewMockKubernetesClient()
	service := NewService(mockClient, mockClient)
	
	selector := service.GetServiceSelector()
	assert.NotNil(t, selector)
	assert.Equal(t, service.serviceSelector, selector)
}

func TestService_GetInterceptWizard(t *testing.T) {
	testutil.InitializeTestMode()
	mockClient := devMocks.NewMockKubernetesClient()
	service := NewService(mockClient, mockClient)
	
	wizard := service.GetInterceptWizard()
	assert.NotNil(t, wizard)
	assert.Equal(t, service.interceptWizard, wizard)
}

func TestService_GetInterceptDisplay(t *testing.T) {
	testutil.InitializeTestMode()
	mockClient := devMocks.NewMockKubernetesClient()
	service := NewService(mockClient, mockClient)
	
	display := service.GetInterceptDisplay()
	assert.NotNil(t, display)
	assert.Equal(t, service.interceptDisplay, display)
}

func TestService_ShowInterceptStatus(t *testing.T) {
	testutil.InitializeTestMode()
	mockClient := devMocks.NewMockKubernetesClient()
	service := NewService(mockClient, mockClient)
	
	// This test mainly ensures the function doesn't panic
	// Since it delegates to the wizard, we're testing the integration
	assert.NotPanics(t, func() {
		service.ShowInterceptStatus("test-service", "default", 8080)
	})
}

func TestService_ShowInterceptHelp(t *testing.T) {
	testutil.InitializeTestMode()
	mockClient := devMocks.NewMockKubernetesClient()
	service := NewService(mockClient, mockClient)
	
	// This test mainly ensures the function doesn't panic
	// Since it delegates to the wizard, we're testing the integration
	assert.NotPanics(t, func() {
		service.ShowInterceptHelp("test-service", "default", 8080)
	})
}

func TestService_ComponentIntegration(t *testing.T) {
	testutil.InitializeTestMode()
	mockClient := devMocks.NewMockKubernetesClient()
	service := NewService(mockClient, mockClient)
	
	// Test that all components are properly initialized and connected
	assert.NotNil(t, service.GetNamespaceSelector())
	assert.NotNil(t, service.GetServiceSelector())
	assert.NotNil(t, service.GetInterceptWizard())
	assert.NotNil(t, service.GetInterceptDisplay())
	
	// Verify that the wizard has the correct selectors
	wizard := service.GetInterceptWizard()
	assert.NotNil(t, wizard)
	
	// We can't directly access private fields, but we can verify that
	// the service properly coordinates all components
}
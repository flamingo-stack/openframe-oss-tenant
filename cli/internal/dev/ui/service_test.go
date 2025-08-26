package ui

import (
	"testing"

	devMocks "github.com/flamingo/openframe/tests/mocks/dev"
	"github.com/flamingo/openframe/tests/testutil"
	"github.com/stretchr/testify/assert"
)

func TestNewService(t *testing.T) {
	testutil.InitializeTestMode()
	client := devMocks.NewMockKubernetesClient()
	
	service := NewService(client, client)
	
	assert.NotNil(t, service)
	assert.NotNil(t, service.interceptUI)
	assert.Equal(t, client, service.interceptUI.kubernetesClient)
	assert.Equal(t, client, service.interceptUI.serviceClient)
}

func TestService_GetInterceptUI(t *testing.T) {
	testutil.InitializeTestMode()
	client := devMocks.NewMockKubernetesClient()
	service := NewService(client, client)
	
	interceptUI := service.GetInterceptUI()
	
	assert.NotNil(t, interceptUI)
	assert.Equal(t, service.interceptUI, interceptUI)
}

func TestInterceptSetup_Structure(t *testing.T) {
	setup := &InterceptSetup{
		ServiceName: "test-service",
		Namespace:   "default",
		LocalPort:   8080,
		RemotePort:  8080,
	}
	
	assert.Equal(t, "test-service", setup.ServiceName)
	assert.Equal(t, "default", setup.Namespace)
	assert.Equal(t, 8080, setup.LocalPort)
	assert.Equal(t, 8080, setup.RemotePort)
}
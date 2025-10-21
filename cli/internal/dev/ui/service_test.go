package ui

import (
	"testing"

	"github.com/flamingo-stack/openframe/openframe/internal/dev/services/intercept"
	devMocks "github.com/flamingo-stack/openframe/openframe/tests/mocks/dev"
	"github.com/flamingo-stack/openframe/openframe/tests/testutil"
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
	kubernetesPort := &intercept.ServicePort{
		Name:     "http",
		Port:     8080,
		Protocol: "TCP",
	}

	setup := &InterceptSetup{
		ServiceName:    "test-service",
		Namespace:      "default",
		LocalPort:      8080,
		KubernetesPort: kubernetesPort,
	}

	assert.Equal(t, "test-service", setup.ServiceName)
	assert.Equal(t, "default", setup.Namespace)
	assert.Equal(t, 8080, setup.LocalPort)
	assert.Equal(t, kubernetesPort, setup.KubernetesPort)
	assert.Equal(t, "http", setup.KubernetesPort.Name)
	assert.Equal(t, int32(8080), setup.KubernetesPort.Port)
}

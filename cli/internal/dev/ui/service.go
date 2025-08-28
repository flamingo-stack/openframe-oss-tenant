package ui

import (
	"context"
	
	"github.com/flamingo/openframe/internal/dev/services/intercept"
)

// Service provides a unified interface for dev UI interactions
type Service struct {
	interceptUI *InterceptUI
}

// NewService creates a new dev UI service
func NewService(kubernetesClient intercept.KubernetesClient, serviceClient intercept.ServiceClient) *Service {
	return &Service{
		interceptUI: NewInterceptUI(kubernetesClient, serviceClient),
	}
}

// GetInterceptUI returns the intercept UI handler
func (s *Service) GetInterceptUI() *InterceptUI {
	return s.interceptUI
}

// InteractiveInterceptSetup provides interactive intercept setup
func (s *Service) InteractiveInterceptSetup(ctx context.Context) (*InterceptSetup, error) {
	// Get service from user
	service, err := s.interceptUI.PromptForService(ctx)
	if err != nil {
		return nil, err
	}

	// Get Kubernetes port from user (which port on the service to intercept)
	kubernetesPort, err := s.interceptUI.PromptForKubernetesPort(service.Ports)
	if err != nil {
		return nil, err
	}

	// Get local port from user (where to forward traffic locally)
	localPort, err := s.interceptUI.PromptForLocalPort(kubernetesPort)
	if err != nil {
		return nil, err
	}

	return &InterceptSetup{
		ServiceName:     service.Name,
		Namespace:       service.Namespace,
		LocalPort:       localPort,
		KubernetesPort:  kubernetesPort,
	}, nil
}

// InterceptSetup contains the intercept configuration
type InterceptSetup struct {
	ServiceName     string
	Namespace       string
	LocalPort       int
	KubernetesPort  *intercept.ServicePort
}
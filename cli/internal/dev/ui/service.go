package ui

import (
	"context"
	
	"github.com/flamingo/openframe/internal/dev/interfaces"
	"github.com/flamingo/openframe/internal/dev/ui/display"
	"github.com/flamingo/openframe/internal/dev/ui/intercept"
	"github.com/flamingo/openframe/internal/dev/ui/selectors"
)

// Re-export types for convenience
type InterceptConfig = intercept.InterceptConfig

// Service provides a unified interface to all dev UI components
// This follows the same pattern as cluster UI service
type Service struct {
	namespaceSelector *selectors.NamespaceSelector
	serviceSelector   *selectors.ServiceSelector
	interceptWizard   *intercept.InterceptWizard
	interceptDisplay  *display.InterceptDisplay
}

// NewService creates a new dev UI service with all components
func NewService(
	kubernetesClient interfaces.KubernetesClient,
	serviceClient interfaces.ServiceClient,
) *Service {
	namespaceSelector := selectors.NewNamespaceSelector(kubernetesClient)
	serviceSelector := selectors.NewServiceSelector(serviceClient)
	interceptWizard := intercept.NewInterceptWizard(namespaceSelector, serviceSelector)
	interceptDisplay := display.NewInterceptDisplay()
	
	return &Service{
		namespaceSelector: namespaceSelector,
		serviceSelector:   serviceSelector,
		interceptWizard:   interceptWizard,
		interceptDisplay:  interceptDisplay,
	}
}

// GetNamespaceSelector returns the namespace selector component
func (s *Service) GetNamespaceSelector() *selectors.NamespaceSelector {
	return s.namespaceSelector
}

// GetServiceSelector returns the service selector component
func (s *Service) GetServiceSelector() *selectors.ServiceSelector {
	return s.serviceSelector
}

// GetInterceptWizard returns the intercept wizard component
func (s *Service) GetInterceptWizard() *intercept.InterceptWizard {
	return s.interceptWizard
}

// GetInterceptDisplay returns the intercept display component
func (s *Service) GetInterceptDisplay() *display.InterceptDisplay {
	return s.interceptDisplay
}

// RunInteractiveInterceptSetup provides a complete guided intercept setup
func (s *Service) RunInteractiveInterceptSetup(ctx context.Context) (*intercept.InterceptConfig, error) {
	return s.interceptWizard.RunInteractiveSetup(ctx)
}

// SelectServiceInNamespace provides service selection within a specific namespace
func (s *Service) SelectServiceInNamespace(ctx context.Context, namespace string, args []string) (string, *selectors.ServiceInfo, error) {
	return s.serviceSelector.SelectService(ctx, namespace, args)
}

// SelectNamespace provides namespace selection
func (s *Service) SelectNamespace(ctx context.Context, args []string, defaultNamespace string) (string, error) {
	return s.namespaceSelector.SelectNamespace(ctx, args, defaultNamespace)
}

// ShowInterceptStatus displays the current intercept status
func (s *Service) ShowInterceptStatus(serviceName string, namespace string, port int) {
	s.interceptWizard.ShowInterceptStatus(serviceName, namespace, port)
}

// ShowInterceptHelp displays intercept usage help
func (s *Service) ShowInterceptHelp(serviceName string, namespace string, port int) {
	s.interceptWizard.ShowInterceptHelp(serviceName, namespace, port)
}
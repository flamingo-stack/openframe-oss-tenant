package ui

import (
	"context"
	"fmt"
	"strings"

	"github.com/flamingo-stack/openframe/openframe/internal/dev/models"
	"github.com/flamingo-stack/openframe/openframe/internal/dev/providers/kubectl"
	"github.com/flamingo-stack/openframe/openframe/internal/dev/services/intercept"
	"github.com/flamingo-stack/openframe/openframe/internal/shared/executor"
	"github.com/pterm/pterm"
)

// Service provides a unified interface for dev UI interactions
type Service struct {
	interceptUI *InterceptUI
	executor    executor.CommandExecutor
	verbose     bool
}

// NewService creates a new dev UI service
func NewService(kubernetesClient intercept.KubernetesClient, serviceClient intercept.ServiceClient) *Service {
	return &Service{
		interceptUI: NewInterceptUI(kubernetesClient, serviceClient),
	}
}

// NewServiceWithExecutor creates a new dev UI service with executor for interactive workflows
func NewServiceWithExecutor(executor executor.CommandExecutor, verbose bool) *Service {
	return &Service{
		executor: executor,
		verbose:  verbose,
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
		ServiceName:    service.Name,
		Namespace:      service.Namespace,
		LocalPort:      localPort,
		KubernetesPort: kubernetesPort,
	}, nil
}

// RunFullInteractiveIntercept runs the complete interactive intercept workflow
func (s *Service) RunFullInteractiveIntercept(ctx context.Context) error {
	if s.verbose {
		pterm.Info.Println("Starting interactive intercept workflow...")
	}

	// Step 1: Check kubectl context availability
	if s.verbose {
		pterm.Info.Println("Checking kubectl contexts...")
	}
	if err := s.checkKubectlContexts(ctx); err != nil {
		return err
	}

	// Step 2: Create kubectl provider and check connection
	if s.verbose {
		pterm.Info.Println("Creating kubectl provider...")
	}
	kubectlProvider := kubectl.NewProvider(s.executor, s.verbose)

	if s.verbose {
		pterm.Info.Println("Checking cluster connection...")
	}
	if err := kubectlProvider.CheckConnection(ctx); err != nil {
		return fmt.Errorf("kubectl is not connected to cluster: %w", err)
	}

	// Step 3: Run interactive setup
	if s.verbose {
		pterm.Info.Println("Setting up interactive UI...")
	}
	s.interceptUI = NewInterceptUI(kubectlProvider, kubectlProvider)

	if s.verbose {
		pterm.Info.Println("Starting interactive setup...")
	}
	setup, err := s.InteractiveInterceptSetup(ctx)
	if err != nil {
		return err
	}

	// Step 4: Convert to flags and start intercept
	flags := s.convertSetupToFlags(setup)
	interceptService := intercept.NewService(s.executor, s.verbose)

	return interceptService.StartIntercept(setup.ServiceName, flags)
}

// checkKubectlContexts verifies kubectl has available contexts
func (s *Service) checkKubectlContexts(ctx context.Context) error {
	// Check if kubectl is available
	result, err := s.executor.Execute(ctx, "kubectl", "config", "current-context")
	if err != nil {
		// Check if kubectl command is not found
		errMsg := err.Error()
		if strings.Contains(errMsg, "executable file not found") {
			pterm.Error.Println("kubectl not found. Please install kubectl to use intercept functionality.")
			return fmt.Errorf("kubectl not available")
		}

		// Check if no context is set
		if strings.Contains(errMsg, "current-context is not set") || strings.Contains(errMsg, "no current context") {
			pterm.Error.Println("No active kubectl context found. Please set a context with: kubectl config use-context <context-name>")
			return fmt.Errorf("no active kubectl context")
		}

		return fmt.Errorf("failed to get kubectl context: %w", err)
	}

	currentContext := strings.TrimSpace(result.Stdout)
	if currentContext == "" {
		pterm.Error.Println("No active kubectl context found. Please set a context with: kubectl config use-context <context-name>")
		return fmt.Errorf("no active kubectl context")
	}

	if s.verbose {
		pterm.Info.Printf("Using kubectl context: %s\n", currentContext)
	}

	return nil
}

// convertSetupToFlags converts UI setup to intercept flags
func (s *Service) convertSetupToFlags(setup *InterceptSetup) *models.InterceptFlags {
	remotePortName := setup.KubernetesPort.Name
	if remotePortName == "" {
		remotePortName = fmt.Sprintf("%d", setup.KubernetesPort.Port)
	}

	return &models.InterceptFlags{
		Port:           setup.LocalPort,
		Namespace:      setup.Namespace,
		RemotePortName: remotePortName,
	}
}

// InterceptSetup contains the intercept configuration
type InterceptSetup struct {
	ServiceName    string
	Namespace      string
	LocalPort      int
	KubernetesPort *intercept.ServicePort
}

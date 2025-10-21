package intercept

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/flamingo-stack/openframe/openframe/internal/dev/models"
	"github.com/flamingo-stack/openframe/openframe/internal/shared/executor"
	"github.com/pterm/pterm"
)

// Service provides Telepresence intercept functionality
// Implements the bash functions from develop.sh with enhanced Go capabilities
type Service struct {
	executor          executor.CommandExecutor
	verbose           bool
	currentService    string
	currentNamespace  string
	originalNamespace string
	signalChannel     chan os.Signal
	isIntercepting    bool
}

// TelepresenceStatus represents the JSON output from telepresence status
type TelepresenceStatus struct {
	UserDaemon struct {
		Namespace string `json:"namespace"`
	} `json:"user_daemon"`
}

// NewService creates a new intercept service
func NewService(exec executor.CommandExecutor, verbose bool) *Service {
	return &Service{
		executor:       exec,
		verbose:        verbose,
		signalChannel:  make(chan os.Signal, 1),
		isIntercepting: false,
	}
}

// StartIntercept starts a Telepresence intercept based on develop.sh intercept_app function
func (s *Service) StartIntercept(serviceName string, flags *models.InterceptFlags) error {
	// Input validation
	if err := s.validateInputs(serviceName, flags); err != nil {
		return fmt.Errorf("validation failed: %w", err)
	}

	ctx := context.Background()

	// Check if kubectl context is available
	if err := s.checkKubernetesContext(); err != nil {
		return err
	}

	pterm.Info.Println("Setting up intercept...")

	// Set up cleanup handler
	s.setupCleanupHandler(serviceName)

	// Get current namespace and switch if needed (like bash script)
	if err := s.ensureCorrectNamespace(ctx, flags.Namespace); err != nil {
		return fmt.Errorf("failed to ensure correct namespace: %w", err)
	}

	s.currentService = serviceName
	s.currentNamespace = flags.Namespace

	// Wait a moment for connection to stabilize
	time.Sleep(1 * time.Second)

	// Start the intercept
	if err := s.createIntercept(ctx, serviceName, flags); err != nil {
		return err
	}

	// Show success message and instructions
	s.showInterceptInstructions(serviceName, flags)

	// Mark as intercepting
	s.isIntercepting = true

	// Keep the intercept running until interrupted
	return s.waitForInterrupt()
}

// validateInputs validates the service name and flags
func (s *Service) validateInputs(serviceName string, flags *models.InterceptFlags) error {
	if strings.TrimSpace(serviceName) == "" {
		return errors.New("service name cannot be empty")
	}

	if flags == nil {
		return errors.New("flags cannot be nil")
	}

	if flags.Port <= 0 || flags.Port > 65535 {
		return fmt.Errorf("invalid port: %d (must be between 1-65535)", flags.Port)
	}

	if flags.Namespace == "" {
		flags.Namespace = "default"
	}

	// Validate env file exists if specified
	if flags.EnvFile != "" {
		if _, err := os.Stat(flags.EnvFile); os.IsNotExist(err) {
			return fmt.Errorf("environment file not found: %s", flags.EnvFile)
		}
	}

	// Validate header format
	for _, header := range flags.Header {
		if !strings.Contains(header, "=") {
			return fmt.Errorf("invalid header format: %s (expected key=value)", header)
		}
	}

	return nil
}

// checkKubernetesContext verifies that kubectl has an available context
func (s *Service) checkKubernetesContext() error {
	ctx := context.Background()

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

	// Verify we can connect to the cluster
	_, err = s.executor.Execute(ctx, "kubectl", "cluster-info")
	if err != nil {
		pterm.Error.Printf("Cannot connect to Kubernetes cluster '%s'. Please check your cluster connection.\n", currentContext)
		return fmt.Errorf("cluster connection failed: %w", err)
	}

	return nil
}

// showInterceptInstructions displays helpful information about the active intercept
func (s *Service) showInterceptInstructions(serviceName string, flags *models.InterceptFlags) {
	pterm.Success.Printf("Intercepting %s. Press Ctrl+C to stop...\n", serviceName)
}

// waitForInterrupt keeps the process alive until interrupted
func (s *Service) waitForInterrupt() error {
	// Wait for signal to be received
	select {
	case <-s.signalChannel:
		// Signal received, cleanup will be handled by the signal handler
		return nil
	}
}

// StopIntercept manually stops an intercept (alternative to Ctrl+C)
func (s *Service) StopIntercept(serviceName string) error {
	if !s.isIntercepting {
		return fmt.Errorf("no active intercept for service: %s", serviceName)
	}

	if s.currentService != serviceName {
		return fmt.Errorf("active intercept is for service %s, not %s", s.currentService, serviceName)
	}

	s.cleanup()
	return nil
}

// IsIntercepting returns whether an intercept is currently active
func (s *Service) IsIntercepting() bool {
	return s.isIntercepting
}

// GetCurrentService returns the name of the currently intercepted service
func (s *Service) GetCurrentService() string {
	return s.currentService
}

// GetCurrentNamespace returns the current namespace
func (s *Service) GetCurrentNamespace() string {
	return s.currentNamespace
}

// GetOriginalNamespace returns the original namespace before intercept
func (s *Service) GetOriginalNamespace() string {
	return s.originalNamespace
}

// ensureCorrectNamespace ensures telepresence is connected to the correct namespace (like bash script)
func (s *Service) ensureCorrectNamespace(ctx context.Context, targetNamespace string) error {
	// Create a context with timeout to avoid hanging
	timeoutCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	// Get current namespace
	currentNamespace, err := s.getCurrentNamespace(timeoutCtx)
	if err != nil {
		if s.verbose {
			pterm.Warning.Printf("Could not get current namespace, assuming default: %v\n", err)
		}
		currentNamespace = "default"
	}

	s.originalNamespace = currentNamespace

	if s.verbose {
		pterm.Info.Printf("Current namespace: %s, target: %s\n", currentNamespace, targetNamespace)
	}

	if currentNamespace != targetNamespace {
		if s.verbose {
			pterm.Info.Printf("Switching Telepresence from %s to %s\n", currentNamespace, targetNamespace)
		}

		// Quit and reconnect to new namespace (like bash script)
		s.executor.Execute(timeoutCtx, "telepresence", "quit")

		_, err = s.executor.Execute(timeoutCtx, "telepresence", "connect", "--namespace", targetNamespace)
		if err != nil {
			return fmt.Errorf("failed to connect to namespace %s: %w", targetNamespace, err)
		}
	} else {
		if s.verbose {
			pterm.Info.Printf("Telepresence already connected to %s\n", targetNamespace)
		}
	}

	// Sleep briefly like bash script
	time.Sleep(1 * time.Second)

	return nil
}

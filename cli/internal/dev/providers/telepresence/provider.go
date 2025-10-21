package telepresence

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/flamingo-stack/openframe/openframe/internal/dev/models"
	"github.com/flamingo-stack/openframe/openframe/internal/shared/executor"
	"github.com/pterm/pterm"
)

// Provider handles Telepresence intercept operations
type Provider struct {
	executor executor.CommandExecutor
	verbose  bool
}

// NewProvider creates a new intercept provider
func NewProvider(exec executor.CommandExecutor, verbose bool) *Provider {
	return &Provider{
		executor: exec,
		verbose:  verbose,
	}
}

// SetupIntercept sets up a Telepresence intercept for the specified service
func (p *Provider) SetupIntercept(serviceName string, flags *models.InterceptFlags) error {
	ctx := context.Background()

	// Step 1: Check if telepresence is installed
	if err := p.checkTelepresenceInstallation(ctx); err != nil {
		return err
	}

	// Step 2: Connect to the cluster
	if err := p.connectToCluster(ctx); err != nil {
		return err
	}

	// Step 3: Set up the intercept
	if err := p.createIntercept(ctx, serviceName, flags); err != nil {
		return err
	}

	// Step 4: Show intercept status
	return p.showInterceptStatus(ctx, serviceName)
}

// TeardownIntercept removes a Telepresence intercept
func (p *Provider) TeardownIntercept(serviceName string, namespace string) error {
	ctx := context.Background()

	pterm.Info.Printf("Removing intercept for service: %s\n", serviceName)

	// Remove the specific intercept
	_, err := p.executor.Execute(ctx, "telepresence", "unintercept", serviceName)
	if err != nil {
		pterm.Warning.Printf("Failed to remove intercept: %v\n", err)
	}

	return nil
}

// Disconnect disconnects from Telepresence
func (p *Provider) Disconnect() error {
	ctx := context.Background()

	pterm.Info.Println("Disconnecting from Telepresence...")

	_, err := p.executor.Execute(ctx, "telepresence", "quit")
	if err != nil {
		return fmt.Errorf("failed to disconnect from Telepresence: %w", err)
	}

	pterm.Success.Println("Disconnected from Telepresence")
	return nil
}

// checkTelepresenceInstallation verifies that Telepresence is installed
func (p *Provider) checkTelepresenceInstallation(ctx context.Context) error {
	if p.verbose {
		pterm.Info.Println("Checking Telepresence installation...")
	}

	result, err := p.executor.Execute(ctx, "telepresence", "version")
	if err != nil {
		return fmt.Errorf("Telepresence is not installed or not in PATH. Please install from: https://www.telepresence.io/docs/latest/install/")
	}

	if p.verbose {
		pterm.Success.Printf("Telepresence found: %s\n", strings.TrimSpace(result.Stdout))
	}

	return nil
}

// connectToCluster establishes connection to the Kubernetes cluster
func (p *Provider) connectToCluster(ctx context.Context) error {
	spinner, _ := pterm.DefaultSpinner.Start("Connecting to Kubernetes cluster via Telepresence...")

	result, err := p.executor.Execute(ctx, "telepresence", "connect")
	if err != nil {
		spinner.Fail("Failed to connect to cluster")
		return fmt.Errorf("failed to connect to Kubernetes cluster: %w", err)
	}

	spinner.Success("Connected to Kubernetes cluster")

	if p.verbose && result.Stdout != "" {
		pterm.Info.Printf("Connection details: %s\n", result.Stdout)
	}

	return nil
}

// createIntercept creates a new Telepresence intercept
func (p *Provider) createIntercept(ctx context.Context, serviceName string, flags *models.InterceptFlags) error {
	spinner, _ := pterm.DefaultSpinner.Start(fmt.Sprintf("Creating intercept for service: %s", serviceName))

	// Build telepresence intercept command
	args := []string{"intercept", serviceName}

	// Add port forwarding
	args = append(args, "--port", fmt.Sprintf("%d", flags.Port))

	// Add namespace if specified
	if flags.Namespace != "" && flags.Namespace != "default" {
		args = append(args, "--namespace", flags.Namespace)
	}

	// Add mount if specified
	if flags.Mount != "" {
		args = append(args, "--mount", flags.Mount)
	}

	// Add environment file if specified
	if flags.EnvFile != "" {
		if _, err := os.Stat(flags.EnvFile); os.IsNotExist(err) {
			spinner.Fail(fmt.Sprintf("Environment file not found: %s", flags.EnvFile))
			return fmt.Errorf("environment file not found: %s", flags.EnvFile)
		}
		args = append(args, "--env-file", flags.EnvFile)
	}

	// Add global intercept if specified
	if flags.Global {
		args = append(args, "--global")
	} else {
		// Add header-based intercepts if specified
		for _, header := range flags.Header {
			args = append(args, "--http-header", header)
		}
	}

	// Add replace flag if specified
	if flags.Replace {
		args = append(args, "--replace")
	}

	// Execute the intercept command
	result, err := p.executor.Execute(ctx, "telepresence", args...)
	if err != nil {
		spinner.Fail(fmt.Sprintf("Failed to create intercept for %s", serviceName))
		return fmt.Errorf("failed to create intercept: %w", err)
	}

	spinner.Success(fmt.Sprintf("Intercept created for service: %s", serviceName))

	// Show intercept details if verbose
	if p.verbose && result.Stdout != "" {
		pterm.Info.Printf("Intercept details:\n%s\n", result.Stdout)
	}

	return nil
}

// showInterceptStatus displays the current intercept status
func (p *Provider) showInterceptStatus(ctx context.Context, serviceName string) error {
	if p.verbose {
		pterm.Info.Println("Checking intercept status...")
	}

	result, err := p.executor.Execute(ctx, "telepresence", "list")
	if err != nil {
		pterm.Warning.Printf("Failed to get intercept status: %v\n", err)
		return nil // Don't fail the whole operation for this
	}

	// Show intercept summary
	fmt.Println()
	pterm.DefaultBox.
		WithTitle(" 🔀 Intercept Status ").
		WithTitleTopCenter().
		Println(fmt.Sprintf("Service: %s\nStatus: Active\nLocal Port: Check terminal output above", serviceName))

	// Show the detailed status if available
	if result.Stdout != "" {
		fmt.Println()
		pterm.Info.Println("Active Intercepts:")
		pterm.Printf("%s\n", result.Stdout)
	}

	// Show usage instructions
	fmt.Println()
	pterm.Info.Printf("💡 Usage Instructions:\n")
	pterm.Printf("  • Your local service should be running on the configured port\n")
	pterm.Printf("  • Traffic matching your intercept rules will be forwarded to your local machine\n")
	pterm.Printf("  • Use 'openframe dev intercept %s --teardown' to stop the intercept\n", serviceName)
	pterm.Printf("  • Use 'telepresence quit' to disconnect completely\n")

	return nil
}

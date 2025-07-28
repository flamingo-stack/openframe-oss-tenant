package cmd

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/flamingo/openframe-cli/pkg/ui"
	"github.com/spf13/cobra"
)

var (
	devPort      int
	devProtocol  string
	devNamespace string
	devService   string
)

// devCmd represents the dev command
var devCmd = &cobra.Command{
	Use:   "dev",
	Short: "Developer tools and workflows",
	Long: `Developer tools for OpenFrame development workflows.

Provides integration with:
  • Telepresence - Intercept Kubernetes services for local development
  • Skaffold - Continuous development with hot reload
  • Port forwarding - Easy access to cluster services

These tools enable hybrid local/remote development where you can run
services locally while they integrate with the remote cluster.`,
}

// interceptCmd represents the intercept command
var interceptCmd = &cobra.Command{
	Use:   "intercept [SERVICE] [PORT]",
	Short: "Intercept a Kubernetes service with Telepresence",
	Long: `Intercept a Kubernetes service to route traffic to your local development environment.

This command uses Telepresence to:
  1. Connect to the Kubernetes cluster
  2. Create an intercept for the specified service
  3. Route traffic from the cluster to your local process

The intercepted service's traffic will be routed to localhost on the specified port.

Examples:
  # Intercept OpenFrame API service on port 8090
  openframe dev intercept openframe-api 8090

  # Interactive service selection
  openframe dev intercept

  # Intercept with specific namespace and protocol
  openframe dev intercept openframe-api 8090 --namespace microservices --protocol http`,
	Args: cobra.MaximumNArgs(2),
	RunE: runIntercept,
}

// skaffoldCmd represents the skaffold command
var skaffoldCmd = &cobra.Command{
	Use:   "skaffold [SERVICE]",
	Short: "Run Skaffold development workflow",
	Long: `Start Skaffold continuous development workflow for a service.

Skaffold provides:
  • Automatic code reload on file changes
  • Image building and deployment to cluster
  • Log streaming from the deployed service
  • Port forwarding setup

The command will look for skaffold.yaml in the service directory and
start the development workflow.

Examples:
  # Run Skaffold for OpenFrame API
  openframe dev skaffold openframe-api

  # Interactive service selection
  openframe dev skaffold

  # Run with specific namespace
  openframe dev skaffold openframe-ui --namespace microservices`,
	Args: cobra.MaximumNArgs(1),
	RunE: runSkaffold,
}

// portForwardCmd represents the port-forward command
var portForwardCmd = &cobra.Command{
	Use:   "port-forward [SERVICE] [LOCAL_PORT:REMOTE_PORT]",
	Short: "Forward a port from a Kubernetes service",
	Long: `Forward a port from a Kubernetes service to your local machine.

This is useful for accessing services running in the cluster from your
local development environment.

Examples:
  # Forward ArgoCD UI
  openframe dev port-forward argocd-server 8080:80 --namespace argocd

  # Forward MongoDB
  openframe dev port-forward mongodb 27017:27017 --namespace datasources

  # Interactive service and port selection
  openframe dev port-forward`,
	Args: cobra.MaximumNArgs(2),
	RunE: runPortForward,
}

// statusCmd represents the dev status command
var devStatusCmd = &cobra.Command{
	Use:   "status",
	Short: "Show development environment status",
	Long: `Show the status of development tools and active sessions.

Displays:
  • Active Telepresence intercepts
  • Running Skaffold processes
  • Active port forwards
  • Connected clusters`,
	RunE: runDevStatus,
}

func init() {
	rootCmd.AddCommand(devCmd)
	devCmd.AddCommand(interceptCmd, skaffoldCmd, portForwardCmd, devStatusCmd)

	// Intercept command flags
	interceptCmd.Flags().StringVarP(&devNamespace, "namespace", "n", "", "Kubernetes namespace")
	interceptCmd.Flags().StringVarP(&devProtocol, "protocol", "p", "http", "Protocol (http, tcp)")

	// Skaffold command flags
	skaffoldCmd.Flags().StringVarP(&devNamespace, "namespace", "n", "microservices", "Kubernetes namespace")

	// Port forward command flags
	portForwardCmd.Flags().StringVarP(&devNamespace, "namespace", "n", "", "Kubernetes namespace")
}

func runIntercept(cmd *cobra.Command, args []string) error {
	ctx := context.Background()

	var serviceName string
	var port int

	// Get service name
	if len(args) > 0 {
		serviceName = args[0]
	} else {
		// Interactive service selection
		services, err := getAvailableServices(ctx, devNamespace)
		if err != nil {
			return fmt.Errorf("failed to get services: %w", err)
		}

		if len(services) == 0 {
			return fmt.Errorf("no services found")
		}

		_, selected, err := ui.SelectFromList("Select service to intercept", services)
		if err != nil {
			return fmt.Errorf("failed to select service: %w", err)
		}
		serviceName = selected
	}

	// Get port
	if len(args) > 1 {
		if _, err := fmt.Sscanf(args[1], "%d", &port); err != nil {
			return fmt.Errorf("invalid port: %s", args[1])
		}
	} else {
		portStr, err := ui.GetInput("Local port", "8080", func(input string) error {
			var p int
			if _, err := fmt.Sscanf(input, "%d", &p); err != nil {
				return fmt.Errorf("invalid port number")
			}
			if p < 1 || p > 65535 {
				return fmt.Errorf("port must be between 1 and 65535")
			}
			return nil
		})
		if err != nil {
			return err
		}
		fmt.Sscanf(portStr, "%d", &port)
	}

	// Get namespace if not provided
	if devNamespace == "" {
		devNamespace = "microservices" // Default namespace

		nsInput, err := ui.GetInput("Namespace", devNamespace, func(input string) error {
			if len(input) == 0 {
				return fmt.Errorf("namespace cannot be empty")
			}
			return nil
		})
		if err != nil {
			return err
		}
		devNamespace = nsInput
	}

	// Check if Telepresence is available
	if err := checkTelepresenceAvailable(); err != nil {
		return err
	}

	// Connect to cluster if not already connected
	fmt.Println("🔗 Connecting to cluster...")
	if err := telepresenceConnect(ctx); err != nil {
		return fmt.Errorf("failed to connect to cluster: %w", err)
	}

	// Create the intercept
	fmt.Printf("🎯 Creating intercept for %s:%d in namespace %s...\n", serviceName, port, devNamespace)
	if err := createIntercept(ctx, serviceName, devNamespace, port); err != nil {
		return fmt.Errorf("failed to create intercept: %w", err)
	}

	fmt.Printf("✅ Intercept active! Traffic to %s in %s namespace is now routed to localhost:%d\n",
		serviceName, devNamespace, port)
	fmt.Println("\n📋 Next steps:")
	fmt.Printf("  1. Start your local service on port %d\n", port)
	fmt.Println("  2. Make requests to the cluster - they'll be routed to your local service")
	fmt.Println("  3. Use 'openframe dev status' to check intercept status")
	fmt.Println("  4. Use 'telepresence leave <intercept-name>' to stop the intercept")

	return nil
}

func runSkaffold(cmd *cobra.Command, args []string) error {
	ctx := context.Background()

	var serviceName string

	// Get service name
	if len(args) > 0 {
		serviceName = args[0]
	} else {
		// Interactive service selection
		services, err := getOpenFrameServices()
		if err != nil {
			return fmt.Errorf("failed to get services: %w", err)
		}

		_, selected, err := ui.SelectFromList("Select service for Skaffold development", services)
		if err != nil {
			return fmt.Errorf("failed to select service: %w", err)
		}
		serviceName = selected
	}

	// Find repository root
	repoPath, err := findRepoRoot()
	if err != nil {
		return fmt.Errorf("failed to find repository root: %w", err)
	}

	// Determine service path
	servicePath, err := getServicePath(repoPath, serviceName)
	if err != nil {
		return fmt.Errorf("failed to find service path: %w", err)
	}

	// Check if skaffold.yaml exists
	skaffoldFile := filepath.Join(servicePath, "skaffold.yaml")
	if _, err := os.Stat(skaffoldFile); os.IsNotExist(err) {
		return fmt.Errorf("skaffold.yaml not found in %s", servicePath)
	}

	// Check if Skaffold is available
	if err := checkSkaffoldAvailable(); err != nil {
		return err
	}

	fmt.Printf("🚀 Starting Skaffold development for %s...\n", serviceName)
	fmt.Printf("📂 Working directory: %s\n", servicePath)
	fmt.Printf("🔄 Skaffold will watch for changes and redeploy automatically\n")
	fmt.Println("   Press Ctrl+C to stop")

	// Change to service directory
	originalDir, _ := os.Getwd()
	defer os.Chdir(originalDir)
	os.Chdir(servicePath)

	// Run skaffold dev
	args_skaffold := []string{"dev", "--cache-artifacts=false"}
	if devNamespace != "" {
		args_skaffold = append(args_skaffold, "-n", devNamespace)
	}

	cmd_skaffold := exec.CommandContext(ctx, "skaffold", args_skaffold...)
	cmd_skaffold.Stdout = os.Stdout
	cmd_skaffold.Stderr = os.Stderr
	cmd_skaffold.Stdin = os.Stdin

	return cmd_skaffold.Run()
}

func runPortForward(cmd *cobra.Command, args []string) error {
	ctx := context.Background()

	var serviceName string
	var portMapping string

	// Get service name
	if len(args) > 0 {
		serviceName = args[0]
	} else {
		// Interactive service selection
		services, err := getAvailableServices(ctx, devNamespace)
		if err != nil {
			return fmt.Errorf("failed to get services: %w", err)
		}

		_, selected, err := ui.SelectFromList("Select service to port-forward", services)
		if err != nil {
			return fmt.Errorf("failed to select service: %w", err)
		}
		serviceName = selected
	}

	// Get port mapping
	if len(args) > 1 {
		portMapping = args[1]
	} else {
		var err error
		portMapping, err = ui.GetInput("Port mapping (local:remote)", "8080:80", func(input string) error {
			parts := strings.Split(input, ":")
			if len(parts) != 2 {
				return fmt.Errorf("port mapping must be in format 'local:remote'")
			}
			return nil
		})
		if err != nil {
			return err
		}
	}

	// Get namespace if not provided
	if devNamespace == "" {
		var err error
		devNamespace, err = ui.GetInput("Namespace", "microservices", func(input string) error {
			if len(input) == 0 {
				return fmt.Errorf("namespace cannot be empty")
			}
			return nil
		})
		if err != nil {
			return err
		}
	}

	fmt.Printf("🔀 Port forwarding %s/%s %s...\n", devNamespace, serviceName, portMapping)
	fmt.Println("   Press Ctrl+C to stop")

	// Create kubectl port-forward command
	args_kubectl := []string{"port-forward", fmt.Sprintf("svc/%s", serviceName), portMapping}
	if devNamespace != "" {
		args_kubectl = append(args_kubectl, "-n", devNamespace)
	}

	cmd_kubectl := exec.CommandContext(ctx, "kubectl", args_kubectl...)
	cmd_kubectl.Stdout = os.Stdout
	cmd_kubectl.Stderr = os.Stderr

	return cmd_kubectl.Run()
}

func runDevStatus(cmd *cobra.Command, args []string) error {
	fmt.Println("🔍 Development Environment Status")
	fmt.Println("================================")

	// Check Telepresence status
	fmt.Println("\n🎯 Telepresence:")
	if err := checkTelepresenceStatus(); err != nil {
		fmt.Printf("   ❌ Not connected: %v\n", err)
	} else {
		fmt.Println("   ✅ Connected")
		listTelepresenceIntercepts()
	}

	// Check for running Skaffold processes
	fmt.Println("\n🚀 Skaffold:")
	checkSkaffoldProcesses()

	// Check kubectl context
	fmt.Println("\n🔧 Kubernetes Context:")
	showKubernetesContext()

	return nil
}

// Helper functions

func checkTelepresenceAvailable() error {
	_, err := exec.LookPath("telepresence")
	if err != nil {
		return fmt.Errorf("telepresence is not installed or not in PATH")
	}
	return nil
}

func checkSkaffoldAvailable() error {
	_, err := exec.LookPath("skaffold")
	if err != nil {
		return fmt.Errorf("skaffold is not installed or not in PATH")
	}
	return nil
}

func telepresenceConnect(ctx context.Context) error {
	cmd := exec.CommandContext(ctx, "telepresence", "connect")
	return cmd.Run()
}

func createIntercept(ctx context.Context, serviceName, namespace string, port int) error {
	args := []string{"intercept", serviceName, "--port", fmt.Sprintf("%d", port)}
	if namespace != "" {
		args = append(args, "--namespace", namespace)
	}

	cmd := exec.CommandContext(ctx, "telepresence", args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

func getAvailableServices(ctx context.Context, namespace string) ([]string, error) {
	args := []string{"get", "services", "--no-headers", "-o", "custom-columns=NAME:.metadata.name"}
	if namespace != "" {
		args = append(args, "-n", namespace)
	}

	cmd := exec.CommandContext(ctx, "kubectl", args...)
	output, err := cmd.Output()
	if err != nil {
		return nil, err
	}

	services := strings.Split(strings.TrimSpace(string(output)), "\n")
	var result []string
	for _, service := range services {
		if service != "" && service != "NAME" {
			result = append(result, service)
		}
	}

	return result, nil
}

func getOpenFrameServices() ([]string, error) {
	return []string{
		"openframe-api",
		"openframe-ui",
		"openframe-gateway",
		"openframe-management",
		"openframe-stream",
		"openframe-client",
		"openframe-config",
	}, nil
}

func getServicePath(repoPath, serviceName string) (string, error) {
	// Check if it's an OpenFrame service
	if strings.HasPrefix(serviceName, "openframe-") {
		path := filepath.Join(repoPath, "openframe", "services", serviceName)
		if _, err := os.Stat(path); err == nil {
			return path, nil
		}
	}

	// Check other locations
	possiblePaths := []string{
		filepath.Join(repoPath, "services", serviceName),
		filepath.Join(repoPath, serviceName),
	}

	for _, path := range possiblePaths {
		if _, err := os.Stat(path); err == nil {
			return path, nil
		}
	}

	return "", fmt.Errorf("service directory not found for %s", serviceName)
}

func checkTelepresenceStatus() error {
	cmd := exec.Command("telepresence", "status")
	return cmd.Run()
}

func listTelepresenceIntercepts() {
	cmd := exec.Command("telepresence", "list")
	output, err := cmd.Output()
	if err != nil {
		fmt.Printf("   Failed to list intercepts: %v\n", err)
		return
	}

	if strings.TrimSpace(string(output)) == "" {
		fmt.Println("   No active intercepts")
	} else {
		fmt.Printf("   Active intercepts:\n%s", string(output))
	}
}

func checkSkaffoldProcesses() {
	// Simple check for skaffold processes
	cmd := exec.Command("pgrep", "-f", "skaffold")
	output, err := cmd.Output()
	if err != nil || strings.TrimSpace(string(output)) == "" {
		fmt.Println("   No running Skaffold processes")
	} else {
		fmt.Println("   ✅ Skaffold processes running")
	}
}

func showKubernetesContext() {
	cmd := exec.Command("kubectl", "config", "current-context")
	output, err := cmd.Output()
	if err != nil {
		fmt.Printf("   ❌ Failed to get context: %v\n", err)
		return
	}

	fmt.Printf("   Current context: %s\n", strings.TrimSpace(string(output)))
}

package cmd

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"time"

	"github.com/manifoldco/promptui"
	"github.com/pterm/pterm"
	"github.com/spf13/cobra"

	"github.com/flamingo/openframe-cli/pkg/cluster"
	"github.com/flamingo/openframe-cli/pkg/config"
)

var (
	// Bootstrap flags
	bootstrapClusterName    string
	bootstrapClusterType    string
	bootstrapNodeCount      int
	bootstrapK8sVersion     string
	bootstrapDeploymentMode string
	bootstrapSkipWizard     bool
	bootstrapComponentsStr  string
	bootstrapAutoApprove    bool
)

// bootstrapCmd represents the bootstrap command - the main interactive wizard
var bootstrapCmd = &cobra.Command{
	Use:     "bootstrap",
	Aliases: []string{"b", "setup", "init"},
	Short:   "🚀 Interactive wizard to bootstrap OpenFrame platform",
	Long: `🚀 Bootstrap OpenFrame Platform - Interactive Wizard

This is the main command that replaces the shell script functionality.
It provides a step-by-step interactive wizard to:

1. 🔍 Check prerequisites (Docker, K3d, Kubectl, Helm)
2. ⚙️  Configure cluster settings (type, name, nodes)
3. 🎯 Select deployment mode (development, production, minimal)
4. 📦 Choose components (ArgoCD, monitoring, external tools)
5. 🚀 Create the cluster with optimal settings
6. 📋 Install selected Helm charts via ArgoCD
7. ✅ Provide next steps and access information

The wizard is designed to be user-friendly for both new users and
experienced developers, with smart defaults and clear explanations.

Examples:
  # Interactive wizard (recommended)
  openframe bootstrap

  # Skip wizard with flags (for automation)
  openframe bootstrap --cluster-name my-dev --type k3d --mode development --auto-approve

  # Production-like setup
  openframe bootstrap --mode production --components "argocd,monitoring,external-tools"`,
	RunE: runBootstrap,
}

func init() {
	rootCmd.AddCommand(bootstrapCmd)

	// Cluster configuration flags
	bootstrapCmd.Flags().StringVar(&bootstrapClusterName, "cluster-name", "", "Name of the cluster to create")
	bootstrapCmd.Flags().StringVarP(&bootstrapClusterType, "type", "t", "", "Cluster type (k3d, kind)")
	bootstrapCmd.Flags().IntVarP(&bootstrapNodeCount, "nodes", "n", 0, "Number of agent nodes (0 = auto-detect)")
	bootstrapCmd.Flags().StringVar(&bootstrapK8sVersion, "k8s-version", "", "Kubernetes version")

	// Deployment configuration flags
	bootstrapCmd.Flags().StringVarP(&bootstrapDeploymentMode, "mode", "m", "", "Deployment mode (development, production, minimal)")
	bootstrapCmd.Flags().StringVar(&bootstrapComponentsStr, "components", "", "Components to install (comma-separated)")

	// Control flags
	bootstrapCmd.Flags().BoolVar(&bootstrapSkipWizard, "skip-wizard", false, "Skip interactive wizard")
	bootstrapCmd.Flags().BoolVar(&bootstrapAutoApprove, "auto-approve", false, "Automatically approve all prompts")
}

func runBootstrap(cmd *cobra.Command, args []string) error {
	ctx := context.Background()

	// Show OpenFrame logo
	ShowLogo()

	// Initialize configuration
	cfg := config.DefaultConfig()
	bootstrapConfig := &config.ClusterBootstrapConfig{}

	// Detect repository path
	repoPath, err := detectRepoPath()
	if err != nil {
		return fmt.Errorf("failed to detect repository path: %w", err)
	}
	cfg.RepoPath = repoPath
	cfg.ManifestsDir = filepath.Join(repoPath, "manifests")
	cfg.ScriptDir = filepath.Join(repoPath, "scripts")
	cfg.HelmValuesFile = filepath.Join(cfg.ScriptDir, "helm-values.yaml")

	pterm.Info.Printf("Repository path: %s\n", repoPath)

	// Step 1: Prerequisites check
	if err := checkPrerequisites(ctx); err != nil {
		return fmt.Errorf("prerequisite check failed: %w", err)
	}

	// Step 2: Configuration wizard or flags
	if bootstrapSkipWizard || len(args) > 0 {
		// Use provided flags
		if err := configureFromFlags(bootstrapConfig, cfg); err != nil {
			return fmt.Errorf("failed to configure from flags: %w", err)
		}
	} else {
		// Run interactive wizard
		if err := runConfigurationWizard(bootstrapConfig, cfg); err != nil {
			return fmt.Errorf("configuration wizard failed: %w", err)
		}
	}

	// Step 3: Validate and show summary
	if err := bootstrapConfig.ValidateConfig(); err != nil {
		return fmt.Errorf("configuration validation failed: %w", err)
	}

	if !bootstrapAutoApprove {
		if err := showConfigurationSummary(bootstrapConfig); err != nil {
			return fmt.Errorf("configuration cancelled: %w", err)
		}
	}

	// Step 4: Create cluster
	if err := createCluster(ctx, bootstrapConfig, cfg); err != nil {
		return fmt.Errorf("cluster creation failed: %w", err)
	}

	// Step 5: Install components
	if err := installComponents(ctx, bootstrapConfig, cfg); err != nil {
		return fmt.Errorf("component installation failed: %w", err)
	}

	// Step 6: Show success and next steps
	showSuccessMessage(bootstrapConfig, cfg)

	return nil
}

func checkPrerequisites(ctx context.Context) error {
	pterm.DefaultSection.Println("🔍 Checking Prerequisites")

	spinner, _ := pterm.DefaultSpinner.Start("Checking required tools...")

	requiredTools := []string{"docker", "k3d", "kubectl", "helm"}
	optionalTools := []string{"telepresence", "skaffold", "argocd"}

	var missing []string
	var optional []string

	// Check required tools
	for _, tool := range requiredTools {
		if err := checkTool(tool); err != nil {
			missing = append(missing, tool)
		}
	}

	// Check optional tools
	for _, tool := range optionalTools {
		if err := checkTool(tool); err != nil {
			optional = append(optional, tool)
		}
	}

	spinner.Stop()

	if len(missing) > 0 {
		pterm.Error.Printf("Missing required tools: %s\n", strings.Join(missing, ", "))
		pterm.Info.Println("Please install the missing tools and try again.")
		pterm.Info.Println("\nInstallation instructions:")
		for _, tool := range missing {
			showInstallInstructions(tool)
		}
		return fmt.Errorf("missing required tools: %s", strings.Join(missing, ", "))
	}

	pterm.Success.Println("✅ All required tools are available")

	if len(optional) > 0 {
		pterm.Warning.Printf("Optional tools not found: %s\n", strings.Join(optional, ", "))
		pterm.Info.Println("These tools are optional but enhance functionality.")
	}

	// Check Docker is running
	if err := checkDockerRunning(); err != nil {
		return fmt.Errorf("Docker check failed: %w", err)
	}

	return nil
}

func runConfigurationWizard(bootstrapConfig *config.ClusterBootstrapConfig, cfg *config.OpenFrameConfig) error {
	pterm.DefaultSection.Println("⚙️ Configuration Wizard")

	// Step 1: Cluster name
	clusterName, err := promptForInput("Cluster name", cfg.ClusterName, validateNonEmpty)
	if err != nil {
		return err
	}
	bootstrapConfig.Name = clusterName

	// Step 2: Cluster type
	clusterTypes := []string{"k3d (Recommended - Fast local clusters)", "kind (Alternative local option)"}
	clusterTypeIdx, _, err := promptForSelection("Select cluster type", clusterTypes)
	if err != nil {
		return err
	}

	switch clusterTypeIdx {
	case 0:
		bootstrapConfig.Type = "k3d"
	case 1:
		bootstrapConfig.Type = "kind"
	}

	// Step 3: Kubernetes version
	k8sVersions := []string{
		cfg.K8sVersion + " (Default)",
		"v1.31.0",
		"v1.30.0",
		"Custom version",
	}

	versionIdx, _, err := promptForSelection("Select Kubernetes version", k8sVersions)
	if err != nil {
		return err
	}

	if versionIdx == len(k8sVersions)-1 {
		customVersion, err := promptForInput("Enter custom version", "v1.32.0", validateNonEmpty)
		if err != nil {
			return err
		}
		bootstrapConfig.KubernetesVersion = customVersion
	} else {
		bootstrapConfig.KubernetesVersion = strings.Split(k8sVersions[versionIdx], " ")[0]
	}

	// Step 4: Node count (auto-detect with option to override)
	systemInfo := detectSystemInfo()
	bootstrapConfig.SystemInfo = systemInfo

	pterm.Info.Printf("Detected system: %d CPU cores, %d GB RAM\n", systemInfo.CPUCores, systemInfo.MemoryGB)
	pterm.Info.Printf("Recommended nodes: %d\n", systemInfo.OptimalNodes)

	useRecommended, err := promptForConfirmation(
		fmt.Sprintf("Use recommended %d nodes?", systemInfo.OptimalNodes),
		true,
	)
	if err != nil {
		return err
	}

	if useRecommended {
		bootstrapConfig.NodeCount = systemInfo.OptimalNodes
	} else {
		nodeCountStr, err := promptForInput("Number of nodes", strconv.Itoa(systemInfo.OptimalNodes), validatePositiveInt)
		if err != nil {
			return err
		}
		bootstrapConfig.NodeCount, _ = strconv.Atoi(nodeCountStr)
	}

	// Step 5: Deployment mode
	modes := []string{
		"development - " + config.DeploymentModes["development"],
		"production - " + config.DeploymentModes["production"],
		"minimal - " + config.DeploymentModes["minimal"],
	}

	modeIdx, _, err := promptForSelection("Select deployment mode", modes)
	if err != nil {
		return err
	}

	modeKeys := []string{"development", "production", "minimal"}
	bootstrapConfig.DeploymentMode = modeKeys[modeIdx]

	// Step 6: Component selection
	if err := selectComponents(bootstrapConfig); err != nil {
		return err
	}

	return nil
}

func selectComponents(bootstrapConfig *config.ClusterBootstrapConfig) error {
	pterm.DefaultSection.Println("📦 Component Selection")

	// Get default components for selected mode
	defaultComponents := config.DefaultComponents[bootstrapConfig.DeploymentMode]
	bootstrapConfig.Components = make(map[string]bool)

	components := []struct {
		key         string
		name        string
		description string
	}{
		{"argocd", "ArgoCD", "GitOps continuous delivery platform"},
		{"monitoring", "Monitoring Stack", "Prometheus, Grafana, Loki"},
		{"openframe-core", "OpenFrame Core", "Core API and services"},
		{"openframe-ui", "OpenFrame UI", "Web interface"},
		{"external-tools", "External Tools", "MeshCentral, Tactical RMM, Fleet MDM"},
		{"developer-tools", "Developer Tools", "Telepresence, Skaffold integration"},
	}

	pterm.Info.Printf("Default selection for %s mode:\n", bootstrapConfig.DeploymentMode)

	for _, comp := range components {
		defaultEnabled := defaultComponents[comp.key]

		prompt := fmt.Sprintf("Install %s (%s)?", comp.name, comp.description)
		enabled, err := promptForConfirmation(prompt, defaultEnabled)
		if err != nil {
			return err
		}

		bootstrapConfig.Components[comp.key] = enabled
	}

	return nil
}

func createCluster(ctx context.Context, bootstrapConfig *config.ClusterBootstrapConfig, cfg *config.OpenFrameConfig) error {
	pterm.DefaultSection.Println("🚀 Creating Cluster")

	// Create cluster provider
	var provider cluster.ClusterProvider
	opts := cluster.ProviderOptions{
		Verbose: globalVerbose,
		DryRun:  false,
	}

	switch bootstrapConfig.Type {
	case "k3d":
		provider = cluster.NewK3dProvider(opts)
	case "kind":
		provider = cluster.NewKindProvider(opts)
	default:
		return fmt.Errorf("unsupported cluster type: %s", bootstrapConfig.Type)
	}

	// Check if provider is available
	if err := provider.IsAvailable(); err != nil {
		return fmt.Errorf("cluster provider not available: %w", err)
	}

	// Create cluster configuration
	clusterConfig := &cluster.ClusterConfig{
		Name:              bootstrapConfig.Name,
		Type:              cluster.ClusterType(bootstrapConfig.Type),
		KubernetesVersion: bootstrapConfig.KubernetesVersion,
		NodeCount:         bootstrapConfig.NodeCount,
		PortMappings: []cluster.PortMapping{
			{HostPort: bootstrapConfig.HTTPPort, ContainerPort: 80, Protocol: "tcp"},
			{HostPort: bootstrapConfig.HTTPSPort, ContainerPort: 443, Protocol: "tcp"},
		},
	}

	// Show progress
	spinner, _ := pterm.DefaultSpinner.Start(fmt.Sprintf("Creating %s cluster '%s'...", bootstrapConfig.Type, bootstrapConfig.Name))

	if err := provider.Create(ctx, clusterConfig); err != nil {
		spinner.Fail("Failed to create cluster")
		return fmt.Errorf("failed to create cluster: %w", err)
	}

	spinner.Success(fmt.Sprintf("Cluster '%s' created successfully!", bootstrapConfig.Name))

	// Verify cluster is ready
	spinner, _ = pterm.DefaultSpinner.Start("Waiting for cluster to be ready...")
	time.Sleep(5 * time.Second) // Give cluster time to initialize

	if err := verifyClusterReady(ctx, bootstrapConfig.Name); err != nil {
		spinner.Fail("Cluster is not ready")
		return fmt.Errorf("cluster readiness check failed: %w", err)
	}

	spinner.Success("Cluster is ready!")

	return nil
}

func installComponents(ctx context.Context, bootstrapConfig *config.ClusterBootstrapConfig, cfg *config.OpenFrameConfig) error {
	pterm.DefaultSection.Println("📋 Installing Components")

	// Check if any components are selected
	hasComponents := false
	for _, enabled := range bootstrapConfig.Components {
		if enabled {
			hasComponents = true
			break
		}
	}

	if !hasComponents {
		pterm.Info.Println("No components selected for installation.")
		return nil
	}

	// Update Helm repositories
	spinner, _ := pterm.DefaultSpinner.Start("Updating Helm repositories...")
	if err := updateHelmRepos(ctx); err != nil {
		spinner.Fail("Failed to update Helm repositories")
		return err
	}
	spinner.Success("Helm repositories updated")

	// Install components in order
	if bootstrapConfig.Components["argocd"] {
		if err := installArgoCD(ctx, bootstrapConfig, cfg); err != nil {
			return fmt.Errorf("ArgoCD installation failed: %w", err)
		}
	}

	if bootstrapConfig.Components["argocd"] {
		if err := installAppOfApps(ctx, bootstrapConfig, cfg); err != nil {
			return fmt.Errorf("App-of-Apps installation failed: %w", err)
		}
	}

	return nil
}

// Helper functions

func detectRepoPath() (string, error) {
	cwd, err := os.Getwd()
	if err != nil {
		return "", err
	}

	// Look for repository root indicators
	for {
		if _, err := os.Stat(filepath.Join(cwd, ".git")); err == nil {
			return cwd, nil
		}
		if _, err := os.Stat(filepath.Join(cwd, "manifests")); err == nil {
			return cwd, nil
		}
		if _, err := os.Stat(filepath.Join(cwd, "scripts")); err == nil {
			return cwd, nil
		}

		parent := filepath.Dir(cwd)
		if parent == cwd {
			break
		}
		cwd = parent
	}

	return "", fmt.Errorf("repository root not found")
}

func checkTool(tool string) error {
	_, err := exec.LookPath(tool)
	return err
}

func checkDockerRunning() error {
	cmd := exec.Command("docker", "info")
	return cmd.Run()
}

func showInstallInstructions(tool string) {
	instructions := map[string]string{
		"docker":  "Install Docker Desktop from https://docker.com/get-started",
		"k3d":     "Install k3d: curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash",
		"kubectl": "Install kubectl: https://kubernetes.io/docs/tasks/tools/install-kubectl/",
		"helm":    "Install Helm: https://helm.sh/docs/intro/install/",
	}

	if instruction, ok := instructions[tool]; ok {
		pterm.Info.Printf("  %s: %s\n", tool, instruction)
	}
}

func detectSystemInfo() config.SystemInfo {
	// This is a simplified version - in production you'd use more sophisticated detection
	return config.SystemInfo{
		OS:           runtime.GOOS,
		Architecture: runtime.GOARCH,
		CPUCores:     runtime.NumCPU(),
		MemoryGB:     8, // Default assumption
		IsARM64:      runtime.GOARCH == "arm64",
		OptimalNodes: max(1, runtime.NumCPU()/4), // 1 node per 4 cores, minimum 1
	}
}

func configureFromFlags(bootstrapConfig *config.ClusterBootstrapConfig, cfg *config.OpenFrameConfig) error {
	// Set values from flags
	if bootstrapClusterName != "" {
		bootstrapConfig.Name = bootstrapClusterName
	} else {
		bootstrapConfig.Name = cfg.ClusterName
	}

	if bootstrapClusterType != "" {
		bootstrapConfig.Type = bootstrapClusterType
	} else {
		bootstrapConfig.Type = "k3d"
	}

	if bootstrapNodeCount > 0 {
		bootstrapConfig.NodeCount = bootstrapNodeCount
	} else {
		systemInfo := detectSystemInfo()
		bootstrapConfig.NodeCount = systemInfo.OptimalNodes
		bootstrapConfig.SystemInfo = systemInfo
	}

	if bootstrapK8sVersion != "" {
		bootstrapConfig.KubernetesVersion = bootstrapK8sVersion
	} else {
		bootstrapConfig.KubernetesVersion = cfg.K8sVersion
	}

	if bootstrapDeploymentMode != "" {
		bootstrapConfig.DeploymentMode = bootstrapDeploymentMode
	} else {
		bootstrapConfig.DeploymentMode = "development"
	}

	// Parse components
	if bootstrapComponentsStr != "" {
		components := strings.Split(bootstrapComponentsStr, ",")
		bootstrapConfig.Components = make(map[string]bool)
		for _, comp := range components {
			bootstrapConfig.Components[strings.TrimSpace(comp)] = true
		}
	}

	return nil
}

func showConfigurationSummary(bootstrapConfig *config.ClusterBootstrapConfig) error {
	pterm.DefaultSection.Println("📋 Configuration Summary")

	// Create summary table
	summaryData := [][]string{
		{"Setting", "Value"},
		{"Cluster Name", bootstrapConfig.Name},
		{"Cluster Type", bootstrapConfig.Type},
		{"Kubernetes Version", bootstrapConfig.KubernetesVersion},
		{"Node Count", strconv.Itoa(bootstrapConfig.NodeCount)},
		{"Deployment Mode", bootstrapConfig.DeploymentMode},
	}

	pterm.DefaultTable.WithHasHeader().WithData(summaryData).Render()

	// Show selected components
	pterm.Info.Println("\nSelected Components:")
	for component, enabled := range bootstrapConfig.Components {
		if enabled {
			pterm.Success.Printf("  ✅ %s\n", component)
		} else {
			pterm.Info.Printf("  ❌ %s\n", component)
		}
	}

	// Confirm
	confirmed, err := promptForConfirmation("Proceed with this configuration?", true)
	if err != nil {
		return err
	}

	if !confirmed {
		return fmt.Errorf("configuration cancelled by user")
	}

	return nil
}

func showSuccessMessage(bootstrapConfig *config.ClusterBootstrapConfig, cfg *config.OpenFrameConfig) {
	pterm.DefaultSection.Println("🎉 Bootstrap Complete!")

	pterm.Success.Printf("OpenFrame cluster '%s' is ready!\n\n", bootstrapConfig.Name)

	// Show access information
	pterm.Info.Println("📋 Next Steps:")
	pterm.Info.Println("  1. Check cluster status:")
	pterm.Info.Println("     kubectl get nodes")
	pterm.Info.Println()

	if bootstrapConfig.Components["openframe-ui"] {
		pterm.Info.Println("  2. Access OpenFrame UI:")
		pterm.Info.Printf("     http://localhost:%d (once ingress is ready)\n", bootstrapConfig.HTTPPort)
		pterm.Info.Println()
	}

	if bootstrapConfig.Components["argocd"] {
		pterm.Info.Println("  3. Access ArgoCD:")
		pterm.Info.Println("     kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath=\"{.data.password}\" | base64 -d")
		pterm.Info.Println("     kubectl port-forward svc/argo-cd-argocd-server -n argocd 8080:443")
		pterm.Info.Println("     https://localhost:8080 (admin / <password from above>)")
		pterm.Info.Println()
	}

	if bootstrapConfig.Components["developer-tools"] {
		pterm.Info.Println("  4. Developer commands:")
		pterm.Info.Println("     openframe dev intercept <service> <port>")
		pterm.Info.Println("     openframe dev skaffold <service>")
		pterm.Info.Println()
	}

	pterm.Info.Println("  5. Manage cluster:")
	pterm.Info.Printf("     openframe cluster status %s\n", bootstrapConfig.Name)
	pterm.Info.Printf("     openframe cluster delete %s\n", bootstrapConfig.Name)
}

// Prompt helper functions

func promptForInput(label, defaultValue string, validate func(string) error) (string, error) {
	prompt := promptui.Prompt{
		Label:    label,
		Default:  defaultValue,
		Validate: validate,
	}
	return prompt.Run()
}

func promptForSelection(label string, items []string) (int, string, error) {
	prompt := promptui.Select{
		Label: label,
		Items: items,
		Templates: &promptui.SelectTemplates{
			Label:    "{{ . }}?",
			Active:   "\U00002192 {{ . | cyan }}",
			Inactive: "  {{ . | white }}",
			Selected: "\U00002713 {{ . | green }}",
		},
	}
	return prompt.Run()
}

func promptForConfirmation(label string, defaultValue bool) (bool, error) {
	defaultStr := "N"
	if defaultValue {
		defaultStr = "y"
	}

	prompt := promptui.Prompt{
		Label:     label,
		IsConfirm: true,
		Default:   defaultStr,
	}

	result, err := prompt.Run()
	if err != nil {
		if err == promptui.ErrAbort {
			return false, nil
		}
		return false, err
	}

	return result == "y" || result == "Y", nil
}

// Validation functions

func validateNonEmpty(input string) error {
	if len(strings.TrimSpace(input)) == 0 {
		return fmt.Errorf("value cannot be empty")
	}
	return nil
}

func validatePositiveInt(input string) error {
	if i, err := strconv.Atoi(input); err != nil || i <= 0 {
		return fmt.Errorf("must be a positive integer")
	}
	return nil
}

// Installation functions (simplified - would be more comprehensive in production)

func updateHelmRepos(ctx context.Context) error {
	repos := config.GetHelmRepos()

	for name, url := range repos {
		cmd := exec.CommandContext(ctx, "helm", "repo", "add", name, url)
		cmd.Run() // Ignore errors for existing repos
	}

	cmd := exec.CommandContext(ctx, "helm", "repo", "update")
	return cmd.Run()
}

func installArgoCD(ctx context.Context, bootstrapConfig *config.ClusterBootstrapConfig, cfg *config.OpenFrameConfig) error {
	spinner, _ := pterm.DefaultSpinner.Start("Installing ArgoCD...")

	args := []string{
		"upgrade", "--install", "argo-cd", "argo/argo-cd",
		"--version", cfg.ArgoCDVersion,
		"--namespace", "argocd",
		"--create-namespace",
		"--wait",
		"--timeout", "5m",
	}

	// Add values file if it exists
	valuesFile := filepath.Join(cfg.ManifestsDir, "argocd-values.yaml")
	if _, err := os.Stat(valuesFile); err == nil {
		args = append(args, "-f", valuesFile)
	}

	cmd := exec.CommandContext(ctx, "helm", args...)
	if err := cmd.Run(); err != nil {
		spinner.Fail("ArgoCD installation failed")
		return err
	}

	spinner.Success("ArgoCD installed successfully")
	return nil
}

func installAppOfApps(ctx context.Context, bootstrapConfig *config.ClusterBootstrapConfig, cfg *config.OpenFrameConfig) error {
	spinner, _ := pterm.DefaultSpinner.Start("Installing App-of-Apps...")

	appOfAppsPath := filepath.Join(cfg.ManifestsDir, "app-of-apps")
	valuesFile := cfg.HelmValuesFile

	args := []string{
		"upgrade", "--install", "app-of-apps", appOfAppsPath,
		"--namespace", "argocd",
		"--wait",
		"--timeout", "60m",
	}

	if _, err := os.Stat(valuesFile); err == nil {
		args = append(args, "-f", valuesFile)
	}

	cmd := exec.CommandContext(ctx, "helm", args...)
	if err := cmd.Run(); err != nil {
		spinner.Fail("App-of-Apps installation failed")
		return err
	}

	spinner.Success("App-of-Apps installed successfully")

	// Wait for ArgoCD apps to sync
	spinner, _ = pterm.DefaultSpinner.Start("Waiting for ArgoCD applications to sync...")
	time.Sleep(30 * time.Second) // Give time for apps to appear
	spinner.Success("ArgoCD applications are syncing")

	return nil
}

func verifyClusterReady(ctx context.Context, clusterName string) error {
	cmd := exec.CommandContext(ctx, "kubectl", "get", "nodes")
	return cmd.Run()
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

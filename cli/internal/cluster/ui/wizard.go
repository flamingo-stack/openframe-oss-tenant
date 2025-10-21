package ui

import (
	"errors"
	"fmt"

	"github.com/flamingo-stack/openframe/openframe/internal/cluster/models"
	"github.com/manifoldco/promptui"
	"github.com/pterm/pterm"
)

// ClusterConfig holds cluster configuration for wizard
type ClusterConfig struct {
	Name       string
	Type       models.ClusterType
	NodeCount  int
	K8sVersion string
}

// ConfigWizard provides interactive configuration for cluster creation
type ConfigWizard struct {
	config ClusterConfig
}

// NewConfigWizard creates a new configuration wizard
func NewConfigWizard() *ConfigWizard {
	return &ConfigWizard{
		config: ClusterConfig{
			Name:       "openframe-dev",
			Type:       models.ClusterTypeK3d,
			NodeCount:  3,
			K8sVersion: "latest",
		},
	}
}

// SetDefaults sets the default values for the wizard
func (w *ConfigWizard) SetDefaults(name string, clusterType models.ClusterType, nodeCount int, k8sVersion string) {
	w.config.Name = name
	w.config.Type = clusterType
	w.config.NodeCount = nodeCount
	w.config.K8sVersion = k8sVersion
}

// Run starts the interactive configuration wizard
func (w *ConfigWizard) Run() (ClusterConfig, error) {
	pterm.Info.Println("Cluster Configuration Wizard")
	pterm.Info.Println("Configure your new Kubernetes cluster step by step")
	pterm.Println()

	steps := NewWizardSteps()

	// Step 1: Cluster name
	name, err := steps.PromptClusterName(w.config.Name)
	if err != nil {
		return ClusterConfig{}, err
	}
	w.config.Name = name

	// Step 2: Cluster type
	clusterType, err := steps.PromptClusterType()
	if err != nil {
		return ClusterConfig{}, err
	}
	w.config.Type = clusterType

	// Step 3: Node count
	nodeCount, err := steps.PromptNodeCount(w.config.NodeCount)
	if err != nil {
		return ClusterConfig{}, err
	}
	w.config.NodeCount = nodeCount

	// Step 4: Kubernetes version
	k8sVersion, err := steps.PromptK8sVersion()
	if err != nil {
		return ClusterConfig{}, err
	}
	w.config.K8sVersion = k8sVersion

	// Step 5: Confirmation
	domainConfig := models.ClusterConfig{
		Name:       w.config.Name,
		Type:       w.config.Type,
		NodeCount:  w.config.NodeCount,
		K8sVersion: w.config.K8sVersion,
	}
	confirmed, err := steps.ConfirmConfiguration(domainConfig)
	if err != nil {
		return ClusterConfig{}, err
	}

	if !confirmed {
		// User wants to modify - restart wizard
		return w.Run()
	}

	return w.config, nil
}

// SelectCluster provides interactive cluster selection
func SelectCluster(clusters []models.ClusterInfo, message string) (models.ClusterInfo, error) {
	if len(clusters) == 0 {
		return models.ClusterInfo{}, errors.New("No clusters found")
	}

	items := make([]string, len(clusters))
	for i, cluster := range clusters {
		items[i] = formatClusterOption(cluster)
	}

	prompt := promptui.Select{
		Label: message,
		Items: items,
		Templates: &promptui.SelectTemplates{
			Label:    "{{ . }}:",
			Active:   "→ {{ . | cyan }}",
			Inactive: "  {{ . }}",
		},
	}

	idx, _, err := prompt.Run()
	if err != nil {
		return models.ClusterInfo{}, err
	}

	return clusters[idx], nil
}

// formatClusterOption formats a cluster for display in selection lists
func formatClusterOption(clusterInfo models.ClusterInfo) string {
	return pterm.Sprintf("%s - %s",
		clusterInfo.Name,
		clusterInfo.Status)
}

// ConfigurationHandler handles cluster configuration flows
type ConfigurationHandler struct{}

// NewConfigurationHandler creates a new configuration handler
func NewConfigurationHandler() *ConfigurationHandler {
	return &ConfigurationHandler{}
}

// GetClusterConfig handles the complete cluster configuration flow
func (h *ConfigurationHandler) GetClusterConfig(clusterName string) (models.ClusterConfig, error) {
	// Show creation mode selection
	modeChoice, err := h.showCreationModeSelection()
	if err != nil {
		return models.ClusterConfig{}, err
	}

	if modeChoice == "quick" {
		return h.getQuickConfig(clusterName), nil
	}

	return h.getWizardConfig(clusterName)
}

// showCreationModeSelection shows the initial creation mode selection
func (h *ConfigurationHandler) showCreationModeSelection() (string, error) {
	pterm.Info.Printf("How would you like to create your cluster?\n")
	fmt.Println()

	prompt := promptui.Select{
		Label: "Creation Mode",
		Items: []string{
			"Default configuration",
			"Interactive configuration",
		},
		Templates: &promptui.SelectTemplates{
			Label:    "{{ . }}:",
			Active:   "→ {{ . | cyan }}",
			Inactive: "  {{ . }}",
			Selected: "{{ . | green }}",
		},
	}

	idx, _, err := prompt.Run()
	if err != nil {
		return "", err
	}

	if idx == 0 {
		return "quick", nil
	}
	return "wizard", nil
}

// getQuickConfig creates a quick default configuration
func (h *ConfigurationHandler) getQuickConfig(clusterName string) models.ClusterConfig {
	if clusterName == "" {
		clusterName = "openframe-dev"
	}

	return models.ClusterConfig{
		Name:       clusterName,
		Type:       models.ClusterTypeK3d,
		K8sVersion: "latest",
		NodeCount:  3,
	}
}

// getWizardConfig runs the interactive configuration wizard
func (h *ConfigurationHandler) getWizardConfig(clusterName string) (models.ClusterConfig, error) {
	wizard := NewConfigWizard()

	// Set defaults if cluster name provided
	if clusterName != "" {
		wizard.SetDefaults(clusterName, models.ClusterTypeK3d, 3, "latest")
	}

	wizardConfig, err := wizard.Run()
	if err != nil {
		return models.ClusterConfig{}, err
	}

	// Convert wizard config to domain config
	return models.ClusterConfig{
		Name:       wizardConfig.Name,
		Type:       wizardConfig.Type,
		K8sVersion: wizardConfig.K8sVersion,
		NodeCount:  wizardConfig.NodeCount,
	}, nil
}

// GetClusterNameOrDefault returns the cluster name from args or default - helper for commands
func GetClusterNameOrDefault(args []string, defaultName string) string {
	if len(args) > 0 && args[0] != "" {
		return args[0]
	}
	if defaultName != "" {
		return defaultName
	}
	return "openframe-dev"
}

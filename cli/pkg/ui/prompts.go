package ui

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/flamingo/openframe-cli/pkg/cluster"
	"github.com/manifoldco/promptui"
)

// ClusterConfiguration holds the configuration choices made by the user
type ClusterConfiguration struct {
	Name              string
	Type              cluster.ClusterType
	KubernetesVersion string
	NodeCount         int
	DeploymentMode    string
	EnableComponents  map[string]bool
}

// ClusterWizard runs the interactive cluster configuration wizard
func ClusterWizard() (*ClusterConfiguration, error) {
	config := &ClusterConfiguration{
		EnableComponents: make(map[string]bool),
	}

	// Step 1: Cluster name
	namePrompt := promptui.Prompt{
		Label:   "Cluster name",
		Default: "openframe-dev",
		Validate: func(input string) error {
			if len(input) < 1 {
				return fmt.Errorf("cluster name cannot be empty")
			}
			return nil
		},
	}

	name, err := namePrompt.Run()
	if err != nil {
		return nil, fmt.Errorf("failed to get cluster name: %w", err)
	}
	config.Name = name

	// Step 2: Cluster type selection
	clusterTypes := []string{"K3d (Local)", "Kind (Local)", "GKE (Google Cloud)", "EKS (AWS)"}
	typePrompt := promptui.Select{
		Label: "Select cluster type",
		Items: clusterTypes,
		Templates: &promptui.SelectTemplates{
			Label:    "{{ . }}?",
			Active:   "\U00002192 {{ . | cyan }}",
			Inactive: "  {{ . | white }}",
			Selected: "\U00002713 {{ . | green }}",
		},
	}

	typeIndex, _, err := typePrompt.Run()
	if err != nil {
		return nil, fmt.Errorf("failed to select cluster type: %w", err)
	}

	switch typeIndex {
	case 0:
		config.Type = cluster.ClusterTypeK3d
	case 1:
		config.Type = cluster.ClusterTypeKind
	case 2:
		config.Type = cluster.ClusterTypeGKE
	case 3:
		config.Type = cluster.ClusterTypeEKS
	}

	// Step 3: Kubernetes version (for local clusters)
	if config.Type == cluster.ClusterTypeK3d || config.Type == cluster.ClusterTypeKind {
		versions := []string{
			"v1.33.0-k3s1 (Latest)",
			"v1.32.0-k3s1",
			"v1.31.0-k3s1",
			"v1.30.0-k3s1",
			"Custom version",
		}

		versionPrompt := promptui.Select{
			Label: "Select Kubernetes version",
			Items: versions,
			Templates: &promptui.SelectTemplates{
				Label:    "{{ . }}?",
				Active:   "\U00002192 {{ . | cyan }}",
				Inactive: "  {{ . | white }}",
				Selected: "\U00002713 {{ . | green }}",
			},
		}

		versionIndex, _, err := versionPrompt.Run()
		if err != nil {
			return nil, fmt.Errorf("failed to select Kubernetes version: %w", err)
		}

		if versionIndex == len(versions)-1 {
			// Custom version
			customPrompt := promptui.Prompt{
				Label: "Enter custom Kubernetes version",
				Validate: func(input string) error {
					if len(input) < 1 {
						return fmt.Errorf("version cannot be empty")
					}
					return nil
				},
			}

			version, err := customPrompt.Run()
			if err != nil {
				return nil, fmt.Errorf("failed to get custom version: %w", err)
			}
			config.KubernetesVersion = version
		} else {
			// Extract version from selection
			config.KubernetesVersion = versions[versionIndex][:strings.Index(versions[versionIndex], " ")]
		}
	}

	// Step 4: Node count (for local clusters)
	if config.Type == cluster.ClusterTypeK3d || config.Type == cluster.ClusterTypeKind {
		nodePrompt := promptui.Prompt{
			Label:   "Number of worker nodes",
			Default: "2",
			Validate: func(input string) error {
				if count, err := strconv.Atoi(input); err != nil || count < 0 || count > 10 {
					return fmt.Errorf("node count must be a number between 0 and 10")
				}
				return nil
			},
		}

		nodeStr, err := nodePrompt.Run()
		if err != nil {
			return nil, fmt.Errorf("failed to get node count: %w", err)
		}

		config.NodeCount, _ = strconv.Atoi(nodeStr)
		config.NodeCount++ // Add 1 for control plane
	}

	// Step 5: Deployment mode
	deploymentModes := []string{"Local Development", "Production-like", "Minimal"}
	modePrompt := promptui.Select{
		Label: "Select deployment mode",
		Items: deploymentModes,
		Templates: &promptui.SelectTemplates{
			Label:    "{{ . }}?",
			Active:   "\U00002192 {{ . | cyan }}",
			Inactive: "  {{ . | white }}",
			Selected: "\U00002713 {{ . | green }}",
			Details: `
--------- Deployment Mode Details ----------
{{ "Local Development:" | faint }} Development-focused setup with hot reload, debugging tools
{{ "Production-like:" | faint }} Production-similar setup with monitoring, logging, security
{{ "Minimal:" | faint }} Basic setup with core services only`,
		},
	}

	modeIndex, _, err := modePrompt.Run()
	if err != nil {
		return nil, fmt.Errorf("failed to select deployment mode: %w", err)
	}
	config.DeploymentMode = deploymentModes[modeIndex]

	// Step 6: Component selection
	components := []ComponentChoice{
		{Name: "ArgoCD", Description: "GitOps continuous delivery", Default: true},
		{Name: "Monitoring", Description: "Prometheus, Grafana, Loki", Default: config.DeploymentMode != "Minimal"},
		{Name: "OpenFrame API", Description: "Core OpenFrame API service", Default: true},
		{Name: "OpenFrame UI", Description: "Web interface", Default: true},
		{Name: "External Tools", Description: "MeshCentral, Tactical RMM, Fleet MDM", Default: config.DeploymentMode == "Production-like"},
		{Name: "Developer Tools", Description: "Telepresence, Skaffold integration", Default: config.DeploymentMode == "Local Development"},
	}

	fmt.Println("\nSelect components to install:")
	for _, component := range components {
		confirmPrompt := promptui.Prompt{
			Label:     fmt.Sprintf("Install %s (%s)", component.Name, component.Description),
			IsConfirm: true,
			Default:   boolToString(component.Default),
		}

		result, err := confirmPrompt.Run()
		if err != nil && err != promptui.ErrAbort {
			return nil, fmt.Errorf("failed to get component choice: %w", err)
		}

		config.EnableComponents[component.Name] = (err != promptui.ErrAbort && (result == "y" || result == "Y"))
	}

	return config, nil
}

// ComponentChoice represents a component that can be installed
type ComponentChoice struct {
	Name        string
	Description string
	Default     bool
}

// boolToString converts boolean to y/N format
func boolToString(b bool) string {
	if b {
		return "y"
	}
	return "N"
}

// ConfirmAction prompts the user to confirm an action
func ConfirmAction(message string) (bool, error) {
	prompt := promptui.Prompt{
		Label:     message,
		IsConfirm: true,
		Default:   "y",
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

// SelectFromList prompts the user to select from a list of options
func SelectFromList(label string, items []string) (int, string, error) {
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

// GetInput prompts the user for text input
func GetInput(label, defaultValue string, validate func(string) error) (string, error) {
	prompt := promptui.Prompt{
		Label:    label,
		Default:  defaultValue,
		Validate: validate,
	}

	return prompt.Run()
}

package ui

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/flamingo/openframe-cli/internal/cluster/domain"
	"github.com/manifoldco/promptui"
	"github.com/pterm/pterm"
)

// Use domain types for consistency - no duplicate definitions needed
type ClusterType = domain.ClusterType
type ClusterInfo = domain.ClusterInfo

// Re-export domain constants for UI convenience
const (
	ClusterTypeK3d = domain.ClusterTypeK3d
	ClusterTypeGKE = domain.ClusterTypeGKE
	ClusterTypeEKS = domain.ClusterTypeEKS
)

// UI should not depend on business logic interfaces
// Business logic functions will be injected as simple parameters

// ClusterConfiguration holds the configuration choices made by the user
type ClusterConfiguration struct {
	Name              string
	Type              ClusterType
	KubernetesVersion string
	NodeCount         int
}

// ClusterWizard runs the interactive cluster configuration wizard
func ClusterWizard() (*ClusterConfiguration, error) {
	config := &ClusterConfiguration{}

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
	clusterTypes := []string{"K3d (Local)", "GKE (cloud)"}
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
		config.Type = ClusterTypeK3d
		// case 1:
		// 	config.Type = ClusterTypeGKE
	}

	// Step 3: Kubernetes version (for local clusters)
	if config.Type == ClusterTypeK3d {
		versions := []string{
			"v1.33.0-k3s1 (Latest)",
			"v1.32.0-k3s1",
			"v1.31.0-k3s1",
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
		// Extract version from selection
		config.KubernetesVersion = versions[versionIndex][:strings.Index(versions[versionIndex], " ")]
	}

	// Step 4: Node count (for local clusters)
	if config.Type == ClusterTypeK3d {
		nodePrompt := promptui.Prompt{
			Label:   "Number of worker nodes",
			Default: "3",
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

	return config, nil
}

// ComponentChoice represents a component that can be installed
type ComponentChoice struct {
	Name        string
	Description string
	Default     bool
}

// SelectClusterByName allows user to interactively select from available clusters by name
// Takes pre-fetched cluster list instead of manager to separate UI from business logic
func SelectClusterByName(clusters []ClusterInfo, prompt string) (string, error) {
	if len(clusters) == 0 {
		pterm.Warning.Println("No clusters found")
		return "", nil
	}

	clusterNames := make([]string, 0, len(clusters))
	for _, cl := range clusters {
		clusterNames = append(clusterNames, cl.Name)
	}

	if len(clusterNames) == 0 {
		pterm.Warning.Println("No clusters available")
		return "", nil
	}

	selectedIndex, _, err := selectFromList(prompt, clusterNames)
	if err != nil {
		return "", err
	}

	return clusterNames[selectedIndex], nil
}

// HandleClusterSelection handles the common pattern of getting cluster name from args or interactive selection
// Takes pre-fetched cluster list to separate UI from business logic
func HandleClusterSelection(clusters []ClusterInfo, args []string, prompt string) (string, error) {
	if len(args) > 0 {
		clusterName := strings.TrimSpace(args[0])
		if clusterName == "" {
			return "", fmt.Errorf("cluster name cannot be empty")
		}
		return clusterName, nil
	}

	return SelectClusterByName(clusters, prompt)
}

// selectFromList shows a selection prompt for a list of items
func selectFromList(prompt string, items []string) (int, string, error) {
	selectPrompt := promptui.Select{
		Label: prompt,
		Items: items,
		Templates: &promptui.SelectTemplates{
			Label:    "{{ . }}?",
			Active:   "\U00002192 {{ . | cyan }}",
			Inactive: "  {{ . | white }}",
			Selected: "\U00002713 {{ . | green }}",
		},
	}

	index, result, err := selectPrompt.Run()
	return index, result, err
}

// ConfirmClusterDeletion asks for user confirmation before cluster deletion
func ConfirmClusterDeletion(clusterName string, force bool) (bool, error) {
	if force {
		return true, nil
	}
	
	return confirmAction(fmt.Sprintf(
		"Are you sure you want to delete cluster '%s'? This action cannot be undone", 
		clusterName,
	))
}

// ShowClusterOperationCancelled displays a consistent cancellation message for cluster operations
func ShowClusterOperationCancelled() {
	pterm.Info.Println("No cluster selected. Operation cancelled.")
}

// FormatClusterSuccessMessage formats a success message with cluster info
func FormatClusterSuccessMessage(clusterName string, clusterType string, status string) string {
	return pterm.Sprintf("Cluster: %s\nType: %s\nStatus: %s", 
		pterm.Green(clusterName), 
		pterm.Blue(clusterType), 
		pterm.Green(status))
}

// confirmAction shows a confirmation prompt
func confirmAction(message string) (bool, error) {
	confirmPrompt := promptui.Prompt{
		Label:     message,
		IsConfirm: true,
	}

	_, err := confirmPrompt.Run()
	if err != nil {
		if err == promptui.ErrAbort {
			return false, nil
		}
		return false, err
	}

	return true, nil
}
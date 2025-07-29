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
		config.Type = cluster.ClusterTypeK3d
		// case 1:
		// 	config.Type = cluster.ClusterTypeGKE
	}

	// Step 3: Kubernetes version (for local clusters)
	if config.Type == cluster.ClusterTypeK3d {
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
	if config.Type == cluster.ClusterTypeK3d {
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
		Label:     message + " (Y/n)",
		IsConfirm: false,
		Default:   "Y",
		Validate: func(input string) error {
			input = strings.ToLower(strings.TrimSpace(input))
			if input == "" || input == "y" || input == "yes" || input == "n" || input == "no" {
				return nil
			}
			return fmt.Errorf("please enter Y/y/yes or N/n/no")
		},
	}

	result, err := prompt.Run()
	if err != nil {
		if err == promptui.ErrAbort {
			return false, nil
		}
		return false, err
	}

	result = strings.ToLower(strings.TrimSpace(result))
	return result == "" || result == "y" || result == "yes", nil
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

package ui

import (
	"strconv"
	"strings"

	"github.com/flamingo-stack/openframe/openframe/internal/cluster/models"
	sharedUI "github.com/flamingo-stack/openframe/openframe/internal/shared/ui"
	"github.com/manifoldco/promptui"
	"github.com/pterm/pterm"
)

// WizardSteps contains individual wizard step implementations
type WizardSteps struct{}

// NewWizardSteps creates a new wizard steps handler
func NewWizardSteps() *WizardSteps {
	return &WizardSteps{}
}

// PromptClusterName prompts for cluster name with validation
func (ws *WizardSteps) PromptClusterName(defaultName string) (string, error) {
	prompt := promptui.Prompt{
		Label:   "Cluster Name",
		Default: defaultName,
		Validate: func(input string) error {
			// First check if empty
			if err := sharedUI.ValidateNonEmpty("cluster name")(input); err != nil {
				return err
			}
			// Then validate with domain rules
			return models.ValidateClusterName(strings.TrimSpace(input))
		},
	}

	result, err := prompt.Run()
	if err != nil {
		return "", err
	}

	return strings.TrimSpace(result), nil
}

// PromptClusterType prompts for cluster type selection
func (ws *WizardSteps) PromptClusterType() (models.ClusterType, error) {
	prompt := promptui.Select{
		Label: "Cluster Type",
		Items: []string{"k3d (Recommended for local development)", "gke (Google Kubernetes Engine - Coming Soon)"},
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

	switch idx {
	case 0:
		return models.ClusterTypeK3d, nil
	case 1:
		return models.ClusterTypeGKE, nil
	default:
		return models.ClusterTypeK3d, nil
	}
}

// PromptNodeCount prompts for number of worker nodes
func (ws *WizardSteps) PromptNodeCount(defaultCount int) (int, error) {
	prompt := promptui.Prompt{
		Label:    "Number of Worker Nodes",
		Default:  strconv.Itoa(defaultCount),
		Validate: sharedUI.ValidateIntRange(1, 10, "node count"),
	}

	result, err := prompt.Run()
	if err != nil {
		return 0, err
	}

	count, _ := strconv.Atoi(result)
	return count, nil
}

// PromptK8sVersion prompts for Kubernetes version selection
func (ws *WizardSteps) PromptK8sVersion() (string, error) {
	versions := []string{
		"latest",
		"v1.31.5-k3s1",
		"v1.30.9-k3s1",
	}

	prompt := promptui.Select{
		Label: "Kubernetes Version",
		Items: versions,
		Templates: &promptui.SelectTemplates{
			Label:    "{{ . }}:",
			Active:   "→ {{ . | cyan }}",
			Inactive: "  {{ . }}",
			Selected: "{{ . | green }}",
		},
	}

	_, result, err := prompt.Run()
	if err != nil {
		return "", err
	}

	return result, nil
}

// ConfirmConfiguration shows configuration summary and asks for confirmation
func (ws *WizardSteps) ConfirmConfiguration(config models.ClusterConfig) (bool, error) {
	// Display configuration summary using common UI
	data := [][]string{
		{"Setting", "Value"},
		{"Cluster Name", config.Name},
		{"Cluster Type", string(config.Type)},
		{"Node Count", strconv.Itoa(config.NodeCount)},
		{"Kubernetes Version", config.K8sVersion},
	}

	// Use pterm for consistent styling
	if err := renderConfigurationTable(data); err != nil {
		// Fallback to simple display
		for i, row := range data {
			if i == 0 {
				continue // Skip header
			}
			println(row[0] + ": " + row[1])
		}
	}

	prompt := promptui.Select{
		Label: "Create cluster with this configuration?",
		Items: []string{"Yes, create the cluster", "No, go back and modify"},
		Templates: &promptui.SelectTemplates{
			Label:    "{{ . }}:",
			Active:   "→ {{ . | cyan }}",
			Inactive: "  {{ . }}",
			Selected: "{{ . | green }}",
		},
	}

	idx, _, err := prompt.Run()
	if err != nil {
		return false, err
	}

	return idx == 0, nil
}

// renderConfigurationTable renders the configuration table with fallback
func renderConfigurationTable(data [][]string) error {
	pterm.Println()
	pterm.Info.Printf("Configuration Summary\n")

	// Convert to pterm.TableData
	tableData := make(pterm.TableData, len(data))
	for i, row := range data {
		// Make a copy to avoid potential slice sharing issues
		rowCopy := make([]string, len(row))
		copy(rowCopy, row)
		tableData[i] = rowCopy
	}

	return pterm.DefaultTable.WithHasHeader().WithData(tableData).Render()
}

package cluster

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/flamingo/openframe-cli/internal/cluster"
	"github.com/manifoldco/promptui"
	"github.com/pterm/pterm"
)

// ConfigWizard provides interactive configuration for cluster creation
type ConfigWizard struct {
	config cluster.ClusterConfig
}

// NewConfigWizard creates a new configuration wizard
func NewConfigWizard() *ConfigWizard {
	return &ConfigWizard{
		config: cluster.ClusterConfig{
			Name:       "openframe-dev",
			Type:       cluster.ClusterTypeK3d,
			NodeCount:  3,
			K8sVersion: "latest",
		},
	}
}

// Run starts the interactive configuration wizard
func (w *ConfigWizard) Run() (cluster.ClusterConfig, error) {
	pterm.Info.Println("🚀 Cluster Configuration Wizard")
	pterm.Info.Println("Configure your new Kubernetes cluster step by step")
	pterm.Println()

	// Cluster name
	if err := w.promptClusterName(); err != nil {
		return cluster.ClusterConfig{}, err
	}

	// Cluster type
	if err := w.promptClusterType(); err != nil {
		return cluster.ClusterConfig{}, err
	}

	// Node count
	if err := w.promptNodeCount(); err != nil {
		return cluster.ClusterConfig{}, err
	}

	// Kubernetes version
	if err := w.promptK8sVersion(); err != nil {
		return cluster.ClusterConfig{}, err
	}

	// Confirmation
	if err := w.confirmConfiguration(); err != nil {
		return cluster.ClusterConfig{}, err
	}

	return w.config, nil
}

func (w *ConfigWizard) promptClusterName() error {
	prompt := promptui.Prompt{
		Label:   "Cluster Name",
		Default: w.config.Name,
		Validate: func(input string) error {
			if strings.TrimSpace(input) == "" {
				return errors.New("Cluster name cannot be empty")
			}
			return nil
		},
	}

	result, err := prompt.Run()
	if err != nil {
		return err
	}

	w.config.Name = strings.TrimSpace(result)
	return nil
}

func (w *ConfigWizard) promptClusterType() error {
	prompt := promptui.Select{
		Label: "Cluster Type",
		Items: []string{"k3d (Recommended for local development)", "gke (Google Kubernetes Engine - Coming Soon)", "eks (Amazon EKS - Coming Soon)"},
	}

	idx, _, err := prompt.Run()
	if err != nil {
		return err
	}

	switch idx {
	case 0:
		w.config.Type = cluster.ClusterTypeK3d
	case 1:
		w.config.Type = cluster.ClusterTypeGKE
	case 2:
		w.config.Type = cluster.ClusterTypeEKS
	}

	return nil
}

func (w *ConfigWizard) promptNodeCount() error {
	prompt := promptui.Prompt{
		Label:   "Number of Worker Nodes",
		Default: strconv.Itoa(w.config.NodeCount),
		Validate: func(input string) error {
			val, err := strconv.Atoi(input)
			if err != nil {
				return errors.New("Please enter a valid number")
			}
			if val < 1 {
				return errors.New("Node count must be at least 1")
			}
			if val > 10 {
				return errors.New("Node count cannot exceed 10")
			}
			return nil
		},
	}

	result, err := prompt.Run()
	if err != nil {
		return err
	}

	w.config.NodeCount, _ = strconv.Atoi(result)
	return nil
}

func (w *ConfigWizard) promptK8sVersion() error {
	versions := []string{
		"latest",
		"v1.28.0-k3s1",
		"v1.27.4-k3s1",
		"v1.26.7-k3s1",
		"v1.25.12-k3s1",
	}

	prompt := promptui.Select{
		Label: "Kubernetes Version",
		Items: versions,
	}

	_, result, err := prompt.Run()
	if err != nil {
		return err
	}

	w.config.K8sVersion = result
	return nil
}

func (w *ConfigWizard) confirmConfiguration() error {
	pterm.Println()
	pterm.DefaultHeader.WithBackgroundStyle(pterm.NewStyle(pterm.BgBlue)).Println("Configuration Summary")
	
	data := pterm.TableData{
		{"Setting", "Value"},
		{"Cluster Name", w.config.Name},
		{"Cluster Type", string(w.config.Type)},
		{"Node Count", strconv.Itoa(w.config.NodeCount)},
		{"Kubernetes Version", w.config.K8sVersion},
	}
	
	if err := pterm.DefaultTable.WithHasHeader().WithData(data).Render(); err != nil {
		return err
	}

	pterm.Println()
	
	prompt := promptui.Select{
		Label: "Create cluster with this configuration?",
		Items: []string{"Yes, create the cluster", "No, go back and modify"},
	}

	idx, _, err := prompt.Run()
	if err != nil {
		return err
	}

	if idx != 0 {
		// User wants to modify - restart wizard
		_, err := w.Run()
		return err
	}

	return nil
}

// SelectCluster provides interactive cluster selection
func SelectCluster(clusters []cluster.ClusterInfo, message string) (cluster.ClusterInfo, error) {
	if len(clusters) == 0 {
		return cluster.ClusterInfo{}, errors.New("No clusters found")
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
			Active:   "▶ {{ . | cyan }}",
			Inactive: "  {{ . }}",
		},
	}

	idx, _, err := prompt.Run()
	if err != nil {
		return cluster.ClusterInfo{}, err
	}

	return clusters[idx], nil
}

// formatClusterOption formats a cluster for display in selection lists
func formatClusterOption(cluster cluster.ClusterInfo) string {
	return pterm.Sprintf("%s (%s) - %s nodes, %s", 
		cluster.Name, 
		cluster.Type, 
		strconv.Itoa(cluster.NodeCount),
		cluster.Status)
}

// FormatAge formats a time duration into a human-readable age string for display
func FormatAge(createdAt time.Time) string {
	now := time.Now()
	duration := now.Sub(createdAt)
	
	if duration < time.Minute {
		return fmt.Sprintf("%ds", int(duration.Seconds()))
	} else if duration < time.Hour {
		return fmt.Sprintf("%dm", int(duration.Minutes()))
	} else if duration < 24*time.Hour {
		return fmt.Sprintf("%dh", int(duration.Hours()))
	} else {
		return fmt.Sprintf("%dd", int(duration.Hours()/24))
	}
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
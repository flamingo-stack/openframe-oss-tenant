package cmd

import (
	"context"
	"fmt"
	"io"
	"os/exec"
	"strings"

	"github.com/spf13/cobra"
)

func getStatusCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "status [NAME]",
		Short: "Show cluster status and information",
		Long: `Show detailed status information for a specific cluster.

Displays:
  • Cluster health and node status
  • Installed Helm charts
  • ArgoCD application status
  • Resource usage
  • Connectivity information`,
		Args: cobra.MaximumNArgs(1),
		RunE: runClusterStatus,
	}
}

func runClusterStatus(cmd *cobra.Command, args []string) error {
	ctx := context.Background()
	out := cmd.OutOrStdout()
	manager := createDefaultManager()

	clusterName := getClusterName(args)

	fmt.Fprintf(out, "\n# Cluster Status: %s\n\n", clusterName)

	// Determine cluster type
	clusterType, err := manager.DetectClusterType(ctx, clusterName)
	if err != nil {
		return fmt.Errorf("failed to detect cluster type: %w", err)
	}

	// Get provider and status
	provider, err := manager.GetProvider(clusterType)
	if err != nil {
		return err
	}

	status, err := provider.Status(ctx, clusterName)
	if err != nil {
		return fmt.Errorf("failed to get cluster status: %w", err)
	}

	// Display status information in table format
	fmt.Fprintf(out, "Property | Value\n")
	fmt.Fprintf(out, "Name     | %s\n", status.Name)
	fmt.Fprintf(out, "Type     | %s\n", string(status.Type))
	fmt.Fprintf(out, "Status   | %s\n", status.Status)
	fmt.Fprintf(out, "Nodes    | %d\n", len(status.Nodes))

	// Show node details
	if len(status.Nodes) > 0 {
		fmt.Fprintf(out, "\n INFO  \n")
		fmt.Fprintf(out, "       Node Details:\n")
		fmt.Fprintf(out, "%-40s | %-13s | %-10s | %s\n", "Name", "Role", "Status", "Age")
		fmt.Fprintf(out, "%s\n", strings.Repeat("-", 80))

		for _, node := range status.Nodes {
			fmt.Fprintf(out, "%-40s | %-13s | %-10s | %s\n",
				node.Name,
				node.Role,
				node.Status,
				node.Age,
			)
		}
	}

	// Check for running applications
	fmt.Fprintf(out, "\n INFO  \n")
	fmt.Fprintf(out, "       Installed Applications:\n")
	if err := showInstalledApps(ctx, out); err != nil {
		fmt.Fprintf(out, " WARNING  Failed to get installed applications: %v\n", err)
	}

	return nil
}

func showInstalledApps(ctx context.Context, out io.Writer) error {
	// Check for Helm releases
	cmd := exec.CommandContext(ctx, "helm", "list", "--all-namespaces", "--output", "table")
	output, err := cmd.Output()
	if err != nil {
		return err
	}

	if strings.TrimSpace(string(output)) == "" {
		fmt.Fprintf(out, "No Helm releases found\n")
		return nil
	}

	fmt.Fprintf(out, "%s", string(output))
	return nil
}
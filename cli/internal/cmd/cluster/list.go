package cluster

import (
	"context"
	"fmt"

	uiCluster "github.com/flamingo/openframe-cli/internal/ui/cluster"
	"github.com/flamingo/openframe-cli/internal/ui/common"
	"github.com/pterm/pterm"
	"github.com/spf13/cobra"
	"github.com/flamingo/openframe-cli/internal/factory"
)

func getListCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "list",
		Short: "List all Kubernetes clusters",
		Long: `List - List all Kubernetes clusters managed by OpenFrame CLI

Displays comprehensive cluster information including cluster name, type, status,
node count, and other relevant details for all managed clusters.

The command will list clusters from all registered providers (k3d, GKE, EKS, etc.)
and display them in a formatted table for easy viewing.

Examples:
  # List all clusters
  openframe cluster list

  # List clusters with verbose output
  openframe cluster list --verbose

  # List clusters in quiet mode (names only)
  openframe cluster list --silent`,
		RunE: runListClusters,
	}

	// Add flags
	cmd.Flags().BoolP("quiet", "q", false, "Only show cluster names")
	
	return cmd
}

func runListClusters(cmd *cobra.Command, args []string) error {
	// Show OpenFrame logo
	common.ShowLogo()

	ctx := context.Background()
	manager := factory.CreateDefaultClusterManager()

	// Get flag values
	quiet, _ := cmd.Flags().GetBool("quiet")

	// Get all clusters
	clusters, err := manager.ListAllClusters(ctx)
	if err != nil {
		return fmt.Errorf("failed to list clusters: %w", err)
	}

	if len(clusters) == 0 {
		if quiet {
			// In quiet mode, just exit silently if no clusters
			return nil
		}
		pterm.Info.Println("No clusters found.")
		pterm.Println()
		pterm.Println("To create a new cluster, run:")
		pterm.Printf("  %s\n", pterm.Green("openframe cluster create"))
		return nil
	}

	if quiet {
		// In quiet mode, only show cluster names
		for _, cluster := range clusters {
			fmt.Println(cluster.Name)
		}
		return nil
	}

	// Display clusters in a formatted table
	pterm.DefaultSection.Printf("Found %d cluster(s)", len(clusters))

	// Create table data
	tableData := pterm.TableData{
		{"NAME", "TYPE", "STATUS", "NODES", "AGE"},
	}

	for _, cluster := range clusters {
		// Calculate age (if CreatedAt is available)
		age := "unknown"
		if !cluster.CreatedAt.IsZero() {
			age = uiCluster.FormatAge(cluster.CreatedAt)
		}

		// Color status based on value
		statusColor := pterm.Green
		switch cluster.Status {
		case "Running":
			statusColor = pterm.Green
		case "Stopped", "Not Ready":
			statusColor = pterm.Yellow
		case "Error", "Failed":
			statusColor = pterm.Red
		default:
			statusColor = pterm.Gray
		}

		tableData = append(tableData, []string{
			pterm.Blue(cluster.Name),
			pterm.Cyan(string(cluster.Type)),
			statusColor(cluster.Status),
			pterm.Gray(fmt.Sprintf("%d", len(cluster.Nodes))),
			pterm.Gray(age),
		})
	}

	// Render the table
	if err := pterm.DefaultTable.WithHasHeader().WithData(tableData).Render(); err != nil {
		// Fallback to simple output if table rendering fails
		fmt.Printf("%-20s %-10s %-12s %-8s %-10s\n", "NAME", "TYPE", "STATUS", "NODES", "AGE")
		fmt.Println("──────────────────────────────────────────────────────────────────")
		for _, cluster := range clusters {
			age := "unknown"
			if !cluster.CreatedAt.IsZero() {
				age = uiCluster.FormatAge(cluster.CreatedAt)
			}
			fmt.Printf("%-20s %-10s %-12s %-8d %-10s\n",
				cluster.Name,
				cluster.Type,
				cluster.Status,
				len(cluster.Nodes),
				age)
		}
	}

	// Show additional info if verbose
	if verbose {
		pterm.Println()
		pterm.Info.Println("Use 'openframe cluster status <name>' for detailed cluster information")
	}

	return nil
}


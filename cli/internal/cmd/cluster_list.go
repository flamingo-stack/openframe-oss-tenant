package cmd

import (
	"context"
	"fmt"

	"github.com/spf13/cobra"
)

func getListCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "list",
		Short: "List all managed clusters",
		Long: `List all Kubernetes clusters managed by OpenFrame CLI.

Displays cluster information including:
  • Cluster name and type
  • Current status
  • Node count and versions
  • Created date`,
		RunE: runListClusters,
	}
}

func runListClusters(cmd *cobra.Command, args []string) error {
	ctx := context.Background()
	manager := createDefaultManager()

	clusters, err := manager.ListAllClusters(ctx)
	if err != nil {
		return fmt.Errorf("failed to list clusters: %w", err)
	}

	if len(clusters) == 0 {
		fmt.Println("No clusters found.")
		return nil
	}

	fmt.Printf("%-20s %-10s %-10s %-15s\n", "NAME", "TYPE", "STATUS", "NODES")
	fmt.Println("────────────────────────────────────────────────────────────")

	for _, cluster := range clusters {
		fmt.Printf("%-20s %-10s %-10s %-15d\n",
			cluster.Name,
			cluster.Type,
			cluster.Status,
			len(cluster.Nodes))
	}

	return nil
}
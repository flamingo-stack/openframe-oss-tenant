package services

import (
	chartUI "github.com/flamingo-stack/openframe/openframe/internal/chart/ui"
	"github.com/flamingo-stack/openframe/openframe/internal/chart/utils/types"
	"github.com/pterm/pterm"
)

// ClusterSelector handles cluster selection logic for chart operations
type ClusterSelector struct {
	clusterService types.ClusterLister
	operationsUI   *chartUI.OperationsUI
}

// NewClusterSelector creates a new cluster selector
func NewClusterSelector(clusterService types.ClusterLister, operationsUI *chartUI.OperationsUI) *ClusterSelector {
	return &ClusterSelector{
		clusterService: clusterService,
		operationsUI:   operationsUI,
	}
}

// SelectCluster manages the cluster selection process
func (c *ClusterSelector) SelectCluster(args []string, verbose bool) (string, error) {
	clusters, err := c.clusterService.ListClusters()
	if err != nil {
		if verbose {
			pterm.Error.Printf("Failed to list clusters: %v\n", err)
		}
		c.operationsUI.ShowNoClusterMessage()
		return "", nil
	}

	if len(clusters) == 0 {
		if verbose {
			pterm.Info.Printf("Found 0 clusters\n")
		}
		c.operationsUI.ShowNoClusterMessage()
		return "", nil
	}

	if verbose {
		pterm.Info.Printf("Found %d clusters\n", len(clusters))
		for _, cluster := range clusters {
			pterm.Info.Printf("  - %s (%s)\n", cluster.Name, cluster.Status)
		}
	}

	return c.operationsUI.SelectClusterForInstall(clusters, args)
}

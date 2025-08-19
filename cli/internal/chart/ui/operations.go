package ui

import (
	"fmt"
	"strings"

	"github.com/flamingo/openframe/internal/cluster/models"
	sharedUI "github.com/flamingo/openframe/internal/shared/ui"
	"github.com/pterm/pterm"
)

// OperationsUI provides user-friendly interfaces for chart operations
type OperationsUI struct{}

// NewOperationsUI creates a new chart operations UI service
func NewOperationsUI() *OperationsUI {
	return &OperationsUI{}
}

// SelectClusterForInstall handles cluster selection for chart installation
func (ui *OperationsUI) SelectClusterForInstall(clusters []models.ClusterInfo, args []string) (string, error) {
	// If cluster name provided as argument, validate and use it
	if len(args) > 0 {
		clusterName := strings.TrimSpace(args[0])
		if clusterName == "" {
			return "", fmt.Errorf("cluster name cannot be empty")
		}

		// Validate that the cluster exists
		for _, cluster := range clusters {
			if cluster.Name == clusterName {
				return clusterName, nil
			}
		}
		return "", fmt.Errorf("cluster '%s' not found", clusterName)
	}

	// Always use interactive selection (even for single cluster) to match deletion behavior
	clusterNames := make([]string, len(clusters))
	for i, cluster := range clusters {
		clusterNames[i] = cluster.Name
	}

	_, selectedCluster, err := sharedUI.SelectFromList("Select cluster for chart installation", clusterNames)
	if err != nil {
		return "", fmt.Errorf("cluster selection failed: %w", err)
	}

	if selectedCluster == "" {
		ui.ShowOperationCancelled("chart installation")
		return "", nil
	}

	return selectedCluster, nil
}

// ShowOperationCancelled displays a consistent cancellation message for chart operations
func (ui *OperationsUI) ShowOperationCancelled(operation string) {
	pterm.Info.Printf("No cluster selected. %s cancelled.\n", strings.Title(operation))
}

// ShowNoClusterMessage displays a friendly message when no clusters are available
func (ui *OperationsUI) ShowNoClusterMessage() {
	pterm.Error.Println("No clusters found. Create a cluster first with: openframe cluster create")
}

// ConfirmInstallation asks for user confirmation before starting chart installation
func (ui *OperationsUI) ConfirmInstallation(clusterName string) (bool, error) {
	message := fmt.Sprintf("Are you sure you want to install OpenFrame chart on '%s'? It could take up to 30 minutes", pterm.Cyan(clusterName))
	return sharedUI.ConfirmActionInteractive(message, false)
}

// ShowInstallationStart displays a message when starting chart installation
func (ui *OperationsUI) ShowInstallationStart(clusterName string) {
	pterm.Info.Printf("📦 Starting chart installation on cluster: %s\n", pterm.Cyan(clusterName))
}

// ShowInstallationComplete displays a success message after chart installation
func (ui *OperationsUI) ShowInstallationComplete() {
	pterm.Success.Println("✅ Chart installation completed successfully!")
	fmt.Println()
	pterm.Info.Println("🚀 Next Steps:")
	pterm.Printf("  1. Check ArgoCD UI:     kubectl port-forward svc/argo-cd-server -n argocd 8080:443\n")
	pterm.Printf("  2. Get ArgoCD password: kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath={.data.password} | base64 -d\n")
	pterm.Printf("  3. View applications:   kubectl get applications -n argocd\n")
}

// ShowInstallationError displays an error message for chart installation failures
func (ui *OperationsUI) ShowInstallationError(err error) {
	pterm.Error.Printf("❌ Chart installation failed: %v\n", err)
	fmt.Println()
	pterm.Info.Println("🔧 Troubleshooting steps:")
	pterm.Printf("  1. Check cluster status: kubectl get nodes\n")
	pterm.Printf("  2. Check helm repos:     helm repo list\n")
	pterm.Printf("  3. Check disk space:     df -h\n")
	pterm.Printf("  4. Check logs:           kubectl logs -n argocd -l app.kubernetes.io/name=argocd-server\n")
}
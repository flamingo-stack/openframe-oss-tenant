package cluster

import (
	"context"
	"fmt"
	"os/exec"
	"strings"

	"github.com/flamingo/openframe-cli/internal/cluster"
	clusterUtils "github.com/flamingo/openframe-cli/internal/cluster/utils"
	"github.com/flamingo/openframe-cli/internal/ui/common"
	uiCluster "github.com/flamingo/openframe-cli/internal/ui/cluster"
	"github.com/pterm/pterm"
	"github.com/spf13/cobra"
)

func getStatusCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "status [NAME]",
		Short: "Show detailed cluster status and information",
		Long: `Show detailed status information for a Kubernetes cluster.

Displays cluster health, node status, installed applications,
resource usage, and connectivity information.

Examples:
  openframe cluster status my-cluster
  openframe cluster status  # interactive selection
  openframe cluster status my-cluster --detailed`,
		Args: cobra.MaximumNArgs(1),
		RunE: runClusterStatus,
	}

	// Add flags
	cmd.Flags().BoolP("detailed", "d", false, "Show detailed resource information")
	cmd.Flags().Bool("no-apps", false, "Skip application status checking")
	
	return cmd
}

func runClusterStatus(cmd *cobra.Command, args []string) error {
	// Show OpenFrame logo
	common.ShowLogo()

	ctx, manager := createManager()

	// Get flag values
	detailed, _ := cmd.Flags().GetBool("detailed")
	skipApps, _ := cmd.Flags().GetBool("no-apps")

	selection, err := clusterUtils.HandleClusterSelectionWithType(ctx, manager, args, "Select a cluster to check status:")
	if err != nil {
		return err
	}
	if selection.Name == "" {
		clusterUtils.ShowClusterOperationCancelled()
		return nil
	}

	clusterName := selection.Name
	clusterType := selection.Type

	// Get provider and status
	provider, err := manager.GetProvider(clusterType)
	if err != nil {
		return fmt.Errorf("failed to get provider for cluster type '%s': %w", clusterType, err)
	}

	pterm.DefaultSection.Printf("Cluster Status: %s", clusterName)

	spinner, _ := pterm.DefaultSpinner.Start("Gathering cluster information...")

	status, err := provider.Status(ctx, clusterName)
	if err != nil {
		spinner.Fail("Failed to get cluster status")
		return fmt.Errorf("failed to get cluster status: %w", err)
	}

	spinner.Success("Cluster information retrieved")

	// Display cluster overview
	pterm.DefaultSection.Println("Overview")
	
	// Create overview table
	overviewData := pterm.TableData{
		{"Property", "Value"},
		{"Name", pterm.Blue(status.Name)},
		{"Type", pterm.Cyan(string(status.Type))},
		{"Status", uiCluster.GetStatusColor(status.Status)(status.Status)},
		{"Nodes", pterm.Gray(fmt.Sprintf("%d", len(status.Nodes)))},
	}

	if !status.CreatedAt.IsZero() {
		age := uiCluster.FormatAge(status.CreatedAt)
		overviewData = append(overviewData, []string{"Age", pterm.Gray(age)})
	}

	uiCluster.RenderOverviewTable(overviewData)

	// Show node details
	if len(status.Nodes) > 0 {
		pterm.Println()
		pterm.DefaultSection.Println("Node Details")
		
		nodeData := pterm.TableData{
			{"NAME", "ROLE", "STATUS", "AGE"},
		}

		for _, node := range status.Nodes {
			nodeData = append(nodeData, []string{
				pterm.Blue(node.Name),
				pterm.Cyan(node.Role),
				uiCluster.GetStatusColor(node.Status)(node.Status),
				pterm.Gray(node.Age),
			})
		}

		if err := pterm.DefaultTable.WithHasHeader().WithData(nodeData).Render(); err != nil {
			// Fallback to simple output
			fmt.Printf("%-40s | %-13s | %-10s | %s\n", "NAME", "ROLE", "STATUS", "AGE")
			fmt.Println(strings.Repeat("-", 80))
			for _, node := range status.Nodes {
				fmt.Printf("%-40s | %-13s | %-10s | %s\n",
					node.Name, node.Role, node.Status, node.Age)
			}
		}
	}

	// Show applications if not skipped
	if !skipApps {
		pterm.Println()
		pterm.DefaultSection.Println("Installed Applications")
		
		if err := showInstalledApps(ctx, clusterName, detailed); err != nil {
			pterm.Warning.Printf("Failed to get installed applications: %v\n", err)
		}
	}

	// Show detailed resource information if requested
	if detailed {
		pterm.Println()
		pterm.DefaultSection.Println("Resource Information")
		if err := showResourceInfo(ctx, clusterName); err != nil {
			pterm.Warning.Printf("Failed to get resource information: %v\n", err)
		}
	}

	// Show kubeconfig information
	pterm.Println()
	pterm.DefaultSection.Println("Access Information")
	if kubeconfig, err := provider.GetKubeconfig(ctx, clusterName); err == nil && kubeconfig != "" {
		contextName := cluster.GetKubeContext(clusterName)
		pterm.Printf("• Kubeconfig available for cluster access\n")
		pterm.Printf("• Context: %s\n", pterm.Green(contextName))
		if globalFlags.Verbose {
			pterm.Printf("• Switch context: %s\n", pterm.Gray(fmt.Sprintf("kubectl config use-context %s", contextName)))
		}
	} else {
		pterm.Warning.Println("• Kubeconfig not available")
	}

	return nil
}



func showInstalledApps(ctx context.Context, clusterName string, detailed bool) error {
	// Check for Helm releases using the cluster context
	contextName := fmt.Sprintf("k3d-%s", clusterName)
	cmd := exec.CommandContext(ctx, "helm", "list", "--all-namespaces", "--kube-context", contextName)
	output, err := cmd.Output()
	if err != nil {
		pterm.Warning.Printf("Failed to check Helm releases: %v\n", err)
		return nil // Don't fail the entire status command
	}

	outputStr := strings.TrimSpace(string(output))
	if outputStr == "" {
		pterm.Info.Println("• No Helm releases found")
	} else {
		lines := strings.Split(outputStr, "\n")
		if len(lines) > 1 { // Skip header
			pterm.Printf("• Found %d Helm release(s):\n", len(lines)-1)
			if detailed {
				for _, line := range lines {
					pterm.Printf("  %s\n", pterm.Gray(line))
				}
			} else {
				// Just show count and names
				for i, line := range lines[1:] { // Skip header
					fields := strings.Fields(line)
					if len(fields) > 0 {
						pterm.Printf("  %d. %s\n", i+1, pterm.Blue(fields[0]))
					}
				}
			}
		} else {
			pterm.Info.Println("• No Helm releases found")
		}
	}

	// Check for common Kubernetes applications
	checkCommonApps(ctx, contextName)

	return nil
}

func checkCommonApps(ctx context.Context, clusterName string) {
	// Check for common system applications
	apps := []struct {
		name      string
		namespace string
		label     string
	}{
		{"ArgoCD", "argocd", "app.kubernetes.io/name=argocd-server"},
		{"Istio", "istio-system", "app=istiod"},
		{"Prometheus", "monitoring", "app.kubernetes.io/name=prometheus"},
		{"Grafana", "monitoring", "app.kubernetes.io/name=grafana"},
	}

	foundApps := []string{}
	for _, app := range apps {
		result := cluster.ExecKubectl(ctx, clusterName, "get", "pods", "-n", app.namespace, "-l", app.label, "--no-headers")
		if result.Error == nil && result.Output != "" {
			foundApps = append(foundApps, app.name)
		}
	}

	if len(foundApps) > 0 {
		pterm.Printf("• System applications: %s\n", pterm.Blue(strings.Join(foundApps, ", ")))
	}
}

func showResourceInfo(ctx context.Context, clusterName string) error {
	contextName := fmt.Sprintf("k3d-%s", clusterName)
	
	// Get node resource information
	cmd := exec.CommandContext(ctx, "kubectl", "--context", contextName, 
		"top", "nodes", "--no-headers")
	if output, err := cmd.Output(); err == nil {
		if strings.TrimSpace(string(output)) != "" {
			pterm.Println("Node Resource Usage:")
			lines := strings.Split(strings.TrimSpace(string(output)), "\n")
			for _, line := range lines {
				pterm.Printf("  %s\n", pterm.Gray(line))
			}
		}
	} else {
		pterm.Warning.Println("• Metrics server not available for resource information")
	}

	return nil
}
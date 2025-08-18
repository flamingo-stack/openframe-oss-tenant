package chart

import (
	"context"
	"fmt"

	"github.com/flamingo/openframe/internal/chart/domain"
	"github.com/flamingo/openframe/internal/chart/providers/argocd"
	"github.com/flamingo/openframe/internal/chart/providers/helm"
	chartUI "github.com/flamingo/openframe/internal/chart/ui"
	"github.com/flamingo/openframe/internal/cluster"
	"github.com/flamingo/openframe/internal/shared/executor"
	"github.com/pterm/pterm"
)

// ChartService provides chart management operations
type ChartService struct {
	helmManager    *helm.HelmManager
	argoCDManager  *argocd.Manager
	clusterService ClusterLister
	displayService *chartUI.DisplayService
	executor       executor.CommandExecutor
}

// NewChartService creates a new chart service
func NewChartService(exec executor.CommandExecutor) *ChartService {
	return &ChartService{
		helmManager:    helm.NewHelmManager(exec),
		argoCDManager:  argocd.NewManager(exec),
		clusterService: cluster.NewClusterService(exec),
		displayService: chartUI.NewDisplayService(),
		executor:       exec,
	}
}

// NewChartServiceWithClusterService creates a chart service with custom cluster service
func NewChartServiceWithClusterService(exec executor.CommandExecutor, clusterService ClusterLister) *ChartService {
	return &ChartService{
		helmManager:    helm.NewHelmManager(exec),
		argoCDManager:  argocd.NewManager(exec),
		clusterService: clusterService,
		displayService: chartUI.NewDisplayService(),
		executor:       exec,
	}
}

// InstallCharts handles the chart installation process
func (s *ChartService) InstallCharts(config domain.ChartInstallConfig) error {
	ctx := context.Background()
	
	// Step 1: Validate cluster exists
	if err := s.validateClusterExists(config.ClusterName); err != nil {
		return err
	}
	
	// Step 2: Check Helm is installed
	s.displayService.ShowPreInstallCheck("Checking Helm installation...")
	if err := s.helmManager.IsHelmInstalled(ctx); err != nil {
		return fmt.Errorf("Helm is required but not found: %w", err)
	}
	
	// Step 3: Install ArgoCD
	if err := s.installArgoCD(ctx, config); err != nil {
		return err
	}
	
	// Step 4: Install app-of-apps
	if err := s.installAppOfApps(ctx, config); err != nil {
		return err
	}
	
	// Step 5: Wait for ArgoCD apps to be healthy and synced
	if !config.DryRun {
		if err := s.argoCDManager.WaitForApplications(ctx, config); err != nil {
			return err
		}
	}
	
	// Step 6: Show completion
	s.showInstallationComplete()
	
	return nil
}

// validateClusterExists checks if the specified cluster exists
func (s *ChartService) validateClusterExists(clusterName string) error {
	clusters, err := s.clusterService.ListClusters()
	if err != nil {
		return fmt.Errorf("failed to list clusters: %w", err)
	}
	
	if len(clusters) == 0 {
		pterm.Error.Println("No clusters found. Create a cluster first with: openframe cluster create")
		return domain.ErrClusterNotFound
	}
	
	// If no specific cluster name provided, use the first available
	if clusterName == "" {
		if len(clusters) == 1 {
			pterm.Info.Printf("Using cluster: %s\n", clusters[0].Name)
			return nil
		} else {
			pterm.Error.Println("Multiple clusters found. Please specify a cluster name:")
			for _, cluster := range clusters {
				pterm.Printf("  %s\n", cluster.Name)
			}
			return fmt.Errorf("cluster name required")
		}
	}
	
	// Validate specified cluster exists
	for _, cluster := range clusters {
		if cluster.Name == clusterName {
			pterm.Info.Printf("Using cluster: %s\n", clusterName)
			return nil
		}
	}
	
	return fmt.Errorf("cluster '%s' not found", clusterName)
}



// installArgoCD handles ArgoCD installation
func (s *ChartService) installArgoCD(ctx context.Context, config domain.ChartInstallConfig) error {
	s.displayService.ShowInstallProgress(domain.ChartTypeArgoCD, "Installing ArgoCD...")
	
	if config.DryRun {
		pterm.Info.Println("DRY RUN: Would install ArgoCD")
		return nil
	}
	
	err := s.helmManager.InstallArgoCD(ctx, config)
	if err != nil {
		s.displayService.ShowInstallError(domain.ChartTypeArgoCD, err)
		return err
	}
	
	// Get and show status
	info, _ := s.helmManager.GetChartStatus(ctx, "argo-cd", "argocd")
	s.displayService.ShowInstallSuccess(domain.ChartTypeArgoCD, info)
	
	return nil
}

// installAppOfApps handles app-of-apps installation
func (s *ChartService) installAppOfApps(ctx context.Context, config domain.ChartInstallConfig) error {
	s.displayService.ShowInstallProgress(domain.ChartTypeAppOfApps, "Installing app-of-apps...")
	
	if config.DryRun {
		pterm.Info.Println("DRY RUN: Would install app-of-apps")
		return nil
	}
	
	err := s.helmManager.InstallAppOfApps(ctx, config)
	if err != nil {
		s.displayService.ShowInstallError(domain.ChartTypeAppOfApps, err)
		return err
	}
	
	// Get and show status
	info, _ := s.helmManager.GetChartStatus(ctx, "app-of-apps", "argocd")
	s.displayService.ShowInstallSuccess(domain.ChartTypeAppOfApps, info)
	
	return nil
}


// showInstallationComplete displays completion message
func (s *ChartService) showInstallationComplete() {
	fmt.Println()
	pterm.Success.Println("🎉 Chart installation completed successfully!")
	
	fmt.Println()
	pterm.Info.Printf("Next steps:\n")
	pterm.Printf("  • Check ArgoCD: kubectl get pods -n argocd\n")
	pterm.Printf("  • Check applications: kubectl get applications -n argocd\n")
	pterm.Printf("  • Access ArgoCD UI: kubectl port-forward svc/argo-cd-server -n argocd 8080:443\n")
}
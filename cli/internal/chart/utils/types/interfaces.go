package types

import (
	"context"
	"time"

	"github.com/flamingo-stack/openframe/openframe/internal/chart/models"
	"github.com/flamingo-stack/openframe/openframe/internal/chart/providers/git"
	"github.com/flamingo-stack/openframe/openframe/internal/chart/utils/config"
	clusterDomain "github.com/flamingo-stack/openframe/openframe/internal/cluster/models"
)

// Core Service Interfaces

// ChartInstaller orchestrates the complete chart installation process
type ChartInstaller interface {
	InstallCharts(config config.ChartInstallConfig) error
}

// Provider Interfaces

// ClusterLister provides cluster listing capabilities
type ClusterLister interface {
	ListClusters() ([]clusterDomain.ClusterInfo, error)
}

// HelmProvider manages Helm chart operations
type HelmProvider interface {
	InstallArgoCD(ctx context.Context, config config.ChartInstallConfig) error
	InstallAppOfAppsFromLocal(ctx context.Context, config config.ChartInstallConfig, certFile, keyFile string) error
	IsChartInstalled(ctx context.Context, releaseName, namespace string) (bool, error)
	GetChartStatus(ctx context.Context, releaseName, namespace string) (models.ChartInfo, error)
}

// GitProvider manages Git repository operations
type GitProvider interface {
	CloneChartRepository(ctx context.Context, config *models.AppOfAppsConfig) (*git.CloneResult, error)
	Cleanup(tempDir string)
}

// Service Component Interfaces

// ArgoCDService manages ArgoCD installation and lifecycle
type ArgoCDService interface {
	Install(ctx context.Context, config config.ChartInstallConfig) error
	IsInstalled(ctx context.Context) (bool, error)
	GetStatus(ctx context.Context) (models.ChartInfo, error)
	WaitForApplications(ctx context.Context, config config.ChartInstallConfig) error
}

// AppOfAppsService manages app-of-apps installation and lifecycle
type AppOfAppsService interface {
	Install(ctx context.Context, config config.ChartInstallConfig) error
	IsInstalled(ctx context.Context, namespace string) (bool, error)
	GetStatus(ctx context.Context, namespace string) (models.ChartInfo, error)
}

// Configuration Interfaces

// ConfigBuilder constructs installation configurations
type ConfigBuilder interface {
	BuildInstallConfig(force, dryRun, verbose bool, clusterName string,
		githubRepo, githubBranch, certDir string) (config.ChartInstallConfig, error)
}

// PathResolver resolves configuration and certificate paths
type PathResolver interface {
	GetCertificateDirectory() string
	GetCertificateFiles() (certFile, keyFile string)
	GetHelmValuesFile() string
}

// UI Interfaces

// ClusterSelector provides cluster selection capabilities
type ClusterSelector interface {
	SelectCluster(clusters []clusterDomain.ClusterInfo, args []string) (string, error)
}

// OperationsUI provides user interface operations for chart management
type OperationsUI interface {
	SelectClusterForInstall(clusters []clusterDomain.ClusterInfo, args []string) (string, error)
	ShowOperationCancelled(operation string)
	ShowNoClusterMessage()
	ConfirmInstallation(clusterName string) (bool, error)
	ConfirmInstallationOnCluster(clusterName string) (bool, error)
	ShowInstallationStart(clusterName string)
	ShowInstallationComplete()
	ShowInstallationError(err error)
	PromptForGitHubCredentials(repoURL string) (username, token string, err error)
}

// Orchestration Interfaces

// ServiceOrchestrator manages the coordination of services
type ServiceOrchestrator interface {
	ExecuteInstallation(req InstallationRequest) error
}

// WorkflowExecutor executes complex workflows with step tracking
type WorkflowExecutor interface {
	Execute() *WorkflowResult
	AddStep(name, description string, execute func() error, required bool)
}

// Factory Interfaces

// ServiceFactory creates service instances with proper dependency injection
type ServiceFactory interface {
	CreateInstaller() ChartInstaller
	CreateConfigBuilder() ConfigBuilder
	CreateClusterSelector(clusterLister ClusterLister) ClusterSelector
	GetOperationsUI() OperationsUI
}

// Result Types for Orchestration

// WorkflowResult represents the result of a workflow execution
type WorkflowResult struct {
	Success     bool
	Error       error
	Steps       []StepResult
	TotalTime   time.Duration
	ClusterName string
}

// StepResult represents the result of a workflow step
type StepResult struct {
	StepName  string
	Success   bool
	Error     error
	Duration  time.Duration
	Timestamp time.Time
}

// InstallationRequest contains all parameters for chart installation
type InstallationRequest struct {
	Args           []string
	Force          bool
	DryRun         bool
	Verbose        bool
	GitHubRepo     string
	GitHubBranch   string
	CertDir        string
	DeploymentMode string // Deployment mode: "oss-tenant", "saas-tenant", "saas-shared", or empty for interactive
	NonInteractive bool   // Skip all prompts, use existing helm-values.yaml
}

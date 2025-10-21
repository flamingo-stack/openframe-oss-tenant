package ui

import (
	"fmt"

	"github.com/flamingo-stack/openframe/openframe/internal/cluster/models"
	clusterUI "github.com/flamingo-stack/openframe/openframe/internal/cluster/ui"
	"github.com/flamingo-stack/openframe/openframe/internal/shared/config"
	sharedUI "github.com/flamingo-stack/openframe/openframe/internal/shared/ui"
	"github.com/flamingo-stack/openframe/openframe/internal/shared/ui/messages"
	"github.com/pterm/pterm"
)

// OperationsUI provides user-friendly interfaces for chart operations
type OperationsUI struct {
	clusterSelector     *clusterUI.Selector
	credentialsPrompter *config.CredentialsPrompter
	messageTemplates    *messages.Templates
}

// NewOperationsUI creates a new chart operations UI service
func NewOperationsUI() *OperationsUI {
	return &OperationsUI{
		clusterSelector:     clusterUI.NewSelector("chart installation"),
		credentialsPrompter: config.NewCredentialsPrompter(),
		messageTemplates:    messages.NewTemplates(),
	}
}

// SelectClusterForInstall handles cluster selection for chart installation
func (ui *OperationsUI) SelectClusterForInstall(clusters []models.ClusterInfo, args []string) (string, error) {
	return ui.clusterSelector.SelectCluster(clusters, args)
}

// ShowOperationCancelled displays a consistent cancellation message for chart operations
func (ui *OperationsUI) ShowOperationCancelled(operation string) {
	ui.messageTemplates.ShowOperationCancelled("cluster", operation)
}

// ShowNoClusterMessage displays a friendly message when no clusters are available
func (ui *OperationsUI) ShowNoClusterMessage() {
	pterm.Error.Println("No clusters found. Create a cluster first with: openframe cluster create")
}

// ConfirmInstallation asks for user confirmation before starting chart installation
func (ui *OperationsUI) ConfirmInstallation(clusterName string) (bool, error) {
	fmt.Println() // Add blank line for better spacing
	message := fmt.Sprintf("Are you sure you want to install OpenFrame chart on '%s'? It could take up to 30 minutes", clusterName)
	return sharedUI.ConfirmActionInteractive(message, false)
}

// ConfirmInstallationOnCluster asks for user confirmation with emphasis on specific cluster
func (ui *OperationsUI) ConfirmInstallationOnCluster(clusterName string) (bool, error) {
	fmt.Println() // Add blank line for better spacing
	message := fmt.Sprintf("Are you sure you want to install OpenFrame chart on '%s'? It could take up to 30 minutes", clusterName)
	return sharedUI.ConfirmActionInteractive(message, false)
}

// ShowInstallationStart displays a message when starting chart installation
func (ui *OperationsUI) ShowInstallationStart(clusterName string) {
	ui.messageTemplates.ShowOperationStart("chart installation", clusterName)
}

// ShowInstallationComplete displays a success message after chart installation
func (ui *OperationsUI) ShowInstallationComplete() {
	nextSteps := []string{
		"Check ArgoCD UI:     kubectl port-forward svc/argo-cd-server -n argocd 8080:443",
		"Get ArgoCD password: kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath={.data.password} | base64 -d",
		"View applications:   kubectl get applications -n argocd",
	}
	ui.messageTemplates.ShowInstallationComplete("Chart", nextSteps)
}

// ShowInstallationError displays an error message for chart installation failures
func (ui *OperationsUI) ShowInstallationError(err error) {
	troubleshootingSteps := []string{
		"Check cluster status: kubectl get nodes",
		"Check helm repos:     helm repo list",
		"Check disk space:     df -h",
		"Check logs:           kubectl logs -n argocd -l app.kubernetes.io/name=argocd 8080:443",
	}
	formatter := messages.NewFormatter()
	formatter.Installation().Failed("Chart", err, troubleshootingSteps)
}

// ShowCloneProgress shows repository cloning progress
func (ui *OperationsUI) ShowCloneProgress(repoURL, branch string) {
	ui.messageTemplates.ShowInfo("downloading %s (branch: %s)", repoURL, branch)
}

// ShowCloneComplete shows cloning completion
func (ui *OperationsUI) ShowCloneComplete() {
	ui.messageTemplates.ShowSuccess("Repository clone %s", "complete")
}

// PromptForGitHubCredentials prompts the user for GitHub credentials
func (ui *OperationsUI) PromptForGitHubCredentials(repoURL string) (username, token string, err error) {
	credentials, err := ui.credentialsPrompter.PromptForGitHubCredentials(repoURL)
	if err != nil {
		return "", "", err
	}
	return credentials.Username, credentials.Token, nil
}

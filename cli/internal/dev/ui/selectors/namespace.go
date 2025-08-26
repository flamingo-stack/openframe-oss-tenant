package selectors

import (
	"context"
	"fmt"
	"sort"
	"strings"

	"github.com/flamingo/openframe/internal/dev/interfaces"
	sharedUI "github.com/flamingo/openframe/internal/shared/ui"
	"github.com/pterm/pterm"
)

// NamespaceSelector handles Kubernetes namespace selection for dev commands
type NamespaceSelector struct {
	kubernetesClient interfaces.KubernetesClient
}

// NewNamespaceSelector creates a new namespace selector
func NewNamespaceSelector(client interfaces.KubernetesClient) *NamespaceSelector {
	return &NamespaceSelector{
		kubernetesClient: client,
	}
}

// SelectNamespace handles namespace selection with support for:
// - Argument-based selection (if namespace provided)
// - Interactive selection from available namespaces
// - Default namespace fallback
func (ns *NamespaceSelector) SelectNamespace(ctx context.Context, args []string, defaultNamespace string) (string, error) {
	// If namespace provided as argument, validate and use it
	if len(args) > 0 {
		namespace := strings.TrimSpace(args[0])
		if namespace == "" {
			return "", fmt.Errorf("namespace cannot be empty")
		}

		// Validate namespace exists
		if err := ns.kubernetesClient.ValidateNamespace(ctx, namespace); err != nil {
			return "", fmt.Errorf("namespace '%s' not found: %w", namespace, err)
		}

		return namespace, nil
	}

	// Get available namespaces for interactive selection
	namespaces, err := ns.kubernetesClient.GetNamespaces(ctx)
	if err != nil {
		pterm.Warning.Printf("Could not list namespaces: %v\n", err)
		
		// Ask user if they want to use default namespace
		useDefault, confirmErr := sharedUI.ConfirmAction(
			fmt.Sprintf("Use default namespace '%s'?", defaultNamespace))
		if confirmErr != nil {
			return "", fmt.Errorf("confirmation failed: %w", confirmErr)
		}
		
		if useDefault {
			return defaultNamespace, nil
		}
		
		// Let user input namespace manually
		return ns.promptForManualNamespace(ctx)
	}

	// Filter out system namespaces for cleaner selection
	filteredNamespaces := ns.filterNamespaces(namespaces)
	
	if len(filteredNamespaces) == 0 {
		pterm.Warning.Println("No user namespaces found")
		
		// Ask if they want to use default
		useDefault, err := sharedUI.ConfirmAction(
			fmt.Sprintf("Use default namespace '%s'?", defaultNamespace))
		if err != nil {
			return "", fmt.Errorf("confirmation failed: %w", err)
		}
		
		if useDefault {
			return defaultNamespace, nil
		}
		
		return ns.promptForManualNamespace(ctx)
	}

	// Interactive selection
	_, selectedNamespace, err := sharedUI.SelectFromList(
		"Select namespace for intercept", 
		filteredNamespaces,
	)
	if err != nil {
		return "", fmt.Errorf("namespace selection failed: %w", err)
	}

	return selectedNamespace, nil
}

// SelectNamespaceWithDefault provides namespace selection with a specific default
func (ns *NamespaceSelector) SelectNamespaceWithDefault(ctx context.Context, defaultNamespace string) (string, error) {
	namespaces, err := ns.kubernetesClient.GetNamespaces(ctx)
	if err != nil {
		pterm.Warning.Printf("Could not list namespaces: %v\n", err)
		return defaultNamespace, nil
	}

	filteredNamespaces := ns.filterNamespaces(namespaces)
	
	// Add default to the list if not already present
	found := false
	for _, ns := range filteredNamespaces {
		if ns == defaultNamespace {
			found = true
			break
		}
	}
	
	if !found {
		filteredNamespaces = append([]string{fmt.Sprintf("%s (default)", defaultNamespace)}, filteredNamespaces...)
	}

	_, selected, err := sharedUI.SelectFromList(
		"Select namespace", 
		filteredNamespaces,
	)
	if err != nil {
		return "", fmt.Errorf("namespace selection failed: %w", err)
	}

	// Handle default selection
	if strings.Contains(selected, "(default)") {
		return defaultNamespace, nil
	}

	return selected, nil
}

// ValidateNamespace checks if a namespace exists and is accessible
func (ns *NamespaceSelector) ValidateNamespace(ctx context.Context, namespace string) error {
	return ns.kubernetesClient.ValidateNamespace(ctx, namespace)
}

// GetAvailableNamespaces returns all available namespaces
func (ns *NamespaceSelector) GetAvailableNamespaces(ctx context.Context) ([]string, error) {
	namespaces, err := ns.kubernetesClient.GetNamespaces(ctx)
	if err != nil {
		return nil, err
	}
	
	return ns.filterNamespaces(namespaces), nil
}

// promptForManualNamespace asks user to enter namespace manually
func (ns *NamespaceSelector) promptForManualNamespace(ctx context.Context) (string, error) {
	namespace, err := sharedUI.GetInput(
		"Enter namespace name", 
		"default",
		sharedUI.ValidateNonEmpty("namespace"),
	)
	if err != nil {
		return "", fmt.Errorf("namespace input failed: %w", err)
	}

	// Validate the manually entered namespace
	if err := ns.kubernetesClient.ValidateNamespace(ctx, namespace); err != nil {
		return "", fmt.Errorf("namespace '%s' not found: %w", namespace, err)
	}

	return namespace, nil
}

// filterNamespaces removes system namespaces and sorts the result
func (ns *NamespaceSelector) filterNamespaces(namespaces []string) []string {
	systemNamespaces := map[string]bool{
		"kube-system":     true,
		"kube-public":     true,
		"kube-node-lease": true,
		"istio-system":    true,
		"monitoring":      true,
		"logging":         true,
	}

	filtered := make([]string, 0, len(namespaces))
	for _, namespace := range namespaces {
		if !systemNamespaces[namespace] {
			filtered = append(filtered, namespace)
		}
	}

	// Sort namespaces for consistent display
	sort.Strings(filtered)
	
	return filtered
}

// ShowNamespaceInfo displays information about the selected namespace
func (ns *NamespaceSelector) ShowNamespaceInfo(namespace string) {
	pterm.Info.Printf("Selected namespace: %s\n", pterm.Cyan(namespace))
}
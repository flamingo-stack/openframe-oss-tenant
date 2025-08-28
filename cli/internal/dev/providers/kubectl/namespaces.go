package kubectl

import (
	"context"
	"fmt"
	"strings"
)

// GetNamespaces returns all namespaces in the current cluster
func (p *Provider) GetNamespaces(ctx context.Context) ([]string, error) {
	result, err := p.executor.Execute(ctx, "kubectl", "get", "namespaces", "-o", "jsonpath={.items[*].metadata.name}")
	if err != nil {
		return nil, fmt.Errorf("failed to get namespaces: %w", err)
	}

	namespaces := strings.Fields(result.Stdout)
	return namespaces, nil
}

// ValidateNamespace checks if a namespace exists
func (p *Provider) ValidateNamespace(ctx context.Context, namespace string) error {
	_, err := p.executor.Execute(ctx, "kubectl", "get", "namespace", namespace)
	if err != nil {
		return fmt.Errorf("namespace '%s' not found", namespace)
	}
	return nil
}
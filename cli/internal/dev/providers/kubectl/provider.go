package kubectl

import (
	"context"
	"fmt"
	"strings"

	"github.com/flamingo-stack/openframe/openframe/internal/dev/services/intercept"
	"github.com/flamingo-stack/openframe/openframe/internal/shared/executor"
)

// Provider implements Kubernetes operations using kubectl
type Provider struct {
	executor executor.CommandExecutor
	verbose  bool
}

// NewProvider creates a new kubectl provider
func NewProvider(exec executor.CommandExecutor, verbose bool) *Provider {
	return &Provider{
		executor: exec,
		verbose:  verbose,
	}
}

// Ensure Provider implements both interfaces
var (
	_ intercept.KubernetesClient = (*Provider)(nil)
	_ intercept.ServiceClient    = (*Provider)(nil)
)

// CheckConnection verifies kubectl can connect to a cluster
func (p *Provider) CheckConnection(ctx context.Context) error {
	_, err := p.executor.Execute(ctx, "kubectl", "cluster-info")
	if err != nil {
		return fmt.Errorf("kubectl is not connected to a cluster: %w", err)
	}
	return nil
}

// GetCurrentContext returns the current kubectl context
func (p *Provider) GetCurrentContext(ctx context.Context) (string, error) {
	result, err := p.executor.Execute(ctx, "kubectl", "config", "current-context")
	if err != nil {
		return "", fmt.Errorf("failed to get current context: %w", err)
	}
	return strings.TrimSpace(result.Stdout), nil
}

// SetContext switches to a different kubectl context
func (p *Provider) SetContext(ctx context.Context, contextName string) error {
	_, err := p.executor.Execute(ctx, "kubectl", "config", "use-context", contextName)
	if err != nil {
		return fmt.Errorf("failed to switch context to %s: %w", contextName, err)
	}
	return nil
}

// Helper method for parsing targetPort from interface{}
func (p *Provider) parseTargetPort(targetPort interface{}) string {
	switch v := targetPort.(type) {
	case string:
		return v
	case float64:
		return fmt.Sprintf("%d", int(v))
	case int:
		return fmt.Sprintf("%d", v)
	default:
		return ""
	}
}

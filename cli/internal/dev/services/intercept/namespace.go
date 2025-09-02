package intercept

import (
	"context"
	"fmt"
	"strings"

	"github.com/pterm/pterm"
)

// getCurrentNamespace gets the current namespace from telepresence status (exactly like bash script)
func (s *Service) getCurrentNamespace(ctx context.Context) (string, error) {
	// Use the exact same command as the bash script
	result, err := s.executor.Execute(ctx, "bash", "-c",
		"telepresence status --output json | jq -r '.user_daemon.namespace'")
	if err != nil {
		return "default", nil
	}

	namespace := strings.TrimSpace(result.Stdout)
	if namespace == "null" || namespace == "" {
		return "default", nil
	}

	return namespace, nil
}

// switchNamespace switches telepresence from current to target namespace
func (s *Service) switchNamespace(ctx context.Context, current, target string) error {
	pterm.Info.Printf("Switching Telepresence from %s to %s\n", current, target)

	// Instead of quitting and reconnecting, just disconnect and reconnect with new namespace
	// This preserves the traffic manager connection
	if _, err := s.executor.Execute(ctx, "telepresence", "disconnect"); err != nil {
		if s.verbose {
			pterm.Warning.Printf("Failed to disconnect telepresence cleanly: %v\n", err)
		}
	}

	// Connect to new namespace (let telepresence find traffic manager automatically)
	_, err := s.executor.Execute(ctx, "telepresence", "connect", "--namespace", target)
	if err != nil {
		return fmt.Errorf("failed to connect to namespace %s: %w", target, err)
	}

	return nil
}

package intercept

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/pterm/pterm"
)

// getCurrentNamespace gets the current namespace from telepresence status
func (s *Service) getCurrentNamespace(ctx context.Context) (string, error) {
	result, err := s.executor.Execute(ctx, "telepresence", "status", "--output", "json")
	if err != nil {
		return "default", nil // Default if telepresence not connected
	}

	var status TelepresenceStatus
	if err := json.Unmarshal([]byte(result.Stdout), &status); err != nil {
		// Fallback to parsing with jq like the original script
		jqResult, jqErr := s.executor.Execute(ctx, "bash", "-c", 
			fmt.Sprintf("echo '%s' | jq -r '.user_daemon.namespace'", result.Stdout))
		if jqErr != nil {
			return "default", nil
		}
		namespace := strings.TrimSpace(jqResult.Stdout)
		if namespace == "null" || namespace == "" {
			return "default", nil
		}
		return namespace, nil
	}

	if status.UserDaemon.Namespace == "" {
		return "default", nil
	}

	return status.UserDaemon.Namespace, nil
}

// switchNamespace switches telepresence from current to target namespace
func (s *Service) switchNamespace(ctx context.Context, current, target string) error {
	pterm.Info.Printf("Switching Telepresence from %s to %s\n", current, target)

	// Quit current connection
	if _, err := s.executor.Execute(ctx, "telepresence", "quit"); err != nil {
		pterm.Warning.Printf("Failed to quit telepresence cleanly: %v\n", err)
	}

	// Connect to new namespace
	_, err := s.executor.Execute(ctx, "telepresence", "connect", "--namespace", target)
	if err != nil {
		return fmt.Errorf("failed to connect to namespace %s: %w", target, err)
	}

	return nil
}
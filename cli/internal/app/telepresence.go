package app

import (
	"context"
	"fmt"
	"os/exec"
	"strconv"
	"strings"
)

// TelepresenceManager handles telepresence operations
type TelepresenceManager struct {
	app *App
}

// NewTelepresenceManager creates a new telepresence manager
func NewTelepresenceManager(app *App) *TelepresenceManager {
	return &TelepresenceManager{app: app}
}

// GetStatus returns the current telepresence connection status
func (tm *TelepresenceManager) GetStatus() string {
	cmd := exec.Command("telepresence", "status")
	output, err := cmd.Output()
	if err != nil {
		return "disconnected"
	}

	status := strings.TrimSpace(string(output))
	if strings.Contains(status, "Connected") {
		return "connected"
	}
	return "disconnected"
}

// IsConnected checks if telepresence is connected
func (tm *TelepresenceManager) IsConnected() bool {
	return tm.GetStatus() == "connected"
}

// Connect establishes a telepresence connection
func (tm *TelepresenceManager) Connect() error {
	return tm.app.executor.Run(context.Background(), "telepresence", "connect")
}

// ValidatePort validates a port number
func (tm *TelepresenceManager) ValidatePort(port string) error {
	// Reject octal notation (leading zero)
	if len(port) > 1 && port[0] == '0' {
		return fmt.Errorf("port must be a number")
	}

	portNum, err := strconv.ParseInt(port, 10, 32)
	if err != nil {
		return fmt.Errorf("port must be a number")
	}
	if portNum < 1 || portNum > 65535 {
		return fmt.Errorf("port must be between 1 and 65535")
	}
	return nil
}

// HasIntercept checks if an intercept exists for a service
func (tm *TelepresenceManager) HasIntercept(service string) bool {
	intercepts := tm.GetActiveIntercepts()
	for _, intercept := range intercepts {
		if intercept == service {
			return true
		}
	}
	return false
}

// RemoveIntercept removes an existing intercept
func (tm *TelepresenceManager) RemoveIntercept(service string) error {
	return tm.app.executor.Run(context.Background(), "telepresence", "leave", service)
}

// GetActiveIntercepts returns all active intercepts
func (tm *TelepresenceManager) GetActiveIntercepts() []string {
	cmd := exec.Command("telepresence", "list")
	output, err := cmd.Output()
	if err != nil {
		return []string{}
	}

	lines := strings.Split(string(output), "\n")
	var intercepts []string

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line != "" && !strings.HasPrefix(line, "Intercept") && !strings.HasPrefix(line, "---") {
			parts := strings.Fields(line)
			if len(parts) > 0 {
				intercepts = append(intercepts, parts[0])
			}
		}
	}

	return intercepts
}

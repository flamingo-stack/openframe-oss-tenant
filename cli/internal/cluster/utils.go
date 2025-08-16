package cluster

import (
	"context"
	"fmt"
	"os/exec"
	"strings"
)

// ExecResult contains the result of command execution
type ExecResult struct {
	Output string
	Error  error
}

// ExecKubectl executes kubectl command with proper context and error handling
func ExecKubectl(ctx context.Context, clusterName string, args ...string) *ExecResult {
	contextName := GetKubeContext(clusterName)
	cmdArgs := append([]string{"--context", contextName}, args...)
	cmd := exec.CommandContext(ctx, "kubectl", cmdArgs...)
	
	output, err := cmd.Output()
	return &ExecResult{
		Output: strings.TrimSpace(string(output)),
		Error:  err,
	}
}

// ExecHelm executes helm command with proper context and error handling
func ExecHelm(ctx context.Context, clusterName string, args ...string) *ExecResult {
	contextName := GetKubeContext(clusterName)
	cmdArgs := append([]string{"--kube-context", contextName}, args...)
	cmd := exec.CommandContext(ctx, "helm", cmdArgs...)
	
	output, err := cmd.Output()
	return &ExecResult{
		Output: strings.TrimSpace(string(output)),
		Error:  err,
	}
}

// ExecDocker executes docker command with proper error handling
func ExecDocker(ctx context.Context, args ...string) *ExecResult {
	cmd := exec.CommandContext(ctx, "docker", args...)
	output, err := cmd.Output()
	return &ExecResult{
		Output: strings.TrimSpace(string(output)),
		Error:  err,
	}
}

// GetKubeContext returns the kubectl context name for a cluster
func GetKubeContext(clusterName string) string {
	return fmt.Sprintf("k3d-%s", clusterName)
}

// ValidateClusterName validates cluster name format
func ValidateClusterName(name string) error {
	if name == "" {
		return fmt.Errorf("cluster name cannot be empty")
	}
	if len(strings.TrimSpace(name)) == 0 {
		return fmt.Errorf("cluster name cannot be empty or whitespace only")
	}
	return nil
}

// ParseClusterType converts string to ClusterType
func ParseClusterType(typeStr string) ClusterType {
	switch strings.ToLower(typeStr) {
	case "k3d":
		return ClusterTypeK3d
	default:
		return ClusterTypeK3d // Default
	}
}

// GetNodeCount returns validated node count with default
func GetNodeCount(nodeCount int) int {
	if nodeCount <= 0 {
		return 3 // Default to 3 nodes
	}
	return nodeCount
}
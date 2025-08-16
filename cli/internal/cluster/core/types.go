package core

import "time"

// ClusterType represents different types of Kubernetes clusters
type ClusterType string

const (
	ClusterTypeK3d ClusterType = "k3d"
	ClusterTypeGKE ClusterType = "gke"
	ClusterTypeEKS ClusterType = "eks"
)

// ClusterConfig represents configuration for creating a cluster
type ClusterConfig struct {
	Name       string
	Type       ClusterType
	NodeCount  int
	K8sVersion string
}

// ClusterInfo represents information about an existing cluster
type ClusterInfo struct {
	Name       string
	Type       ClusterType
	Status     string
	NodeCount  int
	K8sVersion string
	CreatedAt  time.Time
	Nodes      []NodeInfo
}

// NodeInfo represents information about a cluster node
type NodeInfo struct {
	Name   string
	Status string
	Role   string
	Age    time.Duration
}

// ProviderOptions contains options for cluster providers
type ProviderOptions struct {
	Verbose bool
	DryRun  bool
}
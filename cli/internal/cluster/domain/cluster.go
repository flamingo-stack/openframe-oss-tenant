package domain

import "time"

// ClusterType represents different types of Kubernetes clusters
type ClusterType string

const (
	ClusterTypeK3d ClusterType = "k3d"
	ClusterTypeGKE ClusterType = "gke"
)

// ClusterConfig holds cluster configuration
type ClusterConfig struct {
	Name       string      `json:"name"`
	Type       ClusterType `json:"type"`
	NodeCount  int         `json:"node_count"`
	K8sVersion string      `json:"k8s_version"`
}

// ClusterInfo represents information about a cluster
type ClusterInfo struct {
	Name       string      `json:"name"`
	Type       ClusterType `json:"type"`
	Status     string      `json:"status"`
	NodeCount  int         `json:"node_count"`
	K8sVersion string      `json:"k8s_version,omitempty"`
	CreatedAt  time.Time   `json:"created_at,omitempty"`
	Nodes      []NodeInfo  `json:"nodes,omitempty"`
}

// NodeInfo represents information about a node in the cluster
type NodeInfo struct {
	Name   string `json:"name"`
	Status string `json:"status"`
	Role   string `json:"role"`
}

// ProviderOptions contains provider-specific options
type ProviderOptions struct {
	K3d     *K3dOptions `json:"k3d,omitempty"`
	GKE     *GKEOptions `json:"gke,omitempty"`
	Verbose bool        `json:"verbose,omitempty"`
}

// K3dOptions contains k3d-specific options
type K3dOptions struct {
	PortMappings []string `json:"port_mappings,omitempty"`
}

// GKEOptions contains GKE-specific options
type GKEOptions struct {
	Zone    string `json:"zone"`
	Project string `json:"project"`
}


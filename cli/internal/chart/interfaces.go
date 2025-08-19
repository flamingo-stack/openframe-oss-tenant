package chart

import (
	clusterDomain "github.com/flamingo/openframe/internal/cluster/models"
)

// ClusterLister interface for services that can list clusters
type ClusterLister interface {
	ListClusters() ([]clusterDomain.ClusterInfo, error)
}
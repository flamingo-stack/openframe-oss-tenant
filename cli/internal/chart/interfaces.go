package chart

import (
	clusterDomain "github.com/flamingo/openframe/internal/cluster/domain"
)

// ClusterLister interface for services that can list clusters
type ClusterLister interface {
	ListClusters() ([]clusterDomain.ClusterInfo, error)
}
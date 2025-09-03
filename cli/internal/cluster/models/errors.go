package models

import "fmt"

// Domain errors for cluster operations
// These represent business-level errors that the domain understands

// ErrClusterNotFound indicates a cluster was not found
type ErrClusterNotFound struct {
	Name string
}

func (e ErrClusterNotFound) Error() string {
	return fmt.Sprintf("cluster '%s' not found", e.Name)
}

// ErrProviderNotFound indicates no provider is available for a cluster type
type ErrProviderNotFound struct {
	ClusterType ClusterType
}

func (e ErrProviderNotFound) Error() string {
	return fmt.Sprintf("no provider available for cluster type '%s'", e.ClusterType)
}

// ErrInvalidClusterConfig indicates the cluster configuration is invalid
type ErrInvalidClusterConfig struct {
	Field   string
	Value   interface{}
	Reason  string
}

func (e ErrInvalidClusterConfig) Error() string {
	return fmt.Sprintf("invalid cluster config - %s: %v (%s)", e.Field, e.Value, e.Reason)
}

// ErrClusterAlreadyExists indicates a cluster with the same name already exists
type ErrClusterAlreadyExists struct {
	Name string
}

func (e ErrClusterAlreadyExists) Error() string {
	return fmt.Sprintf("cluster '%s' already exists", e.Name)
}

// ErrClusterOperation indicates a general cluster operation failure
type ErrClusterOperation struct {
	Operation string
	Cluster   string
	Cause     error
}

func (e ErrClusterOperation) Error() string {
	return fmt.Sprintf("cluster %s operation failed for '%s': %v", e.Operation, e.Cluster, e.Cause)
}

func (e ErrClusterOperation) Unwrap() error {
	return e.Cause
}

// NewClusterNotFoundError creates a new cluster not found error
func NewClusterNotFoundError(name string) error {
	return ErrClusterNotFound{Name: name}
}

// NewProviderNotFoundError creates a new provider not found error
func NewProviderNotFoundError(clusterType ClusterType) error {
	return ErrProviderNotFound{ClusterType: clusterType}
}

// NewInvalidConfigError creates a new invalid config error
func NewInvalidConfigError(field string, value interface{}, reason string) error {
	return ErrInvalidClusterConfig{Field: field, Value: value, Reason: reason}
}

// NewClusterAlreadyExistsError creates a new cluster already exists error
func NewClusterAlreadyExistsError(name string) error {
	return ErrClusterAlreadyExists{Name: name}
}

// NewClusterOperationError creates a new cluster operation error
func NewClusterOperationError(operation, cluster string, cause error) error {
	return ErrClusterOperation{Operation: operation, Cluster: cluster, Cause: cause}
}
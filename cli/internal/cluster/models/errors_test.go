package models

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestErrClusterNotFound(t *testing.T) {
	t.Run("creates error with cluster name", func(t *testing.T) {
		err := NewClusterNotFoundError("test-cluster")
		
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "test-cluster")
		assert.Contains(t, err.Error(), "not found")
		
		// Test type assertion
		var clusterNotFoundErr ErrClusterNotFound
		if errors.As(err, &clusterNotFoundErr) {
			assert.Equal(t, "test-cluster", clusterNotFoundErr.Name)
		} else {
			t.Errorf("Expected ErrClusterNotFound, got %T", err)
		}
	})
	
	t.Run("unwraps correctly", func(t *testing.T) {
		err := NewClusterNotFoundError("test-cluster")
		
		// Should be a wrapped error that can be unwrapped
		var clusterNotFoundErr ErrClusterNotFound
		assert.True(t, errors.As(err, &clusterNotFoundErr))
	})
}

func TestErrProviderNotFound(t *testing.T) {
	t.Run("creates error with cluster type", func(t *testing.T) {
		err := NewProviderNotFoundError(ClusterTypeGKE)
		
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "gke")
		
		// Test type assertion
		var providerNotFoundErr ErrProviderNotFound
		if errors.As(err, &providerNotFoundErr) {
			assert.Equal(t, ClusterTypeGKE, providerNotFoundErr.ClusterType)
		}
	})
	
	t.Run("handles empty cluster type", func(t *testing.T) {
		err := NewProviderNotFoundError("")
		
		assert.Error(t, err)
		
		var providerNotFoundErr ErrProviderNotFound
		if errors.As(err, &providerNotFoundErr) {
			assert.Empty(t, providerNotFoundErr.ClusterType)
		}
	})
}

func TestErrInvalidClusterConfig(t *testing.T) {
	t.Run("creates error with field and value", func(t *testing.T) {
		err := NewInvalidConfigError("name", "", "cluster name cannot be empty")
		
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "name")
		assert.Contains(t, err.Error(), "cluster name cannot be empty")
		
		// Test type assertion
		var invalidConfigErr ErrInvalidClusterConfig
		if errors.As(err, &invalidConfigErr) {
			assert.Equal(t, "name", invalidConfigErr.Field)
			assert.Equal(t, "", invalidConfigErr.Value)
			assert.Equal(t, "cluster name cannot be empty", invalidConfigErr.Reason)
		}
	})
	
	t.Run("creates error with numeric value", func(t *testing.T) {
		err := NewInvalidConfigError("nodeCount", -1, "node count must be positive")
		
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "nodeCount")
		assert.Contains(t, err.Error(), "node count must be positive")
		
		var invalidConfigErr ErrInvalidClusterConfig
		if errors.As(err, &invalidConfigErr) {
			assert.Equal(t, "nodeCount", invalidConfigErr.Field)
			assert.Equal(t, -1, invalidConfigErr.Value)
		}
	})
}

func TestErrClusterAlreadyExists(t *testing.T) {
	t.Run("creates error with cluster name", func(t *testing.T) {
		err := NewClusterAlreadyExistsError("test-cluster")
		
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "test-cluster")
		assert.Contains(t, err.Error(), "already exists")
		
		// Test type assertion
		var alreadyExistsErr ErrClusterAlreadyExists
		if errors.As(err, &alreadyExistsErr) {
			assert.Equal(t, "test-cluster", alreadyExistsErr.Name)
		}
	})
}

func TestErrClusterOperation(t *testing.T) {
	t.Run("creates error with operation, cluster name, and cause", func(t *testing.T) {
		originalErr := errors.New("k3d command failed")
		err := NewClusterOperationError("create", "test-cluster", originalErr)
		
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "create")
		assert.Contains(t, err.Error(), "test-cluster")
		
		// Test type assertion
		var operationErr ErrClusterOperation
		if errors.As(err, &operationErr) {
			assert.Equal(t, "create", operationErr.Operation)
			assert.Equal(t, "test-cluster", operationErr.Cluster)
			assert.Equal(t, originalErr, operationErr.Cause)
		}
	})
	
	t.Run("wraps original error correctly", func(t *testing.T) {
		originalErr := errors.New("original error")
		err := NewClusterOperationError("delete", "test-cluster", originalErr)
		
		// Should be able to unwrap to the original error
		assert.ErrorIs(t, err, originalErr)
	})
	
	t.Run("handles nil cause error", func(t *testing.T) {
		err := NewClusterOperationError("start", "test-cluster", nil)
		
		assert.Error(t, err)
		
		var operationErr ErrClusterOperation
		if errors.As(err, &operationErr) {
			assert.Nil(t, operationErr.Cause)
		}
	})
}

func TestErrorFormatting(t *testing.T) {
	t.Run("cluster not found error format", func(t *testing.T) {
		err := NewClusterNotFoundError("my-cluster")
		expected := "cluster 'my-cluster' not found"
		assert.Equal(t, expected, err.Error())
	})
	
	t.Run("provider not found error format", func(t *testing.T) {
		err := NewProviderNotFoundError(ClusterTypeGKE)
		assert.Contains(t, err.Error(), "gke")
	})
	
	t.Run("invalid config error format", func(t *testing.T) {
		err := NewInvalidConfigError("nodeCount", 0, "must be positive")
		assert.Contains(t, err.Error(), "invalid cluster config")
		assert.Contains(t, err.Error(), "nodeCount")
		assert.Contains(t, err.Error(), "must be positive")
	})
	
	t.Run("cluster already exists error format", func(t *testing.T) {
		err := NewClusterAlreadyExistsError("existing-cluster")
		expected := "cluster 'existing-cluster' already exists"
		assert.Equal(t, expected, err.Error())
	})
	
	t.Run("cluster operation error format", func(t *testing.T) {
		cause := errors.New("underlying issue")
		err := NewClusterOperationError("delete", "my-cluster", cause)
		
		assert.Contains(t, err.Error(), "cluster delete operation failed")
		assert.Contains(t, err.Error(), "my-cluster")
		assert.Contains(t, err.Error(), "underlying issue")
	})
}

func TestErrorChaining(t *testing.T) {
	t.Run("cluster operation error chains correctly", func(t *testing.T) {
		_ = errors.New("network timeout") // Placeholder for potential future use
		providerErr := NewProviderNotFoundError(ClusterTypeGKE)
		operationErr := NewClusterOperationError("create", "test-cluster", providerErr)
		
		// Test that we can find the provider error in the chain
		var providerNotFoundErr ErrProviderNotFound
		assert.True(t, errors.As(operationErr, &providerNotFoundErr))
		
		// Test that we can find the operation error
		var clusterOpErr ErrClusterOperation
		assert.True(t, errors.As(operationErr, &clusterOpErr))
	})
	
	t.Run("multiple error wrapping", func(t *testing.T) {
		_ = errors.New("base error") // Placeholder for potential future use
		configErr := NewInvalidConfigError("name", "", "empty name")
		opErr := NewClusterOperationError("validate", "test", configErr)
		
		// Should be able to find both errors in the chain
		var invalidConfigErr ErrInvalidClusterConfig
		assert.True(t, errors.As(opErr, &invalidConfigErr))
		
		var operationErr ErrClusterOperation
		assert.True(t, errors.As(opErr, &operationErr))
	})
}
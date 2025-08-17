package intercept

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNewInterceptManager(t *testing.T) {
	t.Run("creates new intercept manager with all parameters", func(t *testing.T) {
		namespace := "test-namespace"
		preview := true
		
		manager := NewInterceptManager(namespace, preview)
		
		assert.NotNil(t, manager)
		assert.Equal(t, namespace, manager.namespace)
		assert.Equal(t, preview, manager.preview)
	})
	
	t.Run("creates intercept manager with empty namespace", func(t *testing.T) {
		namespace := ""
		preview := false
		
		manager := NewInterceptManager(namespace, preview)
		
		assert.NotNil(t, manager)
		assert.Equal(t, "", manager.namespace)
		assert.False(t, manager.preview)
	})
	
	t.Run("creates intercept manager with default settings", func(t *testing.T) {
		manager := NewInterceptManager("default", false)
		
		assert.NotNil(t, manager)
		assert.Equal(t, "default", manager.namespace)
		assert.False(t, manager.preview)
	})
	
	t.Run("creates intercept manager with preview enabled", func(t *testing.T) {
		manager := NewInterceptManager("staging", true)
		
		assert.NotNil(t, manager)
		assert.Equal(t, "staging", manager.namespace)
		assert.True(t, manager.preview)
	})
}

func TestInterceptManager_StartIntercept(t *testing.T) {
	t.Run("starts intercept with basic parameters", func(t *testing.T) {
		manager := NewInterceptManager("test-namespace", false)
		serviceName := "my-service"
		portMapping := "8080:80"
		
		err := manager.StartIntercept(serviceName, portMapping)
		
		// Since this is a TODO implementation, it should return nil
		assert.NoError(t, err)
	})
	
	t.Run("starts intercept with preview enabled", func(t *testing.T) {
		manager := NewInterceptManager("test-namespace", true)
		serviceName := "web-service"
		portMapping := "3000:3000"
		
		err := manager.StartIntercept(serviceName, portMapping)
		
		assert.NoError(t, err)
		assert.True(t, manager.preview)
	})
	
	t.Run("handles empty service name", func(t *testing.T) {
		manager := NewInterceptManager("test-namespace", false)
		serviceName := ""
		portMapping := "8080:80"
		
		err := manager.StartIntercept(serviceName, portMapping)
		
		assert.NoError(t, err)
	})
	
	t.Run("handles empty port mapping", func(t *testing.T) {
		manager := NewInterceptManager("test-namespace", false)
		serviceName := "my-service"
		portMapping := ""
		
		err := manager.StartIntercept(serviceName, portMapping)
		
		assert.NoError(t, err)
	})
	
	t.Run("handles various port mapping formats", func(t *testing.T) {
		manager := NewInterceptManager("test-namespace", false)
		serviceName := "api-service"
		
		testCases := []string{
			"8080:80",
			"3000:3000",
			"443:443",
			"9090:8080",
			"8000",
			"localhost:8080:80",
		}
		
		for _, portMapping := range testCases {
			t.Run("port mapping: "+portMapping, func(t *testing.T) {
				err := manager.StartIntercept(serviceName, portMapping)
				assert.NoError(t, err)
			})
		}
	})
	
	t.Run("works with different namespaces", func(t *testing.T) {
		testCases := []struct {
			namespace string
			preview   bool
		}{
			{"default", false},
			{"kube-system", true},
			{"production", false},
			{"staging", true},
			{"development", false},
		}
		
		for _, tc := range testCases {
			t.Run("namespace: "+tc.namespace, func(t *testing.T) {
				manager := NewInterceptManager(tc.namespace, tc.preview)
				err := manager.StartIntercept("test-service", "8080:80")
				
				assert.NoError(t, err)
				assert.Equal(t, tc.namespace, manager.namespace)
				assert.Equal(t, tc.preview, manager.preview)
			})
		}
	})
	
	t.Run("handles multiple intercept calls", func(t *testing.T) {
		manager := NewInterceptManager("test-namespace", false)
		
		// Start multiple intercepts
		err1 := manager.StartIntercept("service1", "8080:80")
		err2 := manager.StartIntercept("service2", "9090:90")
		err3 := manager.StartIntercept("service3", "3000:3000")
		
		assert.NoError(t, err1)
		assert.NoError(t, err2)
		assert.NoError(t, err3)
	})
}

func TestInterceptManager_FieldAccess(t *testing.T) {
	t.Run("provides access to namespace field", func(t *testing.T) {
		expectedNamespace := "production"
		manager := NewInterceptManager(expectedNamespace, false)
		
		assert.Equal(t, expectedNamespace, manager.namespace)
	})
	
	t.Run("provides access to preview field", func(t *testing.T) {
		manager := NewInterceptManager("default", true)
		
		assert.True(t, manager.preview)
	})
	
	t.Run("maintains field values after creation", func(t *testing.T) {
		namespace := "custom-namespace"
		preview := true
		manager := NewInterceptManager(namespace, preview)
		
		// Verify initial values
		assert.Equal(t, namespace, manager.namespace)
		assert.Equal(t, preview, manager.preview)
		
		// Perform operations and verify values are maintained
		err := manager.StartIntercept("test-service", "8080:80")
		assert.NoError(t, err)
		
		assert.Equal(t, namespace, manager.namespace)
		assert.Equal(t, preview, manager.preview)
	})
	
	t.Run("different instances have independent state", func(t *testing.T) {
		manager1 := NewInterceptManager("namespace1", true)
		manager2 := NewInterceptManager("namespace2", false)
		
		assert.Equal(t, "namespace1", manager1.namespace)
		assert.True(t, manager1.preview)
		
		assert.Equal(t, "namespace2", manager2.namespace)
		assert.False(t, manager2.preview)
		
		// Verify they don't interfere with each other
		assert.NotEqual(t, manager1.namespace, manager2.namespace)
		assert.NotEqual(t, manager1.preview, manager2.preview)
	})
}
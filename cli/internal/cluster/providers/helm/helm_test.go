package helm

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNewHelmManager(t *testing.T) {
	t.Run("creates new helm manager with all parameters", func(t *testing.T) {
		namespace := "test-namespace"
		dryRun := true
		
		manager := NewHelmManager(namespace, dryRun)
		
		assert.NotNil(t, manager)
		assert.Equal(t, namespace, manager.namespace)
		assert.Equal(t, dryRun, manager.dryRun)
	})
	
	t.Run("creates helm manager with empty namespace", func(t *testing.T) {
		namespace := ""
		dryRun := false
		
		manager := NewHelmManager(namespace, dryRun)
		
		assert.NotNil(t, manager)
		assert.Equal(t, "", manager.namespace)
		assert.False(t, manager.dryRun)
	})
	
	t.Run("creates helm manager with default settings", func(t *testing.T) {
		manager := NewHelmManager("default", false)
		
		assert.NotNil(t, manager)
		assert.Equal(t, "default", manager.namespace)
		assert.False(t, manager.dryRun)
	})
}

func TestHelmManager_InstallChart(t *testing.T) {
	t.Run("installs chart with basic parameters", func(t *testing.T) {
		manager := NewHelmManager("test-namespace", false)
		chartName := "nginx-ingress"
		releaseName := "my-nginx"
		values := map[string]interface{}{
			"replicaCount": 2,
			"image.tag":   "latest",
		}
		
		err := manager.InstallChart(chartName, releaseName, values)
		
		// Since this is a TODO implementation, it should return nil
		assert.NoError(t, err)
	})
	
	t.Run("installs chart with empty values", func(t *testing.T) {
		manager := NewHelmManager("test-namespace", true)
		chartName := "prometheus"
		releaseName := "my-prometheus"
		values := map[string]interface{}{}
		
		err := manager.InstallChart(chartName, releaseName, values)
		
		assert.NoError(t, err)
	})
	
	t.Run("installs chart with nil values", func(t *testing.T) {
		manager := NewHelmManager("test-namespace", false)
		chartName := "grafana"
		releaseName := "my-grafana"
		
		err := manager.InstallChart(chartName, releaseName, nil)
		
		assert.NoError(t, err)
	})
	
	t.Run("handles empty chart name", func(t *testing.T) {
		manager := NewHelmManager("test-namespace", false)
		chartName := ""
		releaseName := "my-release"
		values := map[string]interface{}{"key": "value"}
		
		err := manager.InstallChart(chartName, releaseName, values)
		
		assert.NoError(t, err)
	})
	
	t.Run("handles empty release name", func(t *testing.T) {
		manager := NewHelmManager("test-namespace", false)
		chartName := "my-chart"
		releaseName := ""
		values := map[string]interface{}{"key": "value"}
		
		err := manager.InstallChart(chartName, releaseName, values)
		
		assert.NoError(t, err)
	})
	
	t.Run("works with dry run enabled", func(t *testing.T) {
		manager := NewHelmManager("test-namespace", true)
		chartName := "my-chart"
		releaseName := "my-release"
		values := map[string]interface{}{"dryRun": true}
		
		err := manager.InstallChart(chartName, releaseName, values)
		
		assert.NoError(t, err)
		assert.True(t, manager.dryRun)
	})
	
	t.Run("handles complex values map", func(t *testing.T) {
		manager := NewHelmManager("production", false)
		chartName := "complex-chart"
		releaseName := "complex-release"
		values := map[string]interface{}{
			"replicas": 3,
			"resources": map[string]interface{}{
				"requests": map[string]interface{}{
					"cpu":    "100m",
					"memory": "128Mi",
				},
				"limits": map[string]interface{}{
					"cpu":    "500m",
					"memory": "512Mi",
				},
			},
			"ingress": map[string]interface{}{
				"enabled": true,
				"hosts":   []string{"example.com", "www.example.com"},
			},
		}
		
		err := manager.InstallChart(chartName, releaseName, values)
		
		assert.NoError(t, err)
	})
}

func TestHelmManager_FieldAccess(t *testing.T) {
	t.Run("provides access to namespace field", func(t *testing.T) {
		expectedNamespace := "kube-system"
		manager := NewHelmManager(expectedNamespace, false)
		
		assert.Equal(t, expectedNamespace, manager.namespace)
	})
	
	t.Run("provides access to dry run field", func(t *testing.T) {
		manager := NewHelmManager("default", true)
		
		assert.True(t, manager.dryRun)
	})
	
	t.Run("maintains field values after creation", func(t *testing.T) {
		namespace := "custom-namespace"
		dryRun := true
		manager := NewHelmManager(namespace, dryRun)
		
		// Verify initial values
		assert.Equal(t, namespace, manager.namespace)
		assert.Equal(t, dryRun, manager.dryRun)
		
		// Perform operations and verify values are maintained
		err := manager.InstallChart("test-chart", "test-release", nil)
		assert.NoError(t, err)
		
		assert.Equal(t, namespace, manager.namespace)
		assert.Equal(t, dryRun, manager.dryRun)
	})
}
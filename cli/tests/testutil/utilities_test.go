package testutil

import (
	"testing"

	"github.com/flamingo-stack/openframe/openframe/internal/cluster/models"
	"github.com/stretchr/testify/assert"
)

func TestTestClusterConfig(t *testing.T) {
	config := TestClusterConfig("test-cluster")

	assert.NotNil(t, config)
	assert.Equal(t, "test-cluster", config.Name)
	assert.Equal(t, models.ClusterTypeK3d, config.Type)
	assert.Equal(t, 3, config.NodeCount)
	assert.Equal(t, "v1.28.0", config.K8sVersion)
}

func TestTestClusterConfig_EmptyName(t *testing.T) {
	config := TestClusterConfig("")

	assert.NotNil(t, config)
	assert.Equal(t, "", config.Name)
	assert.Equal(t, models.ClusterTypeK3d, config.Type)
}

func TestTestClusterConfig_DifferentInstances(t *testing.T) {
	config1 := TestClusterConfig("test1")
	config2 := TestClusterConfig("test2")

	assert.NotSame(t, config1, config2)
	assert.Equal(t, "test1", config1.Name)
	assert.Equal(t, "test2", config2.Name)
}

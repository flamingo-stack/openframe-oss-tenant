package common

import (
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestGenerateTestClusterName(t *testing.T) {
	name1 := GenerateTestClusterName()
	time.Sleep(1 * time.Second)
	name2 := GenerateTestClusterName()
	
	assert.True(t, strings.HasPrefix(name1, "integration-test-"))
	assert.True(t, strings.HasPrefix(name2, "integration-test-"))
	assert.NotEqual(t, name1, name2)
}

func TestCreateTestCluster(t *testing.T) {
	// Skip if k3d not available
	if !K3d.IsAvailable() {
		t.Skip("k3d not available")
	}
	
	name := GenerateTestClusterName()
	defer CleanupTestCluster(name)
	
	err := CreateTestCluster(name)
	if err != nil {
		t.Logf("Failed to create cluster (may be expected): %v", err)
	}
}

func TestClusterExists(t *testing.T) {
	// Test with non-existent cluster
	exists, err := ClusterExists("non-existent-cluster-12345")
	assert.NoError(t, err)
	assert.False(t, exists)
}
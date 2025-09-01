package git

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestCloneResult_DefaultValues(t *testing.T) {
	result := &CloneResult{}

	assert.Empty(t, result.TempDir)
	assert.Empty(t, result.ChartPath)
}

func TestCloneResult_WithValues(t *testing.T) {
	result := &CloneResult{
		TempDir:   "/tmp/clone-12345",
		ChartPath: "/tmp/clone-12345/manifests/app-of-apps",
	}

	assert.Equal(t, "/tmp/clone-12345", result.TempDir)
	assert.Equal(t, "/tmp/clone-12345/manifests/app-of-apps", result.ChartPath)
}
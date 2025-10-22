package testutil

import (
	"testing"

	"github.com/flamingo-stack/openframe/openframe/internal/cluster"
	"github.com/flamingo-stack/openframe/openframe/internal/shared/ui"
	"github.com/stretchr/testify/assert"
)

func TestInitializeTestMode(t *testing.T) {
	originalTestMode := ui.TestMode
	defer func() {
		ui.TestMode = originalTestMode
	}()

	ui.TestMode = false
	InitializeTestMode()
	assert.True(t, ui.TestMode)
}

func TestNewTestMockExecutor(t *testing.T) {
	executor := NewTestMockExecutor()
	assert.NotNil(t, executor)
}

func TestCreateStandardTestFlags(t *testing.T) {
	flags := CreateStandardTestFlags()

	assert.NotNil(t, flags)
	assert.IsType(t, &cluster.FlagContainer{}, flags)
	assert.NotNil(t, flags.Executor)
	assert.NotNil(t, flags.TestManager)
}

func TestCreateIntegrationTestFlags(t *testing.T) {
	flags := CreateIntegrationTestFlags()

	assert.NotNil(t, flags)
	assert.IsType(t, &cluster.FlagContainer{}, flags)
}

func TestSetVerboseMode(t *testing.T) {
	flags := CreateStandardTestFlags()

	SetVerboseMode(flags, true)
	assert.True(t, flags.Global.Verbose)

	SetVerboseMode(flags, false)
	assert.False(t, flags.Global.Verbose)
}

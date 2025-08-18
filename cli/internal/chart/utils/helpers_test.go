package utils

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestInitGlobalFlags(t *testing.T) {
	// Reset globalFlags to test initialization
	globalFlags = nil
	
	InitGlobalFlags()
	
	assert.NotNil(t, globalFlags)
	assert.NotNil(t, globalFlags.Global)
}

func TestGetGlobalFlags(t *testing.T) {
	// Reset globalFlags to test lazy initialization
	globalFlags = nil
	
	flags := GetGlobalFlags()
	
	assert.NotNil(t, flags)
	assert.NotNil(t, flags.Global)
	assert.NotNil(t, globalFlags) // Should have been initialized
}

func TestGetGlobalFlags_AlreadyInitialized(t *testing.T) {
	// Initialize flags first
	InitGlobalFlags()
	firstCall := GetGlobalFlags()
	
	// Second call should return the same instance
	secondCall := GetGlobalFlags()
	
	assert.Equal(t, firstCall, secondCall)
	assert.Same(t, firstCall, secondCall) // Should be the exact same pointer
}

func TestChartGlobalFlags_Structure(t *testing.T) {
	InitGlobalFlags()
	flags := GetGlobalFlags()
	
	// Test that the structure is properly initialized
	assert.NotNil(t, flags.Global)
	
	// Test that we can access and modify the global flags
	flags.Global.Verbose = true
	assert.True(t, flags.Global.Verbose)
	
	flags.Global.DryRun = true
	assert.True(t, flags.Global.DryRun)
}

func TestChartGlobalFlags_DefaultValues(t *testing.T) {
	// Reset and initialize fresh
	globalFlags = nil
	InitGlobalFlags()
	flags := GetGlobalFlags()
	
	// Test default values (assuming CommonFlags has these as false by default)
	assert.False(t, flags.Global.Verbose)
	assert.False(t, flags.Global.DryRun)
	assert.False(t, flags.Global.Force)
}

func TestMultipleInitCalls(t *testing.T) {
	// Reset globalFlags
	globalFlags = nil
	
	// Multiple init calls should be safe
	InitGlobalFlags()
	firstInstance := globalFlags
	
	InitGlobalFlags() // Should not create a new instance
	secondInstance := globalFlags
	
	assert.Same(t, firstInstance, secondInstance)
}

func TestConcurrentAccess(t *testing.T) {
	// Reset globalFlags
	globalFlags = nil
	
	// Test concurrent access (basic test - real concurrency would need goroutines)
	done := make(chan bool, 2)
	
	go func() {
		flags1 := GetGlobalFlags()
		assert.NotNil(t, flags1)
		done <- true
	}()
	
	go func() {
		flags2 := GetGlobalFlags()
		assert.NotNil(t, flags2)
		done <- true
	}()
	
	// Wait for both goroutines
	<-done
	<-done
	
	assert.NotNil(t, globalFlags)
}
package utils

import (
	"testing"

	"github.com/flamingo-stack/openframe/openframe/internal/cluster"
	"github.com/flamingo-stack/openframe/openframe/tests/testutil"
	"github.com/spf13/cobra"
	"github.com/stretchr/testify/assert"
)

func init() {
	testutil.InitializeTestMode()
}

func TestInitGlobalFlags(t *testing.T) {
	t.Run("initializes flags when nil", func(t *testing.T) {
		// Reset global flags
		globalFlags = nil

		InitGlobalFlags()

		assert.NotNil(t, globalFlags)
		assert.NotNil(t, globalFlags.Global)
		assert.NotNil(t, globalFlags.Create)
		assert.NotNil(t, globalFlags.Delete)
		assert.NotNil(t, globalFlags.List)
		assert.NotNil(t, globalFlags.Status)
		assert.NotNil(t, globalFlags.Cleanup)
	})

	t.Run("does not reinitialize when already set", func(t *testing.T) {
		InitGlobalFlags()
		existing := globalFlags

		InitGlobalFlags()

		assert.Same(t, existing, globalFlags, "Should not create new instance when already initialized")
	})
}

func TestGetGlobalFlags(t *testing.T) {
	t.Run("returns existing flags", func(t *testing.T) {
		InitGlobalFlags()
		flags1 := GetGlobalFlags()
		flags2 := GetGlobalFlags()

		assert.Same(t, flags1, flags2, "Should return same instance")
		assert.NotNil(t, flags1)
	})

	t.Run("initializes flags if nil", func(t *testing.T) {
		globalFlags = nil

		flags := GetGlobalFlags()

		assert.NotNil(t, flags)
		assert.NotNil(t, globalFlags)
	})
}

func TestGetCommandService(t *testing.T) {
	t.Run("creates service with injected executor", func(t *testing.T) {
		InitGlobalFlags()
		mockExecutor := testutil.NewTestMockExecutor()
		globalFlags.Executor = mockExecutor

		service := GetCommandService()

		assert.NotNil(t, service)

		// Clean up
		globalFlags.Executor = nil
	})

	t.Run("creates service with real executor when no injection", func(t *testing.T) {
		InitGlobalFlags()
		globalFlags.Executor = nil
		globalFlags.Global.DryRun = true
		globalFlags.Global.Verbose = true

		service := GetCommandService()

		assert.NotNil(t, service)

		// Clean up
		globalFlags.Global.DryRun = false
		globalFlags.Global.Verbose = false
	})

	t.Run("handles nil global flags", func(t *testing.T) {
		originalFlags := globalFlags
		globalFlags = nil

		service := GetCommandService()

		assert.NotNil(t, service)

		// Clean up
		globalFlags = originalFlags
	})
}

func TestWrapCommandWithCommonSetup(t *testing.T) {
	t.Run("wraps command function successfully", func(t *testing.T) {
		InitGlobalFlags()
		called := false

		wrappedFunc := WrapCommandWithCommonSetup(func(cmd *cobra.Command, args []string) error {
			called = true
			return nil
		})

		cmd := &cobra.Command{}
		err := wrappedFunc(cmd, []string{})

		assert.NoError(t, err)
		assert.True(t, called, "Original function should be called")
	})

	t.Run("handles error from wrapped function", func(t *testing.T) {
		InitGlobalFlags()
		expectedErr := assert.AnError

		wrappedFunc := WrapCommandWithCommonSetup(func(cmd *cobra.Command, args []string) error {
			return expectedErr
		})

		cmd := &cobra.Command{}
		err := wrappedFunc(cmd, []string{})

		// WrapCommandWithCommonSetup returns nil for generic errors after handling them
		assert.Nil(t, err)
	})

	t.Run("handles verbose mode in error handling", func(t *testing.T) {
		InitGlobalFlags()
		globalFlags.Global.Verbose = true

		wrappedFunc := WrapCommandWithCommonSetup(func(cmd *cobra.Command, args []string) error {
			return assert.AnError
		})

		cmd := &cobra.Command{}
		err := wrappedFunc(cmd, []string{})

		// WrapCommandWithCommonSetup returns nil for generic errors after handling them
		assert.Nil(t, err)

		// Clean up
		globalFlags.Global.Verbose = false
	})
}

func TestSyncGlobalFlags(t *testing.T) {
	t.Run("syncs flags when available", func(t *testing.T) {
		InitGlobalFlags()

		// This should not panic
		SyncGlobalFlags()
	})

	t.Run("handles nil global flags", func(t *testing.T) {
		originalFlags := globalFlags
		globalFlags = nil

		// This should not panic
		SyncGlobalFlags()

		// Clean up
		globalFlags = originalFlags
	})

	t.Run("handles nil Global field", func(t *testing.T) {
		InitGlobalFlags()
		originalGlobal := globalFlags.Global
		globalFlags.Global = nil

		// This should not panic
		SyncGlobalFlags()

		// Clean up
		globalFlags.Global = originalGlobal
	})
}

func TestValidateGlobalFlags(t *testing.T) {
	t.Run("validates flags when available", func(t *testing.T) {
		InitGlobalFlags()

		err := ValidateGlobalFlags()

		assert.NoError(t, err)
	})

	t.Run("handles nil global flags", func(t *testing.T) {
		originalFlags := globalFlags
		globalFlags = nil

		err := ValidateGlobalFlags()

		assert.NoError(t, err)

		// Clean up
		globalFlags = originalFlags
	})

	t.Run("handles nil Global field", func(t *testing.T) {
		InitGlobalFlags()
		originalGlobal := globalFlags.Global
		globalFlags.Global = nil

		err := ValidateGlobalFlags()

		assert.NoError(t, err)

		// Clean up
		globalFlags.Global = originalGlobal
	})
}

func TestTestingSupport(t *testing.T) {
	t.Run("SetTestExecutor", func(t *testing.T) {
		mockExecutor := testutil.NewTestMockExecutor()

		SetTestExecutor(mockExecutor)

		assert.NotNil(t, globalFlags)
		assert.Equal(t, mockExecutor, globalFlags.Executor)
	})

	t.Run("ResetGlobalFlags", func(t *testing.T) {
		InitGlobalFlags()
		assert.NotNil(t, globalFlags)

		ResetGlobalFlags()

		assert.Nil(t, globalFlags)
	})

	t.Run("ResetTestFlags", func(t *testing.T) {
		InitGlobalFlags()
		integrationTestFlags = &cluster.FlagContainer{}

		ResetTestFlags()

		assert.Nil(t, globalFlags)
		assert.Nil(t, integrationTestFlags)
	})
}

func TestIntegrationTestSupport(t *testing.T) {
	t.Run("getOrCreateIntegrationFlags creates new flags", func(t *testing.T) {
		integrationTestFlags = nil

		flags := getOrCreateIntegrationFlags()

		assert.NotNil(t, flags)
		assert.Same(t, flags, integrationTestFlags)
	})

	t.Run("getOrCreateIntegrationFlags returns existing flags", func(t *testing.T) {
		existing := &cluster.FlagContainer{}
		integrationTestFlags = existing

		flags := getOrCreateIntegrationFlags()

		assert.Same(t, existing, flags)
	})

	t.Run("SetVerboseForIntegrationTesting", func(t *testing.T) {
		integrationTestFlags = nil

		SetVerboseForIntegrationTesting(true)

		assert.NotNil(t, integrationTestFlags)
		// Note: The actual verbose setting is handled by testutil.SetVerboseMode
	})
}

func TestFlagContainerLifecycle(t *testing.T) {
	t.Run("complete lifecycle", func(t *testing.T) {
		// Start clean
		ResetGlobalFlags()
		assert.Nil(t, globalFlags)

		// Initialize
		InitGlobalFlags()
		assert.NotNil(t, globalFlags)

		// Get flags
		flags := GetGlobalFlags()
		assert.Same(t, globalFlags, flags)

		// Set test executor
		mockExecutor := testutil.NewTestMockExecutor()
		SetTestExecutor(mockExecutor)
		assert.Equal(t, mockExecutor, globalFlags.Executor)

		// Get service
		service := GetCommandService()
		assert.NotNil(t, service)

		// Reset
		ResetGlobalFlags()
		assert.Nil(t, globalFlags)
	})
}

func TestCmdHelpersEdgeCases(t *testing.T) {
	t.Run("multiple calls to InitGlobalFlags are safe", func(t *testing.T) {
		ResetGlobalFlags()

		InitGlobalFlags()
		first := globalFlags

		InitGlobalFlags()
		second := globalFlags

		assert.Same(t, first, second, "Multiple calls should not create new instances")
	})

	t.Run("GetCommandService with partial nil flags", func(t *testing.T) {
		// Test when globalFlags exists but Global is nil
		globalFlags = &cluster.FlagContainer{}
		globalFlags.Global = nil

		service := GetCommandService()
		assert.NotNil(t, service)

		// Clean up
		ResetGlobalFlags()
	})

	t.Run("error handling in WrapCommandWithCommonSetup with nil flags", func(t *testing.T) {
		originalFlags := globalFlags
		globalFlags = nil

		wrappedFunc := WrapCommandWithCommonSetup(func(cmd *cobra.Command, args []string) error {
			return assert.AnError
		})

		cmd := &cobra.Command{}
		err := wrappedFunc(cmd, []string{})

		// WrapCommandWithCommonSetup returns nil after handling the error to prevent double error messages
		assert.Nil(t, err)

		// Clean up
		globalFlags = originalFlags
	})
}

func TestConcurrency(t *testing.T) {
	t.Run("concurrent access to GetGlobalFlags", func(t *testing.T) {
		ResetGlobalFlags()

		// Simulate concurrent access
		done := make(chan bool, 2)
		var flag1, flag2 *cluster.FlagContainer

		go func() {
			flag1 = GetGlobalFlags()
			done <- true
		}()

		go func() {
			flag2 = GetGlobalFlags()
			done <- true
		}()

		// Wait for both goroutines
		<-done
		<-done

		assert.NotNil(t, flag1)
		assert.NotNil(t, flag2)
		assert.Same(t, flag1, flag2, "Concurrent access should return same instance")
	})
}

func TestComprehensiveFunctionCoverage(t *testing.T) {
	t.Run("GetCommandService with various flag states", func(t *testing.T) {
		// Test with nil globalFlags
		originalFlags := globalFlags
		globalFlags = nil

		service := GetCommandService()
		assert.NotNil(t, service)

		// Test with globalFlags but nil Global
		globalFlags = &cluster.FlagContainer{}
		service = GetCommandService()
		assert.NotNil(t, service)

		// Test with complete flags but nil executor
		InitGlobalFlags()
		globalFlags.Executor = nil
		if globalFlags.Global != nil {
			globalFlags.Global.DryRun = true
			globalFlags.Global.Verbose = false
		}

		service = GetCommandService()
		assert.NotNil(t, service)

		// Clean up
		globalFlags = originalFlags
	})

	t.Run("WrapCommandWithCommonSetup comprehensive error handling", func(t *testing.T) {
		InitGlobalFlags()

		// Test with different verbose settings
		testCases := []struct {
			name    string
			verbose bool
		}{
			{"verbose_true", true},
			{"verbose_false", false},
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				if globalFlags.Global != nil {
					globalFlags.Global.Verbose = tc.verbose
				}

				wrappedFunc := WrapCommandWithCommonSetup(func(cmd *cobra.Command, args []string) error {
					return assert.AnError
				})

				cmd := &cobra.Command{}
				err := wrappedFunc(cmd, []string{})
				// WrapCommandWithCommonSetup returns nil after handling the error to prevent double error messages
				assert.Nil(t, err)
			})
		}
	})

	t.Run("SyncGlobalFlags with different states", func(t *testing.T) {
		// Test with various flag container states
		testCases := []struct {
			name  string
			setup func()
		}{
			{
				"nil_globalFlags",
				func() { globalFlags = nil },
			},
			{
				"nil_Global_field",
				func() {
					globalFlags = &cluster.FlagContainer{}
					globalFlags.Global = nil
				},
			},
			{
				"complete_flags",
				func() { InitGlobalFlags() },
			},
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				tc.setup()
				// Should not panic
				SyncGlobalFlags()
			})
		}
	})

	t.Run("ValidateGlobalFlags with different states", func(t *testing.T) {
		testCases := []struct {
			name        string
			setup       func()
			expectError bool
		}{
			{
				"nil_globalFlags",
				func() { globalFlags = nil },
				false,
			},
			{
				"nil_Global_field",
				func() {
					globalFlags = &cluster.FlagContainer{}
					globalFlags.Global = nil
				},
				false,
			},
			{
				"valid_flags",
				func() { InitGlobalFlags() },
				false,
			},
		}

		for _, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				tc.setup()
				err := ValidateGlobalFlags()
				if tc.expectError {
					// WrapCommandWithCommonSetup returns nil after handling the error to prevent double error messages
					assert.Nil(t, err)
				} else {
					assert.NoError(t, err)
				}
			})
		}
	})
}

func TestPrivateHelperFunctions(t *testing.T) {
	t.Run("getOrCreateIntegrationFlags functionality", func(t *testing.T) {
		// Reset integration flags
		integrationTestFlags = nil

		// First call should create new flags
		flags1 := getOrCreateIntegrationFlags()
		assert.NotNil(t, flags1)
		assert.Same(t, flags1, integrationTestFlags)

		// Second call should return existing flags
		flags2 := getOrCreateIntegrationFlags()
		assert.Same(t, flags1, flags2)

		// Clean up
		integrationTestFlags = nil
	})
}

func TestErrorScenarios(t *testing.T) {
	t.Run("WrapCommandWithCommonSetup with nil error", func(t *testing.T) {
		InitGlobalFlags()

		wrappedFunc := WrapCommandWithCommonSetup(func(cmd *cobra.Command, args []string) error {
			return nil
		})

		cmd := &cobra.Command{}
		err := wrappedFunc(cmd, []string{})
		assert.NoError(t, err)
	})

	t.Run("GetCommandService with injected test executor", func(t *testing.T) {
		InitGlobalFlags()
		mockExecutor := testutil.NewTestMockExecutor()

		// Set the executor
		globalFlags.Executor = mockExecutor

		service := GetCommandService()
		assert.NotNil(t, service)

		// Clean up
		globalFlags.Executor = nil
	})
}

func TestBoundaryConditions(t *testing.T) {
	t.Run("multiple resets and initializations", func(t *testing.T) {
		// Multiple resets
		ResetGlobalFlags()
		ResetGlobalFlags()
		ResetGlobalFlags()

		assert.Nil(t, globalFlags)

		// Multiple initializations
		InitGlobalFlags()
		first := globalFlags
		InitGlobalFlags()
		InitGlobalFlags()

		assert.Same(t, first, globalFlags, "Multiple initializations should not create new instances")
	})

	t.Run("ResetTestFlags comprehensive cleanup", func(t *testing.T) {
		// Set up both global and integration flags
		InitGlobalFlags()
		integrationTestFlags = &cluster.FlagContainer{}

		assert.NotNil(t, globalFlags)
		assert.NotNil(t, integrationTestFlags)

		// Reset everything
		ResetTestFlags()

		assert.Nil(t, globalFlags)
		assert.Nil(t, integrationTestFlags)
	})

	t.Run("SetVerboseForIntegrationTesting creates flags if needed", func(t *testing.T) {
		integrationTestFlags = nil

		// This should create integration flags if they don't exist
		SetVerboseForIntegrationTesting(true)

		assert.NotNil(t, integrationTestFlags)

		// Clean up
		integrationTestFlags = nil
	})
}

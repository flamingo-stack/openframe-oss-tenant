// Package common provides shared utilities and patterns for OpenFrame CLI commands.
//
// This package contains common functionality used across all command packages,
// promoting consistency and reducing code duplication. It provides interfaces,
// error handling, flag management, and testing utilities.
//
// # Interfaces
//
// The package defines standard interfaces for command operations:
//
//   - ClusterCommand: Interface for cluster command operations
//   - ClusterCommandBuilder: Builder pattern for creating consistent commands
//   - BaseClusterCommand: Common functionality for cluster commands
//
// # Error Handling
//
// Structured error types and handling:
//
//   - ClusterError: Errors specific to cluster operations
//   - ValidationError: Input validation failures  
//   - CommandError: Command execution failures
//   - ErrorHandler: Standardized error display and logging
//
// Example usage:
//
//	err := cmdCommon.CreateClusterError("create", "my-cluster", cluster.ClusterTypeK3d, originalErr)
//	handler := cmdCommon.NewErrorHandler(verbose)
//	handler.HandleError(err)
//
// # Flag Management
//
// Centralized flag handling with validation:
//
//   - GlobalFlags: Flags common to all commands (verbose, dry-run, force)
//   - Command-specific flag structs (CreateFlags, ListFlags, etc.)
//   - FlagManager: Consistent flag setup and validation
//   - Standard flag descriptions and help text
//
// Example usage:
//
//	flags := &cmdCommon.CreateFlags{}
//	cmdCommon.AddCreateFlags(cmd, flags)
//	if err := cmdCommon.ValidateCreateFlags(flags); err != nil {
//		return err
//	}
//
// # Cluster Selection
//
// Unified cluster selection patterns:
//
//   - ClusterSelection: Handles interactive cluster selection
//   - ClusterSelectionResult: Contains selected cluster name and type
//   - HandleClusterSelectionWithType(): Main selection function
//
// Example usage:
//
//	selection, err := cmdCommon.HandleClusterSelectionWithType(ctx, manager, args, "Select cluster:")
//	if err != nil {
//		return err
//	}
//	if selection.Name == "" {
//		cmdCommon.ShowOperationCancelled()
//		return nil
//	}
//
// # Testing Utilities
//
// Comprehensive testing support:
//
//   - CommandTester: Utilities for testing cobra commands
//   - TestCase: Standardized test case structure
//   - Standard test suites for common scenarios
//   - Benchmarking utilities
//
// Example usage:
//
//	tester := cmdCommon.NewCommandTester(t, command)
//	testCases := []cmdCommon.TestCase{
//		{
//			Name: "valid_input",
//			Args: []string{"test-cluster"},
//			Flags: map[string]string{"verbose": "true"},
//			ExpectedError: false,
//		},
//	}
//	tester.RunTestCases(testCases)
//
// # Helper Functions
//
// Common helper functions:
//
//   - ConfirmDeletion(): Standardized deletion confirmation
//   - ShowOperationCancelled(): Consistent cancellation messages
//   - FormatSuccessMessage(): Standardized success message formatting
//   - HandleSpinnerError(): Consistent spinner error handling
//
// # Design Principles
//
// The package follows these design principles:
//
//  1. Consistency: All commands use the same patterns and interfaces
//  2. Reusability: Common functionality is extracted and shared
//  3. Testability: Comprehensive testing utilities and patterns
//  4. Maintainability: Clear interfaces and structured error handling
//  5. User Experience: Consistent UI patterns and error messages
//
// # Usage Guidelines
//
// When implementing new commands:
//
//  1. Use ClusterCommandBuilder for creating commands
//  2. Follow the standard command execution pattern
//  3. Use structured error types for all errors
//  4. Apply consistent flag handling and validation
//  5. Use the testing utilities for comprehensive test coverage
//  6. Follow the established UI patterns for user interaction
//
// # Dependencies
//
// The package depends on:
//   - internal/cluster: Core cluster management types and interfaces
//   - internal/factory: Factory functions for creating managers
//   - internal/ui/common: UI utilities for user interaction
//   - github.com/spf13/cobra: Command-line interface framework
//   - github.com/pterm/pterm: Terminal formatting and styling
//   - github.com/stretchr/testify: Testing assertions and utilities
package common
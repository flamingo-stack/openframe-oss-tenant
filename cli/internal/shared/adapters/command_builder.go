package adapters

import (
	"github.com/spf13/cobra"
)

// CommandBuilder provides a fluent interface for building cobra commands
type CommandBuilder struct {
	cmd *cobra.Command
}

// NewCommandBuilder creates a new command builder
func NewCommandBuilder(use, short string) *CommandBuilder {
	return &CommandBuilder{
		cmd: &cobra.Command{
			Use:   use,
			Short: short,
		},
	}
}

// Long sets the long description
func (cb *CommandBuilder) Long(long string) *CommandBuilder {
	cb.cmd.Long = long
	return cb
}

// Aliases sets command aliases
func (cb *CommandBuilder) Aliases(aliases []string) *CommandBuilder {
	cb.cmd.Aliases = aliases
	return cb
}

// Args sets argument validation
func (cb *CommandBuilder) Args(args cobra.PositionalArgs) *CommandBuilder {
	cb.cmd.Args = args
	return cb
}

// PreRunE sets the pre-run function with error handling
func (cb *CommandBuilder) PreRunE(fn func(*cobra.Command, []string) error) *CommandBuilder {
	cb.cmd.PreRunE = fn
	return cb
}

// RunE sets the run function with error handling
func (cb *CommandBuilder) RunE(fn func(*cobra.Command, []string) error) *CommandBuilder {
	cb.cmd.RunE = fn
	return cb
}

// PersistentPreRunE sets the persistent pre-run function
func (cb *CommandBuilder) PersistentPreRunE(fn func(*cobra.Command, []string) error) *CommandBuilder {
	cb.cmd.PersistentPreRunE = fn
	return cb
}

// AddSubcommand adds a subcommand
func (cb *CommandBuilder) AddSubcommand(cmd *cobra.Command) *CommandBuilder {
	cb.cmd.AddCommand(cmd)
	return cb
}

// AddBoolFlag adds a boolean flag
func (cb *CommandBuilder) AddBoolFlag(name, shorthand string, defaultValue bool, usage string) *CommandBuilder {
	if shorthand != "" {
		cb.cmd.Flags().BoolP(name, shorthand, defaultValue, usage)
	} else {
		cb.cmd.Flags().Bool(name, defaultValue, usage)
	}
	return cb
}

// AddStringFlag adds a string flag
func (cb *CommandBuilder) AddStringFlag(name, shorthand, defaultValue, usage string) *CommandBuilder {
	if shorthand != "" {
		cb.cmd.Flags().StringP(name, shorthand, defaultValue, usage)
	} else {
		cb.cmd.Flags().String(name, defaultValue, usage)
	}
	return cb
}

// AddIntFlag adds an integer flag
func (cb *CommandBuilder) AddIntFlag(name, shorthand string, defaultValue int, usage string) *CommandBuilder {
	if shorthand != "" {
		cb.cmd.Flags().IntP(name, shorthand, defaultValue, usage)
	} else {
		cb.cmd.Flags().Int(name, defaultValue, usage)
	}
	return cb
}

// Build returns the constructed cobra command
func (cb *CommandBuilder) Build() *cobra.Command {
	return cb.cmd
}

// FlagExtractor provides utilities for extracting flags from cobra commands
type FlagExtractor struct {
	cmd *cobra.Command
}

// NewFlagExtractor creates a new flag extractor
func NewFlagExtractor(cmd *cobra.Command) *FlagExtractor {
	return &FlagExtractor{cmd: cmd}
}

// GetBool safely extracts a boolean flag
func (fe *FlagExtractor) GetBool(name string) (bool, error) {
	return fe.cmd.Flags().GetBool(name)
}

// GetString safely extracts a string flag
func (fe *FlagExtractor) GetString(name string) (string, error) {
	return fe.cmd.Flags().GetString(name)
}

// GetInt safely extracts an integer flag
func (fe *FlagExtractor) GetInt(name string) (int, error) {
	return fe.cmd.Flags().GetInt(name)
}

// GetRootBool safely extracts a boolean flag from root command
func (fe *FlagExtractor) GetRootBool(name string) (bool, error) {
	return fe.cmd.Root().PersistentFlags().GetBool(name)
}

// GetRootString safely extracts a string flag from root command
func (fe *FlagExtractor) GetRootString(name string) (string, error) {
	return fe.cmd.Root().PersistentFlags().GetString(name)
}

// FlagChanged checks if a flag was explicitly set
func (fe *FlagExtractor) FlagChanged(name string) bool {
	return fe.cmd.Flags().Changed(name)
}

// ValidationResult represents the result of flag validation
type ValidationResult struct {
	IsValid bool
	Errors  []error
}

// NewValidationResult creates a new validation result
func NewValidationResult() *ValidationResult {
	return &ValidationResult{
		IsValid: true,
		Errors:  make([]error, 0),
	}
}

// AddError adds an error to the validation result
func (vr *ValidationResult) AddError(err error) {
	vr.IsValid = false
	vr.Errors = append(vr.Errors, err)
}

// HasErrors returns true if there are validation errors
func (vr *ValidationResult) HasErrors() bool {
	return !vr.IsValid
}

// GetFirstError returns the first validation error, or nil if none
func (vr *ValidationResult) GetFirstError() error {
	if len(vr.Errors) > 0 {
		return vr.Errors[0]
	}
	return nil
}
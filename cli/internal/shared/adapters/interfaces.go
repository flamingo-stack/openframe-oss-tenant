package adapters

import (
	"github.com/spf13/cobra"
)

// CommandHandler defines the interface for command handlers
type CommandHandler interface {
	// Execute handles the command execution
	Execute(cmd *cobra.Command, args []string) error
}

// FlagsProvider defines the interface for providing command flags
type FlagsProvider interface {
	// GetFlagDefinitions returns all flag definitions for the command
	GetFlagDefinitions() []FlagDefinition
	
	// AddFlags adds all flags to the given command
	AddFlags(cmd *cobra.Command)
}

// CommandAdapter combines command handling and flag management
type CommandAdapter interface {
	CommandHandler
	FlagsProvider
}

// BaseCommandAdapter provides common functionality for command adapters
type BaseCommandAdapter struct {
	flagExtractor *FlagExtractor
}

// NewBaseCommandAdapter creates a new base command adapter
func NewBaseCommandAdapter() *BaseCommandAdapter {
	return &BaseCommandAdapter{}
}

// ExtractFlags creates a flag extractor for the given command
func (bca *BaseCommandAdapter) ExtractFlags(cmd *cobra.Command) *FlagExtractor {
	bca.flagExtractor = NewFlagExtractor(cmd)
	return bca.flagExtractor
}

// ValidateRequired validates that required flags are present
func (bca *BaseCommandAdapter) ValidateRequired(flags map[string]interface{}) *ValidationResult {
	result := NewValidationResult()
	
	for name, value := range flags {
		switch v := value.(type) {
		case string:
			if v == "" {
				result.AddError(&RequiredFlagError{FlagName: name})
			}
		case bool:
			// Boolean flags don't need validation
		case int:
			if v < 0 {
				result.AddError(&InvalidFlagError{FlagName: name, Value: v, Reason: "must be non-negative"})
			}
		}
	}
	
	return result
}

// RequiredFlagError represents a missing required flag error
type RequiredFlagError struct {
	FlagName string
}

func (e *RequiredFlagError) Error() string {
	return "flag --" + e.FlagName + " is required"
}

// InvalidFlagError represents an invalid flag value error
type InvalidFlagError struct {
	FlagName string
	Value    interface{}
	Reason   string
}

func (e *InvalidFlagError) Error() string {
	return "invalid value for flag --" + e.FlagName + ": " + e.Reason
}

// FlagDefinition represents a command flag definition
type FlagDefinition struct {
	Name         string
	Shorthand    string
	DefaultValue interface{}
	Usage        string
	Required     bool
}

// CommandMetadata contains metadata about a command
type CommandMetadata struct {
	Use         string
	Short       string
	Long        string
	Aliases     []string
	Examples    []string
	Args        cobra.PositionalArgs
}

// ExampleBuilder helps build command examples
type ExampleBuilder struct {
	examples []string
}

// NewExampleBuilder creates a new example builder
func NewExampleBuilder() *ExampleBuilder {
	return &ExampleBuilder{
		examples: make([]string, 0),
	}
}

// Add adds an example
func (eb *ExampleBuilder) Add(description, command string) *ExampleBuilder {
	example := "  " + command + "    # " + description
	eb.examples = append(eb.examples, example)
	return eb
}

// Build returns the formatted examples string
func (eb *ExampleBuilder) Build(commandName string) string {
	if len(eb.examples) == 0 {
		return ""
	}
	
	result := "Examples:\n"
	for _, example := range eb.examples {
		result += "  " + commandName + " " + example + "\n"
	}
	
	return result
}

// PreRunEChain allows chaining multiple PreRunE functions
type PreRunEChain struct {
	functions []func(*cobra.Command, []string) error
}

// NewPreRunEChain creates a new PreRunE chain
func NewPreRunEChain() *PreRunEChain {
	return &PreRunEChain{
		functions: make([]func(*cobra.Command, []string) error, 0),
	}
}

// Add adds a function to the chain
func (prc *PreRunEChain) Add(fn func(*cobra.Command, []string) error) *PreRunEChain {
	prc.functions = append(prc.functions, fn)
	return prc
}

// Execute executes all functions in the chain
func (prc *PreRunEChain) Execute(cmd *cobra.Command, args []string) error {
	for _, fn := range prc.functions {
		if err := fn(cmd, args); err != nil {
			return err
		}
	}
	return nil
}

// Build returns a single PreRunE function that executes the entire chain
func (prc *PreRunEChain) Build() func(*cobra.Command, []string) error {
	return prc.Execute
}
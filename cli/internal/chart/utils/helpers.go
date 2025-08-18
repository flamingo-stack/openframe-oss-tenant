package utils

import (
	"github.com/flamingo/openframe/internal/shared/flags"
)

// GlobalFlags holds all global flag configurations for chart commands
var globalFlags *ChartGlobalFlags

// ChartGlobalFlags contains chart-specific global flags
type ChartGlobalFlags struct {
	Global *flags.CommonFlags
}

// InitGlobalFlags initializes global flags for chart commands
func InitGlobalFlags() {
	if globalFlags == nil {
		globalFlags = &ChartGlobalFlags{
			Global: &flags.CommonFlags{},
		}
	}
}

// GetGlobalFlags returns the initialized global flags
func GetGlobalFlags() *ChartGlobalFlags {
	if globalFlags == nil {
		InitGlobalFlags()
	}
	return globalFlags
}
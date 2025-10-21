package cluster

import (
	"github.com/flamingo-stack/openframe/openframe/internal/cluster/models"
	"github.com/flamingo-stack/openframe/openframe/internal/cluster/providers/k3d"
	"github.com/flamingo-stack/openframe/openframe/internal/shared/executor"
)

// FlagContainer holds all flag structures needed by cluster commands
type FlagContainer struct {
	// Flag instances
	Global  *models.GlobalFlags  `json:"global"`
	Create  *models.CreateFlags  `json:"create"`
	List    *models.ListFlags    `json:"list"`
	Status  *models.StatusFlags  `json:"status"`
	Delete  *models.DeleteFlags  `json:"delete"`
	Cleanup *models.CleanupFlags `json:"cleanup"`

	// Dependencies for testing and execution
	Executor    executor.CommandExecutor `json:"-"` // Command executor for external commands
	TestManager *k3d.K3dManager          `json:"-"` // Test K3D cluster manager for unit tests
}

// GetGlobal implements models.CommandFlags interface
func (f *FlagContainer) GetGlobal() *models.GlobalFlags {
	return f.Global
}

// GetExecutor implements models.CommandExecutor interface
func (f *FlagContainer) GetExecutor() executor.CommandExecutor {
	return f.Executor
}

// NewFlagContainer creates a new flag container with initialized flags
func NewFlagContainer() *FlagContainer {
	return &FlagContainer{
		Global:  &models.GlobalFlags{},
		Create:  &models.CreateFlags{ClusterType: "k3d", NodeCount: 3, K8sVersion: "v1.31.5-k3s1"},
		List:    &models.ListFlags{},
		Status:  &models.StatusFlags{},
		Delete:  &models.DeleteFlags{},
		Cleanup: &models.CleanupFlags{},
	}
}

// SyncGlobalFlags synchronizes global flags across all command-specific flags
func (f *FlagContainer) SyncGlobalFlags() {
	if f.Global != nil {
		f.Create.GlobalFlags = *f.Global
		f.List.GlobalFlags = *f.Global
		f.Status.GlobalFlags = *f.Global
		f.Delete.GlobalFlags = *f.Global
		f.Cleanup.GlobalFlags = *f.Global
	}
}

// Reset resets all flags to their zero values (for testing)
func (f *FlagContainer) Reset() {
	f.Global = &models.GlobalFlags{}
	f.Create = &models.CreateFlags{} // Empty for reset, defaults are set in NewFlagContainer
	f.List = &models.ListFlags{}
	f.Status = &models.StatusFlags{}
	f.Delete = &models.DeleteFlags{}
	f.Cleanup = &models.CleanupFlags{}
}

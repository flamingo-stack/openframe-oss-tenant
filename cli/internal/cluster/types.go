package cluster

import (
	"github.com/flamingo/openframe/internal/cluster/domain"
	"github.com/flamingo/openframe/internal/cluster/k3d"
	"github.com/flamingo/openframe/internal/shared/executor"
)

// FlagContainer holds all flag structures needed by cluster commands
type FlagContainer struct {
	// Flag instances
	Global  *domain.GlobalFlags  `json:"global"`
	Create  *domain.CreateFlags  `json:"create"`
	List    *domain.ListFlags    `json:"list"`
	Status  *domain.StatusFlags  `json:"status"`
	Delete  *domain.DeleteFlags  `json:"delete"`
	Cleanup *domain.CleanupFlags `json:"cleanup"`
	
	// Dependencies for testing and execution
	Executor    executor.CommandExecutor `json:"-"` // Command executor for external commands
	TestManager *k3d.K3dManager           `json:"-"` // Test K3D cluster manager for unit tests
}

// GetGlobal implements domain.CommandFlags interface
func (f *FlagContainer) GetGlobal() *domain.GlobalFlags {
	return f.Global
}

// GetExecutor implements domain.CommandExecutor interface
func (f *FlagContainer) GetExecutor() executor.CommandExecutor {
	return f.Executor
}

// NewFlagContainer creates a new flag container with initialized flags
func NewFlagContainer() *FlagContainer {
	return &FlagContainer{
		Global:  &domain.GlobalFlags{},
		Create:  &domain.CreateFlags{ClusterType: "k3d", NodeCount: 3, K8sVersion: "v1.31.5-k3s1"},
		List:    &domain.ListFlags{},
		Status:  &domain.StatusFlags{},
		Delete:  &domain.DeleteFlags{},
		Cleanup: &domain.CleanupFlags{},
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
	f.Global = &domain.GlobalFlags{}
	f.Create = &domain.CreateFlags{} // Empty for reset, defaults are set in NewFlagContainer
	f.List = &domain.ListFlags{}
	f.Status = &domain.StatusFlags{}
	f.Delete = &domain.DeleteFlags{}
	f.Cleanup = &domain.CleanupFlags{}
}


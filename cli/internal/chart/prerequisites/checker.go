package prerequisites

import (
	"strings"

	"github.com/flamingo-stack/openframe/openframe/internal/chart/prerequisites/certificates"
	"github.com/flamingo-stack/openframe/openframe/internal/chart/prerequisites/git"
	"github.com/flamingo-stack/openframe/openframe/internal/chart/prerequisites/helm"
	"github.com/flamingo-stack/openframe/openframe/internal/chart/prerequisites/memory"
)

type PrerequisiteChecker struct {
	requirements []Requirement
}

type Requirement struct {
	Name        string
	Command     string
	IsInstalled func() bool
	InstallHelp func() string
}

func NewPrerequisiteChecker() *PrerequisiteChecker {
	return &PrerequisiteChecker{
		requirements: []Requirement{
			{
				Name:        "Git",
				Command:     "git",
				IsInstalled: func() bool { return git.NewGitChecker().IsInstalled() },
				InstallHelp: func() string { return git.NewGitChecker().GetInstallInstructions() },
			},
			{
				Name:        "Helm",
				Command:     "helm",
				IsInstalled: func() bool { return helm.NewHelmInstaller().IsInstalled() },
				InstallHelp: func() string { return helm.NewHelmInstaller().GetInstallHelp() },
			},
			{
				Name:        "Memory",
				Command:     "memory",
				IsInstalled: func() bool { return memory.NewMemoryChecker().IsInstalled() },
				InstallHelp: func() string { return memory.NewMemoryChecker().GetInstallHelp() },
			},
			{
				Name:        "Certificates",
				Command:     "certificates",
				IsInstalled: func() bool { return certificates.NewCertificateInstaller().IsInstalled() },
				InstallHelp: func() string { return certificates.NewCertificateInstaller().GetInstallHelp() },
			},
		},
	}
}

func (pc *PrerequisiteChecker) CheckAll() (bool, []string) {
	var missing []string
	allPresent := true

	for _, req := range pc.requirements {
		if !req.IsInstalled() {
			missing = append(missing, req.Name)
			allPresent = false
		}
	}

	return allPresent, missing
}

func (pc *PrerequisiteChecker) GetInstallInstructions(missingTools []string) []string {
	var instructions []string

	for _, tool := range missingTools {
		for _, req := range pc.requirements {
			if strings.EqualFold(req.Name, tool) {
				instructions = append(instructions, req.InstallHelp())
				break
			}
		}
	}

	return instructions
}

func CheckPrerequisites() error {
	installer := NewInstaller()
	return installer.CheckAndInstall()
}

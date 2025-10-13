package prerequisites

import (
	"strings"

	"github.com/flamingo-stack/openframe/openframe/internal/dev/prerequisites/jq"
	"github.com/flamingo-stack/openframe/openframe/internal/dev/prerequisites/scaffold"
	"github.com/flamingo-stack/openframe/openframe/internal/dev/prerequisites/telepresence"
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
				Name:        "Telepresence",
				Command:     "telepresence",
				IsInstalled: func() bool { return telepresence.NewTelepresenceInstaller().IsInstalled() },
				InstallHelp: func() string { return telepresence.NewTelepresenceInstaller().GetInstallHelp() },
			},
			{
				Name:        "jq",
				Command:     "jq",
				IsInstalled: func() bool { return jq.NewJqInstaller().IsInstalled() },
				InstallHelp: func() string { return jq.NewJqInstaller().GetInstallHelp() },
			},
			{
				Name:        "Skaffold",
				Command:     "skaffold",
				IsInstalled: func() bool { return scaffold.NewScaffoldInstaller().IsInstalled() },
				InstallHelp: func() string { return scaffold.NewScaffoldInstaller().GetInstallHelp() },
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

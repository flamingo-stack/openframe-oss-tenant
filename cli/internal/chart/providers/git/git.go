package git

// CloneResult contains the result of a git clone operation
type CloneResult struct {
	TempDir   string
	ChartPath string
}
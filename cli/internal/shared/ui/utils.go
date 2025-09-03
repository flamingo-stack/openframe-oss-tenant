package ui

import (
	"fmt"
	"time"
)

// FormatAge formats a time duration into a human-readable age string
func FormatAge(createdAt time.Time) string {
	if createdAt.IsZero() {
		return "unknown"
	}
	
	duration := time.Since(createdAt)
	
	days := int(duration.Hours() / 24)
	hours := int(duration.Hours()) % 24
	minutes := int(duration.Minutes()) % 60
	seconds := int(duration.Seconds()) % 60
	
	if days > 0 {
		return fmt.Sprintf("%dd", days)
	} else if hours > 0 {
		return fmt.Sprintf("%dh", hours)
	} else if minutes > 0 {
		return fmt.Sprintf("%dm", minutes)
	} else {
		return fmt.Sprintf("%ds", seconds)
	}
}
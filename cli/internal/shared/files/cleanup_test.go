package files

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRegisterTempFile_NoBackupCreated(t *testing.T) {
	cleanup := NewFileCleanup()

	// Create a temporary directory
	tmpDir := t.TempDir()
	tempFile := filepath.Join(tmpDir, "temp-values.yaml")
	backupFile := tempFile + ".cli-backup"

	// Create the temporary file (simulating our temporary values file)
	err := os.WriteFile(tempFile, []byte("test content"), 0644)
	require.NoError(t, err)

	// Register the temporary file
	err = cleanup.RegisterTempFile(tempFile)
	assert.NoError(t, err)

	// Verify NO backup file was created
	assert.NoFileExists(t, backupFile, "Backup file should NOT be created for temporary files")

	// Verify the temporary file still exists (hasn't been touched yet)
	assert.FileExists(t, tempFile, "Original temporary file should still exist")

	// Run cleanup to simulate end of operation
	err = cleanup.RestoreFiles(false)
	assert.NoError(t, err)

	// Verify temporary file was deleted
	assert.NoFileExists(t, tempFile, "Temporary file should be deleted during cleanup")

	// Verify no backup file exists (since none was created)
	assert.NoFileExists(t, backupFile, "No backup file should exist after cleanup")
}

func TestRegisterTempFile_MultipleFiles(t *testing.T) {
	cleanup := NewFileCleanup()

	tmpDir := t.TempDir()
	tempFile1 := filepath.Join(tmpDir, "temp-values.yaml")
	tempFile2 := filepath.Join(tmpDir, "another-temp.yaml")

	// Create temporary files
	err := os.WriteFile(tempFile1, []byte("content1"), 0644)
	require.NoError(t, err)
	err = os.WriteFile(tempFile2, []byte("content2"), 0644)
	require.NoError(t, err)

	// Register both temporary files
	err = cleanup.RegisterTempFile(tempFile1)
	assert.NoError(t, err)
	err = cleanup.RegisterTempFile(tempFile2)
	assert.NoError(t, err)

	// Verify NO backup files were created
	assert.NoFileExists(t, tempFile1+".cli-backup")
	assert.NoFileExists(t, tempFile2+".cli-backup")

	// Run cleanup
	err = cleanup.RestoreFiles(false)
	assert.NoError(t, err)

	// Verify both temporary files were deleted, no backups exist
	assert.NoFileExists(t, tempFile1)
	assert.NoFileExists(t, tempFile2)
	assert.NoFileExists(t, tempFile1+".cli-backup")
	assert.NoFileExists(t, tempFile2+".cli-backup")
}

func TestFileCleanup_CleanupOnSuccessOnly_Behavior(t *testing.T) {
	cleanup := NewFileCleanup()
	cleanup.SetCleanupOnSuccessOnly(true) // Enable success-only cleanup mode

	// Create a temporary directory
	tmpDir := t.TempDir()
	tempFile := filepath.Join(tmpDir, "temp-values.yaml")

	// Create the temporary file (simulating our temporary values file)
	err := os.WriteFile(tempFile, []byte("test content"), 0644)
	require.NoError(t, err)

	// Register the temporary file
	err = cleanup.RegisterTempFile(tempFile)
	assert.NoError(t, err)

	// Verify the temporary file exists
	assert.FileExists(t, tempFile, "Temporary file should exist before cleanup")

	t.Run("CleanupOnFailure_KeepsFileUntilSuccess", func(t *testing.T) {
		// Simulate failure case - should NOT delete temp file
		err = cleanup.RestoreFilesWithResult(false, false) // verbose=false, success=false
		assert.NoError(t, err)

		// Verify temporary file still exists (not cleaned on failure when success-only is enabled)
		assert.FileExists(t, tempFile, "Temporary file should still exist after failed cleanup when success-only mode is enabled")
	})

	t.Run("CleanupOnSuccess_DeletesFile", func(t *testing.T) {
		// Simulate success case - should delete temp file
		err = cleanup.RestoreFilesWithResult(false, true) // verbose=false, success=true
		assert.NoError(t, err)

		// Verify temporary file was deleted
		assert.NoFileExists(t, tempFile, "Temporary file should be deleted after successful cleanup")
	})
}

func TestFileCleanup_RegularMode_AlwaysCleanup(t *testing.T) {
	cleanup := NewFileCleanup()
	// Default mode (not success-only) - should always cleanup

	// Create a temporary directory
	tmpDir := t.TempDir()
	tempFile := filepath.Join(tmpDir, "temp-values.yaml")

	// Create the temporary file
	err := os.WriteFile(tempFile, []byte("test content"), 0644)
	require.NoError(t, err)

	// Register the temporary file
	err = cleanup.RegisterTempFile(tempFile)
	assert.NoError(t, err)

	// Verify the temporary file exists
	assert.FileExists(t, tempFile, "Temporary file should exist before cleanup")

	// Regular mode should clean up regardless of success/failure
	err = cleanup.RestoreFilesWithResult(false, false) // verbose=false, success=false
	assert.NoError(t, err)

	// Verify temporary file was deleted even on "failure"
	assert.NoFileExists(t, tempFile, "Temporary file should be deleted in regular cleanup mode regardless of success")
}

func TestFileCleanup_SignalInterruption_Scenario(t *testing.T) {
	// This test simulates the scenario where user presses CTRL-C
	cleanup := NewFileCleanup()
	cleanup.SetCleanupOnSuccessOnly(true)

	tmpDir := t.TempDir()
	tempFile := filepath.Join(tmpDir, "temp-values.yaml")

	// Create and register temporary file
	err := os.WriteFile(tempFile, []byte("interrupted content"), 0644)
	require.NoError(t, err)
	err = cleanup.RegisterTempFile(tempFile)
	require.NoError(t, err)

	// Simulate CTRL-C interruption (which should trigger immediate cleanup)
	// In the actual implementation, CTRL-C calls RestoreFiles() (not RestoreFilesOnSuccess)
	err = cleanup.RestoreFiles(false) // This should clean up immediately
	assert.NoError(t, err)

	// Verify file was cleaned up (CTRL-C should always cleanup, regardless of success-only mode)
	assert.NoFileExists(t, tempFile, "Temporary file should be cleaned up on CTRL-C interruption")
}

func TestFileCleanup_BackupFile_MemoryOnly(t *testing.T) {
	cleanup := NewFileCleanup()
	tmpDir := t.TempDir()
	testFile := filepath.Join(tmpDir, "test-file.txt")
	originalContent := "original content"

	// Create original file
	err := os.WriteFile(testFile, []byte(originalContent), 0644)
	require.NoError(t, err)

	// Backup file using memory-only mode
	err = cleanup.BackupFile(testFile, true)
	assert.NoError(t, err)

	// Verify no physical backup file was created
	assert.NoFileExists(t, testFile+".cli-backup", "No physical backup should be created in memory-only mode")

	// Modify the original file
	err = os.WriteFile(testFile, []byte("modified content"), 0644)
	require.NoError(t, err)

	// Restore the file
	err = cleanup.RestoreFiles(false)
	assert.NoError(t, err)

	// Verify original content was restored
	content, err := os.ReadFile(testFile)
	require.NoError(t, err)
	assert.Equal(t, originalContent, string(content), "Original content should be restored from memory")
}

func TestFileCleanup_BackupFile_PhysicalBackup(t *testing.T) {
	cleanup := NewFileCleanup()
	tmpDir := t.TempDir()
	testFile := filepath.Join(tmpDir, "test-file.txt")
	originalContent := "original content"

	// Create original file
	err := os.WriteFile(testFile, []byte(originalContent), 0644)
	require.NoError(t, err)

	// Backup file using physical backup mode
	err = cleanup.BackupFile(testFile, false)
	assert.NoError(t, err)

	// Verify physical backup file was created
	backupFile := testFile + ".cli-backup"
	assert.FileExists(t, backupFile, "Physical backup should be created")

	// Verify backup content matches original
	backupContent, err := os.ReadFile(backupFile)
	require.NoError(t, err)
	assert.Equal(t, originalContent, string(backupContent), "Backup content should match original")

	// Modify the original file
	err = os.WriteFile(testFile, []byte("modified content"), 0644)
	require.NoError(t, err)

	// Restore the file
	err = cleanup.RestoreFiles(false)
	assert.NoError(t, err)

	// Verify original content was restored
	content, err := os.ReadFile(testFile)
	require.NoError(t, err)
	assert.Equal(t, originalContent, string(content), "Original content should be restored from physical backup")

	// Verify backup file was cleaned up
	assert.NoFileExists(t, backupFile, "Physical backup should be cleaned up after restore")
}
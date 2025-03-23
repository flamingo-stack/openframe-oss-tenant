############################
# Agent Executable Verification Function
############################

function Test-AgentExecutable {
    param (
        [string]$Path
    )
    
    if (-not (Test-Path $Path)) {
        Write-Host "ERROR: Agent executable not found at $Path" -ForegroundColor Red
        return $false
    }
    
    try {
        $fileInfo = Get-Item $Path
        if ($fileInfo.Length -eq 0) {
            Write-Host "ERROR: Agent executable file is empty" -ForegroundColor Red
            return $false
        }
        
        # Check if file is locked or in use
        try {
            $fileStream = [System.IO.File]::Open($Path, 'Open', 'Read', 'None')
            $fileStream.Close()
            $fileStream.Dispose()
        } catch {
            Write-Host "WARNING: Agent executable file is locked or in use: $_" -ForegroundColor Yellow
            # Don't return false here as the file might be locked by a valid process
        }
        
        Write-Host "Agent executable verified at $Path" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "ERROR: Failed to verify agent executable: $_" -ForegroundColor Red
        return $false
    }
}

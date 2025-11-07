# OpenFrame Test Script
# This is a test PowerShell script for Tactical RMM
# It performs basic system information gathering

Write-Host "OpenFrame Test Script Execution Started"
Write-Host "========================================"
Write-Host ""

# Get Computer Information
Write-Host "Computer Name: $env:COMPUTERNAME"
Write-Host "User: $env:USERNAME"
Write-Host "OS Version: $([System.Environment]::OSVersion.VersionString)"
Write-Host ""

# Get System Uptime
$os = Get-WmiObject Win32_OperatingSystem
$uptime = (Get-Date) - $os.ConvertToDateTime($os.LastBootUpTime)
Write-Host "System Uptime: $($uptime.Days) days, $($uptime.Hours) hours, $($uptime.Minutes) minutes"
Write-Host ""

# Get Available Memory
$mem = Get-WmiObject Win32_OperatingSystem
$totalMemory = [math]::Round($mem.TotalVisibleMemorySize / 1MB, 2)
$freeMemory = [math]::Round($mem.FreePhysicalMemory / 1MB, 2)
$usedMemory = $totalMemory - $freeMemory
Write-Host "Memory Usage:"
Write-Host "  Total: $totalMemory GB"
Write-Host "  Used: $usedMemory GB"
Write-Host "  Free: $freeMemory GB"
Write-Host ""

# Get Disk Information
Write-Host "Disk Information:"
Get-WmiObject Win32_LogicalDisk -Filter "DriveType=3" | ForEach-Object {
    $size = [math]::Round($_.Size / 1GB, 2)
    $free = [math]::Round($_.FreeSpace / 1GB, 2)
    $used = $size - $free
    $percentFree = [math]::Round(($free / $size) * 100, 2)
    Write-Host "  Drive $($_.DeviceID)"
    Write-Host "    Total: $size GB"
    Write-Host "    Used: $used GB"
    Write-Host "    Free: $free GB ($percentFree%)"
}
Write-Host ""

Write-Host "========================================"
Write-Host "OpenFrame Test Script Execution Completed"
Write-Host ""
Write-Host "Exit Code: 0"
exit 0


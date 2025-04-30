#!/bin/bash
# OpenFrame Log Viewer Helper
# This script helps view log files whether they're compressed or not

LOG_DIR="/Library/Logs/OpenFrame"

function show_usage() {
  echo "OpenFrame Log Viewer"
  echo "Usage: $0 [option]"
  echo "Options:"
  echo "  daemon      - View daemon output log"
  echo "  error       - View daemon error log"
  echo "  app         - View main application log"
  echo "  all         - View all logs"
  echo "  unzip       - Decompress any compressed log files"
  echo "  help        - Show this help message"
}

function view_log() {
  local log_file="$1"
  local display_name="$2"
  
  echo "===== $display_name ====="
  
  if [ -f "$log_file" ]; then
    cat "$log_file"
  elif [ -f "$log_file.gz" ]; then
    echo "(Compressed log file, decompressing...)"
    gunzip -c "$log_file.gz"
  else
    echo "Log file not found: $log_file"
  fi
  
  echo ""
}

function decompress_logs() {
  echo "Checking for compressed log files..."
  
  for log_file in "$LOG_DIR"/*.gz; do
    if [ -f "$log_file" ]; then
      echo "Decompressing $log_file"
      gunzip -c "$log_file" > "${log_file%.gz}"
      sudo chmod 644 "${log_file%.gz}"
      sudo chown root:wheel "${log_file%.gz}"
      sudo rm "$log_file"
      echo "Created uncompressed file: ${log_file%.gz}"
    fi
  done
  
  echo "Decompression complete."
}

# Check permissions
if [ "$EUID" -ne 0 ]; then
  echo "This script requires elevated privileges to read log files."
  echo "Please run with sudo: sudo $0 $*"
  exit 1
fi

# Process command line arguments
if [ $# -eq 0 ]; then
  show_usage
  exit 0
fi

case "$1" in
  daemon)
    view_log "$LOG_DIR/daemon_output.log" "Daemon Output Log"
    ;;
  error)
    view_log "$LOG_DIR/daemon_error.log" "Daemon Error Log"
    ;;
  app)
    view_log "$LOG_DIR/openframe.log" "OpenFrame Application Log"
    ;;
  all)
    view_log "$LOG_DIR/openframe.log" "OpenFrame Application Log"
    view_log "$LOG_DIR/daemon_output.log" "Daemon Output Log"
    view_log "$LOG_DIR/daemon_error.log" "Daemon Error Log"
    ;;
  unzip)
    decompress_logs
    ;;
  help)
    show_usage
    ;;
  *)
    echo "Unknown option: $1"
    show_usage
    exit 1
    ;;
esac

exit 0 
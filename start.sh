#!/usr/bin/env bash
# start.sh - Launch script for TenderPulse Tender Tracker

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

PORT=${PORT:-8000}

echo "============================================================"
echo " Starting TenderPulse Tracker"
echo " Government & Private Sector Tender Management"
echo " Categories: Software/Systems Dev & Digital Marketing"
echo "============================================================"
echo "Opening browser at: http://localhost:$PORT"

# Open browser if on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
  (sleep 1 && open "http://localhost:$PORT") &
fi

python3 server.py

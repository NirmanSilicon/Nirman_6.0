#!/usr/bin/env bash
# GhostSight demo: scan this computer, then analyse and explain the result.
# It uses a throwaway home folder, so your real scans and logs are not touched.
# Needs: the virtual environment active, nmap, Ollama with qwen3:4b, internet for step 2.
set -euo pipefail

if ! command -v ghostsight >/dev/null; then
    echo "Activate the virtual environment first: source .venv/bin/activate"
    exit 1
fi

pause() {
    read -r -p "Press Enter for the next step. "
}

step() {
    echo
    echo "=== $1 ==="
}

DEMO_HOME="$(mktemp -d /tmp/ghostsight-demo.XXXXXX)"
export GHOSTSIGHT_HOME="$DEMO_HOME"
mkdir -p "$DEMO_HOME/config"
printf '[scope]\nallowed = ["127.0.0.1"]\n' > "$DEMO_HOME/config/scope.local.toml"
echo "Demo home: $DEMO_HOME"
echo "Only 127.0.0.1 (this computer) is in scope."
pause

step "1. Scan this computer (low-noise profile, about a minute)"
ghostsight scan --target 127.0.0.1
pause

step "2. Download OpenSSH CVE data from NVD (needs internet)"
ghostsight nvd-fetch --vendor openbsd --product openssh --yes
pause

step "3. Preview the analysis (changes nothing)"
ghostsight analyse --scan scan_001
pause

step "4. Save the analysis into the scan folder"
ghostsight analyse --scan scan_001 --save
pause

step "5. Ask the local AI to explain the scan and save its text (can take minutes)"
ghostsight explain --scan scan_001 --save
pause

step "6. The final report"
REPORT="$(find "$DEMO_HOME" -name final_report.txt | head -n 1)"
echo "Report file: $REPORT"
sed -n '1,80p' "$REPORT"
pause

step "7. Check the audit log"
ghostsight audit verify

echo
echo "Demo finished. Files are in $DEMO_HOME"

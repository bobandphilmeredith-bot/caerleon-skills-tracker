#!/bin/zsh
cd /Users/meredith/caerleon-skills-tracker || exit 1
echo "Starting Caerleon Skills Tracker preview..."
echo "Keep this Terminal window open while using the curriculum mapping system."
echo "Preview URL: http://127.0.0.1:3012/literacy"
PORT=3012 /private/tmp/caerleon-node/bin/node node_modules/next/dist/bin/next start -H 127.0.0.1

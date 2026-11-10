#!/bin/bash
# Double-click to start the Hosil demo on http://localhost:5173
cd "$(dirname "$0")"
( sleep 1; open "http://localhost:5173" ) &
if command -v python3 >/dev/null 2>&1; then python3 -m http.server 5173
elif command -v node >/dev/null 2>&1; then node server.js
else echo "Install Python 3 or Node.js, or just open index.html in Chrome."; read -r; fi

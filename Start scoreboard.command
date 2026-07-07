#!/bin/bash
# Double-click this file to run the scoreboard through a tiny local web
# server. Needed for Firefox (and Safari): those browsers keep each
# local file's storage separate, so the control page and the stream page
# can't see each other when opened straight from the files. Served from
# http://localhost:8123 they share storage in every browser.
cd "$(dirname "$0")"
PORT=8123
URL="http://localhost:$PORT/control.html"

# The server itself is Python's built-in one, so Python 3 must be present.
# macOS usually has it (or offers to install its command line tools on
# first use); otherwise get it from https://www.python.org/downloads/
if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3 is required to run the local server, but it was not found."
  echo "Install it from https://www.python.org/downloads/ and run this again."
  read -n 1 -s -r -p "Press any key to close this window..."
  echo
  exit 1
fi

if lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then
  echo "The scoreboard server is already running — opening the control room."
  open "$URL"
else
  ( sleep 1; open "$URL" ) &
  echo "Scoreboard server running at http://localhost:$PORT"
  echo "Keep this window open while streaming. Close it (or press Ctrl+C) to stop."
  python3 -m http.server $PORT
fi

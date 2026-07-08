@echo off
rem Double-click this file to run the scoreboard through a tiny local web
rem server. Needed for Firefox (and Safari): those browsers keep each
rem local file's storage separate, so the control page and the stream page
rem can't see each other when opened straight from the files. Served from
rem http://localhost:8123 they share storage in every browser.
rem
rem Requires Python 3: https://www.python.org/downloads/
rem (tick "Add python.exe to PATH" in the installer)
cd /d "%~dp0"
set PORT=8123
set URL=http://localhost:%PORT%/control.html

rem --- find Python 3: the "py" launcher first, then plain "python" ---
set PY=
py -3 --version >nul 2>nul
if not errorlevel 1 set PY=py -3
if defined PY goto :python_found
python --version >nul 2>nul
if not errorlevel 1 set PY=python
if defined PY goto :python_found

echo Python 3 is required to run the local server, but it was not found.
echo Install it from https://www.python.org/downloads/ and run this again.
echo During installation, tick the "Add python.exe to PATH" checkbox.
pause
exit /b 1

:python_found
rem --- if the server is already running, just open the control room ---
netstat -ano | findstr ":%PORT%" | findstr "LISTENING" >nul 2>nul
if not errorlevel 1 (
  echo The scoreboard server is already running - opening the control room.
  start "" "%URL%"
  timeout /t 3 /nobreak >nul
  exit /b 0
)

echo Starting the scoreboard server at http://localhost:%PORT% ...
start "Scoreboard server - keep open while streaming, close to stop" %PY% -m http.server %PORT%
timeout /t 2 /nobreak >nul
start "" "%URL%"
echo.
echo The server runs in its own window titled "Scoreboard server".
echo Keep that window open while streaming; close it to stop the server.
timeout /t 5 /nobreak >nul
exit /b 0

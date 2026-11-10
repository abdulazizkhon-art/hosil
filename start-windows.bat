@echo off
REM Double-click to start the Hosil demo on http://localhost:5173
cd /d "%~dp0"
start "" cmd /c "timeout /t 2 > NUL & start http://localhost:5173"
where node > NUL 2> NUL
if %errorlevel%==0 (node server.js & goto :eof)
where python > NUL 2> NUL
if %errorlevel%==0 (python -m http.server 5173 & goto :eof)
echo Install Node.js or Python, or just open index.html in Chrome.
pause

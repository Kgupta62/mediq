@echo off
title MediQ
cd /d "%~dp0"
if not exist "server\node_modules" (cd server && call npm install && cd ..)
if not exist "client\node_modules" (cd client && call npm install && cd ..)
start "MediQ Backend (5000)" cmd /k "cd /d "%~dp0server" && node src/server.js"
start "MediQ Frontend (5173)" cmd /k "cd /d "%~dp0client" && npm run dev"
echo MediQ running: frontend http://localhost:5173, backend http://localhost:5000

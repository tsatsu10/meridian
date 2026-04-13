@echo off
echo 🔄 Restarting Meridian Frontend with Fixed Configuration...
echo.
echo 🛑 Stopping any running dev servers...
taskkill /f /im node.exe > nul 2>&1
timeout /t 2 > nul

echo 🧹 Clearing Vite cache...
if exist node_modules\.vite rmdir /s /q node_modules\.vite
if exist .vite rmdir /s /q .vite
if exist dist rmdir /s /q dist

echo 🚀 Starting development server on port 5174...
echo 📡 API Server: http://localhost:3008
echo 🌐 Frontend: http://localhost:5174
echo.
npm run dev
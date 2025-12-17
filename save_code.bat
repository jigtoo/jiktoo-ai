@echo off
chcp 65001 > nul
echo.
echo ========================================================
echo   [Jiktoo AI] Code Save & Deploy System
echo ========================================================
echo.

:: 1. Ask for commit message
set /p msg="📝 Enter update message (Press Enter for 'Auto Update'): "
if "%msg%"=="" set msg=Auto Update %date% %time%

echo.
echo 📦 [1/3] Packaging files... (git add)
git add .

echo 🏷️ [2/3] Stamping package... (git commit)
git commit -m "%msg%"

echo 🚀 [3/3] Sending to Cloud... (git push)
git push

echo.
echo ========================================================
echo   ✅ SUCCESS! Code saved to GitHub & Vercel.
echo ========================================================
echo.
pause

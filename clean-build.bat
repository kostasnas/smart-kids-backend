@echo off
echo ========================================
echo  NUCLEAR CLEAN - Smart Kids App
echo ========================================

echo.
echo [1/6] Deleting dist...
rmdir /s /q dist 2>nul
echo Done!

echo.
echo [2/6] Deleting Vite cache...
rmdir /s /q node_modules\.vite 2>nul
echo Done!

echo.
echo [3/6] Deleting Android assets...
rmdir /s /q android\app\src\main\assets 2>nul
echo Done!

echo.
echo [4/6] Deleting Android build...
rmdir /s /q android\app\build 2>nul
rmdir /s /q android\build 2>nul
echo Done!

echo.
echo [5/6] Deleting Gradle cache...
rmdir /s /q android\.gradle 2>nul
echo Done!

echo.
echo [6/6] Building fresh...
call npm run build
echo Build complete!

echo.
echo [7/6] Syncing to Android...
call npx cap sync android
echo Sync complete!

echo.
echo ========================================
echo  ALL DONE! 
echo  Open Android Studio now.
echo ========================================
pause
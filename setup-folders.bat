@echo off
REM TQM 系統 - 資料夾結構創建腳本
REM 適用於 Windows 系統

echo ============================================
echo   TQM 系統 - 資料夾結構初始化腳本
echo ============================================
echo.

REM 設定基礎路徑（請根據實際情況修改）
set "BASE_DIR=%~dp0"
set "UPLOAD_DIR=%BASE_DIR%uploads"

echo 📁 基礎目錄: %BASE_DIR%
echo 📂 上傳目錄: %UPLOAD_DIR%
echo.

REM 創建上傳主目錄
if not exist "%UPLOAD_DIR%" (
    echo 📦 創建上傳主目錄...
    mkdir "%UPLOAD_DIR%"
    echo ✅ 已創建: %UPLOAD_DIR%
) else (
    echo ✓ 上傳主目錄已存在
)

echo.
echo 📁 創建系統模組資料夾...
echo ----------------------------------------

REM 創建各系統模組資料夾
set FOLDERS=TQM RD_Nexus DCO KPI SPEC WAR_ROOM APPRAISAL ELEC_SPEC

for %%F in (%FOLDERS%) do (
    if not exist "%UPLOAD_DIR%\%%F" (
        mkdir "%UPLOAD_DIR%\%%F"
        echo ✅ 已創建: %%F
    ) else (
        echo ✓ 已存在: %%F
    )
)

echo.
echo 📊 資料夾結構預覽:
echo ----------------------------------------
tree /F "%UPLOAD_DIR%" 2>nul || dir /S /B "%UPLOAD_DIR%"

echo.
echo ✅ 資料夾結構初始化完成！
echo.
echo 📝 後續步驟：
echo 1. 確認 Node.js 已安裝 (node --version)
echo 2. 安裝依賴套件 (npm install)
echo 3. 啟動服務器 (npm start)
echo 4. 配置 IIS 或其他 Web 服務器 (可選)
echo.
echo ============================================
pause

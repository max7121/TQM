@echo off
echo ============================================
echo Firebase Storage CORS 設定腳本
echo ============================================
echo.

echo 步驟 1: 安裝 Firebase CLI
echo npm install -g firebase-tools
echo.

echo 步驟 2: 登入 Firebase
echo firebase login
echo.

echo 步驟 3: 安裝 Google Cloud SDK
echo https://cloud.google.com/sdk/docs/install
echo.

echo 步驟 4: 套用 CORS 設定
echo gsutil cors set cors.json gs://rdsystemdatabase.firebasestorage.app
echo.

echo ============================================
echo 注意事項:
echo 1. 需要 Firebase 專案管理員權限
echo 2. 需要安裝 gcloud CLI
echo 3. 設定後可能需要 5-10 分鐘生效
echo ============================================

pause

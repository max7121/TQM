#!/bin/bash

# TQM 系統 - 資料夾結構創建和權限設定腳本
# 適用於 Linux/Unix 系統

echo "============================================"
echo "  TQM 系統 - 資料夾結構初始化腳本"
echo "============================================"
echo ""

# 設定基礎路徑（請根據實際情況修改）
BASE_DIR="/var/www/tqm/server"
UPLOAD_DIR="$BASE_DIR/uploads"

# 系統模組資料夾列表
FOLDERS=(
    "TQM"
    "RD_Nexus"
    "DCO"
    "KPI"
    "SPEC"
    "WAR_ROOM"
    "APPRAISAL"
    "ELEC_SPEC"
)

# 檢查基礎目錄是否存在
if [ ! -d "$BASE_DIR" ]; then
    echo "❌ 錯誤: 基礎目錄不存在: $BASE_DIR"
    echo "請先創建基礎目錄或修改腳本中的 BASE_DIR 路徑"
    exit 1
fi

echo "📁 基礎目錄: $BASE_DIR"
echo "📂 上傳目錄: $UPLOAD_DIR"
echo ""

# 創建上傳主目錄
if [ ! -d "$UPLOAD_DIR" ]; then
    echo "📦 創建上傳主目錄..."
    mkdir -p "$UPLOAD_DIR"
    echo "✅ 已創建: $UPLOAD_DIR"
else
    echo "✓ 上傳主目錄已存在: $UPLOAD_DIR"
fi

echo ""
echo "📁 創建系統模組資料夾..."
echo "----------------------------------------"

# 創建各系統模組資料夾
for folder in "${FOLDERS[@]}"; do
    folder_path="$UPLOAD_DIR/$folder"
    
    if [ ! -d "$folder_path" ]; then
        mkdir -p "$folder_path"
        echo "✅ 已創建: $folder"
    else
        echo "✓ 已存在: $folder"
    fi
done

echo ""
echo "🔒 設定資料夾權限..."
echo "----------------------------------------"

# 設定權限（根據您的 Web 服務器用戶調整）
# 常見用戶: www-data (Ubuntu/Debian), nginx (CentOS/RHEL), apache

WEB_USER="www-data"  # 修改為您的 Web 服務器用戶

# 檢查用戶是否存在
if id "$WEB_USER" &>/dev/null; then
    echo "📋 設定擁有者為: $WEB_USER"
    
    # 設定擁有者
    sudo chown -R $WEB_USER:$WEB_USER "$UPLOAD_DIR"
    echo "✅ 擁有者已設定"
    
    # 設定權限
    # 資料夾: 755 (rwxr-xr-x)
    # 文件: 644 (rw-r--r--)
    sudo find "$UPLOAD_DIR" -type d -exec chmod 755 {} \;
    sudo find "$UPLOAD_DIR" -type f -exec chmod 644 {} \;
    echo "✅ 權限已設定 (資料夾: 755, 文件: 644)"
else
    echo "⚠️  警告: 用戶 '$WEB_USER' 不存在"
    echo "請手動設定權限："
    echo "  sudo chown -R [你的web用戶]:[你的web用戶] $UPLOAD_DIR"
    echo "  sudo chmod -R 755 $UPLOAD_DIR"
fi

echo ""
echo "📊 資料夾結構預覽:"
echo "----------------------------------------"
tree -L 2 "$UPLOAD_DIR" 2>/dev/null || ls -la "$UPLOAD_DIR"

echo ""
echo "✅ 資料夾結構初始化完成！"
echo ""
echo "📝 後續步驟："
echo "1. 確認 Node.js 已安裝 (node --version)"
echo "2. 安裝依賴套件 (npm install)"
echo "3. 啟動服務器 (npm start)"
echo "4. 配置 Nginx (可選)"
echo ""
echo "============================================"

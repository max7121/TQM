# TQM 品質管理系統 - 本地服務器部署指南

## 📋 系統要求

- **Node.js**: v14.0.0 或更高版本
- **npm**: 6.0.0 或更高版本
- **作業系統**: Windows Server / Linux (Ubuntu, CentOS 等)
- **Web 服務器**: Nginx (推薦) 或 IIS
- **磁碟空間**: 至少 10GB 可用空間（用於文件存儲）
- **內存**: 至少 2GB RAM

---

## 🚀 快速開始

### 1. 安裝 Node.js 依賴

```bash
cd c:\檔案文件區\TQM系統\server
npm install
```

需要安裝的套件：
- `express`: Web 框架
- `multer`: 文件上傳處理
- `cors`: 跨域資源共享
- `nodemon` (開發用): 自動重啟服務器

### 2. 創建資料夾結構

#### Windows:
```cmd
setup-folders.bat
```

#### Linux/macOS:
```bash
chmod +x setup-folders.sh
./setup-folders.sh
```

這將自動創建以下資料夾結構：
```
server/
└── uploads/
    ├── TQM/           # TQM 品質記錄
    ├── RD_Nexus/      # RD 專案提案
    ├── DCO/           # 設計變更訂單
    ├── KPI/           # KPI 績效文件
    ├── SPEC/          # 規格討論文件
    ├── WAR_ROOM/      # 作戰室文件
    ├── APPRAISAL/     # 評估文件
    └── ELEC_SPEC/     # 電子規格
```

### 3. 啟動 Node.js 服務器

#### 開發模式（自動重啟）:
```bash
npm run dev
```

#### 生產模式:
```bash
npm start
```

服務器將在 `http://localhost:3000` 啟動

### 4. 測試服務器

訪問健康檢查端點：
```
http://localhost:3000/api/health
```

應返回：
```json
{
  "status": "ok",
  "message": "TQM 文件上傳服務器運行中",
  "uploadFolders": ["TQM", "RD_Nexus", "DCO", ...]
}
```

---

## 🌐 Nginx 配置（生產環境推薦）

### 1. 安裝 Nginx

#### Ubuntu/Debian:
```bash
sudo apt update
sudo apt install nginx
```

#### CentOS/RHEL:
```bash
sudo yum install nginx
```

### 2. 配置 Nginx

複製提供的配置文件：
```bash
sudo cp nginx.conf /etc/nginx/sites-available/tqm
sudo ln -s /etc/nginx/sites-available/tqm /etc/nginx/sites-enabled/
```

修改配置文件中的關鍵參數：
- `server_name`: 修改為您的域名或 IP
- `root`: 修改為實際的項目路徑
- `proxy_pass`: 確認 Node.js 服務器端口（默認 3000）

### 3. 測試和重啟 Nginx

```bash
# 測試配置文件語法
sudo nginx -t

# 重啟 Nginx
sudo systemctl restart nginx

# 設置開機自啟
sudo systemctl enable nginx
```

---

## 🔒 權限設定

### Linux 系統

```bash
# 設定文件擁有者（假設使用 www-data 用戶）
sudo chown -R www-data:www-data /var/www/tqm/server/uploads

# 設定資料夾權限
sudo chmod -R 755 /var/www/tqm/server/uploads

# 允許 Web 服務器寫入
sudo chmod -R 775 /var/www/tqm/server/uploads
```

### Windows 系統

1. 右鍵點擊 `uploads` 資料夾 → 屬性
2. 安全性 → 編輯
3. 添加 `IIS_IUSRS` 或 `NETWORK SERVICE` 用戶
4. 授予「修改」權限

---

## 📁 文件上傳限制說明

| 模式 | 最大文件大小 | 說明 |
|------|------------|------|
| **本地模式** | 100MB | 文件存儲在服務器 `uploads/` 資料夾 |
| **Firebase 模式** | 100MB | 文件上傳至 Firebase Storage |
| **Firestore 嵌入** | 800KB | 受 Firestore 文檔大小限制 |

### 支援的文件類型

- **圖片**: JPG, PNG, GIF
- **文檔**: PDF, Word (DOC/DOCX), Excel (XLS/XLSX), PowerPoint (PPT/PPTX)

---

## 🔧 API 端點說明

### 文件上傳
```http
POST /api/upload
Content-Type: multipart/form-data

FormData:
  - file: [文件]
  - system: [系統資料夾名稱]
```

**系統資料夾對照表**：
| 前端參數 | 實際資料夾 | 用途 |
|---------|-----------|------|
| `tqm` | TQM | TQM 品質記錄 |
| `proposals` / `rd` | RD_Nexus | RD 專案提案 |
| `dco` | DCO | 設計變更訂單 |
| `kpi` | KPI | KPI 績效文件 |
| `spec` | SPEC | 規格討論 |
| `war_room` | WAR_ROOM | 作戰室 |
| `appraisal` | APPRAISAL | 評估文件 |
| `elec_spec` | ELEC_SPEC | 電子規格 |

**回應範例**：
```json
{
  "success": true,
  "url": "/uploads/TQM/1705123456789_abc123def456.pdf",
  "fileName": "1705123456789_abc123def456.pdf",
  "originalName": "品質報告.pdf",
  "size": 1048576,
  "mimeType": "application/pdf",
  "system": "TQM",
  "uploadTime": "2026-01-13T10:30:00.000Z"
}
```

### 文件刪除
```http
DELETE /api/upload/{system}/{filename}
```

### 獲取文件列表
```http
GET /api/files/{system}
```

### 健康檢查
```http
GET /api/health
```

---

## 🔄 使用 PM2 進行進程管理（推薦）

### 安裝 PM2

```bash
npm install -g pm2
```

### 啟動應用

```bash
pm2 start server.js --name tqm-server
```

### 設置開機自啟

```bash
pm2 startup
pm2 save
```

### 常用命令

```bash
# 查看狀態
pm2 status

# 查看日誌
pm2 logs tqm-server

# 重啟
pm2 restart tqm-server

# 停止
pm2 stop tqm-server

# 刪除
pm2 delete tqm-server
```

---

## 🐛 故障排除

### 問題 1: 無法上傳大文件

**檢查項目**：
1. Node.js 服務器限制（已設為 100MB）
2. Nginx `client_max_body_size` 設定
3. 磁碟空間是否充足

**解決方案**：
```bash
# 檢查磁碟空間
df -h

# 修改 Nginx 配置
sudo nano /etc/nginx/sites-available/tqm
# 增加或修改: client_max_body_size 100M;

# 重啟 Nginx
sudo systemctl restart nginx
```

### 問題 2: 權限錯誤 (Permission Denied)

**Linux**:
```bash
sudo chown -R www-data:www-data /var/www/tqm/server/uploads
sudo chmod -R 775 /var/www/tqm/server/uploads
```

**Windows**:
- 確保 IIS 或當前用戶有寫入權限

### 問題 3: 端口已被佔用

修改 `server.js` 中的端口：
```javascript
const PORT = process.env.PORT || 3001; // 改為其他端口
```

或設置環境變量：
```bash
export PORT=3001
npm start
```

### 問題 4: CORS 錯誤

確認 `server.js` 中已啟用 CORS：
```javascript
app.use(cors());
```

---

## 📊 性能優化建議

### 1. 文件壓縮

在 Nginx 配置中啟用 Gzip 壓縮（已包含在提供的配置中）

### 2. 靜態文件緩存

設置合適的緩存策略：
```nginx
location /uploads/ {
    expires 7d;
    add_header Cache-Control "public, immutable";
}
```

### 3. 使用 CDN

對於公網部署，考慮使用 CDN 加速文件下載

### 4. 定期清理

設置定期任務清理舊文件：
```bash
# 刪除 30 天前的文件
find /var/www/tqm/server/uploads -type f -mtime +30 -delete
```

---

## 🔐 安全建議

1. **使用 HTTPS**: 配置 SSL 證書（Let's Encrypt 免費）
2. **防火牆設置**: 僅開放必要端口（80, 443）
3. **文件類型限制**: 已在代碼中實現白名單過濾
4. **定期備份**: 設置自動備份腳本
5. **訪問控制**: 配置 IP 白名單（如需要）

---

## 📞 支援資訊

如有問題，請聯繫 TQM 系統管理員。

**版本**: v1.0.0  
**更新日期**: 2026-01-13

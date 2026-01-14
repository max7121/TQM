const express = require('express');
const path = require('path');
const fileServer = require('./fileServer');

const app = express();
const PORT = 8080;

// 中間件
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 靜態檔案服務
app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 檔案 API 路由
app.use('/api', fileServer);

// 主頁面
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   🚀 TQM 系統伺服器已啟動              ║');
  console.log('╠════════════════════════════════════════╣');
  console.log(`║   📡 伺服器位址: http://localhost:${PORT}  ║`);
  console.log('║   📁 檔案服務: 已啟用                  ║');
  console.log('║   💾 上傳限制: 50MB                    ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('');
  console.log('✅ 系統功能:');
  console.log('   - Firebase 資料庫模式 (雲端同步)');
  console.log('   - IndexedDB 本地模式 (離線使用)');
  console.log('   - 本地檔案儲存 (自動分類、縮圖生成)');
  console.log('   - 檔案管理介面 (瀏覽、刪除、備份)');
  console.log('');
  console.log('按 Ctrl+C 停止伺服器');
});

// 錯誤處理
app.use((err, req, res, next) => {
  console.error('❌ 伺服器錯誤:', err);
  res.status(500).json({ error: err.message });
});

/**
 * TQM 系統 - 本地模式文件上傳服務器
 * Node.js + Express 實現
 * 支援多模組資料夾分類存儲
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// 啟用 CORS，允許跨域請求
app.use(cors());

// 解析 JSON 請求體
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// 靜態文件服務 - 提供前端頁面
app.use(express.static(path.join(__dirname)));

// 靜態文件服務 - 提供上傳的文件訪問
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 系統資料夾映射（與前端保持一致）
const SYSTEM_FOLDERS = {
  'TQM': 'TQM',
  'RD_Nexus': 'RD_Nexus',
  'DCO': 'DCO',
  'KPI': 'KPI',
  'SPEC': 'SPEC',
  'WAR_ROOM': 'WAR_ROOM',
  'APPRAISAL': 'APPRAISAL',
  'ELEC_SPEC': 'ELEC_SPEC'
};

// 確保上傳資料夾存在
const ensureUploadFolders = () => {
  const uploadDir = path.join(__dirname, 'uploads');
  
  // 創建主上傳資料夾
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('✅ 已創建主上傳資料夾:', uploadDir);
  }
  
  // 創建各系統模組資料夾
  Object.values(SYSTEM_FOLDERS).forEach(folder => {
    const folderPath = path.join(uploadDir, folder);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
      console.log(`✅ 已創建資料夾: ${folder}`);
    }
  });
};

// 初始化資料夾
ensureUploadFolders();

// 配置 Multer 存儲策略
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Multer 解析 multipart 時，req.body 可能還未完全解析
    // 需要等待 body 解析完成
    // 暫時先使用 TQM 作為預設，稍後會移動到正確的資料夾
    const uploadPath = path.join(__dirname, 'uploads', 'temp');
    
    // 確保 temp 資料夾存在
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // 生成唯一檔名：timestamp_randomString.extension
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const fileExt = path.extname(file.originalname);
    const fileName = `${timestamp}_${randomStr}${fileExt}`;
    cb(null, fileName);
  }
});

// 文件過濾器 - 限制文件類型
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('不支援的檔案類型。僅支援: PDF, 圖片, Excel, Word, PowerPoint'));
  }
};

// 配置 Multer - 最大文件大小 100MB
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  }
});

// 文件上傳 API 端點
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '未接收到文件'
      });
    }
    
    const systemFolder = req.body.system || 'TQM';
    console.log(`📋 接收到上傳請求: system=${systemFolder}, file=${req.file.originalname}`);
    
    // 驗證系統資料夾
    if (!Object.values(SYSTEM_FOLDERS).includes(systemFolder)) {
      // 刪除臨時檔案
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        error: `無效的系統資料夾: ${systemFolder}`
      });
    }
    
    // 將檔案從 temp 移動到正確的系統資料夾
    const tempPath = req.file.path;
    const targetDir = path.join(__dirname, 'uploads', systemFolder);
    const targetPath = path.join(targetDir, req.file.filename);
    
    // 確保目標資料夾存在
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    // 移動檔案
    fs.renameSync(tempPath, targetPath);
    
    const fileUrl = `/uploads/${systemFolder}/${req.file.filename}`;
    
    console.log(`✅ 文件已移動: temp/${req.file.filename} -> ${systemFolder}/${req.file.filename}`);
    console.log(`📁 文件 URL: ${fileUrl}`);
    
    res.json({
      success: true,
      url: fileUrl,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
      system: systemFolder,
      uploadTime: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 文件上傳錯誤:', error);
    
    // 清理臨時檔案
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('清理臨時檔案失敗:', cleanupError);
      }
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 文件刪除 API 端點
app.delete('/api/upload/:system/:filename', (req, res) => {
  try {
    const { system, filename } = req.params;
    
    // 驗證系統資料夾
    if (!Object.values(SYSTEM_FOLDERS).includes(system)) {
      return res.status(400).json({
        success: false,
        error: '無效的系統資料夾'
      });
    }
    
    const filePath = path.join(__dirname, 'uploads', system, filename);
    
    // 檢查文件是否存在
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: '文件不存在'
      });
    }
    
    // 刪除文件
    fs.unlinkSync(filePath);
    
    console.log(`🗑️ 文件已刪除: ${system}/${filename}`);
    
    res.json({
      success: true,
      message: '文件已刪除'
    });
  } catch (error) {
    console.error('❌ 文件刪除錯誤:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 獲取資料夾文件列表 API 端點
app.get('/api/files/:system', (req, res) => {
  try {
    const { system } = req.params;
    
    // 驗證系統資料夾
    if (!Object.values(SYSTEM_FOLDERS).includes(system)) {
      return res.status(400).json({
        success: false,
        error: '無效的系統資料夾'
      });
    }
    
    const folderPath = path.join(__dirname, 'uploads', system);
    
    // 檢查資料夾是否存在
    if (!fs.existsSync(folderPath)) {
      return res.json({
        success: true,
        files: []
      });
    }
    
    // 讀取資料夾內容
    const files = fs.readdirSync(folderPath).map(filename => {
      const filePath = path.join(folderPath, filename);
      const stats = fs.statSync(filePath);
      
      return {
        filename: filename,
        url: `/uploads/${system}/${filename}`,
        size: stats.size,
        uploadTime: stats.birthtime,
        modifiedTime: stats.mtime
      };
    });
    
    res.json({
      success: true,
      system: system,
      count: files.length,
      files: files
    });
  } catch (error) {
    console.error('❌ 獲取文件列表錯誤:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 文件下載 API 端點（強制下載）
app.get('/api/download/:system/:filename', (req, res) => {
  try {
    const { system, filename } = req.params;
    
    // 驗證系統資料夾
    if (!Object.values(SYSTEM_FOLDERS).includes(system)) {
      return res.status(400).json({
        success: false,
        error: '無效的系統資料夾'
      });
    }
    
    const filePath = path.join(__dirname, 'uploads', system, filename);
    
    // 檢查文件是否存在
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: '文件不存在'
      });
    }
    
    // 設置響應頭強制下載
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    // 發送文件
    res.sendFile(filePath);
    
    console.log(`📥 文件已下載: ${system}/${filename}`);
  } catch (error) {
    console.error('❌ 文件下載錯誤:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 健康檢查端點
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'TQM 文件上傳服務器運行中',
    timestamp: new Date().toISOString(),
    uploadFolders: Object.values(SYSTEM_FOLDERS)
  });
});

// 錯誤處理中間件
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: '檔案太大！最大支援 100MB'
      });
    }
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
  
  if (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
  
  next();
});

// 404 處理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: '找不到請求的資源'
  });
});

// 啟動服務器
app.listen(PORT, () => {
  console.log('');
  console.log('🚀 ==========================================');
  console.log(`✅ TQM 文件上傳服務器已啟動`);
  console.log(`📍 服務器地址: http://localhost:${PORT}`);
  console.log(`📁 上傳目錄: ${path.join(__dirname, 'uploads')}`);
  console.log(`📊 系統模組: ${Object.values(SYSTEM_FOLDERS).join(', ')}`);
  console.log(`💾 文件大小限制: 100MB`);
  console.log('🚀 ==========================================');
  console.log('');
});

// 優雅關閉
process.on('SIGTERM', () => {
  console.log('⚠️  收到 SIGTERM 信號，正在關閉服務器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('⚠️  收到 SIGINT 信號，正在關閉服務器...');
  process.exit(0);
});

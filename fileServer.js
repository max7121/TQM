const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const archiver = require('archiver');

const router = express.Router();

// 上傳目錄配置
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const SYSTEMS = ['TQM', 'RD_Nexus', 'DCO', 'KPI', 'SPEC', 'WAR_ROOM', 'APPRAISAL', 'ELEC_SPEC'];

// 檔案類型白名單
const ALLOWED_TYPES = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-powerpoint': '.ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx'
};

// 單檔大小限制 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// 初始化上傳目錄
function initializeUploadDirs() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    console.log('📁 建立上傳目錄:', UPLOAD_DIR);
  }
  
  SYSTEMS.forEach(system => {
    const systemDir = path.join(UPLOAD_DIR, system);
    if (!fs.existsSync(systemDir)) {
      fs.mkdirSync(systemDir, { recursive: true });
      console.log(`📁 建立系統資料夾: ${system}`);
    }
    
    // 建立縮圖資料夾
    const thumbDir = path.join(systemDir, '.thumbnails');
    if (!fs.existsSync(thumbDir)) {
      fs.mkdirSync(thumbDir, { recursive: true });
    }
  });
}

// 配置 Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const system = req.body.system || 'TQM';
    const systemDir = path.join(UPLOAD_DIR, system);
    cb(null, systemDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${timestamp}_${safeName}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const isAllowed = ALLOWED_TYPES[file.mimetype];
    if (isAllowed) {
      cb(null, true);
    } else {
      cb(new Error(`不支援的檔案類型: ${file.mimetype}。僅支援: PDF, 圖片, Excel, Word, PowerPoint`));
    }
  }
});

// 生成縮圖 (僅圖片)
async function generateThumbnail(filePath, system) {
  const ext = path.extname(filePath).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
    return null; // 非圖片不生成縮圖
  }
  
  try {
    const fileName = path.basename(filePath);
    const thumbDir = path.join(UPLOAD_DIR, system, '.thumbnails');
    const thumbPath = path.join(thumbDir, fileName);
    
    await sharp(filePath)
      .resize(200, 200, { fit: 'cover' })
      .jpeg({ quality: 80 })
      .toFile(thumbPath);
    
    return `/uploads/${system}/.thumbnails/${fileName}`;
  } catch (error) {
    console.error('❌ 縮圖生成失敗:', error);
    return null;
  }
}

// 路由: 上傳檔案
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '未收到檔案' });
    }
    
    const system = req.body.system || 'TQM';
    const fileUrl = `/uploads/${system}/${req.file.filename}`;
    
    // 生成縮圖 (圖片)
    const thumbnailUrl = await generateThumbnail(req.file.path, system);
    
    console.log(`✅ 檔案上傳成功: ${fileUrl} (${(req.file.size / 1024).toFixed(2)} KB)`);
    
    res.json({
      success: true,
      url: fileUrl,
      thumbnailUrl: thumbnailUrl,
      fileName: req.file.originalname,
      safeName: req.file.filename,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      path: fileUrl,
      folder: system,
      uploadTime: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ 上傳錯誤:', error);
    res.status(500).json({ error: error.message });
  }
});

// 路由: 取得系統檔案列表
router.get('/files/:system', (req, res) => {
  try {
    const system = req.params.system;
    const systemDir = path.join(UPLOAD_DIR, system);
    
    if (!fs.existsSync(systemDir)) {
      return res.json({ files: [] });
    }
    
    const files = fs.readdirSync(systemDir)
      .filter(file => file !== '.thumbnails') // 排除縮圖資料夾
      .map(filename => {
        const filePath = path.join(systemDir, filename);
        const stats = fs.statSync(filePath);
        const ext = path.extname(filename).toLowerCase();
        const isImage = ['.jpg', '.jpeg', '.png', '.gif'].includes(ext);
        
        return {
          fileName: filename,
          fileSize: stats.size,
          uploadTime: stats.mtime.toISOString(),
          url: `/uploads/${system}/${filename}`,
          thumbnailUrl: isImage ? `/uploads/${system}/.thumbnails/${filename}` : null,
          isImage: isImage
        };
      })
      .sort((a, b) => new Date(b.uploadTime) - new Date(a.uploadTime)); // 最新的在前
    
    res.json({ files });
  } catch (error) {
    console.error('❌ 讀取檔案列表失敗:', error);
    res.status(500).json({ error: error.message });
  }
});

// 路由: 刪除檔案
router.delete('/files/:system/:filename', (req, res) => {
  try {
    const { system, filename } = req.params;
    const filePath = path.join(UPLOAD_DIR, system, filename);
    const thumbPath = path.join(UPLOAD_DIR, system, '.thumbnails', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '檔案不存在' });
    }
    
    // 刪除原檔案
    fs.unlinkSync(filePath);
    console.log(`🗑️ 檔案已刪除: ${filePath}`);
    
    // 刪除縮圖 (如果存在)
    if (fs.existsSync(thumbPath)) {
      fs.unlinkSync(thumbPath);
    }
    
    res.json({ success: true, message: '檔案已刪除' });
  } catch (error) {
    console.error('❌ 刪除檔案失敗:', error);
    res.status(500).json({ error: error.message });
  }
});

// 路由: 批次刪除檔案
router.post('/files/batch-delete', (req, res) => {
  try {
    const { files } = req.body; // [{ system, filename }, ...]
    
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: '無效的請求' });
    }
    
    let deletedCount = 0;
    let errors = [];
    
    files.forEach(({ system, filename }) => {
      try {
        const filePath = path.join(UPLOAD_DIR, system, filename);
        const thumbPath = path.join(UPLOAD_DIR, system, '.thumbnails', filename);
        
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          if (fs.existsSync(thumbPath)) {
            fs.unlinkSync(thumbPath);
          }
          deletedCount++;
        }
      } catch (err) {
        errors.push({ system, filename, error: err.message });
      }
    });
    
    console.log(`🗑️ 批次刪除完成: ${deletedCount} 個檔案`);
    
    res.json({ 
      success: true, 
      deletedCount, 
      errors: errors.length > 0 ? errors : undefined 
    });
  } catch (error) {
    console.error('❌ 批次刪除失敗:', error);
    res.status(500).json({ error: error.message });
  }
});

// 路由: 取得儲存空間統計
router.get('/storage/stats', (req, res) => {
  try {
    const stats = SYSTEMS.map(system => {
      const systemDir = path.join(UPLOAD_DIR, system);
      let totalSize = 0;
      let fileCount = 0;
      
      if (fs.existsSync(systemDir)) {
        const files = fs.readdirSync(systemDir).filter(f => f !== '.thumbnails');
        fileCount = files.length;
        
        files.forEach(file => {
          const filePath = path.join(systemDir, file);
          const stat = fs.statSync(filePath);
          totalSize += stat.size;
        });
      }
      
      return {
        system,
        totalSize,
        fileCount
      };
    });
    
    const totalSize = stats.reduce((sum, s) => sum + s.totalSize, 0);
    const totalFiles = stats.reduce((sum, s) => sum + s.fileCount, 0);
    
    res.json({ 
      systems: stats,
      totalSize,
      totalFiles
    });
  } catch (error) {
    console.error('❌ 取得儲存統計失敗:', error);
    res.status(500).json({ error: error.message });
  }
});

// 路由: 建立完整備份 (資料 + 檔案)
router.post('/backup/create', async (req, res) => {
  try {
    const { data } = req.body; // 資料庫 JSON
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=TQM_完整備份_${new Date().toISOString().split('T')[0]}.zip`);
    
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    archive.on('error', (err) => {
      throw err;
    });
    
    archive.pipe(res);
    
    // 加入資料庫 JSON
    archive.append(JSON.stringify(data, null, 2), { name: 'data.json' });
    
    // 加入 uploads 資料夾
    if (fs.existsSync(UPLOAD_DIR)) {
      archive.directory(UPLOAD_DIR, 'uploads');
    }
    
    await archive.finalize();
    console.log('📦 完整備份建立成功');
  } catch (error) {
    console.error('❌ 建立備份失敗:', error);
    res.status(500).json({ error: error.message });
  }
});

// 初始化
initializeUploadDirs();

module.exports = router;

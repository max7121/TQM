const fs = require('fs');
const https = require('https');
const http = require('http');
const path = require('path');
const { URL } = require('url');

// 設定
const FILE_LIST_JSON = './TQM_檔案清單_2026-01-13.json'; // 修改為您的檔案名稱
const OUTPUT_DIR = './downloaded_files';

// 建立輸出目錄
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 讀取檔案清單
console.log('📖 讀取檔案清單...');
const fileList = JSON.parse(fs.readFileSync(FILE_LIST_JSON, 'utf8'));

console.log(`\n📊 總共 ${fileList.totalFiles} 個檔案`);
console.log(`📅 匯出時間: ${fileList.exportedAt}\n`);

// 下載單個檔案
function downloadFile(fileInfo, index, total) {
  return new Promise((resolve, reject) => {
    const { folder, name, url } = fileInfo;
    
    // 建立資料夾
    const folderPath = path.join(OUTPUT_DIR, folder);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    
    // 檔案路徑
    const filePath = path.join(folderPath, name);
    
    // 如果檔案已存在，跳過
    if (fs.existsSync(filePath)) {
      console.log(`⏭️  [${index}/${total}] 已存在: ${folder}/${name}`);
      resolve();
      return;
    }
    
    console.log(`⬇️  [${index}/${total}] 下載中: ${folder}/${name}`);
    
    // 下載檔案
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    
    const file = fs.createWriteStream(filePath);
    
    protocol.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          console.log(`✅ [${index}/${total}] 完成: ${folder}/${name}`);
          resolve();
        });
      } else {
        fs.unlink(filePath, () => {});
        reject(new Error(`HTTP ${response.statusCode}`));
      }
    }).on('error', (err) => {
      fs.unlink(filePath, () => {});
      reject(err);
    });
  });
}

// 批次下載（限制同時下載數量）
async function downloadAll() {
  const files = fileList.files;
  const concurrency = 3; // 同時下載 3 個檔案
  
  let completed = 0;
  let failed = 0;
  
  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency);
    
    const promises = batch.map((file, batchIndex) => 
      downloadFile(file, i + batchIndex + 1, files.length)
        .then(() => completed++)
        .catch((err) => {
          console.error(`❌ 失敗: ${file.folder}/${file.name} - ${err.message}`);
          failed++;
        })
    );
    
    await Promise.all(promises);
    
    // 顯示進度
    const progress = ((i + batch.length) / files.length * 100).toFixed(1);
    console.log(`\n📈 進度: ${progress}% (${completed} 成功, ${failed} 失敗)\n`);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`\n✅ 下載完成！`);
  console.log(`📁 輸出目錄: ${path.resolve(OUTPUT_DIR)}`);
  console.log(`✅ 成功: ${completed} 個`);
  console.log(`❌ 失敗: ${failed} 個`);
  console.log(`📊 總計: ${files.length} 個\n`);
}

// 開始下載
downloadAll().catch(console.error);

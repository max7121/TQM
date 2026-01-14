/**
 * Firebase Storage 檔案下載腳本 (使用 Admin SDK)
 * 
 * 此腳本使用 Firebase Admin SDK 繞過 CORS 限制,直接從 Storage 下載所有檔案
 * 
 * 安裝依賴:
 *   npm install firebase-admin
 * 
 * 執行:
 *   node download-storage-admin.cjs
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Firebase 設定 - 讀取 Service Account 金鑰
const serviceAccountPath = path.join(process.env.USERPROFILE, 'Downloads', 'rdsystemdatabase-firebase-adminsdk-fbsvc-de4bb7c6b8.json');
const serviceAccount = require(serviceAccountPath);

// Storage 資料夾列表
const STORAGE_FOLDERS = [
  'tqm_records',
  'rd_projects', 
  'rd_tasks',
  'rd_history',
  'rd_changes'
];

const OUTPUT_DIR = path.join(process.env.USERPROFILE, 'Downloads', 'TQM_Storage_Files');
const CONCURRENT_DOWNLOADS = 3;

// 初始化 Firebase Admin
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'rdsystemdatabase.firebasestorage.app'
  });
  console.log('✅ Firebase Admin 初始化成功');
} catch (error) {
  console.error('❌ Firebase Admin 初始化失敗:', error.message);
  console.log('\n📝 請先從 Firebase Console 下載 Service Account JSON:');
  console.log('   1. 開啟 https://console.firebase.google.com/');
  console.log('   2. 選擇專案 "rdsystemdatabase"');
  console.log('   3. Project Settings > Service Accounts');
  console.log('   4. Generate new private key');
  console.log('   5. 將下載的 JSON 內容填入本檔案的 serviceAccount 變數');
  process.exit(1);
}

const bucket = admin.storage().bucket();

/**
 * 列出資料夾中的所有檔案
 */
async function listFilesInFolder(folderPath) {
  try {
    const [files] = await bucket.getFiles({ prefix: folderPath + '/' });
    return files
      .filter(file => !file.name.endsWith('/')) // 排除資料夾本身
      .map(file => ({
        name: file.name,
        folder: folderPath,
        fullPath: file.name
      }));
  } catch (error) {
    console.error(`❌ 列出 ${folderPath} 時失敗:`, error.message);
    return [];
  }
}

/**
 * 下載單一檔案
 */
async function downloadFile(fileInfo, index, total) {
  const localPath = path.join(OUTPUT_DIR, fileInfo.fullPath);
  const dir = path.dirname(localPath);

  // 建立目錄
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // 檢查檔案是否已存在
  if (fs.existsSync(localPath)) {
    console.log(`⏭️  [${index}/${total}] 已存在: ${fileInfo.fullPath}`);
    return { success: true, skipped: true };
  }

  try {
    const file = bucket.file(fileInfo.fullPath);
    await file.download({ destination: localPath });
    
    const stats = fs.statSync(localPath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`✅ [${index}/${total}] 下載完成 (${sizeMB} MB): ${fileInfo.fullPath}`);
    
    return { success: true, size: stats.size };
  } catch (error) {
    console.error(`❌ [${index}/${total}] 下載失敗: ${fileInfo.fullPath}`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 主程式
 */
async function main() {
  console.log('🔍 開始掃描 Firebase Storage...\n');

  // 1. 掃描所有資料夾
  const allFiles = [];
  for (const folder of STORAGE_FOLDERS) {
    console.log(`📂 掃描資料夾: ${folder}`);
    const files = await listFilesInFolder(folder);
    console.log(`   找到 ${files.length} 個檔案`);
    allFiles.push(...files);
  }

  console.log(`\n📊 總共找到 ${allFiles.length} 個檔案\n`);

  if (allFiles.length === 0) {
    console.log('⚠️  沒有找到任何檔案');
    return;
  }

  // 2. 儲存檔案清單
  const manifestPath = path.join(OUTPUT_DIR, 'file-manifest.json');
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(allFiles, null, 2));
  console.log(`✅ 檔案清單已儲存: ${manifestPath}\n`);

  // 3. 下載所有檔案
  console.log('📥 開始下載檔案...\n');
  const startTime = Date.now();
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  let totalSize = 0;

  for (let i = 0; i < allFiles.length; i += CONCURRENT_DOWNLOADS) {
    const batch = allFiles.slice(i, i + CONCURRENT_DOWNLOADS);
    const results = await Promise.all(
      batch.map((file, idx) => downloadFile(file, i + idx + 1, allFiles.length))
    );

    results.forEach(result => {
      if (result.success) {
        if (result.skipped) {
          skipped++;
        } else {
          downloaded++;
          totalSize += result.size || 0;
        }
      } else {
        failed++;
      }
    });
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);

  console.log('\n' + '='.repeat(50));
  console.log('📊 下載完成統計');
  console.log('='.repeat(50));
  console.log(`✅ 下載成功: ${downloaded} 個檔案`);
  console.log(`⏭️  已存在略過: ${skipped} 個檔案`);
  console.log(`❌ 下載失敗: ${failed} 個檔案`);
  console.log(`📦 總計大小: ${totalSizeMB} MB`);
  console.log(`⏱️  執行時間: ${duration} 秒`);
  console.log(`📁 儲存位置: ${OUTPUT_DIR}`);
  console.log('='.repeat(50));

  // 關閉 Firebase Admin
  await admin.app().delete();
}

// 執行
main().catch(error => {
  console.error('❌ 執行失敗:', error);
  process.exit(1);
});

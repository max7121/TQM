import express from 'express';
import cors from 'cors';
import low from 'lowdb';
import FileSync from 'lowdb/adapters/FileSync.js';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = 3002;

// 取得 __dirname（ESM 不支援 __dirname）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 提供靜態檔案服務（HTML、CSS、JS等）
app.use(express.static(__dirname));

// Initialize LowDB
const adapter = new FileSync(path.join(__dirname, 'db.json'));
const db = low(adapter);

// Initialize DB with default data
db.defaults({ collections: {} }).write();

// Check for admin user
const users = db.get('collections.tqm_users').value();
console.log('現有使用者數量:', users ? users.length : 0);

if (!users || users.length === 0) {
    const adminUser = {
        id: 'admin_001',
        username: 'admin',
        password: 'admin123',
        displayName: '系統管理員',
        department: '工程中心',
        role: 'admin',
        createdAt: new Date().toISOString()
    };
    db.set('collections.tqm_users', [adminUser]).write();
    console.log("✓ 已建立預設管理員帳號 (admin/admin123)");
    console.log("管理員資料:", adminUser);
} else {
    console.log("✓ 管理員帳號已存在");
    console.log("第一個使用者:", users[0]);
}

// --- API Routes ---

// 1. Get collection data
app.get('/api/:collection', (req, res) => {
    const collection = req.params.collection;
    db.read(); // 重新讀取資料庫，確保獲取最新資料
    const data = db.get(`collections.${collection}`).value() || [];
    console.log(`GET /api/${collection} - 返回 ${data.length} 筆資料`);
    res.json(data);
});

// 2. Add data
app.post('/api/:collection', (req, res) => {
    const collection = req.params.collection;
    const doc = req.body;
    
    if (!doc.id) {
        doc.id = 'doc_' + Date.now() + Math.random().toString(36).substr(2, 9);
    }

    // Ensure collection exists
    if (!db.has(`collections.${collection}`).value()) {
        db.set(`collections.${collection}`, []).write();
    }

    // Check for duplicate ID
    const exists = db.get(`collections.${collection}`).find({ id: doc.id }).value();
    if (exists) {
        res.status(500).json({ error: `Duplicate ID: ${doc.id}` });
        return;
    }

    db.get(`collections.${collection}`).push(doc).write();
    res.json(doc);
});

// 3. Update data
app.put('/api/:collection/:id', (req, res) => {
    const collection = req.params.collection;
    const id = req.params.id;
    const updatedDoc = req.body;
    updatedDoc.id = id;

    if (!db.has(`collections.${collection}`).value()) {
        res.status(404).json({ error: 'Collection not found' });
        return;
    }

    const item = db.get(`collections.${collection}`).find({ id }).value();
    if (!item) {
        res.status(404).json({ error: 'Document not found' });
        return;
    }

    db.get(`collections.${collection}`).find({ id }).assign(updatedDoc).write();
    res.json(updatedDoc);
});

// 4. Delete data
app.delete('/api/:collection/:id', (req, res) => {
    const collection = req.params.collection;
    const id = req.params.id;

    if (!db.has(`collections.${collection}`).value()) {
        res.status(404).json({ error: 'Collection not found' });
        return;
    }

    const item = db.get(`collections.${collection}`).find({ id }).value();
    if (!item) {
        res.status(404).json({ error: 'Document not found' });
        return;
    }

    db.get(`collections.${collection}`).remove({ id }).write();
    res.json({ message: 'Deleted', id });
});

// 根路徑重定向到 TQM.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'TQM.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`TQM 後端伺服器 (LowDB) 已啟動: http://0.0.0.0:${PORT}`);
    console.log(`請在瀏覽器訪問: http://localhost:${PORT}`);
    console.log('資料庫檔案位置:', path.join(__dirname, 'db.json'));
    console.log('================================');
});

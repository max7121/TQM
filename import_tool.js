import fs from 'fs';
import http from 'http';

console.log('Import tool started');
console.log('Args:', process.argv);

const filePath = process.argv[2];
if (!filePath) {
    console.error('請提供檔案路徑');
    process.exit(1);
}

console.log(`正在讀取檔案: ${filePath}`);
let data;
try {
    const content = fs.readFileSync(filePath, 'utf8');
    data = JSON.parse(content);
    console.log('檔案讀取成功，包含以下鍵值:', Object.keys(data));
} catch (e) {
    console.error('讀取或解析檔案失敗:', e.message);
    process.exit(1);
}

const collections = ['tqm_users', 'tqm_records', 'rd_machines', 'rd_projects', 'rd_tasks', 'rd_changes', 'rd_history', 'rd_messages'];

// Mapping for legacy data format
const legacyMapping = {
    'users': 'tqm_users',
    'records': 'tqm_records'
};

const sendRequest = (method, collection, item) => {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(item);
        const path = method === 'POST' ? `/api/${collection}` : `/api/${collection}/${item.id}`;
        
        const options = {
            hostname: '127.0.0.1',
            port: 3002,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = http.request(options, (res) => {
            let responseBody = '';
            res.on('data', (chunk) => {
                responseBody += chunk;
            });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve();
                } else {
                    reject(new Error(`HTTP Status ${res.statusCode} - ${responseBody}`));
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        req.write(postData);
        req.end();
    });
};

async function importAll() {
    let success = 0;
    let updated = 0;
    let fail = 0;

    // Handle legacy mapping first
    for (const [oldKey, newKey] of Object.entries(legacyMapping)) {
        if (data[oldKey] && Array.isArray(data[oldKey])) {
            if (!data[newKey]) data[newKey] = [];
            data[newKey] = [...data[newKey], ...data[oldKey]];
            console.log(`偵測到舊格式 '${oldKey}'，已合併至 '${newKey}'`);
        }
    }

    for (const col of collections) {
        if (data[col] && Array.isArray(data[col])) {
            console.log(`正在匯入 ${col} (共 ${data[col].length} 筆)...`);
            for (const item of data[col]) {
                try {
                    // 嘗試新增 (POST)
                    await sendRequest('POST', col, item);
                    success++;
                } catch (e) {
                    // 如果失敗 (通常是 ID 重複)，嘗試更新 (PUT)
                    if (item.id) {
                        try {
                            await sendRequest('PUT', col, item);
                            updated++;
                        } catch (e2) {
                            console.error(`  [失敗] ${col} ID: ${item.id}`);
                            console.error(`    POST Error: ${e.message}`);
                            console.error(`    PUT Error: ${e2.message}`);
                            fail++;
                        }
                    } else {
                        console.error(`  [失敗] ${col} (無 ID) - ${e.message}`);
                        fail++;
                    }
                }
            }
        }
    }
    console.log('------------------------------------------------');
    console.log(`匯入完成！`);
    console.log(`新增: ${success} 筆`);
    console.log(`更新: ${updated} 筆`);
    console.log(`失敗: ${fail} 筆`);
}

importAll();

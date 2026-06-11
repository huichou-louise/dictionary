// 1. 監聽來自 background 的開關指令
chrome.runtime.onMessage.addListener((request) => {
    if (request.action === "toggle") {
        const existingBox = document.getElementById('my-floating-box');
        if (existingBox) {
            existingBox.remove();
        } else {
            createUI();
        }
    }
});




// 2. 建立視窗的函數
function createUI() {
    // 視窗內容6UI
    const box = document.createElement('div');
    box.id = 'my-floating-box';
    // -- 加上簡單的樣式，確保視窗浮動在頁面上
    box.style.cssText = "position: fixed; top: 20px; right: 20px; z-index: 10000; background: white; padding: 15px; border: 1px solid #ccc; width: 300px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);";

    box.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <strong>字典查詢</strong>
            <button id="closeBtn">X</button>
        </div>
        <input type="text" id="apiKeyInput" placeholder="api key">
        <input type="submit" id="apiKeyBtn" value="V">
        <hr>
        <input type="text" id="vocabInput" placeholder="請選取單字...">
        <input type="submit" id="searchBtn" value="Search">
        <div id="resultArea" style="margin:15px 0px; padding:10px; border:1px solid #ddd; max-height: 200px; overflow-y: auto; background: #f9f9f9; font-size: 13px;">
            還沒有東東...
        </div>
        <button id="saveBtn" style="padding: 5px 10px; cursor: pointer;">❤️ 收藏</button>
        <button id="viewFavBtn" style="padding: 5px 10px; cursor: pointer;">📁 查看收藏</button>
        <button id="clearFavBtn" style="padding: 5px 10px; cursor: pointer;">清除收藏</button>
    `;
    document.body.appendChild(box);
    const saveBtn = document.getElementById('saveBtn');
    const clearFavBtn = document.getElementById('clearFavBtn');
    const apiKeyBtn = document.getElementById('apiKeyBtn');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const vocabInput = document.getElementById('vocabInput');
    const searchBtn = document.getElementById('searchBtn');
    const closeBtn = document.getElementById('closeBtn');
    const resultArea = document.getElementById('resultArea');
    
    // let mockResult = null;
    let aiResult = null;
    closeBtn.addEventListener('click', () => box.remove());

    // 儲存 API Key
    apiKeyBtn.addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        if (!key) return alert("請輸入 API Key");
        chrome.storage.local.set({ gemini_api_key: key }, () => {
            apiKeyInput.value = "";
            apiKeyInput.placeholder = "API Key 已儲存";
        });
    });

    // 搜尋功能
    const searchVocab = () => {
        const vocab = vocabInput.value.trim();
        saveBtn.textContent = '❤️ 收藏';

        // 測試用的模擬資料
        // mockResult = {
        //     header: "單字原型 (詞性)",
        //     definitions: "【中文翻譯】 常見用法",
        //     usage_title: "🗒️用法",
        //     usages: "相關用法或詞清單描述",
        //     example_title: "🔹例句",
        //     examples: "原文例句 / 中文翻譯"
        // };
        // resultArea.innerHTML = `
        //                 <div style="font-family: sans-serif; line-height: 1.6; color: #333; text-align: left;">
        //                 <!-- 翻譯區塊 -->
        //                 <div style="margin-bottom: 15px; white-space: pre-line;">
        //                     <strong style="color: #d35400;">${mockResult.header}</strong>
        //                 </div>

        //                 <!-- 定義區塊 -->
        //                 <div style="margin-bottom: 15px;">
        //                     ${mockResult.definitions}

        //                 </div>



        //                 <!-- 例句區塊 -->
        //                 <div>
        //                     <strong style="color: #27ae60;">${mockResult.example_title}</strong>
        //                     <div style="margin-top: 5px;">
        //                         ${mockResult.examples}
        //                     </div>
        //                 </div>
        //             </div>
        //             `;
        // API
        if (!vocab) return alert('請先輸入單字！');
        resultArea.innerHTML = "查詢中...";
        chrome.storage.local.get(['gemini_api_key'], (data) => {
            if (!data.gemini_api_key) return resultArea.innerHTML = "請先設定 API Key";

            chrome.runtime.sendMessage({
                action: "callGemini",
                vocab: vocab,
                key: data.gemini_api_key
            }, (response) => {
                if (response && response.result) {
                    aiResult = response.result;
                    console.log(aiResult);
                    resultArea.innerHTML = `
                        <div style="font-family: sans-serif; line-height: 1.6; color: #333; text-align: left;">
                        <!-- 翻譯區塊 -->
                        <div style="margin-bottom: 15px; white-space: pre-line;">
                            <strong style="color: #d35400;">${aiResult.header}</strong>
                            <div style="color: #d35400;">${aiResult.speech}</div>
                        </div>

                        <!-- 定義區塊 -->
                        <div style="margin-bottom: 15px;">
                            ${aiResult.definitions.map((def, index) => `<div style="margin-bottom: 5px;">${index + 1}. ${def}</div>`).join('')}

                        </div>



                        <!-- 例句區塊 -->
                        <div>
                            <strong style="color: #27ae60;">${aiResult.example_title}</strong>
                            <div style="margin-top: 5px;">
                                ${aiResult.examples.map(ex => `<div style="margin-bottom: 10px;">${ex.replace(/\n/g, '<br>')}</div>`).join('')}
                            </div>
                        </div>
                    </div>
                    `;
                } else {
                    // resultArea.innerHTML = vocab;
                    resultArea.innerHTML = `<span style="color:red;">錯誤: ${response?.error || '未知錯誤'}</span>`;
                }
            });
        });
    };
    // 點擊搜尋單字
    searchBtn.addEventListener('click', function () {
        // 1. 執行你的搜尋函數
        searchVocab();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Enter') searchVocab(); });
    document.addEventListener('mouseup', () => {
        const sel = window.getSelection().toString().trim();
        if (sel) vocabInput.value = sel;
    });
    // 收藏功能的邏輯
    saveBtn.addEventListener('click', () => {
        // saveBtn.textContent = '已收藏';
        chrome.storage.local.get(['favorites'], (res) => {
            let favs = res.favorites || [];
            // 檢查是否已存在 (避免重複)
            if (!favs.find(item => item.header === aiResult.header)) {
                favs.push(aiResult);
                chrome.storage.local.set({ favorites: favs }, () => {
                    saveBtn.textContent = '已收藏';
                });
                console.log('目前的收藏清單:', favs);
            } else {
                alert("此單字已收藏過。");
            }
        });
    });
    // 清除收藏
    clearFavBtn.addEventListener('click', () => {
        chrome.storage.local.remove(['favorites'], () => {
            console.log("收藏清單已移除");
        });
    })

    // 打開彈窗查看收藏單字
    function openFavoritesModal() {
        // 建立遮罩與容器 (同前)
        const overlay = document.createElement('div');
        overlay.id = 'fav-modal-overlay';
        overlay.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 999999; display: flex; justify-content: center; align-items: center;`;

        const container = document.createElement('div');
        container.style.cssText = `background: white; padding: 20px; border-radius: 10px; width: 400px; max-height: 80vh; overflow-y: auto; box-shadow: 0 4px 15px rgba(0,0,0,0.2);`;

        // 渲染函式 (將其抽出，方便刪除後重新呼叫)
        function renderList() {
            chrome.storage.local.get(['favorites'], (res) => {
                const favs = res.favorites || [];
                let html = `<h3>❤️ 我的收藏庫</h3><hr>`;

                if (favs.length === 0) {
                    html += `<p>目前還沒有收藏單字喔！</p>`;
                } else {
                    html += `<ul style="list-style: none; padding: 0;">`;
                    favs.forEach((f, index) => {
                        html += `
                            <li style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
                                <span>${f.header.split('\n')[0]}</span>
                                <button class="remove-btn" data-index="${index}" style="color: red; cursor: pointer;">移除</button>
                            </li>`;
                    });
                    html += `</ul>`;
                }

                html += `
                    <div style="margin-top: 20px; display: flex; gap: 10px;">
                        <button id="exportCsvBtn" style="flex: 1; padding: 10px;">下載 CSV</button>
                        <button id="ankiCsvBtn" style="flex: 1; padding: 10px;">CSV for Anki</button>
                        <button id="closeModalBtn" style="flex: 1; padding: 10px;">關閉</button>
                    </div>
                `;
                container.innerHTML = html;

                // 綁定移除事件
                document.querySelectorAll('.remove-btn').forEach(btn => {
                    btn.onclick = () => {
                        const idx = btn.getAttribute('data-index');
                        favs.splice(idx, 1); // 從陣列中刪除
                        chrome.storage.local.set({ favorites: favs }, () => {
                            renderList(); // 刪除後立即重新渲染
                        });
                        console.log('目前的收藏清單:', favs);
                    };
                });

                // 綁定其他按鈕事件
                document.getElementById('closeModalBtn').onclick = () => overlay.remove();
                document.getElementById('exportCsvBtn').onclick = exportToCSV;
                document.getElementById('ankiCsvBtn').onclick = exportToAnki;
            });
        }

        overlay.appendChild(container);
        document.body.appendChild(overlay);
        renderList(); // 初始化渲染
    }
    // 綁定按鈕
    document.getElementById('viewFavBtn').addEventListener('click', () => {
        openFavoritesModal();
        
    });



}
// --- 下載功能區 ---
function exportToCSV() {
    chrome.storage.local.get(['favorites'], (res) => {
        const data = res.favorites || [];
        if (data.length === 0) return alert("沒有收藏資料可供下載");

        // 1. 加入 BOM (EF BB BF) 確保 Excel 能識別 UTF-8 編碼
        let csvContent = "\uFEFF";

        // 2. 設定 CSV 標題欄
        csvContent += "單字,詞性,定義,用法說明,例句\n";

        // 3. 逐筆處理資料
        data.forEach(item => {
            // 輔助函式：處理字串，將雙引號轉義並以雙引號包覆
            const escapeCSV = (str) => `"${(str || "").toString().replace(/"/g, '""')}"`;

            // 對應你的新結構欄位
            const header = escapeCSV(item.header || "");
            const speech = escapeCSV(item.speech || ""); // 新增：對應結構中的 speech
            const definitions = escapeCSV((item.definitions || []).join('; '));
            const usages = escapeCSV((item.usages || []).join('; '));
            const examples = escapeCSV((item.examples || []).join('; '));

            // 寫入 CSV 行
            csvContent += `${header},${speech},${definitions},${usages},${examples}\n`;
        });

        // 4. 建立並下載檔案
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "french_vocabulary.csv";
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}

// anki
function exportToAnki() {
    chrome.storage.local.get(['favorites'], (res) => {
        const data = res.favorites || [];
        const today = new Date().toISOString().split('T')[0];
        // const data = res.favorites || [];
        if (data.length === 0) return alert("沒有收藏資料可供下載");

        // 1. 加入 BOM (EF BB BF) 確保 Excel 能識別 UTF-8 編碼
        let csvContent = "\uFEFF";

        // 2. 設定 CSV 標題欄
        // csvContent += "單字,詞性,定義,用法說明,例句\n";

        // 3. 逐筆處理資料
        data.forEach(item => {
            // 輔助函式：處理字串，將雙引號轉義並以雙引號包覆
            const escapeCSV = (str) => `"${(str || "").toString().replace(/"/g, '""')}"`;

            // 對應你的新結構欄位
            const header = escapeCSV(item.header || "");
            const speech = escapeCSV(item.speech || ""); // 新增：對應結構中的 speech
            const definitions = escapeCSV((item.definitions || []).join('; '));
            const usages = escapeCSV((item.usages || []).join('; '));
            const examples = escapeCSV((item.examples || []).join('; '));
            // 寫入 CSV 前的欄位清理邏輯
            const clean = (str) => String(str).replace(/"/g, '""'); // 將內部的 " 變為 "" 以符合 CSV 標準

            csvContent += `${clean(header)} ${clean(speech)}\t${clean(definitions)} <br> ${clean(usages)} <br> ${clean(examples)}\t${today}\n`;

            // 寫入 CSV 行
            // csvContent += `${header} ${speech} \t ${definitions}${usages}${examples} \t ${today}\n`;
        });

        // 4. 建立並下載檔案
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `french_vocab_anki_${today}.csv`;
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}


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
    // 圖片置入區
    const exitIconUrl = chrome.runtime.getURL('assets/exit.png');
    const arrowIconUrl = chrome.runtime.getURL('assets/arrow.png');
    const searchIconUrl = chrome.runtime.getURL('assets/search.png');
    const checkIconUrl = chrome.runtime.getURL('assets/btIcon_check.png');
    const folderIconUrl = chrome.runtime.getURL('assets/btIcon_folder.png');
    const heartIconUrl = chrome.runtime.getURL('assets/btIcon_heart.png');
    const deleteIconUrl = chrome.runtime.getURL('assets/delete.png');
    const downloadIconUrl = chrome.runtime.getURL('assets/btIcon_download.png');
    // 
    box.innerHTML = `
        <div class="tit">
            <strong>Dictionary</strong>
            <button id="closeBtn">
                <img src="${exitIconUrl}" alt="exit">
            </button>
        </div>
        <div class="input-group">
            <input type="text" id="apiKeyInput" placeholder="api key">
            <button id="apiKeyBtn">
                <img src="${arrowIconUrl}" alt="send api key">
            </button>
        </div>
        <div class="input-group">
            <input type="text" id="vocabInput" placeholder="Select the word...">
            <button id="searchBtn">
                <img src="${searchIconUrl}" alt="Search">
            </button>
        </div>
        <div id="resultArea">
            還沒有東東...
        </div>
        <div class="btn-group">
            <button class="saveBtn" id="saveBtn">
                Save
                <img src="${heartIconUrl}" alt="save">
            </button>
            <button class="saveBtn viewFavBtn" id="viewFavBtn">
                List
                <img src="${folderIconUrl}" alt="list">
            </button>
        </div>
        
        
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
    const viewFavBtn = document.getElementById('viewFavBtn');
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
        saveBtn.classList.remove("saved");
        saveBtn.innerHTML = `Save <img src="${heartIconUrl}" alt="save" style="opacity: 1;">`;


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
                        <div class="translate">
                        <!-- 單字區塊 -->
                        <div class="vocab">
                            ${aiResult.header}   ${aiResult.speech}
                        </div>

                        <!-- 定義區塊 -->
                        <div style="margin-bottom: 15px;">
                            ${aiResult.definitions.map((def, index) => `<div style="margin-bottom: 5px;">${index + 1}. ${def}</div>`).join('')}

                        </div>



                        <!-- 例句區塊 -->
                        <div>
                            <strong style="color: #27ae60;">${aiResult.example_title}</strong>
                            <div style="margin-top: 5px;">
                                ${aiResult.examples.map((ex, index) => `<div style="margin-bottom: 5px;">${index + 1}. ${ex.replace(/\n/g, '<br>')}</div>`).join('')}
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


    // 彈窗查收藏單字
    function openFavoritesModal() {
        // 建立遮罩與容器 (同前)
        const overlay = document.createElement('div');
        overlay.id = 'fav-modal-overlay';
        // overlay.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 999999; display: flex; justify-content: center; align-items: center;`;

        const container = document.createElement('div');
        container.id = 'containar'
        // container.style.cssText = `background: white; padding: 20px; border-radius: 10px; width: 400px; max-height: 80vh; overflow-y: auto; box-shadow: 0 4px 15px rgba(0,0,0,0.2);`;

        // 渲染函式 (將其抽出，方便刪除後重新呼叫)
        function renderList() {
            chrome.storage.local.get(['favorites'], (res) => {
                const favs = res.favorites || [];
                let html = `<div class="tit">
                                <strong>List</strong>
                                <button id="closeModalBtn">
                                    <img src="${exitIconUrl}" alt="exit">
                                </button>
                            </div>`;


                if (favs.length === 0) {
                    html += `<p>No saved words yet.</p>`;
                } else {
                    html += `<div class="voc_list">
                                <ul  class="voc_list_ul">
                            `;
                    favs.forEach((f, index) => {
                        html += `
                            <li class="voc_list_li">
                                <span>${f.header.split('\n')[0]}</span>
                                <button class="remove-btn" data-index="${index}">
                                    <img src="${deleteIconUrl}" alt="delete">
                                </button>
                            </li>`;
                    });
                    html += `</ul></div>`;
                }

                html += `
                    <div class="btn-group">
                        <button class="saveBtn downloadBtn" id="exportTxtBtn">
                            TXT
                            <img src="${downloadIconUrl}" alt="download">
                        </button>
                        <button class="saveBtn downloadBtn" id="exportCsvBtn">
                            CSV
                            <img src="${downloadIconUrl}" alt="download">
                        </button>
                        <button class="saveBtn downloadBtn" id="ankiCsvBtn" style="width: 163px;">
                            CSV for Anki
                            <img src="${downloadIconUrl}" alt="download">
                        </button>    
                    </div>
                    <button class="saveBtn clearBtn" id="clearFavBtn">
                        Clear List
                    </button>
                    

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
                // 清除收藏
                clearFavBtn.addEventListener('click', () => {
                    chrome.storage.local.remove(['favorites'], () => {
                        console.log("收藏清單已移除");
                        // 強制清空頁面上的列表容器
                        const listContainer = document.querySelector('.voc_list');
                        if (listContainer) {
                            listContainer.innerHTML = '<p>No saved words yet.</p>';
                        }
                    });
                });
            });
        }

        overlay.appendChild(container);
        document.body.appendChild(overlay);
        renderList(); // 初始化渲染
    }


    // 收藏談窗綁定按鈕
    viewFavBtn.addEventListener('click', () => {
        openFavoritesModal();

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
                    saveBtn.classList.add("saved");
                    saveBtn.innerHTML = `Saved <img src="${checkIconUrl}" alt="saved">`;

                    
                });
                console.log('目前的收藏清單:', favs);
            } else {
                alert("This word is already saved.");
            }
        });
    });
    
}
// --- 下載功能區 ---
// CSV
function exportToCSV() {
    chrome.storage.local.get(['favorites'], (res) => {
        const data = res.favorites || [];
        const today = new Date().toISOString().split('T')[0];
        if (data.length === 0) return alert("沒有收藏資料可供下載");

        // 1. 加入 BOM (EF BB BF) 確保 Excel 能識別 UTF-8 編碼
        let csvContent = "\uFEFF";

        // 2. 設定 CSV 標題欄
        csvContent += "單字,詞性,定義,用法說明,例句\n";

        // 3. 逐筆處理資料
        data.forEach(item => {
            // 輔助函式：移除 <br> 並替換為 \n
            const cleanStr = (str) => {
                if (!str) return "";
                return str.toString().replace(/<br\s*\/?>/gi, "\n"); 
            };

            const header = cleanStr(item.header || "");
            const speech = cleanStr(item.speech || "");
            
            // 【修改重點 1】：這裡將連接符號由 '; ' 改為 '\n'，讓內容在同一格內換行
            const definitions = (item.definitions || []).map(cleanStr).join('\n');
            const usages = (item.usages || []).map(cleanStr).join('\n');
            const examples = (item.examples || []).map(cleanStr).join('\n');

            // 【修改重點 2】：重新設計 CSV 行的組裝邏輯
            const rowArray = [header, speech, definitions, usages, examples];
            
            const processedRow = rowArray.map(field => {
                // 如果內容包含逗號、換行符，或者原本就有雙引號，就必須加引號
                // 並將原本的雙引號轉義為兩個雙引號 ("")
                if (field.includes(',') || field.includes('\n') || field.includes('"')) {
                    const escapedField = field.replace(/"/g, '""');
                    return `"${escapedField}"`;
                }
                return field;
            }).join(',');

            csvContent += `${processedRow}\n`;
        });
        // 4. 建立並下載檔案
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `fr_vocab_${today}.csv`;
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
            // 1. 處理個別內容，將內部的 " 轉義為 "" (CSV 標準)
            const clean = (str) => (str || "").toString().replace(/"/g, '""');

            const header = clean(item.header || "");
            const todayStr = clean(today);

            // 2. 將中間的第二格內容串接起來
            // 使用 <br> 作為連接符號，不在此處加入額外引號
            const secondCellContent = [
                clean(item.speech || ""),
                (item.definitions || []).map(clean).join('<br>'),
                (item.usages || []).map(clean).join('<br>'),
                (item.examples || []).map(clean).join('<br>')
            ].filter(Boolean).join('<br>'); // filter(Boolean) 確保不會有空的 <br>

            // 3. 組合三格並加上必要的 CSV 引號
            // 如果第二格內含有 <br>，根據 CSV 規範，該格必須用 "" 包覆
            const row = `${header},"${secondCellContent}",${todayStr}`;

            csvContent += `${row}\n`;
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


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
    const box = document.createElement('div');
    box.id = 'my-floating-box';
    // 加上簡單的樣式，確保視窗浮動在頁面上
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
        <div id="resultArea" style="margin-top:15px; padding:10px; border:1px solid #ddd; max-height: 200px; overflow-y: auto; background: #f9f9f9; font-size: 13px;">
            等待搜尋結果...
        </div>
    `;
    document.body.appendChild(box);

    const apiKeyBtn = document.getElementById('apiKeyBtn');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const vocabInput = document.getElementById('vocabInput');
    const searchBtn = document.getElementById('searchBtn');
    const closeBtn = document.getElementById('closeBtn');
    const resultArea = document.getElementById('resultArea');

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
                    const d = response.result;
                    resultArea.innerHTML = `
                        <div style="font-family: sans-serif; line-height: 1.6; color: #333; text-align: left;">
                        <!-- 翻譯區塊 -->
                        <div style="margin-bottom: 15px; white-space: pre-line;">
                            <strong style="color: #d35400;">${d.header}</strong>
                        </div>

                        <!-- 定義區塊 -->
                        <div style="margin-bottom: 15px;">
                            ${d.definitions.map((def, index) => `<div style="margin-bottom: 5px;">${index + 1}. ${def}</div>`).join('')}
                            
                        </div>

                        

                        <!-- 例句區塊 -->
                        <div>
                            <strong style="color: #27ae60;">${d.example_title}</strong>
                            <div style="margin-top: 5px;">
                                ${d.examples.map(ex => `<div style="margin-bottom: 10px;">${ex.replace(/\n/g, '<br>')}</div>`).join('')}
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

    searchBtn.addEventListener('click', searchVocab);
    document.addEventListener('keydown', (e) => { if (e.key === 'Enter') searchVocab(); });
    document.addEventListener('mouseup', () => {
        const sel = window.getSelection().toString().trim();
        if (sel) vocabInput.value = sel;
    });
}
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
    box.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <strong>字典查詢</strong>
            <button id="closeBtn">X</button>
        </div>
        <input type="text" id="vocabInput" name="vocabulary" placeholder="請選取單字...">
        <input type="submit" id="submitBtn" name="submitbtn" value="Search">
    `;
    document.body.appendChild(box);

    // --- 內部綁定事件 (只有視窗存在時才綁定) ---
    const vocabInput = document.getElementById('vocabInput');
    const submitBtn = document.getElementById('submitBtn');
    const closeBtn = document.getElementById('closeBtn');

    // 關閉功能
    closeBtn.addEventListener('click', () => box.remove());

    // 搜尋功能
    const searchVocab = () => {
        const vocab = vocabInput.value.trim();
        if (vocab.length === 0) {
            alert('請先選取或輸入單字！');
            return;
        }
        console.log("正在搜尋單字:", vocab);
        alert(`搜尋: ${vocab}`);
    };

    submitBtn.addEventListener('click', searchVocab);

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') searchVocab();
    });
}

// 3. 全域監聽滑鼠選取 (這裡需要判斷視窗是否存在)
document.addEventListener('mouseup', () => {
    const vocabInput = document.getElementById('vocabInput');
    // 只有當輸入框存在時，才執行填入動作
    if (vocabInput) {
        const selection = window.getSelection().toString().trim();
        if (selection.length > 0) {
            vocabInput.value = selection;
        }
    }
});
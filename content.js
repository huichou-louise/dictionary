// 1. 建立並注入視窗
const box = document.createElement('div');
box.id = 'my-floating-box';
box.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
        <span>字典查詢</span>
        <button id="closeBtn">X</button>
    </div>
    <hr>
    <input type="text" name="vocabulary" placeholder="請在網頁選取文字...">
    <input type="submit" name="submitbtn" value="Search">
`;
document.body.appendChild(box);
// 加入關閉功能(關鍵步驟)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "toggle") {
        const box = document.getElementById('my-floating-box');
        if (box) {
            box.remove(); // 如果存在就刪除
        } else {
            // 如果不存在，重新呼叫建立視窗的函數
            createDictWindow();
        }
    }
});


// 2. 取得 DOM 元素
const vocabInput = document.querySelector('input[name="vocabulary"]');
const submitBtn = document.querySelector('input[type="submit"]');

// 監聽滑鼠選取 (填入欄位)
document.addEventListener('mouseup', () => {
    const selection = window.getSelection().toString().trim();
    if (selection.length > 0) {
        vocabInput.value = selection;
    }
});


// 3. 定義一個「執行搜尋」的共用函數
function searchVocab() {
    const vocab = vocabInput.value.trim();
    if (vocab.length === 0) {
        alert('請先選取或輸入單字！');
        return;
    }

    // 這裡放入你原本的 chrome.storage.local.set 邏輯
    console.log("正在搜尋單字:", vocab);
    alert(`搜尋: ${vocab}`);
}

// 綁定「點擊」事件
submitBtn.addEventListener('click', searchVocab);

// 綁定「按鍵」事件 (監聽整個文件)
document.addEventListener('keydown', (event) => {
    // 檢查按下的鍵是不是 Enter
    if (event.key === 'Enter') {
        // 為了避免在一些非預期的情況下觸發，可以檢查一下輸入框是否有值
        // const vocab = document.querySelector('input[name="vocabulary"]').value.trim();
        searchVocab();
    }
});


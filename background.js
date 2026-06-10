// 這是最簡單的 background.js，如果這個都不行，那就是環境問題
chrome.action.onClicked.addListener((tab) => {
    console.log("插件圖示被點擊了"); // 看看 Service Worker 的 Console 有沒有出現這行
    chrome.tabs.sendMessage(tab.id, { action: "toggle" });
});


// 2. 處理來自 content.js 的 Gemini API 請求
// background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "callGemini") {
        const { vocab, key } = request;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;

        fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `請查詢法文單字：${vocab}。
                                請以嚴格的 JSON 格式回覆，不要包含任何 Markdown 標記，直接輸出純 JSON。
                                請將內容依照下列結構組織：

                                {
                                "header": "單字 （詞性簡寫）",
                                "definitions": ["定義1\n→常見用法", "定義2\n→常見用法"],
                                "usage_title": "🗒️用法",
                                "usages": ["條列用法描述與相關詞清單"],
                                "example_title": "🔹例句",
                                "examples": ["原文例句\n→ 中文翻譯"]
                                }

                                請確保資料符合該單字的真實用法。` }]
                }]
            })
        })
            .then(res => res.json())
            .then(data => {
                if (data.candidates && data.candidates[0].content.parts[0].text) {
                    let text = data.candidates[0].content.parts[0].text.replace(/```json/g, '').replace(/```/g, '').trim();
                    try {
                        sendResponse({ result: JSON.parse(text) });
                    } catch (e) {
                        sendResponse({ error: "JSON 解析失敗，原始字串: " + text });
                    }
                } else {
                    sendResponse({ error: "Gemini 沒有回應內容" });
                }
            })
            .catch(err => sendResponse({ error: err.message }));

        return true;
    }
});
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

        // 💡 建議將模型名稱改為官方穩定版核心模型 gemini-2.5-flash 
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;

        fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `請查詢法文單字：${vocab}。並嚴格依照規定的 JSON 格式組織內容。
                        結構範例：
                        {
                          "header": "單字原型 (詞性)",
                          "definitions": ["中文翻譯 - 常見用法"],
                          "usage_title": "🗒️用法",
                          "usages": ["相關用法或詞清單描述"],
                          "example_title": "🔹例句",
                          "examples": ["原文例句 / 中文翻譯"]
                        }`
                    }]
                }],
                // ✨ 關鍵核心：開啟官方硬核 JSON 模式，迫使模型只能吐出純 JSON
                generationConfig: {
                    responseMimeType: "application/json"
                }
            })
        })
            .then(res => {
                // 🚨 在這裡精準攔截 429 爆額度狀態
                if (res.status === 429) {
                    throw new Error("Too Many Requests");
                }

                // 攔截其他可能發生的網路錯誤（例如 400 Bad Request 或 500 伺服器壞掉）
                if (!res.ok) {
                    throw new Error(`API 請求失敗，狀態碼: ${res.status}`);
                }
                return res.json();
            })
            .then(data => {
                // 安全防禦性鏈結讀取
                const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

                if (rawText) {
                    try {
                        // 因為開啟了 responseMimeType，rawText 必然是純 JSON 字串
                        const cleanJson = JSON.parse(rawText.trim());
                        sendResponse({ result: cleanJson });
                    } catch (e) {
                        sendResponse({ error: "JSON 解析失敗，內容不是合法 JSON。原始字串: " + rawText });
                    }
                } else {
                    // 💡 如果走到這裡，高機率是觸發了安全性封鎖 (Safety Block)
                    console.log("Gemini 異常回傳結構:", data);
                    sendResponse({ error: "Gemini 沒有回應內容，可能內容涉及敏感或被安全機制攔截。" });
                }
            })
            .catch(err => {
                console.error("Fetch 發生錯誤:", err);
                sendResponse({ error: err.message });
            });

        return true; // 保持麥克風線路暢通
    }
});
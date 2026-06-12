// background.js

// 1. 點擊圖示時切換字典顯示
chrome.action.onClicked.addListener((tab) => {
    chrome.tabs.sendMessage(tab.id, { action: "toggle" }, () => {
        // 攔截 lastError，避免在某些頁面（chrome://、商店頁等）出現
        // "Unchecked runtime.lastError: Could not establish connection" 噪音
        if (chrome.runtime.lastError) {
            console.log("無法傳送訊息到此頁面：", chrome.runtime.lastError.message);
        }
    });
});

// 2. 處理來自 content.js 的 Gemini API 請求
const MODEL_NAME = "gemini-2.5-flash"; // 官方穩定版核心模型
const FETCH_TIMEOUT_MS = 15000; // 15 秒逾時保護

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action !== "callGemini") return;

    const { vocab, key } = request;

    // 基本參數檢查，避免發出註定失敗的請求
    if (!vocab || !key) {
        sendResponse({ error: "缺少必要參數：vocab 或 key 為空。" });
        return; // 不需要 return true，因為是同步回應
    }

    handleGeminiRequest(vocab, key)
        .then(sendResponse)
        .catch((err) => {
            console.error("Gemini 請求發生未預期錯誤:", err);
            sendResponse({ error: err.message });
        });

    return true; // 保持非同步通道暢通
});

async function handleGeminiRequest(vocab, key) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${key}`;

    const prompt = `請查詢法文單字：${vocab}，並嚴格依照規定的 JSON 格式組織內容，不要有任何額外說明文字。

【格式規則】
1. "header"：單字的原型（不含冠詞，動詞請給原形）
2. "speech"：詞性，只能從以下列表中選擇對應的縮寫，不可自創格式：
   - 陽性名詞 → "n.m."
   - 陰性名詞 → "n.f."
   - 動詞 → "v."
   - 形容詞 → "adj."
   - 副詞 → "adv."
   - 介系詞 → "prép."
   - 連接詞 → "conj."
   - 代名詞 → "pron."
   - 感嘆詞 → "interj."
   - 若有多個詞性，用逗號分隔，例如 "n.m., adj."
3. "definitions"：陣列，每項格式為「【中文翻譯】常見用法說明」，最多 3 項
4. "usage_title"：固定為 "🗒️用法"
5. "usages"：陣列，列出常見搭配詞、慣用語或同反義詞，最多 3 項
6. "example_title"：固定為 "🔹例句"
7. "examples"：陣列，每項格式為「法文例句 / 中文翻譯」，最多 2 項

【完整範例】（請嚴格仿照此結構與格式，但內容根據實際單字調整）
{
  "header": "manger",
  "speech": "v.",
  "definitions": ["【吃】指食用食物的動作"],
  "usage_title": "🗒️用法",
  "usages": ["manger à sa faim（吃飽）", "manger dehors（外食）"],
  "example_title": "🔹例句",
  "examples": ["J'aime manger des croissants. / 我喜歡吃可頌。"]
}

現在請查詢：${vocab}`;

    // 設定逾時保護，避免請求卡死導致 sendResponse 永不觸發
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let res;
    try {
        res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                // ✨ 開啟官方 JSON 模式，迫使模型只能吐出純 JSON
                generationConfig: { responseMimeType: "application/json" },
            }),
        });
    } catch (err) {
        if (err.name === "AbortError") {
            return { error: "請求逾時，請稍後再試。" };
        }
        return { error: `網路請求失敗: ${err.message}` };
    } finally {
        clearTimeout(timeoutId);
    }

    // 🚨 精準攔截 429 爆額度狀態
    if (res.status === 429) {
        return { error: "Too Many Requests" };
    }
    // 攔截其他 HTTP 錯誤（400 / 401 / 500 等）
    if (!res.ok) {
        return { error: `API 請求失敗，狀態碼: ${res.status}` };
    }

    const data = await res.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
        console.log("Gemini 異常回傳結構:", data);
        return { error: "Gemini 沒有回應內容，可能內容涉及敏感或被安全機制攔截。" };
    }

    try {
        const cleanJson = JSON.parse(rawText.trim());
        return { result: cleanJson };
    } catch (e) {
        return { error: "JSON 解析失敗，內容不是合法 JSON。原始字串: " + rawText };
    }
}
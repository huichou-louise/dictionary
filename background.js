// 這是最簡單的 background.js，如果這個都不行，那就是環境問題
chrome.action.onClicked.addListener((tab) => {
    console.log("插件圖示被點擊了"); // 看看 Service Worker 的 Console 有沒有出現這行
    chrome.tabs.sendMessage(tab.id, { action: "toggle" });
});
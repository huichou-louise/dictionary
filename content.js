// =============================================
// content.js — Dictionary Extension
// =============================================

// ── 工具函式 ──────────────────────────────────
const getURL = (path) => chrome.runtime.getURL(path);
const $      = (id)   => document.getElementById(id);

const ICONS = {
  exit    : getURL('assets/exit.png'),
  arrow   : getURL('assets/arrow.png'),
  search  : getURL('assets/search.png'),
  check   : getURL('assets/btIcon_check.png'),
  folder  : getURL('assets/btIcon_folder.png'),
  heart   : getURL('assets/btIcon_heart.png'),
  delete  : getURL('assets/delete.png'),
  download: getURL('assets/btIcon_download.png'),
};

// ── 全域狀態變數 ────────────────
let isDictionaryOpen = false;
let keydownHandler = null; // 存放 keydown 監聽器的參考，方便之後移除

// ── 訊息監聽：切換浮動視窗 ────────────────────
chrome.runtime.onMessage.addListener((request) => {
    if (request.action !== 'toggle') return;
    const existing = $('my-floating-box');

    if (existing) {
        closeUI(existing);
    } else {
        createUI();
    }
});

// ── 關閉視窗的共用函式（移除 DOM + 解除監聽 + 重置狀態）────
function closeUI(box) {
    box.remove();
    isDictionaryOpen = false;

    if (keydownHandler) {
        document.removeEventListener('keydown', keydownHandler);
        keydownHandler = null;
    }
}

// =============================================
// 主視窗
// =============================================
function createUI() {
  const box = document.createElement('div');
  box.id = 'my-floating-box';
  box.innerHTML = buildMainHTML();
  document.body.appendChild(box);

  const closeBtn    = $('closeBtn');
  const apiKeyBtn   = $('apiKeyBtn');
  const apiKeyInput = $('apiKeyInput');
  const vocabInput  = $('vocabInput');
  const searchBtn   = $('searchBtn');
  const saveBtn     = $('saveBtn');
  const viewFavBtn  = $('viewFavBtn');
  const resultArea  = $('resultArea');

  let aiResult = null;

  // ── 關閉 ──
  closeBtn.addEventListener('click', () => box.remove());

  // ── 儲存 API Key ──
  apiKeyBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (!key) return alert('請輸入 API Key');
    chrome.storage.local.set({ gemini_api_key: key }, () => {
      apiKeyInput.value       = '';
      apiKeyInput.placeholder = 'API Key 已儲存';
    });
  });

  // ── 搜尋 ──
  function searchVocab() {
    const vocab = vocabInput.value.trim();
    if (!vocab) return alert('請先輸入單字！');

    resetSaveBtn();
    resultArea.innerHTML = '查詢中...';

    chrome.storage.local.get(['gemini_api_key'], ({ gemini_api_key }) => {
      if (!gemini_api_key) {
        resultArea.innerHTML = '請先設定 API Key';
        return;
      }
      chrome.runtime.sendMessage(
        { action: 'callGemini', vocab, key: gemini_api_key },
        (response) => {
          if (response?.result) {
            aiResult = response.result;
            resultArea.innerHTML = buildResultHTML(aiResult);
          } else {
            resultArea.innerHTML =
              `<span style="color:red;">錯誤：${response?.error || '未知錯誤'}</span>`;
          }
        }
      );
    });
  }

  function resetSaveBtn() {
    saveBtn.classList.remove('saved');
    saveBtn.innerHTML = `Save <img src="${ICONS.heart}" alt="save">`;
  }

  searchBtn.addEventListener('click', searchVocab);
  document.addEventListener('keydown', (e) => { if (e.key === 'Enter') searchVocab(); });
  document.addEventListener('mouseup', () => {
    const sel = window.getSelection().toString().trim();
    if (sel) vocabInput.value = sel;
  });

  // ── 收藏 ──
  // 抽出共用的儲存邏輯
function saveToFavorites() {
    if (!aiResult) {
        alert('請先查詢單字！');
        return;
    }

    chrome.storage.local.get(['favorites'], ({ favorites = [] }) => {
        if (favorites.find((item) => item.header === aiResult.header)) {
            alert('This word is already saved.');
            return;
        }

        favorites.push(aiResult);
        chrome.storage.local.set({ favorites }, () => {
            saveBtn.classList.add('saved');
            saveBtn.innerHTML = `Saved <img src="${ICONS.check}" alt="saved">`;
        });
    });
}

// 1. 點擊按鈕儲存
saveBtn.addEventListener('click', saveToFavorites);

// ── 鍵盤快捷鍵：按 L 收藏 ──
    keydownHandler = (e) => {
        const tag = e.target.tagName.toLowerCase();
        const isEditable = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;
        if (isEditable) console.log("!!!!!!!");

        if (e.key.toLowerCase() === 'l') {
            e.preventDefault();
            saveToFavorites();
        }
    };
    document.addEventListener('keydown', keydownHandler);

  // ── 查看收藏清單 ──
  viewFavBtn.addEventListener('click', openFavoritesModal);
}

// =============================================
// HTML 產生器
// =============================================
function buildMainHTML() {
  return `
    <div class="tit">
      <strong>Dictionary</strong>
      <button id="closeBtn"><img src="${ICONS.exit}" alt="exit"></button>
    </div>
    <div class="input-group">
      <input type="text" id="apiKeyInput" placeholder="api key">
      <button id="apiKeyBtn"><img src="${ICONS.arrow}" alt="send api key"></button>
    </div>
    <div class="input-group">
      <input type="text" id="vocabInput" placeholder="Select the word...">
      <button id="searchBtn"><img src="${ICONS.search}" alt="Search"></button>
    </div>
    <div id="resultArea">還沒有東東...</div>
    <div class="btn-group">
      <button class="saveBtn" id="saveBtn">
        Save <img src="${ICONS.heart}" alt="save">
      </button>
      <button class="saveBtn viewFavBtn" id="viewFavBtn">
        List <img src="${ICONS.folder}" alt="list">
      </button>
    </div>
  `;
}

function buildResultHTML({ header, speech, definitions = [], example_title, examples = [] }) {
  const defItems = definitions
    .map((def, i) => `<div style="margin-bottom:5px;">${i + 1}. ${def}</div>`)
    .join('');

  const exItems = examples
    .map((ex, i) => `<div style="margin-bottom:5px;">${i + 1}. ${ex.replace(/\n/g, '<br>')}</div>`)
    .join('');

  return `
    <div class="translate">
      <div class="vocab">${header}　${speech}</div>
      <div style="margin-bottom:15px;">${defItems}</div>
      <div>
        <strong style="color:#27ae60;">${example_title}</strong>
        <div style="margin-top:5px;">${exItems}</div>
      </div>
    </div>
  `;
}

// =============================================
// 收藏彈窗
// =============================================
function openFavoritesModal() {
  const overlay = document.createElement('div');
  overlay.id = 'fav-modal-overlay';

  const container = document.createElement('div');
  container.id = 'containar';
  overlay.appendChild(container);
  document.body.appendChild(overlay);

  renderFavoritesList(container, overlay);
}

function renderFavoritesList(container, overlay) {
  chrome.storage.local.get(['favorites'], ({ favorites = [] }) => {
    let html = `
      <div class="tit">
        <strong>List</strong>
        <button id="closeModalBtn"><img src="${ICONS.exit}" alt="exit"></button>
      </div>
    `;

    if (favorites.length === 0) {
      html += '<div class="voc_list"><p>No saved words yet.</p></div>';
    } else {
      const items = favorites.map((f, i) => `
        <li class="voc_list_li">
          <span>${f.header.split('\n')[0]}</span>
          <button class="remove-btn" data-index="${i}">
            <img src="${ICONS.delete}" alt="delete">
          </button>
        </li>
      `).join('');
      html += `<div class="voc_list"><ul class="voc_list_ul">${items}</ul></div>`;
    }

    html += `
      <div class="btn-group">
        <button class="saveBtn downloadBtn" id="exportTxtBtn">
          TXT <img src="${ICONS.download}" alt="download">
        </button>
        <button class="saveBtn downloadBtn" id="exportCsvBtn">
          CSV <img src="${ICONS.download}" alt="download">
        </button>
        <button class="saveBtn downloadBtn" id="ankiCsvBtn" style="width:163px;">
          CSV for Anki <img src="${ICONS.download}" alt="download">
        </button>
      </div>
      <button class="saveBtn clearBtn" id="clearFavBtn">Clear List</button>
    `;

    container.innerHTML = html;

    // ── 事件綁定 ──
    $('closeModalBtn').onclick = () => overlay.remove();
    $('exportTxtBtn').onclick  = exportToTXT;
    $('exportCsvBtn').onclick  = exportToCSV;
    $('ankiCsvBtn').onclick    = exportToAnki;

    $('clearFavBtn').onclick = () => {
      chrome.storage.local.remove(['favorites'], () => {
        renderFavoritesList(container, overlay);
      });
    };

    container.querySelectorAll('.remove-btn').forEach((btn) => {
      btn.onclick = () => {
        const idx = Number(btn.dataset.index);
        favorites.splice(idx, 1);
        chrome.storage.local.set({ favorites }, () => {
          renderFavoritesList(container, overlay);
        });
      };
    });
  });
}

// =============================================
// 匯出工具
// =============================================

/** 通用下載觸發 */
function downloadFile(content, filename, type = 'text/plain;charset=utf-8;') {
  const blob = new Blob([content], { type });
  const link = document.createElement('a');
  link.href          = URL.createObjectURL(blob);
  link.download      = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/** 移除 HTML <br>，替換為換行符 */
const cleanBr = (str) => String(str || '').replace(/<br\s*\/?>/gi, '\n');

/** CSV 欄位轉義 */
function escapeCSV(val) {
  const str = cleanBr(val);
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// TXT
function exportToTXT() {
  chrome.storage.local.get(['favorites'], ({ favorites = [] }) => {
    if (!favorites.length) return alert('沒有收藏資料可供下載');

    const today = new Date().toISOString().split('T')[0];

    const content = favorites.map(({ header = '', speech = '',
                                     definitions = [], usages = [], examples = [] }) => {
      return [
        `${header}　${speech}`,
        '',
        ...definitions.map((d, i) => `${i + 1}. ${d}`),
        '',
        ...examples.map((ex, i) => `${i + 1}. ${ex}`),
        '─'.repeat(30),
      ].join('\n');
    }).join('\n\n');

    downloadFile('\uFEFF' + content, `fr_vocab_${today}.txt`);
  });
}

// CSV
function exportToCSV() {
  chrome.storage.local.get(['favorites'], ({ favorites = [] }) => {
    if (!favorites.length) return alert('沒有收藏資料可供下載');

    const today  = new Date().toISOString().split('T')[0];
    const header = '單字,詞性,定義,用法說明,例句\n';

    const rows = favorites.map(({ header: h = '', speech = '',
                                  definitions = [], usages = [], examples = [] }) =>
      [
        h,
        speech,
        definitions.map(cleanBr).join('\n'),
        usages.map(cleanBr).join('\n'),
        examples.map(cleanBr).join('\n'),
      ].map(escapeCSV).join(',')
    ).join('\n');

    downloadFile('\uFEFF' + header + rows, `fr_vocab_${today}.csv`, 'text/csv;charset=utf-8;');
  });
}

// CSV for Anki
function exportToAnki() {
  chrome.storage.local.get(['favorites'], ({ favorites = [] }) => {
    if (!favorites.length) return alert('沒有收藏資料可供下載');

    const today = new Date().toISOString().split('T')[0];
    const clean = (str) => String(str || '').replace(/"/g, '""');

    const rows = favorites.map(({ header: h = '', speech = '',
                                  definitions = [], usages = [], examples = [] }) => {
      const front = clean(h);
      const back  = [
        clean(speech),
        definitions.map(clean).join('<br>'),
        usages.map(clean).join('<br>'),
        examples.map(clean).join('<br>'),
      ].filter(Boolean).join('<br>');

      return `${front},"${back}",${today}`;
    }).join('\n');

    downloadFile('\uFEFF' + rows, `fr_vocab_anki_${today}.csv`, 'text/csv;charset=utf-8;');
  });
}
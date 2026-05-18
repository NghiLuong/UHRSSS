/*************************************************************
 * UHRS Sheet Action Runner - Manifest V3
 * Cách dùng:
 * 1) Tạo Apps Script Web App bằng file apps_script.gs.
 * 2) Dán URL Web App vào SHEET_API_URL bên dưới.
 * 3) Chỉnh SHEET_NAME nếu cần.
 * 4) Chỉnh ACTIONS nếu tên button trên UHRS khác thực tế.
 *************************************************************/

const SHEET_API_URL = "PASTE_APPS_SCRIPT_WEB_APP_URL_HERE";
const SHEET_NAME = "Sheet1";

const TARGET_URL = "https://www.uhrs.ai/marketplace/app/63766?taskgroupid=178599?taskgroupid=178599";

const RANDOM_DELAY_MIN_MS = 1000;
const RANDOM_DELAY_MAX_MS = 2000;

// Extension sẽ tìm theo text trước, nếu không thấy sẽ bấm theo thứ tự fallbackIndex.
// Tú chỉnh lại text action 3-6 theo đúng tên nút trên UHRS.
const ACTIONS = {
  "1": {
    texts: ["Not junk", "not junk"],
    fallbackIndex: 0
  },
  "2": {
    texts: ["Error Message / Page not found / No results", "Page not found", "No results"],
    fallbackIndex: 1
  },
  "3": {
    texts: ["ACTION 3 - DOI TEN NUT O DAY"],
    fallbackIndex: 2
  },
  "4": {
    texts: ["ACTION 4 - DOI TEN NUT O DAY"],
    fallbackIndex: 3
  },
  "5": {
    texts: ["ACTION 5 - DOI TEN NUT O DAY"],
    fallbackIndex: 4
  },
  "6": {
    texts: ["ACTION 6 - DOI TEN NUT O DAY"],
    fallbackIndex: 5
  }
};

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "run_once") return;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) throw new Error("Không tìm thấy tab đang mở.");

    const urlResult = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: extractDocumentUrlAndCopy
    });

    const docUrl = pickFirstValue(urlResult, "documentUrl");
    if (!docUrl) throw new Error("Không lấy được đường dẫn trên trang. Cần kiểm tra selector #sja_DocumentUrl.");

    const sheetResult = await querySheet(docUrl);
    const action = String(sheetResult.action || sheetResult.c || "").trim().toUpperCase();

    await sleep(randomInt(RANDOM_DELAY_MIN_MS, RANDOM_DELAY_MAX_MS));

    if (["1", "2", "3", "4", "5", "6"].includes(action)) {
      const clickResult = await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        func: clickActionOnPage,
        args: [action, ACTIONS]
      });

      const clicked = clickResult.some(r => r.result && r.result.clicked);
      if (!clicked) {
        console.warn(`Không tìm thấy nút cho action ${action}. Kết quả:`, clickResult.map(r => r.result));
      }
    } else if (action === "C") {
      await chrome.tabs.update(tab.id, { url: TARGET_URL });
    } else {
      console.warn("Không có action hợp lệ từ Google Sheet:", sheetResult);
    }

    await clearClipboard(tab.id);
  } catch (err) {
    console.error("UHRS Sheet Action Runner lỗi:", err);
  }
});

async function querySheet(documentUrl) {
  if (!SHEET_API_URL || SHEET_API_URL.includes("PASTE_APPS_SCRIPT")) {
    throw new Error("Chưa cấu hình SHEET_API_URL trong service_worker.js");
  }

  const apiUrl = new URL(SHEET_API_URL);
  apiUrl.searchParams.set("url", documentUrl);
  apiUrl.searchParams.set("sheet", SHEET_NAME);

  const res = await fetch(apiUrl.toString(), { method: "GET", cache: "no-store" });
  if (!res.ok) throw new Error(`Apps Script trả HTTP ${res.status}`);

  const data = await res.json();
  if (!data.found) throw new Error(`Không tìm thấy URL trong cột A: ${documentUrl}`);
  return data;
}

function extractDocumentUrlAndCopy() {
  const selectors = [
    "#sja_DocumentUrl",
    "input#sja_DocumentUrl",
    "textarea#sja_DocumentUrl",
    "input[name='DocumentUrl']",
    "input[name='documentUrl']",
    "textarea[name='DocumentUrl']",
    "[data-document-url]",
    "[data-url]"
  ];

  let value = "";

  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (!el) continue;

    value = (el.value || el.getAttribute("value") || el.dataset.documentUrl || el.dataset.url || el.textContent || "").trim();
    if (value) break;
  }

  // Fallback: nếu không có ô document URL, dùng URL hiện tại của tab/frame.
  if (!value) value = window.location.href;

  try {
    navigator.clipboard && navigator.clipboard.writeText(value);
  } catch (e) {
    // Không dừng extension nếu browser không cho ghi clipboard.
  }

  return { documentUrl: value };
}

function clickActionOnPage(action, actionsConfig) {
  const cfg = actionsConfig[action];
  if (!cfg) return { clicked: false, reason: "missing_action_config" };

  const normalize = (s) => String(s || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  const isVisible = (el) => {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
  };

  const clickEl = (el) => {
    el.scrollIntoView({ block: "center", inline: "center" });
    el.focus && el.focus();
    el.click();
    return true;
  };

  const candidates = Array.from(document.querySelectorAll([
    "button",
    "input[type='button']",
    "input[type='submit']",
    "input[type='radio']",
    "label",
    "[role='button']",
    "[role='radio']",
    "a",
    "span",
    "div"
  ].join(","))).filter(isVisible);

  // 1) Tìm theo nội dung text/value/aria-label/title.
  for (const expected of cfg.texts || []) {
    const expectedText = normalize(expected);
    if (!expectedText || expectedText.includes("doi ten nut")) continue;

    const found = candidates.find(el => {
      const actual = normalize(el.innerText || el.value || el.getAttribute("aria-label") || el.getAttribute("title") || el.textContent);
      return actual === expectedText || actual.includes(expectedText) || expectedText.includes(actual);
    });

    if (found) {
      clickEl(found);
      return { clicked: true, method: "text", action, matched: expected };
    }
  }

  // 2) Fallback: bấm theo thứ tự button/radio/label hiển thị.
  const fallbackCandidates = candidates.filter(el => {
    const tag = el.tagName.toLowerCase();
    const role = el.getAttribute("role");
    return tag === "button" || tag === "label" || tag === "input" || role === "button" || role === "radio";
  });

  const index = Number(cfg.fallbackIndex);
  if (Number.isInteger(index) && fallbackCandidates[index]) {
    clickEl(fallbackCandidates[index]);
    return { clicked: true, method: "fallbackIndex", action, index };
  }

  return { clicked: false, reason: "button_not_found", action };
}

async function clearClipboard(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: false },
      func: () => navigator.clipboard && navigator.clipboard.writeText("")
    });
  } catch (e) {
    console.warn("Không clear được clipboard:", e);
  }
}

function pickFirstValue(results, key) {
  for (const item of results || []) {
    if (item && item.result && item.result[key]) return item.result[key];
  }
  return "";
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

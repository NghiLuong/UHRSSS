/*************************************************************
 * UHRS Sheet Action Runner - Manifest V3
 * Phiên bản: 1.2.0
 *
 * Luồng chạy:
 * 1) Tú nhấn phím tắt Ctrl + Shift + 7.
 * 2) Extension lấy URL trong #sja_DocumentUrl trên trang UHRS.
 * 3) Gửi URL qua Apps Script để đối chiếu cột A Google Sheet.
 * 4) Apps Script trả kết quả ở cột C.
 * 5) Nếu C = 1..7: chọn radio tương ứng và bấm Submit.
 * 6) Nếu C = C: mở link TARGET_URL.
 * 7) Clear clipboard, kết thúc, chờ lần nhấn phím tiếp theo.
 *************************************************************/

// ====== CẤU HÌNH CHÍNH ======
// Dòng này Tú sẽ dán link Web App sau khi Deploy Apps Script.
const SHEET_API_URL = "https://script.google.com/macros/s/AKfycbzUpwd0wgDd7Ym8NIRkHOdLCBRgbkeNotbNO383yJP2gRZfEoPMyh4UpLVyx_pWiYnPRA/exec";

// Tên tab trong Google Sheet của Tú.
const SHEET_NAME = "Trang tính1";

// Token tự đặt. Phải giống ACCESS_TOKEN trong apps_script.gs.
const API_TOKEN = "PGREEN_UHRS_2026_X9K72M4Q";

// Link mở khi cột C trả về chữ C.
const TARGET_URL = "https://www.uhrs.ai/marketplace/app/63766?taskgroupid=178599?taskgroupid=178599";

// Nghỉ random sau khi nhận kết quả từ Sheet, trước khi thao tác.
const RANDOM_DELAY_MIN_MS = 3000;
const RANDOM_DELAY_MAX_MS = 5000;

// Trang UHRS có timer chống submit quá nhanh, nên chờ thêm trước khi bấm Submit.
const WAIT_BEFORE_SUBMIT_MS = 10000;

// Mapping theo HTML Tú gửi:
// 1 = Not Junk
// 2 = Error Message / Page not found / No results
// 3 = Low / No Content / Ads only pages
// 4 = Site unreachable
// 5 = Automatic Redirection
// 6 = Other type of Junk
// 7 = Can't Judge
// C = Mở TARGET_URL
const ACTIONS = {
  "1": {
    name: "Not Junk",
    radioSelector: "#notjunkButton"
  },
  "2": {
    name: "Error Message / Page not found / No results",
    radioSelector: "#junkButton4"
  },
  "3": {
    name: "Low / No Content / Ads only pages",
    radioSelector: "#junkButton5"
  },
  "4": {
    name: "Site unreachable",
    radioSelector: "#junkButton11"
  },
  "5": {
    name: "Automatic Redirection",
    radioSelector: "#junkButton10"
  },
  "6": {
    name: "Other type of Junk",
    radioSelector: "#junkButton8"
  },
  "7": {
    name: "Can't Judge",
    radioSelector: "#junkButton9"
  }
};

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "run_once") return;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) throw new Error("Không tìm thấy tab đang mở.");

    // 1) Lấy URL cần đối chiếu từ trang UHRS và copy vào clipboard.
    const urlResult = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: extractDocumentUrlAndCopy
    });

    const documentUrl = pickBestDocumentUrl(urlResult);
    if (!documentUrl) {
      throw new Error("Không lấy được URL. Kiểm tra lại selector #sja_DocumentUrl trên trang UHRS.");
    }

    // 2) Gửi URL sang Apps Script để lấy action từ cột C.
    const sheetResult = await querySheet(documentUrl);
    const action = String(sheetResult.action || sheetResult.c || "").trim().toUpperCase();

    // 3) Nghỉ random 1-2 giây trước khi thao tác.
    await sleep(randomInt(RANDOM_DELAY_MIN_MS, RANDOM_DELAY_MAX_MS));

    // 4) Thực hiện action.
    if (["1", "2", "3", "4", "5", "6", "7"].includes(action)) {

      const clickResult = await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        func: selectRadioAndSubmit,
        args: [action, ACTIONS, WAIT_BEFORE_SUBMIT_MS]
      });

      const success = clickResult.some(r => r.result && r.result.success);
      if (!success) {
        console.warn("Không thực hiện được action:", action, clickResult.map(r => r.result));
      } else {
        console.log("Đã thực hiện action:", action, clickResult.map(r => r.result));
      }
    } else if (action === "C") {
      await chrome.tabs.update(tab.id, { url: TARGET_URL });
      console.log("Cột C trả về C, đã mở link:", TARGET_URL);
    } else {
      console.warn("Cột C không hợp lệ. Chỉ nhận 1,2,3,4,5,6,7 hoặc C. Kết quả:", sheetResult);
    }

    // 5) Clear clipboard sau khi chạy xong.
    await clearClipboard(tab.id);
  } catch (err) {
    console.error("UHRS Sheet Action Runner lỗi:", err);
  }
});

async function querySheet(documentUrl) {
  if (!SHEET_API_URL || SHEET_API_URL.includes("PASTE_APPS_SCRIPT")) {
    throw new Error("Chưa cấu hình SHEET_API_URL trong service_worker.js. Hãy deploy Apps Script rồi dán link Web App vào đây.");
  }

  const apiUrl = new URL(SHEET_API_URL);
  apiUrl.searchParams.set("url", documentUrl);
  apiUrl.searchParams.set("sheet", SHEET_NAME);
  apiUrl.searchParams.set("token", API_TOKEN);

  const res = await fetch(apiUrl.toString(), {
    method: "GET",
    cache: "no-store"
  });

  if (!res.ok) {
    throw new Error(`Apps Script trả HTTP ${res.status}`);
  }

  const data = await res.json();

  // Nếu Google Sheet không có URL này trong dữ liệu
  // thì tự động chọn action 1 = Not Junk
  if (!data.found) {
    const errorCode = String(data.error || "").trim().toUpperCase();

    if (errorCode === "URL_NOT_FOUND" || errorCode === "") {
      console.warn("Không tìm thấy URL trong Google Sheet. Tự chọn Not Junk:", documentUrl);

      return {
        found: false,
        action: "1",
        c: "1",
        fallback: true,
        fallbackReason: "URL_NOT_FOUND_DEFAULT_TO_NOT_JUNK",
        originalError: data.error || "URL_NOT_FOUND",
        url: documentUrl
      };
    }

    // Các lỗi khác vẫn báo lỗi để tránh chạy nhầm
    throw new Error(`Apps Script trả lỗi: ${data.error || "UNKNOWN_ERROR"}`);
  }

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
  let source = "";

  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (!el) continue;

    value = (
      el.value ||
      el.getAttribute("value") ||
      el.dataset.documentUrl ||
      el.dataset.url ||
      el.textContent ||
      ""
    ).trim();

    if (value) {
      source = "selector";
      break;
    }
  }

  // Fallback: nếu không có #sja_DocumentUrl thì dùng URL hiện tại.
  if (!value) {
    value = window.location.href;
    source = "fallback";
  }

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value);
    }
  } catch (e) {
    // Không dừng extension nếu trình duyệt không cho ghi clipboard.
  }

  return { documentUrl: value, source };
}

async function selectRadioAndSubmit(actionCode, actionsConfig, waitBeforeSubmitMs) {
  const action = actionsConfig[actionCode];
  if (!action) {
    return { success: false, reason: "ACTION_NOT_FOUND", actionCode };
  }

  const radio = document.querySelector(action.radioSelector);
  if (!radio) {
    return {
      success: false,
      reason: "RADIO_NOT_FOUND",
      actionCode,
      selector: action.radioSelector
    };
  }

  radio.scrollIntoView({ block: "center", inline: "center" });
  if (radio.focus) radio.focus();
  radio.checked = true;
  radio.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  radio.dispatchEvent(new Event("change", { bubbles: true }));

  await new Promise(resolve => setTimeout(resolve, waitBeforeSubmitMs || 2300));

  const submitButton = document.querySelector("#submitButton");
  if (!submitButton) {
    return { success: false, reason: "SUBMIT_BUTTON_NOT_FOUND", actionCode };
  }

  submitButton.scrollIntoView({ block: "center", inline: "center" });
  if (submitButton.focus) submitButton.focus();
  submitButton.click();

  return {
    success: true,
    actionCode,
    actionName: action.name,
    radioSelector: action.radioSelector
  };
}

async function clearClipboard(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: false },
      func: () => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText("");
        }
      }
    });
  } catch (e) {
    console.warn("Không clear được clipboard:", e);
  }
}

function pickBestDocumentUrl(results) {
  // Ưu tiên frame có lấy được URL từ selector #sja_DocumentUrl.
  for (const item of results || []) {
    if (item && item.result && item.result.source === "selector" && item.result.documentUrl) {
      return item.result.documentUrl;
    }
  }

  // Nếu không có selector thì dùng fallback URL đầu tiên.
  for (const item of results || []) {
    if (item && item.result && item.result.documentUrl) {
      return item.result.documentUrl;
    }
  }

  return "";
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

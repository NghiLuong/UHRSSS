/*************************************************************
 * UHRS Sheet Auto Runner - Manifest V3
 * Phiên bản: 1.5.0
 *
 * Ctrl + Shift + 7 = Bật vòng lặp
 * Ctrl + Shift + 8 = Dừng vòng lặp
 *************************************************************/


// =======================
// CẤU HÌNH CHÍNH
// =======================

// Dán link Web App của Google Apps Script vào đây
const SHEET_API_URL = "https://script.google.com/macros/s/AKfycbzUpwd0wgDd7Ym8NIRkHOdLCBRgbkeNotbNO383yJP2gRZfEoPMyh4UpLVyx_pWiYnPRA/exec";

const SHEET_NAME = "Trang tính1";
const API_TOKEN = "PGREEN_UHRS_2026_X9K72M4Q";

const TARGET_URL = "https://www.uhrs.ai/marketplace/app/63766?taskgroupid=178599?taskgroupid=178599";

// Kiểm tra URL mỗi 500ms
const CHECK_INTERVAL_MS = 500;

// Trước khi chọn đáp án, chờ random 1-2 giây
const SELECT_DELAY_MIN_MS = 1000;
const SELECT_DELAY_MAX_MS = 2000;

// Sau khi chọn đáp án, chờ random 10-12 giây rồi Submit
const SUBMIT_DELAY_MIN_MS = 10000;
const SUBMIT_DELAY_MAX_MS = 12000;

// Nếu timer nội bộ của trang chưa sẵn sàng, chờ thêm tối đa 25 giây
const MAX_WAIT_PAGE_SUBMIT_READY_MS = 25000;


// =======================
// MAPPING ACTION
// =======================

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


// =======================
// TRẠNG THÁI TAB
// =======================

const tabStates = new Map();

function getTabState(tabId) {
  if (!tabStates.has(tabId)) {
    tabStates.set(tabId, {
      active: false,
      processing: false,
      lastUrlKey: "",
      lastProcessStartedAt: 0
    });
  }

  return tabStates.get(tabId);
}


// =======================
// PHÍM TẮT BẬT / DỪNG
// =======================

chrome.commands.onCommand.addListener(async (command) => {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

    if (!tab || !tab.id) {
      throw new Error("Không tìm thấy tab đang mở.");
    }

    if (command === "run_once") {
      const state = getTabState(tab.id);

      state.active = true;
      state.processing = false;
      state.lastUrlKey = "";
      state.lastProcessStartedAt = 0;

      await injectAutoRunner(tab.id);

      console.log("Đã bật vòng lặp UHRS Sheet Auto Runner cho tab:", tab.id);
      return;
    }

    if (command === "stop_runner") {
      await stopAutoRunner(tab.id);

      console.log("Đã dừng vòng lặp UHRS Sheet Auto Runner cho tab:", tab.id);
      return;
    }
  } catch (err) {
    console.error("Lỗi khi xử lý phím tắt extension:", err);
  }
});


// =======================
// TỰ INJECT LẠI KHI TAB LOAD LẠI
// =======================

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  const state = tabStates.get(tabId);

  if (!state || !state.active) return;
  if (changeInfo.status !== "complete") return;

  setTimeout(() => {
    injectAutoRunner(tabId).catch((err) => {
      console.warn("Không inject lại được auto runner:", err);
    });
  }, 800);
});


// =======================
// NHẬN MESSAGE TỪ CONTENT SCRIPT
// =======================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return;

  if (message.type === "UHRS_PROCESS_URL") {
    handleProcessUrl(message, sender)
      .then(sendResponse)
      .catch((err) => {
        console.error("Lỗi xử lý URL:", err);

        sendResponse({
          ok: false,
          fatal: true,
          error: String(err && err.message ? err.message : err)
        });
      });

    return true;
  }

  if (message.type === "UHRS_ACTION_DONE") {
    const tabId = sender && sender.tab ? sender.tab.id : null;

    if (tabId) {
      const state = getTabState(tabId);

      state.processing = false;
      state.lastProcessStartedAt = 0;
    }

    sendResponse({
      ok: true
    });

    return true;
  }
});


// =======================
// XỬ LÝ URL
// =======================

async function handleProcessUrl(message, sender) {
  const tabId = sender && sender.tab ? sender.tab.id : null;

  if (!tabId) {
    return {
      ok: false,
      fatal: true,
      error: "Không xác định được tab gửi URL."
    };
  }

  const state = getTabState(tabId);
  state.active = true;

  const documentUrl = String(message.documentUrl || "").trim();

  if (!documentUrl) {
    return {
      ok: false,
      fatal: false,
      error: "URL rỗng."
    };
  }

  const urlKey = normalizeUrl(documentUrl);
  const now = Date.now();

  // Nếu đang xử lý nhưng bị kẹt quá 45 giây thì tự mở khóa
  if (state.processing && now - state.lastProcessStartedAt > 45000) {
    state.processing = false;
    state.lastProcessStartedAt = 0;
  }

  if (state.processing) {
    return {
      ok: false,
      fatal: false,
      busy: true,
      error: "Tab đang xử lý URL khác."
    };
  }

  state.processing = true;
  state.lastProcessStartedAt = now;
  state.lastUrlKey = urlKey;

  const sheetResult = await querySheet(documentUrl);
  const action = String(sheetResult.action || sheetResult.c || "").trim().toUpperCase();

  if (action === "C") {
    state.processing = false;
    state.lastProcessStartedAt = 0;

    await chrome.tabs.update(tabId, {
      url: TARGET_URL
    });

    return {
      ok: true,
      action: "C",
      navigated: true,
      targetUrl: TARGET_URL
    };
  }

  if (!ACTIONS[action]) {
    state.processing = false;
    state.lastProcessStartedAt = 0;

    return {
      ok: false,
      fatal: false,
      error: `Cột C không hợp lệ: ${action}. Chỉ nhận 1,2,3,4,5,6,7 hoặc C.`
    };
  }

  return {
    ok: true,
    action,
    actionName: ACTIONS[action].name,
    radioSelector: ACTIONS[action].radioSelector,
    selectDelayMs: randomInt(SELECT_DELAY_MIN_MS, SELECT_DELAY_MAX_MS),
    submitDelayMs: randomInt(SUBMIT_DELAY_MIN_MS, SUBMIT_DELAY_MAX_MS),
    maxWaitPageSubmitReadyMs: MAX_WAIT_PAGE_SUBMIT_READY_MS,
    fallback: !!sheetResult.fallback,
    fallbackReason: sheetResult.fallbackReason || ""
  };
}


// =======================
// HỎI GOOGLE SHEET
// =======================

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

  // Nếu Google Sheet không có URL trong cột A
  // thì tự chọn 1 = Not Junk
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

    // Các lỗi khác vẫn dừng để tránh chạy nhầm
    throw new Error(`Apps Script trả lỗi: ${data.error || "UNKNOWN_ERROR"}`);
  }

  return data;
}


// =======================
// INJECT CONTENT SCRIPT
// =======================

async function injectAutoRunner(tabId) {
  await chrome.scripting.executeScript({
    target: {
      tabId,
      allFrames: true
    },
    func: autoRunnerContentScript,
    args: [CHECK_INTERVAL_MS]
  });
}


// =======================
// DỪNG CONTENT SCRIPT
// =======================

async function stopAutoRunner(tabId) {
  const state = getTabState(tabId);

  state.active = false;
  state.processing = false;
  state.lastUrlKey = "";
  state.lastProcessStartedAt = 0;

  try {
    await chrome.scripting.executeScript({
      target: {
        tabId,
        allFrames: true
      },
      func: stopAutoRunnerContentScript
    });
  } catch (err) {
    console.warn("Không inject được lệnh dừng vào trang:", err);
  }
}

function stopAutoRunnerContentScript() {
  const GLOBAL_KEY = "__UHRS_SHEET_AUTO_RUNNER_V15__";
  const state = window[GLOBAL_KEY];

  if (!state) {
    console.log("UHRS Sheet Auto Runner chưa chạy trong frame này.");

    return {
      stopped: false,
      reason: "NOT_RUNNING"
    };
  }

  if (state.timerId) {
    clearInterval(state.timerId);
  }

  state.started = false;
  state.processing = false;
  state.paused = true;
  state.lastProcessedKey = "";
  state.timerId = null;

  console.log("Đã dừng UHRS Sheet Auto Runner trong frame này.");

  return {
    stopped: true
  };
}


// =======================
// CONTENT SCRIPT CHẠY TRÊN TRANG
// =======================

function autoRunnerContentScript(checkIntervalMs) {
  const GLOBAL_KEY = "__UHRS_SHEET_AUTO_RUNNER_V15__";

  if (window[GLOBAL_KEY] && window[GLOBAL_KEY].started) {
    console.log("UHRS Sheet Auto Runner đã chạy trong frame này.");

    return {
      started: false,
      reason: "ALREADY_RUNNING"
    };
  }

  window[GLOBAL_KEY] = {
    started: true,
    processing: false,
    paused: false,
    lastProcessedKey: "",
    noUrlSince: 0,
    timerId: null
  };

  const state = window[GLOBAL_KEY];

  function normalizeUrlLocal(value) {
    let text = String(value || "").trim().toLowerCase();

    while (text.endsWith("/") && text.length > 8) {
      text = text.slice(0, -1);
    }

    return text;
  }

  function getDocumentUrl() {
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

    for (const selector of selectors) {
      const el = document.querySelector(selector);

      if (!el) continue;

      const value = (
        el.value ||
        el.getAttribute("value") ||
        el.dataset.documentUrl ||
        el.dataset.url ||
        el.textContent ||
        ""
      ).trim();

      if (value) {
        return value;
      }
    }

    return "";
  }

  function sendMessageAsync(payload) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(payload, (response) => {
        if (chrome.runtime.lastError) {
          resolve({
            ok: false,
            fatal: false,
            error: chrome.runtime.lastError.message
          });

          return;
        }

        resolve(response || {
          ok: false,
          fatal: false,
          error: "EMPTY_RESPONSE"
        });
      });
    });
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function copyTextSafe(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      }
    } catch (e) {
      // Không chặn chương trình nếu clipboard không cho ghi
    }
  }

  async function clearClipboardSafe() {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText("");
      }
    } catch (e) {
      // Không chặn chương trình nếu clipboard không cho xóa
    }
  }

  async function submitInPageContextWhenReady(maxWaitMs) {
    return new Promise((resolve) => {
      const eventId = "__UHRS_SUBMIT_RESULT_" + Date.now() + "_" + Math.random().toString(36).slice(2);

      function cleanup() {
        window.removeEventListener(eventId, onResult);

        const oldScript = document.getElementById(eventId);
        if (oldScript) {
          oldScript.remove();
        }
      }

      function onResult(event) {
        cleanup();

        resolve(event.detail || {
          ok: false,
          reason: "EMPTY_RESULT"
        });
      }

      window.addEventListener(eventId, onResult);

      const script = document.createElement("script");
      script.id = eventId;

      script.textContent = `
        (function () {
          const EVENT_ID = ${JSON.stringify(eventId)};
          const MAX_WAIT_MS = ${Number(maxWaitMs || 25000)};
          const CHECK_MS = 300;
          const startedAt = Date.now();

          function send(detail) {
            window.dispatchEvent(new CustomEvent(EVENT_ID, { detail: detail }));
          }

          function trySubmit() {
            try {
              // Nếu xPlate_OnLoad chưa chạy, thử gọi để trang tự bật timer nội bộ.
              if (
                typeof window.SubmitTimerTimedOut !== "undefined" &&
                window.SubmitTimerTimedOut !== true &&
                typeof window.HasNotLoaded !== "undefined" &&
                window.HasNotLoaded === true &&
                typeof window.xPlate_OnLoad === "function"
              ) {
                try {
                  window.xPlate_OnLoad(false);
                } catch (e) {}
              }

              // Nếu trang có timer nội bộ và timer chưa sẵn sàng, tiếp tục chờ.
              if (
                typeof window.SubmitTimerTimedOut !== "undefined" &&
                window.SubmitTimerTimedOut !== true
              ) {
                if (Date.now() - startedAt < MAX_WAIT_MS) {
                  setTimeout(trySubmit, CHECK_MS);
                  return;
                }

                send({
                  ok: false,
                  reason: "SUBMIT_TIMER_NOT_READY",
                  submitTimerTimedOut: window.SubmitTimerTimedOut
                });
                return;
              }

              // Ưu tiên gọi hàm Submit() gốc trong ngữ cảnh trang.
              if (typeof window.Submit === "function") {
                window.Submit();

                send({
                  ok: true,
                  method: "Submit()"
                });
                return;
              }

              // Dự phòng nếu không thấy hàm Submit().
              const btn = document.querySelector("#submitButton");
              if (btn) {
                btn.click();

                send({
                  ok: true,
                  method: "button.click()"
                });
                return;
              }

              send({
                ok: false,
                reason: "SUBMIT_FUNCTION_AND_BUTTON_NOT_FOUND"
              });
            } catch (err) {
              send({
                ok: false,
                reason: String(err && err.message ? err.message : err)
              });
            }
          }

          trySubmit();
        })();
      `;

      document.documentElement.appendChild(script);
    });
  }

  async function performAction(response, documentUrl) {
    const radioSelector = response.radioSelector;
    const action = response.action;
    const actionName = response.actionName || "";
    const selectDelayMs = response.selectDelayMs || 1000;
    const submitDelayMs = response.submitDelayMs || 10000;
    const maxWaitPageSubmitReadyMs = response.maxWaitPageSubmitReadyMs || 25000;

    await sleep(selectDelayMs);

    const radio = document.querySelector(radioSelector);

    if (!radio) {
      throw new Error("Không tìm thấy radio: " + radioSelector);
    }

    radio.scrollIntoView({
      block: "center",
      inline: "center"
    });

    if (radio.focus) {
      radio.focus();
    }

    radio.checked = true;

    radio.dispatchEvent(new MouseEvent("click", {
      bubbles: true,
      cancelable: true
    }));

    radio.dispatchEvent(new Event("change", {
      bubbles: true
    }));

    console.log(
      "Đã chọn action:",
      action,
      actionName,
      "URL:",
      documentUrl,
      "Chờ submit:",
      submitDelayMs,
      "ms"
    );

    // Chờ random 10-12 giây
    await sleep(submitDelayMs);

    // Gọi Submit() trong ngữ cảnh trang thật và đợi SubmitTimerTimedOut sẵn sàng
    const submitResult = await submitInPageContextWhenReady(maxWaitPageSubmitReadyMs);

    if (!submitResult || !submitResult.ok) {
      throw new Error(
        "Không submit được. Lý do: " +
        JSON.stringify(submitResult || {})
      );
    }

    console.log("Đã submit:", submitResult);

    await sleep(500);

    await clearClipboardSafe();

    await sendMessageAsync({
      type: "UHRS_ACTION_DONE",
      documentUrl,
      action
    });
  }

  async function tick() {
    if (state.paused) return;
    if (state.processing) return;

    const documentUrl = getDocumentUrl();

    // Không có URL thì tiếp tục kiểm tra mỗi 500ms
    if (!documentUrl) {
      if (!state.noUrlSince) {
        state.noUrlSince = Date.now();
      }

      // Nếu không có URL hơn 1 giây, cho phép xử lý lại URL cũ nếu nó xuất hiện lại
      if (Date.now() - state.noUrlSince > 1000) {
        state.lastProcessedKey = "";
      }

      return;
    }

    state.noUrlSince = 0;

    const urlKey = normalizeUrlLocal(documentUrl);

    // Nếu URL vẫn là URL vừa xử lý thì không xử lý lặp lại
    if (urlKey && urlKey === state.lastProcessedKey) {
      return;
    }

    state.processing = true;
    state.lastProcessedKey = urlKey;

    try {
      await copyTextSafe(documentUrl);

      const response = await sendMessageAsync({
        type: "UHRS_PROCESS_URL",
        documentUrl
      });

      if (!response || !response.ok) {
        console.warn("Không xử lý được URL:", response);

        // Nếu lỗi nghiêm trọng thì tạm dừng để tránh chạy sai hàng loạt
        if (response && response.fatal) {
          state.paused = true;
        }

        state.processing = false;
        return;
      }

      if (response.action === "C") {
        console.log("Cột C trả về C, background sẽ mở link marketplace.");

        state.processing = false;
        return;
      }

      await performAction(response, documentUrl);

      // Sau khi submit xong, quay lại trạng thái chờ URL mới
      state.processing = false;
    } catch (err) {
      console.error("Lỗi trong vòng lặp UHRS:", err);

      await sendMessageAsync({
        type: "UHRS_ACTION_DONE",
        documentUrl,
        error: String(err && err.message ? err.message : err)
      });

      state.processing = false;
    }
  }

  state.timerId = setInterval(tick, checkIntervalMs || 500);

  // Chạy kiểm tra ngay lần đầu
  tick();

  console.log("Đã bật UHRS Sheet Auto Runner trong frame này.");

  return {
    started: true,
    intervalMs: checkIntervalMs || 500
  };
}


// =======================
// HÀM PHỤ
// =======================

function normalizeUrl(value) {
  let text = String(value || "").trim().toLowerCase();

  while (text.endsWith("/") && text.length > 8) {
    text = text.slice(0, -1);
  }

  return text;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
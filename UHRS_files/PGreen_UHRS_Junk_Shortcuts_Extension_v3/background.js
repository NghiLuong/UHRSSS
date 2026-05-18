const TARGET_ELEMENT_ID = "sja_DocumentUrl";
const UHRS_TARGET_URL = "https://www.uhrs.ai/marketplace/app/63766?taskgroupid=178599?taskgroupid=178599";

const COMMANDS = {
  "select-not-junk": {
    type: "select",
    inputId: "notjunkButton",
    badge: "1",
    label: "Not Junk"
  },
  "select-error-page": {
    type: "select",
    inputId: "junkButton4",
    badge: "2",
    label: "Error Message / Page not found / No results"
  },
  "select-low-content": {
    type: "select",
    inputId: "junkButton5",
    badge: "3",
    label: "Low / No Content / Ads only pages"
  },
  "select-site-unreachable": {
    type: "select",
    inputId: "junkButton11",
    badge: "4",
    label: "Site unreachable"
  },
  "select-auto-redirection": {
    type: "select",
    inputId: "junkButton10",
    badge: "5",
    label: "Automatic Redirection"
  },
  "select-other-junk": {
    type: "select",
    inputId: "junkButton8",
    badge: "6",
    label: "Other type of Junk"
  },
  "copy-hidden-document-url": {
    type: "copy",
    badge: "URL",
    label: "Copy hidden document URL"
  },
  "open-uhrs-taskgroup": {
    type: "navigate",
    badge: "GO",
    label: "Open UHRS taskgroup link"
  }
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeBackgroundColor({ color: "#198754" });
});

chrome.commands.onCommand.addListener(async (command, tab) => {
  const config = COMMANDS[command];
  if (!config) return;

  try {
    const targetTab = await getActiveTab(tab);

    if (config.type === "navigate") {
      await runNavigateCommand(targetTab, config);
      return;
    }

    if (!targetTab || !targetTab.id) {
      await showBadge("ERR", "#dc3545");
      console.warn("No active tab found.");
      return;
    }

    if (isBlockedUrl(targetTab.url || "")) {
      await showBadge("ERR", "#dc3545");
      console.warn("Cannot inject script into this page:", targetTab.url);
      return;
    }

    if (config.type === "copy") {
      await runCopyCommand(targetTab.id, config);
    } else {
      await runSelectCommand(targetTab.id, config);
    }
  } catch (error) {
    await showBadge("ERR", "#dc3545");
    console.error("Extension error:", error);
  }
});

async function runNavigateCommand(targetTab, config) {
  if (targetTab && targetTab.id) {
    await chrome.tabs.update(targetTab.id, { url: UHRS_TARGET_URL });
  } else {
    await chrome.tabs.create({ url: UHRS_TARGET_URL });
  }

  await showBadge(config.badge, "#198754");
  console.log("Opened UHRS URL:", UHRS_TARGET_URL);
}

async function runSelectCommand(tabId, config) {
  const results = await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    func: selectRadioButtonById,
    args: [config.inputId]
  });

  const success = results.find(item => item.result && item.result.ok);
  const foundButFailed = results.find(item => item.result && item.result.found && !item.result.ok);

  if (success) {
    await showBadge(config.badge, "#198754");
    console.log(`Selected: ${config.label}`);
  } else {
    await showBadge("ERR", "#dc3545");
    console.warn(
      `Select failed: ${config.label}`,
      foundButFailed ? foundButFailed.result.message : "Button not found in page/frames."
    );
  }
}

async function runCopyCommand(tabId, config) {
  const results = await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    func: copyHiddenValueToClipboard,
    args: [TARGET_ELEMENT_ID]
  });

  const success = results.find(item => item.result && item.result.ok);
  const foundButFailed = results.find(item => item.result && item.result.found && !item.result.ok);

  if (success) {
    await showBadge(config.badge, "#198754");
    console.log("Copied:", success.result.text);
  } else {
    await showBadge("ERR", "#dc3545");
    console.warn(
      "Copy failed.",
      foundButFailed ? foundButFailed.result.message : "Element not found in page/frames."
    );
  }
}

async function getActiveTab(tabFromCommand) {
  if (tabFromCommand && tabFromCommand.id) return tabFromCommand;
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tabs && tabs.length ? tabs[0] : null;
}

function isBlockedUrl(url) {
  return (
    url.startsWith("chrome://") ||
    url.startsWith("edge://") ||
    url.startsWith("about:") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("file://")
  );
}

async function showBadge(text, color) {
  await chrome.action.setBadgeBackgroundColor({ color });
  await chrome.action.setBadgeText({ text });
  setTimeout(() => {
    chrome.action.setBadgeText({ text: "" });
  }, 1200);
}

function selectRadioButtonById(inputId) {
  const input = document.getElementById(inputId);

  if (!input) {
    return {
      ok: false,
      found: false,
      message: `Không tìm thấy radio id="${inputId}" trên frame này.`
    };
  }

  try {
    input.scrollIntoView({ block: "center", inline: "nearest" });

    input.click();

    const label = document.querySelector(`label[for="${CSS.escape(inputId)}"]`);
    if (label && !input.checked) {
      label.click();
    }

    input.checked = true;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));

    return {
      ok: input.checked === true,
      found: true,
      selectedId: inputId,
      selectedValue: input.value || "",
      message: input.checked ? "Đã chọn radio button." : "Tìm thấy nhưng chưa chọn được radio button."
    };
  } catch (err) {
    return {
      ok: false,
      found: true,
      selectedId: inputId,
      message: err && err.message ? err.message : "Không chọn được radio button."
    };
  }
}

function copyHiddenValueToClipboard(elementId) {
  const el = document.getElementById(elementId);

  if (!el) {
    return {
      ok: false,
      found: false,
      message: `Không tìm thấy phần tử id="${elementId}" trên frame này.`
    };
  }

  const rawValue =
    el.value ||
    el.getAttribute("value") ||
    el.getAttribute("href") ||
    el.textContent ||
    "";

  const text = String(rawValue).trim();

  if (!text) {
    return {
      ok: false,
      found: true,
      message: `Phần tử id="${elementId}" có tồn tại nhưng không có giá trị.`
    };
  }

  return new Promise((resolve) => {
    const fallbackCopy = () => {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "-9999px";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);

      textarea.focus();
      textarea.select();

      try {
        const ok = document.execCommand("copy");
        textarea.remove();
        resolve({
          ok,
          found: true,
          text,
          message: ok ? "Đã copy bằng fallback." : "Không copy được bằng fallback."
        });
      } catch (err) {
        textarea.remove();
        resolve({
          ok: false,
          found: true,
          text,
          message: err && err.message ? err.message : "Copy failed."
        });
      }
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(() => {
          resolve({
            ok: true,
            found: true,
            text,
            message: "Đã copy vào clipboard."
          });
        })
        .catch(() => fallbackCopy());
    } else {
      fallbackCopy();
    }
  });
}
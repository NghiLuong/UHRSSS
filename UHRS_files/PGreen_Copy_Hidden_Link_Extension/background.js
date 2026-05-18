const COMMAND_NAME = "copy-hidden-document-url";
const TARGET_ELEMENT_ID = "sja_DocumentUrl";

chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeBackgroundColor({ color: "#198754" });
});

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== COMMAND_NAME) return;

  try {
    const targetTab = await getActiveTab(tab);

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

    const results = await chrome.scripting.executeScript({
      target: { tabId: targetTab.id, allFrames: true },
      func: copyHiddenValueToClipboard,
      args: [TARGET_ELEMENT_ID]
    });

    const success = results.find(item => item.result && item.result.ok);
    const foundButFailed = results.find(item => item.result && item.result.found && !item.result.ok);

    if (success) {
      await showBadge("OK", "#198754");
      console.log("Copied:", success.result.text);
    } else {
      await showBadge("ERR", "#dc3545");
      console.warn("Copy failed.", foundButFailed ? foundButFailed.result.message : "Element not found in page/frames.");
    }
  } catch (error) {
    await showBadge("ERR", "#dc3545");
    console.error("Extension error:", error);
  }
});

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
  }, 1500);
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
const tabsWithContentScript = new Set();

chrome.runtime.onInstalled.addListener(() => {
  console.log("Voice Control Extension - Background Script Initialized!");
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    tabsWithContentScript.delete(tabId);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabsWithContentScript.delete(tabId);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.status === "CONTENT_SCRIPT_READY" && sender.tab) {
    console.log(`Content script ready in tab ${sender.tab.id}`);
    tabsWithContentScript.add(sender.tab.id);
    sendResponse({ status: "acknowledged" });
    return true;
  }
});

// Get current active tab
async function getCurrentTab() {
  try {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      console.log(
        "No active tab found in current window, checking last focused window"
      );
      [tab] = await chrome.tabs.query({
        active: true,
        lastFocusedWindow: true,
      });
    }
    if (!tab) {
      console.error("No active tab found in any window");
      return null;
    }
    return tab;
  } catch (error) {
    console.error("Error getting current tab:", error);
    return null;
  }
}

function isRestrictedUrl(url) {
  if (!url) return true;

  const restrictedProtocols = [
    "chrome://",
    "chrome-extension://",
    "devtools://",
    "edge://",
    "about:",
  ];

  return restrictedProtocols.some((protocol) => url.startsWith(protocol));
}

async function ensureContentScriptLoaded(tabId) {
  if (tabsWithContentScript.has(tabId)) {
    console.log(`Tab ${tabId} already has content script loaded`);
    return true;
  }

  try {
    const tab = await chrome.tabs.get(tabId);

    if (isRestrictedUrl(tab.url)) {
      console.log(
        `Tab ${tabId} has restricted URL (${tab.url}). Content scripts cannot be injected.`
      );
      return false;
    }

    try {
      await chrome.tabs.sendMessage(tabId, { command: "PING" });
      console.log(`Content script already present in tab ${tabId}`);
      tabsWithContentScript.add(tabId);
      return true;
    } catch (error) {
      console.log(`Content script not detected in tab ${tabId}, injecting...`);

      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ["content.js"],
        });

        await new Promise((resolve) => setTimeout(resolve, 200));

        try {
          await chrome.tabs.sendMessage(tabId, { command: "PING" });
          console.log(`Content script successfully injected in tab ${tabId}`);
          tabsWithContentScript.add(tabId);
          return true;
        } catch (verifyError) {
          console.error(
            "Content script injection verification failed:",
            verifyError
          );
          return false;
        }
      } catch (injectionError) {
        console.error("Content script injection failed:", injectionError);
        return false;
      }
    }
  } catch (error) {
    console.error(`Error getting tab ${tabId} info:`, error);
    return false;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message received in background:", message);

  (async () => {
    const command = message.command;
    const tab = await getCurrentTab();

    if (!tab) {
      console.error("No active tab found for command:", command);
      sendResponse({ status: "error", message: "No active tab found" });
      return;
    }

    console.log(`Processing ${command} for tab ${tab.id} (${tab.url})`);

    try {
      switch (command) {
        case "NEW_TAB":
          await chrome.tabs.create({ url: "chrome://newtab" });
          console.log("New tab opened");
          sendResponse({ status: "success", message: "New tab opened" });
          return;

        case "CLOSE_TAB":
          if (tab.id) {
            await chrome.tabs.remove(tab.id);
            console.log("Tab closed");
            sendResponse({ status: "success", message: "Tab closed" });
          } else {
            throw new Error("Tab ID not found");
          }
          return;

        case "NAVIGATE":
          if (tab.id && message.url) {
            await chrome.tabs.update(tab.id, { url: message.url });
            console.log(`Tab ${tab.id} navigated to ${message.url}`);
            sendResponse({
              status: "success",
              message: `Navigated to ${message.url}`,
            });
          } else {
            throw new Error("Tab ID or URL not found");
          }
          return;
      }

      if (isRestrictedUrl(tab.url)) {
        const errorMsg =
          "This action can't be performed on Chrome system pages";
        console.log(errorMsg, tab.url);
        sendResponse({
          status: "error",
          reason: errorMsg,
          command: command,
        });
        return;
      }

      switch (command) {
        case "SCROLL_DOWN":
        case "SCROLL_UP":
          if (tab.id) {
            const scriptLoaded = await ensureContentScriptLoaded(tab.id);

            if (!scriptLoaded) {
              let reason = "Content script could not be loaded.";

              if (isRestrictedUrl(tab.url)) {
                reason +=
                  " This type of page doesn't support scrolling control.";
              } else {
                reason += " The website might be restricting external scripts.";
              }

              throw new Error(reason);
            }

            const contentMessage = {
              command: "SCROLL",
              direction: command === "SCROLL_DOWN" ? "down" : "up",
            };

            try {
              const response = await chrome.tabs.sendMessage(
                tab.id,
                contentMessage
              );
              console.log("Response from content script:", response);
              sendResponse(response);
            } catch (error) {
              console.error("Error sending message to content script:", error);
              throw new Error(
                "Could not communicate with content script: " + error.message
              );
            }
          } else {
            throw new Error("Tab ID not found");
          }
          break;

        default:
          console.warn("Unknown command:", command);
          sendResponse({ status: "error", message: "Unknown command" });
      }
    } catch (error) {
      console.error("Error executing command:", error);
      sendResponse({
        status: "error",
        reason: error.message || "Background script error",
        command: command,
      });
    }
  })();

  return true;
});

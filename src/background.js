const tabsWithContentScript = new Set();

chrome.runtime.onInstalled.addListener(() => {
  console.log('Voice Control Extension - Background Script Initialized!');
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {    
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

async function getCurrentTab() {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    console.error("No active tab found");
    [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  }
  if (!tab) {
    console.error("No focused tab found");
    return null;
  }
  return tab;
}

async function ensureContentScriptLoaded(tabId) {  
  if (tabsWithContentScript.has(tabId)) {
    return true;
  }

  try {    
    await chrome.tabs.sendMessage(tabId, { command: "PING" });
    tabsWithContentScript.add(tabId);
    return true;
  } catch (error) {
    console.log(`Content script not detected in tab ${tabId}, injecting...`);
        
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["content.js"]
      });
            
      await new Promise(resolve => setTimeout(resolve, 100));          
      try {
        await chrome.tabs.sendMessage(tabId, { command: "PING" });
        tabsWithContentScript.add(tabId);
        return true;
      } catch (verifyError) {
        console.error("Content script injection verification failed:", verifyError);
        return false;
      }
    } catch (injectionError) {
      console.error("Content script injection failed:", injectionError);
      return false;
    }
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

    try {
      switch (command) {
        case 'NEW_TAB':
          await chrome.tabs.create({ url: 'chrome://newtab' });
          console.log("New tab opened");
          sendResponse({ status: "success", message: "New tab opened" });
          break;
          
        case 'CLOSE_TAB':
          if (tab.id) {
            await chrome.tabs.remove(tab.id);
            console.log("Tab closed");
            sendResponse({ status: "success", message: "Tab closed" });
          } else {
            throw new Error("Tab ID not found");
          }
          break;
          
        case 'NAVIGATE':
          if (tab.id && message.url) {
            await chrome.tabs.update(tab.id, { url: message.url });
            console.log(`Tab ${tab.id} navigated to ${message.url}`);
            sendResponse({ status: "success", message: `Tab navigated to ${message.url}` });
          } else {
            throw new Error("Tab ID or URL not found");
          }
          break;
          
        case 'SCROLL_DOWN':
        case 'SCROLL_UP':
          if (tab.id) {            
            const scriptLoaded = await ensureContentScriptLoaded(tab.id);
            
            if (!scriptLoaded) {
              throw new Error("Content script could not be loaded. Tab might be restricted.");
            }
                        
            const contentMessage = {
              command: "SCROLL",
              direction: command === 'SCROLL_DOWN' ? "down" : "up"
            };
            
            try {
              const response = await chrome.tabs.sendMessage(tab.id, contentMessage);
              console.log("Response from content script:", response);
              sendResponse(response);
            } catch (error) {
              console.error("Error sending message to content script:", error);
              throw new Error("Could not communicate with content script: " + error.message);
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
        command: command
      });
    }
  })();
  
  return true;
});
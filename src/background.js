chrome.runtime.onInstalled.addListener(() => {
    console.log('Voice Control Extension - Background Script Initialized!');
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
    
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Message received in background:", message);

    (async () => {
        const command = message.command;
        const tab = await getCurrentTab();

        if (!tab && ['CLOSE_TAB', 'NAVIGATE', 'SCROLL'].includes(command)) {
            console.error("No active tab found for command:", command);
            sendResponse({ status: "error", message: "No active tab found" });
            return;            
        }

        try {
            switch (command) {
                case 'NEW_TAB':
                    await chrome.tabs.create({ url: 'chrom://newtab' });
                    console.log("New tab opened");
                    sendResponse({ status: "success", message: "New tab opened" });
                    break;
                case 'CLOSE_TAB':
                    if (tab && tab.id) {                    
                        await chrome.tabs.remove(tab.id);
                        console.log("Tab closed");
                        sendResponse({ status: "success", message: "Tab closed" });
                    } else {
                        throw new Error("Tab ID not found");
                    }
                    break;
                case 'NAVIGATE':
                    if(tab && tab.id && message.url) {
                        await chrome.tabs.update(tab.id, { url: message.url });
                        console.log(`Tab ${tab.id} navigated to ${message.url}`);
                        sendResponse({ status: "success", message: `Tab navigated to ${message.url}` });
                    } else {
                        throw new Error("Tab ID or URL not found");
                    }
                    break;
                case 'SCROLL':
                    if (tab && tab.id && message.direction) {
                        const response = await chrome.tabs.sendMessage(tab.id, message);
                        console.log("Response from content script:", response);
                        sendResponse(response);
                    } else {
                        throw new Error("Tab ID or direction not found");
                    }
                    break;
            
                default:
                    console.warn("Unknown command:", command);
                    sendResponse({ status: "error", message: "Unknown command" });
            }
        } catch (error) {
            console.error("Error executing command:", error);
            sendResponse({ status: "error", reason: error.message || "Background script error" });
        }
    })();
    return true;
  });
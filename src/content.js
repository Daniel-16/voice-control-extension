console.log("Voice control content script loaded");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message received in content script:", message);

  try {
    if (message.command === "SCROLL") {
      const scrollAmount = window.innerHeight * 0.8;
      
      if (message.direction === "down") {
        window.scrollBy({
          top: scrollAmount,
          left: 0,
          behavior: "smooth",
        });
        console.log("Scrolled down");
        sendResponse({ status: "success", action: "scrolled", direction: "down" });
      } else if (message.direction === "up") {
        window.scrollBy({
          top: -scrollAmount,
          left: 0,
          behavior: "smooth",
        });
        console.log("Scrolled up");
        sendResponse({ status: "success", action: "scrolled", direction: "up" });
      } else {
        console.warn("Unknown scroll direction:", message.direction);
        sendResponse({ status: "error", message: "Unknown scroll direction" });
      }
    } else {
      console.warn("Unknown command in content script:", message.command);
      sendResponse({ status: "error", message: "Unknown command in content script" });
    }
  } catch (error) {
    console.error("Error in content script:", error);
    sendResponse({ status: "error", message: error.message || "Content script error" });
  }
    
  return true;
});

chrome.runtime.sendMessage({ status: "CONTENT_SCRIPT_READY" }, (response) => {
  if (chrome.runtime.lastError) {
    console.warn("Error sending ready message:", chrome.runtime.lastError);
  } else if (response) {
    console.log("Background acknowledged content script ready:", response);
  }
});
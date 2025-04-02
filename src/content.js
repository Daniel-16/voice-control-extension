/// <reference types="chrome"/>
/* global chrome */
console.log("Voice control content script loaded");

function findScrollableElements() {
  const elements = [];
  const allElements = document.querySelectorAll("*");

  for (const el of allElements) {
    const style = window.getComputedStyle(el);
    const overflowY = style.getPropertyValue("overflow-y");

    if (
      (overflowY === "auto" || overflowY === "scroll") &&
      el.scrollHeight > el.clientHeight &&
      el.clientHeight > 100
    ) {
      // Filter out tiny scrollable areas
      elements.push(el);
    }
  }

  return elements;
}

function attemptScroll(direction) {
  const scrollAmount = window.innerHeight * 0.8;
  const scrollValue = direction === "down" ? scrollAmount : -scrollAmount;
  //   let scrolled = false;

  const initialY = window.scrollY;
  window.scrollBy({
    top: scrollValue,
    left: 0,
    behavior: "smooth",
  });

  setTimeout(() => {
    if (Math.abs(window.scrollY - initialY) < 10) {
      console.log("Standard scroll didn't work, trying alternative methods");

      document.documentElement.scrollBy({
        top: scrollValue,
        left: 0,
        behavior: "smooth",
      });

      document.body.scrollBy({
        top: scrollValue,
        left: 0,
        behavior: "smooth",
      });

      const scrollableElements = findScrollableElements();
      console.log(`Found ${scrollableElements.length} scrollable elements`);

      if (scrollableElements.length > 0) {
        const mainContent = scrollableElements.sort(
          (a, b) =>
            b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight
        )[0];

        mainContent.scrollBy({
          top: scrollValue,
          left: 0,
          behavior: "smooth",
        });
      }
    }
  }, 100);

  return true;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message received in content script:", message);

  if (message.command === "PING") {
    sendResponse({ status: "success", message: "Content script is active" });
    return true;
  }

  try {
    if (message.command === "SCROLL") {
      if (message.direction === "down" || message.direction === "up") {
        const scrollSuccess = attemptScroll(message.direction);

        if (scrollSuccess) {
          console.log(`Attempted scroll ${message.direction}`);
          sendResponse({
            status: "success",
            action: "scrolled",
            direction: message.direction,
          });
        } else {
          sendResponse({
            status: "error",
            message: "Could not find scrollable content",
          });
        }
      } else {
        console.warn("Unknown scroll direction:", message.direction);
        sendResponse({ status: "error", message: "Unknown scroll direction" });
      }
    } else {
      console.warn("Unknown command in content script:", message.command);
      sendResponse({
        status: "error",
        message: "Unknown command in content script",
      });
    }
  } catch (error) {
    console.error("Error in content script:", error);
    sendResponse({
      status: "error",
      message: error.message || "Content script error",
    });
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

console.log("Voice control script loaded");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message received in content script:", message);

  if (message.command === "SCROLL") {
    const scrollAmount = window.innerHeight * 0.8;
    if (message.direction === "down") {
      window.scrollBy({
        top: scrollAmount,
        left: 0,
        behavior: "smooth",
      });
      console.log("Scrolled down");
      sendResponse({ status: "scrolled", direction: "down" });
    } else if (message.direction === "up") {
      window.scrollBy({
        top: -scrollAmount,
        left: 0,
        behavior: "smooth",
      });
      console.log("Scrolled up");
      sendResponse({ status: "scrolled", direction: "up" });
    } else {
      console.warn("Unknown scroll direction:", message.direction);
      sendResponse({ status: "error", message: "Unknown scroll direction" });
    }
  } else {
    sendResponse({ status: "error", message: "Unknown command" });
  }

  return true;
});

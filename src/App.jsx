/// <reference types="chrome"/>
/* global chrome */

function App() {
  const sendMessageToBackground = (message) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error sending message:", chrome.runtime.lastError);
      } else {
        console.log("Response from background:", response);
      }
    });
  };

  const handleNewTab = () => {
    console.log("Sending NEW_TAB message to background");
    sendMessageToBackground({ command: "NEW_TAB" });
  };

  const handleCloseTab = () => {
    console.log("Sending CLOSE_TAB message to background");
    sendMessageToBackground({ command: "CLOSE_TAB" });
  };

  const handleSearchGoogle = () => {
    const url = "https://www.google.com/";
    console.log(`Send navigate command to ${url}`);
    sendMessageToBackground({ command: "NAVIGATE", url });
  };

  const handleScrollDown = () => {
    console.log("Sending SCROLL_DOWN message to background");
    sendMessageToBackground({ command: "SCROLL_DOWN", direction: "down" });
  };

  const handleScrollUp = () => {
    console.log("Sending SCROLL_UP message to background");
    sendMessageToBackground({ command: "SCROLL_UP", direction: "up" });
  };

  return (
    <>
      <div className="w-72 p-4 bg-slate-800 text-white flex flex-col items-center space-y-3">
        <h1 className="text-xl font-bold mb-3 text-center">
          Voice Control Actions
        </h1>

        <button
          onClick={handleNewTab}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out"
        >
          Open New Tab
        </button>
        <button
          onClick={handleCloseTab}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out"
        >
          Close Current Tab
        </button>
        <button
          onClick={handleSearchGoogle}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out"
        >
          Search Google
        </button>
        <button
          onClick={handleScrollDown}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out"
        >
          Scroll Down
        </button>
        <button
          onClick={handleScrollUp}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out"
        >
          Scroll Up
        </button>
        <p className="text-xs text-slate-400 pt-2">
          Click buttons to test actions.
        </p>
      </div>
    </>
  );
}

export default App;

function openOptionsPage() {
  chrome.tabs.create({ url: "options.html" });
}

document.getElementById("manage").addEventListener("click", openOptionsPage);

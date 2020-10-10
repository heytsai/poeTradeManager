function open_url() {
  var newURL = "https://www.pathofexile.com/";
  chrome.tabs.create({ url: newURL });
}
document.getElementById("test").addEventListener("click", open_url);

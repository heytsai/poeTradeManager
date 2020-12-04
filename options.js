document.addEventListener("DOMContentLoaded", listTabs);

// show a list of all opened POE trade urls
//-- TODO: also the state (activation) & mark favorite for all pages
//-- TODO: open url if not exist
//-- TODO: open urls not in the set?

// constants
const POE_SEASON = 'Heist'
const URL_TRADE = 'https://www.pathofexile.com/trade/search';
const URL_HASH_FORMAT = `${URL_TRADE}/${POE_SEASON}/{hash}`;
const URL_CRITERIA_SEARCH = `https://www.pathofexile.com/api/trade/search/${POE_SEASON}`;
const HASH_PREFIX = `${URL_TRADE}/${POE_SEASON}/`;
const CRITERIA_PREFIX = 'require(["main"], function(){require(["trade"], function(t){    t(';
const CRITERIA_SUFFIX = ');});});';
const FILE_MODS = 'data/mods.json';

// hidden variables, should not access directly
const _modNameMap = null;

// initialization
$(document).ready(function() {
  $('.collapsible.expandable').collapsible({accordion: false});
});
extendStringType();

async function listTabs() {
  // get all tab urls
  const tabs = await getChromeTabs();
  let poeTabUrls = tabs.map(tab => tab.url).filter(url => url.startsWith(URL_TRADE));

  // remove duplication
  poeTabUrls = [...new Set(poeTabUrls)];

  // sort ASC
  poeTabUrls.sort((a, b) => (a < b ? -1 : (a > b ? 1 : 0)));

  // add page info to the list
  const $list = $('#list');
  for (const url of poeTabUrls) {
    const $child = await generatePageInfoItem(url);
    $child.appendTo($list);
  }
}

// add format function
function extendStringType() {
  String.prototype.format = String.prototype.format ||
      function () {
        "use strict";
        let str = this.toString();
        if (arguments.length) {
          const t = typeof arguments[0];
          const args = ("string" === t || "number" === t) ?
              Array.prototype.slice.call(arguments)
              : arguments[0];

          for (let key in args) {
            str = str.replace(new RegExp("\\{" + key + "\\}", "gi"), args[key]);
          }
        }

        return str;
      };
}

function getTemplate(className) {
  const html = $(`template.${className}`).html();
  return $(html).clone();
}

function getChromeTabs() {
  return new Promise(resolve => {
    chrome.tabs.query({}, response => resolve(response));
  });
}

async function generatePageInfoItem(url) {
  // show page url as title
  const title = url;

  // show search criteria as content
  let content = 'failed to fetch';
  if (url.startsWith(HASH_PREFIX)) {
    // parse hash from url
    const hash = url.replace(HASH_PREFIX, '');
    const criteria = await getCriteria(hash);
    content = await generateCriteriaDescription(criteria);
  }

  return generateCollapsibleElement(title, content);
}

function generateCollapsibleElement(title, content) {
  // get template
  const $template = getTemplate('collapsible-element');

  // set texts
  const $title = $template.find('.collapsible-header');
  const $content = $template.find('.collapsible-body span');
  $title.text(title);
  $content.text(content);

  return $template;
}

async function generateCriteriaDescription(criteria) {
  const modNameMap = await getModsNameMap();
  const replacer = generateCriteriaReplacer(modNameMap);

  return JSON.stringify(criteria, replacer, 4);
}

function getCriteria(hash) {
  const url = URL_HASH_FORMAT.format({hash: hash});
  return $.get(url).then(function (data) {
    // parse criteria from returned web page
    const stIndex = data.lastIndexOf(CRITERIA_PREFIX) + CRITERIA_PREFIX.length;
    const edIndex = data.lastIndexOf(CRITERIA_SUFFIX);
    const text = data.substring(stIndex, edIndex);

    return JSON.parse(text)['state'];
  });
}

function generateCriteriaReplacer(modNameMap) {
  return function (key, value) {
    // Filtering out properties
    if (typeof value === 'object' && value.disabled === true) {
      return undefined;
    } else if (key === 'disabled') {
      return undefined;
    } else if (key === 'status') {
      return undefined;
    }

    // replace id with text
    if (typeof value === 'object' && 'id' in value) {
      value.text = modNameMap[value.id];
      delete value.id;
    }

    // flatter option type info
    if (typeof value === 'object' && 'option' in value) {
      value = value.option;
    }

    return value;
  }
}

function searchCriteria(criteria) {
  // generate payload
  const stats = criteria['stats'];
  const filters = criteria['filters'];
  const body = {
    "query": {
      "status": {"option": "online"},
      "stats": stats,
      "filters": filters
    },
    "sort": {
      "price": "asc"
    }
  }

  // send request
  return $.ajax({
    type: 'POST',
    url: URL_CRITERIA_SEARCH,
    data: JSON.stringify(body),
    contentType: "application/json",
    dataType: 'json'
  });
}

function getModsNameMap() {
  if (_modNameMap !== null) return _modNameMap;

  return $.get(FILE_MODS).then(function (data) {
    const map = {}

    // generate map
    data.reduce((acc, val) => {return acc.concat(val['entries'])}, [])
        .forEach(val => map[val['id']] = val['text']);

    return map;
  });
}

// {
//   "tab": "search",
//   "leagues": [{"id": "Heist", "text": "Heist"}, {"id": "Hardcore Heist", "text": "Hardcore Heist"}, {
//     "id": "Standard",
//     "text": "Standard"
//   }, {"id": "Hardcore", "text": "Hardcore"}],
//   "news": [],
//   "league": "Heist",
//   "state": {
//     "stats": [{
//       "type": "and",
//       "filters": [{"id": "crafted.stat_2063695047", "disabled": false}],
//       "disabled": false
//     }],
//     "status": "online",
//     "filters": {"misc_filters": {"filters": {"veiled": {"option": "false"}}, "disabled": false}}
//   },
//   "loggedIn": true
// }

// TODO: jump to tab when clicked button

// TODO: parse advanced search info of tabs
//-- TODO: <div class="search-bar search-advanced search-advanced-hidden">
//-- TODO: or get the response body directly
//---- TODO: https://stackoverflow.com/questions/18534771/chrome-extension-how-to-get-http-response-body

// TODO: get the content of trade settings
//-- TODO: show detail of the trade setting when detail button is clicked
//-- TODO: allow user to change the setting and apply, may need to handle the url change

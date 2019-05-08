const toLiteral = function(str) {
    const dict = {'\b': 'b', '\t': 't', '\n': 'n', '\v': 'v', '\f': 'f', '\r': 'r'};
    return str.replace(new RegExp(`([\\\\\\'\\"\\b\\t\\n\\v\\f\\r])`, 'g'), ($0, $1) => `\\${dict[$1] || $1}`);
};

// Inject a variable via JSON
const injectJson = function(name, value) {
    const code = `var ${name} = JSON.parse('${toLiteral(JSON.stringify(value))}');`;
    const elem = document.createElement('script');
    elem.textContent = code;
    return (document.head || document.documentElement).appendChild(elem);
};
    
// Calculate URL to current i18n json
const allowedLocales = ['es','en'];
var locale = chrome.i18n.getMessage("@@ui_locale");
if(allowedLocales.indexOf(locale)<0){
    locale = 'en';
}
const i18n_url = chrome.extension.getURL(`/_locales/${locale}/messages.json`);

// Make request
const xhr = new XMLHttpRequest();
xhr.onreadystatechange = function() {
    if (xhr.readyState === 4) {
            // Response
            // Parse once here gives us a chance to handle errors
            const i18n = JSON.parse(xhr.responseText);
            return injectJson("sceoi18n", i18n);
    }
};
            
xhr.open("GET", i18n_url);
xhr.send();

var s = document.createElement('script');
// TODO: add "script.js" to web_accessible_resources in manifest.json
s.src = chrome.runtime.getURL('scripts.js');
s.onload = function() {
    this.remove();
};
(document.head || document.documentElement).appendChild(s);

chrome.runtime.onMessage.addListener( function(request, sender, sendResponse) {
    var data = request.data || {};
    document.dispatchEvent(new CustomEvent(data.action,{detail:data}));
    sendResponse({data: data, success: true});
});
let orgName = document.getElementById('orgName');
let dataSaved = document.getElementById('dataSaved')
let addOrgMembers = document.getElementById('addOrgMembers');
let eraseMembers = document.getElementById('eraseMembers');
let tabs = document.querySelectorAll('.tab');
let close = document.getElementsByClassName("close");
let listInputs = document.getElementsByClassName("list-inputs");
let addOrgBtn = document.getElementById('addOrgBtn');
let addMemberBtn = document.getElementById('addMemberBtn');
var orgNames = []
var protectedNicknames = []
var scLogs = [];



function init(){
    addOrgBtn.onclick = function() {
        catchInputAddElement('orgInput', 'orgUL');
    }
    
    addMemberBtn.onclick = function() {
        catchInputAddElement('memberInput', 'protectedUL');
    }
    
    for (i = 0; i < tabs.length; i++) {
        tabs[i].addEventListener('click', function() {
            [].forEach.call(tabs, function(el) {
                el.classList.remove('open');
            });
            this.classList.add('open');
        });
    }
}

function sendExtensionId() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { data: { action: "scorgGetExtensionId", extensionId: chrome.runtime.id } }, function(response) {

        });
    });
}

function setMsgLog(logId, msg, type = 'info', arrayPosition = false) {
    let logElement = document.getElementById(logId);
    let logLine = document.createElement('span');
    logLine.classList.add(type);
    if (arrayPosition !== false) {
        logLine.id = `log-${arrayPosition}`;
    }
    logLine.innerHTML = msg;
    logElement.appendChild(logLine);
    logElement.scrollTop = logElement.scrollHeight;
}

function catchInputAddElement(originInput, appendToUL) {
    var inputValue = document.getElementById(originInput).value;
    newElementList(inputValue, appendToUL)
    document.getElementById(originInput).value = "";
}


function newElementList(inputValue, appendToUL) {
    if (inputValue === '') {
        alert("You must write something!");
        return;
    }
    if (appendToUL == 'orgUL') {
        inputValue = inputValue.toUpperCase();
    }
    var li = document.createElement("li");
    li.classList.add('list-inputs');
    var t = document.createTextNode(inputValue);
    li.appendChild(t);

    document.getElementById(appendToUL).appendChild(li);

    var span = document.createElement("span");
    var txt = document.createTextNode("\u00D7");
    span.className = "close";
    span.appendChild(txt);
    li.appendChild(span);
    saveConfigData();

    for (i = 0; i < close.length; i++) {
        close[i].onclick = function() {
            var div = this.parentElement;
            div.remove();
            saveConfigData();
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    init();
    setLog();
    initTranslations();
    sendExtensionId();
});



function setChildTextNode(elementId, text) {
    document.getElementById(elementId).innerText = text;
}

function initTranslations() {
    var translatableIds = ['title_add_members','addOrgMembers','title_delete_members',
    'eraseMembers','addOrgBtn','addMemberBtn','title_configuration','title_my_orgs','title_protected_members']
    translatableIds.forEach(function(token){
        setChildTextNode(token, chrome.i18n.getMessage(token));
    })
    var translatablePlaceholders = ['memberInput','orgInput']
    translatablePlaceholders.forEach(function(token){
        document.getElementById(token).placeholder = chrome.i18n.getMessage(token);
    })
}

function setLog() {
    chrome.storage.local.get('starcitizenLogs', function(data) {
        if (data.starcitizenLogs) {
            scLogs = data.starcitizenLogs
            for (i = 0; i < scLogs.length; i++) {
                var log = data.starcitizenLogs[i];
                setMsgLog(log.logId, log.msg, log.type, i);
            }
        }
    });
}

function resetLog() {
    scLogs = []
    chrome.storage.local.set({ starcitizenLogs: scLogs });
    document.getElementById('contact-log').innerHTML = '';
    document.getElementById('delete-log').innerHTML = '';
}



chrome.storage.sync.get('starcitizenData', function(data) {
    orgNames = data.starcitizenData.orgNames;
    protectedNicknames = data.starcitizenData.protectedNicknames;
    data.starcitizenData.orgNames.forEach(function(element) {
        newElementList(element, 'orgUL');
    })
    data.starcitizenData.protectedNicknames.forEach(function(element) {
        newElementList(element, 'protectedUL');
    })
});

function saveConfigData() {
    orgNames = []
    protectedNicknames = []
    var orgElements = document.querySelectorAll('#orgUL li');
    var membersElements = document.querySelectorAll('#protectedUL li');

    orgElements.forEach(function(element) {
        orgNames.push(element.textContent.replace(/\u00D7/g, '').toUpperCase());
    })

    membersElements.forEach(function(element) {
        protectedNicknames.push(element.textContent.replace(/\u00D7/g, ''));
    })

    chrome.storage.sync.set({ starcitizenData: { orgNames, protectedNicknames } }, function() {

    });
}

addOrgMembers.onclick = function(element) {
    if(orgNames.length == 0){
        var logmsg = {
            logId:'contact-log',
            msg: chrome.i18n.getMessage("error_not_set_any_org"),
            type: 'error'
        }
        scLogs.push(logmsg);
        chrome.storage.local.set({ starcitizenLogs: scLogs });
        setMsgLog(logmsg.logId, logmsg.msg, logmsg.type, scLogs.length - 1);
    } else {
        resetLog();
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { data: { action: "executeAddMembers", orgNames } }, function(response) {

            });
        });
    }
}

eraseMembers.onclick = function(element) {
    resetLog();
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { data: { action: "executeEraseMembers", orgNames, protectedNicknames } }, function(response) {

        });
    });
}

$(document).on('click', '.delete-member', function() {
    element = $(this)
    var position = (element.parent().attr('id')).replace('log-', '');
    if (position) {
        scLogs.splice(position, 1);
        chrome.storage.local.set({ starcitizenLogs: scLogs });
    }

    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { data: { action: "executeEraseMember", nickname: element.data('nickname') } }, function(response) {

        });
    });
    element.parent().remove();
    //element.remove();

})

chrome.runtime.onMessageExternal.addListener(
    function(request, sender, sendResponse) {
        if (request.action == 'logMessage') {
            scLogs.push(request);
            chrome.storage.local.set({ starcitizenLogs: scLogs });
            setMsgLog(request.logId, request.msg, request.type, scLogs.length - 1);
        }
        sendResponse('catched!');
    }
);
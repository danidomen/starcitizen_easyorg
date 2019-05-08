let orgName = document.getElementById('orgName');
let protectedNicknames = document.getElementById('protectedNicknames')
let saveData = document.getElementById('saveData')
let dataSaved = document.getElementById('dataSaved')
let addOrgMembers = document.getElementById('addOrgMembers');
let eraseMembers = document.getElementById('eraseMembers');

document.addEventListener('DOMContentLoaded', function() {
    init();
});

function setChildTextNode(elementId, text) {
    document.getElementById(elementId).innerText = text;
  }

  function init() {
    setChildTextNode('saveData', chrome.i18n.getMessage("savedatabtn"));
    setChildTextNode('orgname_label', chrome.i18n.getMessage("orgname_label"));
    setChildTextNode('prtnickname_label', chrome.i18n.getMessage("prtnickname_label"));
    setChildTextNode('orgactions_label', chrome.i18n.getMessage("orgactions_label"));
    setChildTextNode('addOrgMembers', chrome.i18n.getMessage("addmembersbtn"));
    setChildTextNode('eraseMembers', chrome.i18n.getMessage("erasemembersbtn"));
  }

  chrome.storage.sync.get('starcitizenData', function(data) {
    orgName.setAttribute('value', data.starcitizenData.orgName);
    protectedNicknames.setAttribute('value', data.starcitizenData.protectedNicknames);
  });

  saveData.onclick = function(element) {
    chrome.storage.sync.set({starcitizenData:{"orgName": orgName.value, "protectedNicknames":protectedNicknames.value}}, function() {
        dataSaved.classList.remove('hidden');
        setTimeout(function(){
            dataSaved.classList.add('hidden');
        },1400)
    });
  };

  addOrgMembers.onclick = function(element) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {data:{action: "executeAddMembers", "orgName": orgName.value}}, function(response) {

        });
    });
  }

  eraseMembers.onclick = function(element) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {data:{action: "executeEraseMembers", "orgName": orgName.value, "protectedNicknames":protectedNicknames.value}}, function(response) {

        });
    });
  }
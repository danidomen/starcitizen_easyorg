let orgName = document.getElementById('orgName');
let protectedNicknames = document.getElementById('protectedNicknames')
let saveData = document.getElementById('saveData')
let dataSaved = document.getElementById('dataSaved')
let addOrgMembers = document.getElementById('addOrgMembers');
let eraseMembers = document.getElementById('eraseMembers');
let tabs = document.querySelectorAll('.tab');
let close = document.getElementsByClassName("close");
let listInputs = document.getElementsByClassName("list-inputs");
let addOrgBtn = document.getElementById('addOrgBtn');

addOrgBtn.onclick = function(){
  catchInputAddElement('orgInput','orgUL');
}

for (i = 0; i < tabs.length; i++) {
  tabs[i].addEventListener('click', function() {
    [].forEach.call(tabs, function(el) {
      el.classList.remove('open');
    });
    this.classList.add('open');
  });
}

/*
for (i = 0; i < listInputs.length; i++) {
  var span = document.createElement("span");
  var txt = document.createTextNode("\u00D7");
  span.className = "close";
  span.appendChild(txt);
  listInputs[i].appendChild(span);
}

for (i = 0; i < close.length; i++) {
  close[i].onclick = function() {
    var div = this.parentElement;
    div.remove();
  }
}*/

function catchInputAddElement(originInput,appendToUL){
  var inputValue = document.getElementById(originInput).value;
  newElementList(inputValue,appendToUL)
  document.getElementById(originInput).value = "";
}


function newElementList(inputValue,appendToUL) {
  inputValue = inputValue.toUpperCase();
  var li = document.createElement("li");
  li.classList.add('list-inputs');
  var t = document.createTextNode(inputValue);
  li.appendChild(t);
  if (inputValue === '') {
    alert("You must write something!");
  } else {
    document.getElementById(appendToUL).appendChild(li);
  }
  

  var span = document.createElement("span");
  var txt = document.createTextNode("\u00D7");
  span.className = "close";
  span.appendChild(txt);
  li.appendChild(span);

  for (i = 0; i < close.length; i++) {
    close[i].onclick = function() {
      var div = this.parentElement;
      div.remove();
    }
  }
}

document.addEventListener('DOMContentLoaded', function () {
  init();
});

function setChildTextNode(elementId, text) {
  document.getElementById(elementId).innerText = text;
}

function init() {
  setChildTextNode('saveData', chrome.i18n.getMessage("savedatabtn"));
  setChildTextNode('orgname_label', chrome.i18n.getMessage("orgname_label"));
  setChildTextNode('prtnickname_label', chrome.i18n.getMessage("prtnickname_label"));
  setChildTextNode('addOrgMembers', chrome.i18n.getMessage("addmembersbtn"));
  setChildTextNode('eraseMembers', chrome.i18n.getMessage("erasemembersbtn"));
}

chrome.storage.sync.get('starcitizenData', function (data) {
  data.starcitizenData.orgNames.forEach(function(element){
    newElementList(element,'orgUL');
  })
  orgName.setAttribute('value', data.starcitizenData.orgName);
  protectedNicknames.setAttribute('value', data.starcitizenData.protectedNicknames);
});

saveData.onclick = function (element) {
  var orgNames = []
  var orgElements = document.querySelectorAll('#orgUL li');
  orgElements.forEach(function(element){
    orgNames.push(element.textContent.replace(/\u00D7/g,'').toUpperCase());
  })
  chrome.storage.sync.set({ starcitizenData: { orgNames, "orgName": orgName.value, "protectedNicknames": protectedNicknames.value } }, function () {
    dataSaved.classList.remove('hidden');
    setTimeout(function () {
      dataSaved.classList.add('hidden');
    }, 1400)
  });
};

addOrgMembers.onclick = function (element) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { data: { action: "executeAddMembers", "orgName": orgName.value } }, function (response) {

    });
  });
}

eraseMembers.onclick = function (element) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { data: { action: "executeEraseMembers", "orgName": orgName.value, "protectedNicknames": protectedNicknames.value } }, function (response) {

    });
  });
}
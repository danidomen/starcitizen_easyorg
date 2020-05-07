var orgQueriedMembers = {};
var SCorgExtensionId = "";
var contactOnMyList = -1;
var membersPerOrg = {};
var contactList = [];
var pendingList = [];
var inYourOrgs = [];
var processedToDelete = 0;
var isError = false;
var userOrgs = {}

var ENDPOINT_LIST = '/api/spectrum/friend/list';
var ENDPOINT_REQUEST = '/api/spectrum/friend-request/create';
var ENDPOINT_REMOVE = '/api/spectrum/friend/remove';
var ENDPOINT_SEARCH = '/api/spectrum/search/member/autocomplete';
var ENDPOINT_MYORGS = '/api/spectrum/auth/identify';
var ENDPOINT_MEMBERS = '/api/spectrum/community/members';


initContactCounter();

function getCk(name) {
	var value = "; " + document.cookie;
	var parts = value.split("; " + name + "=");
	if (parts.length == 2) return parts.pop().split(";").shift();
}

function callToAPI(url, data, success) {
    var params = typeof data == 'string' ? data : Object.keys(data).map(
            function(k){ return encodeURIComponent(k) + '=' + encodeURIComponent(data[k]) }
        ).join('&');

    var xhr = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
    xhr.open('POST', url);
    xhr.onreadystatechange = function() {
        if (xhr.readyState>3 && xhr.status==200) { success(xhr.responseText); }
    };
    xhr.setRequestHeader('x-tavern-id', 'u43l1eqnluo3x');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('x-rsi-token', getCk('Rsi-Token'));
    xhr.crossDomain = true;
    xhr.withCredentials = true;
    xhr.send(params);
    return xhr;
}


function getTrltn(token) {
    return (sceoi18n.hasOwnProperty(token)) ? sceoi18n[token].message : token;
}

function getContactList(page = 1, maxPage = 0, cursor = '') {
    contactList = {};
    callToAPI(ENDPOINT_LIST,"{}",function(data){
        response = JSON.parse(data);
        if (response.data && response.data.hasOwnProperty('members')) {
            contactOnMyList = response.data.members.length;
            response.data.members.forEach(member => {
                contactList[member.nickname] = member.id
            });
        } else if (response.code && response.code == 'ErrNotAuthenticated') {
            contactOnMyList = 0;
            isError = true;
        }
    });
}

function getOrganizations(){
    callToAPI(ENDPOINT_MYORGS,"{}",function(data){
        response = JSON.parse(data);
        if (response.data && response.data.hasOwnProperty('communities')) {
            response.data.communities.forEach(community => {
                if(community.id > 1){
                    userOrgs[community.name] = {
                        id : community.id,
                        avatar : community.avatar,
                        slug: community.slug
                    }
                }
            });
            response.data.friend_requests.forEach(fReq => {
                if(fReq.hasOwnProperty('members') && fReq.members.length && fReq.members[0].hasOwnProperty('id')){
                    var fMem = fReq.members[0];
                    pendingList[fMem.nickname] = {
                        id : fMem.id,
                        displayname : fMem.displayname,
                        nickname: fMem.nickname,
                        request_id: fReq.id,
                        requesting_member_id: fReq.requesting_member_id
                    }
                }
            })
            logMessage('communities', JSON.stringify(userOrgs), 'object');
        } else if (response.code && response.code == 'ErrNotAuthenticated') {
            userOrgs = {};
            isError = true;
        }
    });
}

function addContact(memberId, followNickName,isOnOrgPage){
    var elementUser = null;
    if (isOnOrgPage) {
        elementUser = $(`li.member-item span.nick:contains(${followNickName})`)
    }
    callToAPI(ENDPOINT_REQUEST,'{"member_id": "'+memberId+'"}',function(addResponse){
        addResponse = JSON.parse(addResponse);
        if (addResponse.code == 'OK' && addResponse.success == 1) {
            logMessage('contact-log', `<strong>${followNickName}</strong> ${getTrltn('new_added')}`, 'success');
            if (isOnOrgPage) {
                elementUser.parents('.right').append(`<div class="autotagfollowing" style="font-weight: bold;font-size: 12px;color: white; background: green;text-align: center;">${getTrltn('new_added')}</div>`)
            }
        } else {
            logMessage('contact-log', `Error <strong>${followNickName}</strong> ${getTrltn(addResponse.msg)}`, 'error');
            if (isOnOrgPage) {
                elementUser.parents('.right').append(`<div class="autotagfollowing" style="font-size: 12px;color: white;background: red;text-align: center;">${getTrltn(addResponse.msg)}</div>`)
            } 
        }
    })
}

function addMembersPerOrg(orgName,onlyButton=false) {
    //orgName = orgName.toUpperCase()
    var addMembersAuto = true; //confirm(getTrltn("follow_automatically"));
    var orgPageValue = '';
    if(window.jQuery){
        orgPageValue = $('.search-members input.js-form-data[name="symbol"]').val();
    }
    var isOnOrgPage = !(typeof orgPageValue == 'undefined' || !orgPageValue || userOrgs[orgName].slug != orgPageValue);
    if (isOnOrgPage) {
        $('.autotagfollowing').remove();
    }

    var counter = 0;
    var intervalEndProcess = null;
    var intervalProcess = function() {
        if (counter >= orgQueriedMembers[orgName].length) {
            logMessage('contact-log', `${getTrltn('end_process_contacts_from')} <strong>${orgName}</strong>.`, 'info');
            clearInterval(intervalEndProcess);
        }
    }
    intervalEndProcess = setInterval(intervalProcess, 400);

    orgQueriedMembers[orgName].forEach(function(followNickName) {
        var elementUser = null;
        if (isOnOrgPage) {
            elementUser = $(`li.member-item span.nick:contains(${followNickName})`)
        }
        if (!contactList.hasOwnProperty(followNickName) && !pendingList.hasOwnProperty(followNickName)) {
            //CONTACT NOT EXISTS. ADD TO FRIEND LIST
            for(var myorgName in userOrgs){
                callToAPI(ENDPOINT_SEARCH,'{"community_id":'+userOrgs[myorgName].id+',"text":"'+followNickName+'","ignore_self":true}',function(searchResponse){
                    counter++;
                    searchResponse = JSON.parse(searchResponse);
                    if (searchResponse.code == 'OK' && searchResponse.success == 1 && searchResponse.data.hits.total == 1) {
                        var memberId =  searchResponse.data.members[0].id;
                        if(onlyButton && isOnOrgPage){
                            elementUser.parents('.right').append(`<div class="autotagfollowing followbutton" data-nickname="${followNickName}" data-memberid="${memberId}" style="font-weight: bold;font-size: 12px;color: white; background: #899947;text-align: center;">${getTrltn('to_following')}</div>`)
                        }else{
                            addContact(memberId,followNickName,isOnOrgPage)
                        }
                    } else {
                        logMessage('contact-log', `Error <strong>${followNickName}</strong> ${getTrltn(searchResponse.msg)} ${getTrltn('or_maybe_not_found_in_org')} ${myorgName}`, 'error');
                    }
                })
            }
        } else if (contactList.hasOwnProperty(followNickName)) {
            //CONTACT IS ALREADY A FRIEND
            counter++;
            if(!onlyButton){
                logMessage('contact-log', `<strong>${followNickName}</strong> ${getTrltn('already_following_yet')}`, 'normal');
            }
            if (isOnOrgPage) {
                elementUser.parents('.right').append(`<div class="autotagfollowing" style="font-size: 12px;color: white;background: #426c97;text-align: center;">${getTrltn('following')}</div>`)
            }
        } else if (pendingList.hasOwnProperty(followNickName)){
            //PENDING
            counter++;
            if(!onlyButton){
                logMessage('contact-log', `<strong>${followNickName}</strong> ${getTrltn('pending_request')}`, 'normal');
            }
            if (isOnOrgPage) {
                elementUser.parents('.right').append(`<div class="autotagfollowing" style="font-size: 12px;color: white;background: #636a72;text-align: center;">${getTrltn('pending')}</div>`)
            }
        }
    });
}
var contactListFilter = [];
function startProcessing(orgNames, type, protectedNicknames = null){
    contactListFilter = [];
    for(var nickname in contactList){
        contactListFilter.push(nickname);
    }
    if (contactOnMyList == contactListFilter.length) {
        for (i = 0; i < orgNames.length; i++) {
            var orgName = orgNames[i];
            orgQueriedMembers[orgName] = [];
            processMembers(orgName,type,protectedNicknames);
        }
    }
}

function processMembers(orgName, type, protectedNicknames = null) {
    if (type == 'add' || type == 'buttons') {
        logMessage('contact-log', `${getTrltn('start_query_contacts_from')} <strong>${orgName}</strong> ...`, 'info');
    } else if (type == 'delete') {
        logMessage('delete-log', `${getTrltn('start_query_contacts_from')} <strong>${orgName}</strong> ...`, 'info');
    }
    


    if (!orgQueriedMembers.hasOwnProperty(orgName)) {
        orgQueriedMembers[orgName] = [];
    }

    if (orgQueriedMembers[orgName].length == 0) {
        queryOrgMembers(orgName,type);
    }
}

function queryOrgMembers(orgName,type, page = 1, maxPage = 0, pagesize = 100, search = '') {
    var symbol = orgName;
    if (page <= maxPage || maxPage == 0) {
        if (type == 'add' || type == 'buttons') {
            logMessage('contact-log', `${getTrltn('getting_batch_members_from')} <strong>${orgName}</strong> - ${getTrltn('page_number')} ${page}...`, 'info');
        } else if (type == 'delete') {
            logMessage('delete-log', `${getTrltn('getting_batch_members_from')} <strong>${orgName}</strong> - ${getTrltn('page_number')} ${page}...`, 'info');
        }
        var communityId = userOrgs[orgName].id;
        callToAPI(ENDPOINT_MEMBERS,'{"community_id":'+communityId+',"page":'+page+',"pagesize":'+pagesize+',"sort":"displayname"}', function(response){
            response = JSON.parse(response);
            if (response.data && response.data.hasOwnProperty('members_total')) {
                if (maxPage == 0) {
                    membersPerOrg[symbol] = response.data.members_total;
                    maxPage = response.data.pages_total
                }
                let arrayMembers = []
                response.data.members.forEach(member => {
                    arrayMembers.push(member.nickname);
                });
                orgQueriedMembers[symbol] = [...orgQueriedMembers[symbol], ...arrayMembers]
                queryOrgMembers(orgName,type,page + 1, maxPage);
            }
        })
    }else{
        if ((membersPerOrg.hasOwnProperty(orgName) &&
            orgQueriedMembers[orgName].length >= membersPerOrg[orgName]) || orgName == 'NO ORG DETECTED') {
            if (type == 'add' || type == 'buttons') {
                addMembersPerOrg(orgName, ((type == 'buttons')?true:false));
            } else if (type == 'delete') {
                eraseMembers(orgName, protectedNicknames);
            }
        }
    }
}


function eraseMembers(orgName, protectedNicknames, page = 1, maxPage = 0, cursor = '') {
    var protected = protectedNicknames;
    for(var nickname in contactList){
        if(orgQueriedMembers[orgName].indexOf(nickname) >= 0){
            if (!inYourOrgs.includes(nickname)) {
                inYourOrgs.push(nickname);
            }
        } else if (protected.indexOf(nickname.toUpperCase()) >= 0) {
            if (!inYourOrgs.includes(nickname)) {
                inYourOrgs.push(nickname);
            }
        }
        processedToDelete++;
    }
    if (processedToDelete >= contactOnMyList*orgNamesErase.length) { 
        processedToDelete = 0;
        contactListFilter = [];
        for(var nickname in contactList){
            contactListFilter.push(nickname);
        }
        let difference = contactListFilter.filter(x => !inYourOrgs.includes(x));
        for (i = 0; i < difference.length; i++) {
            var nickname = difference[i];
            var confirmMsg = `<div><strong>${nickname}</strong> ${getTrltn('it_not_belongs_your_orgs')}. ${getTrltn('do_you_want_unfollow')}</div><button class="delete-member" data-userid="${contactList[nickname]}" data-nickname="${nickname}">${getTrltn('yes')}</button>`;
            logMessage('delete-log', confirmMsg, 'warning');
        }
        logMessage('delete-log', getTrltn('end_delete_process'), 'info');
    }
    return;
}

function initContactCounter() {
    callToAPI(ENDPOINT_LIST,"{}",function(data){
        response = JSON.parse(data);
        if (response.data && response.data.hasOwnProperty('members')) {
            contactOnMyList = response.data.members.length;
        } else if (response.code && response.code == 'ErrNotAuthenticated') {
            contactOnMyList = 0;
            isError = true;
        }
    });
}

function logMessage(logId, msg, type) {
    if (SCorgExtensionId.length) {
        chrome.runtime.sendMessage(SCorgExtensionId, { action: 'logMessage', logId, msg, type }, function(response) {
            if (chrome.runtime.lastError) {
                setTimeout(logMessage(logId, msg, type), 1000);
            } else {
                // Do whatever you want, background script is ready now
            }
        });
    } else {
        setTimeout(logMessage(logId, msg, type), 1000);
    }
}

document.addEventListener("scorgGetExtensionId", function(msg) {
    SCorgExtensionId = msg.detail.extensionId;
    getOrganizations();
    getContactList();
});

document.addEventListener("executeAddMembers", function(msg) {
    if (isError) {
        logMessage('contact-log', getTrltn('error_may_not_authenticated'), 'error');
        logMessage('delete-log', getTrltn('error_may_not_authenticated'), 'error');
    } else {
        orgQueriedMembers = {};
        var orgTmpNames = [];
        for(var orgName in userOrgs){
            orgTmpNames.push(orgName);
        }
        startProcessing(orgTmpNames,'add');
    }
});

document.addEventListener("executeButtonsMembers", function(msg) {
    if (isError) {
        logMessage('contact-log', getTrltn('error_may_not_authenticated'), 'error');
        logMessage('delete-log', getTrltn('error_may_not_authenticated'), 'error');
    } else {
        orgQueriedMembers = {};
        var orgTmpNames = [];
        for(var orgName in userOrgs){
            orgTmpNames.push(orgName);
        }
        startProcessing(orgTmpNames,'buttons');
    }
});

document.addEventListener("executeEraseMember", function(msg) {
    callToAPI(ENDPOINT_REMOVE,'{"member_id": "'+msg.detail.userid+'"}',function(responseErase){
        responseErase = JSON.parse(responseErase);
        if (responseErase.msg == 'OK') {
            var alertMsg = (getTrltn('unfollow_success')).replace('__NICKNAME__', msg.detail.nickname)
            logMessage('delete-log', alertMsg, 'success');
        } else {
            var alertMsg = (getTrltn('unfollow_error')).replace('__NICKNAME__', msg.detail.nickname)
            logMessage('delete-log', alertMsg, 'error');
        }
    });
});
var protectedNicknames = [];
var orgNamesErase = [];
document.addEventListener("executeEraseMembers", function(msg) {
    protectedNicknames = msg.detail.protectedNicknames.map(item => item.toUpperCase());
    orgNamesErase = [];
    for(var orgName in userOrgs){
        orgNamesErase.push(orgName);
    }
    if(orgNamesErase.length == 0){
        orgNamesErase = ['NO ORG DETECTED']
    }
    orgQueriedMembers = {};
    inYourOrgs = [];
    processedToDelete = 0;
    logMessage('delete-log', getTrltn('start_delete_process'), 'info');
    startProcessing(orgNamesErase, 'delete', protectedNicknames);
    return;
});
if(window.jQuery){
    $('body').on('click','.followbutton',function(e){
        e.preventDefault();
        e.stopPropagation();
        var memberId = $(this).data('memberid');
        var followNick = $(this).data('nickname');
        $(this).remove();
        addContact(memberId,followNick,true);
    })
}

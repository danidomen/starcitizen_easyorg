var orgQueriedMembers = {};
var SCorgExtensionId = "";
var contactOnMyList = -1;
var membersPerOrg = {};
var contactList = [];
var inYourOrgs = [];
var processedToDelete = 0;
var isError = false;

initContactCounter();

function getTrltn(token) {
    return (sceoi18n.hasOwnProperty(token)) ? sceoi18n[token].message : token;
}

function getContactList(page = 1, maxPage = 0, cursor = '') {
    if (page <= 1) {
        contactList = []
    }
    if (page <= maxPage || maxPage == 0) {
        RSI.Api.Contacts.list(function(response) {
            if (response.data && response.data.hasOwnProperty('pagecount')) {
                if (maxPage == 0) {
                    maxPage = response.data.pagecount;
                    contactOnMyList = response.data.totalrows;
                }
                cursor = response.data.cursor;
                response.data.resultset.forEach(function(item) {
                    contactList.push(item.nickname);
                });
                getContactList(page + 1, maxPage, cursor);
            }
        }, { page, cursor });
    }
}

function addMembersPerOrg(orgName) {
    orgName = orgName.toUpperCase()
    var addMembersAuto = true; //confirm(getTrltn("follow_automatically"));
    var orgPageValue = $('.search-members input.js-form-data[name="symbol"]').val();
    var isOnOrgPage = !(typeof orgPageValue == 'undefined' || !orgPageValue || orgPageValue != orgName);
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
        if (contactList.indexOf(followNickName) == -1) {
            //CONTACT NOT EXISTS. ADD TO FRIEND LIST
            RSI.Api.Contacts.add(function(addResponse) {
                counter++;
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
                //return true;
            }, { nickname: followNickName })
        } else {
            //CONTACT IS ALREADY A FRIEND
            counter++;
            logMessage('contact-log', `<strong>${followNickName}</strong> ${getTrltn('already_following_yet')}`, 'normal');
            if (isOnOrgPage) {
                elementUser.parents('.right').append(`<div class="autotagfollowing" style="font-size: 12px;color: white;background: #426c97;text-align: center;">${getTrltn('following')}</div>`)
            }
        }
    });
}

function startProcessing(orgNames, type, protectedNicknames = null){
    var intervalEndProcess = null;
    var intervalProcess = function() {
        if (contactOnMyList == contactList.length) {
            clearInterval(intervalEndProcess);
            for (i = 0; i < orgNames.length; i++) {
                var orgName = orgNames[i].toUpperCase();
                orgQueriedMembers[orgName] = [];
                processMembers(orgName,type,protectedNicknames);
            }
        }
    }
    getContactList();
    intervalEndProcess = setInterval(intervalProcess, 400);
}

function processMembers(orgName, type, protectedNicknames = null) {
    if (type == 'add') {
        logMessage('contact-log', `${getTrltn('start_query_contacts_from')} <strong>${orgName}</strong> ...`, 'info');
    } else if (type == 'delete') {
        logMessage('delete-log', `${getTrltn('start_query_contacts_from')} <strong>${orgName}</strong> ...`, 'info');
    }
    
    orgName = orgName.toUpperCase()

    if (!orgQueriedMembers.hasOwnProperty(orgName)) {
        orgQueriedMembers[orgName] = [];
    }
    //alert(getTrltn("msg_are_not_org_page"));
    if (orgQueriedMembers[orgName].length == 0) {
        queryOrgMembers(orgName,type);
    }
    var intervalEndProcess = null;
    var intervalProcess = function() {
        if ((membersPerOrg.hasOwnProperty(orgName) &&
            orgQueriedMembers[orgName].length >= membersPerOrg[orgName]) || orgName == 'NO ORG DETECTED') {
            clearInterval(intervalEndProcess);
            if (type == 'add') {
                addMembersPerOrg(orgName);
            } else if (type == 'delete') {
                eraseMembers(orgName, protectedNicknames);
            }
        }
    }
    intervalEndProcess = setInterval(intervalProcess, 400);
}

function queryOrgMembers(orgName,type, page = 1, maxPage = 0, pagesize = 32, search = '') {
    var symbol = orgName.toUpperCase()
    if (page <= maxPage || maxPage == 0) {
        if (type == 'add') {
            logMessage('contact-log', `${getTrltn('getting_batch_members_from')} <strong>${orgName}</strong> - ${getTrltn('page_number')} ${page}...`, 'info');
        } else if (type == 'delete') {
            logMessage('delete-log', `${getTrltn('getting_batch_members_from')} <strong>${orgName}</strong> - ${getTrltn('page_number')} ${page}...`, 'info');
        }
        RSI.Api.Org.getOrgMembers(function(response) {
            if (response.data && response.data.hasOwnProperty('totalrows')) {
                if (maxPage == 0) {
                    membersPerOrg[symbol] = response.data.totalrows;
                    maxPage = Math.ceil(response.data.totalrows / pagesize)
                }
                let arrayMembers = Array.from(response.data.html.matchAll(/nick data[0-9]">(.*?)<\/span/gi));
                orgQueriedMembers[symbol] = [...orgQueriedMembers[symbol], ...arrayMembers.map(item => item[1])]
                queryOrgMembers(orgName, page + 1, maxPage);
            }
        }, { symbol, search, pagesize, page })
    }
}


function eraseMembers(orgName, protectedNicknames, page = 1, maxPage = 0, cursor = '') {
    var protected = protectedNicknames;
    contactList.forEach(function(nickname) {
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
    })
    return;
}

function initContactCounter() {
    RSI.Api.Contacts.list(function(response) {
        if (response.data && response.data.hasOwnProperty('totalrows')) {
            contactOnMyList = response.data.totalrows;
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
});

document.addEventListener("executeAddMembers", function(msg) {
    if (isError) {
        logMessage('contact-log', getTrltn('error_may_not_authenticated'), 'error');
        logMessage('delete-log', getTrltn('error_may_not_authenticated'), 'error');
    } else {
        orgQueriedMembers = {};
        startProcessing(msg.detail.orgNames,'add');
    }
});

document.addEventListener("executeEraseMember", function(msg) {
    RSI.Api.Contacts.erase(function(responseErase) {
        if (responseErase.msg == 'OK') {
            var alertMsg = (getTrltn('unfollow_success')).replace('__NICKNAME__', msg.detail.nickname)
            logMessage('delete-log', alertMsg, 'success');
        } else {
            var alertMsg = (getTrltn('unfollow_error')).replace('__NICKNAME__', msg.detail.nickname)
            logMessage('delete-log', alertMsg, 'error');
        }
    }, { nickname: msg.detail.nickname })
});

document.addEventListener("executeEraseMembers", function(msg) {
    var protectedNicknames = msg.detail.protectedNicknames.map(item => item.toUpperCase());
    var orgNamesErase = msg.detail.orgNames;
    orgQueriedMembers = {};
    inYourOrgs = [];
    processedToDelete = 0;
    
    if(orgNamesErase.length == 0){
        orgNamesErase = ['NO ORG DETECTED']
    }
    logMessage('delete-log', getTrltn('start_delete_process'), 'info');
    startProcessing(orgNamesErase, 'delete', protectedNicknames);
    
    var intervalEndProcess = null;
    var intervalProcess = function() {
        if (processedToDelete >= contactOnMyList*orgNamesErase.length) {
            clearInterval(intervalEndProcess);
            processedToDelete = 0;
            let difference = contactList.filter(x => !inYourOrgs.includes(x));
            console.log(difference);
            for (i = 0; i < difference.length; i++) {
                var nickname = difference[i];
                var confirmMsg = `<strong>${nickname}</strong> ${getTrltn('it_not_belongs_your_orgs')}. ${getTrltn('do_you_want_unfollow')} <button class="delete-member" data-nickname="${nickname}">${getTrltn('yes')}</button>`;
                logMessage('delete-log', confirmMsg, 'warning');
            }
            logMessage('delete-log', getTrltn('end_delete_process'), 'info');
        }
    }
    intervalEndProcess = setInterval(intervalProcess, 400);
    return;
});

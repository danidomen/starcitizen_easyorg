var orgQueriedMembers = [];
var SCorgExtensionId = "";
var contactOnMyList = -1;

initContactCounter();

function getTrltn(token) {
    return (sceoi18n.hasOwnProperty(token)) ? sceoi18n[token].message : token;
}

function addMembers(orgName) {

    logMessage('contact-log', `${getTrltn('start_process_contacts_from')} <strong>${orgName}</strong> ...`, 'info');

    orgName = orgName.toUpperCase()
    var addMembersAuto = true; //confirm(getTrltn("follow_automatically"));
    var orgPageValue = $('.search-members input.js-form-data[name="symbol"]').val();
    var isOnOrgPage = !(typeof orgPageValue == 'undefined' || !orgPageValue || orgPageValue != orgName);
    var isError = false;
    if (isOnOrgPage) {
        $('.autotagfollowing').remove();
    }
    //alert(getTrltn("msg_are_not_org_page"));
    if (orgQueriedMembers.length == 0) {
        queryOrgMembers(orgName);
    }
    setTimeout(function() {
        var counter = 0;
        var intervalEndProcess = null;
        var intervalProcess = function() {
            if (counter >= orgQueriedMembers.length) {
                logMessage('contact-log', `${getTrltn('end_process_contacts_from')} <strong>${orgName}</strong>.`, 'info');
                clearInterval(intervalEndProcess);
            }
        }
        intervalEndProcess = setInterval(intervalProcess, 400);
        orgQueriedMembers.forEach(async function(followNickName) {
            var elementUser = null;
            if (isOnOrgPage) {
                elementUser = $(`li.member-item span.nick:contains(${followNickName})`)
            }
            RSI.Api.Contacts.list(function(response) {
                if (response.data) {
                    let isDisplayed = false;
                    response.data.resultset.forEach(function(item) {
                        var isNowFollowing = (item.nickname == followNickName)
                        if (isNowFollowing) {
                            isDisplayed = true;
                            counter++;
                            logMessage('contact-log', `<strong>${followNickName}</strong> ${getTrltn('already_following_yet')}`, 'normal');
                            if (isOnOrgPage) {
                                elementUser.parents('.right').append(`<div class="autotagfollowing" style="font-size: 12px;color: white;background: #426c97;text-align: center;">${getTrltn('following')}</div>`)
                            }
                        }
                    });
                    if (!isDisplayed) {
                        if (addMembersAuto) {
                            RSI.Api.Contacts.add(function(addResponse) {
                                counter++;
                                if (addResponse.code == 'OK' && addResponse.success == 1) {
                                    if (isOnOrgPage) {
                                        elementUser.parents('.right').append(`<div class="autotagfollowing" style="font-weight: bold;font-size: 12px;color: white; background: green;text-align: center;">${getTrltn('new_added')}</div>`)
                                    }
                                    logMessage('contact-log', `<strong>${followNickName}</strong> ${getTrltn('new_added')}`, 'success');
                                } else {
                                    if (isOnOrgPage) {
                                        elementUser.parents('.right').append(`<div class="autotagfollowing" style="font-size: 12px;color: white;background: red;text-align: center;">${addResponse.msg}</div>`)
                                    }
                                    logMessage('contact-log', `Error <strong>${followNickName}</strong> ${addResponse.msg}`, 'error');
                                }
                                //return true;
                            }, { nickname: followNickName })
                        } else {
                            counter++;
                            if (isOnOrgPage) {
                                elementUser.parents('.right').append(`<div class="autotagfollowing" style="font-size: 12px;color: black;background: yellow;text-align: center;">${getTrltn('to_following')}</div>`)
                            }
                        }
                    }
                } else if (response.code && response.code == 'ErrNotAuthenticated') {
                    isError = true;
                }
                return true;
            }, { query: followNickName })
        });
    }, 5000);
}

function queryOrgMembers(orgName, page = 1, maxPage = 0, pagesize = 32, search = '') {
    var symbol = orgName.toUpperCase()
    if (page <= maxPage || maxPage == 0) {
        logMessage('contact-log', `${getTrltn('getting_batch_members_from')} <strong>${orgName}</strong> - ${getTrltn('page_number')} ${page}...`, 'info');
        RSI.Api.Org.getOrgMembers(function(response) {
            if (response.data && response.data.hasOwnProperty('totalrows')) {
                if (maxPage == 0) {
                    maxPage = Math.ceil(response.data.totalrows / pagesize)
                }
                let arrayMembers = Array.from(response.data.html.matchAll(/nick data[0-9]">(.*?)<\/span/gi));
                orgQueriedMembers = [...orgQueriedMembers, ...arrayMembers.map(item => item[1])]
                queryOrgMembers(orgName, page + 1, maxPage);
            }
        }, { symbol, search, pagesize, page })
    }
}



var allYourList = [];
var inYourOrgs = [];
var processedToDelete = 0;
function eraseMembers(orgName, protectedNicknames, page = 1, maxPage = 0, cursor = '') {
    var orgToSearch = orgName.toUpperCase()
    var protected = protectedNicknames; //protectedNicknames.split(',');
    if (page <= maxPage || maxPage == 0) {
        RSI.Api.Contacts.list(function(response) {
            if (response.data && response.data.hasOwnProperty('pagecount')) {
                if (maxPage == 0) {
                    maxPage = response.data.pagecount;
                    contactOnMyList = response.data.totalrows;
                }
                cursor = response.data.cursor;
                response.data.resultset.forEach(function(item) {
                    if (protected.indexOf(item.nickname) >= 0) {
                        if(!inYourOrgs.includes(item.nickname)){
                            processedToDelete++;
                            inYourOrgs.push(item.nickname);
                        }
                        var alertMsg = (getTrltn('unfollow_protected')).replace('__NICKNAME__', `<strong>${item.nickname}</strong>`)
                        //logMessage('delete-log', alertMsg, 'normal');
                    } else {
                        RSI.Api.Org.searchMembers(function(responseOrg) {
                            if(!allYourList.includes(item.nickname)){
                                processedToDelete++;
                                allYourList.push(item.nickname);
                            }
                            if (responseOrg.data && responseOrg.data.hasOwnProperty('rowcount') && !responseOrg.data.rowcount) {

                                var confirmMsg = (getTrltn('confirm_unfollow')).replace('__NICKNAME__', item.nickname).replace('__ORG__', orgToSearch)
                                //logMessage('delete-log', confirmMsg, 'info');
                                /*
                                var wantDelete = confirm(confirmMsg)
                                if (wantDelete) {
                                    RSI.Api.Contacts.erase(function(responseErase) {
                                        if (responseErase.msg == 'OK') {
                                            var alertMsg = (getTrltn('unfollow_success')).replace('__NICKNAME__', item.nickname)
                                            alert(alertMsg)
                                        } else {
                                            var alertMsg = (getTrltn('unfollow_error')).replace('__NICKNAME__', item.nickname)
                                            alert(alertMsg)
                                        }
                                    }, { nickname: item.nickname })
                                }*/
                            } else {
                                if(!inYourOrgs.includes(item.nickname)){
                                    inYourOrgs.push(item.nickname);
                                }
                            }
                        }, { search: item.nickname, symbol: orgToSearch })
                    }
                });
                eraseMembers(orgName, protectedNicknames, page + 1, maxPage, cursor);
            }
        }, { page, cursor });
    }
}

document.addEventListener("scorgGetExtensionId", function(msg) {
    SCorgExtensionId = msg.detail.extensionId;
});

document.addEventListener("executeAddMembers", function(msg) {
    msg.detail.orgNames.forEach(function(orgName) {
        addMembers(orgName);
    })

});

document.addEventListener("executeEraseMember", function(msg) {
    RSI.Api.Contacts.erase(function(responseErase) {
        if (responseErase.msg == 'OK') {
            var alertMsg = (getTrltn('unfollow_success')).replace('__NICKNAME__', msg.detail.nickname )
            logMessage('delete-log', alertMsg, 'success');
        } else {
            var alertMsg = (getTrltn('unfollow_error')).replace('__NICKNAME__', msg.detail.nickname )
            logMessage('delete-log', alertMsg, 'error');
        }
    }, { nickname: msg.detail.nickname })
});

document.addEventListener("executeEraseMembers", function(msg) {
    allYourList = [];
    inYourOrgs = [];
    processedToDelete = 0;
    logMessage('delete-log', 'Starting delete process...', 'info');
    var intervalEndProcess = null;
    var intervalProcess = function() {
        if (processedToDelete >= contactOnMyList) {
            clearInterval(intervalEndProcess);
            processedToDelete = 0;
            let difference = allYourList.filter(x => !inYourOrgs.includes(x));
            console.log(difference);
            for(i = 0;i<difference.length;i++){
                var nickname = difference[i];
                var confirmMsg = `<strong>${nickname}</strong> no está en las organizaciones. ¿Dejar de seguirlo? <button class="delete-member" data-nickname="${nickname}">SI</button>`; 
                logMessage('delete-log', confirmMsg, 'warning');
            }
            logMessage('delete-log', `End of delete process.`, 'info');          
        }
    }
    intervalEndProcess = setInterval(intervalProcess, 400);

    msg.detail.orgNames.forEach(function(orgName) {
        logMessage('delete-log', `Search members that belongs to <strong>${orgName}</strong>...`, 'info');
        eraseMembers(orgName, msg.detail.protectedNicknames);
    });
    

});

function initContactCounter(){
    RSI.Api.Contacts.list(function(response) {
        if (response.data && response.data.hasOwnProperty('totalrows')){
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
            if(chrome.runtime.lastError) {
                setTimeout(logMessage(logId, msg, type), 1000);
            } else {
                // Do whatever you want, background script is ready now
            }
        });
    } else {
        setTimeout(logMessage(logId, msg, type), 1000);
    }
}
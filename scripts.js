var orgQueriedMembers = [];

function getTrltn(token) {
    return (sceoi18n.hasOwnProperty(token)) ? sceoi18n[token].message : "undefined";
}

function addMembers(orgName) {
    orgName.toUpperCase()
    var addMembersAuto = confirm(getTrltn("follow_automatically"));
    var orgPageValue = $('.search-members input.js-form-data[name="symbol"]').val();
    var isOnOrgPage = !(typeof orgPageValue == 'undefined' || !orgPageValue || orgPageValue != orgName);
    var isError = false;
    if (isOnOrgPage){
        $('.autotagfollowing').remove();
    }
    //alert(getTrltn("msg_are_not_org_page"));
    if (orgQueriedMembers.length == 0){
        queryOrgMembers(orgName);
    }
    setTimeout(function(){
        
        orgQueriedMembers.forEach(function (followNickName) {
            var elementUser = null;
            if (isOnOrgPage){
                elementUser = $(`li.member-item span.nick:contains(${followNickName})`)
            }
            RSI.Api.Contacts.list(function (response) {
                if (response.data) {
                    let isDisplayed = false;
                    response.data.resultset.forEach(function (item) {
                        var isNowFollowing = (item.nickname == followNickName)
                        if (isNowFollowing) {
                            isDisplayed = true;
                            if (isOnOrgPage){
                                elementUser.parents('.right').append(`<div class="autotagfollowing" style="font-size: 12px;color: white;background: #426c97;text-align: center;">${getTrltn('following')}</div>`)
                            }
                        }
                    });
                    if (!isDisplayed) {
                        if (addMembersAuto) {
                            RSI.Api.Contacts.add(function (addResponse){
                                if (addResponse.code == 'OK' && addResponse.success == 1) {
                                    if (isOnOrgPage) {
                                        elementUser.parents('.right').append(`<div class="autotagfollowing" style="font-weight: bold;font-size: 12px;color: white; background: green;text-align: center;">${getTrltn('new_added')}</div>`)
                                    } else {
                                        alert(`${followNickName} ${getTrltn('new_added')}`)
                                    }
                                } else {
                                    if (isOnOrgPage) {
                                        elementUser.parents('.right').append(`<div class="autotagfollowing" style="font-size: 12px;color: white;background: red;text-align: center;">${addResponse.msg}</div>`)
                                    } else {
                                        alert(`Error ${followNickName} ${addResponse.msg}`)
                                    }
                                }
                            }, { nickname: followNickName })
                        } else {
                            if (isOnOrgPage) {
                                elementUser.parents('.right').append(`<div class="autotagfollowing" style="font-size: 12px;color: black;background: yellow;text-align: center;">${getTrltn('to_following')}</div>`)
                            }
                        }
                    }
                } else if (response.code && response.code == 'ErrNotAuthenticated') {
                    isError = true;
                }
            }, { query: followNickName })
        })
    },5000);
}

function queryOrgMembers(orgName, page = 1, maxPage = 0, pagesize = 32, search = ''){
    var symbol = orgName.toUpperCase()
    if (page <= maxPage || maxPage == 0) {
        RSI.Api.Org.getOrgMembers(function(response){
            if (response.data && response.data.hasOwnProperty('totalrows')){
                if (maxPage == 0){
                    maxPage = Math.round(response.data.totalrows/pagesize)
                }
                let arrayMembers = Array.from(response.data.html.matchAll(/nick data[0-9]">(.*?)<\/span/gi));
                orgQueriedMembers = [...orgQueriedMembers, ...arrayMembers.map(item => item[1])]
                queryOrgMembers(orgName,page+1,maxPage);
            }
        },{symbol, search, pagesize, page})
    }
}

function eraseMembers(orgName, protectedNicknames, page = 1, maxPage = 0, cursor = '') {
    var orgToSearch = orgName.toUpperCase()
    var protected = protectedNicknames.split(',');
    if(page<=maxPage || maxPage == 0){
        RSI.Api.Contacts.list(function (response) {
            if (response.data && response.data.hasOwnProperty('pagecount')) {
                if(maxPage == 0){
                    maxPage = response.data.pagecount;
                }
                cursor = response.data.cursor;
                response.data.resultset.forEach(function (item) {
                    if (protected.indexOf(item.nickname) >= 0) {
                        var alertMsg = (getTrltn('unfollow_protected')).replace('__NICKNAME__', item.nickname)
                        alert(alertMsg);
                    } else {
                        RSI.Api.Org.searchMembers(function (responseOrg) {
                            if (responseOrg.data && responseOrg.data.hasOwnProperty('rowcount') && !responseOrg.data.rowcount) {
                                var confirmMsg = (getTrltn('confirm_unfollow')).replace('__NICKNAME__', item.nickname).replace('__ORG__', orgToSearch)
                                var wantDelete = confirm(confirmMsg)
                                if (wantDelete) {
                                    RSI.Api.Contacts.erase(function (responseErase) {
                                        if (responseErase.msg == 'OK') {
                                            var alertMsg = (getTrltn('unfollow_success')).replace('__NICKNAME__', item.nickname)
                                            alert(alertMsg)
                                        } else {
                                            var alertMsg = (getTrltn('unfollow_error')).replace('__NICKNAME__', item.nickname)
                                            alert(alertMsg)
                                        }
                                    }, { nickname: item.nickname })
                                }
                            }
                        }, { search: item.nickname, symbol: orgToSearch })
                    }
                });
                eraseMembers(orgName,protectedNicknames,page+1,maxPage,cursor);
            }
        },{ page, cursor});
    }
}

document.addEventListener("executeAddMembers", function (msg) {
    addMembers(msg.detail.orgName);
});

document.addEventListener("executeEraseMembers", function (msg) {
    eraseMembers(msg.detail.orgName, msg.detail.protectedNicknames);
});
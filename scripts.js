function getTrltn(token){
    return (sceoi18n.hasOwnProperty(token)) ? sceoi18n[token].message : "undefined";
}
function addMembers(orgName) {
    orgName.toUpperCase()
    var orgPageValue = $('.search-members input.js-form-data[name="symbol"]').val();
    if (typeof orgPageValue == 'undefined' || !orgPageValue || orgPageValue != orgName) {
        alert(getTrltn("msg_are_not_org_page"));
    } else {
        var addMembersAuto = confirm(getTrltn("follow_automatically"))
        var isError = false;
        $('.autotagfollowing').remove()
        $('li.member-item span.nick').each(function (index) {
            var followNickName = $(this).text()
            var elementUser = $(this)
            if (followNickName && !isError) {
                RSI.Api.Contacts.search(function (response) {
                    if (response.data && response.data.resultset[0]) {
                        var isNowFollowing = response.data.resultset[0].following
                        if (isNowFollowing) {
                            elementUser.parents('.right').append(`<div class="autotagfollowing" style="font-size: 12px;color: white;background: green;text-align: center;">${getTrltn('following')}</div>`)
                        } else {
                            if (addMembersAuto) {
                                RSI.Api.Contacts.add(null, { nickname: followNickName })
                                elementUser.parents('.right').append(`<div class="autotagfollowing" style="font-weight: bold;font-size: 12px;color: black;background: yellow;text-align: center;">${getTrltn('new_added')}</div>`)
                            } else {
                                elementUser.parents('.right').append(`<div class="autotagfollowing" style="font-size: 12px;color: white;background: red;text-align: center;">${getTrltn('to_following')}</div>`)
                            }
                        }
                    }else if(response.code && response.code == 'ErrNotAuthenticated'){
                            isError = true;
                    }
                }, { q: followNickName })
            }
        });
    }
}


function eraseMembers(orgName, protectedNicknames) {
    var orgToSearch = orgName.toUpperCase()
    var protected = protectedNicknames.split(',');
    var maxPages = 0;
    RSI.Api.Contacts.list(function (response) {
        if (response.data && response.data.hasOwnProperty('pagecount')) {
            maxPages = response.data.pagecount
            for (var i = 1; i <= maxPages; i++) {
                RSI.Api.Contacts.list(function (response) {
                    response.data.resultset.forEach(function (item) {
                        if(protected.indexOf(item.nickname)>=0){
                            var alertMsg = (getTrltn('unfollow_protected')).replace('__NICKNAME__',item.nickname)
                            alert(alertMsg);
                        }else{
                            RSI.Api.Org.searchMembers(function (responseOrg) {
                                if (responseOrg.data && responseOrg.data.hasOwnProperty('rowcount') && !responseOrg.data.rowcount) {
                                    var confirmMsg = (getTrltn('confirm_unfollow')).replace('__NICKNAME__',item.nickname).replace('__ORG__',orgToSearch)
                                    var wantDelete = confirm(confirmMsg)
                                    if (wantDelete) {
                                        RSI.Api.Contacts.erase(function (responseErase) {
                                            if (responseErase.msg == 'OK') {
                                                var alertMsg = (getTrltn('unfollow_success')).replace('__NICKNAME__',item.nickname)
                                                alert(alertMsg)
                                            } else {
                                                var alertMsg = (getTrltn('unfollow_error')).replace('__NICKNAME__',item.nickname)
                                                alert(alertMsg)
                                            }
                                        }, { nickname: item.nickname })
                                    }
                                }
                            }, { search: item.nickname, symbol: orgToSearch })
                        }
                    })
                }, { page: i })
            }
        }
    }, { page: 1 })
}

document.addEventListener("executeAddMembers", function (msg) {
    addMembers(msg.detail.orgName);
});

document.addEventListener("executeEraseMembers", function (msg) {
    eraseMembers(msg.detail.orgName,msg.detail.protectedNicknames);
});
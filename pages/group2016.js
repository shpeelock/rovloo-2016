function htmlDecode(value) {
    return $("<div/>").html(value).text();
}

function updateRolesetCount() {
    var selectedOption = $(".Members_DropDown select option:selected");
    var hiddenCount = $(".Members_DropDown .RolesetCountHidden").val();
    
    selectedOption.html(selectedOption.html() + " (" + hiddenCount + ")");

    if ($.browser.msie && $(".MembersDropDownList").width() > 485) {
        $(".MembersDropDownList").css("width", "485px");
    }
}

var currentPeopleTab;

$(function() {
    "use strict";

    if (!$(".GroupListContainer").hasClass("GroupsPage")) {
        $("#GroupThumbnails").click(function(event) {
            var target = $(event.target).hasClass("GroupListItemContainer") 
                ? $(event.target) 
                : $(event.target).parentsUntil("#GroupThumbnails", ".GroupListItemContainer")[0];
            
            if ($(target).hasClass("GroupListItemContainer")) {
                window.location = $(target).find("a")[0].href;
            }
        });
    }

    if (window.location.href.indexOf("/My/") > -1) {
        var fullDescElem = $("#GroupDesc_Full");
        if (fullDescElem.length > 0) {
            var description = fullDescElem.val();
            if (description.length > 250) {
                var shortDesc = description.substring(0, 247) + 
                    "... <a onclick=\"toggleDesc('more');\">" + Roblox.Resources.more + "</a>";
                $("#GroupDescP").html("<pre>" + shortDesc + "</pre>");
                $("#GroupDescP").linkify();
            }
        }
    }

    $("#GroupsPeople_Games, #GroupsPeople_Clan, #GroupsPeople_Places, " +
      "#GroupsPeople_Items, #GroupsPeople_Members, #GroupsPeople_Payouts").click(togglePeopleTab);

    if ($("#GroupsPeoplePane_Allies").children(".grouprelationshipscontainer").length > 0) {
        $("#GroupsPeople_Allies").click(togglePeopleTab);
    } else {
        $("#GroupsPeople_Allies").hide();
    }

    if ($("#GroupsPeoplePane_Enemies").children(".grouprelationshipscontainer").length > 0) {
        $("#GroupsPeople_Enemies").click(togglePeopleTab);
    } else {
        $("#GroupsPeople_Enemies").hide();
    }

    var activeTab = $("#GroupsPeopleContainer .tab.active");
    if (activeTab.length > 0) {
        currentPeopleTab = activeTab.attr("id").replace("GroupsPeople_", "");
    }

    updateRolesetCount();

    $("#GroupThumbnails").find(".GroupListName").each(function() {
        $(this).text(fitStringToWidthSafeText($(this).text(), $(this).width()));
    });

    $("#GroupsPeoplePane_Games").on("click", ".SkinnyLeftArrow", function() {
        var pane = $("#GroupsPeoplePane_Games");
        var container = pane.find(".results-container");
        var prevPage = container.data("page") - 1;
        var groupId = container.data("group-id");

        pane.html("<div class='loading'></div>");
        $.ajax({
            url: "/groups/" + groupId + "/games/" + prevPage,
            crossDomain: true,
            xhrFields: { withCredentials: true },
            success: function(data) { pane.html(data); }
        });
    });

    $("#GroupsPeoplePane_Games").on("click", ".SkinnyRightArrow", function() {
        var pane = $("#GroupsPeoplePane_Games");
        var container = pane.find(".results-container");
        var nextPage = container.data("page") + 1;
        var groupId = container.data("group-id");

        pane.html("<div class='loading'></div>");
        $.ajax({
            url: "/groups/" + groupId + "/games/" + nextPage,
            crossDomain: true,
            xhrFields: { withCredentials: true },
            success: function(data) { pane.html(data); }
        });
    });
});

var toggleDesc = function(mode) {
    var fullText = $("#GroupDesc_Full").val();
    if (mode == "more") {
        $("#GroupDescP").html("<pre>" + fullText + " <a onclick=\"toggleDesc('less');\">" + Roblox.Resources.less + "</a></pre>");
    } else {
        var shortText = fullText.substring(0, 247) + "... <a onclick=\"toggleDesc('more');\">" + Roblox.Resources.more + "</a>";
        $("#GroupDescP").html("<pre>" + shortText + "</pre>");
    }
    $("#GroupDescP").linkify();
};

var togglePeopleTab = function(event) {
    event.preventDefault();
    event.stopPropagation();
    
    var tab = $(this);
    if (tab.hasClass("active")) return;

    var targetTabName = tab.attr("id").replace("GroupsPeople_", "");
    
    $("#GroupsPeople_" + currentPeopleTab).removeClass("active");
    $("#GroupsPeoplePane_" + currentPeopleTab).hide();
    
    $("#GroupsPeople_" + targetTabName).addClass("active");
    $("#GroupsPeoplePane_" + targetTabName).show();
    
    currentPeopleTab = targetTabName;

    if ($.browser.msie && $(".MembersDropDownList").width() > 485) {
        $(".MembersDropDownList").css("width", "485px");
    }
};

var loading = function(type) {
    if (type == "members") {
        $('<div class="loading"></div>').insertBefore($(".GroupMember").first());
        $(".MembersUpdatePanel").find(".GroupMember").remove();
    } else if (type == "wall") {
        $('<div class="loading"><div class="content"></div><div class="background"></div></div>').insertBefore($(".GroupWallPane .FooterPager"));
    }
    
    window.setTimeout(function() {
        $(".loading").show();
    }, 500);
};

var handlePagerClick = function(event, type) {
    var target = event.target || event.srcElement;
    if (target.tagName == "A" && $(target).hasClass("pagerbtns")) {
        loading(type);
    }
};

$(function() {
    function fetchClanMembers(pageNumber) {
        var totalPages = parseInt($("#GroupsPeoplePane_Clan .paging_pagenums_container").text());
        if (pageNumber < 1 || pageNumber > totalPages) return;

        var groupId = $(".get-clan-members-data").data("group-id");
        var pageSize = $(".get-clan-members-data").data("results-per-page");
        var url = "/group/get-clan-members?groupId=" + groupId + "&pageNumber=" + pageNumber + "&resultsPerPage=" + pageSize;

        $.ajax({
            method: "GET",
            url: url,
            crossDomain: true,
            xhrFields: { withCredentials: true }
        }).done(function(html) {
            $("#GroupsPeoplePane_Clan").html(html);
            Roblox.require("Widgets.AvatarImage", function() {
                Roblox.Widgets.AvatarImage.populate();
            });
        });
    }

    var clanData = $("div#ClanInvitationData");
    var hasInvitation = clanData.data("is-invitation-pending") === "True";
    var inOtherClan = clanData.data("is-in-other-clan") === "True";
    var groupName = clanData.data("group-name");
    var verificationToken = $("[name=__RequestVerificationToken]").val();

    if (hasInvitation) {
        var invGroupId = clanData.data("group-id");
        
        var acceptDeclineInvite = function(isAccepting) {
            $.ajax({
                method: "POST",
                url: "/group/accept-decline-clan-invitation",
                crossDomain: true,
                xhrFields: { withCredentials: true },
                dataType: "json",
                data: {
                    groupId: invGroupId,
                    isAccepting: isAccepting,
                    __RequestVerificationToken: verificationToken
                }
            }).done(function(res) {
                if (res.success) {
                    window.location.reload();
                } else {
                    Roblox.GenericModal.open("Error", null, res.message);
                }
            });
        };

        var title = Roblox.Clans.Resources.ClanInviteTitle.replace("{0}", groupName.replace(/\$/g, "&#36;"));

        Roblox.GenericConfirmation.open({
            titleText: title,
            bodyContent: Roblox.Clans.Resources.ClanInviteMessage,
            footerText: inOtherClan ? Roblox.Clans.Resources.ClanInviteSubMessage : "",
            acceptText: Roblox.Clans.Resources.ClanInviteAcceptText,
            declineText: Roblox.Clans.Resources.ClanInviteCancelText,
            acceptColor: Roblox.GenericConfirmation.green,
            xToCancel: true,
            onAccept: function() { acceptDeclineInvite(true); },
            onDecline: function() { acceptDeclineInvite(false); }
        });
    }

    $(".leave-clan").click(function(e) {
        e.preventDefault();
        var gid = $(this).data("group-id");
        Roblox.GenericConfirmation.open({
            titleText: Roblox.Clans.Resources.LeaveClanTitle,
            bodyContent: Roblox.Clans.Resources.LeaveClanText,
            onAccept: function() {
                $.ajax({
                    method: "POST",
                    url: "/group/leave-clan",
                    data: { groupId: gid, __RequestVerificationToken: verificationToken },
                    dataType: "json"
                }).done(function(res) {
                    if (res.success) {
                        Roblox.GenericModal.open(Roblox.Clans.Resources.SuccessTitle, null, Roblox.Clans.Resources.LeaveClanSuccessText, function() {
                            window.location.reload();
                        });
                    } else {
                        Roblox.GenericModal.open(Roblox.Clans.Resources.ErrorTitle, null, res.message);
                    }
                });
            }
        });
    });

    $("#GroupsPeoplePane_Clan").on("click", "a.pagerbtns", function() {
        var btn = $(this);
        if (btn.prop("disabled")) return;
        var currentPage = parseInt($("#GroupsPeoplePane_Clan .current-page").val());
        var targetPage = btn.hasClass("previous") ? currentPage - 1 : currentPage + 1;
        fetchClanMembers(targetPage);
    });
});

if (typeof Roblox.GenericModal === "undefined") {
    Roblox.GenericModal = (function() {
        var tStatus = { isOpen: false };
        var defaultConfig = {
            overlayClose: true,
            escClose: true,
            opacity: 80,
            overlayCss: { backgroundColor: "#000" },
            acceptColor: "btn-neutral"
        };
        var onClosedCallback;

        function open(title, imgUrl, message, onClosed, isLarge, customConfig) {
            tStatus.isOpen = true;
            var config = $.extend({}, defaultConfig, customConfig);
            onClosedCallback = onClosed;

            var modal = $("div.GenericModal").first();
            modal.find("div.Title").text(title);
            
            if (imgUrl === null) {
                modal.addClass("noImage");
            } else {
                modal.find("img.GenericModalImage").attr("src", imgUrl);
                modal.removeClass("noImage");
            }

            modal.find("div.Message").html(message);
            if (isLarge) {
                modal.removeClass("smallModal").addClass("largeModal");
            }

            var okBtn = modal.find(".roblox-ok");
            okBtn.attr("class", "btn-large " + config.acceptColor + " roblox-ok ImageButton");
            okBtn.unbind().bind("click", close);
            
            modal.modal(config);
        }

        function close() {
            tStatus.isOpen = false;
            $.modal.close();
            if (typeof onClosedCallback === "function") onClosedCallback();
        }

        return {
            close: close,
            open: open,
            status: tStatus,
            green: "btn-primary",
            blue: "btn-neutral",
            gray: "btn-negative"
        };
    })();
}

Roblox.ExileModal = (function() {
    var targetUserId, targetGroupId, targetRolesetId;
    var deletePosts = false;

    function close() { $.modal.close("#ExileModal"); }

    function show(userId) {
        targetUserId = userId;
        deletePosts = false;
        
        var confirmMsg = "Are you sure you want to exile this user?";
        if ($('.exile-user[data-user-id="' + userId + '"]').data("is-in-clan") === "True") {
            confirmMsg += " They will also be kicked from the Clan.";
        }

        Roblox.GenericConfirmation.open({
            titleText: "Warning!",
            bodyContent: confirmMsg,
            acceptColor: Roblox.GenericConfirmation.green,
            acceptText: "Exile",
            declineText: "Cancel",
            allowHtmlContentInFooter: true,
            footerText: "<input type='checkbox' id='exile-user-delete-posts' onclick='Roblox.ExileModal.SetDeletePostsBool()'/> Also delete all posts by this user.",
            onAccept: performExile
        });
    }

    function initVars(rolesetId, groupId) {
        targetRolesetId = rolesetId;
        targetGroupId = groupId;
    }

    function toggleDeletePosts() { deletePosts = !deletePosts; }

    function performExile() {
        var payload = {
            userId: targetUserId,
            deleteAllPostsOption: deletePosts,
            rolesetId: targetRolesetId,
            selectedGroupId: targetGroupId
        };
        $.ajax({
            type: "POST",
            url: "Groups.aspx/ExileUserAndDeletePosts",
            data: JSON.stringify(payload),
            contentType: "application/json; charset=utf-8",
            success: function() {
                location.reload();
            }
        });
    }

    return {
        Exile: performExile,
        Close: close,
        Show: show,
        InitializeGlobalVars: initVars,
        SetDeletePostsBool: toggleDeletePosts
    };
})();

Roblox.GenericConfirmation = (function() {
    var status = { isOpen: false };
    var modalConfig = {
        overlayClose: true,
        escClose: true,
        opacity: 80,
        overlayCss: { backgroundColor: "#000" },
        onClose: function() { status.isOpen = false; $.modal.close(); }
    };

    function open(options) {
        status.isOpen = true;
        var defaults = {
            titleText: "",
            bodyContent: "",
            acceptText: Roblox.Resources.GenericConfirmation.yes,
            declineText: Roblox.Resources.GenericConfirmation.No,
            acceptColor: "btn-neutral",
            declineColor: "btn-negative",
            onAccept: function() {},
            onDecline: function() {}
        };
        var settings = $.extend({}, defaults, options);

        var modal = $("[data-modal-handle='confirmation']");
        modal.find(".Title").text(settings.titleText);
        modal.find(".Message").html(settings.bodyContent);

        var confirmBtn = $("#roblox-confirm-btn");
        confirmBtn.html(settings.acceptText).attr("class", "btn-large " + settings.acceptColor);
        confirmBtn.unbind().bind("click", function() {
            $.modal.close();
            settings.onAccept();
            return false;
        });

        var declineBtn = $("#roblox-decline-btn");
        declineBtn.html(settings.declineText).attr("class", "btn-large " + settings.declineColor);
        declineBtn.unbind().bind("click", function() {
            $.modal.close();
            settings.onDecline();
            return false;
        });

        modal.modal(modalConfig);
    }

    return {
        open: open,
        status: status,
        green: "btn-primary",
        blue: "btn-neutral",
        gray: "btn-negative"
    };
})();

Roblox.PageHeartbeatEvent = (function() {
    var sendEvent = function(count) {
        if (Roblox.EventStream) {
            Roblox.EventStream.SendEvent("pageHeartbeat", "heartbeat" + count, {});
        }
    };

    var getIntervals = function() {
        return $("#page-heartbeat-event-data-model").data("page-heartbeat-event-intervals");
    };

    var startLoop = function() {
        var intervals = getIntervals();
        var index = 0;
        if (intervals) {
            function pulse() {
                if (index < intervals.length) {
                    var time = intervals[index++];
                    setTimeout(function() {
                        sendEvent(index);
                        pulse();
                    }, time * 1000);
                }
            }
            pulse();
        }
    };

    return { Init: startLoop };
})();

$(function() {
    Roblox.PageHeartbeatEvent.Init();
});


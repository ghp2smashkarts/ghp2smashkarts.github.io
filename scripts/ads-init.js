'use strict';

//Keep these in global scope
let adBreak;
let adConfig;

//PLAYWIRE
if(isPlaywireEnabled())
{
    //PLAYWIRE RAMP v3.0 (Ads API)
    window.ramp = window.ramp || {};
    window.ramp.que = window.ramp.que || [];
    window.ramp.passiveMode = true;

    function getPlaywireWebsiteId() {
        var hostname = window.location.hostname;
        var referrerHostname = '';
        try {
            if (document.referrer) referrerHostname = new URL(document.referrer).hostname;
        } catch(e) {}

        if (hostname.includes('geometrykarts.com') || referrerHostname.includes('geometrykarts.com')) return '77835';
        if (hostname.includes('skunblocked.com')   || referrerHostname.includes('skunblocked.com'))   return '77836';
        
        //schoolkarts.com is just an iframe of smashkarts.io so no need to have a separate website id for it, just use the default one
        //if (hostname.includes('schoolkarts.com')   || referrerHostname.includes('schoolkarts.com'))   return '77834';
        
        return '73592'; // default: smashkarts.io
    }

    var playwireScript = document.createElement("script");
    playwireScript.type = "text/javascript";
    playwireScript.async = true;
    playwireScript.src = "//cdn.intergient.com/1024690/" + getPlaywireWebsiteId() + "/ramp.js";
    playwireScript.onload = () =>
    {
        playwireRampInitialised = true;
    };
    document.addEventListener("DOMContentLoaded", function ()
    {
        const body = document.querySelector("body");
        body.appendChild(playwireScript);
    });
}

//ADINPLAY
if(isAdinPlayEnabled())
{
    window.aiptag = window.aiptag || {cmd: []};
    aiptag.cmd.display = aiptag.cmd.display || [];
    aiptag.cmd.player = aiptag.cmd.player || [];

    //CMP tool settings
    aiptag.cmp = {
        show: true,
        position: "bottom",  //centered, bottom
        button: false,
        buttonText: "Privacy settings",
        buttonPosition: "bottom-left" //bottom-left, bottom-right, top-left, top-right
    }

    //init video player
    if(videoAdProvider === AdProviderAdinplay)
    {
        aiptag.cmd.player.push(function() {
            aiptag.adplayer = new aipPlayer({
                AD_WIDTH: 960,
                AD_HEIGHT: 540,
                AD_DISPLAY: 'fullscreen', //default, fullscreen, center, fill
                LOADING_TEXT: 'loading advertisement',
                PREROLL_ELEM: function(){return document.getElementById('preroll');},
                AIP_COMPLETE: function(evt){onInterstitialComplete(evt);},
                AIP_REWARDEDCOMPLETE: function(evt){onRewardedInterstitialComplete(evt);},
                AIP_REWARDEDGRANTED: function(){onRewardedInterstitialGranted();}
            });
        });
    }

    var adinplayScript = document.createElement("script");
    adinplayScript.type = "text/javascript";
    adinplayScript.async = true;
    adinplayScript.src = "//api.adinplay.com/libs/aiptag/pub/SHK/smashkarts.io/tag.min.js";
    document.head.appendChild(adinplayScript);
}

//GOOGLE H5 GAMES
if(isGoogleH5GamesEnabled())
{
    window.googletag = window.googletag || { cmd: [] };
    googletag.cmd.push(() =>
    {
        var url = (window.location != window.parent.location) ? document.referrer : document.location.href;
        if (url.startsWith("https://smashkarts.io/") || url.startsWith("http://smashkarts.io/") ||
            url.startsWith("https://www.smashkarts.io/") || url.startsWith("http://www.smashkarts.io/")
            || url.includes("smashkarts-dev.firebaseapp.com"))
        {
            (function ()
            {
                var afgads = document.createElement('script');
                afgads.setAttribute("async", true);
                afgads.setAttribute("type", "text/javascript");
                afgads.setAttribute("data-ad-frequency-hint", "30s");
                afgads.setAttribute("data-ad-client", "ca-pub-1463476156508236");
                afgads.setAttribute("src", "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js");
                var node = document.getElementsByTagName('script')[0];
                node.parentNode.insertBefore(afgads, node);
            })();

            window.adsbygoogle = window.adsbygoogle || [];
            adBreak = adConfig = function (o) { adsbygoogle.push(o); };
            adConfig({ preloadAdBreaks: "on", sound: "on" });
        }
    });
}

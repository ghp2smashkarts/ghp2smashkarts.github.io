'use strict';

var pwNonRewardedVideoEventListenersRegistered = false;
var pwNonRewardedVideoPlayerReady = false;

var pwSkipBtnEl = null;
var pwSkipCountdownIntervalId = null;
var pwSkipSecondsRemaining = 0;
var pwSkipDelaySeconds = 10;
var pwManuallySkipped = false;

function pwGetSkipBtn()
{
    if (!pwSkipBtnEl) pwSkipBtnEl = document.getElementById("pw-video-skip-btn");
    return pwSkipBtnEl;
}

function pwShowSkipButton()
{
    var btn = pwGetSkipBtn();
    if (!btn) return;

    pwManuallySkipped = false;
    pwSkipSecondsRemaining = pwSkipDelaySeconds;

    btn.disabled = true;
    btn.textContent = "Skip in " + pwSkipSecondsRemaining;
    btn.style.display = "block";

    if (pwSkipCountdownIntervalId) clearInterval(pwSkipCountdownIntervalId);
    pwSkipCountdownIntervalId = setInterval(function()
    {
        pwSkipSecondsRemaining -= 1;
        if (pwSkipSecondsRemaining > 0)
        {
            btn.textContent = "Skip in " + pwSkipSecondsRemaining;
        }
        else
        {
            clearInterval(pwSkipCountdownIntervalId);
            pwSkipCountdownIntervalId = null;
            btn.disabled = false;
            btn.textContent = "Skip Ad";
        }
    }, 1000);

    btn.onclick = function()
    {
        if (btn.disabled) return;
        pwManuallySkipped = true;
        pwHideSkipButton();

        try
        {
            if (typeof ramp !== "undefined" && typeof ramp.destroyUnits === "function")
            {
                ramp.destroyUnits([adUnitTypeNonRewardedVideo]);
            }
        }
        catch (e)
        {
            console.log(`PW destroyUnits(${adUnitTypeNonRewardedVideo}) error: ${e}`);
        }

        interstitialSkipped(false);
    };
}

function pwHideSkipButton()
{
    if (pwSkipCountdownIntervalId)
    {
        clearInterval(pwSkipCountdownIntervalId);
        pwSkipCountdownIntervalId = null;
    }
    var btn = pwGetSkipBtn();
    if (btn)
    {
        btn.onclick = null;
        btn.disabled = true;
        btn.style.display = "none";
    }
}

window.ramp.que.push(() =>
{
    window.ramp.onPlayerReady = function() {
        console.log(`PW ${adUnitTypeNonRewardedVideo} player ready`);
        pwNonRewardedVideoPlayerReady = true;
    };
});

function tryRegisterNonRewardedVideoEventListeners()
{
    if (pwNonRewardedVideoEventListenersRegistered)
        return;

    pwNonRewardedVideoEventListenersRegistered = true;

    Bolt.on(adUnitTypeNonRewardedVideo, Bolt.BOLT_AD_STARTED, function()
    {
        console.log(`PW ${adUnitTypeNonRewardedVideo} started event`);
        pwShowSkipButton();
    });

    Bolt.on(adUnitTypeNonRewardedVideo, Bolt.BOLT_AD_ERROR, function()
    {
        console.log(`PW ${adUnitTypeNonRewardedVideo} error event`);
        if (pwManuallySkipped) { pwManuallySkipped = false; return; }
        pwHideSkipButton();
        interstitialError(false);
    });

    Bolt.on(adUnitTypeNonRewardedVideo, Bolt.BOLT_AD_COMPLETE, function()
    {
        console.log(`PW ${adUnitTypeNonRewardedVideo} complete event`);
        if (pwManuallySkipped) { pwManuallySkipped = false; return; }
        pwHideSkipButton();
        interstitialComplete(false);
    });

}

function showInterstitial(audioOn, interstitialType, interstitialName)
{
    if(!rampInitialised() || !pwNonRewardedVideoPlayerReady)
    {
        interstitialError(false);
        return;
    }

    if (!isVideoAdPlaying && firebase.auth().currentUser != null)
    {
        tryRegisterNonRewardedVideoEventListeners();

        isVideoAdPlaying = true;

        ramp.spaAddAds([{ type: adUnitTypeNonRewardedVideo }]);
    }
}

var pwRewardedVideoEventListenersRegistered = false;
var rewardGranted = false;

function tryRegisterRewardedVideoEventListeners()
{
    if (pwRewardedVideoEventListenersRegistered)
        return;

    pwRewardedVideoEventListenersRegistered = true;

    window.addEventListener("rewardedAdVideoRewardReady", () =>
    {
        console.log("PW rewarded Ad is ready to play!");
        pwRewardedAvailable = true;
        pwRewardedVideoPrefetching = false;
        rewardGranted = false;
        window.unityGame.SendMessage(unityFirebaseGameOjbectName, "RewardedInterstitialAvailable");
    });

    window.addEventListener("userAcceptsRewardedAd", () =>
    {
        console.log("PW userAcceptsRewardedAd - User clicked to begin watching an ad");
        rewardGranted = false;
        interstitialStart(true);    
    });

    window.addEventListener("rewardedAdCompleted", () =>
    {
        console.log("PW rewardedAdCompleted - watched full ad");    
        interstitialComplete(rewardGranted);
        rewardGranted = false;
    });

    window.addEventListener("rewardedAdRewardGranted", () =>
    {
        console.log("PW rewardedAdRewardGranted - User watched enough to earn a reward");
        rewardGranted = true;
    });

    window.addEventListener("rewardedCloseButtonTriggered", () =>
    {
        console.log("PW rewardedCloseButtonTriggered - User closed the ad early");
        if(!rewardGranted)
            interstitialSkipped(true);
    });

    window.addEventListener("userClosedWithRewardCanResolve", () =>
    {
        console.log("PW userClosedWithRewardCanResolve - User closed the ad after qualifying for the reward");
        interstitialComplete(rewardGranted);
        rewardGranted = false;
    });

    window.addEventListener("rejectAdCloseCta", () =>
    {
        console.log("PW rejectAdCloseCta - User closed the call-to-action prompt");
        interstitialSkipped(true);
    });

    window.addEventListener("rewardedAdConfirmClose", () =>
    {
        console.log("PW rewardedAdConfirmClose - Confirmation modal was closed");
        interstitialSkipped(true);
    });
}

function tryInitRewardedInterstitial(audioOn)
{
    if (window.adblockDetected)
    {
        console.log("Adblock detected, not initializing rewarded interstitial");
        return;
    }

    if (!rampInitialised())
    {
        console.log("Ramp not initialised, cannot initialize rewarded interstitial");
        return;
    }   

    if (pwRewardedAvailable || pwRewardedVideoPrefetching)
    {
        //Already available or prefetching, notify unity
        window.unityGame.SendMessage(unityFirebaseGameOjbectName, "RewardedInterstitialAvailable");
        return;
    }

    tryRegisterRewardedVideoEventListeners();

    //Prefetch rewarded video unit
    pwRewardedVideoPrefetching = true;

    window.ramp.que.push(() =>
    {
        if (rampCurrDisplayedAdTypes.length === 0)
        {
            rampCurrDisplayedAdTypes.push(adUnitTypeRewardedVideo);
            
            window.ramp.spaAds({
                ads: [{type: adUnitTypeRewardedVideo}],
                countPageView: false,
            }).catch((e) =>
            {
                console.log(`error tryInitRewardedInterstitial spaAds. error: ${e}`);
                pwRewardedAvailable = false;
                pwRewardedVideoPrefetching = false;
            });
        }
        else
        {
            rampCurrDisplayedAdTypes.push(adUnitTypeRewardedVideo);

            window.ramp.spaAddAds([{type: adUnitTypeRewardedVideo}]).catch((e) =>
            {
                console.log(`error tryInitRewardedInterstitial spaAddAds. error: ${e}`);
                pwRewardedAvailable = false;
                pwRewardedVideoPrefetching = false;
            });
        }
    });
}

function tryShowRewardedInterstitial(audioOn)
{
    if (!rampInitialised() || !pwRewardedAvailable)
    {
        interstitialNoFill(true);
        return;
    }

    if (!isVideoAdPlaying && firebase.auth().currentUser != null)
    {
        isVideoAdPlaying = true;
        //pwRewardedAvailable = false; //next ad will be prefetched automatically from C#

        ramp.manuallyCreateRewardUi({skipConfirmation: true})
            .then(() =>
            {
                console.log("tryShowRewardedInterstitial (PW) - Reward granted");            
            })
            .catch((error) =>
            {
                console.error("tryShowRewardedInterstitial (PW) Error:", error);
                isVideoAdPlaying = false;            

                if(error.includes("There is no rewarded ad available"))
                {
                    interstitialNoFill(true);
                }   
                else
                {
                    interstitialError(true);
                }
            });
    }
}

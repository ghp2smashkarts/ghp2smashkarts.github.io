'use strict';

// IAB units get an incrementing numeric suffix on each re-add (e.g. standard_iab_rght1 → standard_iab_rght12 → standard_iab_rght13).
// This resolves the actual current element ID so destroyUnits can find it.
function getActualUnitId(baseType)
{
    const el = document.querySelector(`[id^="${baseType}"]`);
    return el ? el.id : baseType;
}

function hideAllAdUnits(includingVideoAds = false)
{
    if(!rampInitialised())
        return;

    if(typeof ramp.destroyUnits === "function" && rampCurrDisplayedAdTypes.length > 0)
    {
        if (!includingVideoAds)
        {
            const nonVideoAdTypes = rampCurrDisplayedAdTypes.filter(adType => adType !== adUnitTypeRewardedVideo && adType !== adUnitTypeNonRewardedVideo);
            ramp.destroyUnits(nonVideoAdTypes.map(getActualUnitId));
            rampCurrDisplayedAdTypes = rampCurrDisplayedAdTypes.filter(adType => adType === adUnitTypeRewardedVideo || adType === adUnitTypeNonRewardedVideo);
        }
        else
        {
            ramp.destroyUnits(rampCurrDisplayedAdTypes.map(getActualUnitId));
            rampCurrDisplayedAdTypes = [];
        }
    }
}

function rampHideAdUnit(adUnitType)
{
    if(!rampInitialised())
        return;

    const adIndex = rampCurrDisplayedAdTypes.indexOf(adUnitType);
    if(adIndex < 0)
        return;

    rampCurrDisplayedAdTypes.splice(adIndex, 1);

    if(typeof ramp.destroyUnits === "function")
    {
        ramp.destroyUnits([getActualUnitId(adUnitType)]);
    }
}

function rampDisplayAdUnit(adUnitType)
{
    if (!rampInitialised())
        return;

    if (isVideoAdPlaying)
        return;

    if (rampCurrDisplayedAdTypes.includes(adUnitType))
        return;

    window.ramp.que.push(() =>
    {
        if (rampCurrDisplayedAdTypes.length === 0)
        {
            rampCurrDisplayedAdTypes = [adUnitType];

            window.ramp.spaAds({
                ads: [{type: adUnitType}],
                countPageView: countPageView,
            }).catch((e) =>
            {
                console.log(`error rampDisplayAdUnit spaAds type: ${adUnitType} error: ${e}`);
            });

            countPageView = false;
        }
        else
        {
            rampCurrDisplayedAdTypes.push(adUnitType);

            window.ramp.spaAddAds([{type: adUnitType}]).catch((e) =>
            {
                console.log(`error rampDisplayAdUnit spaAddAds type: ${adUnitType} error: ${e}`);
            });
        }
    });
}

function requestMainMenuAd()
{
    rampDisplayAdUnit(adUnitTypeMainMenu);
}

function hideMainMenuAd()
{
    rampHideAdUnit(adUnitTypeMainMenu);
}

function requestWinCeremonyAd()
{
    rampDisplayAdUnit(adUnitTypeWinCeremony);
}

function hideWinCeremonyAd()
{
    rampHideAdUnit(adUnitTypeWinCeremony);
}

function requestLoadingAd() 
{
    rampDisplayAdUnit(adUnitTypeLoading);   
}
function hideLoadingAd() 
{
    rampHideAdUnit(adUnitTypeLoading);
}

function requestSpectateAd() 
{
    rampDisplayAdUnit(adUnitTypeSpectate);
}

function hideSpectateAd() 
{
    rampHideAdUnit(adUnitTypeSpectate);
}

function requestDeathAd()
{
    rampDisplayAdUnit(adUnitTypeOnDeath);
}

function hideDeathAd()
{
    rampHideAdUnit(adUnitTypeOnDeath);
}

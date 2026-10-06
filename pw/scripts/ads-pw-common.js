'use strict';

///////////////////////////
//ad unit types
const adUnitTypeOnDeath = "standard_iab_rght1";
const adUnitTypeMainMenu = "standard_iab_rght2";
const adUnitTypeSpectate = "standard_iab_rght3";
const adUnitTypeWinCeremony = "standard_iab_rght4";
const adUnitTypeLoading = "standard_iab_left1";
const adUnitTypeNonRewardedVideo = "precontent_ad_video";
const adUnitTypeRewardedVideo = "rewarded_ad_video";

var countPageView = true;
var rampCurrDisplayedAdTypes = [];

let pwRewardedAvailable = false;
let pwRewardedVideoPrefetching = false;

function requestOffCanvasAd(adResArrayToHide, adTagIdToShow)
{
}

function hideOffCanvasAds(adResArray)
{
}

function rampInitialised()
{
    return playwireRampInitialised;
}

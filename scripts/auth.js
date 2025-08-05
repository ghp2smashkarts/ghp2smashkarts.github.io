'use strict';

var unityFirebaseGameOjbectName = 'JavascriptMessageReceiver';

var firstLoad = true;

function onAuthStateChanged(user) {
  if(!user)
  {
    if(firstLoad)
    {
      if(window.customAuthToken != null)
      {
        signInWithCustomToken(window.customAuthToken);
      }
      else
      {
        signInAnonymously();
      }
    }
  }
  else
  {
    getUserNoAdsEndTimestamp();
    sendAuthDataToUnity();
  }
  firstLoad = false;
}

function signInWithCustomToken(token)
{
  firebase.auth().signInWithCustomToken(token)
  .then((userCredential) => {
    console.log("signInWithCustomToken Success");
    sendAuthDataToUnity();
  })
  .catch(function(error)
  {
    console.log("error logging in " + error.code);
    console.error(error);
    window.unityGame.SendMessage(unityFirebaseGameOjbectName, "firebaseSignInWithEmailFailed", error.message);
  });
}

function signInAnonymously()
{
  firebase.auth().signInAnonymously().catch(function(error) {
    var errorCode = error.code;
    console.log("error logging in " + errorCode);
    console.error(error);
  });
}

function signInWithEmail(email, password)
{
  firebase.auth().signInWithEmailAndPassword(email, password).then((userCredential) =>
  {
    console.log("signInWithEmailAndPassword Success");
  }).catch(function (error)
  {
    // Checks if no account is made with this email and makes one
    if (error.code === "auth/user-not-found")
    {
      linkUserWithEmail(email, password);
    }
    else
    {
      console.log("error logging in " + error.code);
      console.error(error);
      window.unityGame.SendMessage(unityFirebaseGameOjbectName, "firebaseSignInWithEmailFailed", error.message);
    }
  });
}

function linkUserWithEmail(email, password)
{
  if(firebase.auth().currentUser != null && firebase.auth().currentUser.isAnonymous)
  {
    var credential = firebase.auth.EmailAuthProvider.credential(email, password);
    firebase.auth().currentUser.linkWithCredential(credential).then(function(user) {
      console.log("Anonymous account successfully upgraded", user);
      sendAuthDataToUnity();
    }, function(error) {
      console.log("Error upgrading anonymous account", error);
      console.error(error);
      window.unityGame.SendMessage(unityFirebaseGameOjbectName, "firebaseLinkUserWithEmailFailed", error.message);
    });
  }
}

//@podonnell: Turn off linkWithRedirect for mobile etc. as this was previously only being used because linkWithPopup was causing issues
//These seem to have been fixed at some stage probably some upgrade of firebase
// function checkForRedirect()
// {
//   firebase.auth().getRedirectResult().then(function(result)
//   {
//     console.log("linkOrSignInWithGoogle:success");
//     sendAuthDataToUnity();
//   }, function(error)
//   {
//     if(error.code == "auth/credential-already-in-use")
//     {
//       console.log("linkOrSignInWithGoogle:fail auth/credential-already-in-use try signInWithCredential");
//       firebase.auth().signInWithCredential(error.credential).catch(function(error)
//       {
//         console.log("signInWithCredential:: Error logging in " + error.code);
//         console.error(error);
//         window.unityGame.SendMessage(unityFirebaseGameOjbectName, "firebaseSignInWithEmailFailed", error.message);
//       });
//     }
//     else
//     {
//       console.log("linkOrSignInWithGoogle:: Error logging in " + error.code);
//       console.error(error);
//       window.unityGame.SendMessage(unityFirebaseGameOjbectName, "firebaseLinkUserWithEmailFailed", error.message);
//     }
//   });
// }

function linkOrSignInWithGoogle()
{
  var provider = new firebase.auth.GoogleAuthProvider();

  if(firebase.auth().currentUser != null && firebase.auth().currentUser.isAnonymous)
  {
    //@podonnell: Turn off linkWithRedirect for mobile etc. as this was previously only being used because linkWithPopup was causing issues
    //These seem to have been fixed at some stage probably some upgrade of firebase
    // var isSafariBrowser = (navigator.userAgent.indexOf('Safari') > -1 && navigator.userAgent.indexOf('Chrome') <= -1);
    // if(isMobile() || isSafariBrowser)
    // {
    //   firebase.auth().currentUser.linkWithRedirect(provider);
    // }
    // else
    {
      firebase.auth().currentUser.linkWithPopup(provider).then((result) =>
      {
        console.log("linkOrSignInWithGoogle:: Success");
        sendAuthDataToUnity();
      }).catch((error) =>
      {
        if(error.code == "auth/credential-already-in-use")
        {
          firebase.auth().signInWithCredential(error.credential).catch(function(error)
          {
            console.log("signInWithCredential:: Error logging in " + error.code);
            console.error(error);
            window.unityGame.SendMessage(unityFirebaseGameOjbectName, "firebaseSignInWithEmailFailed", error.message);
          });
        }
        else
        {
          console.log("linkOrSignInWithGoogle:: Error logging in " + error.code);
          console.error(error);
          window.unityGame.SendMessage(unityFirebaseGameOjbectName, "firebaseLinkUserWithEmailFailed", error.message);
        }
      });
    }
  }
}

function linkOrSignInWithApple()
{
  var provider = new firebase.auth.OAuthProvider('apple.com');

  if(firebase.auth().currentUser != null && firebase.auth().currentUser.isAnonymous)
  {
    //@podonnell: Turn off linkWithRedirect for mobile etc. as this was previously only being used because linkWithPopup was causing issues
    //These seem to have been fixed at some stage probably some upgrade of firebase
    // var isSafariBrowser = (navigator.userAgent.indexOf('Safari') > -1 && navigator.userAgent.indexOf('Chrome') <= -1);
    // if(isMobile() || isSafariBrowser)
    // {
    //   firebase.auth().currentUser.linkWithRedirect(provider);
    // }
    // else
    {
      firebase.auth().currentUser.linkWithPopup(provider).then((result) =>
      {
        console.log("linkOrSignInWithApple:: Success");
        sendAuthDataToUnity();
      }).catch((error) =>
      {
        if(error.code == "auth/credential-already-in-use")
        {
          firebase.auth().signInWithCredential(error.credential).catch(function(error)
          {
            console.log("signInWithCredential:: Error logging in " + error.code);
            console.error(error);
            window.unityGame.SendMessage(unityFirebaseGameOjbectName, "firebaseSignInWithEmailFailed", error.message);
          });
        }
        else
        {
          console.log("linkOrSignInWithApple:: Error logging in " + error.code);
          console.error(error);
          window.unityGame.SendMessage(unityFirebaseGameOjbectName, "firebaseLinkUserWithEmailFailed", error.message);
        }
      });
    }
  }
}

let addedDiscordMessageListener = false;
function linkOrSignInWithDiscord(scope)
{
  if(firebase.auth().currentUser != null && firebase.auth().currentUser.isAnonymous)
  {
    const popup = window.open(
        `${discordLoginRedirectUrl}?origin=${window.location.origin}&scope=${scope}`,
        'DiscordLogin',
        'width==1000,height=760'
    );

    if (!popup)
    {
      window.unityGame.SendMessage(unityFirebaseGameOjbectName, "firebaseLinkUserWithEmailFailed", "popup blocked");
      return;
    }

    // Start monitoring the popup for closure
    const popupClosedInterval = setInterval(() =>
    {
      if (popup.closed)
      {
        clearInterval(popupClosedInterval);
        window.unityGame.SendMessage(unityFirebaseGameOjbectName, "firebaseLinkUserWithEmailFailed", "User closed the popup or cancelled login");
      }
    }, 10000);

    if(!addedDiscordMessageListener)
    {
      addedDiscordMessageListener = true;

      // Listen for a message from the popup
      window.addEventListener('message', async (event) =>
      {
        const tempUrl = new URL(discordLoginRedirectUrl);

        if (event.origin === tempUrl.origin && event.data && typeof event.data === 'object' && 'discordLoginCode' in event.data)
        {
          clearInterval(popupClosedInterval);

          const response = await fetch(`${discordLoginCFUrl}?code=${event.data.discordLoginCode}&redirect_uri=${discordLoginRedirectUrl}&existingFBId=${firebase.auth().currentUser.uid}`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
          });

          const {customToken: customFBToken} = await response.json();

          signInWithCustomToken(customFBToken);
        }
      });
    }
  }
}

function signOut()
{
  firebase.auth().signOut().then(function() {
    console.log("signOut:: Success");
    signInAnonymously();
  }).catch(function(error) {
    console.log("signOut:: Failed ");
    console.error(error);
  });
}

function sendAuthDataToUnity()
{
  if(window.unityGame != null && firebase.auth().currentUser != null)
  {
    var firebaseUid = firebase.auth().currentUser.uid;
    var isAnon = firebase.auth().currentUser.isAnonymous;
    var data = {authToken:"",uid:firebaseUid,isAnonymous:isAnon};
    var dataJson = JSON.stringify(data);
    window.unityGame.SendMessage(unityFirebaseGameOjbectName, 'SetAuthToken', dataJson);
  }
}

function sendPasswordResetEmail(emailAddress)
{
  firebase.auth().sendPasswordResetEmail(emailAddress).then(function() {
    console.log("sendPasswordResetEmail:: Success");
    window.unityGame.SendMessage(unityFirebaseGameOjbectName, "SendPasswordResetEmailSuccess");
  }).catch(function(error) {
    console.log("sendPasswordResetEmail:: Failed ");
    window.unityGame.SendMessage(unityFirebaseGameOjbectName, "SendPasswordResetEmailFailed", error.message);
    console.error(error);
  });
}

// cache the nodeKeys for UD and UDRO the first time they are loaded
// use this to limit retry attempts to reload when it fails due to race condition
let firstLoadFailUD;
let firstLoadFailUDRO;
function getValueTT(nodeKey)
{
  const RETRY_DELAY_MS = 1000;
  const dbRef = firebase.database().ref();
  dbRef.child(nodeKey).once('value').then((snapshot) => {
    if (snapshot.exists())
    {
      var valJsonStr = JSON.stringify(snapshot.val());
      SendDataToUnity("OnGetValueSuccess", nodeKey, valJsonStr);
    }
    else
    {
      window.unityGame.SendMessage(unityFirebaseGameOjbectName, "OnGetValueEmptySuccess", nodeKey);
    }
  }).catch((error) =>
  {
    window.unityGame.SendMessage(unityFirebaseGameOjbectName, "OnGetValueError", nodeKey, error.message);
    console.error(error);

    // Retry only on specific transient error
    if (error.code === "PERMISSION_DENIED" || error.message.includes("permission_denied"))
    {
      // failed to get a value with permission denied error
      // this may be hacking
      // or it could be the first time loading hang bug
      // in that case we want to retry the load once, but only for ud and udro nodes
      // to do this we will cache the node keys for them separately
      // if they are yet undefined, we will retry once

      const platform = isMobile()? "mobile" : "desktop";
      //console.log("platform: "+platform);

      const portal = (window.location != window.parent.location ? document.referrer : document.location.href);
      //console.log("portal: " + portal);
      // e.g.
      // https://smashkarts-dev.firebaseapp.com/tests/mmc/udlh17/tt-dev.html
      const url = new URL(portal);
      //console.log("url: " + url);

      const domain = url.hostname;
      //console.log("domain: "+domain);

      const prunedDomain = domain.replace(/\./g, "-");
      //console.log("prunedDomain: " + prunedDomain);

      const fullPlatform = prunedDomain + "-" +platform;
      //console.log("fullPlatform: " + fullPlatform);

      const isUD = nodeKey.startsWith("users/") && nodeKey.endsWith("/ud");
      const isUDRO = nodeKey.startsWith("users/") && nodeKey.endsWith("/udro");

      let shouldRetry = false;

      if (isUD) {
        if (!firstLoadFailUD) {
          firstLoadFailUD = nodeKey;
          shouldRetry = true;
          console.warn(`Caching firstLoadFailUD and retrying: ${nodeKey}`);
          dbRef.child(`debug/loadStats/${firebase.auth().currentUser.uid}/${fullPlatform}/ud/failCount`).set(firebase.database.ServerValue.increment(1));
        } else {
          console.warn(`Already cached firstLoadFailUD. Not retrying again.`);
          // how can we know this is the fail we are expecting? and not just a fail at a different point in the apps life cycle?
          dbRef.child(`debug/loadStats/${firebase.auth().currentUser.uid}/${fullPlatform}/ud/retryFailCount`).set(firebase.database.ServerValue.increment(1));
        }
      }
      else if (isUDRO)
      {
        if (!firstLoadFailUDRO)
        {
          firstLoadFailUDRO = nodeKey;
          shouldRetry = true;
          console.warn(`Caching firstLoadFailUDRO and retrying: ${nodeKey}`);
          dbRef.child(`debug/loadStats/${firebase.auth().currentUser.uid}/${fullPlatform}/udro/failCount`).set(firebase.database.ServerValue.increment(1));
        }
        else
        {
          console.warn(`Already cached firstLoadFailUDRO. Not retrying again.`);
          dbRef.child(`debug/loadStats/${firebase.auth().currentUser.uid}/${fullPlatform}/udro/retryFailCount`).set(firebase.database.ServerValue.increment(1));
        }
      }

      if (shouldRetry) {
        const logPath = `debug/loadStats/${firebase.auth().currentUser.uid}/${fullPlatform}/${isUD ? "ud" : "udro"}/retryCount`;
        dbRef.child(logPath).set(firebase.database.ServerValue.increment(1));

        setTimeout(() => getValueTT(nodeKey), RETRY_DELAY_MS);
        return;
      }
    }
  });
}

function SendDataToUnity(functionName, nk, ds)
{
  var obj =
      {
        nodeKey: nk,
        dataStr: ds
      }

  window.unityGame.SendMessage(unityFirebaseGameOjbectName, functionName, JSON.stringify(obj));
}


function SendResponseToUnity(functionName, k, resonseData)
{
  resonseData["key"] = k;

  window.unityGame.SendMessage(unityFirebaseGameOjbectName, functionName, JSON.stringify(resonseData));
}

function setValueTT(nodeKey, jsonData)
{
  if(firebase.auth().currentUser != null)
  {
    const dbRef = firebase.database().ref();
    var jsonObj = JSON.parse(jsonData);
    dbRef.child(nodeKey).set(jsonObj, (error) => {
      if (error) {
        console.log("auth.js::setValue - Error " + nodeKey);
        SendDataToUnity("OnSetValueError", nodeKey, error.message);
      } else {
        window.unityGame.SendMessage(unityFirebaseGameOjbectName, "OnSetValueSuccess", nodeKey);
      }
    });
  }
}

function removeValueTT(nodeKey)
{
  if(firebase.auth().currentUser != null)
  {
    const dbRef = firebase.database().ref();
    dbRef.child(nodeKey).remove()
    .then(function(){
      window.unityGame.SendMessage(unityFirebaseGameOjbectName, "OnRemoveValueSuccess", nodeKey);
    })
    .catch(function(error){
      console.log("auth.js::removeValueTT error");
      SendDataToUnity("OnRemoveValueError", nodeKey, error.message);
    });
  }
}

function updateValueTT(nodeKey, jsonData)
{
  if(firebase.auth().currentUser != null)
  {
    const dbRef = firebase.database().ref();
    var jsonObj = JSON.parse(jsonData);
    dbRef.child(nodeKey).update(jsonObj, (error) => {
      if (error) {
        console.log("auth.js::updateValue Error " + nodeKey);
        SendDataToUnity( "OnUpdateValueError", nodeKey, error.message);
      } else {
        window.unityGame.SendMessage(unityFirebaseGameOjbectName, "OnUpdateValueSuccess", nodeKey);
      }
    });
  }
}

var cloudFunctionSuccess = 0;
var cloudFunctionFail = 0;

var regions = ["us-central1", "us-east1", "europe-west1"];
var lastError = "internal";

async function callCloudFunction(functionId, jsonData, key)
{
  var success = false;
  for(var i=0;i<regions.length; i++)
  {
    var success = await callCloudFunctionNew(functionId, jsonData, key, regions[i], i);
    if(success){ break; }
  }

  if(!success)
  {
    SendDataToUnity( "OnFunctionError", key, lastError);
  }
}

async function callCloudFunctionNew(functionId, jsonData, key, region, count)
{
  if(firebase.auth().currentUser != null)
  {
    try
    {
      const dataObject = JSON.parse(jsonData);
      var functionRef = firebase.app().functions(region).httpsCallable(functionId + "Multi");

      var fbResponse = await functionRef(dataObject);
      if(fbResponse != null)
      {
        var gameResponse = fbResponse.data;

        if(gameResponse != null)
        {
          SendResponseToUnity( "OnFunctionComplete", key, gameResponse);
          cloudFunctionSuccess++;
          if(!gameResponse.result)
          {
            logCloudFunctionError("v5-" + count + "-f", jsonData, gameResponse.debugMessage, functionId);
          }
          return true;
        }
        else
        {
          logCloudFunctionError("v5-" + count + "-r", "null game response", functionId);
          return false;
        }
      }
      else
      {
        logCloudFunctionError("v5-" + count + "-n", jsonData, "null FB response", functionId);
        return false;
      }
    } catch (error)
    {
      cloudFunctionFail++;
      logCloudFunctionError("v5-" + count + "-e", jsonData, error.message, functionId);
      lastError = error.message;
      return false;
    }
  }
}

const logCloudFunctionErrors = false;
function logCloudFunctionError(debugErrorRootNode, jsonData, message, functionId)
{
  if(logCloudFunctionErrors)
  {
    var firebaseUid = firebase.auth().currentUser.uid;
    var currentTime = new Date().getTime();
    var debugErrorNode = "cferror/" + debugErrorRootNode + "/" + firebaseUid + "/" + functionId + "/" + currentTime;
    const dbRef = firebase.database().ref();
    dbRef.child(debugErrorNode).set({
      errorData: jsonData,
      os: getOS(),
      time: currentTime,
      successCount: cloudFunctionSuccess,
      failCound: cloudFunctionFail,
      errorMessage: message
    }, (setValueError) =>
    {
      if (setValueError)
      {
        console.log("logCloudFunctionError setValueError:: " + setValueError.message);
      } else
      {
        var debugErrorWriteSuccessNode = "cferror/" + debugErrorRootNode + "/" + firebaseUid + "/" + functionId + "/" + currentTime + "/successTime";
        var successTime = new Date().getTime();
        dbRef.child(debugErrorWriteSuccessNode).set(successTime);
        //console.log("logCloudFunctionError Success");
      }
    });
  }
  else
  {
    console.log("logCloudFunctionError:: " + debugErrorRootNode + " " + message);
  }
}

function logCloudFunctionSuccess(debugErrorRootNode, jsonData, functionId)
{
  var firebaseUid = firebase.auth().currentUser.uid;
  var currentTime = new Date().getTime();
  var debugErrorNode = "cferror/" + debugErrorRootNode + "/" + firebaseUid + "/" + functionId + "/" + currentTime;
  const dbRef = firebase.database().ref();

  dbRef.child(debugErrorNode).set({
        errorData: jsonData,
        os: getOS(),
        time : currentTime,
        successCount : cloudFunctionSuccess,
        failCount : cloudFunctionFail,
      }, (setValueError) => {
        if (setValueError) {
          console.log("logCloudFunctionSuccess setValueError:: " + setValueError.message);

        } else {
          console.log("logCloudFunctionSuccess Success ");
        }
      }
  );
}

function getCurrentUserId()
{
  if(firebase.auth().currentUser != null)
  {
    return firebase.auth().currentUser.uid;
  }
  return "";
}

function getCurrentUserIsAnon()
{
  if(firebase.auth().currentUser != null)
  {
    return firebase.auth().currentUser.isAnonymous;
  }
  return true;
}

var userNoAdsEndTimestamp;
function getUserNoAdsEndTimestamp()
{
  if (typeof firebase !== 'undefined' && firebase.database() != null && firebase.auth() != null)
  {
    try
    {
      var uid = getCurrentUserId();

      if(uid != null && uid !== "")
      {
        const dbRef = firebase.database().ref();

        dbRef.child(`users/${uid}/udro/noAdsEndTimestamp`).once("value").then((snapshot) =>
        {
          if (snapshot.exists())
          {
            userNoAdsEndTimestamp = snapshot.val();
          }
          else
          {
            userNoAdsEndTimestamp = 0;
          }
        });
      }
    }
    catch (e)
    {
      console.log(e);
    }
  }
}

window.addEventListener('load', function() {
  console.log('Init Auth');
  if (typeof firebase !== 'undefined' && firebase.auth() != null)
  {
    firebase.auth().onAuthStateChanged(onAuthStateChanged);

    //@podonnell: Turn off linkWithRedirect for mobile etc. as this was previously only being used because linkWithPopup was causing issues
    //These seem to have been fixed at some stage probably some upgrade of firebase
    //checkForRedirect();
  }
}, false);


function getBrowser()
{
  return window.navigator.userAgent;
}

function getBrowserVisibilityState()
{
  return document.visibilityState;
}

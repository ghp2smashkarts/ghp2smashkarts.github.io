'use strict';

function requestCrazyGamesUserToken()
{
  if (window.CrazyGames.SDK.user.isUserAccountAvailable)
  {
    // Call your async function
    (async function ()
    {
      try
      {
        const token = await window.CrazyGames.SDK.user.getUserToken();

        // console.log("CG: Token: ", token);

        //send complete message with token
        window.unityGame.SendMessage(unityFirebaseGameOjbectName, "OnRequestCrazyGamesUserTokenComplete", token);
      }
      catch (err)
      {
        console.log("CG: Error: ", err);

        //send complete message anyways with empty token
        window.unityGame.SendMessage(unityFirebaseGameOjbectName, "OnRequestCrazyGamesUserTokenComplete", "");
      }
    })();
  }
  else
  {
    console.log("CG: isUserAccountAvailable is false");

    //send complete message anyways with empty token
    window.unityGame.SendMessage(unityFirebaseGameOjbectName, "OnRequestCrazyGamesUserTokenComplete", "");
  }
}

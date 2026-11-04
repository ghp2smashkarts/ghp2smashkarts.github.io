'use strict';

// Framed "portal-style" layout: ad columns left/right of the game, a banner row under the game,
// and a slim bar under the game with a fullscreen button, like CrazyGames/Poki. On by default on
// the desktop home site (add &frameDebug=1 for labelled placeholders instead of ads, plus the
// chosen layout and game-area size in the bar, to tune the numbers below).
//
// Only runs when: desktop, the page is the top-level window (not embedded in someone else's
// iframe), and the display ad provider is AdinPlay - the only provider with frame slot support
// (scripts/ads-adinplay-display.js). Discord's dummy provider, CrazyGames (cg.html) and Poki (its
// own template) never get it.
//
// This file only decides WHICH slots fit (keeping the game area's aspect ratio sane) and sets CSS
// variables - the actual sizing is a CSS grid (css/main.css, #mainContainer.framed), and the
// canvas is never sized from JS. Ads are requested by scripts/ads-adinplay-display.js, which
// listens for 'frameslotschange' and reads window.frameSlots (it's injected asynchronously, so it
// also reads window.frameSlots once on load rather than relying on catching the first event).
//
// AdinPlay renders into a div whose id is the ad unit id, so each slot gets one inner div per
// size it can show (ids from frameAdUnits in constants.js), and only the chosen size's is shown.
//
// Ad-free players (userNoAdsEndTimestamp in auth.js, kept live from Unity) get no frame at all -
// the game fills the window and Unity shows its own fullscreen/Discord buttons, same as the
// pre-frame layout. Until the ad-free status is known the frame stays off too, so paying players
// never see the bar or ads flash up during load.
//
// window.frameActive is true only while the frame is up AND showing ad slots - it's what the rest
// of the ad code uses to know off-canvas ads are up (on-canvas banner suppression in
// ads-common-logic.js, and Unity's main menu banner via OnFrameAdsActiveChanged).
//
// window.frameBarShown is true whenever the frame (and so its bar) is up - Unity hides
// its own main menu fullscreen/Discord buttons while it is (OnFrameBarShownChanged), since the bar
// already has them.

(function () {
  window.frameActive = false;
  window.frameBarShown = false;
  window.frameSlots = [];
  window.frameDebug = false;

  var params = new URLSearchParams(window.location.search);
  if (isMobile() || isTablet() || isIFramed() || displayAdProvider !== AdProviderAdinplay) {
    return;
  }

  window.frameDebug = params.get('frameDebug') === '1';

  // Candidate layouts, most placements first (ties: bigger ads first). pickLayout() takes the
  // first whose resulting game area is within the limits. Every size used here needs an
  // AdinPlay unit in frameAdUnits (constants.js).
  var LAYOUTS = [
    { name: 'LRB',  left: '160x600', right: '160x600', banner: '728x90' },
    { name: 'LR',   left: '160x600', right: '160x600', banner: null },
    { name: 'RB',   left: null,      right: '160x600', banner: '728x90' },
    { name: 'R',    left: null,      right: '160x600', banner: null },
    { name: 'B',    left: null,      right: null,      banner: '728x90' },
    { name: 'B320', left: null,      right: null,      banner: '320x50' }
  ];

  // Two passes: STRICT protects the game's shape; RELAXED is only tried when nothing fits
  // STRICT, so a smaller/squarer window still gets at least one placement rather than none.
  // Both can be overridden in the URL for live tuning: ?frameMinAspect=1.6&frameMaxAspect=2.4
  // &frameMinW=1000&frameMinH=520 (these override the STRICT pass).
  var STRICT = {
    minAspect: num('frameMinAspect', 1.7),
    maxAspect: num('frameMaxAspect', 2.3),
    minGameW: num('frameMinW', 1000),
    minGameH: num('frameMinH', 540)
  };
  var RELAXED = { minAspect: 1.45, maxAspect: 3.2, minGameW: 760, minGameH: 440 };

  // Hard cap on how many ad slots can be shown at once, regardless of how many would
  // otherwise fit (e.g. left+right+banner=3 was too many at some window sizes). Also
  // overridable for tuning: ?frameMaxAds=1 (or 3 to allow the old left+right+banner case back).
  var MAX_ADS = num('frameMaxAds', 2);

  var BAR_H = 44;            // fullscreen bar, always present while the frame is on
  var BANNER_PAD = 12;       // vertical padding around the banner ad
  var SKYSCRAPER_H = 600;    // a 160x600 column needs this much height in the GAME row alone -
                              // side columns only span the game row, not the bar/banner rows
                              // below them (see css/main.css), so they can't offer more than that
  var SIDE_GAP = 16;         // gutter on EACH side of a side ad (game-facing AND outer window
                              // edge), so it's not flush against either - avoids accidental
                              // clicks near the game edge, and stops the ad looking stuck to
                              // the browser edge. The ad is centered in a track sized to
                              // width + SIDE_GAP*2 (css/main.css's justify-self:center on
                              // #frameLeft/#frameRight), not positioned with margin, so a
                              // hidden (0-width) column doesn't waste space on it.
  var MAX_TIMEOUT_MS = 2147483647; // setTimeout's max delay

  var SLOT_DEFS = [
    { key: 'left',   slotId: 'frameLeft' },
    { key: 'right',  slotId: 'frameRight' },
    { key: 'banner', slotId: 'frameBanner' }
  ];

  var container = document.getElementById('mainContainer');
  var infoEl = document.getElementById('frameInfo');
  var fullscreen = false;
  var lastSignature = null;
  var lastFrameActive = false;
  var lastFrameBarShown = false;
  var resizeTimer = null;
  var adFreeExpiryTimer = null;

  function num(name, fallback) {
    var v = parseFloat(params.get(name));
    return isNaN(v) ? fallback : v;
  }

  function sizeOf(size) {
    var parts = size.split('x');
    return { w: parseInt(parts[0], 10), h: parseInt(parts[1], 10) };
  }

  function unitIdFor(key, size) {
    return (frameAdUnits[key] || {})[size];
  }

  // null while unknown (auth.js / Unity haven't reported yet), else true/false.
  function adFreeState() {
    if (typeof userNoAdsEndTimestamp === 'undefined' || userNoAdsEndTimestamp == null) return null;
    return userNoAdsEndTimestamp > Date.now();
  }

  // Game-area geometry for a layout at the current window size.
  function measure(l, w, h) {
    var leftW = l.left ? sizeOf(l.left).w + SIDE_GAP * 2 : 0;
    var rightW = l.right ? sizeOf(l.right).w + SIDE_GAP * 2 : 0;
    var bannerH = l.banner ? sizeOf(l.banner).h + BANNER_PAD : 0;
    var gameW = w - leftW - rightW;
    var gameH = h - BAR_H - bannerH;
    return { leftW: leftW, rightW: rightW, bannerH: bannerH, gameW: gameW, gameH: gameH, aspect: gameW / gameH };
  }

  function adCount(l) {
    return (l.left ? 1 : 0) + (l.right ? 1 : 0) + (l.banner ? 1 : 0);
  }

  function fits(l, m, limits) {
    if (adCount(l) > MAX_ADS) return false;
    if (m.gameW < limits.minGameW || m.gameH < limits.minGameH) return false;
    if (m.aspect < limits.minAspect || m.aspect > limits.maxAspect) return false;
    // A 160x600 column must fit its ad within the game row's own height.
    if ((l.left === '160x600' || l.right === '160x600') && m.gameH < SKYSCRAPER_H) return false;
    // A banner must fit the game column's width.
    if (l.banner && m.gameW < sizeOf(l.banner).w) return false;
    return true;
  }

  function pickLayout() {
    var w = window.innerWidth;
    var h = window.innerHeight;

    // Ad-free (or not known yet): no frame, the old full-window layout.
    if (adFreeState() !== false) return null;

    var passes = [STRICT, RELAXED];
    for (var p = 0; p < passes.length; p++) {
      for (var i = 0; i < LAYOUTS.length; i++) {
        var m = measure(LAYOUTS[i], w, h);
        if (fits(LAYOUTS[i], m, passes[p])) {
          return { layout: LAYOUTS[i], m: m, relaxed: p === 1 };
        }
      }
    }
    return null;
  }

  // Re-apply when an ad-free period ends, so ads come back without a reload.
  function scheduleAdFreeExpiry() {
    clearTimeout(adFreeExpiryTimer);
    adFreeExpiryTimer = null;
    if (adFreeState() === true) {
      var delay = Math.min(userNoAdsEndTimestamp - Date.now() + 1000, MAX_TIMEOUT_MS);
      adFreeExpiryTimer = setTimeout(onAdFreeChange, delay);
    }
  }

  function notifyUnity(method, on) {
    if (window.unityGame && window.unityFirebaseGameOjbectName) {
      window.unityGame.SendMessage(window.unityFirebaseGameOjbectName, method, on ? 1 : 0);
    }
  }

  function apply() {
    // Fullscreen gives the whole screen to the game: treat as "no layout" so the frame and its
    // ads go away, and come back on exit.
    var pick = fullscreen ? null : pickLayout();
    var layout = pick ? pick.layout : null;

    container.classList.toggle('framed', !!layout);
    container.classList.toggle('frameDebug', !!layout && window.frameDebug);
    container.dataset.frameLayout = layout ? layout.name : '';
    // Drives the game canvas's decorative side borders (css/main.css) - only shown on a side
    // that actually has an ad next to it, not unconditionally whenever the frame is on.
    container.classList.toggle('hasLeftAd', !!(layout && layout.left));
    container.classList.toggle('hasRightAd', !!(layout && layout.right));

    var slots = [];
    if (layout) {
      var m = pick.m;
      container.style.setProperty('--left-w', m.leftW + 'px');
      container.style.setProperty('--right-w', m.rightW + 'px');
      container.style.setProperty('--banner-h', m.bannerH + 'px');
      container.style.setProperty('--bar-h', BAR_H + 'px');

      SLOT_DEFS.forEach(function (def) {
        var size = layout[def.key];
        var slotEl = document.getElementById(def.slotId);
        var adId = size ? unitIdFor(def.key, size) : null;
        slotEl.style.display = adId ? '' : 'none';

        // Only the chosen size's AdinPlay div is visible inside the slot.
        Object.keys(frameAdUnits[def.key] || {}).forEach(function (s) {
          var unitEl = document.getElementById(frameAdUnits[def.key][s]);
          if (unitEl) unitEl.style.display = (s === size) ? '' : 'none';
        });

        if (adId) {
          // Pin the slot's own box to the ad's real pixel size (CSS gives left/right
          // align-self:center and the banner both align-self and justify-self:center) instead
          // of letting it stretch to fill a taller/wider grid cell - otherwise the "filled"
          // white background shows through as bands around a smaller ad/house promo image.
          slotEl.style.height = sizeOf(size).h + 'px';
          slotEl.style.width = sizeOf(size).w + 'px';
          slotEl.setAttribute('data-label', size + '\n' + def.key + ' (' + layout.name + ')');
          slots.push({ adId: adId, slotId: def.slotId, size: size });
        }
      });

      if (window.frameDebug) {
        infoEl.textContent = layout.name + (pick.relaxed ? ' (relaxed)' : '') + '  game ' +
          Math.round(m.gameW) + 'x' + Math.round(m.gameH) + '  aspect ' + m.aspect.toFixed(2) +
          '  window ' + window.innerWidth + 'x' + window.innerHeight;
      }
    }

    // Only publish (and so only trigger ad churn) when the wanted set actually changed.
    var signature = slots.map(function (s) { return s.adId + ':' + s.size; }).join('|');
    window.frameActive = slots.length > 0;
    if (signature !== lastSignature) {
      lastSignature = signature;
      window.frameSlots = slots;
      window.dispatchEvent(new CustomEvent('frameslotschange'));
    }

    if (window.frameActive !== lastFrameActive) {
      lastFrameActive = window.frameActive;
      notifyUnity('OnFrameAdsActiveChanged', window.frameActive);
    }

    window.frameBarShown = !!layout;
    if (window.frameBarShown !== lastFrameBarShown) {
      lastFrameBarShown = window.frameBarShown;
      notifyUnity('OnFrameBarShownChanged', window.frameBarShown);
    }
  }

  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(apply, 250);
  }

  function onFullscreenChange() {
    fullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
    // main.js's fs flag is only kept in sync by its Android recovery code otherwise, so it
    // goes stale after Esc - keep it accurate here so the fullscreen toggle stays correct.
    window.fs = fullscreen;
    apply();
  }

  function onAdFreeChange() {
    scheduleAdFreeExpiry();
    apply();
  }

  // One AdinPlay div per size the slot can show, created from frameAdUnits so the config is the
  // single source of truth for unit ids.
  function createUnitDivs(def) {
    var slotEl = document.getElementById(def.slotId);
    var units = frameAdUnits[def.key] || {};
    Object.keys(units).forEach(function (size) {
      if (!document.getElementById(units[size])) {
        var unitEl = document.createElement('div');
        unitEl.id = units[size];
        unitEl.style.display = 'none';
        slotEl.appendChild(unitEl);
      }
    });
  }

  // Slot background turns from the purple placeholder to white once a real creative renders
  // (AdinPlay gives no fill callback, same approach as the mobile bottom banner in Obby Roads).
  function watchFill(def) {
    var slotEl = document.getElementById(def.slotId);
    var units = frameAdUnits[def.key] || {};

    function update() {
      var filled = !window.frameDebug && Object.keys(units).some(function (size) {
        var unitEl = document.getElementById(units[size]);
        if (!unitEl || unitEl.style.display === 'none') return false;
        var iframe = unitEl.querySelector('iframe');
        return iframe != null && iframe.offsetHeight > 0 && iframe.offsetWidth > 0;
      });
      slotEl.classList.toggle('frameFilled', filled);
    }

    new MutationObserver(update).observe(slotEl, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style']
    });
  }

  SLOT_DEFS.forEach(createUnitDivs);
  SLOT_DEFS.forEach(watchFill);

  // The frame's fullscreen button. Bound to mousedown, not click: toggleFullscreen() waits for
  // the NEXT mouseup to actually request fullscreen (browsers need it inside a real gesture),
  // so it has to be triggered on the way down - same reason the Unity buttons use "Down".
  //
  // This button calls the JS toggleFullscreen() directly rather than going through
  // JavascriptMessageSender, so its analytics are routed through Unity explicitly here -
  // JavascriptMessageReceiver.OnFullscreenToggle -> AnalyticsHelpers.LogToggleFullscreen, the
  // same unified "toggle_fullscreen" event (source param) every other fullscreen button uses,
  // rather than logging straight to Firebase from JS.
  document.getElementById('frameFullscreenBtn').addEventListener('mousedown', function () {
    if (window.unityGame && window.unityFirebaseGameOjbectName) {
      window.unityGame.SendMessage(window.unityFirebaseGameOjbectName, 'OnFullscreenToggle', 'frame_bar');
    }
    toggleFullscreen();
  });

  window.addEventListener('resize', onResize);
  window.addEventListener('adfreechange', onAdFreeChange);
  document.addEventListener('fullscreenchange', onFullscreenChange);
  document.addEventListener('webkitfullscreenchange', onFullscreenChange);

  scheduleAdFreeExpiry();
  apply();
})();

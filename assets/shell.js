/* BD DocConnect hosted site shell.
 * - Signs people in with the same 6-digit email code as the Android app.
 * - Loads the latest page design (Index.html for /home, Admin.html for /admin) from
 *   Apps Script, so updates there show up here without changing this site.
 * - Gives those pages a google.script.run that sends each call to the API ("web").
 * - Keeps pages and the console's last results on the device for slow or no internet.
 */
(function () {
  'use strict';
  var C = self.BDC_CONFIG || window.BDC_CONFIG || {};
  var PAGE = document.documentElement.getAttribute('data-page') === 'admin' ? 'admin' : 'home';
  var BASE = location.pathname.replace(/(home|admin)\/?(index\.html)?$/, '');
  var K = { token: 'bdc_token', email: 'bdc_email', role: 'bdc_role', page: 'bdc_page_' + PAGE, hash: 'bdc_hash_' + PAGE };
  var LS = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  var params = new URLSearchParams(location.search);

  var SHARE = '<svg class="bdc-i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>';
  var PLUS = '<svg class="bdc-i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/></svg>';
  var DOTS = '<svg class="bdc-i" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>';

  /* ---------------- Installed app only ----------------
     Works on Android, iPhone/iPad and computers, but only as the installed app
     (home-screen / desktop app). In a normal browser tab it shows how to install. */
  var ua = navigator.userAgent || '';
  var isIOS = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);   // iPadOS reports as Mac
  var isAndroid = /Android/i.test(ua);
  var isSamsung = /SamsungBrowser/i.test(ua);
  var isMacSafari = /Macintosh/i.test(ua) && !isIOS && /Safari/i.test(ua) && !/Chrome|Chromium|Edg\//i.test(ua);
  var isFirefoxDesktop = /Firefox/i.test(ua) && !isAndroid && !isIOS;
  var installed = ['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay'].some(function (m) {
    try { return window.matchMedia('(display-mode: ' + m + ')').matches; } catch (e) { return false; }
  }) || navigator.standalone === true;
  var embedded = window.self !== window.top;          // the console's "View as BDM" frame
  var installPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); installPrompt = e; if (!installed) showInstall(); });
  window.addEventListener('appinstalled', function () { installPrompt = null; showInstalled(); });
  if (!installed && !embedded) {
    if ('serviceWorker' in navigator) { try { navigator.serviceWorker.register(BASE + 'sw.js'); } catch (e) {} }   // needed for "Install"
    showInstall();
    return;
  }

  if ('serviceWorker' in navigator) { try { navigator.serviceWorker.register(BASE + 'sw.js'); } catch (e) {} }

  function api(fn, args, token) {
    return fetch(C.apiUrl, {
      method: 'POST',
      // text/plain keeps this a "simple" request (no CORS pre-flight); Apps Script reads the body as JSON.
      body: JSON.stringify({ key: C.apiKey, fn: fn, args: args || [], token: token || undefined, ver: 'web-' + (C.version || '') })
    }).then(function (r) {
      if (!r.ok) throw netErr('The server is not reachable right now (' + r.status + ').');
      return r.text();
    }, function () { throw netErr('No internet connection.'); }).then(function (t) {
      var o; try { o = JSON.parse(t); } catch (e) { throw netErr('The server sent an unexpected reply. Try again in a minute.'); }
      if (!o.ok) { var er = new Error(o.error || 'Something went wrong.'); er.code = o.code || ''; throw er; }
      return o.result;
    });
  }
  function netErr(m) { var e = new Error(m); e.code = 'net'; return e; }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  if (params.get('signout') === '1') signOut(true);
  var token = LS.get(K.token);
  if (!token) showSignIn(); else start();

  function step(n, html) { return '<li><span class="bdc-n">' + n + '</span><div>' + html + '</div></li>'; }

  function showInstall() {
    var root = document.getElementById('bdc-root');
    var how;
    if (isIOS) {
      how = '<ol class="bdc-steps">' +
        step(1, 'Open this page in <b>Safari</b> (or Chrome) and tap <b>Share</b> ' + SHARE + ' at the bottom (top on iPad).') +
        step(2, 'Scroll and tap <b>Add to Home Screen</b> ' + PLUS + '.') +
        step(3, 'Tap <b>Add</b>, then open <b>BD DocConnect</b> from your home screen.') + '</ol>';
    } else if (installPrompt) {
      how = '<button class="bdc-btn" id="inst">Install BD DocConnect</button><p class="bdc-small">Then open it from your ' + (isAndroid ? 'home screen' : 'apps / dock') + '.</p>';
    } else if (isAndroid) {
      how = '<ol class="bdc-steps">' +
        (isSamsung ? step(1, 'Tap the menu <b>≡</b> at the bottom right.') + step(2, 'Tap <b>Add page to</b> → <b>Home screen</b>.')
                   : step(1, 'Tap the menu ' + DOTS + ' at the top right of Chrome.') + step(2, 'Tap <b>Install app</b> (or <b>Add to Home screen</b> → <b>Install</b>).')) +
        step(3, 'Open <b>BD DocConnect</b> from your home screen.') + '</ol>';
    } else if (isMacSafari) {
      how = '<ol class="bdc-steps">' + step(1, 'In Safari’s menu bar choose <b>File → Add to Dock…</b>') + step(2, 'Click <b>Add</b>, then open <b>BD DocConnect</b> from the Dock.') + '</ol>';
    } else if (isFirefoxDesktop) {
      how = '<p class="bdc-sub">Firefox can’t install apps. Open this page in <b>Chrome</b> or <b>Edge</b> to install BD DocConnect.</p>';
    } else {
      how = '<ol class="bdc-steps">' + step(1, 'Click the <b>Install</b> icon at the right end of the address bar (or the ' + DOTS + ' menu → <b>Cast, save and share → Install page as app</b>).') +
        step(2, 'Click <b>Install</b>, then open <b>BD DocConnect</b> from your apps.') + '</ol>';
    }
    root.innerHTML = '<div class="bdc-sign"><div class="bdc-logo big"></div><h1>Install BD DocConnect</h1>' +
      '<p class="bdc-sub">BD DocConnect works as an app on your ' + (isIOS ? 'iPhone' : isAndroid ? 'phone' : 'computer') + '. Install it once — it opens full-screen with its own icon, keeps your sign-in and works with poor internet.</p>' +
      '<div class="bdc-card bdc-how">' + how + '</div>' +
      '<p class="bdc-foot">Already installed? Open <b>BD DocConnect</b> from your ' + (isIOS || isAndroid ? 'home screen' : 'apps') + '.</p></div>';
    var b = document.getElementById('inst');
    if (b) b.onclick = function () {
      var p = installPrompt; if (!p) return;
      p.prompt();
      p.userChoice.then(function (c) { if (c && c.outcome === 'accepted') showInstalled(); });
    };
  }

  function showInstalled() {
    document.getElementById('bdc-root').innerHTML = '<div class="bdc-sign"><div class="bdc-logo big"></div><h1>Installed ✓</h1>' +
      '<p class="bdc-sub">Open <b>BD DocConnect</b> from your ' + (isAndroid || isIOS ? 'home screen' : 'apps') + ' to sign in. You can close this tab.</p></div>';
  }

  /* ---------------- Sign-in ---------------- */
  function showSignIn(msg) {
    var root = document.getElementById('bdc-root');
    root.innerHTML =
      '<div class="bdc-sign"><div class="bdc-logo big"></div><h1>BD DocConnect</h1><p class="bdc-sub">Your route, nearby doctors and check-ins — in one place.</p>' +
      '<form class="bdc-card" id="f"><h2 id="t">Sign in with your work email</h2><p id="h">We’ll email you a 6-digit code.</p>' +
      '<input id="em" type="email" autocomplete="email" placeholder="name@toothsi.in" value="' + esc(LS.get(K.email) || '') + '" required>' +
      '<input id="cd" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="6-digit code" hidden>' +
      '<div class="bdc-err" id="er"' + (msg ? '' : ' hidden') + '>' + esc(msg || '') + '</div>' +
      '<button id="go" type="submit">Send code</button><a href="#" id="bk" hidden>Use a different email</a></form>' +
      '<p class="bdc-foot">' + (PAGE === 'admin' ? 'Admin console' : 'Field app') + '</p></div>';
    var step = 0, f = document.getElementById('f'), em = document.getElementById('em'), cd = document.getElementById('cd'),
      go = document.getElementById('go'), er = document.getElementById('er'), bk = document.getElementById('bk');
    var fail = function (e) { go.disabled = false; er.textContent = e.message; er.hidden = false; };
    f.onsubmit = function (ev) {
      ev.preventDefault(); er.hidden = true; go.disabled = true;
      var email = em.value.trim().toLowerCase();
      if (step === 0) {
        api('requestCode', [email]).then(function () {
          LS.set(K.email, email); step = 1; go.disabled = false;
          em.disabled = true; cd.hidden = false; cd.focus(); bk.hidden = false; go.textContent = 'Sign in';
          document.getElementById('t').textContent = 'Enter the code we emailed';
          document.getElementById('h').textContent = 'Sent to ' + email + '. Check your inbox (and spam). It works for 10 minutes.';
        }, fail);
      } else {
        api('verifyCode', [email, cd.value, 'Web · ' + navigator.userAgent.slice(0, 60)]).then(function (r) {
          LS.set(K.token, r.token); LS.set(K.email, r.email); LS.set(K.role, r.role || 'bdm');
          token = r.token; start();
        }, fail);
      }
    };
    bk.onclick = function (e) { e.preventDefault(); step = 0; em.disabled = false; cd.hidden = true; bk.hidden = true; go.textContent = 'Send code'; };
  }

  function signOut(silent) {
    var t = LS.get(K.token);
    if (t) api('signOut', [], t).catch(function () {});
    [K.token, K.role].forEach(LS.del);
    try { Object.keys(localStorage).forEach(function (k) { if (/^bdc_c_|^FIELD_BDM_/.test(k)) localStorage.removeItem(k); }); } catch (e) {}
    if (!silent) location.href = BASE + 'home/';
  }
  window.bdcSignOut = function () { signOut(false); };

  ['pointerdown', 'keydown'].forEach(function (ev) { window.addEventListener(ev, function () { window.__bdcTouched = true; }, { capture: true, once: true }); });

  /* ---------------- Load the page ---------------- */
  function start() {
    // Admins land on the console (like the app); "My app" in the console opens /home/?view=app.
    var role = LS.get(K.role) || 'bdm';
    if (PAGE === 'home' && (role === 'admin' || role === 'super') && !params.get('viewAs') && params.get('view') !== 'app') {
      location.replace(BASE + 'admin/'); return;
    }
    var cached = LS.get(K.page);
    if (cached) render(cached);
    api('pageHtml', [PAGE]).then(function (r) {
      if (!r || !r.html) return;
      var fresh = r.hash !== LS.get(K.hash);
      if (!LS.set(K.page, r.html)) { /* storage full: still show it */ }
      LS.set(K.hash, r.hash);
      if (!cached) render(r.html);
      else if (fresh) {
        // New version: switch straight away unless the person has already started using the page.
        var once = 'bdc_reloaded_' + r.hash, done = false;
        try { done = sessionStorage.getItem(once) === '1'; sessionStorage.setItem(once, '1'); } catch (e) { done = true; }
        if (!window.__bdcTouched && !done) location.reload(); else showUpdateBar();
      }
    }, function (e) {
      if (!cached) document.getElementById('bdc-root').innerHTML =
        '<div class="bdc-sign"><div class="bdc-logo big"></div><h1>Couldn’t open BD DocConnect</h1><p class="bdc-sub">' + esc(e.message) + '</p><button onclick="location.reload()">Try again</button></div>';
    });
  }

  function showUpdateBar() {
    setTimeout(function () {
      var b = document.createElement('div');
      b.className = 'bdc-update';
      b.innerHTML = 'A new version is ready. <a href="#">Reload</a>';
      b.querySelector('a').onclick = function (e) { e.preventDefault(); location.reload(); };
      document.body.appendChild(b);
    }, 1500);
  }

  function render(html) {
    // document.open() is ignored while the page is still being parsed (the browser would add the new page
    // under the loading screen), so wait until parsing has finished.
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { setTimeout(function () { render(html); }, 0); }, { once: true });
      return;
    }
    var viewAs = PAGE === 'home' ? String(params.get('viewAs') || '').trim().toLowerCase() : '';
    if (PAGE === 'home') html = html.replace("var VIEW_AS='';", 'var VIEW_AS=' + JSON.stringify(viewAs).replace(/</g, '\\u003c') + ';');
    var inject = '<script>window.BDC_CONFIG=' + JSON.stringify(C).replace(/</g, '\\u003c') + ';window.BDC_PAGE=' + JSON.stringify(PAGE) +
      ';window.BDC_BASE=' + JSON.stringify(BASE) + ';<\/script><script>(' + bridge.toString() + ')();<\/script>' +
      '<link rel="manifest" href="' + BASE + 'manifest.webmanifest"><link rel="apple-touch-icon" href="' + BASE + 'assets/apple-touch-icon.png">' +
      '<meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="BD DocConnect">';
    var at = html.indexOf('<head>');
    html = at < 0 ? inject + html : html.slice(0, at + 6) + inject + html.slice(at + 6);
    document.open(); document.write(html); document.close();
  }

  /* Runs inside the written page: google.script.run → API "web". */
  function bridge() {
    var C = window.BDC_CONFIG, PAGE = window.BDC_PAGE, BASE = window.BDC_BASE;
    var READ = /^(getFieldBdm|adminWhoAmI|adminTeamLive|adminPlans|adminDoctors|adminRoute|adminLiveOf|adminUsage|adminUsers|adminSettings|adminNotices)/;
    function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
    function post(fn, args) {
      var token = ls('bdc_token');
      return fetch(C.apiUrl, { method: 'POST', body: JSON.stringify({ key: C.apiKey, fn: 'web', args: [fn, args], token: token, ver: 'web-' + (C.version || '') }) })
        .then(function (r) { return r.text(); }, function () { var e = new Error('No internet connection.'); e.code = 'net'; throw e; })
        .then(function (t) {
          var o; try { o = JSON.parse(t); } catch (e) { var x = new Error('The server sent an unexpected reply.'); x.code = 'net'; throw x; }
          if (!o.ok) { var er = new Error(o.error || 'Something went wrong.'); er.code = o.code || ''; throw er; }
          return o.result ? o.result.value : null;
        });
    }
    function fix(fn, v) {
      // links between /home and /admin on this site (instead of the Apps Script address)
      if (fn === 'adminWhoAmI' && v && typeof v === 'object') v.appUrl = location.origin + BASE + (PAGE === 'admin' ? 'home/' : 'admin/');
      return v;
    }
    function runner(s, f) {
      var o = { withSuccessHandler: function (x) { return runner(x, f); }, withFailureHandler: function (x) { return runner(s, x); }, withUserObject: function () { return runner(s, f); } };
      return new Proxy(o, { get: function (t, k) {
        if (k in t) return t[k];
        return function () {
          var args = [].slice.call(arguments), fn = String(k), key = 'bdc_c_' + fn + '_' + JSON.stringify(args).slice(0, 200);
          var big = fn === 'adminDoctors' || fn === 'getFieldBdmBulkPayload';    // large: the pages keep their own copies
          post(fn, args).then(function (v) {
            v = fix(fn, v);
            if (READ.test(fn) && !big) ls(key, JSON.stringify(v));
            s && s(v);
          }, function (e) {
            if (e.code === 'auth') { localStorage.removeItem('bdc_token'); location.reload(); return; }
            var c = e.code === 'net' && READ.test(fn) ? ls(key) : null;
            if (c != null) { s && s(JSON.parse(c)); offlineNote(); return; }
            f && f(e);
          });
        };
      } });
    }
    /* ---- Notifications (Firebase Cloud Messaging) ---- */
    function pushSupported() { return !!(C.firebase && C.vapidKey && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window); }
    function loadScript(src) { return new Promise(function (ok, no) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); }); }
    var fbReady = null;
    function firebaseMessaging() {
      if (!fbReady) fbReady = loadScript('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js')
        .then(function () { return loadScript('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js'); })
        .then(function () { if (!firebase.apps.length) firebase.initializeApp(C.firebase); return firebase.messaging(); });
      return fbReady;
    }
    function registerPush(quiet) {
      return firebaseMessaging().then(function (msg) {
        return navigator.serviceWorker.getRegistration(BASE).then(function (reg) {
          return msg.getToken({ vapidKey: C.vapidKey, serviceWorkerRegistration: reg });
        }).then(function (tok) {
          if (!tok) throw new Error('No push address');
          var plat = /iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'iphone' : /Android/i.test(navigator.userAgent) ? 'android' : 'computer';
          if (ls('bdc_push') === tok) return tok;
          return fetch(C.apiUrl, { method: 'POST', body: JSON.stringify({ key: C.apiKey, fn: 'pushRegister', args: [tok, plat, navigator.userAgent.slice(0, 150)], token: ls('bdc_token') }) })
            .then(function (r) { return r.json(); }).then(function (o) { if (!o.ok) throw new Error(o.error); ls('bdc_push', tok); return tok; });
        }).then(function (tok) {
          msg.onMessage(function (p) {      // app open: show it anyway
            var n = p.notification || {};
            navigator.serviceWorker.getRegistration(BASE).then(function (reg) { if (reg) reg.showNotification(n.title || 'BD DocConnect', { body: n.body || '', icon: BASE + 'assets/icon-192.png', tag: (p.data && p.data.id) || '' }); });
          });
          if (!quiet) offlineNoteText('Notifications are on');
          return tok;
        });
      }).catch(function (e) { if (!quiet) alert('Couldn’t turn on notifications: ' + (e && e.message ? e.message : e)); });
    }
    function setupPush(menu) {
      // opened from a notification: count it as opened
      var nid = new URLSearchParams(location.search).get('n');
      if (nid) fetch(C.apiUrl, { method: 'POST', body: JSON.stringify({ key: C.apiKey, fn: 'noticeSeen', args: [[nid]], token: ls('bdc_token') }) }).catch(function () {});
      if (!pushSupported()) return;
      if (Notification.permission === 'granted') { registerPush(true); return; }
      if (Notification.permission === 'denied') return;
      var on = function () { Notification.requestPermission().then(function (p) { if (p === 'granted') { pill.remove(); registerPush(false); } else if (pill) pill.remove(); }); };
      var pill = document.createElement('button');
      pill.textContent = '🔔 Turn on notifications';
      pill.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:' + (PAGE === 'home' ? '96px' : '16px') + ';z-index:9997;border:0;border-radius:999px;background:#D93F32;color:#fff;padding:11px 18px;font:700 14px -apple-system,Roboto,sans-serif;box-shadow:0 8px 22px rgba(217,63,50,.35);cursor:pointer';
      pill.onclick = on;                       // iPhone needs a tap to ask
      document.body.appendChild(pill);
      var a = document.createElement('a'); a.href = '#'; a.textContent = 'Turn on notifications';
      a.style.cssText = 'display:block;padding:11px 12px;border-radius:10px;color:inherit;text-decoration:none;font-weight:600';
      a.onclick = function (e) { e.preventDefault(); on(); };
      menu.insertBefore(a, menu.children[1] || null);
    }
    function offlineNoteText(t) {
      var d = document.createElement('div'); d.textContent = t;
      d.style.cssText = 'position:fixed;left:50%;top:10px;transform:translateX(-50%);z-index:9999;background:#15803D;color:#fff;padding:7px 14px;border-radius:999px;font:600 13px -apple-system,Roboto,sans-serif';
      document.body.appendChild(d); setTimeout(function () { d.remove(); }, 3000);
    }

    var noteShown = false;
    function offlineNote() {
      if (noteShown) return; noteShown = true;
      var d = document.createElement('div');
      d.textContent = 'Offline — showing saved data';
      d.style.cssText = 'position:fixed;left:50%;top:10px;transform:translateX(-50%);z-index:9999;background:#A8570A;color:#fff;padding:7px 14px;border-radius:999px;font:600 13px -apple-system,Roboto,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.25)';
      document.body.appendChild(d); setTimeout(function () { d.remove(); noteShown = false; }, 4000);
    }
    window.google = { script: { run: runner(null, null), url: { getLocation: function (cb) {
      var p = {}; new URLSearchParams(location.search).forEach(function (v, k) { p[k] = v; }); cb({ parameter: p, hash: location.hash });
    } } } };

    // Account button: switch between the field app and the console, sign out.
    window.addEventListener('load', function () {
      if (window.self !== window.top) return;            // not inside the console's "view as" frame
      var role = ls('bdc_role') || 'bdm', email = ls('bdc_email') || '';
      var b = document.createElement('button');
      b.setAttribute('aria-label', 'Account');
      b.textContent = (email[0] || '?').toUpperCase();
      b.style.cssText = 'position:fixed;right:14px;bottom:' + (PAGE === 'home' ? '96px' : '16px') + ';z-index:9998;width:44px;height:44px;border-radius:50%;border:0;background:#14202B;color:#fff;font:800 16px -apple-system,Roboto,sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.3);cursor:pointer';
      var m = document.createElement('div');
      m.style.cssText = 'position:fixed;right:14px;bottom:' + (PAGE === 'home' ? '148px' : '68px') + ';z-index:9998;background:#fff;color:#14202B;border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.25);padding:6px;min-width:220px;font:14px -apple-system,Roboto,sans-serif;display:none';
      var item = function (label, fn) { var a = document.createElement('a'); a.href = '#'; a.textContent = label; a.style.cssText = 'display:block;padding:11px 12px;border-radius:10px;color:inherit;text-decoration:none;font-weight:600'; a.onclick = function (e) { e.preventDefault(); fn(); }; m.appendChild(a); };
      var who = document.createElement('div'); who.textContent = email + (role !== 'bdm' ? ' · ' + role : ''); who.style.cssText = 'padding:8px 12px;color:#5B6776;font-size:12.5px'; m.appendChild(who);
      if (role === 'admin' || role === 'super') item(PAGE === 'admin' ? 'Open field app' : 'Open admin console', function () { location.href = BASE + (PAGE === 'admin' ? 'home/?view=app' : 'admin/'); });
      item('Sign out', function () { if (confirm('Sign out of BD DocConnect on this device?')) { localStorage.removeItem('bdc_token'); location.href = BASE + 'home/?signout=1'; } });
      b.onclick = function () { m.style.display = m.style.display === 'none' ? 'block' : 'none'; };
      document.body.appendChild(m); document.body.appendChild(b);
      setupPush(m);
      // keep the role current (an admin added in Settings sees the console link next time)
      post('adminWhoAmI', []).then(function (w) { if (w && w.role) ls('bdc_role', w.role); if (PAGE === 'admin' && w && w.role === 'bdm') location.replace(BASE + 'home/'); }, function () {});
    });
  }
})();

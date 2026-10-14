import { DEFAULT_BUTTON_COLOR } from "@/lib/embed/appearance";
import { SANITIZERS_JS } from "@/lib/embed/sanitize";
import { WIDGET_COPY } from "@/lib/embed/widget-text";

/**
 * pickLanguage() from lib/embed/widget-text.ts as browser JavaScript.
 * tests/unit/embed-widget-text.test.ts runs both on the same inputs.
 */
export const PICK_LANGUAGE_JS = `
  function pickLanguage(dataLanguage, language, htmlLang) {
    var values = [dataLanguage, language, htmlLang];
    for (var i = 0; i < values.length; i++) {
      var v = values[i];
      if (typeof v === 'string' && v.replace(/\\s/g, '') !== '') {
        return /^es\\b/i.test(v.replace(/^\\s+/, '')) ? 'es' : 'en';
      }
    }
    return 'en';
  }
`;

/** Only what the loader itself shows, per language. */
const LOADER_COPY = {
	en: {
		bubble: WIDGET_COPY.en.bubbleWelcome,
		open: WIDGET_COPY.en.open,
		close: "Close",
	},
	es: {
		bubble: WIDGET_COPY.es.bubbleWelcome,
		open: WIDGET_COPY.es.open,
		close: "Cerrar",
	},
};

/**
 * The JavaScript served by /api/embed, which runs on the CUSTOMER'S page.
 *
 * Rules this file holds to — each one is a hole or a bug that existed before:
 *
 *   1. Nothing from the request is pasted into the source. The script used to
 *      start with `const BOT_ID = '${id}'` taken straight from ?id=, so
 *      /api/embed?id=x';alert(1)// served script of the requester's choosing,
 *      from our origin (verified on production 2026-10-14). The only values
 *      interpolated now are ours, through JSON.stringify.
 *   2. Every value is validated before it reaches the DOM (SANITIZERS_JS,
 *      shared with the server — see lib/embed/sanitize.ts), whether it came
 *      from an attribute or from /api/embed/settings. An invalid value falls
 *      back; it is never "fixed up".
 *   3. Elements are BUILT, never parsed from HTML strings. No innerHTML.
 *   4. What the owner SAVED in the admin wins over script-tag attributes, and
 *      attributes win over built-in defaults. This loader used to read only
 *      attributes, so a saved color could never reach a visitor — the
 *      ny-ai-chatbot "broken save" of 2026-10-12, here in a worse form.
 *      Attributes stay as the fallback so old installs keep their look until
 *      the owner saves.
 *   5. Language: data-language, then language, then the page's <html lang>.
 *      When the page changes language, the chat reloads in that language.
 */
export function buildEmbedScript(appUrl: string): string {
	return `
(function() {
  'use strict';
${SANITIZERS_JS}
${PICK_LANGUAGE_JS}
  var CHAT_APP_URL = ${JSON.stringify(appUrl)};
  var DEFAULT_COLOR = ${JSON.stringify(DEFAULT_BUTTON_COLOR)};
  var COPY = ${JSON.stringify(LOADER_COPY)};

  var scriptTag = document.currentScript;
  function attr(name) { return scriptTag ? scriptTag.getAttribute(name) : null; }
  function firstAttr(names) {
    for (var i = 0; i < names.length; i++) {
      var v = attr(names[i]);
      if (v !== null) return v;
    }
    return null;
  }
  function currentLanguage() {
    return pickLanguage(attr('data-language'), attr('language'),
      document.documentElement ? document.documentElement.getAttribute('lang') : null);
  }

  // Attributes: the legacy fallback, below anything the owner saved.
  var rawColor = firstAttr(['data-button-color', 'buttonColor']);
  var rawGif = firstAttr(['data-welcome-gif', 'welcomeGif']);
  var attrWelcome = firstAttr(['data-welcome-message', 'welcomeMessage']);
  var config = {
    // A welcome attribute has no language, so it counts as English only.
    attrWelcome: attrWelcome ? attrWelcome.slice(0, 500) : '',
    welcomeGif: isAllowedImageUrl(rawGif) ? rawGif : '',
    showWelcomeMessage: firstAttr(['data-show-welcome-message', 'showWelcomeMessage']) !== 'false',
    buttonColor: isHexColor(rawColor) ? rawColor : DEFAULT_COLOR,
    buttonSize: clampNumber(firstAttr(['data-button-size', 'buttonSize']), 0.5, 2, 1),
    position: safePosition(firstAttr(['data-position', 'position'])),
    openDelay: clampNumber(firstAttr(['data-open-delay', 'openDelay']), 0, 60000, 5000),
    autoOpen: firstAttr(['data-open', 'open']) === 'true',
    placeholder: (firstAttr(['data-placeholder', 'placeholder']) || '').slice(0, 200),
  };
  var language = currentLanguage();
  var saved = null;

  var iframeId = 'nyenglish-chat-iframe';
  var buttonId = 'nyenglish-chat-button';
  var welcomeId = 'nyenglish-chat-welcome';
  var isOpen = false;

  /** /api/embed/settings for one language; calls back with null on any failure. */
  function loadSettings(lang, done) {
    var finished = false;
    function finish(value) { if (!finished) { finished = true; done(value); } }
    setTimeout(function() { finish(null); }, 3000);
    try {
      fetch(CHAT_APP_URL + '/api/embed/settings?language=' + lang, { credentials: 'omit' })
        .then(function(r) { return r.ok ? r.json() : null; })
        .then(function(j) { finish(j && typeof j === 'object' ? j : null); })
        .catch(function() { finish(null); });
    } catch (e) { finish(null); }
  }

  function buttonColor() {
    return saved && isHexColor(saved.buttonColor) ? saved.buttonColor : config.buttonColor;
  }
  function side() {
    var p = saved && (saved.position === 'bottom-left' || saved.position === 'bottom-right')
      ? saved.position : config.position;
    return p === 'bottom-left' ? 'left' : 'right';
  }
  function welcomeText() {
    if (saved && typeof saved.welcomeMessage === 'string' && saved.welcomeMessage) {
      return saved.welcomeMessage.slice(0, 500);
    }
    if (language === 'en' && config.attrWelcome) return config.attrWelcome;
    return COPY[language].bubble;
  }
  function iframeSrc() {
    var src = CHAT_APP_URL + '/embed/chat?language=' + encodeURIComponent(language);
    if (config.placeholder) src += '&placeholder=' + encodeURIComponent(config.placeholder);
    // The page the visitor is on, so "does this fit me?" can mean this page.
    // Origin + path only (a query string can carry personal data); title capped.
    src += '&pageUrl=' + encodeURIComponent(location.origin + location.pathname);
    src += '&pageTitle=' + encodeURIComponent((document.title || '').slice(0, 160));
    return src;
  }

  function fadeIn(el, delay) {
    el.style.display = el.id === buttonId ? 'flex' : 'block';
    setTimeout(function() { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; }, delay || 0);
  }

  function fadeOut(el) {
    el.style.opacity = '0';
    el.style.transform = 'translateY(10px)';
    setTimeout(function() { el.style.display = 'none'; }, 200);
  }

  window.addEventListener('message', function(event) {
    if (event.data === 'close-chat' && event.origin === CHAT_APP_URL) {
      var iframe = document.getElementById(iframeId);
      var button = document.getElementById(buttonId);
      if (iframe) { fadeOut(iframe); isOpen = false; }
      if (button) fadeIn(button);
    }
  });

  function openChat() {
    var iframe = document.getElementById(iframeId);
    var button = document.getElementById(buttonId);
    var welcome = document.getElementById(welcomeId);
    if (iframe) { fadeIn(iframe); isOpen = true; }
    if (welcome) fadeOut(welcome);
    if (window.matchMedia('(max-width: 475px)').matches && button) fadeOut(button);
  }

  function toggleChat() {
    if (isOpen) {
      var iframe = document.getElementById(iframeId);
      var button = document.getElementById(buttonId);
      if (iframe) { fadeOut(iframe); isOpen = false; }
      if (button) fadeIn(button);
    } else {
      openChat();
    }
  }

  function chatIcon() {
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    var props = { width: '28', height: '28', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
      'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
    for (var k in props) svg.setAttribute(k, props[k]);
    svg.style.display = 'block';
    var path = document.createElementNS(NS, 'path');
    path.setAttribute('d', 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z');
    svg.appendChild(path);
    return svg;
  }

  function build() {
    var s = side();
    var iframe = document.createElement('iframe');
    iframe.id = iframeId;
    iframe.src = iframeSrc();
    iframe.title = 'Chat';
    iframe.style.cssText = 'display:none;opacity:0;position:fixed;border:none;z-index:2147483647;box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);transition:opacity 200ms,transform 200ms;transform:translateY(10px);';
    if (window.matchMedia('(max-width: 475px)').matches) {
      iframe.style.cssText += 'width:100vw;height:100vh;bottom:0;right:0;left:0;border-radius:0;';
    } else {
      iframe.style.cssText += 'width:400px;max-width:80vw;height:600px;max-height:80vh;border-radius:20px;bottom:80px;';
      iframe.style[s] = '20px';
    }
    document.body.appendChild(iframe);

    var welcomeTextEl = null;
    var closeBtn = null;
    if (config.showWelcomeMessage) {
      var welcome = document.createElement('div');
      welcome.id = welcomeId;
      welcome.style.cssText = 'display:none;opacity:0;position:fixed;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;width:280px;border-radius:12px;box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);padding:1rem 2rem 1rem 1rem;font-size:0.9rem;line-height:1.5;background:#fff;color:#000;z-index:2147483647;cursor:pointer;transition:opacity 200ms,transform 200ms;transform:translateY(10px);bottom:80px;';
      welcome.style[s] = '90px';
      welcome.onclick = openChat;

      if (config.welcomeGif) {
        var gif = document.createElement('img');
        gif.src = config.welcomeGif;
        gif.alt = '';
        gif.style.cssText = 'width:100%;max-width:150px;height:auto;margin-bottom:0.5rem;border-radius:8px;';
        welcome.appendChild(gif);
      }

      welcomeTextEl = document.createElement('div');
      welcomeTextEl.textContent = welcomeText();
      welcome.appendChild(welcomeTextEl);

      closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.textContent = '×';
      closeBtn.setAttribute('aria-label', COPY[language].close);
      closeBtn.style.cssText = 'position:absolute;top:0.5rem;right:0.5rem;background:transparent;border:none;font-size:1.5rem;cursor:pointer;color:#6B7280;padding:0;width:24px;height:24px;border-radius:50%;';
      closeBtn.onclick = function(e) { e.stopPropagation(); fadeOut(welcome); };
      welcome.appendChild(closeBtn);
      document.body.appendChild(welcome);
      // Never over an open chat: a visitor who opens it within the first second
      // used to get the note faded in on top of the message box.
      setTimeout(function() { if (!isOpen) fadeIn(welcome); }, 1000);
    }

    var button = document.createElement('button');
    button.id = buttonId;
    button.type = 'button';
    button.setAttribute('aria-label', COPY[language].open);
    button.appendChild(chatIcon());
    button.style.cssText = 'display:flex;align-items:center;justify-content:center;opacity:1;position:fixed;z-index:2147483647;width:60px;height:60px;border-radius:50%;color:white;border:none;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.15);transition:transform 200ms,box-shadow 200ms;bottom:20px;padding:0;';
    button.style.backgroundColor = buttonColor();
    button.style.transform = 'scale(' + config.buttonSize + ')';
    button.style.transformOrigin = 'bottom ' + s;
    button.style[s] = '20px';
    button.onmouseover = function() { button.style.transform = 'scale(' + (config.buttonSize * 1.1) + ')'; button.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)'; };
    button.onmouseout = function() { button.style.transform = 'scale(' + config.buttonSize + ')'; button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; };
    button.onclick = toggleChat;

    // Warm-up: the first time a visitor shows intent (hover, touch, focus), wake
    // the chat function and its database before the first question. Measured
    // 2026-10-14: first answer after a quiet period 6.5s, the next 2.2s.
    var warmed = false;
    function warmUp() {
      if (warmed) return;
      warmed = true;
      try { fetch(CHAT_APP_URL + '/api/embed/chat', { method: 'GET', mode: 'no-cors', keepalive: true }); } catch (e) {}
    }
    button.addEventListener('mouseenter', warmUp);
    button.addEventListener('touchstart', warmUp, { passive: true });
    button.addEventListener('focus', warmUp);
    document.body.appendChild(button);

    if (config.autoOpen) setTimeout(function() { warmUp(); openChat(); }, config.openDelay);

    // The page switched language (a language toggle that rewrites <html lang>,
    // or the attribute changed): reload the chat and the bubble in it.
    function onLanguageChange() {
      var next = currentLanguage();
      if (next === language) return;
      language = next;
      iframe.src = iframeSrc();
      button.setAttribute('aria-label', COPY[language].open);
      if (closeBtn) closeBtn.setAttribute('aria-label', COPY[language].close);
      saved = null;
      if (welcomeTextEl) welcomeTextEl.textContent = welcomeText();
      loadSettings(language, function(result) {
        if (next !== language) return;
        saved = result;
        if (welcomeTextEl) welcomeTextEl.textContent = welcomeText();
      });
    }
    if (typeof MutationObserver === 'function') {
      var observer = new MutationObserver(onLanguageChange);
      if (document.documentElement) observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
      if (scriptTag) observer.observe(scriptTag, { attributes: true, attributeFilter: ['data-language', 'language'] });
    }
  }

  function init() {
    // Saved settings first, so the button appears once, in its final color.
    // Any failure (network, timeout, old server) builds from the fallbacks.
    loadSettings(language, function(result) {
      saved = result;
      build();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`;
}
